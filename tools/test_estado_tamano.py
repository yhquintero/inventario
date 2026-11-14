#!/usr/bin/env python3
"""Comprueba que el estado de la base cabe en lo que el servidor acepta.

Reproduce el problema real: con 168 municipios y 262 productos el historial de
entradas (Entradas) creció hasta pasar de 12 MB, el servidor rechazaba el
guardado con 413 y todo cambio se perdía al recargar (p. ej. al eliminar los
municipios, que volvían a aparecer).

Uso: python3 tools/test_estado_tamano.py
"""
import json, os, sqlite3, sys, importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "data", "cuadre.db")
SHARED = ["products", "movements", "cuadres", "audit", "rates", "priceHistory", "weekly",
          "excelDailyReports", "settings", "warehouses", "warehouseEntries", "customers",
          "credits", "fichas", "ipvControls", "surveys"]


def cargar_servidor():
    ruta = os.path.join(ROOT, "server", "novagest_server.py")
    spec = importlib.util.spec_from_file_location("novagest_server", ruta)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["novagest_server"] = mod
    spec.loader.exec_module(mod)
    return mod


def tamano(datos):
    return len(json.dumps(datos, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))


def main():
    if not os.path.exists(DB):
        print("No hay base de datos en data/; nada que comprobar.")
        return 0
    con = sqlite3.connect(DB)
    fila = con.execute("SELECT data FROM app_state WHERE id=1").fetchone()
    con.close()
    if not fila or not fila[0]:
        print("La base todavía no tiene estado.")
        return 0
    estado = json.loads(fila[0])
    payload = {k: estado.get(k) for k in SHARED}

    antes = tamano(payload)
    entradas_antes = len(payload.get("warehouseEntries") or [])
    items_antes = sum(len(e.get("items") or []) for e in (payload.get("warehouseEntries") or []))

    srv = cargar_servidor()
    srv.compactar_estado(payload)
    despues = tamano(payload)
    entradas_despues = len(payload.get("warehouseEntries") or [])
    items_despues = sum(len(e.get("items") or []) for e in (payload.get("warehouseEntries") or []))

    print(f"Estado guardado ahora : {antes / 1048576:.2f} MB")
    print(f"Estado tras compactar  : {despues / 1048576:.2f} MB")
    print(f"Entradas: {entradas_antes} -> {entradas_despues} | items: {items_antes} -> {items_despues}")
    print(f"Tope del servidor (MAX_STATE): {srv.MAX_STATE / 1048576:.0f} MB")
    print()

    fallos = 0
    if antes > srv.MAX_STATE:
        print(f"OK  el estado sin compactar superaba el tope ({antes / 1048576:.2f} MB): por eso no se guardaba nada.")
    else:
        print(f"INFO el estado sin compactar ya cabía ({antes / 1048576:.2f} MB).")
    if despues > srv.MAX_STATE:
        print(f"FALLO el estado compactado sigue sin caber ({despues / 1048576:.2f} MB).")
        fallos += 1
    else:
        print(f"OK  el estado compactado cabe ({despues / 1048576:.2f} MB <= {srv.MAX_STATE / 1048576:.0f} MB).")
    # Las existencias de almacenes borrados ya no deben estar.
    muertos = {str(w.get("id")) for w in (estado.get("warehouses") or []) if w.get("deletedAt")}
    sobras = 0
    for p in payload.get("products") or []:
        for campo in ("stocks", "stocksInicial"):
            sobras += len([k for k in (p.get(campo) or {}) if str(k) in muertos])
    if sobras:
        print(f"FALLO quedan {sobras} existencias de almacenes ya borrados.")
        fallos += 1
    else:
        print("OK  no quedan existencias de almacenes borrados.")
    print("\n" + ("Todo correcto." if not fallos else f"{fallos} problema(s)."))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
