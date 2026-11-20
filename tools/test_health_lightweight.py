#!/usr/bin/env python3
"""Asegura que el ping público no ejecuta inspecciones administrativas costosas."""
import os
import pathlib
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
TMP = tempfile.mkdtemp(prefix="novagest-health-light-")
os.environ.update({
    "DATA_DIR": TMP,
    "BACKUP_DIR": str(pathlib.Path(TMP) / "backups"),
    "LICENSE_SECRET": "test-health-lightweight-secret",
    "NOVAGEST_DEMO_USERS": "0",
})
sys.path.insert(0, str(ROOT / "server"))

try:
    import novagest_server as server

    class Handler:
        response = None

        def auth(self):
            return None

        def secure(self):
            return True

        def send_json(self, status, payload):
            self.response = (status, payload)

    def forbidden(*_args, **_kwargs):
        raise AssertionError("El ping público ejecutó una inspección reservada a administradores")

    server.q = lambda *_args, **_kwargs: {"ok": 1}
    server.get_active_license_info = forbidden
    server.backup_health = forbidden
    server.disk_health = forbidden
    server.license_health = forbidden
    server.copias_externas.estado_salud = forbidden

    handler = Handler()
    server.health(handler, None, None)
    status, payload = handler.response
    assert status == 200
    assert payload["ok"] is True and payload["app"] == "NovaGest"
    assert len(payload["instanceId"]) == 16
    assert set(payload["salud"]) == {"estado", "uptimeSegundos", "latenciaMs"}
    print("OK — /api/health público usa solo el ping SQLite mínimo; no inspecciona licencia, copias o disco")
finally:
    module = sys.modules.get("novagest_server")
    if module is not None:
        try:
            module.CON.close()
        except Exception:
            pass
    shutil.rmtree(TMP, ignore_errors=True)
