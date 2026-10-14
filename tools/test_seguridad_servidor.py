#!/usr/bin/env python3
"""Pruebas de contraseñas, hashes y logging del servidor (sin red ni BD).
Uso: python3 tools/test_seguridad_servidor.py"""
import importlib.util, pathlib, sys
from contextlib import redirect_stdout
from http import HTTPStatus
from io import StringIO
spec = importlib.util.spec_from_file_location("ng", pathlib.Path(__file__).parent.parent / "server" / "novagest_server.py")
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)

fails = 0
def check(name, cond, extra=""):
    global fails
    print(("  ok  " if cond else "FAIL ") + name + extra)
    fails += 0 if cond else 1

check("acepta contraseña válida", m.pw_policy("ClaveSegura1") is None)
check("rechaza < 8 caracteres", m.pw_policy("Ab1") is not None)
check("rechaza sin número", m.pw_policy("ClaveSegura") is not None)
check("rechaza sin mayúscula", m.pw_policy("clavesegura1") is not None)
check("rechaza > 128 caracteres (ASVS V2)", m.pw_policy("ClaveSegura1" * 12) is not None)
h = m.hash_pw("ClaveSegura1")
check("hash verifica la correcta", m.check_pw("ClaveSegura1", h))
check("hash rechaza otra", not m.check_pw("OtraClave9", h))
check("hashes con sal distinta", m.hash_pw("ClaveSegura1") != h)


class LogContext:
    def log_date_time_string(self):
        return "14/Oct/2026 12:00:00"

    def ip(self):
        return "203.0.113.1"


log_output = StringIO()
with redirect_stdout(log_output):
    m.Api.log_message(LogContext(), "respuesta HTTP %s", HTTPStatus.NOT_FOUND)
check("log_message admite HTTPStatus sin lanzar TypeError", "404" in log_output.getvalue())

version_output = StringIO()
with redirect_stdout(version_output):
    m.Api.log_message(LogContext(), "GET %s", "/api/state/version")
check("log_message sigue omitiendo la ruta de versión", version_output.getvalue() == "")

print(f"\n{'OK' if not fails else 'FALLOS: ' + str(fails)} — seguridad del servidor")
sys.exit(1 if fails else 0)
