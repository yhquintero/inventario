# Ficha de Google Play — NovaGest v1.1.0 «Nebula»

Todo lo que necesitas para publicar NovaGest en Google Play. Los assets gráficos están en
[`docs/assets/playstore/`](assets/playstore/). La versión a publicar es **1.1.0 (versionCode 7)**.

---

## 1. Datos de la app

| Campo | Valor |
|---|---|
| Nombre de la app | **NovaGest · Inventario y POS** |
| Paquete | `com.novagest.inventario` |
| Categoría | Negocios (Business) |
| Etiquetas / tags | inventario, punto de venta, caja, ERP, contabilidad, pymes |
| Clasificación de contenido | Todos (para todos) — cuestionario IARC: sin violencia, sexualidad, apuestas ni lenguaje fuerte |
| Público objetivo | Negocios y profesionales (no diseñada para menores de 13 años) |
| Anuncios | **No** contiene publicidad |
| Versión a subir | **1.1.0 · versionCode 7** (`app/build.gradle.kts`) |
| Sitio web | https://yhquintero.github.io/inventario/ |
| Política de privacidad | https://yhquintero.github.io/inventario/ (sección Legal) — también `docs/GUIA_DATOS_LEGALES.md` |
| Correo de contacto | El del titular de la licencia (ver `SECURITY.md`) |

## 2. Assets gráficos (Play Console → Configuración de la tienda)

| Asset | Especificación | Archivo |
|---|---|---|
| Icono de la tienda | 512 × 512 · PNG 32 bits | [`icon-512.png`](assets/playstore/icon-512.png) |
| Gráfico destacado | 1024 × 500 | [`feature-graphic.png`](assets/playstore/feature-graphic.png) |
| Capturas de teléfono | Mínimo 2 (usa 6–8), 9:16 o 16:9, lado ≥ 320 px | Tómalas de la build release (ver §6) |

### Capturas recomendadas (en este orden, con estos pies)

1. **Venta rápida** — «Cobra en segundos: toca productos, cobra contado o a fiado e imprime el ticket.»
2. **Inicio Nebula** — «Tu negocio de un vistazo: ventas de hoy, inventario y alertas de stock, con la nueva interfaz Nebula.»
3. **Reportes** — «Mapa de calor de 10 semanas, anillo de movimientos y comparador vs. período anterior.»
4. **Inventario** — «Existencias, mínimos y categoría por foto; escáner de códigos de barras.»
5. **Cuadre de caja** — «Cierra la caja con tres líneas: sistema, dinero real y diferencia siempre en 0.»
6. **Finanzas** — «Tipo de cambio con tendencia, comisiones y extracciones, todo en USD.»
7. **Widget** — «Venta del día y existencias en riesgo, sin abrir la app.»
8. **Ajustes → Califica NovaGest** — muestra el botón de reseña integrado en la app.

## 3. Texto para la ficha

### Descripción corta (máx. 80 caracteres)

```
Inventario, punto de venta, caja diaria e informes para tu negocio.
```

Variantes:
```
Vende, cuenta y cierra la caja — inventario y POS sin conexión.
Inventario + POS + caja diaria: tu negocio, de un vistazo.
```

### Descripción completa (máx. 4000 caracteres)

```
NovaGest reúne en un solo lugar el inventario, la venta rápida, la caja diaria, los clientes y fiados, las fichas de costo e IPV y la gestión económica y financiera de tu negocio — también sin conexión.

▌ PUNTO DE VENTA
· Venta rápida con toque, cobra contado o a fiado (límite de crédito por cliente).
· Lector USB/Bluetooth de códigos de barras o cámara integrada.
· Ticket térmico 58/80 mm por Bluetooth (ESC/POS) y reimpresión de la última venta.
· Cliente fiado con límite, vencimientos y abonos enlazados a la venta.

▌ INVENTARIO INTELIGENTE
· Multialmacén con stock mínimo y alertas de reposición.
· Reposición sugerida: ritmo de venta de 30 días × cobertura de 14 días.
· Catálogo con foto por categoría, precios, costo histórico y margen real.
· Conteo físico guiado con la cámara: cuadra el estante sin libreta.

▌ CAJA Y CUADRE
· Cuadre diario automático: ventas, entradas, salidas y diferencia siempre visible.
· Aviso a las 20:00 si el día no está cuadrado; auditoría y copias de seguridad cifradas.

▌ REPORTES Y ANÁLISIS (NUEVO)
· Curva de ventas de los últimos 30 días con brillo Nebula.
· Mapa de calor de ventas de 10 semanas y anillo de composición de movimientos.
· Comparador vs. período anterior (▲▼ %) y utilidad bruta con costo histórico.
· Exportación CSV, Excel y PDF lista para tu contador.

▌ FINANZAS
· Tipo de cambio con tendencia, comisiones de gestor y extracciones consolidadas en USD.
· Contabilidad integrada: asientos con cuadre, libro mayor y estados financieros (Web).

▌ SEGURIDAD Y PRIVACIDAD
· Base de datos local cifrada (SQLCipher), bloqueo con huella/rostro y PIN.
· Sin publicidad ni rastreadores; tus datos no salen de tu negocio salvo sincronización opcional.
· Funciona sin conexión; sincroniza con tu servidor propio cuando hay red.

▌ PARA QUIÉN
Tiendas, almacenes, agromercados, ferreterías, paladares, negocios de Cuba y Latinoamérica que quieren dejar el cuaderno atrás — con o sin conexión permanente.

¿Ya usas NovaGest? En Ajustes tienes el botón «Califica NovaGest»: tu reseña ayuda a que otros negocios lo encuentren.
```

