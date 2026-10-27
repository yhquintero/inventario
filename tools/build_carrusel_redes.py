#!/usr/bin/env python3
"""Genera el carrusel de 6 imágenes para redes (1080 × 1350) — G-03.

Formato vertical 4:5, el que Instagram, Facebook y LinkedIn muestran **sin recortar** en el
muro. Cada pieza es un PNG suelto y todas juntas van en un ZIP listo para subir.

Requisitos: Pillow.

Uso:
    python3 tools/build_carrusel_redes.py                  # regenera las 6 piezas y el ZIP
    python3 tools/build_carrusel_redes.py --out /tmp/x     # otra carpeta (pruebas)
    python3 tools/build_carrusel_redes.py --sin-zip        # solo los PNG

Salida:
    docs/assets/redes/01-portada.png … 06-cierre.png
    docs/assets/redes/novagest-carrusel-6.zip

El arte es propio (degradado y formas geométricas dibujadas aquí): no usa fotos ni plantillas
de terceros, igual que `generar_imagenes_categorias.py` y `build_reel_vertical.py`. Las capturas
salen de `docs/assets/capturas/`, que son pantallas reales de la aplicación.
"""

from __future__ import annotations

import argparse
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1350
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs" / "assets" / "capturas"
BRAND = ROOT / "brand" / "novagest-icon.png"
MOVIL = ROOT / "docs" / "assets" / "novagest-movil.png"
SALIDA = ROOT / "docs" / "assets" / "redes"

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
class Slide:
    """Una pieza del carrusel."""

    file: str
    kicker: str
    title: str
    sub: str = ""
    image: str | None = None          # archivo de docs/assets/capturas
    kind: str = "shot"                # shot | phone | opening | closing
    bullets: list[str] = field(default_factory=list)


# El orden cuenta una historia: qué es → vender → cuadrar → reponer → móvil → cierre.
SLIDES: list[Slide] = [
    Slide(
        file="01-portada.png",
        kicker="NOVAGEST 1.0",
        title="Todo tu negocio en una app",
        sub="Inventario, ventas, caja e informes",
        kind="opening",
        bullets=["Funciona en la Web instalable", "Y en el Android", "Con los mismos datos"],
    ),
    Slide(
        file="02-vender.png",
        kicker="1 · VENDER",
        title="Escanea, cobra, listo",
        sub="Código de barras, contado o fiado: el stock baja solo.",
        image="venta-rapida.png",
        bullets=["Ticket impreso por Bluetooth", "El fiado queda en la cuenta del cliente"],
    ),
    Slide(
        file="03-cuadrar.png",
        kicker="2 · CUADRAR",
        title="La caja tiene que dar cero",
        sub="Tasa del día, fondos, gastos y salidas: el cuadre al instante.",
        image="cuadre-diario.png",
        bullets=["Avisa si falta o sobra", "Cierre del día en un vistazo"],
    ),
    Slide(
        file="04-reponer.png",
        kicker="3 · REPONER",
        title="Qué comprar y cuánto",
        sub="Con las ventas de 30, 60 y 90 días, el plazo del proveedor y tu stock mínimo.",
        image="inventario.png",
        bullets=["Punto de pedido y lista para WhatsApp", "Almacenes y traspasos sin líos"],
    ),
    Slide(
        file="05-movil.png",
        kicker="TAMBIÉN EN EL MÓVIL",
        title="El ticket llega por WhatsApp",
        sub="Imagen del ticket y texto con el total, el fiado y el saldo del cliente.",
        kind="phone",
        bullets=["Nada se sube a un servidor ajeno", "Sincroniza cuando vuelve la conexión"],
    ),
    Slide(
        file="06-cierre.png",
        kicker="NOVAGEST",
        title="Gestiona. Crece. Avanza.",
        sub="Gestión de inventario y ventas, sin hojas de cálculo sueltas.",
        kind="closing",
        bullets=["Web y Android · los mismos datos", "Copias de seguridad y registro de auditoría"],
    ),
]


# ------------------------------------------------------------------ piezas gráficas
def logo_tile(size: int) -> Image.Image:
    """Icono de marca en cuadrado redondeado (o un dibujo si falta el PNG)."""
    if BRAND.exists():
        icon = Image.open(BRAND).convert("RGBA")
        icon.thumbnail((size, size), Image.LANCZOS)
        tile = Image.new("RGBA", (icon.width, icon.height), (0, 0, 0, 0))
        tile.alpha_composite(icon, (0, 0))
        return rounded(tile, max(8, int(size * 0.22)))
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.26), fill=VIOLET)
    d.text((size * 0.28, size * 0.18), "N", font=font(int(size * 0.6), True), fill=INK)
    return tile


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def with_shadow(tile: Image.Image, blur: int = 22, alpha: int = 150, dy: int = 18) -> Image.Image:
    pad = blur * 2
    canvas = Image.new("RGBA", (tile.width + pad * 2, tile.height + pad * 2), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [pad, pad + dy, pad + tile.width, pad + dy + tile.height], radius=26, fill=(0, 0, 0, alpha)
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(blur)))
    canvas.alpha_composite(tile, (pad, pad))
    return canvas


