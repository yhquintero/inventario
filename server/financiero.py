"""
Módulo de gestión económica y financiera de NovaGest (contabilidad de partida doble).

Se integra con novagest_server.py: comparte la misma base SQLite (tablas con
prefijo fin_), las mismas sesiones/roles y el mismo decorador @route.

Modelo de datos:
  fin_cuentas   plan de cuentas (jerárquico por código, naturaleza y saldo normal)
  fin_centros   centros de costo
  fin_asientos  encabezados de asiento contable (fecha + descripción)
  fin_lineas    líneas del asiento (cuenta, centro de costo, debe, haber)
  fin_metricas  métricas de negocio web/servidor/app por período (CAC, conversión…)
  fin_qr        configuración de cobro para el código QR exportable

Todos los informes se calculan en el servidor a partir de los asientos registrados
y aceptan filtros ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&cuenta=<id>&centro=<id>.
"""

import json
from urllib.parse import urlparse, parse_qs, urlencode


def _qp(h):
    """Parámetros de consulta de la petición como dict de un solo valor."""
    return {k: v[0] for k, v in parse_qs(urlparse(h.path).query).items()}
from urllib.parse import urlparse, parse_qs, urlencode


def _qp(h):
    return {k: v[0] for k, v in parse_qs(urlparse(h.path).query).items()}

# Naturalezas válidas del plan de cuentas y su saldo normal.
NATURALEZAS = {
    "ACTIVO": "DEUDOR", "GASTO": "DEUDOR", "COSTO": "DEUDOR",
    "PASIVO": "ACREEDOR", "PATRIMONIO": "ACREEDOR", "INGRESO": "ACREEDOR",
}

# Plan de cuentas semilla (jerárquico, códigos de 4 niveles tipo 1-1000).
CUENTAS_SEED = [
    ("1", "ACTIVO", None, 1, None), ("11", "ACTIVO", "1", 1, None),
    ("1101", "ACTIVO", "11", 1, None), ("110101", "ACTIVO", "1101", 1, None),   # Caja
    ("1102", "ACTIVO", "11", 1, None), ("110201", "ACTIVO", "1102", 1, None),   # Bancos
    ("1103", "ACTIVO", "11", 1, None), ("110301", "ACTIVO", "1103", 1, None),   # Cuentas por cobrar
    ("1104", "ACTIVO", "11", 1, None), ("110401", "ACTIVO", "1104", 1, None),   # Inventario
    ("12", "ACTIVO", "1", 0, None), ("1201", "ACTIVO", "12", 0, None),
    ("120101", "ACTIVO", "1201", 0, None),                                     # Activo fijo
    ("2", "PASIVO", None, 1, None), ("21", "PASIVO", "2", 1, None),
    ("2101", "PASIVO", "21", 1, None), ("210101", "PASIVO", "2101", 1, None),   # Ctas por pagar
    ("2102", "PASIVO", "21", 1, None), ("210201", "PASIVO", "2102", 1, None),   # Préstamos
    ("3", "PATRIMONIO", None, 1, None), ("31", "PATRIMONIO", "3", 1, None),
    ("3101", "PATRIMONIO", "31", 1, None), ("310101", "PATRIMONIO", "3101", 1, None),  # Capital
    ("3102", "PATRIMONIO", "31", 1, None), ("310201", "PATRIMONIO", "3102", 1, None),  # Utilidades acumuladas
    ("4", "INGRESO", None, 1, None), ("41", "INGRESO", "4", 1, None),
    ("4101", "INGRESO", "41", 1, None), ("410101", "INGRESO", "4101", 1, None),  # Ventas
    ("4102", "INGRESO", "41", 1, None), ("410201", "INGRESO", "4102", 1, None),  # Otros ingresos
    ("5", "GASTO", None, 1, None), ("51", "GASTO", "5", 1, "FIJO"),
    ("5101", "GASTO", "51", 1, "FIJO"), ("510101", "GASTO", "5101", 1, "FIJO"),  # Gastos operativos
    ("5102", "GASTO", "51", 1, "VARIABLE"), ("510201", "GASTO", "5102", 1, "VARIABLE"),
    ("52", "GASTO", "5", 1, "FIJO"), ("5201", "GASTO", "52", 1, "FIJO"),        # Gastos admin/venta
    ("6", "COSTO", None, 1, "VARIABLE"), ("61", "COSTO", "6", 1, "VARIABLE"),
    ("6101", "COSTO", "61", 1, "VARIABLE"), ("610101", "COSTO", "6101", 1, "VARIABLE"),  # Costo de ventas
]
NOMBRES_SEED = {
    "1": "ACTIVO", "11": "Activo corriente", "1101": "Efectivo", "110101": "Caja general",
    "1102": "Bancos", "110201": "Cuenta bancaria", "1103": "Cuentas por cobrar",
    "110301": "Clientes", "1104": "Inventarios", "110401": "Mercancía",
    "12": "Activo no corriente", "1201": "Inmuebles y equipos", "120101": "Muebles y equipos",
    "2": "PASIVO", "21": "Pasivo corriente", "2101": "Cuentas por pagar", "210101": "Proveedores",
    "2102": "Deudas financieras", "210201": "Préstamos bancarios",
    "3": "PATRIMONIO", "31": "Capital", "3101": "Capital social", "310101": "Aportes de socios",
    "3102": "Resultados acumulados", "310201": "Utilidades retenidas",
    "4": "INGRESOS", "41": "Ingresos operacionales", "4101": "Ventas", "410101": "Ventas de contado",
    "4102": "Otros ingresos", "410201": "Intereses ganados",
    "5": "GASTOS", "51": "Gastos operacionales", "5101": "Gastos de venta", "510101": "Publicidad",
    "5102": "Gastos variables", "510201": "Comisiones", "52": "Gastos administrativos",
    "5201": "Gastos fijos", "520101": "Alquiler y servicios",
    "6": "COSTOS", "61": "Costo de ventas", "6101": "Costo de la mercancía", "610101": "Compras",
}


