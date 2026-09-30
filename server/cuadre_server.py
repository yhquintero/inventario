#!/usr/bin/env python3
"""
Servidor de Cuadre Pinar: API + archivos estáticos.

- SQLite (data/cuadre.db): usuarios, sesiones, estado compartido (Web + App), días cerrados, auditoría.
- Contraseñas PBKDF2-SHA256 (210 000 iteraciones) · bloqueo tras 5 fallos · sesiones con caducidad.
- Verificación en dos pasos TOTP (Google/Microsoft Authenticator) + códigos de recuperación.
- Permisos y días cerrados validados EN EL SERVIDOR.
- Copias automáticas diarias cifradas (Fernet/AES-128-CBC+HMAC), se conservan 30.
- HTTPS nativo (SSL_CERT/SSL_KEY) o detrás de proxy (Caddy/Nginx con Let's Encrypt).

Variables: PORT, DATA_DIR, SSL_CERT, SSL_KEY, BACKUP_KEY, TRUST_PROXY (1), SESSION_IDLE_MIN (20),
SESSION_MAX_HOURS (12), BACKUP_HOUR (2), BACKUP_KEEP (30).
"""
import base64, datetime as dt, gzip, hashlib, hmac, json, os, re, secrets, sqlite3, struct, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs, quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "web")
DATA = os.environ.get("DATA_DIR", os.path.join(ROOT, "data"))
BACKUPS = os.path.join(DATA, "backups")
CERT, KEY = os.environ.get("SSL_CERT"), os.environ.get("SSL_KEY")
HTTPS = bool(CERT and KEY)
TRUST_PROXY = os.environ.get("TRUST_PROXY", "1") == "1"
IDLE = int(os.environ.get("SESSION_IDLE_MIN", "20")) * 60
MAXAGE = int(os.environ.get("SESSION_MAX_HOURS", "12")) * 3600
BACKUP_HOUR = int(os.environ.get("BACKUP_HOUR", "2"))
BACKUP_KEEP = int(os.environ.get("BACKUP_KEEP", "30"))
ISSUER = "Cuadre Pinar"
ROLES = ("ADMINISTRADOR", "JEFE", "ECONOMICO", "ALMACENERO")
ADMINS = {"ADMINISTRADOR", "JEFE"}

# ------------------------------------------------------------------ licencia de uso
LICENSE_PRODUCT = os.environ.get("LICENSE_PRODUCT", "Cuadre Pinar")
LICENSE_FILE = os.path.join(DATA, "license.key")
LICENSE_TRIAL_DAYS = int(os.environ.get("LICENSE_TRIAL_DAYS", "15"))
LICENSE_EXEMPT = {"/api/health", "/api/license/status", "/api/license/activate", "/api/license/verify"}

# Quién puede modificar cada sección del estado compartido
WRITE = {
    "products": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "movements": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "priceHistory": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "cuadres": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "rates": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "weekly": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "settings": {"ADMINISTRADOR", "JEFE"},
    "warehouses": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "warehouseEntries": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "audit": set(ROLES),
}
CLOSE_DAY = {"ADMINISTRADOR", "JEFE", "ECONOMICO"}
MOV_CORE = ("date", "productId", "type", "quantity", "unitPriceUsd", "center", "domicilioCup", "deletedAt", "notes", "warehouseId")
WAREHOUSE_DEFAULT_ID = "w_principal"

os.makedirs(BACKUPS, exist_ok=True)
DB_PATH = os.path.join(DATA, "cuadre.db")
_lock = threading.RLock()


