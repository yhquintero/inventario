#!/usr/bin/env python3
"""Comprobaciones de la guía de dos páginas del mostrador (D-10).

La guía se imprime y se pega junto a la caja, así que tiene que poder imprimirse
sola: sin recursos externos, en A4 y en dos páginas exactas.

Uso:  python3 tools/test_guia_mostrador.py     (código de salida 0 = correcto)
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIA = RAIZ / "docs" / "GUIA_MOSTRADOR.html"
FUENTE = RAIZ / "docs" / "GUIA_MOSTRADOR.md"

VACIAS = {"meta", "link", "img", "br", "hr", "input", "source", "path", "rect", "circle", "line", "col", "area"}

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
            if tag in self.pila:
                del self.pila[len(self.pila) - 1 - self.pila[::-1].index(tag):]
            return
        self.pila.pop()


def main():
    ok("la guía existe", GUIA.is_file(), str(GUIA))
    ok("el texto fuente existe", FUENTE.is_file(), str(FUENTE))
    if not GUIA.is_file():
        return 1

    html = GUIA.read_text(encoding="utf-8")
    print("\nEstructura")
    p = Equilibrio()
    p.feed(html)
    ok("las etiquetas abren y cierran en orden", not p.errores, "; ".join(p.errores[:3]))
    ok("no queda ninguna etiqueta sin cerrar", not p.pila, ", ".join(p.pila))
    ok("el documento declara español", bool(re.search(r'<html[^>]*lang="es"', html)))
    ok("tiene título de página", "<title>" in html and "Guía" in html)
    ok("tiene descripción para buscadores", bool(re.search(r'<meta name="description" content="[^"]{40,}"', html)))
    ok("la guía va en dos hojas", html.count('<article class="sheet">') == 2, str(html.count('<article class="sheet">')))

    print("\nImpresión")
    ok("declara papel A4", "@page" in html and "size: A4" in html)
    ok("la segunda hoja empieza en página nueva", "break-before: page" in html)
    ok("la franja de instrucciones no se imprime", ".howto { display: none; }" in html)
    ok("no pesa más de 40 KB", GUIA.stat().st_size <= 40 * 1024, f"{GUIA.stat().st_size // 1024} KB")
    ok("no carga nada de fuera", not re.findall(r'(?:src|href)="https?://', html), "recursos externos")
    ok("los estilos van dentro del archivo", "<style>" in html)

    print("\nContenido")
    for clave in ("Vender", "Fiar", "Imprimir el ticket", "Cuadre diario", "Verificar ticket",
                  "Reimprimir último ticket", "Antes de irme"):
        ok(f"explica «{clave}»", clave in html)
    bloques = re.findall(r'<h2><span class="n">(\d)</span>', html)
    ok("numera los bloques del 0 al 7", bloques == ["0", "1", "2", "3", "4", "5", "6", "7"], str(bloques))
    ok("la tabla de problemas tiene encabezados", "<thead>" in html and "<th>" in html)
    ok("enlaza con el manual completo", 'href="MANUAL_USUARIO.html"' in html and (RAIZ / "docs" / "MANUAL_USUARIO.html").is_file())
    ok("tiene casillas para marcar tareas", html.count('class="check"') >= 4)

    print(f"\n{pruebas - fallos}/{pruebas} comprobaciones correctas")
    if fallos:
        return 1
    print("Guía del mostrador correcta\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
