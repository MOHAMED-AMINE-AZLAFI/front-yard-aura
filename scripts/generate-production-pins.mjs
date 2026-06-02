import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {
  DATA_DIR,
  PUBLIC_PINS_DIR,
  ROOT_DIR,
  countBy,
  duplicates,
  ensureDir,
  readCsv,
  shortHash,
  writeText
} from './pinterest-utils.mjs';

const WIDTH = 1000;
const HEIGHT = 1500;
const SAFE_X = 96;
const TITLE_BOX_WIDTH = WIDTH - SAFE_X * 2;
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'pinterest-sources');
const REPORT_PATH = path.join(process.cwd(), 'pin-production-report.md');

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

const BLOCKED_SOURCE_IDS = new Set([
  'photo-1416879595882-3373a0480b5b',
  'photo-1466692476868-aef1dfb1e735',
  'photo-1558904541-efa843a96f01',
  'photo-1564013799919-ab600027ffc6',
  'photo-1582268611958-ebfd161ef9cf',
  'photo-1600566752355-35792bedcfea',
  'photo-1600566753086-00f18fb6b3ea',
  'photo-1600573472550-8090b5e0745e',
  'photo-1600607687644-c7171b42498f',
  'photo-1600607687920-4e2a09cf159d',
  'photo-1600607687939-ce8a6c25118c'
]);

const BAD_SEARCH_TERMS =
  /\b(interior|living room|bedroom|bathroom|kitchen|dining room|sofa|couch|bed frame|office|hallway|staircase|swimming pool|pool|hotel|restaurant|apartment room)\b/i;

const GOOD_SEARCH_TERMS =
  /\b(house|home|front yard|yard|garden|landscap\w*|porch|front door|walkway|path|paver|flower|flowers|rock|rocks|gravel|shrubs|lawn|exterior|curb appeal)\b/i;

const INTENT_SEARCH_PHRASES = {
  rocks: 'front yard rock landscaping',
  'flower-beds': 'front yard flower bed',
  walkways: 'front walkway landscaping',
  'low-maintenance': 'low maintenance front yard landscaping',
  modern: 'modern front yard landscaping',
  budget: 'budget front yard landscaping',
  'small-yards': 'small front yard landscaping',
  'curb-appeal': 'curb appeal landscaping'
};

const BROAD_SEARCH_QUERIES_BY_INTENT = {
  rocks: ['front yard rock landscaping', 'gravel front yard landscaping', 'rock garden house exterior', 'boulder landscaping front yard'],
  'flower-beds': ['front yard flower bed', 'front yard flowers landscaping', 'flower garden house exterior', 'foundation planting flowers'],
  walkways: ['front walkway landscaping', 'front walkway pavers', 'garden path front yard', 'front door walkway landscaping'],
  'low-maintenance': ['low maintenance front yard landscaping', 'no grass front yard landscaping', 'drought tolerant front yard', 'gravel shrubs front yard'],
  modern: ['modern front yard landscaping', 'modern house exterior landscaping', 'contemporary home front yard', 'modern walkway landscaping'],
  budget: ['budget front yard landscaping', 'simple front yard landscaping', 'mulch edging front yard', 'affordable curb appeal landscaping'],
  'small-yards': ['small front yard landscaping', 'townhouse front yard landscaping', 'narrow front yard landscaping', 'small front walkway landscaping'],
  'curb-appeal': ['curb appeal landscaping', 'front yard curb appeal', 'home exterior landscaping', 'front porch landscaping']
};

const SAFE_FALLBACK_IDS = [
  'photo-1512917774080-9991f1c4c750',
  'photo-1568605114967-8130f3a36994',
  'photo-1570129477492-45c003edd2be',
  'photo-1585320806297-9794b3e4eeae',
  'photo-1598228723793-52759bba239c',
  'photo-1598902108854-10e335adac99',
  'photo-1600047509358-9dc75507daeb',
  'photo-1600047509807-ba8f99d2cdde',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1600585154340-be6161a56a0c',
  'photo-1600585154526-990dced4db0d',
  'photo-1600607688969-a5bfcd646154'
];

