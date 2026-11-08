#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "ng-rate-chart-"));
cpSync(join(root, "web/js"), tmp, { recursive: true });
writeFileSync(join(tmp, "package.json"), '{"type":"module"}');
const { buildRateSeries, rateSource } = await import(pathToFileURL(join(tmp, "rate-chart.js")).href);
const rows = [
  {currency:"USD",date:"2026-10-01",rate:700,note:"Excel",createdAt:1},
  {currency:"USD",date:"2026-11-01",rate:900,note:"elTOQUE · mercado informal",createdAt:1},
  {currency:"USD",date:"2026-11-01",rate:920,note:"Diviza · mercado informal",createdAt:2},
  {currency:"EUR",date:"2026-11-02",rate:990,note:"Diviza · mercado informal",createdAt:3},
  {currency:"MLC",date:"2026-11-08",rate:726.72,note:"manual",createdAt:4},
  {currency:"USD",date:"2026-11-09",rate:999,note:"futuro"},
  {currency:"USD",date:"2026-02-30",rate:800},
  {currency:"USD",date:"2026-11-08",rate:-5},
  {currency:"ZZZ",date:"2026-11-08",rate:5},
];
const before = JSON.stringify(rows);
const chart = buildRateSeries(rows, { endDate:"2026-11-08", range:"all", currencies:["USD","EUR","MLC"] });
assert.equal(chart.points.length, 4);
assert.deepEqual(chart.byCurrency.USD.map((p) => p.rate), [700, 920]);
assert.equal(chart.from, "2026-10-01"); assert.equal(chart.to, "2026-11-08");
assert.equal(chart.byCurrency.USD[1].source, "Diviza");
assert.equal(buildRateSeries(rows, { endDate:"2026-11-08",range:"30d",currencies:["USD"] }).points.length, 1);
assert.equal(buildRateSeries(rows, { endDate:"2026-11-08",source:"elTOQUE",currencies:["USD"] }).points[0].rate, 900);
assert.equal(buildRateSeries(rows, { endDate:"2026-11-08",source:"Diviza",currencies:["MLC"] }).points.length, 0);
assert.equal(buildRateSeries(rows, { endDate:"2026-11-08",currencies:[] }).points.length, 0);
assert.equal(buildRateSeries(rows, { endDate:"2026-02-30" }).points.length, 0);
assert.equal(rateSource({note:"Diviza · mercado informal"}), "Diviza");
assert.equal(rateSource({note:"nota de elTOQUE"}), "Otras");
assert.equal(JSON.stringify(rows), before);
console.log("✔ Gráfico de tasas: períodos, fuentes, duplicados y datos sin inventar");
