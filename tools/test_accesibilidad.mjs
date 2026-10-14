/**
 * Comprobaciones automáticas de accesibilidad (parte verificable por código).
 * Ejecutar: node tools/test_accesibilidad.mjs
 * NO sustituye la prueba con lector de pantalla (ver docs/CUMPLIMIENTO.md).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../web/css/app.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../web/js/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

function lum(hex) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const varCss = (name, dark = false) => {
  const bloque = dark ? css.split('[data-theme="dark"]')[1].split("}")[0] : css.split(":root")[1].split("}")[0];
  const m = bloque.match(new RegExp(name + ":\\s*(#[0-9a-fA-F]{6})"));
  return m?.[1];
};

ok("idioma del documento y salto al contenido", () => {
  assert.match(html, /<html lang="es">/);
  assert.match(app, /skip-link/);
  assert.match(app, /<main class="content dashboard-page" id="contenido">/); // misma tipografía del Panel en todos los módulos
});

ok("foco visible y movimiento reducido en CSS", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});

ok("todas las <img> de las vistas llevan alt (vacío = decorativa)", () => {
  const imgs = app.match(/<img[^>]*>/g) || [];
  assert.ok(imgs.length > 0);
  for (const tag of imgs) assert.match(tag, /alt=/, tag);
});

ok("contraste AA (>= 4.5:1) de pares de texto principales (tema claro)", () => {
  const pares = [
    ["--ink", "--surface"], ["--muted", "--surface"], ["--muted", "--surface-2"],
  ];
  for (const [fg, bg] of pares) {
    const ratio = contraste(varCss(fg), varCss(bg));
    assert.ok(ratio >= 4.5, `${fg} sobre ${bg} = ${ratio.toFixed(2)}`);
  }
  // Texto blanco sobre el color primario de botones
  const ratioBtn = contraste("#ffffff", varCss("--primary"));
  assert.ok(ratioBtn >= 4.5, `blanco sobre --primary = ${ratioBtn.toFixed(2)}`);
});

ok("contraste AA en TEMA OSCURO (WCAG 2.2 §1.4.3 también en dark)", () => {
  for (const [fg, bg] of [["--ink", "--surface"], ["--muted", "--surface"]]) {
    const ratio = contraste(varCss(fg, true), varCss(bg, true));
    assert.ok(ratio >= 4.5, `dark ${fg} sobre ${bg} = ${ratio.toFixed(2)}`);
  }
});

ok("objetivos táctiles y zoom no bloqueado (2.5.8 AA / 1.4.4)", () => {
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maxim/i);
  assert.match(css, /min-height:\s*44px|min-block-size:\s*44px|\.btn[^{]*\{[^}]*padding/s);
});

ok("modo forced-colors (Windows) con alternativas del sistema", () => {
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /forced-color-adjust: none/);
  assert.match(css, /Highlight/);
});

ok("sin estilos en línea en las vistas (CSP sin unsafe-inline lo exige)", () => {
  assert.doesNotMatch(app, / style="/);
  assert.doesNotMatch(html, / style="/);
});

ok("gráfica SVG con equivalente textual: role=img, resumen y tabla de datos (1.1.1/1.4.1)", () => {
  assert.match(app, /class="line-chart" role="img" aria-label=/);
  assert.match(app, /Ver datos de la gráfica en tabla/);
  assert.match(app, /<th scope="col">Fecha<\/th>/);
});

console.log(`\n${n} comprobaciones de accesibilidad en verde (resto: prueba manual con lector de pantalla)`);
