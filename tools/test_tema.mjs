/**
 * Pruebas del tema y del tamaño de letra (A-18) — sin navegador.
 *
 * El DOM se simula con un objeto mínimo (`documentElement` con `dataset` y `style`), así que se
 * comprueba también que la aplicación del tema y del zoom hace lo que dice.
 *
 * Uso: node tools/test_tema.mjs
 */
import {
  TEXT_KEY, THEMES, THEME_ORDER, TEXT_SIZES, normalizeTheme, resolveTheme, themeLabel, themeIcon,
  nextTheme, normalizeTextSize, resolveTextSize, textSizeOptions, readTextSize, writeTextSize,
  applyTheme, applyTextSize, watchSystemTheme, systemPrefersDark,
} from "../web/js/theme.js";

let fallos = 0;
let pruebas = 0;

function ok(nombre, condicion, detalle = "") {
  pruebas += 1;
  if (condicion) console.log(`  ✔ ${nombre}`);
  else {
    fallos += 1;
    console.log(`  ✖ ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function igual(nombre, esperado, real) {
  ok(nombre, Object.is(esperado, real), `esperado ${esperado}, recibido ${real}`);
}

function docFalso() {
  return { documentElement: { dataset: {}, style: { valores: {}, setProperty(k, v) { this.valores[k] = v; } } } };
}

function storageFalso(inicial = {}) {
  const datos = { ...inicial };
  return {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => { datos[k] = String(v); },
    removeItem: (k) => { delete datos[k]; },
    datos,
  };
}

console.log("\nModos de tema");
igual("hay tres modos", 3, Object.keys(THEMES).length);
igual("el ciclo empieza en automático", "light", nextTheme("system"));
igual("después de claro va oscuro", "dark", nextTheme("light"));
igual("después de oscuro vuelve a automático", "system", nextTheme("dark"));
igual("un valor raro cae en automático", "system", normalizeTheme("neón"));
igual("el ciclo también normaliza", "light", nextTheme("neón"));
igual("el orden del ciclo está publicado", "system,light,dark", THEME_ORDER.join(","));

console.log("\nQué tema se pinta");
igual("oscuro elegido a mano es oscuro aunque el sistema esté claro", "dark", resolveTheme("dark", false));
igual("claro elegido a mano es claro aunque el sistema esté oscuro", "light", resolveTheme("light", true));
igual("automático con sistema oscuro", "dark", resolveTheme("system", true));
igual("automático con sistema claro", "light", resolveTheme("system", false));
igual("automático sin dato del sistema es claro", "light", resolveTheme("system"));
igual("un valor raro se comporta como automático", "dark", resolveTheme(undefined, true));

console.log("\nEtiquetas en español");
igual("automático se llama en español", "Automático (sigue al sistema)", themeLabel("system"));
igual("claro", "Claro", themeLabel("light"));
igual("oscuro", "Oscuro", themeLabel("dark"));
igual("un valor raro muestra la etiqueta de automático", "Automático (sigue al sistema)", themeLabel("xx"));
igual("cada modo tiene su icono", "◐", themeIcon("system"));
igual("el icono de oscuro", "☾", themeIcon("dark"));

console.log("\nTamaños de letra");
igual("hay tres tamaños", 3, textSizeOptions().length);
igual("el normal no agranda", 1, TEXT_SIZES.normal.zoom);
ok("grande agranda", TEXT_SIZES.grande.zoom > 1);
ok("muy grande agranda más que grande", TEXT_SIZES["muy-grande"].zoom > TEXT_SIZES.grande.zoom);
igual("un tamaño raro cae en normal", "normal", normalizeTextSize("gigante"));
igual("resolveTextSize devuelve clave y nombre", "Grande", resolveTextSize("grande").label);
igual("las opciones llevan valor y nombre", true, textSizeOptions().every((o) => o.value && o.label));

console.log("\nGuardar y leer el tamaño");
const st = storageFalso();
igual("sin nada guardado, normal", "normal", readTextSize(st));
igual("se guarda grande", "grande", writeTextSize(st, "grande"));
igual("y se lee", "grande", readTextSize(st));
igual("se guarda con la clave propia", "grande", st.datos[TEXT_KEY]);
igual("volver a normal borra la clave", "normal", writeTextSize(st, "normal"));
igual("y ya no queda guardado", null, st.datos[TEXT_KEY] ?? null);
igual("un valor raro no se guarda como tal", "normal", writeTextSize(st, "enorme"));

console.log("\nUn navegador que no deja guardar no rompe nada");
const roto = { getItem() { throw new Error("privado"); }, setItem() { throw new Error("privado"); }, removeItem() { throw new Error("privado"); } };
igual("leer devuelve normal", "normal", readTextSize(roto));
igual("escribir no lanza y devuelve la clave", "grande", writeTextSize(roto, "grande"));
igual("sin storage también", "normal", readTextSize(undefined));

console.log("\nAplicar en el documento");
const doc = docFalso();
igual("pinta el tema oscuro", "dark", applyTheme(doc, "dark"));
igual("lo deja en el atributo", "dark", doc.documentElement.dataset.theme);
igual("pinta el claro", "light", applyTheme(doc, "light"));
igual("un tema raro se pinta claro", "light", applyTheme(doc, "neón"));
igual("aplica el tamaño muy grande", "muy-grande", applyTextSize(doc, "muy-grande").key);
igual("deja la marca en el html", "muy-grande", doc.documentElement.dataset.texto);
igual("y la variable del zoom", "1.16", doc.documentElement.style.valores["--texto-zoom"]);
igual("normal vuelve a 1", "1", (applyTextSize(doc, "normal"), doc.documentElement.style.valores["--texto-zoom"]));
ok("sin documento no explota", applyTheme(undefined, "dark") === "dark" && applyTextSize(null, "grande").key === "grande");
ok("un documento sin style tampoco", applyTextSize({ documentElement: { dataset: {} } }, "grande").key === "grande");

console.log("\nAvisos del sistema (cambio en vivo)");
let recibido = null;
let manejador = null;
const media = {
  matches: false,
  addEventListener(tipo, fn) { ok("se suscribe al cambio del sistema", tipo === "change"); manejador = fn; },
  removeEventListener(tipo, fn) { ok("se da de baja del aviso", tipo === "change" && fn === manejador); },
};
const dejar = watchSystemTheme(media, (oscuro) => { recibido = oscuro; });
media.matches = true;
manejador?.();
igual("avisa cuando el sistema pasa a oscuro", true, recibido);
dejar();
igual("dejar de escuchar no lanza", undefined, (dejar(), undefined));
ok("un navegador sin addEventListener no rompe", typeof watchSystemTheme({ matches: true }, () => {}) === "function");
ok("sin media tampoco", typeof watchSystemTheme(undefined, () => {}) === "function");

console.log("\n¿El sistema prefiere oscuro?");
igual("con matchMedia que dice sí", true, systemPrefersDark({ matchMedia: () => ({ matches: true }) }));
igual("con matchMedia que dice no", false, systemPrefersDark({ matchMedia: () => ({ matches: false }) }));
igual("sin matchMedia (navegador antiguo)", false, systemPrefersDark({}));
igual("sin ventana", false, systemPrefersDark(undefined));

console.log(`\n${pruebas - fallos}/${pruebas} comprobaciones correctas`);
if (fallos) process.exit(1);
console.log("Tema y tamaño de letra correctos\n");
