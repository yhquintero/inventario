# Datos de zona horaria de reserva

`Havana.tzif` es `tzdata/zoneinfo/America/Havana` del paquete Python
[tzdata 2026.6](https://pypi.org/project/tzdata/2026.6/), basado en IANA tzdb
2026f. Se incluye únicamente como reserva cuando el servidor no encuentra
`America/Havana` en la base del sistema ni en el paquete Python `tzdata`. La
licencia del paquete acompaña a este archivo en `LICENSE` (Apache-2.0; copyright
2020 Paul Ganssle y 2026 Stan Ulbrych). Los datos IANA son de dominio público.

Las reglas horarias pueden cambiar. Al actualizar NovaGest, sustituir este
archivo por el correspondiente a una versión actual del paquete tzdata, actualizar
la versión indicada arriba y ejecutar `python3 tools/test_diviza.py`. La base del
sistema o el paquete instalado tienen prioridad sobre esta copia.
