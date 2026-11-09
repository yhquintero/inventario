"""Preparación segura de una limpieza por almacén; no realiza E/S ni modifica el original."""
from collections import Counter
import copy
import math


class ClearError(ValueError):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def _number(value):
    if value is None:
        return 0.0
    try:
        if isinstance(value, bool):
            raise ValueError()
        n = float(value)
        if not math.isfinite(n):
            raise ValueError()
        return n
    except (TypeError, ValueError, OverflowError):
        raise ClearError(409, "Hay existencias inválidas. Revise el inventario antes de limpiarlo.")


def _total(values):
    # Equivalente a Math.round(n * 100) / 100 de la Web.
    result = sum(_number(value) for value in values)
    if not math.isfinite(result):
        raise ClearError(409, "Las existencias superan el límite permitido.")
    return math.floor(result * 100 + 0.5) / 100


def prepare(state, warehouse_id, closed, timestamp_ms, user, operation_id):
    if not isinstance(state, dict) or not isinstance(warehouse_id, str) or not warehouse_id:
        raise ClearError(400, "Almacén o estado inválido.")
    original = copy.deepcopy(state)
    warehouses = original.get("warehouses") or []
    active = [w for w in warehouses if isinstance(w, dict) and not w.get("deletedAt")]
    target = next((w for w in active if w.get("id") == warehouse_id), None)
    if not target:
        raise ClearError(404, "Almacén activo no encontrado.")
    default = next((w for w in active if w.get("isDefault")), active[0] if active else None)
    ids = {w.get("id") for w in warehouses if isinstance(w, dict)}
    movements = original.get("movements") or []
    if not isinstance(movements, list) or not isinstance(original.get("products"), list):
        raise ClearError(409, "El estado de inventario no es válido.")

    def belongs(m):
        wid = m.get("warehouseId")
        return (wid if wid and wid in ids else (default or {}).get("id")) == warehouse_id

    selected = [m for m in movements if isinstance(m, dict) and not m.get("warehouseCleared") and belongs(m)]
    if any(not m.get("id") for m in selected):
        raise ClearError(409, "Hay movimientos sin identificador; revise los datos antes de limpiar.")
    selected_ids = {str(m["id"]) for m in selected}
    counts = Counter(str(m.get("id")) for m in movements if isinstance(m, dict) and m.get("id") is not None)
    if len(selected_ids) != len(selected) or any(counts[mid] != 1 for mid in selected_ids):
        raise ClearError(409, "Hay movimientos con identificadores duplicados; revise los datos.")
    if any(m.get("date") in closed for m in selected):
        raise ClearError(423, "El almacén tiene movimientos de días cerrados; no se puede limpiar sin reabrir esos días.")
    for credit in original.get("credits") or []:
        if isinstance(credit, dict) and any(str(mid) in selected_ids for mid in (credit.get("movementIds") or [])):
            raise ClearError(409, "Hay fiados vinculados a movimientos del almacén. Revise esos fiados antes de limpiar.")

    products_changed = 0
    for p in original["products"]:
        if not isinstance(p, dict) or not isinstance(p.get("stocks"), dict) or not isinstance(p.get("stocksInicial"), dict):
            raise ClearError(409, "Faltan existencias por almacén. Actualice o revise la base antes de limpiar.")
        stocks, initial = p["stocks"], p["stocksInicial"]
        before, start = _number(stocks.get(warehouse_id)), _number(initial.get(warehouse_id))
        if before or start:
            stocks[warehouse_id] = 0
            initial[warehouse_id] = 0
            p["stockActual"] = _total(stocks.values())
            p["stockInicial"] = _total(initial.values())
            previous = max(_number(p.get("updatedAt")), _number(p.get("createdAt")))
            p["updatedAt"] = max(timestamp_ms, previous + 1)
            products_changed += 1
    if not products_changed and not selected:
        return original, {"changed": False, "products": 0, "movements": 0}

    # La generación impide que una copia offline anterior reponga existencias del almacén.
    for p in original["products"]:
        if not isinstance(p.get("warehouseClearEpochs", {}), dict):
            raise ClearError(409, "Hay marcas de inventario inválidas; revise la base antes de limpiar.")
        p.setdefault("warehouseClearEpochs", {})[warehouse_id] = operation_id
        previous = max(_number(p.get("updatedAt")), _number(p.get("createdAt")))
        p["updatedAt"] = max(timestamp_ms, previous + 1)

    # El contenido se elimina del estado activo y papelera; solo queda la marca de ID
    # para que clientes sin conexión no resuciten registros borrados al fusionar.
    original["movements"] = [
        ({"id": m["id"], "warehouseId": warehouse_id, "warehouseCleared": True,
          "deletedAt": timestamp_ms, "updatedAt": max(timestamp_ms, _number(m.get("updatedAt")) + 1, _number(m.get("createdAt")) + 1)}
         if isinstance(m, dict) and str(m.get("id")) in selected_ids else m)
        for m in movements
    ]
    entries = original.get("warehouseEntries") or []
    if not isinstance(entries, list):
        raise ClearError(409, "El historial de almacenes no es válido.")
    for entry in entries:
        if not isinstance(entry, dict) or not entry.get("items") or entry.get("undoneAt") or entry.get("invalidatedAt"):
            continue
        affected = entry.get("warehouseId") == warehouse_id or any(
            isinstance(it, dict) and (it.get("warehouseId") or entry.get("warehouseId")) == warehouse_id
            for it in entry.get("items", []))
        if affected:
            entry["invalidatedAt"] = timestamp_ms
            entry["invalidatedReason"] = "Inventario de un almacén limpiado; ya no se puede deshacer esta entrada."
    warehouse_name = str(target.get("name") or "Almacén")
    entry = {"id": "e_clear_" + operation_id, "ts": timestamp_ms, "date": "", "warehouseId": warehouse_id,
             "warehouseName": warehouse_name, "kind": "LIMPIEZA", "source": "administrador",
             "summary": f"Inventario limpiado: {products_changed} productos, {len(selected)} movimientos eliminados",
             "items": [], "counts": {"productos": products_changed, "movimientos": len(selected)},
             "userName": user, "undoneAt": None}
    entries.insert(0, entry)
    original["warehouseEntries"] = entries
    return original, {"changed": True, "products": products_changed, "movements": len(selected), "warehouse": warehouse_name}
