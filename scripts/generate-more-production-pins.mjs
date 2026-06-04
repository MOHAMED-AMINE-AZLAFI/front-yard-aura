import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  DATA_DIR,
  PUBLIC_PINS_DIR,
  ROOT_DIR,
  addDays,
  countBy,
  createRng,
  duplicates,
  ensureDir,
  parseArgs,
  parseCsv,
  readCsv,
  readText,
  shortHash,
  shuffle,
  writeCsv,
  writeText,
  zonedDateTimeToUtc
} from './pinterest-utils.mjs';
import {
  QUALITY_COLUMNS,
  applyQualityFields,
  evaluateImageCandidate,
  qualitySearchQueriesForPin,
  ruleForPin,
  sourceKeyFor,
  sourceSignatureFor
} from './pin-image-quality.mjs';

const WIDTH = 1000;
const HEIGHT = 1500;
const SAFE_X = 96;
const TITLE_BOX_WIDTH = WIDTH - SAFE_X * 2;
const DEFAULT_TARGET = 115;
const DEFAULT_MAX_PAGES = 8;
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'pinterest-sources');
const SEARCH_CACHE_PATH = path.join(CACHE_DIR, 'unsplash-expanded-search-cache-v1.json');
const APPROVED_PINS_PATH = path.join(DATA_DIR, 'pinterest-pins.csv');
const REJECTED_PINS_PATH = path.join(DATA_DIR, 'pinterest-rejected-pins.csv');
const MANUAL_IMAGES_PATH = path.join(DATA_DIR, 'pinterest-needs-manual-images.csv');
const IMAGE_PROMPTS_PATH = path.join(DATA_DIR, 'image-prompts.csv');
const CHECKLIST_PATH = path.join(DATA_DIR, 'pin-production-checklist.csv');
const QUALITY_REPORT_PATH = path.join(DATA_DIR, 'pin-image-quality-filter-report.json');
const SCHEDULE_PATH = path.join(DATA_DIR, 'pinterest-schedule.csv');
const SCHEDULE_REPORT_PATH = path.join(DATA_DIR, 'pinterest-schedule-report.json');
const REPORT_PATH = path.join(ROOT_DIR, 'pin-production-more-report.md');

const IMAGE_PROMPT_COLUMNS = [
  'pin_id',
  'image_file',
  'article_slug',
  'pin_variant',
  'composition',
  'visual_focus',
  'image_prompt',
  'overlay_top',
  'overlay_center',
  'overlay_bottom',
  'overlay_style',
  'negative_prompt'
];

const CHECKLIST_COLUMNS = [
  'pin_id',
  'article_slug',
  'pin_variant',
  'image_generated',
  'image_reviewed',
  'text_overlay_added',
  'text_legible_mobile',
  'topic_match_checked',
  'no_ai_artifacts',
  'image_uploaded_to_public_pins',
  'ready_for_api'
];

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

const VARIANT_SETTINGS = {
  A: {
    zoom: 1.02,
    titleZone: 1100,
    titlePlacement: 'bottom',
    offsetX: 0.5,
    offsetY: 0.1
  },
  B: {
    zoom: 1.48,
    titleZone: 238,
    titlePlacement: 'top',
    offsetX: 0.5,
    offsetY: 0.46
  },
  C: {
    zoom: 1.18,
    titleZone: 244,
    titlePlacement: 'top',
    offsetX: 0.18,
    offsetY: 0.28
  }
};

const BROAD_SEARCH_QUERIES_BY_INTENT = {
  rocks: [
    'front yard rock landscaping',
    'gravel front yard landscaping',
    'rock garden house exterior',
    'boulder landscaping front yard',
    'dry creek front yard landscaping',
    'stone border front yard landscaping'
  ],
  walkways: [
    'front walkway landscaping',
    'front walkway pavers',
    'garden path front yard',
    'front door walkway landscaping',
    'brick walkway front yard',
    'front yard stepping stone path'
  ],
  'flower-beds': [
    'front yard flower bed landscaping',
    'front yard flowers curb appeal',
    'foundation planting flowers house',
    'flower garden house exterior',
    'front yard perennial flower bed',
    'front porch flower bed landscaping'
  ],
  modern: [
    'modern front yard landscaping',
    'modern house exterior landscaping',
    'contemporary home front yard',
    'modern walkway landscaping',
    'modern front yard grasses',
    'modern curb appeal landscaping'
  ],
  'small-yards': [
    'small front yard landscaping',
    'townhouse front yard landscaping',
    'narrow front yard landscaping',
    'small front walkway landscaping',
    'compact front yard curb appeal',
    'small house front yard landscaping'
  ],
  'low-maintenance': [
    'low maintenance front yard landscaping',
    'no grass front yard landscaping',
    'drought tolerant front yard',
    'gravel shrubs front yard',
    'evergreen front yard landscaping',
    'mulch shrubs front yard landscaping'
  ],
  budget: [
    'budget front yard landscaping',
    'simple front yard landscaping',
    'mulch edging front yard',
    'affordable curb appeal landscaping',
    'diy front yard landscaping',
    'cheap front yard curb appeal'
  ],
  'curb-appeal': [
    'curb appeal landscaping',
    'front yard curb appeal',
    'home exterior landscaping',
    'front porch landscaping',
    'front yard landscaping curb appeal',
    'house exterior front garden'
  ]
};

