# Mejoras propuestas — supervisión por pasos

Lista de trabajo para llevar la Web y el Android al máximo, ordenada por **impacto** y **esfuerzo**.
Cada paso se revisa, se aprueba y se entrega en su propio pull request; las filas se marcan al
terminar. La hoja de ruta de producto (visión a más largo plazo) sigue en [`ROADMAP.md`](ROADMAP.md).

**Leyenda:** impacto 🔴 alto · 🟠 medio · 🟢 bajo — esfuerzo ⏱️ bajo (≤1 día) · ⏳ medio (2-5 días) ·
🧱 alto (>1 semana).

## Paso 1 · Descripción y mensaje (hecho)

| # | Mejora | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|
| D-01 | Descripción del proyecto reescrita (ficha, ecosistema, funciones, roles) | `README.md` | 🔴 | ⏳ | ✅ |
| D-02 | Sitio de presentación autocontenido, listo para GitHub Pages | `docs/index.html` | 🟠 | ⏳ | ✅ |
| D-03 | Texto oficial único (corto, medio, largo) y vocabulario | `docs/DESCRIPCION.md` | 🔴 | ⏱️ | ✅ |
| D-04 | Descripción aplicada a PWA, pestaña del navegador, sitio y bloques «Acerca de» | `web/`, `docs/index.html` | 🟠 | ⏱️ | ✅ |
| D-05 | Las 7 traducciones alineadas (cabecera, CI, Keygen, roles) | `docs/readme/` | 🟠 | ⏳ | ✅ |
| D-06 | Metadatos de GitHub listos para copiar (About, temas, Pages) | `docs/METADATOS_GITHUB.md` | 🟠 | ⏱️ | ✅ |
| D-07 | Nueva locución del video (español neutro, sin acento inglés) | `docs/assets/video/` | 🟠 | ⏳ | ⬜ |

## Paso 2 · Web App

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| W-01 | Gráficos SVG en Panel y Análisis (tendencia 30 días, margen por categoría, mapa de calor) | Hoy son cifras; una tendencia se lee de un vistazo | `web/js/app.js` | 🔴 | ⏳ | ⬜ |
| W-02 | Cola de cambios sin conexión con resolución por `updatedAt` | Hoy se reenvía el estado completo al reconectar | `web/js/store.js` | 🔴 | 🧱 | ⬜ |
| W-03 | Alertas de reposición predictivas (velocidad de venta × stock) | Evita quedarse sin lo que más rota | Panel + Worker | 🟠 | ⏳ | ⬜ |
| W-04 | Comando rápido en la búsqueda global (`Ctrl + K`): «vender arroz 2» | Vender en 5 segundos desde cualquier pantalla | `web/js/app.js` | 🟠 | ⏳ | ⬜ |
| W-05 | Impresión de ticket 58/80 mm además de A4 | Impresoras térmicas de mostrador | `web/css/app.css` | 🟠 | ⏱️ | ⬜ |
| W-06 | Comparador de períodos en Informes (mes actual vs anterior) | Decisiones con contexto, no cifras sueltas | `web/js/app.js` | 🟠 | ⏳ | ⬜ |
| W-07 | Exportación XLSX nativa desde el servidor (`openpyxl`) | El contador trabaja en Excel | `server/`, export | 🟢 | ⏱️ | ⬜ |
| W-08 | Modo kiosco para tablet de mostrador (sin barra del navegador) | Uso real en el punto de venta | PWA | 🟢 | ⏱️ | ⬜ |
| W-09 | `aria-live` y foco gestionado en operaciones largas | Accesibilidad más allá de WCAG AA | `web/js/app.js` | 🟢 | ⏱️ | ⬜ |

## Paso 3 · App Android

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| A-01 | Cola local persistente con reintentos y conflicto por `updatedAt` | Trabajar días sin red sin perder ventas | `data/sync/` | 🔴 | 🧱 | ⬜ |
| A-02 | Receipt Bluetooth ESC/POS (58/80 mm) | Cobrar e imprimir desde el móvil | `ui/pos/` | 🟠 | ⏳ | ⬜ |
| A-03 | Escáner con CameraX (sin depender de servicios de Google) | Móviles sin Play Services | `ui/pos/` | 🟠 | ⏳ | ⬜ |
| A-04 | Widget de inicio: ventas del día y stock bajo | Abrir con la información, sin entrar | `appwidget/` | 🟠 | ⏳ | ⬜ |
| A-05 | Base local cifrada (SQLCipher) y bloqueo por inactividad | Teléfono perdido = datos protegidos | `data/` | 🟠 | ⏳ | ⬜ |
| A-06 | Sincronización incremental (delta) en vez de estado completo | Menos datos, más rápido en 3G | `data/sync/` | 🟠 | 🧱 | ⬜ |
| A-07 | Edición de fichas de costo e IPV (hoy solo consulta) | Paridad real con la Web | `ui/` | 🟠 | ⏳ | ⬜ |
| A-08 | Aviso a la hora de cierre si el día no está cuadrado | Cierra la caja todos los días | `notifications/` | 🟢 | ⏱️ | ⬜ |
| A-09 | Diseño para tablet (dos paneles, apaisado) | Mostrador y almacén | `ui/` | 🟢 | ⏳ | ⬜ |

## Paso 4 · Servidor y plataforma

| # | Mejora | Por qué | Dónde | Impacto | Esfuerzo | Estado |
|---|---|---|---|---|---|---|
| S-01 | Auditoría encadenada (hash de la entrada anterior) | Detectar borrados o cambios silenciosos | `server/` | 🔴 | ⏳ | ⬜ |
| S-02 | Restauración automática probada en CI nocturno (ya hay prueba; añadir aviso si falla) | Una copia que no se restaura no es una copia | `tools/`, CI | 🟠 | ⏱️ | ⬜ |
| S-03 | API con paginación y `?since=` | Móviles y catálogos grandes | `server/` | 🟠 | ⏳ | ⬜ |
| S-04 | Instalador de Windows con el entorno incluido | Instalar en 3 clics, sin Python | `deploy/` | 🟠 | ⏳ | ⬜ |
| S-05 | Panel de salud para el titular (copias, espacio, licencia) | Prevenir antes de que falle | `server/` | 🟢 | ⏱️ | ⬜ |

## Cómo se supervisa

1. Se elige el paso y se marcan las filas que entran.
2. Cada fila se entrega en un pull request con su prueba y su entrada en `CHANGELOG.md`.
3. Al cerrar el paso se actualizan las columnas **Estado** (⬜ pendiente · 🔄 en curso · ✅ hecho)
   y las tablas de resultado del final de cada paso.