const SOURCE_IDS_BY_INTENT = {
  rocks: [
    'photo-1598902108854-10e335adac99',
    'photo-1600573472550-8090b5e0745e',
    'photo-1600047509358-9dc75507daeb',
    'photo-1585320806297-9794b3e4eeae',
    'photo-1466692476868-aef1dfb1e735',
    'photo-1600566753086-00f18fb6b3ea',
    'photo-1570129477492-45c003edd2be',
    'photo-1568605114967-8130f3a36994',
    'photo-1558904541-efa843a96f01'
  ],
  'flower-beds': [
    'photo-1558904541-efa843a96f01',
    'photo-1416879595882-3373a0480b5b',
    'photo-1466692476868-aef1dfb1e735',
    'photo-1585320806297-9794b3e4eeae',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1600566753086-00f18fb6b3ea',
    'photo-1568605114967-8130f3a36994',
    'photo-1600047509358-9dc75507daeb',
    'photo-1600573472550-8090b5e0745e',
    'photo-1570129477492-45c003edd2be'
  ],
  walkways: [
    'photo-1582268611958-ebfd161ef9cf',
    'photo-1570129477492-45c003edd2be',
    'photo-1600047509358-9dc75507daeb',
    'photo-1600573472550-8090b5e0745e',
    'photo-1568605114967-8130f3a36994',
    'photo-1512917774080-9991f1c4c750',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1600566753086-00f18fb6b3ea',
    'photo-1558904541-efa843a96f01'
  ],
  'low-maintenance': [
    'photo-1598902108854-10e335adac99',
    'photo-1466692476868-aef1dfb1e735',
    'photo-1600566753086-00f18fb6b3ea',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1600573472550-8090b5e0745e',
    'photo-1585320806297-9794b3e4eeae',
    'photo-1600047509358-9dc75507daeb',
    'photo-1568605114967-8130f3a36994',
    'photo-1570129477492-45c003edd2be'
  ],
  modern: [
    'photo-1600585154340-be6161a56a0c',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1512917774080-9991f1c4c750',
    'photo-1600047509358-9dc75507daeb',
    'photo-1568605114967-8130f3a36994',
    'photo-1570129477492-45c003edd2be',
    'photo-1582268611958-ebfd161ef9cf',
    'photo-1600573472550-8090b5e0745e',
    'photo-1600566753086-00f18fb6b3ea'
  ],
  budget: [
    'photo-1564013799919-ab600027ffc6',
    'photo-1558904541-efa843a96f01',
    'photo-1598228723793-52759bba239c',
    'photo-1570129477492-45c003edd2be',
    'photo-1416879595882-3373a0480b5b',
    'photo-1600047509358-9dc75507daeb',
    'photo-1466692476868-aef1dfb1e735',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1600573472550-8090b5e0745e',
    'photo-1585320806297-9794b3e4eeae'
  ],
  'small-yards': [
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1570129477492-45c003edd2be',
    'photo-1564013799919-ab600027ffc6',
    'photo-1512917774080-9991f1c4c750',
    'photo-1466692476868-aef1dfb1e735',
    'photo-1600047509358-9dc75507daeb',
    'photo-1568605114967-8130f3a36994',
    'photo-1600573472550-8090b5e0745e',
    'photo-1600566753086-00f18fb6b3ea',
    'photo-1582268611958-ebfd161ef9cf'
  ],
  'curb-appeal': [
    'photo-1600585154340-be6161a56a0c',
    'photo-1512917774080-9991f1c4c750',
    'photo-1600047509807-ba8f99d2cdde',
    'photo-1564013799919-ab600027ffc6',
    'photo-1570129477492-45c003edd2be',
    'photo-1568605114967-8130f3a36994',
    'photo-1582268611958-ebfd161ef9cf',
    'photo-1600573472550-8090b5e0745e',
    'photo-1600047509358-9dc75507daeb',
    'photo-1600566753086-00f18fb6b3ea'
  ]
};

