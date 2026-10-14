#!/usr/bin/env python3
"""
Pruebas de las licencias de NovaGest (servidor) — licencias v2.

    python3 tools/test_licencia.py

Arranca el servidor HTTP real dentro del proceso (puerto libre, datos temporales) con
un EMISOR de pruebas y dispositivos simulados, y comprueba:
  · formato y firma: solo valen las claves NG2 firmadas por el emisor; las antiguas
    (NG-/CP-/TRIAL-) y las manipuladas o de otro emisor se rechazan;
  · 1 dispositivo: la licencia solo se activa y solo deja entrar en el dispositivo
    para el que se emitió (prueba firmada sobre un desafío de un solo uso);
  · la sesión queda ligada al dispositivo: copiarla a otro equipo deja de servir en
    cuanto el servidor pide renovar la prueba (428), y la huella del navegador cuenta;
  · 4 usuarios, uno por rol (crear, activar, cambiar de rol y entrar);
  · hora de confianza: atrasar el reloj del servidor o del dispositivo no sirve;
  · solo el emisor (con la llave privada) puede generar licencias;
  · el flujo de solicitudes por WhatsApp (mensaje, plazos, estados, conteos).
"""
import os
import re
import sys
import tempfile
import time

os.environ["DATA_DIR"] = os.environ.get("DATA_DIR") or tempfile.mkdtemp(prefix="novagest-lic-")
os.environ["NOVAGEST_NET_TIME"] = "0"
os.environ.setdefault("REQUIRE_ADMIN_TOTP", "1")
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "server"))

import novagest_server as srv  # noqa: E402  (necesita DATA_DIR antes de importar)
import novagest_license as L  # noqa: E402
from licencia_pruebas import Cliente, Dispositivo, Emisor, servidor_en_hilo  # noqa: E402

srv.init_db()
EMISOR = Emisor().instalar()
httpd, BASE = servidor_en_hilo(srv)

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
        print(f"  ✖ {name}\n     {type(e).__name__}: {e}")


def _check(cond, extra=""):
    if not cond:
        raise AssertionError(extra or "comprobación fallida")


def limpiar_licencias():
    # (rate_hits: el límite de 20 activaciones/10 min por IP es para clientes reales, no para la batería)
    for t in ("license_activations", "licenses", "license_devices", "sessions", "rate_hits", "fails"):
        srv.q(f"DELETE FROM {t}")


def reset():
    srv.q("DELETE FROM license_requests")


def pedir(**body):
    body.setdefault("client_name", "Tienda Nova")
    body.setdefault("device_id", PC.id)
    body.setdefault("device_info", "Mozilla/5.0 Chrome")
    row, dup = srv.register_license_request(body, "10.0.0.5", body["device_info"])
    return srv.license_request_public(row), dup


class reloj_desplazado:
    """Mueve el reloj de pared (time.time) N segundos; el monotónico sigue igual."""

    def __init__(self, segundos):
        self.d = segundos

    def __enter__(self):
        self.real = time.time
        time.time = lambda: self.real() + self.d
        return self

    def __exit__(self, *exc):
        time.time = self.real
        return False


PC = Dispositivo("web")
OTRO_PC = Dispositivo("web", huella={"platform": "Win32", "cores": "4", "memory": "4", "screen": "1366x768x24",
                                     "timezone": "America/Havana", "languages": "es-ES,es", "gpu": "ANGLE (AMD)", "touch": "0"})
MOVIL = Dispositivo("android")

print("\nLicencias v2 · firma del emisor, 1 dispositivo, 4 usuarios y hora de confianza\n")


def t_arranque_sin_licencia():
    _check(srv.q("SELECT COUNT(*) AS c FROM licenses", one=True)["c"] == 0, "el arranque no debe crear licencias")
    c = Cliente(BASE)
    code, st = c("GET", "/api/license/status", headers={"X-NG-Device": PC.id})
    _check(code == 200 and st["valid"] is False and st["code"] == "LICENSE_REQUIRED", f"estado inicial: {st}")
    _check(st["maxUsers"] == 4 and st["maxDevices"] == 1 and st["roles"] == list(L.ROLES), f"límites publicados: {st}")
    code, d = c("GET", "/api/state")
    _check(code == 402 and d.get("licenseError"), f"sin licencia la API debe responder 402: {code} {d}")


