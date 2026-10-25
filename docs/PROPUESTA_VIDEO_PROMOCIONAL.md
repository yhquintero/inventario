# Propuesta de video promocional — NovaGest

**«Gestiona. Crece. Avanza.» · Video de presentación de 2:37 min · 720p · con narración y subtítulos**

Este documento es la **propuesta lista para producir**: objetivo, guion escena por escena,
textos en pantalla, narración completa, plan de rodaje, especificaciones técnicas, versiones
cortas para redes y cómo regenerar la pieza.

| Dato | Valor |
|---|---|
| Pieza entregada | `docs/assets/video/novagest-promo-720p.mp4` |
| Subtítulos | `docs/assets/video/novagest-promo-720p.srt` |
| Duración | **2:37** (156,8 s) — por debajo del límite de 3 minutos |
| Resolución / formato | **1280 × 720 (720p)** · H.264 · AAC 160 kbps · 25 fps · `+faststart` |
| Idioma | Español (voz en off + subtítulos quemados) |
| Público | Dueños y administradores de negocios pequeños (decisión de compra) y personal que ya usa la app (recordatorio de los pasos) |
| Mensaje central | NovaGest reúne inventario, venta, caja e informes en la Web y el Android, con los pasos esenciales para empezar en menos de 3 minutos |
| Llamada a la acción | «Solicita tu licencia por WhatsApp» (misma ruta que la pantalla de licencia de la app) |
| Generación | `tools/build_promo_video.py` (composición + montaje automático) |

---

## 1. Objetivo y estrategia

### 1.1 Qué tiene que lograr el video

1. **Entender** en 20 segundos qué es NovaGest y para quién es.
2. **Ver** el recorrido completo de un negocio: activar → configurar → cargar → vender →
   cuadrar → revisar.
3. **Confiar**: se ven permisos, auditoría, copias, cierre de día y licencia.
4. **Actuar**: pedir la licencia por WhatsApp.

### 1.2 Decisiones creativas

| Decisión | Por qué |
|---|---|
| **Seis pasos numerados** en pantalla («PASO 3 DE 6») | El espectador sabe siempre dónde está y percibe un método, no una lista de funciones |
| **Capturas reales** de la app, no ilustraciones | Lo que se ve es lo que se descarga: no hay promesa que la app no cumpla |
| **Barra de progreso** de 8 segmentos | Refuerza que el video es corto y que se puede terminar de ver |
| **Texto grande a la izquierda, interfaz a la derecha** | Se puede ver sin sonido (móvil, WhatsApp, oficina) |
| **Subtítulos quemados** | Accesibilidad y consumo sin audio (85 % de los videos se ven en silencio) |
| **Voz en off cercana, sin tecnicismos** | El dueño del negocio no es informático |
| **Cierre con la marca y la llamada a la acción** | El último fotograma es el que se recuerda |

### 1.3 Tono

Directo, profesional y en segunda persona («escribe», «elige», «pulsa»). Sin superlativos
vacíos: cada afirmación se ve en pantalla.

---

## 2. Guion escena por escena

Timecodes calculados sobre la pista de voz final (locución en **español neutro de Latinoamérica**,
regenerada para esta versión con voz masculina española: 2:37 en total).

