#!/usr/bin/env python3
"""Valida el lector de Divisa con datos sintéticos, sin conexión a Internet."""
import datetime as dt
import json
import pathlib
import os
import subprocess
import sys
import urllib.error
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "server"))
import divisa

now = dt.datetime(2026, 11, 8, 23, 30, tzinfo=dt.timezone.utc)
items = [{"code": "USD", "label": "USD", "rate": 930}, {"code": "ECU", "label": "EUR", "rate": 1020},
         {"code": "MLC", "label": "MLC", "rate": 726.72}, {"code": "CAD", "label": "CAD", "rate": 598.81},
         {"code": "USD_Zelle.CUP", "label": "Zelle", "rate": 898.77}, {"code": "CLA", "label": "CLA", "rate": 828.91}]
def page(rows=items, when="8 de noviembre de 2026, 6:00 p. m.", formal=None):
    return f'''<html><p>Actualizado el {when} (hora de Cuba) · se actualiza cada 30 minutos</p>
    <script id="conv-data" type="application/json">{json.dumps({"informal": rows, "formal": formal or [{"code":"MXN", "label":"MXN", "rate":43.81}]})}</script></html>'''
parsed = divisa.parse_rates(page(), now)
assert parsed["rates"] == {"USD": 930, "EUR": 1020, "MLC": 726.72, "CAD": 598.81, "ZELLE": 898.77, "CLA": 828.91}
assert parsed["missing"] == ["MXN"] and parsed["date"] == "2026-11-08"
expected_published = dt.datetime(2026, 11, 8, 18, tzinfo=divisa._havana_zone()).isoformat()
assert parsed["publishedAt"] == expected_published
# EUR se mapea solo si la propia fuente indica ECU y etiqueta EUR.
without_eur = [x for x in items if x["code"] != "ECU"] + [{"code": "ECU", "label": "OTHER", "rate": 999}]
assert "EUR" not in divisa.parse_rates(page(without_eur), now)["rates"]
assert divisa.parse_rates(page(items + [{"code": "MXN", "label": "MXN", "rate": 51.43}]), now)["rates"]["MXN"] == 51.43
for content in ("<title>Verificación de seguridad</title>", page([],), page(items[1:]),
                page(when="1 de noviembre de 2026, 6:00 p. m."), page(when="10 de noviembre de 2026, 6:00 p. m."),
                page(when="8 de noviembre de 2026, 6:00"), page(items + [{"code":"USD","label":"USD","rate":1}]),
                page([{"code": "USD", "label": "USD", "rate": float("nan")}])):
    try:
        divisa.parse_rates(content, now)
        raise AssertionError("Se aceptó una página no válida")
    except divisa.RateError:
        pass
# Horas ambiguas durante el cambio DST se rechazan para no asignar fecha errónea.
try:
    divisa.parse_rates(page(when="2 de noviembre de 2025, 12:30 a. m."), dt.datetime(2025, 11, 2, 6, tzinfo=dt.timezone.utc))
    raise AssertionError("Se aceptó una hora ambigua")
except divisa.RateError:
    pass
class Blocked:
    def open(self, *args, **kwargs):
        raise urllib.error.HTTPError(divisa.URL, 403, "Forbidden", {}, None)
with patch.object(divisa.urllib.request, "build_opener", return_value=Blocked()):
    try:
        divisa.fetch_rates()
        raise AssertionError("No se informó el bloqueo")
    except divisa.RateError as e:
        assert "bloqueó" in str(e)
