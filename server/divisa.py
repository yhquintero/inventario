"""Lectura de las cotizaciones informales públicas de Divisa, sin credenciales."""
import datetime as dt
from html.parser import HTMLParser
import json
import math
from pathlib import Path
import re
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

URL = "https://cubadivisas.com/"
CURRENCIES = ("USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA")
MAX_BYTES = 2 * 1024 * 1024
MONTHS = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
          "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10,
          "noviembre": 11, "diciembre": 12}


class RateError(ValueError):
    pass


class DivisaPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.collect = False
        self.in_script = False
        self.chunks = []
        self.payloads = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "script":
            self.in_script = True
            attrs = dict(attrs)
            self.collect = attrs.get("id") == "conv-data" and (attrs.get("type") or "").lower() == "application/json"
            if self.collect:
                self.chunks = []

    def handle_data(self, data):
        if self.collect:
            self.chunks.append(data)
        elif not self.in_script:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "script":
            if self.collect:
                self.payloads.append("".join(self.chunks))
            self.collect = False
            self.in_script = False


def _havana_zone():
    """Usa la tzdb del sistema/paquete y, si falta, la copia incluida en el servidor."""
    try:
        return ZoneInfo("America/Havana")
    except ZoneInfoNotFoundError:
        try:
            with (Path(__file__).resolve().parent / "tzdata" / "Havana.tzif").open("rb") as data:
                return ZoneInfo.from_file(data, key="America/Havana")
        except (OSError, ValueError, EOFError) as exc:
            raise RateError("No se pudo cargar la zona horaria de Cuba. Reinstale NovaGest o instale tzdata en el Python del servidor.") from exc


def _timestamp(text, now):
    match = re.search(r"actualizado\s+el\s+(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\s*,?\s+(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?\s*\(hora de cuba\)",
                      text, re.IGNORECASE)
    if not match:
        raise RateError("Divisa no indicó una fecha y hora de publicación verificables.")
    day, month, year, hour, minute = int(match[1]), MONTHS.get(match[2].lower()), int(match[3]), int(match[4]), int(match[5])
    if not month or not 1 <= hour <= 12 or minute > 59:
        raise RateError("Divisa indicó una fecha u hora inválida.")
    hour = hour % 12 + (12 if match[6].lower() == "p" else 0)
    zone = _havana_zone()
    try:
        local = dt.datetime(year, month, day, hour, minute, tzinfo=zone)
    except ValueError as exc:
        raise RateError("Divisa indicó una fecha u hora inválida.") from exc
    if local.replace(fold=0).utcoffset() != local.replace(fold=1).utcoffset():
        raise RateError("La hora publicada por Divisa es ambigua por cambio de horario; inténtalo más tarde.")
    age = now - local.astimezone(dt.timezone.utc)
    if age > dt.timedelta(hours=48) or age < -dt.timedelta(minutes=10):
        raise RateError("La referencia de Divisa está desactualizada o tiene fecha futura; no se modificaron las tasas.")
    return local


def parse_rates(html, now=None):
    page = DivisaPage()
    page.feed(html)
    if len(page.payloads) != 1:
        raise RateError("Divisa no devolvió datos de cotizaciones verificables.")
    try:
        payload = json.loads(page.payloads[0])
    except (ValueError, TypeError):
        raise RateError("Divisa devolvió datos de cotizaciones inválidos.")
    entries = payload.get("informal") if isinstance(payload, dict) else None
    if not isinstance(entries, list):
        raise RateError("Divisa no devolvió cotizaciones del mercado informal.")
    rates = {}
    for item in entries:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code") or "").strip().upper()
        label = str(item.get("label") or "").strip().upper()
        # Solo se acepta ECU como euro si la propia fuente lo etiqueta EUR.
        if code == "ECU" and label == "EUR":
            currency = "EUR"
        elif code == "USD_ZELLE.CUP" and label == "ZELLE":
            currency = "ZELLE"
        elif code in CURRENCIES and label == code:
            currency = code
        else:
            continue
        raw = item.get("rate")
        if isinstance(raw, bool):
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(value) or not 0 < value < 1_000_000:
            continue
        if currency in rates and rates[currency] != value:
            raise RateError(f"Divisa devolvió valores contradictorios para {currency}.")
        rates[currency] = value
    if "USD" not in rates:
        raise RateError("Divisa no devolvió una tasa válida de USD; no se modificaron las tasas.")
    timestamp = _timestamp(" ".join(page.text).replace("\xa0", " "), now or dt.datetime.now(dt.timezone.utc))
    return {"rates": rates, "missing": [c for c in CURRENCIES if c not in rates],
            "publishedAt": timestamp.isoformat(), "date": timestamp.date().isoformat(), "source": URL}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_rates():
    request = urllib.request.Request(URL, headers={"User-Agent": "NovaGest/1.0 (+consulta de tasas)", "Accept": "text/html"})
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=12) as response:
            if response.headers.get_content_type() != "text/html":
                raise RateError("Divisa no devolvió una página HTML válida.")
            data = response.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise RateError("La respuesta de Divisa es demasiado grande.")
            return parse_rates(data.decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429, 503):
            raise RateError("Divisa rechazó o bloqueó la consulta. Inténtalo más tarde.") from exc
        raise RateError(f"Divisa respondió con error HTTP {exc.code}.") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RateError("No se pudo conectar con Divisa desde el servidor. Comprueba la conexión.") from exc
