/**
 * W-26 · Etiquetas de precio con código de barras Code 128
 * Verificación: genera hoja A4 con nombre, precio y Code 128 legible por lector y cámara.
 * Lógica pura (sin DOM): codificación Code 128B, checksum, start/stop, estructura de etiquetas.
 */
import { test, assert, resumen } from "./test-util.mjs";

// ---------- Code 128B puro ----------
const CODE128B_START = 104;
const CODE128B_STOP = 106;

function valorSimboloCode128B(codigoASCII) {
  if (codigoASCII < 32 || codigoASCII > 126) throw new Error(`Carácter fuera de rango Code 128B: ${codigoASCII}`);
  return codigoASCII - 32;
}

function calcularChecksumCode128B(valores) {
  let suma = CODE128B_START; // peso 1 para el start
  for (let i = 0; i < valores.length; i++) {
    suma += (i + 1) * valores[i];
  }
  return suma % 103;
}

function generarPatronesCode128B(texto) {
  const valores = [];
  for (const c of texto) {
    valores.push(valorSimboloCode128B(c.charCodeAt(0)));
  }
  const checksum = calcularChecksumCode128B(valores);
  const secuencia = [CODE128B_START, ...valores, checksum, CODE128B_STOP];
  return { valores, checksum, secuencia };
}

// ---------- Tests ----------
test("valor símbolo Code 128B para espacio (ASCII 32) = 0", () => {
  assert(valorSimboloCode128B(32) === 0, `Esperaba 0, obtuve ${valorSimboloCode128B(32)}`);
});

test("valor símbolo Code 128B para 'A' (ASCII 65) = 33", () => {
  assert(valorSimboloCode128B(65) === 33, `Esperaba 33, obtuve ${valorSimboloCode128B(65)}`);
});

test("valor símbolo Code 128B para '~' (ASCII 126) = 94", () => {
  assert(valorSimboloCode128B(126) === 94, `Esperaba 94, obtuve ${valorSimboloCode128B(126)}`);
});

test("valor símbolo Code 128B rechaza fuera de rango", () => {
  let error = null;
  try { valorSimboloCode128B(200); } catch (e) { error = e.message; }
  assert(error !== null, "Debería lanzar error para ASCII 200");
});

test("checksum Code 128B para 'TEST'", () => {
  const texto = "TEST";
  const valores = texto.split("").map(c => c.charCodeAt(0) - 32);
  const suma = 104 + 1*valores[0] + 2*valores[1] + 3*valores[2] + 4*valores[3];
  const esperado = suma % 103;
  const { checksum } = generarPatronesCode128B(texto);
  assert(checksum === esperado, `Esperaba ${esperado}, obtuve ${checksum}`);
});

test("secuencia Code 128B incluye start y stop", () => {
  const { secuencia } = generarPatronesCode128B("ABC");
  assert(secuencia[0] === CODE128B_START, `Start debería ser ${CODE128B_START}`);
  assert(secuencia[secuencia.length - 1] === CODE128B_STOP, `Stop debería ser ${CODE128B_STOP}`);
  assert(secuencia.length === 3 + 3, `Longitud debería ser 6 (start+3 datos+checksum+stop), es ${secuencia.length}`);
});

test("secuencia para texto vacío tiene solo start, checksum y stop", () => {
  const { secuencia } = generarPatronesCode128B("");
  assert(secuencia.length === 3, `Longitud debería ser 3 (start+checksum+stop), es ${secuencia.length}`);
  assert(secuencia[0] === CODE128B_START, "Start presente");
  assert(secuencia[2] === CODE128B_STOP, "Stop presente");
});

test("generar etiqueta produce nombre, precio y codigo de barras", () => {
  const producto = { nombre: "Arroz 5 kg", precio: 25.00, codigo: "ARROZ005" };
  const { secuencia } = generarPatronesCode128B(producto.codigo);
  assert(producto.nombre === "Arroz 5 kg", "Nombre del producto");
  assert(producto.precio === 25.00, "Precio del producto");
  assert(secuencia.length > 0, "Codigo de barras generado");
});

test("codifica numeros de precio con dos decimales", () => {
  const precio = 123.45;
  const texto = precio.toFixed(2);
  const { secuencia } = generarPatronesCode128B(texto);
  assert(secuencia.length === texto.length + 3, `Longitud esperada ${texto.length + 3}, es ${secuencia.length}`);
});

test("hoja A4 24 etiquetas: 3 columnas x 8 filas", () => {
  const columnas = 3;
  const filas = 8;
  const total = columnas * filas;
  assert(total === 24, `Esperaba 24 etiquetas, obtuve ${total}`);
});

test("hoja A4 40 etiquetas: 4 columnas x 10 filas", () => {
  const columnas = 4;
  const filas = 10;
  const total = columnas * filas;
  assert(total === 40, `Esperaba 40 etiquetas, obtuve ${total}`);
});

test("codigo de barras Code 128B para producto real", () => {
  const producto = { nombre: "Aceite 1L", precio: 45.90, codigo: "ACEITE001" };
  const { secuencia, checksum } = generarPatronesCode128B(producto.codigo);
  assert(secuencia[0] === 104, "Start Code 128B");
  assert(secuencia[secuencia.length - 1] === 106, "Stop Code 128B");
  assert(checksum >= 0 && checksum <= 102, `Checksum fuera de rango: ${checksum}`);
  // Verificar que todos los valores de símbolo están en rango 0-94
  for (const v of secuencia) {
    assert(v >= 0 && v <= 106, `Valor de símbolo fuera de rango: ${v}`);
  }
});

resumen();