def init_db(con):
    """Crea las tablas del módulo y siembra el plan de cuentas por defecto."""
    con.executescript("""
    CREATE TABLE IF NOT EXISTS fin_cuentas(
      id INTEGER PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
      naturaleza TEXT NOT NULL, saldo_normal TEXT NOT NULL, padre TEXT,
      corriente INTEGER DEFAULT 0, tipo_costo TEXT, activa INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS fin_centros(
      id INTEGER PRIMARY KEY, codigo TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
      responsable TEXT DEFAULT '', activa INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS fin_asientos(
      id INTEGER PRIMARY KEY, fecha TEXT NOT NULL, descripcion TEXT DEFAULT '',
      created_at INTEGER, created_by TEXT);
    CREATE TABLE IF NOT EXISTS fin_lineas(
      id INTEGER PRIMARY KEY, asiento_id INTEGER NOT NULL REFERENCES fin_asientos(id) ON DELETE CASCADE,
      cuenta_id INTEGER NOT NULL REFERENCES fin_cuentas(id), centro_id INTEGER REFERENCES fin_centros(id),
      debe REAL DEFAULT 0, haber REAL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS fin_lineas_asiento ON fin_lineas(asiento_id);
    CREATE INDEX IF NOT EXISTS fin_lineas_cuenta ON fin_lineas(cuenta_id);
    CREATE TABLE IF NOT EXISTS fin_metricas(
      periodo TEXT PRIMARY KEY, visitantes INTEGER DEFAULT 0, registros INTEGER DEFAULT 0,
      compras INTEGER DEFAULT 0, clientes_nuevos INTEGER DEFAULT 0, usuarios_activos INTEGER DEFAULT 0,
      gasto_marketing REAL DEFAULT 0, costo_infra REAL DEFAULT 0, mrr REAL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS fin_qr(
      id INTEGER PRIMARY KEY CHECK(id=1), titular TEXT DEFAULT '', banco TEXT DEFAULT '',
      cuenta TEXT DEFAULT '', moneda TEXT DEFAULT 'USD', referencia TEXT DEFAULT '');
    """)
    con.commit()
    if not con.execute("SELECT 1 FROM fin_cuentas LIMIT 1").fetchone():
        for codigo, nat, padre, corriente, tipo in CUENTAS_SEED:
            con.execute(
                "INSERT INTO fin_cuentas(codigo,nombre,naturaleza,saldo_normal,padre,corriente,tipo_costo) VALUES(?,?,?,?,?,?,?)",
                (codigo, NOMBRES_SEED.get(codigo, codigo), nat, NATURALEZAS[nat], padre, corriente, tipo))
        con.execute("INSERT OR IGNORE INTO fin_centros(codigo,nombre) VALUES('GEN','General')")
        con.execute("INSERT OR IGNORE INTO fin_qr(id) VALUES(1)")
        con.commit()


# ----------------------------------------------------------------------
# Lógica de cálculo (pura, sobre filas de la BD)
# ----------------------------------------------------------------------

def _filtro_fecha(desde, hasta):
    cond, args = "", []
    if desde:
        cond += " AND a.fecha>=?"; args.append(desde)
    if hasta:
        cond += " AND a.fecha<=?"; args.append(hasta)
    return cond, args


