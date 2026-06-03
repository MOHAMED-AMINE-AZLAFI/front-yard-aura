import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ROOT_DIR, parseArgs, readCsv } from './pinterest-utils.mjs';
import { sourceSignatureFor } from './pin-image-quality.mjs';

const MANUAL_PROMPTS_DIR = path.join(ROOT_DIR, 'data', 'manual-image-prompts');
const APPROVED_PINS_PATH = path.join(DATA_DIR, 'pinterest-pins.csv');
const REJECTED_PINS_PATH = path.join(DATA_DIR, 'pinterest-rejected-pins.csv');

const REQUIRED_COLUMNS = [
  'image_id',
  'article_slug',
  'category',
  'pin_variant',
  'pin_type',
  'pin_id',
  'source_signature',
  'article_title',
  'required_visual_element',
  'exact_prompt',
  'priority'
];

const REQUIRED_PROMPT_PATTERNS = [
  ['realistic professional photography', /\brealistic professional photography\b/i],
  ['USA suburban front yard', /\bUSA suburban front yard\b/i],
  ['visible house exterior', /\bvisible house exterior\b/i],
  ['landscaping is the main subject', /\blandscaping (?:is|must be) the main subject\b/i],
  ['front yard occupies at least 40%', /\bfront yard (?:occupies|must occupy) at least 40%/i],
  ['lawn flower beds shrubs mulch rocks or walkway', /\b(lawn|flower beds?|shrubs?|mulch|rocks?|walkway)\b/i],
  ['Pinterest vertical 1000x1500', /\bPinterest vertical 1000x1500\b/i],
  ['no people', /\bno people\b/i],
  ['no vehicles', /\bno vehicles\b/i],
  ['no interiors', /\bno interiors?\b/i],
  ['no watermark', /\bno watermark\b/i],
  ['no text', /\bno text\b/i],
  ['no logo', /\bno logo\b/i]
];

const FORBIDDEN_POSITIVE_PATTERNS = [
  ['people', /\b(person|people|human|man|men|woman|women|boy|girl|child|children|couple|model|face|tourist|crowd)\b/i],
  ['vehicles', /\b(car|cars|truck|trucks|vehicle|vehicles|van|vans|suv|motorcycle)\b/i],
  ['interior', /\b(interior|interiors|indoor|indoors|living room|bedroom|bathroom|kitchen|dining room|sofa|couch)\b/i],
  ['watermark', /\b(watermark|watermarked)\b/i],
  ['text', /\b(text|typography|lettering|words)\b/i],
  ['logo', /\b(logo|logos|brand mark|watermark logo)\b/i]
];

