#!/usr/bin/env python3
"""Pruebas del sello de tiempo RFC 3161 sobre el anclaje de auditoría (S-13).

Levanta una **autoridad de sellado de prueba** (un servidor HTTP local que responde
`application/timestamp-reply` con un TimeStampResp DER) y arranca el servidor real apuntando a
ella con `NOVAGEST_TSA_URL`. Comprueba:

  · el anclaje pide el sello y guarda la hora que devolvió la autoridad;
  · el token guardado se puede leer otra vez y su huella coincide con la firma del anclaje;
  · el token se puede descargar y su MIME es el de un sello de tiempo;
  · una autoridad que rechaza no impide anclar (queda el motivo, sin hora de tercero);
  · si la autoridad no responde, el anclaje se crea igual y se dice por qué.

La autoridad de prueba **no firma** el token: se comprueba el camino completo de datos
(petición DER, respuesta, huella y hora), no la criptografía del certificado, que se verifica por
fuera con `openssl ts -verify` y el certificado de la TSA.

Uso:  python3 tools/test_sello_tiempo.py     (código de salida 0 = correcto)
"""
import base64
import datetime as dt
import hashlib
import http.cookiejar
import http.server
import json
import os
import pathlib
import re
import secrets
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PUERTO = 18231
PUERTO_TSA = 18232
BASE = f"http://127.0.0.1:{PUERTO}"
tmp = tempfile.mkdtemp(prefix="ng-tsa-")
SECRET = "tsa-" + secrets.token_hex(16)
DB = pathlib.Path(tmp) / "novagest.db"

fallos = 0
pruebas = 0


def ok(nombre, condicion, detalle=""):
    global fallos, pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos += 1
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


