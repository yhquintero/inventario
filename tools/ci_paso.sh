#!/usr/bin/env bash
# NovaGest · ejecuta un comando del CI y, si falla, publica el final de su salida
# como anotación de GitHub Actions (::error::), para poder leer la causa en el
# resumen del CI sin abrir (ni descargar) los registros completos.
#
#   bash tools/ci_paso.sh node tools/smoke_web.mjs
#   bash tools/ci_paso.sh python3 tools/test_licencia.py
#
# Fuera de GitHub Actions se comporta igual que el comando (misma salida y mismo
# código de salida); la anotación solo es una línea más en la consola.
set -o pipefail

if [ "$#" -eq 0 ]; then
  echo "Uso: bash tools/ci_paso.sh <comando> [argumentos...]" >&2
  exit 2
fi

registro="$(mktemp)"
"$@" 2>&1 | tee "$registro"
estado=${PIPESTATUS[0]}

if [ "$estado" -ne 0 ]; then
  # Una sola anotación de varias líneas (%0A = salto de línea en los comandos de
  # flujo de trabajo); % se escapa primero para no romper el mensaje.
  cola="$(tail -n 60 "$registro" | sed -e 's/%/%25/g' -e 's/\r//g' | awk 'BEGIN { ORS = "%0A" } { print }')"
  echo "::error::Falló «$*» (código $estado). Final de la salida:%0A${cola}"
fi

rm -f "$registro"
exit "$estado"
