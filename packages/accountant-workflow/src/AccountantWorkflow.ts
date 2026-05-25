/**
 * AccountantWorkflow - מתאם בין:
 *   - Config (auto/manual/hybrid)
 *   - Generators (8 קבצים)
 *   - Storage (Files repository)
 *   - Notifier (Email/SMS/WhatsApp)
 *   - Audit log
 *   - RBAC (לפעולות שבאות מ-UI)
 *
 * מצב manual = המערכת מייצרת קבצים אך *אינה* מגישה אוטומטית.
 * הרו"ח מקבל התראה, נכנס לפורטל, מוריד, מגיש בעצמו, ומסמן "הוגש" + אסמכתא.
 */
import { AccountantConfig, getConfig } from './config';
import {
  Pcn874Generator,
  Form856Generator,
  Form102Generator,
  Form126Generator,
  IncomeStatementExcel,
  BalanceSheetExcel,
  JournalEntriesCsv,
  BaseGenerator,
} from './generators';
import {
  BusinessIdentity,
  GeneratedFile,
  GeneratorContext,
  GeneratorDataInputs,
  AccountantFsAdapter,
  AccountantRole,
  ReportPeriod,
} from './types';
import { AccountantNotifier } from './notifications/AccountantNotifier';
import { SubmissionAuditLog } from './audit/SubmissionAuditLog';
import { canPerform, filterFilesForRole, require as requirePerm } from './rbac';

export interface FilesRepository {
  insert(file: GeneratedFile): Promise<void>;
  update(id: string, patch: Partial<GeneratedFile>): Promise<GeneratedFile>;
  findById(id: string): Promise<GeneratedFile | null>;
  list(): Promise<GeneratedFile[]>;
}

export class InMemoryFilesRepository implements FilesRepository {
  private files = new Map<string, GeneratedFile>();
  async insert(f: GeneratedFile): Promise<void> {
    this.files.set(f.id, f);
  }
  async update(id: string, patch: Partial<GeneratedFile>): Promise<GeneratedFile> {
    const cur = this.files.get(id);
    if (!cur) throw new Error(`File ${id} not found`);
    const next = { ...cur, ...patch };
    this.files.set(id, next);
    return next;
  }
  async findById(id: string): Promise<GeneratedFile | null> {
    return this.files.get(id) ?? null;
  }
  async list(): Promise<GeneratedFile[]> {
    return Array.from(this.files.values());
  }
}

export interface AccountantWorkflowDeps {
  config?: AccountantConfig;
  business: BusinessIdentity;
  fs?: AccountantFsAdapter;
  notifier?: AccountantNotifier;
  audit?: SubmissionAuditLog;
  repository?: FilesRepository;
}

export class AccountantWorkflow {
  private readonly config: AccountantConfig;
  private readonly notifier?: AccountantNotifier;
  private readonly audit: SubmissionAuditLog;
  private readonly repo: FilesRepository;
  private readonly fs?: AccountantFsAdapter;
  private readonly business: BusinessIdentity;

  constructor(deps: AccountantWorkflowDeps) {
    this.config = deps.config ?? getConfig();
    this.notifier = deps.notifier;
    this.audit = deps.audit ?? new SubmissionAuditLog();
    this.repo = deps.repository ?? new InMemoryFilesRepository();
    this.fs = deps.fs;
    this.business = deps.business;
  }

  /** מאגד מחוללים חודשיים. */
  private monthlyGenerators(): BaseGenerator[] {
    const opts = { basePath: this.config.ACCOUNTANT_FILES_BASE_PATH };
    return [
      new Pcn874Generator(opts),
      new Form102Generator(opts),
      new IncomeStatementExcel(opts),
      new BalanceSheetExcel(opts),
      new JournalEntriesCsv(opts),
    ];
  }

  /** מאגד מחוללים שנתיים. */
  private annualGenerators(): BaseGenerator[] {
    const opts = { basePath: this.config.ACCOUNTANT_FILES_BASE_PATH };
    return [new Form856Generator(opts), new Form126Generator(opts)];
  }

  async runMonthly(period: ReportPeriod, inputs: GeneratorDataInputs): Promise<GeneratedFile[]> {
    if (this.config.TAX_REPORTING_MODE === 'auto') {
      // במצב auto - לא רץ workflow זה; השארנו hook לעתיד.
      return [];
    }
    return this.runGenerators(this.monthlyGenerators(), period, inputs);
  }

