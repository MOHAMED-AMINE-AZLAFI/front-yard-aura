import path from 'node:path';
import {
  DATA_DIR,
  addDays,
  createRng,
  duplicates,
  parseArgs,
  readCsv,
  shuffle,
  tomorrowDateString,
  writeCsv,
  writeText,
  zonedDateTimeToUtc
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

function timeSlotsForDay(date, count, seed) {
  const rng = createRng(`${seed}:${date}:${count}`);
  const start = 9 * 60;
  const end = 21 * 60;
  const window = end - start;
  const slots = [];

  for (let index = 0; index < count; index += 1) {
    const base = start + Math.round(((index + 0.5) * window) / count);
    const jitter = Math.round((rng() - 0.5) * 56);
    slots.push(Math.max(start, Math.min(end, base + jitter)));
  }

  slots.sort((a, b) => a - b);

  for (let index = 1; index < slots.length; index += 1) {
    if (slots[index] - slots[index - 1] < 25) {
      slots[index] = Math.min(end, slots[index - 1] + 25);
    }
  }

  return slots.map((minutes) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  });
}

function dailyLimit(dayIndex) {
  return dayIndex < 7 ? 5 : 10;
}

function buildRemainingPins(pins, seed) {
  return ['A', 'B', 'C'].flatMap((variant) =>
    shuffle(
      pins.filter((pin) => pin.pin_variant === variant),
      `${seed}:variant:${variant}`
    )
  );
}

function pickNextPin(remaining, usedArticleSlugs) {
  const index = remaining.findIndex((pin) => !usedArticleSlugs.has(pin.article_slug));
  if (index === -1) return null;
  const [pin] = remaining.splice(index, 1);
  return pin;
}

function createSchedule(pins, { startDate, timeZone, seed }) {
  const remaining = buildRemainingPins(pins, seed);
  const schedule = [];
  const usedByWeek = new Map();
  let dayIndex = 0;

  while (remaining.length) {
    const date = addDays(startDate, dayIndex);
    const count = Math.min(dailyLimit(dayIndex), remaining.length);
    const times = timeSlotsForDay(date, count, seed);
    const weekIndex = Math.floor(dayIndex / 7) + 1;
    const usedThisWeek = usedByWeek.get(weekIndex) ?? new Set();
    usedByWeek.set(weekIndex, usedThisWeek);

    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      const pin = pickNextPin(remaining, usedThisWeek);
      if (!pin) {
        throw new Error(`Cannot satisfy no-repeat weekly rule for week ${weekIndex}.`);
      }

      usedThisWeek.add(pin.article_slug);
      const time = times[slotIndex];
      schedule.push({
        schedule_id: `schedule-${pin.pin_id}`,
        pin_id: pin.pin_id,
        article_slug: pin.article_slug,
        category_slug: pin.category_slug,
        board_slug: pin.board_slug,
        pin_variant: pin.pin_variant,
        scheduled_date: date,
        scheduled_time: time,
        time_zone: timeZone,
        scheduled_at_utc: zonedDateTimeToUtc(date, time, timeZone),
        week_index: String(weekIndex),
        day_index: String(dayIndex + 1),
        daily_slot: String(slotIndex + 1),
        status: 'pending',
        published_at_utc: '',
        pinterest_pin_id: '',
        error: ''
      });
    }

    dayIndex += 1;
  }

  return schedule;
}

function validateSchedule(pins, schedule) {
  const errors = [];
  const warnings = [];

  const scheduledPins = new Set(schedule.map((row) => row.pin_id));
  if (scheduledPins.size !== pins.length) errors.push(`Expected ${pins.length} scheduled pins, found ${scheduledPins.size}.`);

  const duplicatePinIds = duplicates(schedule.map((row) => row.pin_id));
  if (duplicatePinIds.length) errors.push(`Duplicate scheduled pin ids: ${duplicatePinIds.slice(0, 5).map(([id]) => id).join(', ')}`);

  const dayCounts = new Map();
  const weekArticlePairs = new Set();
  const weeklyDuplicates = [];

  for (const row of schedule) {
    const dayIndex = Number(row.day_index);
    const weekIndex = Number(row.week_index);
    const dailyCount = (dayCounts.get(dayIndex) ?? 0) + 1;
    dayCounts.set(dayIndex, dailyCount);

    const pair = `${weekIndex}:${row.article_slug}`;
    if (weekArticlePairs.has(pair)) weeklyDuplicates.push(pair);
    weekArticlePairs.add(pair);

    const [hour, minute] = row.scheduled_time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;
    if (totalMinutes < 9 * 60 || totalMinutes > 21 * 60) {
      errors.push(`${row.pin_id} is outside the 9 AM to 9 PM window.`);
    }
  }

  for (const [dayIndex, count] of dayCounts) {
    const limit = dayIndex <= 7 ? 5 : 10;
    if (count > limit) errors.push(`Day ${dayIndex} has ${count} pins, over limit ${limit}.`);
  }

  if (weeklyDuplicates.length) {
    errors.push(`Same article appears twice in a week: ${weeklyDuplicates.slice(0, 5).join(', ')}`);
  }

  const days = new Set(schedule.map((row) => row.scheduled_date));
  const boards = new Set(schedule.map((row) => row.board_slug));

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    pins: pins.length,
    scheduledPins: scheduledPins.size,
    days: days.size,
    boards: boards.size,
    startDate: schedule[0]?.scheduled_date ?? '',
    endDate: schedule.at(-1)?.scheduled_date ?? ''
  };
}

const args = parseArgs();
const input = path.resolve(args.input ?? path.join(DATA_DIR, 'pinterest-pins.csv'));
const output = path.resolve(args.output ?? path.join(DATA_DIR, 'pinterest-schedule.csv'));
const timeZone = args.timeZone ?? 'America/New_York';
const startDate = args.startDate ?? tomorrowDateString();
const seed = args.seed ?? 'front-yard-aura-pinterest-schedule-v1';

const pins = readCsv(input);
const schedule = createSchedule(pins, { startDate, timeZone, seed });
const report = validateSchedule(pins, schedule);

writeCsv(output, schedule, SCHEDULE_COLUMNS);
writeText(
  path.join(DATA_DIR, 'pinterest-schedule-report.json'),
  `${JSON.stringify({ ...report, timeZone, generatedAt: new Date().toISOString() }, null, 2)}\n`
);

console.log(
  JSON.stringify(
    {
      generated: report.ok,
      pins: report.pins,
      scheduledPins: report.scheduledPins,
      boards: report.boards,
      days: report.days,
      startDate: report.startDate,
      endDate: report.endDate,
      timeZone,
      errors: report.errors.length,
      warnings: report.warnings.length,
      output: 'data/pinterest/pinterest-schedule.csv'
    },
    null,
    2
  )
);

if (!report.ok) {
  for (const error of report.errors) console.error(`- ${error}`);
  process.exit(1);
}
