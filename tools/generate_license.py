#!/usr/bin/env python3
"""
Emisor de licencias de uso para NovaGest (licencias v2: firmadas y ligadas a UN dispositivo).

Primera vez (una sola vez, en el equipo del EMISOR):
  python3 tools/generate_license.py --init-keys
    · crea la llave PRIVADA de firma en ~/.novagest-emisor/license-signing-key.pem
      (o en NOVAGEST_SIGNING_KEY). Guárdela con copia de seguridad: sin ella no se
      pueden emitir más licencias para esta instalación. NUNCA la copie al cliente.
    · escribe la llave PÚBLICA en server/license_public_keys.pem y en la app Android
      (app/src/main/java/.../security/LicensePublicKeys.kt). Distribuya el servidor y
      recompile el APK después de esto.

Emitir:
  python3 tools/generate_license.py --client "Mi Tienda" --device WEB-ABCD-EFGH-IJKL-MNOP-QRST --term MES
  python3 tools/generate_license.py --client "Mi Tienda" --device AND-ABCD-EFGH-IJKL-MNOP-QRST --type FULL --days 365
  python3 tools/generate_license.py --requests          # solicitudes recibidas por WhatsApp (Web/Android)
  python3 tools/generate_license.py --request 3         # emite la clave de la solicitud #3 y la deja atendida
  python3 tools/generate_license.py --verify NG2-…      # comprueba una clave (firma, contenido y vigencia)

Cada licencia cubre 4 usuarios (uno por rol: ADMINISTRADOR, JEFE, ECONOMICO, ALMACENERO)
y 1 dispositivo: el del ID indicado (el que el cliente ve en su pantalla de licencia).
Plazos (--term): DIA=1, SEMANA=7, MES=30, TRIMESTRE=90, SEMESTRE=180, ANIO=365,
DOS_ANIOS=730, PERMANENTE=0 (LIFETIME). Son los que el cliente elige al pedirla.
"""
import argparse
import getpass
import json
import os
import sqlite3
import sys
import time
from urllib.parse import quote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "server"))
import novagest_license as lic2  # noqa: E402  (firma ECDSA, ID de dispositivo, formato NG2)

TERMS = {
    "DIA": (1, "FULL"), "SEMANA": (7, "FULL"), "MES": (30, "FULL"),
    "TRIMESTRE": (90, "FULL"), "SEMESTRE": (180, "FULL"), "ANIO": (365, "FULL"),
    "DOS_ANIOS": (730, "FULL"), "PERMANENTE": (0, "LIFETIME"),
}
DATA = os.environ.get("DATA_DIR", os.path.join(ROOT, "data"))
LicenseError = lic2.LicenseError


# ------------------------------------------------------------------ firma (equipo del emisor)
def signing_key_path():
    return lic2.default_signing_key_path()


def load_signing_key():
    """Llave privada del emisor (LicenseError con instrucciones si falta)."""
    try:
        return lic2.load_signing_key()
    except LicenseError as e:
        if e.code in ("SIGNING_KEY_MISSING", "SIGNING_KEY_UNTRUSTED"):
            raise LicenseError(e.code, e.message + " Si es la primera vez: python tools/generate_license.py --init-keys")
        raise


def signing_status():
    """Estado de la llave de firma para mostrarlo (nunca muestra la llave)."""
    ruta = signing_key_path()
    try:
        k = lic2.load_signing_key()
        return {"ok": True, "path": ruta, "kid": lic2.key_id(k.public_key()), "error": ""}
    except LicenseError as e:
        return {"ok": False, "path": ruta, "kid": "", "error": e.message, "code": e.code}


def init_keys(force=False, password=None):
    kid, ruta, creada = lic2.init_signing_keys(force=force, password=password)
    lic2.reload_public_keys()
    return kid, ruta, creada


def issue(client, device_id, days=30, license_type="FULL", product="NovaGest", features=None, signing_key=None):
    """Emite una licencia v2 para `device_id`. Devuelve (payload, clave)."""
    k = signing_key or load_signing_key()
    payload = lic2.build_payload(client, device_id, days, license_type, product, features)
    token = lic2.sign_license(payload, k)
    return lic2.parse_license(token), token


def issue_term(client, device_id, term_id, license_type=None, product="NovaGest", features=None):
    dias, tipo = TERMS.get(str(term_id or "").upper(), TERMS["MES"])
    return issue(client, device_id, dias, license_type or tipo, product, features)


def verify(token):
    """Contenido de una clave válida (firma del emisor) o None."""
    try:
        return lic2.parse_license(token)
    except LicenseError:
        return None


