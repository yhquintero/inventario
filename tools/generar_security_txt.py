#!/usr/bin/env python3
"""Genera web/.well-known/security.txt (RFC 9116) con datos REALES del titular.
Nunca inventa el contacto: sin --contact válido no escribe nada.
Uso: python3 tools/generar_security_txt.py --contact seguridad@tu-negocio.cu [--dias 365]
     python3 tools/generar_security_txt.py --contact https://tu-web.cu/contacto"""
import argparse, datetime as dt, pathlib, re, sys
ROOT = pathlib.Path(__file__).parent.parent
DEST = ROOT / "web" / ".well-known" / "security.txt"

ap = argparse.ArgumentParser()
ap.add_argument("--contact", required=True, help="correo o URL de contacto de seguridad")
ap.add_argument("--dias", type=int, default=365, help="vigencia del Expires (def. 365)")
a = ap.parse_args()
if "[COMPLETAR" in a.contact or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$|^https://", a.contact):
    sys.exit("Contacto no válido: usa tu correo real o una URL https (sin placeholders).")
exp = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=a.dias)).strftime("%Y-%m-%dT%H:%M:%SZ")
contacto = a.contact if a.contact.startswith("https://") else f"mailto:{a.contact}"
DEST.write_text(f"""Contact: {contacto}
Preferred-Languages: es, en
Policy: Divulgación coordinada: gracias por reportar primero en privado; no accedas a datos de terceros ni interrumpas el servicio.
Expires: {exp}
""", encoding="utf-8")
print(f"security.txt generado con Expires {exp}. Revisa y publica; renueva antes de esa fecha.")