def t_formato_y_firma():
    c = Cliente(BASE)
    for clave, codigo in (("NG-eyJhIjoxfQ.firma", "LICENSE_LEGACY"), ("CP-xxxx.yyyy", "LICENSE_LEGACY"),
                          ("TRIAL-123456", "LICENSE_LEGACY"), ("eyJhIjoxfQ.firma", "LICENSE_LEGACY"),
                          ("hola", "LICENSE_FORMAT"), ("", "LICENSE_EMPTY")):
        code, d = c.activar(PC, clave) if clave else c("POST", "/api/license/activate", {"license_key": ""})
        _check(code == 400 and d.get("code") == codigo, f"«{clave}» → {code} {d.get('code')} (se esperaba {codigo})")
    buena = EMISOR.emitir("Tienda", PC.id)
    # Manipulada: se cambia el contenido (otro dispositivo) y se conserva la firma original.
    cuerpo, firma = buena[4:].split(".")
    p = L.parse_license(buena)
    p["device_id"] = OTRO_PC.id
    falsa = "NG2-" + L.b64u(L.canonical_json(p)) + "." + firma
    code, d = c.activar(OTRO_PC, falsa)
    _check(code == 400 and d["code"] == "LICENSE_SIGNATURE", f"clave manipulada aceptada: {d}")
    # Firmada por otro emisor (por ejemplo, alguien que se fabrica su propia llave)
    pirata = Emisor()
    code, d = c.activar(PC, pirata.emitir("Pirata", PC.id))
    _check(code == 400 and d["code"] == "LICENSE_SIGNATURE", f"clave de otro emisor aceptada: {d}")
    _check(srv.q("SELECT COUNT(*) AS c FROM licenses", one=True)["c"] == 0, "una clave rechazada no debe guardarse")


def t_solo_en_su_dispositivo():
    limpiar_licencias()
    c = Cliente(BASE)
    clave = EMISOR.emitir("Tienda Nova", PC.id, 30)
    code, d = c.activar(OTRO_PC, clave)
    _check(code == 400 and d["code"] == "LICENSE_OTHER_DEVICE" and d["licenseDevice"] == PC.id, f"otro equipo la activó: {d}")
    code, d = c.activar(PC, clave)
    _check(code == 200 and d["valid"] and d["deviceId"] == PC.id, f"no se activó en su dispositivo: {d}")
    _check(d["maxUsers"] == 4 and d["maxDevices"] == 1 and d["platform"] == "web", f"límites de la licencia: {d}")
    code, st = c("GET", "/api/license/status", headers={"X-NG-Device": PC.id})
    _check(st["valid"] is True and st["clientName"] == "Tienda Nova", f"estado del dispositivo licenciado: {st}")
    code, st = c("GET", "/api/license/status", headers={"X-NG-Device": OTRO_PC.id})
    _check(st["valid"] is False and st["code"] == "LICENSE_REQUIRED", f"el otro equipo no debe quedar licenciado: {st}")
    # Entrar: solo desde el dispositivo licenciado
    code, d = Cliente(BASE).entrar(OTRO_PC, "jefe", "Jefe123!")
    _check(code == 402 and d["code"] == "LICENSE_REQUIRED", f"otro equipo pudo entrar: {code} {d}")
    code, d = c.entrar(PC, "jefe", "Jefe123!")
    _check(code == 200 and d["deviceId"] == PC.id and d["user"]["username"] == "jefe", f"no entró desde su equipo: {code} {d}")
    code, d = c("GET", "/api/state")
    _check(code == 200, f"con licencia y sesión la API debe responder: {code} {d}")


def t_desafio_de_un_solo_uso():
    c = Cliente(BASE)
    clave = EMISOR.emitir("Tienda Nova", PC.id, 30)
    extra = L.hashlib.sha256(clave.encode()).hexdigest()[:16]
    prueba = PC.prueba("activate", c.desafio("activate"), extra)
    code, d = c("POST", "/api/license/activate", {"license_key": clave, "deviceProof": prueba})
    _check(code == 200, f"primera activación: {d}")
    code, d = c("POST", "/api/license/activate", {"license_key": clave, "deviceProof": prueba})
    _check(code == 400 and d["code"] == "DEVICE_PROOF_EXPIRED", f"un desafío reutilizado no debe valer: {d}")
    # Firma de otro dispositivo haciéndose pasar por PC (misma llave pública, firma ajena)
    falsa = OTRO_PC.prueba("activate", c.desafio("activate"), extra)
    falsa.update(spki=L.b64u(PC.spki), deviceId=PC.id)
    code, d = c("POST", "/api/license/activate", {"license_key": clave, "deviceProof": falsa})
    _check(code == 400 and d["code"] == "DEVICE_PROOF", f"una firma ajena no debe valer: {d}")
    # Prueba para otra operación (login) no sirve para activar
    code, d = c("POST", "/api/license/activate", {"license_key": clave, "deviceProof": PC.prueba("login", c.desafio("login"), extra)})
    _check(code == 400 and d["code"] in ("DEVICE_PROOF", "DEVICE_PROOF_EXPIRED"), f"prueba de otra operación aceptada: {d}")
    # Sin prueba
    code, d = c("POST", "/api/license/activate", {"license_key": clave})
    _check(code == 400 and d["code"] == "DEVICE_PROOF_REQUIRED", f"activación sin prueba: {d}")


