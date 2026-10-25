import java.io.FileInputStream
import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

// Firma: misma configuración que la app principal (keystore.properties, fuera de git).
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) FileInputStream(keystorePropsFile).use { load(it) }
}

android {
    namespace = "com.novagest.keygen"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.novagest.keygen"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        if (keystorePropsFile.exists()) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Herramienta interna: sin ofuscación, así el APK es fácil de auditar.
            isMinifyEnabled = false
            signingConfigs.findByName("release")?.let { signingConfig = it }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true }

    lint {
        // Mismo apaño que :app: con Kotlin 2.1 y AGP 8.7 el detector
        // NullSafeMutableLiveData lanza IncompatibleClassChangeError y tumba el build
        // de release (lintVital). Se desactiva ese detector, no el lint entero.
        disable += "NullSafeMutableLiveData"
        abortOnError = false
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.security.crypto)
    // Bloqueo con huella/rostro: BiometricPrompt necesita una FragmentActivity.
    implementation(libs.androidx.fragment.ktx)
    implementation(libs.androidx.biometric)

    // El motor de licencias se prueba en la JVM: es la parte que debe coincidir
    // byte a byte con el servidor y no depende de Android.
    testImplementation(libs.junit)

    debugImplementation(libs.androidx.compose.ui.tooling)
}
