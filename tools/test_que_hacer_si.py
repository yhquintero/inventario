#!/usr/bin/env python3
"""Comprobaciones de la guía de una página «Qué hacer si…» (D-13).

Se imprime y se pega junto a la caja, así que tiene que: caber en **una** página A4, imprimirse
sin recursos externos y traer los mismos catorce casos en el HTML y en el texto.

    python3 tools/test_que_hacer_si.py     (código de salida 0 = correcto)
"""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GUIA = RAIZ / "docs" / "QUE_HACER_SI.html"
FUENTE = RAIZ / "docs" / "QUE_HACER_SI.md"

VACIAS = {"meta", "link", "img", "br", "hr", "input", "source", "path", "rect", "circle", "line", "col", "area"}

fallos = 0
pruebas = 0


def ok(nombre: str, condicion: bool, detalle: str = "") -> None:
    global fallos, pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos += 1
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


class Equilibrio(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.pila: list[str] = []
        self.errores: list[str] = []

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


def main() -> int:
    ok("la guía imprimible existe", GUIA.is_file(), str(GUIA))
    ok("el texto fuente existe", FUENTE.is_file(), str(FUENTE))
    if not GUIA.is_file() or not FUENTE.is_file():
        return 1

    html = GUIA.read_text(encoding="utf-8")
    md = FUENTE.read_text(encoding="utf-8")

    # ------------------------------ estructura ------------------------------
    p = Equilibrio()
    p.feed(html)
    ok("las etiquetas abren y cierran en orden", not p.errores, "; ".join(p.errores[:3]))
    ok("declara el idioma español", '<html lang="es">' in html)
    ok("tiene un solo <h1>", html.count("<h1>") == 1, str(html.count("<h1>")))
    ok("tiene descripción para buscadores", '<meta name="description"' in html)
    ok("tiene título propio", "<title>Qué hacer si… · NovaGest</title>" in html)

    # --------------------------- una sola página ---------------------------
    ok("hay una sola hoja", html.count('class="sheet"') == 1, str(html.count('class="sheet"')))
    ok("el tamaño de papel está fijado en A4", "@page { size: A4" in html)
    ok("la hoja mide 210 mm de ancho", "width: 210mm" in html)
    ok("los bloques no se cortan entre páginas", "break-inside: avoid" in html)
    ok("la letra base es compacta (≤ 9 pt)", re.search(r"body \{[^}]*font: 8\.\d+pt", html) is not None)
    ok("los márgenes de impresión son estrechos", re.search(r"@page \{ size: A4; margin: 9mm 8mm", html) is not None)
    ok("la franja de ayuda no se imprime", ".howto { display: none; }" in html)

    # ------------------------ sin recursos externos ------------------------
    ok("no carga scripts de terceros", "<script" not in html.lower())
    ok("no enlaza hojas de estilo externas", 'rel="stylesheet"' not in html)
    ok("no hay @import remoto", "@import" not in html)
    ok("no hay imágenes externas", "http://" not in html and "https://" not in html)
    ok("el icono es un SVG dibujado aquí", "<svg" in html and "viewBox" in html)

    # ------------------------------- contenido -----------------------------
    casos = re.findall(r'<section class="caso[^"]*" id="([^"]+)">', html)
    ok("hay catorce casos", len(casos) == 14, f"hay {len(casos)}")
    ok("cada caso tiene identificador único", len(set(casos)) == len(casos))
    titulos = re.findall(r'<h2><span class="n">(\d+)</span> ([^<]+)</h2>', html)
    ok("los casos van numerados del 1 al 14", [int(n) for n, _ in titulos] == list(range(1, 15)),
       str([n for n, _ in titulos]))
    ok("cada caso dice qué se ve (síntoma)", html.count('class="sintoma"') == 14,
       str(html.count('class="sintoma"')))
    ok("cada caso termina con la salida esperada", html.count('class="fin"') == 14, str(html.count('class="fin"')))
    pasos = len(re.findall(r"<li>", html))
    ok("cada caso trae pasos concretos (≥ 3 por caso)", pasos >= 42, f"{pasos} pasos")
    # Servidor caído, contraseña perdida y restauración: los tres que paran la caja.
    altos = re.findall(r'<section class="caso alto" id="([^"]+)">', html)
    ok("se marcan los casos de riesgo", len(altos) == 3, str(altos))

    # Los temas que de verdad pasan en la caja tienen que estar todos.
    for tema, patron in [
        ("servidor apagado", r"pantalla del servidor"),
        ("sincronización", r"Sincronizar ahora"),
        ("cuadre", r"tasa del día"),
        ("impresión", r"Bluetooth"),
        ("lector de códigos", r"caja de código"),
        ("stock", r"Stock actual"),
        ("límite de crédito", r"límite de crédito"),
        ("papelera", r"Papelera"),
        ("contraseña y 2FA", r"Quitar 2FA"),
        ("copias de seguridad", r"Restaurar"),
        ("licencia", r"código de equipo"),
        ("ticket auténtico", r"Verificar ticket"),
        ("WhatsApp", r"Imagen \+ texto"),
        ("lentitud", r"Ctrl"),
    ]:
        ok(f"cubre {tema}", re.search(patron, html) is not None)

    # El texto fuente dice lo mismo.
    ok("el texto fuente tiene los catorce casos",
       len(re.findall(r"^## \d+ · ", md, re.M)) == 14, str(len(re.findall(r"^## \d+ · ", md, re.M))))
    ok("el texto fuente enlaza la versión imprimible", "QUE_HACER_SI.html" in md)
    ok("explica para qué sirve la página", "pegar junto a la caja" in md)
    ok("trae la regla de oro (no borrar, no ajustar)",
       "no borre nada y no ajuste cifras" in md.lower())
    # Los dos documentos cuentan los mismos catorce casos, en el mismo orden.
    titulos_md = re.findall(r"^## (\d+) · (.+)$", md, re.M)
    ok("el texto fuente numera del 1 al 14", [int(n) for n, _ in titulos_md] == list(range(1, 15)),
       str([n for n, _ in titulos_md]))
    for (_, t_html), (_, t_md) in zip(titulos, titulos_md):
        ok(f"«{t_html.strip()}» coincide en papel y en texto",
           t_html.strip().lower()[:22] == t_md.strip().lower()[:22], t_md)

    # ------------------------------- tamaño --------------------------------
    ok("la guía pesa menos de 60 KB", GUIA.stat().st_size < 60_000, f"{GUIA.stat().st_size // 1024} KB")
    ok("el texto fuente no es un esbozo", len(md) > 3000, f"{len(md)} caracteres")

    print()
    if fallos:
        print(f"✖ {fallos} fallo(s) de {pruebas}")
        return 1
    print(f"{pruebas}/{pruebas} comprobaciones correctas · guía «Qué hacer si…» (D-13)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
