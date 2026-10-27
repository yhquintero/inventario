/**
 * Pruebas de la búsqueda global (W-21) · web/js/search.js
 * Uso: node tools/test_busqueda.mjs
 */
import {
  GRUPOS, agrupar, buscar, construirIndice, escapar, normalizar, palabras,
  pieDeBusqueda, primerResultado, puntuar, resaltar, resaltarHTML, resumen,
} from "../web/js/search.js";

let ok = 0;
const fallos = [];
function check(cond, que) {
  if (cond) ok++;
  else fallos.push(que);
}
const igual = (a, b, que) => check(JSON.stringify(a) === JSON.stringify(b), `${que} → ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

/* ---------------------------------- normalizar -------------------------------- */
igual(normalizar("Refrigeración"), "REFRIGERACION", "quita tildes y pone mayúsculas");
igual(normalizar("  Pérez   José "), "PEREZ JOSE", "colapsa espacios");
igual(normalizar("A-12/3"), "A 12 3", "los signos separan palabras");
igual(normalizar(null), "", "null es cadena vacía");
igual(normalizar(undefined), "", "undefined es cadena vacía");
igual(normalizar(12), "12", "números");
igual(normalizar("ÑANDÚ"), "NANDU", "la Ñ se normaliza como N");
igual(palabras("  arroz   con  pollo arroz "), ["ARROZ", "CON", "POLLO"], "palabras sin repetir");
igual(palabras(""), [], "sin palabras");
igual(palabras("   "), [], "solo espacios");

/* ----------------------------------- puntuar ---------------------------------- */
const p1 = { label: "Arroz", detail: "5 kg", extra: "7461234567890" };
check((puntuar(p1, "arroz") ?? 0) > 0, "coincide con el nombre");
check(puntuar(p1, "fideo") === null, "no coincide: null");
check((puntuar(p1, "7461234567890") ?? 0) > 0, "busca también por el código de barras");
check((puntuar(p1, "kg") ?? 0) > 0, "busca por el detalle");
// Escribir al principio del nombre suma más que un trozo en medio.
const inicio = puntuar({ label: "Arroz blanco" }, "arro");
const dentro = puntuar({ label: "Sopa de arroz" }, "arro");
check(inicio > dentro, "el principio del nombre pesa más");
// Todas las palabras tienen que aparecer.
check(puntuar({ label: "Arroz blanco" }, "arroz integral") === null, "exige todas las palabras");
check(puntuar({ label: "Arroz integral" }, "integral arroz") !== null, "el orden no importa");
check(puntuar(null, "arroz") === null, "entrada nula");
check(puntuar(p1, "") === null, "consulta vacía");
// La consulta completa al principio del nombre gana a tener las palabras sueltas.
const completo = puntuar({ label: "Arroz blanco" }, "arroz blanco");
const suelto = puntuar({ label: "Blanco de arroz" }, "arroz blanco");
check(completo > suelto, "la frase completa al principio manda");
igual(puntuar({ label: "Café", nombre: "Café" }, "cafe") > 0, true, "acepta la forma `nombre`");

/* -------------------------------- construirIndice ----------------------------- */
const fuentes = {
  producto: [
    { id: "p1", label: "Refrigerador 11 pies", detail: "3 u · $520", extra: "7745 REFRIGERACION" },
    { id: "p2", label: "Arroz blanco 5 kg", detail: "40 u · $6.50", extra: "7461234567890" },
    { id: "p3", label: "   " },                       // se descarta: sin nombre
    null,                                             // se descarta
    { id: "p4", label: "Café molido" },
  ],
  cliente: [{ id: "c1", label: "José Pérez", detail: "Debe $120", extra: "535551234" }],
  seccion: [{ id: "inventory", label: "Ir a Inventario", detail: "Operación" }],
};
const indice = construirIndice(fuentes);
igual(indice.length, 5, "descarta las entradas sin nombre");
check(indice.every((e) => typeof e.buscar === "string" && e.buscar.length > 0), "todas traen texto normalizado");
check(indice.find((e) => e.id === "p1").ref === null, "sin ref cuando no se pasa");
igual(construirIndice().length, 0, "sin fuentes no hay índice");
igual(construirIndice({ producto: "no es lista" }).length, 0, "fuente que no es lista");
const conRef = construirIndice({ producto: [{ id: "x", label: "Uno", ref: { id: "x" } }] });
check(conRef[0].ref.id === "x", "conserva la referencia original");

/* ------------------------------------ buscar ---------------------------------- */
const todo = construirIndice({
  producto: [
    { id: "p1", label: "Arroz blanco 5 kg", detail: "40 u · $6.50", extra: "7461234567890" },
    { id: "p2", label: "Arroz integral 1 kg", detail: "12 u · $3.00" },
    { id: "p3", label: "Refrigerador 11 pies", detail: "2 u · $520" },
  ],
  cliente: [{ id: "c1", label: "José Pérez", detail: "Debe $120" }],
  movimiento: [
    { id: "m1", label: "VENTA · Arroz blanco 5 kg", detail: "12/10/2026 · $13.00", extra: "José Pérez" },
    { id: "m2", label: "ENTRADA · Refrigerador 11 pies", detail: "10/10/2026" },
  ],
  ficha: [{ id: "f1", label: "Arroz blanco 5 kg v3", detail: "FC-003 · Aprobada" }],
  almacen: [{ id: "w1", label: "TIENDA PINAR", detail: "CENTRAL" }],
  seccion: [{ id: "inventory", label: "Ir a Inventario", detail: "Operación", extra: "productos stock" }],
  accion: [{ id: "new-product", label: "Nuevo producto", detail: "Acción · N" }],
});

let r = buscar(todo, "arroz");
check(r.total > 0, "«arroz» encuentra algo");
igual(r.grupos.map((g) => g.kind), ["producto", "movimiento", "ficha"], "agrupa en el orden pactado");
check(r.grupos[0].items.length === 2, "dos productos con arroz");
check(r.plano.length === r.total, "el plano coincide con el total");
check(r.plano.every((x) => x.entrada.kind !== "cliente"), "no cuela un cliente");
// El producto con el nombre más corto y exacto va primero.
igual(r.plano[0].entrada.id, "p1", "primero el que empieza por la consulta");
// Dentro de cada grupo, de mayor a menor puntuación.
check(r.grupos.every((g) => g.items.every((x, i) => i === 0 || g.items[i - 1].puntos >= x.puntos)), "orden por puntos dentro del grupo");

r = buscar(todo, "PÉREZ");
check(r.plano.some((x) => x.entrada.id === "c1"), "encuentra el cliente sin tilde");
check(r.plano.some((x) => x.entrada.id === "m1"), "y el movimiento del cliente");
r = buscar(todo, "perez jose");
check(r.plano.some((x) => x.entrada.id === "c1"), "el orden de las palabras no importa");

r = buscar(todo, "7461234567890");
igual(r.plano[0]?.entrada.id, "p1", "busca por código de barras");

r = buscar(todo, "inventario");
check(r.grupos.some((g) => g.kind === "seccion"), "encuentra la sección");
r = buscar(todo, "nuevo prod");
check(r.plano.some((x) => x.entrada.id === "new-product"), "encuentra una acción por dos palabras");

r = buscar(todo, "");
igual(r.total, 0, "consulta vacía: sin resultados");
igual(r.grupos, [], "consulta vacía: sin grupos");
igual(buscar(todo, "zzzz").total, 0, "sin coincidencias");
igual(buscar(null, "arroz").total, 0, "sin índice");
igual(primerResultado(buscar(todo, "arroz")).entrada.id, "p1", "primer resultado");
igual(primerResultado(buscar(todo, "zzzz")), null, "sin primer resultado");
igual(primerResultado(null), null, "primer resultado de null");

// Límites por grupo y global.
r = buscar(todo, "arroz", { limites: { producto: 1 } });
igual(r.grupos[0].items.length, 1, "respeta el tope del grupo");
r = buscar(todo, "a", { limiteTotal: 2 });
igual(r.total, 2, "respeta el tope total");
r = buscar(todo, "arroz", { limiteTotal: 0 });
igual(r.total, 0, "tope total cero");

// Un tipo que no está en GRUPOS aparece al final como «Otros».
const raro = construirIndice({ producto: [{ id: "p1", label: "Arroz" }], proveedor: [{ id: "s1", label: "Arroz del mayorista" }] });
r = buscar(raro, "arroz");
igual(r.grupos.at(-1).kind, "otro", "los tipos nuevos van a «Otros»");
igual(r.grupos.at(-1).title, "Otros", "título de «Otros»");

/* ------------------------------------ agrupar --------------------------------- */
const soloNav = indice.filter((e) => e.kind === "seccion");
r = agrupar(soloNav);
igual(r.grupos.length, 1, "agrupa sin buscar");
igual(r.total, 1, "total de agrupar");
igual(agrupar([]).grupos, [], "agrupar vacío");
igual(agrupar(null).total, 0, "agrupar null");
r = agrupar(todo, { limiteTotal: 2 });
igual(r.total, 2, "agrupar con tope total");
const conOtros = agrupar(construirIndice({ otraCosa: [{ id: "x", label: "Algo" }] }), { limiteTotal: 3 });
igual(conOtros.grupos[0].title, "Otros", "agrupar también tiene «Otros»");

/* ----------------------------------- resaltar --------------------------------- */
igual(resaltar("Arroz blanco", "arroz"), [{ texto: "Arroz", coincide: true }, { texto: " blanco", coincide: false }], "marca la coincidencia");
igual(resaltar("Café molido", "cafe")[0], { texto: "Café", coincide: true }, "resalta sin tilde");
igual(resaltar("JOSÉ", "jose")[0].coincide, true, "mayúsculas y tildes");
igual(resaltar("Perez", "PÉREZ")[0].coincide, true, "consulta con tilde");
igual(resaltar("sin coincidencia", "zzz"), [{ texto: "sin coincidencia", coincide: false }], "sin coincidencia no marca");
igual(resaltar("Arroz", ""), [{ texto: "Arroz", coincide: false }], "consulta vacía");
igual(resaltar("", "arroz"), [{ texto: "", coincide: false }], "texto vacío");
igual(resaltar(null, "arroz"), [{ texto: "", coincide: false }], "texto nulo");
const varias = resaltar("arroz con arroz", "arroz");
igual(varias.filter((t) => t.coincide).length, 2, "marca todas las apariciones");
// Una consulta con caracteres especiales no rompe nada.
check(Array.isArray(resaltar("a.b", "a.b(")), "consulta con signos raros");
check(Array.isArray(resaltar("Arroz", "[(")), "consulta imposible");

/* --------------------------------- resaltarHTML ------------------------------- */
igual(resaltarHTML("Arroz <b>", "arroz"), "<mark>Arroz</mark> &lt;b&gt;", "escapa el HTML");
igual(resaltarHTML("Tomate", "arroz"), "Tomate", "sin coincidencias devuelve el texto escapado");
igual(escapar(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;", "escapar");
igual(escapar(null), "", "escapar null");

/* -------------------------------- pie y resumen ------------------------------- */
check(pieDeBusqueda(buscar(todo, "arroz")).includes("resultados en"), "el pie cuenta los resultados");
check(pieDeBusqueda(buscar(todo, "arroz")).includes("↑↓"), "el pie recuerda las teclas");
igual(pieDeBusqueda(null), "Escribe para buscar en todo el negocio", "pie sin resultado");
check(pieDeBusqueda(buscar(todo, "zzz")).startsWith("Sin resultados"), "pie sin coincidencias");
const uno = pieDeBusqueda({ consulta: "x", total: 1, grupos: [{ kind: "producto" }] });
check(uno.includes("1 resultado en 1 grupo"), "singular");
igual(resumen(buscar(todo, "arroz").plano[0].entrada), "Productos · 40 u · $6.50", "resumen con grupo y detalle");
igual(resumen(null), "", "resumen nulo");

/* ------------------------------------ GRUPOS ---------------------------------- */
igual(GRUPOS.map((g) => g.kind),
  ["producto", "cliente", "movimiento", "ficha", "almacen", "seccion", "accion"], "orden de los grupos");
check(GRUPOS.every((g) => g.title && g.icon && g.limit > 0), "cada grupo tiene título, icono y tope");
check(new Set(GRUPOS.map((g) => g.kind)).size === GRUPOS.length, "sin tipos repetidos");

/* ---------------------------------- resultados -------------------------------- */
if (fallos.length) {
  console.error(`✗ ${fallos.length} fallo(s):`);
  for (const f of fallos) console.error("  · " + f);
  process.exit(1);
}
console.log(`${ok}/${ok} comprobaciones correctas · búsqueda global (W-21)`);
