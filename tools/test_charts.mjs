#!/usr/bin/env node
/**
 * Pruebas unitarias de web/js/charts.js (mapa de calor y ventas por categoría).
 * Uso: node tools/test_charts.mjs
 */
import assert from "node:assert/strict";
import {
  addDaysISO, categoryBreakdown, compactNumber, heatLevel, heatmapCsv, heatmapGrid, heatmapSummary,
  isoToTime, niceStep, niceTicks, weekStart, weekdayIndex, WEEKDAYS,
} from "../web/js/charts.js";

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log("  ✔", name); };

const mov = (date, importeUsd, productId = "p1", quantity = 1, costoUsd = 0, type = "VENTA") =>
  ({ date, type, importeUsd, productId, quantity, costoUsd });

ok("fechas ISO sin saltos de zona", () => {
  assert.equal(addDaysISO("2026-03-01", -1), "2026-02-28");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
  assert.equal(addDaysISO("", 1), "");
  assert.ok(Number.isNaN(isoToTime("2026-13-01")) === false || Number.isNaN(isoToTime("2026-13-01")));
  assert.ok(Number.isNaN(isoToTime("nada")));
});

ok("día de la semana con lunes = 0", () => {
  assert.equal(weekdayIndex("2026-10-12"), 0); // lunes
  assert.equal(weekdayIndex("2026-10-18"), 6); // domingo
  assert.equal(weekdayIndex("x"), -1);
  assert.equal(weekStart("2026-10-14"), "2026-10-12");
  assert.equal(weekStart("2026-10-12"), "2026-10-12");
  assert.equal(WEEKDAYS.length, 7);
});

ok("mapa de calor: rejilla, totales y futuro", () => {
  const movs = [
    mov("2026-10-12", 100), mov("2026-10-12", 50), mov("2026-10-13", 30),
    mov("2026-10-14", 999, "p1", 1, 0, "ENTRADA"), // no es venta: se ignora
    mov("2026-10-18", 20),
    mov("2026-07-01", 500), // fuera de las 8 semanas
  ];
  const g = heatmapGrid(movs, { weeks: 8, endDate: "2026-10-14" });
  assert.equal(g.rows.length, 7);
  assert.equal(g.rows[0].cells.length, 8);
  assert.equal(g.rows[0].label, "lunes");
  assert.equal(g.rows[6].label, "domingo");
  // lunes de la última semana (2026-10-12) es la última columna
  const lunes = g.rows[0].cells[7];
  assert.equal(lunes.date, "2026-10-12");
  assert.equal(lunes.value, 150);
  assert.equal(lunes.sales, 2);
  // 2026-10-13 es martes: 30
  assert.equal(g.rows[1].cells[7].value, 30);
  // el domingo 2026-10-18 queda en el futuro respecto a endDate
  assert.equal(g.rows[6].cells[7].future, true);
  // días sin ventas valen 0 y no son futuro
  assert.equal(g.rows[2].cells[7].value, 0);
  assert.equal(g.rows[2].cells[7].future, false);
  assert.equal(g.max, 150);
  assert.equal(g.total, 180); // el domingo 18 queda en el futuro y no suma
  assert.equal(g.bestDate, "2026-10-12");
  assert.equal(g.isEmpty, false);
  assert.equal(g.firstDate, addDaysISO("2026-10-12", -49));
});

ok("mapa de calor sin datos", () => {
  const g = heatmapGrid([], {});
  assert.equal(g.isEmpty, true);
  assert.equal(g.max, 0);
  assert.deepEqual(g.rows.map((r) => r.label), WEEKDAYS);
  assert.equal(heatmapSummary(g).includes("sin ventas"), true);
});

ok("niveles de intensidad", () => {
  assert.equal(heatLevel(0, 100), 0);
  assert.equal(heatLevel(5, 0), 0);
  assert.equal(heatLevel(1, 100), 1);
  assert.equal(heatLevel(100, 100), 4);
  assert.equal(heatLevel(50, 100), 2);
  assert.equal(heatLevel(99, 100), 4);
});

