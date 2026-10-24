import { z } from 'zod';

const flag = z.enum(['true', 'false']).default('false').transform((v) => v === 'true');
const topic = z.string().min(1).regex(/^[a-zA-Z0-9._-]+$/);

export function readKafkaConfig(env: NodeJS.ProcessEnv = process.env) {
  const schema = z.object({
    enabled: flag,
    brokers: z.string().default('').transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean)),
    groupId: z.string().min(1).default('scenario-manager-status-worker'),
    statusTopic: topic.default('run.status'),
    resultTopic: topic.default('run.result'),
    ssl: flag,
    username: z.string().min(1).optional(),
    password: z.string().min(1).optional(),
  }).superRefine((c, ctx) => {
    if (c.enabled && !c.brokers.length) ctx.addIssue({ code: 'custom', message: 'KAFKA_BROKERS is required when the worker is enabled' });
    if (!!c.username !== !!c.password) ctx.addIssue({ code: 'custom', message: 'Kafka username and password must be supplied together' });
    if (c.username && !c.ssl) ctx.addIssue({ code: 'custom', message: 'Kafka SASL/PLAIN requires TLS' });
  });
  const result = schema.safeParse({
    enabled: env.STATUS_WORKER_ENABLED || undefined,
    brokers: env.KAFKA_BROKERS || undefined,
    groupId: env.KAFKA_GROUP_ID || undefined,
    statusTopic: env.KAFKA_STATUS_TOPIC || undefined,
    resultTopic: env.KAFKA_RESULT_TOPIC || undefined,
    ssl: env.KAFKA_SSL || undefined,
    username: env.KAFKA_USERNAME || undefined,
    password: env.KAFKA_PASSWORD || undefined,
  });
  if (!result.success) throw new Error('Invalid status worker Kafka configuration');
  return result.data;
}

export type WorkerKafkaConfig = ReturnType<typeof readKafkaConfig>;
export const WORKER_KAFKA_CONFIG = Symbol('WORKER_KAFKA_CONFIG');