# Un Python aislado sin tzdb de sistema ni paquete tzdata usa el archivo incluido.
# Se comprueban invierno, verano, cambios de horario y la ausencia del archivo.
child = r'''
import datetime as dt
import io
import pathlib
import sys
from unittest.mock import patch
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
sys.path.insert(0, sys.argv[1])
import divisa
try:
    ZoneInfo("America/Havana")
    raise AssertionError("El proceso de prueba no está aislado de tzdata")
except ZoneInfoNotFoundError:
    pass
def ts(date, now):
    return divisa._timestamp("Actualizado el " + date + " (hora de Cuba)", dt.datetime.fromisoformat(now))
assert ts("8 de noviembre de 2026, 6:00 p. m.", "2026-11-08T23:30:00+00:00").isoformat() == "2026-11-08T18:00:00-04:00"
assert ts("8 de enero de 2026, 6:00 p. m.", "2026-01-08T23:30:00+00:00").isoformat() == "2026-01-08T18:00:00-05:00"
assert ts("8 de junio de 2026, 6:00 p. m.", "2026-06-08T22:30:00+00:00").isoformat() == "2026-06-08T18:00:00-04:00"
for date, now in (("2 de noviembre de 2025, 12:30 a. m.", "2025-11-02T05:00:00+00:00"),
                  ("8 de marzo de 2026, 12:30 a. m.", "2026-03-08T05:00:00+00:00"),
                  ("8 de junio de 2026, 6:00 p. m.", "2026-06-11T22:30:00+00:00"),
                  ("31 de febrero de 2026, 6:00 p. m.", "2026-03-01T00:00:00+00:00")):
    try:
        ts(date, now)
        raise AssertionError("Se aceptó una fecha inválida, ambigua o desactualizada")
    except divisa.RateError:
        pass
with patch.object(pathlib.Path, "open", side_effect=FileNotFoundError):
    try:
        divisa._havana_zone()
        raise AssertionError("Se aceptó una zona ausente")
    except divisa.RateError as e:
        assert "Reinstale NovaGest" in str(e)
with patch.object(pathlib.Path, "open", return_value=io.BytesIO(b"invalid")):
    try:
        divisa._havana_zone()
        raise AssertionError("Se aceptó una zona corrupta")
    except divisa.RateError as e:
        assert "Reinstale NovaGest" in str(e)
'''
subprocess.run([sys.executable, "-S", "-c", child, str(pathlib.Path(divisa.__file__).parent)],
               check=True, env={**os.environ, "PYTHONTZPATH": ""})

# La ruta exige sesión y rol financiero y no escribe al consultar.
import tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-divisa-api-")
import novagest_server as server

class Handler:
    path = "/api/exchange/divisa"
    command = "GET"
    def __init__(self, role):
        self.role, self.response = role, None
    def auth(self):
        return {"role": self.role} if self.role else None
    def err(self, code, message):
        self.response = (code, {"error": message})
    def send_json(self, code, data):
        self.response = (code, data)

route = server.ROUTES[("GET", "/api/exchange/divisa")]
with patch.object(divisa, "fetch_rates", return_value=parsed) as fetch:
    for role, expected in ((None, 401), ("ALMACENERO", 403), ("ECONOMICO", 200)):
        h = Handler(role)
        route(h, "divisa")
        assert h.response[0] == expected
    assert fetch.call_count == 1
    assert h.response[1]["rates"] == parsed["rates"]
with patch.object(divisa, "fetch_rates", side_effect=divisa.RateError("Fuente indisponible")):
    h = Handler("ECONOMICO")
    route(h, "divisa")
    assert h.response == (502, {"error": "Fuente indisponible"})

# Las dos rutas comparten autenticación, resultado y cuota de 12 consultas por IP.
class ApiHandler(Handler):
    headers = {}
    def __init__(self, path, role="ECONOMICO"):
        super().__init__(role)
        self.path = path
    def ip(self):
        return "198.51.100.1"

hits = {}
def fake_query(sql, args, one=False):
    if sql.startswith("SELECT hits"):
        return {"hits": hits[args[0]]} if args[0] in hits else None
    if sql.startswith("INSERT OR REPLACE INTO rate_hits"):
        hits[args[0]] = args[1]
        return None
    raise AssertionError(sql)

with patch.object(server, "check_license_active", return_value={"valid": True}), \
     patch.object(server, "q", side_effect=fake_query), \
     patch.object(divisa, "fetch_rates", return_value=parsed) as fetch:
    for path in ("/api/exchange/divisa", "/api/exchange/diviza"):
        for role, expected in ((None, 401), ("ALMACENERO", 403)):
            h = ApiHandler(path, role)
            server.Api.route(h, "GET")
            assert h.response[0] == expected
    hits.clear()
    for i in range(12):
        path = "/api/exchange/divisa" if i % 2 else "/api/exchange/diviza"
        h = ApiHandler(path + "?ejemplo=1")
        server.Api.route(h, "GET")
        assert h.response == (200, {"ok": True, **parsed})
    for path in ("/api/exchange/divisa", "/api/exchange/diviza"):
        h = ApiHandler(path)
        server.Api.route(h, "GET")
        assert h.response[0] == 429
    assert fetch.call_count == 12
    assert len(hits) == 1 and "/api/exchange/divisa" in next(iter(hits))
print("✔ Divisa: datos informales, fecha cubana, permisos y compatibilidad de rutas")
