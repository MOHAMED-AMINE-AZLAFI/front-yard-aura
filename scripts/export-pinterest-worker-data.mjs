import path from 'node:path';
import { DATA_DIR, ROOT_DIR, parseArgs, readCsv, readText, writeText } from './pinterest-utils.mjs';

const DEFAULT_PINS_FILE = path.join(DATA_DIR, 'pinterest-pins.csv');
const DEFAULT_SCHEDULE_FILE = path.join(DATA_DIR, 'pinterest-schedule.csv');
const DEFAULT_BOARDS_FILE = path.join(DATA_DIR, 'pinterest-boards.json');
const DEFAULT_OUTPUT_FILE = path.join(ROOT_DIR, 'workers', 'pinterest-publisher', 'src', 'pins-data.json');

const PIN_FIELDS = [
  'pin_id',
  'article_slug',
  'article_title',
  'category_slug',
  'board_slug',
  'pin_variant',
  'pin_title',
  'pin_description',
  'alt_text',
  'destination_url',
  'image_url',
  'image_file',
  'quality_status',
  'quality_rejection_reasons',
  'quality_rule_key',
  'quality_rule_label',
  'quality_score',
  'quality_source_id',
  'quality_source_key',
  'quality_source_type',
  'quality_source_url'
];

const SCHEDULE_FIELDS = [
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
  'status'
];

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, clean(row[field])]));
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function normalizeBoards(rawBoards) {
  return Object.fromEntries(
    Object.entries(rawBoards)
      .map(([slug, value]) => {
        const boardId = typeof value === 'string' ? value : value?.id;
        return [clean(slug), clean(boardId)];
      })
      .filter(([slug, boardId]) => slug && boardId)
      .sort(([a], [b]) => a.localeCompare(b))
  );
}

function scheduleSortKey(row) {
  return [
    row.scheduled_date,
    String(row.daily_slot || '').padStart(3, '0'),
    row.scheduled_at_utc,
    row.schedule_id
  ].join('|');
}

function maxScheduledPinsPerDate(schedule) {
  const counts = new Map();
  for (const row of schedule) {
    if (!row.scheduled_date) continue;
    counts.set(row.scheduled_date, (counts.get(row.scheduled_date) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

const args = parseArgs();
const pinsFile = path.resolve(args.pins ?? DEFAULT_PINS_FILE);
const scheduleFile = path.resolve(args.schedule ?? DEFAULT_SCHEDULE_FILE);
const boardsFile = path.resolve(args.boards ?? DEFAULT_BOARDS_FILE);
const outputFile = path.resolve(args.output ?? DEFAULT_OUTPUT_FILE);

const pinsRows = readCsv(pinsFile);
const scheduleRows = readCsv(scheduleFile);
const boards = normalizeBoards(readJson(boardsFile));

const pinsById = new Map(
  pinsRows
    .map((row) => pick(row, PIN_FIELDS))
    .filter((pin) => pin.pin_id && pin.quality_status === 'approved' && !pin.quality_rejection_reasons)
    .map((pin) => [pin.pin_id, pin])
);

const schedule = scheduleRows
  .map((row) => pick(row, SCHEDULE_FIELDS))
  .filter((row) => row.schedule_id && row.pin_id && row.scheduled_date && pinsById.has(row.pin_id))
  .sort((a, b) => scheduleSortKey(a).localeCompare(scheduleSortKey(b)));

const scheduledPinIds = new Set(schedule.map((row) => row.pin_id));
const pins = [...scheduledPinIds]
  .map((pinId) => pinsById.get(pinId))
  .filter(Boolean)
  .sort((a, b) => a.pin_id.localeCompare(b.pin_id));

const warnings = [];
for (const pinId of scheduledPinIds) {
  if (!pinsById.has(pinId)) warnings.push(`Missing pin metadata for ${pinId}.`);
}

for (const row of scheduleRows) {
  const pinId = clean(row.pin_id);
  if (pinId && !pinsById.has(pinId)) warnings.push(`Skipped unapproved scheduled pin ${pinId}.`);
}

for (const row of schedule) {
  if (!boards[row.board_slug]) warnings.push(`Missing board id for board_slug ${row.board_slug}.`);
}

for (const pin of pins) {
  if (!pin.image_url) warnings.push(`Missing image_url for ${pin.pin_id}; Workers need public HTTPS image URLs.`);
}

const output = {
  version: 1,
  generated_at_utc: new Date().toISOString(),
  source_files: {
    pins: path.relative(ROOT_DIR, pinsFile).replace(/\\/g, '/'),
    schedule: path.relative(ROOT_DIR, scheduleFile).replace(/\\/g, '/'),
    boards: path.relative(ROOT_DIR, boardsFile).replace(/\\/g, '/')
  },
  stats: {
    pins: pins.length,
    schedule_rows: schedule.length,
    boards: Object.keys(boards).length,
    suggested_daily_cap: maxScheduledPinsPerDate(schedule)
  },
  boards,
  pins,
  schedule,
  warnings
};

writeText(outputFile, `${JSON.stringify(output, null, 2)}\n`);

console.log(
  `[pinterest-worker-export] Wrote ${path.relative(process.cwd(), outputFile)} ` +
    `(${pins.length} pins, ${schedule.length} schedule rows, ${warnings.length} warnings).`
);

if (warnings.length) {
  console.warn('[pinterest-worker-export] Warnings:');
  for (const warning of warnings.slice(0, 20)) {
    console.warn(`- ${warning}`);
  }
  if (warnings.length > 20) console.warn(`- ...${warnings.length - 20} more`);
}
