import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  DATA_DIR,
  PUBLIC_PINS_DIR,
  ROOT_DIR,
  countBy,
  duplicates,
  parseArgs,
  readCsv,
  writeCsv,
  writeText
} from './pinterest-utils.mjs';
import { PEOPLE_PATTERN, WATERMARK_PATTERN, auditPinRow, sourceSignatureFor } from './pin-image-quality.mjs';

const WIDTH = 1000;
const HEIGHT = 1500;
const DEFAULT_INPUT = path.join(DATA_DIR, 'pinterest-pins.csv');
const DEFAULT_CSV_OUTPUT = path.join(DATA_DIR, 'pin-image-quality-audit.csv');
const DEFAULT_JSON_OUTPUT = path.join(DATA_DIR, 'pin-image-quality-audit-report.json');
const MANUAL_IMAGES_FILE = path.join(DATA_DIR, 'pinterest-needs-manual-images.csv');

const AUDIT_COLUMNS = [
  'pin_id',
  'article_slug',
  'article_title',
  'quality_status',
  'ok',
  'reasons',
  'quality_rule_key',
  'quality_rule_label',
  'quality_score',
  'source_signature',
  'quality_source_key',
  'quality_source_type',
  'quality_source_url',
  'image_file',
  'image_url',
  'width',
  'height'
];

function localImagePathFor(pin) {
  const imageFile = String(pin.image_file || '').trim();
  if (!imageFile) return null;
  return path.join(PUBLIC_PINS_DIR, imageFile.replace(/^\/?pins[\\/]/, ''));
}

async function imageMetadata(pin, reasons) {
  const imageFile = localImagePathFor(pin);
  if (!imageFile) return { width: '', height: '' };
  if (!fs.existsSync(imageFile)) {
    reasons.add('missing_local_image_file');
    return { width: '', height: '' };
  }

  try {
    const metadata = await sharp(imageFile).metadata();
    if (metadata.width !== WIDTH || metadata.height !== HEIGHT) reasons.add('invalid_image_dimensions');
    return { width: String(metadata.width || ''), height: String(metadata.height || '') };
  } catch (error) {
    reasons.add(`image_metadata_error:${error.message}`);
    return { width: '', height: '' };
  }
}

function sourceDuplicateMap(pins) {
  const pinsBySource = new Map();
  for (const pin of pins) {
    const sourceSignature = sourceSignatureFor({
      sourceSignature: pin.source_signature,
      sourceId: pin.quality_source_id,
      cacheKey: pin.quality_source_key,
      sourceUrl: pin.quality_source_url
    });
    if (!sourceSignature) continue;
    const sourcePins = pinsBySource.get(sourceSignature) ?? [];
    sourcePins.push(pin.pin_id);
    pinsBySource.set(sourceSignature, sourcePins);
  }
  return new Map([...pinsBySource.entries()].filter(([, sourcePins]) => sourcePins.length > 1));
}

async function auditPins(pins) {
  const duplicateSources = sourceDuplicateMap(pins);
  const duplicateImageFiles = new Set(duplicates(pins.map((pin) => pin.image_file)).map(([file]) => file));
  const rows = [];

  for (const pin of pins) {
    const evaluation = auditPinRow(pin);
    const reasons = new Set(evaluation.reasons);
    const sourceBlob = [
      pin.quality_source_id,
      pin.quality_source_key,
      pin.quality_source_type,
      pin.quality_source_url,
      pin.quality_source_text,
      pin.image_file,
      pin.image_url
    ].join(' ');

    if (WATERMARK_PATTERN.test(sourceBlob)) reasons.add('watermark_or_preview_pattern');
    if (PEOPLE_PATTERN.test(String(pin.quality_source_text || ''))) reasons.add('people_pattern');
    if (duplicateSources.has(evaluation.sourceSignature)) reasons.add('duplicate_source_signature');
    if (duplicateImageFiles.has(pin.image_file)) reasons.add('duplicate_image_file');

    const metadata = await imageMetadata(pin, reasons);

    rows.push({
      pin_id: pin.pin_id,
      article_slug: pin.article_slug,
      article_title: pin.article_title,
      quality_status: pin.quality_status,
      ok: reasons.size === 0 ? 'yes' : 'no',
      reasons: [...reasons].join('; '),
      quality_rule_key: pin.quality_rule_key,
      quality_rule_label: pin.quality_rule_label,
      quality_score: pin.quality_score,
      source_signature: evaluation.sourceSignature,
      quality_source_key: evaluation.sourceKey,
      quality_source_type: pin.quality_source_type,
      quality_source_url: pin.quality_source_url,
      image_file: pin.image_file,
      image_url: pin.image_url,
      width: metadata.width,
      height: metadata.height
    });
  }

  return rows;
}

function readManualArticles() {
  if (!fs.existsSync(MANUAL_IMAGES_FILE)) return [];
  return readCsv(MANUAL_IMAGES_FILE);
}

const args = parseArgs();
const input = path.resolve(args.input ?? DEFAULT_INPUT);
const csvOutput = path.resolve(args.output ?? DEFAULT_CSV_OUTPUT);
const jsonOutput = path.resolve(args.report ?? DEFAULT_JSON_OUTPUT);
const pins = readCsv(input);
const auditRows = await auditPins(pins);
const manualArticles = readManualArticles();
const rejectedRows = auditRows.filter((row) => row.ok !== 'yes');
const rejectionReasons = countBy(rejectedRows.flatMap((row) => row.reasons.split('; ').filter(Boolean)));

writeCsv(csvOutput, auditRows, AUDIT_COLUMNS);
writeText(
  jsonOutput,
  `${JSON.stringify(
    {
      ok: rejectedRows.length === 0,
      generated_at_utc: new Date().toISOString(),
      input: path.relative(ROOT_DIR, input).replace(/\\/g, '/'),
      total_pins_approved: auditRows.length - rejectedRows.length,
      total_pins_rejected: rejectedRows.length,
      rejection_reasons: Object.fromEntries(
        [...rejectionReasons.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      ),
      articles_needing_manual_images: manualArticles.length,
      manual_articles: manualArticles.map((row) => ({
        article_slug: row.article_slug,
        article_title: row.article_title,
        approved_pins: row.approved_pins,
        rejected_pins: row.rejected_pins,
        rejection_reasons: row.rejection_reasons
      })),
      outputs: {
        csv: path.relative(ROOT_DIR, csvOutput).replace(/\\/g, '/'),
        report: path.relative(ROOT_DIR, jsonOutput).replace(/\\/g, '/')
      }
    },
    null,
    2
  )}\n`
);

console.log(
  JSON.stringify(
    {
      ok: rejectedRows.length === 0,
      totalPinsApproved: auditRows.length - rejectedRows.length,
      totalPinsRejected: rejectedRows.length,
      articlesNeedingManualImages: manualArticles.length,
      output: path.relative(process.cwd(), csvOutput)
    },
    null,
    2
  )
);

if (rejectedRows.length) process.exit(1);
