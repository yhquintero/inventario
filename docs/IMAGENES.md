# Procedencia de las imágenes

## Categorías (`cat/*.jpg`) — RESUELTO (2026-10-14)
Las 10 imágenes de categoría anteriores no tenían origen ni licencia
comprobables en el repositorio, así que **fueron sustituidas** por arte
procedural propio, generado con `tools/generar_imagenes_categorias.py`
(degradado + formas geométricas por categoría, semilla determinista):

- `web/public/cat/{solar,cocina,refrigeracion,clima,audio,hogar,lavado,herramientas,construccion,movilidad}.jpg`
- `app/src/main/res/drawable-nodpi/cat_<mismos nombres>.jpg`

No contienen fotografías, texto ni material de terceros. Regenerar:
`python3 tools/generar_imagenes_categorias.py` (requiere Pillow).
En la interfaz son decorativas (`alt=""`): el nombre de la categoría va en texto.

## Resto de imágenes
- `brand/novagest-icon.png`, `web/public/icon-*.png`, lanzadores Android:
  iconos de la propia aplicación NovaGest (mismo proyecto).
- Fotos que suba cada negocio a un producto (`p.image`): responsabilidad del
  negocio que las sube; deben ser propias o con licencia. La vista previa
  lleva `alt="Foto del producto seleccionada"` y la miniatura junto al nombre
  es decorativa (`alt=""`, el nombre va en texto).
