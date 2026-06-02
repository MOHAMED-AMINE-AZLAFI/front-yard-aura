import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SCRIPTS_DIR, '..');
export const BLOG_DIR = path.join(ROOT_DIR, 'src', 'content', 'blog');
export const DATA_DIR = path.join(ROOT_DIR, 'data', 'pinterest');
export const PUBLIC_PINS_DIR = path.join(ROOT_DIR, 'public', 'pins');
export const SITE_URL = 'https://frontyardaura.com';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

export function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value, 'utf8');
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      args._ ??= [];
      args._.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (next && !next.startsWith('--')) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function stripQuotes(value = '') {
  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getFrontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match ? stripQuotes(match[1]) : '';
}

function getFrontmatterList(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${key}:`);
  if (start === -1) return [];

  const items = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith('  - ')) break;
    items.push(stripQuotes(line.slice(4)));
  }
  return items.filter(Boolean);
}

function parseFrontmatter(file) {
  const raw = readText(file);
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error(`Missing frontmatter in ${file}`);
  }

  const frontmatter = match[1];
  const slug = path.basename(file, path.extname(file));
  const draft = getFrontmatterValue(frontmatter, 'draft') === 'true';

  return {
    file,
    slug,
    title: getFrontmatterValue(frontmatter, 'title'),
    seoTitle: getFrontmatterValue(frontmatter, 'seoTitle'),
    description: getFrontmatterValue(frontmatter, 'description'),
    publishDate: getFrontmatterValue(frontmatter, 'publishDate'),
    updatedDate: getFrontmatterValue(frontmatter, 'updatedDate'),
    author: getFrontmatterValue(frontmatter, 'author'),
    category: getFrontmatterValue(frontmatter, 'category'),
    categorySlug: getFrontmatterValue(frontmatter, 'categorySlug'),
    tags: getFrontmatterList(frontmatter, 'tags'),
    featuredImageUrl: getFrontmatterValue(frontmatter, 'featuredImageUrl'),
    imageAlt: getFrontmatterValue(frontmatter, 'imageAlt'),
    pinterestTitle: getFrontmatterValue(frontmatter, 'pinterestTitle'),
    pinterestDescription: getFrontmatterValue(frontmatter, 'pinterestDescription'),
    draft
  };
}

export function readBlogPosts() {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith('.mdx'))
    .map((file) => parseFrontmatter(path.join(BLOG_DIR, file)))
    .filter((post) => !post.draft)
    .sort((a, b) => {
      const byCategory = a.categorySlug.localeCompare(b.categorySlug);
      if (byCategory) return byCategory;
      return a.slug.localeCompare(b.slug);
    });
}

export function dedupe(items) {
  return [...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
}

export function countBy(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return counts;
}

export function duplicates(items) {
  return [...countBy(items).entries()].filter(([, count]) => count > 1);
}

export function limitText(value, maxLength, fallback = '') {
  const text = String(value || fallback).replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, Math.max(0, maxLength - 1));
  const clean = sliced.replace(/\s+\S*$/, '').replace(/[,:;-]+$/, '').trim();
  return `${clean || sliced.trim()}...`;
}

export function titleCase(value) {
  return String(value)
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ');
}

export function wordsFromSlug(slug) {
  return String(slug)
    .split('-')
    .filter((word) => word.length > 2)
    .filter((word) => !['with', 'for', 'and', 'the', 'that', 'from', 'into'].includes(word));
}

export function shortHash(input, length = 8) {
  let hash = 2166136261;
  for (const char of String(input)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(length, '0').slice(0, length);
}

export function createRng(seedInput) {
  let seed = 1779033703 ^ String(seedInput).length;
  for (const char of String(seedInput)) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 3432918353);
    seed = (seed << 13) | (seed >>> 19);
  }

  return function rng() {
    seed = Math.imul(seed ^ (seed >>> 16), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
}

export function shuffle(items, seed) {
  const rng = createRng(seed);
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function writeCsv(file, rows, columns) {
  ensureDir(path.dirname(file));
  const header = columns.map(escapeCsvValue).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','));
  fs.writeFileSync(file, `${[header, ...body].join('\n')}\n`, 'utf8');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

export function readCsv(file) {
  const table = parseCsv(readText(file));
  const [headers, ...rows] = table;
  if (!headers?.length) return [];
  return rows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
}

export function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function tomorrowDateString() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.toISOString().slice(0, 10);
}

function getTimeZoneOffsetMs(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
  );

  const localAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  return localAsUtc - date.getTime();
}

export function zonedDateTimeToUtc(dateString, time, timeZone) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstOffset = getTimeZoneOffsetMs(new Date(localAsUtc), timeZone);
  const firstGuess = localAsUtc - firstOffset;
  const secondOffset = getTimeZoneOffsetMs(new Date(firstGuess), timeZone);
  return new Date(localAsUtc - secondOffset).toISOString();
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
