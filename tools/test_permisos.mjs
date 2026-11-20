#!/usr/bin/env node
/**
 * Revisión completa de permisos: **Web ↔ Servidor ↔ Android ↔ documentación**.
 *
 * NovaGest describe el mismo reparto de roles en cuatro sitios y hasta ahora nada
 * impedía que se descuadraran. Este test los compara todos contra las filas de la
 * tabla de `README.md` (que `docs/MANUAL_USUARIO.md` debe copiar literalmente):
 *
 *   1. `web/js/calc.js`      → PERMS + PERMS_ADMINS + PERMS_SOLO_ADMINISTRADOR + can()
 *   2. `server/novagest_server.py` → WRITE, CLOSE_DAY, ADMINS y los `roles=` de las rutas
 *   3. `Models.kt` (Android) → enum Permission + RolePermissions.of()
 *   4. `README.md` y `docs/MANUAL_USUARIO.md` → la tabla de roles, idéntica entre sí
 *
 * Cada fila de la tabla se asocia a los permisos que necesita «ver» y «editar»;
 * la celda esperada se deriva de `calc.js` y se compara con lo que dice el documento.
 *
 * Uso:  node tools/test_permisos.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PERMS, PERMS_ADMINS, PERMS_SOLO_ADMINISTRADOR, ROLE_LABELS, ROLE_ORDER, can } from "../web/js/calc.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const leer = (p) => readFileSync(join(raiz, p), "utf8");

const ROLES = ROLE_ORDER;
let fallos = 0, comprobaciones = 0;
const ok = (cond, msg) => {
  comprobaciones++;
  if (!cond) { fallos++; console.error(`  ✗ ${msg}`); }
};
const set = (...xs) => new Set(xs);

/* ────────────────────────────────────────────────────────────────────────────
 * 0. Vocabulario y matriz que la Web declara
 * ──────────────────────────────────────────────────────────────────────────── */
const explicitPermLists = Object.entries(PERMS).filter(([, list]) => Array.isArray(list));
const vocabulario = new Set([
  ...explicitPermLists.flatMap(([, list]) => list), ...PERMS_ADMINS, ...PERMS_SOLO_ADMINISTRADOR,
]);
const conPerm = (perm) => ROLES.filter((r) => can(r, perm));

console.log("Matriz de la Web (web/js/calc.js)");
console.log(`  vocabulario: ${vocabulario.size} permisos`);
for (const r of ROLES) {
  console.log(`  ${r.padEnd(14)} ${[...vocabulario].filter((p) => can(r, p)).length} permisos`);
}

// Un permiso no puede aparecer en una plantilla de rol y, a la vez, ser exclusivo de admins.
for (const [rol, lista] of explicitPermLists) {
  for (const p of lista) {
    ok(!PERMS_SOLO_ADMINISTRADOR.includes(p), `${p}: ${rol} y «solo ADMINISTRADOR» a la vez`);
    ok(!PERMS_ADMINS.includes(p), `${p}: ${rol} y «solo ADMIN/JEFE» a la vez`);
  }
  ok(new Set(lista).size === lista.length, `lista ${rol} con permisos repetidos`);
}
for (const p of PERMS_ADMINS) ok(!PERMS_SOLO_ADMINISTRADOR.includes(p), `${p}: en PERMS_ADMINS y en PERMS_SOLO_ADMINISTRADOR`);

// can() debe negar lo que no está declarado y respetar el nivel de cada rol.
ok(can("ECONOMICO", "PERMISO_QUE_NO_EXISTE") === false, "can() acepta un permiso inexistente");
ok(can("NADIE", "INVENTORY_VIEW") === false, "can() acepta un rol inexistente");
ok(can("JEFE", "WAREHOUSE_CLEAR") === false, "JEFE no debe poder limpiar almacenes (el servidor lo deja solo a ADMINISTRADOR)");
ok(can("ADMINISTRADOR", "WAREHOUSE_CLEAR") === true, "ADMINISTRADOR debe poder limpiar almacenes");
ok(can("JEFE", "USERS_EDIT") === true, "JEFE debe poder editar usuarios");

