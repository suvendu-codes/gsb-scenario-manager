import { createGcpOAuthBearerProvider } from "./gcp-oauth-bearer.util";

export interface KafkaClientConfig {
  brokers: string[];
  ssl?: boolean;
  sasl?:
    | {
        mechanism: "oauthbearer";
        oauthBearerProvider: () => Promise<{ value: string }>;
      }
    | {
        mechanism: "plain";
        username: string;
        password: string;
      };
}

function isGcpManagedKafka(brokers: string[]): boolean {
  return brokers.some((broker) => broker.includes(".managedkafka."));
}

function parseBrokers(raw: string): string[] {
  return raw
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);
}

function resolveSsl(brokers: string[]): boolean {
  const explicit = process.env.KAFKA_SSL?.toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return isGcpManagedKafka(brokers);
}

function resolveSaslMechanism(
  brokers: string[],
): "oauthbearer" | "plain" | "none" {
  const configured = process.env.KAFKA_SASL_MECHANISM?.toLowerCase();
  if (configured === "none") return "none";
  if (configured === "plain") return "plain";
  if (configured === "oauthbearer") return "oauthbearer";
  return resolveSsl(brokers) ? "oauthbearer" : "none";
}

/** Build kafkajs client options from env. Returns null when Kafka is disabled. */
export function buildKafkaClientOptions(): KafkaClientConfig | null {
  const rawBrokers = process.env.KAFKA_BROKERS?.trim();
  if (!rawBrokers) return null;

  const brokers = parseBrokers(rawBrokers);
  const ssl = resolveSsl(brokers);
  const mechanism = resolveSaslMechanism(brokers);
  const options: KafkaClientConfig = { brokers, ssl };

  if (mechanism === "oauthbearer") {
    options.sasl = {
      mechanism: "oauthbearer",
      oauthBearerProvider: createGcpOAuthBearerProvider(),
    };
    return options;
  }

  if (mechanism === "plain") {
    const username =
      process.env.KAFKA_SASL_USERNAME ??
      process.env.GOOGLE_CLOUD_CLIENT_EMAIL ??
      "";
    const password =
      process.env.KAFKA_SASL_PASSWORD ??
      process.env.GOOGLE_ACCESS_TOKEN ??
      "";
    if (!username || !password) {
      throw new Error(
        "KAFKA_SASL_MECHANISM=plain requires KAFKA_SASL_USERNAME and KAFKA_SASL_PASSWORD (or GOOGLE_CLOUD_CLIENT_EMAIL and GOOGLE_ACCESS_TOKEN)",
      );
    }
    options.sasl = { mechanism: "plain", username, password };
  }

  return options;
}