def t_sesion_ligada_al_dispositivo():
    limpiar_licencias()
    c = Cliente(BASE)
    _check(c.activar(PC, EMISOR.emitir("Tienda Nova", PC.id, 30))[0] == 200, "no activó")
    code, d = c.entrar(PC, "jefe", "Jefe123!")
    _check(code == 200, f"no entró: {d}")
    token = d["token"]
    # Alguien copia el token/cookie a otra PC: sirve como mucho hasta que toca renovar la prueba…
    ladron = Cliente(BASE)
    ladron.headers["Authorization"] = "Bearer " + token
    srv.q("UPDATE sessions SET proof_at=? WHERE device_id=?", (srv.now() - srv.PROOF_MAX_AGE - 5, PC.id))
    code, d = ladron("GET", "/api/state")
    _check(code == 428 and d["code"] == "DEVICE_PROOF_REQUIRED", f"la sesión copiada no pidió prueba: {code} {d}")
    # …y no puede darla: su firma es de otro dispositivo → la sesión se cierra.
    code, d = ladron.renovar_prueba(OTRO_PC)
    _check(code == 401 and d["code"] == "DEVICE_MISMATCH", f"otro equipo renovó la sesión: {code} {d}")
    code, d = ladron("GET", "/api/state")
    _check(code == 401, f"la sesión robada sigue viva: {code} {d}")
    # El dispositivo legítimo renueva sin problema
    c2 = Cliente(BASE)
    code, d = c2.entrar(PC, "jefe", "Jefe123!")
    srv.q("UPDATE sessions SET proof_at=? WHERE device_id=?", (srv.now() - srv.PROOF_MAX_AGE - 5, PC.id))
    _check(c2("GET", "/api/state")[0] == 428, "debía pedir la prueba")
    code, d = c2.renovar_prueba(PC)
    _check(code == 200 and d["ok"], f"el dispositivo legítimo no pudo renovar: {d}")
    _check(c2("GET", "/api/state")[0] == 200, "tras renovar la prueba la sesión debe funcionar")
    # Las sesiones anteriores a las licencias v2 (sin dispositivo) se cierran al migrar
    srv.q("UPDATE sessions SET device_id=NULL")
    srv.migrate_license_schema()
    _check(srv.q("SELECT COUNT(*) AS c FROM sessions", one=True)["c"] == 0, "quedaron sesiones sin dispositivo")


def t_huella_del_navegador():
    limpiar_licencias()
    c = Cliente(BASE)
    _check(c.activar(PC, EMISOR.emitir("Tienda Nova", PC.id, 30))[0] == 200, "no activó")
    # Cambio pequeño (otro monitor): se acepta y se actualiza la huella
    code, d = c.entrar(PC, "jefe", "Jefe123!", huella={**PC.huella, "screen": "2560x1440x24"})
    _check(code == 200, f"un cambio de monitor no debe bloquear: {code} {d}")
    # Perfil del navegador copiado a otra PC (misma llave, hardware distinto) → se rechaza
    code, d = Cliente(BASE).entrar(PC, "jefe", "Jefe123!", huella=OTRO_PC.huella)
    _check(code == 403 and d["code"] == "DEVICE_CHANGED", f"el perfil copiado a otra PC entró: {code} {d}")


