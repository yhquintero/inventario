#!/usr/bin/env python3
"""
Generador de Licencias NovaGest — herramienta INDEPENDIENTE de la Web.

Se ejecuta aparte de la Web y del servidor de NovaGest (su propio proceso y
puerto) para crear claves de licencia firmadas y enviar la generación al
cliente por WhatsApp con un solo clic (enlace wa.me con el mensaje listo).

Uso:
  python3 tools/license_studio.py                      # http://localhost:8777
  python3 tools/license_studio.py --open               # además abre el navegador
  python3 tools/license_studio.py --port 9000          # otro puerto
  python3 tools/license_studio.py --host 127.0.0.1     # solo esta máquina
  python3 tools/license_studio.py --data /ruta/a/data  # secreto y BD de esa instalación

La clave se firma con el MISMO secreto que la instalación del cliente
(LICENSE_SECRET / LICENSE_KEY / BACKUP_KEY o data/license.key), así que solo
verifica en ese servidor: para generar desde otra máquina exporte el mismo
LICENSE_SECRET o apunte --data a la carpeta data del servidor del cliente.

Si encuentra data/novagest.db lista las solicitudes de licencia recibidas por
WhatsApp (Web y Android), crea su clave en un clic con el nombre y el plazo
pedidos, la marca como atendida y prepara el mensaje para el cliente.

Es la misma clave y el mismo mensaje de WhatsApp que producen el panel
«🔐 Gestionar licencia» de la Web y tools/generate_license.py.
"""
import argparse
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)

# Mismo plazo y firma que la Web, el servidor y tools/generate_license.py
import generate_license as gen  # noqa: E402

PRODUCT = os.environ.get("LICENSE_PRODUCT", "NovaGest")
APP_VERSION = "1.0.0"
TERMS = [
    {"id": "DIA", "label": "1 día", "days": 1, "type": "FULL"},
    {"id": "SEMANA", "label": "1 semana", "days": 7, "type": "FULL"},
    {"id": "MES", "label": "1 mes", "days": 30, "type": "FULL"},
    {"id": "TRIMESTRE", "label": "3 meses", "days": 90, "type": "FULL"},
    {"id": "SEMESTRE", "label": "6 meses", "days": 180, "type": "FULL"},
    {"id": "ANIO", "label": "1 año", "days": 365, "type": "FULL"},
    {"id": "DOS_ANIOS", "label": "2 años", "days": 730, "type": "FULL"},
    {"id": "PERMANENTE", "label": "Permanente", "days": 0, "type": "LIFETIME"},
]
LICENSE_TYPES = ("TRIAL", "FULL", "ENTERPRISE", "LIFETIME")
WHATSAPP_DEFAULT = re.sub(r"\D", "", os.environ.get("LICENSE_WHATSAPP")
                          or os.environ.get("NOVAGEST_WHATSAPP")
                          or os.environ.get("WHATSAPP_NUMBER") or "")


def term_of(term_id):
    """Devuelve el plazo pedido (o 1 mes por defecto)."""
    return next((t for t in TERMS if t["id"] == str(term_id or "").upper()), None) or TERMS[2]


# ------------------------------------------------------------------ secreto y base de datos
def secret_source():
    """Describe de dónde sale el secreto de firma (NUNCA muestra el valor)."""
    for env_key in ("LICENSE_SECRET", "LICENSE_KEY", "BACKUP_KEY"):
        if os.environ.get(env_key):
            return f"variable de entorno {env_key}"
    if os.path.exists(gen.LICENSE_FILE):
        return f"archivo {gen.LICENSE_FILE}"
    return f"se creará uno nuevo en {gen.LICENSE_FILE}"


def db_available():
    return os.path.exists(gen.db_path())


def db_connect():
    con = sqlite3.connect(gen.db_path(), timeout=10)
    con.row_factory = sqlite3.Row
    return con


