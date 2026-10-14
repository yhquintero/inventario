#!/usr/bin/env python3
"""
Pruebas del generador de licencias independiente (tools/license_studio.py).

    python3 tools/test_generador.py

Comprueba, sin tocar la Web ni el servidor HTTP de NovaGest:
  · la herramienta arranca sola y responde en su propia interfaz (/ y /api/session),
  · la CLAVE DE ACCESO protege todo: sin sesión no se ve ni se genera nada,
  · sirve por HTTPS cuando se le pasan certificado y llave (cookie Secure),
  · genera claves v2 que verifica el servidor (firma ECDSA del emisor, ligadas a UN
    dispositivo, 4 usuarios · 1 dispositivo) y exige la llave privada del emisor,
  · compone el mensaje de WhatsApp idéntico al de la Web y el enlace wa.me,
  · lista las solicitudes de la BD, crea su clave, la marca atendida y prepara el envío,
  · importa la solicitud que el cliente envió por WhatsApp («📥 Copiar desde el WhatsApp»):
    lee su mensaje, la añade a la lista, crea la clave con esos datos y la deja lista para reenviar,
  · controla las licencias emitidas: listar, activar, renovar, revocar, reactivar,
    quitar equipos, exportar a CSV y eliminar.
"""
import http.cookiejar
import json
import os
import ssl
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request

os.environ["DATA_DIR"] = os.environ.get("DATA_DIR") or tempfile.mkdtemp(prefix="novagest-gen-")
os.environ["NOVAGEST_NET_TIME"] = "0"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
sys.path.insert(0, os.path.join(ROOT, "server"))

import novagest_server as srv  # noqa: E402  (necesita DATA_DIR antes de importar)
import license_studio as studio  # noqa: E402
import novagest_license as L  # noqa: E402
from licencia_pruebas import Dispositivo, Emisor  # noqa: E402

srv.init_db()
EMISOR = Emisor().instalar()          # llave de firma de pruebas (de confianza solo en memoria)
PC = Dispositivo("web")
MOVIL = Dispositivo("android")
# IDs fijos (formato v2 válido) para los mensajes de WhatsApp de ejemplo
ID_NOVA, ID_SOL, ID_PERM = "WEB-HHSP-QRQL-MV5Z-HYGS-ABCD", "WEB-SOLA-BCDE-FGHI-JKLM-NOPQ", "AND-PERM-ANEN-TEAB-CDEF-GHIJ"

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


class Cliente:
    """Cliente HTTP con cookies, como el navegador del administrador."""

    def __init__(self, port, https=False):
        self.base = f"{'https' if https else 'http'}://127.0.0.1:{port}"
        handler = urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
        if https:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            self.opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx), handler)
        else:
            self.opener = urllib.request.build_opener(handler)

    def __call__(self, path, body=None, method=None):
        url = self.base + path
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, method=method or ("POST" if data is not None else "GET"),
                                     headers={"Content-Type": "application/json"} if data else {})
        try:
            with self.opener.open(req, timeout=10) as r:
                crudo = r.read().decode("utf-8", "replace")
                try:  # las respuestas CSV no son JSON
                    datos = json.loads(crudo or "{}")
                except Exception:
                    datos = {"raw": crudo[:400]}
                return r.status, datos, dict(r.headers)
        except urllib.error.HTTPError as e:  # respuestas 4xx/5xx con cuerpo JSON
            crudo = e.read().decode() or "{}"
            try:
                return e.code, json.loads(crudo), dict(e.headers)
            except Exception:
                return e.code, {"raw": crudo}, dict(e.headers)


# --- servidor de la herramienta en un puerto libre -------------------------
ACCESS_KEY_FILE = os.path.join(os.environ["DATA_DIR"], "licencia-acceso.txt")
httpd = studio.create_server("127.0.0.1", 0)
PORT = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()

api = Cliente(PORT)


def login(port=PORT):
    """Entra con la clave de acceso real de la herramienta (data/licencia-acceso.txt)."""
    c = Cliente(port)
    code, d, _ = c("/api/login", {"key": studio.ACCESS_KEY})
    _check(code == 200 and d.get("ok"), f"no pudo entrar con la clave de acceso: {d}")
    return c


def reset():
    srv.q("DELETE FROM license_requests")
    srv.q("DELETE FROM license_activations")
    srv.q("DELETE FROM licenses WHERE created_by='license_studio.py'")


def t_clave_de_acceso():
    code, d, headers = api("/api/session")
    _check(code == 200 and d["authenticated"] is False, "sin sesión debe decir que no está autenticado")
    _check(headers.get("X-Content-Type-Options") == "nosniff" and headers.get("X-Frame-Options") == "DENY",
           "faltan cabeceras básicas de protección HTTP")
    _check("accessKeySource" not in d, "el endpoint público no debe revelar la ruta de la clave")
    srv.q("INSERT OR REPLACE INTO legal_info(id,data,updated_at,updated_by) VALUES(1,?,?,?)",
          (json.dumps({"razonSocial": "NovaGest Prueba"}), int(time.time()), "prueba"))
    code, legal, _ = api("/api/legal")
    _check(code == 200 and legal.get("ok") and legal.get("legal", {}).get("razonSocial") == "NovaGest Prueba",
           "la información legal pública debe cargarse de la BD sin sesión")
    srv.q("DELETE FROM legal_info WHERE id=1")
    _check(os.path.exists(ACCESS_KEY_FILE), "no se creó data/licencia-acceso.txt")
    _check(studio.ACCESS_KEY and len(studio.ACCESS_KEY) >= 10, "la clave de acceso generada es muy corta")
    code, d, _ = api("/api/state")
    _check(code == 401 and d.get("authRequired"), "el estado debe exigir la clave de acceso")
    code, d, _ = api("/api/licenses")
    _check(code == 401, "el control de licencias debe exigir la clave de acceso")
    code, d, _ = api("/api/login", {"key": "clave-que-no-es"})
    _check(code == 401 and not d.get("ok"), "una clave incorrecta no debe dejar entrar")
    code, d, hdr = api("/api/login", {"key": studio.ACCESS_KEY})
    _check(code == 200 and "ngstudio=" in (hdr.get("Set-Cookie") or ""), "el acceso correcto no dio cookie de sesión")
    code, d, _ = api("/api/state")
    _check(code == 200 and d["ok"] and len(d["terms"]) == 8, "estado sin los 8 plazos tras entrar")
    _check(d["https"] is False, "por HTTP la herramienta lo debe indicar")
    _check(bool(d.get("accessKeySource")), "la fuente de la clave solo debe mostrarse después de autenticar")