def t_un_dispositivo_una_licencia():
    limpiar_licencias()
    c = Cliente(BASE)
    primera = EMISOR.emitir("Tienda", PC.id, 30)
    segunda = EMISOR.emitir("Tienda", PC.id, 365)
    del_movil = EMISOR.emitir("Tienda", MOVIL.id, 30)
    _check(c.activar(PC, primera)[0] == 200 and c.activar(MOVIL, del_movil)[0] == 200, "no activó")
    _check(c.activar(PC, segunda)[0] == 200, "no activó la renovación")
    activas = {r["key"]: r["active"] for r in srv.q("SELECT key, active FROM licenses")}
    _check(activas[segunda] == 1 and activas[primera] == 0, "la renovación debe reemplazar a la anterior del MISMO dispositivo")
    _check(activas[del_movil] == 1, "la licencia de otro dispositivo no debe tocarse")
    _check(srv.check_device_license(PC.id)["payload"]["expires_at"] == L.parse_license(segunda)["expires_at"], "no usa la nueva")


def t_android_firma_der():
    limpiar_licencias()
    c = Cliente(BASE)
    clave = EMISOR.emitir("Bodega Sol", MOVIL.id, 30)
    code, d = c.activar(MOVIL, clave, firma_der=True)
    _check(code == 200 and d["platform"] == "android", f"Android (firma DER) no activó: {d}")
    code, d = c.entrar(MOVIL, "almacenero", "Alma123!", firma_der=True)
    _check(code == 200, f"Android no pudo entrar: {code} {d}")
    code, d = c.activar(PC, EMISOR.emitir("Bodega Sol", MOVIL.id, 30))
    _check(code == 400 and d["code"] == "LICENSE_OTHER_DEVICE", "la clave del móvil no debe activarse en una PC")


def t_cuatro_usuarios_uno_por_rol():
    limpiar_licencias()
    c = Cliente(BASE)
    c.activar(PC, EMISOR.emitir("Tienda Nova", PC.id, 30))
    code, d = c.entrar(PC, "jefe", "Jefe123!")
    _check(code == 200, f"no entró: {d}")
    code, d = c("GET", "/api/users")
    lim = d["licenseLimit"]
    _check(lim["maxUsers"] == 4 and lim["perRole"] == 1 and len(lim["licensed"]) == 4 and lim["unlicensed"] == [], f"límite: {lim}")
    nuevo = {"username": "jefe2", "displayName": "Otro jefe", "role": "JEFE", "password": "ClaveSegura1"}
    code, d = c("POST", "/api/users", nuevo)
    _check(code == 409 and d["code"] == "USER_LIMIT" and "jefe" in d["error"], f"un 2.º JEFE no debía crearse: {code} {d}")
    # Desactivar al económico permite crear otro económico (sigue habiendo 4 activos)
    eco = srv.q("SELECT id FROM users WHERE username='economico'", one=True)["id"]
    code, d = c("PUT", f"/api/users/{eco}", {"active": 0})
    _check(code == 200, f"no desactivó: {d}")
    code, d = c("POST", "/api/users", {**nuevo, "username": "economico2", "role": "ECONOMICO"})
    _check(code == 200, f"no creó el económico de reemplazo: {code} {d}")
    code, d = c("PUT", f"/api/users/{eco}", {"active": 1})
    _check(code == 409 and d["code"] == "USER_LIMIT", f"reactivar al económico superaría el límite: {code} {d}")
    alm = srv.q("SELECT id FROM users WHERE username='almacenero'", one=True)["id"]
    code, d = c("PUT", f"/api/users/{alm}", {"role": "JEFE"})
    _check(code == 409, f"cambiar de rol a uno ocupado debe rechazarse: {code} {d}")
    # Datos antiguos con 2 usuarios del mismo rol: solo entra el más antiguo de cada rol
    srv.q("UPDATE users SET active=1 WHERE id=?", (eco,))
    code, d = c("GET", "/api/users")
    e2 = srv.q("SELECT id FROM users WHERE username='economico2'", one=True)["id"]
    _check(e2 in d["licenseLimit"]["unlicensed"], f"el sobrante del rol debe marcarse fuera de licencia: {d['licenseLimit']}")
    code, d = Cliente(BASE).entrar(PC, "economico2", "ClaveSegura1")
    _check(code == 403 and d["code"] == "USER_NOT_LICENSED", f"el usuario sobrante pudo entrar: {code} {d}")
    code, d = Cliente(BASE).entrar(PC, "economico", "Eco123!")
    _check(code == 200, f"el usuario cubierto no pudo entrar: {code} {d}")
    srv.q("DELETE FROM users WHERE username='economico2'")


