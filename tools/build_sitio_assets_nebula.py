#!/usr/bin/env python3
"""
Genera los activos futuristas Nebula del sitio y de las redes a partir de capturas REALES.

No inventa pantallas: compone sobre un escenario espacial Nebula (índigo noche + cian/
esmeralda/violeta neón, anillos orbitales, rejilla holográfica en perspectiva y campo
estelar determinista) las capturas reales de `docs/assets/capturas/` y la marca de
`brand/novagest-icon.png`. Todo es determinista: mismo insumo → mismo resultado.

Salidas:
  docs/assets/social-preview.png            (1280×640)  og:image / vista previa GitHub
  docs/assets/novagest-hero.png             (1600×900)  cabecera ancha del sitio y README
  docs/assets/capturas/galeria-novagest.png (1920×1080) collage de las 6 vistas reales
  docs/assets/novagest-movil.png            (1600×860)  composición de 3 móviles (si hay tomas)

Uso:  python3 tools/build_sitio_assets_nebula.py [--movil-dir /tmp/ng-shots]
Requiere Pillow. Las fuentes son las DejaVu del sistema.
"""
from __future__ import annotations
import math
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(ROOT, "docs", "assets", "capturas")
A = os.path.join(ROOT, "docs", "assets")

# ── Paleta Nebula Futurista ──────────────────────────────────────────────────
BG0, BG1 = (6, 9, 24), (24, 21, 66)          # índigo espacial profundo
PANEL = (14, 19, 48)                         # panel cyber-glass
CYAN, EMERALD, VIOLET, GOLD = (34, 211, 238), (52, 211, 153), (139, 92, 246), (251, 191, 36)
INK, MUT = (244, 246, 255), (174, 180, 214)
STROKE = (56, 72, 138)

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
        t = t * t * (3 - 2 * t)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    return base


def glow(base, center, radius, color, strength=180):
    layer = Image.new("L", base.size, 0)
    d = ImageDraw.Draw(layer)
    d.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=strength)
    layer = layer.filter(ImageFilter.GaussianBlur(radius * 0.68))
    tint = Image.new("RGB", base.size, color)
    base.paste(tint, (0, 0), layer)
    return base


