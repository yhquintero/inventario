#!/usr/bin/env python3
"""Pruebas del anclaje firmado del sello de auditoría (S-12).

Arranca un servidor temporal, activa una licencia y comprueba contra la API real:
  · anclar el sello guarda la línea, el número de líneas y una firma;
  · la firma se puede recalcular por fuera con la misma fórmula HMAC;
  · un anclaje correcto se verifica y el registro queda enlazado;
  · borrar líneas del final (truncar) se detecta aunque la cadena restante cuadre;
  · cambiar una línea anterior también se detecta por el anclaje;
  · firmar exige que la cadena esté bien (si está rota no se ancla);
  · solo Administrador/Jefe/Económico ven y crean anclajes;
  · borrar un anclaje queda registrado en la auditoría.

Uso:  python3 tools/test_anclaje_auditoria.py     (código de salida 0 = correcto)
"""
import hashlib
import hmac
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
PORT = 18221
BASE = f"http://127.0.0.1:{PORT}"
tmp = tempfile.mkdtemp(prefix="ng-ancla-")
SECRET = "ancla-" + secrets.token_hex(16)
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


def clave_anclaje():
    """La misma derivación que el servidor: HMAC(secreto de licencia, «novagest-audit-anchor»)."""
    return hmac.new(SECRET.encode(), b"novagest-audit-anchor", hashlib.sha256).digest()


def firma_esperada(ts, head, lineas):
    return hmac.new(clave_anclaje(), f"{ts}|{head}|{lineas}".encode(), hashlib.sha256).hexdigest()


def filas_db():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    filas = con.execute("SELECT id, ts, head, lineas, firma FROM audit_anchors ORDER BY id").fetchall()
    con.close()
    return [dict(f) for f in filas]


def total_lineas():
    con = sqlite3.connect(DB)
    n = con.execute("SELECT COUNT(*) FROM audit").fetchone()[0]
    con.close()
    return n


env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT),
       "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": SECRET}
