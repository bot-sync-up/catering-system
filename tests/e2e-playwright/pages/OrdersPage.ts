import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface EventDetails {
  type: 'חתונה' | 'בר מצווה' | 'בת מצווה' | 'ברית' | 'אירוע עסקי' | 'שבע ברכות';
  date: string; // dd/MM/yyyy
  guests: number;
  hall?: string;
  notes?: string;
}

export class OrdersPage extends BasePage {
  readonly newOrderBtn = this.page.getByRole('button', { name: /הזמנה חדשה|צור הזמנה/ });
  readonly newEventBtn = this.page.getByRole('button', { name: /אירוע חדש|הוסף אירוע/ });
  readonly orderTotal = this.page.getByTestId('order-total');
  readonly downPaymentBtn = this.page.getByRole('button', { name: /מקדמה/ });
  readonly executeBtn = this.page.getByRole('button', { name: /בצע|העבר לביצוע/ });
  readonly issueTaxInvoiceBtn = this.page.getByRole('button', { name: /חשבונית מס/ });
  readonly debriefBtn = this.page.getByRole('button', { name: /דיבריף|סיכום אירוע/ });

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.page.goto('/orders');
    await this.waitForIdle();
  }

  async createEvent(details: EventDetails) {
    await this.newEventBtn.click();
    await this.page.getByLabel(/סוג אירוע/).selectOption({ label: details.type });
    await this.fillByLabel(/תאריך אירוע/, details.date);
    await this.fillByLabel(/מספר אורחים/, String(details.guests));
    if (details.hall) await this.fillByLabel(/אולם|מקום/, details.hall);
    if (details.notes) await this.fillByLabel(/הערות/, details.notes);
    await this.clickByName(/שמור|אישור/);
    await this.toast(/האירוע נשמר|נוצר אירוע/);
  }

  async selectMenu(menuName: string) {
    await this.page.getByRole('button', { name: /בחר תפריט|בחירת תפריט/ }).click();
    await this.page.getByRole('option', { name: menuName }).click();
    await this.clickByName(/אישור|המשך/);
  }

  async setGuestCount(count: number) {
    const input = this.page.getByLabel(/מספר מנות|מנות לאישור/);
    await input.fill(String(count));
    await input.blur();
  }

  async expectTotalGreaterThan(amount: number) {
    const txt = await this.orderTotal.textContent();
    const value = Number(String(txt).replace(/[^\d.]/g, ''));
    expect(value).toBeGreaterThan(amount);
  }

  async payDownPayment(amount: number, method: 'אשראי' | 'העברה' | 'מזומן' = 'אשראי') {
    await this.downPaymentBtn.click();
    await this.fillByLabel(/סכום מקדמה/, String(amount));
    await this.page.getByLabel(/אמצעי תשלום/).selectOption({ label: method });
    await this.clickByName(/בצע תשלום|חיוב/);
    await this.toast(/המקדמה נקלטה|תשלום בוצע/);
  }

  async moveToExecution() {
    await this.executeBtn.click();
    await this.clickByName(/אישור/);
    await this.toast(/הועברה לביצוע|בביצוע/);
  }

  async issueTaxInvoice() {
    await this.issueTaxInvoiceBtn.click();
    await this.clickByName(/הפק חשבונית/);
    await this.toast(/החשבונית הופקה|נשלחה ללקוח/);
  }

  async payRemaining(amount: number) {
    await this.page.getByRole('button', { name: /גביית יתרה|תשלום סופי/ }).click();
    await this.fillByLabel(/סכום/, String(amount));
    await this.clickByName(/חיוב|בצע/);
    await this.toast(/שולמה במלואה|תשלום בוצע/);
  }

  async runDebrief(opts: { rating: number; notes: string }) {
    await this.debriefBtn.click();
    await this.page.getByLabel(/דירוג/).selectOption(String(opts.rating));
    await this.fillByLabel(/הערות סיכום|הערות/, opts.notes);
    await this.clickByName(/שמור דיבריף|סגור אירוע/);
    await this.toast(/הדיבריף נשמר|האירוע נסגר/);
  }

  async cancelOrder(reason: string) {
    await this.page.getByRole('button', { name: /בטל הזמנה|ביטול/ }).click();
    await this.fillByLabel(/סיבת ביטול/, reason);
    await this.clickByName(/אשר ביטול/);
    await this.toast(/בוטלה|ביטול בוצע/);
  }

  async refund(amount: number) {
    await this.page.getByRole('button', { name: /החזר/ }).click();
    await this.fillByLabel(/סכום החזר/, String(amount));
    await this.clickByName(/בצע החזר/);
    await this.toast(/ההחזר בוצע|זוכה/);
  }

  /** Subscription helpers. */
  async createSubscription(opts: { plan: string; price: number; cycle: 'חודשי' | 'שנתי' }) {
    await this.page.getByRole('button', { name: /מנוי חדש|פתח מנוי/ }).click();
    await this.page.getByLabel(/תוכנית/).selectOption({ label: opts.plan });
    await this.page.getByLabel(/מחיר/).fill(String(opts.price));
    await this.page.getByLabel(/מחזור חיוב/).selectOption({ label: opts.cycle });
    await this.clickByName(/הפעל מנוי|שמור/);
    await this.toast(/המנוי הופעל|נשמר/);
  }
}