def t_interfaz_propia():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=10) as r:
        html = r.read().decode()
    _check(r.status == 200 and "Generador de Licencias" in html, "la página propia no responde")
    _check("NovaGest · Área privada" in html and "herramienta segura" in html, "falta la identidad privada de NovaGest")
    _check("Acceso del administrador" in html, "falta la pantalla de clave de acceso")
    _check('<section id="login" aria-labelledby="login-title">' in html, "la pantalla de clave debe estar visible al entrar")
    _check('<main id="app" hidden>' in html and "[hidden] { display: none !important; }" in html, "el panel debe permanecer oculto hasta autenticar (main tiene display:grid)")
    _check('id="status" role="status" aria-live="polite"></div>' in html, "el panel no debe mostrar Cargando… antes del acceso")
    _check("Cargando…</div>" not in html, "no debe aparecer Cargando… en la pantalla inicial")
    _check('href="/favicon.svg"' in html, "falta el favicon de llave/seguridad")
    for policy in ("Aviso legal", "Política de privacidad", "Términos y condiciones", "Política de cookies", "Política de reembolsos"):
        _check(policy in html, f"falta el enlace de {policy}")
    _check("api/legal" in html, "los textos legales deben poder leer los datos públicos de NovaGest")
    _check("Licencias y equipos" in html, "falta la pestaña de control de licencias")
    _check('id="btn-import"' in html and "📥 Copiar desde el WhatsApp" in html, "falta el botón de importar desde WhatsApp")
    _check('id="import-dialog"' in html and 'id="import-text"' in html, "falta el diálogo para pegar el mensaje de WhatsApp")
    _check('id="import-term"' in html and 'id="import-name"' in html and 'id="import-phone"' in html,
           "el diálogo debe permitir revisar usuario, plazo y teléfono antes de importar")
    _check("api/requests/import" in html and "api/requests/parse" in html, "faltan las llamadas de importación")
    _check("acceso-datos" in html, "falta el panel de acceso y datos")
    _check('id="device"' in html and 'id="users"' not in html and 'id="devices"' not in html,
           "el formulario debe pedir el ID del dispositivo (y ya no máximos de usuarios/dispositivos)")
    _check('id="btn-firma"' in html and "api/signing-key/init" in html, "falta el botón para crear la llave de firma")
    _check("api/licenses" in html and "licenses.csv" in html, "faltan las llamadas de control (listar/exportar)")
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/favicon.svg", timeout=10) as r:
        _check(r.status == 200 and "image/svg+xml" in (r.headers.get("Content-Type") or ""), "el favicon no responde como SVG")
        _check("<svg" in r.read().decode(), "el icono SVG está vacío")


def t_https_protegido():
    """Con certificado y llave, el generador sirve por HTTPS y la cookie es Secure."""
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.x509.oid import NameOID
    except Exception:
        print("     (omitida: falta la librería cryptography para crear el certificado de prueba)")
        return
    carpeta = tempfile.mkdtemp(prefix="novagest-gen-cert-")
    cert_ruta, key_ruta = os.path.join(carpeta, "prueba.crt"), os.path.join(carpeta, "prueba.key")
    clave = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    nombre = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "localhost")])
    import datetime
    cer = (x509.CertificateBuilder()
           .subject_name(nombre).issuer_name(nombre).public_key(clave.public_key())
           .serial_number(x509.random_serial_number())
           .not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1))
           .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=2))
           .add_extension(x509.SubjectAlternativeName([
               x509.DNSName("localhost"), x509.IPAddress(__import__("ipaddress").ip_address("127.0.0.1"))]), False)
           .sign(clave, hashes.SHA256()))
    with open(cert_ruta, "wb") as f:
        f.write(cer.public_bytes(serialization.Encoding.PEM))
    with open(key_ruta, "wb") as f:
        f.write(clave.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL,
                                    serialization.NoEncryption()))
    seguro = studio.create_server("127.0.0.1", 0, cert_ruta, key_ruta)
    puerto = seguro.server_address[1]
    threading.Thread(target=seguro.serve_forever, daemon=True).start()
    try:
        c = Cliente(puerto, https=True)
        code, d, _ = c("/api/session")
        _check(code == 200 and d["https"] is True, "no detecta que sirve por HTTPS")
        code, d, hdr = c("/api/login", {"key": studio.ACCESS_KEY})
        _check(code == 200 and "Secure" in (hdr.get("Set-Cookie") or ""), "la cookie de sesión no es Secure en HTTPS")
        code, d, _ = c("/api/state")
        _check(code == 200 and d["https"] is True, "el estado no informa HTTPS tras entrar")
    finally:
        seguro.shutdown()


