#!/usr/bin/env python3
"""Genera las imágenes de categoría de NovaGest en estética futurista Nebula.

Arte propio y determinista (misma semilla → misma imagen byte a byte, sin material
de terceros). Cada categoría combina un fondo espacial índigo profundo, rejilla
holográfica en perspectiva, resplandor volumétrico neón, circuitos sutiles e
iconografía geométrica luminosa propia de cada sector comercial.

Uso:  python3 tools/generar_imagenes_categorias.py   (requiere Pillow)
Salidas: web/public/cat/<img>.jpg y app/src/main/res/drawable-nodpi/cat_<img>.jpg
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 640, 420

# nombre -> (color primario neón, color secundario luminoso, motivo)
CATS = {
    "solar": ((245, 158, 11), (56, 232, 255), "sol"),
    "cocina": ((244, 63, 94), (251, 191, 36), "calor"),
    "refrigeracion": ((14, 165, 233), (165, 243, 252), "crio"),
    "clima": ((6, 182, 212), (52, 211, 153), "flujo"),
    "audio": ((139, 92, 246), (34, 211, 238), "espectro"),
    "hogar": ((217, 119, 6), (167, 139, 250), "domo"),
    "lavado": ((59, 130, 246), (34, 211, 238), "vortice"),
    "herramientas": ((99, 102, 241), (45, 212, 191), "engrane"),
    "construccion": ((234, 179, 8), (56, 189, 248), "estructura"),
    "movilidad": ((16, 185, 129), (34, 211, 238), "velocidad"),
}


def lerp(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial_glow(size, center, radius, color, strength=0.75):
    """Crea una capa RGB de resplandor radial suave para mezclar en modo Screen."""
    gw, gh = size
    small = Image.new("RGB", (gw // 4, gh // 4), (0, 0, 0))
    d = ImageDraw.Draw(small)
    cx, cy = center[0] // 4, center[1] // 4
    rmax = max(8, radius // 4)
    for step in range(14, 0, -1):
        rr = int(rmax * step / 14)
        k = ((15 - step) / 14) ** 1.8 * strength
        col = tuple(min(255, int(c * k)) for c in color)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=col)
    return small.resize((gw, gh), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(18))


def draw_cyber_grid(draw, prim, sec):
    """Rejilla holográfica inferior en perspectiva + trazas de circuito."""
    horizon = int(H * 0.56)
    # Líneas horizontales con separación progresiva
    for i in range(1, 9):
        t = (i / 8) ** 1.65
        y = horizon + int((H - horizon) * t)
        alpha = int(18 + 52 * t)
        draw.line([(0, y), (W, y)], fill=sec + (alpha,), width=1)
    # Líneas convergentes hacia el punto de fuga central
    vx, vy = W // 2, horizon - 44
    for k in range(-9, 10):
        bx = W // 2 + k * 68
        # Intersectar con horizon
        t0 = (horizon - vy) / max(1, (H - vy))
        hx = int(vx + (bx - vx) * t0)
        draw.line([(hx, horizon), (bx, H)], fill=prim + (36,), width=1)
    # Anillo orbital superior sutil
    draw.arc([-90, -140, W + 90, 220], start=12, end=168, fill=sec + (38,), width=2)


def draw_hud_accents(draw, rng, prim, sec):
    """Nodos luminosos, partículas estelares y esquinas HUD."""
    for _ in range(38):
        x = rng.randint(12, W - 12)
        y = rng.randint(10, int(H * 0.72))
        r = rng.choice((1, 1, 2))
        col = sec if rng.random() > 0.45 else (235, 245, 255)
        alpha = rng.randint(60, 175)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=col + (alpha,))
    # Esquinas HUD minimalistas
    c = sec + (135,)
    m, ln = 18, 22
    for sx, sy, dx, dy in ((m, m, 1, 1), (W - m, m, -1, 1), (m, H - m, 1, -1), (W - m, H - m, -1, -1)):
        draw.line([(sx, sy), (sx + dx * ln, sy)], fill=c, width=2)
        draw.line([(sx, sy), (sx, sy + dy * ln)], fill=c, width=2)
    # Pistas de circuito laterales
    for idx in range(4):
        y0 = 56 + idx * 62
        x1 = 46 + rng.randint(18, 56)
        draw.line([(18, y0), (x1, y0), (x1 + 16, y0 + 16)], fill=prim + (75,), width=2)
        draw.ellipse([x1 + 13, y0 + 13, x1 + 20, y0 + 20], fill=sec + (170,))


def polygon_reg(cx, cy, r, sides, rot_deg=0):
    pts = []
    for i in range(sides):
        a = math.radians(rot_deg + i * 360 / sides)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def draw_motif(neon_draw, crisp_draw, motivo, prim, sec, rng):
    cx, cy = W // 2 + 72, H // 2 - 14
    white = (245, 250, 255)

    if motivo == "sol":
        # Paneles fotovoltaicos en perspectiva + núcleo solar holográfico
        sx, sy = W - 155, 118
        for rr in (76, 56, 38):
            neon_draw.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], outline=prim + (165,), width=3)
        crisp_draw.ellipse([sx - 26, sy - 26, sx + 26, sy + 26], fill=prim + (245,), outline=white + (220,), width=2)
        for a in range(0, 360, 30):
            rad = math.radians(a)
            crisp_draw.line(
                [sx + 44 * math.cos(rad), sy + 44 * math.sin(rad), sx + 66 * math.cos(rad), sy + 66 * math.sin(rad)],
                fill=prim + (210,), width=3
            )
        # Matriz de celdas solares cian en ángulo
        panel = [(78, 298), (336, 298), (384, 186), (146, 186)]
        neon_draw.polygon(panel, fill=(12, 32, 68, 190), outline=sec + (230,))
        crisp_draw.line(panel + [panel[0]], fill=sec + (235,), width=3)
        for k in range(1, 4):
            t = k / 4
            p1 = (78 + (146 - 78) * t, 298 + (186 - 298) * t)
            p2 = (336 + (384 - 336) * t, 298 + (186 - 298) * t)
            crisp_draw.line([p1, p2], fill=sec + (145,), width=2)
        for k in range(1, 5):
            t = k / 5
            p1 = (78 + (336 - 78) * t, 298)
            p2 = (146 + (384 - 146) * t, 186)
            crisp_draw.line([p1, p2], fill=sec + (145,), width=2)

    elif motivo == "calor":
        # Anillos de inducción magnética futurista + ondas térmicas ascendentes
        ix, iy = W // 2, H // 2 + 44
        for rx, ry, col, w in ((190, 58, prim, 4), (142, 43, sec, 3), (92, 28, prim, 4), (44, 14, white, 2)):
            neon_draw.ellipse([ix - rx, iy - ry, ix + rx, iy + ry], outline=col + (215,), width=w)
            crisp_draw.ellipse([ix - rx, iy - ry, ix + rx, iy + ry], outline=col + (235,), width=max(1, w - 1))
        for j in range(-2, 3):
            ox = ix + j * 46
            pts = [(ox + 14 * math.sin(y / 22 + j), y) for y in range(74, iy - 16, 8)]
            neon_draw.line(pts, fill=(sec if j % 2 else prim) + (195,), width=4)
            crisp_draw.line(pts, fill=white + (165,), width=2)

    elif motivo == "crio":
        # Cristal hexagonal criogénico + sub-cristales orbitales
        hx, hy = W // 2, H // 2 - 4
        for r, rot, col in ((108, 0, prim), (74, 30, sec), (40, 0, white)):
            poly = polygon_reg(hx, hy, r, 6, rot)
            neon_draw.polygon(poly, outline=col + (215,))
            crisp_draw.line(poly + [poly[0]], fill=col + (235,), width=3)
        for a in range(0, 360, 60):
            rad = math.radians(a)
            x2, y2 = hx + 118 * math.cos(rad), hy + 118 * math.sin(rad)
            neon_draw.line([(hx, hy), (x2, y2)], fill=sec + (200,), width=3)
            crisp_draw.line([(hx, hy), (x2, y2)], fill=white + (210,), width=2)
            for sign in (-1, 1):
                ba = rad + sign * math.radians(32)
                bx, by = hx + 72 * math.cos(rad), hy + 72 * math.sin(rad)
                crisp_draw.line([(bx, by), (bx + 24 * math.cos(ba), by + 24 * math.sin(ba))], fill=sec + (220,), width=2)

    elif motivo == "flujo":
        # Corrientes aerodinámicas laminares + turbina iónica
        tx, ty = 152, H // 2 - 6
        for rr in (72, 50, 24):
            neon_draw.ellipse([tx - rr, ty - rr, tx + rr, ty + rr], outline=prim + (200,), width=3)
            crisp_draw.ellipse([tx - rr, ty - rr, tx + rr, ty + rr], outline=sec + (220,), width=2)
        for a in range(0, 360, 45):
            rad = math.radians(a)
            crisp_draw.line([tx + 22 * math.cos(rad), ty + 22 * math.sin(rad), tx + 68 * math.cos(rad), ty + 68 * math.sin(rad)], fill=white + (190,), width=2)
        for i in range(6):
            y0 = 96 + i * 38
            pts = [(x, y0 + 22 * math.sin((x - 180) / 62 + i * 0.7)) for x in range(210, W - 28, 12)]
            col = sec if i % 2 == 0 else prim
            neon_draw.line(pts, fill=col + (205,), width=5)
            crisp_draw.line(pts, fill=white + (165,), width=2)

    elif motivo == "espectro":
        # Ecualizador holográfico simétrico + onda portadora
        bars = 18
        bw = 18
        gap = 12
        start_x = (W - (bars * bw + (bars - 1) * gap)) // 2
        mid_y = H // 2 + 8
        for i in range(bars):
            amp = int(28 + 108 * abs(math.sin(i * 0.58 + 0.4)) * (0.65 + 0.35 * math.cos(i - bars / 2) ** 2))
            x = start_x + i * (bw + gap)
            col = lerp(prim, sec, i / max(1, bars - 1))
            neon_draw.rounded_rectangle([x, mid_y - amp, x + bw, mid_y + amp], radius=7, fill=col + (185,))
            crisp_draw.rounded_rectangle([x + 2, mid_y - amp + 2, x + bw - 2, mid_y + amp - 2], radius=5, outline=white + (175,), width=1)
        wave = [(x, mid_y + 34 * math.sin(x / 36)) for x in range(28, W - 28, 8)]
        crisp_draw.line(wave, fill=white + (215,), width=2)

    elif motivo == "domo":
        # Arquitectura smart-home isométrica luminosa + arcos concéntricos
        roof = [(W // 2, 86), (W // 2 + 156, 178), (W // 2, 232), (W // 2 - 156, 178)]
        left_w = [(W // 2 - 156, 178), (W // 2, 232), (W // 2, 332), (W // 2 - 156, 276)]
        right_w = [(W // 2 + 156, 178), (W // 2, 232), (W // 2, 332), (W // 2 + 156, 276)]
        neon_draw.polygon(roof, fill=prim + (95,), outline=prim + (230,))
        neon_draw.polygon(left_w, fill=(24, 28, 68, 185), outline=sec + (210,))
        neon_draw.polygon(right_w, fill=(16, 20, 52, 195), outline=sec + (210,))
        for poly, col in ((roof, prim), (left_w, sec), (right_w, sec)):
            crisp_draw.line(poly + [poly[0]], fill=col + (235,), width=3)
        for r in (44, 72, 100):
            crisp_draw.arc([W // 2 - r, 46 - r // 2, W // 2 + r, 46 + r], start=205, end=335, fill=sec + (185,), width=2)

    elif motivo == "vortice":
        # Tambor hidrodinámico neón + burbujas fotónicas
        vx, vy = W // 2, H // 2 - 4
        for rr, w, col in ((118, 5, prim), (92, 3, sec), (64, 3, prim)):
            neon_draw.ellipse([vx - rr, vy - rr, vx + rr, vy + rr], outline=col + (215,), width=w)
            crisp_draw.ellipse([vx - rr, vy - rr, vx + rr, vy + rr], outline=white + (165,), width=1)
        # Espiral de agua luminosa
        pts = []
        for step in range(90):
            ang = step * 0.16
            rad = 10 + step * 0.92
            pts.append((vx + rad * math.cos(ang), vy + rad * math.sin(ang)))
        neon_draw.line(pts, fill=sec + (230,), width=5)
        crisp_draw.line(pts, fill=white + (210,), width=2)
        for _ in range(16):
            ang = rng.uniform(0, math.tau)
            dist = rng.uniform(75, 185)
            bx, by = int(vx + dist * math.cos(ang)), int(vy + dist * math.sin(ang) * 0.78)
            br = rng.randint(6, 18)
            crisp_draw.ellipse([bx - br, by - br, bx + br, by + br], outline=sec + (200,), width=2)

    elif motivo == "engrane":
        # Engranajes de precisión CAD + retícula láser
        for gx, gy, gr, teeth, col in ((W // 2 - 58, H // 2 - 12, 74, 10, prim), (W // 2 + 78, H // 2 + 34, 52, 8, sec)):
            pts = []
            for i in range(teeth * 2):
                a = math.radians(i * 180 / teeth + 12)
                rr = gr if i % 2 == 0 else gr * 0.80
                pts.append((gx + rr * math.cos(a), gy + rr * math.sin(a)))
            neon_draw.polygon(pts, fill=col + (65,), outline=col + (225,))
            crisp_draw.line(pts + [pts[0]], fill=col + (240,), width=3)
            crisp_draw.ellipse([gx - int(gr * 0.42), gy - int(gr * 0.42), gx + int(gr * 0.42), gy + int(gr * 0.42)], outline=white + (215,), width=2)

    elif motivo == "estructura":
        # Bloques modulares isométricos / entramado arquitectónico CAD
        cubes = [
            (W // 2 - 96, 224, 62, prim),
            (W // 2 + 24, 224, 62, sec),
            (W // 2 - 36, 148, 66, prim),
        ]
        for bx, by, sz, col in cubes:
            dx, dy = int(sz * 0.86), int(sz * 0.48)
            top = [(bx, by - sz), (bx + dx, by - sz + dy), (bx, by - sz + 2 * dy), (bx - dx, by - sz + dy)]
            left = [(bx - dx, by - sz + dy), (bx, by - sz + 2 * dy), (bx, by + 2 * dy - sz // 3), (bx - dx, by + dy - sz // 3)]
            right = [(bx + dx, by - sz + dy), (bx, by - sz + 2 * dy), (bx, by + 2 * dy - sz // 3), (bx + dx, by + dy - sz // 3)]
            neon_draw.polygon(top, fill=col + (115,))
            neon_draw.polygon(left, fill=(20, 28, 64, 200))
            neon_draw.polygon(right, fill=(12, 18, 44, 210))
            for face in (top, left, right):
                crisp_draw.line(face + [face[0]], fill=col + (235,), width=2)

    else:  # velocidad / movilidad
        # Rueda eléctrica de cubo + estelas de velocidad supersónica
        wx, wy = W // 2 + 86, H // 2 + 6
        for rr, w, col in ((88, 6, prim), (66, 3, sec), (26, 4, white)):
            neon_draw.ellipse([wx - rr, wy - rr, wx + rr, wy + rr], outline=col + (225,), width=w)
            crisp_draw.ellipse([wx - rr, wy - rr, wx + rr, wy + rr], outline=col + (240,), width=max(2, w - 2))
        for a in range(0, 360, 60):
            rad = math.radians(a + 18)
            crisp_draw.line([wx + 26 * math.cos(rad), wy + 26 * math.sin(rad), wx + 66 * math.cos(rad), wy + 66 * math.sin(rad)], fill=sec + (220,), width=3)
        for k in range(6):
            ly = wy - 68 + k * 27
            lx0 = 44 + (k % 3) * 28
            lx1 = wx - 56 - (k % 2) * 26
            col = sec if k % 2 else prim
            neon_draw.line([(lx0, ly), (lx1, ly)], fill=col + (220,), width=5)
            crisp_draw.line([(lx0, ly), (lx1, ly)], fill=white + (195,), width=2)


def generar(nombre, prim, sec, motivo):
    rng = random.Random(f"nebula-v2-{nombre}")
    # 1. Fondo espacial índigo profundo con matiz de la categoría
    bg = Image.new("RGB", (W, H))
    px = bg.load()
    top_col = (8, 11, 28)
    bot_col = lerp((16, 22, 54), prim, 0.22)
    for y in range(H):
        ty = y / H
        row_base = lerp(top_col, bot_col, ty)
        for x in range(0, W, 4):
            tx = x / W
            col = lerp(row_base, lerp(row_base, sec, 0.16), tx * 0.65)
            for dx in range(4):
                if x + dx < W:
                    px[x + dx, y] = col

    # 2. Dos focos volumétricos neón mezclados en modo Screen
    bg = ImageChops.screen(bg, radial_glow((W, H), (int(W * 0.72), int(H * 0.36)), 250, prim, 0.58))
    bg = ImageChops.screen(bg, radial_glow((W, H), (int(W * 0.26), int(H * 0.68)), 220, sec, 0.44))

    # 3. Rejilla holográfica y HUD
    rgba = bg.convert("RGBA")
    hud_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hud_draw = ImageDraw.Draw(hud_layer)
    draw_cyber_grid(hud_draw, prim, sec)
    draw_hud_accents(hud_draw, rng, prim, sec)
    rgba = Image.alpha_composite(rgba, hud_layer)

    # 4. Motivo central con halo neón difuminado + trazo nítido encima
    neon_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    crisp_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw_motif(ImageDraw.Draw(neon_layer), ImageDraw.Draw(crisp_layer), motivo, prim, sec, rng)
    glow_layer = neon_layer.filter(ImageFilter.GaussianBlur(7))
    rgba = Image.alpha_composite(rgba, glow_layer)
    rgba = Image.alpha_composite(rgba, neon_layer)
    rgba = Image.alpha_composite(rgba, crisp_layer)

    # 5. Viñeta inferior suave para asegurar contraste de etiquetas sobre la tarjeta
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for y in range(H - 120, H):
        t = (y - (H - 120)) / 120
        vd.line([(0, y), (W, y)], fill=(5, 7, 18, int(135 * (t ** 1.3))))
    rgba = Image.alpha_composite(rgba, vignette)
    return rgba.convert("RGB")


def main():
    web_dir = os.path.join(ROOT, "web", "public", "cat")
    and_dir = os.path.join(ROOT, "app", "src", "main", "res", "drawable-nodpi")
    for nombre, (prim, sec, motivo) in CATS.items():
        img = generar(nombre, prim, sec, motivo)
        web_out = os.path.join(web_dir, f"{nombre}.jpg")
        and_out = os.path.join(and_dir, f"cat_{nombre}.jpg")
        img.save(web_out, quality=90, optimize=True)
        with open(web_out, "rb") as src, open(and_out, "wb") as dst:
            dst.write(src.read())
        print("generada (Nebula)", nombre)
    print("10 imágenes futuristas sincronizadas en web/public/cat/ y drawable-nodpi/")


if __name__ == "__main__":
    main()
