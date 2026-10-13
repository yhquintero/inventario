#!/usr/bin/env python3
"""
Generador de licencias de uso para NovaGest v1.0.0.
Uso:
  python3 tools/generate_license.py --client "Mi Tienda" --term MES
  python3 tools/generate_license.py --client "Mi Tienda" --type FULL --days 365 --users 20 --devices 10
  python3 tools/generate_license.py --client "Demo" --type TRIAL --days 15
  python3 tools/generate_license.py --requests          # solicitudes recibidas por WhatsApp (Web/Android)
  python3 tools/generate_license.py --request 3         # genera la clave de la solicitud #3 y la deja atendida

Licencia por término (--term): DIA=1, SEMANA=7, MES=30, TRIMESTRE=90,
SEMESTRE=180, ANIO=365, DOS_ANIOS=730, PERMANENTE=0 (LIFETIME).
Son los mismos plazos que el cliente elige al solicitarla por WhatsApp.
La licencia es un token firmado HMAC-SHA256 con el secreto de licencia (LICENSE_SECRET, BACKUP_KEY o data/license.key).
El servidor verifica la firma en /api/license/activate.
"""

TERMS = {
    "DIA": (1, "FULL"), "SEMANA": (7, "FULL"), "MES": (30, "FULL"),
    "TRIMESTRE": (90, "FULL"), "SEMESTRE": (180, "FULL"), "ANIO": (365, "FULL"),
    "DOS_ANIOS": (730, "FULL"), "PERMANENTE": (0, "LIFETIME"),
}
import argparse, base64, json, os, sqlite3, sys, hmac, hashlib, secrets, time
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.environ.get("DATA_DIR", os.path.join(ROOT, "data"))
LICENSE_FILE = os.path.join(DATA, "license.key")

def b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")

def get_secret() -> bytes:
    for env_key in ("LICENSE_SECRET", "LICENSE_KEY", "BACKUP_KEY"):
        v = os.environ.get(env_key)
        if not v:
            continue
        v = v.strip()
        try:
            raw = base64.urlsafe_b64decode(v + "=" * (-len(v) % 4))
            if len(raw) == 32:
                return raw
        except Exception:
            pass
        return v.encode()
    if os.path.exists(LICENSE_FILE):
        d = open(LICENSE_FILE, "rb").read().strip()
        try:
            raw = base64.urlsafe_b64decode(d + b"=" * (-len(d) % 4))
            if len(raw) == 32:
                return raw
        except Exception:
            pass
        return d
    # Genera nuevo
    os.makedirs(DATA, exist_ok=True)
    secret = secrets.token_bytes(32)
    with open(LICENSE_FILE, "wb") as f:
        f.write(base64.urlsafe_b64encode(secret))
    os.chmod(LICENSE_FILE, 0o600)
    return secret

def sign(b64: str) -> str:
    secret = get_secret()
    return b64url_encode(hmac.new(secret, b64.encode(), hashlib.sha256).digest())

def create_token(payload: dict) -> str:
    jb = json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False).encode()
    b64 = b64url_encode(jb)
    sig = sign(b64)
    return f"{b64}.{sig}"

def db_path() -> str:
    return os.path.join(DATA, "novagest.db")


def db_rows(sql: str, args: tuple = ()):
    """Lee de la base del servidor (solicitudes de licencia). Devuelve [] si no existe."""
    if not os.path.exists(db_path()):
        return []
    con = sqlite3.connect(db_path(), timeout=10)
    con.row_factory = sqlite3.Row
    try:
        return con.execute(sql, args).fetchall()
    finally:
        con.close()


def db_exec(sql: str, args: tuple = ()):
    if not os.path.exists(db_path()):
        return
    con = sqlite3.connect(db_path(), timeout=10)
    try:
        con.execute(sql, args)
        con.commit()
    finally:
        con.close()


def fmt_fecha(ts: int) -> str:
    return time.strftime("%d/%m/%Y, %I:%M:%S %p", time.localtime(ts)) if ts else "—"


def listar_solicitudes():
    rows = db_rows("SELECT * FROM license_requests ORDER BY CASE status WHEN 'pendiente' THEN 0 ELSE 1 END, created_at DESC")
    if not rows:
        print("\nNo hay solicitudes de licencia registradas en " + db_path() + "\n")
        return
    pend = len([r for r in rows if (r["status"] or "pendiente") == "pendiente"])
    print(f"\n=== Solicitudes de licencia ({len(rows)} · {pend} pendiente(s)) ===")
    for r in rows:
        print(f"\n#{r['id']}  [{r['status'] or 'pendiente'}]  {fmt_fecha(r['created_at'])}  ({r['channel'] or 'web'})")
        print(f"   Usuario: {r['client_name']}   Plan: {r['term_label']} ({r['days']} días · {r['license_type']})")
        print(f"   Dispositivo: {r['device_id']}   Teléfono: {r['phone'] or '—'}")
    print("\nPara crear la clave de una solicitud:  python3 tools/generate_license.py --request <ID>\n")