# ------------------------------------------------------------------ base de datos del servidor
def _db_tiene_tablas(ruta: str) -> bool:
    try:
        if not os.path.exists(ruta) or os.path.getsize(ruta) == 0:
            return False
        con = sqlite3.connect(ruta, timeout=10)  # existe: no se crea nada
        try:
            return con.execute("SELECT 1 FROM sqlite_master WHERE type='table' LIMIT 1").fetchone() is not None
        finally:
            con.close()
    except sqlite3.Error:
        return False


def db_path() -> str:
    """La misma base que usa el servidor (server/novagest_server.py · resolve_db_path):
    data/novagest.db o, en instalaciones antiguas, data/cuadre.db."""
    nueva = os.path.join(DATA, "novagest.db")
    antigua = os.path.join(DATA, "cuadre.db")
    if os.path.exists(antigua) and (not os.path.exists(nueva) or (not _db_tiene_tablas(nueva) and _db_tiene_tablas(antigua))):
        return antigua
    return nueva


def db_rows(sql: str, args: tuple = ()):
    """Lee de la base del servidor (solicitudes de licencia). Devuelve [] si no existe."""
    if not os.path.exists(db_path()):
        return []
    con = sqlite3.connect(db_path(), timeout=10)
    con.row_factory = sqlite3.Row
    try:
        return con.execute(sql, args).fetchall()
    except sqlite3.Error:
        return []
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
        valido = "" if lic2.valid_device_id(r["device_id"]) else "  ⚠ ID del formato anterior: pida una solicitud nueva"
        print(f"   Dispositivo: {r['device_id']}{valido}   Teléfono: {r['phone'] or '—'}")
    print("\nPara crear la clave de una solicitud:  python3 tools/generate_license.py --request <ID>\n")


def mostrar_verificacion(token):
    try:
        p = lic2.parse_license(token)
    except LicenseError as e:
        print(f"\n✖ Clave NO válida ({e.code}): {e.message}\n")
        return 1
    estado = lic2.license_time_state(p, time.time())
    print("\n✔ Firma del emisor correcta (kid " + p.get("kid", "") + ")")
    print(f"  Cliente: {p['client_name']} · Tipo: {p['type']} · ID {p['license_id']}")
    print(f"  Dispositivo: {p['device_id']} ({lic2.PLATFORM_LABEL.get(p['platform'], p['platform'])})")
    print(f"  Límites: {p['max_users']} usuarios (uno por rol) · {p['max_devices']} dispositivo")
    print(f"  Emitida: {time.strftime('%d/%m/%Y', time.localtime(p['issued_at']))} · "
          f"Expira: {'Permanente' if not p['expires_at'] else time.strftime('%d/%m/%Y', time.localtime(p['expires_at']))}"
          f" · Estado (reloj de este equipo): {estado}\n")
    return 0


