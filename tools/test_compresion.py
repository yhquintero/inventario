#!/usr/bin/env python3
"""Pruebas de compresión gzip y límites de tamaño del servidor (S-11).

No levanta el servidor: usa el propio `Api` con un objeto de respuesta falso, así
se comprueba exactamente lo que se escribe en el socket y con qué cabeceras.

Uso:  python3 tools/test_compresion.py     (código de salida 0 = correcto)
"""
import gzip
import importlib.util
import io
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ng", RAIZ / "server" / "novagest_server.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

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


class Respuesta:
    """Doble de `Api` con lo mínimo que tocan send_json y body."""

    def __init__(self, accept="gzip"):
        self.headers = {"Accept-Encoding": accept} if accept else {}
        self.cabeceras = []
        self.wfile = io.BytesIO()
        self.code = None

    # métodos usados por send_json
    def send_response(self, code):
        self.code = code

    def send_header(self, k, v):
        self.cabeceras.append((k, v))

    def headers_common(self):
        self.cabeceras.append(("X-Content-Type-Options", "nosniff"))

    def end_headers(self):
        pass

    def header(self, nombre):
        for k, v in self.cabeceras:
            if k.lower() == nombre.lower():
                return v
        return None

    # métodos del servidor que se prueban tal cual
    accepts_gzip = m.Api.accepts_gzip
    maybe_gzip = m.Api.maybe_gzip
    send_json = m.Api.send_json

    def body(self, max_bytes=None):
        return m.Api.body(self, max_bytes=max_bytes)


def json_de(respuesta):
    crudo = respuesta.wfile.getvalue()
    if respuesta.header("Content-Encoding") == "gzip":
        crudo = gzip.decompress(crudo)
    return json.loads(crudo.decode("utf-8"))


print("\nCompresión")
grande = {"products": [{"id": i, "name": "Producto de prueba " * 3} for i in range(40)]}
r = Respuesta("gzip, deflate")
r.send_json(200, grande)
ok("con Accept-Encoding: gzip responde comprimido", r.header("Content-Encoding") == "gzip")
ok("el cuerpo comprimido se descomprime al JSON original", json_de(r) == grande)
ok("Content-Length coincide con lo enviado", int(r.header("Content-Length")) == len(r.wfile.getvalue()))
fuente = (RAIZ / "server" / "novagest_server.py").read_text(encoding="utf-8")
ok("anuncia Vary: Accept-Encoding para las cachés", 'send_header("Vary", "Accept-Encoding")' in fuente)

r2 = Respuesta("")
r2.send_json(200, grande)
ok("sin Accept-Encoding responde sin comprimir", r2.header("Content-Encoding") is None)
ok("sin comprimir el JSON se lee igual", json_de(r2) == grande)
ok("Content-Length del cuerpo sin comprimir es correcto", int(r2.header("Content-Length")) == len(r2.wfile.getvalue()))

r3 = Respuesta("gzip")
r3.send_json(200, {"ok": True})
ok("las respuestas pequeñas no se comprimen", r3.header("Content-Encoding") is None)
ok("la respuesta pequeña se lee bien", json_de(r3) == {"ok": True})

pequeno = b"x" * 10
ok("maybe_gzip ignora cuerpos diminutos", Respuesta("gzip").maybe_gzip(pequeno) is None)
comprimido = Respuesta("gzip").maybe_gzip(b"y" * 5000)
ok("maybe_gzip comprime cuerpos grandes", comprimido is not None and gzip.decompress(comprimido) == b"y" * 5000)
ok("lo comprimido ocupa menos", comprimido is not None and len(comprimido) < 5000)
ok("maybe_gzip respeta al cliente que no acepta gzip", Respuesta("").maybe_gzip(b"y" * 5000) is None)
ok("accepts_gzip entiende la cabecera", Respuesta("br, gzip;q=0.8").accepts_gzip() and not Respuesta("br").accepts_gzip())

print("\nLímites de tamaño")
ok("el límite general es de 30 MB por defecto", m.MAX_BODY == 30 * 1024 * 1024, str(m.MAX_BODY))
ok("el estado tiene su propio límite menor", m.MAX_STATE == 12 * 1024 * 1024, str(m.MAX_STATE))
ok("el estado cabe en el límite general", m.MAX_STATE < m.MAX_BODY)

cuerpo = json.dumps({"version": 1, "state": {"products": []}}).encode()


def peticion(payload, limite=None):
    f = Respuesta("gzip")
    f.headers = {"Content-Length": str(len(payload))}
    f.rfile = io.BytesIO(payload)
    return f.body(max_bytes=limite)


ok("una petición normal se lee", peticion(cuerpo)["version"] == 1)
try:
    peticion(b"{}", limite=1)
    ok("una petición por encima del límite se rechaza", False, "no lanzó la excepción")
except m.PayloadTooLarge as e:
    ok("una petición por encima del límite se rechaza", True)
    ok("el mensaje del 413 explica el máximo", "MB" in str(e), str(e))

try:
    f = Respuesta("gzip")
    f.headers = {"Content-Length": str(m.MAX_BODY + 1)}
    f.rfile = io.BytesIO(b"")
    f.body()
    ok("el límite general se aplica sin pasar max_bytes", False, "no lanzó la excepción")
except m.PayloadTooLarge:
    ok("el límite general se aplica sin pasar max_bytes", True)

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Compresión y límites del servidor correctos\n")
