package com.novagest.inventario.data.sync

/**
 * Reglas de la cola de cambios pendientes de la App (A-01).
 *
 * La cola real son los datos de Room: los cambios hechos sin conexión se quedan en la base
 * local hasta que se pueden subir. Este archivo contiene solo las **decisiones** que hay que
 * tomar con ellos, en funciones puras y probables sin Android:
 *
 *  - [RetryPolicy]: cuánto esperar antes de reintentar y cuándo darse por vencido.
 *  - [ConflictResolver]: qué versión de un registro gana cuando el servidor ya tenía otra
 *    (gana la del `updatedAt` más reciente; una marca de borrado no pisa un cambio posterior).
 *
 * Las usa `SyncManager` al recibir un 409 (otro usuario guardó antes) y al fallar la red.
 */

/** Un registro sincronizable reducido a lo que decide un conflicto. */
data class SyncRecord(
    val id: String,
    val updatedAt: Long,
    val deleted: Boolean = false,
    /** Contenido del registro (JSON ya serializado); la cola no lo interpreta. */
    val payload: String = ""
)

/** Resultado de fusionar la versión local con la del servidor. */
data class MergeResult(
    val records: List<SyncRecord>,
    /** Registros en los que ganó el servidor (no se pisan). */
    val keptRemote: Int,
    /** Registros en los que ganaron los cambios locales. */
    val appliedLocal: Int
)

object RetryPolicy {
    /** 5 s, 15 s, 1 min, 5 min y 15 min; luego se repite el último. */
    private val delays = longArrayOf(5_000L, 15_000L, 60_000L, 300_000L, 900_000L)

    /** Número de intentos tras el cual se deja de reintentar solo (los datos siguen guardados). */
    const val MAX_ATTEMPTS = 12

    /** Espera antes del intento número [attempts] (1 = primer reintento). */
    fun delayFor(attempts: Int): Long {
        if (attempts <= 0) return 0L
        val index = (attempts - 1).coerceIn(0, delays.size - 1)
        return delays[index]
    }

    /** Momento (epoch ms) del próximo intento. */
    fun nextAttemptAt(now: Long, attempts: Int): Long = now + delayFor(attempts)

    /** ¿Se agotaron los intentos automáticos? Los cambios siguen en Room y en la próxima sesión se reintentan. */
    fun shouldGiveUp(attempts: Int): Boolean = attempts >= MAX_ATTEMPTS
}

object ConflictResolver {

    /**
     * ¿Gana el registro local?
     *
     * - Si el servidor no lo tiene, sí.
     * - Si el `updatedAt` local es mayor, sí; si es menor, no.
     * - Si empatan: gana el que conserva el registro (no el borrado), para no perder datos por
     *   un borrado que llegó al mismo tiempo.
     */
    fun localWins(local: SyncRecord, remote: SyncRecord?): Boolean {
        if (remote == null) return true
        if (local.updatedAt != remote.updatedAt) return local.updatedAt > remote.updatedAt
        return !local.deleted || remote.deleted
    }

    /**
     * Fusiona por `id` la lista del servidor con la local.
     *
     * Devuelve los registros que deben quedar: los del servidor intactos, sustituidos solo cuando
     * el cambio local es más reciente, y los locales que el servidor todavía no conoce.
     */
    fun merge(remote: List<SyncRecord>, local: List<SyncRecord>): MergeResult {
        val result = LinkedHashMap<String, SyncRecord>()
        remote.forEach { result[it.id] = it }
        var keptRemote = 0
        var appliedLocal = 0
        local.forEach { change ->
            val current = result[change.id]
            if (localWins(change, current)) {
                result[change.id] = change
                appliedLocal++
            } else {
                keptRemote++
            }
        }
        return MergeResult(result.values.toList(), keptRemote, appliedLocal)
    }

    /** ¿Hay algo que subir después de fusionar? (los borrados también se suben) */
    fun hasLocalChanges(result: MergeResult): Boolean = result.appliedLocal > 0

    /** Mensaje corto para la interfaz. */
    fun describe(result: MergeResult): String = when {
        result.keptRemote == 0 && result.appliedLocal == 0 -> "Sin cambios pendientes."
        result.keptRemote == 0 -> "Se subieron ${result.appliedLocal} cambio(s)."
        result.appliedLocal == 0 -> "El servidor tenía ${result.keptRemote} cambio(s) más reciente(s); se conservaron."
        else -> "Se subieron ${result.appliedLocal} cambio(s) y se conservaron ${result.keptRemote} del servidor."
    }
}
