#!/usr/bin/env python3
"""Genera el corte vertical de 30 s de NovaGest (9:16, 1080 × 1920) para estados de
WhatsApp, Reels, TikTok y Shorts (G-01 / D-11).

Requisitos: Pillow e imageio-ffmpeg (o un ffmpeg en el PATH).

Uso:
    python3 tools/build_reel_vertical.py \
        --audio /ruta/a/audio      # s1.wav … s6.wav (un clip por escena, en orden)

Salida:
    docs/assets/video/novagest-reel-vertical-30s.mp4
    docs/assets/video/novagest-reel-vertical-30s.srt

El guion está en docs/PROPUESTA_VIDEO_PROMOCIONAL.md (§6.1). El texto en pantalla se
mantiene legible sin sonido: es la forma normal de verlo en el móvil.
"""

from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
import wave
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H, FPS = 1080, 1920, 30
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "assets" / "capturas"
BRAND = ROOT / "brand" / "novagest-icon.png"
MOVIL = ROOT / "docs" / "assets" / "novagest-movil.png"

NAVY = (8, 10, 26)
INK = (255, 255, 255)
DIM = (198, 201, 226)
GOLD = (245, 179, 1)
VIOLET = (129, 122, 255)
GREEN = (52, 211, 153)

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
F = str(FONT_DIR / "DejaVuSans.ttf")
FB = str(FONT_DIR / "DejaVuSans-Bold.ttf")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FB if bold else F, size)


@dataclass
class Scene:
    """Un tramo del corte vertical: rótulo, texto grande, imagen y locución."""

    kicker: str
    title: str
    sub: str = ""
    image: str | None = None           # archivo de docs/assets/capturas
    kind: str = "shot"                 # shot | phone | opening | closing
    audio: str = ""                    # nombre base del clip (s1, s2, …)
    slot: float = 5.0                  # duración prevista en segundos
    bullets: list[str] = field(default_factory=list)


SCENES: list[Scene] = [
    Scene(
        kicker="NOVAGEST 1.0",
        title="Todo tu negocio en una app",
        sub="Inventario · Venta · Caja · Informes",
        kind="opening", audio="s1", slot=5.3,
        bullets=["Web instalable", "Android", "Los mismos datos"],
    ),
    Scene(
        kicker="PASO 1 · VENDER",
        title="Escanea, cobra, listo",
        sub="El stock baja solo. Contado o fiado.",
        image="venta-rapida.png", kind="shot", audio="s2", slot=4.5,
    ),
    Scene(
        kicker="PASO 2 · CUADRAR",
        title="La caja tiene que dar cero",
        sub="Tasa, fondos, gastos y salidas: el cuadre al instante.",
        image="cuadre-diario.png", kind="shot", audio="s3", slot=4.0,
    ),
    Scene(
        kicker="PASO 3 · REVISAR",
        title="Ventas, metas y existencia",
        sub="Informe semanal, análisis y comprobación del inventario.",
        image="analisis-y-metas.png", kind="shot", audio="s4", slot=5.0,
    ),
    Scene(
        kicker="TAMBIÉN EN EL MÓVIL",
        title="Los mismos datos, en tu teléfono",
        sub="Vende desde el Android y sincroniza al instante.",
        kind="phone", audio="s5", slot=4.5,
    ),
    Scene(
        kicker="NOVAGEST",
        title="Gestiona. Crece. Avanza.",
        sub="Web y Android, con los mismos datos",
        kind="closing", audio="s6", slot=6.7,
    ),
]


