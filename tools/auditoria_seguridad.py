#!/usr/bin/env python3
"""Auto-escaneo de seguridad NovaGest (nivel OWASP ASVS L1-L2, sin red externa).
Uso: python3 tools/auditoria_seguridad.py [base_url]  (por defecto http://localhost:8787)
Solo comprueba; no explota. Sale 0 si todo pasa."""
import json, sys, urllib.request, urllib.error
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8787"
ok = fail = 0
def check(name, cond, extra=""):
    global ok, fail
    if cond: ok += 1; print(f"  ok  {name}")
    else: fail += 1; print(f"FAIL  {name} {extra}")
def req(path, method="GET", headers=None, data=None):
    r = urllib.request.Request(BASE + path, method=method, headers=headers or {}, data=data)
    try:
        with urllib.request.urlopen(r, timeout=5) as resp: return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e: return e.code, dict(e.headers), e.read()
    except Exception as e: return 0, {}, str(e).encode()

print("== ASVS V2 Autenticación / V3 Sesión ==")
s, h, b = req("/api/health"); check("servidor responde", s == 200)
s, h, b = req("/api/license/status"); check("estado licencia público", s == 200)
s, h, b = req("/api/state"); check("estado protegido sin sesión (401)", s == 401, f"[{s}]")
s, h, b = req("/api/security-log"); check("log seguridad protegido (401/403)", s in (401, 403), f"[{s}]")
print("== ASVS V14 Cabeceras ==")
s, h, b = req("/")
for cab in ("X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"):
    check(cab, cab in h)
check("CSP con frame-ancestors", "frame-ancestors" in h.get("Content-Security-Policy", ""))
check("CSP sin unsafe-inline", "unsafe-inline" not in h.get("Content-Security-Policy", ""))
print("== Divulgación responsable ==")
s, h, b = req("/.well-known/security.txt"); check("security.txt publicado", s == 200 and b"Contact:" in b, f"[{s}]")
print(f"\nAsserts fallidos: {fail} (ok: {ok})")
sys.exit(1 if fail else 0)