/* ────────────────────────────────────────────────────────────────────────────
 * 1. Tablas de documentación (README y MANUAL deben ser idénticas)
 * ──────────────────────────────────────────────────────────────────────────── */
function tablaDe(fichero, cabecera) {
  const lineas = leer(fichero).split("\n");
  const i = lineas.findIndex((l) => l.startsWith(cabecera));
  ok(i >= 0, `${fichero}: no se encontró la cabecera «${cabecera}»`);
  if (i < 0) return [];
  const filas = [];
  for (let j = i + 2; j < lineas.length && lineas[j].startsWith("|"); j++) {
    const celdas = lineas[j].split("|").slice(1, -1).map((c) => c.trim());
    ok(celdas.length === ROLES.length + 1, `${fichero}: la fila «${lineas[j].slice(0, 60)}…» tiene ${celdas.length} celdas (se esperaban ${ROLES.length + 1})`);
    filas.push(celdas);
  }
  return filas;
}

const readme = tablaDe("README.md", "| Área | Administrador |");
const manual = tablaDe("docs/MANUAL_USUARIO.md", "| Acción / sección |");
ok(readme.length >= 20, `README: solo ${readme.length} filas de roles (se esperaban ≥20)`);
ok(readme.length === manual.length, `README (${readme.length}) y MANUAL (${manual.length}) no tienen el mismo número de filas`);
for (let i = 0; i < Math.min(readme.length, manual.length); i++) {
  ok(readme[i][0] === manual[i][0], `fila ${i}: README dice «${readme[i][0]}» y MANUAL «${manual[i][0]}»`);
  for (let c = 1; c <= ROLES.length; c++) {
    ok(readme[i][c] === manual[i][c],
      `fila «${readme[i][0]}» / columna ${ROLES[c - 1]}: README «${readme[i][c]}» ≠ MANUAL «${manual[i][c]}»`);
  }
}

/**
 * Permisos que necesita cada fila de la tabla para «ver» y para «editar».
 * `ver` es lo mínimo para abrir la sección; `editar` (si existe) es lo necesario
 * para cambiar algo. La celda se deriva de `calc.js`:
 *   tiene editar → ✅ · tiene solo ver → «solo ver» (o «editar» si la fila lo pide) · si no → —
 */