def background() -> Image.Image:
    """Fondo 4:5: degradado azul noche con halos violeta y verde (la paleta de la app)."""
    base = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(base)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=(int(8 + 12 * t), int(10 + 8 * t), int(26 + 26 * t)))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-300, -380, 700, 420], fill=(*VIOLET, 92))
    g.ellipse([W - 480, H - 520, W + 280, H + 160], fill=(*GREEN, 58))
    return Image.alpha_composite(base.convert("RGBA"), glow.filter(ImageFilter.GaussianBlur(110)))


_FONDO = None


def fondo():
    """Fondo compartido por las seis piezas (se dibuja una sola vez, la primera que haga falta)."""
    global _FONDO
    if _FONDO is None:
        _FONDO = background()
    return _FONDO


def shot_card(name: str | None, max_w: int) -> Image.Image:
    """Captura de la Web en tarjeta redondeada con sombra."""
    if not name:
        return logo_tile(max_w)
    path = SHOTS / name
    if not path.exists():
        return rounded(Image.new("RGBA", (max_w, int(max_w * 0.62)), (20, 22, 44, 255)), 24)
    img = Image.open(path).convert("RGBA")
    img.thumbnail((max_w, max_w), Image.LANCZOS)
    return rounded(img, 24)


def phone_card(max_w: int) -> Image.Image:
    if MOVIL.exists():
        img = Image.open(MOVIL).convert("RGBA")
        img.thumbnail((max_w, int(max_w * 2)), Image.LANCZOS)
        return rounded(img, 32)
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


def centered(d: ImageDraw.ImageDraw, y: int, text: str, fnt, fill, max_w: int, gap: int = 10) -> int:
    for line in wrap(text, fnt, max_w):
        w = d.textlength(line, font=fnt)
        d.text(((W - w) / 2, y), line, font=fnt, fill=fill)
        y += fnt.size + gap
    return y


