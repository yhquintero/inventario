#!/usr/bin/env node
import assert from "node:assert/strict";

let request;
globalThis.fetch = async (url, options) => {
  request = { url, options };
  return { ok: true, status: 200, json: async () => ({ ok: true }) };
};
const { api, setToken } = await import("../web/js/api.js");
setToken(true);
const result = await api("/me");
assert.equal(result.status, 200);
assert.equal(request.url, "/api/me");
assert.equal(request.options.credentials, "same-origin");
assert.equal(request.options.headers.Authorization, undefined, "la Web no debe enviar Bearer legible por JS");
assert.equal(request.options.headers["X-CP"], "1");
setToken(null);
console.log("✔ API Web: cookie HttpOnly same-origin, sin Bearer en JavaScript");
