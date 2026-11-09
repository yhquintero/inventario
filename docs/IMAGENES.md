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

## Carrusel para redes (`docs/assets/redes/`, G-03)

Seis piezas de **1080 × 1350 px** (`01-portada.png` … `06-cierre.png`) y su ZIP
`novagest-carrusel-6.zip`, generadas por `tools/build_carrusel_redes.py`.

- **Qué contienen:** degradado y formas geométricas dibujadas por el script, el icono de la marca
  (`brand/novagest-icon.png`) y **capturas reales** de la aplicación tomadas de
  `docs/assets/capturas/` (venta rápida, cuadre diario, inventario) más la del móvil
  (`docs/assets/novagest-movil.png`).
- **Procedencia:** obra propia del proyecto, generada aquí. No hay fotos, plantillas ni material de
  terceros, y no se usan imágenes de IA en estas piezas.
- **Deterministas:** el mismo script y los mismos insumos producen las mismas piezas; se pueden
  regenerar en cualquier momento sin depender de archivos externos.
- **Cómo se publican:** `docs/REDES_SOCIALES.md` (va también dentro del ZIP como
  `textos-para-publicar.md`).

## Capturas del README (`docs/assets/`)

- `docs/assets/capturas/*.png`: capturas de la propia aplicación NovaGest tomadas el
  2026-10-14 en un servidor local de prueba con los datos de demostración del proyecto
  (sin datos personales). Ojo: el tema «Nebula» (v1.1.0) cambia la piel de la Web; para
  regenerarlas hay que volver a tomarlas en un equipo con navegador:
  `node tools/tomar_capturas.mjs http://127.0.0.1:8455 admin Admin123!`
  (ver las instrucciones del propio archivo; levanta primero un servidor local de prueba
  con `DATA_DIR` temporal y `NOVAGEST_DEMO_USERS=1`). El guion captura 19 vistas en
  1440×900, 3 en tema oscuro y 3 móvil; sustituye a las capturas actuales cuando se ejecute.
- `docs/assets/capturas/galeria-novagest.png` (2026-11-09): collage Nebula de las 6 vistas
  reales, generado por `tools/build_sitio_assets_nebula.py` (determinista) a partir de las
  capturas reales y del fondo Nebula del proyecto. No son pantallas inventadas.
- `docs/assets/novagest-hero.png`, `docs/assets/social-preview.png` (2026-11-09):
  regeneradas con el mismo guion a partir de las capturas reales y del icono de la marca
  (`brand/novagest-icon.png`). Sustituyen a las composiciones antiguas (también derivadas
  de capturas; ver historial).
- `docs/assets/novagest-movil.png`: composición con tres teléfonos del Panel claro, la
  Venta rápida y el tema oscuro (deriva de capturas reales).
- `docs/assets/playstore/feature-graphic.png` (2026-11-09) e `icon-512.png` (2026-11-09):
  arte de marca Nebula para Google Play, generados con IA y revisados en el repositorio;
  no son capturas de la aplicación. El feature graphic cumple 1024×500 y el icono 512×512.

## Resto de imágenes
- `brand/novagest-icon.png`, `web/public/icon-*.png`, lanzadores Android:
  iconos de la propia aplicación NovaGest (mismo proyecto).
- Fotos que suba cada negocio a un producto (`p.image`): responsabilidad del
  negocio que las sube; deben ser propias o con licencia. La vista previa
  lleva `alt="Foto del producto seleccionada"` y la miniatura junto al nombre
  es decorativa (`alt=""`, el nombre va en texto).