# ------------------------------------------------------------------ piezas gráficas
def logo_tile(size: int) -> Image.Image:
    """Icono de marca dentro de un cuadrado redondeado (o el dibujo si falta el PNG)."""
    if BRAND.exists():
        icon = Image.open(BRAND).convert("RGBA")
        icon.thumbnail((size, size), Image.LANCZOS)
        tile = Image.new("RGBA", (icon.width, icon.height), (0, 0, 0, 0))
        tile.alpha_composite(icon, (0, 0))
        return rounded(tile, max(8, int(size * 0.22)))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, size, size], radius=int(size * 0.26), fill=VIOLET)
    d.text((size * 0.28, size * 0.18), "N", font=font(int(size * 0.6), True), fill=INK)
    return tile


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0], img.size[1]], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def with_shadow(tile: Image.Image, blur: int = 24, alpha: int = 160, dy: int = 20) -> Image.Image:
    pad = blur * 2
    canvas = Image.new("RGBA", (tile.width + pad * 2, tile.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [pad, pad + dy, pad + tile.width, pad + dy + tile.height], radius=28, fill=(0, 0, 0, alpha)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))
    canvas.alpha_composite(tile, (pad, pad))
    return canvas


def background() -> Image.Image:
    """Fondo vertical: degradado azul noche con dos halos (violeta arriba, verde abajo)."""
    base = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(base)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(8 + 12 * t), int(10 + 8 * t), int(26 + 26 * t)))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-320, -420, 760, 500], fill=(*VIOLET, 92))
    g.ellipse([W - 520, H - 620, W + 320, H + 180], fill=(*GREEN, 60))
    return Image.alpha_composite(base.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(120)))


BG: Image.Image


def shot_card(name: str, max_w: int) -> Image.Image:
    """Captura de la Web dentro de una tarjeta redondeada con sombra."""
    path = SHOTS / name
    if not path.exists():
        return Image.new("RGBA", (max_w, int(max_w * 0.6)), (20, 22, 44, 255))
    img = Image.open(path).convert("RGBA")
    img.thumbnail((max_w, max_w), Image.LANCZOS)
    return rounded(img, 26)


def phone_card(max_w: int) -> Image.Image:
    """Captura del móvil; si falta, el icono de la app."""
    if MOVIL.exists():
        img = Image.open(MOVIL).convert("RGBA")
        img.thumbnail((max_w, int(max_w * 2)), Image.LANCZOS)
        return rounded(img, 34)
    return logo_tile(max_w)


