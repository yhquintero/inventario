#!/usr/bin/env python3
"""Carga ligera local: N logins + PUT /api/state concurrentes; exige p95 < umbral.
Uso: python3 tools/test_carga.py [--n 20] [--umbral-ms 1500]  (arranca su propio servidor temporal)"""
import concurrent.futures, http.cookiejar, json, os, pathlib, re, secrets, statistics, subprocess, sys, tempfile, time, urllib.request
ROOT = pathlib.Path(__file__).parent.parent
n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 20
umbral = float(sys.argv[sys.argv.index("--umbral-ms") + 1]) if "--umbral-ms" in sys.argv else 1500.0
PORT = 18191
tmp = tempfile.mkdtemp(prefix="ng-carga-")
# El servidor verifica la licencia ANTES del login (402 sin licencia), así que la instalación
# temporal usa un secreto propio y activa una clave emitida para ella con las mismas variables.
SECRET = "carga-" + secrets.token_hex(16)
env = {**os.environ, "DATA_DIR": tmp, "PORT": str(PORT), "NOVAGEST_DEMO_USERS": "1", "LICENSE_SECRET": SECRET}
proc = subprocess.Popen([sys.executable, str(ROOT / "server" / "novagest_server.py")], env=env,
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
BASE = f"http://127.0.0.1:{PORT}"

def call(opener, method, path, data=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Content-Type": "application/json", "X-CP": "1"})
    t = time.perf_counter()
    try:
        with opener.open(req, timeout=15) as r: r.read(); code = r.status
    except urllib.error.HTTPError as e:
        code = e.code; e.read()
    return (time.perf_counter() - t) * 1000, code

try:
    for _ in range(60):
        try:
            urllib.request.urlopen(BASE + "/api/health", timeout=2); break
        except Exception: time.sleep(0.5)
    else: sys.exit("El servidor temporal no arrancó")

    # 1) Emitir la clave con el mismo secreto que la instalación temporal.
    gen = subprocess.run([sys.executable, str(ROOT / "tools" / "generate_license.py"),
                          "--client", "Carga", "--term", "MES"],
                         env=env, capture_output=True, text=True)
    encontrada = re.search(r"NG-[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", gen.stdout or "")
    if not encontrada:
        sys.exit(f"No se pudo emitir la clave de carga:\n{gen.stdout}\n{gen.stderr}")
    # 2) Activarla en la instalación temporal (antes del login).
    activar = http.cookiejar.CookieJar()
    op_activar = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(activar))
    _, code = call(op_activar, "POST", "/api/license/activate", {"license_key": encontrada.group(0)})
    if code not in (200, 201):
        sys.exit(f"No se pudo activar la licencia de la prueba de carga (código {code})")

    def worker(i):
        cj = http.cookiejar.CookieJar()
        op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
        t1, c1 = call(op, "POST", "/api/login", {"username": "jefe", "password": "Jefe123!"})
        req = urllib.request.Request(BASE + "/api/state", method="GET")
        with op.open(req, timeout=15) as r: got = json.loads(r.read())
        # 200 si gana la versión, 409 si otro guardó antes (bloqueo optimista correcto)
        t3, c3 = call(op, "PUT", "/api/state", {"state": got.get("state") or {}, "version": got["version"]})
        return t1, c1, t3, c3

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        res = list(ex.map(worker, range(n)))
    for etiqueta, idx in (("login", 0), ("PUT /api/state", 2)):
        ts = sorted(r[idx] for r in res)
        p95 = ts[min(len(ts) - 1, int(len(ts) * 0.95))]
        codigos = {r[idx + 1] for r in res}
        bien = p95 < umbral and codigos <= ({200} if idx == 0 else {200, 409})
        print(f"  {'ok ' if bien else 'FAIL'} {etiqueta}: p95 {p95:.0f} ms · media {statistics.mean(ts):.0f} ms · códigos {codigos}")
        if not bien: sys.exit(1)
    print(f"OK — carga ligera ({n} sesiones, umbral p95 {umbral:.0f} ms)")
finally:
    proc.terminate()
    try: proc.wait(timeout=5)
    except Exception: proc.kill()
