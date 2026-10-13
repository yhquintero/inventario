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
pedidos, la marca como atendida y prepara el mensaje para el cliente. Además,
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
    return os.path.exists(gen.db_path())


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
    if not db_available():
        return []
    con = db_connect()
    try:
        rows = con.execute(
            "SELECT * FROM license_requests ORDER BY CASE status WHEN 'pendiente' THEN 0 ELSE 1 END,"
            " created_at DESC, id DESC LIMIT ?", (int(limit),)).fetchall()
        return [request_public(r) for r in rows]
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
    """Marca la solicitud como atendida (igual que el panel de la Web y la CLI)."""
    if not db_available():
        return
    pretty = f"NG-{token}"
    preview = pretty[:18] + "…" + pretty[-8:] if len(pretty) > 30 else pretty
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
    con = db_connect()
    try:
        cur = con.execute(
            "UPDATE license_requests SET status=?, handled_at=?, handled_by='license_studio.py' WHERE id=?",
            (status, int(time.time()), int(req_id)))
        con.commit()
        return cur.rowcount
    finally:
        con.close()


def request_delete(req_id):
    con = db_connect()
    try:
        cur = con.execute("DELETE FROM license_requests WHERE id=?", (int(req_id),))
        con.commit()
        return cur.rowcount
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Generador de Licencias · NovaGest</title>
<link rel="icon" href="data:,">
<style>
  :root {
    --bg: #f2f4f8; --card: #ffffff; --ink: #17233b; --muted: #5b6b85;
    --line: #d9e0ec; --brand: #1f4fd8; --brand-ink: #ffffff; --ok: #25d366;
    --danger: #b3261e; --danger-bg: #fdecea; --warn-bg: #fff6e5; --warn-ink: #7a5200;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--ink); }
  header { background: linear-gradient(120deg, #14264f, #1f4fd8); color: #fff; padding: 22px 20px 18px; }
  header h1 { margin: 0; font-size: 21px; }
  header .sub { margin: 6px 0 0; opacity: .92; font-size: 13.5px; }
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
  #login { max-width: 460px; margin: 60px auto; }
  #login .card { padding: 26px 24px; }
  #login h1 { font-size: 19px; margin: 0 0 6px; }
  .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-top: 4px; }
</style>
</head>
<body>
<header>
  <h1>🔐 Generador de Licencias <span class="badge">aparte de la Web</span></h1>
  <p class="sub">NovaGest · genera la clave firmada, <b>controla todas las licencias emitidas</b> y envíala por WhatsApp con un solo clic.</p>
  <div class="hdr-bar" id="hdr-bar" hidden>
    <span class="chip" id="chip-proto">—</span>
    <span class="chip" id="chip-secret">—</span>
    <span class="chip" id="chip-db">—</span>
    <button class="btn ghost small" id="btn-logout">Salir</button>
  </div>
</header>

<section id="login" hidden>
  <div class="card">
    <h1>🔒 Acceso del administrador</h1>
    <p class="hint">Esta herramienta es privada: escriba la <b>clave de acceso</b> para entrar.
      Se guarda en <b id="login-path">data\licencia-acceso.txt</b> (o en la variable
      <b>LICENSE_ADMIN_KEY</b>) y se muestra en la consola al arrancar el generador.</p>
    <form id="login-form">
      <label>Clave de acceso
        <input id="login-key" type="password" autocomplete="current-password" autofocus placeholder="••••••••">
      </label>
      <div class="row">
        <button class="btn primary" type="submit">Entrar</button>
        <span class="hint" id="login-msg"></span>
      </div>
    </form>
  </div>
</section>

<main id="app" hidden>
  <div class="status" id="status">Cargando…</div>

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
    <p class="hint" id="req-hint">Las solicitudes que los clientes envían desde la Web o la app Android («Solicitar por WhatsApp»).</p>
    <div id="requests"></div>
    <div class="row">
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
<footer>
  El cliente activa la clave en <b>Licencia de uso → Activar licencia</b> (Web o app Android).
  Esta herramienta no modifica la Web de NovaGest: funciona como un proceso aparte y usa el
  mismo formato de clave (HMAC-SHA256) que el servidor verifica en <b>/api/license/activate</b>.
</footer>
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
  $("login-msg").textContent = "Comprobando…";
  const d = await jreq("api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: $("login-key").value }),
  }).catch(() => ({ ok: false, error: "Error de conexión con la herramienta." }));
  if (!d.ok) { $("login-msg").innerHTML = `<span class="err-msg">✖ ${esc(d.error || "Clave incorrecta")}</span>`; return; }
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
    $("chip-db").textContent = s.dbAvailable ? "BD conectada" : "sin BD";
    $("chip-db").className = "chip " + (s.dbAvailable ? "ok" : "warn");
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
function loadRequests() {
  jget("api/requests").then((s) => {
    const box = $("requests");
    const list = s.requests || [];
    const pend = list.filter((r) => (r.status || "pendiente") === "pendiente").length;
    $("tab-req").innerHTML = pend ? `<span class="tag warn">${pend}</span>` : "";
    if (s.dbAvailable === false) {
      box.innerHTML = `<p class="hint">No se encontró la base de datos del servidor (<b>${esc(s.dbPath || "")}</b>).
        Arranque la herramienta con <b>--data</b> apuntando a la carpeta <b>data</b> del servidor
        para ver aquí las solicitudes recibidas. Puede generar claves igualmente con el formulario de arriba.</p>`;
      return;
    }
    if (!list.length) {
      box.innerHTML = `<p class="hint">Aún no hay solicitudes. Cuando un cliente pulse «SOLICITAR POR WHATSAPP» (Web o Android) aparecerá aquí.</p>`;
      return;
    }
    box.innerHTML = list.map((r) => {
      const pend = (r.status || "pendiente") === "pendiente";
      return `<div class="req">
        <div class="top">
          <span class="who">#${esc(r.id)} · ${esc(r.clientName)}</span>
          <span class="tag ${pend ? "warn" : "ok"}">${esc(r.status || "pendiente")}</span>
          <span class="tag">${esc(r.termLabel || "")}${r.days ? " (" + esc(r.days) + " días)" : ""} · ${esc(r.type || "")}</span>
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
    box.innerHTML = `<p class="hint">No hay licencias registradas en la base de datos${STATE && STATE.dbAvailable === false ? " (no se encontró la BD: arranque con --data apuntando a la carpeta data del servidor)" : ""}.</p>`;
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
  if (s.authenticated) { boot(); }
  else {
    showLogin();
    if (s.accessKeySource) $("login-path").textContent = s.accessKeySource;
  }
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

    def _json(self, code, obj, cookie=None):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
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
                "accessKeySource": ACCESS_KEY_SOURCE,
            })
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
                "dbPath": gen.db_path(),
                "dbAvailable": db_available(),
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

        if path == "/api/access-key":
            ok, msg = save_access_key(b.get("key"))
            if ok:
                print(f"[GENERADOR] Clave de acceso cambiada ({ACCESS_KEY_SOURCE})", flush=True)
            self._json(200 if ok else 400, {"ok": ok, "message": msg, "error": None if ok else msg})
            return

        m = re.match(r"^/api/requests/(\d+)/generate$", path)
        if m:
            req_id = int(m.group(1))
            rows = [r for r in list_requests(500) if int(r["id"]) == req_id] if db_available() else []
            if not rows:
                self._json(404, {"ok": False, "error": f"No existe la solicitud #{req_id}."})
                return
            req = rows[0]
            if (req.get("status") or "pendiente") != "pendiente":
                self._json(400, {"ok": False, "error": f"La solicitud #{req_id} ya está {req.get('status')}."})
                return
            d = generate_result("", str(b.get("phone") or ""), "", request=req)
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
            if not db_available() or request_status(req_id, status) == 0:
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
        if not db_available():
            self._json(400, {"ok": False, "error": "No se encontró la base de datos del servidor."})
            return
        m = re.match(r"^/api/licenses/(\d+)$", path)
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
    print(f"  Base de datos: {gen.db_path()} {'(solicitudes y licencias disponibles)' if db_available() else '(no encontrada — solo generación de claves)'}")
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