def t_reloj_del_dispositivo():
    limpiar_licencias()
    c = Cliente(BASE)
    clave = EMISOR.emitir("Tienda Nova", PC.id, 30)
    code, d = c.activar(PC, clave, ms=(time.time() - 3 * 86400) * 1000)
    _check(code == 400 and d["code"] == "CLIENT_CLOCK" and "atrasadas" in d["error"], f"un reloj atrasado 3 días se aceptó: {d}")
    code, d = c.activar(PC, clave, ms=(time.time() + 3600) * 1000)
    _check(code == 400 and d["code"] == "CLIENT_CLOCK" and "adelantadas" in d["error"], f"un reloj adelantado 1 h se aceptó: {d}")
    code, d = c.activar(PC, clave, ms=(time.time() + 120) * 1000)
    _check(code == 200, f"2 minutos de diferencia deben tolerarse: {d}")


def t_reloj_del_servidor():
    limpiar_licencias()
    c = Cliente(BASE)
    clave = EMISOR.emitir("Tienda Nova", PC.id, 1)          # caduca mañana
    _check(c.activar(PC, clave)[0] == 200, "no activó")
    srv.CLOCK.now()
    with reloj_desplazado(2 * 86400):                         # pasan 2 días (reloj adelantado de verdad)
        st = srv.check_device_license(PC.id)
        _check(st["valid"] is False and st["code"] == "LICENSE_EXPIRED", f"la licencia vencida sigue valiendo: {st['code']}")
    # Atrasar el reloj con el servidor en marcha: lo detecta el reloj monotónico
    with reloj_desplazado(-3 * 86400):
        st = srv.check_device_license(PC.id)
        _check(st["valid"] is False and st["code"] == "CLOCK_ROLLBACK", f"no detectó el atraso del reloj: {st['code']}")
        code, d = Cliente(BASE).entrar(PC, "jefe", "Jefe123!", ms=time.time() * 1000)
        _check(code == 400 and d["code"] == "CLOCK_ROLLBACK", f"con el reloj atrasado se pudo entrar: {code} {d}")
    # Atrasar el reloj y REINICIAR: lo detecta la marca de agua guardada (BD + archivo firmados)
    srv.CLOCK._save(int(time.time()))
    srv.CLOCK.reset()
    with reloj_desplazado(-3 * 86400):
        st = srv.check_device_license(PC.id)
        _check(st["code"] == "CLOCK_ROLLBACK", f"tras reiniciar no detectó el atraso: {st['code']}")
    # Una marca de agua manipulada en la BD (firma HMAC incorrecta) no cuenta…
    srv.q("UPDATE license_clock SET watermark=?, mac='x' WHERE id=1", (int(time.time()) + 50 * 86400,))
    srv.CLOCK.reset()
    _check(srv.check_device_license(PC.id)["valid"] is True, "una marca de agua manipulada no debe bloquear")
    # …y la hora de Internet corrige una marca de agua «del futuro» (reloj que estuvo adelantado)
    with reloj_desplazado(20 * 86400):
        srv.CLOCK.reset()
        srv.CLOCK.now()                                       # el servidor arrancó con la fecha mal
    srv.CLOCK.reset()
    _check(srv.check_device_license(PC.id)["code"] == "CLOCK_ROLLBACK", "debía verse como atraso sin hora de Internet")
    srv.CLOCK.set_network_time(time.time(), "prueba")
    _check(srv.check_device_license(PC.id)["valid"] is True, "la hora de Internet no corrigió la marca de agua")
    srv.CLOCK.reset()
    # Fecha del servidor anterior a la emisión de la licencia (reloj atrasado desde siempre)
    futura = EMISOR.emitir("Tienda Nova", PC.id, 30, issued_at=int(time.time()) + 2 * 86400)
    code, d = c.activar(PC, futura)
    _check(code == 400 and d["code"] == "CLOCK_BEHIND", f"una licencia emitida «en el futuro» se activó: {d}")


def t_caducada():
    limpiar_licencias()
    vieja = EMISOR.emitir("Tienda Nova", PC.id, 1, issued_at=int(time.time()) - 3 * 86400)
    code, d = Cliente(BASE).activar(PC, vieja)
    _check(code == 400 and d["code"] == "LICENSE_EXPIRED", f"una licencia caducada se activó: {d}")


