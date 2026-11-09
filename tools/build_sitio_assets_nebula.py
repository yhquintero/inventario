#!/usr/bin/env python3
"""
Genera los activos Nebula del sitio y de las redes a partir de capturas REALES.

No inventa pantallas: compone sobre un fondo Nebula (índigo noche + cian/esmeralda/
violeta neón) las capturas reales de `docs/assets/capturas/` y la marca de
`brand/novagest-icon.png`. Todo es determinista: mismo insumo → mismo resultado.

Salidas:
  docs/assets/social-preview.png        (1280×640)  og:image / póster de vídeo
  docs/assets/novagest-hero.png         (1600×900)  cabecera ancha del sitio
  docs/assets/capturas/galeria-novagest.png (1920×1080)  collage de las 6 vistas

Uso:  python3 tools/build_sitio_assets_nebula.py
Requiere Pillow. Las fuentes son las DejaVu del sistema.
"""
from __future__ import annotations
import math
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, "docs", "assets", "capturas")
A = os.path.join(ROOT, "docs", "assets")

# ── Paleta Nebula ────────────────────────────────────────────────────────────
BG0, BG1 = (7, 10, 26), (30, 27, 75)        # índigo noche
PANEL = (14, 19, 48)                         # panel profundo
CYAN, EMERALD, VIOLET, GOLD = (34, 211, 238), (52, 211, 153), (124, 58, 237), (251, 191, 36)
INK, MUT = (243, 244, 255), (169, 169, 194)
STROKE = (44, 53, 102)

F_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

def font(path, size):
    return ImageFont.truetype(path, size)

def vgrad(size, top, bottom):
    w, h = size
    base = Image.new("RGB", (w, h))
    px = base.load()
    for y in range(h):
        t = y / max(1, h - 1)
        # suavizado tipo ease-in-out para que el fondo no se vea lineal
        t = t * t * (3 - 2 * t)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return base

def glow(base, center, radius, color, strength=180):
    layer = Image.new("L", base.size, 0)
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=strength)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.7))
    tint = Image.new("RGB", base.size, color)
    base.paste(tint, (0, 0), layer)
    return base