def movimientos(q, desde=None, hasta=None, cuenta_id=None, centro_id=None):
    """Suma de debe/haber por cuenta dentro del período y filtros dados."""
    cond, args = _filtro_fecha(desde, hasta)
    if cuenta_id:
        cond += " AND l.cuenta_id=?"; args.append(cuenta_id)
    if centro_id:
        cond += " AND l.centro_id=?"; args.append(centro_id)
    rows = q(
        "SELECT l.cuenta_id, c.codigo, c.nombre, c.naturaleza, c.saldo_normal,"
        " SUM(l.debe) debe, SUM(l.haber) haber FROM fin_lineas l"
        " JOIN fin_asientos a ON a.id=l.asiento_id JOIN fin_cuentas c ON c.id=l.cuenta_id"
        f" WHERE 1=1{cond} GROUP BY l.cuenta_id ORDER BY c.codigo", args)
    return [dict(r) for r in rows]


def saldo(cuenta, debe, haber):
    """Saldo según el saldo normal de la cuenta (positivo = saldo normal)."""
    return (debe - haber) if cuenta["saldo_normal"] == "DEUDOR" else (haber - debe)


def total_por_naturaleza(q, desde=None, hasta=None, cuenta_id=None, centro_id=None):
    """Saldos netos agrupados por naturaleza (para estados financieros)."""
    movs = movimientos(q, desde, hasta, cuenta_id, centro_id)
    totales = {}
    for m in movs:
        s = saldo(m, m["debe"], m["haber"])
        totales[m["naturaleza"]] = totales.get(m["naturaleza"], 0) + s
    return totales, movs


def cuadre_ok(movs):
    """Validación de cuadre: el total del debe debe igualar al del haber."""
    debe = sum(m["debe"] for m in movs)
    haber = sum(m["haber"] for m in movs)
    return {"debe": debe, "haber": haber, "diferencia": debe - haber, "cuadra": abs(debe - haber) < 0.005}


