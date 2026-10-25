#!/usr/bin/env python3
"""Genera el video promocional de NovaGest en 720p con narración y subtítulos.

Requisitos: Pillow e imageio-ffmpeg (o un ffmpeg en el PATH).

Uso:
    python3 tools/build_promo_video.py \
        --audio /ruta/a/audio      # s1.wav … s8.wav (mismos nombres y orden que SCENES)
        --out docs/assets/video/novagest-promo-720p.mp4

El guion, la narración y los textos en pantalla están en
docs/PROPUESTA_VIDEO_PROMOCIONAL.md. Este script solo compone la pieza.
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

W, H, FPS = 1280, 720, 25
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "assets" / "capturas"
BRAND = ROOT / "brand" / "novagest-icon.png"
MOVIL = ROOT / "docs" / "assets" / "novagest-movil.png"

NAVY = (11, 11, 30)
INK = (255, 255, 255)
DIM = (196, 198, 224)
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
    """Una escena del video: texto, imagen de apoyo y locución."""

    kicker: str
    title: str
    sub: str = ""
    bullets: list[str] = field(default_factory=list)
    image: str | None = None          # nombre del archivo en docs/assets/capturas
    kind: str = "browser"             # browser | phone | none | license | opening
    image2: str | None = None         # imagen que entra en el último tramo
    audio: str = ""                   # nombre base del archivo de audio (sin extensión)
    lead: float = 0.7                 # silencio antes de la locución
    tail: float = 0.6                 # silencio después de la locución
    closing: bool = False             # superpone el cierre con logotipo


SCENES: list[Scene] = [
    Scene(
        kicker="NOVAGEST 1.0",
        title="Gestiona. Crece. Avanza.",
        sub="Inventario · Punto de venta · Caja diaria · Informes",
        bullets=["Aplicación Web instalable", "Aplicación Android", "Servidor compartido"],
        kind="opening", audio="s1", lead=1.4, tail=1.0,
    ),
    Scene(
        kicker="UNA SOLA VERDAD",
        title="Web y Android, los mismos datos",
        sub="El servidor guarda todo; cada persona entra con su usuario y su rol.",
        bullets=["Usuarios y permisos por rol", "Auditoría de cada cambio", "Copias cifradas automáticas"],
        image="movil", kind="phone", audio="s2",
    ),
    Scene(
        kicker="PASO 1 DE 6",
        title="Activa tu licencia",
        sub="Sin licencia válida no se entra: es la primera protección.",
        bullets=["Solicita la clave por WhatsApp", "Pega la clave NG-… y activa", "✔ Licencia válida y fecha de expiración"],
        kind="license", audio="s3",
    ),
    Scene(
        kicker="PASO 2 DE 6",
        title="Configura el negocio y sus almacenes",
        sub="Nombre, tasa CUP/USD, metas y regla de comisión. Un almacén por local.",
        bullets=["Inventario multialmacén", "Almacén en uso siempre visible", "Traspasos sin afectar la caja"],
        image="panel", kind="browser", audio="s4",
    ),
    Scene(
        kicker="PASO 3 DE 6",
        title="Importa tu mercancía",
        sub="Pega del Excel, sube el archivo o escribe en la tabla.",
        bullets=["Vista previa fila por fila", "Aviso antes de sobrescribir", "Cada entrada se puede deshacer"],
        image="inventario", kind="browser", audio="s5",
    ),
    Scene(
        kicker="PASO 4 DE 6",
        title="Vende en segundos",
        sub="Escáner de códigos, carrito y cobro al contado o a fiado.",
        bullets=["Descuenta el stock al instante", "Fiados con vencimiento y límite", "Comisión y domicilio automáticos"],
        image="venta-rapida", kind="browser", audio="s6",
    ),
    Scene(
        kicker="PASO 5 DE 6",
        title="Cuadra la caja del día",
        sub="Tasas, fondos, gastos y salidas: el resultado debe quedar en 0.",
        bullets=["Totales recalculados al instante", "Aviso si el día no cuadra", "Cierre del día protegido"],
        image="cuadre-diario", kind="browser", audio="s7",
    ),
    Scene(
        kicker="PASO 6 DE 6",
        title="Revisa, decide y repite",
        sub="Informes, metas y comprobación del inventario. También en Android.",
        bullets=["Informe semanal y utilidad", "Metas y margen por categoría", "Comprobación de stock"],
        image="analisis-y-metas", kind="browser", image2="movil", audio="s8",
        tail=1.2, closing=True,
    ),
]


# --------------------------------------------------------------------------- materiales
def logo_tile(size: int) -> Image.Image:
    """Recorta el icono de la marca (sin el halo blanco del PNG) y lo deja redondeado."""
    src = Image.open(BRAND).convert("RGB")
    lum = src.convert("L").point(lambda v: 255 if v < 230 else 0)
    box = lum.getbbox() or (0, 0, src.width, src.height)
    crop = src.crop(box)
    side = max(crop.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    canvas = canvas.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.23), fill=255)
    canvas.putalpha(mask)
    return canvas


def rounded(img: Image.Image, radius: int) -> Image.Image:
    img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    img.putalpha(mask)
    return img


def with_shadow(tile: Image.Image, blur: int = 18, alpha: int = 150, dy: int = 16) -> Image.Image:
    pad = blur * 3
    canvas = Image.new("RGBA", (tile.width + pad * 2, tile.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [pad, pad + dy, pad + tile.width, pad + dy + tile.height], radius=18, fill=(0, 0, 0, alpha)
    )
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    canvas.alpha_composite(tile, (pad, pad))
    return canvas


def background() -> Image.Image:
    """Fondo: degradado azul profundo con halos suaves."""
    bg = Image.new("RGB", (W, H), NAVY)
    px = bg.load()
    for y in range(H):
        for x in range(0, W, 4):
            t = (x / W) * 0.55 + (y / H) * 0.45
            c = (
                int(11 + 26 * t),
                int(11 + 22 * t),
                int(30 + 58 * t),
            )
            for k in range(4):
                if x + k < W:
                    px[x + k, y] = c
    glow = Image.new("RGBA", (W // 4, H // 4), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-30, -10, 150, 110], fill=(79, 70, 229, 90))
    gd.ellipse([180, 90, 330, 190], fill=(5, 150, 105, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(26)).resize((W, H), Image.BICUBIC)
    return Image.alpha_composite(bg.convert("RGBA"), glow)


BG = None  # se inicializa en main()
_BG_CACHE: dict[int, Image.Image] = {}
_SHOT_CACHE: dict[tuple, Image.Image] = {}


def glow_layer(t: float) -> Image.Image:
    """Halo que se mueve lentamente para dar vida al fondo."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dx = int(90 * math.sin(t * 0.22))
    dy = int(50 * math.sin(t * 0.31 + 1.2))
    blobs = [(-220 + dx, -200 + dy, 520, 460, (79, 70, 229, 60)), (1280 - 520 + dx // 2, 320 + dy, 1180, 900, (5, 150, 105, 48))]
    for x0, y0, x1, y1, color in blobs:
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(g).ellipse([x0, y0, x1, y1], fill=color)
        layer = Image.alpha_composite(layer, g.filter(ImageFilter.GaussianBlur(90)))
    return layer


def fade(tile: Image.Image, alpha: float) -> Image.Image:
    if alpha >= 1:
        return tile
    out = tile.copy()
    a = out.getchannel("A").point(lambda v: int(v * max(0.0, min(1.0, alpha))))
    out.putalpha(a)
    return out


def spaced_text(draw: ImageDraw.ImageDraw, xy, text: str, fnt, fill, spacing: int = 3):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + spacing
    return x


def wrap(text: str, fnt, width: int) -> list[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = f"{cur} {w}".strip()
        if ImageDraw.Draw(Image.new("RGB", (10, 10))).textlength(probe, font=fnt) <= width:
            cur = probe
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# --------------------------------------------------------------------------- piezas
def browser_shot(name: str, zoom: float, width: int = 586) -> Image.Image:
    shot = Image.open(SHOTS / f"{name}.png").convert("RGB")
    # Ken Burns: recorte progresivo del centro
    z = 0.90 + 0.10 * zoom
    cw, ch = shot.width * z, shot.height * z
    box = ((shot.width - cw) / 2, (shot.height - ch) / 2, (shot.width + cw) / 2, (shot.height + ch) / 2)
    shot = shot.crop(tuple(int(v) for v in box)).resize((width, int(width * 900 / 1440)), Image.LANCZOS)
    chrome = 26
    tile = Image.new("RGB", (width, shot.height + chrome), (24, 24, 46))
    d = ImageDraw.Draw(tile)
    d.rectangle([0, 0, width, chrome], fill=(30, 30, 56))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([12 + i * 16, 9, 20 + i * 16, 17], fill=c)
    d.rounded_rectangle([72, 5, width - 20, chrome - 5], radius=6, fill=(19, 19, 38))
    d.text((84, 8), "novagest · app web", font=font(11), fill=(150, 152, 180))
    tile.paste(shot, (0, chrome))
    return rounded(tile, 14)


def phone_shot(name: str, zoom: float, width: int = 560) -> Image.Image:
    img = Image.open(MOVIL if name == "movil" else SHOTS / f"{name}.png").convert("RGB")
    z = 0.94 + 0.06 * zoom
    cw, ch = img.width * z, img.height * z
    box = ((img.width - cw) / 2, (img.height - ch) / 2, (img.width + cw) / 2, (img.height + ch) / 2)
    img = img.crop(tuple(int(v) for v in box)).resize((width, int(width * img.height / img.width)), Image.LANCZOS)
    return rounded(img, 16)


def license_card(progress: float) -> Image.Image:
    """Tarjeta simulada de la pantalla «Licencia de Uso»."""
    w, h = 600, 404
    card = Image.new("RGB", (w, h), (250, 250, 254))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=16, fill=(250, 250, 254), outline=(226, 227, 240), width=2)
    d.text((26, 22), "Licencia de Uso", font=font(24, True), fill=(30, 27, 75))
    d.text((26, 56), "Acceso protegido por licencia", font=font(15), fill=(110, 110, 140))

    fields = [("Nombre o empresa", "Mi Tienda"), ("Plazo", "1 mes"), ("Clave de licencia", "NG-…")]
    y = 92
    for label, value in fields:
        d.text((26, y), label, font=font(13, True), fill=(70, 70, 105))
        d.rounded_rectangle([26, y + 20, w - 26, y + 62], radius=10, fill=(255, 255, 255),
                            outline=(214, 216, 234), width=2)
        d.text((40, y + 33), value, font=font(16), fill=(35, 35, 70))
        y += 74

    d.rounded_rectangle([26, y + 4, w - 26, y + 56], radius=10, fill=(79, 70, 229))
    d.text((w / 2 - 68, y + 19), "Activar licencia", font=font(17, True), fill=(255, 255, 255))

    if progress > 0.45:
        a = min(1.0, (progress - 0.45) * 3.2)
        stamp = Image.new("RGBA", (252, 44), (0, 0, 0, 0))
        sd = ImageDraw.Draw(stamp)
        sd.rounded_rectangle([0, 0, 251, 43], radius=10, fill=(236, 253, 245), outline=(167, 243, 208))
        sd.text((12, 11), "\u2714  Licencia v\u00e1lida", font=font(15, True), fill=(5, 120, 87))
        card = card.convert("RGBA")
        card.alpha_composite(fade(stamp, a), (w - 268, 18))
    return rounded(card, 16)


def opening_art(t: float) -> Image.Image:
    """Portada: logotipo centrado."""
    tile = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    lg = logo_tile(140)
    pulse = 1.0 + 0.02 * math.sin(t * 2.0)
    lg = lg.resize((int(140 * pulse), int(140 * pulse)), Image.LANCZOS)
    shadowed = with_shadow(lg, blur=18, alpha=170, dy=14)
    tile.alpha_composite(shadowed, (W // 2 - shadowed.width // 2, 62))
    d = ImageDraw.Draw(tile)
    name = "NovaGest"
    tw = d.textlength(name, font=font(60, True))
    d.text(((W - tw) / 2, 320), name, font=font(60, True), fill=INK)
    return tile


# --------------------------------------------------------------------------- composición
def scene_frame(sc: Scene, t: float, dur: float, index: int, total: int) -> Image.Image:
    slot = int(t * 2)  # 0,5 s de resolución: el halo se mueve despacio
    frame = _BG_CACHE.get(slot)
    if frame is None:
        frame = Image.alpha_composite(BG, glow_layer(t))
        _BG_CACHE[slot] = frame
    frame = frame.copy()
    d = ImageDraw.Draw(frame)

    mark = logo_tile(30)
    frame.alpha_composite(fade(mark, 0.95), (64, 44))
    d.text((104, 50), "NovaGest", font=font(17, True), fill=(226, 228, 248))

    if sc.kind == "opening":
        art = fade(opening_art(t), min(1.0, t / 0.9))
        frame.alpha_composite(art, (0, 0))
        d = ImageDraw.Draw(frame)
        a = min(1.0, max(0.0, (t - 0.6) / 0.8))
        fsub = font(23)
        tw = d.textlength(sc.sub, font=fsub)
        d.text(((W - tw) / 2, 404), sc.sub, font=fsub, fill=fade_color(DIM, a))

        f2 = font(18, True)
        pills = [f"  {b}  " for b in sc.bullets]
        widths = [d.textlength(x, font=f2) + 20 for x in pills]
        total_w = sum(widths) + 20 * (len(pills) - 1)
        x = (W - total_w) / 2
        for i, (label, pw) in enumerate(zip(pills, widths)):
            ba = min(1.0, max(0.0, (t - 1.2 - i * 0.3) / 0.5))
            pill = Image.new("RGBA", (int(pw), 40), (0, 0, 0, 0))
            pd = ImageDraw.Draw(pill)
            pd.rounded_rectangle([0, 0, pill.width - 1, 39], radius=20,
                                 fill=(255, 255, 255, 24), outline=(160, 158, 220, 95))
            pd.text((10, 11), label.strip(), font=f2, fill=(226, 228, 248))
            frame.alpha_composite(fade(pill, ba), (int(x), 466))
            x += pw + 20

        return draw_progress(frame, index, total, H - 26)

    tx = 64
    a1 = min(1.0, max(0.0, (t - 0.15) / 0.6))
    d.text((tx, 104 + int(14 * (1 - a1))), sc.kicker, font=font(17, True), fill=fade_color(GOLD, a1))

    y = 140 + int(16 * (1 - a1))
    a2 = min(1.0, max(0.0, (t - 0.3) / 0.6))
    size, lines = 42, wrap(sc.title, font(42, True), 520)
    while size > 30:
        ft = font(size, True)
        lines = wrap(sc.title, ft, 520)
        widest = max(d.textlength(x, font=ft) for x in lines)
        if widest <= 520 and len(lines) <= 2:
            break
        size -= 2
    ft = font(size, True)
    for line in lines:
        d.text((tx, y + int(12 * (1 - a2))), line, font=ft, fill=fade_color(INK, a2))
        y += int(size * 1.24)
    d.rounded_rectangle([tx, y + 6, tx + 64, y + 12], radius=3, fill=fade_color(GOLD, a1))

    y += 34
    if sc.sub:
        a3 = min(1.0, max(0.0, (t - 0.5) / 0.7))
        for line in wrap(sc.sub, font(20), 520):
            d.text((tx, y), line, font=font(20), fill=fade_color(DIM, a3))
            y += 28

    y += 16
    for i, b in enumerate(sc.bullets):
        ab = min(1.0, max(0.0, (t - 0.8 - i * 0.28) / 0.5))
        cy = y + i * 44
        d.ellipse([tx, cy + 7, tx + 10, cy + 17], fill=fade_color(GREEN, ab))
        for line in wrap(b, font(19), 470):
            d.text((tx + 25, cy), line, font=font(19), fill=fade_color((222, 224, 242), ab))
            cy += 24

    prog = min(1.0, t / max(dur, 0.001))
    fade_in = min(1.0, t / 0.55)

    if sc.kind == "browser" and sc.image:
        key = ("browser", sc.image, int(prog * 50))
        first = _SHOT_CACHE.get(key)
        if first is None:
            first = with_shadow(browser_shot(sc.image, prog), blur=18, alpha=160)
            _SHOT_CACHE[key] = first
        frame.alpha_composite(fade(first, fade_in), (W - first.width - 4, 118))
        if sc.image2 and prog > 0.58:
            blend = min(1.0, (prog - 0.58) / 0.16)
            key2 = ("phone", sc.image2, int(prog * 50))
            second = _SHOT_CACHE.get(key2)
            if second is None:
                second = with_shadow(phone_shot(sc.image2, prog, width=520), blur=20, alpha=150)
                _SHOT_CACHE[key2] = second
            frame.alpha_composite(fade(second, blend), (W - second.width - 30, 140))
    elif sc.kind == "phone" and sc.image:
        keyp = ("phonebig", sc.image, int(prog * 50))
        img = _SHOT_CACHE.get(keyp)
        if img is None:
            img = with_shadow(phone_shot(sc.image, prog, width=560), blur=20, alpha=150)
            _SHOT_CACHE[keyp] = img
        frame.alpha_composite(fade(img, fade_in), (W - img.width - 14, 146))
    elif sc.kind == "license":
        keyl = ("license", int(prog * 50))
        img = _SHOT_CACHE.get(keyl)
        if img is None:
            img = with_shadow(license_card(prog), blur=18, alpha=165)
            _SHOT_CACHE[keyl] = img
        frame.alpha_composite(fade(img, fade_in), (W - img.width - 8, 128))

    frame = draw_progress(frame, index, total, H - 26)
    d = ImageDraw.Draw(frame)

    if sc.closing and dur - t < 6.4:
        k = min(1.0, (6.4 - (dur - t)) / 0.9)
        frame.alpha_composite(Image.new("RGBA", (W, H), (9, 9, 26, int(255 * k))))
        d = ImageDraw.Draw(frame)
        lg = fade(logo_tile(124), k)
        shadowed = with_shadow(lg, blur=24, alpha=140)
        frame.alpha_composite(fade(shadowed, k), (W // 2 - shadowed.width // 2, 148))
        title = "Gestiona. Crece. Avanza."
        tw = d.textlength(title, font=font(44, True))
        d.text(((W - tw) / 2, 344), title, font=font(44, True), fill=fade_color(INK, k))
        sub = "NovaGest 1.0  ·  Web + Android  ·  Solicita tu licencia por WhatsApp"
        sw = d.textlength(sub, font=font(20))
        d.text(((W - sw) / 2, 412), sub, font=font(20), fill=fade_color(DIM, k))

    return frame


def draw_progress(frame: Image.Image, index: int, total: int, y: int) -> Image.Image:
    bar_x, bar_w, gap = 64, W - 128, 8
    seg = (bar_w - gap * (total - 1)) / total
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    for i in range(total):
        x0 = bar_x + i * (seg + gap)
        color = (255, 255, 255, 240) if i == index else (245, 179, 1, 215) if i < index else (255, 255, 255, 55)
        ld.rounded_rectangle([x0, y, x0 + seg, y + 3], radius=2, fill=color)
    return Image.alpha_composite(frame, layer)


def fade_color(color, alpha: float):
    r, g, b = color[:3]
    return (int(r), int(g), int(b), int(255 * max(0.0, min(1.0, alpha))))


# --------------------------------------------------------------------------- audio y subtítulos
def wav_duration(path: Path) -> float:
    with wave.open(str(path)) as w:
        return w.getnframes() / w.getframerate()


def build_audio(audios: list[Path], leads: list[float], tails: list[float], out: Path) -> list[float]:
    """Concatena los audios con sus silencios y devuelve el inicio de cada escena."""
    params = None
    starts: list[float] = []
    chunks: list[bytes] = []
    cursor = 0.0
    for path, lead, tail in zip(audios, leads, tails):
        with wave.open(str(path)) as w:
            if params is None:
                params = (w.getnchannels(), w.getsampwidth(), w.getframerate())
            frames = w.readframes(w.getnframes())
            silence_lead = b"\x00" * int(lead * params[2]) * params[0] * params[1]
            silence_tail = b"\x00" * int(tail * params[2]) * params[0] * params[1]
        starts.append(cursor)
        chunks += [silence_lead, frames, silence_tail]
        cursor += lead + wav_duration(path) + tail
    with wave.open(str(out), "wb") as w:
        w.setnchannels(params[0])
        w.setsampwidth(params[1])
        w.setframerate(params[2])
        for c in chunks:
            w.writeframes(c)
    return starts


def ass_time(s: float) -> str:
    cs = int(round(s * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    sec, cs = divmod(cs, 100)
    return f"{h:d}:{m:02d}:{sec:02d}.{cs:02d}"


def chunk_text(text: str, limit: int = 44) -> list[str]:
    """Divide la locución en rótulos cortos (<= 2 líneas) respetando las frases."""
    parts = [p.strip() for p in text.replace(";", ".").split(".") if p.strip()]
    out: list[str] = []
    for p in parts:
        words, cur = p.split(), ""
        for w in words:
            probe = f"{cur} {w}".strip()
            if len(probe) <= limit:
                cur = probe
            else:
                if cur:
                    out.append(cur)
                cur = w
        if cur:
            out.append(cur)
    return out


def subtitles(scenes: list[Scene], starts: list[float], audios: list[Path]) -> list[tuple[float, float, str]]:
    entries: list[tuple[float, float, str]] = []
    for sc, start, audio_path, text in zip(scenes, starts, audios, NARRATION):
        dur = wav_duration(audio_path)
        chunks = chunk_text(text)
        total_chars = sum(len(c) for c in chunks) or 1
        cursor = start + sc.lead
        for c in chunks:
            share = dur * len(c) / total_chars
            entries.append([cursor, cursor + share - 0.05, c])
            cursor += share
    # sin solapes y con un mínimo legible
    for i in range(1, len(entries)):
        entries[i][0] = max(entries[i][0], entries[i - 1][1] + 0.04)
        entries[i][1] = max(entries[i][1], entries[i][0] + 0.8)
    return [(a, b, t) for a, b, t in entries]


ASS_HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Promo,DejaVu Sans,26,&H00FFFFFF,&H00FFFFFF,&H00101018,&H96000000,-1,0,0,0,100,100,0,0,1,3,1,2,84,84,54,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def write_subs(entries: list[tuple[float, float, str]], ass_path: Path, srt_path: Path) -> None:
    lines = [ASS_HEAD]
    for a, b, txt in entries:
        lines.append(f"Dialogue: 0,{ass_time(a)},{ass_time(b)},Promo,,0,0,0,,{txt}")
    ass_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    out = []
    for i, (a, b, txt) in enumerate(entries, 1):
        out += [str(i), f"{srt_time(a)} --> {srt_time(b)}", txt, ""]
    srt_path.write_text("\n".join(out), encoding="utf-8")


def srt_time(s: float) -> str:
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    sec, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


NARRATION: list[str] = []


# --------------------------------------------------------------------------- ejecución
def ffmpeg_bin() -> str:
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("No se encontró ffmpeg (instale imageio-ffmpeg o ffmpeg).")


def main() -> None:
    global BG, NARRATION
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", required=True, help="carpeta con s1.wav … s8.wav")
    ap.add_argument("--out", default=str(ROOT / "docs" / "assets" / "video" / "novagest-promo-720p.mp4"))
    ap.add_argument("--build", default="/tmp/novagest-promo", help="carpeta de trabajo")
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

    NARRATION[:] = [t for t in NARRATION_ES]
    full_wav = build_dir / "narracion.wav"
    starts = build_audio(audios, [s.lead for s in SCENES], [s.tail for s in SCENES], full_wav)
    total = sum(s.lead + s.tail for s in SCENES) + sum(wav_duration(a) for a in audios)
    print(f"· duración total: {total:.1f} s")

    ass = build_dir / "subs.ass"
    srt = out.with_suffix(".srt")
    write_subs(subtitles(SCENES, starts, audios), ass, srt)
    print(f"· subtítulos: {srt}")

    globals()["BG"] = background()
    ff = ffmpeg_bin()
    cmd = [
        ff, "-hide_banner", "-loglevel", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", str(full_wav),
        "-vf", f"ass={ass}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(out),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    assert proc.stdin
    frames = 0
    for i, sc in enumerate(SCENES):
        dur = sc.lead + wav_duration(audios[i]) + sc.tail
        n = max(1, int(round(dur * FPS)))
        for k in range(n):
            t = k / FPS
            img = scene_frame(sc, t, dur, i, len(SCENES))
            edge = min(t, dur - t)
            if edge < 0.28:
                dark = Image.new("RGBA", (W, H), (8, 8, 22, int(255 * (1 - edge / 0.28) * 0.85)))
                img = Image.alpha_composite(img.convert("RGBA"), dark)
            proc.stdin.write(img.convert("RGB").tobytes())
            frames += 1
    proc.stdin.close()
    if proc.wait() != 0:
        sys.exit("ffmpeg falló al generar el video")
    print(f"· {frames} fotogramas renderizados")

    size = out.stat().st_size / (1024 * 1024)
    print(f"OK · {out} · {size:.1f} MB")


NARRATION_ES = [
    "Bienvenido a NovaGest: la aplicación que reúne inventario, punto de venta, caja diaria e "
    "informes para tu negocio. En la Web y en Android, trabajando siempre sobre los mismos datos.",
    "NovaGest termina con las hojas sueltas y los cuadernos. Un servidor guarda toda la "
    "información, y cada persona entra con su usuario y su rol, con permisos, auditoría y copias de seguridad.",
    "Paso uno: activar la licencia. Escribe el nombre de tu negocio, elige el plazo y solicita la "
    "clave por WhatsApp. Cuando la recibas, pégala en Activar licencia y pulsa Activar ahora. "
    "Sin una licencia válida no se puede entrar.",
    "Paso dos: configurar el negocio. En Ajustes escribe el nombre, la tasa CUP por dólar, tus "
    "metas y la regla de comisión. Después crea tus almacenes, uno por local o depósito, "
    "escribiendo solo su nombre. Cada almacén tiene su propia existencia.",
    "Paso tres: cargar la mercancía. Abre Importar valores y elige el almacén de destino. Pega las "
    "columnas del Excel, sube el archivo o escribe en la tabla. Revisa la vista previa: cada fila "
    "dice si es nueva, si entra al almacén o si sobrescribe. Aplica solo lo que marques.",
    "Paso cuatro: vender. En Venta rápida escanea el código de barras o toca el producto. Ajusta la "
    "cantidad y el precio si hay descuento, revisa el almacén y pulsa cobrar. Puedes cobrar al "
    "contado o fiar a un cliente, con su vencimiento y su límite de crédito.",
    "Paso cinco: cuadrar la caja. En Cuadre diario anota la tasa, los fondos, los gastos y las "
    "salidas, y los totales se calculan al instante. El resultado tiene que quedar en cero. Cuando "
    "esté perfecto, cierra el día: nadie podrá cambiar las ventas ni el cuadre de esa fecha.",
    "Paso seis: revisar. En Informe semanal ves ventas, costos y utilidad; en Análisis y metas, tu "
    "avance; y en Comprobación, si el inventario cuadra. Todo esto también en Android: vende desde "
    "el teléfono, consulta existencias y sincroniza al instante. NovaGest: gestiona, crece, avanza.",
]


if __name__ == "__main__":
    main()
