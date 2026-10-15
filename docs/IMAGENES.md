# Procedencia de las imágenes

## Categorías (`cat/*.jpg`) — ⚠️ PENDIENTE DE DOCUMENTAR (revisado 2026-10-14)

Archivos:

- `web/public/cat/{solar,cocina,refrigeracion,clima,audio,hogar,lavado,herramientas,construccion,movilidad}.jpg`
- `app/src/main/res/drawable-nodpi/cat_<mismos nombres>.jpg`

Historial verificado en Git:

1. `b00cbe1` (2026-09-26): se añadieron las 10 primeras imágenes, sin origen ni licencia
   comprobables en el repositorio.
2. `ce868ad` (2026-10-14): se sustituyeron por arte procedural propio, generado con
   `tools/generar_imagenes_categorias.py` (degradado + formas geométricas por categoría,
   semilla determinista; sin fotografías, texto ni material de terceros).
3. `9cf24fc` (PR #23, 2026-10-14, «Renueva diez imágenes de categorías en Web y Android»):
   se sustituyeron de nuevo por las imágenes **actuales**: ilustraciones fotorrealistas de
   1024 × 1024 px, sin metadatos de origen. El PR no indica cómo se obtuvieron.

**Pendiente (titular):** confirmar el origen de las imágenes actuales —por ejemplo, si se
generaron con IA durante el desarrollo, con qué herramienta y en qué fecha— y anotarlo aquí.
Si no puede confirmarse, `python3 tools/generar_imagenes_categorias.py` (requiere Pillow)
vuelve a generar el arte procedural en las dos ubicaciones; en ese caso conviene repetir
también las capturas de `docs/assets/`, que muestran estas imágenes.

En la interfaz son decorativas (`alt=""`): el nombre de la categoría va en texto.

## Capturas del README (`docs/assets/`)

- `docs/assets/capturas/*.png`: capturas de la propia aplicación NovaGest tomadas el
  2026-10-14 en un servidor local de prueba con los datos de demostración del proyecto
  (sin datos personales).
- `docs/assets/novagest-hero.png`, `docs/assets/novagest-movil.png` y
  `docs/assets/social-preview.png`: composiciones hechas a partir de esas capturas, del
  logotipo de NovaGest y de marcos de navegador y de teléfono dibujados con CSS.

## Resto de imágenes
- `brand/novagest-icon.png`, `web/public/icon-*.png`, lanzadores Android:
  iconos de la propia aplicación NovaGest (mismo proyecto).
- Fotos que suba cada negocio a un producto (`p.image`): responsabilidad del
  negocio que las sube; deben ser propias o con licencia. La vista previa
  lleva `alt="Foto del producto seleccionada"` y la miniatura junto al nombre
  es decorativa (`alt=""`, el nombre va en texto).