def registrar(route, q, audit, now, roles):
    """Registra los endpoints /api/fin/* en el enrutador de NovaGest."""

    # ---------------- plan de cuentas ----------------
    @route("GET", "/api/fin/cuentas", roles=roles)
    def fin_cuentas_get(h, u, ident):
        rows = q("SELECT * FROM fin_cuentas ORDER BY codigo")
        return h.send_json(200, {"cuentas": [dict(r) for r in rows]})

    @route("POST", "/api/fin/cuentas", roles=roles)
    def fin_cuentas_post(h, u, ident):
        b = h.body()
        codigo = str(b.get("codigo", "")).strip()
        nat = str(b.get("naturaleza", "")).upper()
        if not codigo or nat not in NATURALEZAS:
            return h.err(400, "Código y naturaleza válidos son obligatorios")
        q("INSERT INTO fin_cuentas(codigo,nombre,naturaleza,saldo_normal,padre,corriente,tipo_costo) VALUES(?,?,?,?,?,?,?)",
          (codigo, b.get("nombre", codigo), nat, NATURALEZAS[nat], b.get("padre") or None,
           1 if b.get("corriente") else 0, b.get("tipo_costo") or None))
        audit(u["username"], "fin_cuenta_crear", codigo)
        return h.send_json(201, {"ok": True})

    @route("PUT", "/api/fin/cuentas/:id", roles=roles)
    def fin_cuentas_put(h, u, ident):
        b = h.body()
        q("UPDATE fin_cuentas SET nombre=?, corriente=?, tipo_costo=?, activa=? WHERE id=?",
          (b.get("nombre", ""), 1 if b.get("corriente") else 0, b.get("tipo_costo"), 1 if b.get("activa", 1) else 0, ident))
        return h.send_json(200, {"ok": True})

    @route("DELETE", "/api/fin/cuentas/:id", roles=roles)
    def fin_cuentas_del(h, u, ident):
        q("UPDATE fin_cuentas SET activa=0 WHERE id=?", (ident,))
        return h.send_json(200, {"ok": True})

    # ---------------- centros de costo ----------------
    @route("GET", "/api/fin/centros", roles=roles)
    def centros_get(h, u, ident):
        return h.send_json(200, {"centros": [dict(r) for r in q("SELECT * FROM fin_centros ORDER BY codigo")]})

    @route("POST", "/api/fin/centros", roles=roles)
    def centros_post(h, u, ident):
        b = h.body()
        if not b.get("codigo") or not b.get("nombre"):
            return h.err(400, "Código y nombre son obligatorios")
        q("INSERT INTO fin_centros(codigo,nombre,responsable) VALUES(?,?,?)",
          (b["codigo"], b["nombre"], b.get("responsable", "")))
        return h.send_json(201, {"ok": True})

    # ---------------- asientos (partida doble) ----------------
    @route("GET", "/api/fin/asientos", roles=roles)
    def asientos_get(h, u, ident):
        p = _qp(h)
        cond, args = _filtro_fecha(p.get("desde"), p.get("hasta"))
        asientos = [dict(r) for r in q(f"SELECT * FROM fin_asientos WHERE 1=1{cond} ORDER BY fecha DESC, id DESC", args)]
        for a in asientos:
            a["lineas"] = [dict(r) for r in q(
                "SELECT l.*, c.codigo, c.nombre cuenta_nombre FROM fin_lineas l"
                " JOIN fin_cuentas c ON c.id=l.cuenta_id WHERE l.asiento_id=?", (a["id"],))]
            a["cuadre"] = cuadre_ok(a["lineas"])
        return h.send_json(200, {"asientos": asientos})

    @route("POST", "/api/fin/asientos", roles=roles)
    def asientos_post(h, u, ident):
        b = h.body()
        lineas = b.get("lineas") or []
        if len(lineas) < 2:
            return h.err(400, "Un asiento necesita al menos 2 líneas")
        debe = sum(float(l.get("debe") or 0) for l in lineas)
        haber = sum(float(l.get("haber") or 0) for l in lineas)
        if abs(debe - haber) >= 0.005:
            return h.err(422, f"El asiento no cuadra: debe={debe:.2f} haber={haber:.2f}")
        cur = q("INSERT INTO fin_asientos(fecha,descripcion,created_at,created_by) VALUES(?,?,?,?)",
                (b.get("fecha") or "", b.get("descripcion", ""), now(), u["username"]))
        aid = cur.lastrowid if hasattr(cur, "lastrowid") else q("SELECT last_insert_rowid() v", one=True)["v"]
        for l in lineas:
            q("INSERT INTO fin_lineas(asiento_id,cuenta_id,centro_id,debe,haber) VALUES(?,?,?,?,?)",
              (aid, l["cuenta_id"], l.get("centro_id"), float(l.get("debe") or 0), float(l.get("haber") or 0)))
        audit(u["username"], "fin_asiento_crear", f"#{aid} {b.get('fecha','')} debe={debe:.2f}")
        return h.send_json(201, {"ok": True, "id": aid, "cuadre": {"debe": debe, "haber": haber, "cuadra": True}})

    @route("DELETE", "/api/fin/asientos/:id", roles=roles)
    def asientos_del(h, u, ident):
        q("DELETE FROM fin_lineas WHERE asiento_id=?", (ident,))
        q("DELETE FROM fin_asientos WHERE id=?", (ident,))
        audit(u["username"], "fin_asiento_borrar", f"#{ident}")
        return h.send_json(200, {"ok": True})

    # ---------------- informes financieros ----------------
    def _params(h):
        p = _qp(h)
        return (p.get("desde"), p.get("hasta"), p.get("cuenta"), p.get("centro"))

    @route("GET", "/api/fin/balance-comprobacion", roles=roles)
    def balance_comprobacion(h, u, ident):
        desde, hasta, cuenta, centro = _params(h)
        movs = movimientos(q, desde, hasta, cuenta, centro)
        inicial = q(
            "SELECT l.cuenta_id, SUM(l.debe) debe, SUM(l.haber) haber FROM fin_lineas l"
            " JOIN fin_asientos a ON a.id=l.asiento_id WHERE a.fecha<? GROUP BY l.cuenta_id",
            (desde or "0000-00-00",))
        ini = {r["cuenta_id"]: saldo(dict(r), r["debe"], r["haber"]) for r in inicial}
        filas = []
        for m in movs:
            s_ini = ini.get(m["cuenta_id"], 0)
            s_fin = s_ini + saldo(m, m["debe"], m["haber"])
            filas.append({**m, "saldo_inicial": s_ini, "saldo_final": s_fin})
        todas = q("SELECT * FROM fin_cuentas WHERE activa=1 ORDER BY codigo")
        for c in todas:
            if not any(f["cuenta_id"] == c["id"] for f in filas):
                s_ini = ini.get(c["id"], 0)
                filas.append({"cuenta_id": c["id"], "codigo": c["codigo"], "nombre": c["nombre"],
                              "naturaleza": c["naturaleza"], "saldo_normal": c["saldo_normal"],
                              "debe": 0, "haber": 0, "saldo_inicial": s_ini, "saldo_final": s_ini})
        filas.sort(key=lambda f: f["codigo"])
        return h.send_json(200, {"filas": filas, "cuadre": cuadre_ok(movs)})

    @route("GET", "/api/fin/estado-resultados", roles=roles)
    def estado_resultados(h, u, ident):
        desde, hasta, cuenta, centro = _params(h)
        t, movs = total_por_naturaleza(q, desde, hasta, cuenta, centro)
        ingresos = t.get("INGRESO", 0)
        costos = t.get("COSTO", 0)
        gastos = t.get("GASTO", 0)
        utilidad = ingresos - costos - gastos
        # Evolución mensual para gráficos
        mensual = q(
            "SELECT substr(a.fecha,1,7) mes, c.naturaleza, SUM(l.debe-l.haber) d, SUM(l.haber-l.debe) h"
            " FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id JOIN fin_cuentas c ON c.id=l.cuenta_id"
            " WHERE c.naturaleza IN('INGRESO','COSTO','GASTO') GROUP BY mes, c.naturaleza ORDER BY mes")
        ev = {}
        for r in mensual:
            e = ev.setdefault(r["mes"], {"ingresos": 0, "costos": 0, "gastos": 0})
            v = r["h"] if r["naturaleza"] == "INGRESO" else r["d"]
            e[{"INGRESO": "ingresos", "COSTO": "costos", "GASTO": "gastos"}[r["naturaleza"]]] = v
        for e in ev.values():
            e["utilidad"] = e["ingresos"] - e["costos"] - e["gastos"]
        return h.send_json(200, {
            "ingresos": ingresos, "costos": costos, "gastos": gastos, "utilidad": utilidad,
            "detalle": movs, "evolucion": [{"periodo": k, **v} for k, v in sorted(ev.items())]})

    @route("GET", "/api/fin/balance-general", roles=roles)
    def balance_general(h, u, ident):
        desde, hasta, cuenta, centro = _params(h)
        t, movs = total_por_naturaleza(q, desde, hasta, cuenta, centro)
        # La utilidad del ejercicio suma al patrimonio en el balance
        utilidad = t.get("INGRESO", 0) - t.get("COSTO", 0) - t.get("GASTO", 0)
        activos = t.get("ACTIVO", 0)
        pasivos = t.get("PASIVO", 0)
        patrimonio = t.get("PATRIMONIO", 0) + utilidad
        return h.send_json(200, {
            "activos": activos, "pasivos": pasivos, "patrimonio": patrimonio, "utilidad_ejercicio": utilidad,
            "total_activos": activos, "total_pasivos_patrimonio": pasivos + patrimonio,
            "cuadra": abs(activos - (pasivos + patrimonio)) < 0.005,
            "detalle": movs})

    @route("GET", "/api/fin/fondo-inversion", roles=roles)
    def fondo_inversion(h, u, ident):
        """Estado del fondo de inversión estatal: entradas vs. salidas del período."""
        desde, hasta, cuenta, centro = _params(h)
        t, movs = total_por_naturaleza(q, desde, hasta, cuenta, centro)
        ingresos = t.get("INGRESO", 0)
        egresos = t.get("GASTO", 0) + t.get("COSTO", 0)
        # Inversión en activos no corrientes se separa como destino del fondo
        inv_activos = q(
            "SELECT COALESCE(SUM(l.debe-l.haber),0) v FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id"
            " JOIN fin_cuentas c ON c.id=l.cuenta_id WHERE c.naturaleza='ACTIVO' AND c.corriente=0"
            + _filtro_fecha(desde, hasta)[0], _filtro_fecha(desde, hasta)[1])
        inversion = inv_activos[0]["v"] if inv_activos else 0
        variacion = ingresos - egresos - inversion
        return h.send_json(200, {"ingresos": ingresos, "egresos": egresos,
                                 "inversion_activos": inversion, "variacion_fondo": variacion,
                                 "detalle": movs})

    @route("GET", "/api/fin/punto-equilibrio", roles=roles)
    def punto_equilibrio(h, u, ident):
        """Punto de equilibrio: CF / (precio unitario - costo variable unitario)."""
        p = _qp(h)
        desde, hasta, _, _ = _params(h)
        cf = q("SELECT COALESCE(SUM(l.debe-l.haber),0) v FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id"
               " JOIN fin_cuentas c ON c.id=l.cuenta_id WHERE c.tipo_costo='FIJO'"
               + _filtro_fecha(desde, hasta)[0], _filtro_fecha(desde, hasta)[1])[0]["v"]
        cv = q("SELECT COALESCE(SUM(l.debe-l.haber),0) v FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id"
               " JOIN fin_cuentas c ON c.id=l.cuenta_id WHERE c.tipo_costo='VARIABLE'"
               + _filtro_fecha(desde, hasta)[0], _filtro_fecha(desde, hasta)[1])[0]["v"]
        ing = q("SELECT COALESCE(SUM(l.haber-l.debe),0) v FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id"
                " JOIN fin_cuentas c ON c.id=l.cuenta_id WHERE c.naturaleza='INGRESO'"
                + _filtro_fecha(desde, hasta)[0], _filtro_fecha(desde, hasta)[1])[0]["v"]
        precio = float(p.get("precio") or 0)
        cvu = float(p.get("cvu") or 0)
        if not precio:
            precio = 1.0  # se pedirá en el cliente; por defecto 1 para mostrar estructura
        margen_unit = precio - cvu
        peb_unidades = (cf / margen_unit) if margen_unit > 0 else None
        # Margen de contribución sobre ventas reales (si hay ingresos)
        margen_contrib = (ing - cv) / ing if ing else None
        peb_moneda = (cf / margen_contrib) if (margen_contrib and margen_contrib > 0) else None
        return h.send_json(200, {"costos_fijos": cf, "costos_variables": cv, "ingresos": ing,
                                 "precio_unitario": precio, "costo_variable_unitario": cvu,
                                 "peb_unidades": peb_unidades, "peb_moneda": peb_moneda,
                                 "margen_contribucion": margen_contrib})

    @route("GET", "/api/fin/cuentas-t", roles=roles)
    def cuentas_t(h, u, ident):
        """Todas las cuentas T con sus saldos deudor y acreedor."""
        desde, hasta, cuenta, centro = _params(h)
        movs = {m["cuenta_id"]: m for m in movimientos(q, desde, hasta, cuenta, centro)}
        out = []
        for c in q("SELECT * FROM fin_cuentas WHERE activa=1 ORDER BY codigo"):
            m = movs.get(c["id"], {"debe": 0, "haber": 0})
            out.append({"cuenta_id": c["id"], "codigo": c["codigo"], "nombre": c["nombre"],
                        "naturaleza": c["naturaleza"], "saldo_normal": c["saldo_normal"],
                        "debe": m["debe"], "haber": m["haber"], "saldo": saldo(dict(c), m["debe"], m["haber"])})
        return h.send_json(200, {"cuentas": out, "cuadre": cuadre_ok(list(movs.values()))})

    @route("GET", "/api/fin/libro-mayor", roles=roles)
    def libro_mayor(h, u, ident):
        p = _qp(h)
        if not p.get("cuenta"):
            return h.err(400, "Indica ?cuenta=<id>")
        cuenta = q("SELECT * FROM fin_cuentas WHERE id=?", (p["cuenta"],), one=True)
        if not cuenta:
            return h.err(404, "Cuenta no encontrada")
        cond, args = _filtro_fecha(p.get("desde"), p.get("hasta"))
        if p.get("centro"):
            cond += " AND l.centro_id=?"; args.append(p["centro"])
        lineas = q(
            "SELECT l.id, a.fecha, a.descripcion, a.id asiento_id, l.centro_id, l.debe, l.haber"
            " FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id"
            f" WHERE l.cuenta_id=?{cond} ORDER BY a.fecha, l.id", (p["cuenta"],) + tuple(args))
        saldo_ini = q(
            "SELECT COALESCE(SUM(l.debe),0) d, COALESCE(SUM(l.haber),0) h FROM fin_lineas l"
            " JOIN fin_asientos a ON a.id=l.asiento_id WHERE l.cuenta_id=? AND a.fecha<?",
            (p["cuenta"], p.get("desde") or "0000-00-00"), one=True)
        ac = saldo(dict(cuenta), saldo_ini["d"], saldo_ini["h"])
        filas = []
        for l in lineas:
            ac += saldo(dict(cuenta), l["debe"], l["haber"])
            filas.append({**dict(l), "saldo": ac})
        return h.send_json(200, {"cuenta": dict(cuenta), "saldo_inicial": saldo(dict(cuenta), saldo_ini["d"], saldo_ini["h"]),
                                 "lineas": filas, "saldo_final": ac})

    # ---------------- márgenes y ratios ----------------
    @route("GET", "/api/fin/margenes", roles=roles)
    def margenes(h, u, ident):
        desde, hasta, cuenta, centro = _params(h)
        er = estado_resultados.__wrapped__(h, u, ident) if hasattr(estado_resultados, "__wrapped__") else None
        t, _ = total_por_naturaleza(q, desde, hasta, cuenta, centro)
        ing, cos, gas = t.get("INGRESO", 0), t.get("COSTO", 0), t.get("GASTO", 0)
        bruto = ing - cos
        operativo = bruto - gas
        neto = ing - cos - gas
        pct = lambda v: (v / ing * 100) if ing else None
        mensual = q(
            "SELECT substr(a.fecha,1,7) mes, c.naturaleza, SUM(l.debe-l.haber) d, SUM(l.haber-l.debe) h"
            " FROM fin_lineas l JOIN fin_asientos a ON a.id=l.asiento_id JOIN fin_cuentas c ON c.id=l.cuenta_id"
            " WHERE c.naturaleza IN('INGRESO','COSTO','GASTO') GROUP BY mes, c.naturaleza ORDER BY mes")
        ev = {}
        for r in mensual:
            e = ev.setdefault(r["mes"], {"ingresos": 0, "costos": 0, "gastos": 0})
            e[{"INGRESO": "ingresos", "COSTO": "costos", "GASTO": "gastos"}[r["naturaleza"]]] = r["h"] if r["naturaleza"] == "INGRESO" else r["d"]
        evolucion = []
        for mes, e in sorted(ev.items()):
            i, c, g = e["ingresos"], e["costos"], e["gastos"]
            evolucion.append({"periodo": mes, "margen_bruto": pct(i - c), "margen_operativo": pct(i - c - g),
                              "margen_neto": pct(i - c - g)})
        return h.send_json(200, {
            "formulas": {"bruto": "(Ingresos - Costo de ventas) / Ingresos",
                         "operativo": "(Margen bruto - Gastos operativos) / Ingresos",
                         "neto": "(Ingresos - Costos - Gastos) / Ingresos"},
            "margen_bruto": pct(bruto), "margen_operativo": pct(operativo),
            "margen_antes_impuestos": pct(operativo), "margen_neto": pct(neto),
            "valores": {"ingresos": ing, "costo_ventas": cos, "gastos": gas, "utilidad": neto},
            "evolucion": evolucion})

    @route("GET", "/api/fin/ratios", roles=roles)
    def ratios(h, u, ident):
        desde, hasta, cuenta, centro = _params(h)
        t, movs = total_por_naturaleza(q, desde, hasta, cuenta, centro)
        # Subtotales por naturaleza y carácter corriente
        def sub(nat, corriente=None):
            cond, args = _filtro_fecha(desde, hasta)
            if corriente is not None:
                cond += " AND c.corriente=?"; args.append(corriente)
            r = q("SELECT COALESCE(SUM(l.debe),0) d, COALESCE(SUM(l.haber),0) h FROM fin_lineas l"
                  " JOIN fin_asientos a ON a.id=l.asiento_id JOIN fin_cuentas c ON c.id=l.cuenta_id"
                  f" WHERE c.naturaleza=?{cond}", (nat,) + tuple(args), one=True)
            return saldo({"saldo_normal": NATURALEZAS[nat]}, r["d"], r["h"])
        ing, cos, gas = t.get("INGRESO", 0), t.get("COSTO", 0), t.get("GASTO", 0)
        utilidad = ing - cos - gas
        ac = sub("ACTIVO", 1); anc = sub("ACTIVO", 0)
        pc = sub("PASIVO", 1); pnc = sub("PASIVO", 0)
        pat = t.get("PATRIMONIO", 0) + utilidad
        cxc = sub("ACTIVO", 1)  # aproximación: días de cobro sobre ingresos
        out = []
        def add(cat, nombre, formula, valor, interp):
            out.append({"categoria": cat, "nombre": nombre, "formula": formula,
                        "valor": None if valor is None else round(valor, 4), "interpretacion": interp})
        lc = ac / pc if pc else None
        add("Liquidez", "Liquidez corriente", "Activo corriente / Pasivo corriente", lc,
            "Mide la capacidad de pagar deudas a corto plazo. >1.5 es saludable; <1 alerta de liquidez." if lc is not None else "Sin datos suficientes.")
        rp = ac / (pc or 1)
        add("Liquidez", "Razón rápida", "(Activo corriente - Inventario) / Pasivo corriente", rp,
            "Versión estricta de liquidez sin contar inventario.")
        dias = (cxc / ing * 365) if ing else None
        add("Eficiencia operativa", "Días de cobro", "(Ctas por cobrar / Ingresos) x 365", dias,
            "Días promedio que tardan los clientes en pagar. Menor = mejor gestión de cobranza.")
        rot = ing / ((ac + anc) or 1)
        add("Eficiencia operativa", "Rotación de activos", "Ingresos / Activos totales", rot,
            "Eficiencia con la que los activos generan ventas. Mayor = mejor uso del capital.")
        roa = utilidad / ((ac + anc) or 1) * 100
        add("Rentabilidad", "ROA (sobre activos)", "Utilidad / Activos x 100", roa,
            "Rentabilidad que generan los activos. >5% suele considerarse buena.")
        roe = utilidad / (pat or 1) * 100
        add("Rentabilidad", "ROE (sobre patrimonio)", "Utilidad / Patrimonio x 100", roe,
            "Retorno para los dueños. Comparar con alternativas de inversión.")
        mn = utilidad / ing * 100 if ing else None
        add("Rentabilidad", "Margen neto", "Utilidad / Ingresos x 100", mn,
            "Porcentaje de cada venta que queda como ganancia.")
        return h.send_json(200, {"ratios": out})

    # ---------------- indicadores web / servidor / app ----------------
    @route("GET", "/api/fin/metricas", roles=roles)
    def metricas_get(h, u, ident):
        return h.send_json(200, {"metricas": [dict(r) for r in q("SELECT * FROM fin_metricas ORDER BY periodo")]})

    @route("POST", "/api/fin/metricas", roles=roles)
    def metricas_post(h, u, ident):
        b = h.body()
        periodo = str(b.get("periodo", "")).strip()
        if not periodo:
            return h.err(400, "Indica el período AAAA-MM")
        q("INSERT OR REPLACE INTO fin_metricas(periodo,visitantes,registros,compras,clientes_nuevos,usuarios_activos,gasto_marketing,costo_infra,mrr)"
          " VALUES(?,?,?,?,?,?,?,?,?)",
          (periodo, int(b.get("visitantes") or 0), int(b.get("registros") or 0), int(b.get("compras") or 0),
           int(b.get("clientes_nuevos") or 0), int(b.get("usuarios_activos") or 0),
           float(b.get("gasto_marketing") or 0), float(b.get("costo_infra") or 0), float(b.get("mrr") or 0)))
        return h.send_json(201, {"ok": True})

    @route("GET", "/api/fin/indicadores", roles=roles)
    def indicadores(h, u, ident):
        p = _qp(h)
        cond, args = "", []
        if p.get("desde"):
            cond += " AND periodo>=?"; args.append(p["desde"])
        if p.get("hasta"):
            cond += " AND periodo<=?"; args.append(p["hasta"])
        filas = [dict(r) for r in q(f"SELECT * FROM fin_metricas WHERE 1=1{cond} ORDER BY periodo", args)]
        out = []
        for m in filas:
            conv = m["compras"] / m["visitantes"] * 100 if m["visitantes"] else None
            cac = m["gasto_marketing"] / m["clientes_nuevos"] if m["clientes_nuevos"] else None
            arpu = m["mrr"] / m["usuarios_activos"] if m["usuarios_activos"] else None
            infra_u = m["costo_infra"] / m["usuarios_activos"] if m["usuarios_activos"] else None
            inversion = m["gasto_marketing"] + m["costo_infra"]
            roi = (m["mrr"] - inversion) / inversion * 100 if inversion else None
            out.append({**m, "tasa_conversion": conv, "cac": cac, "arpu": arpu,
                        "costo_infra_usuario": infra_u, "roi": roi,
                        "margen_contribucion": (m["mrr"] - m["costo_infra"]) if m["mrr"] else None})
        return h.send_json(200, {"indicadores": out})

    # ---------------- QR de cobro ----------------
    @route("GET", "/api/fin/qr", roles=roles)
    def qr_get(h, u, ident):
        return h.send_json(200, {"config": dict(q("SELECT * FROM fin_qr WHERE id=1", one=True) or {})})

    @route("PUT", "/api/fin/qr", roles=roles)
    def qr_put(h, u, ident):
        b = h.body()
        q("UPDATE fin_qr SET titular=?, banco=?, cuenta=?, moneda=?, referencia=? WHERE id=1",
          (b.get("titular", ""), b.get("banco", ""), b.get("cuenta", ""), b.get("moneda", "USD"), b.get("referencia", "")))
        return h.send_json(200, {"ok": True})

    @route("GET", "/api/fin/qr/pago", need=False)
    def qr_pago(h, u, ident):
        """Devuelve el texto/URL que se codifica en el QR: abre la pantalla de pago pública."""
        from urllib.parse import urlencode
        cfg = q("SELECT * FROM fin_qr WHERE id=1", one=True)
        if not cfg:
            return h.err(404, "Configura primero los datos de cobro")
        p = _qp(h)
        monto = p.get("monto", "")
        ref = p.get("ref", cfg["referencia"])
        # El QR apunta a la pantalla pública de pago (web/fin-pago.html)
        base = h.headers.get("Host", "localhost")
        proto = "https" if h.secure() else "http"
        url = f"{proto}://{base}/fin-pago.html?" + urlencode({
            "titular": cfg["titular"], "banco": cfg["banco"], "cuenta": cfg["cuenta"],
            "moneda": cfg["moneda"], "monto": monto, "ref": ref})
        return h.send_json(200, {"url": url, "payload": url,
                                 "datos": {"titular": cfg["titular"], "banco": cfg["banco"],
                                           "cuenta": cfg["cuenta"], "moneda": cfg["moneda"],
                                           "monto": monto, "referencia": ref}})
