#!/usr/bin/env python3
"""Pruebas del carrusel de 6 imágenes para redes (G-03).

Comprueba el guion de las seis piezas, que las imágenes generadas tengan el tamaño exacto
(1080 × 1350), que todas pesen menos de lo que admiten las redes, que el ZIP esté completo y
que la guía de publicación exista y cite cada archivo.

    python3 tools/test_carrusel_redes.py

Si Pillow no está instalado, se saltan las comprobaciones de los PNG (el CI no siempre lo tiene)
pero se siguen revisando el guion, el ZIP y la documentación.
"""

from __future__ import annotations

import importlib.util
import re
import sys
import types
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REDES = ROOT / "docs" / "assets" / "redes"
GUIA = ROOT / "docs" / "REDES_SOCIALES.md"
ZIP = REDES / "novagest-carrusel-6.zip"

fallos: list[str] = []
total = 0


def check(ok: bool, que: str, detalle: str = "") -> None:
    global total
    total += 1
    if not ok:
        fallos.append(f"{que}{(' · ' + detalle) if detalle else ''}")


def sin_pillow() -> bool:
    """Comprueba que Pillow sirve de verdad; si no, deja módulos vacíos para leer el guion.

    No basta con que `import PIL` funcione: en algunos equipos (y en el CI) queda un Pillow a
    medias que importa pero no dibuja. Se prueba a crear una imagen de 2 × 2 px.
    """
    try:
        from PIL import Image  # noqa: F401

        Image.new("RGB", (2, 2))
        return False
    except Exception:
        for nombre in ("PIL", "PIL.Image", "PIL.ImageDraw", "PIL.ImageFont", "PIL.ImageFilter"):
            sys.modules[nombre] = types.ModuleType(nombre)
        return True


def cargar_modulo():
    spec = importlib.util.spec_from_file_location("carrusel", ROOT / "tools" / "build_carrusel_redes.py")
    mod = importlib.util.module_from_spec(spec)
    sys.modules["carrusel"] = mod
    spec.loader.exec_module(mod)
    return mod


hay_pillow = not sin_pillow()
mod = cargar_modulo()
SLIDES = mod.SLIDES

# ------------------------------ guion de las piezas ------------------------------
check(len(SLIDES) == 6, "el carrusel tiene seis piezas", f"hay {len(SLIDES)}")
nombres = [s.file for s in SLIDES]
check(len(set(nombres)) == 6, "cada pieza tiene un archivo distinto")
check(nombres[0].startswith("01-") and nombres[-1].startswith("06-"), "los archivos van numerados en orden")
check(all(n.endswith(".png") for n in nombres), "todas las piezas son PNG")
check([s.kind for s in SLIDES] == ["opening", "shot", "shot", "shot", "phone", "closing"],
      "la historia abre, muestra tres pasos, el móvil y cierra")
check(len({s.kicker for s in SLIDES}) == 6, "cada pieza tiene su propio rótulo")
for s in SLIDES:
    check(bool(s.title.strip()), f"{s.file} tiene titular")
    check(len(s.title) <= 60, f"{s.file}: el titular es corto", s.title)
    check(len(s.sub) <= 130, f"{s.file}: el subtítulo cabe en tres líneas", s.sub)
    check(len(s.bullets) <= 3, f"{s.file}: como mucho tres puntos", s.file)
    for b in s.bullets:
        check(len(b) <= 60, f"{s.file}: el punto es corto", b)
# La portada y el cierre no dependen de capturas: así el carrusel nunca sale con huecos.
check(SLIDES[0].image is None and SLIDES[5].image is None, "portada y cierre no usan capturas")
for s in SLIDES:
    if s.image:
        check((ROOT / "docs" / "assets" / "capturas" / s.image).exists(),
              f"{s.file}: la captura {s.image} existe")
# No se prometen cifras ni resultados: es una regla de la marca.
for s in SLIDES:
    texto = " ".join([s.title, s.sub, *s.bullets]).lower()
    for prohibido in ("%", "ahorre", "duplique", "garantiza"):
        check(prohibido not in texto, f"{s.file}: sin promesas de resultado", prohibido)

# ------------------------------ imágenes generadas ------------------------------
if hay_pillow:
    from PIL import Image  # noqa: E402

    for s in SLIDES:
        ruta = REDES / s.file
        check(ruta.exists(), f"{s.file} está generado")
        if not ruta.exists():
            continue
        with Image.open(ruta) as img:
            check(img.size == (1080, 1350), f"{s.file}: 1080 × 1350", str(img.size))
            check(img.format == "PNG", f"{s.file}: es PNG", str(img.format))
        check(ruta.stat().st_size < 5 * 1024 * 1024, f"{s.file}: menos de 5 MB para las redes")
else:
    print("· Pillow no está instalado: se omiten las comprobaciones de los PNG")

# ------------------------------------ ZIP ------------------------------------
check(ZIP.exists(), "el ZIP del carrusel existe")
if ZIP.exists():
    with zipfile.ZipFile(ZIP) as z:
        dentro = z.namelist()
        check(len([n for n in dentro if n.endswith(".png")]) == 6, "el ZIP lleva las seis piezas", str(dentro))
        check(all(n == Path(n).name for n in dentro), "sin carpetas dentro del ZIP (se suben tal cual)")
        check("textos-para-publicar.md" in dentro, "el ZIP incluye los textos de la publicación")
        check(z.testzip() is None, "el ZIP no está dañado")

# -------------------------------- documentación --------------------------------
check(GUIA.exists(), "la guía de publicación existe")
if GUIA.exists():
    guia = GUIA.read_text(encoding="utf-8")
    for s in SLIDES:
        check(s.file in guia, f"la guía cita {s.file}")
    check("1080 × 1350" in guia or "1080 × 1350 px" in guia, "la guía explica el formato")
    check(re.search(r"1\. Abra la red social", guia) is not None, "la guía explica cómo publicarlo")
    check("#NovaGest" in guia, "la guía trae las etiquetas de la publicación")
    check(len(guia) > 1500, "la guía es una página completa, no un esbozo")

# ---------------------------------- resultado ----------------------------------
if fallos:
    print(f"✗ {len(fallos)} fallo(s) de {total}:")
    for f in fallos:
        print("  · " + f)
    raise SystemExit(1)
print(f"{total}/{total} comprobaciones correctas · carrusel de 6 imágenes (G-03)")
