import {
  getOAuthApiKey,
  loginOpenAICodexDeviceCode,
  type OAuthCredentials,
} from '@earendil-works/pi-ai/oauth';

const OPENAI_CODEX = 'openai-codex';
const CREDENTIALS_PATH = '.oauth-credentials.json';

let credentials: Record<string, OAuthCredentials> = {};

function isCredential(value: unknown): value is OAuthCredentials {
  return (
    typeof value === 'object' &&
    value !== null &&
    'refresh' in value &&
    typeof value.refresh === 'string' &&
    'access' in value &&
    typeof value.access === 'string' &&
    'expires' in value &&
    typeof value.expires === 'number'
  );
}

function isCredentialMap(
  value: unknown
): value is Record<string, OAuthCredentials> {
  if (typeof value !== 'object' || value === null) return false;
  return Object.values(value).every(isCredential);
}

async function loadCredentials(): Promise<Record<string, OAuthCredentials>> {
  const file = Bun.file(CREDENTIALS_PATH);
  if (!(await file.exists())) return {};
  const parsed: unknown = await file.json();
  if (!isCredentialMap(parsed)) {
    throw new Error(`${CREDENTIALS_PATH} exists but is not a credential map`);
  }
  return parsed;
}

async function saveCredentials(): Promise<void> {
  await Bun.write(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
}

/**
 * Load persisted credentials and, if none exist for Codex, run the interactive
 * device-code login. Call once at startup before the agent makes any request so
 * the login happens up front rather than surprising us mid-conversation.
 */
export async function initAuth(): Promise<void> {
  credentials = await loadCredentials();
  if (credentials[OPENAI_CODEX]) return;

  credentials[OPENAI_CODEX] = await loginOpenAICodexDeviceCode({
    onDeviceCode: (info) => {
      console.log(
        `Open ${info.verificationUri} and enter code ${info.userCode}`
      );
    },
  });
  await saveCredentials();
}

/** Agent `getApiKey` hook: mints a fresh token, persisting any rotation. */
export async function getFreshOauth(
  provider: string
): Promise<string | undefined> {
  if (provider !== OPENAI_CODEX) return undefined;
  const result = await getOAuthApiKey(provider, credentials);
  if (!result) return undefined;
  credentials[provider] = result.newCredentials;
  await saveCredentials();
  return result.apiKey;
}
