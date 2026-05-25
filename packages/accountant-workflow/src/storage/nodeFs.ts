/**
 * מימוש מערכת קבצים מבוסס Node.js fs/promises.
 * עבור בדיקות יחידה משתמשים ב-InMemoryFs.
 */
import { promises as fs } from 'node:fs';
import { AccountantFsAdapter } from '../types';

export const nodeFs: AccountantFsAdapter = {
  async writeFile(path, content) {
    await fs.writeFile(path, content);
  },
  async readFile(path) {
    return fs.readFile(path);
  },
  async exists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  },
  async mkdir(path, recursive = true) {
    await fs.mkdir(path, { recursive });
  },
  async unlink(path) {
    await fs.unlink(path);
  },
};
