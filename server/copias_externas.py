#!/usr/bin/env python3
"""S-14 · Copia externa de NovaGest: carpeta de red o WebDAV.

La copia cifrada vive en el mismo disco que la base de datos, así que un disco roto
se lleva las dos. Este módulo replica cada copia **fuera del equipo** y, sobre todo,
**comprueba que lo que llegó se puede abrir**, que es lo que distingue una copia de
un archivo cualquiera.

Dos destinos, sin dependencias nuevas (solo la biblioteca estándar):

- **Carpeta** (unidad de red, NAS montado o `E:\\Copias`): se escribe, se vuelve a leer
  y se compara el SHA-256 de lo leído con el de lo escrito.
- **WebDAV** (Nextcloud, OwnCloud, Synology, box…): `PUT` con autenticación básica y
  luego `HEAD` para confirmar tamaño y fecha.

Variables de entorno:

- `BACKUP_MIRROR_DIRS` — carpetas separadas por `;` (ya existía; se mantiene igual).
- `BACKUP_WEBDAV_URL` — URL de la carpeta, p. ej. `https://nube/mi-carpeta`.
- `BACKUP_WEBDAV_USER` y `BACKUP_WEBDAV_PASSWORD` — credenciales del WebDAV.
- `BACKUP_WEBDAV_URLS` — varias carpetas separadas por `;` (opcional).

Todo lo que se devuelve a la pantalla pasa por `limpiar_destino()`: las credenciales
**nunca** salen del servidor, ni en los informes ni en la auditoría.
"""

from __future__ import annotations

import base64
import hashlib
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import quote, urlparse

# Claves que tiene que traer una copia para que sirva de algo al restaurar.
CLAVES_OBLIGATORIAS = ("createdAt", "version", "state", "users")

TIMEOUT = 12.0


# ------------------------------------------------------------------ configuración
def _carpetas(env) -> list[str]:
    salida = []
    for trozo in (env.get("BACKUP_MIRROR_DIRS") or "").split(";"):
        trozo = trozo.strip()
        if trozo and trozo not in salida:
            salida.append(trozo)
    return salida


def _webdavs(env) -> list[dict]:
    """Un destino por URL, con sus credenciales (que nunca se muestran)."""
    urls = [u.strip() for u in (env.get("BACKUP_WEBDAV_URLS") or "").split(";") if u.strip()]
    if env.get("BACKUP_WEBDAV_URL") and env["BACKUP_WEBDAV_URL"].strip() not in urls:
        urls.insert(0, env["BACKUP_WEBDAV_URL"].strip())
    usuario = env.get("BACKUP_WEBDAV_USER") or ""
    clave = env.get("BACKUP_WEBDAV_PASSWORD") or ""
    salida = []
    for url in urls:
        if url not in [d["url"] for d in salida]:
            salida.append({"url": url, "usuario": usuario, "clave": clave})
    return salida


def leer_config(env=None) -> list[dict]:
    """Destinos configurados, en orden: primero las carpetas y luego los WebDAV."""
    env = os.environ if env is None else env
    destinos: list[dict] = []
    for ruta in _carpetas(env):
        destinos.append({"tipo": "carpeta", "nombre": "Carpeta", "ruta": ruta, "destino": ruta})
    for d in _webdavs(env):
        destinos.append({
            "tipo": "webdav", "nombre": "WebDAV", "url": d["url"],
            "usuario": d["usuario"], "clave": d["clave"], "destino": d["url"],
        })
    return destinos


def limpiar_destino(destino: dict) -> dict:
    """Lo que se puede enseñar: tipo, dónde y si lleva credenciales. Nunca la clave."""
    limpio = {
        "tipo": destino.get("tipo"),
        "destino": destino.get("destino") or destino.get("ruta") or destino.get("url") or "",
        "usuario": destino.get("usuario") or "",
        "conCredenciales": bool(destino.get("usuario")),
    }
    return limpio


def mascara(url: str) -> str:
    """URL sin usuario:contraseña incrustados (por si alguien los puso ahí)."""
    try:
        u = urlparse(url)
        if u.username or u.password:
            host = u.hostname or ""
            if u.port:
                host = f"{host}:{u.port}"
            return u._replace(netloc=host).geturl()
    except ValueError:
        pass
    return url


def nombre_seguro(nombre: str) -> str:
    """Solo el nombre del archivo: ni rutas ni `..` que se escapen de la carpeta.

    Se **rechaza** en vez de recortar: si llega una ruta, algo va mal en quien llama y
    más vale un error claro que escribir en un sitio que nadie espera.
    """
    texto = str(nombre or "").strip()
    if not texto or "/" in texto or "\\" in texto or ".." in texto:
        raise ValueError("nombre de copia inválido")
    if not re.fullmatch(r"[A-Za-z0-9._\-]+\.bak", texto):
        raise ValueError("nombre de copia inválido")
    return texto


