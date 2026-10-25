#!/usr/bin/env python3
"""Genera la versión HTML imprimible del Manual de Usuario de NovaGest.

Uso:
    python3 tools/build_manual_html.py

Entrada : docs/MANUAL_USUARIO.md
Salida  : docs/MANUAL_USUARIO.html  (autocontenido: CSS e imágenes embebidas)

El HTML resultante sirve para leerlo en pantalla y para imprimir o «Guardar como PDF»
desde el navegador. No necesita conexión: todas las imágenes van en base64.
"""

from __future__ import annotations

import base64
import html
import mimetypes
import re
import sys
import unicodedata
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SRC = DOCS / "MANUAL_USUARIO.md"
OUT = DOCS / "MANUAL_USUARIO.html"

CALLOUTS = {
    "NOTE": ("Nota", "ℹ", "note"),
    "IMPORTANT": ("Importante", "❗", "important"),
    "TIP": ("Consejo", "💡", "tip"),
    "WARNING": ("Advertencia", "⚠", "warning"),
    "CAUTION": ("Precaución", "🛑", "caution"),
}


# --------------------------------------------------------------------------- utilidades
def slug(text: str) -> str:
    """Ancla compatible con GitHub: conserva acentos y letras, quita puntuación."""
    text = text.strip().lower()
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[^\w\s\-áéíóúüñçàèìòùâêîôû]", "", text, flags=re.UNICODE)
    text = text.replace(" ", "-")  # GitHub: un guion por cada espacio
    return text.strip("-")


def data_uri(path: Path) -> str:
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    raw = path.read_bytes()
    return f"data:{mime};base64," + base64.b64encode(raw).decode("ascii")


def embed_images(text: str) -> str:
    """Reemplaza rutas relativas de imágenes por data URI (HTML autocontenido)."""

    def repl(match: re.Match[str]) -> str:
        alt, src = match.group(1), match.group(2)
        if src.startswith(("http://", "https://", "data:")):
            return match.group(0)
        path = (DOCS / src).resolve()
        if not path.exists():
            print(f"  ! imagen no encontrada: {src}", file=sys.stderr)
            return match.group(0)
        return f"![{alt}]({data_uri(path)})"

    return re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", repl, text)


def convert_callouts(text: str) -> str:
    """Convierte las alertas de GitHub (> [!NOTE]) en divs con estilo propio."""
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        m = re.match(r"^>\s*\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]\s*$", lines[i].strip())
        if not m:
            out.append(lines[i])
            i += 1
            continue
        kind = m.group(1)
        title, icon, css = CALLOUTS[kind]
        body: list[str] = []
        i += 1
        while i < len(lines) and lines[i].lstrip().startswith(">"):
            body.append(re.sub(r"^\s*>\s?", "", lines[i]))
            i += 1
        inner = "\n".join(body).strip()
        out.append(f'<div class="callout {css}" markdown="1">')
        out.append(f'<p class="callout-t">{icon} {title}</p>')
        out.append("")
        out.append(inner)
        out.append("")
        out.append("</div>")
        out.append("")
    return "\n".join(out)


def convert_tasks(text: str) -> str:
    text = re.sub(r"^(\s*)- \[ \] ", r"\1- ☐ ", text, flags=re.MULTILINE)
    text = re.sub(r"^(\s*)- \[[xX]\] ", r"\1- ☑ ", text, flags=re.MULTILINE)
    return text


def figures(rendered: str) -> str:
    """Envuelve cada imagen con su leyenda (usa el texto alternativo)."""
    def repl(match: re.Match[str]) -> str:
        alt, src = match.group(1), match.group(2)
        caption = f"<figcaption>{alt}</figcaption>" if alt else ""
        return f'<figure><img src="{src}" alt="{html.escape(alt)}" />{caption}</figure>'

    return re.sub(r'<p><img alt="([^"]*)" src="([^"]+)"\s*/?></p>', repl, rendered)


def split_cover(text: str) -> tuple[str, str]:
    """Separa la portada del cuerpo (el cuerpo empieza en «## Ficha del documento»)."""
    marker = "## Ficha del documento"
    idx = text.find(marker)
    return (text[:idx], text[idx:]) if idx > 0 else ("", text)