# ------------------------------------------------------------------ DER mínimo (prueba)
def der(tag, cuerpo):
    n = len(cuerpo)
    largo = bytes([n]) if n < 0x80 else bytes([0x80 | ((n.bit_length() + 7) // 8)]) + n.to_bytes((n.bit_length() + 7) // 8, "big")
    return bytes([tag]) + largo + cuerpo


def der_int(v):
    return der(0x02, v.to_bytes(max(1, (v.bit_length() + 8) // 8), "big"))


def der_oid(puntos):
    p = [int(x) for x in puntos.split(".")]
    cuerpo = bytes([40 * p[0] + p[1]])
    for n in p[2:]:
        trozos = [n & 0x7F]
        n >>= 7
        while n:
            trozos.append(0x80 | (n & 0x7F))
            n >>= 7
        cuerpo += bytes(reversed(trozos))
    return der(0x06, cuerpo)


def leer_der(crudo):
    fuera, i = [], 0
    while i < len(crudo):
        tag = crudo[i]
        i += 1
        n = crudo[i]
        i += 1
        if n & 0x80:
            largo = n & 0x7F
            n = int.from_bytes(crudo[i:i + largo], "big")
            i += largo
        fuera.append((tag, crudo[i:i + n]))
        i += n
    return fuera


def huella_pedida(peticion):
    """Saca del TimeStampReq la huella SHA-256 que pide sellar."""
    raiz = leer_der(peticion)[0][1]
    partes = leer_der(raiz)
    imprint = leer_der(partes[1][1])
    return imprint[1][1].hex()


def respuesta_tsa(huella_hex, hora, estado=0, con_token=True):
    """TimeStampResp DER con un TSTInfo (sin firmar) dentro de un CMS SignedData mínimo."""
    gen = hora.strftime("%Y%m%d%H%M%S") + "Z"
    tst_info = der(0x30, b"".join([
        der_int(1),
        der_oid("1.2.3.4.1"),                                  # política de la TSA de prueba
        der(0x30, der(0x30, der_oid("2.16.840.1.101.3.4.2.1") + b"\x05\x00") + der(0x04, bytes.fromhex(huella_hex))),
        der_int(7),
        der(0x18, gen.encode()),
    ]))
    firmado = der(0x30, b"".join([
        der_int(3),
        der(0x31, der(0x30, der_oid("2.16.840.1.101.3.4.2.1") + b"\x05\x00")),
        der(0x30, der_oid("1.2.840.113549.1.9.16.1.4") + der(0xA0, der(0x04, tst_info))),
        der(0x31, b""),                                        # sin firmantes: TSA de prueba
    ]))
    contenido = der(0x30, der_oid("1.2.840.113549.1.7.2") + der(0xA0, firmado))
    estado_info = der(0x30, der_int(estado) + (der(0x30, der(0x0C, b"prueba")) if estado else b""))
    # El campo timeStampToken ES el ContentInfo (no va envuelto en otro SEQUENCE).
    cuerpo = estado_info + (contenido if con_token else b"")
    return der(0x30, cuerpo)


class Tsa(http.server.BaseHTTPRequestHandler):
    hora = None
    estado = 0

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        crudo = self.rfile.read(n)
        try:
            huella = huella_pedida(crudo)
        except Exception:
            self.send_error(400)
            return
        cuerpo = respuesta_tsa(huella, Tsa.hora or dt.datetime.now(dt.timezone.utc), estado=Tsa.estado)
        self.send_response(200)
        self.send_header("Content-Type", "application/timestamp-reply")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def log_message(self, *a):
        pass


def sesion(usuario, clave, base=None):
    base = base or BASE
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def call(method, path, data=None):
        cuerpo = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(base + path, method=method, data=cuerpo,
                                     headers={"Content-Type": "application/json", "X-CP": "1"})
        try:
            with op.open(req, timeout=20) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read() or b"{}")
            except Exception:
                return e.code, {}

    estado, _ = call("POST", "/api/login", {"username": usuario, "password": clave})
    if estado != 200:
        sys.exit(f"No se pudo iniciar sesión como {usuario} (código {estado})")
    return call, op


def fila(id_):
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    r = con.execute("SELECT * FROM audit_anchors WHERE id=?", (id_,)).fetchone()
    con.close()
    return dict(r) if r else None


def activar(base, env, cliente):
    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", cliente, "--term", "MES"], env=env, capture_output=True, text=True)
    clave = re.search(r"NG-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", gen.stdout or "")
    if not clave:
        sys.exit(f"No se pudo emitir la licencia:\n{gen.stdout}\n{gen.stderr}")
    req = urllib.request.Request(base + "/api/license/activate", method="POST",
                                 data=json.dumps({"license_key": clave.group(0)}).encode(),
                                 headers={"Content-Type": "application/json", "X-CP": "1"})
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"No se pudo activar la licencia (código {e.code})")


tsa = http.server.ThreadingHTTPServer(("127.0.0.1", PUERTO_TSA), Tsa)
threading.Thread(target=tsa.serve_forever, daemon=True).start()

env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PUERTO), "NOVAGEST_DEMO_USERS": "1",
       "LICENSE_SECRET": SECRET, "NOVAGEST_TSA_URL": f"http://127.0.0.1:{PUERTO_TSA}/"}
srv = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/api/health", timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    else:
        sys.exit("El servidor temporal no arrancó")
    activar(BASE, env, "Sello")
    jefe, op = sesion("jefe", "Jefe123!")

    print("\nLa autoridad de sellado devuelve la hora")
    ahora = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    Tsa.hora = ahora
    estado, r = jefe("POST", "/api/security-log/anchor", {"note": "con sello de tiempo"})
    ok("el anclaje se crea", estado == 200, f"{estado} {r}")
    sello = r.get("tsa") or {}
    ok("dice que quedó sellado", sello.get("estado") == "sellado", str(sello))
    ok("trae la hora de la autoridad", sello.get("ts") == int(ahora.timestamp()),
       f"{sello.get('ts')} vs {int(ahora.timestamp())}")
    ok("no devuelve el token entero en la respuesta", "token" not in sello, str(sello.keys()))

    print("\nLo guardado en la base")
    guardado = fila(r["id"])
    ok("guarda el estado del sello", guardado["tsa_estado"] == "sellado", str(guardado["tsa_estado"]))
    ok("guarda la URL de la autoridad", str(PUERTO_TSA) in (guardado["tsa_url"] or ""), str(guardado["tsa_url"]))
    ok("guarda la hora sellada", guardado["tsa_ts"] == int(ahora.timestamp()), str(guardado["tsa_ts"]))
    token = base64.b64decode(guardado["tsa_token"] or "")
    ok("guarda el token DER completo", len(token) > 100, f"{len(token)} bytes")
    ok("el token es una TimeStampResp (SEQUENCE)", token[:1] == b"\x30", token[:4].hex())
    ok("la huella del token es la del fichero guardado",
       hashlib.sha256(token).hexdigest() == guardado["tsa_sha256"], (guardado["tsa_sha256"] or "")[:16])

    print("\nEl token corresponde a la firma del anclaje")
    respuesta = leer_der(leer_der(token)[0][1])                 # [estado, ContentInfo]
    content_info = leer_der(respuesta[1][1])                    # [OID, [0] SignedData]
    signed = leer_der(content_info[1][1])[0][1]                 # SignedData
    encap = leer_der(leer_der(signed)[2][1])                    # EncapsulatedContentInfo
    tst = leer_der(leer_der(leer_der(encap[1][1])[0][1])[0][1])  # TSTInfo
    imprint = leer_der(tst[2][1])[1][1].hex()
    esperado = hashlib.sha256(bytes.fromhex(guardado["firma"])).hexdigest()
    ok("la huella que firmó la TSA es SHA-256 de la firma", imprint == esperado,
       f"{imprint[:16]} vs {esperado[:16]}")
    hora_tst = tst[4][1].decode()
    ok("el TSTInfo lleva la hora en GeneralizedTime", hora_tst.endswith("Z"), hora_tst)

    print("\nLa verificación del anclaje incluye el sello")
    _, v = jefe("GET", "/api/security-log/anchors")
    a = v["anchors"][0]
    ok("el anclaje está correcto", a["ok"] is True, str(a.get("motivo")))
    ok("el sello de tiempo cuadra", a["tsaOk"] is True, str(a.get("tsaOk")))
    ok("se informa cuántos anclajes van sellados", v["tsa"]["sellados"] == 1, str(v["tsa"]))
    ok("se informa de la autoridad configurada", v["tsa"]["configurada"] is True, str(v["tsa"]))

    print("\nEl token se puede descargar para verificarlo por fuera")
    with op.open(BASE + f"/api/security-log/anchor-token/{r['id']}", timeout=10) as resp:
        descargado = resp.read()
        tipo = resp.headers.get("Content-Type", "")
        disposicion = resp.headers.get("Content-Disposition", "")
    ok("se descarga el token en DER", descargado == token, f"{len(descargado)} vs {len(token)}")
    ok("con su tipo MIME de sello de tiempo", tipo == "application/timestamp-reply", tipo)
    ok("y un nombre de fichero .tsr", ".tsr" in disposicion, disposicion)

    print("\nSi se toca el token, el anclaje deja de cuadrar")
    con = sqlite3.connect(DB)
    otro = respuesta_tsa("00" * 32, ahora)
    con.execute("UPDATE audit_anchors SET tsa_token=? WHERE id=?", (base64.b64encode(otro).decode(), r["id"]))
    con.commit()
    con.close()
    _, v2 = jefe("GET", "/api/security-log/anchors")
    ok("se detecta que el sello no corresponde", v2["anchors"][0]["ok"] is False, str(v2["anchors"][0].get("motivo")))
    ok("con el motivo correcto", v2["anchors"][0]["motivo"] == "el sello de tiempo no corresponde a este anclaje",
       v2["anchors"][0]["motivo"])

    print("\nUna autoridad que rechaza no impide anclar")
    Tsa.estado = 2          # rejection
    estado, r2 = jefe("POST", "/api/security-log/anchor", {"note": "la TSA dice que no"})
    ok("el anclaje se crea igual", estado == 200, str(estado))
    ok("queda marcado como rechazado", (r2.get("tsa") or {}).get("estado") == "rechazada", str(r2.get("tsa")))
    _, v3 = jefe("GET", "/api/security-log/anchors")
    nuevo = [x for x in v3["anchors"] if x["id"] == r2["id"]][0]
    ok("sin sello, el anclaje sigue siendo válido", nuevo["ok"] is True and nuevo["tsaOk"] is None,
       str(nuevo.get("tsaOk")))
    Tsa.estado = 0

finally:
    srv.terminate()
    tsa.shutdown()
    try:
        srv.wait(timeout=5)
    except Exception:
        srv.kill()

print("\nAutoridad de sellado caída")
env2 = {**os.environ, "DATA_DIR": tempfile.mkdtemp(prefix="ng-tsa2-"), "PORT": str(PUERTO + 10),
        "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": SECRET,
        "NOVAGEST_TSA_URL": f"http://127.0.0.1:{PUERTO_TSA}/"}   # ya no escucha nadie
srv2 = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env2,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    base2 = f"http://127.0.0.1:{PUERTO + 10}"
    for _ in range(60):
        try:
            urllib.request.urlopen(base2 + "/api/health", timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    activar(base2, env2, "Sello2")
    jefe2, _ = sesion("jefe", "Jefe123!", base2)
    estado, r3 = jefe2("POST", "/api/security-log/anchor", {"note": "sin red hacia la TSA"})
    ok("anclar no depende de la autoridad", estado == 200, str(estado))
    ok("se guarda el motivo del fallo", (r3.get("tsa") or {}).get("estado") == "error", str(r3.get("tsa")))
    _, v4 = jefe2("GET", "/api/security-log/anchors")
    ok("el anclaje sigue siendo correcto", v4["anchors"][0]["ok"] is True, str(v4["anchors"][0].get("motivo")))
    ok("se ve que no hay sello de tiempo", v4["anchors"][0]["tsaOk"] is None, str(v4["anchors"][0]["tsaOk"]))
finally:
    srv2.terminate()
    try:
        srv2.wait(timeout=5)
    except Exception:
        srv2.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Sello de tiempo RFC 3161 correcto\n")
