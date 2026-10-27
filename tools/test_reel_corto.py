#!/usr/bin/env python3
"""Pruebas del corte vertical de 15 s (G-02) de tools/build_reel_vertical.py.

Comprueba el guion del corte corto (cuatro tramos), que la duración prevista quepa
en 15 s, que los textos quepan en pantalla y que, si el video ya está renderizado,
exista junto a su archivo de subtítulos y dure lo que debe durar.

    python3 tools/test_reel_corto.py
"""

from __future__ import annotations

import importlib.util
import os
import re
import struct
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO_DIR = ROOT / "docs" / "assets" / "video"
MP4 = VIDEO_DIR / "novagest-reel-vertical-15s.mp4"
SRT = VIDEO_DIR / "novagest-reel-vertical-15s.srt"

fallos: list[str] = []
total = 0


def check(ok: bool, que: str, detalle: str = "") -> None:
    global total
    total += 1
    if not ok:
        fallos.append(f"{que}{(' · ' + detalle) if detalle else ''}")


def sin_pillow() -> None:
    """El generador importa Pillow, pero estas pruebas solo leen su guion.

    En un equipo sin Pillow (o en el CI que no lo instala) se deja un módulo vacío para
    poder cargar el script: no se dibuja nada, así que no hace falta la librería real.
    """
    for nombre in ("PIL", "PIL.Image", "PIL.ImageDraw", "PIL.ImageFilter", "PIL.ImageFont"):
        if nombre not in sys.modules:
            sys.modules[nombre] = types.ModuleType(nombre)
    sys.modules["PIL"].Image = sys.modules["PIL.Image"]


def load_module():
    spec = importlib.util.spec_from_file_location("reel", ROOT / "tools" / "build_reel_vertical.py")
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod          # dataclass necesita el módulo registrado
    spec.loader.exec_module(mod)
    return mod


def mp4_duracion(path: Path) -> float:
    """Duración del MP4 leída del átomo mvhd (sin ffmpeg ni dependencias)."""
    data = path.read_bytes()
    idx = data.find(b"mvhd")
    if idx < 0:
        return 0.0
    version = data[idx + 4]
    if version == 1:
        timescale, duration = struct.unpack(">IQ", data[idx + 24:idx + 36])
    else:
        timescale, duration = struct.unpack(">II", data[idx + 16:idx + 24])
    return duration / timescale if timescale else 0.0


def main() -> int:
    if os.environ.get("REEL_TEST_SIN_PIL") or importlib.util.find_spec("PIL") is None:
        sin_pillow()
    reel = load_module()

    # --- guion del corte corto ------------------------------------------------
    escenas = reel.SCENES_CORTO
    check(len(escenas) == 4, "el corte corto tiene 4 tramos", f"hay {len(escenas)}")
    check([e.audio for e in escenas] == ["s1", "s2", "s3", "s4"], "los audios son s1…s4")
    check(len(reel.NARRATION_CORTO) == len(escenas), "hay una locución por tramo")

    suma = sum(e.slot for e in escenas)
    check(suma <= 15.0, "la duración prevista no pasa de 15 s", f"{suma:.1f} s")
    check(suma >= 12.0, "la duración prevista aprovecha los 15 s", f"{suma:.1f} s")
    check(suma < sum(e.slot for e in reel.SCENES), "el corte corto dura menos que el de 30 s")

    # --- lo que se ve en pantalla --------------------------------------------
    for i, e in enumerate(escenas, 1):
        check(bool(e.kicker.strip()), f"tramo {i}: tiene rótulo superior")
        check(bool(e.title.strip()), f"tramo {i}: tiene texto grande")
        check(len(e.title) <= 34, f"tramo {i}: el texto grande cabe en una línea", e.title)
        check(len(e.sub) <= 48, f"tramo {i}: el subtítulo es corto", e.sub)
        check(len(e.bullets) <= 3, f"tramo {i}: como mucho tres viñetas")
        if e.image:
            check((reel.SHOTS / e.image).is_file(), f"tramo {i}: la captura existe", e.image)

    check(escenas[0].kind == "opening", "el primer tramo es la portada")
    check(escenas[-1].kind == "closing", "el último tramo cierra con la marca")
    check("NovaGest" in escenas[-1].title or "NOVAGEST" in escenas[-1].kicker,
          "el cierre nombra a NovaGest")

    # --- locución -------------------------------------------------------------
    for i, texto in enumerate(reel.NARRATION_CORTO, 1):
        palabras = len(texto.split())
        check(4 <= palabras <= 12, f"locución {i}: frase corta ({palabras} palabras)")
        check(texto.endswith((".", "!", "?")), f"locución {i}: termina en pausa")
        check(not re.search(r"[<>{}\[\]]", texto), f"locución {i}: sin marcas ni etiquetas")

    palabras_total = sum(len(t.split()) for t in reel.NARRATION_CORTO)
    check(palabras_total <= 38, "la locución cabe en 15 s", f"{palabras_total} palabras")

    # --- el video, si está renderizado ---------------------------------------
    if MP4.is_file():
        dur = mp4_duracion(MP4)
        check(14.0 <= dur <= 16.5, "el MP4 dura ~15 s", f"{dur:.1f} s")
        check(MP4.stat().st_size > 200_000, "el MP4 no está vacío",
              f"{MP4.stat().st_size / 1024:.0f} KB")
        check(SRT.is_file(), "el MP4 trae subtítulos .srt")
        if SRT.is_file():
            lineas = [ln for ln in SRT.read_text(encoding="utf-8").splitlines() if ln.strip()]
            check(lineas[0].strip() == "1", "el .srt empieza en el subtítulo 1")
            check(sum(1 for ln in lineas if "-->" in ln) >= 4, "el .srt tiene al menos 4 bloques")
    else:
        print("· aviso: el MP4 de 15 s aún no está renderizado (falta la locución)")

    # --- y el guion largo no se rompió ---------------------------------------
    check(len(reel.SCENES) == 6, "el corte de 30 s sigue teniendo 6 tramos")
    check(len(reel.NARRATION) == 6, "el corte de 30 s conserva su locución")

    if fallos:
        print("FALLOS:")
        for f in fallos:
            print(f"  ✗ {f}")
        print(f"{total - len(fallos)}/{total} OK")
        return 1
    print(f"{total}/{total} OK · corte vertical de 15 s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
