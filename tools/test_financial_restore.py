#!/usr/bin/env python3
"""Regresiones de asientos atómicos y restauración de licencias en backups."""
import importlib.util
import json
import os
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-fin-restore-")
os.environ["NOVAGEST_DEMO_USERS"] = "1"
os.environ["LICENSE_SECRET"] = "test-finance-secret"
os.environ["REQUIRE_ADMIN_TOTP"] = "0"
spec = importlib.util.spec_from_file_location("ng_fin_test", ROOT / "server" / "novagest_server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server.init_db()

class Handler:
    path = "/api/fin/asientos"
    command = "POST"
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

# El enum tipo_costo rechaza HTML antes de persistirlo en cuentas.
before_accounts = server.q("SELECT COUNT(*) n FROM fin_cuentas", one=True)["n"]
h_bad_type = Handler()
h_bad_type.payload = {"codigo": "TEST-XSS", "nombre": "Cuenta de prueba", "naturaleza": "GASTO", "tipo_costo": "<img src=x onerror=alert(1)>"}
server.ROUTES[("POST", "/api/fin/cuentas")](h_bad_type, "")
assert h_bad_type.status == 400 and server.q("SELECT COUNT(*) n FROM fin_cuentas", one=True)["n"] == before_accounts
existing_account = server.q("SELECT id,tipo_costo FROM fin_cuentas ORDER BY id LIMIT 1", one=True)
h_bad_update = Handler()
h_bad_update.payload = {"nombre": "Cuenta", "tipo_costo": "<script>alert(1)</script>"}
server.ROUTES[("PUT", "/api/fin/cuentas/:id")](h_bad_update, str(existing_account["id"]))
assert h_bad_update.status == 400 and server.q("SELECT tipo_costo FROM fin_cuentas WHERE id=?", (existing_account["id"],), one=True)["tipo_costo"] == existing_account["tipo_costo"]

cuentas = server.q("SELECT id FROM fin_cuentas ORDER BY id LIMIT 2")
assert len(cuentas) == 2
h = Handler()
h.payload = {"fecha": "2026-11-20", "descripcion": "Prueba atómica", "lineas": [
    {"cuenta_id": cuentas[0]["id"], "debe": 10, "haber": 0},
    {"cuenta_id": cuentas[1]["id"], "debe": 0, "haber": 10}]}
server.ROUTES[("POST", "/api/fin/asientos")](h, "")
assert h.status == 201, h.result
assert server.q("SELECT COUNT(*) n FROM fin_lineas WHERE asiento_id=?", (h.result["id"],), one=True)["n"] == 2

before = server.q("SELECT COUNT(*) n FROM fin_asientos", one=True)["n"]
h2 = Handler()
h2.payload = {"fecha": "2026-11-20", "lineas": [
    {"cuenta_id": cuentas[0]["id"], "debe": -5, "haber": 0},
    {"cuenta_id": cuentas[1]["id"], "debe": 0, "haber": -5}]}
server.ROUTES[("POST", "/api/fin/asientos")](h2, "")
assert h2.status == 400 and server.q("SELECT COUNT(*) n FROM fin_asientos", one=True)["n"] == before

# Si falla una línea dentro de la transacción, el encabezado tampoco queda escrito.
before = server.q("SELECT COUNT(*) n FROM fin_asientos", one=True)["n"]
def falla(cur):
    cur.execute("INSERT INTO fin_asientos(fecha,created_at) VALUES('2026-11-20',0)")
    raise RuntimeError("simulación de fallo entre líneas")
try:
    server.financial_transaction(falla)
except RuntimeError:
    pass
assert server.q("SELECT COUNT(*) n FROM fin_asientos", one=True)["n"] == before

# Los ratios usan cuentas reales 1103* (CxC) y 1104* (inventario), no aproximan activos.
by_code = {r["codigo"]: r["id"] for r in server.q("SELECT id,codigo FROM fin_cuentas")}
ids = {code: by_code[code] for code in ("110301", "110401", "210101", "410101")}
def sembrar_ratios(cur):
    cur.execute("INSERT INTO fin_asientos(fecha,descripcion,created_at,created_by) VALUES(?,?,?,?)", ("2026-11-10", "ratios", 1, "test"))
    aid = cur.lastrowid
    cur.executemany("INSERT INTO fin_lineas(asiento_id,cuenta_id,debe,haber) VALUES(?,?,?,?)", [
        (aid, ids["110301"], 100, 0), (aid, ids["110401"], 50, 0),
        (aid, ids["210101"], 0, 200), (aid, ids["410101"], 0, 1000)])
server.financial_transaction(sembrar_ratios)
h_ratio = Handler(); h_ratio.path = "/api/fin/ratios?desde=2026-11-01&hasta=2026-11-30"
server.ROUTES[("GET", "/api/fin/ratios")](h_ratio, "")
ratios = {x["nombre"]: x["valor"] for x in h_ratio.result["ratios"]}
assert ratios["Días de cobro"] == 36.5
assert ratios["Razón rápida"] == 0.5

# Simula backup legado con campos anteriores y valida el mapeo al esquema actual.
server.read_backup = lambda _name: {
    "state": {"products": [], "movements": []}, "closedDays": [],
    "users": [{"id": 999, "username": "restored-admin", "display_name": "Admin restaurado", "email": "",
               "role": "ADMINISTRADOR", "active": 1, "pw_hash": "hash", "question": "", "answer_hash": "",
               "totp_secret": None, "totp_pending": None, "totp_enabled": 0, "totp_last": 0,
               "recovery": "[]", "created_at": 9, "last_login": None, "pw_changed": 9}],
    "licenses": [{"id": 901, "license_id": "L-901", "token": "signed-token", "status": "active",
                   "client_name": "Tienda", "product": "NovaGest", "type": "FULL", "created_at": 10}],
    "licenseActivations": [{"id": 902, "license_id": 901, "device_id": "device-1", "device_info": "test",
                             "activated_at": 11, "last_seen": 12}],
    "finAccounts": [{"id": 990, "codigo": "TEST990", "nombre": "Cuenta restaurada", "naturaleza": "ACTIVO",
                     "saldo_normal": "DEUDOR", "padre": None, "corriente": 1, "tipo_costo": None, "activa": 1}],
    "finCenters": [{"id": 991, "codigo": "CENTRO991", "nombre": "Centro restaurado", "responsable": "", "activa": 1}],
    "finEntries": [{"id": 992, "fecha": "2026-11-20", "descripcion": "Asiento restaurado", "created_at": 13, "created_by": "admin"}],
    "finLines": [{"id": 993, "asiento_id": 992, "cuenta_id": 990, "centro_id": 991, "debe": 5, "haber": 0}],
    "finMetrics": [{"periodo": "2026-11", "visitantes": 10, "registros": 2, "compras": 1, "clientes_nuevos": 1,
                    "usuarios_activos": 2, "gasto_marketing": 3, "costo_infra": 1, "mrr": 4}],
    "finQr": [{"id": 1, "titular": "Tienda restaurada", "banco": "Banco", "cuenta": "000", "moneda": "USD", "referencia": "ABC"}],
    "finRecurring": [{"id": 994, "nombre": "Renta restaurada", "categoria": "Local", "monto": 125, "moneda": "USD",
                      "frecuencia": "MENSUAL", "cuenta_id": 990, "centro_id": 991, "almacen": "Tienda",
                      "comprobante": "factura", "inicio": "2026-11-01", "fin": "", "proximo": "2026-12-01", "activo": 1}],
    "finBudgets": [{"id": 995, "tipo_periodo": "MES", "periodo": "2026-11", "cuenta_id": 990,
                    "centro_id": 991, "monto": 500, "moneda": "USD"}],
}
server.make_backup = lambda *_args, **_kwargs: "pre-restore.bak"
server.q("INSERT INTO sessions(id,token_hash,user_id,created,last_seen,ip,ua) VALUES(?,?,?,?,?,?,?)",
         ("stale-session", "stale-token-hash", 1, 1, 1, "127.0.0.1", "test"))
h3 = Handler(); h3.path = "/api/backups/legacy.bak"
server.ROUTES[("POST", "/api/backups/:id")](h3, "legacy.bak")
assert h3.status == 200, h3.result
lic = server.q("SELECT key,active FROM licenses WHERE id=901", one=True)
act = server.q("SELECT license_key,license_id,active FROM license_activations WHERE id=902", one=True)
assert lic and lic["key"] == "signed-token" and lic["active"] == 1
assert act and act["license_key"] == "signed-token" and act["license_id"] == 901 and act["active"] == 1
assert server.q("SELECT username FROM users WHERE id=999", one=True)["username"] == "restored-admin"
assert server.q("SELECT COUNT(*) n FROM sessions", one=True)["n"] == 0
assert server.q("SELECT nombre FROM fin_cuentas WHERE id=990", one=True)["nombre"] == "Cuenta restaurada"
assert server.q("SELECT nombre FROM fin_centros WHERE id=991", one=True)["nombre"] == "Centro restaurado"
assert server.q("SELECT descripcion FROM fin_asientos WHERE id=992", one=True)["descripcion"] == "Asiento restaurado"
assert server.q("SELECT COUNT(*) n FROM fin_lineas WHERE asiento_id=992", one=True)["n"] == 1
assert server.q("SELECT mrr FROM fin_metricas WHERE periodo='2026-11'", one=True)["mrr"] == 4
assert server.q("SELECT titular FROM fin_qr WHERE id=1", one=True)["titular"] == "Tienda restaurada"
assert server.q("SELECT nombre FROM fin_recurrentes WHERE id=994", one=True)["nombre"] == "Renta restaurada"
assert server.q("SELECT monto FROM fin_presupuestos WHERE id=995", one=True)["monto"] == 500
print("OK — validación de tipos financieros, asientos atómicos y restauración de licencias/finanzas")