# --------------------------------------------------------------------------- plantilla
CSS = """
:root{
  --ink:#14142b; --muted:#5b5b76; --line:#e3e4ee; --bg:#ffffff; --soft:#f6f7fb;
  --brand:#312e81; --brand2:#4f46e5; --accent:#059669; --gold:#b45309;
  --note:#eef2ff; --note-b:#6366f1; --imp:#ecfeff; --imp-b:#0891b2;
  --tip:#f0fdf4; --tip-b:#16a34a; --warn:#fffbeb; --warn-b:#d97706;
  --caut:#fef2f2; --caut-b:#dc2626;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0; background:var(--bg); color:var(--ink);
  font-family:"Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  font-size:15px; line-height:1.65; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:960px; margin:0 auto; padding:32px 28px 96px}
.toolbar{
  position:sticky; top:0; z-index:20; display:flex; gap:12px; align-items:center;
  justify-content:space-between; max-width:960px; margin:0 auto; padding:10px 28px;
  background:rgba(255,255,255,.92); backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line); font-size:13px; color:var(--muted);
}
.toolbar b{color:var(--brand)}
.toolbar button{
  border:1px solid var(--brand2); background:var(--brand2); color:#fff; border-radius:8px;
  padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer;
}
.toolbar button:hover{background:#4338ca}

/* portada */
.cover{
  border:1px solid var(--line); border-radius:18px; padding:44px 40px; margin-bottom:36px;
  background:
    radial-gradient(1200px 320px at 100% -10%, #eef2ff 0%, transparent 60%),
    radial-gradient(800px 260px at -10% 120%, #ecfdf5 0%, transparent 55%), #fff;
}
.cover .logo{width:84px; height:84px; border-radius:20px; display:block; margin-bottom:18px}
.cover .eyebrow{letter-spacing:.16em; text-transform:uppercase; font-size:11px; color:var(--brand2); font-weight:700}
.cover h1{
  font-size:40px; line-height:1.1; margin:8px 0 6px; border:0; padding:0; page-break-before:avoid;
}
.cover .lead{font-size:17px; color:var(--muted); margin:0 0 18px}
.cover .tags{display:flex; flex-wrap:wrap; gap:8px; margin:18px 0 6px}
.cover .tag{
  border:1px solid var(--line); background:#fff; border-radius:999px; padding:5px 12px;
  font-size:12px; color:var(--brand); font-weight:600;
}
.cover .meta{margin-top:22px; font-size:12px; color:var(--muted)}

/* tipografía */
h1,h2,h3,h4{line-height:1.25; color:#0f1030; scroll-margin-top:64px}
h1{
  font-size:26px; margin:56px 0 14px; padding-bottom:10px; border-bottom:3px solid var(--brand2);
  page-break-before:always; page-break-after:avoid;
}
h1:first-of-type{page-break-before:auto}
h2{font-size:19px; margin:34px 0 10px; page-break-after:avoid}
h3{font-size:16px; margin:24px 0 8px; color:var(--brand); page-break-after:avoid}
h4{font-size:14px; margin:18px 0 6px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em}
p{margin:10px 0}
a{color:var(--brand2); text-decoration:none; border-bottom:1px solid rgba(79,70,229,.25)}
a:hover{border-bottom-color:var(--brand2)}
ul,ol{margin:10px 0 10px 22px; padding:0}
li{margin:5px 0}
li>ul,li>ol{margin:4px 0 4px 18px}
strong{color:#0f1030}
hr{border:0; border-top:1px solid var(--line); margin:34px 0}

/* tablas */
table{width:100%; border-collapse:collapse; margin:16px 0; font-size:13.5px; page-break-inside:auto}
thead{display:table-header-group}
th,td{border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top}
th{background:var(--soft); font-size:12px; text-transform:uppercase; letter-spacing:.03em; color:#3a3a5c}
tbody tr:nth-child(even){background:#fcfcfe}
tr{page-break-inside:avoid}

/* código */
code{
  font-family:"Cascadia Mono",Consolas,"SF Mono",Menlo,monospace; font-size:12.5px;
  background:var(--soft); border:1px solid var(--line); border-radius:5px; padding:1px 5px;
}
pre{
  background:#14142b; color:#e7e9ff; border-radius:12px; padding:16px 18px; overflow:auto;
  font-size:12.5px; line-height:1.6; page-break-inside:avoid;
}
pre code{background:none; border:0; color:inherit; padding:0}

/* alertas */
.callout{
  border:1px solid var(--line); border-left:4px solid var(--note-b); background:var(--note);
  border-radius:10px; padding:12px 16px 6px; margin:18px 0; page-break-inside:avoid;
}
.callout p{margin:0 0 8px}
.callout .callout-t{font-weight:700; font-size:13px; letter-spacing:.02em; color:#1f245c; margin-bottom:6px}
.callout.important{border-left-color:var(--imp-b); background:var(--imp)}
.callout.tip{border-left-color:var(--tip-b); background:var(--tip)}
.callout.warning{border-left-color:var(--warn-b); background:var(--warn)}
.callout.caution{border-left-color:var(--caut-b); background:var(--caut)}

/* figuras */
figure{margin:18px 0; page-break-inside:avoid}
figure img{width:100%; height:auto; border:1px solid var(--line); border-radius:12px; display:block}
figcaption{font-size:12px; color:var(--muted); margin-top:6px; text-align:center}

/* índice del documento */
.toc{border:1px solid var(--line); border-radius:12px; padding:16px 20px; background:var(--soft); margin:22px 0}
.toc p{margin:0 0 8px; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.05em; color:var(--brand)}
.toc ol{margin:0 0 0 18px; column-count:2; column-gap:28px; font-size:13.5px}
.toc li{break-inside:avoid}
footer.doc{border-top:1px solid var(--line); margin-top:40px; padding-top:14px; font-size:12px; color:var(--muted); text-align:center}

/* impresión */
@page{size:A4; margin:16mm 14mm}
@media print{
  .toolbar{display:none}
  .wrap{padding:0; max-width:none}
  body{font-size:11pt; line-height:1.5}
  .cover{border:0; padding:0 0 10mm; page-break-after:always}
  h1{font-size:20pt; margin-top:0}
  h2{font-size:14pt}
  pre{background:#f5f5fa; color:#111; border:1px solid var(--line)}
  a{color:inherit; border:0}
  .callout{break-inside:avoid}
  .toc ol{column-count:2}
}
"""


