package com.cuadrepinar.inventario.data.local

import com.cuadrepinar.inventario.data.local.entity.AuditLogEntity
import com.cuadrepinar.inventario.data.local.entity.DailyCuadreEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.MovementEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.data.local.entity.UserEntity
import com.cuadrepinar.inventario.domain.model.AuditEntry
import com.cuadrepinar.inventario.domain.model.DailyCuadre
import com.cuadrepinar.inventario.domain.model.ExchangeRate
import com.cuadrepinar.inventario.domain.model.Movement
import com.cuadrepinar.inventario.domain.model.MovementType
import com.cuadrepinar.inventario.domain.model.Product
import com.cuadrepinar.inventario.domain.model.Role
import com.cuadrepinar.inventario.domain.model.SaleCenter
import com.cuadrepinar.inventario.domain.model.UserAccount

fun ProductEntity.toModel() = Product(
    id, name, stockInicial, stockActual, precioVentaUsd, comisionCup, minStock, active, category, notes,
    precioCostoUsd = precioCostoUsd, precioVenta2Usd = precioVenta2Usd, observaciones = observaciones
)

fun Product.toEntity() = ProductEntity(
    id, name, stockInicial, stockActual, precioVentaUsd, comisionCup, minStock, active, category, notes,
    precioCostoUsd = precioCostoUsd, precioVenta2Usd = precioVenta2Usd, observaciones = observaciones
)

fun MovementEntity.toModel(productName: String = "", userName: String = "") = Movement(
    id = id,
    dateEpoch = dateEpoch,
    weekday = weekday,
    productId = productId,
    productName = productName,
    type = MovementType.from(type),
    quantity = quantity,
    unitPriceUsd = unitPriceUsd,
    importeUsd = importeUsd,
    center = SaleCenter.from(center),
    comisionCup = comisionCup,
    stockInicial = stockInicial,
    stockFinal = stockFinal,
    userId = userId,
    userName = userName,
    notes = notes
)

fun Movement.toEntity() = MovementEntity(
    id, dateEpoch, weekday, productId, type.name, quantity, unitPriceUsd, importeUsd,
    center.name, comisionCup, stockInicial, stockFinal, userId, notes
)

fun DailyCuadreEntity.toModel() = DailyCuadre(
    id, dateEpoch, weekday, cupUsd, mxnUsd, cobroUsd, cobroZelle, cobroMxn, cobroCupEfectivo,
    cobroCupTransf, cobroEuropa, entradaCup, entradaUsd, extraccionCup, extraccionUsd,
    fondoInicialCup, fondoInicialUsd, cambioCup, cambioUsd, domicilioCup, domicilioUsd,
    otrosGastosCup, otrosGastosUsd, otrosGastosObs, comisionesCup, comisionesUsd, closed, userId
)

fun DailyCuadre.toEntity() = DailyCuadreEntity(
    id, dateEpoch, weekday, cupUsd, mxnUsd, cobroUsd, cobroZelle, cobroMxn, cobroCupEfectivo,
    cobroCupTransf, cobroEuropa, entradaCup, entradaUsd, extraccionCup, extraccionUsd,
    fondoInicialCup, fondoInicialUsd, cambioCup, cambioUsd, domicilioCup, domicilioUsd,
    otrosGastosCup, otrosGastosUsd, otrosGastosObs, comisionesCup, comisionesUsd, closed, userId
)

fun UserEntity.toModel() = UserAccount(
    id, username, displayName, email, Role.from(role), active, biometricEnabled, securityQuestion, createdAt, lastLoginAt
)

fun AuditLogEntity.toModel() = AuditEntry(id, userId, userName, action, entity, entityId, details, timestamp)

fun ExchangeRateEntity.toModel() = ExchangeRate(id, pair, rate, dateEpoch, userId, note)
