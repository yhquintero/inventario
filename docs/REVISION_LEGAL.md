# Revisión legal profesional — lista de cierre

Los textos de **Información legal** (`#legal`: Aviso legal, Privacidad, Términos,
Cookies y Reembolsos) son borradores generados a partir del funcionamiento actual
del código. No se ha inventado ningún dato del negocio: lo que no se haya
confirmado aparece como `[COMPLETAR: …]`. El titular y su asesor deben cerrar
estos pendientes; desarrollo no puede decidirlos por ellos.

## 1. Recopilar datos del titular

Como **Administrador** o **Jefe**, abre **Ajustes → Datos legales del negocio**.
El formulario explica campo por campo qué información preparar. Los valores se
guardan con `PUT /api/legal` y se muestran públicamente en `#legal` y en el pie.
Para obtener la lista detallada y una plantilla para responder, consulta
[`GUIA_DATOS_LEGALES.md`](GUIA_DATOS_LEGALES.md).

Antes de guardar, recuerda que el endpoint público `GET /api/legal` devuelve los
valores para mostrarlos a visitantes. No guardes contraseñas, claves, datos
bancarios ni documentos personales. Si un dato no está confirmado, déjalo vacío:
la marca `[COMPLETAR]` seguirá visible.

## 2. Confirmar los puntos dependientes del negocio y su jurisdicción

- [ ] Nombre legal, forma jurídica, identificación y domicilio que se pueden publicar.
- [ ] Contactos públicos para atención general y solicitudes sobre privacidad.
- [ ] Quién determina los usos de los datos y quién opera/alberga cada instalación.
- [ ] Ubicación real del servidor, proveedores y posibles transferencias internacionales.
- [ ] Plazos de conservación por tipo de registro y copias de seguridad.
- [ ] Bases jurídicas y plazos de respuesta a solicitudes de privacidad.
- [ ] Transferencia de licencias, cambio de dispositivos y límites de cada plan.
- [ ] Métodos de pago, moneda, comprobantes e impuestos realmente aplicables.
- [ ] Disponibilidad, horario/canal de soporte y mantenimiento que sí se puedan cumplir.
- [ ] Política de reembolso y plazo de ejecución, respetando derechos irrenunciables.
- [ ] Normas de cookies/almacenamiento y vías de reclamación aplicables en cada mercado.
- [ ] Límites de responsabilidad y cualquier condición de servicio, revisados por asesor.

## 3. Revisión y aprobación profesional

- [ ] Un abogado de la jurisdicción del titular revisa los cinco textos y el contrato/licencia.
- [ ] Si se ofrecen licencias o se tratan datos fuera del país de establecimiento,
      confirma las normas adicionales de privacidad, consumo, impuestos y comercio.
- [ ] Confirma las reglas aplicables a Fichas de Costo/IPV de la actividad del negocio.
- [ ] Cada `[COMPLETAR: …]` se sustituye por una decisión confirmada, o se mantiene
      pendiente si aún falta aprobación. No se deben usar ejemplos como datos reales.

| Registro de revisión | Valor |
|---|---|
| Profesional (nombre y nº de colegiado/licencia) | |
| Jurisdicciones revisadas | |
| Fecha de revisión | |
| Documentos aprobados (Aviso/Privacidad/Términos/Cookies/Reembolsos) | |
| Observaciones | |
| Firma | |

## 4. Mientras tanto

- No presentes la instalación como legalmente revisada ni definitiva mientras haya
  datos o cláusulas pendientes, salvo autorización expresa de tu asesor.
- El aviso «Borrador pendiente de revisión legal profesional» permanece visible en
  cada documento hasta que el titular decida publicar textos aprobados.
- En desarrollo/pruebas puedes validar el formulario y la sustitución de los campos.