def build() -> Path:
    text = SRC.read_text(encoding="utf-8")
    _, body_md = split_cover(text)
    body_md = convert_callouts(body_md)
    body_md = convert_tasks(body_md)
    body_md = embed_images(body_md)

    md = markdown.Markdown(
        extensions=["tables", "fenced_code", "toc", "md_in_html", "sane_lists", "attr_list"],
        extension_configs={"toc": {"slugify": lambda v, s: slug(v)}},
    )
    body = md.convert(body_md)
    body = figures(body)

    logo = data_uri(ROOT / "brand" / "novagest-icon.png")

    cover = f"""
<header class="cover">
  <img class="logo" src="{logo}" alt="Logotipo de NovaGest" />
  <div class="eyebrow">Software de gestión de negocio</div>
  <h1>Manual de Usuario<br />NovaGest</h1>
  <p class="lead">Inventario · Punto de venta · Caja diaria · Informes<br />Aplicación Web (PWA) y aplicación Android</p>
  <div class="tags">
    <span class="tag">Versión 1.0.0</span>
    <span class="tag">Paso a paso</span>
    <span class="tag">Web + Android</span>
    <span class="tag">Con capturas</span>
    <span class="tag">Listo para imprimir</span>
  </div>
  <p class="meta">Documento para dueños, administradores y personal operativo · Octubre de 2026<br />
  Generado desde <code>docs/MANUAL_USUARIO.md</code> · Software propietario: el uso requiere licencia</p>
</header>
"""

    toc = """
<nav class="toc">
  <p>Contenido</p>
  <ol>
    <li><a href="#1-antes-de-empezar">Antes de empezar</a></li>
    <li><a href="#2-primeros-pasos-activar-y-entrar">Primeros pasos: activar y entrar</a></li>
    <li><a href="#3-configuración-inicial-del-negocio">Configuración inicial del negocio</a></li>
    <li><a href="#4-almacenes-y-entrada-de-mercancía">Almacenes y entrada de mercancía</a></li>
    <li><a href="#5-inventario-y-productos">Inventario y productos</a></li>
    <li><a href="#6-venta-rápida-punto-de-venta">Venta rápida (punto de venta)</a></li>
    <li><a href="#7-movimientos">Movimientos</a></li>
    <li><a href="#8-clientes-y-fiados">Clientes y fiados</a></li>
    <li><a href="#9-cuadre-diario-de-caja">Cuadre diario de caja</a></li>
    <li><a href="#10-informes-comprobación-y-análisis">Informes, comprobación y análisis</a></li>
    <li><a href="#11-historial-de-precios-y-monedas">Historial de precios y monedas</a></li>
    <li><a href="#12-fichas-de-costo-e-ipv">Fichas de costo e IPV</a></li>
    <li><a href="#13-copias-de-seguridad-y-restauración">Copias de seguridad y restauración</a></li>
    <li><a href="#14-usuarios-seguridad-y-auditoría">Usuarios, seguridad y auditoría</a></li>
    <li><a href="#15-licencia-de-uso">Licencia de uso</a></li>
    <li><a href="#16-la-app-android-en-detalle">La app Android en detalle</a></li>
    <li><a href="#17-trabajo-en-equipo-web--android">Trabajo en equipo: Web + Android</a></li>
    <li><a href="#18-atajos-trucos-y-accesibilidad">Atajos, trucos y accesibilidad</a></li>
    <li><a href="#19-solución-de-problemas">Solución de problemas</a></li>
    <li><a href="#20-rutinas-recomendadas-y-listas-de-verificación">Rutinas y listas de verificación</a></li>
    <li><a href="#21-glosario">Glosario</a></li>
    <li><a href="#anexo-a-mapa-rápido-de-la-aplicación">Anexo A. Mapa rápido</a></li>
    <li><a href="#anexo-b-capturas-de-referencia">Anexo B. Capturas de referencia</a></li>
    <li><a href="#anexo-c-documentos-relacionados">Anexo C. Documentos relacionados</a></li>
  </ol>
</nav>
"""

    doc = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Manual de Usuario — NovaGest 1.0.0</title>
