package com.novagest.inventario.di

import android.content.Context
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import net.zetetic.database.sqlcipher.SupportOpenHelperFactory
import com.novagest.inventario.data.local.AppDatabase
import com.novagest.inventario.data.local.DatabaseSeeder
import com.novagest.inventario.security.DatabaseKey
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun database(@ApplicationContext context: Context): AppDatabase {
        // La librería nativa debe cargarse antes de abrir la base de datos cifrada.
        System.loadLibrary("sqlcipher")
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        val passphrase = DatabaseKey.passphrase(context)

        // Nunca borrar una base inaccesible: puede ser una clave de Keystore temporalmente
        // inválida o una migración pendiente. Fallar explícitamente conserva los datos.
        return Room.databaseBuilder(context, AppDatabase::class.java, "novagest.db")
            .openHelperFactory(SupportOpenHelperFactory(passphrase))
            .addMigrations(com.novagest.inventario.data.local.MIGRATION_3_4, com.novagest.inventario.data.local.MIGRATION_4_5)
            .addCallback(object : RoomDatabase.Callback() {
                override fun onCreate(db: SupportSQLiteDatabase) {
                    super.onCreate(db)
                    // Seeding happens after first open via explicit call in NovaGestApp.
                }
            })
            .build()
            .also { database ->
                scope.launch { DatabaseSeeder.seedIfEmpty(context, database) }
            }
    }
}