const FILAS = {
  "Panel, inventario y movimientos (consulta)": { ver: ["INVENTORY_VIEW", "MOVEMENT_VIEW"] },
  "Crear y editar productos": { ver: ["INVENTORY_VIEW"], editar: ["INVENTORY_EDIT"] },
  "Enviar productos a la papelera": { ver: ["INVENTORY_VIEW"], editar: ["INVENTORY_DELETE"] },
  "Papelera: borrado definitivo": { ver: ["INVENTORY_VIEW"], editar: ["INVENTORY_PURGE"] },
  "Ver almacenes y existencias": { ver: ["WAREHOUSE_VIEW"] },
  "Editar almacenes, traspasar e importar valores": { ver: ["WAREHOUSE_VIEW"], editar: ["WAREHOUSE_EDIT", "VALUES_IMPORT"] },
  "Limpiar un almacén o los municipios (🧹)": { ver: ["WAREHOUSE_VIEW"], editar: ["WAREHOUSE_CLEAR"] },
  "Ver movimientos": { ver: ["MOVEMENT_VIEW"] },
  "Vender y registrar movimientos": { ver: ["MOVEMENT_VIEW"], editar: ["MOVEMENT_CREATE"] },
  "Registrar entradas y salidas manuales": { ver: ["MOVEMENT_VIEW"], editar: ["MOVEMENT_NON_SALE_CREATE"] },
  "Editar movimientos y enviarlos a la papelera": { ver: ["MOVEMENT_VIEW"], editar: ["MOVEMENT_EDIT", "MOVEMENT_DELETE"] },
  "Movimientos: borrado definitivo": { ver: ["MOVEMENT_VIEW"], editar: ["MOVEMENT_PURGE"] },
  "Cuadre diario (consulta)": { ver: ["CUADRE_VIEW"] },
  "Editar y cerrar el cuadre": { ver: ["CUADRE_VIEW"], editar: ["CUADRE_EDIT", "DAY_CLOSE"] },
  "Reabrir un día cerrado": { ver: ["CUADRE_VIEW"], editar: ["DAY_REOPEN"] },
  "Historial de precios": { ver: ["HISTORY_VIEW"] },
  "Informes, comprobación y finanzas": { ver: ["REPORTS_VIEW"], editar: ["REPORTS_VIEW", "REPORTS_EXPORT", "REPORTS_FINANCIAL"] },
  "Tasas de cambio (Monedas)": { ver: ["EXCHANGE_EDIT"] },
  "Clientes y fiados": { ver: ["CUSTOMER_VIEW"], editar: ["CUSTOMER_EDIT"] },
  "Fichas de costo e IPV": { ver: ["IPV_VIEW"], editar: ["IPV_VIEW", "IPV_EDIT"], soloVer: true },
  "Usuarios": { ver: ["USERS_VIEW"], editar: ["USERS_EDIT"] },
  "Ajustes del negocio y datos legales": { ver: ["SETTINGS_EDIT"] },
  "Salud del sistema (métricas)": { ver: ["HEALTH_VIEW"] },
  "Auditoría, seguridad e impresiones": { ver: ["AUDIT_VIEW"], editar: ["AUDIT_VIEW", "SECURITY_LOG_VIEW", "PRINTS_VIEW"] },
  "Copias de seguridad (crear)": { ver: ["BACKUP_MANAGE"] },
  "Restaurar copias, descargar y recargar Excel": { ver: ["BACKUP_MANAGE"], editar: ["BACKUP_RESTORE"] },
  "Licencia de uso (ver y generar)": { ver: ["LICENSE_MANAGE"] },
  "Licencia: eliminar": { ver: ["LICENSE_MANAGE"], editar: ["LICENSE_DELETE"] },
};

if (process.argv.includes("--update-docs")) {
  const etiquetas = readme.map((fila) => fila[0]);
  const encabezado = `| ${"Área"} | ${ROLE_ORDER.map((r) => ROLE_LABELS[r]).join(" | ")} |`;
  const separador = `|${Array(ROLE_ORDER.length + 1).fill("---").join("|")}|`;
  const filas = etiquetas.map((etiqueta) => {
    const defs = FILAS[etiqueta];
    if (!defs) throw new Error(`Fila documental sin definición: ${etiqueta}`);
    const celdas = ROLE_ORDER.map((rol) => {
      const ver = defs.ver.every((p) => can(rol, p));
      const editar = defs.editar ? defs.editar.every((p) => can(rol, p)) : ver;
      return editar ? "✅" : (defs.soloVer && ver ? "solo ver" : "—");
    });
    return `| ${etiqueta} | ${celdas.join(" | ")} |`;
  });
  const tabla = [encabezado, separador, ...filas].join("\n");
  for (const fichero of ["README.md", "docs/MANUAL_USUARIO.md"]) {
    const contenido = leer(fichero);
    const cabeceraAnterior = fichero === "README.md" ? "| Área | Administrador |" : "| Acción / sección | Administrador |";
    const inicio = contenido.indexOf(cabeceraAnterior);
    if (inicio < 0) throw new Error(`No se encontró tabla roles en ${fichero}`);
    const finLinea = contenido.indexOf("\n", inicio);
    let fin = finLinea;
    while (fin >= 0) {
      const siguiente = contenido.indexOf("\n", fin + 1);
      const linea = contenido.slice(fin + 1, siguiente < 0 ? contenido.length : siguiente);
      if (!linea.startsWith("|")) break;
      fin = siguiente;
    }
    const primeraColumna = fichero === "README.md" ? "Área" : "Acción / sección";
    const reemplazo = tabla.replace("| Área |", `| ${primeraColumna} |`);
    writeFileSync(join(raiz, fichero), contenido.slice(0, inicio) + reemplazo + contenido.slice(fin + 1));
  }
  console.log("Tablas de permisos actualizadas a partir de calc.js");
}