### Novedades (What's new · 1.1.0)

```
· Nuevo tema futurista «NovaGest Nebula» (claro y oscuro): violeta eléctrico, cian neón y esmeralda.
· Barra de menú aclopada al tema, encabezado con brillo y cajón lateral con degradado.
· Gráficas nuevas: curva de ventas 30 días, mapa de calor de 10 semanas, anillo de movimientos y comparador vs. período anterior.
· Reposición sugerida y sparkline de tipo de cambio. Bienvenida Nebula, splash y respuesta háptica al cobrar.
· Widget renovado y botón «Califica NovaGest» en Ajustes.
```

## 4. Seguridad de los datos (Data safety — Play Console)

| Pregunta | Respuesta |
|---|---|
| ¿La app recopila datos del usuario? | **No** recopila datos para el desarrollador. Todo vive en el dispositivo o en el servidor propio del negocio. |
| ¿La app comparte datos con terceros? | No. No hay SDKs de analítica ni publicidad. |
| Transmisión de datos | Cifrada en tránsito (HTTPS/TLS con certificate pinning opcional, ver `security/CertificatePinning.kt`). |
| Almacenamiento en el dispositivo | Cifrado en reposo con SQLCipher (`data/local/AppDatabase.kt`). |
| Datos en el servidor | Solo el servidor propio del negocio; autenticación por sesión + roles (Administrador/Jefe/Vendedor/Económico) y auditoría encadenada. |
| Eliminación de datos | Desinstalar la app; en la Web, borrar negocio/empresa desde el panel del titular. Solicitudes a `privacidad@<el dominio del titular>`. |
| Permisos y por qué | Ver tabla §5. |

Permisos declarados en `AndroidManifest.xml`:

| Permiso | Para qué | ¿Obligatorio? |
|---|---|---|
| `INTERNET` | Sincronización con el servidor del negocio (opcional; la app funciona 100 % offline) | Sí (la app arranca sin él) |
| `CAMERA` | Conteo físico y escaneo de códigos de barras (decodificación en el dispositivo, nada se sube) | No |
| `BLUETOOTH_CONNECT` / `BLUETOOTH` | Impresoras térmicas de tickets ya emparejadas | No |
| `POST_NOTIFICATIONS` | Avisos de stock bajo, cierre pendiente y copia diaria | No |
| `RECEIVE_BOOT_COMPLETED` | Reprogramar los avisos tras reiniciar el teléfono | Sí |
| `WAKE_LOCK` / `FOREGROUND_SERVICE` | Copias diarias y sincronización en segundo plano | Sí |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | Bloqueo al abrir (huella/rostro) | No |

Funciones sin cuenta: la app puede usarse **sin servidor** (modo local, solo este teléfono). Con
servidor, los datos van al equipo del negocio — nunca a servidores del desarrollador.

## 5. Configuración previa al envío

1. **Keystore**: `keystore.properties` en la raíz (ignorado por git) con `storeFile`, `storePassword`, `keyAlias`, `keyPassword`.
2. **Bundle**: `./gradlew :app:bundleRelease` → `app/build/outputs/bundle/release/app-release.aab`.
   En este entorno no hay Android SDK; la CI ejecuta `testDebugUnitTest`, `compileDebugAndroidTestKotlin` y `androidTest` en emulador (`tools/ci_androidtest.sh`). El release lint corre con `abortOnError = false`.
3. **Play Console**: crear app → subir AAB → completar ficha (§2–4) → **Pruebas internas** → **Pruebas cerradas** → **Producción**.
4. **Pre-launch report**: revisar los resultados del robot en Google Play (capturas + crashes en 0).
5. **In-app rating**: ya integrado como enlace a la ficha desde Ajustes (sin SDK); si se quiere el diálogo nativo, añadir `com.google.android.play:review` en una próxima iteración.
6. **Versionado**: cada subida incrementa `versionCode`; `versionName` describe la tanda (1.1.0 «Nebula»).
7. **Ficha legal**: enlazar la política de privacidad en Play Console y en «Acerca de» dentro de la app.

## 6. Checklist de lanzamiento

- [x] Icono 512 y feature graphic Nebula generados.
- [x] Descripción corta/larga, novedades y data safety redactados.
- [x] Versión bump `versionCode 7` / `versionName 1.1.0`; CHANGELOG actualizado.
- [x] CI verde (unit + UI) — vigilar la ejecución de `ci.yml` tras el push.
- [ ] Capturas reales de la build release (8 pantallas, §2).
- [ ] Subir a Play Console → pruebas internas → producción.
- [ ] Activar «Calificar en Play» desde Ajustes tras el lanzamiento (ya incluido).

## 7. Roadmap Play Store (siguientes tandas)

A-03 escaneo CameraX dentro de Venta rápida · A-06/A-10 sincronización incremental (`?since=`) ·
A-07 edición de Fichas/IPV en Android · A-09 layout tablet de dos paneles · in-app review API nativa ·
in-app updates · multi-idioma (es/en) · modo mostrador en Android · panel del dueño solo-lectura.