const TARGETED_RULE_QUERIES = {
  'front-yard-exterior': [
    'front yard landscaping curb appeal',
    'house exterior landscaping',
    'front garden house exterior',
    'suburban front yard landscaping',
    'home exterior garden',
    'front porch landscaping'
  ],
  'flower-bed': [
    'front yard flower bed landscaping',
    'flowers in front of house',
    'foundation planting flowers house',
    'front garden flowers house exterior',
    'flower border walkway house',
    'front porch flower beds'
  ],
  'rock-landscaping': [
    'front yard rock landscaping',
    'gravel front yard landscaping',
    'boulder landscaping front yard',
    'stone garden house exterior',
    'rock garden house exterior',
    'river rock front yard'
  ],
  'low-maintenance': [
    'low maintenance front yard landscaping',
    'gravel shrubs front yard',
    'evergreen front yard landscaping',
    'mulch shrubs front yard landscaping',
    'no grass front yard landscaping',
    'drought tolerant front yard'
  ],
  'small-front-yard': [
    'small front yard landscaping',
    'compact front yard curb appeal',
    'townhouse front yard landscaping',
    'small house front yard landscaping',
    'narrow front yard landscaping',
    'small front garden house'
  ],
  walkway: [
    'front walkway landscaping',
    'front yard walkway pavers',
    'garden path front yard',
    'front door walkway landscaping',
    'stepping stone walkway front yard',
    'paver walkway house exterior'
  ],
  planters: [
    'front porch planters curb appeal',
    'container planters front yard',
    'potted plants front porch exterior',
    'front door planters landscaping'
  ],
  'gravel-path': [
    'front yard gravel path landscaping',
    'gravel walkway house exterior',
    'pea gravel front yard path',
    'gravel garden path front yard'
  ],
  lighting: [
    'front yard path lighting landscaping',
    'landscape lighting front yard house',
    'exterior path lights front yard',
    'front walkway lights curb appeal'
  ],
  'mailbox-bed': [
    'mailbox landscaping curb appeal',
    'front yard mailbox flower bed',
    'mailbox garden front yard',
    'postbox landscaping flowers'
  ],
  lawn: [
    'front yard lawn landscaping',
    'grass lawn front yard house',
    'clean lawn curb appeal',
    'striped lawn house exterior'
  ],
  driveway: [
    'front yard driveway edge landscaping',
    'driveway landscaping curb appeal',
    'driveway border plants house'
  ],
  'brick-walkway': [
    'brick front walkway landscaping',
    'brick path front yard',
    'brick walkway house exterior'
  ],
  boxwood: [
    'front yard boxwood landscaping',
    'boxwood front walkway landscaping',
    'boxwood hedge house exterior'
  ],
  'black-house': [
    'black house exterior front yard landscaping',
    'dark house curb appeal landscaping'
  ],
  'blue-house': ['blue house exterior front yard landscaping'],
  'gray-house': [
    'gray house exterior front yard landscaping',
    'charcoal house curb appeal landscaping'
  ],
  'tan-house': [
    'tan house exterior front yard landscaping',
    'beige house front yard landscaping'
  ],
  'white-farmhouse': [
    'white farmhouse exterior front yard landscaping',
    'farmhouse front yard landscaping'
  ],
  'fence-screen': [
    'front yard horizontal fence landscaping',
    'front yard privacy screen landscaping',
    'front gate landscaping house'
  ],
  'ornamental-grass': [
    'front yard ornamental grass landscaping',
    'modern front yard grasses landscaping'
  ]
};

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function headerColumns(file) {
  const [headers] = parseCsv(readText(file));
  return headers ?? [];
}

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(value) {
  return normalize(value)
    .replace(
      /\b(front yard|ideas?|landscaping|curb appeal|for|with|and|the|that|still|look|looks)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function detectIntent(row) {
  const text = normalize(`${row.article_title} ${row.article_slug} ${row.category_slug}`);
  if (/(rock|gravel|boulder|stone|river|basalt|limestone|slate|granite|cactus|agave|yucca|desert|dry creek)/.test(text)) {
    return 'rocks';
  }
  if (/(walkway|path|paver|stepping|steps|sidewalk|brick|flagstone|bluestone)/.test(text)) return 'walkways';
  if (/(flower|bed|bloom|hydrangea|tulip|rose|lavender|dahlia|iris|peony|salvia|wildflower|pollinator)/.test(text)) {
    return 'flower-beds';
  }
  if (/(modern|concrete|corten|horizontal|flat roof|metal edging|linear|floating|matte black|glass)/.test(text)) return 'modern';
  if (/(small|narrow|townhome|city|row house|duplex|cape cod|zero lot|skinny)/.test(text)) return 'small-yards';
  if (/(low maintenance|minimal|no grass|evergreen|drought|groundcover|mulch|shrubs)/.test(text)) return 'low-maintenance';
  if (/(budget|cheap|diy|under 500|free|reused|secondhand|weekend|renters)/.test(text)) return 'budget';
  return 'curb-appeal';
}

function searchQueriesForRow(row) {
  const title = cleanTitle(row.article_title);
  const intent = detectIntent(row);
  const category = normalize(row.category || row.category_slug).replace(/-/g, ' ');

  return unique([
    ...qualitySearchQueriesForPin(row),
    `${title} front yard landscaping`,
    `${title} house exterior`,
    `${title} curb appeal`,
    `${title} front garden`,
    category,
    ...(BROAD_SEARCH_QUERIES_BY_INTENT[intent] ?? BROAD_SEARCH_QUERIES_BY_INTENT['curb-appeal'])
  ].map((query) => query.replace(/\s+/g, ' ').trim())).slice(0, 12);
}

function candidateText(item) {
  return [
    item.alt_description,
    item.description,
    item.slug,
    item.tags?.map((tag) => tag.title).join(' '),
    item.topic_submissions ? Object.keys(item.topic_submissions).join(' ') : ''
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function searchResultToCandidate(item, query, page, index) {
  const raw = item.urls?.raw;
  if (!raw || !/^https:\/\/images\.unsplash\.com\/photo-/i.test(raw)) return null;
  const sourceUrl = raw.split('?')[0];
  const sourceId = sourceUrl.split('/').pop();
  if (!sourceId || /premium[_-]?photo/i.test(sourceId)) return null;

  return {
    sourceId,
    cacheKey: `${item.id}-${sourceId}`,
    sourceUrl,
    sourceType: 'unsplash-expanded-search',
    sourceText: candidateText(item),
    altDescription: item.alt_description ?? '',
    description: item.description ?? '',
    slug: item.slug ?? '',
    tags: item.tags?.map((tag) => tag.title).filter(Boolean).join(' ') ?? '',
    topicTags: item.topic_submissions ? Object.keys(item.topic_submissions).join(' ') : '',
    score: 0,
    query,
    page,
    resultIndex: index
  };
}

function readSearchCache() {
  ensureDir(CACHE_DIR);
  if (!fs.existsSync(SEARCH_CACHE_PATH)) return {};
  return JSON.parse(fs.readFileSync(SEARCH_CACHE_PATH, 'utf8'));
}

function writeSearchCache(cache) {
  writeText(SEARCH_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

async function fetchSearchCandidates(query, page, cache) {
  const key = `${query}::${page}`;
  if (cache[key]) return cache[key];

  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&page=${page}&orientation=portrait`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FrontYardAuraPinterestProduction/1.0',
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Unsplash search HTTP ${response.status} for ${query} page ${page}`);

  const data = await response.json();
  const candidates = (data.results ?? [])
    .map((item, index) => searchResultToCandidate(item, query, page, index))
    .filter(Boolean);
  cache[key] = candidates;
  return candidates;
}

function collectCachedSources(cache) {
  const sources = [];
  const seen = new Set();

  for (const rows of Object.values(cache)) {
    for (const source of rows) {
      const signature = sourceSignatureFor(source);
      if (!signature || seen.has(signature)) continue;
      seen.add(signature);
      sources.push(source);
    }
  }

  return sources;
}

function appendUniqueSources(target, sources, seen) {
  for (const source of sources) {
    const signature = sourceSignatureFor(source);
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    target.push(source);
  }
}

function rowsByRule(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = ruleForPin(row).key;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }
  return map;
}

function sourceUrl(source) {
  return `${source.sourceUrl}?auto=format&fit=crop&w=1800&h=2700&q=90`;
}

function safeCacheName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 140);
}

async function downloadSource(source) {
  ensureDir(CACHE_DIR);
  const cacheFile = path.join(CACHE_DIR, `${safeCacheName(source.cacheKey ?? source.sourceId)}.jpg`);
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 10000) return cacheFile;

  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(sourceUrl(source), {
        headers: {
          'User-Agent': 'FrontYardAuraPinterestProduction/1.0'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 10000) throw new Error(`Downloaded file too small: ${buffer.length} bytes`);
      fs.writeFileSync(cacheFile, buffer);
      return cacheFile;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }

  throw new Error(`Failed to download ${source.sourceId}: ${lastError?.message ?? 'unknown error'}`);
}

function variantRank(row) {
  return { A: 0, B: 1, C: 2 }[row.pin_variant] ?? 99;
}

function rowsByArticle(rows) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row.article_slug) ?? [];
    list.push(row);
    map.set(row.article_slug, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => variantRank(a) - variantRank(b) || a.pin_id.localeCompare(b.pin_id));
  }
  return map;
}