console.log("\nTablas de documentación");
for (const fila of readme) {
  const [etiqueta, ...celdas] = fila;
  const defs = FILAS[etiqueta];
  if (!defs) { ok(false, `fila «${etiqueta}» no está en FILAS de test_permisos.mjs`); continue; }
  ok(celdas.length === ROLES.length, `fila «${etiqueta}» sin las ${ROLES.length} columnas de rol`);
  ROLES.forEach((rol, i) => {
    const tieneVer = defs.ver.every((p) => can(rol, p));
    const tieneEditar = defs.editar ? defs.editar.every((p) => can(rol, p)) : tieneVer;
    // «solo ver» solo tiene sentido en las filas que lo admited; en el resto, si el
    // rol no puede editar, la respuesta documentada es «—».
    const esperado = tieneEditar ? "✅" : (defs.soloVer && tieneVer ? "solo ver" : "—");
    const real = celdas[i];
    ok(real === esperado, `«${etiqueta}» / ${rol}: el documento dice «${real}» y calc.js implica «${esperado}»`);
  });
}
// Ninguna fila documentada puede quedar sin definir en FILAS.
for (const etiqueta of Object.keys(FILAS)) {
  ok(readme.some((f) => f[0] === etiqueta), `FILAS define «${etiqueta}» pero la tabla no la tiene`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 2. Servidor: WRITE, CLOSE_DAY, ADMINS y las rutas con `roles=`
 * ──────────────────────────────────────────────────────────────────────────── */
console.log("\nServidor (server/novagest_server.py)");
const py = leer("server/novagest_server.py");
const rolesServidor = new Set(py.match(/^ROLES = \(([^)]*)\)/m)?.[1].match(/"[A-Z]+"/g)?.map((x) => x.slice(1, -1)) ?? []);
ok(rolesServidor.size === ROLES.length && ROLES.every((r) => rolesServidor.has(r)), `ROLES del servidor no coincide con calc.js: ${[...rolesServidor]}`);

const cuerpo = (marca) => {
  const i = py.indexOf(marca);
  ok(i >= 0, `no se encontró «${marca}»`);
  if (i < 0) return "";
  return py.slice(i + marca.length, py.indexOf("\n}", i));
};
const rolesDe = (txt) => new Set(txt.match(/"[A-Z]+"/g)?.map((x) => x.slice(1, -1)) ?? []);

const writeTxt = cuerpo("WRITE = {");
const WRITE = {};
for (const m of writeTxt.matchAll(/"(\w+)":\s*(\{[^}]*\}|set\(ROLES\))/g)) {
  WRITE[m[1]] = m[2] === "set(ROLES)" ? set(...ROLES) : rolesDe(m[2]);
}

// Sección del estado → permisos que la Web exige para poder escribirla.
const SECCIONES = {
  products: ["INVENTORY_EDIT", "INVENTORY_DELETE"],
  movements: ["MOVEMENT_CREATE", "MOVEMENT_EDIT", "MOVEMENT_DELETE"],
  priceHistory: ["INVENTORY_EDIT"],
  cuadres: ["CUADRE_EDIT"],
  rates: ["EXCHANGE_EDIT"],
  weekly: ["WEEKLY_EDIT"],
  excelDailyReports: ["VALUES_IMPORT"],
  settings: ["SETTINGS_EDIT"],
  warehouses: ["WAREHOUSE_EDIT"],
  warehouseEntries: ["WAREHOUSE_EDIT"],
  customers: ["CUSTOMER_EDIT"],
  credits: ["CUSTOMER_EDIT"],
  fichas: ["IPV_EDIT"],
  ipvControls: ["IPV_EDIT"],
  // Las encuestas son una función compartida habilitada para toda sesión autenticada.
  surveys: null,
  // El registro de auditoría lo escribe el servidor en cada acción; ningún rol lo edita.
  audit: null,
};
for (const [sec, perms] of Object.entries(SECCIONES)) {
  ok(WRITE[sec], `WRITE no tiene la sección «${sec}»`);
  if (!WRITE[sec]) continue;
  const esperado = perms ? set(...ROLES.filter((r) => perms.some((p) => can(r, p)))) : set(...ROLES);
  const dif = [...WRITE[sec]].filter((x) => !esperado.has(x)).concat([...esperado].filter((x) => !WRITE[sec].has(x)));
  ok(dif.length === 0, `WRITE["${sec}"]: el servidor da ${[...WRITE[sec]].sort()} y calc.js implica ${[...esperado].sort()}`);
}
for (const sec of Object.keys(WRITE)) ok(sec in SECCIONES, `WRITE tiene la sección «${sec}» sin definir en SECCIONES`);

