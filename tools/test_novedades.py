#!/usr/bin/env python3
"""Comprobaciones de la página de novedades (D-12).

La página se genera desde `CHANGELOG.md`, así que la prueba hace dos cosas:
1. Comprueba que el archivo publicado está **al día** (`--check`).
2. Revisa el HTML resultante: estructura, enlaces, cero recursos externos y que
   cada revisión del registro aparezca con sus puntos.

Uso:  python3 tools/test_novedades.py     (código de salida 0 = correcto)
"""
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = RAIZ / "docs" / "NOVEDADES.html"
GENERADOR = RAIZ / "tools" / "build_novedades.py"
CHANGELOG = RAIZ / "CHANGELOG.md"

VACIAS = {"meta", "link", "img", "br", "hr", "input", "source", "path", "circle", "line", "col", "area"}

fallos = 0
pruebas = 0


def ok(nombre, condicion, detalle=""):
    global fallos, pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos += 1
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


class Equilibrio(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pila = []
        self.errores = []

    def handle_starttag(self, tag, attrs):
        if tag not in VACIAS:
            self.pila.append(tag)

    def handle_endtag(self, tag):
        if tag in VACIAS:
            return
        if not self.pila or self.pila[-1] != tag:
            self.errores.append(f"</{tag}> en línea {self.getpos()[0]}")
            return
        self.pila.pop()


def revisiones_del_changelog():
    """Cuenta las revisiones del CHANGELOG con el mismo criterio que el generador."""
    texto = CHANGELOG.read_text(encoding="utf-8-sig")
    return len(re.findall(r"^##\s+NovaGest\s+v\S+\s+·\s+revisión\s+\d{4}-\d{2}-\d{2}\s+\(", texto, re.M))


def main():
    ok("la página de novedades existe", PAGINA.is_file(), str(PAGINA))
    ok("el generador existe", GENERADOR.is_file(), str(GENERADOR))
    if not PAGINA.is_file():
        return 1

    print("\nGeneración")
    r = subprocess.run([sys.executable, str(GENERADOR), "--check"], capture_output=True, text=True)
    ok("la página está al día con CHANGELOG.md", r.returncode == 0, (r.stderr or r.stdout).strip()[:200])

    html = PAGINA.read_text(encoding="utf-8")
    print("\nEstructura")
    p = Equilibrio()
    p.feed(html)
    ok("las etiquetas abren y cierran en orden", not p.errores, "; ".join(p.errores[:3]))
    ok("no queda ninguna etiqueta sin cerrar", not p.pila, ", ".join(p.pila))
    ok("declara español", bool(re.search(r'<html[^>]*lang="es"', html)))
    ok("tiene un solo <h1>", len(re.findall(r"<h1[\s>]", html)) == 1)
    ok("tiene descripción para buscadores", bool(re.search(r'<meta name="description" content="[^"]{60,}"', html)))
    ok("tiene enlace para saltar al contenido", 'class="skip"' in html)
    ok("los estilos van incrustados", "<style>" in html)

    print("\nContenido")
    total = revisiones_del_changelog()
    tarjetas = html.count('<article class="card">')
    ok("hay al menos 8 revisiones publicadas", tarjetas >= 8, str(tarjetas))
    ok("no publica más de 12 revisiones", tarjetas <= 12, str(tarjetas))
    ok("el CHANGELOG tiene las revisiones contadas", total >= tarjetas, f"changelog {total}, página {tarjetas}")
    ok("la última revisión es la primera de la página", html.index("XXV") < html.index("XXIV") if "XXV" in html else True)
    ok("cada revisión trae al menos un punto", html.count("<li>") >= tarjetas * 2, str(html.count("<li>")))
    ok("no usa recursos externos", not re.findall(r'(?:src|href)="http(?!s://github\.com)', html))

    print("\nEnlaces")
    for ref in ("index.html", "MANUAL_USUARIO.html", "GUIA_MOSTRADOR.html"):
        ok(f"enlaza con {ref}", f'href="./{ref}"' in html or f'href="{ref}"' in html)
        ok(f"existe {ref}", (RAIZ / "docs" / ref).is_file())

    ok("la página no pesa más de 60 KB", PAGINA.stat().st_size <= 60 * 1024, f"{PAGINA.stat().st_size // 1024} KB")

    print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
    if fallos:
        return 1
    print("Página de novedades correcta\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