def wrap(text: str, fnt: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if fnt.getlength(probe) <= width:
            cur = probe
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def centered(draw: ImageDraw.ImageDraw, y: int, text: str, fnt, fill, max_w: int, gap: int = 12) -> int:
    for line in wrap(text, fnt, max_w):
        w = draw.textlength(line, font=fnt)
        draw.text(((W - w) / 2, y), line, font=fnt, fill=fill)
        y += fnt.size + gap
    return y


def progress_bar(frame: Image.Image, index: int, total: int) -> None:
    """Segmentos arriba: cuántos tramos van y cuántos faltan."""
    d = ImageDraw.Draw(frame)
    margin, gap, top, height = 64, 10, 54, 10
    width = (W - margin * 2 - gap * (total - 1)) / total
    for i in range(total):
        x0 = margin + i * (width + gap)
        color = GOLD if i <= index else (255, 255, 255, 60)
        d.rounded_rectangle([x0, top, x0 + width, top + height], radius=5, fill=color)


def scene_frame(sc: Scene, t: float, dur: float, index: int, total: int) -> Image.Image:
    frame = BG.copy()
    d = ImageDraw.Draw(frame)
    progress_bar(frame, index, total)

    # Marca arriba
    tile = logo_tile(112)
    frame.alpha_composite(tile, (64, 108))
    d = ImageDraw.Draw(frame)
    d.text((200, 122), "NovaGest", font=font(52, True), fill=INK)
    d.text((202, 184), "Inventario · Venta · Caja", font=font(26), fill=DIM)

    # Rótulo de la escena
    y = 300
    kicker_font = font(34, True)
    kw = d.textlength(sc.kicker, font=kicker_font)
    d.rounded_rectangle([(W - kw) / 2 - 24, y, (W + kw) / 2 + 24, y + 56], radius=28,
                        fill=(255, 255, 255, 26), outline=(*GOLD, 150), width=2)
    d.text(((W - kw) / 2, y + 10), sc.kicker, font=kicker_font, fill=GOLD)

    # Título grande
    y = 400
    y = centered(d, y, sc.title, font(74, True), INK, W - 140, gap=8)

    # Imagen o ilustración central
    center_top = y + 40
    if sc.kind == "shot" and sc.image:
        card = with_shadow(shot_card(sc.image, W - 170))
    elif sc.kind == "phone":
        card = with_shadow(phone_card(int(W * 0.52)))
    elif sc.kind == "opening":
        card = with_shadow(logo_tile(int(W * 0.46)))
    else:
        card = with_shadow(logo_tile(int(W * 0.40)))
    max_card_h = H - center_top - 700
    if card.height > max_card_h:
        scale = max_card_h / card.height
        card = card.resize((int(card.width * scale), max_card_h), Image.LANCZOS)
    frame.alpha_composite(card, ((W - card.width) // 2, center_top + max(0, (max_card_h - card.height) // 2)))

    # Subtítulo y puntos de apoyo abajo
    d = ImageDraw.Draw(frame)
    y = H - (700 if sc.kind == "closing" else 650)
    if sc.sub:
        y = centered(d, y, sc.sub, font(40), DIM, W - 170, gap=10)
    if sc.bullets:
        y += 8
        for b in sc.bullets:
            d.ellipse([(W / 2) - 220, y + 16, (W / 2) - 202, y + 34], fill=GREEN)
            d.text(((W / 2) - 186, y), b, font=font(36), fill=INK)
            y += 56

    # Pie de marca y llamada a la acción
    if sc.kind == "closing":
        d.rounded_rectangle([90, H - 236, W - 90, H - 116], radius=60, fill=(*GOLD, 235))
        cta = "Solicita tu licencia por WhatsApp"
        cw = d.textlength(cta, font=font(38, True))
        d.text(((W - cw) / 2, H - 208), cta, font=font(38, True), fill=(25, 20, 5))
    else:
        pie = "NovaGest · gestión de inventario y ventas"
        pw = d.textlength(pie, font=font(26))
        d.text(((W - pw) / 2, H - 132), pie, font=font(26), fill=(208, 212, 238))
    return frame


# ------------------------------------------------------------------ audio y subtítulos
def wav_duration(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def build_audio(audios: list[Path], slots: list[float], out: Path) -> tuple[list[float], float]:
    """Coloca cada locución al inicio de su tramo y rellena con silencio.

    Devuelve el inicio de cada escena y la duración real de cada tramo (que puede
    crecer si la locución no cabe en el hueco previsto).
    """
    params = None
    starts: list[float] = []
    durs: list[float] = []
    chunks: list[bytes] = []
    cursor = 0.0
    for path, slot in zip(audios, slots):
        with wave.open(str(path)) as w:
            if params is None:
                params = (w.getnchannels(), w.getsampwidth(), w.getframerate())
            frames = w.readframes(w.getnframes())
            dur = wav_duration(path)
        real = max(slot, dur + 0.7)          # aire al final para respirar
        silencio = b"\x00" * int((real - dur) * params[2]) * params[0] * params[1]
        starts.append(cursor)
        chunks += [frames, silencio]
        durs.append(real)
        cursor += real
    with wave.open(str(out), "wb") as w:
        w.setnchannels(params[0])
        w.setsampwidth(params[1])
        w.setframerate(params[2])
        for c in chunks:
            w.writeframes(c)
    return starts, cursor


def srt_time(s: float) -> str:
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    sec, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def ass_time(s: float) -> str:
    cs = int(round(s * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    sec, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{sec:02d}.{cs:02d}"


def chunk_text(text: str, limit: int = 64) -> list[str]:
    """Rótulos de subtítulo de la locución completa de la escena.

    Solo se parte si de verdad no cabe en dos líneas del ancho del video, y siempre por
    un espacio, nunca a mitad de palabra.
    """
    frase = " ".join(text.split())
    out: list[str] = []
    while len(frase) > limit:
        corte = frase.rfind(" ", 0, limit)
        corte = corte if corte > 10 else limit
        out.append(frase[:corte].strip())
        frase = frase[corte:].strip()
    if frase:
        out.append(frase)
    return out or [text]


def write_subs(entradas: list[tuple[float, float, str]], ass_path: Path, srt_path: Path) -> None:
    ass = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}",
        "WrapStyle: 0", "", "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, OutlineColour, BackColour, Bold, "
        "Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        "Style: Base,DejaVu Sans,44,&H00FFFFFF,&H00101010,&H90000000,-1,0,1,4,0,2,80,80,250,1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    for i, (a, b, texto) in enumerate(entradas, 1):
        ass.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Base,,0,0,0,,{texto}")
    ass_path.write_text("\n".join(ass) + "\n", encoding="utf-8")

    lineas = []
    for i, (a, b, texto) in enumerate(entradas, 1):
        lineas += [str(i), f"{srt_time(a)} --> {srt_time(b)}", texto, ""]
    srt_path.write_text("\n".join(lineas), encoding="utf-8")


def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("No se encontró ffmpeg (instale imageio-ffmpeg o ffmpeg).")


# Locución real del corte (español neutro, voz masculina). Los subtítulos salen de aquí.
NARRATION = [
    "Vende, cuadra y controla tu negocio en una app.",
    "Escanea, cobra y el stock baja solo.",
    "La caja del día tiene que dar cero.",
    "Informes, metas y existencia siempre al día.",
    "Todo también en tu teléfono, con los mismos datos.",
    "NovaGest. Gestiona, crece, avanza. Solicita tu licencia.",
]


def main() -> None:
    global BG
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True, help="carpeta con s1.wav … s6.wav")
    ap.add_argument("--out", default=str(ROOT / "docs" / "assets" / "video" / "novagest-reel-vertical-30s.mp4"))
    ap.add_argument("--build", default="/tmp/novagest-reel", help="carpeta de trabajo")
    args = ap.parse_args()

    audio_dir = Path(args.audio)
    build_dir = Path(args.build)
    build_dir.mkdir(parents=True, exist_ok=True)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    audios = [audio_dir / f"{sc.audio}.wav" for sc in SCENES]
    for a in audios:
        if not a.exists():
            sys.exit(f"Falta el audio {a}")

    full_wav = build_dir / "narracion.wav"
    starts, total = build_audio(audios, [s.slot for s in SCENES], full_wav)
    print(f"· duración total: {total:.1f} s")
    if total > 31:
        print("  aviso: se pasa de 30 s; acorte la locución o el hueco de alguna escena")

    entradas: list[tuple[float, float, str]] = []
    for i, sc in enumerate(SCENES):
        dur = wav_duration(audios[i])
        inicio = starts[i]
        trozos = chunk_text(NARRATION[i])
        paso = (dur + 0.4) / max(1, len(trozos))
        for k, trozo in enumerate(trozos):
            entradas.append((inicio + k * paso, min(total, inicio + (k + 1) * paso), trozo))

    ass = build_dir / "subs.ass"
    srt = out.with_suffix(".srt")
    write_subs(entradas, ass, srt)
    print(f"· subtítulos: {srt.name}")

    BG = background()
    ff = ffmpeg_bin()
    cmd = [
        ff, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(full_wav),
        "-vf", f"ass={ass}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin
    frames = 0
    for i, sc in enumerate(SCENES):
        dur = wav_duration(audios[i])
        real = max(sc.slot, dur + 0.7)
        n = max(1, int(round(real * FPS)))
        for k in range(n):
            t = k / FPS
            img = scene_frame(sc, t, real, i, len(SCENES))
            if t < 0.25:
                negro = Image.new("RGBA", (W, H), (8, 10, 26, int(255 * (1 - t / 0.25))))
                img = Image.alpha_composite(img.convert("RGBA"), negro)
            proc.stdin.write(img.convert("RGB").tobytes())
            frames += 1
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg falló al generar el video")
    print(f"· {frames} fotogramas renderizados")
    print(f"OK · {out} · {out.stat().st_size / (1024 * 1024):.1f} MB")


if __name__ == "__main__":
    main()
