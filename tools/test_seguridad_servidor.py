#!/usr/bin/env python3
"""Pruebas de la política de contraseñas y hashes del servidor (sin red ni BD).
Uso: python3 tools/test_seguridad_servidor.py"""
import importlib.util, pathlib, sys
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
print(f"\n{'OK' if not fails else 'FALLOS: ' + str(fails)} — seguridad del servidor")
sys.exit(1 if fails else 0)
