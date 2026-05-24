package co.il.catering.di

import co.il.catering.data.repository.*
import co.il.catering.domain.repository.*
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds @Singleton abstract fun bindAuth(impl: AuthRepositoryImpl): AuthRepository
    @Binds @Singleton abstract fun bindOrders(impl: OrdersRepositoryImpl): OrdersRepository
    @Binds @Singleton abstract fun bindTask(impl: TaskRepositoryImpl): TaskRepository
    @Binds @Singleton abstract fun bindCrm(impl: CrmRepositoryImpl): CrmRepository
    @Binds @Singleton abstract fun bindKitchen(impl: KitchenRepositoryImpl): KitchenRepository
    @Binds @Singleton abstract fun bindDelivery(impl: DeliveryRepositoryImpl): DeliveryRepository
    @Binds @Singleton abstract fun bindShift(impl: ShiftRepositoryImpl): ShiftRepository
    @Binds @Singleton abstract fun bindOcr(impl: OcrRepositoryImpl): OcrRepository
}
