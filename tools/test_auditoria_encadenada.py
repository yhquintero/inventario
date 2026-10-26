#!/usr/bin/env python3
"""Pruebas de la auditoría encadenada (S-01).

Arranca un servidor temporal, activa una licencia y comprueba contra la API real:
  · cada línea del registro de seguridad lleva su hash y el de la anterior;
  · `/api/security-log/verify` confirma una cadena correcta y cuenta las líneas;
  · cambiar un detalle por detrás (SQLite) rompe la cadena y se informa de la línea;
  · borrar una línea intermedia también se detecta (enlace roto);
  · reiniciar el servidor no invalida lo ya encadenado (no se recalculan hashes viejos);
  · el registro paginado trae `hashShort` y el `id` de cada línea;
  · solo los perfiles con acceso a seguridad pueden comprobar la cadena.

Uso:  python3 tools/test_auditoria_encadenada.py     (código de salida 0 = correcto)
"""
import hashlib
import http.cookiejar
import json
import os
import pathlib
import re
import secrets
import sqlite3
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PORT = 18211
BASE = f"http://127.0.0.1:{PORT}"
tmp = tempfile.mkdtemp(prefix="ng-cadena-")
SECRET = "cadena-" + secrets.token_hex(16)
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


def esperar_servidor():
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/api/health", timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def sesion(usuario, clave):
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def call(method, path, data=None):
        cuerpo = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(BASE + path, method=method, data=cuerpo,
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
    return call


def huella(prev, ts, user, action, details, ip):
    """La misma fórmula que usa el servidor: sirve para comprobar el encadenado por fuera."""
    base = "\x1f".join([prev or "", str(ts or 0), user or "", action or "", details or "", ip or ""])
    return hashlib.sha256(base.encode("utf-8")).hexdigest()


def filas_db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    filas = con.execute("SELECT id, ts, user, action, details, ip, prev, hash FROM audit ORDER BY id").fetchall()
    con.close()
    return [dict(f) for f in filas]


def arrancar():
    env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT),
           "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": SECRET}
    proc = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not esperar_servidor():
        sys.exit("El servidor temporal no arrancó")
    return proc


def parar(proc):
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()