def t_solo_el_emisor_genera():
    limpiar_licencias()
    c = Cliente(BASE)
    c.activar(PC, EMISOR.emitir("Tienda Nova", PC.id, 30))
    c.entrar(PC, "jefe", "Jefe123!")
    code, d = c("POST", "/api/license/generate", {"client_name": "Cliente", "device_id": MOVIL.id, "term": "MES"})
    _check(code == 200 and d["payload"]["device_id"] == MOVIL.id and d["license_key"].startswith("NG2-"), f"el emisor no generó: {d}")
    _check(d["payload"]["max_users"] == 4 and d["payload"]["max_devices"] == 1, "límites incorrectos")
    code, d = c("POST", "/api/license/generate", {"client_name": "Cliente", "term": "MES"})
    _check(code == 400 and d["code"] == "DEVICE_ID", f"sin dispositivo no debe emitirse: {d}")
    code, d = c("GET", "/api/license/info")
    _check(code == 200 and d["canIssue"] is True and d["deviceId"] == PC.id, f"info del emisor: {d.get('canIssue')}")
    # En el servidor de un cliente no está la llave privada: no se puede generar
    ruta = os.environ.pop("NOVAGEST_SIGNING_KEY")
    try:
        os.environ["NOVAGEST_SIGNING_KEY"] = os.path.join(tempfile.mkdtemp(), "no-existe.pem")
        code, d = c("POST", "/api/license/generate", {"client_name": "Cliente", "device_id": MOVIL.id, "term": "MES"})
        _check(code == 403 and d["code"] == "SIGNING_KEY_MISSING", f"un servidor sin llave privada generó: {code} {d}")
        _check(c("GET", "/api/license/info")[1]["canIssue"] is False, "canIssue debía ser falso")
    finally:
        os.environ["NOVAGEST_SIGNING_KEY"] = ruta
    # Una llave privada que no corresponde a las llaves públicas de confianza tampoco sirve
    _check(srv.lic2.signing_key_available(), "la llave del emisor debía estar disponible")
    otra = Emisor()
    os.environ["NOVAGEST_SIGNING_KEY"] = otra.path
    try:
        try:
            L.load_signing_key()
            raise AssertionError("una llave que no es de confianza se aceptó")
        except L.LicenseError as e:
            _check(e.code == "SIGNING_KEY_UNTRUSTED", e.code)
    finally:
        os.environ["NOVAGEST_SIGNING_KEY"] = ruta


def t_init_keys():
    carpeta = tempfile.mkdtemp(prefix="ng-init-")
    priv, pub, kt = (os.path.join(carpeta, n) for n in ("emisor.pem", "license_public_keys.pem", "LicensePublicKeys.kt"))
    kid, ruta, creada = L.init_signing_keys(priv, pub, kt)
    _check(creada and os.path.exists(priv) and ruta == priv, "no creó la llave privada")
    llaves = L.load_public_keys(pub)
    _check(list(llaves) == [kid], f"llave pública: {list(llaves)}")
    kt_txt = open(kt, encoding="utf-8").read()
    _check(f'"{kid}" to "' in kt_txt and "object LicensePublicKeys" in kt_txt, "no generó la llave para Android")
    kid2, _, creada2 = L.init_signing_keys(priv, pub, kt)
    _check(kid2 == kid and not creada2, "repetir --init-keys no debe cambiar la llave")
    kid3, _, creada3 = L.init_signing_keys(priv, pub, kt, force=True)
    _check(creada3 and kid3 != kid and set(L.load_public_keys(pub)) == {kid, kid3},
           "la rotación debe conservar la llave pública anterior (las licencias emitidas siguen valiendo)")
    _check(L.load_signing_key(priv, public_keys=L.load_public_keys(pub)) is not None, "la llave nueva no carga")


test("el arranque no crea licencias y sin licencia todo responde 402", t_arranque_sin_licencia)
test("solo valen claves NG2 firmadas por el emisor (antiguas, manipuladas o ajenas: no)", t_formato_y_firma)
test("la licencia solo se activa y solo deja entrar en SU dispositivo", t_solo_en_su_dispositivo)
test("el desafío es de un solo uso y la firma debe ser del propio dispositivo", t_desafio_de_un_solo_uso)
test("la sesión queda ligada al dispositivo (copiarla a otra PC no sirve)", t_sesion_ligada_al_dispositivo)
test("la huella del navegador detecta un perfil copiado a otra PC", t_huella_del_navegador)
test("un dispositivo = una licencia activa (renovar reemplaza solo la suya)", t_un_dispositivo_una_licencia)
test("Android: llave del Keystore con firma DER", t_android_firma_der)
test("4 usuarios: uno por rol (crear, activar, cambiar de rol y entrar)", t_cuatro_usuarios_uno_por_rol)
test("atrasar o adelantar el reloj del dispositivo no sirve", t_reloj_del_dispositivo)
test("atrasar el reloj del servidor no sirve (monotónico, marca de agua, Internet)", t_reloj_del_servidor)
test("una licencia caducada no se activa", t_caducada)
test("solo el emisor (con la llave privada de confianza) genera licencias", t_solo_el_emisor_genera)
test("--init-keys crea la llave, publica la pública y permite rotarla", t_init_keys)

