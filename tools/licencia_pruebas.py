"""
Utilidades de PRUEBA para las licencias v2 (no forman parte de la app).

  · Emisor: una llave de firma temporal que las pruebas instalan como «de confianza»
    SOLO en memoria (novagest_license.PUBLIC_KEYS) y como llave del emisor
    (NOVAGEST_SIGNING_KEY → archivo temporal). Nunca toca server/license_public_keys.pem.
  · Dispositivo: un navegador/teléfono simulado con su propia llave P-256; calcula su
    ID (WEB-…/AND-…) igual que la Web y Android y firma las pruebas de posesión.
  · servidor_en_hilo(): arranca el servidor HTTP de NovaGest dentro del proceso de prueba.
"""
import hashlib
import json
import os
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.request
import http.cookiejar

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.join(RAIZ, "server") not in sys.path:
    sys.path.insert(0, os.path.join(RAIZ, "server"))

from cryptography.hazmat.primitives import serialization  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402

import novagest_license as L  # noqa: E402

HUELLA_PC = {"platform": "Win32", "cores": "8", "memory": "8", "screen": "1920x1080x24",
             "timezone": "America/Havana", "languages": "es-ES,es", "gpu": "ANGLE (Intel UHD 620)", "touch": "0"}


class Emisor:
    """Llave de firma de pruebas (equivale a la del emisor real)."""

    def __init__(self):
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.kid = L.key_id(self.key.public_key())
        carpeta = tempfile.mkdtemp(prefix="ng-emisor-")
        self.path = os.path.join(carpeta, "license-signing-key.pem")
        with open(self.path, "wb") as f:
            f.write(self.key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                           serialization.NoEncryption()))

    def instalar(self):
        """Confía en esta llave (solo en memoria) y la usa como llave del emisor."""
        L.PUBLIC_KEYS.clear()
        L.PUBLIC_KEYS[self.kid] = self.key.public_key()
        os.environ["NOVAGEST_SIGNING_KEY"] = self.path
        return self

    def emitir(self, cliente, device_id, dias=30, tipo="FULL", issued_at=None):
        return L.sign_license(L.build_payload(cliente, device_id, dias, tipo, issued_at=issued_at), self.key)


class Dispositivo:
    """Navegador (web) o teléfono (android) simulado con su llave privada."""

    def __init__(self, platform="web", huella=None):
        self.platform = platform
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.spki = L.spki_der(self.key.public_key())
        self.id = L.device_id_from_spki(self.spki, platform)
        self.huella = dict(huella or (HUELLA_PC if platform == "web" else {}))

    def prueba(self, purpose, nonce, extra="", ms=None, huella=None, firma_der=False):
        ms = int(time.time() * 1000) if ms is None else int(ms)
        msg = L.proof_message(purpose, nonce, self.id, ms, extra)
        if firma_der:  # Android/Java firman en DER
            from cryptography.hazmat.primitives import hashes
            import base64
            firma = base64.b64encode(self.key.sign(msg, ec.ECDSA(hashes.SHA256()))).decode()
        else:          # WebCrypto firma en crudo r‖s
            firma = L.b64u(L.sign_raw(self.key, msg))
        p = {"platform": self.platform, "spki": L.b64u(self.spki), "deviceId": self.id, "purpose": purpose,
             "nonce": nonce, "clientTime": ms, "signature": firma}
        if self.platform == "web":
            p["fingerprint"] = dict(huella or self.huella)
        return p


class Cliente:
    """Cliente HTTP con cookies contra el servidor de NovaGest."""

    def __init__(self, base):
        self.base = base
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.headers = {}

    def __call__(self, method, path, body=None, headers=None):
        req = urllib.request.Request(self.base + path, method=method,
                                     data=json.dumps(body).encode() if body is not None else None,
                                     headers={"Content-Type": "application/json", "X-CP": "1", **self.headers, **(headers or {})})
        try:
            with self.opener.open(req, timeout=20) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            crudo = e.read() or b"{}"
            try:
                return e.code, json.loads(crudo)
            except ValueError:
                return e.code, {"raw": crudo[:300]}

    def desafio(self, purpose):
        code, d = self("POST", "/api/license/challenge", {"purpose": purpose})
        assert code == 200 and d.get("nonce"), f"sin desafío: {code} {d}"
        return d["nonce"]

    def activar(self, dispositivo, clave, **kw):
        extra = hashlib.sha256(L.clean_key(clave).encode()).hexdigest()[:16]
        return self("POST", "/api/license/activate",
                    {"license_key": clave, "deviceProof": dispositivo.prueba("activate", self.desafio("activate"), extra, **kw)})

    def entrar(self, dispositivo, usuario, clave, codigo=None, **kw):
        cuerpo = {"username": usuario, "password": clave,
                  "deviceProof": dispositivo.prueba("login", self.desafio("login"), usuario.lower(), **kw)}
        if codigo:
            cuerpo["code"] = codigo
        return self("POST", "/api/login", cuerpo)

    def renovar_prueba(self, dispositivo, **kw):
        return self("POST", "/api/license/proof", {"deviceProof": dispositivo.prueba("proof", self.desafio("proof"), **kw)})


def servidor_en_hilo(srv):
    """Arranca el servidor de NovaGest (módulo ya importado) en un puerto libre."""
    httpd = srv.ThreadingHTTPServer(("127.0.0.1", 0), srv.Api)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"
