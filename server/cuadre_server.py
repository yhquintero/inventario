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

# Quién puede modificar cada sección del estado compartido
WRITE = {
    "products": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "movements": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "priceHistory": {"ADMINISTRADOR", "JEFE", "ALMACENERO"},
    "cuadres": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "rates": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "weekly": {"ADMINISTRADOR", "JEFE", "ECONOMICO"},
    "settings": {"ADMINISTRADOR", "JEFE"},
    "audit": set(ROLES),
}
CLOSE_DAY = {"ADMINISTRADOR", "JEFE", "ECONOMICO"}
MOV_CORE = ("date", "productId", "type", "quantity", "unitPriceUsd", "center", "domicilioCup", "deletedAt", "notes")

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
    """)
    CON.commit()
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


# ------------------------------------------------------------------ autenticación
@route("GET", "/api/health", need=False)
def health(h, u, _):
    h.send_json(200, {"ok": True, "https": h.secure(), "time": now()})


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
    audit(u["username"], "BACKUP_RESTORE", name, h.ip())
    h.send_json(200, {"ok": True, "version": v})


@route("GET", "/api/security-log", roles=ADMINS | {"ECONOMICO"})
def sec_log(h, u, _):
    rows = q("SELECT ts,user,action,details,ip FROM audit ORDER BY id DESC LIMIT 500")
    h.send_json(200, {"log": [dict(r) for r in rows]})


def main():
    init_db()
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
