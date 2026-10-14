#!/usr/bin/env python3
"""
SOLO PARA PRUEBAS (tools/test_generador_ui.mjs): arranca el generador de licencias con
una llave de firma TEMPORAL de confianza en memoria (licencia_pruebas.Emisor).

El generador real no admite llaves de confianza por variables de entorno ni archivos de
datos (sería una puerta para fabricarse licencias); por eso las pruebas usan este
lanzador, que importa el generador y le instala la llave antes de arrancar. Admite los
mismos argumentos que tools/license_studio.py.
"""
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

from licencia_pruebas import Emisor  # noqa: E402

Emisor().instalar()
import license_studio  # noqa: E402

if __name__ == "__main__":
    license_studio.main()