// La descarga del estado tampoco debe exponer secciones que el rol no puede consultar.
const readTxt = cuerpo("READ = {");
const READ = {};
for (const m of readTxt.matchAll(/"(\w+)":\s*(\{[^}]*\}|set\(ROLES\))/g)) {
  READ[m[1]] = m[2] === "set(ROLES)" ? set(...ROLES) : rolesDe(m[2]);
}
const READ_PERM = {
  products: "INVENTORY_VIEW", movements: "MOVEMENT_VIEW", cuadres: "CUADRE_VIEW", audit: "AUDIT_VIEW",
  rates: "EXCHANGE_EDIT", priceHistory: "HISTORY_VIEW", weekly: "WEEKLY_VIEW", excelDailyReports: "REPORTS_VIEW",
  settings: "SETTINGS_EDIT", warehouses: "WAREHOUSE_VIEW", warehouseEntries: "WAREHOUSE_VIEW",
  customers: "CUSTOMER_VIEW", credits: "CUSTOMER_VIEW", fichas: "IPV_VIEW", ipvControls: "IPV_VIEW", surveys: null,
};
const shared = [...(leer("web/js/store.js").match(/const SHARED = \[([^\]]*)\]/)?.[1].match(/"\w+"/g) ?? [])].map((x) => x.slice(1, -1));
for (const sec of shared) {
  ok(READ[sec], `READ no protege ni declara la sección «${sec}»`);
  if (!READ[sec]) continue;
  const perm = READ_PERM[sec];
  const esperado = perm ? set(...ROLES.filter((r) => can(r, perm))) : set(...ROLES);
  const dif = [...READ[sec]].filter((r) => !esperado.has(r)).concat([...esperado].filter((r) => !READ[sec].has(r)));
  ok(dif.length === 0, `READ["${sec}"]: servidor ${[...READ[sec]].sort()} ≠ ${perm || "todos los roles"} de calc.js`);
}
for (const sec of Object.keys(READ)) ok(shared.includes(sec), `READ tiene la sección «${sec}» que no viaja en SHARED`);
const validator = py.slice(py.indexOf("def validate_change("), py.indexOf("\n\ndef ", py.indexOf("def validate_change(")));
ok(validator.includes('if role == "VENDEDOR"') && validator.includes('m.get("type") != "VENTA"'),
  "validate_change debe limitar VENDEDOR a crear ventas, sin editar/borrar movimientos previos ni agregar otros tipos");

const closeDay = set(...(py.match(/^CLOSE_DAY = \{([^}]*)\}/m)?.[1].match(/"[A-Z]+"/g) ?? []).map((x) => x.slice(1, -1)));
  ok(closeDay.size === ROLES.filter((r) => can(r, "DAY_CLOSE")).length, `CLOSE_DAY tiene ${closeDay.size} roles, no coincide con la matriz`);
const esperadoClose = set(...ROLES.filter((r) => can(r, "DAY_CLOSE")));
ok([...closeDay].every((r) => esperadoClose.has(r)) && [...esperadoClose].every((r) => closeDay.has(r)),
  `CLOSE_DAY = ${[...closeDay].sort()} ≠ DAY_CLOSE de calc.js = ${[...esperadoClose].sort()}`);

