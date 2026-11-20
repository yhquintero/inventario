#!/usr/bin/env python3
"""La Web obtiene cookie HttpOnly; solo Android recibe token Bearer en JSON."""
import importlib.util
import os
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
os.environ.update(DATA_DIR=tempfile.mkdtemp(prefix="ng-login-cookie-"),
                  NOVAGEST_DEMO_USERS="1", REQUIRE_ADMIN_TOTP="0", LICENSE_SECRET="test-login-secret")
spec = importlib.util.spec_from_file_location("ng_login_cookie", ROOT / "server" / "novagest_server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)
server.init_db()

class Request:
    def __init__(self, client=""):
        self.headers = {"X-CP-Client": client, "User-Agent": "test"}
        self.response = None
    def body(self):
        return {"username": "admin", "password": "Admin123!"}
    def ip(self):
        return "127.0.0.1"
    def cookie(self, token, clear=False):
        return f"cp_session={'' if clear else token}; Path=/; HttpOnly; SameSite=Strict"
    def err(self, code, message):
        self.response = (code, {"error": message}, ())
        return self.response
    def send_json(self, code, data, cookies=(), **_kwargs):
        self.response = (code, data, cookies)
        return self.response

route = server.ROUTES[("POST", "/api/login")]
web = Request(); route(web, "")
assert web.response[0] == 200
assert "token" not in web.response[1]
assert any("HttpOnly" in cookie for cookie in web.response[2])
android = Request("android"); route(android, "")
assert android.response[0] == 200 and android.response[1].get("token")
print("OK — Web cookie HttpOnly sin Bearer; Android recibe Bearer explícitamente")
