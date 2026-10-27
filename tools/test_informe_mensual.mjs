/**
 * Pruebas del informe mensual (W-20) — sin navegador.
 *
 * Se comprueban los cálculos con un estado pequeño y conocido: totales del mes, comparación con
 * el anterior, conteo de días, mejor día, top de productos, categorías, caja y fiados.
 *
 * Uso: node tools/test_informe_mensual.mjs
 */
import {
  monthKey, monthRange, monthLabel, shiftMonth, inMonth, variation,
  monthlyReport, variationText,
} from "../web/js/monthly.js";

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

const mov = (date, productName, quantity, price, extra = {}) => ({
  id: `m-${date}-${productName}-${quantity}`,
  date, productName, quantity, unitPriceUsd: price, type: "VENTA",
  center: "TIENDA", unitCostUsd: price * 0.6, ...extra,
});

const estado = {
  products: [
    { id: "p1", name: "Arroz", stockActual: 2, minStock: 3, active: true },
    { id: "p2", name: "Frijol", stockActual: 50, minStock: 5, active: true },
    { id: "p3", name: "Refresco", stockActual: 0, minStock: 1, active: true },
  ],
  movements: [
    mov("2026-10-02", "Arroz", 2, 10),                       // 20
    mov("2026-10-02", "Frijol", 1, 30, { center: "GESTOR", comisionCup: 120 }),  // 30
    mov("2026-10-05", "Refresco", 3, 5, { domicilioCup: 60 }),                    // 15
    mov("2026-10-20", "Arroz", 1, 10, { importeUsd: 12 }),   // importe guardado manda: 12
    mov("2026-09-15", "Arroz", 2, 10),
    mov("2026-10-03", "Arroz", 5, 10, { deletedAt: 1 }),
    { ...mov("2026-10-04", "Arroz", 9, 10), type: "ENTRADA" },
    mov("2026-11-01", "Arroz", 100, 10),
  ],
  cuadres: [
    { date: "2026-10-02", cuadre: 0 },
    { date: "2026-10-05", cuadre: 3.5 },
    { date: "2026-09-30", cuadre: 9 },
  ],
  credits: [
    {
      id: "c1", date: "2026-10-04", totalUsd: 40, paidUsd: 15, customerName: "Ana",
      payments: [{ id: "p", date: "2026-10-10", amountUsd: 15 }],
    },
    { id: "c2", date: "2026-09-02", totalUsd: 20, paidUsd: 20, payments: [] },
    { id: "c3", date: "2026-10-09", totalUsd: 5, paidUsd: 0, deletedAt: 1, payments: [] },
  ],
};

console.log("\nFechas del mes");
igual("monthKey recorta la fecha", "2026-10", monthKey("2026-10-26"));
igual("monthKey rechaza lo que no es fecha", "", monthKey("octubre"));
igual("monthRange empieza el día 1", "2026-10-01", monthRange("2026-10").from);
igual("monthRange termina el último día", "2026-10-31", monthRange("2026-10").to);
igual("febrero termina el 28 en año común", "2026-02-28", monthRange("2026-02").to);
igual("febrero termina el 29 en bisiesto", "2028-02-29", monthRange("2028-02").to);
igual("monthLabel en español", "octubre de 2026", monthLabel("2026-10"));
igual("shiftMonth atrás", "2026-09", shiftMonth("2026-10", -1));
igual("shiftMonth cruza el año", "2025-12", shiftMonth("2026-01", -1));
igual("shiftMonth cruza el año hacia delante", "2027-01", shiftMonth("2026-12", 1));
igual("shiftMonth doce meses", "2027-10", shiftMonth("2026-10", 12));
igual("inMonth compara solo año y mes", true, inMonth("2026-10-31", "2026-10"));
igual("inMonth dice que no a otro mes", false, inMonth("2026-11-01", "2026-10"));
igual("variation calcula el porcentaje", 10, variation(110, 100));
igual("variation resta cuando baja", -50, variation(50, 100));
igual("variation no divide por cero", null, variation(50, 0));

console.log("\nVentas del mes");
const inf = monthlyReport(estado, "2026-10");
igual("el total suma los importes del mes", 77, inf.ventas.totalUsd);
igual("el borrado no cuenta", false, inf.porDia.some((d) => d.date === "2026-10-03"));
igual("la ENTRADA no cuenta como venta", false, inf.porDia.some((d) => d.date === "2026-10-04"));
igual("noviembre queda fuera", false, inf.porDia.some((d) => d.date === "2026-11-01"));
igual("líneas vendidas del mes", 4, inf.ventas.lineas);
igual("unidades vendidas", 7, inf.ventas.unidades);
igual("días con venta", 3, inf.ventas.dias);
igual("ticket promedio por línea", 19.25, inf.ventas.ticketPromedio);
igual("promedio por día con venta", 25.67, inf.ventas.promedioDia);
igual("el importe guardado manda sobre cantidad × precio", 12, inf.topProductos.find((p) => p.name === "Arroz").totalUsd - 20);
igual("el mejor día es el del importe más alto", "2026-10-02", inf.ventas.mejorDia.date);
igual("el mejor día vale 50", 50, inf.ventas.mejorDia.totalUsd);
igual("la tabla por día va en orden", "2026-10-02,2026-10-05,2026-10-20", inf.porDia.map((d) => d.date).join(","));

