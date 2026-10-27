#!/usr/bin/env python3
"""Pruebas del estado de salud del servidor (S-09).

Arranca un servidor temporal (igual que `test_carga.py`) y comprueba que
`/api/health` devuelve las métricas operativas en una sola llamada, sin datos
personales y con avisos útiles cuando falta la licencia o las copias.

Uso:  python3 tools/test_salud_servidor.py     (código de salida 0 = correcto)
"""
import gzip, json, os, pathlib, subprocess, sys, tempfile, time, urllib.request

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
    # El servidor puede crear una copia al arrancar: la expectativa sale del dato.
    copias = salud.get("copias") or {}
    avisos = set(salud.get("avisos") or [])
    if copias.get("total", 0) == 0:
        ok("sin copias avisa", "sin-copias" in avisos, str(sorted(avisos)))
    else:
        ok("con copia reciente no avisa de copias",
           not ({"sin-copias", "copias-viejas"} & avisos), str(sorted(avisos)))
    ok("el estado global es «aviso»", salud.get("estado") == "aviso", str(salud.get("estado")))
    ok("las copias se describen con total y última", {"total", "ultima", "haceHoras"} <= set((salud.get("copias") or {}).keys()))

    # Ninguna métrica debe exponer contenido de la base ni datos de personas.
    texto = json.dumps(datos, ensure_ascii=False).lower()
    for prohibido in ("password", "pw_hash", "token", "customer", "client_name"):
        ok(f"no expone «{prohibido}»", prohibido not in texto)

    # El contador de días cerrados es coherente con la base recién creada.
    ok("empieza sin días cerrados", salud.get("diasCerrados") == 0, str(salud.get("diasCerrados")))

    # S-05: espacio en disco y vigencia de la licencia para el titular.
    disco = salud.get("disco") or {}
    ok("informa el espacio del disco", isinstance(disco.get("totalBytes"), int) and disco["totalBytes"] > 0, str(disco))
    ok("informa el espacio libre", isinstance(disco.get("libreBytes"), int) and disco["libreBytes"] >= 0, str(disco.get("libreBytes")))
    ok("informa el porcentaje libre", 0 <= (disco.get("librePct") or 0) <= 100, str(disco.get("librePct")))
    licencia = salud.get("licencia") or {}
    ok("incluye el bloque de licencia", isinstance(licencia, dict) and set(licencia) == {"tipo", "vence", "diasRestantes"}, str(licencia))
    ok("sin licencia activa los días son nulos", licencia.get("diasRestantes") is None, str(licencia.get("diasRestantes")))
    ok("sin licencia no hay tipo", licencia.get("tipo") is None, str(licencia.get("tipo")))
    ok("los avisos son claves cortas conocidas",
       all(a in {"licencia", "sin-copias", "copias-viejas", "disco-bajo", "licencia-vence", "copia-externa"}
           for a in salud.get("avisos") or []),
       str(salud.get("avisos")))
    # S-14: la copia externa se informa sin credenciales.
    externa = salud.get("copiaExterna") or {}
    ok("informa de la copia externa", "configurados" in externa and "destinos" in externa, str(externa))
    ok("sin destinos configurados son cero", externa.get("configurados") == 0, str(externa))

    # S-11: la compresión llega al cliente y los archivos viajan comprimidos.
    def pedir(path, gzip_ok=True):
        cabeceras = {"X-CP": "1"}
        if gzip_ok:
            cabeceras["Accept-Encoding"] = "gzip"
        req = urllib.request.Request(BASE + path, headers=cabeceras)
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.headers, r.read()

    print("\nCompresión (S-11)")
    cab, cuerpo = pedir("/css/app.css")
    ok("el CSS viaja comprimido", cab.get("Content-Encoding") == "gzip", str(cab.get("Content-Encoding")))
    ok("el CSS comprimido se descomprime", b"NovaGest" in gzip.decompress(cuerpo) or len(gzip.decompress(cuerpo)) > 1000)
    cab2, cuerpo2 = pedir("/css/app.css", gzip_ok=False)
    ok("sin Accept-Encoding no se comprime", cab2.get("Content-Encoding") is None)
    ok("el CSS sin comprimir es mayor que comprimido", len(cuerpo2) > len(cuerpo))
    ok("se anuncia Vary: Accept-Encoding", "Accept-Encoding" in (cab.get("Vary") or ""), str(cab.get("Vary")))
    cab3, _ = pedir("/api/health")
    ok("las respuestas pequeñas de la API no se comprimen", cab3.get("Content-Encoding") is None)
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
