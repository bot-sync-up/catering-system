/**
 * מימוש in-memory למערכת הקבצים — לשימוש בבדיקות.
 */
import { AccountantFsAdapter } from '../types';

export class InMemoryFs implements AccountantFsAdapter {
  public readonly files = new Map<string, Buffer>();
  public readonly dirs = new Set<string>();

  async writeFile(path: string, content: Buffer | string): Promise<void> {
    this.files.set(path, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'));
  }

  async readFile(path: string): Promise<Buffer> {
    const f = this.files.get(path);
    if (!f) throw new Error(`ENOENT: ${path}`);
    return f;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path) || this.dirs.has(path);
  }

  async mkdir(path: string, _recursive = true): Promise<void> {
    this.dirs.add(path);
  }

  async unlink(path: string): Promise<void> {
    this.files.delete(path);
  }
}
