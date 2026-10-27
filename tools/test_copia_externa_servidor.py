#!/usr/bin/env python3
"""Pruebas de la copia externa dentro del servidor (S-14).

Se importa el servidor con una carpeta de datos temporal y `BACKUP_MIRROR_DIRS`
apuntando a una carpeta de prueba: se crea una copia real, se comprueba que llega
igual, que se puede volver a abrir, que queda anotada en la auditoría y que un
destino caído no impide el otro. Sin red y sin tocar los datos de nadie.

Requiere el paquete cryptography (requirements.txt).
Uso:  python3 tools/test_copia_externa_servidor.py     (código de salida 0 = correcto)
"""
import hashlib
import importlib.util
import json
import os
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).parent.parent
tmp = tempfile.mkdtemp(prefix="ng-ext-srv-")
espejo = pathlib.Path(tmp) / "espejo"
espejo.mkdir()
os.environ["DATA_DIR"] = tmp
os.environ["BACKUP_MIRROR_DIRS"] = str(espejo)

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


spec = importlib.util.spec_from_file_location("ng_s14", ROOT / "server" / "novagest_server.py")
ng = importlib.util.module_from_spec(spec)
try:
    spec.loader.exec_module(ng)
except Exception as e:  # noqa: BLE001
    print(f"No se pudo importar el servidor: {e}")
    sys.exit(2)
try:
    ng.init_db()
except Exception as e:  # noqa: BLE001
    print(f"init_db falló (¿falta cryptography?): {e}")
    sys.exit(2)

ce = ng.copias_externas

print("\nConfiguración del servidor")
config = ce.leer_config()
ok("lee la carpeta configurada", len(config) == 1 and config[0]["tipo"] == "carpeta", str(config))
ok("es la carpeta de la prueba", config[0]["ruta"] == str(espejo))
estado = ce.estado_salud(None, config)
ok("al empezar no hay réplica", estado["ultimo"] is None)

print("\nCopia con réplica externa")
ng.q("UPDATE app_state SET data=? WHERE id=1", (json.dumps({"products": [{"id": "p1", "name": "Nevera"}]}),))
nombre = ng.make_backup("test", "prueba")
local = pathlib.Path(ng.BACKUPS) / nombre
remoto = espejo / nombre
ok("la copia local existe", local.is_file())
ok("la copia llegó a la carpeta externa", remoto.is_file())
ok("los dos archivos son idénticos", local.read_bytes() == remoto.read_bytes())
sha = hashlib.sha256(local.read_bytes()).hexdigest()
ok("el hash coincide", hashlib.sha256(remoto.read_bytes()).hexdigest() == sha)

parte = ng.ULTIMA_REPLICA["parte"]
ok("queda anotada la réplica", isinstance(parte, dict))
ok("un destino, un acierto", parte["destinos"] == 1 and parte["correctos"] == 1)
ok("todo bien", parte["todoBien"] is True)
ok("el destino en el parte es el configurado", parte["resultados"][0]["destino"] == str(espejo))
ok("la copia externa se verificó leyéndola", parte["resultados"][0].get("verificada", {}).get("ok") is True)

print("\nAuditoría")
acciones = {r["action"] for r in ng.q("SELECT action FROM audit ORDER BY id DESC LIMIT 20")}
ok("se anota la copia", "BACKUP" in acciones, str(acciones))
ok("se anota que se puede restaurar", "BACKUP_VERIFIED" in acciones, str(acciones))
ok("se anota la réplica externa", "BACKUP_EXTERNAL" in acciones, str(acciones))
detalle = ng.q("SELECT details FROM audit WHERE action='BACKUP_EXTERNAL' ORDER BY id DESC LIMIT 1", one=True)["details"]
ok("el detalle dice cuántos destinos", "1 destino(s)" in detalle and "1 copiado(s)" in detalle, detalle)

print("\nLa copia se puede restaurar")
datos = ng.read_backup(nombre)
ok("se descifra y se lee", isinstance(datos, dict))
ok("trae el estado guardado", datos.get("state") == {"products": [{"id": "p1", "name": "Nevera"}]})
revision = ce.verificar_archivo(str(local), ng.abrir_copia)
ok("la verificación del módulo dice que sí", revision["ok"] is True)
ok("el hash del archivo es el mismo", revision["sha256"] == sha)

# Una copia manipulada tiene que detectarse.
roto = pathlib.Path(ng.BACKUPS) / "novagest_2026-01-01_000000_test.bak"
roto.write_bytes(b"esto no es una copia")
rev = ce.verificar_archivo(str(roto), ng.abrir_copia)
ok("una copia manipulada no pasa", rev["ok"] is False and rev["motivo"] == "no-abre", str(rev))

print("\nUn destino caído no rompe la copia")
config_dos = [{"tipo": "carpeta", "ruta": str(espejo)}, {"tipo": "carpeta", "ruta": "/proc/no-se-puede"}]
parte = ce.replicar(local.read_bytes(), "novagest_x.bak", config_dos, abrir=ng.abrir_copia)
ok("el bueno sí", parte["correctos"] == 1)
ok("el malo se anota", parte["fallidos"] == 1)
ok("la copia sigue estando", (espejo / "novagest_x.bak").is_file())
ok("el parte no es un éxito total", parte["todoBien"] is False)

print("\nEstado para la pantalla de Copias")
salud = ce.estado_salud(parte, config_dos)
ok("cuenta los destinos", salud["configurados"] == 2)
ok("marca el problema", salud["problema"] is True)
ok("no aparece ninguna clave en el estado", "clave" not in json.dumps(salud, ensure_ascii=False).lower())

print("\nSalud del servidor")
salud_srv = ng.backup_health()
ok("las copias se cuentan", salud_srv["total"] >= 1, str(salud_srv))

print()
if fallos:
    print(f"{fallos} fallo(s) de {pruebas}")
    sys.exit(1)
print(f"{pruebas}/{pruebas} comprobaciones correctas · copia externa en el servidor (S-14)")
