# Descripción del producto y guía de mensajes

Texto oficial de NovaGest para que **todos los canales digan lo mismo**: el repositorio, el sitio,
la propia aplicación Web, la instalación como app (PWA) y las licencias. Si cambia un texto aquí,
cambia también en los lugares de la tabla del final.

## Lema

```text
Gestiona. Crece. Avanza.
```

## Descripción corta (≤ 160 caracteres)

Para metadatos, listados y cualquier espacio de una o dos líneas.

```text
Inventario multialmacén, punto de venta, caja diaria, fiados e informes. Web instalable, app Android y servidor propio; funciona sin conexión.
```

## Descripción media (≤ 350 caracteres)

Para el apartado **About** de GitHub, el sitio y presentaciones.

```text
Sistema de gestión comercial para pequeños y medianos negocios: inventario multialmacén, punto de venta, caja diaria, clientes y fiados, e informes con exportación a CSV y PDF. Web instalable (PWA), aplicación Android en Kotlin y servidor propio en Python; funciona sin conexión y guarda los datos en el propio negocio.
```

## Descripción larga (párrafo de portada)

El párrafo de apertura del `README.md` y del sitio.

> **NovaGest** sustituye las hojas sueltas, los cuadernos y las plantillas de Excel por una sola
> aplicación: **inventario multialmacén**, **punto de venta**, **caja diaria**, **clientes y fiados**,
> **fichas de costo** e **informes con análisis**. La interfaz Web se instala como app (PWA) y sigue
> funcionando si se cae la conexión; la app Android lleva la operación al bolsillo; y un servidor
> propio —una laptop del negocio o un equipo con dominio— mantiene a todo el equipo trabajando sobre
> el **mismo estado**, con roles, auditoría, licencia y copias cifradas.

## Propuestas de valor

1. **Un solo estado, no copias de cifras.** La Web y el Android trabajan sobre los mismos datos del
   servidor: lo que se vende en el móvil se ve en el mostrador.
2. **Funciona sin conexión.** La Web se instala como app y sigue operando si se cae la red; el
   Android guarda en local y sube al reconectar.
3. **Control de verdad.** Los permisos se validan en el servidor (no solo en la interfaz), cada
   cambio queda en la auditoría, el cierre del día protege las cifras y las copias van cifradas.

## Para quién es

Tiendas, almacenes, distribuidoras y negocios familiares de hasta ~20 personas, con uno o varios
locales. Roles: **Administrador**, **Jefe**, **Económico** y **Almacenero** (además de cajeros con
permisos de venta).

## Vocabulario

| Usar | Evitar | Motivo |
|---|---|---|
| inventario **multialmacén** | multi-almacén, multi almacén, multibodega | Término único en toda la interfaz |
| **cuadre diario** | arqueo, cuadre de caja | Es el nombre del módulo |
| **venta rápida** | POS rápido, caja rápida | Es el nombre del módulo |
| **fiado** / **por cobrar** | crédito, financiamiento | Lenguaje del negocio |
| **licencia de uso** | suscripción | No hay cobro recurrente automático |
| **NovaGest** | Cuadre Pinar | Marca anterior, retirada de lo visible |
| **Web**, **Android**, **servidor** | frontend, app nativa, backend | Nombres de las tres piezas |

## Dónde vive cada texto

| Canal | Archivo | Campo |
|---|---|---|
| Repositorio (portada) | `README.md` | párrafo de resumen y tabla «Ficha del proyecto» |
| Repositorio (About y temas) | configuración de GitHub | ver [`METADATOS_GITHUB.md`](METADATOS_GITHUB.md) |
| Sitio de presentación | `docs/index.html` | `<meta name="description">`, `og:description`, portada |
| Aplicación Web | `web/index.html` | `<meta name="description">`, `<title>` |
| Instalación como app (PWA) | `web/manifest.webmanifest` | `name`, `short_name`, `description` |
| Manual imprimible | `tools/build_manual_html.py` | `<meta name="description">` del HTML generado |
| Traducciones | `docs/readme/README_*.md` | cabecera y resumen |

> El texto en español es el de referencia. Las traducciones mantienen el mismo mensaje, no una
> versión distinta del producto.
