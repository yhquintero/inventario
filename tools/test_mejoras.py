#!/usr/bin/env python3
"""Comprobaciones del backlog de mejoras (cuarta ola) de docs/MEJORAS_PROPUESTAS.md.

La lista se usa para decidir qué se construye, así que tiene que ser **coherente y accionable**:
cada fila con su número, su impacto, su esfuerzo y su criterio de aceptación; sin identificadores
repetidos ni reutilizando uno ya entregado a medias.

    python3 tools/test_mejoras.py     (código de salida 0 = correcto)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DOC = RAIZ / "docs" / "MEJORAS_PROPUESTAS.md"

IMPACTOS = {"🔴", "🟠", "🟢"}
ESFUERZOS = {"⏱️", "⏳", "🧱"}

fallos: list[str] = []
pruebas = 0


def ok(nombre: str, condicion: bool, detalle: str = "") -> None:
    global pruebas
    pruebas += 1
    if condicion:
        print(f"  ✔ {nombre}")
    else:
        fallos.append(f"{nombre}{(' — ' + detalle) if detalle else ''}")
        print(f"  ✖ {nombre}{(' — ' + detalle) if detalle else ''}")


def main() -> int:
    ok("el documento de mejoras existe", DOC.is_file(), str(DOC))
    if not DOC.is_file():
        return 1
    texto = DOC.read_text(encoding="utf-8")

    # ------------------------- la cuarta ola existe -------------------------
    inicio = texto.find("## Cuarta ola")
    ok("hay una cuarta ola de propuestas", inicio > 0)
    if inicio < 0:
        return 1
    ola = texto[inicio:texto.find("## Cómo se supervisa", inicio)]
    ok("la cuarta ola se cierra antes de «Cómo se supervisa»", len(ola) > 3000, f"{len(ola)} caracteres")

    # ---------------------------- tres horizontes ---------------------------
    for titulo in ("### A · Corto plazo", "### B · Medio plazo", "### C · Largo plazo"):
        ok(f"existe el horizonte «{titulo.replace('### ', '')}»", titulo in ola)
    orden = [ola.find(t) for t in ("### A · Corto plazo", "### B · Medio plazo", "### C · Largo plazo")]
    ok("los horizontes van de corto a largo", orden == sorted(orden) and -1 not in orden, str(orden))

    # ------------------------------ filas ----------------------------------
    filas = [l for l in ola.split("\n") if l.startswith("| ") and not l.startswith("|---")]
    propuestas = [l for l in filas if re.match(r"^\|\s*[WASDG]-\d{2}\s*\|", l)]
    ok("hay al menos quince propuestas", len(propuestas) >= 15, f"{len(propuestas)}")
    ok("cada propuesta está en una tabla con criterio de aceptación",
       ola.count("Criterio de aceptación") >= 3, str(ola.count("Criterio de aceptación")))

    ids: list[str] = []
    for linea in propuestas:
        celdas = [c.strip() for c in linea.strip().strip("|").split("|")]
        ident = celdas[0]
        ids.append(ident)
        ok(f"{ident}: tiene 7 columnas (número, mejora, por qué, dónde, impacto, esfuerzo, criterio)",
           len(celdas) == 7, f"{len(celdas)} columnas")
        if len(celdas) != 7:
            continue
        ok(f"{ident}: impacto válido", any(i in celdas[4] for i in IMPACTOS), celdas[4])
        ok(f"{ident}: esfuerzo válido", any(e in celdas[5] for e in ESFUERZOS), celdas[5])
        ok(f"{ident}: explica por qué duele", len(celdas[2]) >= 40, f"{len(celdas[2])} caracteres")
        ok(f"{ident}: dice dónde se hace", len(celdas[3]) >= 3, celdas[3])
        ok(f"{ident}: trae criterio de aceptación", len(celdas[6]) >= 40, f"{len(celdas[6])} caracteres")

    ok("no hay identificadores repetidos en la cuarta ola", len(ids) == len(set(ids)),
       str([i for i in ids if ids.count(i) > 1]))
    ok("usa los prefijos del proyecto (W, A, S, D, G)",
       all(re.match(r"^[WASDG]-\d{2}$", i) for i in ids), str([i for i in ids if not re.match(r"^[WASDG]-\d{2}$", i)]))

    # ------------------- no reutilizar lo ya entregado ---------------------
    # Filas entregadas (con ✅) fuera de la cuarta ola: un id de esas no puede volver a proponerse
    # como pendiente, salvo que la cuarta ola no lo incluya (aquí simplemente se avisa).
    entregadas = set()
    for linea in texto[:inicio].split("\n"):
        m = re.match(r"^\|\s*([WASDG]-\d{2})\s*\|", linea)
        if m and "✅" in linea:
            entregadas.add(m.group(1))
    choques = sorted(set(ids) & entregadas)
    ok("ninguna propuesta repite algo ya entregado", not choques, str(choques))

    # ---------------------- lo pendiente sigue pendiente -------------------
    ok("S-04 (instalador) sigue en la lista", "S-04" in ids)
    ok("el orden recomendado empieza por S-04",
       re.search(r"### Orden recomendado\n\n\*\*S-04\*\*", ola) is not None)

    # ------------------------- descartadas y método ------------------------
    ok("hay una tabla de descartadas con su motivo", "### Descartadas por ahora" in ola)
    descartadas = [
        l for l in ola.split("\n")
        if l.startswith("| ") and l.count("|") == 3 and not l.startswith("| Idea") and not l.startswith("|---")
    ]
    ok("hay al menos cinco descartadas con su motivo", len(descartadas) >= 5, f"{len(descartadas)} filas")
    ok("cada descartada explica el motivo",
       all(len(l.strip("|").split("|")[1].strip()) >= 30 for l in descartadas), "alguna fila sin motivo")
    ok("explica cómo se ordena el trabajo", "**Cómo se ordena**" in ola)

    # --------------------- la cabecera apunta bien ------------------------
    cabecera = texto[:inicio]
    ok("la cabecera del documento apunta a S-04 primero", "**S-04** (instalador de Windows)" in cabecera)
    ok("la cabecera remite a la cuarta ola", "cuarta ola" in cabecera)

    print()
    if fallos:
        print(f"✖ {len(fallos)} fallo(s) de {pruebas}:")
        for f in fallos:
            print("  · " + f)
        return 1
    print(f"{pruebas}/{pruebas} comprobaciones correctas · backlog de mejoras")
    return 0


if __name__ == "__main__":
    sys.exit(main())