def db():
    con = sqlite3.connect(DB_PATH, timeout=10, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    return con


CON = db()


def q(sql, args=(), one=False):
    with _lock:
        cur = CON.execute(sql, args)
        rows = cur.fetchall()
        CON.commit()
    return (rows[0] if rows else None) if one else rows


def now():
    return int(time.time())


# ------------------------------------------------------------------ licencia de uso
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def get_license_secret() -> bytes:
    # Prioridad: LICENSE_SECRET > LICENSE_KEY > BACKUP_KEY > archivo local > generado
    for env_key in ("LICENSE_SECRET", "LICENSE_KEY", "BACKUP_KEY"):
        v = os.environ.get(env_key)
        if not v:
            continue
        v = v.strip()
        # Si es una clave Fernet (44 chars base64), la usamos tal cual como secreto
        try:
            # Intenta decodificar como base64 urlsafe, si funciona y tiene 32 bytes, es Fernet key raw
            raw = base64.urlsafe_b64decode(v + "=" * (-len(v) % 4))
            if len(raw) == 32:
                return raw
        except Exception:
            pass
        return v.encode()
    # Archivo local
    if os.path.exists(LICENSE_FILE):
        try:
            data = open(LICENSE_FILE, "rb").read().strip()
            # Si el archivo contiene base64 de 32 bytes, decodifica
            try:
                raw = base64.urlsafe_b64decode(data + b"=" * (-len(data) % 4))
                if len(raw) == 32:
                    return raw
            except Exception:
                pass
            return data if isinstance(data, bytes) else data.encode()
        except Exception:
            pass
    # Generar nuevo secreto
    os.makedirs(DATA, exist_ok=True)
    secret = secrets.token_bytes(32)
    try:
        with open(LICENSE_FILE, "wb") as f:
            f.write(base64.urlsafe_b64encode(secret))
        os.chmod(LICENSE_FILE, 0o600)
    except Exception:
        pass
    return secret


def sign_license_payload(payload_b64: str) -> str:
    secret = get_license_secret()
    sig = hmac.new(secret, payload_b64.encode(), hashlib.sha256).digest()
    return _b64url_encode(sig)


def create_license_token(payload: dict) -> str:
    # payload debe ser serializable
    json_bytes = json.dumps(payload, separators=(",", ":"), ensure_ascii=False, sort_keys=True).encode()
    b64 = _b64url_encode(json_bytes)
    sig = sign_license_payload(b64)
    return f"{b64}.{sig}"


def verify_license_token(token: str):
    try:
        if not token:
            return None
        # Limpia solo espacios y prefijo CP-, conserva '-' y '_' que son válidos en base64url
        t = token.strip().replace(" ", "").replace("\n", "").replace("\r", "").replace("\t", "")
        if t.upper().startswith("CP-"):
            t = t[3:]
        # Si no tiene punto, intenta recuperar (últimos 43 chars son firma)
        if "." not in t:
            if len(t) > 50:
                b64_part = t[:-43]
                sig_part = t[-43:]
                t = f"{b64_part}.{sig_part}"
            else:
                return None
        if "." not in t:
            return None
        b64, sig = t.rsplit(".", 1)
        # Solo permitimos caracteres base64url
        def clean_b64url(s):
            return "".join(c for c in s if c.isalnum() or c in "-_")
        b64 = clean_b64url(b64)
        sig = clean_b64url(sig)
        if not b64 or not sig:
            return None
        expected = sign_license_payload(b64)
        if not hmac.compare_digest(expected, sig):
            return None
        payload_json = _b64url_decode(b64)
        payload = json.loads(payload_json)
        return payload
    except Exception:
        return None


def format_license_key(token: str) -> str:
    # Formato legible: CP-<token> con el token original intacto (no inserta guiones que rompan base64url)
    # Para mostrar bonito, agrupa con espacios cada 4 chars solo visualmente, pero devuelve original con prefijo
    try:
        raw = token.strip()
        if raw.upper().startswith("CP-"):
            return raw
        # Devuelve con prefijo CP- y el token original (preserva punto)
        return f"CP-{raw}"
    except Exception:
        return token


def format_license_pretty(token: str) -> str:
    # Versión bonita con saltos para UI, pero no usar para verificación
    try:
        raw = token.strip()
        if raw.upper().startswith("CP-"):
            raw = raw[3:]
        # Agrupa visualmente sin alterar el token real: usa espacios
        def group(s):
            return " ".join(s[i:i+4] for i in range(0, len(s), 4))
        if "." in raw:
            b64, sig = raw.split(".", 1)
            return f"CP-{group(b64)} . {group(sig)}"
        return "CP-" + group(raw)
    except Exception:
        return token


def generate_license_payload(client_name="Cuadre Pinar", product=None, license_type="FULL", days=365, max_users=20, max_devices=10, features=None, license_id=None):
    product = product or LICENSE_PRODUCT
    issued = now()
    expires = 0 if str(days).upper() in ("0", "NEVER", "LIFETIME", "PERMANENTE") else issued + int(days) * 86400
    return {
        "license_id": license_id or secrets.token_hex(8).upper(),
        "client_name": client_name,
        "product": product,
        "type": license_type,
        "issued_at": issued,
        "expires_at": expires,
        "max_users": int(max_users),
        "max_devices": int(max_devices),
        "features": features or ["*"],
        "version": 1,
    }


def get_active_license_info():
    try:
        rows = q("SELECT * FROM licenses WHERE active=1 ORDER BY expires_at DESC, issued_at DESC")
    except Exception:
        rows = []
    ts = now()
    for r in rows:
        exp = r["expires_at"]
        if exp != 0 and exp < ts:
            continue
        payload = verify_license_token(r["key"])
        # Permitir licencias TRIAL- legacy sin firma si no expiraron
        if not payload and not str(r["key"]).startswith("TRIAL-"):
            # Firma inválida, posible cambio de secreto -> invalida
            continue
        # Si tiene payload, valida expiración del payload también
        if payload:
            p_exp = payload.get("expires_at", 0)
            if p_exp != 0 and p_exp < ts:
                continue
        # Actualiza last_verified
        try:
            q("UPDATE licenses SET last_verified=? WHERE id=?", (ts, r["id"]))
        except Exception:
            pass
        return {
            "valid": True,
            "db_row": dict(r),
            "payload": payload or {
                "client_name": r["client_name"],
                "product": r["product"],
                "type": r["type"],
                "issued_at": r["issued_at"],
                "expires_at": r["expires_at"],
                "max_users": r["max_users"],
                "max_devices": r["max_devices"],
                "features": json.loads(r["features"] or '["*"]'),
                "license_id": r["key"][:16],
            },
        }
    return {"valid": False, "reason": "No hay licencia activa válida", "db_row": None, "payload": None}


def check_license_active():
    info = get_active_license_info()
    if info["valid"]:
        return info
    return {"valid": False, "reason": info.get("reason", "Licencia no válida"), "db_row": None, "payload": None}


def ensure_trial_license():
    try:
        cnt = q("SELECT COUNT(*) as c FROM licenses", one=True)
        if cnt and cnt["c"] > 0:
            return
    except Exception:
        return
    # Crea licencia de prueba
    payload = generate_license_payload(
        client_name="Cuadre Pinar (Prueba)",
        product=LICENSE_PRODUCT,
        license_type="TRIAL",
        days=LICENSE_TRIAL_DAYS,
        max_users=5,
        max_devices=3,
        features=["*"],
    )
    token = create_license_token(payload)
    try:
        q(
            "INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users, max_devices, features, active, created_by, created_at, last_verified, metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                token,
                payload["client_name"],
                payload["product"],
                payload["type"],
                payload["issued_at"],
                payload["expires_at"],
                payload["max_users"],
                payload["max_devices"],
                json.dumps(payload["features"], ensure_ascii=False),
                1,
                "sistema",
                now(),
                now(),
                json.dumps({"auto_trial": True}, ensure_ascii=False),
            ),
        )
        audit("sistema", "LICENSE_TRIAL", f"Licencia de prueba creada ({LICENSE_TRIAL_DAYS} días) · {payload['license_id']}")
        print(f"[LICENCIA] Licencia de prueba creada: {payload['license_id']} expira en {LICENSE_TRIAL_DAYS} días", flush=True)
    except Exception as e:
        print(f"[LICENCIA] No se pudo crear licencia de prueba: {e}", flush=True)


# ------------------------------------------------------------------ contraseñas
def hash_pw(pw, iters=210_000):
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), iters).hex()
    return f"pbkdf2${iters}${salt}${h}"


def check_pw(pw, stored):
    try:
        _, iters, salt, h = stored.split("$")
        return hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), int(iters)).hex(), h)
    except Exception:
        return False


def pw_policy(pw):
    if len(pw or "") < 8: return "La contraseña debe tener al menos 8 caracteres."
    if not re.search(r"\d", pw): return "La contraseña debe incluir un número."
    if not re.search(r"[A-Z]", pw): return "La contraseña debe incluir una mayúscula."
    return None


# ------------------------------------------------------------------ TOTP (RFC 6238)
def totp_at(secret, step):
    key = base64.b32decode(secret + "=" * (-len(secret) % 8))
    d = hmac.new(key, struct.pack(">Q", step), hashlib.sha1).digest()
    o = d[-1] & 0x0F
    return f"{(struct.unpack('>I', d[o:o + 4])[0] & 0x7FFFFFFF) % 1_000_000:06d}"


