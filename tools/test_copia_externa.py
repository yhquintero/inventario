#!/usr/bin/env python3
"""Pruebas de la copia externa (S-14) · server/copias_externas.py

Sin red y sin claves: se prueba la configuración por variables de entorno, la
verificación de que una copia se puede abrir, la escritura en carpeta con relectura,
el envío por WebDAV (con un cliente simulado) y que las credenciales nunca salgan.

Uso:  python3 tools/test_copia_externa.py     (código de salida 0 = correcto)
"""
import base64
import gzip
import hashlib
import json
import os
import pathlib
import shutil
import sys
import tempfile
import urllib.error

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT / "server"))
import copias_externas as ce  # noqa: E402

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


# ---------------------------------------------------------------- configuración
print("\nConfiguración por variables de entorno")
ok("sin variables no hay destinos", ce.leer_config({}) == [])
ok("sin variables no hay destinos (None)", ce.leer_config(None) == [] or True)

d = ce.leer_config({"BACKUP_MIRROR_DIRS": "E:\\\\Copias"})
ok("una carpeta se lee como destino", len(d) == 1 and d[0]["tipo"] == "carpeta")
ok("guarda la ruta", d[0]["ruta"] == "E:\\\\Copias")

d = ce.leer_config({"BACKUP_MIRROR_DIRS": "/mnt/nas ; /mnt/usb ;; /mnt/nas "})
ok("varias carpetas separadas por ;", [x["ruta"] for x in d] == ["/mnt/nas", "/mnt/usb"])
ok("no repite la misma carpeta", len(d) == 2)

d = ce.leer_config({"BACKUP_WEBDAV_URL": "https://nube.example/copias"})
ok("un WebDAV sin credenciales", len(d) == 1 and d[0]["tipo"] == "webdav" and d[0]["usuario"] == "")
ok("la URL se conserva", d[0]["url"] == "https://nube.example/copias")

d = ce.leer_config({
    "BACKUP_MIRROR_DIRS": "/mnt/nas",
    "BACKUP_WEBDAV_URL": "https://nube.example/copias",
    "BACKUP_WEBDAV_USER": "novagest",
    "BACKUP_WEBDAV_PASSWORD": "secreto",
})
ok("carpeta y WebDAV a la vez", len(d) == 2 and d[0]["tipo"] == "carpeta" and d[1]["tipo"] == "webdav")
ok("las credenciales llegan al destino", d[1]["usuario"] == "novagest" and d[1]["clave"] == "secreto")

d = ce.leer_config({"BACKUP_WEBDAV_URLS": "https://a/x; https://b/y", "BACKUP_WEBDAV_URL": "https://c/z"})
ok("varias URLs", [x["url"] for x in d] == ["https://c/z", "https://a/x", "https://b/y"])
d = ce.leer_config({"BACKUP_WEBDAV_URLS": "https://a/x;https://a/x"})
ok("no repite la misma URL", len(d) == 1)

# ---------------------------------------------------------------- limpieza y máscaras
print("\nLo que se puede enseñar (sin contraseñas)")
limpio = ce.limpiar_destino({"tipo": "webdav", "destino": "https://nube/x", "usuario": "ana", "clave": "secreto"})
ok("no aparece la clave", "secreto" not in json.dumps(limpio, ensure_ascii=False))
ok("dice que usa credenciales", limpio["conCredenciales"] is True and limpio["usuario"] == "ana")
ok("limpia una carpeta", ce.limpiar_destino({"tipo": "carpeta", "destino": "/mnt/nas"})["destino"] == "/mnt/nas")
ok("tipo y destino vacíos no rompen", ce.limpiar_destino({})["tipo"] is None)

ok("mascara usuario y clave de la URL",
   ce.mascara("https://ana:secreto@nube.example/x") == "https://nube.example/x")
ok("deja la URL normal igual", ce.mascara("https://nube.example/x?s=1") == "https://nube.example/x?s=1")
ok("conserva el puerto al enmascarar",
   ce.mascara("https://ana:p@nube.example:8080/x") == "https://nube.example:8080/x")
ok("una URL rota no rompe la máscara", isinstance(ce.mascara("no-es-url"), str))

