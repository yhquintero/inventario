#!/usr/bin/env python3
"""Prueba de extracción y errores sin conexión externa."""
import datetime as dt
import json
import pathlib
import sys
import urllib.error
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "server"))
import eltoque

now = dt.datetime(2026, 11, 8, 20, tzinfo=dt.timezone.utc)
values = dict(zip(eltoque.CURRENCIES, [930, 1020, 726.72, 598.81, 51.43, 898.89, 828.91]))
def html(rates=values, stamp="2026-11-08T18:17:00Z"):
    dataset = {"@type": "Dataset", "dateModified": stamp, "variableMeasured": [
        {"name": f"{code}/CUP", "value": val, "unitText": "CUP"} for code, val in rates.items()]}
    return '<script type="application/ld+json">' + json.dumps(dataset) + '</script>'
parsed = eltoque.parse_rates(html(), now)
assert parsed["rates"] == values and parsed["date"] == "2026-11-08"
for invalid in ("<title>Verificación de seguridad</title>", html({"USD": 900}),
                html(stamp="2026-11-01T18:17:00Z"), html(stamp="2026-11-10T18:17:00Z"),
                html(stamp="2026-11-08"), html({**values, "USD": float("nan")})):
    try:
        eltoque.parse_rates(invalid, now)
        raise AssertionError("Se aceptó una respuesta inválida")
    except eltoque.RateError:
        pass
class Blocked:
    def open(self, *args, **kwargs):
        raise urllib.error.HTTPError(eltoque.URL, 403, "Forbidden", {}, None)
with patch.object(eltoque.urllib.request, "build_opener", return_value=Blocked()):
    try:
        eltoque.fetch_rates()
        raise AssertionError("No se informó el bloqueo")
    except eltoque.RateError as e:
        assert "bloqueó" in str(e)
print("✔ elTOQUE: siete tasas, fecha, datos incompletos y bloqueo")
