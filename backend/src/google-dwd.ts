import { google } from 'googleapis';

const METADATA_SERVICE_ACCOUNT_EMAIL_URL =
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const JWT_EXPIRY_SECONDS = 3600;
const TOKEN_CACHE_REFRESH_SKEW_MS = 5 * 60 * 1000;

type DelegatedTokenCacheEntry = {
  accessToken: string;
  expiresAt: number;
};

type OAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

const delegatedAccessTokenCache = new Map<string, DelegatedTokenCacheEntry>();

const getRuntimeServiceAccountEmail = async () => {
  const configuredEmail = process.env.DWD_DELEGATED_SA?.trim();
  if (configuredEmail) {
    return configuredEmail;
  }

  let response: Response;
  try {
    response = await fetch(METADATA_SERVICE_ACCOUNT_EMAIL_URL, {
      headers: { 'Metadata-Flavor': 'Google' },
    });
  } catch (error: any) {
    throw new Error(
      `Failed to fetch default service account email from metadata server: ${error.message || error}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch default service account email from metadata server: ${response.status} ${response.statusText}`
    );
  }

  const email = (await response.text()).trim();
  if (!email) {
    throw new Error('Metadata server returned an empty default service account email');
  }

  return email;
};

const signDomainWideDelegationJwt = async (
  serviceAccountEmail: string,
  subject: string,
  scopeString: string
) => {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: serviceAccountEmail,
    sub: subject,
    scope: scopeString,
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + JWT_EXPIRY_SECONDS,
  };

  try {
    const auth = new google.auth.GoogleAuth({
      scopes: [CLOUD_PLATFORM_SCOPE],
    });
    await auth.getClient();
    const iamcredentials = google.iamcredentials('v1');
    const response = await iamcredentials.projects.serviceAccounts.signJwt({
      auth,
      name: `projects/-/serviceAccounts/${serviceAccountEmail}`,
      requestBody: {
        payload: JSON.stringify(claims),
      },
    });

    if (!response.data.signedJwt) {
      throw new Error('IAM Credentials signJwt response did not include signedJwt');
    }

    return response.data.signedJwt;
  } catch (error: any) {
    const detail =
      error.response?.data?.error?.message ||
      error.response?.data?.error_description ||
      error.message ||
      error;
    throw new Error(`Failed to sign Google Workspace domain-wide delegation JWT: ${detail}`);
  }
};

const exchangeSignedJwtForAccessToken = async (signedJwt: string): Promise<DelegatedTokenCacheEntry> => {
  let response: Response;
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt,
  });

  try {
    response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } catch (error: any) {
    throw new Error(`Failed to exchange signed JWT for Google access token: ${error.message || error}`);
  }

  const responseText = await response.text();
  let tokenResponse: OAuthTokenResponse;
  try {
    tokenResponse = JSON.parse(responseText) as OAuthTokenResponse;
  } catch (error: any) {
    throw new Error(
      `Google OAuth token exchange returned invalid JSON: ${error.message || error}`
    );
  }

  if (!response.ok) {
    const detail =
      tokenResponse.error_description ||
      tokenResponse.error ||
      `${response.status} ${response.statusText}`;
    throw new Error(`Google OAuth token exchange failed: ${detail}`);
  }

  if (!tokenResponse.access_token) {
    throw new Error('Google OAuth token exchange response did not include access_token');
  }

  return {
    accessToken: tokenResponse.access_token,
    expiresAt: Date.now() + (tokenResponse.expires_in || JWT_EXPIRY_SECONDS) * 1000,
  };
};

export const getDelegatedAccessToken = async (subject: string, scopes: string[]): Promise<string> => {
  const scopeString = scopes.join(' ');
  const cacheKey = `${subject}\n${scopeString}`;
  const cachedToken = delegatedAccessTokenCache.get(cacheKey);
  if (cachedToken && cachedToken.expiresAt - TOKEN_CACHE_REFRESH_SKEW_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  const serviceAccountEmail = await getRuntimeServiceAccountEmail();
  const signedJwt = await signDomainWideDelegationJwt(serviceAccountEmail, subject, scopeString);
  const token = await exchangeSignedJwtForAccessToken(signedJwt);
  delegatedAccessTokenCache.set(cacheKey, token);

  return token.accessToken;
};