| # | Entrada | Escena | Rótulo superior | Textos en pantalla | Apoyo visual |
|---|---|---|---|---|---|
| **1** | 0:00 – 0:15 | **Portada** | NOVAGEST 1.0 | **Gestiona. Crece. Avanza.**<br>Inventario · Punto de venta · Caja diaria · Informes<br>`Aplicación Web instalable` `Aplicación Android` `Servidor compartido` | Logotipo animado sobre fondo degradado azul/verde |
| **2** | 0:15 – 0:29 | **Una sola verdad** | UNA SOLA VERDAD | **Web y Android, los mismos datos**<br>El servidor guarda todo; cada persona entra con su usuario y su rol.<br>• Usuarios y permisos por rol<br>• Auditoría de cada cambio<br>• Copias cifradas automáticas | La Web en el móvil (montaje de tres pantallas) |
| **3** | 0:29 – 0:47 | **Licencia** | PASO 1 DE 6 | **Activa tu licencia**<br>• Solicita la clave por WhatsApp<br>• Pega la clave `NG-…` y activa<br>• ✔ Licencia válida y fecha de expiración | Tarjeta de **Licencia de Uso** con el sello «✔ Licencia válida» |
| **4** | 0:47 – 1:07 | **Configuración** | PASO 2 DE 6 | **Configura el negocio y sus almacenes**<br>• Inventario multialmacén<br>• Almacén en uso siempre visible<br>• Traspasos sin afectar la caja | **Panel** (resumen del día, alertas, accesos) |
| **5** | 1:07 – 1:30 | **Mercancía** | PASO 3 DE 6 | **Importa tu mercancía**<br>• Vista previa fila por fila<br>• Aviso antes de sobrescribir<br>• Cada entrada se puede deshacer | **Inventario** con existencias y precios |
| **6** | 1:30 – 1:50 | **Venta** | PASO 4 DE 6 | **Vende en segundos**<br>• Descuenta el stock al instante<br>• Fiados con vencimiento y límite<br>• Comisión y domicilio automáticos | **Venta rápida** (escáner, carrito, cobro) |
| **7** | 1:50 – 2:11 | **Caja** | PASO 5 DE 6 | **Cuadra la caja del día**<br>• Totales recalculados al instante<br>• Aviso si el día no cuadra<br>• Cierre del día protegido | **Cuadre diario** con el resultado en 0.00 |
| **8** | 2:11 – 2:37 | **Revisión y cierre** | PASO 6 DE 6 | **Revisa, decide y repite**<br>• Informe semanal y utilidad<br>• Metas y margen por categoría<br>• Comprobación de stock<br>**Cierre:** Gestiona. Crece. Avanza. · NovaGest 1.0 · Web + Android · Solicita tu licencia por WhatsApp | **Análisis y metas** → entra el móvil → cierre con logotipo |

En la escena 8, a partir de **2:31**, la imagen se oscurece y aparece el cierre con el
logotipo, el lema y la llamada a la acción.

---

## 3. Narración (voz en off)

Texto exacto de la locución, por escena. Ritmo pausado, frases cortas.

**Escena 1 — Portada**

> Bienvenido a NovaGest: la aplicación que reúne inventario, punto de venta, caja diaria e
> informes para tu negocio. En la Web y en Android, trabajando siempre sobre los mismos datos.

**Escena 2 — Una sola verdad**

> NovaGest termina con las hojas sueltas y los cuadernos. Un servidor guarda toda la
> información, y cada persona entra con su usuario y su rol, con permisos, auditoría y copias
> de seguridad.

**Escena 3 — Paso 1: licencia**

> Paso uno: activar la licencia. Escribe el nombre de tu negocio, elige el plazo y solicita la
> clave por WhatsApp. Cuando la recibas, pégala en Activar licencia y pulsa Activar ahora. Sin
> una licencia válida no se puede entrar.

**Escena 4 — Paso 2: configuración**

> Paso dos: configurar el negocio. En Ajustes escribe el nombre, la tasa CUP por dólar, tus
> metas y la regla de comisión. Después crea tus almacenes, uno por local o depósito,
> escribiendo solo su nombre. Cada almacén tiene su propia existencia.

**Escena 5 — Paso 3: mercancía**

> Paso tres: cargar la mercancía. Abre Importar valores y elige el almacén de destino. Pega
> las columnas del Excel, sube el archivo o escribe en la tabla. Revisa la vista previa: cada
> fila dice si es nueva, si entra al almacén o si sobrescribe. Aplica solo lo que marques.

**Escena 6 — Paso 4: venta**

> Paso cuatro: vender. En Venta rápida escanea el código de barras o toca el producto. Ajusta
> la cantidad y el precio si hay descuento, revisa el almacén y pulsa cobrar. Puedes cobrar al
> contado o fiar a un cliente, con su vencimiento y su límite de crédito.

**Escena 7 — Paso 5: caja**

> Paso cinco: cuadrar la caja. En Cuadre diario anota la tasa, los fondos, los gastos y las
> salidas, y los totales se calculan al instante. El resultado tiene que quedar en cero. Cuando
> esté perfecto, cierra el día: nadie podrá cambiar las ventas ni el cuadre de esa fecha.

**Escena 8 — Paso 6: revisión y cierre**

> Paso seis: revisar. En Informe semanal ves ventas, costos y utilidad; en Análisis y metas, tu
> avance; y en Comprobación, si el inventario cuadra. Todo esto también en Android: vende desde
> el teléfono, consulta existencias y sincroniza al instante. NovaGest: gestiona, crece, avanza.

---

## 4. Especificaciones técnicas

| Parámetro | Valor |
|---|---|
| Contenedor | MP4 (`+faststart`, reproducible en WhatsApp, Telegram, YouTube, Instagram) |
| Video | H.264 High, 1280 × 720, 25 fps, CRF 19–20, `yuv420p` (compatible con todo) |
| Audio | AAC-LC, 44,1 kHz, estéreo, 160 kbps |
| Duración | 2:37 |
| Subtítulos | Quemados en el video + archivo `.srt` aparte (para reeditar o traducir) |
| Texto en pantalla | DejaVu Sans (libre, sin dependencia de fuentes de terceros) |
| Música | **No incluida** en esta versión: la voz va limpia. Ver apartado 5.4 |
| Peso | ~15–25 MB (adecuado para enviar por WhatsApp) |

