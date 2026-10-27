#!/usr/bin/env python3
"""Genera `docs/NOVEDADES.html` a partir de `CHANGELOG.md` (D-12).

El cliente ve en el sitio del proyecto que el producto avanza, sin que nadie
tenga que copiar y pegar las notas de cada versión: la página se reconstruye
desde el registro de cambios.

Uso:
    python3 tools/build_novedades.py            # regenera docs/NOVEDADES.html
    python3 tools/build_novedades.py --check    # falla si la página está desfasada

Sin dependencias externas: solo se renderiza el subconjunto de Markdown que usa
el `CHANGELOG` (títulos de revisión, viñetas, negrita, cursiva, código y enlaces).
"""
from __future__ import annotations

import html
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CHANGELOG = RAIZ / "CHANGELOG.md"
SALIDA = RAIZ / "docs" / "NOVEDADES.html"
MAX_REVISIONES = 12

ESTILO = """
  :root {
    --ink:#14142b; --muted:#5b5b76; --line:#e3e4ee; --soft:#f6f7fb;
    --brand:#312e81; --brand2:#4338ca; --ok:#059669; --paper:#fff;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:var(--soft); color:var(--ink); }
  body { font: 16px/1.6 "Segoe UI", system-ui, -apple-system, Arial, sans-serif; }
  a { color: var(--brand2); }
  a:focus-visible, button:focus-visible { outline: 3px solid var(--brand2); outline-offset: 2px; }
  .skip { position:absolute; left:-999px; }
  .skip:focus { left: 12px; top: 12px; z-index: 9; background:#fff; padding:8px 12px; border-radius:8px; }
  header.top { background: linear-gradient(135deg, #1e1b4b, #312e81 55%, #4338ca); color:#fff; padding: 28px 20px 34px; }
  header.top .wrap { max-width: 880px; margin: 0 auto; }
  header.top .brand { display:flex; align-items:center; gap:10px; font-weight:800; letter-spacing:.02em; }
  header.top .brand svg { width:28px; height:28px; }
  header.top h1 { margin: 14px 0 6px; font-size: clamp(26px, 4vw, 38px); line-height:1.15; }
  header.top p { margin: 0; color:#dcdcf7; max-width: 62ch; }
  header.top nav { margin-top: 16px; display:flex; gap: 14px; flex-wrap: wrap; font-size: 14px; }
  header.top nav a { color:#fff; text-decoration: none; border-bottom: 1px solid #ffffff66; padding-bottom: 1px; }
  main { max-width: 880px; margin: -18px auto 40px; padding: 0 20px; }
  .card { background: var(--paper); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; box-shadow: 0 6px 24px #312e8112; }
  .card + .card { margin-top: 16px; }
  .rev { display:flex; align-items:baseline; gap:10px; flex-wrap: wrap; margin-bottom: 2px; }
  .rev .n { font: 700 13px/1 ui-monospace, Consolas, monospace; color:#fff; background: var(--brand2); border-radius: 999px; padding: 4px 9px; letter-spacing:.06em; }
  .rev time { color: var(--muted); font-size: 13px; }
  .card h2 { font-size: 19px; margin: 6px 0 10px; line-height: 1.3; }
  .card ul { margin: 0; padding-left: 20px; }
  .card li { margin-bottom: 8px; }
  .card li b, .card li strong { color: #0f172a; }
  code { font: 13px/1.4 ui-monospace, Consolas, monospace; background: var(--soft); border:1px solid var(--line); border-radius: 5px; padding: 0 4px; }
  .intro { font-size: 15px; color: var(--muted); }
  .older { text-align:center; color: var(--muted); font-size: 14px; margin-top: 18px; }
  footer { max-width: 880px; margin: 0 auto 40px; padding: 0 20px; color: var(--muted); font-size: 13px; display:flex; gap:14px; flex-wrap:wrap; justify-content: space-between; }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#e8e9f6; --muted:#a6a8c2; --line:#2b2d47; --soft:#14152a; --paper:#1b1c34; }
    .card li b, .card li strong { color:#fff; }
    code { background:#22243f; }
  }
  @media print {
    html, body { background:#fff; }
    header.top { background:#fff; color:#111; border-bottom: 2px solid var(--brand); }
    header.top p, header.top nav a { color:#333; }
    header.top nav, .older { display:none; }
    .card { box-shadow:none; break-inside: avoid; }
  }
"""


def inline(text: str) -> str:
    """Markdown en línea → HTML seguro (negrita, cursiva, código y enlaces)."""
    out = html.escape(text)
    out = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", out)
    out = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", out)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    return out


