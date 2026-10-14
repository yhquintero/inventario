#!/usr/bin/env python3
"""Carga ligera local: N logins + PUT /api/state concurrentes; exige p95 < umbral.
Uso: python3 tools/test_carga.py [--n 20] [--umbral-ms 1500]

Arranca su propio servidor temporal (en este proceso, datos temporales) con una
licencia v2 de pruebas emitida para un dispositivo simulado: cada sesión firma su
desafío de login como lo hace la Web.
"""
import concurrent.futures, os, statistics, sys, tempfile, time

n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 20
umbral = float(sys.argv[sys.argv.index("--umbral-ms") + 1]) if "--umbral-ms" in sys.argv else 1500.0
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="ng-carga-")
os.environ["NOVAGEST_DEMO_USERS"] = "1"
os.environ["NOVAGEST_NET_TIME"] = "0"
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
sys.path.insert(0, os.path.join(os.path.dirname(AQUI), "server"))

import novagest_server as srv  # noqa: E402
from licencia_pruebas import Cliente, Dispositivo, Emisor, servidor_en_hilo  # noqa: E402

srv.init_db()
srv.RATE_LIMITS.pop(("POST", "/api/login"), None)   # la prueba mide rendimiento, no el límite anti-fuerza bruta
emisor = Emisor().instalar()
pc = Dispositivo("web")
httpd, BASE = servidor_en_hilo(srv)

try:
    code, d = Cliente(BASE).activar(pc, emisor.emitir("Prueba de carga", pc.id, 30))
    if code != 200:
        sys.exit(f"No se pudo activar la licencia de prueba: {code} {d}")

    def worker(i):
        c = Cliente(BASE)
        t = time.perf_counter()
        c1, _ = c.entrar(pc, "jefe", "Jefe123!")
        t1 = (time.perf_counter() - t) * 1000
        _, got = c("GET", "/api/state")
        # 200 si gana la versión, 409 si otro guardó antes (bloqueo optimista correcto)
        t = time.perf_counter()
        c3, _ = c("PUT", "/api/state", {"state": got.get("state") or {}, "version": got.get("version", 0)})
        t3 = (time.perf_counter() - t) * 1000
        return t1, c1, t3, c3

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        res = list(ex.map(worker, range(n)))
    for etiqueta, idx in (("login", 0), ("PUT /api/state", 2)):
        ts = sorted(r[idx] for r in res)
        p95 = ts[min(len(ts) - 1, int(len(ts) * 0.95))]
        codigos = {r[idx + 1] for r in res}
        bien = p95 < umbral and codigos <= ({200} if idx == 0 else {200, 409})
        print(f"  {'ok ' if bien else 'FAIL'} {etiqueta}: p95 {p95:.0f} ms · media {statistics.mean(ts):.0f} ms · códigos {codigos}")
        if not bien:
            sys.exit(1)
    print(f"OK — carga ligera ({n} sesiones, umbral p95 {umbral:.0f} ms)")
finally:
    httpd.shutdown()
