/**
 * Fusión del estado de NovaGest sin conexión (W-02).
 *
 * Funciones puras (sin DOM ni red) que deciden qué se queda cuando el navegador tiene cambios
 * sin guardar y el servidor ya tiene otra versión: en cada registro gana el `updatedAt` más
 * reciente, y un borrado no pisa un cambio posterior. Se prueban en `tools/test_merge.mjs`.
 */

/** Campos de fecha que puede usar un registro (de más a menos fiable). */
const TIME_FIELDS = ["updatedAt", "deletedAt", "createdAt", "ts", "checkedAt", "issuedAt"];

/** Momento (epoch ms) de un registro: su `updatedAt`, o la mejor fecha disponible. */
export function recordTime(record) {
  if (!record || typeof record !== "object") return 0;
  for (const field of TIME_FIELDS) {
    const v = Number(record[field]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  const date = String(record.date || "");
  const t = Date.parse(date);
  return Number.isFinite(t) ? t : 0;
}

export const isDeleted = (record) => !!(record && record.deletedAt);

/**
 * ¿Gana el registro local frente al del servidor?
 * - Si el servidor no lo tiene, sí.
 * - Con fechas distintas, gana la más reciente.
 * - En empate gana el que conserva el registro (no el borrado), para no perder datos.
 */
export function localWins(local, remote) {
  if (!remote) return true;
  const lt = recordTime(local);
  const rt = recordTime(remote);
  if (lt !== rt) return lt > rt;
  return !isDeleted(local) || isDeleted(remote);
}

/**
 * Fusiona una colección (`products`, `movements`…) por `id`.
 *
 * Conserva el orden del servidor y añade al final lo que el servidor aún no conoce.
 * @returns `{ list, applied, kept }` — registros que ganaron del lado local y del servidor.
 */
export function mergeCollection(serverList = [], localList = []) {
  const server = Array.isArray(serverList) ? serverList : [];
  const local = Array.isArray(localList) ? localList : [];
  const byId = new Map();
  server.forEach((r) => { if (r && r.id != null) byId.set(r.id, r); });
  let applied = 0;
  let kept = 0;
  const extras = [];
  local.forEach((r) => {
    if (!r || r.id == null) return;
    const current = byId.get(r.id);
    if (current === undefined) {
      byId.set(r.id, r);
      extras.push(r.id);
      applied++;
      return;
    }
    if (localWins(r, current)) { byId.set(r.id, r); applied++; } else { kept++; }
  });
  const list = server.filter((r) => r && byId.has(r.id)).map((r) => byId.get(r.id));
  extras.forEach((id) => list.push(byId.get(id)));
  return { list, applied, kept };
}

/**
 * Fusiona el estado completo del servidor con el del navegador.
 *
 * - Las colecciones con `id` se fusionan registro a registro.
 * - `settings` se combina por campo (gana el local, que es el que se estaba editando).
 * - Cualquier otra cosa (`weekly` y similares) se queda con la versión local si existe.
 *
 * @returns `{ state, applied, kept }`
 */
export function mergeState(serverState = {}, localState = {}, keys = []) {
  const result = { ...serverState };
  let applied = 0;
  let kept = 0;
  for (const key of keys) {
    const server = serverState?.[key];
    const local = localState?.[key];
    if (local === undefined) continue;
    if (Array.isArray(local)) {
      const merged = mergeCollection(server, local);
      result[key] = merged.list;
      applied += merged.applied;
      kept += merged.kept;
      continue;
    }
    if (key === "settings" && local && typeof local === "object") {
      result.settings = { ...(server || {}), ...local };
      applied++;
      continue;
    }
    if (local && typeof local === "object" && !Array.isArray(local)) {
      // Objetos con forma de mapa (p. ej. `weekly` por semana): se combinan por clave.
      result[key] = { ...(server || {}), ...local };
      applied++;
      continue;
    }
    result[key] = local;
    applied++;
  }
  return { state: result, applied, kept };
}

/** ¿Hay algo que valga la pena subir? */
export function hasChanges(result) {
  return !!result && result.applied > 0;
}

/** Texto corto para el aviso de la interfaz. */
export function describe(result) {
  if (!result) return "Sin cambios pendientes.";
  if (!result.applied && !result.kept) return "Sin cambios pendientes.";
  if (!result.kept) return `Se guardaron ${result.applied} cambio(s) del navegador.`;
  if (!result.applied) return `El servidor tenía ${result.kept} cambio(s) más reciente(s); se conservaron.`;
  return `Se guardaron ${result.applied} cambio(s) y se conservaron ${result.kept} del servidor.`;
}

/** Clave de almacenamiento local donde se guardan los cambios sin subir. */
export const PENDING_KEY = "novagest.pending";

/**
 * Lee la cola local de cambios pendientes.
 * @param storage `localStorage` (o un doble en las pruebas)
 */
export function readPending(storage) {
  try {
    const raw = storage?.getItem?.(PENDING_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || !data.state) return null;
    return data;
  } catch {
    return null;
  }
}

/** Guarda los cambios pendientes con la marca de tiempo. */
export function writePending(storage, state, now = Date.now()) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(PENDING_KEY, JSON.stringify({ savedAt: now, state }));
    return true;
  } catch {
    return false;
  }
}

/** Borra la cola (se guardó todo en el servidor). */
export function clearPending(storage) {
  try {
    storage?.removeItem?.(PENDING_KEY);
  } catch {
    /* almacenamiento lleno o bloqueado: no es grave */
  }
}
