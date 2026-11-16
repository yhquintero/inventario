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

        // Si existe un archivo previo inaccesible (p.ej. creado con un IV no persistente en sesiones anteriores),
        // validamos la conexión y en caso de error eliminamos el archivo corrupto para recrearlo limpiamente.
        val dbFile = context.getDatabasePath("novagest.db")
        if (dbFile.exists()) {
            try {
                val helper = SupportOpenHelperFactory(passphrase)
                    .create(
                        androidx.sqlite.db.SupportSQLiteOpenHelper.Configuration.builder(context)
                            .name("novagest.db")
                            .callback(object : androidx.sqlite.db.SupportSQLiteOpenHelper.Callback(1) {
                                override fun onCreate(db: SupportSQLiteDatabase) {}
                                override fun onUpgrade(db: SupportSQLiteDatabase, oldVersion: Int, newVersion: Int) {}
                            })
                            .build()
                    )
                helper.writableDatabase.use { it.version }
                helper.close()
            } catch (_: Exception) {
                context.deleteDatabase("novagest.db")
            }
        }

        return Room.databaseBuilder(context, AppDatabase::class.java, "novagest.db")
            .openHelperFactory(SupportOpenHelperFactory(passphrase))
            .addMigrations(com.novagest.inventario.data.local.MIGRATION_3_4, com.novagest.inventario.data.local.MIGRATION_4_5)
            .addCallback(object : RoomDatabase.Callback() {
                override fun onCreate(db: SupportSQLiteDatabase) {
                    super.onCreate(db)
                    // Seeding happens after first open via explicit call in NovaGestApp.
                }
            })
            .fallbackToDestructiveMigration()
            .build()
            .also { database ->
                scope.launch { DatabaseSeeder.seedIfEmpty(context, database) }
            }
    }
}
