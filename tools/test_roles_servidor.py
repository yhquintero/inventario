#!/usr/bin/env python3
"""Pruebas funcionales de autorización y filtrado de estado por rol."""
import copy
import os
import sys
import tempfile

os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="novagest-roles-")
os.environ["NOVAGEST_DEMO_USERS"] = "0"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))
import novagest_server as server  # noqa: E402


def check(condition, message):
    if not condition:
        raise AssertionError(message)
    print(f"  ok  {message}")


check(len(server.ROLES) == 8 and {"SUPERVISOR", "CONTADOR", "AUDITOR", "VENDEDOR"}.issubset(server.ROLES),
      "el servidor reconoce los ocho perfiles")

estado = {
    "products": [], "movements": [], "cuadres": [], "audit": [], "rates": [], "priceHistory": [],
    "weekly": [], "excelDailyReports": [], "settings": {}, "warehouses": [], "warehouseEntries": [],
    "customers": [], "credits": [], "fichas": [], "ipvControls": [], "surveys": [],
}
auditor = server.state_for_role(estado, "AUDITOR")
check("products" in auditor and "fichas" in auditor and "audit" in auditor,
      "AUDITOR recibe inventario, fichas e información de auditoría")
check("customers" not in auditor and "settings" not in auditor and "rates" not in auditor,
      "AUDITOR no recibe clientes, ajustes ni tasas")
check(set(server.readable_state_sections(None, "ADMINISTRADOR")) == set(server.WRITE),
      "un servidor vacío informa al Administrador de todas las secciones para inicializar el estado")
check(set(server.readable_state_sections(None, "AUDITOR")) == {"products", "movements", "cuadres", "audit", "priceHistory", "weekly", "excelDailyReports", "warehouses", "warehouseEntries", "fichas", "ipvControls", "surveys"},
      "antes del seed, la lista de secciones visibles ya respeta READ para AUDITOR")
vendedor = server.state_for_role(estado, "VENDEDOR")
check("customers" in vendedor and "movements" in vendedor and "cuadres" not in vendedor,
      "VENDEDOR recibe ventas y clientes, pero no cuadres")

base = {section: [] for section in server.WRITE}
base["settings"] = {}
venta = {"id": "venta-1", "type": "VENTA", "date": "2026-01-01", "quantity": 1}
con_venta = copy.deepcopy(base)
con_venta["movements"] = [venta]
check(server.validate_change(base, con_venta, "VENDEDOR", set()) is None,
      "VENDEDOR puede registrar una venta nueva")

previo = copy.deepcopy(con_venta)
editado = copy.deepcopy(previo)
editado["movements"][0]["quantity"] = 2
check(server.validate_change(previo, editado, "VENDEDOR", set())[0] == 403,
      "VENDEDOR no puede editar ventas existentes")
borrado = copy.deepcopy(base)
check(server.validate_change(previo, borrado, "VENDEDOR", set())[0] == 403,
      "VENDEDOR no puede borrar movimientos existentes")
otro_tipo = copy.deepcopy(base)
otro_tipo["movements"] = [{"id": "salida-1", "type": "SALIDA", "date": "2026-01-01", "quantity": 1}]
check(server.validate_change(base, otro_tipo, "VENDEDOR", set())[0] == 403,
      "VENDEDOR no puede registrar salidas o entradas manuales")

producto = copy.deepcopy(base)
producto["products"] = [{"id": "prod-1", "name": "Prueba"}]
check(server.validate_change(base, producto, "AUDITOR", set())[0] == 403,
      "AUDITOR no puede modificar inventario aunque pueda consultarlo")
check(server.validate_change(base, producto, "SUPERVISOR", set()) is None,
      "SUPERVISOR puede modificar inventario según su perfil")
cuadre = copy.deepcopy(base)
cuadre["cuadres"] = [{"date": "2026-01-01", "venta": 10}]
check(server.validate_change(base, cuadre, "CONTADOR", set()) is None,
      "CONTADOR puede editar cuadres sin permiso para cerrar el día")
weekly = copy.deepcopy(base)
weekly["weekly"] = {"2026-08-31": {"salarioAlmaceneros": 95}}
check(server.validate_change(base, weekly, "AUDITOR", set())[0] == 403,
      "AUDITOR puede consultar el informe semanal, pero no guardar sus gastos")
check(server.validate_change(base, weekly, "ECONOMICO", set()) is None,
      "ECONOMICO puede editar los gastos semanales con WEEKLY_EDIT")

print("OK — autorización funcional de roles")
