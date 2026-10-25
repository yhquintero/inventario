#!/usr/bin/env python3
"""Pruebas de la auditoría de impresiones (S-10).

Arranca un servidor temporal, activa una licencia y comprueba que:
  · cualquiera que vende puede registrar una impresión,
  · solo jefatura/administración/económico puede consultar el listado,
  · el registro guarda la referencia de la venta, no el contenido del ticket,
  · los datos absurdos (ancho, copias, tipo) se sanean en lugar de romper.

Uso:  python3 tools/test_impresiones.py     (código de salida 0 = correcto)
"""
import http.cookiejar
import json
import os
import pathlib
import re
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PORT = 18197
BASE = f"http://127.0.0.1:{PORT}"
tmp = tempfile.mkdtemp(prefix="ng-prints-")
SECRET = "prints-" + secrets.token_hex(16)

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
            with op.open(req, timeout=15) as r:
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

    # Licencia emitida con el secreto de esta instalación temporal.
    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", "Impresiones", "--term", "MES"],
                         env=env, capture_output=True, text=True)
    hallada = re.search(r"NG-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", gen.stdout or "")
    if not hallada:
        sys.exit(f"No se pudo emitir la licencia:\n{gen.stdout}\n{gen.stderr}")
    # Activación sin sesión (ruta pública)
    req = urllib.request.Request(BASE + "/api/license/activate", method="POST",
                                 data=json.dumps({"license_key": hallada.group(0)}).encode(),
                                 headers={"Content-Type": "application/json", "X-CP": "1"})
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"No se pudo activar la licencia temporal (código {e.code})")

    jefe = sesion("jefe", "Jefe123!")
    alma = sesion("almacenero", "Alma123!")
    eco = sesion("economico", "Eco123!")

    print("\nRegistrar una impresión")
    estado, r = alma("POST", "/api/prints", {"saleId": "sale-001", "code": "ABC-DEFG",
                                             "width": 58, "kind": "ticket", "copies": 1})
    ok("el almacenero puede registrarla", estado == 200, str(estado))
    ok("la respuesta confirma", (r.get("ok") is True))

    estado, _ = jefe("POST", "/api/prints", {"saleId": "sale-002", "code": "hij-klmn"})
    ok("jefatura también puede registrarla", estado == 200, str(estado))

    estado, _ = alma("POST", "/api/prints", {"width": 58})
    ok("sin venta ni código se rechaza con 400", estado == 400, str(estado))

    estado, _ = alma("POST", "/api/prints", {"saleId": "sale-003", "width": 999,
                                             "kind": "inventado", "copies": 99})
    ok("un ancho y un tipo absurdos no rompen la ruta", estado == 200, str(estado))

    print("\nConsultar el registro")
    estado, r = jefe("GET", "/api/prints?limit=50")
    ok("jefatura puede consultarlo", estado == 200, str(estado))
    filas = r.get("prints") or []
    ok("aparecen las impresiones registradas", len(filas) == 3, str(len(filas)))
    ok("se informa el total", r.get("total") == 3, str(r.get("total")))
    ok("la más reciente va primero", filas and filas[0].get("sale_id") == "sale-003", str(filas[0] if filas else None))
    ok("se saneó el ancho a 58 mm", filas and filas[0].get("width") == 58, str(filas[0].get("width") if filas else None))
    ok("las copias se limitan a 20", filas and filas[0].get("copies") == 20, str(filas[0].get("copies") if filas else None))
    ok("se saneó el tipo desconocido a ticket", filas and filas[0].get("kind") == "ticket", str(filas[0].get("kind") if filas else None))
    ok("el código se guarda en mayúsculas", any(f.get("code") == "HIJ-KLMN" for f in filas))
    ok("se registra quién lo imprimió", {f.get("user") for f in filas} == {"almacenero", "jefe"}, str({f.get("user") for f in filas}))
    ok("no se guarda el contenido del ticket",
       all(set(f) == {"ts", "user", "sale_id", "code", "width", "kind", "copies"} for f in filas),
       str(sorted(filas[0]) if filas else None))

    estado, r = eco("GET", "/api/prints")
    ok("el económico también puede consultarlo", estado == 200, str(estado))
    ok("el límite por defecto es razonable", len(r.get("prints") or []) == 3)

    estado, _ = alma("GET", "/api/prints")
    ok("el almacenero no puede ver el listado (403)", estado == 403, str(estado))

    estado, r = jefe("GET", "/api/prints?limit=99999")
    ok("un límite absurdo no rompe la consulta", estado == 200, str(estado))
    estado, r = jefe("GET", "/api/prints?limit=abc")
    ok("un límite no numérico usa el valor por defecto", estado == 200, str(estado))

    estado, r = jefe("GET", "/api/prints?sale=sale-001")
    ok("se puede filtrar por venta", estado == 200 and len(r.get("prints") or []) == 1,
       str(len(r.get("prints") or [])))
    estado, r = jefe("GET", "/api/prints?sale=../etc/passwd")
    ok("un filtro con caracteres raros no rompe la consulta", estado == 200, str(estado))

    print("\nPersistencia")
    estado, r = jefe("GET", "/api/prints?limit=1")
    ok("el registro sobrevive a la consulta", estado == 200 and r.get("total") == 3, str(r.get("total")))
finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Auditoría de impresiones correcta\n")