def request_public(r):
    return {
        "id": r["id"],
        "clientName": r["client_name"],
        "deviceId": r["device_id"],
        "phone": r["phone"] or "",
        "term": r["term"] or "MES",
        "termLabel": r["term_label"] or term_of(r["term"])["label"],
        "type": r["license_type"] or "FULL",
        "days": r["days"] if r["days"] is not None else term_of(r["term"])["days"],
        "channel": r["channel"] or "web",
        "status": r["status"] or "pendiente",
        "createdAt": r["created_at"],
        "message": r["message"] or "",
    }


def list_requests(limit=100):
    if not db_available():
        return []
    con = db_connect()
    try:
        rows = con.execute(
            "SELECT * FROM license_requests ORDER BY CASE status WHEN 'pendiente' THEN 0 ELSE 1 END,"
            " created_at DESC, id DESC LIMIT ?", (int(limit),)).fetchall()
        return [request_public(r) for r in rows]
    finally:
        con.close()


def save_license_row(payload, token):
    """Registra la clave en la BD del servidor (si hay BD) para verla en «Licencias y equipos»."""
    if not db_available():
        return None
    try:
        con = db_connect()
        try:
            con.execute(
                "INSERT INTO licenses(key, client_name, product, type, issued_at, expires_at, max_users,"
                " max_devices, features, active, created_by, created_at, last_verified, metadata)"
                " VALUES(?,?,?,?,?,?,?,?,?,0,?,?,?,?)",
                (token, payload["client_name"], payload["product"], payload["type"],
                 payload["issued_at"], payload["expires_at"], payload["max_users"], payload["max_devices"],
                 json.dumps(payload["features"], ensure_ascii=False), "license_studio.py",
                 int(time.time()), int(time.time()),
                 json.dumps({"generated_by": "license_studio.py", "license_id": payload["license_id"]},
                            ensure_ascii=False)))
            con.commit()
            row = con.execute("SELECT id FROM licenses WHERE key=?", (token,)).fetchone()
            return row["id"] if row else None
        finally:
            con.close()
    except Exception as e:
        print(f"[GENERADOR] No se pudo registrar la clave en la BD: {e}", flush=True)
        return None


def close_request(req_id, token, license_row_id):
    """Marca la solicitud como atendida (igual que el panel de la Web y la CLI)."""
    if not db_available():
        return
    pretty = f"NG-{token}"
    preview = pretty[:18] + "…" + pretty[-8:] if len(pretty) > 30 else pretty
    try:
        con = db_connect()
        try:
            con.execute(
                "UPDATE license_requests SET status='atendida', handled_at=?, handled_by='license_studio.py',"
                " license_id=?, license_preview=? WHERE id=?",
                (int(time.time()), license_row_id, preview, int(req_id)))
            con.commit()
        finally:
            con.close()
    except Exception as e:
        print(f"[GENERADOR] No se pudo actualizar la solicitud #{req_id}: {e}", flush=True)


# ------------------------------------------------------------------ licencia y mensaje WhatsApp
def fmt_date(ts):
    return time.strftime("%d/%m/%Y", time.localtime(ts)) if ts else "Permanente"


def build_license(client, term_id, ltype=None, users=20, devices=10, features="*"):
    """Crea el payload firmado con el MISMO formato que el servidor acepta."""
    term = term_of(term_id)
    ltype = str(ltype or term["type"] or "FULL").upper()
    if ltype not in LICENSE_TYPES:
        ltype = term["type"] if term["days"] == 0 else "FULL"
    issued = int(time.time())
    expires = 0 if term["days"] == 0 else issued + term["days"] * 86400
    payload = {
        "license_id": secrets.token_hex(8).upper(),
        "client_name": str(client or "").strip()[:120] or "NovaGest",
        "product": PRODUCT,
        "type": ltype,
        "issued_at": issued,
        "expires_at": expires,
        "max_users": int(users or 20),
        "max_devices": int(devices or 10),
        "features": [f.strip() for f in str(features or "*").split(",") if f.strip()] or ["*"],
        "version": 1,
    }
    token = gen.create_token(payload)
    return term, payload, token


