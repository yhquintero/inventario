#!/usr/bin/env python3
"""Regresiones para planificación financiera, gastos recurrentes, presupuestos y cartera."""
import importlib.util
import json
import os
import pathlib
import tempfile
from datetime import date, timedelta

ROOT = pathlib.Path(__file__).resolve().parent.parent
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-fin-planning-")
os.environ["NOVAGEST_DEMO_USERS"] = "1"
os.environ["LICENSE_SECRET"] = "test-finance-planning-secret"
os.environ["REQUIRE_ADMIN_TOTP"] = "0"
spec = importlib.util.spec_from_file_location("ng_fin_planning_test", ROOT / "server" / "novagest_server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server.init_db()

class Handler:
    path = "/api/fin"
    command = "GET"
    headers = {}
    payload = {}
    status = None
    result = None
    def auth(self):
        return {"role": "ADMINISTRADOR", "username": "admin", "display_name": "Admin", "totp_enabled": 0}
    def body(self, **_):
        return self.payload
    def err(self, status, message):
        self.status, self.result = status, {"error": message}
        return self.result
    def send_json(self, status, result):
        self.status, self.result = status, result
        return result
    def ip(self):
        return "127.0.0.1"

def call(method, path, payload=None, ident=""):
    h = Handler(); h.path = path; h.payload = payload or {}
    result = server.ROUTES[(method, path.split("?", 1)[0])](h, ident)
    return h, result

account = server.q("SELECT id FROM fin_cuentas WHERE naturaleza='GASTO' AND activa=1 ORDER BY id LIMIT 1", one=True)["id"]
today = date.today().isoformat()

# Gasto recurrente valida datos y conserva categoría, moneda, warehouse y comprobante.
h_bad, _ = call("POST", "/api/fin/recurrentes", {"nombre": "X", "monto": -1, "frecuencia": "DIARIA", "inicio": today, "proximo": today})
assert h_bad.status == 400
h_rec, _ = call("POST", "/api/fin/recurrentes", {"nombre": "Renta", "categoria": "Local", "monto": 125,
    "moneda": "USD", "frecuencia": "MENSUAL", "cuenta_id": account, "almacen": "Centro", "comprobante": "factura-1",
    "inicio": today, "proximo": today})
assert h_rec.status == 201, h_rec.result
h_get, recs = call("GET", "/api/fin/recurrentes")
assert h_get.status == 200 and any(x["comprobante"] == "factura-1" for x in recs["gastos"])
h_eur, _ = call("POST", "/api/fin/recurrentes", {"nombre": "Internet", "monto": 10, "moneda": "EUR",
    "frecuencia": "MENSUAL", "inicio": today, "proximo": today})
assert h_eur.status == 201

# Presupuesto se guarda/actualiza sin duplicar cuando centro_id es NULL.
month = today[:7]
for amount in (300, 350):
    h_budget, _ = call("POST", "/api/fin/presupuestos", {"tipo_periodo": "MES", "periodo": month,
        "cuenta_id": account, "monto": amount, "moneda": "USD"})
    assert h_budget.status == 200, h_budget.result
assert server.q("SELECT COUNT(*) n FROM fin_presupuestos WHERE tipo_periodo='MES' AND periodo=?", (month,), one=True)["n"] == 1
h_budgets, budgets = call("GET", "/api/fin/presupuestos")
assert h_budgets.status == 200 and budgets["presupuestos"][0]["monto"] == 350

# Caja limita horizonte y devuelve períodos de duración semanal.
h_cash, cash = call("GET", "/api/fin/pronostico-caja?semanas=99")
assert h_cash.status == 200 and cash["semanas"] == 12 and len(cash["periodos"]) == 12
assert "No predice ventas futuras" in cash["estimacion"]
assert cash["periodos"][0]["gastos_recurrentes"] == 125
assert cash["periodos"][0]["gastos_por_moneda"]["EUR"] == 10

# Antigüedad respeta abonos y muestra buckets de atraso.
server.q("UPDATE app_state SET data=? WHERE id=1", (json.dumps({"customers": [{"id": "c1", "name": "Cliente Uno"}], "credits": [
    {"id": "cr1", "customerId": "c1", "totalUsd": 100, "paidUsd": 25, "dueDate": "2020-01-01", "concept": "Pedido"},
    {"id": "cr2", "customerId": "c1", "totalUsd": 40, "paidUsd": 40, "dueDate": "2020-01-01"},
]}),))
h_age, aging = call("GET", "/api/fin/cuentas-cobrar-antiguedad")
assert h_age.status == 200 and aging["total"] == 75 and aging["tramos"]["61_mas"] == 75
assert aging["cuentas"][0]["cliente"] == "Cliente Uno"

# Comparativa requiere rango válido y entrega anterior de igual duración.
h_cmp, cmp = call("GET", f"/api/fin/comparativa?desde={today}&hasta={today}")
assert h_cmp.status == 200 and cmp["actual"]["desde"] == today and cmp["anterior"]["hasta"] < today
h_week, week = call("GET", f"/api/fin/comparativa?desde={today}&hasta={today}&modo=semana")
assert h_week.status == 200 and (date.fromisoformat(week["anterior"]["desde"]) == date.fromisoformat(today) - timedelta(days=7))
print("OK — gastos recurrentes, presupuestos, pronóstico de caja, antigüedad y comparativas")
