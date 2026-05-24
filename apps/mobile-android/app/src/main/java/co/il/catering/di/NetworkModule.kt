package co.il.catering.di

import co.il.catering.BuildConfig
import co.il.catering.core.network.AuthInterceptor
import co.il.catering.core.network.TokenAuthenticator
import co.il.catering.data.remote.*
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides @Singleton
    fun provideMoshi(): Moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    @Provides @Singleton
    fun provideOkHttp(
        authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .authenticator(tokenAuthenticator)
            .retryOnConnectionFailure(true)
            .build()
    }

    @Provides @Singleton
    fun provideRetrofit(client: OkHttpClient, moshi: Moshi): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()

    @Provides @Singleton fun authApi(r: Retrofit): AuthApi = r.create(AuthApi::class.java)
    @Provides @Singleton fun ordersApi(r: Retrofit): OrdersApi = r.create(OrdersApi::class.java)
    @Provides @Singleton fun crmApi(r: Retrofit): CrmApi = r.create(CrmApi::class.java)
    @Provides @Singleton fun kitchenApi(r: Retrofit): KitchenApi = r.create(KitchenApi::class.java)
    @Provides @Singleton fun deliveryApi(r: Retrofit): DeliveryApi = r.create(DeliveryApi::class.java)
    @Provides @Singleton fun ocrApi(r: Retrofit): OcrApi = r.create(OcrApi::class.java)
    @Provides @Singleton fun shiftApi(r: Retrofit): ShiftApi = r.create(ShiftApi::class.java)
}