const admins = set(...(py.match(/^ADMINS = \{([^}]*)\}/m)?.[1].match(/"[A-Z]+"/g) ?? []).map((x) => x.slice(1, -1)));
const esperadoAdmins = set(...ROLES.filter((r) => can(r, "USERS_EDIT")));
ok([...admins].every((r) => esperadoAdmins.has(r)) && [...esperadoAdmins].every((r) => admins.has(r)),
  `ADMINS = ${[...admins].sort()} ≠ USERS_EDIT de calc.js = ${[...esperadoAdmins].sort()}`);

// Evalúa la expresión `roles=` de una ruta.
function evalRoles(expr) {
  if (!expr) return null;                       // sin roles = cualquier sesión
  if (expr.includes("set(ROLES)")) return set(...ROLES);
  const partes = expr.split("|").map((s) => s.trim());
  const out = set();
  for (const parte of partes) {
    if (parte === "ADMINS") for (const r of admins) out.add(r);
    else if (parte === "CLOSE_DAY") for (const r of closeDay) out.add(r);
    else for (const r of parte.match(/"[A-Z]+"/g) ?? []) out.add(r.slice(1, -1));
  }
  return out;
}

// Rutas cuyo permiso ya está decidido en la matriz: el servidor tiene que coincidir.
const RUTAS = [
  ["GET", "/api/users", ["USERS_VIEW"]],
  ["POST", "/api/users", ["USERS_EDIT"]],
  ["PUT", "/api/users/:id", ["USERS_EDIT"]],
  ["POST", "/api/backups", ["BACKUP_MANAGE"]],
  ["GET", "/api/backups", ["BACKUP_MANAGE"]],
  ["GET", "/api/backups/external", ["BACKUP_MANAGE"]],
  ["POST", "/api/backups/external", ["BACKUP_MANAGE"]],
  ["POST", "/api/backups/:id", ["BACKUP_RESTORE"]],
  ["GET", "/api/backups/:id", ["BACKUP_RESTORE"]],
  ["POST", "/api/warehouses/clear", ["WAREHOUSE_CLEAR"]],
  ["DELETE", "/api/license/:id", ["LICENSE_DELETE"]],
  ["POST", "/api/license/delete-all", ["LICENSE_DELETE"]],
  ["POST", "/api/license/generate", ["LICENSE_MANAGE"]],
  ["GET", "/api/license/info", ["LICENSE_MANAGE"]],
  ["DELETE", "/api/security-log/anchor/:id", ["AUDIT_ANCHOR_DELETE"]],
  ["GET", "/api/security-log", ["SECURITY_LOG_VIEW"]],
  ["GET", "/api/security-log/verify", ["SECURITY_LOG_VIEW"]],
  ["GET", "/api/security-log/anchors", ["SECURITY_LOG_VIEW"]],
  ["GET", "/api/security-log/anchor-token/:id", ["SECURITY_LOG_VIEW"]],
  ["POST", "/api/security-log/anchor", ["AUDIT_ANCHOR_CREATE"]],
  ["GET", "/api/prints", ["PRINTS_VIEW"]],
  ["GET", "/api/exchange/eltoque", ["EXCHANGE_EDIT"]],
  ["GET", "/api/exchange/divisa", ["EXCHANGE_EDIT"]],
  ["GET", "/api/metrics", ["HEALTH_VIEW"]],
  ["POST", "/api/days/close", ["DAY_CLOSE"]],
  ["POST", "/api/days/reopen", ["DAY_REOPEN"]],
  ["PUT", "/api/legal", ["SETTINGS_EDIT"]],
];

// Crear una impresión está abierto a cualquier rol (el servidor lo permite y la
// Web no lo restringe): se comprueba aparte para que nadie lo «apriete» por error.
const RUTAS_ABIERTAS_A_TODOS = [["POST", "/api/prints"]];

const rutas = new Map();
for (const m of py.matchAll(/@route\("(\w+)",\s*"([^"]+)"([^)]*)\)/g)) {
  const i = m[3].indexOf("roles=");
  const roles = evalRoles(i >= 0 ? m[3].slice(i + 6).trim() : null);
  rutas.set(`${m[1]} ${m[2]}`, roles);
}
ok(rutas.size > 40, `solo se parsearon ${rutas.size} rutas`);

