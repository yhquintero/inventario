#!/usr/bin/env python3
"""Genera las semillas de la Web y de la App desde CUADRE PINAR SEPT.xlsx.

Inventario actual  -> hoja '25 9 26' (existencias, entradas, salidas, ventas, comisiones, costos, precios).
Historial          -> todas las hojas diarias (tipo de cambio CUP/USD y cambios de precio por día + cuadres).

Uso: python3 tools/import_excel.py
"""
import json, re, os, datetime, openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "xlsx", "CUADRE PINAR SEPT.xlsx")
MAIN = "25 9 26"

def clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().upper()

def num(v):
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else 0.0

def sheet_date(name):
    m = re.match(r"^(\d+) (\d+) (\d+)$", name)
    if not m: return None
    d, mo, y = map(int, m.groups())
    return datetime.date(2000 + y, mo, d).isoformat()

CATS = [
    ("Herramientas", ["HERRAMIENTA", "MALETA DE CUBO", "JUEGO DE LLAVE", "JUEGO DE CUBOS", "PINZA", "DESTORNILLADOR", "PESA DIGITAL", "MAQUINA DE CONTAR"]),
    ("Refrigeración", ["NEVERA", "REFRIGERADOR", "MINIBAR", "EXHIBIDOR", "VITRINA", "FREEZER", "CONGELADOR", "DISPENS"]),
    ("Lavado", ["LAVADORA", "SECADORA"]),
    ("Audio y TV", ["TV", "BOCINA", "EQUIPO DE MUSICA", "CAJITA", "BASE FIJA PARA TV", "BASE GIRATORIA"]),
    ("Solar / Energía", ["PANEL", "INVERSOR", "BATERIA", "ESTACION", "SISTEMA", "KIT DE INSTALACION", "CONECTOR", "MC4", "BREKE", "CAJA DE DISTRIBUCION",
                          "RIEL", "EXPANCION", "PLATINA", "SUJETADOR", "GANCHO TIERRA", "PATAS", "CABLE", "PLANTA", "PROTECTOR", "SUPRESOR", "TRANSFER", "SET DE INSTALACION", "PRESURIZADOR"]),
    ("Clima", ["SPLIT", "VENTILADOR", "CALENTADOR", "ENFRIADOR", "AIRE", "MAQUINA DE FRIO"]),
    ("Cocina", ["FOGON", "OLLA", "LICUADORA", "CAFETERA", "FREIDORA", "MICROONDAS", "HORNO", "SANDWICHERA", "BATIDORA", "ARROCERA", "HERVIDOR", "COCINA", "TOSTADORA", "PLANCHA", "CALDERO", "VAJILLA", "MESCLADORA", "AMASADORA"]),
    ("Iluminación", ["LAMPARA", "LUZ", "LED", "TUBO", "BOMBILLO", "REFLECTOR", "LUCES"]),
    ("Construcción", ["CEMENTO", "AZULEJO", "LOSA", "ESCALERA", "HERRAMIENTA", "BOMBA DE AGUA", "FILTRO DE AGUA", "TANQUE", "PINTURA"]),
    ("Movilidad", ["BICICLETA", "MOTO", "TRICICLO", "PATINETA"]),
    ("Hogar y Muebles", ["COLCHON", "ESCRITORIO", "SILLA", "MESA", "SOFA", "CAMA", "ARMARIO", "BASE PARA SPLIT", "ESTANTE", "BAÑO", "PUERTA", "TOLDO"]),
]

def categorize(n):
    for cat, keys in CATS:
        if any(k in n for k in keys): return cat
    return "General"

wb = openpyxl.load_workbook(SRC, data_only=True)
wf = openpyxl.load_workbook(SRC)

def product_rows(ws):
    for r in range(2, ws.max_row + 1):
        name = clean(ws.cell(r, 1).value)
        if not name: continue
        if name == "TOTAL": break
        yield r, name

# ---------- cuadre panel (labels in column A after TOTAL) ----------
LABELS = {
    "VENTA": "venta", "FONDO CUP": "fondoCup", "FONDO USD": "fondoUsd",
    "AUMENTO DE FONDO CUP": "aumentoFondoCup", "AUMENTO DE FONDO USD \\ZELLE": "aumentoFondoUsd",
    "COMISIONES": "comisiones", "DOMICILIOS": "domicilios", "GASTOS": "gastos",
    "GASTOS COMBOS Y REBAJAS USD": "gastosCombosUsd", "SALIDA JESUS MN": "salidaJesusMn",
    "SALIDA JESUS USD": "salidaJesusUsd", "SALIDA MLC": "salidaMlc", "USD EFECTIVO": "usdEfectivo",
    "ZELLE": "zelle", "MLC": "mlc", "MN EFECTIVO": "mnEfectivo", "MN TARJETA": "mnTarjeta", "X COBRAR": "xCobrar",
}
CUP_KEYS = {"fondoCup", "aumentoFondoCup", "comisiones", "domicilios", "gastos", "salidaJesusMn", "mnEfectivo", "mnTarjeta"}

