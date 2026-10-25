#!/usr/bin/env python3
"""Comprobaciones de la página del proyecto (`docs/index.html`).

La página se publica con GitHub Pages desde la carpeta `docs/`, así que tiene que
cumplirse lo mismo que en el resto de entregables del proyecto:

* HTML bien formado (etiquetas abiertas y cerradas en orden).
* Sin recursos externos (CDN, fuentes, imágenes o scripts de terceros): si el
  visitante no tiene red hacia esos sitios, la página se vería a medias.
* Todos los enlaces y recursos relativos existen en el repositorio.
* Textos en español, con título y descripción para los buscadores y las redes.
* Estructura accesible: un solo `h1`, saltos de sección con encabezados, textos
  alternativos en las imágenes y un enlace para saltar al contenido.

Uso:  python3 tools/test_sitio.py        (código de salida 0 = todo correcto)
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = RAIZ / "docs" / "index.html"

VACIAS = {
    "meta", "link", "img", "br", "hr", "input", "source", "path", "rect",
    "circle", "line", "col", "area", "base", "embed", "track", "wbr",
}

fallos: list[str] = []
pruebas = 0


def ok(nombre: str, condicion: bool, detalle: str = "") -> None:
    global pruebas
    pruebas += 1
    if condicion:
        print(f"  \u2714 {nombre}")
    else:
        print(f"  \u2716 {nombre}{(' — ' + detalle) if detalle else ''}")
        fallos.append(nombre)


class Equilibrio(HTMLParser):
    """Verifica que cada etiqueta se cierre en el orden correcto."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.pila: list[tuple[str, tuple[int, int]]] = []
        self.errores: list[str] = []

    def handle_starttag(self, tag, attrs):  # noqa: D102
        if tag not in VACIAS:
            self.pila.append((tag, self.getpos()))

    def handle_endtag(self, tag):  # noqa: D102
        if tag in VACIAS:
            return
        if not self.pila:
            self.errores.append(f"</{tag}> sin apertura en {self.getpos()}")
            return
        if self.pila[-1][0] != tag:
            self.errores.append(
                f"</{tag}> cierra a <{self.pila[-1][0]}> (línea {self.getpos()[0]})"
            )
            for i in range(len(self.pila) - 1, -1, -1):
                if self.pila[i][0] == tag:
                    del self.pila[i:]
                    return
            return
        self.pila.pop()


def main() -> int:
    ok("la página del proyecto existe", PAGINA.is_file(), str(PAGINA))
    if not PAGINA.is_file():
        return 1

    html = PAGINA.read_text(encoding="utf-8")

    print("\nEstructura")
    parser = Equilibrio()
    parser.feed(html)
    ok("las etiquetas abren y cierran en orden", not parser.errores, "; ".join(parser.errores[:3]))
    ok("no queda ninguna etiqueta sin cerrar", not parser.pila, ", ".join(t for t, _ in parser.pila))
    ok("el documento declara español", re.search(r'<html[^>]*lang="es"', html) is not None)
    ok("tiene un solo <h1>", len(re.findall(r"<h1[\s>]", html)) == 1)
    ok("incluye un enlace para saltar al contenido", 'class="skip"' in html)
    ok("hay un <main> con contenido", re.search(r"<main[^>]*>", html) is not None)

    print("\nMetadatos")
    titulo = re.search(r"<title>(.*?)</title>", html, re.S)
    ok("el título está presente y no es genérico",
       bool(titulo) and "NovaGest" in titulo.group(1) and len(titulo.group(1)) <= 80,
       titulo.group(1) if titulo else "sin <title>")
    desc = re.search(r'<meta name="description" content="([^"]+)"', html)
    ok("la descripción para buscadores mide entre 80 y 200 caracteres",
       bool(desc) and 80 <= len(desc.group(1)) <= 200,
       f"{len(desc.group(1))} caracteres" if desc else "sin description")
    ok("hay imagen de vista previa para redes sociales",
       'property="og:image"' in html and (RAIZ / "docs" / "assets" / "social-preview.png").is_file())
    ok("declara el color de tema", 'name="theme-color"' in html)

    print("\nSin dependencias externas")
    externos = [
        u for u in re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
        if "github.com" not in u
    ]
    ok("no carga scripts, hojas ni fuentes de terceros", not externos, ", ".join(externos[:3]))
    ok("no usa @import ni @font-face remotos",
       "@import" not in html and "fonts.googleapis" not in html)
    ok("los estilos van incrustados en la propia página", "<style>" in html)

    print("\nEnlaces y recursos")
    relativos = {
        ref
        for ref in re.findall(r'(?:src|href)="([^"]+)"', html)
        if not ref.startswith(("http", "data:", "#", "mailto:"))
    }
    for ref in sorted(relativos):
        destino = RAIZ / "docs" / ref
        ok(f"existe {ref}", destino.exists(), str(destino))
    anclas = set(re.findall(r'href="#([^"]+)"', html))
    ids = set(re.findall(r'id="([^"]+)"', html))
    ok("cada enlace interno apunta a una sección real", anclas <= ids, ", ".join(sorted(anclas - ids)))

    print("\nAccesibilidad y contenido")
    imgs = re.findall(r"<img\b[^>]*>", html)
    sin_alt = [t for t in imgs if 'alt="' not in t or 'alt=""' in t]
    ok("todas las imágenes tienen texto alternativo", bool(imgs) and not sin_alt, f"{len(sin_alt)} sin alt")
    ok("las imágenes declaran tamaño (evita saltos al cargar)",
       all(re.search(r'width="\d+"', t) and re.search(r'height="\d+"', t) for t in imgs))
    ok("las imágenes que no se ven al abrir se cargan en diferido",
       html.count('loading="lazy"') >= 3)
    ok("hay una tabla de roles con encabezados de columna", "<thead>" in html and "<th scope=\"col\">" in html)
    ok("los pasos de instalación son una lista ordenada", "<ol class=\"pasos\">" in html)
    ok("hay enlace al manual completo", 'href="MANUAL_USUARIO.html"' in html)
    ok("hay enlace al vídeo de presentación", "novagest-promo-720p.mp4" in html)
    ok("hay enlace al repositorio", "https://github.com/yhquintero/inventario" in html)
    ok("la página no pesa más de 60 KB", PAGINA.stat().st_size <= 60 * 1024,
       f"{PAGINA.stat().st_size // 1024} KB")
    ok("se publica sin Jekyll (archivo .nojekyll)", (RAIZ / "docs" / ".nojekyll").is_file())

    print(f"\n{pruebas - len(fallos)}/{pruebas} comprobaciones correctas")
    if fallos:
        print("Fallos: " + ", ".join(fallos))
        return 1
    print("Página del proyecto correcta\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
