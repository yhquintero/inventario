#!/usr/bin/env python3
"""Pruebas de la descarga incremental (`?since=`) y del registro paginado (S-03).

Arranca un servidor temporal, activa una licencia y comprueba contra la API real:
  · sin `since`, el estado viaja completo (contrato de siempre);
  · con `since=N`, solo llegan los registros que cambiaron después de N;
  · los registros eliminados se anuncian en `deleted`;
  · pedir la misma versión no devuelve nada (`unchanged`);
  · una versión demasiado antigua cae en el estado completo;
  · `/api/security-log` pagina con `limit`, `page`/`offset` y busca con `q`.

Uso:  python3 tools/test_delta_estado.py     (código de salida 0 = correcto)
"""
import http.cookiejar
import json
import os
import pathlib
import re
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
PORT = 18199
BASE = f"http://127.0.0.1:{PORT}"
tmp = tempfile.mkdtemp(prefix="ng-delta-")
SECRET = "delta-" + secrets.token_hex(16)

fallos = 0
pruebas = 0


def ok(nombre, condicion, detalle=""):
    global fallos, pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos += 1
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


def sesion(usuario, clave):
    cj = http.cookiejar.CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    def call(method, path, data=None, crudo=False):
        cuerpo = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(BASE + path, method=method, data=cuerpo,
                                     headers={"Content-Type": "application/json", "X-CP": "1"})
        try:
            with op.open(req, timeout=20) as r:
                datos = json.loads(r.read() or b"{}")
                return (r.status, datos) if not crudo else (r.status, r.read())
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read() or b"{}")
            except Exception:
                return e.code, {}

    estado, _ = call("POST", "/api/login", {"username": usuario, "password": clave})
    if estado != 200:
        sys.exit(f"No se pudo iniciar sesión como {usuario} (código {estado})")
    return call


def producto(pid, nombre, precio=10.0, updated=1):
    return {"id": pid, "name": nombre, "category": "General", "stockInicial": 5, "stockActual": 5,
            "stocks": {"w1": 5}, "stocksInicial": {"w1": 5}, "precioVentaUsd": precio,
            "precioVenta2Usd": 0, "precioCostoUsd": 6, "comisionCup": 0, "minStock": 1,
            "observaciones": "", "barcode": "", "deletedAt": None, "createdAt": updated, "updatedAt": updated}


env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT),
       "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": SECRET, "DELTA_KEEP_VERSIONS": "5"}