def t_genera_y_verifica():
    code, d, _ = api("/api/generate", {"client_name": "Tienda Nova", "term": "ANIO", "phone": "5351234567", "device_id": PC.id})
    _check(code == 200 and d["ok"], f"no generó: {d}")
    payload = L.parse_license(d["licenseKey"])
    _check(payload["client_name"] == "Tienda Nova" and payload["type"] == "FULL", "payload incorrecto")
    _check(payload["device_id"] == PC.id and payload["platform"] == "web", "la clave no quedó ligada al dispositivo")
    _check(payload["max_users"] == 4 and payload["max_devices"] == 1 and payload["roles"] == list(L.ROLES), "límites incorrectos")
    _check(payload["expires_at"] == payload["issued_at"] + 365 * 86400, "vencimiento no coincide con el plazo ANIO")
    _check(d["licenseKey"].startswith("NG2-") and d["formattedKey"] == d["licenseKey"], "formato de clave inesperado")
    _check(d["savedToDb"] is True, "no registró la clave en la BD")
    row = srv.q("SELECT device_id, platform FROM licenses WHERE key=?", (d["licenseKey"],), one=True)
    _check(row["device_id"] == PC.id and row["platform"] == "web", "la BD no guarda el dispositivo de la licencia")
    # Sin ID de dispositivo (o con uno del formato anterior) no se emite
    for malo in ("", "web-hhsp9rqlmv5zhygs"):
        code, e, _ = api("/api/generate", {"client_name": "Tienda Nova", "term": "MES", "device_id": malo})
        _check(code == 400 and e.get("code") == "DEVICE_ID", f"se emitió sin un dispositivo válido ({malo!r}): {e}")
    # Sin la llave privada del emisor tampoco
    ruta = os.environ["NOVAGEST_SIGNING_KEY"]
    os.environ["NOVAGEST_SIGNING_KEY"] = os.path.join(tempfile.mkdtemp(), "no-existe.pem")
    try:
        code, e, _ = api("/api/generate", {"client_name": "Tienda Nova", "term": "MES", "device_id": PC.id})
        _check(code == 400 and e.get("code") == "SIGNING_KEY_MISSING", f"se emitió sin la llave del emisor: {e}")
        code, st, _ = api("/api/state")
        _check(st["signing"]["ok"] is False and "FALTA" in st["secretSource"], "el estado debe avisar de que falta la llave")
    finally:
        os.environ["NOVAGEST_SIGNING_KEY"] = ruta
    code, st, _ = api("/api/state")
    _check(st["signing"]["ok"] is True and st["signing"]["kid"] == EMISOR.kid, f"estado de la firma: {st['signing']}")


def t_mensaje_whatsapp():
    code, d, _ = api("/api/generate", {"client_name": "Mi Tienda", "term": "MES", "phone": "5351234567", "device_id": PC.id})
    _check(code == 200 and d["ok"], "no generó")
    msg = d["message"]
    _check(msg.startswith("🔐 Tu Licencia de NovaGest ya está lista."), "encabezado del mensaje incorrecto")
    _check("👤 Usuario: Mi Tienda" in msg and "📅 Plan: 1 mes (30 días) · FULL" in msg, "cuerpo del mensaje incorrecto")
    _check("⏳ Vigencia: hasta el" in msg, "falta la vigencia")
    _check(f"🆔 Dispositivo: {PC.id}" in msg and "👥 4 usuarios (uno por rol) · 1 dispositivo" in msg, "falta el dispositivo/límites")
    _check(msg.strip().endswith(d["licenseKey"]), "el mensaje no termina con la clave")
    _check("«Licencia de uso → Activar licencia»" in msg, "falta la instrucción de activación")
    _check(d["whatsappUrl"].startswith("https://wa.me/5351234567?text="), f"enlace wa.me incorrecto: {d['whatsappUrl'][:40]}")
    code, d2, _ = api("/api/generate", {"client_name": "Sin Tel", "term": "PERMANENTE", "device_id": MOVIL.id})
    _check("permanente" in d2["message"] and "LIFETIME" in d2["message"], "mensaje de permanente incorrecto")
    _check(d2["payload"]["expires_at"] == 0, "una permanente no debe expirar")
    _check(d2["whatsappUrl"].startswith("https://api.whatsapp.com/send?text="), "sin teléfono debe abrir el selector de contacto")


def t_solicitud_por_whatsapp():
    reset()
    row, dup = srv.register_license_request(
        {"client_name": "Cliente WA", "device_id": MOVIL.id, "term": "TRIMESTRE", "phone": "+53 5 555 4444"},
        "127.0.0.1", "prueba")
    _check(not dup, "la solicitud no debía duplicarse")
    code, s, _ = api("/api/requests")
    _check(code == 200 and len(s["requests"]) == 1 and s["requests"][0]["status"] == "pendiente", "la solicitud no aparece")
    code, d, _ = api(f"/api/requests/{row['id']}/generate", {})
    _check(code == 200 and d["ok"], f"no generó desde la solicitud: {d}")
    _check(d["request"]["id"] == row["id"] and d["payload"]["client_name"] == "Cliente WA", "no usó el nombre de la solicitud")
    _check("📅 Plan: 3 meses (90 días) · FULL" in d["message"], "no usó el plazo de la solicitud")
    _check(d["whatsappUrl"].startswith("https://wa.me/5355554444?text="), f"no respondió al teléfono de la solicitud: {d['whatsappUrl'][:40]}")
    _check(L.parse_license(d["licenseKey"])["device_id"] == MOVIL.id, "la clave no es para el dispositivo de la solicitud")
    r = srv.q("SELECT * FROM license_requests WHERE id=?", (row["id"],), one=True)
    _check(r["status"] == "atendida" and r["handled_by"] == "license_studio.py", "la solicitud no quedó atendida")
    _check((r["license_preview"] or "").startswith("NG2-"), "falta la vista previa de la clave")
    code, d2, _ = api(f"/api/requests/{row['id']}/generate", {})
    _check(code == 400, "no debe regenerar una solicitud ya atendida")