def leer_revisiones(texto: str) -> list[dict]:
    """Devuelve las revisiones del CHANGELOG en orden (la primera es la última)."""
    revisiones: list[dict] = []
    actual: dict | None = None
    for linea in texto.splitlines():
        cabecera = re.match(r"^##\s+NovaGest\s+v(\S+)\s+·\s+revisión\s+(\d{4}-\d{2}-\d{2})\s+\(([IVXLCDM]+)\)\s+·\s+(.+)$", linea)
        if cabecera:
            version, fecha, numero, titulo = cabecera.groups()
            actual = {"version": version, "fecha": fecha, "numero": numero, "titulo": titulo.strip(), "puntos": []}
            revisiones.append(actual)
            continue
        if actual is None:
            continue
        if linea.startswith("## "):
            actual = None
            continue
        punto = re.match(r"^-\s+(.+)$", linea)
        if punto:
            actual["puntos"].append(punto.group(1).strip())
    return [r for r in revisiones if r["puntos"]]


def fecha_larga(iso: str) -> str:
    from datetime import date
    try:
        d = date.fromisoformat(iso)
    except ValueError:
        return iso
    meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
             "septiembre", "octubre", "noviembre", "diciembre"]
    return f"{d.day} de {meses[d.month - 1]} de {d.year}"


def construir(revisiones: list[dict]) -> str:
    visibles = revisiones[:MAX_REVISIONES]
    tarjetas = []
    for r in visibles:
        puntos = "\n".join(f"      <li>{inline(p)}</li>" for p in r["puntos"])
        tarjetas.append(f"""    <article class="card">
      <div class="rev"><span class="n">{html.escape(r["numero"])}</span><time datetime="{r["fecha"]}">{fecha_larga(r["fecha"])}</time></div>
      <h2>{inline(r["titulo"])}</h2>
      <ul>
{puntos}
      </ul>
    </article>""")
    cuerpo = "\n".join(tarjetas)
    restantes = len(revisiones) - len(visibles)
    cola = (f'<p class="older">Y {restantes} revisión(es) más en el '
            f'<a href="https://github.com/yhquintero/inventario/blob/main/CHANGELOG.md">registro de cambios completo</a>.</p>'
            if restantes > 0 else "")
    titulo = f"Novedades de NovaGest · {len(revisiones)} revisiones"
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(titulo)}</title>
<meta name="description" content="Novedades de NovaGest: cada versión del inventario, la caja diaria, los informes y la app Android, contada en una página generada desde el registro de cambios.">
<meta name="theme-color" content="#312e81">
<meta property="og:title" content="{html.escape(titulo)}">
<meta property="og:description" content="Lo que cambia en cada versión de NovaGest, en español y al día.">
<meta property="og:type" content="website">
<style>{ESTILO}</style>
</head>
<body>
<a class="skip" href="#novedades">Saltar al contenido</a>
<header class="top">
  <div class="wrap">
    <div class="brand">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 7 9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10m-4-12 9-4"/></svg>
      NovaGest
    </div>
    <h1>Novedades del producto</h1>
    <p>Todo lo que se ha añadido, corregido y mejorado, en el orden en que llegó. Esta página se genera sola desde el registro de cambios: lo que ve aquí es exactamente lo que hay en el código.</p>
    <nav aria-label="Enlaces del proyecto">
      <a href="./index.html">Página del proyecto</a>
      <a href="./MANUAL_USUARIO.html">Manual de usuario</a>
      <a href="./GUIA_MOSTRADOR.html">Guía del mostrador</a>
      <a href="https://github.com/yhquintero/inventario">Repositorio</a>
    </nav>
  </div>
</header>
<main id="novedades">
  <p class="intro">Se muestran las <b>{len(visibles)}</b> revisiones más recientes de <b>{len(revisiones)}</b>.</p>
{cuerpo}
{cola}
</main>
<footer>
  <span>NovaGest · Gestiona. Crece. Avanza.</span>
  <span>Generado desde CHANGELOG.md por tools/build_novedades.py</span>
</footer>
</body>
</html>
"""


def main(argv: list[str]) -> int:
    texto = CHANGELOG.read_text(encoding="utf-8-sig")
    revisiones = leer_revisiones(texto)
    if not revisiones:
        print("No se encontró ninguna revisión en CHANGELOG.md", file=sys.stderr)
        return 1
    pagina = construir(revisiones)
    if "--check" in argv:
        actual = SALIDA.read_text(encoding="utf-8") if SALIDA.exists() else ""
        if actual != pagina:
            print("docs/NOVEDADES.html está desfasado: ejecute python3 tools/build_novedades.py", file=sys.stderr)
            return 1
        print(f"Novedades al día · {len(revisiones)} revisiones")
        return 0
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(pagina, encoding="utf-8")
    print(f"OK · {SALIDA.relative_to(RAIZ)} · {len(revisiones)} revisiones · {SALIDA.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
