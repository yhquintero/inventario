plugins {
    // 8.6+: Compose 1.9 / lifecycle 2.10 (que llegan por alineación de versiones) lo exigen
    // en sus metadatos AAR; con 8.5.2 fallaba :app:checkDebugAarMetadata. Requiere Gradle 8.7+
    // (el wrapper y el CI usan 8.9).
    id("com.android.application") version "8.6.1" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("com.google.dagger.hilt.android") version "2.52" apply false
    id("com.google.devtools.ksp") version "2.0.21-1.0.27" apply false
}