function duplicateValues(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String(row[key] || '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1);
}

function latestManualPromptBatchPath() {
  const entries = fs
    .readdirSync(MANUAL_PROMPTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^manual-image-prompts-batch-\d+\.csv$/i.test(entry.name))
    .map((entry) => ({
      name: entry.name,
      batchNumber: Number(entry.name.match(/batch-(\d+)/i)?.[1] || 0)
    }))
    .sort((a, b) => b.batchNumber - a.batchNumber);

  if (!entries.length) {
    throw new Error(`No manual prompt batch CSV files found in ${MANUAL_PROMPTS_DIR}`);
  }

  return path.join(MANUAL_PROMPTS_DIR, entries[0].name);
}

function expectedCountForInput(input, rows) {
  const batchNumber = Number(path.basename(input).match(/batch-(\d+)/i)?.[1] || 0);
  if (batchNumber === 1 || batchNumber === 3) return 50;
  if (batchNumber === 2) return 100;
  return rows.length;
}

function allowedNegativeTextRemoved(prompt) {
  return String(prompt || '')
    .replace(/\bno people\b/gi, '')
    .replace(/\bno persons?\b/gi, '')
    .replace(/\bno humans?\b/gi, '')
    .replace(/\bno vehicles?\b/gi, '')
    .replace(/\bno cars?\b/gi, '')
    .replace(/\bno trucks?\b/gi, '')
    .replace(/\bno vans?\b/gi, '')
    .replace(/\bno suvs?\b/gi, '')
    .replace(/\bno interiors?\b/gi, '')
    .replace(/\bno indoors?\b/gi, '')
    .replace(/\bno watermark(?:s|ed)?\b/gi, '')
    .replace(/\bno text\b/gi, '')
    .replace(/\bno typography\b/gi, '')
    .replace(/\bno lettering\b/gi, '')
    .replace(/\bno words\b/gi, '')
    .replace(/\bno logos?\b/gi, '')
    .replace(/\bno signage\b/gi, '');
}

function approvedSourceSignatures() {
  return new Set(
    readCsv(APPROVED_PINS_PATH)
      .filter((row) => row.quality_status === 'approved')
      .map((row) => row.source_signature || sourceSignatureFor(row))
      .filter(Boolean)
  );
}

function rejectedSourceSignatures() {
  return new Set(readCsv(REJECTED_PINS_PATH).map((row) => row.source_signature || sourceSignatureFor(row)).filter(Boolean));
}

function previousBatchSourceSignatures(input) {
  const inputBatchNumber = Number(path.basename(input).match(/batch-(\d+)/i)?.[1] || 0);
  const signatures = new Set();

  for (const entry of fs.readdirSync(MANUAL_PROMPTS_DIR, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = entry.name.match(/^manual-image-prompts-batch-(\d+)\.csv$/i);
    if (!match) continue;
    const batchNumber = Number(match[1]);
    if (!inputBatchNumber || batchNumber >= inputBatchNumber) continue;
    for (const row of readCsv(path.join(MANUAL_PROMPTS_DIR, entry.name))) {
      if (row.source_signature) signatures.add(row.source_signature);
    }
  }

  return signatures;
}

function auditRows(rows, { input, expectedCount }) {
  const errors = [];
  const approvedSignatures = approvedSourceSignatures();
  const rejectedSignatures = rejectedSourceSignatures();
  const previousBatchSignatures = previousBatchSourceSignatures(input);

  if (rows.length !== expectedCount) {
    errors.push(`expected_prompt_count:${expectedCount}:actual:${rows.length}`);
  }

  for (const column of REQUIRED_COLUMNS) {
    if (!rows.every((row) => Object.prototype.hasOwnProperty.call(row, column))) {
      errors.push(`missing_column:${column}`);
    }
  }

  for (const [value, count] of duplicateValues(rows, 'source_signature')) {
    errors.push(`duplicate_source_signature:${value}:${count}`);
  }

  for (const [value, count] of duplicateValues(rows, 'image_id')) {
    errors.push(`duplicate_image_id:${value}:${count}`);
  }

  for (const [value, count] of duplicateValues(rows, 'pin_id')) {
    errors.push(`duplicate_pin_id:${value}:${count}`);
  }

  for (const [index, row] of rows.entries()) {
    const label = row.image_id || `row_${index + 1}`;
    const prompt = String(row.exact_prompt || '');
    const pinVariant = String(row.pin_variant || '').trim();
    const pinType = String(row.pin_type || '').trim();
    const sourceSignature = String(row.source_signature || '').trim();

    if (!sourceSignature) errors.push(`${label}:missing_source_signature`);
    if (approvedSignatures.has(sourceSignature)) errors.push(`${label}:source_signature_matches_approved_pin`);
    if (rejectedSignatures.has(sourceSignature)) errors.push(`${label}:source_signature_matches_rejected_pin`);
    if (previousBatchSignatures.has(sourceSignature)) errors.push(`${label}:source_signature_matches_previous_batch`);
    if (!['A', 'B', 'C'].includes(pinVariant)) errors.push(`${label}:invalid_pin_variant:${pinVariant}`);
    if (pinType !== pinVariant) errors.push(`${label}:pin_type_mismatch:${pinType}:${pinVariant}`);
    if (!prompt.includes(row.article_title)) errors.push(`${label}:prompt_missing_exact_article_title`);
    if (!prompt.includes(row.article_slug)) errors.push(`${label}:prompt_missing_article_slug`);
    if (!prompt.includes(row.category)) errors.push(`${label}:prompt_missing_category`);
    if (!prompt.includes(row.required_visual_element)) errors.push(`${label}:prompt_missing_required_visual_element`);
    if (!new RegExp(`\\bPin type ${pinVariant}\\b`, 'i').test(prompt)) {
      errors.push(`${label}:prompt_missing_pin_type_${pinVariant}`);
    }

    for (const [requirement, pattern] of REQUIRED_PROMPT_PATTERNS) {
      if (!pattern.test(prompt)) errors.push(`${label}:missing_required_prompt_clause:${requirement}`);
    }

    const positivePrompt = allowedNegativeTextRemoved(prompt);
    for (const [forbidden, pattern] of FORBIDDEN_POSITIVE_PATTERNS) {
      if (pattern.test(positivePrompt)) errors.push(`${label}:forbidden_positive_content:${forbidden}`);
    }
  }

  return errors;
}

const args = parseArgs();
const input = path.resolve(args.input ?? latestManualPromptBatchPath());
const rows = readCsv(input);
const expectedCount = Number(args.count ?? expectedCountForInput(input, rows));
const errors = auditRows(rows, { input, expectedCount });
const variantCounts = Object.fromEntries(
  ['A', 'B', 'C'].map((variant) => [variant, rows.filter((row) => row.pin_variant === variant).length])
);

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      input: path.relative(ROOT_DIR, input).replace(/\\/g, '/'),
      prompts: rows.length,
      expectedPrompts: expectedCount,
      variantCounts,
      errors
    },
    null,
    2
  )
);

if (errors.length) process.exit(1);