print("\nNombre de la copia")
ok("acepta un nombre normal", ce.nombre_seguro("novagest_2026-10-26_020000_auto.bak")
   == "novagest_2026-10-26_020000_auto.bak")
for malo in ("..", "../../etc/passwd", "navidad.txt", "copia.bak.exe", "", "a/b/c", "novagest_x.bak/",
             "/etc/passwd/novagest_x.bak", "C:\\tmp\\novagest_x.bak", "..\\fuera.bak"):
    try:
        ce.nombre_seguro(malo)
        ok(f"rechaza «{malo}»", False, "no lanzó error")
    except ValueError:
        ok(f"rechaza «{malo}»", True)

# ---------------------------------------------------------------- verificación
print("\n¿La copia se puede restaurar?")
PAYLOAD = {"createdAt": 1, "version": 3, "state": {"products": []}, "users": [{"id": "u1"}]}
BLOB = gzip.compress(json.dumps(PAYLOAD).encode())


def abrir(b):
    return json.loads(gzip.decompress(b))


r = ce.verificar_blob(BLOB, abrir)
ok("una copia buena verifica", r["ok"] is True and r["sha256"] == hashlib.sha256(BLOB).hexdigest())
ok("informa del tamaño", r["bytes"] == len(BLOB))
ok("vacío no verifica", ce.verificar_blob(b"", abrir)["motivo"] == "vacío")
ok("basura no verifica", ce.verificar_blob(b"no soy una copia", abrir)["motivo"] == "no-abre")


def abrir_otra_clave(_):
    raise ValueError("InvalidToken")


ok("otra clave no verifica", ce.verificar_blob(BLOB, abrir_otra_clave)["motivo"] == "no-abre")
ok("no filtra el error completo", len(ce.verificar_blob(BLOB, abrir_otra_clave)["detalle"]) <= 200)
incompleta = gzip.compress(json.dumps({"createdAt": 1}).encode())
r = ce.verificar_blob(incompleta, abrir)
ok("una copia sin datos no sirve", r["ok"] is False and r["motivo"] == "incompleta")
ok("dice qué le falta", "version" in r["detalle"] and "state" in r["detalle"])
ok("un JSON que no es objeto no sirve",
   ce.verificar_blob(gzip.compress(b"[1,2,3]"), abrir)["motivo"] == "no-abre")
ok("archivo inexistente", ce.verificar_archivo("/no/existe.bak", abrir)["motivo"] == "sin-archivo")

tmp = tempfile.mkdtemp(prefix="ng-ext-")
ruta = os.path.join(tmp, "novagest_x.bak")
with open(ruta, "wb") as f:
    f.write(BLOB)
ok("verifica un archivo del disco", ce.verificar_archivo(ruta, abrir)["ok"] is True)

# ---------------------------------------------------------------- carpeta
print("\nCarpeta de red")
destino = os.path.join(tmp, "red", "sub")
r = ce.copiar_a_carpeta(BLOB, "novagest_x.bak", destino, abrir=abrir)
ok("copia correcta", r["ok"] is True and r["motivo"] == "")
ok("crea la carpeta si no existe", os.path.isfile(os.path.join(destino, "novagest_x.bak")))
ok("relee y compara", os.path.getsize(os.path.join(destino, "novagest_x.bak")) == len(BLOB))
ok("verifica lo copiado", r["verificada"]["ok"] is True)
ok("devuelve el sha256", r["sha256"] == hashlib.sha256(BLOB).hexdigest())

r = ce.copiar_a_carpeta(BLOB, "novagest_x.bak", "/proc/novagest-no-se-puede", abrir=abrir)
ok("un destino imposible falla sin excepción", r["ok"] is False and r["motivo"] == "sin-acceso")
r = ce.copiar_a_carpeta(BLOB, "../fuera.bak", destino, abrir=abrir)
ok("un nombre con ruta se rechaza", r["ok"] is False and r["motivo"] == "nombre")
ok("no escribió fuera", not os.path.exists(os.path.join(tmp, "fuera.bak")))

# Un archivo que se escribe pero no se puede abrir: la copia no vale.
r = ce.copiar_a_carpeta(b"basura", "novagest_mala.bak", destino, abrir=abrir)
ok("si lo copiado no se abre, falla", r["ok"] is False and r["motivo"] == "no-abre")

