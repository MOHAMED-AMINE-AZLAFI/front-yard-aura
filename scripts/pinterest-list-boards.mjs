import fs from 'node:fs';
import path from 'node:path';

const API_BASE_URL = 'https://api.pinterest.com/v5';
const PAGE_SIZE = 100;

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
  if (!fs.existsSync(file)) return;

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
}

function requireAccessToken() {
  const token = String(process.env.PINTEREST_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('PINTEREST_ACCESS_TOKEN is missing in .env.');
  }
  return token;
}

async function requestBoardsPage(token, bookmark) {
  const url = new URL(`${API_BASE_URL}/boards`);
  url.searchParams.set('page_size', String(PAGE_SIZE));
  if (bookmark) url.searchParams.set('bookmark', bookmark);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error('Pinterest Access Token is invalid or does not have permission to read boards.');
  }

  if (!response.ok) {
    const message = data?.message || data?.code || `HTTP ${response.status}`;
    throw new Error(`Pinterest boards request failed: ${message}`);
  }

  return data;
}

async function listBoards(token) {
  const boards = [];
  let bookmark = null;

  do {
    const data = await requestBoardsPage(token, bookmark);
    if (Array.isArray(data.items)) boards.push(...data.items);
    bookmark = data.bookmark || null;
  } while (bookmark);

  return boards;
}

function printBoards(boards) {
  if (!boards.length) {
    console.log('No boards found.');
    return;
  }

  const rows = boards.map((board) => ({
    'Board Name': board.name || '',
    'Board ID': board.id || '',
    'Board Privacy': board.privacy || ''
  }));

  console.table(rows);
}

try {
  loadEnvFile(path.resolve('.env'));
  const token = requireAccessToken();
  const boards = await listBoards(token);
  printBoards(boards);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