def grid(base, horizon, spacing0=18, spacing_mul=1.16, vertical_spread=2.4, alpha=46):
    """Suelo en perspectiva: líneas horizontales que se separan y radiales que convergen."""
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    w, h = base.size
    y, sp = horizon, spacing0
    while y < h + sp:
        d.line([(0, y), (w, y)], fill=(*CYAN, alpha), width=1)
        y += sp
        sp *= spacing_mul
    cx = w / 2
    for i in range(-8, 9):
        x_bottom = cx + i * w / 6.2 * vertical_spread
        x_horizon = cx + i * w / 26
        d.line([(x_horizon, horizon), (x_bottom, h)], fill=(*VIOLET, alpha), width=1)
    base.alpha_composite(overlay) if base.mode == "RGBA" else base.paste(Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB"), (0, 0))
    return base

def shadow_card(canvas, img, xy, size, angle=0.0, radius=16, border=STROKE, border_w=3, shadow=46):
    """Pega `img` redimensionada con esquinas redondeadas, borde y sombra (opcionalmente rotada)."""
    resample = Image.LANCZOS
    card = img.convert("RGB").resize(size, resample)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0], size[1]], radius=radius, fill=255)
    if angle:
        cardm = Image.new("RGBA", (size[0] + 80, size[1] + 80), (0, 0, 0, 0))
        cardm.paste(card, (40, 40), mask)
        cardm = cardm.rotate(angle, resample=Image.BICUBIC, expand=False, center=(cardm.width / 2, cardm.height / 2))
        sh = Image.new("L", cardm.size, 0)
        sh.paste(255, (0, 0), cardm.split()[3])
        sh = sh.filter(ImageFilter.GaussianBlur(shadow // 2))
        black = Image.new("RGBA", cardm.size, (0, 0, 0, 170))
        black.putalpha(sh.point(lambda v: int(v * 0.62)))
        canvas.paste(black, (xy[0] - 40 + 8, xy[1] - 40 + 14), black.split()[3])
        # borde
        borderm = cardm.copy()
        bd = ImageDraw.Draw(borderm)
        canvas.paste(cardm, (xy[0] - 40, xy[1] - 40), cardm.split()[3])
        d = ImageDraw.Draw(canvas)
        d.rounded_rectangle  # iconos del panel pueden llevar su propio fondo; el borde va dibujado por contorno
        return canvas
    # sombra recta
    sh = Image.new("L", (size[0] + shadow * 2, size[1] + shadow * 2), 0)
    m2 = Image.new("L", size, 255)
    ImageDraw.Draw(sh).rounded_rectangle([shadow, shadow, shadow + size[0], shadow + size[1]], radius=radius, fill=180)
    sh = sh.filter(ImageFilter.GaussianBlur(shadow))
    black = Image.new("RGBA", sh.size, (0, 0, 0, 255))
    black.putalpha(sh)
    canvas.paste(black, (xy[0] - shadow, xy[1] - shadow + 10), black.split()[3])
    canvas.paste(card, xy, mask)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([xy[0], xy[1], xy[0] + size[0] - 1, xy[1] + size[1] - 1], radius=radius, outline=border, width=border_w)
    return canvas

def brand_icon(size):
    icon = Image.open(os.path.join(ROOT, "brand", "novagest-icon.png")).convert("RGB")
    return icon.resize((size, size), Image.LANCZOS)

def paste_icon_rounded(canvas, xy, size, radius_ratio=0.22):
    icon = brand_icon(size)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=int(size * radius_ratio), fill=255)
    canvas.paste(icon, xy, mask)

def pill(canvas, xy, text, font_size=22, pad_x=18, pad_y=10, stroke=CYAN, text_fill=INK):
    f = font(F_BOLD, font_size)
    d = ImageDraw.Draw(canvas)
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    box = [xy[0], xy[1], xy[0] + w + pad_x * 2, xy[1] + h + pad_y * 2]
    d.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, outline=stroke, width=2)
    d.text((xy[0] + pad_x - bbox[0], xy[1] + pad_y - bbox[1]), text, font=f, fill=text_fill)
    return box[2]

def pill_row(canvas, xy, items, font_size=22, gap=12):
    x = xy[0]
    for text, stroke in items:
        x = pill(canvas, (x, xy[1]), text, font_size, 16, 9, stroke=stroke) + gap
    return x

def wrap_text(draw, text, f, max_width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f) <= max_width:
            cur = trial
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines

def nebula_canvas(w, h, horizon_ratio=0.72):
    im = vgrad((w, h), BG1, BG0).convert("RGBA")
    glow(im, (int(w * 0.88), int(h * 0.12)), int(w * 0.32), VIOLET, 150)
    glow(im, (int(w * 0.08), int(h * 0.92)), int(w * 0.30), CYAN, 110)
    im = grid(im, horizon=int(h * horizon_ratio), alpha=40)
    return im

def load_capture(name):
    return Image.open(os.path.join(CAP, name))

def save_rgb(im, path):
    im.convert("RGB").save(path, optimize=True)
    kb = os.path.getsize(path) // 1024
    print(f"  → {os.path.relpath(path, ROOT)}")

# ── 1) social-preview.png (1280×640) ─────────────────────────────────────────
def build_social():
    w, h = 1280, 640
    im = nebula_canvas(w, h, 0.78)
    paste_icon_rounded(im, (58, 58), 84)
    d = ImageDraw.Draw(im)
    d.text((164, 52), "NovaGest", font=font(F_BOLD, 74), fill=INK)
    d.text((164, 132), "I N V E N T A R I O  ·  V E N T A  ·  C U A D R E", font=font(F_BOLD, 17), fill=CYAN)
    sub = "Tu negocio en orden: existencias por almacén, punto de venta, fiados, cuadre diario e informes. Web instalable y app Android — sin conexión y sin nube obligatoria."
    f_sub = font(F_REG, 21)
    y = 232
    for line in wrap_text(d, sub, f_sub, 500):
        d.text((58, y), line, font=f_sub, fill=(199, 201, 232)); y += 30
    pill_row(im, (58, 448), [("Web PWA", CYAN), ("Android", EMERALD), ("Servidor local", GOLD), ("Licencias firmadas", VIOLET)], 15, gap=10)
    shadow_card(im, load_capture("panel.png"), (662, 96), (470, 294), angle=-2.5)
    shadow_card(im, load_capture("venta-rapida.png"), (862, 300), (330, 206), angle=2.5)
    save_rgb(im, os.path.join(A, "social-preview.png"))

