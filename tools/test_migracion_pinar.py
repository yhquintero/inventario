#!/usr/bin/env python3
"""Migración persistente de municipios: python3 tools/test_migracion_pinar.py"""
import copy
import importlib.util
import json
import os
import pathlib
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-municipios-")
path = pathlib.Path(__file__).resolve().parent.parent / "server" / "novagest_server.py"
spec = importlib.util.spec_from_file_location("ng_pinar", path)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server.init_db()

# No hay migración anticipada de una base aún sin inicializar.
server.migrate_state()
assert not server.q("SELECT 1 FROM schema_migrations", one=True)
state = {
    "products": [{"id": "p1", "name": "Producto", "stockInicial": 20, "stockActual": 17,
                  "stocksInicial": {"central": 20, "con": 3}, "stocks": {"central": 17, "con": 3},
                  "precioVentaUsd": 10}],
    "movements": [{"id": "m1", "date": "2026-01-01", "productId": "p1", "type": "VENTA",
                   "quantity": 3, "warehouseId": "central"}],
    "warehouses": [{"id": "central", "name": "ALMACÉN PRINCIPAL", "isDefault": True},
                   {"id": "con", "name": "Almacén Consolación del Sur", "code": "CON", "location": "Consolación del Sur, Pinar del Río"},
                   {"id": "old", "name": "ALMACÉN MANTUA", "deletedAt": 1}],
    "warehouseEntries": [], "excelDailyReports": [], "settings": {"businessName": "Test"},
}
server.q("UPDATE app_state SET version=7,data=? WHERE id=1", (json.dumps(state),))
server.index_state_changes(state, 7)
server.migrate_state()
r = server.q("SELECT * FROM app_state WHERE id=1", one=True)
new = json.loads(r["data"])
assert r["version"] == 8
active = [w for w in new["warehouses"] if not w.get("deletedAt")]
assert len(active) == 169  # principal no identificado + 168 municipios de Cuba
assert sum(server._municipality_key(w["name"]) == "CONSOLACION DEL SUR" for w in active) == 1
assert new["movements"] == state["movements"]
assert new["settings"] == state["settings"]
assert next(w for w in active if w["id"] == "central")["isDefault"]
p = new["products"][0]
assert p["stocks"]["central"] == 17 and p["stocks"]["con"] == 3
assert p["stocksInicial"]["central"] == 20 and p["stocksInicial"]["con"] == 3
assert p["stockActual"] == 17 and p["stockInicial"] == 20
assert sum(p["stocks"].values()) == 20
created = [w for w in active if w["id"] not in ("central", "con")]
assert len(created) == 167 and len(new["warehouseEntries"]) == 167
assert all(p["stocks"][w["id"]] == p["stocksInicial"][w["id"]] == 0 for w in created)
assert server.q("SELECT 1 FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,), one=True)
delta = server.delta_since(new, 8, 7)
assert len(delta["state"]["warehouses"]) == 167
assert len(delta["state"]["warehouseEntries"]) == 167
assert len(delta["state"]["products"]) == 1
server.migrate_state()
assert server.q("SELECT version FROM app_state WHERE id=1", one=True)["version"] == 8
# No recrear un municipio eliminado intencionalmente después de la migración.
created[0]["deletedAt"] = 123
server.q("UPDATE app_state SET data=? WHERE id=1", (json.dumps(new),))
server.migrate_state()
after = json.loads(server.q("SELECT data FROM app_state WHERE id=1", one=True)["data"])
assert len(after["warehouses"]) == len(new["warehouses"])
assert next(w for w in after["warehouses"] if w["id"] == created[0]["id"])["deletedAt"] == 123

# Conversiones antiguas asignan movimientos al principal real y conservan el stock.
legacy = {"warehouses": [{"id": "other", "name": "Otro"}, {"id": "def", "name": "Principal", "isDefault": True}],
          "products": [{"id": "p", "stockInicial": 10, "stockActual": 8}],
          "movements": [{"id": "m"}]}
converted, changed = server.ensure_warehouses(legacy)
assert changed and converted["movements"][0]["warehouseId"] == "def"
assert converted["products"][0]["stocksInicial"] == {"def": 10}
assert converted["products"][0]["stocks"] == {"def": 8}
old = copy.deepcopy(converted)
assert not server.ensure_warehouses(converted)[1] and converted == old

# Una base que ya trae todos los municipios no se duplica ni cambia de versión.
full = {"products": [], "movements": [], "warehouseEntries": [], "excelDailyReports": [],
        "warehouses": [{"id": "w" + code, "name": server._municipal_warehouse_name(prov, name), "location": f"{name}, {prov}", "isDefault": code == "PRI"} for prov, name, code in server.CUBA_MUNICIPALITIES]}
server.q("DELETE FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,))
server.q("UPDATE app_state SET version=20,data=? WHERE id=1", (json.dumps(full),))
server.migrate_state()
assert server.q("SELECT version FROM app_state WHERE id=1", one=True)["version"] == 20
assert len(json.loads(server.q("SELECT data FROM app_state WHERE id=1", one=True)["data"])["warehouses"]) == 168
# Un fallo al indexar revierte estado y marca de migración juntos.
server.q("DELETE FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,))
server.q("UPDATE app_state SET version=30,data=? WHERE id=1", (json.dumps(state),))
original_index = server.index_state_changes

def fail_index(*args, **kwargs):
    raise RuntimeError("fallo simulado")

server.index_state_changes = fail_index
try:
    server.migrate_state()
    raise AssertionError("Se esperaba un fallo de la migración")
except RuntimeError:
    pass
finally:
    server.index_state_changes = original_index
r = server.q("SELECT version,data FROM app_state WHERE id=1", one=True)
assert r["version"] == 30 and json.loads(r["data"]) == state
assert not server.q("SELECT 1 FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,), one=True)
server.migrate_state()
assert server.q("SELECT version FROM app_state WHERE id=1", one=True)["version"] == 31
print("✔ Migración SQLite de municipios de Cuba (168), conservación de existencias y sincronización incremental")
