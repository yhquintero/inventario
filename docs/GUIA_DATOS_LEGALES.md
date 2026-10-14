# Guía para completar la información legal de NovaGest

> **Importante:** los cinco textos de Información legal son borradores. Esta guía ayuda a recopilar los datos, pero no es asesoría legal ni sustituye una revisión profesional para los países donde se ofrece o utiliza NovaGest.

## Dónde se completan

1. Inicia sesión con un usuario **Administrador** o **Jefe**.
2. Abre **Ajustes → Datos legales del negocio**.
3. Completa los campos con datos reales y pulsa **Guardar datos legales**.
4. Abre **Información legal** y revisa uno por uno: **Aviso legal, Política de privacidad, Términos y condiciones, Política de cookies y Política de reembolsos**.

Los valores guardados aparecen en las políticas y en el pie de página. El endpoint público `/api/legal` entrega esos valores para mostrarlos; por ello, **no introduzcas contraseñas, claves de licencia, documentos de identidad, datos bancarios ni información que no quieras publicar**. El domicilio, correo y teléfono deben ser los canales/datos que el titular ha decidido publicar.

Si todavía no sabes un dato, déjalo vacío. La página conservará una marca **[COMPLETAR]**: es preferible a inventar una condición o publicar algo incorrecto.

## Qué significa cada campo

| Campo | Qué preparar antes de escribirlo |
|---|---|
| **Razón social / titular** | Nombre legal exacto de la persona o entidad que ofrece la licencia de NovaGest. No pongas solo el nombre comercial si no es el titular registrado. |
| **Identificación fiscal / registro** | Identificador fiscal, licencia comercial o número registral que corresponda. Si no existe o no se publica en tu jurisdicción, confirma con un asesor cómo indicarlo. |
| **Domicilio legal** | Domicilio postal oficial del titular y la parte que puede hacerse pública. No publiques una dirección residencial sin confirmarlo. |
| **Contacto general** | Correo y teléfono realmente atendidos para soporte, pagos y reclamaciones; teléfono con código internacional. |
| **Contacto de privacidad** | Correo o canal que se revisará para solicitudes sobre datos personales. Puede ser el contacto general si alguien está asignado a responderlas. |
| **País y forma jurídica** | País de registro del titular y su forma jurídica exacta. No se debe deducir del país donde está quien edita la aplicación ni del país de sus clientes. |
| **Servidor: proveedor y país** | Indica si el servidor es administrado por el propio negocio o el nombre del proveedor y el país donde se aloja. Confirma la ubicación con quien administra el servidor. |
| **Plazos de conservación** | Plazos por grupo: cuentas de usuario, datos de clientes, operaciones/contabilidad, auditoría, registros técnicos y copias de seguridad. Valídalos con asesoría contable y legal; las obligaciones pueden ser distintas. |
| **Responsable y encargado de datos** | Aclara quién decide los fines del tratamiento y quién opera el sistema. Si cada negocio aloja su propio servidor, el negocio puede tener un papel distinto al proveedor de NovaGest; confirma la relación real antes de describirla. |
| **Bases del tratamiento** | Base aplicable para cada finalidad (cuentas, prestación de licencia, seguridad, registros del negocio, obligaciones contables, etc.). No uses una única base para todos los datos sin revisión profesional. |
| **Plazo para solicitudes de privacidad** | Canal y plazo legal para responder a solicitudes de acceso, rectificación, eliminación u otros derechos reconocidos. **No uses 30 días por defecto**: depende de la jurisdicción. |
| **Transferencia / cambio de dispositivo** | Si la licencia se puede transferir, cómo se reemplaza un dispositivo y qué límites incluye el plan. El sistema vincula activaciones a dispositivos; describe solo la política que de verdad ofrecerás. |
| **Pagos, moneda e impuestos** | Medios aceptados, moneda, comprobante/factura e impuestos aplicables. No publiques precios, impuestos o métodos que todavía no estén definidos. La aplicación actualmente no incluye una pasarela de pago interna. |
| **Disponibilidad, soporte y mantenimiento** | Canal y horario de soporte, ventanas de mantenimiento y cualquier nivel de disponibilidad que realmente puedas garantizar. Si no hay SLA, no prometas uno. |
| **Ley y vías de reclamación** | Ley aplicable, tribunal/autoridad o procedimiento de reclamación que corresponda. Requiere especial revisión si se vende a clientes de varios países. |
| **Limitaciones de responsabilidad** | Riesgos operativos reales (por ejemplo, verificar cálculos y mantener copias de seguridad) y límites permitidos por ley. Un abogado debe revisar esta cláusula; no debe excluir derechos irrenunciables. |
| **Condiciones de reembolso** | Casos en los que se acepta o deniega una devolución: clave no activable, error o duplicado de pago, cancelación, licencia ya activada/usada y excepciones que exija la ley. Decide la política real del negocio con asesoría. |
| **Plazo de reembolso** | Cuánto tarda la devolución después de aprobarse, desde qué evento se cuenta y por qué medio se devuelve el pago. No confundas plazo de respuesta con plazo de pago. |
| **Revisión de cookies/almacenamiento** | Resultado de revisar las reglas aplicables en los países de uso. El código actual no carga analítica ni publicidad; un asesor debe confirmar cómo informar y cuándo se exige consentimiento. |

## Datos del funcionamiento que ya se describen en los textos

Según la versión actual del código, NovaGest no integra analítica ni publicidad; usa almacenamiento para sesión, preferencias y acceso sin conexión. La solicitud de licencia se registra en el servidor y WhatsApp se abre solo si la persona elige esa opción. No hay pasarela de pago dentro de la aplicación. Vuelve a comprobar estos puntos si cambian la instalación, el servidor o las integraciones.

## Plantilla para preparar las respuestas

Copia y completa; puedes responder **«no definido»** donde necesites que quede pendiente. No incluyas contraseñas, claves ni documentos de identidad.

```text
País donde está registrado el titular:
Nombre legal del titular:
Forma jurídica:
Identificador fiscal/registro (o “no aplica”):
Domicilio que se puede publicar:
Correo y teléfono públicos:
Contacto para privacidad:
¿Quién administra/aloja el servidor? ¿Proveedor y país?
¿Cada negocio tiene su propia instalación/servidor o el proveedor aloja los datos de varios negocios?
Plazos de conservación por tipo de dato (si ya están aprobados):
Bases jurídicas revisadas (o “pendiente de asesor”):
Plazo legal para responder solicitudes de privacidad (o “pendiente de asesor”):
¿Se puede transferir la licencia o cambiar dispositivo? ¿Cómo?:
Medios de pago, moneda, comprobante e impuestos:
Canal/horario de soporte y política de mantenimiento:
Ley y vía de reclamación (o “pendiente de asesor”):
Política de reembolso aprobada:
Plazo para ejecutar un reembolso:
Límites de responsabilidad aprobados por asesor:
Revisión de cookies/almacenamiento por jurisdicción (o “pendiente de asesor”):
```

Cuando estén reunidos los datos, aún conviene que un profesional revise los cinco textos completos y las obligaciones de cada jurisdicción antes de publicarlos como definitivos.
