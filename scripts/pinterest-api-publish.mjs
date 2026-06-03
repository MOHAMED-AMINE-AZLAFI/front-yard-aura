import fs from 'node:fs';
import path from 'node:path';
import {
  DATA_DIR,
  PUBLIC_PINS_DIR,
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

const HISTORY_FILE = path.join(DATA_DIR, 'published-history.json');
const DEFAULT_DELAY_MS = 15000;
const DEFAULT_TIME_ZONE = 'America/New_York';

function log(message) {
  console.log(`[pinterest-api] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function parseJsonFile(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function isPlaceholderBoardId(value) {
  return /^PUT_/.test(value) || /_HERE$/.test(value) || /^dry-run-board-id:/.test(value);
}

function boardIdFor(boardMap, boardSlug, dryRun) {
  const value = boardMap[boardSlug];
  const boardId = typeof value === 'string' ? value : value?.id;

  if (typeof boardId === 'string' && boardId.trim() && !isPlaceholderBoardId(boardId.trim())) {
    return { boardId: boardId.trim(), configured: true };
  }

  if (dryRun) {
    return { boardId: `dry-run-board-id:${boardSlug}`, configured: false };
  }

  throw new Error(`Missing real board_id for board_slug "${boardSlug}".`);
}

function emptyHistory() {
  return {
    version: 1,
    updated_at_utc: null,
    published: []
  };
}

function normalizeHistory(rawHistory) {
  if (Array.isArray(rawHistory)) {
    return {
      version: 1,
      updated_at_utc: null,
      published: rawHistory
    };
  }

  if (rawHistory && Array.isArray(rawHistory.published)) {
    return {
      version: Number(rawHistory.version || 1),
      updated_at_utc: rawHistory.updated_at_utc || null,
      published: rawHistory.published
    };
  }

  return emptyHistory();
}

function loadHistory(file) {
  return normalizeHistory(parseJsonFile(file, emptyHistory()));
}

function writeHistory(file, history) {
  const cleanHistory = normalizeHistory(history);
  cleanHistory.updated_at_utc = new Date().toISOString();
  writeText(file, `${JSON.stringify(cleanHistory, null, 2)}\n`);
}

function findPublishedRecord(history, row) {
  return history.published.find(
    (record) => record.pin_id === row.pin_id || record.schedule_id === row.schedule_id
  );
}

function dateStringInTimeZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validateDateString(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new Error(`${label} must be YYYY-MM-DD.`);
  }
  return String(value);
}

function scheduledDateForRow(row, now, overrideDate) {
  if (overrideDate) return overrideDate;
  return dateStringInTimeZone(now, row.time_zone || process.env.PINTEREST_SCHEDULE_TIME_ZONE || DEFAULT_TIME_ZONE);
}

function scheduledTodayRows(schedule, { now, overrideDate }) {
  return schedule.filter((row) => row.scheduled_date === scheduledDateForRow(row, now, overrideDate));
}

function pendingRows(rows) {
  return rows.filter((row) => (row.status || 'pending') === 'pending');
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

function parseNonNegativeInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return parsed;
}

function requirePinField(pin, field, label = field) {
  const value = String(pin[field] || '').trim();
  if (!value) throw new Error(`${pin.pin_id} is missing ${label}.`);
  return value;
}

function requireApprovedQuality(pin) {
  const status = String(pin.quality_status || '').trim();
  const reasons = String(pin.quality_rejection_reasons || '').trim();
  if (status !== 'approved' || reasons) {
    throw new Error(
      `${pin.pin_id} is not approved by the strict image quality filter ` +
        `(quality_status=${status || 'missing'}${reasons ? `, reasons=${reasons}` : ''}).`
    );
  }
}

function localImagePathFor(pin) {
  const imageFile = String(pin.image_file || '').trim();
  if (!imageFile) return null;
  const cleanFile = imageFile.replace(/^\/?pins[\\/]/, '');
  return path.join(PUBLIC_PINS_DIR, cleanFile);
}

function contentTypeForImage(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  throw new Error(`Unsupported image type for ${path.relative(process.cwd(), file)}.`);
}

function payloadFor(pin, boardId, { includeBase64Data }) {
  requireApprovedQuality(pin);

  const title = requirePinField(pin, 'pin_title', 'title');
  const description = requirePinField(pin, 'pin_description', 'description');
  const link = requirePinField(pin, 'destination_url', 'link');
  const altText = requirePinField(pin, 'alt_text', 'alt_text');
  const localImagePath = localImagePathFor(pin);
  const imageUrl = String(pin.image_url || '').trim();

  if (localImagePath && !fs.existsSync(localImagePath)) {
    throw new Error(`${pin.pin_id} image_file does not exist: ${path.relative(process.cwd(), localImagePath)}.`);
  }

  const payload = {
    board_id: boardId,
    title,
    description,
    link,
    alt_text: altText
  };

  if (imageUrl) {
    if (!/^https:\/\//i.test(imageUrl)) {
      throw new Error(`${pin.pin_id} image_url must be public HTTPS.`);
    }

    payload.media_source = {
      source_type: 'image_url',
      url: imageUrl,
      is_standard: true
    };

    return {
      payload,
      image: {
        source_type: 'image_url',
        image_url: imageUrl,
        image_file: pin.image_file || ''
      }
    };
  }

  if (!localImagePath) {
    throw new Error(`${pin.pin_id} needs image_url or image_file.`);
  }

  payload.media_source = {
    source_type: 'image_base64',
    content_type: contentTypeForImage(localImagePath),
    data: includeBase64Data ? fs.readFileSync(localImagePath).toString('base64') : '[base64 omitted in dry-run]',
    is_standard: true
  };

  return {
    payload,
    image: {
      source_type: 'image_base64',
      image_file: pin.image_file || '',
      local_path: path.relative(process.cwd(), localImagePath)
    }
  };
}

function redactPayload(payload) {
  if (payload.media_source?.source_type !== 'image_base64') return payload;
  return {
    ...payload,
    media_source: {
      ...payload.media_source,
      data: '[base64 omitted]'
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
    const retryAfter = response.headers.get('retry-after');
    const message = body?.message || body?.code || text || `HTTP ${response.status}`;
    const error = new Error(retryAfter ? `${message} (retry-after: ${retryAfter})` : message);
    error.status = response.status;
    error.retryAfter = retryAfter;
    throw error;
  }

  return body;
}

const startedAt = Date.now();
const args = parseArgs();

if (args.publish && args.dryRun) {
  throw new Error('Use either --dry-run or --publish, not both.');
}

const dryRun = !args.publish;
const envFile = path.resolve(args.env ?? '.env');
const envLoaded = loadEnvFile(envFile);
const inputPins = path.resolve(args.pins ?? path.join(DATA_DIR, 'pinterest-pins.csv'));
const inputSchedule = path.resolve(args.schedule ?? path.join(DATA_DIR, 'pinterest-schedule.csv'));
const boardMapFile = path.resolve(args.boardMap ?? path.join(DATA_DIR, 'pinterest-boards.json'));
const historyFile = path.resolve(args.history ?? HISTORY_FILE);
const limit = args.limit === undefined ? null : parseNonNegativeInteger(args.limit, '--limit');
const delayMs = parseNonNegativeInteger(args.delayMs ?? process.env.PINTEREST_PUBLISH_DELAY_MS ?? DEFAULT_DELAY_MS, 'delay');
const now = new Date();
const overrideDate = args.date ? validateDateString(args.date, '--date') : null;
const sandbox = Boolean(args.sandbox) || process.env.PINTEREST_ENV === 'sandbox';
const endpoint = sandbox ? 'https://api-sandbox.pinterest.com/v5' : 'https://api.pinterest.com/v5';

log(`Mode: ${dryRun ? 'dry-run (no Pinterest writes)' : 'publish'}.`);
log(`Endpoint: ${endpoint}.`);
if (envLoaded) log(`Loaded environment variables from ${path.relative(process.cwd(), envFile)}.`);

const pins = readCsv(inputPins);
const schedule = readCsv(inputSchedule);
const history = loadHistory(historyFile);
const pinsById = new Map(pins.map((pin) => [pin.pin_id, pin]));
const boardMap = loadBoardMap(boardMapFile, dryRun);
const weeklyRepeats = validateNoWeeklyRepeats(schedule);

if (weeklyRepeats.length) {
  throw new Error(`Schedule violates weekly article repeat rule: ${weeklyRepeats.slice(0, 5).join(', ')}`);
}

const todayRows = scheduledTodayRows(schedule, { now, overrideDate });
const todayPendingRows = pendingRows(todayRows);
const dailyCap = todayPendingRows.length;
const candidateLimit = limit === null ? dailyCap : Math.min(limit, dailyCap);
const candidates = todayPendingRows.slice(0, candidateLimit);
const todayLabel =
  overrideDate ||
  [...new Set(todayRows.map((row) => row.scheduled_date))].join(', ') ||
  dateStringInTimeZone(now, process.env.PINTEREST_SCHEDULE_TIME_ZONE || DEFAULT_TIME_ZONE);

log(`Today's schedule date: ${todayLabel}.`);
log(`Scheduled today: ${todayRows.length}; pending today: ${todayPendingRows.length}; selected: ${candidates.length}.`);
log(`Daily cap for this run: ${dailyCap} pin(s).`);

if (!dryRun && !process.env.PINTEREST_ACCESS_TOKEN) {
  throw new Error('PINTEREST_ACCESS_TOKEN is required for --publish.');
}

const results = [];
let publishedCount = 0;
let previewedCount = 0;

for (const [index, row] of candidates.entries()) {
  const pin = pinsById.get(row.pin_id);
  const label = `${index + 1}/${candidates.length} ${row.pin_id}`;
  const existingRecord = findPublishedRecord(history, row);

  if (existingRecord) {
    const pinterestPinId = existingRecord.pinterest_pin_id || '';
    log(`Skip ${label}: already in published history${pinterestPinId ? ` as ${pinterestPinId}` : ''}.`);
    results.push({
      pin_id: row.pin_id,
      schedule_id: row.schedule_id,
      ok: true,
      skipped: true,
      reason: 'already_published_history',
      pinterest_pin_id: pinterestPinId
    });

    if (!dryRun) {
      row.status = 'published';
      row.published_at_utc = existingRecord.published_at_utc || row.published_at_utc || '';
      row.pinterest_pin_id = pinterestPinId;
      row.error = '';
    }

    continue;
  }

  if (!pin) {
    const error = `Missing pin metadata for ${row.pin_id}.`;
    log(`Error ${label}: ${error}`);
    if (!dryRun) {
      row.status = 'error';
      row.error = error;
    }
    results.push({ pin_id: row.pin_id, schedule_id: row.schedule_id, ok: false, error });
    continue;
  }

  try {
    const { boardId, configured } = boardIdFor(boardMap, row.board_slug, dryRun);
    const { payload, image } = payloadFor(pin, boardId, { includeBase64Data: !dryRun });

    if (dryRun) {
      previewedCount += 1;
      log(
        `Dry-run ${label}: board=${row.board_slug} board_id=${boardId} image=${image.source_type} ` +
          `title="${payload.title}"`
      );
      results.push({
        pin_id: row.pin_id,
        schedule_id: row.schedule_id,
        ok: true,
        dryRun: true,
        endpoint,
        board_slug: row.board_slug,
        board_id: boardId,
        board_configured: configured,
        image,
        payload: redactPayload(payload)
      });
      continue;
    }

    log(`Publishing ${label}: board=${row.board_slug} board_id=${boardId} image=${image.source_type}.`);
    const response = await createPin({
      endpoint,
      token: process.env.PINTEREST_ACCESS_TOKEN,
      payload
    });

    const publishedAt = new Date().toISOString();
    const pinterestPinId = response.id ?? '';

    row.status = 'published';
    row.published_at_utc = publishedAt;
    row.pinterest_pin_id = pinterestPinId;
    row.error = '';
    history.published.push({
      schedule_id: row.schedule_id,
      pin_id: row.pin_id,
      article_slug: row.article_slug,
      board_slug: row.board_slug,
      board_id: boardId,
      pin_variant: row.pin_variant,
      scheduled_date: row.scheduled_date,
      scheduled_at_utc: row.scheduled_at_utc,
      published_at_utc: publishedAt,
      pinterest_pin_id: pinterestPinId,
      title: payload.title,
      link: payload.link,
      image_url: pin.image_url || '',
      image_file: pin.image_file || ''
    });

    publishedCount += 1;
    log(`Published ${label}: pinterest_pin_id=${pinterestPinId || 'unknown'}.`);
    results.push({
      pin_id: row.pin_id,
      schedule_id: row.schedule_id,
      ok: true,
      pinterest_pin_id: pinterestPinId,
      board_id: boardId
    });
  } catch (error) {
    log(`Error ${label}: ${error.message}`);
    if (!dryRun) {
      row.status = 'error';
      row.error = error.message;
    }
    results.push({
      pin_id: row.pin_id,
      schedule_id: row.schedule_id,
      ok: false,
      status: error.status || null,
      retry_after: error.retryAfter || null,
      error: error.message
    });
  }

  if (!dryRun && index < candidates.length - 1 && delayMs > 0) {
    log(`Waiting ${delayMs}ms before the next pin.`);
    await sleep(delayMs);
  }
}

if (!dryRun) {
  writeCsv(inputSchedule, schedule, SCHEDULE_COLUMNS);
  writeHistory(historyFile, history);
}

const report = {
  dryRun,
  sandbox,
  endpoint,
  envLoaded,
  schedule_date: todayLabel,
  scheduled_today: todayRows.length,
  pending_today: todayPendingRows.length,
  daily_cap: dailyCap,
  selected: candidates.length,
  published: publishedCount,
  previewed: previewedCount,
  skipped: results.filter((result) => result.skipped).length,
  errors: results.filter((result) => !result.ok).length,
  delay_ms: delayMs,
  history_file: path.relative(process.cwd(), historyFile),
  runtime: formatDuration(Date.now() - startedAt),
  results: results.slice(0, 20)
};

writeText(
  path.join(DATA_DIR, dryRun ? 'pinterest-api-dry-run-report.json' : 'pinterest-api-publish-report.json'),
  `${JSON.stringify(report, null, 2)}\n`
);

log(`Finished: ${JSON.stringify({
  dryRun: report.dryRun,
  selected: report.selected,
  previewed: report.previewed,
  published: report.published,
  skipped: report.skipped,
  errors: report.errors,
  runtime: report.runtime
})}`);

if (report.errors) process.exit(1);
