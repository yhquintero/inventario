package com.cuadrepinar.inventario.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.cuadrepinar.inventario.data.local.entity.AuditLogEntity
import com.cuadrepinar.inventario.data.local.entity.BackupEntity
import com.cuadrepinar.inventario.data.local.entity.DailyCuadreEntity
import com.cuadrepinar.inventario.data.local.entity.ExchangeRateEntity
import com.cuadrepinar.inventario.data.local.entity.MovementEntity
import com.cuadrepinar.inventario.data.local.entity.ProductEntity
import com.cuadrepinar.inventario.data.local.entity.ReportCacheEntity
import com.cuadrepinar.inventario.data.local.entity.SettingsEntity
import com.cuadrepinar.inventario.data.local.entity.UserEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name")
    fun observeAll(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE active = 1 ORDER BY name")
    fun observeActive(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun get(id: Long): ProductEntity?

    @Query("SELECT * FROM products WHERE name = :name COLLATE NOCASE LIMIT 1")
    suspend fun byName(name: String): ProductEntity?

    @Query("SELECT * FROM products WHERE name LIKE '%' || :q || '%' COLLATE NOCASE ORDER BY name")
    suspend fun search(q: String): List<ProductEntity>

    @Query("SELECT * FROM products WHERE stockActual <= minStock AND active = 1")
    fun observeLowStock(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products")
    suspend fun all(): List<ProductEntity>

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(item: ProductEntity): Long

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(items: List<ProductEntity>)

    @Update
    suspend fun update(item: ProductEntity)

    @Query("UPDATE products SET stockActual = :stock, updatedAt = :ts WHERE id = :id")
    suspend fun updateStock(id: Long, stock: Double, ts: Long = System.currentTimeMillis())

    @Delete
    suspend fun delete(item: ProductEntity)

    @Query("SELECT COUNT(*) FROM products")
    suspend fun count(): Int
}

@Dao
interface MovementDao {
    @Query("SELECT * FROM movements ORDER BY dateEpoch DESC, id DESC")
    fun observeAll(): Flow<List<MovementEntity>>

    @Query("SELECT * FROM movements WHERE dateEpoch BETWEEN :from AND :to ORDER BY dateEpoch, id")
    fun observeRange(from: Long, to: Long): Flow<List<MovementEntity>>

    @Query("SELECT * FROM movements WHERE dateEpoch BETWEEN :from AND :to ORDER BY dateEpoch, id")
    suspend fun inRange(from: Long, to: Long): List<MovementEntity>

    @Query("SELECT * FROM movements WHERE productId = :productId ORDER BY dateEpoch, id")
    suspend fun byProduct(productId: Long): List<MovementEntity>

    @Query("SELECT * FROM movements WHERE id = :id")
    suspend fun get(id: Long): MovementEntity?

    @Insert
    suspend fun insert(item: MovementEntity): Long

    @Update
    suspend fun update(item: MovementEntity)

    @Delete
    suspend fun delete(item: MovementEntity)

    @Query("SELECT * FROM movements ORDER BY dateEpoch, id")
    suspend fun all(): List<MovementEntity>
}

@Dao
interface CuadreDao {
    @Query("SELECT * FROM daily_cuadre ORDER BY dateEpoch DESC")
    fun observeAll(): Flow<List<DailyCuadreEntity>>

    @Query("SELECT * FROM daily_cuadre WHERE dateEpoch = :date LIMIT 1")
    suspend fun byDate(date: Long): DailyCuadreEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: DailyCuadreEntity): Long

    @Query("SELECT * FROM daily_cuadre")
    suspend fun all(): List<DailyCuadreEntity>
}

@Dao
interface UserDao {
    @Query("SELECT * FROM users ORDER BY displayName")
    fun observeAll(): Flow<List<UserEntity>>

    @Query("SELECT * FROM users WHERE username = :username COLLATE NOCASE LIMIT 1")
    suspend fun byUsername(username: String): UserEntity?

    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun get(id: Long): UserEntity?

    @Insert
    suspend fun insert(item: UserEntity): Long

    @Update
    suspend fun update(item: UserEntity)

    @Delete
    suspend fun delete(item: UserEntity)

    @Query("SELECT COUNT(*) FROM users")
    suspend fun count(): Int

    @Query("SELECT * FROM users")
    suspend fun all(): List<UserEntity>
}

@Dao
interface AuditDao {
    @Query("SELECT * FROM audit_log ORDER BY timestamp DESC")
    fun observeAll(): Flow<List<AuditLogEntity>>

    @Query("SELECT * FROM audit_log WHERE timestamp BETWEEN :from AND :to ORDER BY timestamp DESC")
    suspend fun inRange(from: Long, to: Long): List<AuditLogEntity>

    @Insert
    suspend fun insert(item: AuditLogEntity)

    @Query("SELECT * FROM audit_log ORDER BY timestamp DESC")
    suspend fun all(): List<AuditLogEntity>
}

@Dao
interface ExchangeDao {
    @Query("SELECT * FROM exchange_rates ORDER BY dateEpoch DESC")
    fun observeAll(): Flow<List<ExchangeRateEntity>>

    @Query("SELECT * FROM exchange_rates WHERE pair = :pair ORDER BY dateEpoch DESC LIMIT 1")
    suspend fun latest(pair: String): ExchangeRateEntity?

    @Insert
    suspend fun insert(item: ExchangeRateEntity): Long

    @Query("SELECT * FROM exchange_rates ORDER BY dateEpoch DESC")
    suspend fun all(): List<ExchangeRateEntity>
}

@Dao
interface BackupDao {
    @Query("SELECT * FROM backups ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<BackupEntity>>

    @Insert
    suspend fun insert(item: BackupEntity): Long

    @Query("SELECT * FROM backups ORDER BY createdAt DESC")
    suspend fun all(): List<BackupEntity>

    @Delete
    suspend fun delete(item: BackupEntity)
}

@Dao
interface SettingsDao {
    @Query("SELECT * FROM app_settings WHERE id = 1")
    fun observe(): Flow<SettingsEntity?>

    @Query("SELECT * FROM app_settings WHERE id = 1")
    suspend fun get(): SettingsEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: SettingsEntity)
}

@Dao
interface ReportCacheDao {
    @Query("SELECT * FROM report_cache ORDER BY createdAt DESC LIMIT 12")
    fun observeRecent(): Flow<List<ReportCacheEntity>>

    @Insert
    suspend fun insert(item: ReportCacheEntity): Long

    @Query("DELETE FROM report_cache WHERE id NOT IN (SELECT id FROM report_cache ORDER BY createdAt DESC LIMIT 12)")
    suspend fun prune()
}
