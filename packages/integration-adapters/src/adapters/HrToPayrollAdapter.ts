/**
 * HrToPayrollAdapter - מאזין ל-`month.closed` ומחשב משכורות לכל העובדים.
 *
 * הזרימה:
 *  1. HR סוגר את החודש
 *  2. ה-adapter מושך את כל העובדים הפעילים
 *  3. עבור כל אחד מחשב hours/gross/net
 *  4. מפרסם `payroll.calculated` עבור כל עובד
 */

import { BaseAdapter, type BaseAdapterOptions, type AdapterContext } from '../BaseAdapter.js';

export interface PayrollClient {
  listActiveEmployees: (period: string) => Promise<Array<{ employeeId: string }>>;
  calculatePayroll: (input: {
    employeeId: string;
    period: string;
  }) => Promise<{
    payrollId: string;
    hoursWorked: number;
    grossAmount: number;
    netAmount: number;
  }>;
}

export interface HrToPayrollOptions extends BaseAdapterOptions {
  payroll: PayrollClient;
}

export class HrToPayrollAdapter extends BaseAdapter<'month.closed'> {
  readonly name = 'hr-to-payroll';
  readonly sourceEvent = 'month.closed' as const;

  constructor(private readonly opts: HrToPayrollOptions) {
    super(opts);
  }

  protected async handle(ctx: AdapterContext<'month.closed'>): Promise<void> {
    const { event } = ctx;
    const employees = await this.opts.payroll.listActiveEmployees(
      event.payload.period,
    );

    for (const emp of employees) {
      const result = await this.opts.payroll.calculatePayroll({
        employeeId: emp.employeeId,
        period: event.payload.period,
      });

      await this.bus.publish(
        'payroll.calculated',
        {
          payrollId: result.payrollId,
          employeeId: emp.employeeId,
          period: event.payload.period,
          hoursWorked: result.hoursWorked,
          grossAmount: result.grossAmount,
          netAmount: result.netAmount,
          calculatedAt: new Date().toISOString(),
        },
        {
          correlationId: event.metadata.correlationId,
          causationId: event.metadata.id,
        },
      );
    }

    this.logger.info(
      { period: event.payload.period, employees: employees.length },
      'משכורות חושבו',
    );
  }
}
