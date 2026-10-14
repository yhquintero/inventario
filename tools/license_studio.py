#!/usr/bin/env python3
"""
Generador de Licencias NovaGest — herramienta INDEPENDIENTE de la Web.

Se ejecuta aparte de la Web y del servidor de NovaGest (su propio proceso y
puerto) para crear claves de licencia firmadas, **controlar todas las licencias
emitidas** (listar, renovar, revocar, activar, eliminar, exportar) y enviar la
generación al cliente por WhatsApp con un solo clic (enlace wa.me).

Uso:
  python3 tools/license_studio.py                      # http://localhost:8777
  python3 tools/license_studio.py --open               # además abre el navegador
  python3 tools/license_studio.py --port 9000          # otro puerto
  python3 tools/license_studio.py --host 127.0.0.1     # solo esta máquina
  python3 tools/license_studio.py --data /ruta/a/data  # secreto y BD de esa instalación

HTTPS (puerto aparte, como el servidor):
  python3 tools/license_studio.py --ssl-cert certs/licencias.crt --ssl-key certs/licencias.key
  #  o equivalente, por variables de entorno:  SSL_CERT=... SSL_KEY=...
  # En Windows lo hace todo tools/iniciar-generador-https.ps1 (mkcert + firewall + URLs).

Acceso:
  La interfaz pide una CLAVE DE ACCESO (por HTTP no viaja cifrada: para usarla
  desde otros equipos de la red, use HTTPS). Se toma, por este orden, de
  --clave / LICENSE_ADMIN_KEY / NOVAGEST_ADMIN_KEY / LICENSE_STUDIO_KEY o del
  archivo data/licencia-acceso.txt (se crea solo la primera vez).

La clave se firma con el MISMO secreto que la instalación del cliente
(LICENSE_SECRET / LICENSE_KEY / BACKUP_KEY o data/license.key), así que solo
verifica en ese servidor: para generar desde otra máquina exporte el mismo
LICENSE_SECRET o apunte --data a la carpeta data del servidor del cliente.

Si encuentra data/novagest.db lista las solicitudes de licencia recibidas por
WhatsApp (Web y Android), crea su clave en un clic con el nombre y el plazo
pedidos, la marca como atendida y prepara el mensaje para el cliente. Con
«📥 Copiar desde el WhatsApp» se puede pegar el mensaje que el cliente envió al
chat: se leen su usuario, su ID de dispositivo y su plazo, la solicitud se añade
a la lista y desde ahí se crea la clave y se reenvía por WhatsApp (siempre que
la base del servidor esté disponible; si no, la solicitud vive en la sesión).
Además,
la pestaña «Licencias y equipos» muestra TODAS las licencias emitidas con su
estado, sus equipos activados y los botones para renovarlas, revocarlas,
activarlas, eliminarlas o exportarlas a CSV.

Es la misma clave y el mismo mensaje de WhatsApp que producen el panel
«🔐 Gestionar licencia» de la Web y tools/generate_license.py.
"""
import argparse
import base64
import csv
import hmac
import io
import json
import os
import re
import secrets
import sqlite3
import ssl
import sys
import threading
import time
import webbrowser
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)

# Mismo plazo y firma que la Web, el servidor y tools/generate_license.py
import generate_license as gen  # noqa: E402

PRODUCT = os.environ.get("LICENSE_PRODUCT", "NovaGest")
APP_VERSION = "1.0.0"
COOKIE_NAME = "ngstudio"
SESSION_TTL = 12 * 3600           # la sesión dura 12 h sin uso
LOGIN_MAX_FALLOS = 8              # intentos fallidos por IP antes de bloquear
LOGIN_BLOQUEO = 10 * 60           # 10 minutos de bloqueo
TERMS = [
    {"id": "DIA", "label": "1 día", "days": 1, "type": "FULL"},
    {"id": "SEMANA", "label": "1 semana", "days": 7, "type": "FULL"},
    {"id": "MES", "label": "1 mes", "days": 30, "type": "FULL"},
    {"id": "TRIMESTRE", "label": "3 meses", "days": 90, "type": "FULL"},
    {"id": "SEMESTRE", "label": "6 meses", "days": 180, "type": "FULL"},
    {"id": "ANIO", "label": "1 año", "days": 365, "type": "FULL"},
    {"id": "DOS_ANIOS", "label": "2 años", "days": 730, "type": "FULL"},
    {"id": "PERMANENTE", "label": "Permanente", "days": 0, "type": "LIFETIME"},
]
LICENSE_TYPES = ("TRIAL", "FULL", "ENTERPRISE", "LIFETIME")
WHATSAPP_DEFAULT = re.sub(r"\D", "", os.environ.get("LICENSE_WHATSAPP")
                          or os.environ.get("NOVAGEST_WHATSAPP")
                          or os.environ.get("WHATSAPP_NUMBER") or "")
FAVICON_SVG = """<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\">
<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#172554\"/><stop offset=\"1\" stop-color=\"#059669\"/></linearGradient></defs>
<rect width=\"64\" height=\"64\" rx=\"16\" fill=\"url(#g)\"/>
<path d=\"M32 5 53 13v15c0 14-8.6 24.4-21 31C19.6 52.4 11 42 11 28V13z\" fill=\"#fff\" opacity=\".96\"/>
<circle cx=\"27\" cy=\"27\" r=\"6\" fill=\"none\" stroke=\"#172554\" stroke-width=\"5\"/>
<path d=\"m31.5 31.5 13 13m-6-6 5-5m-1 11 5-5\" fill=\"none\" stroke=\"#172554\" stroke-width=\"5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>
</svg>"""

# Clave de acceso de la herramienta (se resuelve en main() / load_access_key)
ACCESS_KEY = ""
ACCESS_KEY_SOURCE = ""
ACCESS_KEY_FROM_FILE = False


def term_of(term_id):
    """Devuelve el plazo pedido (o 1 mes por defecto)."""
    return next((t for t in TERMS if t["id"] == str(term_id or "").upper()), None) or TERMS[2]


def term_by_days(days):
    """Plazo equivalente a un número de días (para renovar una licencia ya emitida)."""
    try:
        d = int(days)
    except Exception:
        return TERMS[2]
    if d <= 0:
        return term_of("PERMANENTE")
    return next((t for t in TERMS if t["days"] == d), term_of("MES"))


# ------------------------------------------------------------------ clave de acceso
def access_key_path():
    return os.path.join(gen.DATA, "licencia-acceso.txt")


def load_access_key(explicit=None):
    """Clave de acceso de la interfaz: --clave, variables de entorno o archivo en data/."""
    global ACCESS_KEY, ACCESS_KEY_SOURCE, ACCESS_KEY_FROM_FILE
    if explicit and str(explicit).strip():
        ACCESS_KEY, ACCESS_KEY_SOURCE, ACCESS_KEY_FROM_FILE = str(explicit).strip(), "--clave", False
        return
    for env_key in ("LICENSE_ADMIN_KEY", "NOVAGEST_ADMIN_KEY", "LICENSE_STUDIO_KEY"):
        if (os.environ.get(env_key) or "").strip():
            ACCESS_KEY = os.environ[env_key].strip()
            ACCESS_KEY_SOURCE = f"variable de entorno {env_key}"
            ACCESS_KEY_FROM_FILE = False
            return
    ruta = access_key_path()
    if os.path.exists(ruta):
        try:
            valor = open(ruta, encoding="utf-8").read().strip()
        except Exception:
            valor = ""
        if valor:
            ACCESS_KEY, ACCESS_KEY_SOURCE, ACCESS_KEY_FROM_FILE = valor, f"archivo {ruta}", True
            return
    # Primera vez: se crea una clave legible y se guarda con permisos del dueño
    valor = secrets.token_urlsafe(9)
    try:
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(valor + "\n")
        os.chmod(ruta, 0o600)
    except Exception:
        pass
    ACCESS_KEY, ACCESS_KEY_SOURCE, ACCESS_KEY_FROM_FILE = valor, f"archivo {ruta} (creado ahora)", True


def save_access_key(nueva):
    """Cambia la clave de acceso guardada en archivo (no puede si viene de entorno o --clave)."""
    global ACCESS_KEY, ACCESS_KEY_SOURCE, ACCESS_KEY_FROM_FILE
    if not ACCESS_KEY_FROM_FILE:
        return False, f"La clave viene de {ACCESS_KEY_SOURCE}: cámbiela ahí, no en el archivo."
    nueva = str(nueva or "").strip()
    if len(nueva) < 6:
        return False, "La clave nueva debe tener al menos 6 caracteres."
    try:
        with open(access_key_path(), "w", encoding="utf-8") as f:
            f.write(nueva + "\n")
        os.chmod(access_key_path(), 0o600)
    except Exception as e:  # noqa: BLE001
        return False, f"No se pudo guardar la clave: {e}"
    ACCESS_KEY = nueva
    return True, "Clave de acceso actualizada."


# ------------------------------------------------------------------ sesiones
_SESSIONS = {}          # token -> último uso
_FAILS = {}             # ip -> [fallos, bloqueado_hasta]
_LOCK = threading.Lock()
_DB_READY_CACHE = {}    # (ruta, mtime, tamaño) -> ¿la base ya tiene sus tablas?


def session_new():
    token = secrets.token_urlsafe(24)
    with _LOCK:
        _SESSIONS[token] = time.time()
    return token


def session_ok(token):
    if not token:
        return False
    with _LOCK:
        ts = _SESSIONS.get(token)
        if not ts:
            return False
        if time.time() - ts > SESSION_TTL:
            _SESSIONS.pop(token, None)
            return False
        _SESSIONS[token] = time.time()
    return True


def session_drop(token):
    with _LOCK:
        _SESSIONS.pop(token or "", None)


def login_blocked(ip):
    with _LOCK:
        fallos, hasta = _FAILS.get(ip, [0, 0])
        if hasta and time.time() < hasta:
            return int(hasta - time.time())
        if hasta and time.time() >= hasta:
            _FAILS.pop(ip, None)
    return 0


def login_fail(ip):
    with _LOCK:
        fallos = _FAILS.get(ip, [0, 0])[0] + 1
        _FAILS[ip] = [fallos, time.time() + LOGIN_BLOQUEO if fallos >= LOGIN_MAX_FALLOS else 0]
        return fallos


def login_ok(ip):
    with _LOCK:
        _FAILS.pop(ip, None)


# ------------------------------------------------------------------ secreto y base de datos
def secret_source():
    """Describe de dónde sale el secreto de firma (NUNCA muestra el valor)."""
    for env_key in ("LICENSE_SECRET", "LICENSE_KEY", "BACKUP_KEY"):
        if os.environ.get(env_key):
            return f"variable de entorno {env_key}"
    if os.path.exists(gen.LICENSE_FILE):
        return f"archivo {gen.LICENSE_FILE}"
    return f"se creará uno nuevo en {gen.LICENSE_FILE}"


