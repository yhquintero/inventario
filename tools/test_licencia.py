#!/usr/bin/env python3
"""
Pruebas del flujo de licencias de NovaGest (servidor).

    python3 tools/test_licencia.py

Comprueba, sin arrancar el servidor HTTP:
  · el texto exacto de la solicitud que se envía por WhatsApp (Web y Android),
  · los 8 plazos publicados y el plazo por defecto,
  · el registro de solicitudes en la base de datos (con deduplicación),
  · los estados (pendiente / atendida / descartada) y los conteos,
  · la conversión de una solicitud en licencia (nombre y plazo de la propia solicitud).
"""
import datetime as dt
import os
import re
import sys
import tempfile

os.environ["DATA_DIR"] = os.environ.get("DATA_DIR") or tempfile.mkdtemp(prefix="novagest-lic-")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "server"))

import novagest_server as srv  # noqa: E402  (necesita DATA_DIR antes de importar)

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


def reset():
    srv.q("DELETE FROM license_requests")
    srv.q("DELETE FROM licenses WHERE created_by='prueba'")


def pedir(**body):
    body.setdefault("client_name", "Tienda Nova")
    body.setdefault("device_id", "web-hhsp9rqlmv5zhygs")
    body.setdefault("device_info", "Mozilla/5.0 Chrome")
    row, dup = srv.register_license_request(body, "10.0.0.5", body["device_info"])
    return srv.license_request_public(row), dup


def _generate_from_request(req_id):
    """Reproduce lo que hace POST /api/license/generate con request_id."""
    row = srv.q("SELECT * FROM license_requests WHERE id=?", (req_id,), one=True)
    term = srv.license_term(row["term"])
    payload = srv.generate_license_payload(client_name=row["client_name"], product=srv.LICENSE_PRODUCT,
                                           license_type=term["type"], days=term["days"], max_users=20, max_devices=10)
    token = srv.create_license_token(payload)
    srv.q("INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users, max_devices, features, active, created_by, created_at, last_verified, metadata)"
          " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          (token, payload["client_name"], payload["product"], payload["type"], payload["issued_at"], payload["expires_at"],
           payload["max_users"], payload["max_devices"], '["*"]', 0, "prueba", srv.now(), srv.now(), '{}'))
    lic = srv.q("SELECT id FROM licenses WHERE key=?", (token,), one=True)
    preview = f"{token[:18]}…{token[-8:]}"
    srv.q("UPDATE license_requests SET status='atendida', handled_at=?, handled_by=?, license_id=?, license_preview=? WHERE id=?",
          (srv.now(), "prueba", lic["id"], preview, req_id))
    return token


print("\nLicencia · Solicitudes por WhatsApp y gestión\n")

def prueba_mensaje():
    msg = srv.license_request_message("Tienda Nova", "web-hhsp9rqlmv5zhygs", "MES", when=1791856318)
    lineas = msg.split("\n")
    _check(len(lineas) == 7, f"líneas: {len(lineas)}")
    _check(lineas[0] == "Hola, solicito activar mi Licencia de NovaGest.", lineas[0])
    _check(lineas[1] == "", "falta la línea en blanco tras el saludo")
    _check(lineas[2] == "👤 Usuario: Tienda Nova", lineas[2])
    _check(lineas[3] == "🆔 ID Dispositivo: web-hhsp9rqlmv5zhygs", lineas[3])
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


test("una solicitud se convierte en licencia con su nombre y su plazo", lambda: (
    reset(),
    (req := pedir(client_name="Bodega Sol", term="SEMESTRE", channel="android", device_id="android-4f2a91cc")[0]),
    (tok := _generate_from_request(req["id"])),
    (payload := srv.verify_license_token(tok)),
    _check(payload["client_name"] == "Bodega Sol", str(payload and payload.get("client_name"))),
    _check(payload["type"] == "FULL" and payload["expires_at"] > srv.now(), "el plazo del semestre debe estar vigente"),
    (round(srv.license_requests_list("atendida")[0]["id"]) == req["id"], True),
    _check(srv.license_requests_list("atendida")[0]["id"] == req["id"], "la solicitud debe quedar atendida"),
    _check(bool(srv.license_requests_list("atendida")[0]["licensePreview"]), "debe guardar la vista previa de la clave"),
))


test("la activación marca como atendidas las solicitudes pendientes del equipo", lambda: (
    reset(),
    pedir(device_id="web-equipo-1", term="MES"),
    pedir(device_id="web-equipo-1", term="ANIO"),
    pedir(device_id="web-equipo-2", term="MES"),
    srv.q("UPDATE license_requests SET status='atendida', handled_at=?, handled_by='activación' WHERE device_id=? AND status='pendiente'",
          (srv.now(), "web-equipo-1")),
    _check(srv.license_request_counts()["pendiente"] == 1, str(srv.license_request_counts())),
    _check([r["deviceId"] for r in srv.license_requests_list("pendiente")] == ["web-equipo-2"], "solo queda el otro equipo"),
))


test("la fecha de la solicitud usa el formato es-CU de la Web", lambda: (
    lambda txt: _check(re.fullmatch(r"\d{2}/\d{2}/\d{4}, \d{1,2}:\d{2}:\d{2} [ap]\.m\.", txt) is not None, txt)
)(srv.license_fmt_date(1791856318)))


test("la tabla license_requests existe en la base de datos creada", lambda: (
    _check(srv.q("SELECT COUNT(*) AS c FROM license_requests", one=True) is not None, "falta la tabla"),
))

reset()
print(f"\n{ok} pruebas correctas, {fail} fallidas\n")
sys.exit(1 if fail else 0)
