/**
 * מחלקת אב לכל מחוללי קבצי הדיווח.
 * אחראית על: כתיבה ל-FS, חישוב checksum, החזרת תיאור GeneratedFile.
 */
import { randomUUID } from 'node:crypto';
import {
  AccountantFsAdapter,
  GeneratedFile,
  GeneratorContext,
  ReportFormType,
} from '../types';
import { nodeFs } from '../storage/nodeFs';
import { buildFullPath } from '../storage/paths';
import { sha256 } from '../storage/checksum';

export interface BaseGeneratorOptions {
  basePath: string;
}

export abstract class BaseGenerator {
  abstract readonly formType: ReportFormType;
  abstract readonly fileExtension: string;

  constructor(protected readonly options: BaseGeneratorOptions) {}

  /**
   * הילדים מממשים: יצירת תוכן הקובץ כ-Buffer/string.
   */
  protected abstract render(ctx: GeneratorContext): Promise<Buffer | string>;

  async generate(ctx: GeneratorContext): Promise<GeneratedFile> {
    const fs: AccountantFsAdapter = ctx.fs ?? nodeFs;
    const fullPath = buildFullPath(
      this.options.basePath,
      ctx.business,
      ctx.period,
      this.formType,
      this.fileExtension,
    );
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    await fs.mkdir(dir, true);

    const content = await this.render(ctx);
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    await fs.writeFile(fullPath, buf);

    const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);

    return {
      id: randomUUID(),
      formType: this.formType,
      period: ctx.period,
      fileName,
      filePath: fullPath,
      checksum: sha256(buf),
      byteSize: buf.byteLength,
      generatedAt: new Date().toISOString(),
      status: 'pending',
    };
  }
}
