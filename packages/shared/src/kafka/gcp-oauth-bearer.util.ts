import { GoogleAuth } from "google-auth-library";

const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function base64Encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function tokenHeader(): string {
  return base64Encode(JSON.stringify({ typ: "JWT", alg: "GOOG_OAUTH2_TOKEN" }));
}

function tokenBody(exp: number, email: string): string {
  return base64Encode(
    JSON.stringify({ exp, iss: email, sub: email, email }),
  );
}

const auth = new GoogleAuth({ scopes: [CLOUD_PLATFORM_SCOPE] });

/** GCP Managed Kafka expects a composite OAUTHBEARER token, not a raw access token. */
export async function fetchGcpKafkaAccessToken(): Promise<string> {
  const authClient = await auth.getClient();
  const { token: accessToken } = await authClient.getAccessToken();
  if (!accessToken) {
    throw new Error("Failed to obtain Google access token for Kafka SASL");
  }

  const { client_email: clientEmail } = await auth.getCredentials();
  if (!clientEmail) {
    throw new Error(
      "No service account email in Application Default Credentials",
    );
  }

  const expiryDate = authClient.credentials.expiry_date;
  const exp = Math.floor(
    (expiryDate ? new Date(expiryDate).getTime() : Date.now() + 3_600_000) /
      1000,
  );

  return [tokenHeader(), tokenBody(exp, clientEmail), base64Encode(accessToken)].join(
    ".",
  );
}

export function createGcpOAuthBearerProvider(): () => Promise<{ value: string }> {
  return async () => ({ value: await fetchGcpKafkaAccessToken() });
}