def db_available():
    """¿La base del servidor sirve para solicitudes y licencias?

    No basta con que el archivo exista: una base vacía o a medio inicializar (el servidor
    aún no ha arrancado por primera vez) se trata como «no disponible», así la herramienta
    genera claves y permite importar solicitudes sin errores de tablas.
    """
    ruta = gen.db_path()
    if not os.path.exists(ruta):
        return False
    try:
        clave = (ruta, os.path.getmtime(ruta), os.path.getsize(ruta))
    except OSError:
        return False
    with _LOCK:
        if clave in _DB_READY_CACHE:
            return _DB_READY_CACHE[clave]
    listo = False
    try:
        con = sqlite3.connect(ruta, timeout=10)
        try:
            tablas = {f[0] for f in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            listo = {"license_requests", "licenses"} <= tablas
        finally:
            con.close()
    except sqlite3.Error:
        listo = False
    with _LOCK:
        _DB_READY_CACHE.clear()
        _DB_READY_CACHE[clave] = listo
    return listo


# Tablas de licencias del servidor (mismo esquema que server/novagest_server.py · init_db;
# tools/test_generador.py comprueba que no se desincronizan). Con ellas la herramienta
# funciona aunque el servidor no haya arrancado nunca, y el servidor completa el resto
# de tablas al arrancar sobre la misma base (CREATE TABLE IF NOT EXISTS).
LICENSE_SCHEMA = """
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, ts INTEGER, user TEXT, action TEXT, details TEXT, ip TEXT);
CREATE TABLE IF NOT EXISTS licenses(
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  client_name TEXT,
  product TEXT,
  type TEXT,
  issued_at INTEGER,
  expires_at INTEGER,
  max_users INTEGER DEFAULT 10,
  max_devices INTEGER DEFAULT 5,
  features TEXT DEFAULT '[\"*\"]',
  active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at INTEGER,
  last_verified INTEGER,
  metadata TEXT);
CREATE TABLE IF NOT EXISTS license_activations(
  id INTEGER PRIMARY KEY,
  license_key TEXT,
  license_id INTEGER REFERENCES licenses(id) ON DELETE CASCADE,
  device_id TEXT,
  device_info TEXT,
  ip TEXT,
  activated_at INTEGER,
  last_seen INTEGER,
  active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS license_requests(
  id INTEGER PRIMARY KEY,
  client_name TEXT,
  device_id TEXT,
  device_info TEXT,
  product TEXT,
  version TEXT,
  term TEXT,
  term_label TEXT,
  license_type TEXT,
  days INTEGER,
  phone TEXT,
  message TEXT,
  channel TEXT,
  ip TEXT,
  status TEXT DEFAULT 'pendiente',
  handled_at INTEGER,
  handled_by TEXT,
  license_id INTEGER,
  license_preview TEXT,
  created_at INTEGER);
CREATE INDEX IF NOT EXISTS license_requests_status ON license_requests(status, created_at DESC);
CREATE TABLE IF NOT EXISTS legal_info(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT, updated_at INTEGER, updated_by TEXT);
"""

# Qué hizo ensure_db() la última vez (se muestra en la interfaz y en la consola).
DB_STATUS = {"created": False, "tablesAdded": False, "error": ""}


def ensure_db():
    """Garantiza una base de datos utilizable para solicitudes y licencias.

    Usa la misma base que el servidor (gen.db_path(): data/novagest.db o la antigua
    data/cuadre.db). Si no existe o le faltan las tablas de licencias (el servidor aún
    no arrancó, o se borró), las crea con el esquema del servidor. Así la herramienta ya
    no se queda «sin BD»: las licencias emitidas y las solicitudes importadas quedan
    registradas, y el servidor las ve en cuanto arranca sobre esa misma carpeta data.
    Devuelve True si la base queda disponible.
    """
    if db_available():
        return True
    ruta = gen.db_path()
    try:
        carpeta = os.path.dirname(ruta)
        if carpeta:
            os.makedirs(carpeta, exist_ok=True)
        nueva = not os.path.exists(ruta) or os.path.getsize(ruta) == 0
        con = sqlite3.connect(ruta, timeout=10)
        try:
            con.executescript(LICENSE_SCHEMA)
            con.commit()
        finally:
            con.close()
    except (sqlite3.Error, OSError) as e:
        DB_STATUS.update(error=f"{type(e).__name__}: {e}")
        return False
    with _LOCK:
        _DB_READY_CACHE.clear()
    DB_STATUS.update(created=nueva, tablesAdded=not nueva, error="")
    return db_available()


def db_state():
    """Estado de la base para /api/state (crea las tablas si faltan)."""
    disponible = ensure_db()
    return {
        "dbPath": gen.db_path(),
        "dbAvailable": disponible,
        "dbCreated": bool(DB_STATUS.get("created")),
        "dbTablesAdded": bool(DB_STATUS.get("tablesAdded")),
        "dbError": DB_STATUS.get("error") or "",
    }


def legal_public_data():
    """Lee únicamente los datos legales públicos de NovaGest; nunca expone secretos."""
    if not db_available():
        return {}
    try:
        con = db_connect()
        try:
            row = con.execute("SELECT data FROM legal_info WHERE id=1").fetchone()
            if not row:
                return {}
            data = json.loads(row["data"] or "{}")
            return data if isinstance(data, dict) else {}
        finally:
            con.close()
    except (sqlite3.Error, ValueError, TypeError):
        # La tabla puede no existir en una instalación antigua; los textos mantienen
        # entonces los marcadores [COMPLETAR] y no se inventan datos del titular.
        return {}


def db_connect():
    con = sqlite3.connect(gen.db_path(), timeout=10)
    con.row_factory = sqlite3.Row
    return con


def db_audit(action, details, ip=""):
    """Deja rastro en la auditoría del servidor (si hay BD), igual que la Web."""
    if not db_available():
        return
    try:
        con = db_connect()
        try:
            con.execute("INSERT INTO audit(ts,user,action,details,ip) VALUES(?,?,?,?,?)",
                        (int(time.time()), "license_studio", action, details, ip))
            con.commit()
        finally:
            con.close()
    except Exception:
        pass


def request_public(r):
    return {
        "id": r["id"],
        "clientName": r["client_name"],
        "deviceId": r["device_id"],
        "phone": r["phone"] or "",
        "term": r["term"] or "MES",
        "termLabel": r["term_label"] or term_of(r["term"])["label"],
        "type": r["license_type"] or "FULL",
        "days": r["days"] if r["days"] is not None else term_of(r["term"])["days"],
        "channel": r["channel"] or "web",
        "status": r["status"] or "pendiente",
        "createdAt": r["created_at"],
        "message": r["message"] or "",
    }


def list_requests(limit=100):
    """Solicitudes: las de la BD del servidor + las pegadas desde WhatsApp (memoria de la sesión).

    Las de la BD van primero (pendientes y más recientes arriba); las importadas sin BD se
    añaden a la lista para poder crear su clave igualmente, marcadas con «mem».
    """
    filas = []
    if db_available():
        con = db_connect()
        try:
            rows = con.execute("SELECT * FROM license_requests ORDER BY created_at DESC, id DESC").fetchall()
            filas = [dict(request_public(r), mem=False) for r in rows]
        except sqlite3.Error as e:
            # Archivo presente pero sin las tablas todavía (servidor sin arrancar): no es un error fatal.
            print(f"[GENERADOR] La base de datos no tiene la tabla de solicitudes: {e}", flush=True)
        finally:
            con.close()
    with _LOCK:
        filas += [dict(r) for r in _MEM_REQUESTS]
    filas.sort(key=lambda r: ((r.get("status") or "pendiente") != "pendiente",
                              -int(r.get("createdAt") or 0), -int(r.get("id") or 0)))
    return filas[:max(1, min(int(limit or 100), 500))]


def request_by_id(req_id):
    """Una solicitud del listado (BD o memoria) o None."""
    for r in list_requests(500):
        if int(r["id"]) == int(req_id):
            return r
    return None


# ------------------------------------------------------------------ importar desde WhatsApp
# El cliente escribe a WhatsApp (no siempre pasa por la Web/Android): el administrador copia
# su mensaje y esta herramienta lo lee para rehacer la solicitud con los datos exactos.
_WA_NUM = {"un": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6,
           "siete": 7, "ocho": 8, "nueve": 9, "diez": 10}
# Días de cada unidad escrita por el cliente (texto ya sin acentos: «años» → «anos»).
_WA_UNIDAD_DIAS = {"permanente": 0, "vitalicia": 0, "lifetime": 0,
                   "dia": 1, "dias": 1, "semana": 7, "semanas": 7, "mes": 30, "meses": 30,
                   "trimestre": 90, "trimestres": 90, "semestre": 180, "semestres": 180,
                   "ano": 365, "anos": 365}
_MEM_ID_BASE = 900000000     # ids de las solicitudes importadas sin BD (no chocan con los de la BD)
_MEM_REQUESTS = []
_MEM_SEQ = 0


def sin_acentos(txt):
    tabla = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    return str(txt or "").translate(tabla)


def _wa_lineas(texto):
    """Líneas del mensaje pegadas, sin los marcadores de WhatsApp (*negrita*, _cursiva_, ~tachado~)."""
    return [re.sub(r"[*_~`]", "", l).strip() for l in re.split(r"\r\n|\r|\n", str(texto or ""))]


def _wa_campo(texto, *etiquetas):
    """Valor de «Etiqueta: valor» en el mensaje pegado (ignora emojis, mayúsculas y acentos)."""
    patrones = [re.compile(rf"{re.escape(e)}\s*[:\-]\s*(.+)$", re.IGNORECASE) for e in etiquetas]
    for linea in _wa_lineas(texto):
        for patron in patrones:
            m = patron.search(linea)
            if m:
                valor = m.group(1).strip(" .·-")
                if valor:
                    return valor
    return ""


def _wa_plazo(plano):
    """Separa el plazo que escribió el cliente: devuelve (etiqueta, días o None, tipo).

    Acepta «1 día (1 días) · FULL», «3 meses (90 días) · FULL», «Permanente · LIFETIME» y
    variantes sin días («1 semana»).
    """
    partes = [p.strip() for p in re.split(r"\s*[·•|]\s*", plano or "") if p.strip()]
    tipo = ""
    if len(partes) > 1 and re.fullmatch(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,20}", partes[-1]):
        tipo = sin_acentos(partes.pop().upper())
    texto = " ".join(partes)
    dias = None
    m = re.search(r"\(\s*(\d+)\s*d[ií]as?\s*\)", texto, re.IGNORECASE)
    if m:
        dias = int(m.group(1))
        texto = (texto[:m.start()] + texto[m.end():]).strip()
    return texto.strip(" .·-"), dias, tipo


def _wa_term(etiqueta, dias):
    """Plazo del catálogo a partir del texto del cliente. Devuelve (term, aviso)."""
    normal = sin_acentos((etiqueta or "").lower())
    calculados = dias
    if calculados is None:
        if re.search(r"permanent|vitalic|lifetime", normal):
            calculados = 0
        else:
            m = re.search(r"\b(?:(\d+)|(un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez))\s*"
                          r"(dias?|semanas?|mes(?:es)?|trimestres?|semestres?|anos?)\b", normal)
            unidad = re.search(r"(dias?|semanas?|mes(?:es)?|trimestres?|semestres?|anos?)", normal)
            if m:
                cantidad = int(m.group(1)) if m.group(1) else _WA_NUM.get(m.group(2), 1)
                base = _WA_UNIDAD_DIAS.get(m.group(3))
                if base:
                    calculados = cantidad * base
            elif unidad:
                calculados = _WA_UNIDAD_DIAS.get(unidad.group(1)) or None
    if calculados is not None:
        exacto = next((t for t in TERMS if t["days"] == calculados), None)
        if exacto:
            return exacto, ""
        # Plazo no estándar (25 días, 45 días…): se usa el más cercano del catálogo.
        cercano = min([t for t in TERMS if t["days"] or calculados == 0],
                      key=lambda t: (abs(t["days"] - calculados), -t["days"]))
        return cercano, (f"El plazo del mensaje («{etiqueta or calculados}») no es uno de los 8 del catálogo: "
                         f"se usará «{cercano['label']}». Puede cambiarlo en el desplegable Plazo.")
    return term_of("MES"), f"No se reconoció el plazo en el mensaje («{etiqueta or 'sin plan'}»): se usará «1 mes». " \
                            "Puede cambiarlo en el desplegable Plazo."


def _wa_fecha(texto):
    """Timestamp de «Fecha Actual: dd/mm/aaaa, h:mm:ss a.m./p.m.» (o None si no es válida)."""
    valor = _wa_campo(texto, "fecha actual", "fecha", "fecha de la solicitud")
    if not valor:
        return None
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{4})\s*,?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*"
                  r"([ap])\s*\.?\s*m\.?", valor, re.IGNORECASE)
    if not m:
        return None
    dia, mes, anio, hora, minuto, segundo, ampm = m.groups()
    hora = int(hora) % 12 + (12 if ampm.lower() == "p" else 0)
    try:
        ts = int(time.mktime((int(anio), int(mes), int(dia), hora, int(minuto), int(segundo or 0), 0, 0, -1)))
    except (ValueError, OverflowError):
        return None
    # Reloj del equipo del cliente desajustado: se prefiere la fecha de la importación.
    if ts > time.time() + 86400 or ts < time.time() - 3 * 365 * 86400:
        return None
    return ts


def _wa_telefono(texto):
    """Teléfono del cliente si lo escribió en el mensaje (WhatsApp no incluye el número)."""
    valor = _wa_campo(texto, "telefono", "teléfono", "whatsapp", "contacto", "celular", "movil", "móvil")
    if valor and not re.search(r"fijo|sin telefono|sin teléfono", sin_acentos(valor.lower())):
        return valor
    m = re.search(r"\+\d[\d\s().-]{6,18}\d", str(texto or ""))
    return m.group(0).strip() if m else ""


def parse_whatsapp_request(texto, phone=""):
    """Lee el mensaje que el cliente envió por WhatsApp y arma los datos de la solicitud.

    Es tolerante: no depende de los emojis, admite mayúsculas/acentos distintos, el marcado
    de WhatsApp (*negrita*) y líneas en otro orden. Lo que no reconoce queda como aviso para
    que el administrador lo revise (o lo escriba) antes de importar.
    """
    texto = str(texto or "").strip()
    avisos = []
    client = _wa_campo(texto, "usuario", "cliente", "nombre", "empresa", "negocio")[:120]
    device = _wa_campo(texto, "id dispositivo", "id de dispositivo", "id del dispositivo", "device id",
                       "iddispositivo", "dispositivo", "id equipo", "id del equipo")[:120]
    producto = _wa_campo(texto, "producto", "app", "aplicacion", "aplicación")
    version = ""
    m = re.search(r"\bv?(\d+\.\d+(?:\.\d+)?)\b", producto)
    if m:
        version = m.group(1)
        producto = (producto[:m.start()].strip(" -v") or PRODUCT)
    etiqueta_plan, dias_plan, tipo_plan = _wa_plazo(_wa_campo(texto, "plan", "plazo"))
    term, aviso_plazo = _wa_term(etiqueta_plan, dias_plan)
    tipo = tipo_plan.upper()
    tipo = tipo if tipo in LICENSE_TYPES else term["type"]
    creado = _wa_fecha(texto)
    if not client:
        avisos.append("No se reconoció el usuario: escriba «👤 Usuario: …» en el mensaje o rellene el campo Usuario.")
    if not device:
        avisos.append("No se reconoció el ID del dispositivo: se creará uno nuevo al importar la solicitud.")
    if not creado:
        avisos.append("No se reconoció la fecha del mensaje: se usará la fecha de la importación.")
        creado = int(time.time())
    if aviso_plazo:
        avisos.append(aviso_plazo)
    return {
        "clientName": client,
        "deviceId": device,
        "product": (producto or PRODUCT)[:60],
        "version": (version or APP_VERSION)[:20],
        "term": term["id"],
        "termLabel": term["label"],
        "type": tipo,
        "days": term["days"],
        "termAsked": _wa_campo(texto, "plan", "plazo"),
        "phone": re.sub(r"[^\d+]", "", str(phone or _wa_telefono(texto) or ""))[:24],
        "createdAt": creado,
        "message": texto[:2000],
        "warnings": avisos,
    }


def memory_get(req_id):
    """Solicitud importada sin BD del servidor (se conserva mientras la herramienta esté abierta)."""
    with _LOCK:
        for r in _MEM_REQUESTS:
            if int(r["id"]) == int(req_id):
                return r
    return None


def memory_add(term, datos, ip=""):
    global _MEM_SEQ
    with _LOCK:
        _MEM_SEQ += 1
        fila = {
            "id": _MEM_ID_BASE + _MEM_SEQ,
            "clientName": datos["clientName"],
            "deviceId": datos["deviceId"],
            "phone": datos.get("phone") or "",
            "term": term["id"],
            "termLabel": term["label"],
            "type": datos.get("type") or term["type"],
            "days": term["days"],
            "channel": "whatsapp",
            "status": "pendiente",
            "createdAt": int(datos.get("createdAt") or time.time()),
            "message": datos.get("message") or "",
            "mem": True,
            "savedToDb": False,
            "ip": ip,
        }
        _MEM_REQUESTS.insert(0, fila)
        return dict(fila)


def import_request(datos, ip=""):
    """Registra una solicitud pegada desde WhatsApp.

    Devuelve (solicitud, guardada_en_la_BD, ya_estaba). Si la herramienta no encuentra la
    base de datos del servidor, la solicitud queda en memoria y se puede crear su clave igual.
    """
    datos = dict(datos or {})
    client = str(datos.get("clientName") or "").strip()[:120]
    if not client:
        raise ValueError("No se reconoció el usuario en el mensaje: escríbalo en el campo Usuario "
                         "o copie el mensaje completo del cliente.")
    term = term_of(datos.get("term"))
    tipo = str(datos.get("type") or "").strip().upper()
    device = str(datos.get("deviceId") or "").strip()[:120] or f"wa-{secrets.token_hex(4)}"
    phone = re.sub(r"[^\d+]", "", str(datos.get("phone") or ""))[:24]
    creado = int(datos.get("createdAt") or time.time())
    datos.update({"clientName": client, "deviceId": device, "phone": phone,
                  "type": tipo if tipo in LICENSE_TYPES else term["type"], "createdAt": creado})
    if not db_available():
        with _LOCK:   # pegar dos veces el mismo mensaje no duplica la solicitud pendiente
            for r in _MEM_REQUESTS:
                if (r["status"] == "pendiente" and r["clientName"] == client
                        and r["deviceId"] == device and r["term"] == term["id"]):
                    return dict(r), False, True
        return memory_add(term, datos, ip), False, False
    con = db_connect()
    try:
        dup = con.execute(
            "SELECT * FROM license_requests WHERE device_id=? AND client_name=? AND term=? AND status='pendiente'"
            " ORDER BY id DESC LIMIT 1", (device, client, term["id"])).fetchone()
        if dup:  # ya estaba en la lista (p. ej. el cliente también la envió desde la Web)
            return request_public(dup), True, True
        con.execute(
            "INSERT INTO license_requests(client_name, device_id, device_info, product, version, term,"
            " term_label, license_type, days, phone, message, channel, ip, status, created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,'whatsapp',?,'pendiente',?)",
            (client, device, "Importada desde WhatsApp por el administrador",
             str(datos.get("product") or PRODUCT)[:60], str(datos.get("version") or APP_VERSION)[:20],
             term["id"], term["label"], datos["type"], term["days"], phone,
             str(datos.get("message") or "")[:2000], ip, creado))
        con.commit()
        row = con.execute("SELECT * FROM license_requests WHERE id=last_insert_rowid()").fetchone()
        return dict(request_public(row), mem=False), True, False
    except sqlite3.Error as e:
        # Base de datos inservible (sin tablas): la solicitud se conserva en memoria.
        print(f"[GENERADOR] No se pudo guardar en la base de datos ({e}); la solicitud queda en esta sesión.", flush=True)
        return memory_add(term, datos, ip), False, False
    finally:
        con.close()


def save_license_row(payload, token, term_id=None):
    """Registra la clave en la BD del servidor (si hay BD) para verla en «Licencias y equipos»."""
    if not db_available():
        return None
    try:
        con = db_connect()
        try:
            con.execute(
                "INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users,"
                " max_devices, features, active, created_by, created_at, last_verified, metadata)"
                " VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?)",
                (token, payload["client_name"], payload["product"], payload["type"],
                 payload["issued_at"], payload["expires_at"], payload["max_users"], payload["max_devices"],
                 json.dumps(payload["features"], ensure_ascii=False), "license_studio.py",
                 int(time.time()), int(time.time()),
                 json.dumps({"generated_by": "license_studio.py", "license_id": payload["license_id"],
                             "term": term_id or ""}, ensure_ascii=False)))
            con.commit()
            row = con.execute("SELECT id FROM licenses WHERE key=?", (token,)).fetchone()
            return row["id"] if row else None
        finally:
            con.close()
    except Exception as e:
        print(f"[GENERADOR] No se pudo registrar la clave en la BD: {e}", flush=True)
        return None