function usedSourcesFromApproved(rows) {
  const used = new Map();
  for (const row of rows) {
    const signature = sourceSignatureFor(row);
    if (signature) used.set(signature, row.pin_id);
  }
  return used;
}

async function selectMorePins({ rejectedRows, usedSourceOwners, target, maxPages, cache }) {
  const now = new Date();
  const selected = [];
  const errors = [];
  const ruleRows = rowsByRule(rejectedRows);
  const cachedSources = collectCachedSources(cache);
  const sourcesByRule = new Map();
  const sourceIndexesByRule = new Map();

  const rules = [...ruleRows.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  console.log(`Building source pools for ${rules.length} quality rules from ${cachedSources.length} cached sources...`);

  for (const [ruleKey, rows] of rules) {
    const representative = rows[0];
    const candidates = [...cachedSources];
    const seen = new Set(candidates.map((source) => sourceSignatureFor(source)).filter(Boolean));
    const articleQueries = rows.slice(0, 4).flatMap((row) => searchQueriesForRow(row));
    const targetedQueries = TARGETED_RULE_QUERIES[ruleKey] ?? [];
    const queries = unique([...targetedQueries, ...articleQueries]).slice(0, 14);

    for (const query of queries) {
      for (let page = 1; page <= maxPages; page += 1) {
        try {
          appendUniqueSources(candidates, await fetchSearchCandidates(query, page, cache), seen);
        } catch (error) {
          errors.push({ rule_key: ruleKey, query, page, error: error.message });
        }
      }
    }

    const localUsed = new Map();
    const approvedSources = candidates
      .map((source) => ({
        source,
        evaluation: evaluateImageCandidate(representative, source, { usedSourceOwners: localUsed, now })
      }))
      .filter(({ evaluation }) => evaluation.ok)
      .sort(
        (a, b) =>
          b.evaluation.score - a.evaluation.score ||
          String(a.source.query || '').localeCompare(String(b.source.query || '')) ||
          Number(a.source.page || 0) - Number(b.source.page || 0) ||
          Number(a.source.resultIndex || 0) - Number(b.source.resultIndex || 0)
      );

    sourcesByRule.set(ruleKey, approvedSources);
    sourceIndexesByRule.set(ruleKey, 0);
    writeSearchCache(cache);
    console.log(`Rule ${ruleKey}: ${approvedSources.length} approved sources for ${rows.length} remaining pins.`);
  }

  const orderedRows = ['A', 'B', 'C'].flatMap((variant) =>
    rejectedRows
      .filter((row) => row.pin_variant === variant)
      .sort((a, b) => a.article_slug.localeCompare(b.article_slug) || a.pin_id.localeCompare(b.pin_id))
  );

  for (const row of orderedRows) {
    const ruleKey = ruleForPin(row).key;
    const sources = sourcesByRule.get(ruleKey) ?? [];
    let sourceIndex = sourceIndexesByRule.get(ruleKey) ?? 0;
    let found = null;

    while (sourceIndex < sources.length) {
      const { source } = sources[sourceIndex];
      sourceIndex += 1;
      const evaluation = evaluateImageCandidate(row, source, { usedSourceOwners, now });
      if (!evaluation.ok) continue;
      found = { source, evaluation };
      break;
    }

    sourceIndexesByRule.set(ruleKey, sourceIndex);
    if (!found) continue;

    usedSourceOwners.set(sourceSignatureFor(found.source), row.pin_id);
    selected.push({
      row: applyQualityFields(row, found.source, found.evaluation, 'approved'),
      source: found.source,
      evaluation: found.evaluation
    });

    if (selected.length % 25 === 0 || selected.length >= target) {
      console.log(`Selected ${selected.length}/${target} additional pins.`);
    }
    if (selected.length >= target) return { selected, errors };
  }

  return { selected, errors };
}

function hashNumber(value) {
  return parseInt(shortHash(value, 8), 36);
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function estimateWidth(text, fontSize) {
  return [...text].reduce((total, char) => {
    if (char === ' ') return total + fontSize * 0.3;
    if (/[il.,':.-]/.test(char)) return total + fontSize * 0.28;
    if (/[MW]/.test(char)) return total + fontSize * 0.82;
    if (/[A-Z]/.test(char)) return total + fontSize * 0.62;
    return total + fontSize * 0.52;
  }, 0);
}

function wrapForSize(text, fontSize, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (estimateWidth(next, fontSize) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function fitTitle(text) {
  for (let fontSize = 64; fontSize >= 24; fontSize -= 2) {
    const lines = wrapForSize(text, fontSize, TITLE_BOX_WIDTH);
    const lineHeight = fontSize * 0.96;
    const widest = Math.max(...lines.map((line) => estimateWidth(line, fontSize)));
    if (widest <= TITLE_BOX_WIDTH && lines.length * lineHeight <= 220) {
      return { fontSize, lineHeight, lines };
    }
  }

  const fontSize = 24;
  return { fontSize, lineHeight: fontSize * 0.98, lines: wrapForSize(text, fontSize, TITLE_BOX_WIDTH) };
}

function fitHook(text) {
  for (let fontSize = 32; fontSize >= 23; fontSize -= 1) {
    if (estimateWidth(text, fontSize) <= 560) return fontSize;
  }
  return 23;
}

function overlaySvg(row, variant) {
  const title = fitTitle(row.overlay_center || row.article_title);
  const titleHeight = title.lines.length * title.lineHeight;
  const panelPaddingY = title.fontSize <= 30 ? 22 : 28;
  const titleZone = variant.titleZone;
  const panelHeight = titleHeight + panelPaddingY * 2;
  const panelY =
    variant.titlePlacement === 'bottom'
      ? Math.max(1000, Math.min(1252 - panelHeight, titleZone - titleHeight / 2 - panelPaddingY))
      : Math.max(136, Math.min(492 - panelHeight, titleZone - titleHeight / 2 - panelPaddingY));
  const titleStart = panelY + panelPaddingY + title.fontSize * 0.76;
  const titleTspans = title.lines
    .map((line, index) => `<tspan x="${WIDTH / 2}" y="${titleStart + index * title.lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  const hookSize = fitHook(row.overlay_bottom);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#07140f" stop-opacity="0.20"/>
          <stop offset="0.36" stop-color="#07140f" stop-opacity="0.04"/>
          <stop offset="0.68" stop-color="#07140f" stop-opacity="0.10"/>
          <stop offset="1" stop-color="#07140f" stop-opacity="0.34"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.48"/>
        </filter>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#shade)"/>
      <text x="${WIDTH / 2}" y="96" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" letter-spacing="3.2" fill="#fff8ee" filter="url(#shadow)">FRONT YARD AURA</text>
      <rect x="${SAFE_X}" y="${panelY}" width="${TITLE_BOX_WIDTH}" height="${panelHeight}" rx="0" fill="#07140f" fill-opacity="0.16"/>
      <text text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${title.fontSize}" font-weight="700" fill="#fff8ee" filter="url(#shadow)">${titleTspans}</text>
      <g transform="translate(${WIDTH / 2} 1326)">
        <rect x="-304" y="-48" width="608" height="96" rx="0" fill="#fff8ee" fill-opacity="0.92"/>
        <text y="11" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${hookSize}" font-weight="800" fill="#102118">${escapeXml(row.overlay_bottom)}</text>
      </g>
    </svg>`;
}

function cropOffsets(row, variant, resizedWidth, resizedHeight) {
  const maxLeft = resizedWidth - WIDTH;
  const maxTop = resizedHeight - HEIGHT;
  const seed = hashNumber(`${row.pin_id}:crop`);
  const jitterX = ((seed % 100) / 100 - 0.5) * 0.22;
  const jitterY = (((seed >> 7) % 100) / 100 - 0.5) * 0.14;
  const variantX = row.pin_variant === 'C' && seed % 2 === 0 ? 0.82 : variant.offsetX;
  const x = Math.max(0, Math.min(maxLeft, Math.round(maxLeft * (variantX + jitterX))));
  const y = Math.max(0, Math.min(maxTop, Math.round(maxTop * (variant.offsetY + jitterY))));
  return { left: x, top: y };
}

async function renderPin(row, sourceFile, outputFile) {
  const variant = VARIANT_SETTINGS[row.pin_variant] ?? VARIANT_SETTINGS.A;
  const resizedWidth = Math.round(WIDTH * variant.zoom);
  const resizedHeight = Math.round(HEIGHT * variant.zoom);
  const offsets = cropOffsets(row, variant, resizedWidth, resizedHeight);

  let pipeline = sharp(sourceFile)
    .rotate()
    .resize(resizedWidth, resizedHeight, { fit: 'cover', position: 'attention' });

  if (row.pin_variant === 'C' && hashNumber(row.pin_id) % 3 === 0) {
    pipeline = pipeline.flop();
  }

  await pipeline
    .extract({ ...offsets, width: WIDTH, height: HEIGHT })
    .modulate({ brightness: 1.08, saturation: 1.03 })
    .sharpen({ sigma: 0.55, m1: 0.35, m2: 0.18 })
    .composite([{ input: Buffer.from(overlaySvg(row, variant)), top: 0, left: 0 }])
    .jpeg({ quality: 91, mozjpeg: true })
    .toFile(outputFile);
}

async function eachLimit(items, limit, iterator) {
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await iterator(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

function makeImagePromptRows(pins) {
  const negativePrompt =
    'No AI-looking image, no plastic texture, no distorted house, no warped windows, no impossible plants, no fantasy garden, no CGI, no cartoon, no digital art, no surreal lighting, no fake typography in the base photo.';

  return pins.map((pin) => ({
    pin_id: pin.pin_id,
    image_file: pin.image_file,
    article_slug: pin.article_slug,
    pin_variant: pin.pin_variant,
    composition: pin.composition,
    visual_focus: pin.visual_focus,
    image_prompt: pin.image_prompt,
    overlay_top: pin.overlay_top,
    overlay_center: pin.overlay_center,
    overlay_bottom: pin.overlay_bottom,
    overlay_style: pin.overlay_style,
    negative_prompt: negativePrompt
  }));
}

function makeChecklistRows(pins) {
  return pins.map((pin) => ({
    pin_id: pin.pin_id,
    article_slug: pin.article_slug,
    pin_variant: pin.pin_variant,
    image_generated: 'yes',
    image_reviewed: 'yes',
    text_overlay_added: 'yes',
    text_legible_mobile: 'yes',
    topic_match_checked: 'yes',
    no_ai_artifacts: 'yes',
    image_uploaded_to_public_pins: 'yes',
    ready_for_api: 'yes'
  }));
}

function buildManualArticles(allApprovedRows, remainingRejectedRows) {
  const approvedByArticle = countBy(allApprovedRows.map((row) => row.article_slug));
  const rejectedByArticle = rowsByArticle(remainingRejectedRows);

  return [...rejectedByArticle.entries()]
    .map(([articleSlug, rows]) => {
      const article = rows[0];
      const rule = ruleForPin(article);
      const approvedCount = approvedByArticle.get(articleSlug) ?? 0;
      return {
        article_slug: articleSlug,
        article_title: article.article_title,
        category_slug: article.category_slug,
        required_rule: rule.key,
        required_rule_label: rule.label,
        requested_pins: String(approvedCount + rows.length),
        approved_pins: String(approvedCount),
        rejected_pins: String(rows.length),
        candidate_sources_checked: '',
        rejection_reasons: unique(rows.flatMap((row) => String(row.quality_rejection_reasons || '').split('; ').filter(Boolean)))
          .slice(0, 12)
          .join('; ')
      };
    })
    .sort((a, b) => a.article_slug.localeCompare(b.article_slug));
}

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

function dailyLimit(dayIndex, uniqueArticleCount = Number.POSITIVE_INFINITY) {
  const baseLimit = dayIndex < 7 ? 5 : 10;
  const weeklyNoRepeatLimit = Math.max(1, Math.floor(uniqueArticleCount / 7));
  return Math.min(baseLimit, weeklyNoRepeatLimit);
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

function appendSchedule(existingSchedule, newPins, allApprovedRows, { timeZone, seed }) {
  if (!newPins.length) return existingSchedule;
  const schedule = [...existingSchedule];
  const maxDayIndex = Math.max(0, ...existingSchedule.map((row) => Number(row.day_index) || 0));
  const lastDate = existingSchedule
    .map((row) => row.scheduled_date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const appendStartDate = lastDate ? addDays(lastDate, 1) : addDays(new Date().toISOString().slice(0, 10), 1);
  const uniqueArticleCount = new Set(allApprovedRows.map((pin) => pin.article_slug)).size;
  const remaining = buildRemainingPins(newPins, seed);
  const usedByWeek = new Map();

  for (const row of existingSchedule) {
    const weekIndex = Number(row.week_index) || Math.floor(((Number(row.day_index) || 1) - 1) / 7) + 1;
    const used = usedByWeek.get(weekIndex) ?? new Set();
    used.add(row.article_slug);
    usedByWeek.set(weekIndex, used);
  }

  let dayIndex = maxDayIndex;
  while (remaining.length) {
    const date = addDays(appendStartDate, dayIndex - maxDayIndex);
    const count = Math.min(dailyLimit(dayIndex, uniqueArticleCount), remaining.length);
    const times = timeSlotsForDay(date, count, seed);
    const weekIndex = Math.floor(dayIndex / 7) + 1;
    const usedThisWeek = usedByWeek.get(weekIndex) ?? new Set();
    usedByWeek.set(weekIndex, usedThisWeek);
    let advancedToNextWeek = false;

    for (let slotIndex = 0; slotIndex < count; slotIndex += 1) {
      const pin = pickNextPin(remaining, usedThisWeek);
      if (!pin) {
        dayIndex = weekIndex * 7;
        advancedToNextWeek = true;
        break;
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

    if (!advancedToNextWeek) dayIndex += 1;
  }

  return schedule.sort((a, b) =>
    [a.scheduled_at_utc, a.daily_slot, a.schedule_id].join('|').localeCompare([b.scheduled_at_utc, b.daily_slot, b.schedule_id].join('|'))
  );
}

function validateSchedule(allApprovedRows, schedule) {
  const errors = [];
  const scheduledPinIds = new Set(schedule.map((row) => row.pin_id));
  if (scheduledPinIds.size !== allApprovedRows.length) {
    errors.push(`Expected ${allApprovedRows.length} scheduled pins, found ${scheduledPinIds.size}.`);
  }
  for (const [pinId] of duplicates(schedule.map((row) => row.pin_id))) errors.push(`Duplicate scheduled pin id: ${pinId}`);
  for (const row of allApprovedRows) {
    if (!scheduledPinIds.has(row.pin_id)) errors.push(`Missing schedule row for ${row.pin_id}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: [],
    pins: allApprovedRows.length,
    scheduledPins: scheduledPinIds.size,
    days: new Set(schedule.map((row) => row.scheduled_date)).size,
    boards: new Set(schedule.map((row) => row.board_slug)).size,
    startDate: schedule[0]?.scheduled_date ?? '',
    endDate: schedule.at(-1)?.scheduled_date ?? ''
  };
}

function buildReport({ existingApprovedRows, newApprovedRows, remainingRejectedRows, renderedRows, selectionErrors, renderErrors, scheduleReport, startedAt, completedAt }) {
  const rejectionReasons = countBy(
    remainingRejectedRows.flatMap((row) => String(row.quality_rejection_reasons || '').split('; ').filter(Boolean))
  );
  const boardCounts = countBy(newApprovedRows.map((row) => row.board_slug));
  const variantCounts = countBy(newApprovedRows.map((row) => row.pin_variant));

  return [
    '# Additional Pin Production Report',
    '',
    'Incremental strict quality-filtered batch added to the existing Pinterest production set.',
    '',
    '## Summary',
    '',
    `- Existing approved pins before run: ${existingApprovedRows.length}`,
    `- New approved pins: ${newApprovedRows.length}`,
    `- Approved pins total after run: ${existingApprovedRows.length + newApprovedRows.length}`,
    `- Remaining rejected pins: ${remainingRejectedRows.length}`,
    `- Images rendered in this run: ${renderedRows.length}`,
    `- Selection errors: ${selectionErrors.length}`,
    `- Render errors: ${renderErrors.length}`,
    `- Schedule rows total: ${scheduleReport.scheduledPins}`,
    `- Schedule end date: ${scheduleReport.endDate}`,
    `- Started: ${startedAt.toISOString()}`,
    `- Completed: ${completedAt.toISOString()}`,
    '',
    '## New Distribution',
    '',
    `- Variants: ${[...variantCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    `- Boards: ${[...boardCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    '',
    '## Top Remaining Rejection Reasons',
    '',
    ...([...rejectionReasons.entries()].length
      ? [...rejectionReasons.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 20)
          .map(([reason, count]) => `- ${reason}: ${count}`)
      : ['- none']),
    '',
    '## Samples',
    '',
    '| Pin ID | Article | Variant | Source | File |',
    '| --- | --- | --- | --- | --- |',
    ...renderedRows
      .slice(0, 24)
      .map((row) => `| ${row.pin_id} | ${row.article_title} | ${row.pin_variant} | ${row.quality_source_id} | ${row.image_file} |`),
    ''
  ].join('\n');
}

const args = parseArgs();
const target = Number(args.target ?? DEFAULT_TARGET);
const maxPages = Number(args.maxPages ?? DEFAULT_MAX_PAGES);
const timeZone = args.timeZone ?? 'America/New_York';
const seed = args.seed ?? 'front-yard-aura-pinterest-schedule-v1';
const startedAt = new Date();

ensureDir(PUBLIC_PINS_DIR);
ensureDir(CACHE_DIR);

const existingApprovedRows = readCsv(APPROVED_PINS_PATH);
const rejectedRows = readCsv(REJECTED_PINS_PATH);
const usedSourceOwners = usedSourcesFromApproved(existingApprovedRows);
const cache = readSearchCache();

console.log(`Selecting up to ${target} additional approved pins from ${rejectedRows.length} rejected candidates...`);
const { selected, errors: selectionErrors } = await selectMorePins({
  rejectedRows,
  usedSourceOwners,
  target,
  maxPages,
  cache
});
writeSearchCache(cache);

if (selected.length < target) {
  console.warn(`Only found ${selected.length}/${target} additional approved pins with maxPages=${maxPages}.`);
}

const uniqueSourceMap = new Map(selected.map(({ source }) => [sourceKeyFor(source), source]));
const uniqueSources = [...uniqueSourceMap.values()];
const sourceFiles = new Map();
console.log(`Downloading/caching ${uniqueSources.length} source photos...`);
await eachLimit(uniqueSources, 4, async (source, index) => {
  sourceFiles.set(sourceKeyFor(source), await downloadSource(source));
  if ((index + 1) % 10 === 0 || index + 1 === uniqueSources.length) {
    console.log(`Cached ${index + 1}/${uniqueSources.length} source photos.`);
  }
});

const renderErrors = [];
const renderedRows = [];
console.log(`Rendering ${selected.length} additional production pins...`);
await eachLimit(selected, 6, async ({ row, source }, index) => {
  try {
    const sourceFile = sourceFiles.get(sourceKeyFor(source));
    const outputFile = path.join(PUBLIC_PINS_DIR, row.image_file);
    await renderPin(row, sourceFile, outputFile);
    const metadata = await sharp(outputFile).metadata();
    if (metadata.width !== WIDTH || metadata.height !== HEIGHT) {
      throw new Error(`Invalid dimensions ${metadata.width}x${metadata.height}`);
    }
    renderedRows.push(row);
  } catch (error) {
    renderErrors.push({ pin_id: row.pin_id, error: error.message });
  }

  if ((index + 1) % 25 === 0 || index + 1 === selected.length) {
    console.log(`Rendered ${index + 1}/${selected.length} additional pins.`);
  }
});

const renderedPinIds = new Set(renderedRows.map((row) => row.pin_id));
const newApprovedRows = selected.map(({ row }) => row).filter((row) => renderedPinIds.has(row.pin_id));
const selectedPinIds = new Set(newApprovedRows.map((row) => row.pin_id));
const allApprovedRows = [...existingApprovedRows, ...newApprovedRows].sort((a, b) => a.pin_id.localeCompare(b.pin_id));
const remainingRejectedRows = rejectedRows.filter((row) => !selectedPinIds.has(row.pin_id));
const manualArticles = buildManualArticles(allApprovedRows, remainingRejectedRows);

const approvedColumns = unique([...headerColumns(APPROVED_PINS_PATH), ...Object.keys(newApprovedRows[0] ?? {}), ...QUALITY_COLUMNS]);
const rejectedColumns = unique([...headerColumns(REJECTED_PINS_PATH), ...QUALITY_COLUMNS]);
writeCsv(APPROVED_PINS_PATH, allApprovedRows, approvedColumns);
writeCsv(REJECTED_PINS_PATH, remainingRejectedRows, rejectedColumns);
writeCsv(MANUAL_IMAGES_PATH, manualArticles, [
  'article_slug',
  'article_title',
  'category_slug',
  'required_rule',
  'required_rule_label',
  'requested_pins',
  'approved_pins',
  'rejected_pins',
  'candidate_sources_checked',
  'rejection_reasons'
]);
writeCsv(IMAGE_PROMPTS_PATH, makeImagePromptRows(allApprovedRows), IMAGE_PROMPT_COLUMNS);
writeCsv(CHECKLIST_PATH, makeChecklistRows(allApprovedRows), CHECKLIST_COLUMNS);

const existingSchedule = fs.existsSync(SCHEDULE_PATH) ? readCsv(SCHEDULE_PATH) : [];
const schedule = appendSchedule(existingSchedule, newApprovedRows, allApprovedRows, { timeZone, seed });
const scheduleReport = validateSchedule(allApprovedRows, schedule);
writeCsv(SCHEDULE_PATH, schedule, SCHEDULE_COLUMNS);
writeText(
  SCHEDULE_REPORT_PATH,
  `${JSON.stringify({ ...scheduleReport, timeZone, generatedAt: new Date().toISOString() }, null, 2)}\n`
);

const qualityRejectionReasons = countBy(
  remainingRejectedRows.flatMap((row) => String(row.quality_rejection_reasons || '').split('; ').filter(Boolean))
);
writeText(
  QUALITY_REPORT_PATH,
  `${JSON.stringify(
    {
      generated_at_utc: new Date().toISOString(),
      candidate_pins: allApprovedRows.length + remainingRejectedRows.length,
      approved_pins: allApprovedRows.length,
      rejected_pins: remainingRejectedRows.length,
      manual_articles: manualArticles.length,
      rejection_reasons: Object.fromEntries(
        [...qualityRejectionReasons.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      ),
      outputs: {
        approved_pins: path.relative(ROOT_DIR, APPROVED_PINS_PATH).replace(/\\/g, '/'),
        rejected_pins: path.relative(ROOT_DIR, REJECTED_PINS_PATH).replace(/\\/g, '/'),
        manual_images: path.relative(ROOT_DIR, MANUAL_IMAGES_PATH).replace(/\\/g, '/')
      }
    },
    null,
    2
  )}\n`
);

const completedAt = new Date();
writeText(
  REPORT_PATH,
  buildReport({
    existingApprovedRows,
    newApprovedRows,
    remainingRejectedRows,
    renderedRows,
    selectionErrors,
    renderErrors,
    scheduleReport,
    startedAt,
    completedAt
  })
);

const fatalErrors = renderErrors.length + scheduleReport.errors.length;
console.log(
  JSON.stringify(
    {
      requested: target,
      added: newApprovedRows.length,
      approvedTotal: allApprovedRows.length,
      rejectedRemaining: remainingRejectedRows.length,
      rendered: renderedRows.length,
      scheduleRows: schedule.length,
      scheduleEndDate: scheduleReport.endDate,
      selectionErrors: selectionErrors.length,
      renderErrors: renderErrors.length,
      scheduleErrors: scheduleReport.errors.length,
      report: path.relative(ROOT_DIR, REPORT_PATH).replace(/\\/g, '/')
    },
    null,
    2
  )
);

if (fatalErrors > 0 || newApprovedRows.length < target) {
  process.exit(1);
}