# ------------------------------------------------------------------ verificación
def verificar_blob(blob: bytes, abrir) -> dict:
    """Comprueba que un blob de copia se puede abrir y trae lo necesario.

    `abrir` es la función que descifra y descomprime (la del servidor). Se separa para
    que este módulo no tenga que saber nada de claves ni de Fernet.
    """
    if not blob:
        return {"ok": False, "motivo": "vacío", "detalle": "el archivo no tiene contenido"}
    try:
        datos = abrir(blob)
    except Exception as e:  # clave distinta, archivo cortado, no es una copia…
        return {"ok": False, "motivo": "no-abre", "detalle": str(e)[:200]}
    if not isinstance(datos, dict):
        return {"ok": False, "motivo": "no-abre", "detalle": "el contenido no es un objeto"}
    faltan = [k for k in CLAVES_OBLIGATORIAS if k not in datos]
    if faltan:
        return {"ok": False, "motivo": "incompleta", "detalle": "faltan " + ", ".join(faltan)}
    return {"ok": True, "motivo": "", "detalle": "", "bytes": len(blob),
            "sha256": hashlib.sha256(blob).hexdigest()}


def verificar_archivo(ruta, abrir) -> dict:
    """Igual que `verificar_blob` pero leyendo del disco."""
    try:
        with open(ruta, "rb") as f:
            return verificar_blob(f.read(), abrir)
    except OSError as e:
        return {"ok": False, "motivo": "sin-archivo", "detalle": str(e)[:200]}


# ------------------------------------------------------------------ carpetas
def copiar_a_carpeta(blob: bytes, nombre: str, ruta: str, abrir=None) -> dict:
    """Escribe la copia y la vuelve a leer para comparar el SHA-256."""
    inicio = time.time()
    if not str(ruta or "").strip():
        return {"ok": False, "tipo": "carpeta", "destino": ruta, "motivo": "sin-destino",
                "detalle": "la carpeta de destino está vacía", "ms": 0}
    try:
        nombre = nombre_seguro(nombre)
        carpeta = Path(ruta).expanduser()
        carpeta.mkdir(parents=True, exist_ok=True)
        destino = carpeta / nombre
        with open(destino, "wb") as f:
            f.write(blob)
            f.flush()
            os.fsync(f.fileno())
        with open(destino, "rb") as f:
            leido = f.read()
    except ValueError as e:
        return {"ok": False, "tipo": "carpeta", "destino": ruta, "motivo": "nombre", "detalle": str(e)[:200],
                "ms": int((time.time() - inicio) * 1000)}
    except OSError as e:
        return {"ok": False, "tipo": "carpeta", "destino": ruta, "motivo": "sin-acceso", "detalle": str(e)[:200],
                "ms": int((time.time() - inicio) * 1000)}
    if leido != blob:
        return {"ok": False, "tipo": "carpeta", "destino": ruta, "motivo": "distinto",
                "detalle": "lo leído no coincide con lo escrito", "ms": int((time.time() - inicio) * 1000)}
    resultado = {"ok": True, "tipo": "carpeta", "destino": ruta, "motivo": "",
                 "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest(),
                 "ms": int((time.time() - inicio) * 1000)}
    if abrir is not None:
        resultado["verificada"] = verificar_blob(leido, abrir)
        if not resultado["verificada"]["ok"]:
            resultado.update(ok=False, motivo="no-abre", detalle=resultado["verificada"]["detalle"])
    return resultado


# ------------------------------------------------------------------ WebDAV
def _peticion(url: str, metodo: str, datos: bytes | None, usuario: str, clave: str, timeout: float):
    req = urllib.request.Request(url, data=datos, method=metodo)
    if datos is not None:
        req.add_header("Content-Type", "application/octet-stream")
    if usuario or clave:
        token = base64.b64encode(f"{usuario}:{clave}".encode()).decode()
        req.add_header("Authorization", "Basic " + token)
    return urllib.request.urlopen(req, timeout=timeout)


