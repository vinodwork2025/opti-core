type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function getConfiguredLevel(): LogLevel {
  const level = (process.env['LOG_LEVEL'] ?? 'info') as LogLevel;
  return level in LEVELS ? level : 'info';
}

function emit(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[getConfiguredLevel()]) return;
  const entry = JSON.stringify({ time: new Date().toISOString(), level, msg, ...data });
  process.stdout.write(entry + '\n');
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => emit('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => emit('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => emit('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => emit('error', msg, data),
};
