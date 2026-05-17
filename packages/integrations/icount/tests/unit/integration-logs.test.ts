import {
  InMemoryLogStore,
  IntegrationLogger,
  LogLevel,
  OperationType,
} from '../../src/utils/integration-logs';

describe('IntegrationLogger', () => {
  let store: InMemoryLogStore;
  let logger: IntegrationLogger;

  beforeEach(() => {
    store = new InMemoryLogStore();
    logger = new IntegrationLogger(store);
  });

  it('writes a successful log entry', async () => {
    const entry = await logger.log(OperationType.CREATE_INVOICE, 'icount', {
      success: true,
      documentNumber: 'INV-001',
      amount: 1170,
    });

    expect(entry.id).toBeDefined();
    expect(entry.success).toBe(true);
    expect(entry.level).toBe(LogLevel.INFO);
    expect(store.count()).toBe(1);
  });

  it('writes an error entry with ERROR level by default', async () => {
    const entry = await logger.log(OperationType.GET_ALLOCATION, 'icount', {
      success: false,
      errorCode: 'AUTH',
      errorMessage: 'invalid token',
    });
    expect(entry.level).toBe(LogLevel.ERROR);
    expect(entry.success).toBe(false);
  });

  it('audit logs use AUDIT level', async () => {
    const entry = await logger.audit(OperationType.WEBHOOK_RECEIVED, 'icount', {
      success: true,
    });
    expect(entry.level).toBe(LogLevel.AUDIT);
  });

  it('queries by filter', async () => {
    await logger.log(OperationType.CREATE_INVOICE, 'icount', { success: true });
    await logger.log(OperationType.CREATE_RECEIPT, 'icount', { success: true });
    await logger.log(OperationType.CREATE_INVOICE, 'green_invoice', { success: false });

    const invoiceOnly = await logger.query({ operation: OperationType.CREATE_INVOICE });
    expect(invoiceOnly).toHaveLength(2);

    const greenFails = await logger.query({ provider: 'green_invoice', success: false });
    expect(greenFails).toHaveLength(1);
  });
});
