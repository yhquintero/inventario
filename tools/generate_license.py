#!/usr/bin/env python3
"""
Generador de licencias de uso para Cuadre Pinar.
Uso:
  python3 tools/generate_license.py --client "Tienda Pinar" --type FULL --days 365 --users 20 --devices 10
  python3 tools/generate_license.py --client "Demo" --type TRIAL --days 15

La licencia es un token firmado HMAC-SHA256 con el secreto de licencia (LICENSE_SECRET, BACKUP_KEY o data/license.key).
El servidor verifica la firma en /api/license/activate.
"""
import argparse, base64, json, os, sys, hmac, hashlib, secrets, time

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

def main():
    p = argparse.ArgumentParser(description="Generador de licencias Cuadre Pinar")
    p.add_argument("--client", default="Cuadre Pinar", help="Nombre del cliente")
    p.add_argument("--product", default="Cuadre Pinar", help="Producto")
    p.add_argument("--type", default="FULL", choices=["TRIAL","FULL","ENTERPRISE","LIFETIME"], help="Tipo de licencia")
    p.add_argument("--days", type=int, default=365, help="Días de validez (0=permanente)")
    p.add_argument("--users", type=int, default=20, help="Máx usuarios")
    p.add_argument("--devices", type=int, default=10, help="Máx dispositivos")
    p.add_argument("--features", default="*", help="Features separadas por coma, * = todas")
    args = p.parse_args()

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
    pretty = f"CP-{token}"
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
    print("\n--- Con prefijo CP- ---")
    print(pretty)
    print("\n--- Payload ---")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nPara activar: POST /api/license/activate con {\"license_key\": \"<clave>\"}")
    print("O pegar en la pantalla de licencia de la Web/App.\n")

if __name__ == "__main__":
    main()
