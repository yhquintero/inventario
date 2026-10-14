"""
NovaGest · Licencias v2: firmadas por el emisor y ligadas a UN solo dispositivo.

Qué garantiza este módulo (lo usan el servidor, la CLI y el generador de licencias):

  · Firma asimétrica ECDSA P-256 / SHA-256. Solo el EMISOR (quien guarda la llave
    privada, fuera del servidor del cliente) puede crear licencias; el servidor y la
    app Android solo tienen la llave PÚBLICA y únicamente pueden verificarlas. Ya no
    hay un secreto en la carpeta data con el que un cliente pueda fabricarse claves.
  · Cada licencia lleva dentro (firmado) el ID del dispositivo para el que se emitió
    (WEB-… para el navegador de una PC, AND-… para un teléfono/tableta Android), el
    límite de 4 usuarios (uno por rol) y 1 dispositivo. No se puede «copiar» a otro
    equipo: el ID es la huella de una llave privada que nunca sale del dispositivo
    (WebCrypto no exportable en la Web; Android Keystore en el móvil) y cada
    activación, inicio de sesión y renovación de sesión exige una PRUEBA firmada por
    esa llave sobre un desafío de un solo uso del servidor.
  · Formato de la clave:  NG2-<payload base64url>.<firma base64url>

Las claves antiguas (NG-, CP-, TRIAL- o sin prefijo, firmadas con HMAC) se rechazan
con un mensaje claro: hay que pedir una licencia nueva para el equipo.
"""
import base64
import hashlib
import json
import os
import re
import secrets
import time

try:  # cryptography está en requirements.txt (también la usan las copias cifradas)
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature, encode_dss_signature
    CRYPTO_OK = True
except Exception:  # pragma: no cover - instalación sin dependencias
    CRYPTO_OK = False

PREFIX = "NG2-"
LICENSE_VERSION = 2
ROLES = ("ADMINISTRADOR", "JEFE", "ECONOMICO", "ALMACENERO")
MAX_USERS = len(ROLES)          # 4 usuarios: uno por rol
MAX_DEVICES = 1                 # una licencia = un dispositivo
LICENSE_TYPES = ("TRIAL", "FULL", "ENTERPRISE", "LIFETIME")
PLATFORMS = {"web": "WEB", "android": "AND"}
PLATFORM_LABEL = {"web": "Web (navegador de esta PC)", "android": "Android (teléfono o tableta)"}
DEVICE_RE = re.compile(r"^(WEB|AND)-[A-Z2-7]{4}(?:-[A-Z2-7]{4}){4}$")
DEVICE_DOMAIN = b"NovaGest-Device-v1|"
PROOF_TAG = "NGPROOF1"
CLOCK_TOLERANCE = 10 * 60        # s: diferencia admitida entre relojes (servidor, dispositivo, red)
ISSUE_TOLERANCE = 5 * 60         # s: margen antes de la fecha de emisión
SERVER_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_KEYS_FILE = os.path.join(SERVER_DIR, "license_public_keys.pem")

LEGACY_MESSAGE = ("Esta clave tiene el formato anterior (no está ligada a un dispositivo) y ya no se acepta. "
                  "Solicite una licencia nueva para este equipo: se emite para su ID de dispositivo.")


class LicenseError(Exception):
    """Error de licencia con un código estable (para las apps) y un mensaje en español."""

    def __init__(self, code, message, **extra):
        super().__init__(message)
        self.code = code
        self.message = message
        self.extra = extra

    def as_dict(self):
        return {"code": self.code, "error": self.message, **self.extra}


# ------------------------------------------------------------------ base64url
def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def unb64u(text: str) -> bytes:
    text = str(text or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_\-]*", text):
        raise ValueError("base64url no válido")
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def b64any(text: str) -> bytes:
    """Acepta base64 estándar o base64url (los navegadores y Android usan uno u otro)."""
    t = re.sub(r"\s", "", str(text or ""))
    t = t.replace("+", "-").replace("/", "_").rstrip("=")
    return unb64u(t)


# ------------------------------------------------------------------ llaves públicas del emisor
def _require_crypto():
    if not CRYPTO_OK:
        raise LicenseError("CRYPTO_MISSING", "Falta el paquete «cryptography» (pip install -r requirements.txt).")