def main():
    p = argparse.ArgumentParser(description="Emisor de licencias NovaGest (v2: firmadas y ligadas a un dispositivo)")
    p.add_argument("--init-keys", action="store_true", help="Crea la llave de firma del emisor y publica su llave pública (una vez)")
    p.add_argument("--force", action="store_true", help="Con --init-keys: crea una llave NUEVA aunque ya exista una (rotación)")
    p.add_argument("--password", action="store_true", help="Con --init-keys: protege la llave privada con contraseña (pedida por teclado)")
    p.add_argument("--client", default="", help="Nombre del cliente")
    p.add_argument("--device", default="", help="ID del dispositivo (WEB-XXXX-… o AND-XXXX-…, de la pantalla de licencia)")
    p.add_argument("--product", default="NovaGest", help="Producto")
    p.add_argument("--term", default=None, choices=list(TERMS), help="Plazo de la licencia (manda sobre --type/--days)")
    p.add_argument("--type", default="FULL", choices=list(lic2.LICENSE_TYPES), help="Tipo de licencia")
    p.add_argument("--days", type=int, default=365, help="Días de validez (0=permanente)")
    p.add_argument("--users", type=int, default=None, help=argparse.SUPPRESS)
    p.add_argument("--devices", type=int, default=None, help=argparse.SUPPRESS)
    p.add_argument("--features", default="*", help="Features separadas por coma, * = todas")
    p.add_argument("--requests", action="store_true", help="Lista las solicitudes de licencia recibidas y termina")
    p.add_argument("--request", type=int, default=None, help="Emite la clave de la solicitud con ese ID (la marca atendida)")
    p.add_argument("--verify", default=None, metavar="CLAVE", help="Comprueba una clave NG2 y termina")
    args = p.parse_args()

    if args.init_keys:
        clave = None
        if args.password:
            clave = getpass.getpass("Contraseña para la llave privada: ")
            if clave != getpass.getpass("Repita la contraseña: "):
                sys.exit("Las contraseñas no coinciden.")
        kid, ruta, creada = init_keys(force=args.force, password=clave)
        print(("\n✔ Llave de firma CREADA" if creada else "\n✔ Llave de firma existente") + f": {ruta}  (kid {kid})")
        print(f"✔ Llave pública en: {lic2.PUBLIC_KEYS_FILE}")
        print(f"✔ Llave pública para Android en: {lic2.ANDROID_KEYS_FILE}")
        print("\nSiguientes pasos:")
        print("  1. Haga una copia de seguridad de la llave PRIVADA (fuera de este equipo y del repositorio).")
        print("  2. Distribuya el servidor con server/license_public_keys.pem y recompile el APK de Android.")
        print("  3. Emita las licencias con el ID de dispositivo de cada cliente.\n")
        if clave:
            print("  (Para firmar, defina NOVAGEST_SIGNING_KEY_PASSWORD con esa contraseña.)\n")
        return 0
    if args.verify:
        return mostrar_verificacion(args.verify)
    if args.requests:
        listar_solicitudes()
        return 0
    if args.users is not None or args.devices is not None:
        print("Aviso: los límites son fijos en las licencias v2 (4 usuarios, uno por rol · 1 dispositivo); se ignoran --users/--devices.")

    solicitud = None
    if args.request:
        rows = db_rows("SELECT * FROM license_requests WHERE id=?", (args.request,))
        if not rows:
            sys.exit(f"No existe la solicitud #{args.request} en {db_path()}")
        solicitud = rows[0]
        # El cliente, el dispositivo y el plazo salen de la propia solicitud
        args.client = solicitud["client_name"]
        args.device = solicitud["device_id"]
        term_id = (solicitud["term"] or "MES").upper()
        args.term = term_id if term_id in TERMS else "MES"
    if args.term:
        args.days, args.type = TERMS[args.term]
    if not args.client:
        sys.exit("Indique --client (nombre del cliente) o --request <ID>.")
    if not args.device:
        sys.exit("Indique --device con el ID del dispositivo del cliente (WEB-… o AND-…).")
    features = [f.strip() for f in args.features.split(",") if f.strip()] or ["*"]
    try:
        payload, token = issue(args.client, args.device, args.days, args.type, args.product, features)
    except LicenseError as e:
        sys.exit(f"No se pudo emitir la licencia: {e.message}")
    expires = payload["expires_at"]
    print("\n=== Licencia de Uso emitida ===")
    print(f"Cliente: {payload['client_name']}")
    print(f"Producto: {payload['product']}")
    print(f"Tipo: {payload['type']}")
    print(f"ID: {payload['license_id']}")
    print(f"Dispositivo: {payload['device_id']} ({lic2.PLATFORM_LABEL[payload['platform']]})")
    print(f"Límites: {payload['max_users']} usuarios (uno por rol) · {payload['max_devices']} dispositivo")
    print(f"Emitida: {time.strftime('%d/%m/%Y', time.localtime(payload['issued_at']))}")
    print(f"Expira: {'Permanente' if expires == 0 else time.strftime('%d/%m/%Y', time.localtime(expires))} ({args.days} días)")
    print("\n--- Clave (copiar completa) ---")
    print(token)
    print("\n--- Contenido firmado ---")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("\nEl cliente la pega en «Licencia de uso → Activar licencia» en ESE dispositivo (en otro no funciona).")
    if solicitud:
        telefono = (solicitud["phone"] or "").replace("+", "").strip()
        mensaje = "\n".join([
            "🔐 Tu Licencia de NovaGest ya está lista.",
            "",
            f"👤 Usuario: {payload['client_name']}",
            f"📅 Plan: {solicitud['term_label']} · {payload['type']}",
            f"⏳ Vigencia: {'Permanente' if expires == 0 else time.strftime('%d/%m/%Y', time.localtime(expires))}",
            f"🆔 Dispositivo: {payload['device_id']}",
            "👥 4 usuarios (uno por rol) · 1 dispositivo",
            "",
            "Pega esta clave en la App en «Licencia de uso → Activar licencia» (solo funciona en ese dispositivo):",
            "",
            token,
        ])
        db_exec("UPDATE license_requests SET status='atendida', handled_at=?, handled_by='generate_license.py', license_preview=? WHERE id=?",
                (int(time.time()), token[:14] + "…" + token[-8:], solicitud["id"]))
        print(f"\nSolicitud #{solicitud['id']} de {payload['client_name']} marcada como ATENDIDA.")
        if telefono:
            print(f"\nEnviar por WhatsApp a {telefono}:")
            print(f"  https://wa.me/{telefono}?text={quote(mensaje)}")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