# ── 2) novagest-hero.png (1600×900) ──────────────────────────────────────────
def build_hero():
    w, h = 1600, 900
    im = nebula_canvas(w, h, 0.80)
    paste_icon_rounded(im, (80, 110), 116)
    d = ImageDraw.Draw(im)
    d.text((232, 106), "NovaGest", font=font(F_BOLD, 96), fill=INK)
    d.text((234, 224), "INVENTARIO  ·  VENTA  ·  CUADRE DIARIO", font=font(F_BOLD, 20), fill=CYAN)
    sub = "Del Excel al mostrador: importa tu mercancía, vende con lector de códigos, cuadra la caja en minutos y mira tus metas. Un mismo estado en Web y Android."
    f_sub = font(F_REG, 25)
    y = 292
    for line in wrap_text(d, sub, f_sub, 570):
        d.text((84, y), line, font=f_sub, fill=(199, 201, 232)); y += 38
    pill_row(im, (84, 545), [("Web PWA", CYAN), ("Android", EMERALD), ("Servidor local", GOLD)], 18, gap=12)
    shadow_card(im, load_capture("panel.png"), (770, 148), (692, 432), angle=-2)
    shadow_card(im, load_capture("venta-rapida.png"), (1105, 470), (395, 247), angle=2.5)
    save_rgb(im, os.path.join(A, "novagest-hero.png"))

# ── 3) capturas/galeria-novagest.png (1920×1080) ─────────────────────────────
def build_galeria():
    w, h = 1920, 1080
    im = nebula_canvas(w, h, 0.94)
    paste_icon_rounded(im, (64, 40), 66)
    d = ImageDraw.Draw(im)
    d.text((152, 36), "Así se ve trabajando", font=font(F_BOLD, 48), fill=INK)
    d.text((152, 96), "Capturas reales con datos de demostración · tema claro y oscuro · NovaGest «Nebula»", font=font(F_REG, 18), fill=MUT)
    d.text((w - 64, 60), "novagest-v52", font=font(F_REG, 16), fill=MUT, anchor="ra")

    cards = [
        ("panel.png", "Panel"),
        ("venta-rapida.png", "Venta rápida"),
        ("inventario.png", "Inventario"),
        ("cuadre-diario.png", "Cuadre diario"),
        ("analisis-y-metas.png", "Análisis y metas"),
        ("panel-oscuro.png", "Panel · tema oscuro"),
    ]
    card_w, card_h = 574, 359
    gap_x, gap_y = 34, 66
    x0, y0 = 64, 170
    f_label = font(F_BOLD, 19)
    for i, (name, label) in enumerate(cards):
        col, row = i % 3, i // 3
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        img = load_capture(name)
        # recorta al centro si la captura es más alta (analisis-y-metas es 1440×1060)
        src_ratio = img.width / img.height
        dst_ratio = card_w / card_h
        if src_ratio < dst_ratio:
            new_h = int(img.width / dst_ratio)
            top = (img.height - new_h) // 2
            img = img.crop((0, top, img.width, top + new_h))
        shadow_card(im, img, (x, y), (card_w, card_h), angle=0.0, radius=14)
        # etiqueta bajo la tarjeta
        tw = d.textlength(label, font=f_label)
        ly = y + card_h + 10
        d.rounded_rectangle([x, ly, x + tw + 28, ly + 32], radius=16, fill=(14, 19, 48, 235))
        d.text((x + 14, ly + 6), label, font=f_label, fill=CYAN)
    save_rgb(im, os.path.join(CAP, "galeria-novagest.png"))

if __name__ == "__main__":
    build_social()
    build_hero()
    build_galeria()
