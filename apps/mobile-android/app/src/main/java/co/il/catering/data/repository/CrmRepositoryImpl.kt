package co.il.catering.data.repository

import co.il.catering.data.remote.CrmApi
import co.il.catering.data.remote.dto.LeadDto
import co.il.catering.data.toDomain
import co.il.catering.domain.model.Customer
import co.il.catering.domain.model.Lead
import co.il.catering.domain.model.LeadStage
import co.il.catering.domain.repository.CrmRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CrmRepositoryImpl @Inject constructor(
    private val api: CrmApi,
) : CrmRepository {

    override suspend fun searchCustomers(query: String?): Result<List<Customer>> = runCatching {
        api.listCustomers(query).map { it.toDomain() }
    }

    override suspend fun customer(id: String): Result<Customer> = runCatching {
        api.getCustomer(id).toDomain()
    }

    override suspend fun leads(stage: LeadStage?): Result<List<Lead>> = runCatching {
        api.listLeads(stage?.name).map { it.toDomain() }
    }

    override suspend fun lead(id: String): Result<Lead> = runCatching {
        api.getLead(id).toDomain()
    }

    override suspend fun saveLead(lead: Lead): Result<Lead> = runCatching {
        val dto = LeadDto(lead.id, lead.name, lead.phone, lead.email, lead.source, lead.stage.name, lead.estimatedValue, lead.notes)
        if (lead.id.isBlank()) api.createLead(dto).toDomain()
        else api.updateLead(lead.id, dto).toDomain()
    }
}
