/**
 * W-27 · Utilidad neta en integración
 * Verificación: el mes muestra venta, costo, gastos y utilidad neta,
 * con la misma cifra en pantalla, PDF y CSV. Lógica pura con datos simulados.
 */
import { test, assert, resumen } from "./test-util.mjs";

// ---------- Cálculo puro ----------
function calcularUtilidadNeta(venta, costo, gastosCuadre) {
  const v = Number(venta) || 0;
  const c = Number(costo) || 0;
  const g = Number(gastosCuadre) || 0;
  const utilidadBruta = v - c;
  const utilidadNeta = utilidadBruta - g;
  return { venta: v, costo: c, gastos: g, utilidadBruta, utilidadNeta };
}

function formatearMoneda(n) {
  return Number(n).toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------- Representación de pantalla ----------
function renderPantalla(datos) {
  return {
    venta: formatearMoneda(datos.venta),
    costo: formatearMoneda(datos.costo),
    gastos: formatearMoneda(datos.gastos),
    utilidadNeta: formatearMoneda(datos.utilidadNeta),
    mensaje: datos.utilidadNeta >= 0 ? "Utilidad positiva" : "Pérdida del mes"
  };
}

// ---------- Representación CSV ----------
function renderCSV(datos) {
  const filas = [
    ["Concepto", "Monto (USD)"],
    ["Venta del mes", datos.venta.toFixed(2)],
    ["Costo del mes", datos.costo.toFixed(2)],
    ["Gastos del cuadre", datos.gastos.toFixed(2)],
    ["Utilidad neta", datos.utilidadNeta.toFixed(2)]
  ];
  return filas.map((f) => f.join(";")).join("\n");
}

// ---------- Representación PDF (texto plano simulado) ----------
function renderPDF(datos) {
  return `
NOVAGEST · Informe mensual
Mes: ${datos.mes || "N/A"}
--------------------------
Venta del mes:     ${formatearMoneda(datos.venta)}
Costo del mes:     ${formatearMoneda(datos.costo)}
Gastos del cuadre: ${formatearMoneda(datos.gastos)}
Utilidad neta:     ${formatearMoneda(datos.utilidadNeta)}
--------------------------
${datos.utilidadNeta >= 0 ? "Resultado: GANANCIA" : "Resultado: PÉRDIDA"}
`;
}

// ---------- Tests ----------
test("mes con utilidad positiva: venta 10000, costo 4000, gastos 1000", () => {
  const d = calcularUtilidadNeta(10000, 4000, 1000);
  assert(d.venta === 10000, `Venta esperada 10000, es ${d.venta}`);
  assert(d.costo === 4000, `Costo esperado 4000, es ${d.costo}`);
  assert(d.gastos === 1000, `Gastos esperados 1000, es ${d.gastos}`);
  assert(d.utilidadBruta === 6000, `Utilidad bruta esperada 6000, es ${d.utilidadBruta}`);
  assert(d.utilidadNeta === 5000, `Utilidad neta esperada 5000, es ${d.utilidadNeta}`);
});

test("mes con utilidad cero: venta 5000, costo 3000, gastos 2000", () => {
  const d = calcularUtilidadNeta(5000, 3000, 2000);
  assert(d.utilidadNeta === 0, `Esperaba 0, es ${d.utilidadNeta}`);
});

test("mes con pérdida: venta 3000, costo 4000, gastos 1500", () => {
  const d = calcularUtilidadNeta(3000, 4000, 1500);
  assert(d.utilidadBruta === -1000, `Utilidad bruta esperada -1000, es ${d.utilidadBruta}`);
  assert(d.utilidadNeta === -2500, `Utilidad neta esperada -2500, es ${d.utilidadNeta}`);
});

test("pantalla muestra misma utilidad neta que cálculo", () => {
  const d = calcularUtilidadNeta(12000, 5000, 2000);
  const p = renderPantalla(d);
  const esperado = d.utilidadNeta.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert(p.utilidadNeta === esperado, `Pantalla esperaba ${esperado}, es ${p.utilidadNeta}`);
  assert(p.mensaje === "Utilidad positiva", `Mensaje esperado positivo, es ${p.mensaje}`);
});

test("pantalla muestra pérdida con mensaje correcto", () => {
  const d = calcularUtilidadNeta(3000, 4000, 1500);
  const p = renderPantalla(d);
  const esperado = d.utilidadNeta.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert(p.utilidadNeta === esperado, `Pantalla esperaba ${esperado}, es ${p.utilidadNeta}`);
  assert(p.mensaje === "Pérdida del mes", `Mensaje esperado pérdida, es ${p.mensaje}`);
});

test("CSV incluye utilidad neta con dos decimales", () => {
  const d = calcularUtilidadNeta(10000, 4000, 1000);
  const csv = renderCSV(d);
  const lineaUtilidad = csv.split("\n").find((l) => l.includes("Utilidad neta"));
  assert(lineaUtilidad !== undefined, "CSV debería tener línea de utilidad neta");
  assert(lineaUtilidad.includes("5000.00"), `CSV esperaba 5000.00, es ${lineaUtilidad}`);
});

test("CSV tiene 5 filas (cabecera + 4 conceptos)", () => {
  const d = calcularUtilidadNeta(10000, 4000, 1000);
  const csv = renderCSV(d);
  const filas = csv.split("\n");
  assert(filas.length === 5, `Esperaba 5 filas CSV, obtuve ${filas.length}`);
});

test("PDF incluye utilidad neta formateada", () => {
  const d = calcularUtilidadNeta(10000, 4000, 1000);
  d.mes = "2026-11";
  const pdf = renderPDF(d);
  const esperado = d.utilidadNeta.toLocaleString("es", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  assert(pdf.includes(esperado), `PDF esperaba ${esperado}`);
  assert(pdf.includes("GANANCIA"), `PDF debería indicar GANANCIA`);
});

test("PDF de pérdida indica PÉRDIDA", () => {
  const d = calcularUtilidadNeta(3000, 4000, 1500);
  d.mes = "2026-10";
  const pdf = renderPDF(d);
  assert(pdf.includes("PÉRDIDA"), `PDF debería indicar PÉRDIDA`);
});

test("consistencia pantalla/PDF/CSV: misma utilidad neta", () => {
  const d = calcularUtilidadNeta(25000.50, 12000.75, 3000.25);
  const p = renderPantalla(d);
  const csv = renderCSV(d);
  const pdf = renderPDF(d);
  const valorEsperado = d.utilidadNeta.toFixed(2);
  assert(p.utilidadNeta === formatearMoneda(valorEsperado), `Pantalla debería mostrar ${valorEsperado}`);
  assert(csv.includes(valorEsperado), `CSV debería incluir ${valorEsperado}`);
  assert(pdf.includes(formatearMoneda(valorEsperado)), `PDF debería mostrar ${formatearMoneda(valorEsperado)}`);
});

test("sin gastos del cuadre: utilidad neta = utilidad bruta", () => {
  const d = calcularUtilidadNeta(8000, 3000, 0);
  assert(d.utilidadNeta === 5000, `Esperaba 5000, es ${d.utilidadNeta}`);
  assert(d.utilidadBruta === d.utilidadNeta, "Sin gastos, bruta = neta");
});

test("valores nulos/undefined se tratan como 0", () => {
  const d = calcularUtilidadNeta(null, undefined, 500);
  assert(d.venta === 0, `Venta nula debería ser 0, es ${d.venta}`);
  assert(d.costo === 0, `Costo undefined debería ser 0, es ${d.costo}`);
  assert(d.utilidadNeta === -500, `Esperaba -500, es ${d.utilidadNeta}`);
});

resumen();