proc = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
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

    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", "Ancla", "--term", "MES"],
                         env=env, capture_output=True, text=True)
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

    print("\nAnclar el sello")
    estado, r = jefe("POST", "/api/security-log/anchor", {"note": "cierre de mes"})
    ok("responde 200", estado == 200, f"{estado} {r}")
    ok("devuelve el número de anclaje", isinstance(r.get("id"), int), str(r.get("id")))
    ok("dice cuántas líneas quedaron selladas", r.get("lineas", 0) >= 2, str(r.get("lineas")))
    ok("devuelve el sello (hash) y su forma corta", len(r.get("head") or "") == 64 and len(r.get("headShort") or "") == 12, str(r))
    ok("la cadena se comprobó antes de firmar", r.get("checked", 0) >= 2, str(r.get("checked")))

    print("\nLa firma se puede recalcular por fuera")
    ancla = filas_db()[0]
    ok("queda guardada en la base", bool(ancla), str(ancla))
    ok("la firma usa HMAC-SHA256 con la clave derivada",
       ancla["firma"] == firma_esperada(ancla["ts"], ancla["head"], ancla["lineas"]),
       ancla["firma"][:16])
    ok("el número de líneas coincide con la tabla de auditoría",
       ancla["lineas"] <= total_lineas(), f"{ancla['lineas']} de {total_lineas()}")

    print("\nVerificación")
    estado, v = jefe("GET", "/api/security-log/anchors")
    ok("responde 200", estado == 200, str(estado))
    ok("hay un anclaje listado", v.get("total") == 1, str(v.get("total")))
    ok("el anclaje está correcto", v["anchors"][0].get("ok") is True, str(v["anchors"][0]))
    ok("firma, líneas y cadena cuadran por separado",
       all(v["anchors"][0].get(k) is True for k in ("firmaOk", "lineasOk", "cadenaOk")),
       str(v["anchors"][0]))
    ok("el resumen general está bien", v.get("ok") is True, str(v.get("ok")))

    print("\nSe ancla también un segundo momento")
    for _ in range(3):
        jefe("POST", "/api/login", {"username": "jefe", "password": "Jefe123!"})
    estado, r2 = jefe("POST", "/api/security-log/anchor", {})
    ok("el segundo anclaje se crea", estado == 200 and r2.get("id") != r.get("id"), str(r2))
    _, v2 = jefe("GET", "/api/security-log/anchors")
    ok("se listan los dos", v2.get("total") == 2, str(v2.get("total")))
    ok("los dos están correctos", all(a["ok"] for a in v2["anchors"]), str(v2["anchors"]))
    ok("el segundo sella más líneas que el primero",
       v2["anchors"][1]["lineas"] > v2["anchors"][0]["lineas"], str([a["lineas"] for a in v2["anchors"]]))

    print("\nTruncar el final del registro (lo que la cadena sola no ve)")
    con = sqlite3.connect(DB)
    con.execute("DELETE FROM audit WHERE id > ?", (ancla["lineas"],))
    con.commit()
    con.close()
    _, v3 = jefe("GET", "/api/security-log/anchors")
    ultimo = v3["anchors"][-1]
    primero = v3["anchors"][0]
    ok("el anclaje que selló las líneas borradas se marca como roto", ultimo["ok"] is False, str(ultimo))
    ok("se explica que faltan líneas", ultimo["motivo"] == "faltan líneas del registro", ultimo["motivo"])
    ok("la firma en sí sigue siendo válida (no se manipuló el anclaje)", ultimo["firmaOk"] is True, str(ultimo))
    ok("el anclaje de un tramo anterior sigue válido (su parte no se tocó)", primero["ok"] is True, str(primero))

    print("\nCambiar una línea anterior")
    con = sqlite3.connect(DB)
    con.execute("UPDATE audit SET details='cambiado a mano' WHERE id=1")
    con.commit()
    con.close()
    _, v4 = jefe("GET", "/api/security-log/anchors")
    ok("el anclaje detecta el cambio", v4["anchors"][0]["ok"] is False, str(v4["anchors"][0]))
    ok("el motivo es que cambió la cadena", v4["anchors"][0]["motivo"] == "la cadena cambió después del anclaje",
       v4["anchors"][0]["motivo"])

    print("\nNo se ancla un registro que no cuadra")
    estado, r3 = jefe("POST", "/api/security-log/anchor", {})
    ok("el servidor se niega (409)", estado == 409, str(estado))
    ok("explica que hay que revisar la cadena", "cuadra" in (r3.get("error") or "").lower(), str(r3.get("error")))
    ok("devuelve el detalle de la cadena rota", isinstance(r3.get("chain"), dict), str(r3.get("chain"))[:80])

    print("\nPermisos")
    economico = sesion("economico", "Eco123!")
    estado, _ = economico("GET", "/api/security-log/anchors")
    ok("economía puede ver los anclajes", estado == 200, str(estado))
    estado, _ = economico("DELETE", f"/api/security-log/anchor/{ancla['id']}")
    ok("economía no puede borrar un anclaje", estado == 403, str(estado))
    alm = sesion("almacenero", "Alma123!")
    estado, _ = alm("GET", "/api/security-log/anchors")
    ok("almacén no ve los anclajes", estado == 403, str(estado))
    estado, _ = alm("POST", "/api/security-log/anchor", {})
    ok("almacén no puede anclar", estado == 403, str(estado))

    print("\nBorrar un anclaje")
    estado, _ = jefe("DELETE", f"/api/security-log/anchor/{ancla['id']}")
    ok("el jefe puede borrar un anclaje", estado == 200, str(estado))
    _, v5 = jefe("GET", "/api/security-log/anchors")
    ok("ya solo queda el otro anclaje", v5.get("total") == 1 and v5["anchors"][0]["id"] == r2["id"],
       str([a["id"] for a in v5.get("anchors", [])]))
    ok("y sigue marcado como roto porque el registro no cuadra", v5["anchors"][0]["ok"] is False, str(v5["anchors"][0]))
    con = sqlite3.connect(DB)
    acciones = [r[0] for r in con.execute("SELECT action FROM audit")]
    con.close()
    ok("la acción AUDIT_ANCHOR_DELETE queda en el registro", "AUDIT_ANCHOR_DELETE" in acciones, str(acciones[-3:]))
    estado, _ = jefe("DELETE", "/api/security-log/anchor/999999")
    ok("borrar uno que no existe da 404", estado == 404, str(estado))
    estado, _ = jefe("DELETE", "/api/security-log/anchor/abc")
    ok("un identificador no numérico da 400", estado == 400, str(estado))

finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Anclaje del sello de auditoría correcto\n")
