#!/usr/bin/env python3
"""Ejecuta la auditoría HTTP contra un NovaGest temporal, aislado y sin datos reales."""
import base64
import hashlib
import hmac
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent

with socket.socket() as reserve:
    reserve.bind(("127.0.0.1", 0))
    port = reserve.getsockname()[1]
base = f"http://127.0.0.1:{port}"
license_secret = "audit-only-secret$not-base64-2026"
payload = {
    "client_name": "Auditoría local",
    "expires_at": 0,
    "features": ["*"],
    "issued_at": int(time.time()),
    "license_id": "AUDIT-ONLY",
    "max_devices": 20,
    "max_users": 20,
    "product": "NovaGest",
    "type": "LIFETIME",
    "version": 1,
}
payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()).decode().rstrip("=")
signature = base64.urlsafe_b64encode(hmac.new(license_secret.encode(), payload_b64.encode(), hashlib.sha256).digest()).decode().rstrip("=")
license_token = f"{payload_b64}.{signature}"

with tempfile.TemporaryDirectory(prefix="ng-auditoria-http-") as data_dir:
    env = {
        **os.environ,
        "DATA_DIR": data_dir,
        "PORT": str(port),
        "NOVAGEST_DEMO_USERS": "0",
        "NOVAGEST_ADMIN_PASSWORD": "Test-only-Admin-123!",
        "LICENSE_SECRET": license_secret,
        "REQUIRE_ADMIN_TOTP": "0",
    }
    server_log = open(pathlib.Path(data_dir) / "server.log", "w+", encoding="utf-8")
    server = subprocess.Popen(
        [sys.executable, str(ROOT / "server" / "novagest_server.py")],
        cwd=ROOT,
        env=env,
        stdout=server_log,
        stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(80):
            if server.poll() is not None:
                server_log.seek(0)
                raise SystemExit(
                    f"Servidor temporal salió con código {server.returncode}: {server_log.read()}"
                )
            try:
                with urllib.request.urlopen(base + "/api/health", timeout=1) as response:
                    if response.status == 200:
                        break
            except (OSError, urllib.error.URLError):
                time.sleep(0.25)
        else:
            raise SystemExit("El servidor temporal no quedó disponible para la auditoría HTTP")

        activation = urllib.request.Request(
            base + "/api/license/activate",
            data=json.dumps({"license_key": license_token, "device_id": "test-auditoria-http"}).encode(),
            headers={"Content-Type": "application/json", "X-CP": "1"},
            method="POST",
        )
        with urllib.request.urlopen(activation, timeout=5) as response:
            if response.status != 200:
                raise SystemExit("No se pudo activar la licencia temporal de pruebas")

        # La tipografía debe descargarse del servidor de la tienda, no de un CDN.
        with urllib.request.urlopen(base + "/public/fonts/inter-latin-wght-normal.woff2", timeout=5) as response:
            font_bytes = response.read()
            if response.headers.get_content_type() != "font/woff2" or len(font_bytes) < 10_000:
                raise SystemExit("La fuente local no se sirvió como WOFF2 íntegro")
        print("OK — fuente Inter descargada desde el servidor local (WOFF2).")

        result = subprocess.run(
            [sys.executable, str(ROOT / "tools" / "auditoria_seguridad.py"), base],
            cwd=ROOT,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            check=False,
        )
        print(result.stdout, end="")
        if result.returncode:
            raise SystemExit(result.returncode)
    finally:
        if server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
        server_log.close()