def spki_der(public_key) -> bytes:
    return public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)


def key_id(public_key) -> str:
    """Identificador corto de una llave pública (8 hex de SHA-256 de su SPKI)."""
    return hashlib.sha256(spki_der(public_key)).hexdigest()[:8]


def load_public_keys_text(text: str) -> dict:
    """{kid: llave} a partir de uno o varios bloques PEM «PUBLIC KEY» (rotación de llaves)."""
    if not CRYPTO_OK:
        return {}
    llaves = {}
    for bloque in re.findall(r"-----BEGIN PUBLIC KEY-----.+?-----END PUBLIC KEY-----", text or "", re.S):
        try:
            k = serialization.load_pem_public_key(bloque.encode("ascii"))
        except Exception:
            continue
        if isinstance(k, ec.EllipticCurvePublicKey) and k.curve.name == "secp256r1":
            llaves[key_id(k)] = k
    return llaves


def load_public_keys(path=PUBLIC_KEYS_FILE) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return load_public_keys_text(f.read())
    except OSError:
        return {}


# Llaves de confianza: SOLO las que vienen con el programa (server/license_public_keys.pem).
# A propósito no hay variable de entorno ni archivo en data/ que las sustituya: si las
# hubiera, cualquiera podría poner su propia llave y firmarse licencias.
PUBLIC_KEYS = load_public_keys()


def reload_public_keys():
    """Vuelve a leer las llaves de confianza (después de --init-keys). Conserva el mismo dict."""
    nuevas = load_public_keys(PUBLIC_KEYS_FILE)
    PUBLIC_KEYS.clear()
    PUBLIC_KEYS.update(nuevas)
    return PUBLIC_KEYS


def public_keys_status():
    return {"configured": bool(PUBLIC_KEYS), "keyIds": sorted(PUBLIC_KEYS)}


# ------------------------------------------------------------------ llave privada del EMISOR
# Vive solo en el equipo de quien emite las licencias (nunca en el servidor del cliente
# ni en el repositorio). Ruta: NOVAGEST_SIGNING_KEY o ~/.novagest-emisor/license-signing-key.pem
SIGNING_KEY_ENV = "NOVAGEST_SIGNING_KEY"
ANDROID_KEYS_FILE = os.path.join(os.path.dirname(SERVER_DIR), "app", "src", "main", "java", "com", "novagest",
                                 "inventario", "security", "LicensePublicKeys.kt")


def default_signing_key_path():
    return os.environ.get(SIGNING_KEY_ENV) or os.path.join(os.path.expanduser("~"), ".novagest-emisor", "license-signing-key.pem")


def load_signing_key(path=None, public_keys=None):
    """Llave privada del emisor. Lanza LicenseError si no está (equipos de clientes) o no es de confianza."""
    _require_crypto()
    ruta = path or default_signing_key_path()
    try:
        with open(ruta, "rb") as f:
            data = f.read()
    except OSError:
        raise LicenseError("SIGNING_KEY_MISSING",
                           "Solo el emisor puede generar licencias: en este equipo no está la llave privada de firma "
                           f"({ruta}). Las licencias se generan en el equipo del emisor (generador de licencias o "
                           "«python tools/generate_license.py»).")
    clave = os.environ.get("NOVAGEST_SIGNING_KEY_PASSWORD")
    try:
        k = serialization.load_pem_private_key(data, password=clave.encode() if clave else None)
    except TypeError:
        raise LicenseError("SIGNING_KEY_PASSWORD", "La llave privada de firma está protegida con contraseña: "
                                                   "defina NOVAGEST_SIGNING_KEY_PASSWORD.")
    except Exception:
        raise LicenseError("SIGNING_KEY_INVALID", f"La llave privada de firma ({ruta}) está dañada o la contraseña no es correcta.")
    if not isinstance(k, ec.EllipticCurvePrivateKey) or k.curve.name != "secp256r1":
        raise LicenseError("SIGNING_KEY_INVALID", "La llave privada de firma debe ser EC P-256.")
    confianza = PUBLIC_KEYS if public_keys is None else public_keys
    if key_id(k.public_key()) not in confianza:
        raise LicenseError("SIGNING_KEY_UNTRUSTED",
                           "La llave privada de firma no corresponde a ninguna llave pública de server/license_public_keys.pem: "
                           "las licencias que firmara no serían aceptadas. Ejecute «python tools/generate_license.py --init-keys».")
    return k


