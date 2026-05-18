/**
 * Logger פשוט עם רמות. עברית בפלט — כך שגם מי שלא מבין באנגלית
 * יבין מה קורה.
 */
import kleur from "kleur";

export type LogLevel = "debug" | "info" | "warn" | "error";

let currentLevel: LogLevel = "info";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function ts(): string {
  return new Date().toISOString();
}

export const log = {
  debug(msg: string, meta?: unknown): void {
    if (!shouldLog("debug")) return;
    // eslint-disable-next-line no-console
    console.log(kleur.gray(`[${ts()}] [debug] ${msg}`), meta ?? "");
  },
  info(msg: string, meta?: unknown): void {
    if (!shouldLog("info")) return;
    // eslint-disable-next-line no-console
    console.log(kleur.cyan(`[${ts()}] [info]  ${msg}`), meta ?? "");
  },
  warn(msg: string, meta?: unknown): void {
    if (!shouldLog("warn")) return;
    // eslint-disable-next-line no-console
    console.warn(kleur.yellow(`[${ts()}] [warn]  ${msg}`), meta ?? "");
  },
  error(msg: string, meta?: unknown): void {
    if (!shouldLog("error")) return;
    // eslint-disable-next-line no-console
    console.error(kleur.red(`[${ts()}] [error] ${msg}`), meta ?? "");
  },
};