print("\nLicencia · Solicitudes por WhatsApp y gestión\n")


def prueba_mensaje():
    msg = srv.license_request_message("Tienda Nova", PC.id, "MES", when=1791856318)
    lineas = msg.split("\n")
    _check(len(lineas) == 7, f"líneas: {len(lineas)}")
    _check(lineas[0] == "Hola, solicito activar mi Licencia de NovaGest.", lineas[0])
    _check(lineas[1] == "", "falta la línea en blanco tras el saludo")
    _check(lineas[2] == "👤 Usuario: Tienda Nova", lineas[2])
    _check(lineas[3] == f"🆔 ID Dispositivo: {PC.id}", lineas[3])
    _check(lineas[4] == "📦 Producto: NovaGest v1.0.0", lineas[4])
    _check(lineas[5] == "📅 Plan: 1 mes (30 días) · FULL", lineas[5])
    _check(re.fullmatch(r"🕒 Fecha Actual: \d{2}/\d{2}/\d{4}, \d{1,2}:\d{2}:\d{2} [ap]\.m\.", lineas[6]) is not None, lineas[6])


test("el mensaje de solicitud tiene el formato exacto del flujo WhatsApp", prueba_mensaje)

test("los 8 plazos publicados son los mismos que el cliente ve (y el mensaje de cada uno)", lambda: (
    _check([t["id"] for t in srv.LICENSE_TERMS] == ["DIA", "SEMANA", "MES", "TRIMESTRE", "SEMESTRE", "ANIO", "DOS_ANIOS", "PERMANENTE"],
           str([t["id"] for t in srv.LICENSE_TERMS])),
    _check([t["days"] for t in srv.LICENSE_TERMS] == [1, 7, 30, 90, 180, 365, 730, 0], "días"),
    _check(srv.LICENSE_TERMS[-1]["type"] == "LIFETIME", "el permanente debe ser LIFETIME"),
    _check("1 día (1 días) · FULL" in srv.license_request_message("X", "d", "DIA"), "plazo 1 día"),
    _check("Permanente · LIFETIME" in srv.license_request_message("X", "d", "PERMANENTE"), "plazo permanente"),
    _check(srv.license_term("NOEXISTE")["id"] == "MES", "el plazo por defecto debe ser 1 mes"),
))

test("la solicitud se guarda con sus datos y se puede leer tal cual", lambda: (
    reset(),
    (req := pedir(phone="5351234567", term="TRIMESTRE")[0]),
    _check(req["clientName"] == "Tienda Nova", req["clientName"]),
    _check(req["term"] == "TRIMESTRE" and req["termLabel"] == "3 meses" and req["days"] == 90, str(req["termLabel"])),
    _check(req["channel"] == "web" and req["status"] == "pendiente", req["status"]),
    _check(req["phone"] == "5351234567", req["phone"]),
    _check("📅 Plan: 3 meses (90 días) · FULL" in req["message"], req["message"]),
    _check(req["createdText"].endswith("p.m.") or req["createdText"].endswith("a.m."), req["createdText"]),
))


def prueba_id_de_dispositivo_seguro():
    reset()
    for malo in ("web-hhsp9rqlmv5zhygs", "android-4f2a91cc", "", "WEB-1234"):
        try:
            pedir(device_id=malo)
            raise AssertionError(f"se aceptó el ID «{malo}»")
        except ValueError as e:
            _check("ID de dispositivo" in str(e), str(e))
    req = pedir(device_id=MOVIL.id.lower().replace("-", " "))[0]
    _check(req["deviceId"] == MOVIL.id and req["channel"] == "android", f"no normalizó el ID: {req['deviceId']} {req['channel']}")


test("la solicitud exige el ID seguro del dispositivo (WEB-…/AND-…)", prueba_id_de_dispositivo_seguro)

test("la misma solicitud repetida no se duplica (evita el doble clic)", lambda: (
    reset(),
    _check(pedir(term="MES")[1] is False, "la primera no puede ser duplicada"),
    _check(pedir(term="MES")[1] is True, "la segunda debe detectarse como duplicada"),
    _check(len(srv.license_requests_list()) == 1, f"{len(srv.license_requests_list())} solicitudes"),
    _check(len(srv.license_requests_list()) == 1 and pedir(term="ANIO")[1] is False, "otro plazo sí es una solicitud nueva"),
    _check(srv.license_request_counts()["pendiente"] == 2, str(srv.license_request_counts())),
))