def main():
    p = argparse.ArgumentParser(description="Generador de licencias NovaGest")
    p.add_argument("--client", default="NovaGest", help="Nombre del cliente")
    p.add_argument("--product", default="NovaGest", help="Producto")
    p.add_argument("--term", default=None, choices=list(TERMS), help="Plazo de la licencia (manda sobre --type/--days)")
    p.add_argument("--type", default="FULL", choices=["TRIAL","FULL","ENTERPRISE","LIFETIME"], help="Tipo de licencia")
    p.add_argument("--days", type=int, default=365, help="Días de validez (0=permanente)")
    p.add_argument("--users", type=int, default=20, help="Máx usuarios")
    p.add_argument("--devices", type=int, default=10, help="Máx dispositivos")
    p.add_argument("--features", default="*", help="Features separadas por coma, * = todas")
    p.add_argument("--requests", action="store_true", help="Lista las solicitudes de licencia recibidas y termina")
    p.add_argument("--request", type=int, default=None, help="Genera la clave de la solicitud con ese ID (marca la solicitud como atendida)")
    args = p.parse_args()
    if args.requests:
        listar_solicitudes()
        return
    solicitud = None
    if args.request:
        rows = db_rows("SELECT * FROM license_requests WHERE id=?", (args.request,))
        if not rows:
            sys.exit(f"No existe la solicitud #{args.request} en {db_path()}")
        solicitud = rows[0]
        # El cliente y el plazo salen de la propia solicitud
        args.client = solicitud["client_name"]
        term_id = (solicitud["term"] or "MES").upper()
        args.term = term_id if term_id in TERMS else "MES"
    if args.term:
        args.days, args.type = TERMS[args.term]

    issued = int(time.time())
    expires = 0 if args.days == 0 else issued + args.days * 86400
    payload = {
        "license_id": secrets.token_hex(8).upper(),
        "client_name": args.client,
        "product": args.product,
        "type": args.type,
        "issued_at": issued,
        "expires_at": expires,
        "max_users": args.users,
        "max_devices": args.devices,
        "features": [f.strip() for f in args.features.split(",")] if args.features else ["*"],
        "version": 1,
    }
    token = create_token(payload)
    pretty = f"NG-{token}"
    print("\n=== Licencia de Uso Generada ===")
    print(f"Cliente: {payload['client_name']}")
    print(f"Producto: {payload['product']}")
    print(f"Tipo: {payload['type']}")
    print(f"ID: {payload['license_id']}")
    print(f"Emitida: {time.strftime('%d/%m/%Y', time.localtime(issued))}")
    print(f"Expira: {'Permanente' if expires==0 else time.strftime('%d/%m/%Y', time.localtime(expires))} ({args.days} días)")
    print(f"Usuarios: {args.users}  Dispositivos: {args.devices}")
    print("\n--- Clave (copiar completa) ---")
    print(token)
    print("\n--- Con prefijo NG- ---")
    print(pretty)
    print("\n--- Payload ---")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nPara activar: POST /api/license/activate con {\"license_key\": \"<clave>\"}")
    print("O pegar en la pantalla de licencia de la Web/App.")
    if solicitud:
        telefono = (solicitud["phone"] or "").replace("+", "").strip()
        mensaje = "\n".join([
            f"🔐 Tu Licencia de NovaGest ya está lista.",
            "",
            f"👤 Usuario: {payload['client_name']}",
            f"📅 Plan: {solicitud['term_label']} · {payload['type']}",
            f"⏳ Vigencia: {'Permanente' if expires == 0 else time.strftime('%d/%m/%Y', time.localtime(expires))}",
            "",
            "Pega esta clave en la App en «Licencia de uso → Activar licencia»:",
            "",
            token,
        ])
        db_exec("UPDATE license_requests SET status='atendida', handled_at=?, handled_by='generate_license.py', license_preview=? WHERE id=?",
                (int(time.time()), pretty[:18] + "…" + pretty[-8:], solicitud["id"]))
        print(f"\nSolicitud #{solicitud['id']} de {payload['client_name']} marcada como ATENDIDA.")
        if telefono:
            print(f"\nEnviar por WhatsApp a {telefono}:")
            print(f"  https://wa.me/{telefono}?text={quote(mensaje)}")
    print()

if __name__ == "__main__":
    main()