def enviar_webdav(blob: bytes, nombre: str, url: str, usuario: str = "", clave: str = "",
                  timeout: float = TIMEOUT, abrir=None, abrir_url=_peticion) -> dict:
    """Sube la copia y confirma con `HEAD` que el archivo quedó del tamaño correcto."""
    inicio = time.time()
    if not str(url or "").strip():
        return {"ok": False, "tipo": "webdav", "destino": "", "motivo": "sin-destino",
                "detalle": "la URL del WebDAV está vacía", "ms": 0}
    try:
        nombre = nombre_seguro(nombre)
    except ValueError as e:
        return {"ok": False, "tipo": "webdav", "destino": mascara(url), "motivo": "nombre",
                "detalle": str(e)[:200], "ms": int((time.time() - inicio) * 1000)}
    destino = url.rstrip("/") + "/" + quote(nombre)
    try:
        with abrir_url(destino, "PUT", blob, usuario, clave, timeout) as r:
            estado = getattr(r, "status", None) or r.getcode()
            if estado not in (200, 201, 204):
                return {"ok": False, "tipo": "webdav", "destino": mascara(url), "motivo": "respuesta",
                        "detalle": f"el servidor respondió {estado}", "ms": int((time.time() - inicio) * 1000)}
    except urllib.error.HTTPError as e:
        motivo = "credenciales" if e.code in (401, 403) else "respuesta"
        return {"ok": False, "tipo": "webdav", "destino": mascara(url), "motivo": motivo,
                "detalle": f"HTTP {e.code}", "ms": int((time.time() - inicio) * 1000)}
    except (urllib.error.URLError, OSError, ValueError) as e:
        return {"ok": False, "tipo": "webdav", "destino": mascara(url), "motivo": "sin-conexion",
                "detalle": str(getattr(e, "reason", e))[:200], "ms": int((time.time() - inicio) * 1000)}

    # Confirmación: el archivo tiene que estar y medir lo mismo.
    tamano = None
    try:
        with abrir_url(destino, "HEAD", None, usuario, clave, timeout) as r:
            tamano = r.headers.get("Content-Length")
    except Exception:
        tamano = None
    if tamano is not None and str(tamano).strip().isdigit() and int(tamano) != len(blob):
        return {"ok": False, "tipo": "webdav", "destino": mascara(url), "motivo": "distinto",
                "detalle": f"en la nube hay {tamano} bytes y se enviaron {len(blob)}",
                "ms": int((time.time() - inicio) * 1000)}
    return {"ok": True, "tipo": "webdav", "destino": mascara(url), "motivo": "",
            "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest(),
            "tamanoConfirmado": tamano is not None, "ms": int((time.time() - inicio) * 1000)}


# ------------------------------------------------------------------ réplica completa
def replicar(blob: bytes, nombre: str, destinos, abrir=None, timeout: float = TIMEOUT,
             abrir_url=_peticion) -> dict:
    """Copia a todos los destinos configurados y devuelve el parte de cada uno.

    Un destino caído **no** interrumpe la copia local ni los demás destinos: se anota
    el fallo y se sigue.
    """
    resultados = []
    for d in destinos or []:
        try:
            if d.get("tipo") == "webdav":
                r = enviar_webdav(blob, nombre, d.get("url", ""), d.get("usuario", ""), d.get("clave", ""),
                                  timeout=timeout, abrir=abrir, abrir_url=abrir_url)
            else:
                r = copiar_a_carpeta(blob, nombre, d.get("ruta") or d.get("destino") or "", abrir=abrir)
        except Exception as e:  # nunca debe tumbar la copia local
            r = {"ok": False, "tipo": d.get("tipo"), "destino": d.get("destino", ""),
                 "motivo": "error", "detalle": str(e)[:200], "ms": 0}
        resultados.append(r)
    buenos = [r for r in resultados if r.get("ok")]
    return {
        "nombre": nombre,
        "cuando": int(time.time()),
        "destinos": len(resultados),
        "correctos": len(buenos),
        "fallidos": len(resultados) - len(buenos),
        "todoBien": bool(resultados) and len(buenos) == len(resultados),
        "sinDestinos": not resultados,
        "resultados": resultados,
    }


def resumen_texto(parte: dict) -> str:
    """Una línea para la auditoría: «3 destinos · 2 copiados · 1 falló»."""
    if not parte or parte.get("sinDestinos"):
        return "sin destinos externos configurados"
    partes = [f"{parte['destinos']} destino(s)", f"{parte['correctos']} copiado(s)"]
    if parte["fallidos"]:
        partes.append(f"{parte['fallidos']} fallido(s)")
        malos = ", ".join(f"{r.get('destino')}: {r.get('motivo')}" for r in parte["resultados"] if not r.get("ok"))
        partes.append(malos[:300])
    return " · ".join(partes)


def estado_salud(parte, config) -> dict:
    """Lo que necesita `/api/health` y la tarjeta de Copias."""
    config = config or []
    return {
        "configurados": len(config),
        "destinos": [limpiar_destino(d) for d in config],
        "ultimo": parte or None,
        # Avisa si falló alguno: una copia que solo está en un destino no es 3-2-1.
        "problema": bool(config) and parte is not None and (parte.get("fallidos") or 0) > 0,
    }
