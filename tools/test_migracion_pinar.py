#!/usr/bin/env python3
"""Migración de almacenes sin creación automática de municipios: python3 tools/test_migracion_pinar.py"""
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
# NO se crean municipios automáticamente en migrate_state(): solo se conservan los existentes.
assert r["version"] == 7
active = [w for w in new["warehouses"] if not w.get("deletedAt")]
assert len(active) == 2
assert [w["id"] for w in active] == ["central", "con"]
assert len(new["warehouseEntries"]) == 0
assert new["movements"] == state["movements"]
assert new["settings"] == state["settings"]
p = new["products"][0]
assert p["stocks"]["central"] == 17 and p["stocks"]["con"] == 3
assert p["stocksInicial"]["central"] == 20 and p["stocksInicial"]["con"] == 3
assert server.q("SELECT 1 FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,), one=True)

# El helper explícito add_cuba_municipalities sigue funcionando por provincia o completo, siempre en 0.
prov_state = copy.deepcopy(state)
created_prov = server.add_cuba_municipalities(prov_state, province_filter="Pinar del Río")
assert len(created_prov) == 10  # Consolación del Sur ya estaba
assert all(prov_state["products"][0]["stocks"][w["id"]] == 0 for w in prov_state["warehouses"] if w["id"] not in ("central", "con", "old"))

# Conversiones antiguas sin estructura de almacenes crean únicamente ALMACÉN PRINCIPAL (0 municipios).
legacy = {"products": [{"id": "p", "stockInicial": 10, "stockActual": 8}],
          "movements": [{"id": "m"}]}
server.q("DELETE FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,))
server.q("UPDATE app_state SET version=30,data=? WHERE id=1", (json.dumps(legacy),))
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
assert r["version"] == 30 and json.loads(r["data"]) == legacy
assert not server.q("SELECT 1 FROM schema_migrations WHERE name=?", (server.CUBA_MIGRATION,), one=True)

server.migrate_state()
r = server.q("SELECT version,data FROM app_state WHERE id=1", one=True)
assert r["version"] == 31
converted = json.loads(r["data"])
assert len(converted["warehouses"]) == 1
assert converted["warehouses"][0]["name"] == "ALMACÉN PRINCIPAL"
assert converted["products"][0]["stocksInicial"] == {converted["warehouses"][0]["id"]: 10}
assert converted["products"][0]["stocks"] == {converted["warehouses"][0]["id"]: 8}
print("✔ Migración SQLite sin creación automática de municipios, conservación de existencias y helper por provincia en 0")