for (const [met, ruta] of RUTAS_ABIERTAS_A_TODOS) {
  const roles = rutas.get(`${met} ${ruta}`);
  ok(roles && [...roles].every((r) => ROLES.includes(r)) && roles.size === ROLES.length,
    `${met} ${ruta}: debería estar abierto a los ${ROLES.length} roles, tiene ${roles ? [...roles].sort() : "ninguna ruta"}`);
}

for (const [met, ruta, perms] of RUTAS) {
  const clave = `${met} ${ruta}`;
  const roles = rutas.get(clave);
  ok(roles, `el servidor no tiene la ruta ${clave}`);
  if (!roles) continue;
  const esperado = set(...ROLES.filter((r) => perms.every((p) => can(r, p))));
  const dif = [...roles].filter((x) => !esperado.has(x)).concat([...esperado].filter((x) => !roles.has(x)));
  ok(dif.length === 0, `${clave}: servidor ${[...roles].sort()} ≠ ${perms.join("+")} de calc.js → ${[...esperado].sort()}`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 3. Android: enum Permission + RolePermissions.of()
 * ──────────────────────────────────────────────────────────────────────────── */
console.log("\nAndroid (Models.kt)");
const kt = leer("app/src/main/java/com/novagest/inventario/domain/model/Models.kt");

const enumTxt = kt.match(/enum class Permission \{([\s\S]*?)\n\}/)?.[1] ?? "";
const enumKt = [...enumTxt.matchAll(/\b([A-Z][A-Z_0-9]+)\b/g)].map((m) => m[1]);
ok(enumKt.length > 30, `solo se parsearon ${enumKt.length} permisos de Android`);
ok(new Set(enumKt).size === enumKt.length, "el enum de Android tiene permisos repetidos");
for (const p of enumKt) ok(vocabulario.has(p), `Android declara «${p}» que la Web no conoce`);
for (const p of vocabulario) ok(enumKt.includes(p), `la Web conoce «${p}» pero el enum de Android no lo declara`);

const soloAdminKt = new Set(
  [...(kt.match(/val PERMS_SOLO_ADMINISTRADOR = setOf\(([\s\S]*?)\)/)?.[1] ?? "").matchAll(/Permission\.([A-Z_0-9]+)/g)].map((m) => m[1]),
);
ok(soloAdminKt.size === PERMS_SOLO_ADMINISTRADOR.length, `Android declara ${soloAdminKt.size} permisos solo-admin, la Web ${PERMS_SOLO_ADMINISTRADOR.length}`);
for (const p of PERMS_SOLO_ADMINISTRADOR) ok(soloAdminKt.has(p), `«${p}» falta en PERMS_SOLO_ADMINISTRADOR de Android`);

function bloquesOf(txt) {
  const cuerpo = txt.match(/fun of\(role: Role\): Set<Permission> = when \(role\) \{([\s\S]*?)\n    \}/)?.[1] ?? "";
  const out = {};
  // Un bloque por cada `Role.X -> …`; lo que haya debajo (hasta el siguiente rol)
  // forma parte de ese bloque, comentarios incluidos.
  const bloques = cuerpo.split(/\n\s*(?=Role\.)/).map((b) => b.trim()).filter(Boolean);
  for (const bloque of bloques) {
    const roles = [...bloque.matchAll(/^Role\.(\w+)/gm)].map((m) => m[1]);
    if (!roles.length) continue;
    let conjunto;
    if (/->\s*all\s*$/.test(bloque.split("\n")[0])) conjunto = new Set(enumKt);
    else if (bloque.includes("all - PERMS_SOLO_ADMINISTRADOR")) conjunto = new Set(enumKt.filter((p) => !soloAdminKt.has(p)));
    else conjunto = new Set([...bloque.matchAll(/Permission\.([A-Z_0-9]+)/g)].map((x) => x[1]));
    for (const rol of roles) out[rol] = conjunto;
  }
  return out;
}
const of = bloquesOf(kt);
for (const rol of ROLES) {
  ok(of[rol], `RolePermissions.of() no tiene el rol ${rol}`);
  if (!of[rol]) continue;
  const esperado = new Set(enumKt.filter((p) => can(rol, p)));
  const dif = [...of[rol]].filter((x) => !esperado.has(x)).concat([...esperado].filter((x) => !of[rol].has(x)));
  ok(dif.length === 0, `Android ${rol}: tiene ${[...of[rol]].sort().join(",")} ≠ calc.js → ${[...esperado].sort().join(",")}`);
}

// Ninguna pantalla de Android debe referenciar un permiso que su rol no tenga.
const usados = new Set();
for (const f of walk(join(raiz, "app/src/main/java"))) {
  if (f.endsWith("Models.kt")) continue;
  for (const m of readFileSync(f, "utf8").matchAll(/Permission\.([A-Z_0-9]+)/g)) usados.add(m[1]);
}
for (const p of usados) ok(enumKt.includes(p), `Android usa «${p}» que no existe en el enum`);
ok(usados.size >= 15, `solo se encontraron ${usados.size} usos de Permission.* en Android`);

/* ────────────────────────────────────────────────────────────────────────────
 * 4. La Web no debe usar permisos inventados ni esconder comprobaciones de rol
 * ──────────────────────────────────────────────────────────────────────────── */
console.log("\nUso de los permisos en la Web");
const app = leer("web/js/app.js");
ok(app.includes('can(role(), "MOVEMENT_NON_SALE_CREATE")'), "la Web debe ocultar ENTRADA/SALIDA al perfil VENDEDOR");
const movementsAndroid = leer("app/src/main/java/com/novagest/inventario/ui/movements/MovementsScreen.kt");
ok(movementsAndroid.includes("Permission.MOVEMENT_NON_SALE_CREATE") && movementsAndroid.includes("listOf(MovementType.VENTA)"),
  "Android debe limitar VENDEDOR a crear ventas, sin entradas/salidas manuales");
const store = leer("web/js/store.js");
ok(store.includes("this.readableSections.has(k)"), "la Web solo debe enviar secciones legibles por el rol");
ok(store.includes("const blocked = SHARED.filter"), "la Web no debe restaurar cola offline de secciones ocultas por rol");
for (const m of app.matchAll(/allowed\("([A-Z_]+)"\)/g)) ok(vocabulario.has(m[1]), `app.js usa allowed("${m[1]}") que no está en calc.js`);
for (const m of app.matchAll(/perm: "([A-Z_]+)"/g)) ok(vocabulario.has(m[1]), `app.js declara perm: "${m[1]}" que no está en calc.js`);
for (const m of store.matchAll(/can\([^,]+,\s*"([A-Z_]+)"\)/g)) ok(vocabulario.has(m[1]), `store.js usa can(…, "${m[1]}") que no está en calc.js`);

// Ninguna pantalla debe decidir con el nombre del rol: la matriz manda.
const duros = [...app.matchAll(/\["ADMINISTRADOR"[^\]]*\]\.includes\(role\(\)\)|role\(\) === "ADMINISTRADOR"|role\(\) !== "ADMINISTRADOR"/g)];
ok(duros.length === 0, `quedan ${duros.length} comprobaciones de rol a mano en app.js: ${duros.map((d) => d[0]).join(" · ")}`);
const durosStore = [...store.matchAll(/\["ADMINISTRADOR"[^\]]*\]\.includes\(u\.role\)|this\.state\.session\?\.role !== "ADMINISTRADOR"/g)];
ok(durosStore.length === 0, `quedan ${durosStore.length} comprobaciones de rol a mano en store.js`);

/* ──────────────────────────────────────────────────────────────────────────── */
function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...walk(f));
    else out.push(f);
  }
  return out;
}

console.log(`\n${comprobaciones - fallos}/${comprobaciones} comprobaciones correctas`);
if (fallos) { console.error(`✗ ${fallos} fallos`); process.exit(1); }
console.log("✓ Permisos coherentes en Web, Servidor, Android y documentación");
