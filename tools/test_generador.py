#!/usr/bin/env python3
"""
Pruebas del generador de licencias independiente (tools/license_studio.py).

    python3 tools/test_generador.py

Comprueba, sin tocar la Web ni el servidor HTTP de NovaGest:
  · la herramienta arranca sola y responde en su propia interfaz (/ y /api/session),
  · la CLAVE DE ACCESO protege todo: sin sesión no se ve ni se genera nada,
  · sirve por HTTPS cuando se le pasan certificado y llave (cookie Secure),
  · genera claves con el mismo formato que verifica el servidor (HMAC-SHA256),
  · compone el mensaje de WhatsApp idéntico al de la Web y el enlace wa.me,
  · lista las solicitudes de la BD, crea su clave, la marca atendida y prepara el envío,
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
    code, d, _ = api("/api/session")
    _check(code == 200 and d["authenticated"] is False, "sin sesión debe decir que no está autenticado")
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


def t_interfaz_propia():
    with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=10) as r:
        html = r.read().decode()
    _check(r.status == 200 and "Generador de Licencias" in html, "la página propia no responde")
    _check("aparte de la Web" in html, "falta el rótulo de herramienta independiente")
    _check("Acceso del administrador" in html, "falta la pantalla de clave de acceso")
    _check("Licencias y equipos" in html, "falta la pestaña de control de licencias")
    _check("acceso-datos" in html, "falta el panel de acceso y datos")
    _check("api/licenses" in html and "licenses.csv" in html, "faltan las llamadas de control (listar/exportar)")


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
    code, d, _ = api("/api/generate", {"client_name": "Tienda Nova", "term": "ANIO", "phone": "5351234567"})
    _check(code == 200 and d["ok"], f"no generó: {d}")
    payload = srv.verify_license_token(d["licenseKey"])
    _check(payload is not None, "el servidor NO reconoce la firma de la clave generada")
    _check(payload["client_name"] == "Tienda Nova" and payload["type"] == "FULL", "payload incorrecto")
    _check(payload["expires_at"] == payload["issued_at"] + 365 * 86400, "vencimiento no coincide con el plazo ANIO")
    _check(d["formattedKey"] == "NG-" + d["licenseKey"], "falta el prefijo NG-")
    _check(d["savedToDb"] is True, "no registró la clave en la BD")


def t_mensaje_whatsapp():
    code, d, _ = api("/api/generate", {"client_name": "Mi Tienda", "term": "MES", "phone": "5351234567"})
    _check(code == 200 and d["ok"], "no generó")
    msg = d["message"]
    _check(msg.startswith("🔐 Tu Licencia de NovaGest ya está lista."), "encabezado del mensaje incorrecto")
    _check("👤 Usuario: Mi Tienda" in msg and "📅 Plan: 1 mes (30 días) · FULL" in msg, "cuerpo del mensaje incorrecto")
    _check("⏳ Vigencia: hasta el" in msg, "falta la vigencia")
    _check(msg.strip().endswith(d["licenseKey"]), "el mensaje no termina con la clave")
    _check("«Licencia de uso → Activar licencia»" in msg, "falta la instrucción de activación")
    _check(d["whatsappUrl"].startswith("https://wa.me/5351234567?text="), f"enlace wa.me incorrecto: {d['whatsappUrl'][:40]}")
    code, d2, _ = api("/api/generate", {"client_name": "Sin Tel", "term": "PERMANENTE"})
    _check("permanente" in d2["message"] and "LIFETIME" in d2["message"], "mensaje de permanente incorrecto")
    _check(d2["payload"]["expires_at"] == 0, "una permanente no debe expirar")
    _check(d2["whatsappUrl"].startswith("https://api.whatsapp.com/send?text="), "sin teléfono debe abrir el selector de contacto")


def t_solicitud_por_whatsapp():
    reset()
    row, dup = srv.register_license_request(
        {"client_name": "Cliente WA", "device_id": "web-abc123", "term": "TRIMESTRE", "phone": "+53 5 555 4444"},
        "127.0.0.1", "prueba")
    _check(not dup, "la solicitud no debía duplicarse")
    code, s, _ = api("/api/requests")
    _check(code == 200 and len(s["requests"]) == 1 and s["requests"][0]["status"] == "pendiente", "la solicitud no aparece")
    code, d, _ = api(f"/api/requests/{row['id']}/generate", {})
    _check(code == 200 and d["ok"], f"no generó desde la solicitud: {d}")
    _check(d["request"]["id"] == row["id"] and d["payload"]["client_name"] == "Cliente WA", "no usó el nombre de la solicitud")
    _check("📅 Plan: 3 meses (90 días) · FULL" in d["message"], "no usó el plazo de la solicitud")
    _check(d["whatsappUrl"].startswith("https://wa.me/5355554444?text="), f"no respondió al teléfono de la solicitud: {d['whatsappUrl'][:40]}")
    _check(srv.verify_license_token(d["licenseKey"]) is not None, "firma inválida en la clave de la solicitud")
    r = srv.q("SELECT * FROM license_requests WHERE id=?", (row["id"],), one=True)
    _check(r["status"] == "atendida" and r["handled_by"] == "license_studio.py", "la solicitud no quedó atendida")
    _check((r["license_preview"] or "").startswith("NG-"), "falta la vista previa de la clave")
    code, d2, _ = api(f"/api/requests/{row['id']}/generate", {})
    _check(code == 400, "no debe regenerar una solicitud ya atendida")


def t_solicitud_estado_y_borrado():
    reset()
    row, _ = srv.register_license_request({"client_name": "Estado", "device_id": "web-estado", "term": "MES"}, "127.0.0.1", "t")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "descartada"})
    _check(code == 200 and d["ok"], "no pudo descartar la solicitud")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "pendiente"})
    _check(code == 200 and d["ok"], "no pudo volver a pendiente")
    code, d, _ = api(f"/api/requests/{row['id']}/estado", {"status": "inventado"})
    _check(code == 400, "un estado no válido debe rechazarse")
    code, d, _ = api(f"/api/requests/{row['id']}", method="DELETE")
    _check(code == 200 and d["ok"], "no pudo eliminar la solicitud")
    _check(srv.q("SELECT COUNT(*) AS c FROM license_requests", one=True)["c"] == 0, "la solicitud sigue en la BD")


def t_control_de_licencias():
    reset()
    code, g, _ = api("/api/generate", {"client_name": "Control SL", "term": "SEMANA"})
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
    _check(srv.get_active_license_info()["valid"] is True, "el servidor no la reconoce como licencia activa")

    code, r, _ = api(f"/api/licenses/{lid}/renew", {"term": "DOS_ANIOS"})
    _check(code == 200 and r["ok"] and r["action"] == "renew", f"no renovó: {r}")
    _check(srv.verify_license_token(r["licenseKey"]) is not None, "la clave renovada no verifica en el servidor")
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
    code, g, _ = api("/api/generate", {"client_name": "Equipos SL", "term": "MES"})
    lid = g["licenseRowId"]
    api(f"/api/licenses/{lid}/activate", {})
    # El cliente activa la clave desde la Web/Android: el servidor registra el equipo
    srv.q("INSERT INTO license_activations(license_key, license_id, device_id, device_info, ip, activated_at, last_seen, active)"
          " VALUES(?,?,?,?,?,?,?,1)", (g["licenseKey"], lid, "web-equipo1", "Chrome", "192.168.1.20",
                                       int(time.time()), int(time.time())))
    lic = next(l for l in api("/api/licenses")[1]["licenses"] if l["id"] == lid)
    _check(len(lic["devices"]) == 1 and lic["devicesActive"] == 1, "no lista el equipo que activó la licencia")
    _check(lic["devices"][0]["deviceId"] == "web-equipo1", "el equipo listado no es el esperado")
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
    ("genera claves que el servidor verifica (misma firma)", t_genera_y_verifica),
    ("mensaje de WhatsApp y enlace wa.me listos para enviar", t_mensaje_whatsapp),
    ("atender una solicitud recibida y enviarla por WhatsApp", t_solicitud_por_whatsapp),
    ("descartar, reabrir y eliminar solicitudes", t_solicitud_estado_y_borrado),
    ("controlar licencias: listar, activar, renovar, revocar, eliminar", t_control_de_licencias),
    ("equipos de una licencia: listar y quitar", t_equipos_y_csv),
    ("exportar la hoja de control a CSV", t_exportar_csv),
    ("cambiar la clave de acceso", t_clave_de_acceso_cambiable),
]:
    test(nombre, fn)

httpd.shutdown()

print(f"\nResultado: {ok} correcta(s), {fail} fallida(s)\n")
sys.exit(1 if fail else 0)
