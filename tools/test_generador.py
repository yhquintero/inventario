#!/usr/bin/env python3
"""
Pruebas del generador de licencias independiente (tools/license_studio.py).

    python3 tools/test_generador.py

Comprueba, sin tocar la Web ni el servidor HTTP de NovaGest:
  · la herramienta arranca sola y responde en su propia interfaz (/ y /api/state),
  · genera claves con el mismo formato que verifica el servidor (HMAC-SHA256),
  · compone el mensaje de WhatsApp idéntico al de la Web y el enlace wa.me,
  · lista las solicitudes de la BD, crea su clave, la marca atendida y prepara el envío.
"""
import json
import os
import sys
import tempfile
import threading
import urllib.error
import urllib.request

os.environ["DATA_DIR"] = os.environ.get("DATA_DIR") or tempfile.mkdtemp(prefix="novagest-gen-")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.join(ROOT, "server"))

import novagest_server as srv  # noqa: E402  (necesita DATA_DIR antes de importar)
import license_studio as studio  # noqa: E402

srv.init_db()

ok = 0
fail = 0


def test(name, fn):
    global ok, fail
    try:
        fn()
        ok += 1
        print(f"  ✔ {name}")
    except Exception as e:  # noqa: BLE001
        fail += 1
        print(f"  ✖ {name}\n     {e}")


def _check(cond, extra=""):
    if not cond:
        raise AssertionError(extra or "comprobación fallida")


def _api(port, path, body=None):
    url = f"http://127.0.0.1:{port}{path}"
    req = None if body is None else urllib.request.Request(
        url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req or url, timeout=10) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:  # respuestas 4xx/5xx con cuerpo JSON
        return e.code, json.loads(e.read().decode() or "{}")


# --- servidor de la herramienta en un puerto libre -------------------------
httpd = studio.create_server("127.0.0.1", 0)
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()


def reset():
    srv.q("DELETE FROM license_requests")
    srv.q("DELETE FROM licenses WHERE created_by='license_studio.py'")


def t_interfaz_propia():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=10) as r:
        html = r.read().decode()
    _check(r.status == 200 and "Generador de Licencias" in html, "la página propia no responde")
    _check("aparte de la Web" in html, "falta el rótulo de herramienta independiente")
    code, st = _api(PORT, "/api/state")
    _check(code == 200 and st["ok"] and len(st["terms"]) == 8, "estado sin los 8 plazos")
    _check("secreto" in st["secretSource"].lower() or "LICENSE" in st["secretSource"] or "license.key" in st["secretSource"],
           f"origen del secreto inesperado: {st['secretSource']}")


def t_genera_y_verifica():
    code, d = _api(PORT, "/api/generate", {"client_name": "Tienda Nova", "term": "ANIO", "phone": "5351234567"})
    _check(code == 200 and d["ok"], f"no generó: {d}")
    payload = srv.verify_license_token(d["licenseKey"])
    _check(payload is not None, "el servidor NO reconoce la firma de la clave generada")
    _check(payload["client_name"] == "Tienda Nova" and payload["type"] == "FULL", "payload incorrecto")
    _check(payload["expires_at"] == payload["issued_at"] + 365 * 86400, "vencimiento no coincide con el plazo ANIO")
    _check(d["formattedKey"] == "NG-" + d["licenseKey"], "falta el prefijo NG-")
    _check(d["savedToDb"] is True, "no registró la clave en la BD")


def t_mensaje_whatsapp():
    code, d = _api(PORT, "/api/generate", {"client_name": "Mi Tienda", "term": "MES", "phone": "5351234567"})
    _check(code == 200 and d["ok"], "no generó")
    msg = d["message"]
    _check(msg.startswith("🔐 Tu Licencia de NovaGest ya está lista."), "encabezado del mensaje incorrecto")
    _check("👤 Usuario: Mi Tienda" in msg and "📅 Plan: 1 mes (30 días) · FULL" in msg, "cuerpo del mensaje incorrecto")
    _check("⏳ Vigencia: hasta el" in msg, "falta la vigencia")
    _check(msg.strip().endswith(d["licenseKey"]), "el mensaje no termina con la clave")
    _check("«Licencia de uso → Activar licencia»" in msg, "falta la instrucción de activación")
    _check(d["whatsappUrl"].startswith("https://wa.me/5351234567?text="), f"enlace wa.me incorrecto: {d['whatsappUrl'][:40]}")
    code, d2 = _api(PORT, "/api/generate", {"client_name": "Sin Tel", "term": "PERMANENTE"})
    _check("permanente" in d2["message"] and "LIFETIME" in d2["message"], "mensaje de permanente incorrecto")
    _check(d2["payload"]["expires_at"] == 0, "una permanente no debe expirar")
    _check(d2["whatsappUrl"].startswith("https://api.whatsapp.com/send?text="), "sin teléfono debe abrir el selector de contacto")


def t_solicitud_por_whatsapp():
    reset()
    row, dup = srv.register_license_request(
        {"client_name": "Cliente WA", "device_id": "web-abc123", "term": "TRIMESTRE", "phone": "+53 5 555 4444"},
        "127.0.0.1", "prueba")
    _check(not dup, "la solicitud no debía duplicarse")
    code, s = _api(PORT, "/api/requests")
    _check(code == 200 and len(s["requests"]) == 1 and s["requests"][0]["status"] == "pendiente", "la solicitud no aparece")
    code, d = _api(PORT, f"/api/requests/{row['id']}/generate", {})
    _check(code == 200 and d["ok"], f"no generó desde la solicitud: {d}")
    _check(d["request"]["id"] == row["id"] and d["payload"]["client_name"] == "Cliente WA", "no usó el nombre de la solicitud")
    _check("📅 Plan: 3 meses (90 días) · FULL" in d["message"], "no usó el plazo de la solicitud")
    _check(d["whatsappUrl"].startswith("https://wa.me/5355554444?text="), f"no respondió al teléfono de la solicitud: {d['whatsappUrl'][:40]}")
    _check(srv.verify_license_token(d["licenseKey"]) is not None, "firma inválida en la clave de la solicitud")
    r = srv.q("SELECT * FROM license_requests WHERE id=?", (row["id"],), one=True)
    _check(r["status"] == "atendida" and r["handled_by"] == "license_studio.py", "la solicitud no quedó atendida")
    _check((r["license_preview"] or "").startswith("NG-"), "falta la vista previa de la clave")
    code, d2 = _api(PORT, f"/api/requests/{row['id']}/generate", {})
    _check(code == 400, "no debe regenerar una solicitud ya atendida")


print("\n=== tools/test_generador.py — generador independiente ===")
test("la herramienta responde con su propia interfaz", t_interfaz_propia)
test("genera claves que el servidor verifica (misma firma)", t_genera_y_verifica)
test("mensaje de WhatsApp y enlace wa.me listos para enviar", t_mensaje_whatsapp)
test("atender una solicitud recibida y enviarla por WhatsApp", t_solicitud_por_whatsapp)
httpd.shutdown()

print(f"\nResultado: {ok} correcta(s), {fail} fallida(s)\n")
sys.exit(1 if fail else 0)
