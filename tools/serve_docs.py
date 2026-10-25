#!/usr/bin/env python3
"""Servidor estático mínimo con soporte de Range (para ver y escuchar el video en la vista previa)."""
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get("Range")
        if not rng:
            return super().send_head()
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        try:
            size = os.path.getsize(path)
            m = re.match(r"bytes=(\d*)-(\d*)", rng.strip())
            if not m:
                return super().send_head()
            start = int(m.group(1) or 0)
            end = int(m.group(2)) if m.group(2) else size - 1
            if start >= size:
                self.send_error(416, "Range no válido")
                return None
            end = min(end, size - 1)
            f = open(path, "rb")
            self.send_response(206)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            f.seek(start)
            self._remaining = end - start + 1
            return f
        except OSError:
            self.send_error(404, "No encontrado")
            return None

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._remaining = None

    def end_headers(self):
        if not getattr(self, "_sent_ranges", False):
            self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8000
    handler = partial(RangeHandler, directory=root)
    ThreadingHTTPServer(("0.0.0.0", port), handler).serve_forever()