def grid(base, horizon, spacing0=16, spacing_mul=1.16, vertical_spread=2.5, alpha=52):
    """Suelo holográfico en perspectiva + anillos orbitales y partículas estelares."""
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    w, h = base.size
    rng = random.Random(f"nebula-stage-{w}x{h}")

    # Estrellas y micro-nodos luminosos en el cielo superior
    for _ in range(72):
        sx = rng.randint(18, w - 18)
        sy = rng.randint(14, max(24, horizon - 10))
        sr = rng.choice((1, 1, 1, 2))
        sc = CYAN if rng.random() > 0.55 else (VIOLET if rng.random() > 0.5 else INK)
        sa = rng.randint(45, 155)
        d.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=(*sc, sa))

    # Arcos orbitales sutiles
    d.arc([-int(w * 0.18), -int(h * 0.45), int(w * 1.18), int(h * 0.62)], start=14, end=166, fill=(*CYAN, 34), width=2)
    d.arc([int(w * 0.25), -int(h * 0.30), int(w * 1.25), int(h * 0.78)], start=195, end=342, fill=(*VIOLET, 38), width=2)

    # Línea de horizonte brillante
    d.line([(0, horizon), (w, horizon)], fill=(*CYAN, min(110, alpha * 2)), width=1)

    y, sp = horizon, spacing0
    while y < h + sp:
        d.line([(0, y), (w, y)], fill=(*CYAN, alpha), width=1)
        y += sp
        sp *= spacing_mul
    cx = w / 2
    for i in range(-9, 10):
        x_bottom = cx + i * w / 6.2 * vertical_spread
        x_horizon = cx + i * w / 26
        d.line([(x_horizon, horizon), (x_bottom, h)], fill=(*VIOLET, alpha), width=1)

    # Esquinas HUD futuristas discretas
    m, ln = 22, 26
    hud = (*CYAN, 115)
    for x0, y0, dx, dy in ((m, m, 1, 1), (w - m, m, -1, 1), (m, h - m, 1, -1), (w - m, h - m, -1, -1)):
        d.line([(x0, y0), (x0 + dx * ln, y0)], fill=hud, width=2)
        d.line([(x0, y0), (x0, y0 + dy * ln)], fill=hud, width=2)

    if base.mode == "RGBA":
        base.alpha_composite(overlay)
    else:
        base.paste(Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB"), (0, 0))
    return base


def shadow_card(canvas, img, xy, size, angle=0.0, radius=18, border=CYAN, border_w=2, shadow=44):
    """Pega `img` redimensionada con esquinas redondeadas, marco luminoso y sombra profunda."""
    resample = Image.Resampling.LANCZOS
    card = img.convert("RGB").resize(size, resample)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)

    # Dibuja borde luminoso directamente en la tarjeta antes de rotar
    framed = Image.new("RGBA", size, (0, 0, 0, 0))
    framed.paste(card, (0, 0), mask)
    fd = ImageDraw.Draw(framed)
    fd.rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, outline=(*border, 195), width=border_w)
    fd.rounded_rectangle([2, 2, size[0] - 3, size[1] - 3], radius=max(4, radius - 2), outline=(255, 255, 255, 55), width=1)

    if angle:
        pad = 84
        cardm = Image.new("RGBA", (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
        cardm.paste(framed, (pad, pad), framed.split()[3])
        cardm = cardm.rotate(angle, resample=Image.Resampling.BICUBIC, expand=False, center=(cardm.width / 2, cardm.height / 2))
        alpha_ch = cardm.split()[3]
        # Halo neón exterior
        halo_alpha = alpha_ch.filter(ImageFilter.GaussianBlur(18))
        halo = Image.new("RGBA", cardm.size, (*border, 255))
        halo.putalpha(halo_alpha.point(lambda v: int(v * 0.30)))
        canvas.paste(halo, (xy[0] - pad, xy[1] - pad), halo.split()[3])
        # Sombra oscura
        sh = alpha_ch.filter(ImageFilter.GaussianBlur(shadow // 2))
        black = Image.new("RGBA", cardm.size, (0, 0, 0, 255))
        black.putalpha(sh.point(lambda v: int(v * 0.68)))
        canvas.paste(black, (xy[0] - pad + 10, xy[1] - pad + 16), black.split()[3])
        canvas.paste(cardm, (xy[0] - pad, xy[1] - pad), cardm.split()[3])
        return canvas

    # Halo neón recto + sombra
    sh = Image.new("L", (size[0] + shadow * 2, size[1] + shadow * 2), 0)
    ImageDraw.Draw(sh).rounded_rectangle([shadow, shadow, shadow + size[0], shadow + size[1]], radius=radius, fill=195)
    sh_blur = sh.filter(ImageFilter.GaussianBlur(shadow // 2))
    halo_blur = sh.filter(ImageFilter.GaussianBlur(14))
    halo = Image.new("RGBA", sh.size, (*border, 255))
    halo.putalpha(halo_blur.point(lambda v: int(v * 0.22)))
    canvas.paste(halo, (xy[0] - shadow, xy[1] - shadow), halo.split()[3])
    black = Image.new("RGBA", sh.size, (0, 0, 0, 255))
    black.putalpha(sh_blur.point(lambda v: int(v * 0.72)))
    canvas.paste(black, (xy[0] - shadow, xy[1] - shadow + 12), black.split()[3])
    canvas.paste(framed, xy, framed.split()[3])
    return canvas


def brand_icon(size):
    icon = Image.open(os.path.join(ROOT, "brand", "novagest-icon.png")).convert("RGB")
    return icon.resize((size, size), Image.Resampling.LANCZOS)


def paste_icon_rounded(canvas, xy, size, radius_ratio=0.24):
    # Halo suave tras el icono
    glow(canvas, (xy[0] + size // 2, xy[1] + size // 2), int(size * 0.75), CYAN, 95)
    icon = brand_icon(size)
    mask = Image.new("L", (size, size), 0)
    rad = int(size * radius_ratio)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=rad, fill=255)
    canvas.paste(icon, xy, mask)
    ImageDraw.Draw(canvas).rounded_rectangle([xy[0], xy[1], xy[0] + size - 1, xy[1] + size - 1], radius=rad, outline=(*CYAN, 180), width=2)


def pill(canvas, xy, text, font_size=20, pad_x=18, pad_y=9, stroke=CYAN, text_fill=INK):
    f = font(F_BOLD, font_size)
    d = ImageDraw.Draw(canvas)
    bbox = d.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    box = [xy[0], xy[1], xy[0] + w + pad_x * 2, xy[1] + h + pad_y * 2]
    d.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=(14, 21, 52, 215), outline=stroke, width=2)
    d.text((xy[0] + pad_x - bbox[0], xy[1] + pad_y - bbox[1]), text, font=f, fill=text_fill)
    return box[2]


def pill_row(canvas, xy, items, font_size=20, gap=10):
    x = xy[0]
    for text, stroke in items:
        x = pill(canvas, (x, xy[1]), text, font_size, 15, 8, stroke=stroke) + gap
    return x


def wrap_text(draw, text, f, max_width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def nebula_canvas(w, h, horizon_ratio=0.72):
    im = vgrad((w, h), BG1, BG0).convert("RGBA")
    glow(im, (int(w * 0.84), int(h * 0.16)), int(w * 0.34), VIOLET, 165)
    glow(im, (int(w * 0.14), int(h * 0.88)), int(w * 0.32), CYAN, 125)
    glow(im, (int(w * 0.62), int(h * 0.56)), int(w * 0.22), EMERALD, 80)
    im = grid(im, horizon=int(h * horizon_ratio), alpha=44)
    return im


def load_capture(name):
    return Image.open(os.path.join(CAP, name))


def save_rgb(im, path):
    im.convert("RGB").save(path, optimize=True)
    kb = os.path.getsize(path) // 1024
    print(f"  → {os.path.relpath(path, ROOT)} ({kb} KB)")


# ── 1) social-preview.png (1280×640) ─────────────────────────────────────────
def build_social():
    w, h = 1280, 640
    im = nebula_canvas(w, h, 0.76)
    paste_icon_rounded(im, (58, 56), 84)
    d = ImageDraw.Draw(im)
    d.text((162, 48), "NovaGest", font=font(F_BOLD, 74), fill=INK)
    d.text((164, 130), "INVENTARIO · PUNTO DE VENTA · CAJA · CONTABILIDAD", font=font(F_BOLD, 15), fill=CYAN)
    sub = "Ecosistema comercial offline-first: multialmacén (168 municipios), código de barras, fiados, cuadre diario, módulo financiero y auditoría encadenada."
    f_sub = font(F_REG, 20)
    y = 216
    for line in wrap_text(d, sub, f_sub, 515):
        d.text((58, y), line, font=f_sub, fill=(208, 214, 244))
        y += 30
    pill_row(im, (58, 444), [("Web PWA", CYAN), ("Android", EMERALD), ("Servidor propio", GOLD), ("Cero nube", VIOLET)], 15, gap=10)
    d.text((58, 514), "NEBULA v1.1 · HTTPS + 2FA + SQLite WAL + Sello RFC 3161", font=font(F_BOLD, 14), fill=EMERALD)
    shadow_card(im, load_capture("panel-oscuro.png"), (650, 74), (490, 306), angle=-2.5, border=VIOLET)
    shadow_card(im, load_capture("venta-rapida.png"), (828, 294), (382, 239), angle=2.2, border=CYAN)
    save_rgb(im, os.path.join(A, "social-preview.png"))


# ── 2) novagest-hero.png (1600×900) ──────────────────────────────────────────
def build_hero():
    w, h = 1600, 900
    im = nebula_canvas(w, h, 0.78)
    paste_icon_rounded(im, (76, 102), 112)
    d = ImageDraw.Draw(im)
    d.text((216, 96), "NovaGest", font=font(F_BOLD, 92), fill=INK)
    d.text((220, 208), "INVENTARIO · VENTA RÁPIDA · CAJA · FINANZAS", font=font(F_BOLD, 17), fill=CYAN)
    sub = "Del Excel al mostrador sin depender de internet: controla almacenes, cobra con lector o cámara, cuadra la caja al centavo y audita cada operación en Web y Android."
    f_sub = font(F_REG, 24)
    y = 282
    for line in wrap_text(d, sub, f_sub, 575):
        d.text((78, y), line, font=f_sub, fill=(208, 214, 244))
        y += 37
    pill_row(im, (78, 532), [("Web PWA", CYAN), ("Android Kotlin", EMERALD), ("Servidor local", GOLD), ("Partida doble", VIOLET)], 17, gap=11)
    d.text((78, 620), "✦  Edición Nebula · 100 % datos en tu equipo · Licencias firmadas HMAC-SHA256", font=font(F_BOLD, 16), fill=EMERALD)
    shadow_card(im, load_capture("panel-oscuro.png"), (784, 114), (700, 438), angle=-2.2, border=VIOLET)
    shadow_card(im, load_capture("venta-rapida.png"), (1038, 444), (476, 298), angle=2.4, border=CYAN)
    save_rgb(im, os.path.join(A, "novagest-hero.png"))


# ── 3) capturas/galeria-novagest.png (1920×1080) ─────────────────────────────
def build_galeria():
    w, h = 1920, 1080
    im = nebula_canvas(w, h, 0.92)
    paste_icon_rounded(im, (64, 38), 68)
    d = ImageDraw.Draw(im)
    d.text((154, 34), "NovaGest en acción · Edición Nebula", font=font(F_BOLD, 46), fill=INK)
    d.text((154, 94), "Capturas reales sobre datos de demostración · modo claro y oscuro · sin plantillas ficticias", font=font(F_REG, 18), fill=MUT)
    pill(im, (w - 260, 48), "NEBULA · v1.1", font_size=16, pad_x=18, pad_y=8, stroke=CYAN, text_fill=CYAN)

    cards = [
        ("panel.png", "Panel principal", CYAN),
        ("venta-rapida.png", "Venta rápida · POS", EMERALD),
        ("inventario.png", "Inventario multialmacén", VIOLET),
        ("cuadre-diario.png", "Cuadre diario de caja", GOLD),
        ("analisis-y-metas.png", "Análisis, calor y metas", CYAN),
        ("panel-oscuro.png", "Panel · modo oscuro Nebula", VIOLET),
    ]
    card_w, card_h = 574, 359
    gap_x, gap_y = 34, 66
    x0, y0 = 64, 168
    f_label = font(F_BOLD, 18)
    for i, (name, label, accent) in enumerate(cards):
        col, row = i % 3, i // 3
        x = x0 + col * (card_w + gap_x)
        y = y0 + row * (card_h + gap_y)
        img = load_capture(name)
        src_ratio = img.width / img.height
        dst_ratio = card_w / card_h
        if src_ratio < dst_ratio:
            new_h = int(img.width / dst_ratio)
            top = (img.height - new_h) // 2
            img = img.crop((0, top, img.width, top + new_h))
        shadow_card(im, img, (x, y), (card_w, card_h), angle=0.0, radius=14, border=accent, border_w=2, shadow=34)
        tw = d.textlength(label, font=f_label)
        ly = y + card_h + 10
        d.rounded_rectangle([x, ly, x + tw + 30, ly + 32], radius=16, fill=(12, 17, 44, 235), outline=(*accent, 150), width=1)
        d.text((x + 15, ly + 6), label, font=f_label, fill=accent)
    save_rgb(im, os.path.join(CAP, "galeria-novagest.png"))


# ── 4) novagest-movil.png (1600×860) ─────────────────────────────────────────
def phone_frame(screen_img: Image.Image, target_w: int, accent=CYAN) -> Image.Image:
    """Enmarca una captura móvil 390×844 en un chasis futurista redondeado."""
    target_h = int(target_w * (844 / 390))
    pad = 14
    fw, fh = target_w + pad * 2, target_h + pad * 2
    chassis = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chassis)
    outer_r = 42
    inner_r = 30
    cd.rounded_rectangle([0, 0, fw - 1, fh - 1], radius=outer_r, fill=(10, 14, 34, 255), outline=(*accent, 220), width=3)
    cd.rounded_rectangle([3, 3, fw - 4, fh - 4], radius=outer_r - 2, outline=(255, 255, 255, 55), width=1)

    scr = screen_img.convert("RGB").resize((target_w, target_h), Image.Resampling.LANCZOS)
    mask = Image.new("L", (target_w, target_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, target_w - 1, target_h - 1], radius=inner_r, fill=255)
    chassis.paste(scr, (pad, pad), mask)

    # Isla superior discreta
    iw, ih = int(target_w * 0.26), 12
    ix = (fw - iw) // 2
    cd.rounded_rectangle([ix, pad + 8, ix + iw, pad + 8 + ih], radius=6, fill=(8, 10, 24, 235))
    return chassis


def build_movil(movil_dir: str):
    f1 = os.path.join(movil_dir, "movil-inicio.png")
    f2 = os.path.join(movil_dir, "movil-venta.png")
    f3 = os.path.join(movil_dir, "movil-oscuro.png")
    if not (os.path.isfile(f1) and os.path.isfile(f2) and os.path.isfile(f3)):
        return
    w, h = 1600, 860
    im = nebula_canvas(w, h, 0.82)
    paste_icon_rounded(im, (68, 56), 72)
    d = ImageDraw.Draw(im)
    d.text((160, 50), "En tu bolsillo, con o sin señal", font=font(F_BOLD, 48), fill=INK)
    d.text((162, 112), "Web instalable (PWA) y app nativa Android Kotlin · barra inferior táctil, escáner y tickets por WhatsApp", font=font(F_REG, 19), fill=MUT)

    specs = [
        (f1, 254, (164, 192), -4.0, CYAN, "Panel móvil"),
        (f2, 272, (648, 166), 0.0, EMERALD, "Venta rápida táctil"),
        (f3, 254, (1152, 192), 4.0, VIOLET, "Modo oscuro Nebula"),
    ]
    f_lbl = font(F_BOLD, 17)
    for path, pw, (px, py), ang, acc, lbl in specs:
        ph = phone_frame(Image.open(path), pw, accent=acc)
        if ang:
            ph = ph.rotate(ang, resample=Image.Resampling.BICUBIC, expand=True)
        # Sombra y halo
        alpha = ph.split()[3]
        halo = Image.new("RGBA", ph.size, (*acc, 255))
        halo.putalpha(alpha.filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.28)))
        im.paste(halo, (px, py), halo.split()[3])
        sh = Image.new("RGBA", ph.size, (0, 0, 0, 255))
        sh.putalpha(alpha.filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.72)))
        im.paste(sh, (px + 8, py + 16), sh.split()[3])
        im.paste(ph, (px, py), ph.split()[3])
        tw = d.textlength(lbl, font=f_lbl)
        lx = px + (ph.width - tw) // 2 - 14
        ly = min(h - 42, py + ph.height + 10)
        d.rounded_rectangle([lx, ly, lx + tw + 28, ly + 30], radius=15, fill=(12, 17, 44, 240), outline=(*acc, 180), width=2)
        d.text((lx + 14, ly + 5), lbl, font=f_lbl, fill=acc)

    save_rgb(im, os.path.join(A, "novagest-movil.png"))


if __name__ == "__main__":
    mdir = "/tmp/ng-shots"
    if "--movil-dir" in sys.argv:
        mdir = sys.argv[sys.argv.index("--movil-dir") + 1]
    build_social()
    build_hero()
    build_galeria()
    build_movil(mdir)
