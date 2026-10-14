#!/usr/bin/env python3
"""Prueba automática de copias: crear → leer → comparar (restauración en BD temporal).
Detectó el bug del prefijo legado cuadre_/novagest_. Uso: python3 tools/test_restauracion.py
Requiere el paquete cryptography (requirements.txt)."""
import importlib.util, hashlib, json, os, pathlib, sys, tempfile
tmp = tempfile.mkdtemp(prefix="ng-restore-")
os.environ["DATA_DIR"] = tmp  # antes de importar: el servidor usa DATA_DIR
spec = importlib.util.spec_from_file_location("ng", pathlib.Path(__file__).parent.parent / "server" / "novagest_server.py")
m = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(m)
except Exception as e:
    print(f"No se pudo importar el servidor: {e}"); sys.exit(1)

fails = 0
def check(name, cond):
    global fails
    print(("  ok  " if cond else "FAIL ") + name); fails += 0 if cond else 1

try:
    m.init_db()
except Exception as e:
    print(f"init_db falló (¿falta cryptography?): {e}"); sys.exit(1)

# Estado conocido y verificable
estado = {"products": [{"id": "p1", "name": "Nevera", "stockInicial": 3}], "settings": {"businessName": "Prueba"}}
m.q("UPDATE app_state SET data=? WHERE id=1", (json.dumps(estado),))
name = m.make_backup("test", "prueba")
check("la copia se crea con el prefijo actual", name.startswith("novagest_") and name.endswith("_test.bak"))
blob = open(os.path.join(m.BACKUPS, name), "rb").read()
check("SHA-256 de la copia registrado en auditoría", hashlib.sha256(blob).hexdigest()[:16] in
      m.q("SELECT details FROM audit WHERE action='BACKUP' ORDER BY id DESC LIMIT 1", one=True)["details"])
data = m.read_backup(name)
check("la copia se lee (antes fallaba: prefijo legado)", isinstance(data, dict))
check("el estado restaurado coincide", data.get("state") == estado)
check("conteos coinciden", len(data["state"]["products"]) == len(estado["products"]))
# Compatibilidad: una copia legada cuadre_*.bak también debe leerse
legacy = name.replace("novagest_", "cuadre_", 1)
open(os.path.join(m.BACKUPS, legacy), "wb").write(blob)
check("copia legada cuadre_ legible", m.read_backup(legacy).get("state") == estado)
# Nombres peligrosos rechazados
try:
    m.read_backup("../fuera.bak"); check("path traversal rechazado", False)
except ValueError:
    check("path traversal rechazado", True)
print(f"\n{'OK' if not fails else 'FALLOS: ' + str(fails)} — restauración de copias")
sys.exit(1 if fails else 0)