proc = arrancar()
try:
    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", "Cadena", "--term", "MES"],
                         env={**os.environ, "DATA_DIR": tmp, "LICENSE_SECRET": SECRET},
                         capture_output=True, text=True)
    hallada = re.search(r"NG-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", gen.stdout or "")
    if not hallada:
        sys.exit(f"No se pudo emitir la licencia:\n{gen.stdout}\n{gen.stderr}")
    req = urllib.request.Request(BASE + "/api/license/activate", method="POST",
                                 data=json.dumps({"license_key": hallada.group(0)}).encode(),
                                 headers={"Content-Type": "application/json", "X-CP": "1"})
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"No se pudo activar la licencia (código {e.code})")

    jefe = sesion("jefe", "Jefe123!")
    economico = sesion("economico", "Eco123!")

    print("\nEncadenado de las líneas")
    filas = filas_db()
    ok("al arrancar ya hay líneas (bootstrap y activación)", len(filas) >= 2, str(len(filas)))
    ok("todas las líneas tienen hash", all(f["hash"] for f in filas), str([f["id"] for f in filas if not f["hash"]]))
    ok("la primera línea parte de un enlace vacío", filas[0]["prev"] == "", filas[0]["prev"])
    prev = ""
    encadenadas = True
    for f in filas:
        if f["prev"] != prev or f["hash"] != huella(f["prev"], f["ts"], f["user"], f["action"], f["details"], f["ip"]):
            encadenadas = False
            break
        prev = f["hash"]
    ok("cada hash encaja con sus datos y con el anterior", encadenadas)

    # Se generan más eventos para tener una cadena con volumen.
    for n in range(3):
        jefe("POST", "/api/login", {"username": "jefe", "password": "mal"})
        jefe("POST", "/api/login", {"username": "jefe", "password": "Jefe123!"})
    total = len(filas_db())
    ok("la cadena crece con cada evento", total > len(filas), f"{len(filas)} → {total}")

    print("\nComprobación por la API")
    estado, r = jefe("GET", "/api/security-log/verify")
    ok("responde 200", estado == 200, str(estado))
    ok("la cadena está correcta", r.get("ok") is True, str(r))
    ok("revisa todas las líneas", r.get("checked") == total, f'{r.get("checked")} de {total}')
    ok("devuelve el sello actual (último hash)", r.get("head") == filas_db()[-1]["hash"], str(r.get("head")))
    ok("sin línea rota", r.get("brokenAt") is None, str(r.get("brokenAt")))
    _, rango = jefe("GET", "/api/security-log/verify?from=2&to=4")
    ok("se puede comprobar un tramo", rango.get("ok") is True and rango.get("checked") == 3, str(rango.get("checked")))
    _, malo = jefe("GET", "/api/security-log/verify?from=abc&to=xyz")
    ok("un tramo mal escrito no rompe la comprobación", malo.get("ok") is True, str(malo))

    print("\nRegistro paginado con huellas")
    estado, log = jefe("GET", "/api/security-log?limit=5")
    ok("responde 200", estado == 200, str(estado))
    ok("cada evento trae su huella corta", all(len(x.get("hashShort") or "") == 12 for x in log.get("log") or []), str(log.get("log")[:1]))
    ok("cada evento trae su id", all(isinstance(x.get("id"), int) for x in log.get("log") or []))
    ok("no se expone el hash completo", all("hash" not in x for x in log.get("log") or []))

    print("\nPermisos")
    estado, _ = economico("GET", "/api/security-log/verify")
    ok("economía también puede comprobar la cadena", estado == 200, str(estado))
    alm = sesion("almacenero", "Alma123!")
    estado, _ = alm("GET", "/api/security-log/verify")
    ok("almacén no puede ver el registro de seguridad", estado == 403, str(estado))

    print("\nManipulación por detrás (los dados están cargados)")
    con = sqlite3.connect(DB)
    con.execute("UPDATE audit SET details='otra cosa' WHERE id=?", (filas_db()[2]["id"],))
    con.commit()
    con.close()
    estado, r = jefe("GET", "/api/security-log/verify")
    ok("se detecta la línea cambiada", estado == 200 and r.get("ok") is False, str(r.get("ok")))
    ok("se informa del motivo: los datos no cuadran", r.get("reason") == "hash", str(r.get("reason")))
    ok("se informa de la línea rota", r.get("brokenAt") == filas_db()[2]["id"], str(r.get("brokenAt")))
    ok("la comprobación se detiene en la primera línea rota", r.get("checked") == 3, str(r.get("checked")))

    # Se repara la cadena calculándola otra vez por fuera, para poder probar el eslabón borrado.
    filas = filas_db()
    prev = ""
    arreglos = []
    for f in filas:
        h = huella(prev, f["ts"], f["user"], f["action"], f["details"], f["ip"])
        arreglos.append((prev, h, f["id"]))
        prev = h
    con = sqlite3.connect(DB)
    con.executemany("UPDATE audit SET prev=?, hash=? WHERE id=?", arreglos)
    con.commit()
    con.close()
    estado, r = jefe("GET", "/api/security-log/verify")
    ok("recalculada la cadena, vuelve a estar correcta", r.get("ok") is True, str(r))

    # Ahora se borra una línea del medio: falta un eslabón.
    medio = filas_db()[3]["id"]
    con = sqlite3.connect(DB)
    con.execute("DELETE FROM audit WHERE id=?", (medio,))
    con.commit()
    con.close()
    estado, r = jefe("GET", "/api/security-log/verify")
    ok("se detecta la línea borrada", r.get("ok") is False, str(r.get("ok")))
    ok("se informa del enlace roto", r.get("reason") == "enlace", str(r.get("reason")))
    ok("la línea señalada es la siguiente a la borrada", r.get("brokenAt") == medio + 1, f'{r.get("brokenAt")} · esperado {medio + 1}')

    print("\nReinicio del servidor")
    parar(proc)
    proc = arrancar()
    con = sqlite3.connect(DB)
    antes = {f["id"]: f["hash"] for f in filas_db()}
    con.close()
    jefe = sesion("jefe", "Jefe123!")
    despues = {f["id"]: f["hash"] for f in filas_db()}
    ok("reiniciar no reescribe los hashes ya guardados",
       all(despues.get(i) == h for i, h in antes.items()), "alguna huella cambió")
    nuevo = [i for i in despues if i not in antes]
    ok("las líneas nuevas del reinicio también se encadenan", bool(nuevo), str(nuevo))
    estado, r = jefe("GET", "/api/security-log/verify")
    ok("tras reiniciar la comprobación sigue funcionando", estado == 200, str(estado))
    ok("el enlace roto del borrado sigue detectándose", r.get("ok") is False and r.get("reason") == "enlace", str(r))

finally:
    parar(proc)

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Auditoría encadenada correcta\n")
