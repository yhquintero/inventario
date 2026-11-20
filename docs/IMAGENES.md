# Procedencia de las imágenes

## Categorías (`cat/*.jpg`) — ✅ Arte procedural propio determinista (actualizado 2026-11-16)

Archivos (idénticos byte a byte en ambas ubicaciones, **640 × 420 px**):

- `web/public/cat/{solar,cocina,refrigeracion,clima,audio,hogar,lavado,herramientas,construccion,movilidad}.jpg`
- `app/src/main/res/drawable-nodpi/cat_<mismos nombres>.jpg`

Historial y estado actual:

1. `b00cbe1` (2026-09-26): se añadieron las 10 primeras imágenes sin origen documentado.
2. `ce868ad` (2026-10-14): se sustituyeron por arte procedural propio generado con `tools/generar_imagenes_categorias.py`.
3. `9cf24fc` (PR #23, 2026-10-14): se sustituyeron temporalmente por ilustraciones de 1024 × 1024 px sin metadatos de origen.
4. **2026-11-16 (Edición Nebula futurista)**: se regeneraron las 10 ilustraciones en ambas rutas (`web/public/cat/` y `app/src/main/res/drawable-nodpi/`) mediante `python3 tools/generar_imagenes_categorias.py`, con diseño **cyber-holográfico Nebula** (fondo espacial profundo, rejilla en perspectiva, anillos orbitales, resplandor neón y pictograma vectorial de cada familia renderizado a 2× con supermuestreo Lanczos).

- **Procedencia:** 100 % obra propia procedural determinista del repositorio (`tools/generar_imagenes_categorias.py` + Pillow). Sin fotografías, marcas ajenas ni activos de terceros.
- **Accesibilidad:** en la interfaz son decorativas (`alt=""`); el nombre de la categoría aparece siempre en texto visible. `tools/smoke_web.mjs` verifica la paridad byte a byte entre Web y Android.

## Carrusel para redes (`docs/assets/redes/`, G-03)

Seis piezas de **1080 × 1350 px** (`01-portada.png` … `06-cierre.png`) y su paquete
`novagest-carrusel-6.zip`, generadas por `tools/build_carrusel_redes.py` (regeneradas el 2026-11-16 con las nuevas capturas Nebula).

- **Qué contienen:** escenario espacial Nebula dibujado por el script, el icono oficial
  (`brand/novagest-icon.png`) y **capturas reales** tomadas de `docs/assets/capturas/`
  (venta rápida, cuadre diario, inventario) más la composición móvil (`docs/assets/novagest-movil.png`).
- **Procedencia:** obra propia determinista del proyecto; cero plantillas ni fotografías de terceros.
- **Cómo se publican:** `docs/REDES_SOCIALES.md` (incluido también dentro del ZIP como `textos-para-publicar.md`) y verificado automáticamente por `tools/test_carrusel_redes.py`.

## Capturas del sitio y del README (`docs/assets/`)

- `docs/assets/capturas/*.png` (**tomas de origen del 2026-11-16**): capturas reales 2× supermuestreadas (Lanczos a `1440 × 900` y `1440 × 1060` en `analisis-y-metas.png`) tomadas sobre el servidor real `server/novagest_server.py` con base de datos temporal de demostración, licencia activa y tipografía emoji en color (`NotoColorEmoji`), sin datos personales. El guion reproducible `tools/tomar_capturas.mjs` automatiza la toma en escritorio (claro y oscuro) y vista móvil (`390 × 844`). Para obtener tomas de código más reciente, ejecútalo con un servidor local y Chromium/Playwright disponibles.
- `docs/assets/capturas/galeria-novagest.png` (`1920 × 1080`, composición 2026-11-20): galería editorial clara de seis pantallas reales (Panel, venta, inventario, cuadre, análisis y tema oscuro), con títulos y descripciones legibles.
- `docs/assets/novagest-hero.png` (`1600 × 900`, composición 2026-11-20): hero de presentación con capturas reales del Panel y Venta rápida, texto limpio y composición adaptada al contenido actual del README. Ambas composiciones se regeneran con `python3 tools/build_readme_visuals.py` (requiere ImageMagick: `convert` y `composite`). Sus imágenes de interfaz de origen son las tomas del 2026-11-16; la nueva composición no simula una captura de una versión posterior.
- `docs/assets/social-preview.png` (`1280 × 640`) permanece como composición Nebula generada por `tools/build_sitio_assets_nebula.py`; no se modificó en esta actualización.
- `docs/assets/novagest-movil.png` (`1600 × 860`, 2026-11-16): composición con tres teléfonos enmarcados mostrando las capturas móviles reales del Panel claro, Venta rápida táctil y Modo oscuro Nebula.
- `docs/assets/playstore/feature-graphic.png` (`1024 × 500`) e `icon-512.png` (`512 × 512`): arte de marca Nebula para ficha de tienda; no son capturas de interfaz.

## Resto de imágenes

- `brand/novagest-icon.png`, `web/public/icon-*.png`, lanzadores Android: iconos oficiales de la aplicación NovaGest (mismo proyecto).
- Fotos que suba cada negocio a un producto (`p.image`): responsabilidad del negocio que las sube; deben ser propias o con licencia. La vista previa lleva `alt="Foto del producto seleccionada"` y la miniatura junto al nombre es decorativa (`alt=""`).
