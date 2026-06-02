import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR,
  formatDuration,
  parseArgs,
  readCsv,
  writeCsv,
  writeText
} from './pinterest-utils.mjs';

const SCHEDULE_COLUMNS = [
  'schedule_id',
  'pin_id',
  'article_slug',
  'category_slug',
  'board_slug',
  'pin_variant',
  'scheduled_date',
  'scheduled_time',
  'time_zone',
  'scheduled_at_utc',
  'week_index',
  'day_index',
  'daily_slot',
  'status',
  'published_at_utc',
  'pinterest_pin_id',
  'error'
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadBoardMap(file, dryRun) {
  if (process.env.PINTEREST_BOARD_MAP_JSON) {
    return JSON.parse(process.env.PINTEREST_BOARD_MAP_JSON);
  }

  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  if (dryRun) return {};

  throw new Error(
    `Missing Pinterest board map. Create ${path.relative(process.cwd(), file)} or set PINTEREST_BOARD_MAP_JSON.`
  );
}

function boardIdFor(boardMap, boardSlug, dryRun) {
  const value = boardMap[boardSlug];
  if (typeof value === 'string') return value;
  if (value?.id) return value.id;
  if (dryRun) return `dry-run-board-id:${boardSlug}`;
  throw new Error(`Missing board id for board_slug "${boardSlug}".`);
}

function dueRows(schedule, { all, now }) {
  return schedule.filter((row) => {
    const status = row.status || 'pending';
    if (status !== 'pending') return false;
    if (all) return true;
    return Date.parse(row.scheduled_at_utc) <= now.getTime();
  });
}

function validateNoWeeklyRepeats(rows) {
  const seen = new Set();
  const duplicates = [];
  for (const row of rows) {
    const key = `${row.week_index}:${row.article_slug}`;
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }
  return duplicates;
}

function payloadFor(pin, boardId) {
  if (!pin.image_url || !/^https:\/\//i.test(pin.image_url)) {
    throw new Error(`${pin.pin_id} is missing a public HTTPS image_url.`);
  }

  return {
    board_id: boardId,
    title: pin.pin_title,
    description: pin.pin_description,
    link: pin.destination_url,
    alt_text: pin.alt_text,
    media_source: {
      source_type: 'image_url',
      url: pin.image_url,
      is_standard: true
    }
  };
}

async function createPin({ endpoint, token, payload }) {
  const response = await fetch(`${endpoint}/pins`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body?.message || body?.code || text || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

const startedAt = Date.now();
const args = parseArgs();
const dryRun = args.publish ? false : true;
const inputPins = path.resolve(args.pins ?? path.join(DATA_DIR, 'pinterest-pins.csv'));
const inputSchedule = path.resolve(args.schedule ?? path.join(DATA_DIR, 'pinterest-schedule.csv'));
const boardMapFile = path.resolve(args.boardMap ?? path.join(DATA_DIR, 'pinterest-boards.json'));
const limit = args.limit ? Number(args.limit) : Number.POSITIVE_INFINITY;
const all = Boolean(args.all);
const sandbox = Boolean(args.sandbox) || process.env.PINTEREST_ENV === 'sandbox';
const endpoint = sandbox ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';
const delayMs = Number(process.env.PINTEREST_PUBLISH_DELAY_MS ?? 15000);

const pins = readCsv(inputPins);
const schedule = readCsv(inputSchedule);
const pinsById = new Map(pins.map((pin) => [pin.pin_id, pin]));
const boardMap = loadBoardMap(boardMapFile, dryRun);
const candidates = dueRows(schedule, { all, now: new Date() }).slice(0, limit);
const weeklyRepeats = validateNoWeeklyRepeats(schedule);

if (weeklyRepeats.length) {
  throw new Error(`Schedule violates weekly article repeat rule: ${weeklyRepeats.slice(0, 5).join(', ')}`);
}

if (!dryRun && !process.env.PINTEREST_ACCESS_TOKEN) {
  throw new Error('PINTEREST_ACCESS_TOKEN is required for --publish.');
}

const results = [];

for (const [index, row] of candidates.entries()) {
  const pin = pinsById.get(row.pin_id);
  if (!pin) {
    row.status = 'error';
    row.error = `Missing pin metadata for ${row.pin_id}.`;
    results.push({ pin_id: row.pin_id, ok: false, error: row.error });
    continue;
  }

  try {
    const boardId = boardIdFor(boardMap, row.board_slug, dryRun);
    const payload = payloadFor(pin, boardId);

    if (dryRun) {
      results.push({
        pin_id: row.pin_id,
        ok: true,
        dryRun: true,
        endpoint,
        payload
      });
      continue;
    }

    const response = await createPin({
      endpoint,
      token: process.env.PINTEREST_ACCESS_TOKEN,
      payload
    });

    row.status = 'published';
    row.published_at_utc = new Date().toISOString();
    row.pinterest_pin_id = response.id ?? '';
    row.error = '';
    results.push({ pin_id: row.pin_id, ok: true, pinterest_pin_id: row.pinterest_pin_id });

    if (index < candidates.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  } catch (error) {
    row.status = 'error';
    row.error = error.message;
    results.push({ pin_id: row.pin_id, ok: false, error: error.message });
  }
}

if (!dryRun) {
  writeCsv(inputSchedule, schedule, SCHEDULE_COLUMNS);
}

const report = {
  dryRun,
  sandbox,
  endpoint,
  candidates: candidates.length,
  published: results.filter((result) => result.ok && !result.dryRun).length,
  previewed: results.filter((result) => result.ok && result.dryRun).length,
  errors: results.filter((result) => !result.ok).length,
  runtime: formatDuration(Date.now() - startedAt),
  results: results.slice(0, 20)
};

writeText(
  path.join(DATA_DIR, dryRun ? 'pinterest-api-dry-run-report.json' : 'pinterest-api-publish-report.json'),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(JSON.stringify(report, null, 2));

if (report.errors) process.exit(1);
