#!/usr/bin/env python3
"""Valida el lector de Diviza con datos sintéticos, sin conexión a Internet."""
import datetime as dt
import json
import pathlib
import sys
import urllib.error
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "server"))
import diviza

now = dt.datetime(2026, 11, 8, 23, 30, tzinfo=dt.timezone.utc)
items = [{"code": "USD", "label": "USD", "rate": 930}, {"code": "ECU", "label": "EUR", "rate": 1020},
         {"code": "MLC", "label": "MLC", "rate": 726.72}, {"code": "CAD", "label": "CAD", "rate": 598.81},
         {"code": "USD_Zelle.CUP", "label": "Zelle", "rate": 898.77}, {"code": "CLA", "label": "CLA", "rate": 828.91}]
def page(rows=items, when="8 de noviembre de 2026, 6:00 p. m.", formal=None):
    return f'''<html><p>Actualizado el {when} (hora de Cuba) · se actualiza cada 30 minutos</p>
    <script id="conv-data" type="application/json">{json.dumps({"informal": rows, "formal": formal or [{"code":"MXN", "label":"MXN", "rate":43.81}]})}</script></html>'''
parsed = diviza.parse_rates(page(), now)
assert parsed["rates"] == {"USD": 930, "EUR": 1020, "MLC": 726.72, "CAD": 598.81, "ZELLE": 898.77, "CLA": 828.91}
assert parsed["missing"] == ["MXN"] and parsed["date"] == "2026-11-08"
assert parsed["publishedAt"] == "2026-11-08T18:00:00-05:00"
# EUR se mapea solo si la propia fuente indica ECU y etiqueta EUR.
without_eur = [x for x in items if x["code"] != "ECU"] + [{"code": "ECU", "label": "OTHER", "rate": 999}]
assert "EUR" not in diviza.parse_rates(page(without_eur), now)["rates"]
assert diviza.parse_rates(page(items + [{"code": "MXN", "label": "MXN", "rate": 51.43}]), now)["rates"]["MXN"] == 51.43
for content in ("<title>Verificación de seguridad</title>", page([],), page(items[1:]),
                page(when="1 de noviembre de 2026, 6:00 p. m."), page(when="10 de noviembre de 2026, 6:00 p. m."),
                page(when="8 de noviembre de 2026, 6:00"), page(items + [{"code":"USD","label":"USD","rate":1}]),
                page([{"code": "USD", "label": "USD", "rate": float("nan")}])):
    try:
        diviza.parse_rates(content, now)
        raise AssertionError("Se aceptó una página no válida")
    except diviza.RateError:
        pass
# Horas ambiguas durante el cambio DST se rechazan para no asignar fecha errónea.
try:
    diviza.parse_rates(page(when="1 de noviembre de 2026, 12:30 a. m."), dt.datetime(2026, 11, 1, 6, tzinfo=dt.timezone.utc))
    raise AssertionError("Se aceptó una hora ambigua")
except diviza.RateError:
    pass
class Blocked:
    def open(self, *args, **kwargs):
        raise urllib.error.HTTPError(diviza.URL, 403, "Forbidden", {}, None)
with patch.object(diviza.urllib.request, "build_opener", return_value=Blocked()):
    try:
        diviza.fetch_rates()
        raise AssertionError("No se informó el bloqueo")
    except diviza.RateError as e:
        assert "bloqueó" in str(e)
# La ruta exige sesión y rol financiero y no escribe al consultar.
import os
import tempfile
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-diviza-api-")
import novagest_server as server

class Handler:
    path = "/api/exchange/diviza"
    command = "GET"
    def __init__(self, role):
        self.role, self.response = role, None
    def auth(self):
        return {"role": self.role} if self.role else None
    def err(self, code, message):
        self.response = (code, {"error": message})
    def send_json(self, code, data):
        self.response = (code, data)

route = server.ROUTES[("GET", "/api/exchange/diviza")]
with patch.object(diviza, "fetch_rates", return_value=parsed) as fetch:
    for role, expected in ((None, 401), ("ALMACENERO", 403), ("ECONOMICO", 200)):
        h = Handler(role)
        route(h, "diviza")
        assert h.response[0] == expected
    assert fetch.call_count == 1
    assert h.response[1]["rates"] == parsed["rates"]
with patch.object(diviza, "fetch_rates", side_effect=diviza.RateError("Fuente indisponible")):
    h = Handler("ECONOMICO")
    route(h, "diviza")
    assert h.response == (502, {"error": "Fuente indisponible"})
print("✔ Diviza: datos informales, fecha cubana, parciales, permisos y bloqueo")
