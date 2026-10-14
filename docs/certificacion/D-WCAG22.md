# D · WCAG 2.2 AA — Preparación para evaluación externa

> **Quién verifica**: un evaluador/accesibilidad acreditado emite el informe de
> conformidad (p. ej. VPAT/ACR). La herramienta automática cubre ~30% de criterios;
> el resto es **manual con lector de pantalla**. Controles hasta la fecha: no se afirma conformidad.

## Automatizado (en el repo, ejecutable)
`node tools/test_accesibilidad.mjs` — 7 comprobaciones: idioma y salto al contenido,
foco visible, movimiento reducido, `alt` en imágenes, contraste AA en tema claro
**y oscuro**, objetivos táctiles y zoom no bloqueado, y gráfica SVG con
**tabla de datos equivalente** (`role="img"` + resumen + `<details>` con la tabla).
En la app Android: contentDescription en navegación, objetivos 48dp y escalado
con la fuente del sistema [verificar en dispositivo]. Además: `node tools/test_axe.mjs`
(axe-core sobre portada y las 5 páginas legales; sin violaciones serious/critical)
y bloque `@media (forced-colors: active)` para el modo de colores forzados de Windows.

## Lista manual obligatoria antes de la evaluación (firmar y fechar)
- [ ] Recorrido completo solo con teclado (Tab/Shift+Tab/Enter/Esc): login, ficha, control IPV, ajustes.
- [ ] Lector de pantalla: NVDA (Windows) o VoiceOver/TalkBack (Android): anunciados los errores de formulario, los estados (Borrador/Aprobada) y los totales en vivo (`aria-live`).
- [ ] Zoom 200% y 400% sin pérdida de contenido ni scroll horizontal en 320px.
- [ ] Formularios: cada campo con `label` visible; errores por texto (no solo color).
- [ ] Contraste de gráficos esenciales (gráfica de barra de resultados) con alternativa en tabla.
- [ ] Android: TalkBack en fichas/controles; orden focal lógico; contraste en modo oscuro del sistema.

## Novedades WCAG 2.2 cubiertas por diseño
2.4.11 Foco no oscurecido (cabeceras no tapan el foco), 2.5.8 tamaño mínimo de objetivo,
3.3.7 entrada redundante (autocompletado del cliente en ventas), 3.3.8 autenticación
accesible (pegar contraseña permitido; 2FA con código numérico y opción por dispositivo).

## Huecos honestos
- [ ] Sesión manual firmada (plantilla en `00-INDICE-Y-FIRMAS.md` §2) · [ ] Evaluación externa con informe VPAT/ACR
- [x] Gráfica SVG con descripción textual y tabla de datos equivalente (aplicado en `lineChart`)
