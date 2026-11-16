# Metadatos del repositorio en GitHub

Valores listos para copiar y pegar en la configuración del repositorio. Requieren **permisos de
administración** en `https://github.com/yhquintero/inventario`: la integración de CI no puede
cambiarlos (la API responde `403 Resource not accessible by integration`).

## 1 · Descripción («About»)

**Settings → General → Description.** Máximo recomendado: una línea, sin punto final (GitHub admite hasta 350 caracteres).

Texto oficial recomendado (`docs/DESCRIPCION.md`, 291 caracteres):

```text
Sistema de gestión comercial y contable para pymes: inventario multialmacén, punto de venta, cuadre diario, fiados, partida doble e informes PDF/XLSX. Web instalable (PWA), app Android en Kotlin y servidor propio en Python con SQLite; funciona sin conexión y guarda los datos en el negocio
```

Alternativa corta (`docs/DESCRIPCION.md`, 145 caracteres):

```text
Inventario multialmacén, punto de venta, caja diaria, fiados y contabilidad. Web instalable, app Android y servidor propio; funciona sin conexión
```

Aplicación rápida desde terminal (para el administrador del repositorio con `gh` autenticado):

```bash
gh repo edit yhquintero/inventario \
  --description "Sistema de gestión comercial y contable para pymes: inventario multialmacén, punto de venta, cuadre diario, fiados, partida doble e informes PDF/XLSX. Web instalable (PWA), app Android en Kotlin y servidor propio en Python con SQLite; funciona sin conexión y guarda los datos en el negocio" \
  --homepage "https://yhquintero.github.io/inventario/" \
  --add-topic inventario,inventario-multialmacen,punto-de-venta,pos,gestion-comercial,cuadre-de-caja,contabilidad,partida-doble,pwa,offline-first,python,sqlite,kotlin,jetpack-compose,android,licencias
```

## 2 · Temas (`topics`)

**Settings → General → Topics.** Copiar uno por uno (solo minúsculas, números y guiones; máximo 20 temas en GitHub).

```text
inventario
inventario-multialmacen
punto-de-venta
pos
gestion-comercial
cuadre-de-caja
contabilidad
partida-doble
pwa
offline-first
python
sqlite
kotlin
jetpack-compose
android
licencias
```

## 3 · Sitio web (`homepage`)

El sitio de presentación ya está en el repositorio: [`docs/index.html`](index.html), autocontenido,
con estética futurista **Nebula**, selector interactivo de pantallas reales y rutas relativas a `docs/assets/`.

**Para publicarlo:** *Settings → Pages* → *Source*: **Deploy from a branch** → *Branch*:
**`main`** y carpeta **`/docs`** → **Save**. Queda en:

```text
https://yhquintero.github.io/inventario/
```

> `docs/.nojekyll` ya está incluido: GitHub publica los archivos tal cual, sin procesarlos con Jekyll.

> `docs/index.html` declara `og:image` y `twitter:image` **absolutas** hacia
> `https://yhquintero.github.io/inventario/assets/social-preview.png` (1280×640) con ancho/alto
> y texto alternativo: al habilitar Pages, las previsualizaciones en WhatsApp, Telegram, X y LinkedIn
> funcionan de inmediato. `social-preview.png` se regenera con `python3 tools/build_sitio_assets_nebula.py`.

Después de publicarlo, poner esa misma dirección en **Settings → General → Website**.

Páginas complementarias publicadas automáticamente bajo el mismo sitio:

- Manual imprimible: `https://yhquintero.github.io/inventario/MANUAL_USUARIO.html`
- Novedades generadas desde el CHANGELOG: `https://yhquintero.github.io/inventario/NOVEDADES.html`
- Guía rápida de mostrador (2 páginas A4): `https://yhquintero.github.io/inventario/GUIA_MOSTRADOR.html`
- Guía de urgencias «Qué hacer si…» (1 página A4): `https://yhquintero.github.io/inventario/QUE_HACER_SI.html`
- Vídeo promocional 720p: `https://yhquintero.github.io/inventario/assets/video/novagest-promo-720p.mp4`

## 4 · Vista previa social

**Settings → General → Social preview → Edit** y subir `docs/assets/social-preview.png`
(1280 × 640, composición Nebula con capturas reales en alta nitidez).

## 5 · Reporte privado de vulnerabilidades

**Settings → Code security → Private vulnerability reporting → Enable**, de acuerdo con
[`SECURITY.md`](../SECURITY.md) y [`.well-known/security.txt`](../web/.well-known/security.txt).

## 6 · Lista de verificación

- [ ] Descripción «About» actualizada con el texto oficial de una línea.
- [ ] Los 16 temas (`topics`) añadidos.
- [ ] GitHub Pages activado desde `main` / `/docs` y sitio abierto sin errores.
- [ ] Dirección `https://yhquintero.github.io/inventario/` configurada en **Website**.
- [ ] Vista previa social (`docs/assets/social-preview.png`) subida.
- [ ] Reporte privado de vulnerabilidades activado.
