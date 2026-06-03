import fs from 'node:fs';
import path from 'node:path';

const TOKEN_ENDPOINT = 'https://api.pinterest.com/v5/oauth/token';
const REQUIRED_ENV = [
  'PINTEREST_CLIENT_ID',
  'PINTEREST_CLIENT_SECRET',
  'PINTEREST_REDIRECT_URI',
  'PINTEREST_AUTH_CODE'
];

function stripEnvQuotes(value) {
  const trimmed = String(value ?? '').trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false;

  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const cleanLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
    const equalsIndex = cleanLine.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = cleanLine.slice(0, equalsIndex).trim();
    const value = stripEnvQuotes(cleanLine.slice(equalsIndex + 1));
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;
    process.env[key] = value;
  }

  return true;
}

function requireEnv() {
  const missing = REQUIRED_ENV.filter((key) => !String(process.env[key] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required .env value(s): ${missing.join(', ')}`);
  }

  return {
    clientId: process.env.PINTEREST_CLIENT_ID.trim(),
    clientSecret: process.env.PINTEREST_CLIENT_SECRET.trim(),
    redirectUri: process.env.PINTEREST_REDIRECT_URI.trim(),
    authCode: process.env.PINTEREST_AUTH_CODE.trim()
  };
}

async function exchangeToken({ clientId, clientSecret, redirectUri, authCode }) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: redirectUri
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.error || `HTTP ${response.status}`;
    throw new Error(`Pinterest OAuth token exchange failed: ${message}`);
  }

  return data;
}

function printTokenResponse(data) {
  const output = {
    access_token: data.access_token,
    expires_in: data.expires_in
  };

  if (data.refresh_token) {
    output.refresh_token = data.refresh_token;
  }

  console.log(JSON.stringify(output, null, 2));
}

try {
  loadEnvFile(path.resolve('.env'));
  const env = requireEnv();
  const tokenResponse = await exchangeToken(env);
  printTokenResponse(tokenResponse);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
