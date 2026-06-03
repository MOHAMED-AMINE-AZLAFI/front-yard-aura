import fs from 'node:fs';
import path from 'node:path';

const API_BASE_URL = 'https://api.pinterest.com/v5';
const PAGE_SIZE = 100;
const BOARD_MAP_FILE = path.resolve('data', 'pinterest', 'pinterest-boards.json');

const BOARDS = [
  {
    slug: 'small-front-yard-landscaping-ideas',
    name: 'Small Front Yard Landscaping Ideas',
    description:
      'Smart small front yard landscaping ideas for compact spaces, including entry gardens, narrow beds, simple paths, and curb appeal inspiration for real homes.'
  },
  {
    slug: 'modern-front-yard-landscaping',
    name: 'Modern Front Yard Landscaping',
    description:
      'Clean modern front yard landscaping ideas with structured planting, crisp walkways, low-profile greenery, and polished curb appeal for contemporary homes.'
  },
  {
    slug: 'front-yard-landscaping-on-a-budget',
    name: 'Front Yard Landscaping On A Budget',
    description:
      'Budget-friendly front yard landscaping ideas with affordable plants, simple edging, mulch, gravel, and curb appeal upgrades that look thoughtful and polished.'
  },
  {
    slug: 'front-yard-flower-bed-ideas',
    name: 'Front Yard Flower Bed Ideas',
    description:
      'Front yard flower bed ideas for colorful borders, foundation planting, seasonal blooms, layered garden beds, and welcoming curb appeal around the entry.'
  },
  {
    slug: 'front-yard-landscaping-with-rocks',
    name: 'Front Yard Landscaping With Rocks',
    description:
      'Front yard landscaping with rocks, gravel, boulders, stone edging, and drought-tolerant planting ideas for beautiful texture and low-maintenance curb appeal.'
  },
  {
    slug: 'low-maintenance-front-yard-landscaping',
    name: 'Low Maintenance Front Yard Landscaping',
    description:
      'Low maintenance front yard landscaping ideas with easy-care plants, clean layouts, mulch, rock, and practical curb appeal designs for busy homeowners.'
  },
  {
    slug: 'walkway-landscaping-ideas',
    name: 'Walkway Landscaping Ideas',
    description:
      'Walkway landscaping ideas for front paths, entry borders, stepping stones, lighting, planting combinations, and inviting curb appeal from sidewalk to door.'
  },
  {
    slug: 'curb-appeal-landscaping-ideas',
    name: 'Curb Appeal Landscaping Ideas',
    description:
      'Curb appeal landscaping ideas for front yards, foundation beds, entry paths, porch views, and polished exterior inspiration that makes a home feel welcoming.'
  }
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

function parseArgs(argv = process.argv.slice(2)) {
  return {
    create: argv.includes('--create')
  };
}

function requireAccessToken() {
  const token = String(process.env.PINTEREST_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('PINTEREST_ACCESS_TOKEN is missing in .env.');
  }
  return token;
}

function normalizeName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function pinterestRequest(token, endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
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
    throw new Error('Pinterest Access Token is invalid or does not have permission to manage boards.');
  }

  if (!response.ok) {
    const message = data?.message || data?.code || `HTTP ${response.status}`;
    throw new Error(`Pinterest API request failed: ${message}`);
  }

  return data;
}

async function listBoards(token) {
  const boards = [];
  let bookmark = null;

  do {
    const params = new URLSearchParams({ page_size: String(PAGE_SIZE) });
    if (bookmark) params.set('bookmark', bookmark);

    const data = await pinterestRequest(token, `/boards?${params}`);
    if (Array.isArray(data.items)) boards.push(...data.items);
    bookmark = data.bookmark || null;
  } while (bookmark);

  return boards;
}

async function createBoard(token, board) {
  return pinterestRequest(token, '/boards', {
    method: 'POST',
    body: JSON.stringify({
      name: board.name,
      description: board.description,
      privacy: 'PUBLIC'
    })
  });
}

function boardRow(board, id = '', privacy = 'PUBLIC') {
  return {
    'Board Name': board.name,
    'Board ID': id,
    'Board Privacy': privacy || 'PUBLIC'
  };
}

function writeBoardMap(results) {
  const boardMap = Object.fromEntries(results.map((result) => [result.slug, result.id]));
  fs.mkdirSync(path.dirname(BOARD_MAP_FILE), { recursive: true });
  fs.writeFileSync(BOARD_MAP_FILE, `${JSON.stringify(boardMap, null, 2)}\n`, 'utf8');
}

async function main() {
  const args = parseArgs();
  const dryRun = !args.create;

  loadEnvFile(path.resolve('.env'));
  const token = requireAccessToken();
  const existingBoards = await listBoards(token);
  const existingByName = new Map(existingBoards.map((board) => [normalizeName(board.name), board]));
  const results = [];

  for (const targetBoard of BOARDS) {
    const existingBoard = existingByName.get(normalizeName(targetBoard.name));

    if (existingBoard) {
      results.push({
        ...targetBoard,
        id: existingBoard.id || '',
        privacy: existingBoard.privacy || 'PUBLIC'
      });
      continue;
    }

    if (dryRun) {
      results.push({
        ...targetBoard,
        id: '(dry-run: not created)',
        privacy: 'PUBLIC'
      });
      continue;
    }

    const createdBoard = await createBoard(token, targetBoard);
    results.push({
      ...targetBoard,
      id: createdBoard.id || '',
      privacy: createdBoard.privacy || 'PUBLIC'
    });
  }

  console.table(results.map((result) => boardRow(result, result.id, result.privacy)));

  if (dryRun) {
    console.log('Dry-run only. No boards created and pinterest-boards.json was not changed.');
    return;
  }

  const missingIds = results.filter((result) => !result.id);
  if (missingIds.length) {
    throw new Error(`Cannot write board map because board id is missing for: ${missingIds.map((board) => board.name).join(', ')}`);
  }

  writeBoardMap(results);
  console.log(`Updated ${path.relative(process.cwd(), BOARD_MAP_FILE)}.`);
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