def close_request(req_id, token, license_row_id):
    """Marca la solicitud como atendida (BD del servidor o la importada sin BD)."""
    pretty = f"NG-{token}"
    preview = pretty[:18] + "…" + pretty[-8:] if len(pretty) > 30 else pretty
    mem = memory_get(req_id)
    if mem is not None:
        mem.update({"status": "atendida", "handledAt": int(time.time()),
                    "handledBy": "license_studio.py", "licensePreview": preview,
                    "licenseRowId": license_row_id})
        return
    if not db_available():
        return
    try:
        con = db_connect()
        try:
            con.execute(
                "UPDATE license_requests SET status='atendida', handled_at=?, handled_by='license_studio.py',"
                " license_id=?, license_preview=? WHERE id=?",
                (int(time.time()), license_row_id, preview, int(req_id)))
            con.commit()
        finally:
            con.close()
    except Exception as e:
        print(f"[GENERADOR] No se pudo actualizar la solicitud #{req_id}: {e}", flush=True)


# ------------------------------------------------------------------ licencia y mensaje WhatsApp
def fmt_date(ts):
    return time.strftime("%d/%m/%Y", time.localtime(ts)) if ts else "Permanente"


def fmt_date_long(ts):
    return time.strftime("%d/%m/%Y, %I:%M:%S %p", time.localtime(ts)) if ts else "—"


def build_license(client, term_id, ltype=None, users=20, devices=10, features="*"):
    """Crea el payload firmado con el MISMO formato que el servidor acepta."""
    term = term_of(term_id)
    ltype = str(ltype or term["type"] or "FULL").upper()
    if ltype not in LICENSE_TYPES:
        ltype = term["type"] if term["days"] == 0 else "FULL"
    issued = int(time.time())
    expires = 0 if term["days"] == 0 else issued + term["days"] * 86400
    payload = {
        "license_id": secrets.token_hex(8).upper(),
        "client_name": str(client or "").strip()[:120] or "NovaGest",
        "product": PRODUCT,
        "type": ltype,
        "issued_at": issued,
        "expires_at": expires,
        "max_users": int(users or 20),
        "max_devices": int(devices or 10),
        "features": [f.strip() for f in str(features or "*").split(",") if f.strip()] or ["*"],
        "version": 1,
    }
    token = gen.create_token(payload)
    return term, payload, token


def key_message(client_name, key, term, payload):
    """Mensaje de la clave — idéntico al que envía la Web (LicenseManager.keyMessage)."""
    dias = f" ({term['days']} días)" if term["days"] else ""
    plan = f"{term['label']}{dias} · {term['type']}"
    vigencia = f"hasta el {fmt_date(payload['expires_at'])}" if payload["expires_at"] else "permanente"
    return "\n".join([
        f"🔐 Tu Licencia de {PRODUCT} ya está lista.",
        "",
        f"👤 Usuario: {str(client_name or '').strip()}",
        f"📅 Plan: {plan}",
        f"⏳ Vigencia: {vigencia}",
        "",
        "Pega esta clave en la App en «Licencia de uso → Activar licencia»:",
        "",
        str(key or "").strip(),
    ])


def whatsapp_url(message, phone=""):
    """Enlace wa.me al teléfono del cliente (o selector de contacto si no hay número)."""
    num = re.sub(r"\D", "", str(phone or WHATSAPP_DEFAULT or ""))
    text = quote(message, safe="")
    return f"https://wa.me/{num}?text={text}" if num else f"https://api.whatsapp.com/send?text={text}"


def generate_result(client, phone, term_id, ltype=None, users=20, devices=10, features="*", request=None):
    """Genera la licencia, la registra si hay BD y devuelve todo listo para WhatsApp."""
    if request:
        client = request.get("clientName") or client
        term_id = request.get("term") or term_id
        phone = phone or request.get("phone") or ""
    term, payload, token = build_license(client, term_id, ltype, users, devices, features)
    msg = key_message(payload["client_name"], token, term, payload)
    row_id = save_license_row(payload, token, term["id"])
    if request:
        close_request(request["id"], token, row_id)
    return {
        "ok": True,
        "licenseKey": token,
        "formattedKey": f"NG-{token}",
        "payload": payload,
        "term": term,
        "message": msg,
        "whatsappUrl": whatsapp_url(msg, phone),
        "phone": re.sub(r"\D", "", str(phone or WHATSAPP_DEFAULT or "")),
        "savedToDb": row_id is not None,
        "licenseRowId": row_id,
        "request": request,
        "action": "generate",
    }


# ------------------------------------------------------------------ control de licencias emitidas
def token_payload(token):
    """Verifica la firma de una clave con el secreto local y devuelve su payload (o None)."""
    try:
        t = str(token or "").strip().replace(" ", "").replace("\n", "").replace("\r", "")
        for pref in ("NG-", "CP-"):
            if t.upper().startswith(pref):
                t = t[len(pref):]
                break
        if "." not in t:
            return None
        b64, sig = t.rsplit(".", 1)
        if not hmac.compare_digest(gen.sign(b64), sig):
            return None
        return json.loads(base64.urlsafe_b64decode(b64 + "=" * (-len(b64) % 4)))
    except Exception:
        return None


def activation_public(a):
    return {
        "id": a["id"],
        "licenseRowId": a["license_id"],
        "deviceId": a["device_id"] or "",
        "deviceInfo": a["device_info"] or "",
        "ip": a["ip"] or "",
        "activatedAt": a["activated_at"],
        "lastSeen": a["last_seen"],
        "active": int(a["active"] or 0) == 1,
    }