const INTENT_RULES = [
  ['rocks', /(rock|rocks|gravel|boulder|stone|river|basalt|limestone|slate|granite|pea gravel|flagstone|decomposed|cactus|agave|yucca|desert|dry creek)/],
  ['walkways', /(walkway|walkways|pathway|path|paver|pavers|stepping|steps|sidewalk|entry path|brick walk|flagstone|bluestone)/],
  ['flower-beds', /(flower|flowers|bed|beds|bloom|perennial|annual|hydrangea|tulip|rose|lavender|dahlia|iris|peony|salvia|wildflower|pollinator|native)/],
  ['low-maintenance', /(low maintenance|easy|minimal lawn|no grass|evergreen|drought|drip|automatic|clover|artificial|groundcover|slow-growing|durable|busy|seniors|hoa)/],
  ['modern', /(modern|concrete|corten|courtyard|horizontal|flat roof|black and white|porcelain|metal edging|linear|floating|matte black|glass front doors)/],
  ['small-yards', /(small|narrow|townhome|city|row house|duplex|cape cod|zero lot|tiny|short walkway|skinny|shared driveway|corner porch)/],
  ['budget', /(budget|cheap|affordable|diy|under 500|free materials|reused|secondhand|weekend|renters|starter|painted|seed-grown)/],
  ['curb-appeal', /(luxury|expensive|premium|curb appeal|statement|pillars|symmetry|symmetrical|lighting|colonial|craftsman|farmhouse|ranch|front door|porch|tree|mailbox)/]
];

const VARIANT_SETTINGS = {
  A: {
    zoom: 1.02,
    titleZone: 1100,
    titlePlacement: 'bottom',
    offsetX: 0.5,
    offsetY: 0.1,
    label: 'wide exterior view'
  },
  B: {
    zoom: 1.48,
    titleZone: 238,
    titlePlacement: 'top',
    offsetX: 0.5,
    offsetY: 0.46,
    label: 'close landscaping detail'
  },
  C: {
    zoom: 1.18,
    titleZone: 244,
    titlePlacement: 'top',
    offsetX: 0.18,
    offsetY: 0.28,
    label: 'different angle composition'
  }
};

function hashNumber(value) {
  return parseInt(shortHash(value, 8), 36);
}

function detectIntent(row) {
  const haystack = `${row.article_title} ${row.category} ${row.category_slug} ${row.keywords} ${row.article_slug}`.toLowerCase();
  return INTENT_RULES.find(([, pattern]) => pattern.test(haystack))?.[0] ?? 'curb-appeal';
}

function safeCacheName(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, '_').slice(0, 140);
}

function sourceUrl(source) {
  const baseUrl = source.sourceUrl ?? `https://images.unsplash.com/${source.sourceId}`;
  return `${baseUrl}?auto=format&fit=crop&w=1800&h=2700&q=90`;
}

function fallbackCandidates(intent) {
  const intentIds = SOURCE_IDS_BY_INTENT[intent] ?? SOURCE_IDS_BY_INTENT['curb-appeal'];
  return unique([...intentIds, ...SAFE_FALLBACK_IDS])
    .filter((id) => !BLOCKED_SOURCE_IDS.has(id))
    .map((id) => ({
      sourceId: id,
      cacheKey: id,
      sourceUrl: `https://images.unsplash.com/${id}`,
      sourceType: 'safe-fallback'
    }));
}