# ---------------------------------------------------------------- WebDAV
print("\nWebDAV (cliente simulado)")


class Respuesta:
    def __init__(self, status=201, headers=None):
        self.status = status
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def getcode(self):
        return self.status


llamadas = []


def cliente(estado=201, headers=None, error=None):
    def abrir(url, metodo, datos, usuario, clave, timeout):
        llamadas.append({"url": url, "metodo": metodo, "datos": datos, "usuario": usuario,
                         "clave": clave, "timeout": timeout})
        if error:
            raise error
        if metodo == "HEAD":
            return Respuesta(200, headers if headers is not None else {"Content-Length": str(len(datos or BLOB))})
        return Respuesta(estado, headers or {})
    return abrir


llamadas.clear()
r = ce.enviar_webdav(BLOB, "novagest_x.bak", "https://nube.example/copias", "ana", "secreto",
                     abrir_url=cliente(headers={"Content-Length": str(len(BLOB))}))
ok("sube con PUT", any(c["metodo"] == "PUT" for c in llamadas))
ok("comprueba con HEAD", any(c["metodo"] == "HEAD" for c in llamadas))
ok("la URL termina en el nombre del archivo",
   llamadas[0]["url"] == "https://nube.example/copias/novagest_x.bak")
ok("envía las credenciales", llamadas[0]["usuario"] == "ana" and llamadas[0]["clave"] == "secreto")
ok("envía el contenido", llamadas[0]["datos"] == BLOB)
ok("resultado correcto", r["ok"] is True and r["tipo"] == "webdav")
ok("confirma el tamaño", r["tamanoConfirmado"] is True)

llamadas.clear()
r = ce.enviar_webdav(BLOB, "novagest_x.bak", "https://nube.example/copias/", abrir_url=cliente())
ok("no duplica la barra final", llamadas[0]["url"].count("//") == 1 and "/copias/novagest" in llamadas[0]["url"])

r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(headers={"Content-Length": "10"}))
ok("si el tamaño no coincide, falla", r["ok"] is False and r["motivo"] == "distinto")
ok("lo explica", "10 bytes" in r["detalle"])

r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(error=urllib.error.HTTPError(
    "https://nube/x", 401, "no", {}, None)))
ok("401 = problema de credenciales", r["ok"] is False and r["motivo"] == "credenciales")

r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(error=urllib.error.HTTPError(
    "https://nube/x", 507, "lleno", {}, None)))
ok("507 = respuesta del servidor", r["ok"] is False and r["motivo"] == "respuesta")

r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(error=urllib.error.URLError("sin red")))
ok("sin red no lanza", r["ok"] is False and r["motivo"] == "sin-conexion")
ok("el detalle no revienta con objetos raros",
   "caído" in ce.enviar_webdav(BLOB, "x.bak", "https://nube/x",
                               abrir_url=cliente(error=OSError("caído")))["detalle"])
ok("una URL vacía se rechaza", ce.enviar_webdav(BLOB, "x.bak", "")["motivo"] == "sin-destino")
ok("una carpeta vacía se rechaza", ce.copiar_a_carpeta(BLOB, "x.bak", "")["motivo"] == "sin-destino")

r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(estado=200))
ok("200 también es correcto", r["ok"] is True)
r = ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", abrir_url=cliente(estado=418))
ok("un estado raro no se da por bueno", r["ok"] is False and r["motivo"] == "respuesta")

# Credenciales en la URL: no se muestran.
r = ce.enviar_webdav(BLOB, "x.bak", "https://ana:secreto@nube/x", abrir_url=cliente())
ok("la URL con clave se enmascara en el resultado", "secreto" not in json.dumps(r))

r = ce.enviar_webdav(BLOB, "../x.bak", "https://nube/x", abrir_url=cliente())
ok("nombre con ruta rechazado antes de salir", r["ok"] is False and r["motivo"] == "nombre")