def cuadre_panel(name):
    ws, wsf = wb[name], wf[name]
    rate, out, found = None, {}, False
    for r in range(150, ws.max_row + 1):
        lab = clean(ws.cell(r, 1).value)
        if lab == "TOTAL" and not found: found = True; continue
        if not found: continue
        if lab.startswith("INFORME SEMANAL"): break
        key = LABELS.get(lab)
        if not key: continue
        f = str(wsf.cell(r, 2).value or "")
        m = re.search(r"/\s*(\d+(?:\.\d+)?)", f)
        if m and rate is None: rate = float(m.group(1))
        if key in CUP_KEYS:
            # Guardamos siempre el valor en CUP (columna C/D) cuando existe.
            cupv = num(ws.cell(r, 3).value) + num(ws.cell(r, 4).value)
            if key == "fondoCup":
                out["fondoCupEfectivo"] = num(ws.cell(r, 3).value)
                out["fondoCupTarjeta"] = num(ws.cell(r, 4).value)
                continue
            if cupv == 0 and m is None: cupv = num(ws.cell(r, 2).value) * (rate or 1)
            out[key + "Cup" if not key.endswith(("Cup", "Mn")) else key] = cupv
        else:
            out[key] = num(ws.cell(r, 2).value)
    out["cupUsd"] = rate or 0
    return out

# ---------- inventory and movements across every dated sheet ----------
daily = sorted([s for s in wb.sheetnames if sheet_date(s)], key=sheet_date)
if not daily:
    raise SystemExit("No se encontraron hojas diarias con fecha en el nombre.")
ws = wb[MAIN]
date = sheet_date(MAIN)
opening_by_name, latest_rows = {}, {}
for sheet_name in daily:
    source_ws = wb[sheet_name]
    for row_number, name in product_rows(source_ws):
        opening_by_name.setdefault(name, num(source_ws.cell(row_number, 2).value))
        latest_rows[name] = (source_ws, row_number)

products, product_by_name = [], {}
for r, name in product_rows(ws):
    if name in product_by_name: continue
    g = lambda c: ws.cell(r, c).value
    obs = g(16)
    obs = "" if obs is None or isinstance(obs, (int, float)) or not str(obs).strip() else str(obs).strip()
    product = {
        "name": name, "category": categorize(name),
        # La base corresponde a la apertura de la primera fecha importada; todos los
        # movimientos diarios posteriores reconstruyen el saldo hasta la hoja más nueva.
        "stockInicial": opening_by_name.get(name, num(g(2))),
        "precioVentaUsd": num(g(12)), "precioVenta2Usd": num(g(13)),
        "precioCostoUsd": num(g(10)), "comisionCup": num(g(7)),
        "observaciones": obs, "diferencia": num(g(16)) if isinstance(g(16), (int, float)) else 0,
        "stockFinal": num(g(14)),
    }
    products.append(product)
    product_by_name[name] = product

# Si se incorporó un producto después de la primera hoja, no estaba en MAIN pero
# igualmente debe quedar en el catálogo y en su historial.
for name, (source_ws, r) in latest_rows.items():
    if name in product_by_name: continue
    g = lambda c: source_ws.cell(r, c).value
    obs = g(16)
    product = {
        "name": name, "category": categorize(name), "stockInicial": opening_by_name.get(name, num(g(2))),
        "precioVentaUsd": num(g(12)), "precioVenta2Usd": num(g(13)),
        "precioCostoUsd": num(g(10)), "comisionCup": num(g(7)),
        "observaciones": "" if obs is None or isinstance(obs, (int, float)) else str(obs).strip(),
        "diferencia": 0, "stockFinal": num(g(14)),
    }
    products.append(product)
    product_by_name[name] = product

