
import './load-env.js';
import { z } from 'zod';

// ---------- 1. Schema: single source of truth for shape, types, rules ----------
// Blank env vars (e.g. `FOO=` in .env) count as unset.
const optionalUrl = z.preprocess(
  (v) => (v === '' ? undefined : v),
  z.string().url().optional(),
);

const schema = z
  .object({
    port: z.coerce.number().int().positive().min(1).max(65535).default(3002),
    env: z.enum(['development', 'test', 'production']).default('development'),
    mapApi: optionalUrl,
    frontendOrigin: optionalUrl,
    devOrigin: optionalUrl,
    bffServiceUrl: z.string().url().default('http://localhost:3001'),
    redis: z.object({
      host: z.string().default('localhost'),
      port: z.coerce.number().int().positive().default(6379),
    }),
    kafka: z.object({
      brokers: z
        .preprocess(
          (v) => (typeof v === 'string' ? v.split(',').map((b) => b.trim()).filter(Boolean) : v),
          z.array(z.string().min(1)).min(1),
        )
        .default(['localhost:9092']),
      clientId: z.string().min(1).default('scenario-manager'),
      ssl: z
        .preprocess((v) => (typeof v === 'string' ? v === 'true' : v), z.boolean())
        .default(false),
      sasl: z
        .object({
          mechanism: z.enum(['plain', 'scram-sha-256', 'scram-sha-512']).default('plain'),
          username: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
          password: z.preprocess((v) => (v === '' ? undefined : v), z.string().optional()),
        })
        .default({ mechanism: 'plain' }),
      /** Trigger topic per engine (Event Schema §4). */
      topics: z
        .object({
          emulator: z.string().min(1).default('sm.emulator.commands'),
          simulator: z.string().min(1).default('sm.simulator.commands'),
        })
        .default({ emulator: 'sm.emulator.commands', simulator: 'sm.simulator.commands' }),
    }),
    outbox: z.object({
      /** Idle poll interval when the previous batch was not full. */
      pollIntervalMs: z.coerce.number().int().positive().default(500),
      batchSize: z.coerce.number().int().positive().max(500).default(50),
      /** How long a claimed row stays invisible to other workers. Must exceed one Kafka send. */
      leaseMs: z.coerce.number().int().positive().default(60_000),
      backoffBaseMs: z.coerce.number().int().positive().default(1_000),
      backoffMaxMs: z.coerce.number().int().positive().default(60_000),
      /** 0 = retry retriable failures forever; non-retriable failures always go to `dead`. */
      maxAttempts: z.coerce.number().int().min(0).default(0),
    }),
    eventSchemaVersion: z.string().min(1).default('1.1'),
    /** Manual engine gate: engines listed here get 503 engine_unavailable on trigger. */
    engineGate: z.object({
      closed: z
        .preprocess(
          (v) => (typeof v === 'string' ? v.split(',').map((e) => e.trim()).filter(Boolean) : v),
          z.array(z.enum(['emulator', 'simulator'])),
        )
        .default([]),
    }),
    // Only config blobs under gs://<bucket>/<prefix> may be dereferenced by the GCS config reader.
    scenarioConfig: z.object({
      bucket: z.string().optional(),
      prefix: z.string().default(''),
    }),
    databaseUrl: z.string().url().optional(),
    db: z.object({
      user: z.string().optional(),
      password: z.string().optional(),
      host: z.string().default('localhost'),
      name: z.string().default('scene'),
      port: z.coerce.number().int().default(5432),
      poolMax: z.coerce.number().int().positive().default(5),
    }),
  })
  // Cross-field rule: no insecure fallbacks in production
  .superRefine((c, ctx) => {
    if (c.env !== 'production' || c.databaseUrl) return;
    for (const k of ['user', 'password'] as const) {
      if (!c.db[k]) {
        ctx.addIssue({
          code: 'custom',
          path: ['db', k],
          message: 'required in production (or provide DATABASE_URL)',
        });
      }
    }
  })
  // Derive final shape: dev-only credential defaults + computed URL
  .transform(({ databaseUrl, db, frontendOrigin, devOrigin, ...rest }) => {
    const user = db.user ?? 'scene';
    const password = db.password ?? 'scene';
    return {
      ...rest,
      // Used for both CORS and CSRF; the dev origin is ignored in production.
      allowedOrigins: [
        frontendOrigin,
        rest.env !== 'production' ? devOrigin : undefined,
      ].filter((origin): origin is string => !!origin),
      db: {
        ...db,
        user,
        password,
        url:
          databaseUrl ??
          `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
            `@${db.host}:${db.port}/${db.name}`,
      },
    };
  });

// ---------- 2. Generic builder: layers in, validated + frozen config out ----------
type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Later layers win; undefined never overwrites a value
function merge(a: Obj, b: Obj): Obj {
  const out: Obj = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === undefined) continue;
    out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

function deepFreeze<T>(o: T): T {
  if (isObj(o)) Object.values(o).forEach(deepFreeze);
  return Object.freeze(o);
}

export class ConfigBuilder<S extends z.ZodType> {
  private layers: Obj[] = [];

  constructor(private readonly schema: S) {}

  /** Add a source. Later calls override earlier ones. */
  add(layer: Obj): this {
    this.layers.push(layer);
    return this;
  }

  /** Maps env vars onto the schema's shape. Unset vars are skipped. */
  fromEnv(env: NodeJS.ProcessEnv = process.env): this {
    return this.add({
      port: env.PORT,
      env: env.NODE_ENV,
      mapApi: env.MAP_API,
      frontendOrigin: env.FRONTEND_ORIGIN,
      devOrigin: env.DEV_ORIGIN,
      bffServiceUrl: env.BFF_SERVICE_URL,
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
      },
      kafka: {
        brokers: env.KAFKA_BROKERS || undefined,
        clientId: env.KAFKA_CLIENT_ID || undefined,
        ssl: env.KAFKA_SSL || undefined,
        sasl: {
          mechanism: env.KAFKA_SASL_MECHANISM || undefined,
          // Same credentials as the status worker (KAFKA_USERNAME / KAFKA_PASSWORD).
          username: env.KAFKA_USERNAME,
          password: env.KAFKA_PASSWORD,
        },
        topics: {
          emulator: env.KAFKA_TOPIC_EMULATOR_COMMANDS || undefined,
          simulator: env.KAFKA_TOPIC_SIMULATOR_COMMANDS || undefined,
        },
      },
      outbox: {
        pollIntervalMs: env.OUTBOX_POLL_INTERVAL_MS || undefined,
        batchSize: env.OUTBOX_BATCH_SIZE || undefined,
        leaseMs: env.OUTBOX_LEASE_MS || undefined,
        backoffBaseMs: env.OUTBOX_BACKOFF_BASE_MS || undefined,
        backoffMaxMs: env.OUTBOX_BACKOFF_MAX_MS || undefined,
        maxAttempts: env.OUTBOX_MAX_ATTEMPTS || undefined,
      },
      eventSchemaVersion: env.EVENT_SCHEMA_VERSION || undefined,
      engineGate: { closed: env.ENGINE_GATE_CLOSED || undefined },
      scenarioConfig: {
        bucket: env.SCENARIO_CONFIG_BUCKET,
        prefix: env.SCENARIO_CONFIG_PREFIX,
      },
      databaseUrl: env.DATABASE_URL,
      db: {
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        host: env.DB_HOST,
        name: env.DB_NAME,
        port: env.DB_PORT,
        poolMax: env.DB_POOL_MAX,
      },
    });
  }

  /** Validates, derives, deep-freezes. Throws one readable error listing everything wrong. */
  build(): Readonly<z.output<S>> {
    const raw = this.layers.reduce<Obj>(merge, {});
    const result = this.schema.safeParse(raw);
    if (!result.success) {
      const lines = result.error.issues.map(
        (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
      );
      throw new Error(`Invalid configuration:\n${lines.join('\n')}`);
    }
    return deepFreeze(result.data);
  }
}

// ---------- 3. Usage ----------
export { schema as configSchema };
export const appConfig = new ConfigBuilder(schema).fromEnv().build();

export type AppConfig = typeof appConfig;