proc = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/api/health", timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    else:
        sys.exit("El servidor temporal no arrancó")

    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", "Delta", "--term", "MES"],
                         env=env, capture_output=True, text=True)
    hallada = re.search(r"NG-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", gen.stdout or "")
    if not hallada:
        sys.exit(f"No se pudo emitir la licencia:\n{gen.stdout}\n{gen.stderr}")
    req = urllib.request.Request(BASE + "/api/license/activate", method="POST",
                                 data=json.dumps({"license_key": hallada.group(0)}).encode(),
                                 headers={"Content-Type": "application/json", "X-CP": "1"})
    try:
        urllib.request.urlopen(req, timeout=10).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"No se pudo activar la licencia (código {e.code})")

    admin = sesion("jefe", "Jefe123!")  # el Administrador exige 2FA; jefatura tiene los mismos permisos de datos

    print("\nContrato de siempre (sin since)")
    estado, r = admin("GET", "/api/state")
    ok("responde 200", estado == 200, str(estado))
    ok("sin datos todavía, el estado es nulo", r.get("state") is None, str(r.get("state")))
    ok("se marca como completo", r.get("full") is True, str(r.get("full")))
    base_version = r["version"]

    print("\nPrimera carga")
    inicial = {
        "products": [producto("p1", "ARROZ", 10), producto("p2", "FRIJOL", 12)],
        "movements": ["m1", "m2"],
        "settings": {"businessName": "Delta", "theme": "light"},
        "warehouses": [{"id": "w1", "name": "PRINCIPAL", "code": "PRI", "isDefault": True, "active": True, "createdAt": 1}],
    }
    inicial["movements"] = [
        {"id": "m1", "date": "2026-10-20", "productId": "p1", "productName": "ARROZ", "type": "VENTA",
         "quantity": 1, "unitPriceUsd": 10, "importeUsd": 10, "center": "TIENDA", "warehouseId": "w1",
         "createdAt": 1, "updatedAt": 1},
        {"id": "m2", "date": "2026-10-20", "productId": "p1", "productName": "ARROZ", "type": "ENTRADA",
         "quantity": 5, "unitPriceUsd": 10, "importeUsd": 50, "center": "TIENDA", "warehouseId": "w1",
         "createdAt": 1, "updatedAt": 1},
    ]
    estado, r = admin("PUT", "/api/state", {"version": base_version, "state": inicial})
    ok("se guarda el estado inicial", estado == 200, str(estado) + " " + str(r))
    # El primer GET puede convertir datos (módulo de almacenes) y subir la versión: se lee la real.
    _, actual = admin("GET", "/api/state")
    v1 = actual["version"]

    print("\nDescarga incremental")
    estado, r = admin("GET", f"/api/state?since={v1}")
    ok("pedir la versión actual no devuelve cambios", estado == 200 and r.get("unchanged") is True, str(r.get("unchanged")))
    ok("en ese caso no se envía el estado", r.get("state") is None, str(r.get("state")))

    # Cambia un producto (precio) y añade otro; m2 no se toca.
    actualizado = json.loads(json.dumps(inicial))
    actualizado["products"][0]["precioVentaUsd"] = 11
    actualizado["products"][0]["updatedAt"] = 50
    actualizado["products"].append(producto("p3", "AZÚCAR", 9, 50))
    actualizado["movements"].append(
        {"id": "m3", "date": "2026-10-21", "productId": "p3", "productName": "AZÚCAR", "type": "VENTA",
         "quantity": 2, "unitPriceUsd": 9, "importeUsd": 18, "center": "TIENDA", "warehouseId": "w1",
         "createdAt": 50, "updatedAt": 50})
    estado, r = admin("PUT", "/api/state", {"version": v1, "state": actualizado})
    ok("se guarda la segunda versión", estado == 200, str(estado))
    v2 = r["version"]

    estado, r = admin("GET", f"/api/state?since={v1}")
    ok("la descarga incremental responde 200", estado == 200, str(estado))
    ok("no se marca como completa", r.get("full") is False, str(r.get("full")))
    ok("se marca como incremental", r.get("delta") is True, str(r.get("delta")))
    productos = (r.get("state") or {}).get("products") or []
    ids = sorted(p["id"] for p in productos)
    ok("llega el producto modificado", "p1" in ids, str(ids))
    ok("llega el producto nuevo", "p3" in ids, str(ids))
    ok("no llega el producto que no cambió", "p2" not in ids, str(ids))
    ok("el precio viene actualizado", next(p for p in productos if p["id"] == "p1")["precioVentaUsd"] == 11)
    movs = (r.get("state") or {}).get("movements") or []
    ok("llega solo el movimiento nuevo", [m["id"] for m in movs] == ["m3"], str([m["id"] for m in movs]))
    ok("no se reenvían las secciones sin cambios", "settings" not in (r.get("state") or {}), str(list((r.get("state") or {}))))
    ok("se informa cuántos registros cambiaron", r.get("changed") == 3, str(r.get("changed")))
    ok("no hay borrados que anunciar", r.get("removed") == 0, str(r.get("removed")))
    ok("el estado completo no se envía en modo incremental", "settings" not in (r.get("state") or {}))

    print("\nRegistros eliminados")
    sin_p2 = json.loads(json.dumps(actualizado))
    sin_p2["products"] = [p for p in sin_p2["products"] if p["id"] != "p2"]
    estado, r = admin("PUT", "/api/state", {"version": v2, "state": sin_p2})
    ok("se guarda sin el producto p2", estado == 200, str(estado))
    v3 = r["version"]
    estado, r = admin("GET", f"/api/state?since={v2}")
    borrados = (r.get("deleted") or {}).get("products") or []
    ok("el producto eliminado se anuncia", borrados == ["p2"], str(borrados))
    ok("no se envía como si siguiera existiendo",
       "p2" not in [p["id"] for p in ((r.get("state") or {}).get("products") or [])])
    ok("se cuentan los borrados", r.get("removed") == 1, str(r.get("removed")))

    print("\nLímites del modo incremental")
    # Se avanza la versión para salir de la ventana que el servidor conserva en el índice.
    for i in range(6):
        ultimo = json.loads(json.dumps(sin_p2))
        ultimo["settings"] = {"businessName": f"Delta {i}", "theme": "light"}
        estado, r = admin("PUT", "/api/state", {"version": v3, "state": ultimo})
        v3 = r["version"]
    estado, r = admin("GET", "/api/state?since=0")
    ok("una versión muy antigua recibe el estado completo", r.get("full") is True, str(r.get("full")))
    ok("el estado completo trae las secciones", isinstance(r.get("state"), dict) and "products" in r["state"])
    ok("y explica por qué", isinstance(r.get("note"), str) and "completo" in (r.get("note") or ""), str(r.get("note")))
    estado, r = admin("GET", f"/api/state?since={v3}&full=1")
    ok("`full=1` fuerza el estado completo", r.get("full") is True and isinstance(r.get("state"), dict))
    estado, r = admin("GET", "/api/state?since=abc")
    ok("un `since` inválido no rompe la ruta", estado == 200 and r.get("full") is True, str(estado))
    estado, r = admin("GET", "/api/state?since=999999")
    ok("un `since` del futuro devuelve el estado completo", estado == 200 and r.get("full") is True, str(estado))
    ok("y avisa de que el cliente va por delante", "por delante" in (r.get("note") or ""), str(r.get("note")))

    print("\nEl estado guardado sigue siendo el mismo")
    estado, r = admin("GET", "/api/state")
    nombres = sorted(p["name"] for p in r["state"]["products"])
    ok("el estado completo conserva lo guardado", nombres == ["ARROZ", "AZÚCAR"], str(nombres))
    ok("la versión avanza con cada guardado", r["version"] == v3, str(r["version"]))

    print("\nRegistro de seguridad paginado")
    # Cada inicio de sesión deja un evento en la auditoría: se generan los necesarios.
    for i in range(14):
        sesion("jefe", "Jefe123!")
    for i in range(3):
        admin("POST", "/api/prints", {"saleId": f"sale-{i:02d}", "code": f"AAA-BBB{i}"})
    estado, r = admin("GET", "/api/security-log?limit=5")
    ok("respeta el límite", estado == 200 and len(r.get("log") or []) == 5, str(len(r.get("log") or [])))
    ok("informa el total", (r.get("total") or 0) >= 12, str(r.get("total")))
    ok("informa las páginas", (r.get("pages") or 0) >= 3, str(r.get("pages")))
    ok("informa si hay más", r.get("hasMore") is True, str(r.get("hasMore")))
    # Cierres de día con detalle distinto: filas únicas y fáciles de seguir entre páginas.
    for i in range(6):
        admin("POST", "/api/days/close", {"date": f"2026-09-{i + 1:02d}", "note": f"prueba {i}"})
    estado, p1 = admin("GET", "/api/security-log?q=DAY_CLOSE&limit=2&page=1")
    estado, p2 = admin("GET", "/api/security-log?q=DAY_CLOSE&limit=2&page=2")
    estado, p3 = admin("GET", "/api/security-log?q=DAY_CLOSE&limit=2&page=3")
    detalles = [(x.get("details") or "") for x in (p1.get("log") or []) + (p2.get("log") or []) + (p3.get("log") or [])]
    ok("cada página trae 2 eventos", [len(p.get("log") or []) for p in (p1, p2, p3)] == [2, 2, 2],
       str([len(p.get("log") or []) for p in (p1, p2, p3)]))
    ok("las páginas no repiten eventos", len(set(detalles)) == 6, str(detalles))
    ok("el orden es del más reciente al más antiguo",
       detalles[0].startswith("2026-09-06") and detalles[-1].startswith("2026-09-01"), str(detalles))
    estado, r = admin("GET", "/api/security-log?q=DAY_CLOSE&limit=2&offset=2")
    ok("`offset` equivale a la página 2", (r.get("log") or []) == (p2.get("log") or []))
    estado, r = admin("GET", "/api/security-log?q=LOGIN")
    ok("busca por texto en la acción", estado == 200 and (r.get("total") or 0) >= 10, str(r.get("total")))
    estado, r = admin("GET", "/api/security-log?q=no-existe-este-texto")
    ok("sin coincidencias devuelve lista vacía", estado == 200 and r.get("log") == [], str(r.get("log")))
    estado, r = admin("GET", "/api/security-log?limit=0")
    ok("un límite 0 se corrige a 1", estado == 200 and len(r.get("log") or []) == 1, str(len(r.get("log") or [])))
    estado, r = admin("GET", "/api/security-log?limit=99999")
    ok("un límite absurdo se recorta a 500", estado == 200 and r.get("limit") == 500, str(r.get("limit")))
    estado, r = admin("GET", "/api/security-log?page=999")
    ok("una página lejana devuelve lista vacía sin error", estado == 200 and r.get("log") == [])

finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()

print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
if fallos:
    sys.exit(1)
print("Descarga incremental y paginación correctas\n")