def key_message(client_name, key, term, payload):
    """Mensaje de la clave — idéntico al que envía la Web (LicenseManager.keyMessage)."""
    dias = f" ({term['days']} días)" if term["days"] else ""
    plan = f"{term['label']}{dias} · {term['type']}"
    vigencia = f"hasta el {fmt_date(payload['expires_at'])}" if payload["expires_at"] else "permanente"
    return "\n".join([
        f"🔐 Tu Licencia de {PRODUCT} ya está lista.",
        "",
        f"👤 Usuario: {str(client_name or '').strip()}",
        f"📅 Plan: {plan}",
        f"⏳ Vigencia: {vigencia}",
        "",
        "Pega esta clave en la App en «Licencia de uso → Activar licencia»:",
        "",
        str(key or "").strip(),
    ])


def whatsapp_url(message, phone=""):
    """Enlace wa.me al teléfono del cliente (o selector de contacto si no hay número)."""
    num = re.sub(r"\D", "", str(phone or WHATSAPP_DEFAULT or ""))
    text = quote(message, safe="")
    return f"https://wa.me/{num}?text={text}" if num else f"https://api.whatsapp.com/send?text={text}"


def generate_result(client, phone, term_id, ltype=None, users=20, devices=10, features="*", request=None):
    """Genera la licencia, la registra si hay BD y devuelve todo listo para WhatsApp."""
    if request:
        client = request.get("clientName") or client
        term_id = request.get("term") or term_id
        phone = phone or request.get("phone") or ""
    term, payload, token = build_license(client, term_id, ltype, users, devices, features)
    msg = key_message(payload["client_name"], token, term, payload)
    row_id = save_license_row(payload, token)
    if request:
        close_request(request["id"], token, row_id)
    return {
        "ok": True,
        "licenseKey": token,
        "formattedKey": f"NG-{token}",
        "payload": payload,
        "term": term,
        "message": msg,
        "whatsappUrl": whatsapp_url(msg, phone),
        "phone": re.sub(r"\D", "", str(phone or WHATSAPP_DEFAULT or "")),
        "savedToDb": row_id is not None,
        "request": request,
    }


