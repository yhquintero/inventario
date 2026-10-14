#!/usr/bin/env python3
"""Genera las imágenes de categoría de NovaGest (arte propio, sin terceros).

Las 10 imágenes anteriores (`cat/*.jpg`) no tenían origen ni licencia
comprobables en el repositorio, así que se sustituyen por arte procedural
creado aquí: degradado + formas geométricas por categoría, determinista
(misma semilla → misma imagen). El resultado es obra generada por este
script dentro del proyecto; no contiene material de terceros.

Uso:  python3 tools/generar_imagenes_categorias.py   (requiere Pillow)
Salidas: web/public/cat/<img>.jpg y app/src/main/res/drawable-nodpi/cat_<img>.jpg
"""
import math
import os
import random

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 640, 420

# nombre -> (color base, color acento, motivo)
CATS = {
    "solar": ((245, 158, 11), (254, 215, 120), "sol"),
    "cocina": ((239, 68, 68), (254, 178, 140), "olas"),
    "refrigeracion": ((14, 165, 233), (170, 230, 255), "copos"),
    "clima": ((6, 182, 212), (165, 243, 252), "olas"),
    "audio": ((139, 92, 246), (210, 190, 255), "barras"),
    "hogar": ((161, 98, 7), (240, 210, 150), "arcos"),
    "lavado": ((59, 130, 246), (170, 210, 255), "burbujas"),
    "herramientas": ((100, 116, 139), (200, 215, 235), "rejilla"),
    "construccion": ((120, 113, 108), (220, 205, 190), "ladrillos"),
    "movilidad": ((22, 163, 74), (170, 240, 190), "olas"),
}


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def generar(nombre, base, acento, motivo):
    rng = random.Random(nombre)
    img = Image.new("RGB", (W, H))
    px = img.load()
    oscuro = tuple(max(0, int(c * 0.55)) for c in base)
    for y in range(H):
        for x in range(0, W, 4):
            t = (x / W * 0.6 + y / H * 0.4)
            col = lerp(oscuro, base, t)
            for dx in range(4):
                if x + dx < W:
                    px[x + dx, y] = col
    d = ImageDraw.Draw(img, "RGBA")
    # Motivos geométricos semitransparentes (sin texto ni material externo)
    if motivo == "sol":
        cx, cy, r = W - 150, 110, 70
        for rr in range(r, 10, -14):
            d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=acento + (70,))
        d.ellipse([cx - 38, cy - 38, cx + 38, cy + 38], fill=acento + (235,))
    elif motivo == "copos":
        for _ in range(26):
            x, y, r = rng.randint(20, W - 20), rng.randint(15, H - 15), rng.randint(5, 13)
            for a in range(0, 180, 60):
                rad = math.radians(a)
                d.line([x - r * math.cos(rad), y - r * math.sin(rad), x + r * math.cos(rad), y + r * math.sin(rad)], fill=(255, 255, 255, 170), width=3)
    elif motivo == "barras":
        for i in range(14):
            h = 40 + 130 * abs(math.sin(i * 1.7))
            x = 30 + i * 42
            d.rounded_rectangle([x, H - 50 - h, x + 24, H - 50], radius=8, fill=acento + (150,))
    elif motivo == "arcos":
        for i in range(5):
            x = 40 + i * 120
            d.arc([x, 90, x + 150, 300], start=180, end=360, fill=acento + (200,), width=16)
            d.ellipse([x + 55, 300, x + 95, 340], fill=acento + (200,))
    elif motivo == "burbujas":
        for _ in range(34):
            x, y, r = rng.randint(10, W - 10), rng.randint(10, H - 10), rng.randint(6, 30)
            d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, 150), width=3)
    elif motivo == "rejilla":
        for x in range(0, W, 52):
            d.line([x, 0, x, H], fill=acento + (60,), width=8)
        for y in range(0, H, 52):
            d.line([0, y, W, y], fill=acento + (60,), width=8)
        d.rounded_rectangle([70, 120, 330, 250], radius=18, outline=acento + (220,), width=14)
    elif motivo == "ladrillos":
        bh, bw = 44, 118
        for fila, y in enumerate(range(20, H - 20, bh)):
            off = (bw // 2) if fila % 2 else 0
            for x in range(-bw + off, W, bw):
                d.rounded_rectangle([x + 4, y + 4, x + bw - 4, y + bh - 4], radius=6, outline=acento + (140,), width=5)
    else:  # olas
        for i in range(5):
            pts = [(x, 300 + i * 22 + 26 * math.sin(x / 70 + i)) for x in range(0, W + 20, 20)]
            d.line(pts, fill=acento + (110 + i * 25,), width=10)
    # Viñeta suave inferior para que el texto de la tarjeta se lea
    for y in range(H - 130, H):
        t = (y - (H - 130)) / 130
        for x in range(W):
            r0, g0, b0 = px[x, y]
            px[x, y] = (int(r0 * (1 - 0.35 * t)), int(g0 * (1 - 0.35 * t)), int(b0 * (1 - 0.35 * t)))
    return img


def main():
    web_dir = os.path.join(ROOT, "web", "public", "cat")
    and_dir = os.path.join(ROOT, "app", "src", "main", "res", "drawable-nodpi")
    for nombre, (base, acento, motivo) in CATS.items():
        img = generar(nombre, base, acento, motivo)
        img.save(os.path.join(web_dir, f"{nombre}.jpg"), quality=86)
        img.save(os.path.join(and_dir, f"cat_{nombre}.jpg"), quality=86)
        print("generada", nombre)
    print("10 imágenes propias en web/public/cat/ y drawable-nodpi/")


if __name__ == "__main__":
    main()