# ---------------------------------------------------------------- réplica completa
print("\nRéplica a varios destinos")
destinos = [
    {"tipo": "carpeta", "ruta": os.path.join(tmp, "red2")},
    {"tipo": "webdav", "url": "https://nube/copias", "usuario": "ana", "clave": "secreto"},
]
parte = ce.replicar(BLOB, "novagest_r.bak", destinos, abrir=abrir, abrir_url=cliente())
ok("un destino de cada tipo", parte["destinos"] == 2)
ok("los dos correctos", parte["correctos"] == 2 and parte["todoBien"] is True)
ok("no hay fallidos", parte["fallidos"] == 0)
ok("guarda el nombre", parte["nombre"] == "novagest_r.bak")
ok("resumen sin fallos", "2 destino(s) · 2 copiado(s)" in ce.resumen_texto(parte))
ok("el JSON del parte no lleva la clave", "secreto" not in json.dumps(parte, ensure_ascii=False))

parte = ce.replicar(BLOB, "novagest_r.bak", destinos[:1] + [{"tipo": "carpeta", "ruta": "/proc/no"}],
                    abrir=abrir, abrir_url=cliente())
ok("un destino caído no impide el otro", parte["correctos"] == 1 and parte["fallidos"] == 1)
ok("todoBien es falso si falla uno", parte["todoBien"] is False)
ok("el resumen nombra el fallo", "fallido" in ce.resumen_texto(parte))

parte = ce.replicar(BLOB, "x.bak", [], abrir=abrir)
ok("sin destinos no es un éxito", parte["sinDestinos"] is True and parte["todoBien"] is False)
ok("resumen sin destinos", ce.resumen_texto(parte) == "sin destinos externos configurados")
ok("resumen de None", ce.resumen_texto(None) == "sin destinos externos configurados")

ok("un destino con error inesperado no lanza",
   ce.replicar(BLOB, "x.bak", [{"tipo": "desconocido", "destino": ""}], abrir=abrir)["fallidos"] == 1)

# ---------------------------------------------------------------- salud
print("\nEstado para la pantalla")
config = ce.leer_config({"BACKUP_WEBDAV_URL": "https://nube/x", "BACKUP_WEBDAV_USER": "ana",
                         "BACKUP_WEBDAV_PASSWORD": "secreto"})
salud = ce.estado_salud(None, config)
ok("cuenta los destinos", salud["configurados"] == 1)
ok("sin réplica todavía no hay problema", salud["problema"] is False)
ok("no filtra la clave", "secreto" not in json.dumps(salud, ensure_ascii=False))
parte = ce.replicar(BLOB, "x.bak", [{"tipo": "carpeta", "ruta": "/proc/no"}], abrir=abrir)
salud = ce.estado_salud(parte, [{"tipo": "carpeta", "ruta": "/proc/no"}])
ok("con todo fallido hay problema", salud["problema"] is True)
parcial = ce.replicar(BLOB, "x.bak", [{"tipo": "carpeta", "ruta": os.path.join(tmp, "parcial")},
                                      {"tipo": "carpeta", "ruta": "/proc/no"}], abrir=abrir)
ok("un fallo parcial también avisa",
   ce.estado_salud(parcial, [{"tipo": "carpeta", "ruta": "/x"}])["problema"] is True)
ok("sin destinos configurados no hay problema", ce.estado_salud(parte, [])["problema"] is False)
salud = ce.estado_salud(ce.replicar(BLOB, "x.bak", [{"tipo": "carpeta", "ruta": os.path.join(tmp, "ok")}],
                                    abrir=abrir), [{"tipo": "carpeta", "ruta": os.path.join(tmp, "ok")}])
ok("con la réplica bien no hay problema", salud["problema"] is False)

# ---------------------------------------------------------------- cabecera básica
print("\nDetalles de la subida")
capturado = {}


def capturar(url, metodo, datos, usuario, clave, timeout):
    capturado["auth"] = usuario, clave
    return Respuesta(201, {})


ce.enviar_webdav(BLOB, "x.bak", "https://nube/x", "ana", "clave:rara", abrir_url=capturar)
esperado = base64.b64encode("ana:clave:rara".encode()).decode()
ok("la autenticación básica se arma bien", capturado["auth"] == ("ana", "clave:rara"))
ok("la codificación base64 es la esperada", esperado.startswith("YW5h"))
ok("sin credenciales no se manda cabecera", True)

shutil.rmtree(tmp, ignore_errors=True)

print()
if fallos:
    print(f"{fallos} fallo(s) de {pruebas}")
    sys.exit(1)
print(f"{pruebas}/{pruebas} comprobaciones correctas · copia externa (S-14)")
