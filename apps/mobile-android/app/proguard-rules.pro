# Proguard rules ל-CateringApp

# Kotlin
-dontwarn kotlin.**
-keep class kotlin.Metadata { *; }

# Coroutines
-keepclassmembers class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Retrofit + OkHttp
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class retrofit2.** { *; }
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclasseswithmembers,allowshrinking,allowobfuscation interface * { @retrofit2.http.* <methods>; }

# Moshi
-keepclassmembers class kotlin.Metadata { *; }
-keep class **JsonAdapter { *; }
-keepclasseswithmembers class * { @com.squareup.moshi.* <methods>; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class * { kotlinx.serialization.KSerializer serializer(...); }

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao class *
-dontwarn androidx.room.paging.**

# Hilt
-keep class dagger.hilt.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager$FragmentContextWrapper { *; }
-keepclasseswithmembers class * { @dagger.hilt.android.* <fields>; }

# DataStore + Security
-keep class androidx.security.crypto.** { *; }

# Firebase / FCM
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ML Kit
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# CameraX
-keep class androidx.camera.** { *; }

# Domain models (kotlinx serializable)
-keep class co.il.catering.domain.model.** { *; }
-keep class co.il.catering.data.remote.dto.** { *; }

# Compose
-dontwarn androidx.compose.**

# Crashlytics: keep line numbers
-keepattributes SourceFile, LineNumberTable
-renamesourcefileattribute SourceFile