def totp_verify(secret, code, last_step=0):
    code = re.sub(r"\D", "", str(code or ""))
    if len(code) != 6: return None
    cur = int(time.time() // 30)
    for s in (cur - 1, cur, cur + 1):
        if s > last_step and hmac.compare_digest(totp_at(secret, s), code):
            return s
    return None


# ------------------------------------------------------------------ esquema
def init_db():
    CON.executescript("""
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY, username TEXT UNIQUE COLLATE NOCASE, display_name TEXT, email TEXT,
      role TEXT, active INTEGER DEFAULT 1, pw_hash TEXT, question TEXT, answer_hash TEXT,
      totp_secret TEXT, totp_pending TEXT, totp_enabled INTEGER DEFAULT 0, totp_last INTEGER DEFAULT 0,
      recovery TEXT DEFAULT '[]', created_at INTEGER, last_login INTEGER, pw_changed INTEGER);
    CREATE TABLE IF NOT EXISTS sessions(
      id TEXT PRIMARY KEY, token_hash TEXT UNIQUE, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created INTEGER, last_seen INTEGER, ip TEXT, ua TEXT);
    CREATE TABLE IF NOT EXISTS app_state(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER, data TEXT, updated_at INTEGER, updated_by TEXT);
    CREATE TABLE IF NOT EXISTS closed_days(date TEXT PRIMARY KEY, closed_by TEXT, closed_at INTEGER, note TEXT, snapshot TEXT);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, ts INTEGER, user TEXT, action TEXT, details TEXT, ip TEXT);
    CREATE TABLE IF NOT EXISTS fails(k TEXT PRIMARY KEY, n INTEGER, until INTEGER);
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
    """)
    CON.commit()
    # Licencia de uso: si no hay ninguna, crea una de prueba automáticamente
    try:
        ensure_trial_license()
    except Exception as e:
        print(f"[LICENCIA] Error al verificar licencia inicial: {e}", flush=True)
    if not q("SELECT 1 FROM users LIMIT 1", one=True):
        demo = [("admin", "Yosvany Hernández", "admin@cuadrepinar.cu", "ADMINISTRADOR", "Admin123!"),
                ("jefe", "Jefe de Tienda", "jefe@cuadrepinar.cu", "JEFE", "Jefe123!"),
                ("economico", "Área Económica", "economia@cuadrepinar.cu", "ECONOMICO", "Eco123!"),
                ("almacenero", "Almacén Pinar", "almacen@cuadrepinar.cu", "ALMACENERO", "Alma123!")]
        for u, n, e, r, p in demo:
            q("INSERT INTO users(username,display_name,email,role,pw_hash,question,answer_hash,created_at,pw_changed) VALUES(?,?,?,?,?,?,?,?,?)",
              (u, n, e, r, hash_pw(p), "¿Ciudad de la tienda?", hash_pw("pinar"), now(), now()))
        audit(None, "BOOTSTRAP", "Usuarios iniciales creados (cambie las contraseñas de demostración)")
    if not q("SELECT 1 FROM app_state", one=True):
        q("INSERT INTO app_state(id,version,data,updated_at) VALUES(1,0,NULL,?)", (now(),))


def audit(user, action, details="", ip=""):
    q("INSERT INTO audit(ts,user,action,details,ip) VALUES(?,?,?,?,?)", (now(), user, action, details, ip))


def public_user(r):
    return {"id": r["id"], "username": r["username"], "displayName": r["display_name"], "email": r["email"],
            "role": r["role"], "active": bool(r["active"]), "totpEnabled": bool(r["totp_enabled"]),
            "lastLogin": r["last_login"], "createdAt": r["created_at"], "securityQuestion": r["question"]}


# ------------------------------------------------------------------ copias cifradas
def fernet():
    from cryptography.fernet import Fernet
    key = os.environ.get("BACKUP_KEY")
    if not key:
        kp = os.path.join(DATA, "backup.key")
        if not os.path.exists(kp):
            with open(kp, "wb") as f: f.write(Fernet.generate_key())
            os.chmod(kp, 0o600)
        key = open(kp, "rb").read().strip()
    return Fernet(key)


def make_backup(kind="auto", user="sistema"):
    st = q("SELECT version,data FROM app_state WHERE id=1", one=True)
    payload = {
        "createdAt": now(), "kind": kind, "version": st["version"], "state": json.loads(st["data"]) if st["data"] else None,
        "closedDays": [dict(r) for r in q("SELECT * FROM closed_days")],
        "users": [dict(r) for r in q("SELECT * FROM users")],
        "licenses": [dict(r) for r in q("SELECT * FROM licenses")],
        "licenseActivations": [dict(r) for r in q("SELECT * FROM license_activations")],
    }
    blob = fernet().encrypt(gzip.compress(json.dumps(payload, ensure_ascii=False).encode()))
    name = dt.datetime.now().strftime(f"cuadre_%Y-%m-%d_%H%M%S_{kind}.bak")
    with open(os.path.join(BACKUPS, name), "wb") as f: f.write(blob)
    files = sorted(f for f in os.listdir(BACKUPS) if f.endswith(".bak"))
    for old in files[:-BACKUP_KEEP]: os.remove(os.path.join(BACKUPS, old))
    audit(user, "BACKUP", f"{name} ({len(blob)} bytes)")
    return name


def read_backup(name):
    if not re.fullmatch(r"cuadre_[\w\-]+\.bak", name): raise ValueError("nombre inválido")
    with open(os.path.join(BACKUPS, name), "rb") as f:
        return json.loads(gzip.decompress(fernet().decrypt(f.read())))


def backup_loop():
    while True:
        try:
            today = dt.date.today().strftime("%Y-%m-%d")
            has_today = any(f.startswith(f"cuadre_{today}") and f.endswith("_auto.bak") for f in os.listdir(BACKUPS))
            if not has_today and dt.datetime.now().hour >= BACKUP_HOUR:
                make_backup("auto")
        except Exception as e:
            print("backup error:", e, flush=True)
        time.sleep(600)


# ------------------------------------------------------------------ validación del estado
def by_id(items):
    return {x.get("id"): x for x in (items or []) if isinstance(x, dict)}


def ensure_warehouses(st):
    """Convierte un estado que venía de antes del módulo de almacenes.

    Todo lo que había queda en el almacén principal, de modo que los totales
    (stockInicial, stockActual) siguen siendo los mismos. Devuelve (estado, cambio).
    """
    if not isinstance(st, dict):
        return st, False
    changed = False
    if not isinstance(st.get("warehouses"), list):
        st["warehouses"] = []
        changed = True
    if not isinstance(st.get("warehouseEntries"), list):
        st["warehouseEntries"] = []
        changed = True
    ws = st["warehouses"]
    active = [w for w in ws if isinstance(w, dict) and not w.get("deletedAt")]
    if not active:
        ws.append({
            "id": WAREHOUSE_DEFAULT_ID, "name": "ALMACÉN PRINCIPAL", "code": "PRI", "location": "", "notes": "",
            "active": True, "isDefault": True, "createdAt": now(), "createdBy": "servidor", "deletedAt": None,
        })
        changed = True
    wid = (active[0]["id"] if active else WAREHOUSE_DEFAULT_ID)
    for p in st.get("products") or []:
        if not isinstance(p, dict):
            continue
        if not isinstance(p.get("stocks"), dict):
            p["stocks"] = {}
            changed = True
        if not isinstance(p.get("stocksInicial"), dict):
            p["stocksInicial"] = {}
            changed = True
        if not p["stocksInicial"]:
            p["stocksInicial"][wid] = p.get("stockInicial", 0) or 0
            changed = True
        for k in list(p["stocksInicial"].keys()):
            if p["stocks"].get(k) is None:
                p["stocks"][k] = 0
                changed = True
    for i, m in enumerate(st.get("movements") or []):
        if isinstance(m, dict) and not m.get("warehouseId"):
            m["warehouseId"] = wid
            changed = True
    return st, changed


def migrate_state():
    """Aplica la conversión al estado guardado (arranque del servidor)."""
    with _lock:
        r = q("SELECT version,data FROM app_state WHERE id=1", one=True)
        if not r or not r["data"]:
            return
        st, changed = ensure_warehouses(json.loads(r["data"]))
        if changed:
            q("UPDATE app_state SET version=?, data=?, updated_at=?, updated_by=? WHERE id=1",
              (r["version"] + 1, json.dumps(st, ensure_ascii=False, separators=(",", ":")), now(), "conversión a almacenes"))
            audit("sistema", "MIGRATE", "Datos convertidos al módulo de almacenes (todo quedó en el ALMACÉN PRINCIPAL)")


def core(m):
    return {k: m.get(k) for k in MOV_CORE}


def validate_change(old, new, role, closed):
    """Devuelve (código HTTP, mensaje) si el cambio no está permitido, o None."""
    if not isinstance(new, dict): return 400, "Estado inválido."
    for k in new:
        if k not in WRITE and k not in ("backups",): return 400, f"Sección desconocida: {k}"
    for sec, roles in WRITE.items():
        if json.dumps(old.get(sec), sort_keys=True) != json.dumps(new.get(sec), sort_keys=True) and role not in roles:
            return 403, f"Tu rol ({role}) no puede modificar «{sec}»."
    # Días cerrados: movimientos y cuadres inmutables
    om, nm = by_id(old.get("movements")), by_id(new.get("movements"))
    for i in set(om) | set(nm):
        a, b = om.get(i), nm.get(i)
        dates = {x.get("date") for x in (a, b) if x}
        if dates & closed and (a is None or b is None or core(a) != core(b)):
            d = sorted(dates & closed)[0]
            return 423, f"El día {d} está cerrado. Pide a un administrador que lo reabra."
    oc = {c.get("date"): c for c in old.get("cuadres") or []}
    ncs = {c.get("date"): c for c in new.get("cuadres") or []}
    for d in closed:
        strip = lambda c: {k: v for k, v in (c or {}).items() if k not in ("updatedBy",)}
        if json.dumps(strip(oc.get(d)), sort_keys=True) != json.dumps(strip(ncs.get(d)), sort_keys=True):
            return 423, f"El cuadre del {d} está cerrado."
    return None


# ------------------------------------------------------------------ HTTP
MIME = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json"}
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'")


class Api(BaseHTTPRequestHandler):
    server_version = "CuadrePinar"
    sys_version = ""

    # ---------- utilidades
    def ip(self):
        if TRUST_PROXY and self.headers.get("X-Forwarded-For"):
            return self.headers["X-Forwarded-For"].split(",")[0].strip()
        return self.client_address[0]

    def secure(self):
        return HTTPS or (TRUST_PROXY and self.headers.get("X-Forwarded-Proto", "").lower() == "https")

    def headers_common(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "geolocation=(), microphone=(), camera=(self)")
        self.send_header("Content-Security-Policy", CSP)
        if self.secure(): self.send_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    def send_json(self, code, obj, cookies=()):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        for c in cookies: self.send_header("Set-Cookie", c)
        self.headers_common()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def err(self, code, msg):
        self.send_json(code, {"error": msg})

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 30 * 1024 * 1024: raise ValueError("Petición demasiado grande")
        return json.loads(self.rfile.read(n) or b"{}")

    def cookie(self, token, clear=False):
        attrs = "Path=/; HttpOnly"
        if self.secure(): attrs += "; Secure; SameSite=None; Partitioned"
        else: attrs += "; SameSite=Strict"
        return f"cp_session={'' if clear else token}; {attrs}; Max-Age={0 if clear else MAXAGE}"

    def token(self):
        a = self.headers.get("Authorization", "")
        if a.startswith("Bearer "): return a[7:].strip()
        for part in (self.headers.get("Cookie") or "").split(";"):
            k, _, v = part.strip().partition("=")
            if k == "cp_session": return v
        return None

    def auth(self):
        t = self.token()
        if not t: return None
        th = hashlib.sha256(t.encode()).hexdigest()
        s = q("SELECT s.*, u.* , s.id AS sid FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?", (th,), one=True)
        if not s: return None
        n = now()
        if not s["active"] or n - s["last_seen"] > IDLE or n - s["created"] > MAXAGE:
            q("DELETE FROM sessions WHERE token_hash=?", (th,))
            return None
        if n - s["last_seen"] > 30: q("UPDATE sessions SET last_seen=? WHERE token_hash=?", (n, th))
        return s

    # ---------- enrutado
    def do_GET(self): self.route("GET")
    def do_POST(self): self.route("POST")
    def do_PUT(self): self.route("PUT")
    def do_DELETE(self): self.route("DELETE")

    def route(self, method):
        path = urlparse(self.path).path
        if not path.startswith("/api/"):
            return self.static(path) if method == "GET" else self.err(405, "Método no permitido")
        # --- LICENCIA DE USO: verificación obligatoria siempre primero ---
        if path not in LICENSE_EXEMPT and not path.startswith("/api/license/"):
            lic = check_license_active()
            if not lic["valid"]:
                return self.send_json(402, {"error": "Licencia no válida o expirada. Active una licencia para continuar.", "licenseError": True, "reason": lic.get("reason", ""), "code": "LICENSE_REQUIRED"})
        # CSRF: toda petición que modifica exige la cabecera X-CP (un formulario de otro sitio no puede ponerla)
        if method != "GET" and self.headers.get("X-CP") != "1":
            return self.err(403, "Falta cabecera anti-CSRF")
        try:
            h = ROUTES.get((method, path)) or ROUTES.get((method, re.sub(r"/[\w\-.]+$", "/:id", path)))
            if not h: return self.err(404, "No encontrado")
            ident = path.rsplit("/", 1)[-1]
            h(self, ident)
        except ValueError as e:
            self.err(400, str(e))
        except Exception as e:
            print("ERROR", method, path, repr(e), flush=True)
            self.err(500, "Error interno")

    def static(self, path):
        if path in ("", "/"): path = "/index.html"
        full = os.path.realpath(os.path.join(WEB, path.lstrip("/")))
        if not full.startswith(os.path.realpath(WEB) + os.sep) or "/." in path or not os.path.isfile(full):
            return self.err(404, "No encontrado")
        data = open(full, "rb").read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(os.path.splitext(full)[1], "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.headers_common()
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        if "/api/state/version" not in (args[0] if args else ""):
            print("[%s] %s %s" % (self.log_date_time_string(), self.ip(), fmt % args), flush=True)


ROUTES = {}


def route(method, path, need=True, roles=None):
    def deco(fn):
        def wrap(h, ident):
            u = None
            if need:
                u = h.auth()
                if not u: return h.err(401, "Sesión caducada. Vuelve a entrar.")
                if roles and u["role"] not in roles: return h.err(403, "No tienes permiso.")
            return fn(h, u, ident)
        ROUTES[(method, path)] = wrap
        return fn
    return deco


# ------------------------------------------------------------------ licencia de uso (verificación obligatoria primero)
@route("GET", "/api/license/status", need=False)
def license_status(h, _, __):
    info = get_active_license_info()
    if info["valid"]:
        p = info["payload"]
        db_row = info["db_row"]
        exp = p.get("expires_at", 0) if p else db_row["expires_at"]
        days_left = -1
        if exp != 0:
            days_left = max(0, (exp - now()) // 86400)
        h.send_json(200, {
            "valid": True,
            "hasLicense": True,
            "clientName": p.get("client_name", db_row["client_name"]) if p else db_row["client_name"],
            "product": p.get("product", db_row["product"]) if p else db_row["product"],
            "type": p.get("type", db_row["type"]) if p else db_row["type"],
            "issuedAt": p.get("issued_at", db_row["issued_at"]) if p else db_row["issued_at"],
            "expiresAt": exp,
            "daysLeft": days_left,
            "maxUsers": p.get("max_users", db_row["max_users"]) if p else db_row["max_users"],
            "maxDevices": p.get("max_devices", db_row["max_devices"]) if p else db_row["max_devices"],
            "features": p.get("features", json.loads(db_row["features"] or '["*"]')) if p else json.loads(db_row["features"] or '["*"]'),
            "licenseId": p.get("license_id", "") if p else db_row["key"][:12],
            "formattedKey": format_license_key(db_row["key"]) if db_row else "",
        })
    else:
        # Verifica si hay licencias expiradas para dar más contexto
        rows = q("SELECT * FROM licenses ORDER BY expires_at DESC LIMIT 1")
        last = dict(rows[0]) if rows else None
        h.send_json(200, {
            "valid": False,
            "hasLicense": bool(last),
            "reason": info.get("reason", "Sin licencia"),
            "lastLicense": {
                "clientName": last["client_name"],
                "type": last["type"],
                "expiresAt": last["expires_at"],
                "expired": last["expires_at"] != 0 and last["expires_at"] < now(),
            } if last else None,
            "trialDays": LICENSE_TRIAL_DAYS,
        })


@route("POST", "/api/license/verify", need=False)
def license_verify(h, _, __):
    b = h.body()
    key = str(b.get("license_key") or b.get("key") or "").strip()
    if not key:
        return h.err(400, "Debe proporcionar la clave de licencia.")
    payload = verify_license_token(key)
    if not payload:
        return h.send_json(200, {"valid": False, "error": "Clave de licencia no válida o firma incorrecta."})
    exp = payload.get("expires_at", 0)
    if exp != 0 and exp < now():
        return h.send_json(200, {"valid": False, "error": "La licencia está expirada.", "expired": True, "payload": payload})
    h.send_json(200, {"valid": True, "payload": payload, "formattedKey": format_license_key(key)})


@route("POST", "/api/license/activate", need=False)
def license_activate(h, _, __):
    b = h.body()
    raw_key = str(b.get("license_key") or b.get("key") or "").strip()
    if not raw_key:
        return h.err(400, "Debe proporcionar la clave de licencia.")
    # Limpieza: permite formato con guiones y prefijo CP-
    key = raw_key.strip()
    payload = verify_license_token(key)
    if not payload:
        audit("anon", "LICENSE_FAIL", f"Intento de activación fallido: firma inválida · {h.ip()}", h.ip())
        return h.err(400, "Clave de licencia no válida. Verifique que la copió completa (incluyendo el punto).")
    exp = payload.get("expires_at", 0)
    if exp != 0 and exp < now():
        return h.err(400, f"La licencia expiró el {dt.datetime.fromtimestamp(exp).strftime('%d/%m/%Y')}.")
    # Verifica si ya existe
    existing = q("SELECT * FROM licenses WHERE key=?", (key,), one=True)
    if existing:
        # Reactiva si estaba inactiva
        q("UPDATE licenses SET active=1, last_verified=?, client_name=?, product=?, type=?, issued_at=?, expires_at=?, max_users=?, max_devices=?, features=? WHERE id=?",
          (now(), payload.get("client_name", existing["client_name"]), payload.get("product", existing["product"]),
           payload.get("type", existing["type"]), payload.get("issued_at", existing["issued_at"]),
           payload.get("expires_at", existing["expires_at"]), payload.get("max_users", existing["max_users"]),
           payload.get("max_devices", existing["max_devices"]), json.dumps(payload.get("features", ["*"]), ensure_ascii=False),
           existing["id"]))
        lic_id = existing["id"]
    else:
        # Desactiva otras licencias del mismo producto si es FULL/ENTERPRISE (solo una activa a la vez)
        if payload.get("type") in ("FULL", "ENTERPRISE", "LIFETIME"):
            q("UPDATE licenses SET active=0 WHERE product=?", (payload.get("product", LICENSE_PRODUCT),))
        q("INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users, max_devices, features, active, created_by, created_at, last_verified, metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          (key, payload.get("client_name", "Cliente"), payload.get("product", LICENSE_PRODUCT), payload.get("type", "FULL"),
           payload.get("issued_at", now()), payload.get("expires_at", 0), payload.get("max_users", 20), payload.get("max_devices", 10),
           json.dumps(payload.get("features", ["*"]), ensure_ascii=False), 1, "activacion", now(), now(),
           json.dumps({"activated_from": h.ip(), "license_id": payload.get("license_id")}, ensure_ascii=False)))
        lic_row = q("SELECT * FROM licenses WHERE key=?", (key,), one=True)
        lic_id = lic_row["id"] if lic_row else 0
    # Registra activación de dispositivo
    device_id = str(b.get("device_id") or b.get("deviceId") or "")[:100] or h.ip()
    device_info = str(b.get("device_info") or b.get("deviceInfo") or h.headers.get("User-Agent", ""))[:300]
    q("INSERT INTO license_activations(license_key, license_id, device_id, device_info, ip, activated_at, last_seen, active) VALUES(?,?,?,?,?,?,?,?)",
      (key, lic_id, device_id, device_info, h.ip(), now(), now(), 1))
    audit("sistema", "LICENSE_ACTIVATE", f"Licencia activada · {payload.get('license_id')} · {payload.get('client_name')} · tipo {payload.get('type')} · {h.ip()}", h.ip())
    # Respuesta con info completa
    info = get_active_license_info()
    p = info["payload"] if info["valid"] else payload
    exp_final = p.get("expires_at", 0)
    days_left = -1 if exp_final == 0 else max(0, (exp_final - now()) // 86400)
    h.send_json(200, {
        "ok": True,
        "valid": True,
        "clientName": p.get("client_name"),
        "product": p.get("product"),
        "type": p.get("type"),
        "expiresAt": exp_final,
        "daysLeft": days_left,
        "licenseId": p.get("license_id"),
        "formattedKey": format_license_key(key),
        "message": f"Licencia activada correctamente para {p.get('client_name')}."
    })


@route("GET", "/api/license/info", roles=ADMINS)
def license_info(h, u, _):
    licenses = [dict(r) for r in q("SELECT * FROM licenses ORDER BY active DESC, expires_at DESC")]
    activations = [dict(r) for r in q("SELECT * FROM license_activations ORDER BY last_seen DESC LIMIT 100")]
    # Oculta parte de la clave por seguridad, muestra formateada parcial
    for lic in licenses:
        lic["formattedKey"] = format_license_key(lic["key"])
        lic["keyPreview"] = lic["key"][:20] + "..." + lic["key"][-10:] if len(lic["key"]) > 35 else lic["key"]
        # No exponer clave completa a no-admin? Admin sí puede verla, pero la ocultamos parcialmente en listado
        # Para admin completo, la clave completa se devuelve solo si se pide detalle
    active = get_active_license_info()
    h.send_json(200, {
        "licenses": licenses,
        "activations": activations,
        "active": {
            "valid": active["valid"],
            "payload": active.get("payload"),
            "db_row": {k: v for k, v in (active["db_row"] or {}).items() if k != "key"} if active.get("db_row") else None,
        },
        "product": LICENSE_PRODUCT,
    })


@route("POST", "/api/license/generate", roles=ADMINS)
def license_generate(h, u, _):
    b = h.body()
    client = str(b.get("client_name") or b.get("clientName") or "Cuadre Pinar").strip()[:120]
    ltype = str(b.get("type") or "FULL").upper()
    if ltype not in ("TRIAL", "FULL", "ENTERPRISE", "LIFETIME"):
        ltype = "FULL"
    days = b.get("days")
    if days is None:
        days = 365 if ltype != "LIFETIME" else 0
    try:
        days_int = int(days)
    except Exception:
        if str(days).upper() in ("NEVER", "LIFETIME", "PERMANENTE", "0"):
            days_int = 0
        else:
            days_int = 365
    max_users = int(b.get("max_users") or b.get("maxUsers") or 20)
    max_devices = int(b.get("max_devices") or b.get("maxDevices") or 10)
    features = b.get("features") or ["*"]
    payload = generate_license_payload(client_name=client, product=LICENSE_PRODUCT, license_type=ltype, days=days_int, max_users=max_users, max_devices=max_devices, features=features)
    token = create_license_token(payload)
    # Guarda como inactiva hasta que se active (o activa directamente si se pide)
    auto_activate = bool(b.get("activate"))
    q("INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users, max_devices, features, active, created_by, created_at, last_verified, metadata) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      (token, payload["client_name"], payload["product"], payload["type"], payload["issued_at"], payload["expires_at"],
       payload["max_users"], payload["max_devices"], json.dumps(payload["features"], ensure_ascii=False),
       1 if auto_activate else 0, u["username"], now(), now(),
       json.dumps({"generated_by": u["username"], "license_id": payload["license_id"]}, ensure_ascii=False)))
    if auto_activate:
        q("UPDATE licenses SET active=0 WHERE id<>? AND product=?", (q("SELECT id FROM licenses WHERE key=?", (token,), one=True)["id"], LICENSE_PRODUCT))
    audit(u["username"], "LICENSE_GENERATE", f"Licencia generada · {payload['license_id']} · {client} · {ltype} · {days_int}d", h.ip())
    h.send_json(200, {
        "ok": True,
        "license_key": token,
        "formattedKey": format_license_key(token),
        "payload": payload,
    })


@route("DELETE", "/api/license/:id", roles=ADMINS)
def license_revoke(h, u, ident):
    row = q("SELECT * FROM licenses WHERE id=?", (ident,), one=True)
    if not row:
        return h.err(404, "Licencia no encontrada.")
    # No permitir dejar el sistema sin licencia válida
    active_count = q("SELECT COUNT(*) as c FROM licenses WHERE active=1 AND id<>?", (ident,), one=True)
    if row["active"] and (not active_count or active_count["c"] == 0):
        # Permite revocar pero crea trial si no queda ninguna? Mejor bloquear y pedir generar otra primero
        return h.err(400, "No puedes revocar la única licencia activa. Genera otra licencia primero.")
    q("UPDATE licenses SET active=0 WHERE id=?", (ident,))
    q("UPDATE license_activations SET active=0 WHERE license_id=?", (ident,))
    audit(u["username"], "LICENSE_REVOKE", f"Licencia revocada · {row['client_name']} · {row['key'][:20]}...", h.ip())
    h.send_json(200, {"ok": True})


# ------------------------------------------------------------------ autenticación
@route("GET", "/api/health", need=False)
def health(h, u, _):
    lic = get_active_license_info()
    h.send_json(200, {"ok": True, "https": h.secure(), "time": now(), "licenseValid": lic["valid"], "licenseType": (lic["payload"] or {}).get("type") if lic["valid"] else None})


def new_session(h, user):
    tok = secrets.token_urlsafe(32)
    sid = secrets.token_hex(8)
    q("INSERT INTO sessions(id,token_hash,user_id,created,last_seen,ip,ua) VALUES(?,?,?,?,?,?,?)",
      (sid, hashlib.sha256(tok.encode()).hexdigest(), user["id"], now(), now(), h.ip(), (h.headers.get("User-Agent") or "")[:200]))
    q("UPDATE users SET last_login=? WHERE id=?", (now(), user["id"]))
    return tok


@route("POST", "/api/login", need=False)
def login(h, _, __):
    b = h.body()
    username = str(b.get("username", "")).strip()
    k = f"{username.lower()}|{h.ip()}"
    f = q("SELECT * FROM fails WHERE k=?", (k,), one=True)
    if f and f["until"] > now():
        return h.err(429, f"Demasiados intentos. Espera {max(1, (f['until'] - now()) // 60)} min.")
    user = q("SELECT * FROM users WHERE username=?", (username,), one=True)
    if not user or not user["active"] or not check_pw(str(b.get("password", "")), user["pw_hash"]):
        n = (f["n"] if f else 0) + 1
        q("INSERT OR REPLACE INTO fails(k,n,until) VALUES(?,?,?)", (k, 0 if n >= 5 else n, now() + 300 if n >= 5 else 0))
        audit(username, "LOGIN_FAIL", f"intento {n}/5", h.ip())
        return h.err(401, "Demasiados intentos. Cuenta bloqueada 5 minutos." if n >= 5 else f"Usuario o contraseña incorrectos. Intentos restantes: {5 - n}.")
    if user["totp_enabled"]:
        code = b.get("code")
        if not code: return h.send_json(200, {"need2fa": True})
        step = totp_verify(user["totp_secret"], code, user["totp_last"])
        if step: q("UPDATE users SET totp_last=? WHERE id=?", (step, user["id"]))
        else:
            rec = json.loads(user["recovery"] or "[]")
            hc = hashlib.sha256(re.sub(r"\W", "", str(code)).upper().encode()).hexdigest()
            if hc in rec:
                rec.remove(hc)
                q("UPDATE users SET recovery=? WHERE id=?", (json.dumps(rec), user["id"]))
                audit(user["username"], "2FA_RECOVERY", f"Código de recuperación usado ({len(rec)} restantes)", h.ip())
            else:
                n = (f["n"] if f else 0) + 1
                q("INSERT OR REPLACE INTO fails(k,n,until) VALUES(?,?,?)", (k, 0 if n >= 5 else n, now() + 300 if n >= 5 else 0))
                audit(username, "2FA_FAIL", "", h.ip())
                return h.send_json(401, {"error": "Código de verificación incorrecto.", "need2fa": True})
    q("DELETE FROM fails WHERE k=?", (k,))
    tok = new_session(h, user)
    audit(user["username"], "LOGIN", h.headers.get("User-Agent", "")[:80], h.ip())
    h.send_json(200, {"token": tok, "user": public_user(user), "idleMinutes": IDLE // 60}, cookies=[h.cookie(tok)])


@route("POST", "/api/logout")
def logout(h, u, _):
    q("DELETE FROM sessions WHERE id=?", (u["sid"],))
    audit(u["username"], "LOGOUT", "", h.ip())
    h.send_json(200, {"ok": True}, cookies=[h.cookie("", clear=True)])


@route("POST", "/api/logout-all")
def logout_all(h, u, _):
    q("DELETE FROM sessions WHERE user_id=? AND id<>?", (u["user_id"], u["sid"]))
    audit(u["username"], "LOGOUT_ALL", "Cerró las demás sesiones", h.ip())
    h.send_json(200, {"ok": True})


@route("GET", "/api/me")
def me(h, u, _):
    usr = q("SELECT * FROM users WHERE id=?", (u["user_id"],), one=True)
    h.send_json(200, {"user": public_user(usr), "idleMinutes": IDLE // 60, "https": h.secure()})


@route("GET", "/api/sessions")
def sessions(h, u, _):
    rows = q("SELECT id,created,last_seen,ip,ua FROM sessions WHERE user_id=? ORDER BY last_seen DESC", (u["user_id"],))
    h.send_json(200, {"sessions": [dict(r, current=(r["id"] == u["sid"])) for r in rows]})


@route("DELETE", "/api/sessions/:id")
def kill_session(h, u, sid):
    q("DELETE FROM sessions WHERE id=? AND user_id=?", (sid, u["user_id"]))
    audit(u["username"], "SESSION_REVOKE", sid, h.ip())
    h.send_json(200, {"ok": True})


@route("POST", "/api/password")
def change_pw(h, u, _):
    b = h.body()
    usr = q("SELECT * FROM users WHERE id=?", (u["user_id"],), one=True)
    if not check_pw(b.get("current", ""), usr["pw_hash"]): return h.err(400, "La contraseña actual no es correcta.")
    e = pw_policy(b.get("new"))
    if e: return h.err(400, e)
    q("UPDATE users SET pw_hash=?, pw_changed=? WHERE id=?", (hash_pw(b["new"]), now(), usr["id"]))
    q("DELETE FROM sessions WHERE user_id=? AND id<>?", (usr["id"], u["sid"]))
    audit(usr["username"], "PASSWORD_CHANGE", "", h.ip())
    h.send_json(200, {"ok": True})


@route("GET", "/api/question", need=False)
def question(h, _, __):
    un = parse_qs(urlparse(h.path).query).get("u", [""])[0]
    r = q("SELECT question FROM users WHERE username=? AND active=1", (un,), one=True)
    h.send_json(200, {"question": r["question"] if r else "¿Ciudad de la tienda?"})  # no revela si el usuario existe


@route("POST", "/api/recover", need=False)
def recover(h, _, __):
    b = h.body()
    k = f"recover|{h.ip()}"
    f = q("SELECT * FROM fails WHERE k=?", (k,), one=True)
    if f and f["until"] > now(): return h.err(429, "Demasiados intentos. Espera unos minutos.")
    usr = q("SELECT * FROM users WHERE username=? AND active=1", (str(b.get("username", "")).strip(),), one=True)
    if not usr or not check_pw(str(b.get("answer", "")).strip().lower(), usr["answer_hash"]):
        n = (f["n"] if f else 0) + 1
        q("INSERT OR REPLACE INTO fails(k,n,until) VALUES(?,?,?)", (k, 0 if n >= 5 else n, now() + 600 if n >= 5 else 0))
        return h.err(400, "Datos de recuperación incorrectos.")
    if usr["totp_enabled"]:
        if not totp_verify(usr["totp_secret"], b.get("code"), usr["totp_last"]):
            return h.send_json(400, {"error": "Esta cuenta tiene verificación en dos pasos: indica el código.", "need2fa": True})
    e = pw_policy(b.get("newPassword"))
    if e: return h.err(400, e)
    q("UPDATE users SET pw_hash=?, pw_changed=? WHERE id=?", (hash_pw(b["newPassword"]), now(), usr["id"]))
    q("DELETE FROM sessions WHERE user_id=?", (usr["id"],))
    audit(usr["username"], "PASSWORD_RESET", "Recuperación por pregunta", h.ip())
    h.send_json(200, {"ok": True})


# ------------------------------------------------------------------ 2FA
@route("POST", "/api/2fa/setup")
def tfa_setup(h, u, _):
    secret = base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")
    q("UPDATE users SET totp_pending=? WHERE id=?", (secret, u["user_id"]))
    uri = f"otpauth://totp/{quote(ISSUER)}:{quote(u['username'])}?secret={secret}&issuer={quote(ISSUER)}&algorithm=SHA1&digits=6&period=30"
    h.send_json(200, {"secret": secret, "uri": uri})


@route("POST", "/api/2fa/enable")
def tfa_enable(h, u, _):
    b = h.body()
    usr = q("SELECT * FROM users WHERE id=?", (u["user_id"],), one=True)
    if not usr["totp_pending"]: return h.err(400, "Primero genera el código QR.")
    step = totp_verify(usr["totp_pending"], b.get("code"))
    if not step: return h.err(400, "Código incorrecto. Revisa la hora del teléfono.")
    codes = [f"{secrets.token_hex(2)}-{secrets.token_hex(2)}".upper() for _ in range(8)]
    q("UPDATE users SET totp_secret=totp_pending, totp_pending=NULL, totp_enabled=1, totp_last=?, recovery=? WHERE id=?",
      (step, json.dumps([hashlib.sha256(c.replace("-", "").encode()).hexdigest() for c in codes]), usr["id"]))
    audit(usr["username"], "2FA_ON", "", h.ip())
    h.send_json(200, {"ok": True, "recoveryCodes": codes})


@route("POST", "/api/2fa/disable")
def tfa_disable(h, u, _):
    b = h.body()
    usr = q("SELECT * FROM users WHERE id=?", (u["user_id"],), one=True)
    if not check_pw(b.get("password", ""), usr["pw_hash"]): return h.err(400, "Contraseña incorrecta.")
    if usr["totp_enabled"] and not totp_verify(usr["totp_secret"], b.get("code"), usr["totp_last"]):
        return h.err(400, "Código incorrecto.")
    q("UPDATE users SET totp_enabled=0, totp_secret=NULL, recovery='[]' WHERE id=?", (usr["id"],))
    audit(usr["username"], "2FA_OFF", "", h.ip())
    h.send_json(200, {"ok": True})


# ------------------------------------------------------------------ usuarios (admin)
@route("GET", "/api/users")
def users(h, u, _):
    h.send_json(200, {"users": [public_user(r) for r in q("SELECT * FROM users ORDER BY id")]})


@route("POST", "/api/users", roles=ADMINS)
def user_create(h, u, _):
    b = h.body()
    if b.get("role") not in ROLES: return h.err(400, "Rol inválido.")
    if not re.fullmatch(r"[\w.\-]{3,32}", b.get("username", "")): return h.err(400, "Usuario inválido (3–32 letras/números).")
    e = pw_policy(b.get("password"))
    if e: return h.err(400, e)
    if q("SELECT 1 FROM users WHERE username=?", (b["username"],), one=True): return h.err(409, "Ese usuario ya existe.")
    q("INSERT INTO users(username,display_name,email,role,pw_hash,question,answer_hash,created_at,pw_changed) VALUES(?,?,?,?,?,?,?,?,?)",
      (b["username"], b.get("displayName") or b["username"], b.get("email", ""), b["role"], hash_pw(b["password"]),
       b.get("securityQuestion") or "¿Ciudad de la tienda?", hash_pw(str(b.get("answer") or secrets.token_hex(8)).strip().lower()), now(), now()))
    audit(u["username"], "USER_CREATE", f"{b['username']} ({b['role']})", h.ip())
    h.send_json(200, {"ok": True})


@route("PUT", "/api/users/:id", roles=ADMINS)
def user_update(h, u, ident):
    b = h.body()
    usr = q("SELECT * FROM users WHERE id=?", (ident,), one=True)
    if not usr: return h.err(404, "No encontrado.")
    role = b.get("role", usr["role"])
    active = int(b.get("active", usr["active"]))
    if role not in ROLES: return h.err(400, "Rol inválido.")
    if usr["role"] == "ADMINISTRADOR" and (role != "ADMINISTRADOR" or not active):
        if not q("SELECT 1 FROM users WHERE role='ADMINISTRADOR' AND active=1 AND id<>?", (usr["id"],), one=True):
            return h.err(400, "No se puede quitar al último administrador.")
    q("UPDATE users SET display_name=?, email=?, role=?, active=? WHERE id=?",
      (b.get("displayName", usr["display_name"]), b.get("email", usr["email"]), role, active, usr["id"]))
    if b.get("password"):
        e = pw_policy(b["password"])
        if e: return h.err(400, e)
        q("UPDATE users SET pw_hash=?, pw_changed=? WHERE id=?", (hash_pw(b["password"]), now(), usr["id"]))
    if b.get("reset2fa"): q("UPDATE users SET totp_enabled=0, totp_secret=NULL, recovery='[]' WHERE id=?", (usr["id"],))
    if not active or b.get("password"): q("DELETE FROM sessions WHERE user_id=?", (usr["id"],))
    audit(u["username"], "USER_UPDATE", f"{usr['username']} rol={role} activo={active}", h.ip())
    h.send_json(200, {"ok": True})


# ------------------------------------------------------------------ estado compartido
def closed_set():
    return {r["date"] for r in q("SELECT date FROM closed_days")}


@route("GET", "/api/state")
def state_get(h, u, _):
    r = q("SELECT * FROM app_state WHERE id=1", one=True)
    if r["data"]:
        st, changed = ensure_warehouses(json.loads(r["data"]))
        if changed:
            with _lock:
                v = q("SELECT version FROM app_state WHERE id=1", one=True)["version"] + 1
                q("UPDATE app_state SET version=?, data=?, updated_at=?, updated_by=? WHERE id=1",
                  (v, json.dumps(st, ensure_ascii=False, separators=(",", ":")), now(), "conversión a almacenes"))
            r = q("SELECT * FROM app_state WHERE id=1", one=True)
            audit(u["username"], "MIGRATE", "Datos convertidos al módulo de almacenes", h.ip())
    h.send_json(200, {"version": r["version"], "state": json.loads(r["data"]) if r["data"] else None, "updatedBy": r["updated_by"],
                      "updatedAt": r["updated_at"], "closedDays": [dict(x, snapshot=None) for x in q("SELECT date,closed_by,closed_at,note FROM closed_days ORDER BY date DESC")]})


@route("GET", "/api/state/version")
def state_version(h, u, _):
    r = q("SELECT version,updated_by,updated_at FROM app_state WHERE id=1", one=True)
    h.send_json(200, {"version": r["version"], "updatedBy": r["updated_by"], "closed": len(closed_set())})


@route("PUT", "/api/state")
def state_put(h, u, _):
    b = h.body()
    with _lock:
        r = q("SELECT * FROM app_state WHERE id=1", one=True)
        if int(b.get("version", -1)) != r["version"]:
            return h.send_json(409, {"error": "Otro usuario guardó cambios antes. Se recargarán los datos.", "version": r["version"]})
        new = b.get("state")
        if r["data"] is not None and isinstance(new, dict):
            # Un cliente con la interfaz antigua (caché del navegador) no manda estas
            # secciones: se conservan las que ya hay en el servidor.
            old = json.loads(r["data"]) or {}
            for k in ("warehouses", "warehouseEntries"):
                if k not in new:
                    new[k] = old.get(k)
        if r["data"] is None:
            if u["role"] not in ADMINS: return h.err(403, "Solo un administrador puede inicializar los datos.")
        else:
            bad = validate_change(json.loads(r["data"]), new, u["role"], closed_set())
            if bad: return h.err(*bad)
        v = r["version"] + 1
        q("UPDATE app_state SET version=?, data=?, updated_at=?, updated_by=? WHERE id=1",
          (v, json.dumps(new, ensure_ascii=False, separators=(",", ":")), now(), u["display_name"]))
    if r["data"] is None: audit(u["username"], "SEED", "Datos iniciales cargados desde el Excel", h.ip())
    h.send_json(200, {"ok": True, "version": v})


# ------------------------------------------------------------------ cierre del día
@route("POST", "/api/days/close", roles=CLOSE_DAY)
def day_close(h, u, _):
    b = h.body()
    d = str(b.get("date", ""))
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", d): return h.err(400, "Fecha inválida.")
    if q("SELECT 1 FROM closed_days WHERE date=?", (d,), one=True): return h.err(409, "Ese día ya está cerrado.")
    st = json.loads(q("SELECT data FROM app_state WHERE id=1", one=True)["data"] or "{}")
    snap = {"cuadre": next((c for c in st.get("cuadres", []) if c.get("date") == d), None),
            "movements": [m for m in st.get("movements", []) if m.get("date") == d]}
    q("INSERT INTO closed_days(date,closed_by,closed_at,note,snapshot) VALUES(?,?,?,?,?)",
      (d, u["display_name"], now(), str(b.get("note", ""))[:300], json.dumps(snap, ensure_ascii=False)))
    audit(u["username"], "DAY_CLOSE", f"{d} · {b.get('note', '')}", h.ip())
    h.send_json(200, {"ok": True})


@route("POST", "/api/days/reopen", roles={"ADMINISTRADOR"})
def day_reopen(h, u, _):
    b = h.body()
    reason = str(b.get("reason", "")).strip()
    if len(reason) < 5: return h.err(400, "Indica el motivo de la reapertura (mín. 5 caracteres).")
    q("DELETE FROM closed_days WHERE date=?", (b.get("date"),))
    audit(u["username"], "DAY_REOPEN", f"{b.get('date')} · motivo: {reason}", h.ip())
    h.send_json(200, {"ok": True})


# ------------------------------------------------------------------ copias
@route("GET", "/api/backups", roles=ADMINS)
def backups_list(h, u, _):
    out = []
    for f in sorted(os.listdir(BACKUPS), reverse=True):
        if f.endswith(".bak"):
            st = os.stat(os.path.join(BACKUPS, f))
            out.append({"name": f, "size": st.st_size, "createdAt": int(st.st_mtime), "kind": "auto" if "_auto" in f else "manual"})
    h.send_json(200, {"backups": out, "keep": BACKUP_KEEP, "hour": BACKUP_HOUR})


@route("POST", "/api/backups", roles=ADMINS)
def backups_create(h, u, _):
    h.send_json(200, {"ok": True, "name": make_backup("manual", u["username"])})


@route("GET", "/api/backups/:id", roles={"ADMINISTRADOR"})
def backups_download(h, u, name):
    data = read_backup(name)
    data.pop("users", None)  # nunca se descargan hashes de contraseñas
    audit(u["username"], "BACKUP_DOWNLOAD", name, h.ip())
    h.send_json(200, data)


@route("POST", "/api/backups/:id", roles={"ADMINISTRADOR"})
def backups_restore(h, u, name):
    data = read_backup(name)
    make_backup("pre-restore", u["username"])
    with _lock:
        v = q("SELECT version FROM app_state WHERE id=1", one=True)["version"] + 1
        q("UPDATE app_state SET version=?, data=?, updated_at=?, updated_by=? WHERE id=1",
          (v, json.dumps(data["state"], ensure_ascii=False) if data.get("state") else None, now(), u["display_name"]))
        q("DELETE FROM closed_days")
        for c in data.get("closedDays", []):
            q("INSERT INTO closed_days(date,closed_by,closed_at,note,snapshot) VALUES(?,?,?,?,?)",
              (c["date"], c["closed_by"], c["closed_at"], c.get("note"), c.get("snapshot")))
        # Restaura licencias si el backup las contiene (no borra actuales, solo inserta/actualiza)
        if data.get("licenses"):
            for lic in data["licenses"]:
                try:
                    q("INSERT OR REPLACE INTO licenses(id,license_id,client_name,product,type,issued_at,expires_at,max_users,max_devices,features,token,status,activated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                      (lic.get("id"), lic.get("license_id"), lic.get("client_name"), lic.get("product"), lic.get("type"),
                       lic.get("issued_at"), lic.get("expires_at"), lic.get("max_users"), lic.get("max_devices"),
                       lic.get("features"), lic.get("token"), lic.get("status"), lic.get("activated_at"), lic.get("created_at")))
                except Exception:
                    pass
        if data.get("licenseActivations"):
            for act in data["licenseActivations"]:
                try:
                    q("INSERT OR IGNORE INTO license_activations(id,license_id,device_id,device_info,activated_at,last_seen) VALUES(?,?,?,?,?,?)",
                      (act.get("id"), act.get("license_id"), act.get("device_id"), act.get("device_info"), act.get("activated_at"), act.get("last_seen")))
                except Exception:
                    pass
    audit(u["username"], "BACKUP_RESTORE", name, h.ip())
    h.send_json(200, {"ok": True, "version": v})


@route("GET", "/api/security-log", roles=ADMINS | {"ECONOMICO"})
def sec_log(h, u, _):
    rows = q("SELECT ts,user,action,details,ip FROM audit ORDER BY id DESC LIMIT 500")
    h.send_json(200, {"log": [dict(r) for r in rows]})


def main():
    init_db()
    migrate_state()
    threading.Thread(target=backup_loop, daemon=True).start()
    port = int(os.environ.get("PORT", "8080"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Api)
    if HTTPS:
        import ssl
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(CERT, KEY)
        httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    print(f"Cuadre Pinar en {'https' if HTTPS else 'http'}://0.0.0.0:{port} · datos en {DATA}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
