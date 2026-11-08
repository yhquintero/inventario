"""Consulta pública de la referencia informal de elTOQUE, sin eludir bloqueos."""
import datetime as dt
from html.parser import HTMLParser
import json
import math
import urllib.error
import urllib.request

URL = "https://eltoque.com/tasas-de-cambio-cuba"
CURRENCIES = ("USD", "EUR", "MLC", "CAD", "MXN", "ZELLE", "CLA")
MAX_BYTES = 2 * 1024 * 1024


class RateError(ValueError):
    pass


class JsonLd(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_script = False
        self.buf = []
        self.documents = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "script" and (dict(attrs).get("type") or "").lower() == "application/ld+json":
            self.in_script = True
            self.buf = []

    def handle_data(self, data):
        if self.in_script:
            self.buf.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "script" and self.in_script:
            self.in_script = False
            try:
                self.documents.append(json.loads("".join(self.buf)))
            except (ValueError, TypeError):
                pass


def _nodes(obj):
    if isinstance(obj, list):
        for x in obj:
            yield from _nodes(x)
    elif isinstance(obj, dict):
        yield obj
        yield from _nodes(obj.get("@graph", []))


def parse_rates(html, now=None):
    parser = JsonLd()
    parser.feed(html)
    for document in parser.documents:
        for dataset in _nodes(document):
            variables = dataset.get("variableMeasured")
            if not isinstance(variables, list):
                continue
            found = {}
            for item in variables:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name", "")).strip().upper()
                if not name.endswith("/CUP"):
                    continue
                currency = name[:-4]
                if currency not in CURRENCIES or str(item.get("unitText", "")).upper() != "CUP" or currency in found:
                    continue
                try:
                    value = float(item.get("value"))
                except (ValueError, TypeError):
                    continue
                if math.isfinite(value) and 0 < value < 1_000_000:
                    found[currency] = value
            if set(found) != set(CURRENCIES):
                continue
            stamp = dataset.get("dateModified") or dataset.get("temporalCoverage")
            try:
                published = dt.datetime.fromisoformat(str(stamp).replace("Z", "+00:00"))
                if published.tzinfo is None:
                    raise ValueError("missing timezone")
            except (ValueError, TypeError):
                raise RateError("La fuente no indica una fecha de actualización verificable.")
            current = now or dt.datetime.now(dt.timezone.utc)
            age = current - published.astimezone(dt.timezone.utc)
            if age > dt.timedelta(hours=48) or age < -dt.timedelta(minutes=10):
                raise RateError("La fecha de la fuente es antigua o está en el futuro; no se actualizaron las tasas.")
            return {"rates": found, "publishedAt": published.isoformat(), "date": published.date().isoformat(), "source": URL}
    raise RateError("elTOQUE no devolvió datos estructurados completos de las siete monedas; no se cambiaron las tasas.")


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch_rates():
    req = urllib.request.Request(URL, headers={"User-Agent": "NovaGest/1.0 (+consulta de tasas)", "Accept": "text/html"})
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=12) as res:
            if res.headers.get_content_type() != "text/html":
                raise RateError("La fuente no devolvió una página HTML válida.")
            data = res.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise RateError("La respuesta de la fuente es demasiado grande.")
            return parse_rates(data.decode("utf-8", errors="replace"))
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429, 503):
            raise RateError("elTOQUE rechazó o bloqueó la consulta. Inténtalo más tarde o registra las tasas manualmente.") from exc
        raise RateError(f"elTOQUE respondió con error HTTP {exc.code}.") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise RateError("No se pudo conectar con elTOQUE desde el servidor. Comprueba la conexión.") from exc