test("los estados y los conteos se actualizan y se filtran", lambda: (
    reset(),
    (a := pedir(term="MES")[0]),
    (b := pedir(term="ANIO")[0]),
    (c := pedir(term="PERMANENTE")[0]),
    srv.q("UPDATE license_requests SET status='atendida' WHERE id=?", (a["id"],)),
    srv.q("UPDATE license_requests SET status='descartada' WHERE id=?", (b["id"],)),
    _check(srv.license_request_counts() == {"pendiente": 1, "atendida": 1, "descartada": 1, "total": 3}, str(srv.license_request_counts())),
    _check([r["id"] for r in srv.license_requests_list("pendiente")] == [c["id"]], "filtro pendientes"),
    _check([r["id"] for r in srv.license_requests_list("atendida")] == [a["id"]], "filtro atendidas"),
    _check(srv.license_requests_list()[0]["id"] == c["id"], "las pendientes van primero en el listado"),
))


def prueba_solicitud_a_licencia():
    reset()
    limpiar_licencias()
    req = pedir(client_name="Bodega Sol", term="SEMESTRE", device_id=MOVIL.id)[0]
    c = Cliente(BASE)
    c.activar(PC, EMISOR.emitir("Emisor", PC.id, 30))
    c.entrar(PC, "jefe", "Jefe123!")
    code, d = c("POST", "/api/license/generate", {"request_id": req["id"]})
    _check(code == 200, f"no generó desde la solicitud: {d}")
    p = L.parse_license(d["license_key"])
    _check(p["client_name"] == "Bodega Sol" and p["device_id"] == MOVIL.id, f"no usó los datos de la solicitud: {p}")
    _check(p["type"] == "FULL" and p["expires_at"] - p["issued_at"] == 180 * 86400, "el plazo del semestre no cuadra")
    atendida = srv.license_requests_list("atendida")[0]
    _check(atendida["id"] == req["id"] and atendida["licensePreview"], "la solicitud debe quedar atendida con vista previa")
    # El móvil activa su clave: sus solicitudes pendientes quedan atendidas
    pedir(client_name="Bodega Sol", term="ANIO", device_id=MOVIL.id)
    pedir(client_name="Otro", term="MES", device_id=OTRO_PC.id)
    _check(Cliente(BASE).activar(MOVIL, d["license_key"])[0] == 200, "el móvil no activó su clave")
    _check([r["deviceId"] for r in srv.license_requests_list("pendiente")] == [OTRO_PC.id], "solo debe quedar la del otro equipo")


test("una solicitud se convierte en licencia para SU dispositivo y la activación la cierra", prueba_solicitud_a_licencia)

test("la fecha de la solicitud usa el formato es-CU de la Web", lambda: (
    lambda txt: _check(re.fullmatch(r"\d{2}/\d{2}/\d{4}, \d{1,2}:\d{2}:\d{2} [ap]\.m\.", txt) is not None, txt)
)(srv.license_fmt_date(1791856318)))

test("las tablas de licencias v2 existen en la base de datos creada", lambda: (
    _check(srv.q("SELECT COUNT(*) AS c FROM license_requests", one=True) is not None, "falta la tabla"),
    _check({"device_id", "platform"} <= {r[1] for r in srv.CON.execute("PRAGMA table_info(licenses)")}, "faltan columnas en licenses"),
    _check({"device_id", "proof_at"} <= {r[1] for r in srv.CON.execute("PRAGMA table_info(sessions)")}, "faltan columnas en sessions"),
    _check(srv.q("SELECT COUNT(*) AS c FROM license_devices", one=True) is not None, "falta license_devices"),
))


def prueba_sin_recreacion():
    limpiar_licencias()
    srv.init_db()  # simula el siguiente arranque después de eliminar las licencias
    _check(srv.q("SELECT COUNT(*) AS c FROM licenses", one=True)["c"] == 0, "el reinicio recreó una licencia")
    _check(not srv.any_valid_license()["valid"], "no debe quedar una licencia activa tras eliminarla")


test("el arranque no recrea licencias eliminadas", prueba_sin_recreacion)

reset()
limpiar_licencias()
httpd.shutdown()
print(f"\n{ok} pruebas correctas, {fail} fallidas\n")
sys.exit(1 if fail else 0)
