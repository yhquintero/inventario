#!/usr/bin/env python3
"""Pruebas del estado de salud del servidor (S-09).

Arranca un servidor temporal (igual que `test_carga.py`) y comprueba que
`/api/health` devuelve las métricas operativas en una sola llamada, sin datos
personales y con avisos útiles cuando falta la licencia o las copias.

Uso:  python3 tools/test_salud_servidor.py     (código de salida 0 = correcto)
"""
import gzip, json, os, pathlib, re, subprocess, sys, tempfile, time, urllib.error, urllib.request

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


env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT), "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": "test-health-secret"}
proc = subprocess.Popen(
    [sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
proc2 = None
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
    ok("trae un identificador de arranque efímero", bool(re.fullmatch(r"[0-9a-f]{16}", datos.get("instanceId", ""))))

    salud = datos.get("salud") or {}
    ok("incluye el bloque de salud", isinstance(salud, dict) and salud)
    for clave in ("estado", "uptimeSegundos", "latenciaMs"):
        ok(f"métrica pública mínima «{clave}»", clave in salud, str(sorted(salud)))
    for privado in ("bdBytes", "walBytes", "copias", "diasCerrados", "sesionesActivas", "disco", "licencia", "copiaExterna", "avisos"):
        ok(f"oculta detalle interno público «{privado}»", privado not in salud, str(sorted(salud)))
    ok("la latencia se mide en milisegundos", isinstance(salud.get("latenciaMs"), (int, float)) and salud["latenciaMs"] >= 0)
    ok("el ping público no revela tipo ni vigencia de licencia", "licenseValid" not in datos and "licenseType" not in datos)
    _, datos2 = leer()
    ok("el ID de arranque se mantiene estable dentro del mismo proceso", datos2.get("instanceId") == datos.get("instanceId"))

    # Ninguna métrica debe exponer contenido de la base ni datos de personas.
    texto = json.dumps(datos, ensure_ascii=False).lower()
    for prohibido in ("password", "pw_hash", "token", "customer", "client_name"):
        ok(f"no expone «{prohibido}»", prohibido not in texto)

    id_anterior = datos["instanceId"]
    proc.terminate()
    proc.wait(timeout=10)
    proc = None
    proc2 = subprocess.Popen(
        [sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    for _ in range(60):
        try:
            _, tras_reinicio = leer()
            break
        except Exception:
            time.sleep(0.5)
    else:
        sys.exit("El servidor temporal no reinició")
    ok("el ID de arranque cambia después de reiniciar el proceso", tras_reinicio.get("instanceId") != id_anterior)

finally:
    for proceso in (proc, proc2):
        if proceso and proceso.poll() is None:
            proceso.terminate()
            try:
                proceso.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proceso.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    print("Fallos: " + str(fallos))
    sys.exit(1)
print("Estado de salud del servidor correcto\n")
