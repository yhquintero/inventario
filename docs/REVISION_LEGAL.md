# Revisión legal profesional — lista de cierre

Los textos de **Información legal** (`#legal`: Aviso legal, Privacidad, Términos,
Cookies, Reembolsos) son **borradores** generados desde lo que el código hace.
Ningún dato del negocio se ha inventado: lo no rellenado se ve como
`[COMPLETAR: …]`. Esto no puede cerrarlo el desarrollo: lo cierra el titular
con su asesor. Esta hoja deja el pendiente **ejecutable**, no resuelto.

## 1. Rellenar los datos (sin inventar)
En la Web, como Administrador/Jefe: **Ajustes → Datos legales del negocio**
(se guardan en el servidor vía `PUT /api/legal` y se muestran en `#legal` y en el pie):

- [ ] Razón social / titular · [ ] Identificación fiscal o nº de licencia
- [ ] Domicilio legal · [ ] Correo y teléfono de contacto
- [ ] Correo del responsable de privacidad · [ ] País y forma jurídica
- [ ] Plazos de conservación · [ ] Condiciones y plazo de reembolso
- [ ] Proveedor y país del alojamiento del servidor

Quedarán visibles como `[COMPLETAR: …]` solo: la base jurídica/plazo de respuesta
de derechos en su país y las cláusulas que su asesor dicte (están marcadas dentro
de cada texto a propósito).

## 2. Revisión por profesional (firma de cierre)
- [ ] Un abogado de su jurisdicción revisa los 5 textos (Cuba + RGPD/ePrivacy si
      trata datos de personas en la UE; consumo si vende fuera de Cuba).
- [ ] Confirma: forma jurídica, norma de Fichas de Costo/IPV de su actividad,
      conservación de documentos contables y vía de reclamación del consumidor.
- [ ] Se retiran los `[COMPLETAR: …]` restantes o se dejan solo donde el asesor
      indique que debe figurar literalmente así.

| Campo | Valor |
|---|---|
| Revisado por (nombre y nº de colegiado/licencia) | |
| Fecha de revisión | |
| Textos aprobados (Aviso/Privacidad/Términos/Cookies/Reembolsos) | |
| Observaciones | |
| Firma | |

## 3. Mientras tanto
- No publique la instalación como definitiva con `[COMPLETAR]` visibles en
  producción si su asesor no lo autoriza; el aviso «Borrador pendiente de
  revisión legal profesional» se mantiene en cada texto.
- En local/pruebas puede usarse tal cual para validar el funcionamiento.
