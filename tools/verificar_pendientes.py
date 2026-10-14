#!/usr/bin/env python3
"""Inventario ÚNICO de pendientes «no inventados» (sin red). No los resuelve:
comprueba cuáles siguen abiertos para que titular/asesor/firma los cierren.
Uso: python3 tools/verificar_pendientes.py [--estricto]
Sin --estricto informa y sale 0; con --estricto sale 1 si queda algo abierto."""
import pathlib, re, sys
ROOT = pathlib.Path(__file__).parent.parent
strict = "--estricto" in sys.argv
abiertos = []

def scan(nombre, texto, patron, excluir=None):
    n = len([m for m in re.findall(patron, texto) if not (excluir and excluir in m)])
    if n: abiertos.append(f"{nombre}: {n}")
    print(f"  {'ABIERTO' if n else 'cerrado '}  {nombre}: {n}")

print("== Datos por rellenar [COMPLETAR: …] ==")
for ruta in ["docs/certificacion/A-ISO27001-SGSI.md", "docs/certificacion/B-SOC2.md",
             "docs/certificacion/C-OWASP-ASVS.md", "docs/certificacion/E-ISO27701.md",
             "docs/REVISION_LEGAL.md", "web/.well-known/security.txt"]:
    scan(ruta, (ROOT / ruta).read_text(encoding="utf-8"), r"\[COMPLETAR")
scan("web/js/legal.js (se rellenan vía Ajustes → /api/legal; no editar a mano)",
     (ROOT / "web/js/legal.js").read_text(encoding="utf-8"), r"\[COMPLETAR")

print("== Casillas y firmas por completar ==")
for ruta, nombre in [("docs/certificacion/D-WCAG22.md", "D sesión manual WCAG"),
                     ("docs/certificacion/A-ISO27001-SGSI.md", "A huecos SGSI"),
                     ("docs/certificacion/B-SOC2.md", "B huecos SOC 2"),
                     ("docs/REVISION_LEGAL.md", "Revisión legal (checklist)")]:
    scan(nombre, (ROOT / ruta).read_text(encoding="utf-8"), r"- \[ \]")
acta = (ROOT / "docs/certificacion/00-INDICE-Y-FIRMAS.md").read_text(encoding="utf-8")
firmas = acta.count("[COMPLETAR: firma")
scan("00-INDICE-Y-FIRMAS firmas A–E", acta, r"\[COMPLETAR: firma")

print("== Caducidad de security.txt (RFC 9116) ==")
import datetime as _dt
_txt = (ROOT / "web/.well-known/security.txt").read_text(encoding="utf-8")
_m = re.search(r"^Expires:\s*(\S+)", _txt, re.M)
if not _m or "[COMPLETAR" in _m.group(1):
    print("  ABIERTO  Expires sin fecha real: genera el archivo con tools/generar_security_txt.py")
    abiertos.append("security.txt sin Expires real")
else:
    try:
        exp = _dt.datetime.fromisoformat(_m.group(1).replace("Z", "+00:00"))
        dias = (exp - _dt.datetime.now(_dt.timezone.utc)).days
        print(f"  {'ok ' if dias > 30 else 'ABIERTO'}  Expires en {dias} días" + ("" if dias > 30 else " — renovar ya"))
        if dias <= 30: abiertos.append("security.txt caduca en <=30 días")
    except ValueError:
        print("  ABIERTO  Expires no es una fecha válida"); abiertos.append("security.txt Expires inválido")
srv = (ROOT / "server/novagest_server.py").read_text(encoding="utf-8")
print("  " + ("cerrado " if "Strict-Transport-Security" in srv and "self.secure()" in srv else "ABIERTO") + "  HSTS solo bajo HTTPS (secure())")

print("== Cadencia trimestral (sesiones/simulacros) ==")
_reg = (ROOT / "docs/certificacion/REGISTRO-SESIONES.md").read_text(encoding="utf-8")
_fechas = re.findall(r"^\| (\d{4}-\d{2}-\d{2}) \|", _reg, re.M)
if _fechas:
    ult = max(_fechas)
    dias = (_dt.date.today() - _dt.date.fromisoformat(ult)).days
    print(f"  {'ok ' if dias <= 90 else 'ABIERTO'}  Último registro {ult} (hace {dias} días; cadencia 90)")
    if dias > 90: abiertos.append("cadencia trimestral vencida")
else:
    print("  ABIERTO  Sin sesiones registradas aún (REGISTRO-SESIONES.md vacío: normal antes de la primera)")
    abiertos.append("sin sesiones WCAG/simulacros registrados")

print("== Verificaciones técnicas ligadas ==")
ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
print("  " + ("cerrado " if "setup-gradle" in ci else "ABIERTO") + "  Android: CI compila con Gradle (setup-gradle)")
if "setup-gradle" not in ci: abiertos.append("CI Android sin setup-gradle")
c_doc = (ROOT / "docs/certificacion/C-OWASP-ASVS.md").read_text(encoding="utf-8")
print("  " + ("cerrado " if "OK (máx. 128" in c_doc else "ABIERTO") + "  C límite de contraseña aplicado")
d_doc = (ROOT / "docs/certificacion/D-WCAG22.md").read_text(encoding="utf-8")
print("  " + ("cerrado " if "tabla de datos equivalente" in d_doc else "ABIERTO") + "  D gráfica con equivalente textual")
print("  " + ("cerrado " if "style-src 'self';" in srv else "ABIERTO") + "  CSP sin unsafe-inline (mejora 5)")

print(f"\nGrupos con pendientes: {len(abiertos)}")
for x in abiertos: print("  -", x)
print("Quién cierra cada uno: docs/certificacion/00-INDICE-Y-FIRMAS.md")
sys.exit(1 if (strict and abiertos) else 0)
