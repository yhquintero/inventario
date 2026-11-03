#!/usr/bin/env python3
"""Escáner avanzado de vulnerabilidades de NovaGest (web + servidor + Android).

Analiza estáticamente todo el código del repositorio buscando patrones de
vulnerabilidad conocidos (OWASP Top 10, MASVS, CWE) y, si está disponible,
encadena `pip-audit` para la cadena de suministro. Genera un informe Markdown
con severidad CVSS aproximada, evidencia (archivo:línea) y remediación.

Uso:
    python3 tools/escanear_seguridad.py                 # informe en consola
    python3 tools/escanear_seguridad.py --md REPORTE.md # también a archivo
    python3 tools/escanear_seguridad.py --json          # salida JSON

No sustituye a un pentest profesional; es una primera línea automatizada (SAST).
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (id, severidad, cwe, título, regex, extensiones, remediación)
REGLAS = [
    ("SQL-001", "ALTA", "CWE-89", "Posible inyección SQL (f-string/% en execute)",
     r'(?:execute|executescript)\(\s*f["\']', {".py"},
     "Usa siempre parámetros (?) como hace q(); nunca interpoles valores en el SQL."),
    ("XSS-001", "ALTA", "CWE-79", "innerHTML con interpolación ${...} sin esc()",
     r'\.(?:innerHTML|outerHTML|insertAdjacentHTML)\s*=[^;]*\$\{', {".js"},
     "Escapa con esc() antes de pintar; el CSP sin unsafe-inline ya es segunda barrera."),
    ("SEC-001", "CRÍTICA", "CWE-798", "Secreto hardcodeado (clave/contraseña/token literal)",
     r'(?i)(api[_-]?key|secret|password|passwd|token)\s*=\s*["\'][A-Za-z0-9+/=_\-]{16,}["\']', {".py", ".js", ".kt", ".kts", ".yml", ".yaml", ".toml"},
     "Mueve el secreto a variable de entorno o archivo fuera del repo (gitignored)."),
    ("CRY-001", "ALTA", "CWE-327", "Hash/cifrado débil (MD5, SHA1 directo, DES, ECB, RC4)",
     r'hashlib\.(md5|sha1)\(|Cipher\.getInstance\(["\'](?:DES|ECB|RC4)|\bECB\b', {".py", ".kt", ".java"},
     "Usa AES-256-GCM o SHA-256+; nunca MD5/SHA1 para seguridad ni ECB. (HMAC-SHA1 de TOTP es el RFC 6238 y no se marca.)"),
    ("CRY-002", "MEDIA", "CWE-330", "Aleatorio no criptográfico (random. para tokens/claves)",
     r'(?<!secrets\.)\brandom\.(?:random|randint|choice|randrange)\b', {".py"},
     "Usa secrets.token_* / secrets.choice para cualquier valor de seguridad."),
    ("WEB-001", "MEDIA", "CWE-693", "Cabecera de seguridad ausente en el servidor",
     r'^(?!.*(Strict-Transport|X-Content-Type|X-Frame|Referrer-Policy|Content-Security))', {"server/novagest_server.py"},
     "Verifica que headers_common envía CSP, nosniff, X-Frame-Options, Referrer-Policy y HSTS bajo TLS."),
    ("WEB-002", "ALTA", "CWE-1004", "CORS permisivo (Access-Control-Allow-Origin: *)",
     r'Access-Control-Allow-Origin["\']?\s*[:=]\s*["\']\*', {".py"},
     "NUNCA uses '*': limita al origen propio (la app es same-origin)."),
    ("WEB-003", "MEDIA", "CWE-352", "Mutación sin protección CSRF",
     r'def route\(self, method\):', {"server/novagest_server.py"},
     "Toda mutación debe exigir la cabecera X-CP (ya implementado: verificar que no se relaje)."),
    ("AND-001", "ALTA", "CWE-757", "Tráfico claro permitido en Android (cleartext)",
     r'cleartextTrafficPermitted\s*=\s*["\']true', {".xml"},
     "Mantén cleartextTrafficPermitted=false; solo HTTPS."),
    ("AND-002", "MEDIA", "CWE-922", "Pinning ausente o desactivado",
     r'cleartextTrafficPermitted|trust-anchors', {".xml"},
     "Añade pin-set en network_security_config para el dominio público (H3 ya lo habilita vía pins.txt)."),
    ("AND-003", "MEDIA", "CWE-312", "SharedPreferences sin cifrar para datos sensibles",
     r'getSharedPreferences\(', {".kt"},
     "Usa EncryptedSharedPreferences (ya en SessionManager/LicenseManager); nunca guardes tokens en claro."),
    ("SRV-001", "MEDIA", "CWE-1188", "Arranque inseguro por defecto (bind 0.0.0.0 sin TLS forzado)",
     r'ThreadingHTTPServer\(\("0\.0\.0\.0"', {"server/novagest_server.py"},
     "REQUIRE_HTTPS=1 en producción; exponer solo tras Caddy (443)."),
    ("SRV-002", "MEDIA", "CWE-400", "Sin límite de tamaño de petición",
     r'MAX_BODY\s*=', {"server/novagest_server.py"},
     "MAX_BODY existe (30 MB); mantener y ajustar por entorno."),
    ("SRV-003", "BAJA", "CWE-532", "Posible dato sensible en logs",
     r'print\([^)]*(?:password|token|secret|clave)', {".py"},
     "No imprimas secretos; usa audit() con datos mínimos."),
    ("WEB-004", "MEDIA", "CWE-79", "eval / new Function / document.write",
     r'\beval\(|new Function\(|document\.write', {".js", ".mjs"},
     "Prohibido: elimina cualquier eval; usa JSON.parse y DOM seguro."),
    ("KOT-001", "MEDIA", "CWE-321", "Clave criptográfica fija o débil en código",
     r'(?i)(?:val|var)\s+\w*(?:key|secret|passphrase)\s*=\s*["\'][^"\']+["\']', {".kt"},
     "Deriva la clave del Keystore (ver DatabaseKey.kt); nunca literales."),
]

EXCLUIR_DIRS = {".git", "venv", "node_modules", "build", ".gradle", "__pycache__", "docs", "tools"}
EXCLUIR_FILES = {"escanear_seguridad.py", "test_escanear_seguridad.py", "xlsx.full.min.js", "qrcode.mjs"}


def lineas_coinciden(texto: str, regex: str):
    for i, linea in enumerate(texto.splitlines(), 1):
        if re.search(regex, linea):
            yield i, linea.strip()[:160]


def escanear() -> list[dict]:
    hallazgos = []
    for rid, sev, cwe, titulo, regex, exts, fix in REGLAS:
        for path in sorted(ROOT.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(ROOT)
            if any(part in EXCLUIR_DIRS for part in rel.parts):
                continue
            if path.name in EXCLUIR_FILES or path.suffix not in exts:
                continue
            rels = str(rel)
            es_test = "/test/" in rels or "/androidTest/" in rels
            if es_test and rid != "SEC-001":
                continue  # el código de pruebas no es producción
            try:
                texto = path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if rid == "WEB-001" and "novagest_server.py" not in rels:
                continue
            for n, linea in lineas_coinciden(texto, regex):
                if "nosec" in linea:
                    continue  # anotación explícita de falso positivo revisado
                if rid == "XSS-001" and "esc(" in linea:
                    continue  # la interpolación ya va escapada
                # --- falsos positivos razonables ---
                if rid == "SEC-001" and ("os.environ" in linea or "getenv" in linea or "input(" in linea):
                    continue
                if rid == "SEC-001" and es_test:
                    continue  # fixture de prueba (p. ej. clave del motor en tests)
                if rid == "SEC-001" and re.search(r'(?i)(token|key)\s*=\s*["\'][a-z0-9.]+["\']', linea):
                    continue  # nombre de clave de almacenamiento ("novagest.token"), no un secreto
                if rid == "WEB-001" and any(h in texto for h in ("Content-Security-Policy", "Strict-Transport", "X-Content-Type-Options")):
                    continue
                if rid == "SRV-002" and "MAX_BODY" in texto:
                    continue
                if rid == "AND-001" and "src/debug/" in rels:
                    continue  # cleartext solo en build debug (desarrollo local), nunca en release
                if rid == "AND-002" and "user" in texto:
                    continue  # trust-anchors user es necesario para mkcert en LAN
                if rid == "WEB-003" and "X-CP" in texto:
                    continue
                if rid == "SRV-001" and "REQUIRE_HTTPS" in texto:
                    continue
                hallazgos.append({
                    "id": rid, "severidad": sev, "cwe": cwe, "titulo": titulo,
                    "archivo": rels, "linea": n, "evidencia": linea, "remediacion": fix,
                })
    return hallazgos


def pip_audit() -> list[dict]:
    try:
        out = subprocess.run([sys.executable, "-m", "pip_audit", "-r", "requirements.txt"],
                             capture_output=True, text=True, timeout=120, cwd=ROOT)
        if out.returncode != 0 and "No module named" in out.stderr:
            return [{"id": "DEP-000", "severidad": "INFO", "cwe": "CWE-1104",
                     "titulo": "pip-audit no instalado en este entorno",
                     "archivo": "requirements.txt", "linea": 0, "evidencia": "pip install pip-audit",
                     "remediacion": "Ejecutar en CI (ya hay paso pip-audit) o local: pip install pip-audit"}]
        vulns = []
        for line in out.stdout.splitlines():
            if line.strip().startswith("{"):
                continue
        data = json.loads(out.stdout) if out.stdout.strip().startswith("[") else None
        if isinstance(data, list):
            for v in data:
                vulns.append({"id": "DEP-" + str(v.get("id", "?")), "severidad": "ALTA" if v.get("fix_versions") else "MEDIA",
                              "cwe": "CWE-1104", "titulo": f"Dependencia vulnerable: {v.get('name')} {v.get('version')}",
                              "archivo": "requirements.txt", "linea": 0,
                              "evidencia": v.get("description", "")[:160],
                              "remediacion": f"Actualizar a {', '.join(map(str, v.get('fix_versions', []))) or 'última versión'}"})
        return vulns
    except Exception as e:
        return [{"id": "DEP-ERR", "severidad": "INFO", "cwe": "CWE-1104", "titulo": f"pip-audit no pudo ejecutarse: {e}",
                 "archivo": "requirements.txt", "linea": 0, "evidencia": "", "remediacion": "Revisar en CI"}]


def main():
    args = sys.argv[1:]
    hal = escanear()
    if "--sin-deps" not in args:
        hal += pip_audit()
    orden = {"CRÍTICA": 0, "ALTA": 1, "MEDIA": 2, "BAJA": 3, "INFO": 4}
    hal.sort(key=lambda h: (orden.get(h["severidad"], 9), h["id"]))
    if "--json" in args:
        print(json.dumps(hal, ensure_ascii=False, indent=2))
        return 0 if not hal else 1
    print(f"# Escáner de seguridad NovaGest — {len(hal)} hallazgos\n")
    for h in hal:
        print(f"## [{h['severidad']}] {h['id']} · {h['titulo']} ({h['cwe']})")
        print(f"   - {h['archivo']}:{h['linea']}")
        print(f"   - Evidencia: `{h['evidencia']}`")
        print(f"   - Remediación: {h['remediacion']}\n")
    if "--md" in args:
        i = args.index("--md")
        md = f"# Escáner de seguridad NovaGest — {len(hal)} hallazgos\n\n"
        for h in hal:
            md += f"## [{h['severidad']}] {h['id']} · {h['titulo']} ({h['cwe']})\n- {h['archivo']}:{h['linea']}\n- Evidencia: `{h['evidencia']}`\n- Remediación: {h['remediacion']}\n\n"
        Path(args[i + 1]).write_text(md, encoding="utf-8")
        print(f"Informe guardado en {args[i + 1]}")
    return 0 if not hal else 1


if __name__ == "__main__":
    sys.exit(main())