def signing_key_available():
    try:
        load_signing_key()
        return True
    except LicenseError:
        return False


def public_key_pem(public_key) -> str:
    return public_key.public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode("ascii")


def android_keys_source(keys: dict) -> str:
    """Código Kotlin con las llaves públicas de confianza (lo genera --init-keys)."""
    filas = ",\n".join(f'        "{kid}" to "{base64.b64encode(spki_der(k)).decode("ascii")}"' for kid, k in sorted(keys.items()))
    cuerpo = f"mapOf(\n{filas},\n    )" if keys else "emptyMap()"
    return (
        "package com.novagest.inventario.security\n\n"
        "/**\n"
        " * Llaves PÚBLICAS del emisor de licencias (SPKI en Base64, por identificador «kid»).\n"
        " * Archivo generado por «python tools/generate_license.py --init-keys»: no lo edite a mano.\n"
        " * Solo permiten VERIFICAR licencias; la llave privada nunca sale del equipo del emisor.\n"
        " */\n"
        "object LicensePublicKeys {\n"
        f"    val KEYS: Map<String, String> = {cuerpo}\n"
        "}\n"
    )


def init_signing_keys(private_path=None, public_path=None, android_path=None, force=False, password=None):
    """Crea la llave del emisor (si no existe) y publica su llave pública para el servidor y Android.

    Conserva las llaves públicas anteriores (las licencias ya emitidas siguen valiendo).
    Devuelve (kid, ruta_privada, creada_ahora).
    """
    _require_crypto()
    ruta = private_path or default_signing_key_path()
    public_path = public_path or PUBLIC_KEYS_FILE
    android_path = ANDROID_KEYS_FILE if android_path is None else android_path
    creada = False
    if os.path.exists(ruta) and not force:
        with open(ruta, "rb") as f:
            k = serialization.load_pem_private_key(f.read(), password=password.encode() if password else None)
    else:
        k = ec.generate_private_key(ec.SECP256R1())
        cifrado = (serialization.BestAvailableEncryption(password.encode()) if password else serialization.NoEncryption())
        os.makedirs(os.path.dirname(os.path.abspath(ruta)), exist_ok=True)
        tmp = ruta + ".tmp"
        with open(tmp, "wb") as f:
            f.write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, cifrado))
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
        os.replace(tmp, ruta)
        creada = True
    pub = k.public_key()
    kid = key_id(pub)
    try:
        with open(public_path, encoding="utf-8") as f:
            texto = f.read()
    except OSError:
        texto = ""
    llaves = load_public_keys_text(texto)
    if kid not in llaves:
        cabecera = (
            "# Llaves PÚBLICAS del emisor de licencias NovaGest (una por bloque; kid = 8 hex de SHA-256 del SPKI).\n"
            "# Generado por «python tools/generate_license.py --init-keys». Solo sirven para VERIFICAR licencias:\n"
            "# la llave privada que las firma nunca sale del equipo del emisor.\n")
        # Sin llaves todavía (archivo de muestra): se reescribe con la cabecera definitiva.
        texto = (texto.rstrip() + "\n" if llaves else cabecera) + f"# kid={kid} · {time.strftime('%Y-%m-%d')}\n" + public_key_pem(pub)
        with open(public_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(texto)
        llaves[kid] = pub
    if android_path:
        os.makedirs(os.path.dirname(android_path), exist_ok=True)
        with open(android_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(android_keys_source(llaves))
    return kid, ruta, creada


# ------------------------------------------------------------------ identidad del dispositivo
def device_id_from_spki(spki: bytes, platform: str) -> str:
    """ID del dispositivo = huella de su llave pública (no se puede elegir ni copiar sin la llave)."""
    platform = str(platform or "").lower()
    if platform not in PLATFORMS:
        raise LicenseError("DEVICE_PLATFORM", "Plataforma de dispositivo no válida (web o android).")
    digest = hashlib.sha256(DEVICE_DOMAIN + platform.encode("ascii") + b"|" + spki).digest()
    chars = base64.b32encode(digest).decode("ascii")[:20]
    return PLATFORMS[platform] + "-" + "-".join(chars[i:i + 4] for i in range(0, 20, 4))


def normalize_device_id(value) -> str:
    """Normaliza lo que se teclea o pega (minúsculas, espacios, guiones de más o de menos)."""
    t = re.sub(r"[^A-Za-z0-9]", "", str(value or "")).upper()
    if len(t) == 23 and t[:3] in ("WEB", "AND") and re.fullmatch(r"[A-Z2-7]{20}", t[3:]):
        body = t[3:]
        return t[:3] + "-" + "-".join(body[i:i + 4] for i in range(0, 20, 4))
    return str(value or "").strip().upper()


def valid_device_id(value) -> bool:
    return bool(DEVICE_RE.fullmatch(str(value or "")))


def platform_of(device_id) -> str:
    d = str(device_id or "")
    if d.startswith("WEB-"):
        return "web"
    if d.startswith("AND-"):
        return "android"
    return ""


def load_device_public_key(spki_b64: str):
    _require_crypto()
    try:
        k = serialization.load_der_public_key(b64any(spki_b64))
    except Exception:
        raise LicenseError("DEVICE_KEY", "La llave pública del dispositivo no es válida.")
    if not isinstance(k, ec.EllipticCurvePublicKey) or k.curve.name != "secp256r1":
        raise LicenseError("DEVICE_KEY", "La llave del dispositivo debe ser EC P-256.")
    return k


# ------------------------------------------------------------------ firmas
def _der_signature(sig: bytes) -> bytes:
    """WebCrypto firma en formato «crudo» r‖s (64 bytes); Java/Android en DER. Se aceptan ambos."""
    if len(sig) == 64:
        return encode_dss_signature(int.from_bytes(sig[:32], "big"), int.from_bytes(sig[32:], "big"))
    return sig


def verify_signature(public_key, message: bytes, signature: bytes) -> bool:
    _require_crypto()
    try:
        public_key.verify(_der_signature(signature), message, ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False


def sign_raw(private_key, message: bytes) -> bytes:
    """Firma ECDSA en formato crudo r‖s (64 bytes), el que verifican la Web y Android."""
    _require_crypto()
    r, s = decode_dss_signature(private_key.sign(message, ec.ECDSA(hashes.SHA256())))
    return r.to_bytes(32, "big") + s.to_bytes(32, "big")


def canonical_json(payload: dict) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True, ensure_ascii=False).encode("utf-8")


# ------------------------------------------------------------------ licencias
def build_payload(client_name, device_id, days=30, license_type="FULL", product="NovaGest",
                  features=None, license_id=None, issued_at=None, kid=""):
    """Contenido firmado de una licencia v2 (4 usuarios, 1 por rol, 1 dispositivo)."""
    device_id = normalize_device_id(device_id)
    if not valid_device_id(device_id):
        raise LicenseError("DEVICE_ID", "El ID de dispositivo no es válido. Debe ser como WEB-XXXX-XXXX-XXXX-XXXX-XXXX "
                                        "(Web) o AND-XXXX-XXXX-XXXX-XXXX-XXXX (Android), tal como aparece en la pantalla "
                                        "de licencia del equipo.")
    client_name = re.sub(r"[\x00-\x1f<>]", "", str(client_name or "")).strip()[:120]
    if not client_name:
        raise LicenseError("CLIENT_NAME", "Indique el nombre del cliente.")
    license_type = str(license_type or "FULL").upper()
    if license_type not in LICENSE_TYPES:
        license_type = "FULL"
    issued = int(issued_at if issued_at is not None else time.time())
    try:
        days = int(days)
    except (TypeError, ValueError):
        days = 0 if str(days).upper() in ("NEVER", "LIFETIME", "PERMANENTE") else 30
    if license_type == "LIFETIME":
        days = 0
    if days < 0:
        days = 0
    expires = 0 if days == 0 else issued + days * 86400
    return {
        "license_id": license_id or secrets.token_hex(8).upper(),
        "client_name": client_name,
        "product": product or "NovaGest",
        "type": license_type,
        "issued_at": issued,
        "expires_at": expires,
        "max_users": MAX_USERS,
        "max_devices": MAX_DEVICES,
        "roles": list(ROLES),
        "device_id": device_id,
        "platform": platform_of(device_id),
        "features": list(features or ["*"]),
        "version": LICENSE_VERSION,
        "kid": kid,
    }


def sign_license(payload: dict, private_key) -> str:
    """Clave NG2 firmada con la llave privada del emisor."""
    _require_crypto()
    payload = dict(payload)
    payload["kid"] = key_id(private_key.public_key())
    body = b64u(canonical_json(payload))
    return PREFIX + body + "." + b64u(sign_raw(private_key, body.encode("ascii")))


def clean_key(token) -> str:
    return re.sub(r"\s", "", str(token or ""))


def is_legacy_key(token) -> bool:
    t = clean_key(token)
    if not t or t.upper().startswith(PREFIX):
        return False
    return bool(re.match(r"(?i)^(NG-|CP-|TRIAL-)", t)) or "." in t


def parse_license(token, public_keys=None):
    """Verifica una clave NG2 y devuelve su contenido (dict). Lanza LicenseError si no vale.

    Comprueba: formato, firma del emisor (llave de confianza por «kid»), versión y que
    el contenido respete los límites fijos (4 usuarios, 1 por rol, 1 dispositivo).
    NO comprueba la caducidad ni el dispositivo que la usa (eso depende de la hora de
    confianza y de la prueba del dispositivo: ver check_license_for_device).
    """
    _require_crypto()
    keys = PUBLIC_KEYS if public_keys is None else public_keys
    t = clean_key(token)
    if not t:
        raise LicenseError("LICENSE_EMPTY", "Debe proporcionar la clave de licencia.")
    if not t.upper().startswith(PREFIX):
        if is_legacy_key(t):
            raise LicenseError("LICENSE_LEGACY", LEGACY_MESSAGE)
        raise LicenseError("LICENSE_FORMAT", "La clave no tiene el formato de NovaGest (debe empezar por NG2-). "
                                             "Cópiela completa, tal como la recibió.")
    t = t[len(PREFIX):]
    if t.count(".") != 1:
        raise LicenseError("LICENSE_FORMAT", "La clave está incompleta: debe tener una sola separación con punto. "
                                             "Cópiela completa, tal como la recibió.")
    body, sig = t.split(".", 1)
    try:
        payload = json.loads(unb64u(body).decode("utf-8"))
        signature = unb64u(sig)
    except Exception:
        raise LicenseError("LICENSE_FORMAT", "La clave está dañada o incompleta. Cópiela completa, tal como la recibió.")
    if not isinstance(payload, dict):
        raise LicenseError("LICENSE_FORMAT", "La clave está dañada.")
    if not keys:
        raise LicenseError("LICENSE_NO_PUBLIC_KEY",
                           "Este programa no tiene configurada la llave pública del emisor de licencias "
                           "(server/license_public_keys.pem). El emisor debe ejecutar una vez "
                           "«python tools/generate_license.py --init-keys» y distribuir el programa actualizado.")
    kid = str(payload.get("kid") or "")
    llave = keys.get(kid)
    if llave is None or not verify_signature(llave, body.encode("ascii"), signature):
        raise LicenseError("LICENSE_SIGNATURE", "La clave de licencia no es válida (firma incorrecta o de otro emisor). "
                                                "Verifique que la copió completa.")
    _validate_payload(payload)
    return payload


def _validate_payload(p):
    def mal(detalle):
        raise LicenseError("LICENSE_CONTENT", f"La licencia no es válida: {detalle}.")
    if p.get("version") != LICENSE_VERSION:
        mal("versión desconocida")
    if not valid_device_id(p.get("device_id")):
        mal("no indica un dispositivo válido")
    if p.get("platform") != platform_of(p.get("device_id")):
        mal("la plataforma no coincide con el dispositivo")
    if p.get("max_users") != MAX_USERS or p.get("max_devices") != MAX_DEVICES:
        mal("límites de usuarios o dispositivos no permitidos")
    if list(p.get("roles") or []) != list(ROLES):
        mal("roles no permitidos")
    if p.get("type") not in LICENSE_TYPES:
        mal("tipo desconocido")
    for campo in ("issued_at", "expires_at"):
        if not isinstance(p.get(campo), int) or isinstance(p.get(campo), bool) or p.get(campo) < 0:
            mal(f"fecha «{campo}» incorrecta")
    if p["expires_at"] and p["expires_at"] <= p["issued_at"]:
        mal("la caducidad es anterior a la emisión")
    if not str(p.get("client_name") or "").strip():
        mal("sin cliente")


def license_time_state(payload, trusted_now):
    """'ok' | 'expired' | 'not_yet' según la hora de confianza."""
    if trusted_now < int(payload.get("issued_at", 0)) - ISSUE_TOLERANCE:
        return "not_yet"
    exp = int(payload.get("expires_at", 0))
    if exp and trusted_now >= exp:
        return "expired"
    return "ok"


def days_left(payload, trusted_now):
    exp = int(payload.get("expires_at", 0))
    if not exp:
        return -1
    return max(0, (exp - int(trusted_now)) // 86400)


# ------------------------------------------------------------------ prueba de posesión del dispositivo
def proof_message(purpose, nonce, device_id, client_ms, extra="") -> bytes:
    return f"{PROOF_TAG}|{purpose}|{nonce}|{device_id}|{int(client_ms)}|{extra}".encode("utf-8")


def verify_device_proof(proof, purpose, extra=""):
    """Comprueba la firma del dispositivo y devuelve (device_id, platform, client_ms).

    No consume el desafío (nonce): lo hace quien llama, que es quien lo emitió.
    """
    _require_crypto()
    if not isinstance(proof, dict):
        raise LicenseError("DEVICE_PROOF_REQUIRED", "Falta la prueba de identidad del dispositivo. Actualice la página "
                                                    "(o la app) y vuelva a intentarlo.")
    platform = str(proof.get("platform") or "").lower()
    if platform not in PLATFORMS:
        raise LicenseError("DEVICE_PROOF", "Plataforma de dispositivo no válida.")
    llave = load_device_public_key(proof.get("spki") or proof.get("publicKey") or "")
    device_id = device_id_from_spki(spki_der(llave), platform)
    declarado = normalize_device_id(proof.get("deviceId") or proof.get("device_id") or "")
    if declarado and declarado != device_id:
        raise LicenseError("DEVICE_PROOF", "El ID de dispositivo no corresponde a su llave.")
    if str(proof.get("purpose") or purpose) != purpose:
        raise LicenseError("DEVICE_PROOF", "La prueba del dispositivo es para otra operación.")
    try:
        client_ms = int(proof.get("clientTime") or proof.get("client_ms") or 0)
        firma = b64any(proof.get("signature") or "")
    except (TypeError, ValueError):
        raise LicenseError("DEVICE_PROOF", "La prueba del dispositivo está dañada.")
    nonce = str(proof.get("nonce") or "")
    if not nonce:
        raise LicenseError("DEVICE_PROOF", "La prueba del dispositivo no trae el desafío del servidor.")
    if not verify_signature(llave, proof_message(purpose, nonce, device_id, client_ms, extra), firma):
        raise LicenseError("DEVICE_PROOF", "La firma del dispositivo no es válida.")
    return device_id, platform, client_ms


# ------------------------------------------------------------------ huella del navegador (Web)
FINGERPRINT_KEYS = ("platform", "cores", "memory", "screen", "timezone", "languages", "gpu", "touch")


def fingerprint_distance(old, new):
    """Cuántos componentes de la huella cambiaron (solo cuenta los que traen ambos)."""
    if not isinstance(old, dict) or not isinstance(new, dict):
        return 0
    return sum(1 for k in FINGERPRINT_KEYS if k in old and k in new and str(old[k]) != str(new[k]))


def clean_fingerprint(fp):
    if not isinstance(fp, dict):
        return {}
    return {k: str(fp.get(k))[:200] for k in FINGERPRINT_KEYS if fp.get(k) not in (None, "")}