def t_solicitud_estado_y_borrado():
    reset()
    row, _ = srv.register_license_request({"client_name": "Estado", "device_id": PC.id, "term": "MES"}, "127.0.0.1", "t")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "descartada"})
    _check(code == 200 and d["ok"], "no pudo descartar la solicitud")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "pendiente"})
    _check(code == 200 and d["ok"], "no pudo volver a pendiente")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "inventado"})
    _check(code == 400, "un estado no válido debe rechazarse")
    code, d, _ = api(f"/api/requests/{row['id']}", method="DELETE")
    _check(code == 200 and d["ok"], "no pudo eliminar la solicitud")
    _check(srv.q("SELECT COUNT(*) AS c FROM license_requests", one=True)["c"] == 0, "la solicitud sigue en la BD")


MENSAJES_WHATSAPP = {
    "Tienda Nova": "\n".join([
        "Hola, solicito activar mi Licencia de NovaGest.",
        "",
        "👤 Usuario: Tienda Nova",
        f"🆔 ID Dispositivo: {ID_NOVA}",
        "📦 Producto: NovaGest v1.0.0",
        "📅 Plan: 1 día (1 días) · FULL",
        "🕒 Fecha Actual: 14/10/2026, 2:53:22 p.m.",
    ]),
    "Bodega El Sol": "\n".join([
        "Hola, solicito activar mi Licencia de NovaGest.",
        "",
        "Usuario: Bodega El Sol",                      # sin emojis ni negritas
        f"ID Dispositivo: {ID_SOL.lower()}",          # en minúsculas: se normaliza
        "Producto: NovaGest v1.0.0",
        "Plan: 3 meses (90 días) · FULL",
        "Fecha Actual: 13/10/2026, 9:05:00 a. m.",
    ]),
    "Mi Negocio": "\n".join([
        "*Hola, solicito activar mi Licencia de NovaGest.*",
        "",
        "*Usuario:* Mi Negocio",                       # marcado de WhatsApp
        f"*ID Dispositivo:* {ID_PERM}",
        "*📦 Producto:* NovaGest v1.0.0",
        "*📅 Plan:* Permanente · LIFETIME",
        "*🕒 Fecha Actual:* 12/10/2026, 11:00:00 a.m.",
        "Teléfono: +53 5 555 4444",
    ]),
}


def t_lee_mensajes_de_whatsapp():
    """El mensaje que llega al chat se entiende sin depender de emojis ni del orden."""
    p = studio.parse_whatsapp_request(MENSAJES_WHATSAPP["Tienda Nova"])
    _check(p["clientName"] == "Tienda Nova", f"usuario leído: {p['clientName']!r}")
    _check(p["deviceId"] == ID_NOVA, f"ID de dispositivo leído: {p['deviceId']!r}")
    _check(p["term"] == "DIA" and p["days"] == 1 and p["type"] == "FULL", f"plazo leído: {p['term']} {p['type']}")
    _check(p["product"] == "NovaGest" and p["version"] == "1.0.0", f"producto/versión: {p['product']!r} {p['version']!r}")
    _check(p["warnings"] == [], f"no debía avisar de nada: {p['warnings']}")
    _check(p["createdAt"] > 0, "no leyó la fecha del mensaje")

    p2 = studio.parse_whatsapp_request(MENSAJES_WHATSAPP["Bodega El Sol"])
    _check(p2["clientName"] == "Bodega El Sol" and p2["term"] == "TRIMESTRE" and p2["days"] == 90,
           f"variante sin emojis mal leída: {p2}")
    _check(p2["deviceId"] == ID_SOL, f"el ID en minúsculas no se normalizó: {p2['deviceId']!r}")
    _check(studio.term_of(p2["term"])["label"] == "3 meses", "el plazo leído no es el del catálogo")

    p3 = studio.parse_whatsapp_request(MENSAJES_WHATSAPP["Mi Negocio"])
    _check(p3["term"] == "PERMANENTE" and p3["type"] == "LIFETIME" and p3["days"] == 0,
           f"permanente mal leída: {p3['term']} {p3['type']}")
    _check(p3["phone"].startswith("+5355554444"), f"teléfono del mensaje no leído: {p3['phone']!r}")

    incompleto = studio.parse_whatsapp_request("Hola, quiero una licencia por favor")
    _check(incompleto["clientName"] == "" and incompleto["term"] == "MES", "lo que no se reconoce debe quedar por defecto")
    _check(len(incompleto["warnings"]) >= 2, "debe avisar de lo que no reconoció")
    raro = studio.parse_whatsapp_request("Usuario: Otro\nID Dispositivo: web-1\nPlan: 45 días")
    _check(raro["term"] == "MES" and any("no es uno de los 8" in w for w in raro["warnings"]),
           f"un plazo no estándar debe avisarse: {raro['warnings']}")
    _check(any("formato anterior" in w for w in raro["warnings"]), f"un ID antiguo debe avisarse: {raro['warnings']}")


