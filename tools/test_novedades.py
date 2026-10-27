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
    # La página publica la revisión más nueva arriba: se comprueba con los dos primeros
    # títulos del CHANGELOG (no con números romanos fijos, que cambian en cada entrega).
    titulos = [t.strip() for t in re.findall(r"^##\s+NovaGest\s+v\S+\s+·\s+revisión[^(]*\([^)]+\)\s*·\s*(.+)$",
                                            CHANGELOG.read_text(encoding="utf-8-sig"), re.M)]
    if len(titulos) >= 2:
        ok("la revisión más nueva va primero en la página",
           html.find(f"<h2>{titulos[0]}</h2>") != -1 and html.find(f"<h2>{titulos[1]}</h2>") != -1
           and html.index(f"<h2>{titulos[0]}</h2>") < html.index(f"<h2>{titulos[1]}</h2>"),
           f"{titulos[0]!r} · {titulos[1]!r}")
    else:
        ok("la revisión más nueva va primero en la página", False, "no se pudieron leer los títulos")
    ok("cada revisión trae al menos un punto", html.count("<li>") >= tarjetas * 2, str(html.count("<li>")))
    ok("no usa recursos externos", not re.findall(r'(?:src|href)="http(?!s://github\.com)', html))

    # El generador lee el número romano de la revisión: si algún día pasa de XXXIX no se
    # puede quedar una revisión fuera de la página sin que nadie se entere.
    numeros = re.findall(
        r"^##\s+NovaGest\s+v\S+\s+·\s+revisión\s+\d{4}-\d{2}-\d{2}\s+\(([IVXLCDM]+)\)",
        CHANGELOG.read_text(encoding="utf-8-sig"), re.M)
    ok("todas las revisiones llevan número romano reconocible", len(numeros) == total,
       f"{len(numeros)} de {total}")

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
