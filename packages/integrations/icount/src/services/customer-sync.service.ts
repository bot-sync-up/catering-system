/**
 * Customer / Supplier auto-sync service
 * Caches customers locally and syncs with provider on create/update.
 */

import { Customer, CustomerSchema } from '../types';
import { RestClient } from '../client/rest-client';
import { createLogger } from '../utils/logger';

const log = createLogger('customer-sync');

export interface CustomerStore {
  findByTaxId(taxId: string): Promise<Customer | null>;
  findByExternalId(externalId: string): Promise<Customer | null>;
  upsert(customer: Customer): Promise<Customer>;
  list(): Promise<Customer[]>;
}

export class InMemoryCustomerStore implements CustomerStore {
  private items = new Map<string, Customer>();

  async findByTaxId(taxId: string): Promise<Customer | null> {
    for (const c of this.items.values()) {
      if (c.taxId === taxId) return c;
    }
    return null;
  }

  async findByExternalId(externalId: string): Promise<Customer | null> {
    for (const c of this.items.values()) {
      if (c.externalId === externalId) return c;
    }
    return null;
  }

  async upsert(customer: Customer): Promise<Customer> {
    const id = customer.id ?? customer.taxId ?? customer.externalId ?? customer.email ?? customer.name;
    const existing = this.items.get(id);
    const merged: Customer = { ...existing, ...customer, id };
    this.items.set(id, merged);
    return merged;
  }

  async list(): Promise<Customer[]> {
    return Array.from(this.items.values());
  }

  clear(): void {
    this.items.clear();
  }
}

export class CustomerSyncService {
  constructor(
    private readonly client: RestClient,
    private readonly store: CustomerStore = new InMemoryCustomerStore(),
  ) {}

  /**
   * Sync customer to iCount and store the canonical record locally.
   * If a customer with the same tax-id / externalId already exists - update it.
   */
  async sync(customer: Customer): Promise<Customer> {
    const validated = CustomerSchema.parse(customer);

    let existing: Customer | null = null;
    if (validated.taxId) {
      existing = await this.store.findByTaxId(validated.taxId);
    }
    if (!existing && validated.externalId) {
      existing = await this.store.findByExternalId(validated.externalId);
    }

    if (existing) {
      log.debug({ taxId: validated.taxId }, 'updating existing customer');
      const updated = await this.client.post<{ id: string }>('/client/update', {
        client_id: existing.id,
        client_name: validated.name,
        client_emails: validated.email,
        phone: validated.phone,
        client_address: validated.address,
        client_city: validated.city,
        client_zip: validated.zip,
        vat_id: validated.taxId,
      });
      const merged: Customer = { ...validated, id: updated.id ?? existing.id };
      return this.store.upsert(merged);
    }

    log.debug({ taxId: validated.taxId }, 'creating new customer');
    const created = await this.client.post<{ client_id: string }>('/client/create', {
      client_name: validated.name,
      client_emails: validated.email,
      phone: validated.phone,
      client_address: validated.address,
      client_city: validated.city,
      client_zip: validated.zip,
      vat_id: validated.taxId,
    });
    const fresh: Customer = { ...validated, id: created.client_id };
    return this.store.upsert(fresh);
  }

  async getStore(): Promise<CustomerStore> {
    return this.store;
  }
}