# ------------------------------------------------------------------ interfaz web propia
INDEX_HTML = r"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Generador de Licencias · NovaGest</title>
<link rel="icon" href="data:,">
<style>
  :root {
    --bg: #f2f4f8; --card: #ffffff; --ink: #17233b; --muted: #5b6b85;
    --line: #d9e0ec; --brand: #1f4fd8; --brand-ink: #ffffff; --ok: #25d366;
    --warn-bg: #fff6e5; --warn-ink: #7a5200; --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--ink); }
  header { background: linear-gradient(120deg, #14264f, #1f4fd8); color: #fff; padding: 22px 20px 18px; }
  header h1 { margin: 0; font-size: 21px; }
  header .sub { margin: 6px 0 0; opacity: .92; font-size: 13.5px; }
  header .badge { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 999px; background: rgba(255,255,255,.18); font-size: 12px; vertical-align: 2px; }
  main { max-width: 980px; margin: 18px auto 40px; padding: 0 16px; display: grid; gap: 16px; }
  .status { display: flex; flex-wrap: wrap; gap: 8px 18px; background: var(--card); border: 1px solid var(--line);
            border-radius: 12px; padding: 10px 14px; font-size: 12.5px; color: var(--muted); }
  .status b { color: var(--ink); font-weight: 600; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px 18px 16px; }
  .card h2 { margin: 0 0 12px; font-size: 16.5px; }
  .hint { color: var(--muted); font-size: 12.5px; }
  form .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; }
  label { display: block; font-size: 12.5px; font-weight: 600; color: var(--muted); }
  input, select, textarea { width: 100%; margin-top: 5px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 9px;
                            font-size: 14px; color: var(--ink); background: #fff; }
  input:focus, select:focus { outline: 2px solid #b9caf6; border-color: var(--brand); }
  details.adv { margin: 12px 0; border: 1px dashed var(--line); border-radius: 10px; padding: 8px 12px; }
  details.adv summary { cursor: pointer; font-size: 13px; font-weight: 600; color: var(--muted); }
  .btn { display: inline-block; border: 1px solid var(--line); background: #fff; color: var(--ink); padding: 9px 15px;
         border-radius: 10px; font-size: 13.5px; font-weight: 600; cursor: pointer; text-decoration: none; }
  .btn:hover { filter: brightness(.97); }
  .btn.primary { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); }
  .btn.wa { background: var(--ok); border-color: var(--ok); color: #06281a; }
  .btn.small { padding: 6px 11px; font-size: 12.5px; }
  .row { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 12px; }
  #result { margin-top: 16px; border: 1px solid #bfe6c9; border-radius: 12px; padding: 14px 16px; background: #f4fbf6; }
  #result h3 { margin: 0 0 8px; font-size: 15px; }
  .keybox { font-family: var(--mono); font-size: 12px; word-break: break-all; background: rgba(23,35,59,.07);
            border-radius: 9px; padding: 11px 12px; margin: 10px 0 2px; }
  .msgbox { white-space: pre-wrap; word-break: break-word; font-family: var(--mono); font-size: 12px;
            background: rgba(23,35,59,.06); border-radius: 9px; padding: 11px 12px; margin-top: 8px; }
  .tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 4px 0 2px; }
  .tag { font-size: 11.5px; padding: 2px 9px; border-radius: 999px; background: #e7edfb; color: #274590; font-weight: 600; }
  .tag.ok { background: #daf3e2; color: #14663a; }
  .tag.warn { background: var(--warn-bg); color: var(--warn-ink); }
  .req { border: 1px solid var(--line); border-radius: 11px; padding: 12px 14px; margin-top: 10px; }
  .req .top { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  .req .who { font-weight: 700; }
  .req .meta { color: var(--muted); font-size: 12px; }
  .req details { margin-top: 8px; }
  .req pre { white-space: pre-wrap; word-break: break-word; background: rgba(23,35,59,.06); border-radius: 8px;
             padding: 9px 11px; font-size: 11.5px; margin: 6px 0 0; }
  .warn { background: var(--warn-bg); color: var(--warn-ink); border: 1px solid #f0dca8; border-radius: 11px;
          padding: 11px 14px; font-size: 12.5px; margin-top: 12px; }
  footer { max-width: 980px; margin: 0 auto 30px; padding: 0 16px; color: var(--muted); font-size: 12px; }
  .ok-msg { color: #14663a; font-weight: 600; }
  .err-msg { color: #a12222; font-weight: 600; }
</style>
</head>
<body>
<header>
  <h1>🔐 Generador de Licencias <span class="badge">aparte de la Web</span></h1>
  <p class="sub">NovaGest · herramienta independiente: genera la clave firmada y envíala por WhatsApp con un solo clic.</p>
</header>
<main>
  <div class="status" id="status">Cargando…</div>

  <section class="card">
    <h2>🆕 Generar licencia</h2>
    <form id="gen-form">
      <div class="grid">
        <label>Nombre del cliente o empresa *
          <input id="client" required maxlength="120" placeholder="Ej: Mi Tienda" autocomplete="off">
        </label>
        <label>Teléfono de WhatsApp (opcional)
          <input id="phone" maxlength="24" placeholder="Ej: 5351234567 (con código de país)" autocomplete="off">
        </label>
        <label>Plazo
          <select id="term"></select>
        </label>
      </div>
      <details class="adv">
        <summary>Opciones avanzadas (tipo, límites)</summary>
        <div class="grid" style="margin-top:10px">
          <label>Tipo
            <select id="type">
              <option value="">Según el plazo (recomendado)</option>
              <option value="TRIAL">TRIAL (prueba)</option>
              <option value="FULL">FULL</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
              <option value="LIFETIME">LIFETIME (permanente)</option>
            </select>
          </label>
          <label>Usuarios máximos <input id="users" type="number" min="1" max="9999" value="20"></label>
          <label>Dispositivos máximos <input id="devices" type="number" min="1" max="9999" value="10"></label>
        </div>
      </details>
      <div class="row">
        <button class="btn primary" type="submit">🔑 Generar licencia</button>
        <span class="hint" id="form-msg"></span>
      </div>
    </form>

    <div id="result" hidden>
      <h3>✔ Clave generada</h3>
      <div class="tags" id="result-tags"></div>
      <p class="hint" id="result-req"></p>
      <div class="keybox" id="result-key"></div>
      <p class="hint">También es válida con el prefijo <b>NG-</b> delante (el servidor la acepta igual).</p>
      <div class="row">
        <button class="btn small" id="btn-copy">📋 Copiar clave</button>
        <button class="btn small" id="btn-dl">⬇ Descargar .txt</button>
        <button class="btn wa small" id="btn-wa">💬 Enviar por WhatsApp</button>
        <button class="btn small" id="btn-copy-wa">🔗 Copiar enlace wa.me</button>
      </div>
      <p class="hint" style="margin-top:10px"><b>Mensaje que recibirá el cliente:</b></p>
      <pre class="msgbox" id="result-msg"></pre>
    </div>
    <div class="warn">
      ⚠️ La clave solo es válida en la instalación que comparte este secreto de firma.
      Si genera aquí para un servidor distinto, exporte el mismo <b>LICENSE_SECRET</b>
      o arranque con <b>--data</b> apuntando a la carpeta <b>data</b> de ese servidor.
    </div>
  </section>

  <section class="card">
    <h2>📨 Solicitudes recibidas por WhatsApp</h2>
    <p class="hint" id="req-hint">Las solicitudes que los clientes envían desde la Web o la app Android («Solicitar por WhatsApp»).</p>
    <div id="requests"></div>
    <div class="row"><button class="btn small" id="btn-refresh">↻ Actualizar</button></div>
  </section>
</main>
<footer>
  El cliente activa la clave en <b>Licencia de uso → Activar licencia</b> (Web o app Android).
  Esta herramienta no modifica la Web de NovaGest: funciona como un proceso aparte y usa el
  mismo formato de clave (HMAC-SHA256) que el servidor verifica en <b>/api/license/activate</b>.
</footer>
<script>
"use strict";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let STATE = null;
let LAST = null;

async function jget(url) {
  const r = await fetch(url, { credentials: "same-origin" });
  return r.json();
}
async function jpost(url, body) {
  const r = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

function fmtDate(ts) {
  if (!ts) return "Permanente";
  return new Date(ts * 1000).toLocaleDateString("es-CU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function loadState() {
  jget("api/state").then((s) => {
    STATE = s;
    $("status").innerHTML =
      `<span>🔑 Secreto: <b>${esc(s.secretSource)}</b></span>` +
      `<span>🗄️ Base de datos: <b>${esc(s.dbPath || "no encontrada")}</b></span>` +
      `<span>💬 WhatsApp: <b>${esc(s.whatsapp ? "+" + s.whatsapp : "selector de contacto")}</b></span>`;
    const sel = $("term");
    sel.innerHTML = (s.terms || []).map((t) =>
      `<option value="${esc(t.id)}">${esc(t.label)}${t.days ? " (" + t.days + " días)" : ""} · ${esc(t.type)}</option>`
    ).join("");
    sel.value = "MES";
    loadRequests();
  }).catch(() => { $("status").textContent = "No se pudo cargar el estado de la herramienta."; });
}

function showResult(d) {
  LAST = d;
  $("result").hidden = false;
  const p = d.payload || {};
  const t = d.term || {};
  $("result-tags").innerHTML =
    `<span class="tag ok">${esc(p.type || "")}</span>` +
    `<span class="tag">${esc(t.label || "")}${t.days ? " (" + t.days + " días)" : ""}</span>` +
    `<span class="tag">Vence: ${esc(fmtDate(p.expires_at))}</span>` +
    `<span class="tag">ID: ${esc(p.license_id || "")}</span>` +
    (d.savedToDb ? `<span class="tag ok">registrada en la BD</span>` : `<span class="tag warn">sin BD (solo clave)</span>`);
  $("result-req").innerHTML = d.request
    ? `Solicitud <b>#${esc(d.request.id)}</b> de <b>${esc(d.request.clientName)}</b> · ${esc(d.request.termLabel || "")} — marcada como <b>atendida</b>.`
    : `Cliente: <b>${esc(p.client_name || "")}</b> · Usuarios: ${esc(p.max_users)} · Dispositivos: ${esc(p.max_devices)}`;
  $("result-key").textContent = d.licenseKey || "";
  $("result-msg").textContent = d.message || "";
  $("result").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("gen-form").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  $("form-msg").textContent = "Generando…";
  const d = await jpost("api/generate", {
    client_name: $("client").value.trim(),
    phone: $("phone").value.trim(),
    term: $("term").value,
    type: $("type").value,
    max_users: Number($("users").value || 20),
    max_devices: Number($("devices").value || 10),
  }).catch(() => ({ ok: false, error: "Error de conexión con la herramienta." }));
  $("form-msg").innerHTML = d.ok
    ? `<span class="ok-msg">✔ Licencia generada — envíela por WhatsApp al cliente.</span>`
    : `<span class="err-msg">✖ ${esc(d.error || "No se pudo generar.")}</span>`;
  if (d.ok) { showResult(d); loadRequests(); }
});

$("btn-copy").addEventListener("click", async () => {
  if (!LAST) return;
  await navigator.clipboard.writeText(LAST.licenseKey || "");
  $("btn-copy").textContent = "✔ Copiada";
  setTimeout(() => { $("btn-copy").textContent = "📋 Copiar clave"; }, 1600);
});

$("btn-dl").addEventListener("click", () => {
  if (!LAST) return;
  const p = LAST.payload || {};
  const text = [
    `Licencia de ${p.product || "NovaGest"} — ${p.client_name || ""}`,
    `Tipo: ${p.type || ""} · Plan: ${(LAST.term || {}).label || ""}`,
    `Emitida: ${fmtDate(p.issued_at)} · Expira: ${fmtDate(p.expires_at)}`,
    `ID: ${p.license_id || ""} · Usuarios: ${p.max_users} · Dispositivos: ${p.max_devices}`,
    "", "--- Clave (copiar completa) ---", LAST.licenseKey || "",
    "", "--- Con prefijo NG- ---", LAST.formattedKey || "",
    "", "--- Mensaje para el cliente ---", LAST.message || "",
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = `licencia-${(p.client_name || "cliente").replace(/[^\w\-]+/g, "_")}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("btn-wa").addEventListener("click", () => {
  if (!LAST) return;
  window.open(LAST.whatsappUrl, "_blank", "noopener");
});

$("btn-copy-wa").addEventListener("click", async () => {
  if (!LAST) return;
  await navigator.clipboard.writeText(LAST.whatsappUrl || "");
  $("btn-copy-wa").textContent = "✔ Enlace copiado";
  setTimeout(() => { $("btn-copy-wa").textContent = "🔗 Copiar enlace wa.me"; }, 1600);
});

function loadRequests() {
  jget("api/requests").then((s) => {
    const box = $("requests");
    const list = s.requests || [];
    if (s.dbAvailable === false) {
      box.innerHTML = `<p class="hint">No se encontró la base de datos del servidor (<b>${esc(s.dbPath || "")}</b>).
        Arranque la herramienta con <b>--data</b> apuntando a la carpeta <b>data</b> del servidor
        para ver aquí las solicitudes recibidas. Puede generar claves igualmente con el formulario de arriba.</p>`;
      return;
    }
    if (!list.length) {
      box.innerHTML = `<p class="hint">Aún no hay solicitudes. Cuando un cliente pulse «SOLICITAR POR WHATSAPP» (Web o Android) aparecerá aquí.</p>`;
      return;
    }
    box.innerHTML = list.map((r) => {
      const pend = (r.status || "pendiente") === "pendiente";
      return `<div class="req">
        <div class="top">
          <span class="who">#${esc(r.id)} · ${esc(r.clientName)}</span>
          <span class="tag ${pend ? "warn" : "ok"}">${esc(r.status || "pendiente")}</span>
          <span class="tag">${esc(r.termLabel || "")}${r.days ? " (" + esc(r.days) + " días)" : ""} · ${esc(r.type || "")}</span>
          <span class="meta">${esc(fmtDate(r.createdAt))} · ${esc(r.channel || "web")} · ${esc(r.deviceId || "")}${r.phone ? " · 📱 " + esc(r.phone) : ""}</span>
        </div>
        <details><summary class="hint">Mensaje que envió el cliente</summary><pre>${esc(r.message || "(sin mensaje)")}</pre></details>
        ${pend ? `<div class="row">
          <button class="btn wa small" data-gen-req="${esc(r.id)}">🔑 Crear clave y enviar por WhatsApp</button>
        </div>` : ""}
      </div>`;
    }).join("");
  }).catch(() => {});
}

$("requests").addEventListener("click", async (ev) => {
  const b = ev.target.closest("[data-gen-req]");
  if (!b) return;
  const id = b.getAttribute("data-gen-req");
  b.disabled = true;
  b.textContent = "Generando…";
  const d = await jpost(`api/requests/${encodeURIComponent(id)}/generate`, {}).catch(() => ({ ok: false }));
  if (!d.ok) {
    b.disabled = false;
    b.textContent = "🔑 Crear clave y enviar por WhatsApp";
    alert(d.error || "No se pudo generar la clave de la solicitud.");
    return;
  }
  showResult(d);
  window.open(d.whatsappUrl, "_blank", "noopener");
  loadRequests();
});

$("btn-refresh").addEventListener("click", loadRequests);
loadState();
</script>
</body>
</html>
"""


class StudioHandler(BaseHTTPRequestHandler):
    """Servidor HTTP mínimo (solo esta herramienta, sin tocar la Web de NovaGest)."""
    server_version = "NovaGestLicenseStudio/1.0"

    def log_message(self, fmt, *args):
        print(f"[GENERADOR] {self.address_string()} {fmt % args}", flush=True)

    def _json(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        try:
            n = int(self.headers.get("Content-Length") or 0)
            return json.loads(self.rfile.read(n) or b"{}") if n else {}
        except Exception:
            return {}

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/", "/index.html"):
            raw = INDEX_HTML.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        if path == "/api/state":
            self._json(200, {
                "ok": True,
                "app": "NovaGest License Studio",
                "version": APP_VERSION,
                "product": PRODUCT,
                "secretSource": secret_source(),
                "dbPath": gen.db_path(),
                "dbAvailable": db_available(),
                "whatsapp": WHATSAPP_DEFAULT,
                "terms": TERMS,
            })
            return
        if path == "/api/requests":
            qs = parse_qs(urlparse(self.path).query)
            self._json(200, {
                "ok": True,
                "dbAvailable": db_available(),
                "dbPath": gen.db_path(),
                "requests": list_requests((qs.get("limit") or ["100"])[0]),
            })
            return
        self._json(404, {"ok": False, "error": "Ruta no encontrada."})

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")
        b = self._body()
        if path == "/api/generate":
            client = str(b.get("client_name") or b.get("clientName") or "").strip()
            if not client:
                self._json(400, {"ok": False, "error": "Indique el nombre o la empresa del cliente."})
                return
            d = generate_result(
                client, str(b.get("phone") or ""), str(b.get("term") or "MES"),
                ltype=str(b.get("type") or "") or None,
                users=b.get("max_users") or 20, devices=b.get("max_devices") or 10,
                features=str(b.get("features") or "*"),
            )
            self._json(200, d)
            return
        m = re.match(r"^/api/requests/(\d+)/generate$", path)
        if m:
            req_id = int(m.group(1))
            rows = [r for r in list_requests(500) if int(r["id"]) == req_id] if db_available() else []
            if not rows:
                self._json(404, {"ok": False, "error": f"No existe la solicitud #{req_id}."})
                return
            req = rows[0]
            if (req.get("status") or "pendiente") != "pendiente":
                self._json(400, {"ok": False, "error": f"La solicitud #{req_id} ya está {req.get('status')}."})
                return
            d = generate_result("", str(b.get("phone") or ""), "", request=req)
            self._json(200, d)
            return
        self._json(404, {"ok": False, "error": "Ruta no encontrada."})


def create_server(host="0.0.0.0", port=8777):
    srv = ThreadingHTTPServer((host, int(port)), StudioHandler)
    srv.daemon_threads = True
    return srv


def main():
    global WHATSAPP_DEFAULT
    p = argparse.ArgumentParser(description="Generador de licencias NovaGest — herramienta independiente de la Web")
    p.add_argument("--host", default="0.0.0.0", help="Interfaz de escucha (0.0.0.0 = toda la red; 127.0.0.1 = solo esta máquina)")
    p.add_argument("--port", type=int, default=8777, help="Puerto de la herramienta (por defecto 8777)")
    p.add_argument("--data", default=None, help="Carpeta data del servidor del cliente (secreto y solicitudes)")
    p.add_argument("--whatsapp", default=None, help="Número de WhatsApp destino por defecto (solo dígitos, con código de país)")
    p.add_argument("--open", action="store_true", help="Abre el navegador al arrancar")
    args = p.parse_args()

    if args.data:
        os.environ["DATA_DIR"] = os.path.abspath(args.data)
        # generate_license leyó DATA_DIR al importarlo: apunta también su ruta de secreto
        gen.DATA = os.environ["DATA_DIR"]
        gen.LICENSE_FILE = os.path.join(gen.DATA, "license.key")
    if args.whatsapp:
        WHATSAPP_DEFAULT = re.sub(r"\D", "", args.whatsapp)

    # El secreto debe existir antes de firmar (se crea si hace falta, igual que la CLI)
    gen.get_secret()

    srv = create_server(args.host, args.port)
    url = f"http://localhost:{args.port}"
    print("\n=== 🔐 Generador de Licencias NovaGest (herramienta independiente) ===")
    print(f"  Interfaz:      {url}")
    print(f"  Secreto:       {secret_source()}")
    print(f"  Base de datos: {gen.db_path()} {'(solicitudes disponibles)' if db_available() else '(no encontrada — solo generación)'}")
    print(f"  WhatsApp:      {'+' + WHATSAPP_DEFAULT if WHATSAPP_DEFAULT else 'selector de contacto (sin número fijo)'}")
    if args.host == "0.0.0.0":
        print("  ⚠️  Escucha en toda la red: es una herramienta privada del administrador.")
        print("      Para uso solo en esta máquina: --host 127.0.0.1")
    print("\n  Ctrl+C para detener.\n")

    if args.open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n[GENERADOR] Detenido.")


if __name__ == "__main__":
    main()