def t_importar_desde_whatsapp():
    """«📥 Copiar desde el WhatsApp»: pegar el mensaje, importarlo, crear la clave y reenviarla."""
    reset()
    code, d, _ = api("/api/requests/parse", {"message": MENSAJES_WHATSAPP["Tienda Nova"]})
    _check(code == 200 and d["ok"] and d["parsed"]["clientName"] == "Tienda Nova", f"no leyó el mensaje: {d}")
    _check(d["parsed"]["deviceId"] == ID_NOVA, "el diálogo no recibe el ID del dispositivo")

    code, d, _ = api("/api/requests/import", {"message": MENSAJES_WHATSAPP["Tienda Nova"], "phone": "5351234567"})
    _check(code == 200 and d["ok"] and d["savedToDb"] is True, f"no importó la solicitud: {d}")
    req = d["request"]
    _check(req["clientName"] == "Tienda Nova" and req["channel"] == "whatsapp", f"solicitud importada inesperada: {req}")
    _check(req["term"] == "DIA" and req["days"] == 1 and req["type"] == "FULL", "no conservó el plazo del mensaje")
    _check(req["status"] == "pendiente" and req["phone"] == "5351234567", "la solicitud no quedó pendiente con su teléfono")
    code, s, _ = api("/api/requests")
    _check(code == 200 and any(r["id"] == req["id"] for r in s["requests"]), "la solicitud importada no aparece en la lista")

    code, dup, _ = api("/api/requests/import", {"message": MENSAJES_WHATSAPP["Tienda Nova"], "phone": "5351234567"})
    _check(code == 200 and dup.get("duplicada") is True and dup["request"]["id"] == req["id"],
           "pegar dos veces el mismo mensaje no debe duplicar la solicitud")

    code, g, _ = api(f"/api/requests/{req['id']}/generate", {})
    _check(code == 200 and g["ok"], f"no creó la clave de la solicitud importada: {g}")
    _check(g["payload"]["client_name"] == "Tienda Nova" and g["payload"]["type"] == "FULL", "no usó los datos del mensaje")
    _check(g["term"]["id"] == "DIA" and "📅 Plan: 1 día (1 días) · FULL" in g["message"], "no usó el plazo pedido")
    _check(L.parse_license(g["licenseKey"])["device_id"] == ID_NOVA, "la clave de la solicitud importada no es para su dispositivo")
    _check(g["whatsappUrl"].startswith("https://wa.me/5351234567?text="), "no prepara el reenvío al teléfono del cliente")
    _check(g["request"]["status"] == "atendida", "la solicitud importada no quedó atendida")
    r = srv.q("SELECT * FROM license_requests WHERE id=?", (req["id"],), one=True)
    _check(r["status"] == "atendida" and r["handled_by"] == "license_studio.py", "la solicitud no quedó atendida en la BD")

    code, d, _ = api("/api/requests/import", {"message": f"Hola, quiero una licencia\nID Dispositivo: {ID_SOL}", "client_name": "Sin Nombre"})
    _check(code == 200 and d["ok"] and d["request"]["clientName"] == "Sin Nombre",
           "el nombre escrito a mano debe mandar sobre lo leído del mensaje")
    _check(d["warnings"], "debe devolver los avisos de lo que no reconoció")
    code, d, _ = api("/api/requests/import", {"message": "Hola, quiero una licencia", "client_name": "Sin Dispositivo"})
    _check(code == 400 and "ID de dispositivo" in d["error"], f"sin ID de dispositivo no debe importarse: {d}")
    code, d, _ = api("/api/requests/import", {"message": "Usuario: Viejo\nID Dispositivo: web-hhsp9rqlmv5zhygs"})
    _check(code == 400 and "ID de dispositivo" in d["error"], f"un ID del formato anterior no debe importarse: {d}")
    code, d, _ = api("/api/requests/import", {"message": "Hola, quiero una licencia"})
    _check(code == 400 and not d["ok"], "sin usuario reconocido ni escrito debe rechazarse")
    code, d, _ = api("/api/requests/import", {"message": "   "})
    _check(code == 400, "un mensaje vacío debe rechazarse")
    code, d, _ = api("/api/requests/parse", {})
    _check(code == 400, "sin mensaje no hay nada que leer")


def t_importar_sin_bd():
    """Sin la base de datos del servidor la solicitud importada vive en la sesión y su clave se crea igual."""
    reset()
    original = studio.db_available
    studio.db_available = lambda: False
    try:
        code, s, _ = api("/api/requests")
        _check(code == 200 and s["dbAvailable"] is False and s["requests"] == [], "sin BD no debe inventar solicitudes")
        code, d, _ = api("/api/requests/import", {"message": MENSAJES_WHATSAPP["Bodega El Sol"]})
        _check(code == 200 and d["ok"] and d["savedToDb"] is False, f"sin BD la importación no quedó en memoria: {d}")
        req = d["request"]
        _check(req["mem"] is True and req["clientName"] == "Bodega El Sol", f"solicitud en memoria inesperada: {req}")
        code, s, _ = api("/api/requests")
        _check(len(s["requests"]) == 1 and s["requests"][0]["id"] == req["id"], "la solicitud en memoria no aparece en la lista")
        code, dup, _ = api("/api/requests/import", {"message": MENSAJES_WHATSAPP["Bodega El Sol"]})
        _check(dup.get("duplicada") is True and dup["request"]["id"] == req["id"],
               "sin BD tampoco debe duplicarse el mismo mensaje pegado dos veces")
        _check(len(api("/api/requests")[1]["requests"]) == 1, "la solicitud duplicada no debe añadirse a la lista")

        code, g, _ = api(f"/api/requests/{req['id']}/generate", {})
        _check(code == 200 and g["ok"] and g["savedToDb"] is False, f"no creó la clave sin BD: {g}")
        _check(L.parse_license(g["licenseKey"])["device_id"] == ID_SOL, "la clave creada sin BD no verifica en el servidor")
        _check(g["term"]["id"] == "TRIMESTRE" and g["request"]["status"] == "atendida", "no usó el plazo del mensaje o no la cerró")

        code, d, _ = api(f"/api/requests/{req['id']}/estado", {"status": "pendiente"})
        _check(code == 200 and d["ok"], "no pudo reabrir la solicitud en memoria")
        code, d, _ = api(f"/api/requests/{req['id']}", method="DELETE")
        _check(code == 200 and d["ok"], "no pudo eliminar la solicitud en memoria")
        _check(api("/api/requests")[1]["requests"] == [], "la solicitud en memoria sigue en la lista")
        code, d, _ = api("/api/requests/999999/estado", {"status": "pendiente"})
        _check(code == 404, "una solicitud inexistente debe dar 404")
    finally:
        studio.db_available = original
        studio.request_delete(studio._MEM_ID_BASE + 1)


def _esquema(con, tabla):
    return [(r[1], (r[2] or "").upper(), r[4], r[5]) for r in con.execute(f"PRAGMA table_info({tabla})")]


