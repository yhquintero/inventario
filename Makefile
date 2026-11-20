PYTHON ?= python3
NODE ?= node
NPM ?= npm

.PHONY: help test test-web test-browser test-python test-backup test-android lint-python
help:
	@echo "NovaGest: make test | test-web | test-browser | test-python | test-backup | test-android | lint-python"

test: test-web test-python test-backup

test-web:
	$(NODE) tools/test_calc.mjs
	$(NODE) tools/test_merge.mjs
	$(NODE) tools/test_ticket.mjs
	$(NODE) tools/test_api_cookie.mjs
	$(NODE) tools/test_boot_diagnostics.mjs
	$(NODE) tools/test_sw_precache.mjs
	$(NODE) tools/cobertura.mjs --min 80

test-browser:
	$(NPM) --prefix tools run test:boot-e2e

# Requires `npm --prefix tools install` and `npx playwright install chromium`.
# El servidor y sus pruebas necesitan las dependencias de requirements.txt.
test-python:
	$(PYTHON) -m py_compile server/novagest_server.py server/financiero.py tools/generate_license.py
	$(PYTHON) tools/test_seguridad_servidor.py
	$(PYTHON) tools/test_salud_servidor.py
	$(PYTHON) tools/test_login_cookie.py

test-backup:
	$(PYTHON) tools/test_restauracion.py
	$(PYTHON) tools/test_financial_restore.py
	$(PYTHON) tools/test_copia_externa.py
	$(PYTHON) tools/test_copia_externa_servidor.py

lint-python:
	$(PYTHON) -m py_compile server/*.py tools/*.py

test-android:
	./gradlew testDebugUnitTest compileDebugAndroidTestKotlin :keygen:assembleDebug