**Reglas de legibilidad aplicadas**

- Titulares ≥ 30 px y bloques de texto ≤ 2 líneas.
- Contraste mínimo AA sobre fondo oscuro.
- Zona segura de 64 px en los bordes.
- Ningún texto importante depende solo del color.

---

## 5. Plan de producción

### 5.1 Piezas ya generadas (esta versión)

La pieza entregada se compone automáticamente con `tools/build_promo_video.py`:

```bash
# 1) Voz en off (una pista por escena, en WAV 44,1 kHz estéreo)
#    s1.wav … s8.wav en una carpeta
# 2) Render + montaje
python3 tools/build_promo_video.py --audio /ruta/audios --out docs/assets/video/novagest-promo-720p.mp4
```

El script: sincroniza los silencios de entrada y salida de cada escena, compone los
fotogramas (fondo, rótulos, animación de la captura, barra de progreso), mezcla la narración,
genera el `.srt` y entrega el MP4 con los subtítulos quemados.

### 5.2 Versión «rodada» (opcional, para producción profesional)

Si en el futuro se quiere grabar con la app en vivo:

| Plano | Qué grabar | Duración | Detalle |
|---|---|---|---|
| P1 | Portada animada | 8 s | Logotipo + lema |
| P2 | Panel con datos reales (sin datos de clientes) | 10 s | Cursor resaltando alertas y accesos |
| P3 | Licencia: solicitud por WhatsApp y activación | 14 s | Mostrar el mensaje ya escrito |
| P4 | Almacenes e Importar valores | 18 s | Vista previa con filas NEW/SOBRESCRIBE |
| P5 | Venta rápida con lector de códigos | 16 s | Escaneo real, carrito y cobro |
| P6 | Cuadre diario hasta 0.00 | 16 s | «✔ ¡Cuadre perfecto!» |
| P7 | Informe semanal + Análisis y metas | 14 s | Exportar PDF |
| P8 | Android vendiendo y sincronizando (☁ → ✔) | 14 s | Grabar con la pantalla del teléfono |
| P9 | Cierre con logotipo y CTA | 6 s | «Solicita tu licencia por WhatsApp» |

**Cómo grabar bien la pantalla**

1. Grabación a **1280 × 720** o superior y reducir después (nunca ampliar).
2. Usar datos de demostración (`admin` en una instalación de pruebas), **no** datos de
   clientes reales.
3. Cursor lento, sin bandazos; una acción por plano.
4. Audio del sistema en silencio; la voz se graba aparte.
5. Grabar cada plano **dos veces** (por si hay que empalmar).
6. Marcar visualmente lo importante con un recuadro o zoom suave (no con flechas grandes).

### 5.3 Nota sobre los datos que aparecen

Las capturas usan los **datos de demostración del proyecto** (productos genéricos como
«BATERÍA 12V», cliente de ejemplo). No aparece información de personas reales: el video se
puede publicar sin riesgo de datos personales.

### 5.4 Música y derechos

- Si se añade música, debe ser **libre de regalías** o con licencia que cubra uso comercial
  (por ejemplo, pistas CC0 o de bancos con licencia). Guarde el comprobante de licencia.
- Mezcla sugerida: voz a −3 dBFS de pico, música a −22 dB de fondo, con *ducking* (la
  música baja 6–8 dB cuando habla la voz).
- Sin música ya funciona: en oficinas y ferias el texto en pantalla sostiene la pieza.

### 5.5 Localización

- El `.srt` permite traducir sin tocar el video.
- Para otra voz/idioma: regenerar la narración y volver a ejecutar el script (los textos en
  pantalla están en `SCENES` dentro del script).

---

## 6. Versiones cortas para redes

### 6.1 Corte de 30 segundos (WhatsApp / estados / Reels)

| Seg | Imagen | Voz / texto |
|---|---|---|
| 0–4 | Portada | «Inventario, venta, caja e informes en una sola app.» |
| 4–10 | Venta rápida | «Escanea, cobra al contado o fiado y el stock baja solo.» |
| 10–16 | Cuadre diario | «Cuadra la caja del día: el resultado tiene que dar cero.» |
| 16–23 | Informes | «Informe semanal, metas y comprobación del inventario.» |
| 23–27 | Móvil | «Todo también en tu teléfono, con los mismos datos.» |
| 27–30 | Cierre + CTA | «NovaGest. Gestiona. Crece. Avanza. Solicita tu licencia.» |

