type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, msg: string, meta?: unknown) {
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${level.toUpperCase()} ${msg}`;
  if (meta !== undefined) {
    console.log(line, typeof meta === 'string' ? meta : JSON.stringify(meta));
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (m: string, x?: unknown) => log('info', m, x),
  warn: (m: string, x?: unknown) => log('warn', m, x),
  error: (m: string, x?: unknown) => log('error', m, x),
  debug: (m: string, x?: unknown) => {
    if (process.env.NODE_ENV !== 'production') log('debug', m, x);
  },
};
