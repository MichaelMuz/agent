const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Level = keyof typeof LEVELS;

function parseLevel(value: string | undefined): Level {
  if (
    value === 'debug' ||
    value === 'info' ||
    value === 'warn' ||
    value === 'error'
  ) {
    return value;
  }
  return 'info';
}

let threshold: Level = parseLevel(Bun.env['LOG_LEVEL']);

export function setLevel(level: Level): void {
  threshold = level;
}

function log(level: Level, args: unknown[]): void {
  if (LEVELS[level] < LEVELS[threshold]) return;
  // warn/error to stderr, everything else to stdout
  const sink =
    level === 'warn' || level === 'error' ? console.error : console.log;
  sink(...args);
}

export function debug(...args: unknown[]): void {
  log('debug', args);
}

export function info(...args: unknown[]): void {
  log('info', args);
}

export function warn(...args: unknown[]): void {
  log('warn', args);
}

export function error(...args: unknown[]): void {
  log('error', args);
}