<meta name="description" content="Manual de usuario completo de NovaGest: inventario multialmacén, punto de venta, caja diaria e informes, en Web y Android." />
<style>{CSS}</style>
</head>
<body>
<div class="toolbar">
  <span><b>NovaGest</b> · Manual de Usuario · v1.0.0</span>
  <button type="button" onclick="window.print()">Imprimir o guardar como PDF</button>
</div>
<div class="wrap">
{cover}
{toc}
{body}
<footer class="doc">
  NovaGest · Gestiona. Crece. Avanza. · Manual de Usuario v1.0.0 · Documento generado desde
  <code>docs/MANUAL_USUARIO.md</code>
</footer>
</div>
</body>
</html>
"""
    OUT.write_text(doc, encoding="utf-8")
    return OUT


def check_anchors() -> int:
    """Comprueba que todos los enlaces internos del .md apunten a un encabezado real."""
    text = SRC.read_text(encoding="utf-8")
    heads = {slug(m.group(2)) for m in re.finditer(r"^(#{1,4})\s+(.+)$", text, flags=re.MULTILINE)}
    bad = [href for href in re.findall(r"\]\(#([^)]+)\)", text) if href not in heads]
    for href in sorted(set(bad)):
        print(f"  ! enlace interno sin destino: #{href}", file=sys.stderr)
    return len(set(bad))


if __name__ == "__main__":
    bad = check_anchors()
    out = build()
    size = out.stat().st_size / 1024
    print(f"OK · {out.relative_to(ROOT)} · {size:.0f} KB · enlaces rotos: {bad}")
    sys.exit(1 if bad else 0)
