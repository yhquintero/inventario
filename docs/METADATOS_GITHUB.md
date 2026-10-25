# Metadatos del repositorio en GitHub

Valores listos para copiar y pegar en la configuración del repositorio. Requieren **permisos de
administración** en `https://github.com/yhquintero/inventario`: la integración de CI no puede
cambiarlos (la API responde `403 Resource not accessible by integration`).

## 1 · Descripción («About»)

**Settings → General → Description.** Máximo recomendado: una línea, sin punto final.

Usar el texto oficial de `docs/DESCRIPCION.md` (descripción media):

```text
Sistema de gestión comercial para pequeños y medianos negocios: inventario multialmacén, punto de venta, caja diaria, clientes y fiados, e informes con exportación a CSV y PDF. Web instalable (PWA), aplicación Android en Kotlin y servidor propio en Python; funciona sin conexión y guarda los datos en el propio negocio.
```

Alternativa corta (descripción corta de `docs/DESCRIPCION.md`):

```text
Inventario multialmacén, punto de venta, caja diaria, fiados e informes. Web instalable, app Android y servidor propio; funciona sin conexión.
```

## 2 · Temas (`topics`)

**Settings → General → Topics.** Copiar uno por uno (solo minúsculas, números y guiones).

```text
inventario
inventario-multialmacen
punto-de-venta
pos
gestion-comercial
cuadre-de-caja
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

El sitio de presentación ya está en el repositorio: [`docs/index.html`](index.html), autocontenido y
con rutas relativas a `docs/assets/`.

**Para publicarlo:** *Settings → Pages* → *Source*: **Deploy from a branch** → *Branch*:
**`main`** y carpeta **`/docs`** → **Save**. Queda en:

```text
https://yhquintero.github.io/inventario/
```

> `docs/.nojekyll` ya está incluido: GitHub publica los archivos tal cual, sin procesarlos con Jekyll.

Después de publicarlo, poner esa misma dirección en **Settings → General → Website** y añadirla a la
navegación del `README.md` junto a las secciones internas.

El manual imprimible también queda accesible en
`https://yhquintero.github.io/inventario/MANUAL_USUARIO.html` y el video en
`https://yhquintero.github.io/inventario/assets/video/novagest-promo-720p.mp4`.

## 4 · Vista previa social

**Settings → General → Social preview → Edit** y subir `docs/assets/social-preview.png`
(1280 × 640) para que el enlace se vea bien al compartirlo.

## 5 · Reporte privado de vulnerabilidades

**Settings → Code security → Private vulnerability reporting → Enable**, de acuerdo con
[`SECURITY.md`](../SECURITY.md).

## 6 · Lista de verificación

- [ ] Descripción «About» reemplazada (antes: «Cuadres, Inventarios»).
- [ ] Temas añadidos (antes: ninguno).
- [ ] GitHub Pages activado desde `main` / `/docs` y sitio abierto sin errores.
- [ ] Dirección del sitio en **Website** y en el `README.md`.
- [ ] Vista previa social subida.
- [ ] Reporte privado de vulnerabilidades activado.
