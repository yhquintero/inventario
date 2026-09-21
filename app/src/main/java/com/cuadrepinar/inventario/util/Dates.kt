package com.cuadrepinar.inventario.util

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale

object Dates {
    private val zone: ZoneId = ZoneId.systemDefault()
    private val dayFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy")
    private val longFmt: DateTimeFormatter = DateTimeFormatter.ofPattern("EEEE d 'de' MMMM yyyy", Locale("es", "CU"))

    fun startOfDay(date: LocalDate = LocalDate.now()): Long =
        date.atStartOfDay(zone).toInstant().toEpochMilli()

    fun endOfDay(date: LocalDate = LocalDate.now()): Long =
        date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli() - 1

    fun toLocalDate(epoch: Long): LocalDate =
        Instant.ofEpochMilli(epoch).atZone(zone).toLocalDate()

    fun format(epoch: Long): String = toLocalDate(epoch).format(dayFmt)

    fun formatLong(epoch: Long): String = toLocalDate(epoch).format(longFmt)

    fun weekday(date: LocalDate = LocalDate.now()): String = when (date.dayOfWeek) {
        DayOfWeek.MONDAY -> "lunes"
        DayOfWeek.TUESDAY -> "martes"
        DayOfWeek.WEDNESDAY -> "miercoles"
        DayOfWeek.THURSDAY -> "jueves"
        DayOfWeek.FRIDAY -> "viernes"
        DayOfWeek.SATURDAY -> "sabado"
        DayOfWeek.SUNDAY -> "domingo"
    }

    fun weekRange(date: LocalDate = LocalDate.now()): Pair<Long, Long> {
        val monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val saturday = monday.plusDays(5)
        return startOfDay(monday) to endOfDay(saturday)
    }

    fun monthRange(date: LocalDate = LocalDate.now()): Pair<Long, Long> {
        val start = date.withDayOfMonth(1)
        val end = date.with(TemporalAdjusters.lastDayOfMonth())
        return startOfDay(start) to endOfDay(end)
    }

    fun periodRange(period: String, date: LocalDate = LocalDate.now()): Pair<Long, Long> = when (period) {
        "diario" -> startOfDay(date) to endOfDay(date)
        "semanal" -> weekRange(date)
        "mensual" -> monthRange(date)
        else -> startOfDay(date.minusDays(30)) to endOfDay(date)
    }
}

object Money {
    fun usd(value: Double): String = "$" + "%,.2f".format(Locale.US, value)
    fun cup(value: Double): String = "%,.2f CUP".format(Locale.US, value)
    fun qty(value: Double): String =
        if (value % 1.0 == 0.0) value.toInt().toString() else "%,.2f".format(Locale.US, value)
}
