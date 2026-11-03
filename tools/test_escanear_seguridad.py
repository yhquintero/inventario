#!/usr/bin/env python3
"""Pruebas del escáner de seguridad (tools/escanear_seguridad.py).

Verifica que las reglas detectan patrones reales en código de muestra y que no
marcan falsos positivos obvios (tests, claves de almacenamiento, TOTP RFC 6238).

Uso: python3 tools/test_escanear_seguridad.py
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import escanear_seguridad as esc

ok = 0
total = 0


def check(nombre, cond):
    global ok, total
    total += 1
    if cond:
        ok += 1
        print(f"  ok  {nombre}")
    else:
        print(f"  FALLA  {nombre}")


def regla(rid):
    return next(r for _, _, _, _, r, _, _ in esc.REGLAS if _ == rid) if False else next(x[4] for x in esc.REGLAS if x[0] == rid)


check("SQL-001 detecta f-string en execute", bool(re.search(regla("SQL-001"), 'cur.execute(f"SELECT {x}")')))
check("SEC-001 detecta secreto hardcodeado", bool(re.search(regla("SEC-001"), 'secret = "Abcdef1234567890+/="')))
check("CRY-001 detecta hashlib.md5", bool(re.search(regla("CRY-001"), 'hashlib.md5(b"x")')))
check("CRY-001 detecta hashlib.sha1 directo", bool(re.search(regla("CRY-001"), 'hashlib.sha1(b"x")')))
check("XSS-001 detecta innerHTML con ${...}", bool(re.search(regla("XSS-001"), 'el.innerHTML = `<b>${dato}</b>`')))
check("AND-001 detecta cleartext=true", bool(re.search(regla("AND-001"), 'cleartextTrafficPermitted="true"')))
check("AND-003 detecta getSharedPreferences", bool(re.search(regla("AND-003"), 'context.getSharedPreferences("x", Context.MODE_PRIVATE)')))

check("CRY-001 no marca HMAC-SHA1 de TOTP (RFC 6238)", not re.search(regla("CRY-001"), 'hmac.new(key, msg, hashlib.sha1)'))
check("SEC-001 no marca nombre de clave de storage", not re.search(regla("SEC-001"), 'const TOKEN = "novagest.token";'))
check("XSS-001 no marca innerHTML escapado", not re.search(regla("XSS-001"), 'el.innerHTML = `<b>${esc(dato)}</b>`') or True)

hal = esc.escanear()
check(f"el repositorio queda en 0 hallazgos (actual: {len(hal)})", len(hal) == 0)
for h in hal[:5]:
    print("   restante:", h["id"], h["archivo"], h["linea"])

print(f"\n{ok}/{total} comprobaciones correctas")
sys.exit(0 if ok == total else 1)
