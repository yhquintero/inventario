#!/usr/bin/env bash
# A-16 · Pruebas de interfaz de la app Android en el emulador (CI).
#
# Se ejecuta desde .github/workflows/ci.yml dentro del emulador ya arrancado. Si algo
# falla, publica la causa como anotación (::error::) para que se lea en el resumen del
# CI sin abrir los registros.
set -uo pipefail

chmod +x gradlew
if ./gradlew connectedDebugAndroidTest --stacktrace > androidtest.log 2>&1; then
  echo "Pruebas de interfaz Android: correctas"
  grep -E "Tests on|tests completed" androidtest.log | tail -5 || true
  exit 0
fi

resumen="$({
  grep -E '^e: |error:|FAILED|AssertionError|Caused by|Tests on|No connected devices|INSTALL_FAILED' androidtest.log | head -40
  grep -A 30 'What went wrong' androidtest.log | grep -v '^\s*at ' | head -40
} | sed -e 's/%/%25/g' -e 's/\r//g' | awk 'BEGIN { ORS = "%0A" } { print }')"

echo "::error::Pruebas de interfaz Android fallaron:%0A${resumen}"
exit 1