def _con_datos_en(carpeta):
    """Apunta temporalmente el generador a otra carpeta data (y la deja como estaba)."""
    class _Ctx:
        def __enter__(self):
            self.prev = studio.gen.DATA
            studio.gen.DATA = carpeta
            with studio._LOCK:
                studio._DB_READY_CACHE.clear()
            return self

        def __exit__(self, *exc):
            studio.gen.DATA = self.prev
            with studio._LOCK:
                studio._DB_READY_CACHE.clear()
            return False
    return _Ctx()


def t_crea_la_bd_si_falta():
    """Sin base de datos (el servidor nunca arrancó) la herramienta la crea: ya no queda «sin BD»."""
    import sqlite3
    carpeta = tempfile.mkdtemp(prefix="novagest-sin-bd-")
    with _con_datos_en(carpeta):
        ruta = studio.gen.db_path()
        _check(not os.path.exists(ruta) and not studio.db_available(), "la carpeta de prueba debía empezar sin BD")
        code, s, _ = api("/api/state")
        _check(code == 200 and s["dbAvailable"] is True and s["dbCreated"] is True, f"/api/state no creó la BD: {s}")
        _check(s["dbPath"] == ruta and os.path.exists(ruta), "la BD no quedó en la carpeta data indicada")
        con = sqlite3.connect(ruta)
        try:
            tablas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            _check({"licenses", "license_requests", "license_activations", "audit", "legal_info"} <= tablas,
                   f"faltan tablas de licencias: {tablas}")
            # Mismo esquema que el servidor (si el servidor cambia sus tablas, esta prueba avisa).
            for tabla in ("licenses", "license_requests", "license_activations", "audit", "legal_info"):
                _check(_esquema(con, tabla) == _esquema(srv.CON, tabla),
                       f"la tabla {tabla} del generador no coincide con la del servidor")
        finally:
            con.close()
        # Con la BD creada se registran las licencias emitidas y las solicitudes importadas.
        code, g, _ = api("/api/generate", {"client_name": "Tienda Nueva", "term": "MES", "device_id": PC.id})
        _check(code == 200 and g["ok"] and g.get("savedToDb") is not False, f"la licencia no quedó registrada en la BD nueva: {g}")
        code, lic, _ = api("/api/licenses")
        _check(lic["dbAvailable"] is True and any(x["clientName"] == "Tienda Nueva" for x in lic["licenses"]),
               "la licencia emitida no aparece en el control de licencias")


def t_bd_antigua_cuadre():
    """Instalación antigua (data/cuadre.db): se usa esa base, aunque exista un novagest.db vacío."""
    import sqlite3
    carpeta = tempfile.mkdtemp(prefix="novagest-cuadre-")
    antigua = os.path.join(carpeta, "cuadre.db")
    con = sqlite3.connect(antigua)
    con.execute("CREATE TABLE users(id INTEGER PRIMARY KEY, username TEXT)")
    con.execute("INSERT INTO users(username) VALUES('admin')")
    con.commit()
    con.close()
    with _con_datos_en(carpeta):
        _check(studio.gen.db_path() == antigua, "sin novagest.db debe usarse cuadre.db")
        vacia = os.path.join(carpeta, "novagest.db")
        sqlite3.connect(vacia).execute("PRAGMA user_version=1").connection.close()  # archivo SQLite sin tablas
        _check(os.path.exists(vacia), "no se creó el novagest.db vacío de la prueba")
        _check(studio.gen.db_path() == antigua, "un novagest.db vacío no debe ocultar los datos de cuadre.db")
        _check(srv.resolve_db_path(carpeta) == antigua, "el servidor debe elegir la misma base que el generador")
        _check(studio.ensure_db() is True, "no preparó las tablas de licencias en cuadre.db")
        con = sqlite3.connect(antigua)
        try:
            tablas = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            _check({"users", "licenses", "license_requests"} <= tablas, f"cuadre.db no quedó lista: {tablas}")
            _check(con.execute("SELECT username FROM users").fetchone()[0] == "admin", "se tocaron los datos existentes")
        finally:
            con.close()
        con = sqlite3.connect(vacia)
        try:
            _check(con.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").fetchone()[0] == 0,
                   "no debía crear tablas en el novagest.db vacío")
        finally:
            con.close()
    _check(srv.resolve_db_path(tempfile.mkdtemp(prefix="novagest-nueva-")).endswith("novagest.db"),
           "una instalación nueva usa data/novagest.db")


