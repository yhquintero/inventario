#!/usr/bin/env python3
"""Pruebas del estado de salud del servidor (S-09).

Arranca un servidor temporal (igual que `test_carga.py`) y comprueba que
`/api/health` devuelve las métricas operativas en una sola llamada, sin datos
personales y con avisos útiles cuando falta la licencia o las copias.

Uso:  python3 tools/test_salud_servidor.py     (código de salida 0 = correcto)
"""
import json, os, pathlib, subprocess, sys, tempfile, time, urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PORT = 18195
BASE = f"http://127.0.0.1:{PORT}"
tmp = tempfile.mkdtemp(prefix="ng-salud-")

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


def leer():
    req = urllib.request.Request(BASE + "/api/health", headers={"X-CP": "1"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, json.loads(r.read().decode("utf-8"))


env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT)}
proc = subprocess.Popen(
    [sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/api/health", timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    else:
        sys.exit("El servidor temporal no arrancó")

    estado, datos = leer()
    print("\n/api/health")
    ok("responde 200 sin iniciar sesión", estado == 200, str(estado))
    ok("se identifica como NovaGest", datos.get("app") == "NovaGest")
    ok("trae la versión", isinstance(datos.get("version"), str) and datos["version"])

    salud = datos.get("salud") or {}
    ok("incluye el bloque de salud", isinstance(salud, dict) and salud)
    for clave in ("estado", "avisos", "uptimeSegundos", "latenciaMs", "bdBytes", "copias", "diasCerrados", "sesionesActivas"):
        ok(f"métrica «{clave}»", clave in salud, str(sorted(salud)))
    ok("la latencia se mide en milisegundos", isinstance(salud.get("latenciaMs"), (int, float)) and salud["latenciaMs"] >= 0)
    ok("el tamaño de la base es un número", isinstance(salud.get("bdBytes"), int) and salud["bdBytes"] > 0)
    ok("el tiempo en marcha avanza", isinstance(salud.get("uptimeSegundos"), int) and salud["uptimeSegundos"] >= 0)
    ok("sin licencia activa avisa", "licencia" in (salud.get("avisos") or []), str(salud.get("avisos")))
    ok("sin copias avisa", "sin-copias" in (salud.get("avisos") or []), str(salud.get("avisos")))
    ok("el estado global es «aviso»", salud.get("estado") == "aviso", str(salud.get("estado")))
    ok("las copias se describen con total y última", {"total", "ultima", "haceHoras"} <= set((salud.get("copias") or {}).keys()))

    # Ninguna métrica debe exponer contenido de la base ni datos de personas.
    texto = json.dumps(datos, ensure_ascii=False).lower()
    for prohibido in ("password", "pw_hash", "token", "customer", "client_name"):
        ok(f"no expone «{prohibido}»", prohibido not in texto)

    # El contador de días cerrados es coherente con la base recién creada.
    ok("empieza sin días cerrados", salud.get("diasCerrados") == 0, str(salud.get("diasCerrados")))
finally:
    proc.terminate()
    try:
        proc.wait(timeout=10)
    except subprocess.TimeoutExpired:
        proc.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    print("Fallos: " + str(fallos))
    sys.exit(1)
print("Estado de salud del servidor correcto\n")
