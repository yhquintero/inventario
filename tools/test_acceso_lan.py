#!/usr/bin/env python3
"""Comprueba que la API escucha por la IP LAN, no solo por loopback."""
import json
import os
import pathlib
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent


def local_interface_ip():
    candidates = []
    try:
        candidates.extend(
            item[4][0]
            for item in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)
        )
    except OSError:
        pass
    # UDP connect solo consulta la ruta local; no envía paquetes al destino TEST-NET.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
            route.connect(("192.0.2.1", 80))
            candidates.append(route.getsockname()[0])
    except OSError:
        pass
    return next(
        (ip for ip in candidates if not ip.startswith(("127.", "169.254."))),
        None,
    )


host = local_interface_ip()
if not host:
    source = (ROOT / "server" / "novagest_server.py").read_text(encoding="utf-8")
    if 'ThreadingHTTPServer(("0.0.0.0", port)' not in source:
        raise SystemExit("El servidor dejó de enlazar 0.0.0.0 y este entorno no ofrece interfaz LAN para probarlo")
    print("SKIP — este entorno no tiene interfaz IPv4 no-loopback; enlace 0.0.0.0 verificado estáticamente.")
    raise SystemExit(0)

with socket.socket() as reserve:
    reserve.bind(("0.0.0.0", 0))
    port = reserve.getsockname()[1]
base = f"http://{host}:{port}"

with tempfile.TemporaryDirectory(prefix="novagest-lan-test-") as data_dir:
    env = {
        **os.environ,
        "DATA_DIR": data_dir,
        "PORT": str(port),
        "NOVAGEST_DEMO_USERS": "0",
        "NOVAGEST_ADMIN_PASSWORD": "LAN-test-only-pass-2026!",
        "LICENSE_SECRET": "LAN-test-only-secret-2026",
        "REQUIRE_ADMIN_TOTP": "0",
        "REQUIRE_HTTPS": "0",
    }
    env.pop("SSL_CERT", None)
    env.pop("SSL_KEY", None)
    log_path = pathlib.Path(data_dir) / "server.log"
    with log_path.open("w+", encoding="utf-8") as log:
        server = subprocess.Popen(
            [sys.executable, str(ROOT / "server" / "novagest_server.py")],
            cwd=ROOT,
            env=env,
            stdout=log,
            stderr=subprocess.STDOUT,
        )
        try:
            for _ in range(80):
                if server.poll() is not None:
                    log.seek(0)
                    raise SystemExit(f"Servidor temporal salió {server.returncode}:\n{log.read()}")
                try:
                    request = urllib.request.Request(base + "/api/health", headers={"Connection": "close"})
                    with urllib.request.urlopen(request, timeout=1) as response:
                        payload = json.load(response)
                    if payload.get("ok") and payload.get("app") == "NovaGest":
                        font_url = base + "/public/fonts/inter-latin-wght-normal.woff2"
                        with urllib.request.urlopen(font_url, timeout=3) as font_response:
                            font = font_response.read()
                            content_type = font_response.headers.get_content_type()
                        if content_type != "font/woff2" or len(font) < 10_000:
                            raise SystemExit("La fuente local no se sirve como WOFF2 íntegro por la LAN")
                        print(f"OK — API y fuente descargable accesibles por interfaz LAN ({host}:{port}).")
                        break
                except OSError:
                    time.sleep(0.25)
            else:
                log.seek(0)
                raise SystemExit(
                    f"La API no respondió por {host}:{port}; salida del servidor:\n{log.read()}"
                )
        finally:
            if server.poll() is None:
                server.terminate()
                try:
                    server.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    server.kill()
                    server.wait(timeout=5)
