/**
 * hr-to-payroll.adapter.ts
 *
 * תפקיד: על `employee.clocked` מצטבר שעות-עבודה ב-Payroll. בסוף חודש (אירוע
 * חיצוני שכזה) מפעיל חישוב משכורת ופרסום `payroll.calculated`.
 * Stub: PayrollClient — יחובר ל-Payroll Service.
 */
import { BaseAdapter, type BaseAdapterOptions } from './BaseAdapter.js';

export interface PayrollClient {
  recordPunch(input: { employeeId: string; action: 'in' | 'out'; at: string; location?: string }): Promise<void>;
}

export interface HrToPayrollAdapterOptions extends BaseAdapterOptions {
  payroll: PayrollClient;
}

export class HrToPayrollAdapter extends BaseAdapter {
  readonly name = 'hr-to-payroll';
  private readonly payroll: PayrollClient;

  constructor(opts: HrToPayrollAdapterOptions) {
    super(opts);
    this.payroll = opts.payroll;
  }

  protected register(): void {
    this.on('employee.clocked', 'record-punch', async (evt) => {
      await this.payroll.recordPunch({
        employeeId: evt.payload.employeeId,
        action: evt.payload.action,
        at: evt.payload.at,
        location: evt.payload.location,
      });
    });
  }
}