ok("ventas por categoría: importes, margen y orden", () => {
  const productos = [
    { id: "p1", category: "Bebidas" },
    { id: "p2", category: "Alimentos" },
    { id: "p3" }, // sin categoría → General
  ];
  const movs = [
    mov("2026-10-12", 100, "p1", 2, 40),
    mov("2026-10-13", 50, "p1", 1, 20),
    mov("2026-10-13", 200, "p2", 4, 150),
    mov("2026-10-13", 50, "p3", 1, 0),
    mov("2026-10-14", 999, "p1", 1, 0, "SALIDA"),
  ];
  const rows = categoryBreakdown(movs, productos);
  assert.deepEqual(rows.map((r) => r.category), ["Alimentos", "Bebidas", "General"]);
  const ali = rows[0];
  assert.equal(ali.revenue, 200);
  assert.equal(ali.cost, 150);
  assert.equal(ali.profit, 50);
  assert.equal(ali.units, 4);
  assert.equal(ali.margin, 25);
  assert.equal(ali.share, 50); // 200 de 400
  const beb = rows[1];
  assert.equal(beb.revenue, 150);
  assert.equal(beb.profit, 90);
  assert.equal(beb.margin, 60);
  assert.equal(beb.share, 37.5);
  assert.equal(rows[2].category, "General");
  assert.equal(rows.reduce((a, r) => a + r.share, 0), 100);
});

ok("ventas por categoría sin movimientos", () => {
  assert.deepEqual(categoryBreakdown([], []), []);
  assert.deepEqual(categoryBreakdown(undefined, undefined), []);
});

ok("escala de ejes", () => {
  assert.equal(niceStep(100, 4), 25);
  assert.equal(niceStep(0, 4), 1);
  assert.deepEqual(niceTicks(0), [0]);
  assert.deepEqual(niceTicks(10, 2), [0, 5, 10]);
  const ticks = niceTicks(1234, 4);
  assert.ok(ticks[0] === 0);
  assert.ok(ticks[ticks.length - 1] >= 1234);
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] > ticks[i - 1]);
});

ok("cifras compactas", () => {
  assert.equal(compactNumber(950), "950");
  assert.equal(compactNumber(1200), "1,2 k");
  assert.equal(compactNumber(3_400_000), "3,4 M");
  assert.equal(compactNumber(-1500), "−1,5 k");
  assert.equal(compactNumber("x"), "0");
});

ok("resumen accesible del mapa", () => {
  const g = heatmapGrid([mov("2026-10-12", 100), mov("2026-10-13", 50)], { weeks: 4, endDate: "2026-10-14" });
  const texto = heatmapSummary(g, (v) => `${v} USD`);
  assert.ok(texto.includes("4 semanas"));
  assert.ok(texto.includes("150 USD"));
  assert.ok(texto.includes("lunes 2026-10-12"));
});

ok("exportación del mapa a CSV", () => {
  const g = heatmapGrid(
    [mov("2026-10-12", 100, "p1", 2), mov("2026-10-13", 50.5, "p1", 1)],
    { weeks: 4, endDate: "2026-10-14" }
  );
  const csv = heatmapCsv(g);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "Fecha;Día;Ventas (USD);Unidades;Líneas de venta");
  assert.equal(lines.length, 25, "cabecera + 4 semanas (7×4 días menos los 4 futuros)");
  assert.ok(csv.includes("2026-10-12;lunes;100;2;1"), "fila del lunes con sus cifras");
  assert.ok(csv.includes("50,5"), "coma decimal para Excel en español");
  assert.equal(heatmapCsv(null), "Fecha;Día;Ventas (USD);Unidades;Líneas de venta");
  const orden = lines.slice(1).map((l) => l.split(";")[0]);
  assert.deepEqual([...orden].sort(), orden, "las fechas van en orden");
});

console.log(`\n${n} pruebas de gráficos correctas\n`);
