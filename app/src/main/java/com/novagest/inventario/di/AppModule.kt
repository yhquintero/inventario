package com.novagest.inventario.di

import android.content.Context
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.novagest.inventario.data.local.AppDatabase
import com.novagest.inventario.data.local.DatabaseSeeder
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
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        return Room.databaseBuilder(context, AppDatabase::class.java, "novagest.db")
            .addMigrations(com.novagest.inventario.data.local.MIGRATION_3_4)
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