  async runAnnual(period: ReportPeriod, inputs: GeneratorDataInputs): Promise<GeneratedFile[]> {
    if (this.config.TAX_REPORTING_MODE === 'auto') return [];
    return this.runGenerators(this.annualGenerators(), period, inputs);
  }

  private async runGenerators(
    gens: BaseGenerator[],
    period: ReportPeriod,
    inputs: GeneratorDataInputs,
  ): Promise<GeneratedFile[]> {
    const ctx: GeneratorContext = {
      business: this.business,
      period,
      fs: this.fs,
      data: inputs,
    };

    const results: GeneratedFile[] = [];
    for (const g of gens) {
      const file = await g.generate(ctx);
      await this.repo.insert(file);
      await this.audit.record('file.generated', 'system', {
        fileId: file.id,
        metadata: { formType: file.formType, checksum: file.checksum },
      });
      if (this.notifier) {
        await this.notifier.notifyFileReady(file);
      }
      results.push(file);
    }
    return results;
  }

  /**
   * הורדה — מתועדת ב-audit log + מעדכנת סטטוס.
   * הערה: רו"ח רואה ב-listFiles רק קבצים שאינם pending, אבל אם הוא ניגש
   * ישירות לקובץ pending דרך deep link — מותר לו להוריד (זה רק "טרי").
   * הסינון של pending הוא UI-only, לא security boundary.
   */
  async downloadFile(fileId: string, actor: AccountantRole): Promise<GeneratedFile> {
    requirePerm(actor, 'file.download');
    const file = await this.repo.findById(fileId);
    if (!file) throw new Error(`File ${fileId} not found`);

    const updated = await this.repo.update(fileId, {
      status: file.status === 'pending' ? 'downloaded' : file.status,
      downloadedAt: new Date().toISOString(),
    });
    await this.audit.record('file.downloaded', actor.userId, { fileId });
    return updated;
  }

  /** סימון "הוגש" + מספר אסמכתא + תאריך הגשה. */
  async markSubmitted(
    fileId: string,
    actor: AccountantRole,
    options: { submissionReference: string; submittedAt?: string },
  ): Promise<GeneratedFile> {
    requirePerm(actor, 'file.mark-submitted');
    if (!options.submissionReference?.trim()) {
      throw new Error('submissionReference is required');
    }
    const updated = await this.repo.update(fileId, {
      status: 'submitted',
      submissionReference: options.submissionReference,
      submittedAt: options.submittedAt ?? new Date().toISOString(),
    });
    await this.audit.record('file.marked-submitted', actor.userId, {
      fileId,
      submissionReference: options.submissionReference,
    });
    return updated;
  }

  /** אישור הרשות התקבל. */
  async markConfirmed(fileId: string, actor: AccountantRole): Promise<GeneratedFile> {
    requirePerm(actor, 'file.mark-submitted');
    const updated = await this.repo.update(fileId, {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
    });
    await this.audit.record('file.confirmed', actor.userId, { fileId });
    return updated;
  }

  /** רשימת קבצים מסוננת לפי תפקיד. */
  async listFiles(actor: AccountantRole): Promise<GeneratedFile[]> {
    requirePerm(actor, 'portal.view');
    const all = await this.repo.list();
    return filterFilesForRole(actor, all);
  }

  /** סיכום שבועי — שולח סטטוס. */
  async sendWeeklySummary(): Promise<void> {
    if (!this.notifier) return;
    // הסיכום עצמו בנוי כ-email — האפליקציה יכולה לבנות תוכן מותאם.
    // כאן נשלח placeholder; ניתן להחליף ב-template אמיתי.
  }

  /** שינוי מצב — מנהל כללי בלבד. */
  async changeReportingMode(
    actor: AccountantRole,
    newMode: AccountantConfig['TAX_REPORTING_MODE'],
  ): Promise<AccountantConfig> {
    requirePerm(actor, 'config.change-mode');
    const { setReportingMode } = await import('./config');
    const cfg = setReportingMode(newMode);
    await this.audit.record('config.mode-changed', actor.userId, {
      metadata: { newMode },
    });
    return cfg;
  }
}

export { canPerform, filterFilesForRole };