def slide_frame(sl: Slide, index: int, total: int) -> Image.Image:
    """Dibuja una pieza completa: cabecera de marca, mensaje, imagen y pie.

    El texto de abajo se reparte **de abajo hacia arriba**: primero se reserva el pie,
    luego los puntos y el subtítulo, y la imagen se queda con lo que sobre. Así ninguna
    pieza se sale del lienzo, por largo que sea el texto.
    """
    frame = fondo().copy()
    d = ImageDraw.Draw(frame)

    F_TITULO, F_SUB, F_PUNTO = font(70, True), font(35), font(31)
    LINEA_SUB, LINEA_PUNTO, GAP_PUNTO = 46, 42, 16
    ANCHO_TITULO, ANCHO_SUB, ANCHO_PUNTO = W - 150, W - 190, W - 300

    # Cabecera: icono, nombre y contador de la serie.
    frame.alpha_composite(logo_tile(96), (72, 64))
    d = ImageDraw.Draw(frame)
    d.text((190, 74), "NovaGest", font=font(46, True), fill=INK)
    d.text((192, 128), "Inventario · Venta · Caja · Informes", font=font(24), fill=DIM)
    contador = f"{index + 1}/{total}"
    cw = d.textlength(contador, font=font(30, True))
    d.text((W - 72 - cw, 92), contador, font=font(30, True), fill=GOLD)

    # Rótulo de la pieza en una píldora (se achica si el texto es largo).
    y = 214
    kf = font(31, True)
    while d.textlength(sl.kicker, font=kf) > W - 230 and kf.size > 20:
        kf = font(kf.size - 1, True)
    kw = d.textlength(sl.kicker, font=kf)
    d.rounded_rectangle([(W - kw) / 2 - 26, y, (W + kw) / 2 + 26, y + 52], radius=26,
                        fill=(255, 255, 255, 24), outline=GOLD, width=2)
    d.text(((W - kw) / 2, y + 9), sl.kicker, font=kf, fill=GOLD)

    # Titular: grande, en dos o tres líneas, siempre centrado.
    y = 292
    y = centered(d, y, sl.title, F_TITULO, INK, ANCHO_TITULO, gap=4)
    titulo_fin = y

    # Reparto desde abajo: pie → puntos → subtítulo.
    pie_alto = 190 if sl.kind == "closing" else 104
    lineas_sub = wrap(sl.sub, F_SUB, ANCHO_SUB) if sl.sub else []
    bloques = [wrap(b, F_PUNTO, ANCHO_PUNTO) for b in sl.bullets]
    alto_puntos = sum(len(bl) * LINEA_PUNTO + GAP_PUNTO for bl in bloques)
    alto_texto = len(lineas_sub) * LINEA_SUB + (12 if lineas_sub and bloques else 0) + alto_puntos
    texto_top = H - pie_alto - alto_texto - 10

    # La imagen se queda con el hueco que quede (nunca menos de 220 px).
    img_top = titulo_fin + 30
    img_alto = max(220, texto_top - img_top - 26)
    if sl.kind == "shot":
        card = with_shadow(shot_card(sl.image, W - 210))
    elif sl.kind == "phone":
        card = with_shadow(phone_card(int(W * 0.44)))
    elif sl.kind == "opening":
        card = with_shadow(logo_tile(int(W * 0.38)))
    else:
        card = with_shadow(logo_tile(int(W * 0.32)))
    if card.height > img_alto:
        escala = img_alto / card.height
        card = card.resize((max(1, int(card.width * escala)), img_alto), Image.LANCZOS)
    if card.width > W - 110:
        escala = (W - 110) / card.width
        card = card.resize((W - 110, max(1, int(card.height * escala))), Image.LANCZOS)
    frame.alpha_composite(card, ((W - card.width) // 2, img_top + (img_alto - card.height) // 2))

    # Subtítulo y puntos fuertes, centrados como bloque.
    d = ImageDraw.Draw(frame)
    y = texto_top
    for linea in lineas_sub:
        w = d.textlength(linea, font=F_SUB)
        d.text(((W - w) / 2, y), linea, font=F_SUB, fill=DIM)
        y += LINEA_SUB
    if lineas_sub and bloques:
        y += 12
    for bl in bloques:
        ancho = max(d.textlength(l, font=F_PUNTO) for l in bl)
        x0 = (W - ancho) / 2
        d.ellipse([x0 - 34, y + 10, x0 - 20, y + 24], fill=GREEN)
        for linea in bl:
            d.text((x0, y), linea, font=F_PUNTO, fill=INK)
            y += LINEA_PUNTO
        y += GAP_PUNTO

    # Pie: llamada a la acción en el cierre, firma discreta en el resto.
    if sl.kind == "closing":
        d.rounded_rectangle([80, H - 176, W - 80, H - 62], radius=57, fill=GOLD)
        cta = "Web instalable · Android · los mismos datos"
        cf = font(34, True)
        if d.textlength(cta, font=cf) > W - 250:
            cf = font(28, True)
        cw = d.textlength(cta, font=cf)
        d.text(((W - cw) / 2, H - 176 + (114 - cf.size) / 2 - 4), cta, font=cf, fill=(25, 20, 5))
    else:
        pie = f"NovaGest · gestión de inventario y ventas · {index + 1} de {total}"
        d.text(((W - d.textlength(pie, font=font(24))) / 2, H - 66), pie, font=font(24), fill=(208, 212, 238))
    return frame


# ------------------------------------------------------------------ salida
def build(out: Path = SALIDA, con_zip: bool = True) -> list[Path]:
    out.mkdir(parents=True, exist_ok=True)
    rutas: list[Path] = []
    for i, sl in enumerate(SLIDES):
        img = slide_frame(sl, i, len(SLIDES)).convert("RGB")
        ruta = out / sl.file
        img.save(ruta, "PNG", optimize=True)
        rutas.append(ruta)
    if con_zip:
        destino = out / f"novagest-carrusel-{len(SLIDES)}.zip"
        with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
            for ruta in rutas:
                # Sin carpetas dentro del ZIP: se suben tal cual a la red social.
                z.write(ruta, arcname=ruta.name)
            leeme = ROOT / "docs" / "REDES_SOCIALES.md"
            if leeme.exists():
                z.write(leeme, arcname="textos-para-publicar.md")
    return rutas


def main() -> int:
    ap = argparse.ArgumentParser(description="Carrusel 1080×1350 para redes (G-03)")
    ap.add_argument("--out", default=str(SALIDA), help="carpeta de salida")
    ap.add_argument("--sin-zip", action="store_true", help="no generar el ZIP")
    args = ap.parse_args()
    rutas = build(Path(args.out), con_zip=not args.sin_zip)
    for r in rutas:
        print(f"  · {r.relative_to(ROOT) if r.is_relative_to(ROOT) else r}  {r.stat().st_size // 1024} KB")
    if not args.sin_zip:
        z = Path(args.out) / f"novagest-carrusel-{len(SLIDES)}.zip"
        print(f"OK · {len(rutas)} piezas 1080×1350 · ZIP {z.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