console.log("\nCostos, utilidad y monedas");
igual("el costo sale de unitCostUsd × unidades", 45, inf.costoUsd);
igual("la utilidad es venta menos costo", 32, inf.utilidadUsd);
igual("el margen sobre la venta", 41.56, inf.margenPct);
igual("las comisiones en CUP se suman", 120, inf.comisionesCup);
igual("los domicilios en CUP se suman", 60, inf.domiciliosCup);

console.log("\nComparación con el mes anterior");
igual("el mes anterior es septiembre", "2026-09", inf.anterior.month);
igual("el total anterior", 20, inf.anterior.totalUsd);
igual("la variación es +285 %", 285, inf.anterior.variacionPct);
ok("la frase de la variación lo dice", variationText(inf).includes("▲") && variationText(inf).includes("285"), variationText(inf));
igual("un mes sin datos anteriores no inventa porcentaje", null, monthlyReport(estado, "2025-01").anterior.variacionPct);
ok("y la frase lo explica", variationText(monthlyReport(estado, "2025-01")).includes("Sin datos"), variationText(monthlyReport(estado, "2025-01")));

console.log("\nProductos y categorías");
igual("tres productos distintos", 3, inf.topProductos.length);
igual("el que más deja va primero", "Arroz", inf.topProductos[0].name);
igual("Arroz suma 32", 32, inf.topProductos[0].totalUsd);
igual("Refresco suma 15", 15, inf.topProductos.find((p) => p.name === "Refresco").totalUsd);
igual("las categorías cubren todo el importe", 77, inf.porCategoria.reduce((a, c) => a + c.totalUsd, 0));
igual("la categoría mayor va primera", inf.porCategoria[0].totalUsd, Math.max(...inf.porCategoria.map((c) => c.totalUsd)));
igual("los centros suman el total", 77, inf.porCentro.reduce((a, c) => a + c.totalUsd, 0));
igual("el centro de la primera venta es TIENDA", "TIENDA", inf.porCentro[0].center);
igual("GESTOR aparece con 30", 30, inf.porCentro.find((c) => c.center === "GESTOR").totalUsd);

console.log("\nCaja del mes");
igual("dos cuadres en octubre", 2, inf.caja.cuadres);
igual("la diferencia total es 3,5", 3.5, inf.caja.diferencia);
igual("un día descuadrado", 1, inf.caja.descuadrados);
igual("se dice cuál", "2026-10-05", inf.caja.diasDescuadrados[0]);
igual("el cuadre de septiembre no entra", false, inf.caja.diasDescuadrados.includes("2026-09-30"));

console.log("\nFiados y existencias");
igual("otorgado en el mes", 40, inf.fiados.otorgadosUsd);
igual("cobrado en el mes", 15, inf.fiados.abonosUsd);
igual("pendiente de todos los fiados vivos", 25, inf.fiados.pendienteUsd);
igual("dos productos en el mínimo o por debajo", 2, inf.criticos.total);
ok("se nombran los productos en riesgo", inf.criticos.nombres.includes("Arroz") && inf.criticos.nombres.includes("Refresco"), inf.criticos.nombres.join(","));

console.log("\nUn mes vacío no rompe nada");
const vacio = monthlyReport({ products: [], movements: [], cuadres: [], credits: [] }, "2026-10");
igual("total 0", 0, vacio.ventas.totalUsd);
igual("sin mejor día", null, vacio.ventas.mejorDia);
igual("ticket 0", 0, vacio.ventas.ticketPromedio);
igual("margen 0", 0, vacio.margenPct);
igual("sin días", 0, vacio.ventas.dias);
igual("sin productos", 0, vacio.topProductos.length);
igual("sin cuadres", 0, vacio.caja.cuadres);
igual("sin críticos", 0, vacio.criticos.total);

console.log("\nEl estado original no se modifica");
igual("siguen los 8 movimientos", 8, estado.movements.length);
igual("siguen los 3 cuadres", 3, estado.cuadres.length);
igual("los fiados intactos", 3, estado.credits.length);

console.log(`\n${pruebas - fallos}/${pruebas} comprobaciones correctas`);
if (fallos) process.exit(1);
console.log("Informe mensual correcto\n");