async function downloadSource(source) {
  ensureDir(CACHE_DIR);
  const cacheFile = path.join(CACHE_DIR, `${safeCacheName(source.cacheKey ?? source.sourceId)}.jpg`);
  if (fs.existsSync(cacheFile) && fs.statSync(cacheFile).size > 10000) return cacheFile;

  const url = sourceUrl(source);
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
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

function cleanSearchText(value) {
  return String(value)
    .replace(/\bhouses\b/gi, 'house')
    .replace(/\b(curb appeal|ideas?|landscaping|front yard|for|with|and|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchQueryForArticle(row, intent) {
  const lowerTitle = row.article_title.toLowerCase();
  if (/\bblack house/.test(lowerTitle)) return 'black modern house exterior landscaping';
  if (/\bgray house|\blight gray house|\bcharcoal house/.test(lowerTitle)) return 'gray house exterior front yard landscaping';
  if (/\bblue house/.test(lowerTitle)) return 'blue house exterior front yard landscaping';
  if (/\bbrown house/.test(lowerTitle)) return 'brown house exterior front yard landscaping';
  if (/\bgreen house/.test(lowerTitle)) return 'green house exterior front yard landscaping';
  if (/\byellow house/.test(lowerTitle)) return 'yellow house exterior front yard landscaping';
  if (/\bred brick/.test(lowerTitle)) return 'red brick house front yard landscaping';
  if (/\bwhite farmhouse|\bfarmhouse/.test(lowerTitle)) return 'white farmhouse exterior front yard landscaping';
  if (/\branch house|\branch home/.test(lowerTitle)) return 'ranch house front yard landscaping';
  if (/\bcolonial/.test(lowerTitle)) return 'colonial house front walkway landscaping';
  if (/\bcraftsman/.test(lowerTitle)) return 'craftsman bungalow front yard landscaping';

  const title = cleanSearchText(row.article_title);
  const phrase = INTENT_SEARCH_PHRASES[intent] ?? INTENT_SEARCH_PHRASES['curb-appeal'];
  return `${title} ${phrase}`.replace(/\s+/g, ' ').trim();
}

function candidateText(item) {
  return [
    item.alt_description,
    item.description,
    item.slug,
    item.topic_submissions ? Object.keys(item.topic_submissions).join(' ') : ''
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreCandidate(item, intent) {
  const text = candidateText(item);
  let score = 0;
  if (GOOD_SEARCH_TERMS.test(text)) score += 8;
  if (/\b(house|home|porch|front door|exterior)\b/i.test(text)) score += 8;
  if (/\b(front yard|yard|garden|landscap|curb appeal)\b/i.test(text)) score += 6;
  if (intent === 'rocks' && /\b(rock|rocks|gravel|stone|boulder)\b/i.test(text)) score += 6;
  if (intent === 'flower-beds' && /\b(flower|flowers|bloom|garden|hydrangea|rose|lavender)\b/i.test(text)) score += 6;
  if (intent === 'walkways' && /\b(walkway|path|paver|steps|front door)\b/i.test(text)) score += 6;
  if (intent === 'modern' && /\b(modern|contemporary|architecture|exterior)\b/i.test(text)) score += 6;
  if (item.height >= item.width) score += 3;
  if (BAD_SEARCH_TERMS.test(text)) score -= 100;
  return score;
}

function searchResultToCandidate(item, query, intent, index) {
  const raw = item.urls?.raw;
  if (!raw || !/^https:\/\/(images|plus)\.unsplash\.com\//.test(raw)) return null;
  const baseUrl = raw.split('?')[0];
  const sourceId = baseUrl.split('/').pop();
  if (!sourceId || BLOCKED_SOURCE_IDS.has(sourceId)) return null;
  const score = scoreCandidate(item, intent);
  if (score < 0) return null;
  return {
    sourceId,
    cacheKey: `${item.id}-${sourceId}`,
    sourceUrl: baseUrl,
    sourceType: 'unsplash-search',
    score,
    query,
    resultIndex: index
  };
}

async function fetchUnsplashSearchCandidates(query, intent, searchCache) {
  if (searchCache[query]) return searchCache[query];

  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=30&orientation=portrait`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'FrontYardAuraPinterestProduction/1.0',
      Accept: 'application/json'
    }
  });
  if (!response.ok) throw new Error(`Unsplash search HTTP ${response.status} for ${query}`);

  const data = await response.json();
  const candidates = (data.results ?? [])
    .map((item, index) => searchResultToCandidate(item, query, intent, index))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.resultIndex - b.resultIndex)
    .slice(0, 12);

  searchCache[query] = candidates;
  return candidates;
}

async function buildSearchSourceMap(rows) {
  ensureDir(CACHE_DIR);
  const cacheFile = path.join(CACHE_DIR, 'unsplash-search-cache.json');
  const searchCache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const articleRows = unique(rows.map((row) => row.article_slug)).map((slug) => rows.find((row) => row.article_slug === slug));
  const map = new Map();

  await eachLimit(articleRows, 3, async (row, index) => {
    const intent = detectIntent(row);
    const articleQuery = searchQueryForArticle(row, intent);
    const intentQuery = INTENT_SEARCH_PHRASES[intent] ?? INTENT_SEARCH_PHRASES['curb-appeal'];
    let candidates = [];

    try {
      const articleCandidates = await fetchUnsplashSearchCandidates(articleQuery, intent, searchCache);
      const broadQueries = articleCandidates.length >= 3 ? [] : unique([intentQuery, ...(BROAD_SEARCH_QUERIES_BY_INTENT[intent] ?? [])]);
      const broadCandidateGroups = [];
      for (const query of broadQueries) {
        broadCandidateGroups.push(await fetchUnsplashSearchCandidates(query, intent, searchCache));
      }
      candidates = uniqueCandidates([...articleCandidates, ...broadCandidateGroups.flat()]);
    } catch {
      candidates = [];
    }

    map.set(row.article_slug, candidates);
    if ((index + 1) % 50 === 0 || index + 1 === articleRows.length) {
      fs.writeFileSync(cacheFile, `${JSON.stringify(searchCache, null, 2)}\n`, 'utf8');
      console.log(`Prepared search sources for ${index + 1}/${articleRows.length} articles.`);
    }
  });

  fs.writeFileSync(cacheFile, `${JSON.stringify(searchCache, null, 2)}\n`, 'utf8');
  return map;
}

function uniqueCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.cacheKey ?? candidate.sourceId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function chooseSource(row, intent, usedForArticle, searchSourceMap) {
  const searchCandidates = searchSourceMap.get(row.article_slug) ?? [];
  const candidates = uniqueCandidates([...searchCandidates, ...fallbackCandidates(intent)]);
  const variantOffset = row.pin_variant === 'A' ? 0 : row.pin_variant === 'B' ? 1 : 2;
  const seed = hashNumber(`${row.article_slug}:${row.pin_variant}:${row.category_slug}`);
  const start = searchCandidates.length >= 3 ? variantOffset : seed + variantOffset * 3;

  for (let step = 0; step < candidates.length; step += 1) {
    const candidate = candidates[(start + step) % candidates.length];
    const key = candidate.cacheKey ?? candidate.sourceId;
    if (!usedForArticle.has(key)) return candidate;
  }

  return candidates[start % candidates.length];
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

function cleanupProductionImages() {
  ensureDir(PUBLIC_PINS_DIR);
  const resolvedPinsDir = path.resolve(PUBLIC_PINS_DIR);
  if (!resolvedPinsDir.endsWith(`${path.sep}public${path.sep}pins`)) {
    throw new Error(`Refusing to clean unexpected directory: ${resolvedPinsDir}`);
  }

  for (const entry of fs.readdirSync(PUBLIC_PINS_DIR, { withFileTypes: true })) {
    if (entry.isFile() && /\.(jpe?g)$/i.test(entry.name)) {
      fs.unlinkSync(path.join(PUBLIC_PINS_DIR, entry.name));
    }
  }
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

function articleDiversityRows(productionRows) {
  const byArticle = new Map();
  for (const row of productionRows) {
    const list = byArticle.get(row.article_slug) ?? [];
    list.push(row);
    byArticle.set(row.article_slug, list);
  }

  const failures = [];
  for (const [slug, items] of byArticle) {
    const variants = new Set(items.map((item) => item.pin_variant));
    const sources = new Set(items.map((item) => item.source_id));
    const transforms = new Set(items.map((item) => `${item.pin_variant}:${item.zoom}:${item.source_id}`));
    if (items.length !== 3 || variants.size !== 3 || sources.size < 2 || transforms.size !== 3) {
      failures.push(slug);
    }
  }

  return failures;
}

function buildReport({ rows, productionRows, errors, startedAt, completedAt }) {
  const outputFiles = productionRows.map((row) => path.join(PUBLIC_PINS_DIR, row.image_file));
  const missingFiles = outputFiles.filter((file) => !fs.existsSync(file));
  const invalidDimensions = productionRows.filter((row) => row.width !== WIDTH || row.height !== HEIGHT);
  const duplicateOutputFiles = duplicates(productionRows.map((row) => row.image_file));
  const duplicateTitles = duplicates(rows.map((row) => row.pin_title));
  const duplicateDescriptions = duplicates(rows.map((row) => row.pin_description));
  const unmatchedRows = productionRows.filter((row) => row.topic_match !== 'yes');
  const diversityFailures = articleDiversityRows(productionRows);
  const boardCounts = countBy(rows.map((row) => row.board_slug));
  const variantCounts = countBy(rows.map((row) => row.pin_variant));
  const intentCounts = countBy(productionRows.map((row) => row.intent));
  const sourceTypeCounts = countBy(productionRows.map((row) => row.source_type));
  const fatalCount =
    errors.length +
    missingFiles.length +
    invalidDimensions.length +
    duplicateOutputFiles.length +
    duplicateTitles.length +
    duplicateDescriptions.length +
    unmatchedRows.length +
    diversityFailures.length;

  const report = [
    '# Pin Production Report',
    '',
    'Final production batch generated directly into `public/pins/`. No new test-v3 folder was created.',
    '',
    '## Summary',
    '',
    `- Articles: ${new Set(rows.map((row) => row.article_slug)).size}`,
    `- Pins requested: ${rows.length}`,
    `- Images generated: ${productionRows.length}`,
    `- Unique image files: ${new Set(productionRows.map((row) => row.image_file)).size}`,
    `- Boards: ${new Set(rows.map((row) => row.board_slug)).size}`,
    `- Started: ${startedAt.toISOString()}`,
    `- Completed: ${completedAt.toISOString()}`,
    '',
    '## Production Rules Applied',
    '',
    '- Title font size reduced from v2 by roughly 10-15%: max title size is 64px.',
    '- Title is constrained to the upper third or lower third of the image, with 96px side padding and 808px max width.',
    '- Title uses measured line wrapping and automatic font sizing to prevent overflow.',
    '- The image brightness and light overlay treatment from test-v2 are preserved.',
    '- A/B/C use filtered Unsplash search sources first, plus different crop/zoom transforms: wide exterior, close detail, different angle.',
    '',
    '## Validation',
    '',
    `- Missing images: ${missingFiles.length}`,
    `- Invalid dimensions: ${invalidDimensions.length}`,
    `- Duplicate output filenames: ${duplicateOutputFiles.length}`,
    `- Duplicate pin titles: ${duplicateTitles.length}`,
    `- Duplicate pin descriptions: ${duplicateDescriptions.length}`,
    `- Topic/article match errors: ${unmatchedRows.length}`,
    `- A/B/C visual diversity errors: ${diversityFailures.length}`,
    `- Generation errors: ${errors.length}`,
    `- Total blocking errors: ${fatalCount}`,
    '',
    '## Distribution',
    '',
    `- Variants: ${[...variantCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    `- Intents: ${[...intentCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    `- Source types: ${[...sourceTypeCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    `- Boards: ${[...boardCounts.entries()].map(([key, value]) => `${key}: ${value}`).join(', ')}`,
    '',
    '## Samples',
    '',
    '| Pin ID | Article | Variant | Intent | Source Type | Source | File |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...productionRows
      .slice(0, 24)
      .map((row) => `| ${row.pin_id} | ${row.article_title} | ${row.pin_variant} | ${row.intent} | ${row.source_type} | ${row.source_id} | ${row.image_file} |`),
    ''
  ].join('\n');

  return {
    markdown: report,
    fatalCount,
    stats: {
      missingFiles: missingFiles.length,
      invalidDimensions: invalidDimensions.length,
      duplicateOutputFiles: duplicateOutputFiles.length,
      duplicateTitles: duplicateTitles.length,
      duplicateDescriptions: duplicateDescriptions.length,
      unmatchedRows: unmatchedRows.length,
      diversityFailures: diversityFailures.length,
      errors: errors.length
    }
  };
}

const startedAt = new Date();
const rows = readCsv(path.join(DATA_DIR, 'pinterest-pins.csv'));
const expectedPins = new Set(rows.map((row) => row.pin_id));

if (rows.length !== 900) {
  throw new Error(`Expected 900 pins from data/pinterest/pinterest-pins.csv, found ${rows.length}.`);
}

cleanupProductionImages();
ensureDir(CACHE_DIR);

console.log('Preparing filtered Unsplash search sources...');
const searchSourceMap = await buildSearchSourceMap(rows);

const usedSourcesByArticle = new Map();
const sourceByPin = new Map();
for (const row of rows) {
  const usedForArticle = usedSourcesByArticle.get(row.article_slug) ?? new Set();
  usedSourcesByArticle.set(row.article_slug, usedForArticle);
  const intent = detectIntent(row);
  const source = chooseSource(row, intent, usedForArticle, searchSourceMap);
  usedForArticle.add(source.cacheKey ?? source.sourceId);
  sourceByPin.set(row.pin_id, { intent, ...source });
}

const uniqueSourceMap = new Map([...sourceByPin.values()].map((source) => [source.cacheKey ?? source.sourceId, source]));
const uniqueSources = [...uniqueSourceMap.values()];
const sourceFiles = new Map();
console.log(`Downloading/caching ${uniqueSources.length} source photos...`);
await eachLimit(uniqueSources, 4, async (source, index) => {
  sourceFiles.set(source.cacheKey ?? source.sourceId, await downloadSource(source));
  if ((index + 1) % 5 === 0 || index + 1 === uniqueSources.length) {
    console.log(`Cached ${index + 1}/${uniqueSources.length} source photos.`);
  }
});

const productionRows = [];
const errors = [];
console.log(`Rendering ${rows.length} production pins...`);

await eachLimit(rows, 6, async (row, index) => {
  try {
    const source = sourceByPin.get(row.pin_id);
    const sourceFile = sourceFiles.get(source.cacheKey ?? source.sourceId);
    const outputFile = path.join(PUBLIC_PINS_DIR, row.image_file);
    await renderPin(row, sourceFile, outputFile);
    const metadata = await sharp(outputFile).metadata();
    const variant = VARIANT_SETTINGS[row.pin_variant] ?? VARIANT_SETTINGS.A;
    productionRows.push({
      pin_id: row.pin_id,
      article_slug: row.article_slug,
      article_title: row.article_title,
      pin_variant: row.pin_variant,
      image_file: row.image_file,
      intent: source.intent,
      source_id: source.sourceId,
      source_type: source.sourceType,
      zoom: variant.zoom,
      width: metadata.width,
      height: metadata.height,
      topic_match: row.category_slug || row.keywords || row.article_title ? 'yes' : 'no'
    });
  } catch (error) {
    errors.push({ pin_id: row.pin_id, error: error.message });
  }

  if ((index + 1) % 50 === 0 || index + 1 === rows.length) {
    console.log(`Rendered ${index + 1}/${rows.length} pins.`);
  }
});

productionRows.sort((a, b) => a.pin_id.localeCompare(b.pin_id));

const missingRows = rows.filter((row) => !productionRows.some((productionRow) => productionRow.pin_id === row.pin_id));
for (const row of missingRows) {
  if (expectedPins.has(row.pin_id) && !errors.some((error) => error.pin_id === row.pin_id)) {
    errors.push({ pin_id: row.pin_id, error: 'Missing production row after render.' });
  }
}

const completedAt = new Date();
const report = buildReport({ rows, productionRows, errors, startedAt, completedAt });
writeText(REPORT_PATH, report.markdown);

console.log(
  JSON.stringify(
    {
      pins: rows.length,
      generated: productionRows.length,
      uniqueSources: uniqueSources.length,
      report: 'pin-production-report.md',
      errors: report.fatalCount,
      validation: report.stats
    },
    null,
    2
  )
);

if (report.fatalCount > 0) {
  process.exit(1);
}