movements = []
running_stock = dict(opening_by_name)
for sheet_name in daily:
    source_ws = wb[sheet_name]
    day = sheet_date(sheet_name)
    import_key = f"CUADRE PINAR SEPT.xlsx#{sheet_name}"
    seen_day = set()
    for r, name in product_rows(source_ws):
        if name in seen_day: continue
        seen_day.add(name)
        g = lambda c: source_ws.cell(r, c).value
        entry, exit_qty, v1, v2 = num(g(3)), num(g(4)), num(g(5)), num(g(6))
        product = product_by_name.get(name)
        if not product: continue
        source_opening = num(g(2))
        opening_delta = round(source_opening - running_stock.get(name, source_opening), 2)
        if opening_delta > 0.01:
            movements.append({"date": day, "product": name, "type": "ENTRADA", "quantity": opening_delta,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0, "notes": "Ajuste de apertura según el Excel",
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        elif opening_delta < -0.01:
            movements.append({"date": day, "product": name, "type": "SALIDA", "quantity": -opening_delta,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0, "notes": "Ajuste de apertura según el Excel",
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        if entry:
            movements.append({"date": day, "product": name, "type": "ENTRADA", "quantity": entry,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0,
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        if exit_qty:
            movements.append({"date": day, "product": name, "type": "SALIDA", "quantity": exit_qty,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0,
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        total_qty = v1 + v2
        price1 = num(g(12))
        price2 = num(g(13)) or price1
        listed1, listed2 = v1 * price1, v2 * price2
        listed_total = listed1 + listed2
        excel_total = num(g(15))
        sale_total = listed_total if excel_total == 0 and listed_total > 0 else excel_total
        split1 = round(sale_total * listed1 / listed_total, 2) if listed_total else (round(sale_total * v1 / total_qty, 2) if total_qty else 0)
        commission_total = num(g(8))
        if commission_total == 0 and total_qty and num(g(7)):
            commission_total = total_qty * num(g(7))
        commission1 = round(commission_total * v1 / total_qty, 2) if total_qty else 0
        sale_rows = (
            (v1, price1, split1, commission1, ""),
            (v2, price2, round(sale_total - split1, 2), round(commission_total - commission1, 2), "VENTA 2"),
        )
        domicile_added = False
        for quantity, price, amount, commission, label in sale_rows:
            if not quantity: continue
            movements.append({
                "date": day, "product": name, "type": "VENTA", "quantity": quantity,
                "unitPriceUsd": price, "unitCostUsd": num(g(10)), "importeUsd": amount,
                "comisionCup": commission, "center": "TIENDA",
                "domicilioCup": num(g(9)) if not domicile_added else 0,
                "notes": label, "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar",
            })
            domicile_added = True
        expected_final = source_opening + entry - exit_qty - v1 - v2
        final_delta = round(num(g(14)) - expected_final, 2)
        if final_delta > 0.01:
            movements.append({"date": day, "product": name, "type": "ENTRADA", "quantity": final_delta,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0, "notes": "Ajuste de cierre según el Excel",
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        elif final_delta < -0.01:
            movements.append({"date": day, "product": name, "type": "SALIDA", "quantity": -final_delta,
                              "unitPriceUsd": 0, "center": "MOV", "domicilioCup": 0, "notes": "Ajuste de cierre según el Excel",
                              "importKey": import_key, "sourceSheet": sheet_name, "sourceFormat": "pinar"})
        running_stock[name] = num(g(14))

# ---------- history across all daily sheets ----------
price_hist, last = [], {}
rates, last_rate = [], None
cuadres = []
for s in daily:
    d = sheet_date(s)
    w = wb[s]
    for r, name in product_rows(w):
        for field, col in (("precioVentaUsd", 12), ("precioCostoUsd", 10), ("comisionCup", 7)):
            val = num(w.cell(r, col).value)
            k = (name, field)
            if k in last and last[k] != val:
                price_hist.append({"date": d, "product": name, "field": field, "old": last[k], "new": val,
                                   "importKey": f"CUADRE PINAR SEPT.xlsx#{s}", "sourceSheet": s, "sourceFormat": "pinar"})
            last[k] = val
    c = cuadre_panel(s)
    c["date"] = d
    cuadres.append(c)
    if c["cupUsd"] and c["cupUsd"] != last_rate:
        rates.append({"date": d, "currency": "USD", "rate": c["cupUsd"], "note": f"Hoja {s}"})
        last_rate = c["cupUsd"]

seed = {"source": "CUADRE PINAR SEPT.xlsx", "sheet": MAIN, "date": date,
        "products": products, "movements": movements, "cuadres": cuadres,
        "rates": rates, "priceHistory": price_hist}

with open(os.path.join(ROOT, "web/js/seed-data.js"), "w", encoding="utf-8") as f:
    f.write("/** Generado por tools/import_excel.py desde CUADRE PINAR SEPT.xlsx (hoja 25 9 26) */\n")
    f.write("export const SEED = " + json.dumps(seed, ensure_ascii=False) + ";\n")
with open(os.path.join(ROOT, "app/src/main/assets/seed.json"), "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=1)

print(len(products), "productos,", len(movements), "movimientos,", len(cuadres), "cuadres,", len(rates), "tasas,", len(price_hist), "cambios de precio")
from collections import Counter
print(Counter(p["category"] for p in products))
print([c for c in cuadres if c["date"] == date])
