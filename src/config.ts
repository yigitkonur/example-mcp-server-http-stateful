import { z } from 'zod/v4';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(1453),
  HOST: z.string().min(1).default('127.0.0.1'),
  CORS_ORIGIN: z.string().min(1).default('*'),
  SESSION_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30 * 60 * 1000),
  CLEANUP_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 1000),
  EVENT_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(24 * 60 * 60 * 1000),
  EVENT_MAX_COUNT: z.coerce.number().int().positive().default(5000),
  ALLOWED_HOSTS: z.string().optional(),
});

export interface AppConfig {
  port: number;
  host: string;
  corsOrigin: string;
  sessionTtlMs: number;
  cleanupIntervalMs: number;
  eventMaxAgeMs: number;
  eventMaxCount: number;
  allowedHosts?: string[];
}

function parseAllowedHosts(raw: string | undefined): string[] | undefined {
  if (!raw) {
    return undefined;
  }

  const values = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return values.length > 0 ? values : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const allowedHosts = parseAllowedHosts(parsed.ALLOWED_HOSTS);

  return {
    port: parsed.PORT,
    host: parsed.HOST,
    corsOrigin: parsed.CORS_ORIGIN,
    sessionTtlMs: parsed.SESSION_TTL_MS,
    cleanupIntervalMs: parsed.CLEANUP_INTERVAL_MS,
    eventMaxAgeMs: parsed.EVENT_MAX_AGE_MS,
    eventMaxCount: parsed.EVENT_MAX_COUNT,
    ...(allowedHosts ? { allowedHosts } : {}),
  };
}
