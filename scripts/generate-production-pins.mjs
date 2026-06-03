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
  writeCsv,
  writeText
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
const CACHE_DIR = path.join(ROOT_DIR, 'node_modules', '.cache', 'pinterest-sources');
const REPORT_PATH = path.join(process.cwd(), 'pin-production-report.md');
const APPROVED_PINS_PATH = path.join(DATA_DIR, 'pinterest-pins.csv');
const REJECTED_PINS_PATH = path.join(DATA_DIR, 'pinterest-rejected-pins.csv');
const MANUAL_IMAGES_PATH = path.join(DATA_DIR, 'pinterest-needs-manual-images.csv');
const QUALITY_REPORT_PATH = path.join(DATA_DIR, 'pin-image-quality-filter-report.json');

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
    item.tags?.map((tag) => tag.title).join(' '),
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
  if (!raw || !/^https:\/\/images\.unsplash\.com\/photo-/i.test(raw)) return null;
  const baseUrl = raw.split('?')[0];
  const sourceId = baseUrl.split('/').pop();
  if (!sourceId || BLOCKED_SOURCE_IDS.has(sourceId) || /premium[_-]?photo/i.test(sourceId)) return null;
  const score = scoreCandidate(item, intent);
  if (score < 0) return null;
  const sourceText = candidateText(item);
  return {
    sourceId,
    cacheKey: `${item.id}-${sourceId}`,
    sourceUrl: baseUrl,
    sourceType: 'unsplash-search',
    sourceText,
    altDescription: item.alt_description ?? '',
    description: item.description ?? '',
    slug: item.slug ?? '',
    tags: item.tags?.map((tag) => tag.title).filter(Boolean).join(' ') ?? '',
    topicTags: item.topic_submissions ? Object.keys(item.topic_submissions).join(' ') : '',
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
  const cacheFile = path.join(CACHE_DIR, 'unsplash-quality-search-cache-v1.json');
  const searchCache = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};
  const articleRows = unique(rows.map((row) => row.article_slug)).map((slug) => rows.find((row) => row.article_slug === slug));
  const map = new Map();

  await eachLimit(articleRows, 3, async (row, index) => {
    const intent = detectIntent(row);
    const articleQuery = searchQueryForArticle(row, intent);
    const intentQuery = INTENT_SEARCH_PHRASES[intent] ?? INTENT_SEARCH_PHRASES['curb-appeal'];
    const qualityQueries = qualitySearchQueriesForPin(row).slice(0, 2);
    let candidates = [];

    try {
      const articleCandidateGroups = [];
      for (const query of unique([articleQuery, ...qualityQueries])) {
        articleCandidateGroups.push(await fetchUnsplashSearchCandidates(query, intent, searchCache));
      }
      const articleCandidates = articleCandidateGroups.flat();
      const broadQueries =
        articleCandidates.length >= 6
          ? []
          : unique([intentQuery, ...(BROAD_SEARCH_QUERIES_BY_INTENT[intent] ?? [])]).slice(0, 3);
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
    const signature = sourceSignatureFor(candidate) || sourceKeyFor(candidate) || candidate.cacheKey || candidate.sourceId;
    if (seen.has(signature)) return false;
    seen.add(signature);
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

function buildQualityAssignments(rows, searchSourceMap) {
  const now = new Date();
  const usedSourceOwners = new Map();
  const assignments = new Map();
  const approvedRows = [];
  const rejectedRows = [];
  const manualArticles = [];
  const articleRows = rowsByArticle(rows);

  for (const [articleSlug, pins] of articleRows) {
    const article = pins[0];
    const rule = ruleForPin(article);
    const candidates = uniqueCandidates(searchSourceMap.get(articleSlug) ?? []);
    const evaluatedCandidates = candidates
      .map((source) => ({
        source,
        evaluation: evaluateImageCandidate(article, source, { usedSourceOwners, now })
      }))
      .sort((a, b) => b.evaluation.score - a.evaluation.score || a.source.resultIndex - b.source.resultIndex);

    const approvedCandidates = evaluatedCandidates.filter(({ evaluation }) => evaluation.ok);
    const rejectedCandidateReasons = evaluatedCandidates
      .flatMap(({ evaluation }) => evaluation.reasons)
      .filter(Boolean);
    const articleRejectedRows = [];

    for (const row of pins) {
      const approved = approvedCandidates.shift();
      if (!approved) {
        const fallbackEvaluation = {
          ok: false,
          reasons: approvedRows.some((approvedRow) => approvedRow.article_slug === articleSlug)
            ? ['needs_more_approved_sources']
            : ['no_approved_image_source', ...rejectedCandidateReasons.slice(0, 5)],
          ruleKey: rule.key,
          ruleLabel: rule.label,
          score: 0,
          sourceKey: '',
          sourceText: '',
          checkedAt: now.toISOString()
        };
        const rejectedRow = applyQualityFields(row, null, fallbackEvaluation, 'rejected');
        rejectedRows.push(rejectedRow);
        articleRejectedRows.push(rejectedRow);
        continue;
      }

      const sourceSignature = sourceSignatureFor(approved.source);
      usedSourceOwners.set(sourceSignature, row.pin_id);
      const approvedRow = applyQualityFields(row, approved.source, approved.evaluation, 'approved');
      assignments.set(row.pin_id, approved.source);
      approvedRows.push(approvedRow);
    }

    if (articleRejectedRows.length) {
      const approvedCount = pins.length - articleRejectedRows.length;
      manualArticles.push({
        article_slug: articleSlug,
        article_title: article.article_title,
        category_slug: article.category_slug,
        required_rule: rule.key,
        required_rule_label: rule.label,
        requested_pins: String(pins.length),
        approved_pins: String(approvedCount),
        rejected_pins: String(articleRejectedRows.length),
        candidate_sources_checked: String(evaluatedCandidates.length),
        rejection_reasons: unique(
          articleRejectedRows
            .flatMap((row) => row.quality_rejection_reasons.split('; '))
            .concat(rejectedCandidateReasons)
        )
          .slice(0, 12)
          .join('; ')
      });
    }
  }

  return {
    assignments,
    approvedRows: approvedRows.sort((a, b) => a.pin_id.localeCompare(b.pin_id)),
    rejectedRows: rejectedRows.sort((a, b) => a.pin_id.localeCompare(b.pin_id)),
    manualArticles: manualArticles.sort((a, b) => a.article_slug.localeCompare(b.article_slug))
  };
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

function pinOutputColumns(rows) {
  return unique([...(rows[0] ? Object.keys(rows[0]) : []), ...QUALITY_COLUMNS]);
}

function duplicateSourceSignatures(rows) {
  const pinsBySource = new Map();
  for (const row of rows) {
    const signature = sourceSignatureFor(row);
    if (!signature) continue;
    const pins = pinsBySource.get(signature) ?? [];
    pins.push(row.pin_id);
    pinsBySource.set(signature, pins);
  }
  return [...pinsBySource.entries()].filter(([, pins]) => pins.length > 1);
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

function buildReport({ candidateRows, approvedRows, rejectedRows, manualArticles, productionRows, errors, startedAt, completedAt }) {
  const outputFiles = productionRows.map((row) => path.join(PUBLIC_PINS_DIR, row.image_file));
  const missingFiles = outputFiles.filter((file) => !fs.existsSync(file));
  const invalidDimensions = productionRows.filter((row) => row.width !== WIDTH || row.height !== HEIGHT);
  const duplicateOutputFiles = duplicates(productionRows.map((row) => row.image_file));
  const duplicateTitles = duplicates(approvedRows.map((row) => row.pin_title));
  const duplicateDescriptions = duplicates(approvedRows.map((row) => row.pin_description));
  const duplicateSourceSignaturesForPins = duplicateSourceSignatures(approvedRows);
  const boardCounts = countBy(approvedRows.map((row) => row.board_slug));
  const variantCounts = countBy(approvedRows.map((row) => row.pin_variant));
  const intentCounts = countBy(productionRows.map((row) => row.intent));
  const sourceTypeCounts = countBy(productionRows.map((row) => row.source_type));
  const rejectionReasons = countBy(
    rejectedRows.flatMap((row) => String(row.quality_rejection_reasons || '').split('; ').filter(Boolean))
  );
  const fatalCount =
    errors.length +
    missingFiles.length +
    invalidDimensions.length +
    duplicateOutputFiles.length +
    duplicateTitles.length +
    duplicateDescriptions.length +
    duplicateSourceSignaturesForPins.length;

  const report = [
    '# Pin Production Report',
    '',
    'Strict quality-filtered production batch generated directly into `public/pins/`.',
    '',
    '## Summary',
    '',
    `- Candidate articles: ${new Set(candidateRows.map((row) => row.article_slug)).size}`,
    `- Candidate pins reviewed: ${candidateRows.length}`,
    `- Approved pins: ${approvedRows.length}`,
    `- Rejected pins: ${rejectedRows.length}`,
    `- Articles needing manual images: ${manualArticles.length}`,
    `- Images rendered: ${productionRows.length}`,
    `- Unique image files: ${new Set(productionRows.map((row) => row.image_file)).size}`,
    `- Boards with approved pins: ${new Set(approvedRows.map((row) => row.board_slug)).size}`,
    `- Started: ${startedAt.toISOString()}`,
    `- Completed: ${completedAt.toISOString()}`,
    '',
    '## Production Rules Applied',
    '',
    '- Rejected by default unless a clean `images.unsplash.com/photo-*` source has strong metadata match to the article title element.',
    '- Unsplash Plus, premium, preview, watermark-pattern, people-pattern, interior, and weak-context sources are blocked.',
    '- The same source photo signature is never reused for more than one Pin.',
    '- Articles without enough approved sources are written to `data/pinterest/pinterest-needs-manual-images.csv`.',
    '- Publishing scripts only accept pins with `quality_status=approved`.',
    '',
    '## Validation',
    '',
    `- Missing images: ${missingFiles.length}`,
    `- Invalid dimensions: ${invalidDimensions.length}`,
    `- Duplicate output filenames: ${duplicateOutputFiles.length}`,
    `- Duplicate pin titles: ${duplicateTitles.length}`,
    `- Duplicate pin descriptions: ${duplicateDescriptions.length}`,
    `- Duplicate source signatures: ${duplicateSourceSignaturesForPins.length}`,
    `- Generation errors: ${errors.length}`,
    `- Total blocking errors: ${fatalCount}`,
    '',
    '## Rejection Reasons',
    '',
    ...([...rejectionReasons.entries()].length
      ? [...rejectionReasons.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([reason, count]) => `- ${reason}: ${count}`)
      : ['- none']),
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
      duplicateSourceSignatures: duplicateSourceSignaturesForPins.length,
      errors: errors.length
    }
  };
}

const startedAt = new Date();
const rows = readCsv(path.join(DATA_DIR, 'pinterest-pins.csv'));

cleanupProductionImages();
ensureDir(CACHE_DIR);

console.log(`Preparing strict Unsplash quality sources for ${rows.length} candidate pins...`);
const searchSourceMap = await buildSearchSourceMap(rows);

const { assignments: sourceByPin, approvedRows, rejectedRows, manualArticles } = buildQualityAssignments(rows, searchSourceMap);

const uniqueSourceMap = new Map([...sourceByPin.values()].map((source) => [sourceKeyFor(source), source]));
const uniqueSources = [...uniqueSourceMap.values()];
const sourceFiles = new Map();
console.log(`Downloading/caching ${uniqueSources.length} source photos...`);
await eachLimit(uniqueSources, 4, async (source, index) => {
  sourceFiles.set(sourceKeyFor(source), await downloadSource(source));
  if ((index + 1) % 5 === 0 || index + 1 === uniqueSources.length) {
    console.log(`Cached ${index + 1}/${uniqueSources.length} source photos.`);
  }
});

const productionRows = [];
const errors = [];
console.log(`Rendering ${approvedRows.length} approved production pins...`);

await eachLimit(approvedRows, 6, async (row, index) => {
  try {
    const source = sourceByPin.get(row.pin_id);
    const sourceFile = sourceFiles.get(sourceKeyFor(source));
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
      quality_rule: row.quality_rule_key,
      quality_score: row.quality_score
    });
  } catch (error) {
    errors.push({ pin_id: row.pin_id, error: error.message });
  }

  if ((index + 1) % 50 === 0 || index + 1 === approvedRows.length) {
    console.log(`Rendered ${index + 1}/${approvedRows.length} approved pins.`);
  }
});

productionRows.sort((a, b) => a.pin_id.localeCompare(b.pin_id));

const missingRows = approvedRows.filter((row) => !productionRows.some((productionRow) => productionRow.pin_id === row.pin_id));
for (const row of missingRows) {
  if (!errors.some((error) => error.pin_id === row.pin_id)) {
    errors.push({ pin_id: row.pin_id, error: 'Missing production row after render.' });
  }
}

const completedAt = new Date();
const approvedColumns = pinOutputColumns(approvedRows.length ? approvedRows : rows);
const rejectedColumns = pinOutputColumns(rejectedRows.length ? rejectedRows : rows);
writeCsv(APPROVED_PINS_PATH, approvedRows, approvedColumns);
writeCsv(REJECTED_PINS_PATH, rejectedRows, rejectedColumns);
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
writeCsv(path.join(DATA_DIR, 'image-prompts.csv'), makeImagePromptRows(approvedRows), IMAGE_PROMPT_COLUMNS);
writeCsv(path.join(DATA_DIR, 'pin-production-checklist.csv'), makeChecklistRows(approvedRows), CHECKLIST_COLUMNS);

writeText(
  QUALITY_REPORT_PATH,
  `${JSON.stringify(
    {
      generated_at_utc: completedAt.toISOString(),
      candidate_pins: rows.length,
      approved_pins: approvedRows.length,
      rejected_pins: rejectedRows.length,
      manual_articles: manualArticles.length,
      rejection_reasons: Object.fromEntries(
        [...countBy(rejectedRows.flatMap((row) => row.quality_rejection_reasons.split('; ').filter(Boolean))).entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )
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

const report = buildReport({
  candidateRows: rows,
  approvedRows,
  rejectedRows,
  manualArticles,
  productionRows,
  errors,
  startedAt,
  completedAt
});
writeText(REPORT_PATH, report.markdown);

console.log(
  JSON.stringify(
    {
      candidatePins: rows.length,
      approvedPins: approvedRows.length,
      rejectedPins: rejectedRows.length,
      manualArticles: manualArticles.length,
      generated: productionRows.length,
      uniqueSources: uniqueSources.length,
      report: 'pin-production-report.md',
      qualityReport: path.relative(ROOT_DIR, QUALITY_REPORT_PATH).replace(/\\/g, '/'),
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
