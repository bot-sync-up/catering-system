/**
 * Factory + Registry - יצירת adapter לפי שם הספק
 * Adapter pattern - מאפשר החלפה דינמית בין iCount / GreenInvoice / Rivhit
 */

import { ICountAdapter, ICountAdapterServices } from './icount-adapter';
import { GreenInvoiceAdapter, GreenInvoiceConfig } from './green-invoice-adapter';
import { RivhitAdapter } from './rivhit-adapter';
import { RestClient } from '../client/rest-client';
import { ICountConfig, IntegrationProvider, ProviderName } from '../types';

export class AdapterFactory {
  static create(provider: ProviderName, config: ICountConfig): IntegrationProvider {
    switch (provider) {
      case ProviderName.ICOUNT: {
        const client = new RestClient(config);
        const services: ICountAdapterServices = { client };
        return new ICountAdapter(services);
      }
      case ProviderName.GREEN_INVOICE:
        return new GreenInvoiceAdapter(config as GreenInvoiceConfig);
      case ProviderName.RIVHIT:
        return new RivhitAdapter(config);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