### 6.2 Corte vertical de 15 segundos (TikTok / Reels / Shorts)

1. **0–3 s:** «¿Cuánto vendiste hoy? ¿Y cuánto te queda?» (gancho).
2. **3–8 s:** Venta rápida + escáner (plano vertical del móvil).
3. **8–12 s:** Cuadre en 0.00.
4. **12–15 s:** Logotipo + «NovaGest · Solicita tu licencia por WhatsApp».

> Para las versiones verticales, reencuadrar a **9:16 (1080 × 1920)** poniendo el texto
> arriba y la captura del móvil en el centro; el video horizontal se puede usar con fondo
> desenfocado.

### 6.3 Formatos de exportación sugeridos

| Plataforma | Formato | Duración |
|---|---|---|
| WhatsApp (envío directo) | 720p MP4, < 25 MB | 2:37 |
| Estado / Reels | 1080 × 1920, 30 s | 0:30 |
| YouTube (presentación) | 1080p MP4 | 2:37 |
| Web del producto (hero) | 720p, sin audio, con subtítulos | 2:37 o 0:30 |
| Feria / pantalla en tienda | 720p en bucle | 2:37 |

---

## 7. Distribución y llamada a la acción

1. **WhatsApp directo** a la lista de clientes potenciales (video + mensaje corto con el
   plazo y el número de contacto).
2. **Estado de WhatsApp**: corte de 30 s con la CTA al final.
3. **YouTube**: título «NovaGest · Inventario, venta, caja e informes (2:37)»,
   descripción con los seis pasos y enlace de contacto.
4. **Redes**: publicación con carrusel de 3 capturas + el corte vertical.
5. **Punto de venta físico**: QR que abre el video (se puede generar con la librería
   `web/vendor/qrcode.mjs`).
6. **Correo de bienvenida** a clientes nuevos: enlace al video y al
   [Manual de Usuario](MANUAL_USUARIO.md).

**Texto sugerido para acompañar el video**

> Así funciona NovaGest en menos de 3 minutos: activa tu licencia, carga tu mercancía, vende,
> cuadra la caja y revisa tus números. Web y Android, con los mismos datos. Solicita tu
> licencia por WhatsApp y empieza hoy.

---

## 8. Lista de verificación de calidad (antes de publicar)

- [ ] Duración **< 3:00** y audio sin cortes ni frases montadas.
- [ ] Resolución 1280 × 720, sin bordes negros ni deformación.
- [ ] Subtítulos correctos (nombres propios, cifras y «CUP/USD» bien escritos).
- [ ] Ningún dato de cliente real, correo, teléfono ni clave de licencia visible.
- [ ] Ningún texto tapado por otro elemento en ningún fotograma.
- [ ] Última imagen con marca + llamada a la acción visible al menos 4 s.
- [ ] Reproducido en un teléfono real: se lee sin sonido y sin hacer zoom.
- [ ] Peso razonable para WhatsApp (< 25 MB) y `+faststart` activo.
- [ ] Música (si la hay) con licencia documentada.
- [ ] Enlace al manual y datos de contacto correctos en la descripción.

## 9. Métricas para saber si funcionó

| Métrica | Dónde se mide | Objetivo inicial |
|---|---|---|
| Reproducciones completas | YouTube / redes | ≥ 40 % de quienes empiezan |
| Solicitudes de licencia por WhatsApp | Panel **Gestionar → Solicitudes** | +20 % en el primer mes |
| Visitas a la app tras el video | Registro del servidor | Aumento sostenido |
| Consultas al soporte sobre «cómo empiezo» | Soporte | Reducción (el video responde antes) |

---

## 10. Archivos y trazabilidad

| Archivo | Contenido |
|---|---|
| `docs/assets/video/novagest-promo-720p.mp4` | Video final 720p con narración y subtítulos |
| `docs/assets/video/novagest-promo-720p.srt` | Subtítulos editables |
| `tools/build_promo_video.py` | Composición, sincronización, subtítulos y montaje |
| `docs/PROPUESTA_VIDEO_PROMOCIONAL.md` | Este documento: guion y plan |
| `docs/MANUAL_USUARIO.md` | Manual completo que respalda cada paso del video |

> [!NOTE]
> El video es material promocional del producto. El **uso de NovaGest en un negocio**
> requiere licencia del titular (ver `LICENSE` y `docs/LICENCIAS.md`); el video puede
> compartirse libremente para presentar el producto.