def license_public(row, activations, ts=None):
    ts = ts or int(time.time())
    exp = int(row["expires_at"] or 0)
    payload = token_payload(row["key"])
    firma = payload is not None
    activa = int(row["active"] or 0) == 1
    meta = {}
    try:
        meta = json.loads(row["metadata"] or "{}")
    except Exception:
        meta = {}
    revocada = bool(meta.get("revoked"))
    if revocada:
        estado, etiqueta = "revocada", "⛔ Revocada"
    elif exp and exp < ts:
        estado, etiqueta = "vencida", "⌛ Vencida" + ("" if activa else " (sin activar)")
    elif not activa:
        estado, etiqueta = "emitida", "🔑 Emitida · sin activar"
    elif not firma:
        estado, etiqueta = "firma", "⚠ Firma no coincide"
    else:
        estado, etiqueta = "vigente", "✔ Vigente · en uso"
    dias = None if exp == 0 else max(0, int((exp - ts + 86399) // 86400))
    mensaje = ""
    try:
        if payload:
            mensaje = key_message(row["client_name"], row["key"], term_of(meta.get("term")), payload)
    except Exception:
        mensaje = ""
    return {
        "id": row["id"],
        "clientName": row["client_name"] or "",
        "product": row["product"] or PRODUCT,
        "type": row["type"] or "",
        "issuedAt": row["issued_at"],
        "expiresAt": exp,
        "expiresText": "Permanente" if exp == 0 else fmt_date(exp),
        "daysLeft": dias,
        "active": activa,
        "revoked": revocada,
        "state": estado,
        "stateLabel": etiqueta,
        "signatureOk": firma,
        "licenseId": (payload or {}).get("license_id") or "",
        "maxUsers": row["max_users"],
        "maxDevices": row["max_devices"],
        "features": row["features"] or '["*"]',
        "createdBy": row["created_by"] or "",
        "createdAt": row["created_at"],
        "lastVerified": row["last_verified"],
        "term": meta.get("term") or (term_by_days((exp - int(row["issued_at"] or 0)) // 86400)["id"] if exp else "PERMANENTE"),
        "key": row["key"] or "",
        "formattedKey": f"NG-{row['key']}" if row["key"] and not str(row["key"]).upper().startswith(("NG-", "CP-")) else (row["key"] or ""),
        "preview": (f"NG-{row['key']}"[:18] + "…" + f"NG-{row['key']}"[-8:]) if row["key"] and len(str(row["key"])) > 30 else (row["key"] or ""),
        "devices": [a for a in activations],
        "devicesActive": len([a for a in activations if a["active"]]),
        "message": mensaje,
        "whatsappUrl": whatsapp_url(mensaje, "") if mensaje else "",
    }


def list_licenses(limit=500):
    if not db_available():
        return [], []
    con = db_connect()
    try:
        rows = con.execute(
            "SELECT * FROM licenses ORDER BY active DESC,"
            " CASE WHEN expires_at=0 THEN 1 ELSE 0 END DESC, expires_at DESC, issued_at DESC, id DESC"
            " LIMIT ?", (int(limit),)).fetchall()
        acts = con.execute("SELECT * FROM license_activations ORDER BY last_seen DESC LIMIT 1000").fetchall()
    except sqlite3.Error as e:
        print(f"[GENERADOR] No se pudo leer el control de licencias: {e}", flush=True)
        return [], []
    finally:
        con.close()
    agrupadas = {}
    for a in acts:
        agrupadas.setdefault(a["license_id"], []).append(activation_public(a))
    ts = int(time.time())
    licencias = [license_public(r, agrupadas.get(r["id"], []), ts) for r in rows]
    return licencias, [activation_public(a) for a in acts]


def license_row(lic_id):
    if not db_available():
        return None
    con = db_connect()
    try:
        return con.execute("SELECT * FROM licenses WHERE id=?", (int(lic_id),)).fetchone()
    finally:
        con.close()


def _set_revoked_flag(con, lic_id, revocado):
    """Marca (o limpia) la revocación en el metadata, para distinguirla de una licencia emitida sin activar."""
    row = con.execute("SELECT metadata FROM licenses WHERE id=?", (int(lic_id),)).fetchone()
    if not row:
        return
    try:
        meta = json.loads(row["metadata"] or "{}")
        if not isinstance(meta, dict):
            meta = {}
    except Exception:
        meta = {}
    if revocado:
        meta["revoked"] = True
        meta["revoked_at"] = int(time.time())
    else:
        meta.pop("revoked", None)
        meta.pop("revoked_at", None)
    con.execute("UPDATE licenses SET metadata=? WHERE id=?", (json.dumps(meta, ensure_ascii=False), int(lic_id)))


def set_license_active(lic_id, activa):
    con = db_connect()
    try:
        con.execute("UPDATE licenses SET active=? WHERE id=?", (1 if activa else 0, int(lic_id)))
        _set_revoked_flag(con, lic_id, not activa)
        if not activa:
            con.execute("UPDATE license_activations SET active=0 WHERE license_id=?", (int(lic_id),))
        con.commit()
    finally:
        con.close()


def activate_only(lic_id):
    """Deja esta licencia como la activa del producto (las demás del mismo producto se desactivan)."""
    con = db_connect()
    try:
        row = con.execute("SELECT * FROM licenses WHERE id=?", (int(lic_id),)).fetchone()
        if not row:
            return None
        con.execute("UPDATE licenses SET active=0 WHERE product=? AND id<>?", (row["product"], int(lic_id)))
        con.execute("UPDATE licenses SET active=1 WHERE id=?", (int(lic_id),))
        _set_revoked_flag(con, lic_id, False)
        con.commit()
    finally:
        con.close()
    return row


def delete_license(lic_id):
    con = db_connect()
    try:
        con.execute("DELETE FROM license_activations WHERE license_id=?", (int(lic_id),))
        cur = con.execute("DELETE FROM licenses WHERE id=?", (int(lic_id),))
        con.commit()
        return cur.rowcount
    finally:
        con.close()


def revoke_activation(act_id):
    con = db_connect()
    try:
        cur = con.execute("UPDATE license_activations SET active=0 WHERE id=?", (int(act_id),))
        con.commit()
        return cur.rowcount
    finally:
        con.close()


def request_status(req_id, status):
    """Cambia el estado de una solicitud (BD o memoria). Devuelve las filas afectadas."""
    mem = memory_get(req_id)
    if mem is not None:
        mem.update({"status": status, "handledAt": int(time.time()), "handledBy": "license_studio.py"})
        return 1
    if not db_available():
        return 0
    con = db_connect()
    try:
        cur = con.execute(
            "UPDATE license_requests SET status=?, handled_at=?, handled_by='license_studio.py' WHERE id=?",
            (status, int(time.time()), int(req_id)))
        con.commit()
        return cur.rowcount
    except sqlite3.Error:
        return 0
    finally:
        con.close()


def request_delete(req_id):
    """Elimina una solicitud (BD o memoria). Devuelve las filas afectadas."""
    global _MEM_REQUESTS
    with _LOCK:
        if any(int(r["id"]) == int(req_id) for r in _MEM_REQUESTS):
            _MEM_REQUESTS = [r for r in _MEM_REQUESTS if int(r["id"]) != int(req_id)]
            return 1
    if not db_available():
        return 0
    con = db_connect()
    try:
        cur = con.execute("DELETE FROM license_requests WHERE id=?", (int(req_id),))
        con.commit()
        return cur.rowcount
    except sqlite3.Error:
        return 0
    finally:
        con.close()


def csv_licenses():
    """Hoja de control de las licencias emitidas (para Excel)."""
    licencias, _ = list_licenses()
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";", lineterminator="\r\n")
    w.writerow(["Nº", "Cliente", "Producto", "Tipo", "Emitida", "Expira", "Días restantes",
                "Estado", "Activa", "Usuarios", "Dispositivos", "Equipos", "Equipos activos",
                "ID licencia", "Creada por", "Clave"])
    for l in licencias:
        w.writerow([l["id"], l["clientName"], l["product"], l["type"], fmt_date(l["issuedAt"]),
                    l["expiresText"], l["daysLeft"] if l["daysLeft"] is not None else "∞",
                    l["stateLabel"], "Sí" if l["active"] else "No", l["maxUsers"], l["maxDevices"],
                    len(l["devices"]), l["devicesActive"], l["licenseId"], l["createdBy"], l["formattedKey"]])
    return buf.getvalue()


def renew_result(lic_id, term_id, phone=""):
    """Renueva una licencia: emite una clave NUEVA con otro plazo y deja la anterior revocada."""
    row = license_row(lic_id)
    if not row:
        return None
    term, payload, token = build_license(
        row["client_name"], term_id,
        ltype=(row["type"] if term_of(term_id)["days"] == 0 else "FULL"),
        users=row["max_users"] or 20, devices=row["max_devices"] or 10,
        features=row["features"] or "*")
    msg = key_message(payload["client_name"], token, term, payload)
    nuevo_id = save_license_row(payload, token, term["id"])
    set_license_active(lic_id, False)
    if nuevo_id:
        activate_only(nuevo_id)
    return {
        "ok": True,
        "action": "renew",
        "licenseKey": token,
        "formattedKey": f"NG-{token}",
        "payload": payload,
        "term": term,
        "message": msg,
        "whatsappUrl": whatsapp_url(msg, phone),
        "phone": re.sub(r"\D", "", str(phone or WHATSAPP_DEFAULT or "")),
        "savedToDb": nuevo_id is not None,
        "licenseRowId": nuevo_id,
        "renewedFrom": {"id": row["id"], "clientName": row["client_name"], "expiresText": fmt_date(row["expires_at"])},
    }


# ------------------------------------------------------------------ interfaz web propia
INDEX_HTML = r"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#14264f">
<meta name="description" content="NovaGest License Studio: herramienta privada para gestionar licencias firmadas, solicitudes y equipos.">
<meta name="color-scheme" content="light">
<title>NovaGest · Generador seguro de licencias</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
  :root {
    --bg: #f2f4f8; --card: #ffffff; --ink: #17233b; --muted: #5b6b85;
    --line: #d9e0ec; --brand: #1f4fd8; --brand-ink: #ffffff; --ok: #25d366;
    --danger: #b3261e; --danger-bg: #fdecea; --warn-bg: #fff6e5; --warn-ink: #7a5200;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --shadow: 0 14px 44px rgba(23, 35, 59, .12);
  }
  * { box-sizing: border-box; }
  [hidden] { display: none !important; }
  body { min-height: 100vh; margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: radial-gradient(ellipse at 85% 0%, #e2eaff 0, transparent 42%), var(--bg); color: var(--ink); }
  header { background: linear-gradient(120deg, #14264f, #1f4fd8 65%, #087f64); color: #fff; padding: 20px max(20px, calc((100% - 1040px) / 2)); box-shadow: 0 6px 24px rgba(20,38,79,.16); }
  header h1 { margin: 0; font-size: 21px; }
  header .sub { margin: 6px 0 0; opacity: .92; font-size: 13.5px; }
  .brand-lockup { display: flex; align-items: center; gap: 14px; max-width: 1040px; margin: 0 auto; }
  .brand-icon { width: 48px; height: 48px; flex: 0 0 auto; border-radius: 14px; box-shadow: 0 5px 18px rgba(0,0,0,.2); }
  .brand-eyebrow { margin: 0 0 2px; color: #c4d7ff; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
  header .badge { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 999px; background: rgba(255,255,255,.18); font-size: 12px; vertical-align: 2px; }
  .hdr-bar { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; margin-top: 12px; font-size: 12.5px; }
  .hdr-bar .chip { padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.16); }
  .hdr-bar .chip.ok { background: rgba(37,211,102,.28); }
  .hdr-bar .chip.warn { background: rgba(255,196,0,.28); }
  .hdr-bar button { margin-left: auto; }
  main { max-width: 1040px; margin: 18px auto 40px; padding: 0 16px; display: grid; gap: 16px; }
  .status { display: flex; flex-wrap: wrap; gap: 8px 18px; background: var(--card); border: 1px solid var(--line);
            border-radius: 12px; padding: 10px 14px; font-size: 12.5px; color: var(--muted); }
  .status b { color: var(--ink); font-weight: 600; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 18px 16px; }
  .card h2 { margin: 0 0 12px; font-size: 16.5px; }
  .hint { color: var(--muted); font-size: 12.5px; }
  form .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
  label { display: block; font-size: 12.5px; font-weight: 600; color: var(--muted); }
  input, select, textarea { width: 100%; margin-top: 5px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 9px;
                            font-size: 14px; color: var(--ink); background: #fff; }
  input:focus, select:focus { outline: 2px solid #b9caf6; border-color: var(--brand); }
  details.adv { margin: 12px 0; border: 1px dashed var(--line); border-radius: 10px; padding: 8px 12px; }
  details.adv summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--muted); }
  .btn { display: inline-block; border: 1px solid var(--line); background: #fff; color: var(--ink); padding: 9px 15px;
         border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .btn:hover { filter: brightness(.97); }
  .btn.primary { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); }
  .btn.wa { background: var(--ok); border-color: var(--ok); color: #06281a; }
  .btn.danger { background: var(--danger-bg); border-color: #f0c4c0; color: var(--danger); }
  .btn.ghost { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.4); color: #fff; }
  .btn.small { padding: 6px 11px; font-size: 12.5px; }
  .btn:disabled { opacity: .55; cursor: default; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; }
  .tabs button { border: 1px solid var(--line); background: #fff; color: var(--muted); padding: 8px 13px; border-radius: 999px;
                 font-size: 13px; font-weight: 600; cursor: pointer; }
  .tabs button.on { background: var(--brand); border-color: var(--brand); color: #fff; }
  .row { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 12px; align-items: center; }
  #result { margin-top: 16px; border: 1px solid #bfe6c9; border-radius: 12px; padding: 14px 16px; background: #f4fbf6; }
  #result h3 { margin: 0 0 8px; font-size: 15px; }
  .keybox { font-family: var(--mono); font-size: 12px; word-break: break-all; background: rgba(23,35,59,.07);
            border-radius: 9px; padding: 11px 12px; margin: 10px 0 2px; }
  .msgbox { white-space: pre-wrap; word-break: break-word; font-family: var(--mono); font-size: 12px;
            background: rgba(23,35,59,.06); border-radius: 9px; padding: 11px 12px; margin-top: 8px; }
  .tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 2px; }
  .tag { font-size: 11.5px; padding: 2px 9px; border-radius: 999px; background: #e7edfb; color: #274590; font-weight: 600; }
  .tag.ok { background: #daf3e2; color: #14663a; }
  .tag.warn { background: var(--warn-bg); color: var(--warn-ink); }
  .tag.danger { background: var(--danger-bg); color: var(--danger); }
  .req, .lic { border: 1px solid var(--line); border-radius: 11px; padding: 12px 14px; margin-top: 10px; }
  .lic.current { border-color: #b9d5bf; background: #f7fdf9; }
  .req.nueva { border-color: #b9d5bf; background: #f7fdf9; box-shadow: 0 0 0 2px rgba(37, 211, 102, .16); }
  .req textarea { font-family: var(--mono); font-size: 12px; }
  .req .top, .lic .top { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  .req .who, .lic .who { font-weight: 700; }
  .req .meta, .lic .meta { color: var(--muted); font-size: 12px; }
  .req details, .lic details { margin-top: 8px; }
  .req pre { white-space: pre-wrap; word-break: break-word; background: rgba(23,35,59,.06); border-radius: 8px;
             padding: 9px 11px; font-size: 11.5px; margin: 6px 0 0; }
  .devices { margin-top: 8px; border-top: 1px dashed var(--line); padding-top: 8px; }
  .devices .dev { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; font-size: 12px; padding: 5px 0; }
  .warn { background: var(--warn-bg); color: var(--warn-ink); border: 1px solid #f0dca8; border-radius: 11px;
          padding: 11px 14px; font-size: 12.5px; margin-top: 12px; }
  footer { max-width: 1040px; margin: 0 auto 30px; padding: 0 16px; color: var(--muted); font-size: 12px; }
  .ok-msg { color: #14663a; font-weight: 600; }
  .err-msg { color: #a12222; font-weight: 600; }
  #login { width: min(460px, calc(100% - 32px)); margin: clamp(28px, 7vh, 72px) auto 34px; }
  #login .card { padding: 26px 24px; border-radius: 18px; box-shadow: var(--shadow); }
  #login h1 { font-size: 19px; margin: 0 0 6px; }
  .login-mark { display: grid; place-items: center; width: 48px; height: 48px; margin-bottom: 14px; border-radius: 15px; background: #e9efff; color: #1f4fd8; font-size: 24px; }
  .login-kicker, .eyebrow { margin: 0 0 3px; color: var(--brand); font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  #login input { min-height: 44px; }
  #login input:focus-visible, .btn:focus-visible, a:focus-visible, button:focus-visible { outline: 3px solid #8bb4ff; outline-offset: 2px; }
  .site-footer { max-width: 1040px; margin: 34px auto 0; padding: 18px 16px 30px; border-top: 1px solid var(--line); color: var(--muted); font-size: 12px; }
  .footer-brand { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; margin-bottom: 12px; }
  .footer-brand strong { color: var(--ink); font-size: 14px; }
  .legal-links { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 8px 0 12px; }
  .legal-links a { color: var(--brand); font-weight: 650; text-decoration-thickness: 1px; text-underline-offset: 3px; }
  dialog { width: min(780px, calc(100% - 24px)); max-width: none; max-height: min(86vh, 900px); padding: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 18px; color: var(--ink); background: var(--card); box-shadow: 0 24px 80px rgba(4, 14, 39, .3); }
  dialog::backdrop { background: rgba(11, 20, 42, .58); backdrop-filter: blur(3px); }
  .legal-dialog-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 18px 22px 12px; border-bottom: 1px solid var(--line); }
  .legal-dialog-head h2 { margin: 0; font-size: 20px; }
  .legal-dialog-head .eyebrow { margin-bottom: 3px; }
  .legal-close { width: 36px; height: 36px; border-radius: 10px; padding: 0; font-size: 20px; }
  .legal-tabs { padding: 12px 22px 0; }
  .legal-tabs button { font-size: 11.5px; padding: 6px 10px; }
  .legal-content { max-height: 58vh; overflow: auto; padding: 14px 22px 24px; }
  .legal-content h3 { margin: 18px 0 5px; font-size: 14px; }
  .legal-content p, .legal-content li { line-height: 1.6; }
  .legal-content ul { padding-left: 22px; }
  .legal-notice { padding: 12px 14px; margin: 4px 0 16px; border: 1px solid #f0dca8; border-radius: 11px; color: var(--warn-ink); background: var(--warn-bg); font-size: 12.5px; }
  .legal-dialog-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 22px; border-top: 1px solid var(--line); }
  .legal-dialog-foot p { margin: 0; }
  .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-top: 4px; }
  @media (max-width: 560px) {
    header { padding: 16px; }
    .brand-lockup { align-items: flex-start; }
    .brand-icon { width: 42px; height: 42px; }
    .brand-lockup h1 { font-size: 18px; }
    #login { margin-top: 28px; }
    #login .card { padding: 22px 19px; }
    .legal-dialog-head, .legal-tabs { padding-left: 16px; padding-right: 16px; }
    .legal-content { padding: 12px 16px 20px; max-height: 55vh; }
    .legal-dialog-foot { padding: 12px 16px; }
  }
</style>
</head>
<body>
<header>
  <div class="brand-lockup">
    <img class="brand-icon" src="/favicon.svg" alt="" width="48" height="48">
    <div>
      <p class="brand-eyebrow">NovaGest · Área privada</p>
      <h1>Generador de Licencias <span class="badge">herramienta segura</span></h1>
      <p class="sub">Genera claves firmadas, gestiona solicitudes y controla los equipos activados.</p>
    </div>
  </div>
  <div class="hdr-bar" id="hdr-bar" hidden>
    <span class="chip" id="chip-proto">—</span>
    <span class="chip" id="chip-secret">—</span>
    <span class="chip" id="chip-db">—</span>
    <button class="btn ghost small" id="btn-logout" type="button">Salir</button>
  </div>
</header>

<section id="login" aria-labelledby="login-title">
  <div class="card">
    <div class="login-mark" aria-hidden="true">🔒</div>
    <p class="login-kicker">Acceso seguro · NovaGest</p>
    <h1 id="login-title">🔒 Acceso del administrador</h1>
    <p class="hint">Esta herramienta es privada: escriba la <b>clave de acceso</b> para entrar. Se configura con <code>--clave</code> o <code>LICENSE_ADMIN_KEY</code>; si no se indican, se guarda en <code>data/licencia-acceso.txt</code>. La clave se muestra en la consola al arrancar el generador.</p>
    <form id="login-form">
      <label for="login-key">Clave de acceso
        <input id="login-key" type="password" autocomplete="current-password" required autofocus placeholder="••••••••">
      </label>
      <div class="row">
        <button class="btn primary" type="submit">Entrar</button>
        <span class="hint" id="login-msg" role="status" aria-live="polite"></span>
      </div>
    </form>
  </div>
</section>

<main id="app" hidden>
  <div class="status" id="status" role="status" aria-live="polite"></div>

  <nav class="tabs" id="tabs">
    <button data-tab="generar" class="on">🆕 Generar</button>
    <button data-tab="solicitudes">📨 Solicitudes <span id="tab-req"></span></button>
    <button data-tab="licencias">🗂 Licencias y equipos <span id="tab-lic"></span></button>
    <button data-tab="acceso">🔑 Acceso y datos</button>
  </nav>

  <section class="card" data-panel="generar">
    <h2>🆕 Generar licencia</h2>
    <form id="gen-form">
      <div class="grid">
        <label>Nombre del cliente o empresa *
          <input id="client" required maxlength="120" placeholder="Ej: Mi Tienda" autocomplete="off">
        </label>
        <label>Teléfono de WhatsApp (opcional)
          <input id="phone" maxlength="24" placeholder="Ej: 5351234567 (con código de país)" autocomplete="off">
        </label>
        <label>Plazo
          <select id="term"></select>
        </label>
      </div>
      <details class="adv">
        <summary>Opciones avanzadas (tipo, límites)</summary>
        <div class="grid" style="margin-top:10px">
          <label>Tipo
            <select id="type">
              <option value="">Según el plazo (recomendado)</option>
              <option value="TRIAL">TRIAL (prueba)</option>
              <option value="FULL">FULL</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
              <option value="LIFETIME">LIFETIME (permanente)</option>
            </select>
          </label>
          <label>Usuarios máximos <input id="users" type="number" min="1" max="9999" value="20"></label>
          <label>Dispositivos máximos <input id="devices" type="number" min="1" max="9999" value="10"></label>
        </div>
      </details>
      <div class="row">
        <button class="btn primary" type="submit">🔑 Generar licencia</button>
        <span class="hint" id="form-msg"></span>
      </div>
    </form>

    <div id="result" hidden>
      <h3 id="result-title">✔ Clave generada</h3>
      <div class="tags" id="result-tags"></div>
      <p class="hint" id="result-req"></p>
      <div class="keybox" id="result-key"></div>
      <p class="hint">También es válida con el prefijo <b>NG-</b> delante (el servidor la acepta igual).</p>
      <div class="row">
        <button class="btn small" id="btn-copy">📋 Copiar clave</button>
        <button class="btn small" id="btn-dl">⬇ Descargar .txt</button>
        <button class="btn wa small" id="btn-wa">💬 Enviar por WhatsApp</button>
        <button class="btn small" id="btn-copy-wa">🔗 Copiar enlace wa.me</button>
      </div>
      <p class="hint" style="margin-top:10px"><b>Mensaje que recibirá el cliente:</b></p>
      <pre class="msgbox" id="result-msg"></pre>
    </div>
    <div class="warn">
      ⚠️ La clave solo es válida en la instalación que comparte este secreto de firma.
      Si genera aquí para un servidor distinto, exporte el mismo <b>LICENSE_SECRET</b>
      o arranque con <b>--data</b> apuntando a la carpeta <b>data</b> de ese servidor.
    </div>
  </section>

  <section class="card" data-panel="solicitudes" hidden>
    <h2>📨 Solicitudes recibidas por WhatsApp</h2>
    <p class="hint" id="req-hint">Las solicitudes que los clientes envían desde la Web o la app Android («Solicitar por WhatsApp») y las que
      importe usted con <b>📥 Copiar desde el WhatsApp</b> (el mensaje que le llegó al chat, sin pasar por la Web).</p>
    <div id="requests"></div>
    <div class="row">
      <button class="btn wa small" id="btn-import">📥 Copiar desde el WhatsApp</button>
      <button class="btn small" id="btn-refresh">↻ Actualizar</button>
      <span class="hint">«Crear clave» usa el nombre y el plazo pedidos y deja la solicitud atendida.</span>
    </div>
  </section>

  <section class="card" data-panel="licencias" hidden>
    <h2>🗂 Licencias y equipos</h2>
    <p class="hint">Todas las claves emitidas en esta instalación (las de la Web, la app, la terminal y este generador), con su estado,
      los equipos que las activaron y los botones de control: activar, renovar, revocar, reactivar y eliminar.</p>
    <div class="filters">
      <label>Buscar <input id="lic-q" placeholder="Cliente, ID de licencia o clave" autocomplete="off"></label>
      <label>Estado
        <select id="lic-state">
          <option value="">Todas</option>
          <option value="vigente">Vigentes (en uso)</option>
          <option value="emitida">Emitidas sin activar</option>
          <option value="vencida">Vencidas</option>
          <option value="revocada">Revocadas</option>
          <option value="firma">Firma no coincide</option>
        </select>
      </label>
    </div>
    <div class="row">
      <button class="btn small" id="btn-lic-refresh">↻ Actualizar</button>
      <a class="btn small" id="btn-csv" href="api/licenses.csv">⬇ Exportar CSV</a>
      <span class="hint" id="lic-resumen"></span>
    </div>
    <div id="licenses"></div>
  </section>

  <section class="card" data-panel="acceso" hidden>
    <h2>🔑 Acceso y datos</h2>
    <div class="status" id="acceso-datos" style="margin-bottom:12px"></div>
    <form id="key-form">
      <label>Nueva clave de acceso (mínimo 6 caracteres)
        <input id="key-new" type="text" autocomplete="new-password" placeholder="Ej: licencias-2026">
      </label>
      <div class="row">
        <button class="btn primary small" type="submit">Cambiar clave</button>
        <span class="hint" id="key-msg"></span>
      </div>
    </form>
    <div class="warn">
      ⚠️ Cómo proteger el control de licencias: use <b>HTTPS</b>
      (<b>tools\iniciar-generador-https.ps1</b> en Windows) cuando la abra desde el móvil o
      desde otra PC, y cambie la clave por defecto. Sin HTTPS, la clave de acceso viaja sin cifrar.
    </div>
  </section>
</main>
<footer class="site-footer" id="site-footer">
  <div class="footer-brand"><strong>NovaGest</strong><span>Generador de licencias · herramienta privada</span></div>
  <b>Información legal</b>
  <nav class="legal-links" aria-label="Información legal">
    <a href="#legal-aviso" data-legal-doc="aviso">Aviso legal</a>
    <a href="#legal-privacidad" data-legal-doc="privacidad">Política de privacidad</a>
    <a href="#legal-terminos" data-legal-doc="terminos">Términos y condiciones</a>
    <a href="#legal-cookies" data-legal-doc="cookies">Política de cookies</a>
    <a href="#legal-reembolsos" data-legal-doc="reembolsos">Política de reembolsos</a>
  </nav>
  <p>El cliente activa la clave en <b>Licencia de uso → Activar licencia</b> (Web o app Android). Esta herramienta usa el mismo formato firmado (HMAC-SHA256) que el servidor verifica en <b>/api/license/activate</b>.</p>
</footer>
<dialog id="import-dialog" aria-labelledby="import-title">
  <div class="legal-dialog-head">
    <div><p class="eyebrow">NovaGest · Solicitud por WhatsApp</p><h2 id="import-title">📥 Copiar desde el WhatsApp</h2></div>
    <button class="btn legal-close" id="import-close" type="button" aria-label="Cerrar la importación de la solicitud">×</button>
  </div>
  <div class="legal-content">
    <p class="hint">En WhatsApp, mantenga pulsado el mensaje del cliente y pulse <b>Copiar</b>; péguelo aquí con <b>Ctrl+V</b>.
      Se leerán el <b>usuario</b>, el <b>ID del dispositivo</b> y el <b>plazo</b> para crear la clave con los datos exactos y
      reenviársela al cliente por WhatsApp. Revise los campos antes de importar.</p>
    <label>Mensaje que envió el cliente *
      <textarea id="import-text" rows="9" spellcheck="false" placeholder="Hola, solicito activar mi Licencia de NovaGest.&#10;&#10;👤 Usuario: Tienda Nova&#10;🆔 ID Dispositivo: web-hhsp9rqlmv5zhygs&#10;📦 Producto: NovaGest v1.0.0&#10;📅 Plan: 1 día (1 días) · FULL&#10;🕒 Fecha Actual: 14/10/2026, 2:53:22 p.m."></textarea>
    </label>
    <div class="grid" style="margin-top:10px">
      <label>Usuario / empresa * <input id="import-name" maxlength="120" autocomplete="off" placeholder="Ej: Tienda Nova"></label>
      <label>Plazo * <select id="import-term"></select></label>
      <label>Teléfono del cliente (opcional) <input id="import-phone" maxlength="24" autocomplete="off" placeholder="Ej: 5351234567 (con código de país)"></label>
    </div>
    <div id="import-feedback" class="hint" role="status" aria-live="polite" style="margin-top:10px"></div>
  </div>
  <div class="legal-dialog-foot">
    <p class="hint">1) Pegue el mensaje · 2) «Leer mensaje» · 3) «Importar a la lista» · 4) «🔑 Crear clave y enviar por WhatsApp».</p>
    <div class="row" style="margin-top:0">
      <button class="btn small" id="import-parse" type="button">🔍 Leer mensaje</button>
      <button class="btn primary small" id="import-do" type="button">📥 Importar a la lista</button>
    </div>
  </div>
</dialog>
<dialog id="legal-dialog" aria-labelledby="legal-title">
  <div class="legal-dialog-head">
    <div><p class="eyebrow">NovaGest · Información legal</p><h2 id="legal-title">Aviso legal</h2></div>
    <button class="btn legal-close" id="legal-close" type="button" aria-label="Cerrar información legal">×</button>
  </div>
  <nav class="tabs legal-tabs" id="legal-tabs" aria-label="Documentos legales">
    <button type="button" data-legal-doc="aviso">Aviso legal</button>
    <button type="button" data-legal-doc="privacidad">Privacidad</button>
    <button type="button" data-legal-doc="terminos">Términos</button>
    <button type="button" data-legal-doc="cookies">Cookies</button>
    <button type="button" data-legal-doc="reembolsos">Reembolsos</button>
  </nav>
  <article class="legal-content" id="legal-content"></article>
  <div class="legal-dialog-foot">
    <p class="hint">Complete los datos del titular desde NovaGest → Ajustes → Datos legales.</p>
    <button class="btn primary small" id="legal-done" type="button">Entendido</button>
  </div>
</dialog>
<script>
"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let STATE = null;
let LAST = null;
let LICENSES = [];

async function jreq(url, opts) {
  const r = await fetch(url, Object.assign({ credentials: "same-origin" }, opts || {}));
  let d = {};
  try { d = await r.json(); } catch (e) { d = {}; }
  if (r.status === 401 && d.authRequired) { showLogin(); throw new Error("auth"); }
  return d;
}
const jget = (url) => jreq(url);
const jpost = (url, body) => jreq(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body || {}),
});
const jdel = (url) => jreq(url, { method: "DELETE" });

// Campos sincronizados con NovaGest → Ajustes → Datos legales. Si falta un dato,
// se conserva el marcador visible: nunca se inventan datos del titular.
const LEGAL_DEFAULTS = {
  razonSocial: "[COMPLETAR: razón social / nombre legal del titular]",
  idFiscal: "[COMPLETAR: identificación fiscal o registro]",
  domicilio: "[COMPLETAR: domicilio legal]",
  contacto: "[COMPLETAR: correo y teléfono de contacto]",
  privacidad: "[COMPLETAR: contacto para privacidad y derechos de datos]",
  pais: "[COMPLETAR: país y forma jurídica]",
  retencion: "[COMPLETAR: plazos de conservación por tipo de dato]",
  reembolso: "[COMPLETAR: política de reembolsos aprobada por el negocio]",
  alojamiento: "[COMPLETAR: proveedor y país del alojamiento]",
  privacidadRoles: "[COMPLETAR: quién es responsable y quién encargado de los datos]",
  privacidadBase: "[COMPLETAR: base jurídica revisada para cada tratamiento]",
  privacidadPlazo: "[COMPLETAR: plazo aplicable para responder solicitudes de privacidad]",
  licenciaTransferencia: "[COMPLETAR: reglas de transferencia o cambio de dispositivo]",
  pagos: "[COMPLETAR: medios de pago, moneda, impuestos y comprobantes]",
  servicio: "[COMPLETAR: disponibilidad, soporte y mantenimiento]",
  jurisdiccion: "[COMPLETAR: ley aplicable y vías de reclamación]",
  limitaciones: "[COMPLETAR: límites de responsabilidad revisados por asesor]",
  reembolsoPlazo: "[COMPLETAR: plazo para tramitar reembolsos]",
  cookiesRevision: "[COMPLETAR: revisión de cookies y almacenamiento según jurisdicción]",
};
let LEGAL_DATA = null;
const legalField = (key) => esc(String(LEGAL_DATA?.[key] || "").trim() || LEGAL_DEFAULTS[key]);
const legalDraftNote = `<div class="legal-notice" role="note"><strong>Borrador pendiente de revisión legal profesional.</strong> Complete los campos marcados, confirme que las condiciones reflejan la operación real y solicite revisión en la jurisdicción correspondiente antes de publicarlos como definitivos.</div>`;
const LEGAL_DOCUMENTS = {
  aviso: { title: "Aviso legal", render: () => `${legalDraftNote}
    <h3>1. Titular</h3><p><strong>${legalField("razonSocial")}</strong> · ${legalField("idFiscal")}<br>Domicilio: ${legalField("domicilio")}<br>Forma jurídica y país: ${legalField("pais")}<br>Contacto: ${legalField("contacto")}</p>
    <h3>2. Servicio</h3><p>NovaGest es una herramienta de gestión para negocios que reúne inventario, ventas, caja, informes y control de licencias. El acceso al sistema requiere cuenta y licencia vigentes.</p>
    <h3>3. Propiedad intelectual</h3><p>La titularidad y los permisos de uso de la marca, el software y sus contenidos deben confirmarse con ${legalField("razonSocial")}. Los datos que cada negocio introduce siguen sujetos a las condiciones acordadas con ese negocio.</p>
    <h3>4. Uso de la información</h3><p>Las licencias y los cálculos son herramientas de gestión; revise los resultados antes de tomar decisiones comerciales, contables o de precios. Límites y condiciones: ${legalField("limitaciones")}.</p>` },
  privacidad: { title: "Política de privacidad", render: () => `${legalDraftNote}
    <h3>1. Responsable y contacto</h3><p>${legalField("razonSocial")} (${legalField("idFiscal")}), ${legalField("domicilio")}. Contacto para privacidad: ${legalField("privacidad")}. Roles de cada instalación: ${legalField("privacidadRoles")}.</p>
    <h3>2. Datos y finalidades</h3><ul>
      <li>Datos de cuenta y seguridad: usuario, rol, credenciales protegidas, sesiones y eventos de acceso.</li>
      <li>Datos operativos que introduce cada negocio: productos, existencias, ventas, clientes, movimientos, auditoría y copias.</li>
      <li>Solicitudes de licencia: nombre o empresa, ID e información del dispositivo, plazo y teléfono opcional; se usan para gestionar y responder la solicitud.</li>
      <li>Generación de licencias: nombre del cliente, plan, límites de usuarios/equipos y clave firmada; pueden guardarse en la base de datos de la instalación. El servidor también puede registrar acciones administrativas e IP para seguridad.</li>
    </ul>
    <h3>3. Conservación y derechos</h3><p>Bases aplicables: ${legalField("privacidadBase")}. Plazos de conservación: ${legalField("retencion")}. Para solicitudes de acceso, rectificación, eliminación u otros derechos reconocidos, contacte con ${legalField("privacidad")}; plazo y canal: ${legalField("privacidadPlazo")}.</p>
    <h3>4. Destinatarios y seguridad</h3><p>Si se pulsa el botón de WhatsApp, el navegador abre el servicio de WhatsApp con el texto preparado; se aplican las condiciones de Meta. Alojamiento: ${legalField("alojamiento")}. La herramienta aplica controles de acceso y sesiones; ninguna medida es infalible.</p>` },
  terminos: { title: "Términos y condiciones", render: () => `${legalDraftNote}
    <h3>1. Acceso y licencia</h3><p>El generador es una herramienta privada para el administrador. Las claves que emite NovaGest se firman con el secreto configurado para esa instalación: solo son válidas donde se comparte el mismo secreto. Límites y reglas para transferir o cambiar dispositivos: ${legalField("licenciaTransferencia")}.</p>
    <h3>2. Uso permitido</h3><p>Use la herramienta para gestionar solicitudes y emitir licencias autorizadas. Proteja la clave de acceso y el secreto de firma. Queda prohibido eludir controles, divulgar secretos o usar el servicio para fines ilícitos.</p>
    <h3>3. Precio, soporte y disponibilidad</h3><p>La aplicación no procesa pagos dentro del generador. Condiciones de pago: ${legalField("pagos")}. Soporte y disponibilidad: ${legalField("servicio")}.</p>
    <h3>4. Responsabilidad y ley aplicable</h3><p>Las condiciones y límites aplicables son: ${legalField("limitaciones")}. País y forma jurídica del titular: ${legalField("pais")}. Ley y vías de reclamación: ${legalField("jurisdiccion")}.</p>
    <p>Consulta también la <button type="button" class="btn small" data-legal-doc="reembolsos">Política de reembolsos</button>.</p>` },
  cookies: { title: "Política de cookies", render: () => `${legalDraftNote}
    <h3>1. Almacenamiento usado por esta herramienta</h3><p>El generador usa una cookie de sesión llamada <code>ngstudio</code>, protegida con <code>HttpOnly</code> y <code>SameSite=Lax</code>; se marca <code>Secure</code> cuando funciona por HTTPS. La cookie dura como máximo 12 horas y el servidor también invalida las sesiones después de 12 horas sin actividad. El navegador conserva esta cookie para permitir el acceso autenticado.</p>
    <h3>2. Tecnologías no esenciales</h3><p>Esta interfaz no incorpora analítica, publicidad ni píxeles de seguimiento. La caché y el almacenamiento que usa la aplicación NovaGest pueden depender de la instalación y del dispositivo. Revisión según jurisdicción: ${legalField("cookiesRevision")}.</p>
    <h3>3. Contacto</h3><p>Para consultas sobre privacidad o almacenamiento, contacte con ${legalField("privacidad")}.</p>` },
  reembolsos: { title: "Política de reembolsos", render: () => `${legalDraftNote}
    <h3>1. Alcance</h3><p>NovaGest emite licencias digitales; las condiciones de compra deben comunicarse antes del pago. La herramienta no procesa pagos ni emite reembolsos automáticamente.</p>
    <h3>2. Solicitud de reembolso</h3><p>Condiciones aprobadas por el negocio: ${legalField("reembolso")}. Canal de atención: ${legalField("contacto")}. Para localizar el pago, indique los datos mínimos necesarios y no envíe contraseñas ni claves de licencia por canales no autorizados.</p>
    <h3>3. Plazos y derechos</h3><p>Plazo para tramitar una devolución aprobada: ${legalField("reembolsoPlazo")}. Esta política no limita derechos irrenunciables reconocidos por la ley aplicable. Ley y vías de reclamación: ${legalField("jurisdiccion")}.</p>` },
};

async function openLegalDocument(id) {
  const key = LEGAL_DOCUMENTS[id] ? id : "aviso";
  if (LEGAL_DATA === null) {
    try { const response = await jget("api/legal"); LEGAL_DATA = response.legal || {}; }
    catch { LEGAL_DATA = {}; }
  }
  const doc = LEGAL_DOCUMENTS[key];
  $("legal-title").textContent = doc.title;
  $("legal-content").innerHTML = doc.render();
  document.querySelectorAll("#legal-tabs [data-legal-doc]").forEach((button) => {
    button.classList.toggle("on", button.getAttribute("data-legal-doc") === key);
  });
  const dialog = $("legal-dialog");
  if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  else if (!dialog.open) dialog.setAttribute("open", "");
}

document.addEventListener("click", (ev) => {
  const link = ev.target.closest("[data-legal-doc]");
  if (!link) return;
  ev.preventDefault();
  openLegalDocument(link.getAttribute("data-legal-doc"));
});
$("legal-close").addEventListener("click", () => $("legal-dialog").close?.());
$("legal-done").addEventListener("click", () => $("legal-dialog").close?.());
$("legal-dialog").addEventListener("click", (ev) => {
  if (ev.target === $("legal-dialog")) $("legal-dialog").close?.();
});

function fmtDate(ts) {
  if (!ts) return "Permanente";
  return new Date(ts * 1000).toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ------------------------------------------------ acceso */
function showLogin() {
  $("login").hidden = false;
  $("app").hidden = true;
  $("hdr-bar").hidden = true;
}
function showApp() {
  $("login").hidden = true;
  $("app").hidden = false;
  $("hdr-bar").hidden = false;
}

$("login-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const button = $("login-form").querySelector("button[type=submit]");
  button.disabled = true;
  $("login-msg").textContent = "Verificando clave…";
  const d = await jreq("api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: $("login-key").value }),
  }).catch(() => ({ ok: false, error: "Error de conexión con la herramienta." }));
  button.disabled = false;
  if (!d.ok) {
    $("login-msg").innerHTML = `<span class="err-msg">✖ ${esc(d.error || "Clave incorrecta")}</span>`;
    $("login-key").focus();
    $("login-key").select();
    return;
  }
  $("login-key").value = "";
  $("login-msg").textContent = "";
  boot();
});

$("btn-logout").addEventListener("click", async () => {
  await jpost("api/logout", {});
  showLogin();
});

/* ------------------------------------------------ tabuladores */
$("tabs").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-tab]");
  if (!b) return;
  const tab = b.getAttribute("data-tab");
  document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b));
  document.querySelectorAll("[data-panel]").forEach((p) => { p.hidden = p.getAttribute("data-panel") !== tab; });
});

/* ------------------------------------------------ estado */
function loadState() {
  jget("api/state").then((s) => {
    STATE = s;
    $("status").innerHTML =
      `<span>🔑 Secreto: <b>${esc(s.secretSource)}</b></span>` +
      `<span>🗄️ Base de datos: <b>${esc(s.dbPath || "no encontrada")}</b></span>` +
      `<span>💬 WhatsApp: <b>${esc(s.whatsapp ? "+" + s.whatsapp : "selector de contacto")}</b></span>`;
    $("chip-proto").textContent = s.https ? "🔒 HTTPS activo" : "⚠ HTTP sin cifrar";
    $("chip-proto").className = "chip " + (s.https ? "ok" : "warn");
    $("chip-secret").textContent = "Secreto: " + s.secretSource;
    $("chip-db").textContent = s.dbAvailable
      ? (s.dbCreated ? "BD creada y conectada" : "BD conectada")
      : "BD no disponible";
    $("chip-db").className = "chip " + (s.dbAvailable ? "ok" : "warn");
    $("chip-db").title = s.dbAvailable
      ? "Base de datos: " + (s.dbPath || "") + (s.dbCreated ? " (creada por el generador; el servidor la completa al arrancar)" : s.dbTablesAdded ? " (el generador añadió las tablas de licencias)" : "")
      : "No se pudo crear la base de datos en " + (s.dbPath || "") + (s.dbError ? ": " + s.dbError : "");
    $("acceso-datos").innerHTML =
      `<span>Protocolo: <b>${s.https ? "HTTPS (cifrado)" : "HTTP (sin cifrar)"}</b></span>` +
      `<span>Clave de acceso: <b>${esc(s.accessKeySource || "—")}</b></span>` +
      `<span>Secreto de firma: <b>${esc(s.secretSource)}</b></span>` +
      `<span>Base de datos: <b>${esc(s.dbPath || "—")}</b></span>` +
      `<span>Sesiones activas: <b>${esc(s.sessions)}</b></span>`;
    const sel = $("term");
    sel.innerHTML = (s.terms || []).map((t) =>
      `<option value="${esc(t.id)}">${esc(t.label)}${t.days ? " (" + t.days + " días)" : ""} · ${esc(t.type)}</option>`
    ).join("");
    sel.value = "MES";
    loadRequests();
    loadLicenses();
  }).catch(() => { $("status").textContent = "No se pudo cargar el estado de la herramienta."; });
}

/* ------------------------------------------------ generar */
function showResult(d) {
  LAST = d;
  $("result").hidden = false;
  const p = d.payload || {};
  const t = d.term || {};
  $("result-title").textContent = d.action === "renew" ? "♻ Licencia renovada (clave nueva)" : "✔ Clave generada";
  $("result-tags").innerHTML =
    `<span class="tag ok">${esc(p.type || "")}</span>` +
    `<span class="tag">${esc(t.label || "")}${t.days ? " (" + t.days + " días)" : ""}</span>` +
    `<span class="tag">Vence: ${esc(fmtDate(p.expires_at))}</span>` +
    `<span class="tag">ID: ${esc(p.license_id || "")}</span>` +
    (d.savedToDb ? `<span class="tag ok">registrada en la BD</span>` : `<span class="tag warn">sin BD (solo clave)</span>`);
  $("result-req").innerHTML = d.request
    ? `Solicitud <b>#${esc(d.request.id)}</b> de <b>${esc(d.request.clientName)}</b> · ${esc(d.request.termLabel || "")} — marcada como <b>atendida</b>.`
    : (d.renewedFrom
        ? `Renovada la licencia <b>#${esc(d.renewedFrom.id)}</b> de <b>${esc(d.renewedFrom.clientName)}</b> (vencía el ${esc(d.renewedFrom.expiresText)}) — quedó <b>revocada</b> y esta es la nueva.`
        : `Cliente: <b>${esc(p.client_name || "")}</b> · Usuarios: ${esc(p.max_users)} · Dispositivos: ${esc(p.max_devices)}`);
  $("result-key").textContent = d.licenseKey || "";
  $("result-msg").textContent = d.message || "";
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("gen-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  $("form-msg").textContent = "Generando…";
  const d = await jpost("api/generate", {
    client_name: $("client").value.trim(),
    phone: $("phone").value.trim(),
    term: $("term").value,
    type: $("type").value,
    max_users: Number($("users").value || 20),
    max_devices: Number($("devices").value || 10),
  }).catch(() => ({ ok: false, error: "Error de conexión con la herramienta." }));
  $("form-msg").innerHTML = d.ok
    ? `<span class="ok-msg">✔ Licencia generada — envíela por WhatsApp al cliente.</span>`
    : `<span class="err-msg">✖ ${esc(d.error || "No se pudo generar.")}</span>`;
  if (d.ok) { showResult(d); loadRequests(); loadLicenses(); }
});

async function copyKey() {
  if (!LAST) return;
  await navigator.clipboard.writeText(LAST.licenseKey || "");
  $("btn-copy").textContent = "✔ Copiada";
  setTimeout(() => { $("btn-copy").textContent = "📋 Copiar clave"; }, 1600);
}
$("btn-copy").addEventListener("click", copyKey);

function downloadTxt() {
  if (!LAST) return;
  const p = LAST.payload || {};
  const text = [
    `Licencia de ${p.product || "NovaGest"} — ${p.client_name || ""}`,
    `Tipo: ${p.type || ""} · Plan: ${(LAST.term || {}).label || ""}`,
    `Emitida: ${fmtDate(p.issued_at)} · Expira: ${fmtDate(p.expires_at)}`,
    `ID: ${p.license_id || ""} · Usuarios: ${p.max_users} · Dispositivos: ${p.max_devices}`,
    "", "--- Clave (copiar completa) ---", LAST.licenseKey || "",
    "", "--- Con prefijo NG- ---", LAST.formattedKey || "",
    "", "--- Mensaje para el cliente ---", LAST.message || "",
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = `licencia-${(p.client_name || "cliente").replace(/[^\w\-]+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
$("btn-dl").addEventListener("click", downloadTxt);
$("btn-wa").addEventListener("click", () => { if (LAST) window.open(LAST.whatsappUrl, "_blank", "noopener"); });
$("btn-copy-wa").addEventListener("click", async () => {
  if (!LAST) return;
  await navigator.clipboard.writeText(LAST.whatsappUrl || "");
  $("btn-copy-wa").textContent = "✔ Enlace copiado";
  setTimeout(() => { $("btn-copy-wa").textContent = "🔗 Copiar enlace wa.me"; }, 1600);
});

/* ------------------------------------------------ solicitudes */
let REQ_FLASH = "";        // aviso de la última importación (se mantiene hasta la siguiente)
let REQ_NUEVA = null;      // solicitud recién importada: se resalta en la lista

function loadRequests() {
  jget("api/requests").then((s) => {
    const box = $("requests");
    const list = s.requests || [];
    const pend = list.filter((r) => (r.status || "pendiente") === "pendiente").length;
    $("tab-req").innerHTML = pend ? `<span class="tag warn">${pend}</span>` : "";
    const aviso = REQ_FLASH ? `<p class="ok-msg">${REQ_FLASH}</p>` : "";
    const sinBd = s.dbAvailable === false
      ? `<p class="hint">No se pudo crear ni abrir la base de datos en <b>${esc(s.dbPath || "")}</b>${s.dbError ? " (" + esc(s.dbError) + ")" : ""}:
         revise que la carpeta <b>data</b> exista y se pueda escribir (o arranque esta herramienta con <b>--data</b> apuntando a ella).
         Mientras tanto, con <b>📥 Copiar desde el WhatsApp</b> puede importar el mensaje que le llegó al chat y crear su clave igualmente
         (esas solicitudes quedan en esta sesión hasta que la base esté disponible).</p>`
      : "";
    if (!list.length) {
      box.innerHTML = aviso + sinBd + `<p class="hint">Aún no hay solicitudes. Cuando un cliente pulse «SOLICITAR POR WHATSAPP»
        (Web o Android) aparecerá aquí; si le escribió directo al WhatsApp, use <b>📥 Copiar desde el WhatsApp</b>.</p>`;
      return;
    }
    box.innerHTML = aviso + sinBd + list.map((r) => {
      const pend = (r.status || "pendiente") === "pendiente";
      return `<div class="req${REQ_NUEVA && Number(r.id) === Number(REQ_NUEVA) ? " nueva" : ""}">
        <div class="top">
          <span class="who">#${esc(r.id)} · ${esc(r.clientName)}</span>
          <span class="tag ${pend ? "warn" : "ok"}">${esc(r.status || "pendiente")}</span>
          <span class="tag">${esc(r.termLabel || "")}${r.days ? " (" + esc(r.days) + " días)" : ""} · ${esc(r.type || "")}</span>
          ${r.channel === "whatsapp" ? `<span class="tag ok">📥 importada de WhatsApp</span>` : ""}
          ${r.mem ? `<span class="tag warn">solo en esta sesión (sin BD)</span>` : ""}
          <span class="meta">${esc(fmtDateTime(r.createdAt))} · ${esc(r.channel || "web")} · ${esc(r.deviceId || "")}${r.phone ? " · 📱 " + esc(r.phone) : ""}</span>
        </div>
        <details><summary class="hint">Mensaje que envió el cliente</summary><pre>${esc(r.message || "(sin mensaje)")}</pre></details>
        ${pend ? `<div class="row">
          <button class="btn wa small" data-gen-req="${esc(r.id)}">🔑 Crear clave y enviar por WhatsApp</button>
          <button class="btn small" data-copy-req="${esc(r.id)}">📋 Copiar clave sin enviar</button>
          <button class="btn small" data-discard-req="${esc(r.id)}">🚫 Descartar</button>
        </div>` : `<div class="row">
          <button class="btn small" data-reopen-req="${esc(r.id)}">↩ Volver a pendiente</button>
          <button class="btn danger small" data-del-req="${esc(r.id)}">🗑 Eliminar</button>
        </div>`}
      </div>`;
    }).join("");
  }).catch(() => {});
}

/* ------------------------------------------------ importar desde WhatsApp */
const PLAZOS_BASE = [
  { id: "DIA", label: "1 día", days: 1 }, { id: "SEMANA", label: "1 semana", days: 7 },
  { id: "MES", label: "1 mes", days: 30 }, { id: "TRIMESTRE", label: "3 meses", days: 90 },
  { id: "SEMESTRE", label: "6 meses", days: 180 }, { id: "ANIO", label: "1 año", days: 365 },
  { id: "DOS_ANIOS", label: "2 años", days: 730 }, { id: "PERMANENTE", label: "Permanente", days: 0 },
];
/** Los 8 plazos del servidor (o los de la herramienta si el estado aún no cargó). */
function termOptionsDe(selected) {
  const terms = (STATE && STATE.terms && STATE.terms.length) ? STATE.terms : PLAZOS_BASE;
  return terms.map((t) => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>` +
    `${esc(t.label)}${t.days ? " (" + esc(t.days) + " días)" : ""}</option>`).join("");
}

/** Abre el diálogo (o su respaldo con el atributo «open» donde no exista showModal). */
function abrirDialogo(el) {
  if (typeof el.showModal === "function") { if (!el.open) el.showModal(); }
  else if (!el.hasAttribute("open")) el.setAttribute("open", "");
}

/** Cierra el diálogo aunque el navegador no implemente dialog.close(). */
function cerrarDialogo(el) {
  try { if (typeof el.close === "function") el.close(); } catch (e) { /* sin close(): respaldo */ }
  if (el.hasAttribute("open")) el.removeAttribute("open");
}

function abrirImport() {
  $("import-term").innerHTML = termOptionsDe($("import-term").value || "MES");
  abrirDialogo($("import-dialog"));
  $("import-text").focus();
}

$("btn-import").addEventListener("click", abrirImport);
$("import-close").addEventListener("click", () => cerrarDialogo($("import-dialog")));
$("import-dialog").addEventListener("click", (ev) => {
  if (ev.target === $("import-dialog")) cerrarDialogo($("import-dialog"));
});

function importFeedback(html, clase) {
  $("import-feedback").innerHTML = html ? `<span class="${clase || ""}">${html}</span>` : "";
}

$("import-parse").addEventListener("click", async () => {
  const texto = $("import-text").value.trim();
  if (!texto) { importFeedback("✖ Pegue primero el mensaje del cliente.", "err-msg"); $("import-text").focus(); return; }
  const boton = $("import-parse");
  boton.disabled = true;
  importFeedback("Leyendo el mensaje…");
  const d = await jpost("api/requests/parse", { message: texto }).catch(() => ({ ok: false, error: "Error de conexión." }));
  boton.disabled = false;
  if (!d.ok) { importFeedback("✖ " + esc(d.error || "No se pudo leer el mensaje."), "err-msg"); return; }
  const p = d.parsed || {};
  $("import-name").value = p.clientName || "";
  $("import-phone").value = p.phone || "";
  if (p.term && $("import-term").querySelector(`option[value="${p.term}"]`)) $("import-term").value = p.term;
  const avisos = (p.warnings || []).map((w) => `<li>${esc(w)}</li>`).join("");
  importFeedback(
    `<b>Se reconoció:</b> ${esc(p.clientName || "(sin usuario)")} · ${esc(p.termLabel || "")}${p.days ? ` (${esc(p.days)} días)` : ""} · ${esc(p.type || "")}` +
    ` · ${esc(p.deviceId || "(sin ID de dispositivo)")}` +
    (p.createdAt ? ` · ${esc(fmtDateTime(p.createdAt))}` : "") +
    (avisos ? `<ul style="margin:6px 0 0 18px">${avisos}</ul>` : `<br>Revise los campos y pulse «📥 Importar a la lista».`),
    avisos ? "hint" : "ok-msg");
});

$("import-do").addEventListener("click", async () => {
  const texto = $("import-text").value.trim();
  const nombre = $("import-name").value.trim();
  if (!texto) { importFeedback("✖ Pegue el mensaje del cliente.", "err-msg"); $("import-text").focus(); return; }
  if (!nombre) { importFeedback("✖ Falta el usuario: pulse «🔍 Leer mensaje» o escríbalo en el campo Usuario.", "err-msg"); $("import-name").focus(); return; }
  const boton = $("import-do");
  boton.disabled = true;
  importFeedback("Importando…");
  const d = await jpost("api/requests/import", {
    message: texto,
    client_name: nombre,
    term: $("import-term").value,
    phone: $("import-phone").value.trim(),
  }).catch(() => ({ ok: false, error: "Error de conexión." }));
  boton.disabled = false;
  if (!d.ok) { importFeedback("✖ " + esc(d.error || "No se pudo importar la solicitud."), "err-msg"); return; }
  const r = d.request || {};
  REQ_NUEVA = r.id;
  REQ_FLASH = (d.duplicada
    ? `ℹ️ La solicitud #${esc(r.id)} de <b>${esc(r.clientName)}</b> ya estaba pendiente en la lista; no se duplicó.`
    : `✔ Solicitud #${esc(r.id)} importada desde WhatsApp: <b>${esc(r.clientName)}</b> · ${esc(r.termLabel || "")}${r.days ? ` (${esc(r.days)} días)` : ""} · ${esc(r.type || "")}`) +
    (d.savedToDb === false
      ? `.<br>No quedó guardada en la base de datos del servidor (no se encontró): vive en esta sesión. Cree su clave con «🔑 Crear clave y enviar por WhatsApp».`
      : `.<br>Ya está en la lista: pulse «🔑 Crear clave y enviar por WhatsApp» para generarla y enviársela al cliente.`);
  cerrarDialogo($("import-dialog"));
  $("import-text").value = ""; $("import-name").value = ""; $("import-phone").value = ""; importFeedback("");
  loadRequests();
});

$("requests").addEventListener("click", async (ev) => {
  const t = ev.target.closest("button[data-gen-req],button[data-copy-req],button[data-discard-req],button[data-reopen-req],button[data-del-req]");
  if (!t) return;
  const id = t.getAttribute("data-gen-req") || t.getAttribute("data-copy-req") || t.getAttribute("data-discard-req")
    || t.getAttribute("data-reopen-req") || t.getAttribute("data-del-req");
  const enviar = t.hasAttribute("data-gen-req");
  t.disabled = true;
  let d = { ok: true };
  try {
    if (t.hasAttribute("data-gen-req") || t.hasAttribute("data-copy-req")) {
      d = await jpost(`api/requests/${encodeURIComponent(id)}/generate`, {});
    } else if (t.hasAttribute("data-discard-req")) {
      if (!confirm(`¿Descartar la solicitud #${id}?`)) { t.disabled = false; return; }
      d = await jpost(`api/requests/${encodeURIComponent(id)}/estado`, { status: "descartada" });
    } else if (t.hasAttribute("data-reopen-req")) {
      d = await jpost(`api/requests/${encodeURIComponent(id)}/estado`, { status: "pendiente" });
    } else {
      if (!confirm(`¿Eliminar la solicitud #${id} del servidor?`)) { t.disabled = false; return; }
      d = await jdel(`api/requests/${encodeURIComponent(id)}`);
    }
  } catch (e) { d = { ok: false }; }
  if (!d.ok) {
    t.disabled = false;
    alert(d.error || "No se pudo completar la acción.");
    return;
  }
  if (d.licenseKey) {
    showResult(d);
    if (enviar) window.open(d.whatsappUrl, "_blank", "noopener");
  }
  loadRequests();
  loadLicenses();
});

$("btn-refresh").addEventListener("click", loadRequests);

/* ------------------------------------------------ licencias y equipos */
function termOptions(selected) {
  const terms = (STATE && STATE.terms) || [];
  return terms.map((t) => `<option value="${esc(t.id)}"${t.id === selected ? " selected" : ""}>${esc(t.label)}${t.days ? " (" + t.days + " días)" : ""}</option>`).join("");
}

function stateTag(l) {
  const cls = l.state === "vigente" ? "ok" : (l.state === "firma" ? "danger" : "warn");
  return `<span class="tag ${cls}">${esc(l.stateLabel)}</span>`;
}

function renderLicenses() {
  const q = ($("lic-q").value || "").trim().toLowerCase();
  const st = $("lic-state").value;
  const list = LICENSES.filter((l) => {
    if (st && l.state !== st) return false;
    if (!q) return true;
    return (l.clientName || "").toLowerCase().includes(q) || (l.licenseId || "").toLowerCase().includes(q)
      || (l.key || "").toLowerCase().includes(q) || (l.type || "").toLowerCase().includes(q)
      || (l.devices || []).some((d) => (d.deviceId || "").toLowerCase().includes(q));
  });
  const vigentes = LICENSES.filter((l) => l.state === "vigente").length;
  const equipos = LICENSES.reduce((n, l) => n + (l.active ? l.devicesActive : 0), 0);
  $("tab-lic").innerHTML = LICENSES.length ? `<span class="tag">${LICENSES.length}</span>` : "";
  $("lic-resumen").textContent = LICENSES.length
    ? `${LICENSES.length} licencia(s) · ${vigentes} vigente(s) · ${equipos} equipo(s) activado(s) en la licencia activa`
    : "";
  const box = $("licenses");
  if (!LICENSES.length) {
    box.innerHTML = `<p class="hint">No hay licencias registradas en la base de datos${STATE && STATE.dbAvailable === false ? " (no se pudo crear la BD: revise la carpeta data o arranque con --data apuntando a ella)" : ""}.</p>`;
    return;
  }
  if (!list.length) { box.innerHTML = `<p class="hint">Ninguna licencia coincide con el filtro.</p>`; return; }
  box.innerHTML = list.map((l) => {
    const current = l.state === "vigente" && l.active;
    const dias = l.daysLeft === null ? "∞ sin vencimiento" : (l.daysLeft + " día(s) restantes");
    const devs = (l.devices || []).length
      ? l.devices.map((d) => `<div class="dev">
            <span>${d.active ? "🟢" : "⚪"} <b>${esc(d.deviceId || "(sin ID)")}</b></span>
            <span class="meta">${esc(d.deviceInfo || "")}</span>
            <span class="meta">IP ${esc(d.ip || "—")} · activada ${esc(fmtDateTime(d.activatedAt))} · vista ${esc(fmtDateTime(d.lastSeen))}</span>
            ${d.active ? `<button class="btn small" data-revoke-dev="${esc(d.id)}">⛔ Quitar equipo</button>` : ""}
          </div>`).join("")
      : `<p class="hint">Ningún equipo ha activado esta licencia todavía.</p>`;
    return `<div class="lic${current ? " current" : ""}">
      <div class="top">
        <span class="who">#${esc(l.id)} · ${esc(l.clientName || "(sin nombre)")}</span>
        ${stateTag(l)}
        <span class="tag">${esc(l.type || "")}</span>
        <span class="tag">Emitida: ${esc(fmtDate(l.issuedAt))}</span>
        <span class="tag">Expira: ${esc(l.expiresText)}</span>
        <span class="tag ${l.daysLeft !== null && l.daysLeft <= 7 ? "warn" : ""}">${esc(dias)}</span>
        ${l.signatureOk ? "" : `<span class="tag danger">⚠ firma no coincide con este servidor</span>`}
      </div>
      <div class="meta" style="margin-top:6px">
        ID: ${esc(l.licenseId || "—")} · Usuarios: ${esc(l.maxUsers)} · Dispositivos: ${esc(l.maxDevices)}
        · Creada por: ${esc(l.createdBy || "—")} · Equipos: ${esc(l.devices.length)} (${esc(l.devicesActive)} activos)
        ${l.lastVerified ? " · Última verificación: " + esc(fmtDateTime(l.lastVerified)) : ""}
      </div>
      <details>
        <summary class="hint">Ver clave completa, equipos y envío al cliente</summary>
        <div class="keybox">${esc(l.formattedKey || l.key || "")}</div>
        <div class="row">
          <button class="btn small" data-copy-lic="${esc(l.id)}">📋 Copiar clave</button>
          <button class="btn wa small" data-wa-lic="${esc(l.id)}">💬 Enviar por WhatsApp</button>
          <button class="btn small" data-txt-lic="${esc(l.id)}">⬇ .txt</button>
        </div>
        <div class="devices">
          <p class="hint"><b>Equipos que la activaron</b> — «Quitar equipo» desactiva esa instalación.</p>
          ${devs}
        </div>
      </details>
      <div class="row">
        ${l.active ? "" : `<button class="btn small" data-act="activate" data-id="${esc(l.id)}">✅ Usar como activa</button>`}
        <select data-term-select="${esc(l.id)}" style="max-width:180px;margin:0">${termOptions(l.term)}</select>
        <button class="btn small" data-act="renew" data-id="${esc(l.id)}">♻ Renovar con este plazo</button>
        ${l.active ? `<button class="btn danger small" data-act="revoke" data-id="${esc(l.id)}">⛔ Revocar</button>`
                   : `<button class="btn small" data-act="restore" data-id="${esc(l.id)}">↩ Reactivar</button>`}
        <button class="btn danger small" data-act="delete" data-id="${esc(l.id)}">🗑 Eliminar</button>
      </div>
    </div>`;
  }).join("");
}

function loadLicenses() {
  jget("api/licenses").then((s) => {
    LICENSES = s.licenses || [];
    renderLicenses();
  }).catch(() => {});
}

$("lic-q").addEventListener("input", renderLicenses);
$("lic-state").addEventListener("change", renderLicenses);
$("btn-lic-refresh").addEventListener("click", () => { loadLicenses(); loadRequests(); });

function licById(id) { return LICENSES.find((l) => String(l.id) === String(id)); }

$("licenses").addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button[data-act],button[data-copy-lic],button[data-wa-lic],button[data-txt-lic],button[data-revoke-dev]");
  if (!btn) return;
  const id = btn.getAttribute("data-id") || btn.getAttribute("data-copy-lic") || btn.getAttribute("data-wa-lic") || btn.getAttribute("data-txt-lic");
  const dev = btn.getAttribute("data-revoke-dev");

  if (dev) {
    btn.disabled = true;
    const d = await jpost(`api/activations/${encodeURIComponent(dev)}/revoke`, {}).catch(() => ({ ok: false }));
    if (!d.ok) { btn.disabled = false; alert(d.error || "No se pudo quitar el equipo."); return; }
    loadLicenses();
    return;
  }

  const l = licById(id);
  if (!l) return;

  if (btn.hasAttribute("data-copy-lic")) {
    await navigator.clipboard.writeText(l.formattedKey || l.key || "");
    btn.textContent = "✔ Copiada";
    setTimeout(() => { btn.textContent = "📋 Copiar clave"; }, 1600);
    return;
  }
  if (btn.hasAttribute("data-wa-lic")) {
    if (!l.whatsappUrl) { alert("Esta clave no se puede reenviar: su firma no coincide con el secreto de este servidor."); return; }
    LAST = { licenseKey: l.key, formattedKey: l.formattedKey, message: l.message, whatsappUrl: l.whatsappUrl,
             payload: { client_name: l.clientName, type: l.type, expires_at: l.expiresAt, license_id: l.licenseId },
             term: { label: l.expiresText }, savedToDb: true, action: "resend" };
    window.open(l.whatsappUrl, "_blank", "noopener");
    return;
  }
  if (btn.hasAttribute("data-txt-lic")) {
    const text = [
      `Licencia de ${l.product} — ${l.clientName}`,
      `Tipo: ${l.type} · Estado: ${l.stateLabel}`,
      `Emitida: ${fmtDate(l.issuedAt)} · Expira: ${l.expiresText}`,
      `ID: ${l.licenseId || "—"} · Usuarios: ${l.maxUsers} · Dispositivos: ${l.maxDevices}`,
      "", "--- Clave (copiar completa) ---", l.key || "",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    a.download = `licencia-${(l.clientName || "cliente").replace(/[^\w\-]+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }

  const act = btn.getAttribute("data-act");
  const pid = encodeURIComponent(id);
  let d = { ok: true };
  try {
    if (act === "activate") {
      d = await jpost(`api/licenses/${pid}/activate`, {});
    } else if (act === "renew") {
      const sel = document.querySelector(`[data-term-select="${id}"]`);
      const term = sel ? sel.value : "MES";
      const t = (STATE.terms || []).find((x) => x.id === term) || {};
      if (!confirm(`¿Renovar «${l.clientName}» con el plazo ${t.label}?\n\nSe emite una clave NUEVA y la anterior (#${l.id}) queda revocada.`)) return;
      btn.disabled = true;
      d = await jpost(`api/licenses/${pid}/renew`, { term, phone: "" });
    } else if (act === "revoke") {
      if (!confirm(`¿Revocar la licencia #${l.id} de «${l.clientName}»?\n\nEl servidor dejará de aceptarla (se puede reactivar después).`)) return;
      btn.disabled = true;
      d = await jpost(`api/licenses/${pid}/revoke`, {});
    } else if (act === "restore") {
      d = await jpost(`api/licenses/${pid}/restore`, {});
    } else if (act === "delete") {
      if (!confirm(`¿Eliminar definitivamente la licencia #${l.id} de «${l.clientName}»?\n\nEsta acción no se puede deshacer.`)) return;
      btn.disabled = true;
      d = await jdel(`api/licenses/${pid}`);
    }
  } catch (e) { d = { ok: false }; }
  if (!d.ok) {
    btn.disabled = false;
    alert(d.error || "No se pudo completar la acción.");
    return;
  }
  if (d.licenseKey) showResult(d);
  loadLicenses();
  loadRequests();
});

/* ------------------------------------------------ clave de acceso */
$("key-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  $("key-msg").textContent = "Guardando…";
  const d = await jpost("api/access-key", { key: $("key-new").value }).catch(() => ({ ok: false }));
  $("key-msg").innerHTML = d.ok
    ? `<span class="ok-msg">✔ ${esc(d.message || "Clave actualizada.")}</span>`
    : `<span class="err-msg">✖ ${esc(d.error || "No se pudo cambiar la clave.")}</span>`;
  if (d.ok) { $("key-new").value = ""; loadState(); }
});

/* ------------------------------------------------ arranque */
function boot() {
  showApp();
  loadState();
}

jget("api/session").then((s) => {
  if (s.authenticated) boot();
  else showLogin();
}).catch(() => showLogin());
</script>
</body>
</html>
"""


class StudioHandler(BaseHTTPRequestHandler):
    """Servidor HTTP(S) mínimo (solo esta herramienta, sin tocar la Web de NovaGest)."""
    server_version = "NovaGestLicenseStudio/1.1"

    # ------------------------------------------------------------ utilidades
    def log_message(self, fmt, *args):
        print(f"[GENERADOR] {self.address_string()} {fmt % args}", flush=True)

    def _security_headers(self):
        """Cabeceras comunes para evitar MIME sniffing, framing y referer leaks."""
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    def _json(self, code, obj, cookie=None):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(raw)

    def _csv(self, code, text, filename):
        raw = text.encode("utf-8-sig")
        self.send_response(code)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self._security_headers()
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(n) or b"{}") if n else {}
        except Exception:
            return {}

    def _cookie(self, name):
        try:
            c = SimpleCookie(self.headers.get("Cookie") or "")
            return c[name].value if name in c else ""
        except Exception:
            return ""

    def _secure(self):
        return bool(getattr(self.server, "ssl_enabled", False))

    def _session_cookie(self, token, borrar=False):
        partes = [f"{COOKIE_NAME}={'' if borrar else token}", "Path=/", "HttpOnly", "SameSite=Lax"]
        partes.append("Max-Age=0" if borrar else f"Max-Age={SESSION_TTL}")
        if self._secure():
            partes.append("Secure")
        return "; ".join(partes)

    def _autenticado(self):
        return session_ok(self._cookie(COOKIE_NAME))

    def _exigir_clave(self):
        """Devuelve True si hay sesión; si no, responde 401 y devuelve False."""
        if self._autenticado():
            return True
        self._json(401, {"ok": False, "authRequired": True, "error": "Escriba la clave de acceso para continuar."})
        return False

    # ------------------------------------------------------------ GET
    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/", "/index.html"):
            raw = INDEX_HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self._security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/favicon.svg":
            raw = FAVICON_SVG.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "public, max-age=86400")
            self._security_headers()
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/api/session":
            self._json(200, {
                "ok": True,
                "authenticated": self._autenticado(),
                "app": "NovaGest License Studio",
                "version": APP_VERSION,
                "product": PRODUCT,
                "https": self._secure(),
            })
            return
        if path == "/api/legal":
            # La información legal se publica también en NovaGest: no es dato privado.
            self._json(200, {"ok": True, "legal": legal_public_data()})
            return
        if not self._exigir_clave():
            return
        if path == "/api/state":
            self._json(200, {
                "ok": True,
                "app": "NovaGest License Studio",
                "version": APP_VERSION,
                "product": PRODUCT,
                "secretSource": secret_source(),
                **db_state(),
                "whatsapp": WHATSAPP_DEFAULT,
                "terms": TERMS,
                "https": self._secure(),
                "accessKeySource": ACCESS_KEY_SOURCE,
                "sessions": len(_SESSIONS),
            })
            return
        if path == "/api/requests":
            qs = parse_qs(urlparse(self.path).query)
            self._json(200, {
                "ok": True,
                "dbAvailable": db_available(),
                "dbPath": gen.db_path(),
                "requests": list_requests((qs.get("limit") or ["100"])[0]),
            })
            return
        if path == "/api/licenses":
            if not db_available():
                self._json(200, {"ok": True, "dbAvailable": False, "dbPath": gen.db_path(),
                                 "licenses": [], "activations": []})
                return
            licencias, activaciones = list_licenses()
            self._json(200, {"ok": True, "dbAvailable": True, "dbPath": gen.db_path(),
                             "licenses": licencias, "activations": activaciones})
            return
        if path == "/api/licenses.csv":
            if not db_available():
                self._json(404, {"ok": False, "error": "No se encontró la base de datos del servidor."})
                return
            self._csv(200, csv_licenses(), f"licencias-novagest-{time.strftime('%Y-%m-%d')}.csv")
            return
        self._json(404, {"ok": False, "error": "Ruta no encontrada."})

    # ------------------------------------------------------------ POST
    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")
        b = self._body()

        if path == "/api/login":
            ip = self.ip()
            espera = login_blocked(ip)
            if espera:
                self._json(429, {"ok": False, "error": f"Demasiados intentos fallidos. Espere {espera // 60 + 1} minuto(s)."})
                return
            recibida = str(b.get("key") or "").strip()
            if hmac.compare_digest(recibida.encode("utf-8"), ACCESS_KEY.encode("utf-8")):
                login_ok(ip)
                token = session_new()
                print(f"[GENERADOR] Acceso autorizado desde {ip}", flush=True)
                self._json(200, {"ok": True, "message": "Acceso autorizado."}, cookie=self._session_cookie(token))
            else:
                fallos = login_fail(ip)
                quedan = max(0, LOGIN_MAX_FALLOS - fallos)
                print(f"[GENERADOR] Clave incorrecta desde {ip} ({fallos})", flush=True)
                self._json(401, {"ok": False, "error": "Clave de acceso incorrecta." + (f" Quedan {quedan} intento(s)." if quedan else "")})
            return

        if path == "/api/logout":
            session_drop(self._cookie(COOKIE_NAME))
            self._json(200, {"ok": True}, cookie=self._session_cookie("", borrar=True))
            return

        if not self._exigir_clave():
            return

        if path == "/api/generate":
            client = str(b.get("client_name") or b.get("clientName") or "").strip()
            if not client:
                self._json(400, {"ok": False, "error": "Indique el nombre o la empresa del cliente."})
                return
            d = generate_result(
                client, str(b.get("phone") or ""), str(b.get("term") or "MES"),
                ltype=str(b.get("type") or "") or None,
                users=b.get("max_users") or 20, devices=b.get("max_devices") or 10,
                features=str(b.get("features") or "*"),
            )
            db_audit("LICENSE_GENERATE_STUDIO",
                     f"Licencia generada desde el generador · {d['payload']['license_id']} · {client} · {d['term']['label']}",
                     self.ip())
            self._json(200, d)
            return

        if path == "/api/requests/parse":
            # Solo lee el mensaje pegado (sin guardar nada): el administrador revisa antes.
            texto = str(b.get("message") or b.get("texto") or "").strip()
            if not texto:
                self._json(400, {"ok": False, "error": "Pegue el mensaje que el cliente envió por WhatsApp."})
                return
            self._json(200, {"ok": True, "parsed": parse_whatsapp_request(texto, str(b.get("phone") or ""))})
            return

        if path == "/api/requests/import":
            texto = str(b.get("message") or b.get("texto") or "").strip()
            if not texto:
                self._json(400, {"ok": False, "error": "Pegue el mensaje que el cliente envió por WhatsApp."})
                return
            datos = parse_whatsapp_request(texto, str(b.get("phone") or ""))
            # Lo que el administrador confirmó en el diálogo manda sobre lo leído del mensaje.
            if str(b.get("client_name") or "").strip():
                datos["clientName"] = str(b["client_name"]).strip()[:120]
            if str(b.get("term") or "").strip():
                datos["term"] = str(b["term"]).strip().upper()
            if str(b.get("phone") or "").strip():
                datos["phone"] = str(b["phone"]).strip()[:24]
            try:
                req, guardada, ya_estaba = import_request(datos, self.ip())
            except ValueError as e:
                self._json(400, {"ok": False, "error": str(e), "parsed": datos})
                return
            db_audit("LICENSE_REQUEST_IMPORT",
                     f"Solicitud #{req['id']} importada desde WhatsApp · {req['clientName']} · {req['termLabel']}", self.ip())
            self._json(200, {"ok": True, "request": req, "savedToDb": guardada, "duplicada": ya_estaba,
                             "warnings": datos.get("warnings") or [], "parsed": datos})
            return

        if path == "/api/access-key":
            ok, msg = save_access_key(b.get("key"))
            if ok:
                print(f"[GENERADOR] Clave de acceso cambiada ({ACCESS_KEY_SOURCE})", flush=True)
            self._json(200 if ok else 400, {"ok": ok, "message": msg, "error": None if ok else msg})
            return

        m = re.match(r"^/api/requests/(\d+)/generate$", path)
        if m:
            req_id = int(m.group(1))
            req = request_by_id(req_id)
            if not req:
                self._json(404, {"ok": False, "error": f"No existe la solicitud #{req_id}."})
                return
            if (req.get("status") or "pendiente") != "pendiente":
                self._json(400, {"ok": False, "error": f"La solicitud #{req_id} ya está {req.get('status')}."})
                return
            d = generate_result("", str(b.get("phone") or ""), "", request=req)
            d["request"] = request_by_id(req_id) or req      # ya marcada como atendida
            db_audit("LICENSE_REQUEST_DONE",
                     f"Solicitud #{req_id} atendida desde el generador con la licencia {d['payload']['license_id']}", self.ip())
            self._json(200, d)
            return

        m = re.match(r"^/api/requests/(\d+)/estado$", path)
        if m:
            req_id = int(m.group(1))
            status = str(b.get("status") or "").strip().lower()
            if status not in ("pendiente", "atendida", "descartada"):
                self._json(400, {"ok": False, "error": "Estado no válido."})
                return
            if request_status(req_id, status) == 0:
                self._json(404, {"ok": False, "error": f"No existe la solicitud #{req_id}."})
                return
            db_audit("LICENSE_REQUEST_STATUS", f"Solicitud #{req_id} marcada como {status} desde el generador", self.ip())
            self._json(200, {"ok": True, "id": req_id, "status": status})
            return

        m = re.match(r"^/api/licenses/(\d+)/(revoke|restore|activate|renew)$", path)
        if m:
            if not db_available():
                self._json(400, {"ok": False, "error": "No se encontró la base de datos del servidor."})
                return
            lic_id, accion = int(m.group(1)), m.group(2)
            row = license_row(lic_id)
            if not row:
                self._json(404, {"ok": False, "error": f"No existe la licencia #{lic_id}."})
                return
            if accion == "revoke":
                set_license_active(lic_id, False)
                db_audit("LICENSE_REVOKE", f"Licencia #{lic_id} revocada desde el generador · {row['client_name']}", self.ip())
                self._json(200, {"ok": True, "id": lic_id, "state": "revocada"})
                return
            if accion == "restore":
                set_license_active(lic_id, True)
                db_audit("LICENSE_RESTORE", f"Licencia #{lic_id} reactivada desde el generador · {row['client_name']}", self.ip())
                self._json(200, {"ok": True, "id": lic_id, "state": "vigente"})
                return
            if accion == "activate":
                activate_only(lic_id)
                db_audit("LICENSE_ACTIVATE_PANEL", f"Licencia #{lic_id} puesta como activa desde el generador · {row['client_name']}", self.ip())
                self._json(200, {"ok": True, "id": lic_id, "state": "vigente"})
                return
            # renew
            term = str(b.get("term") or "").strip().upper() or (license_public(row, [])["term"])
            if term not in [t["id"] for t in TERMS]:
                self._json(400, {"ok": False, "error": "Plazo no válido."})
                return
            d = renew_result(lic_id, term, str(b.get("phone") or ""))
            if not d:
                self._json(404, {"ok": False, "error": f"No existe la licencia #{lic_id}."})
                return
            db_audit("LICENSE_RENEW",
                     f"Licencia #{lic_id} renovada desde el generador · {row['client_name']} · {d['term']['label']} "
                     f"· nueva clave {d['payload']['license_id']}", self.ip())
            self._json(200, d)
            return

        m = re.match(r"^/api/activations/(\d+)/revoke$", path)
        if m:
            if not db_available():
                self._json(400, {"ok": False, "error": "No se encontró la base de datos del servidor."})
                return
            act_id = int(m.group(1))
            if revoke_activation(act_id) == 0:
                self._json(404, {"ok": False, "error": f"No existe la activación #{act_id}."})
                return
            db_audit("LICENSE_DEVICE_REVOKE", f"Equipo de la activación #{act_id} desactivado desde el generador", self.ip())
            self._json(200, {"ok": True, "id": act_id})
            return

        self._json(404, {"ok": False, "error": "Ruta no encontrada."})

    # ------------------------------------------------------------ DELETE
    def do_DELETE(self):
        path = urlparse(self.path).path.rstrip("/")
        if not self._exigir_clave():
            return
        m = re.match(r"^/api/licenses/(\d+)$", path)
        if m and not db_available():
            self._json(400, {"ok": False, "error": "No se encontró la base de datos del servidor."})
            return
        if m:
            lic_id = int(m.group(1))
            row = license_row(lic_id)
            if not row:
                self._json(404, {"ok": False, "error": f"No existe la licencia #{lic_id}."})
                return
            delete_license(lic_id)
            db_audit("LICENSE_DELETE", f"Licencia #{lic_id} eliminada desde el generador · {row['client_name']}", self.ip())
            self._json(200, {"ok": True, "id": lic_id})
            return
        m = re.match(r"^/api/requests/(\d+)$", path)
        if m:
            req_id = int(m.group(1))
            if request_delete(req_id) == 0:
                self._json(404, {"ok": False, "error": f"No existe la solicitud #{req_id}."})
                return
            db_audit("LICENSE_REQUEST_DELETE", f"Solicitud #{req_id} eliminada desde el generador", self.ip())
            self._json(200, {"ok": True, "id": req_id})
            return
        self._json(404, {"ok": False, "error": "Ruta no encontrada."})

    def ip(self):
        try:
            return self.client_address[0]
        except Exception:
            return ""


def create_server(host="0.0.0.0", port=8777, ssl_cert=None, ssl_key=None):
    """Servidor de la herramienta; si se dan certificado y llave, escucha en HTTPS."""
    srv = ThreadingHTTPServer((host, int(port)), StudioHandler)
    srv.daemon_threads = True
    srv.ssl_enabled = bool(ssl_cert and ssl_key)
    if srv.ssl_enabled:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(ssl_cert, ssl_key)
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
    return srv


def main():
    global WHATSAPP_DEFAULT
    p = argparse.ArgumentParser(description="Generador y control de licencias NovaGest — herramienta independiente de la Web")
    p.add_argument("--host", default="0.0.0.0", help="Interfaz de escucha (0.0.0.0 = toda la red; 127.0.0.1 = solo esta máquina)")
    p.add_argument("--port", type=int, default=8777, help="Puerto de la herramienta (por defecto 8777)")
    p.add_argument("--data", default=None, help="Carpeta data del servidor del cliente (secreto y solicitudes)")
    p.add_argument("--whatsapp", default=None, help="Número de WhatsApp destino por defecto (solo dígitos, con código de país)")
    p.add_argument("--clave", default=None, help="Clave de acceso de la interfaz (si no, LICENSE_ADMIN_KEY o data/licencia-acceso.txt)")
    p.add_argument("--ssl-cert", default=os.environ.get("SSL_CERT"), help="Certificado TLS (.crt) para servir por HTTPS")
    p.add_argument("--ssl-key", default=os.environ.get("SSL_KEY"), help="Llave privada TLS (.key) que acompaña al certificado")
    p.add_argument("--open", action="store_true", help="Abre el navegador al arrancar")
    args = p.parse_args()

    if args.data:
        os.environ["DATA_DIR"] = os.path.abspath(args.data)
        # generate_license leyó DATA_DIR al importarlo: apunta también su ruta de secreto
        gen.DATA = os.environ["DATA_DIR"]
        gen.LICENSE_FILE = os.path.join(gen.DATA, "license.key")
    if args.whatsapp:
        WHATSAPP_DEFAULT = re.sub(r"\D", "", args.whatsapp)

    if bool(args.ssl_cert) != bool(args.ssl_key):
        sys.exit("Para HTTPS hay que indicar --ssl-cert y --ssl-key juntos (o las variables SSL_CERT y SSL_KEY).")
    if args.ssl_cert and not (os.path.exists(args.ssl_cert) and os.path.exists(args.ssl_key)):
        sys.exit(f"No se encontró el certificado/llave: {args.ssl_cert} · {args.ssl_key}")

    # El secreto debe existir antes de firmar (se crea si hace falta, igual que la CLI)
    gen.get_secret()
    load_access_key(args.clave)
    # Base de datos de solicitudes y licencias: se crea si falta (ya no queda «sin BD»).
    ensure_db()

    scheme = "https" if args.ssl_cert else "http"
    try:
        srv = create_server(args.host, args.port, args.ssl_cert, args.ssl_key)
    except OSError as e:
        sys.exit(f"No se pudo abrir el puerto {args.port}: {e}\n¿Hay otra copia del generador en ese puerto?")
    url = f"{scheme}://localhost:{args.port}"
    print("\n=== 🔐 Generador y control de Licencias NovaGest (herramienta independiente) ===")
    print(f"  Interfaz:      {url}   (escucha en {args.host}:{args.port})")
    if args.ssl_cert:
        print(f"  HTTPS:         {args.ssl_cert}")
    else:
        print("  ⚠️  Sin HTTPS: la clave de acceso y las claves de licencia viajan sin cifrar en la red.")
        print("      Para HTTPS:  tools\\iniciar-generador-https.ps1  (Windows)  ó  --ssl-cert / --ssl-key")
    print(f"  Clave de acceso: {ACCESS_KEY}   ({ACCESS_KEY_SOURCE})")
    print(f"  Secreto de firma: {secret_source()}")
    if db_available():
        nota = ("creada ahora por el generador; el servidor la completa al arrancar" if DB_STATUS.get("created")
                else "se añadieron las tablas de licencias" if DB_STATUS.get("tablesAdded")
                else "solicitudes y licencias disponibles")
    else:
        nota = ("NO DISPONIBLE: " + (DB_STATUS.get("error") or "no se pudo crear")
                + " — se generan claves y se pueden pegar solicitudes de WhatsApp (quedan en esta sesión)")
    print(f"  Base de datos: {gen.db_path()} ({nota})")
    print(f"  WhatsApp:      {'+' + WHATSAPP_DEFAULT if WHATSAPP_DEFAULT else 'selector de contacto (sin número fijo)'}")
    if args.host == "0.0.0.0":
        print("  ⚠️  Escucha en toda la red: es una herramienta privada del administrador (quien tenga la clave entra).")
        print("      Para uso solo en esta máquina: --host 127.0.0.1")
    print("\n  Ctrl+C para detener.\n")

    if args.open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[GENERADOR] Detenido.")


if __name__ == "__main__":
    main()