def t_control_de_licencias():
    reset()
    code, g, _ = api("/api/generate", {"client_name": "Control SL", "term": "SEMANA", "device_id": PC.id})
    _check(code == 200 and g["ok"], "no generó la licencia de control")
    lid = g["licenseRowId"]
    _check(lid, "no registró la licencia en la BD")
    code, s, _ = api("/api/licenses")
    _check(code == 200 and s["dbAvailable"] is True, "no lista las licencias")
    lic = next((l for l in s["licenses"] if l["id"] == lid), None)
    _check(lic, "la licencia recién generada no aparece en el listado")
    _check(lic["state"] == "emitida" and lic["active"] is False, "una licencia sin activar debe verse como emitida")
    _check(lic["daysLeft"] == 7 and lic["expiresText"] != "Permanente", "los días restantes no cuadran con el plazo SEMANA")
    _check(len(lic["formattedKey"]) > 30 and lic["signatureOk"] is True, "la clave listada no se puede reenviar")
    _check("🔐 Tu Licencia" in lic["message"] and lic["whatsappUrl"], "no reconstruye el mensaje de la clave guardada")

    code, d, _ = api(f"/api/licenses/{lid}/activate", {})
    _check(code == 200 and d["ok"], "no pudo poner la licencia como activa")
    lic = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == lid)
    _check(lic["active"] is True and lic["state"] == "vigente", "la licencia activada no figura vigente")
    _check(srv.check_device_license(PC.id)["valid"] is True, "el servidor no la reconoce como licencia activa del dispositivo")

    code, r, _ = api(f"/api/licenses/{lid}/renew", {"term": "DOS_ANIOS"})
    _check(code == 200 and r["ok"] and r["action"] == "renew", f"no renovó: {r}")
    _check(L.parse_license(r["licenseKey"])["device_id"] == PC.id, "la clave renovada no es para el mismo dispositivo")
    _check(r["payload"]["expires_at"] > g["payload"]["expires_at"], "la renovación no alarga la vigencia")
    _check(r["renewedFrom"]["id"] == lid, "la renovación no indica de qué licencia viene")
    vieja = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == lid)
    nueva = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == r["licenseRowId"])
    _check(vieja["state"] == "revocada" and vieja["active"] is False, "la licencia anterior no quedó revocada")
    _check(nueva["state"] == "vigente" and nueva["active"] is True, "la licencia renovada no quedó como la activa")

    code, d, _ = api(f"/api/licenses/{r['licenseRowId']}/revoke", {})
    _check(code == 200 and d["ok"], "no pudo revocar")
    code, d, _ = api(f"/api/licenses/{r['licenseRowId']}/restore", {})
    _check(code == 200 and d["ok"], "no pudo reactivar")
    rev = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == r["licenseRowId"])
    _check(rev["active"] is True and rev["state"] == "vigente", "no volvió a quedar vigente tras reactivar")

    code, d, _ = api(f"/api/licenses/{lid}", method="DELETE")
    _check(code == 200 and d["ok"], "no pudo eliminar la licencia")
    _check(srv.q("SELECT COUNT(*) AS c FROM licenses WHERE id=?", (lid,), one=True)["c"] == 0, "la licencia sigue en la BD")
    code, d, _ = api("/api/licenses/99999/revoke", {})
    _check(code == 404, "una licencia inexistente debe dar 404")


def t_equipos_y_csv():
    reset()
    code, g, _ = api("/api/generate", {"client_name": "Equipos SL", "term": "MES", "device_id": MOVIL.id})
    lid = g["licenseRowId"]
    api(f"/api/licenses/{lid}/activate", {})
    # El cliente activa la clave desde la Web/Android: el servidor registra el equipo
    srv.q("INSERT INTO license_activations(license_key, license_id, device_id, device_info, ip, activated_at, last_seen, active)"
          " VALUES(?,?,?,?,?,?,?,1)", (g["licenseKey"], lid, MOVIL.id, "Android", "192.168.1.20",
                                       int(time.time()), int(time.time())))
    lic = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == lid)
    _check(len(lic["devices"]) == 1 and lic["devicesActive"] == 1, "no lista el equipo que activó la licencia")
    _check(lic["devices"][0]["deviceId"] == MOVIL.id and lic["deviceId"] == MOVIL.id, "el equipo listado no es el esperado")
    act_id = lic["devices"][0]["id"]
    code, d, _ = api(f"/api/activations/{act_id}/revoke", {})
    _check(code == 200 and d["ok"], "no pudo quitar el equipo")
    lic = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == lid)
    _check(lic["devicesActive"] == 0, "el equipo sigue activo tras quitarlo")
    code, d, _ = api("/api/activations/99999/revoke", {})
    _check(code == 404, "un equipo inexistente debe dar 404")


def t_exportar_csv():
    code, _, hdr = api("/api/licenses.csv")
    _check(code == 200 and "text/csv" in (hdr.get("Content-Type") or ""), "no exporta el CSV")
    c = login()
    with c.opener.open(f"http://127.0.0.1:{PORT}/api/licenses.csv", timeout=10) as r:
        texto = r.read().decode("utf-8-sig")
        _check("attachment" in (r.headers.get("Content-Disposition") or ""), "el CSV no se descarga como archivo")
    _check(texto.splitlines()[0].startswith("Nº;Cliente;Producto;Tipo"), f"cabeceras del CSV inesperadas: {texto[:60]}")
    _check("Equipos SL" in texto, "el CSV no incluye la licencia generada")
    _check(texto.count("\n") >= 2, "el CSV no trae filas")


def t_llave_de_firma():
    """El botón «Crear llave de firma» crea la llave del emisor y publica la pública (rutas temporales)."""
    carpeta = tempfile.mkdtemp(prefix="novagest-firma-")
    prev = (os.environ["NOVAGEST_SIGNING_KEY"], L.PUBLIC_KEYS_FILE, L.ANDROID_KEYS_FILE, dict(L.PUBLIC_KEYS))
    os.environ["NOVAGEST_SIGNING_KEY"] = os.path.join(carpeta, "emisor", "license-signing-key.pem")
    L.PUBLIC_KEYS_FILE = os.path.join(carpeta, "license_public_keys.pem")
    L.ANDROID_KEYS_FILE = os.path.join(carpeta, "LicensePublicKeys.kt")
    try:
        code, st, _ = api("/api/state")
        _check(st["signing"]["ok"] is False, "sin llave el estado debe avisar")
        code, d, _ = api("/api/signing-key/init", {})
        _check(code == 200 and d["ok"] and d["created"] is True, f"no creó la llave: {d}")
        _check(os.path.exists(os.environ["NOVAGEST_SIGNING_KEY"]), "no escribió la llave privada")
        _check(d["kid"] in L.load_public_keys(L.PUBLIC_KEYS_FILE), "no publicó la llave pública para el servidor")
        _check(d["kid"] in open(L.ANDROID_KEYS_FILE, encoding="utf-8").read(), "no publicó la llave pública para Android")
        code, st, _ = api("/api/state")
        _check(st["signing"]["ok"] is True and st["signing"]["kid"] == d["kid"], f"la llave nueva no quedó activa: {st['signing']}")
        code, g, _ = api("/api/generate", {"client_name": "Con llave nueva", "term": "MES", "device_id": PC.id})
        _check(code == 200 and L.parse_license(g["licenseKey"])["kid"] == d["kid"], f"no firmó con la llave nueva: {g}")
        code, d2, _ = api("/api/signing-key/init", {})
        _check(code == 200 and d2["created"] is False and d2["kid"] == d["kid"], "repetir no debe cambiar la llave")
    finally:
        os.environ["NOVAGEST_SIGNING_KEY"], L.PUBLIC_KEYS_FILE, L.ANDROID_KEYS_FILE, llaves = prev
        L.PUBLIC_KEYS.clear()
        L.PUBLIC_KEYS.update(llaves)


