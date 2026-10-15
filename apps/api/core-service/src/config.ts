
import './load-env';
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
    runEngineUrl: optionalUrl,
    frontendOrigin: optionalUrl,
    devOrigin: optionalUrl,
    bffServiceUrl: z.string().url().default('http://localhost:3001'),
    redis: z.object({
      host: z.string().default('localhost'),
      port: z.coerce.number().int().positive().default(6379),
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
  fromEnv(source: NodeJS.ProcessEnv = process.env): this {
    // `FOO=` in a copied .env.example must behave like FOO being unset.
    const env: NodeJS.ProcessEnv = Object.fromEntries(
      Object.entries(source).filter(([, v]) => v !== ''),
    );
    return this.add({
      port: env.PORT,
      env: env.NODE_ENV,
      mapApi: env.MAP_API,
      runEngineUrl: env.RUN_ENGINE_URL,
      frontendOrigin: env.FRONTEND_ORIGIN,
      devOrigin: env.DEV_ORIGIN,
      bffServiceUrl: env.BFF_SERVICE_URL,
      redis: {
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
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
export const appConfig = new ConfigBuilder(schema).fromEnv().build();

/** Returns a configured URL or fails with a clear message when it is unset. */
export function requireConfig(value: string | undefined, envVar: string): string {
  if (!value) throw new Error(`${envVar} is not configured`);
  return value;
}

export type AppConfig = typeof appConfig;