def t_solicitud_antigua():
    """Una solicitud con el ID del formato anterior no se puede atender: hay que pedir una nueva."""
    reset()
    srv.q("INSERT INTO license_requests(client_name, device_id, term, term_label, license_type, days, status, created_at)"
          " VALUES('Antigua','web-hhsp9rqlmv5zhygs','MES','1 mes','FULL',30,'pendiente',?)", (int(time.time()),))
    rid = srv.q("SELECT id FROM license_requests WHERE client_name='Antigua'", one=True)["id"]
    code, d, _ = api(f"/api/requests/{rid}/generate", {})
    _check(code == 400 and d.get("code") == "DEVICE_ID", f"se emitió para un ID antiguo: {d}")
    _check(srv.q("SELECT status FROM license_requests WHERE id=?", (rid,), one=True)["status"] == "pendiente",
           "la solicitud no debe cerrarse si no se emitió")


def t_clave_de_acceso_cambiable():
    studio.ACCESS_KEY_FROM_FILE = True
    original_path, original_key = studio.access_key_path, studio.ACCESS_KEY
    carpeta = tempfile.mkdtemp(prefix="novagest-gen-clave-")
    studio.access_key_path = lambda: os.path.join(carpeta, "acceso.txt")
    try:
        code, d, _ = api("/api/access-key", {"key": "corta"})
        _check(code == 400, "una clave nueva muy corta debe rechazarse")
        code, d, _ = api("/api/access-key", {"key": "licencias-2026"})
        _check(code == 200 and d["ok"], f"no pudo cambiar la clave: {d}")
        _check(studio.ACCESS_KEY == "licencias-2026", "la clave nueva no quedó activa")
        code, d, _ = api("/api/login", {"key": "licencias-2026"})
        _check(code == 200 and d["ok"], "no se entra con la clave nueva")
        code, d, _ = api("/api/login", {"key": original_key})
        _check(code == 401, "la clave vieja todavía deja entrar")
        code, d, _ = api("/api/access-key", {"key": original_key})
        _check(code == 200, "no pudo restaurar la clave original")
    finally:
        studio.access_key_path = original_path
        studio.ACCESS_KEY = original_key
        studio.ACCESS_KEY_FROM_FILE = False


def t_fuera_de_sesion_no_toca_nada():
    c = Cliente(PORT)  # navegador sin entrar
    for ruta, cuerpo, metodo in (
        ("/api/generate", {"client_name": "Intruso", "term": "ANIO"}, None),
        ("/api/licenses/1/revoke", {}, None),
        ("/api/licenses/1", None, "DELETE"),
        ("/api/access-key", {"key": "otra-clave"}, None),
        ("/api/licenses.csv", None, None),
    ):
        code, d, _ = c(ruta, cuerpo, metodo)
        _check(code == 401 and d.get("authRequired"), f"{metodo or 'POST'} {ruta} sin sesión no está protegido")
    _check(srv.q("SELECT COUNT(*) AS c FROM licenses WHERE client_name='Intruso'", one=True)["c"] == 0,
           "se creó una licencia sin sesión")


print("\n=== tools/test_generador.py — generador independiente, HTTPS y control de licencias ===")
print(f"  Clave de acceso creada en {ACCESS_KEY_FILE}")
studio.load_access_key()
t_tests_previos = [
    ("la clave de acceso protege la herramienta", t_clave_de_acceso),
    ("la interfaz propia trae generador y control de licencias", t_interfaz_propia),
]
for nombre, fn in t_tests_previos:
    test(nombre, fn)
login()  # a partir de aquí se prueba todo con sesión de administrador

for nombre, fn in [
    ("sin sesión no se genera, no se revoca y no se exporta", t_fuera_de_sesion_no_toca_nada),
    ("sirve por HTTPS y la cookie de sesión es Secure", t_https_protegido),
    ("genera claves v2 que el servidor verifica (firma del emisor, ligadas al dispositivo)", t_genera_y_verifica),
    ("mensaje de WhatsApp y enlace wa.me listos para enviar", t_mensaje_whatsapp),
    ("atender una solicitud recibida y enviarla por WhatsApp", t_solicitud_por_whatsapp),
    ("descartar, reabrir y eliminar solicitudes", t_solicitud_estado_y_borrado),
    ("leer el mensaje que el cliente envió por WhatsApp", t_lee_mensajes_de_whatsapp),
    ("copiar desde el WhatsApp: importar, crear y reenviar", t_importar_desde_whatsapp),
    ("importar sin la base de datos del servidor (queda en la sesión)", t_importar_sin_bd),
    ("sin base de datos la crea (ya no queda «sin BD»)", t_crea_la_bd_si_falta),
    ("instalación antigua: usa cuadre.db aunque haya un novagest.db vacío", t_bd_antigua_cuadre),
    ("controlar licencias: listar, activar, renovar, revocar, eliminar", t_control_de_licencias),
    ("equipos de una licencia: listar y quitar", t_equipos_y_csv),
    ("exportar la hoja de control a CSV", t_exportar_csv),
    ("cambiar la clave de acceso", t_clave_de_acceso_cambiable),
    ("crear la llave de firma del emisor desde la interfaz", t_llave_de_firma),
    ("una solicitud con un ID del formato anterior no se atiende", t_solicitud_antigua),
]:
    test(nombre, fn)

httpd.shutdown()

print(f"\nResultado: {ok} correcta(s), {fail} fallida(s)\n")
sys.exit(1 if fail else 0)
