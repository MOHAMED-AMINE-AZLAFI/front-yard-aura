const FRONT_YARD_CONTEXT_PATTERN =
  /\b(front yard|yard|garden|front garden|landscap\w*|curb appeal|entry|walkway|path|pathway|paver|hardscape|courtyard|foundation bed|flower bed|flowers?|lawn|driveway|house exterior|home exterior|trees?|bushes|shrubs?|greenery|planting|plants?)\b/i;

const HOME_EXTERIOR_PATTERN =
  /\b(house|home|exterior|facade|front door|porch|entry|bungalow|farmhouse|ranch|colonial|cottage)\b/i;

const LANDSCAPING_ELEMENT_PATTERN =
  /\b(lawn|grass|flower|flowers|flower bed|shrubs?|bushes|trees?|greenery|hedge|hedges|boxwood|topiary|mulch|rocks?|boulders?|gravel|pebbles?|stone|cobblestone|walkway|path|pathway|paver|pavers|paving|hardscape|steps?|stairs?|retaining wall|garden bed|foundation bed|plants?|planting|cactus|agave|yucca|succulents?|desert|xeriscape|landscap\w*)\b/i;

export const QUALITY_COLUMNS = [
  'quality_status',
  'quality_rejection_reasons',
  'quality_rule_key',
  'quality_rule_label',
  'quality_score',
  'source_signature',
  'quality_source_id',
  'quality_source_key',
  'quality_source_type',
  'quality_source_url',
  'quality_source_text',
  'quality_checked_at'
];

export const WATERMARK_PATTERN =
  /\b(watermark|watermarked|stock photo|preview|sample image|sample photo|shutterstock|istock|getty|alamy|dreamstime|adobe stock|depositphotos|123rf|unsplash\+|premium[_ -]?photo|premium photo)\b|plus\.unsplash\.com/i;

export const PEOPLE_PATTERN =
  /\b(person|people|human|man|men|woman|women|boy|girl|child|children|kid|kids|couple|bride|groom|portrait|model|selfie|face|tourist|crowd|homeowner|gardener|standing|walking|sitting)\b/i;

export const BAD_CONTEXT_PATTERN =
  /\b(interior|living room|bedroom|bathroom|kitchen|dining room|sofa|couch|bed frame|office|hallway|staircase|hotel|restaurant|apartment room|swimming pool|pool)\b/i;

export const DISTRACTION_PATTERN = /\b(car|cars|truck|trucks|vehicle|vehicles|van|vans|suv|motorcycle)\b/i;

export const ARCHITECTURE_DOMINANT_PATTERN =
  /\b(architecture dominates|architectural facade|house facade|facade only|building facade|wall|walls|window|windows|close-up of wall|close-up of windows|porch only|front door only)\b/i;

export const SINGLE_SUBJECT_ONLY_PATTERN = /\b(rocks only|trees only|porch only|facade without landscaping|house facade without landscaping)\b/i;

const REQUIRED_RULES = [
  {
    key: 'mailbox-bed',
    label: 'Mailbox bed visible',
    when: /\bmailbox\b/,
    any: [/\b(mailbox|postbox|letterbox|front yard|flower|flowers|garden|garden bed|plants?|planting|porch|entry)\b/i],
    search: ['front yard mailbox flower bed', 'mailbox landscaping curb appeal']
  },
  {
    key: 'brick-walkway',
    label: 'Brick walkway visible',
    when: /\bbrick\b.*\b(walkway|path|paver|steps|sidewalk)\b|\b(walkway|path|paver|steps|sidewalk)\b.*\bbrick\b/,
    any: [/\b(brick|red brick|brickwork|masonry|walkway|path|pathway|paver|pavers|paving|stone|cobblestone|steps|stairs|sidewalk|entry|porch|garden|yard|hardscape|landscap\w*)\b/i],
    search: ['brick front walkway landscaping', 'brick path front yard']
  },
  {
    key: 'gravel-path',
    label: 'Gravel path visible',
    when: /\bgravel\b.*\b(path|walkway|paver|courtyard|yard)\b|\b(path|walkway|paver|courtyard|yard)\b.*\bgravel\b/,
    any: [/\b(gravel|pea gravel|pebbles?|decomposed granite|crushed granite|stone|stones?|pavers?|paving|cobblestone|hardscape|path|pathway|walkway|courtyard|front yard|yard|garden|entry|porch|house|home|exterior|plants?|greenery|landscap\w*)\b/i],
    search: ['gravel path front yard landscaping', 'front yard gravel walkway']
  },
  {
    key: 'flower-bed',
    label: 'Flower bed or flowers visible',
    when: /\b(flower|flowers|flower bed|annual|perennial|hydrangea|rose|lavender|tulip|dahlia|iris|peony|salvia|wildflower|pollinator)\b/,
    any: [/\b(flower|flowers|bloom|blooms|hydrangea|rose|lavender|tulip|dahlia|iris|peony|salvia|wildflower|pollinator|perennial|annual)\b/i],
    search: ['front yard flower bed landscaping', 'front yard flowers curb appeal']
  },
  {
    key: 'rock-landscaping',
    label: 'Rocks, boulders, or gravel visible',
    when: /\b(rock|rocks|boulder|boulders|gravel|stone|river rock|basalt|limestone|slate|granite|pebble|dry creek|rock mulch|white stone|black stone)\b/,
    any: [/\b(rock|rocks|boulder|boulders|gravel|stone|stones?|river rock|basalt|limestone|slate|granite|pebble|pebbles?|dry creek|decomposed granite|crushed granite|rock mulch|pavers?|paving|hardscape|cobblestone|retaining wall|stone wall|steps?|path|walkway|garden|yard|landscap\w*|plants?|shrubs?|bushes|trees?|greenery|cactus|agave|yucca|succulents?|desert|xeriscape)\b/i],
    search: ['front yard rock landscaping', 'boulder gravel front yard landscaping']
  },
  {
    key: 'black-house',
    label: 'Black or dark house visible',
    when: /\b(black|dark|charcoal|matte black)\b.*\b(house|houses|home|exterior)\b|\b(house|houses|home|exterior)\b.*\b(black|dark|charcoal|matte black)\b/,
    all: [/\b(black|dark|charcoal|matte black)\b/i, HOME_EXTERIOR_PATTERN],
    search: ['black house exterior front yard landscaping', 'dark house curb appeal landscaping']
  },
  {
    key: 'blue-house',
    label: 'Blue house visible',
    when: /\bblue\b.*\b(house|houses|home|exterior)\b|\b(house|houses|home|exterior)\b.*\bblue\b/,
    all: [/\bblue\b/i, HOME_EXTERIOR_PATTERN],
    search: ['blue house exterior front yard landscaping']
  },
  {
    key: 'gray-house',
    label: 'Gray or charcoal house visible',
    when: /\b(gray|grey|charcoal)\b.*\b(house|houses|home|exterior)\b|\b(house|houses|home|exterior)\b.*\b(gray|grey|charcoal)\b/,
    all: [/\b(gray|grey|charcoal)\b/i, HOME_EXTERIOR_PATTERN],
    search: ['gray house exterior front yard landscaping']
  },
  {
    key: 'tan-house',
    label: 'Tan house visible',
    when: /\btan\b.*\b(house|houses|home|exterior)\b|\b(house|houses|home|exterior)\b.*\btan\b/,
    all: [/\b(tan|beige|cream|sand|brown)\b/i, HOME_EXTERIOR_PATTERN],
    search: ['tan house exterior front yard landscaping']
  },
  {
    key: 'white-farmhouse',
    label: 'White farmhouse exterior visible',
    when: /\bwhite farmhouse|farmhouse exterior|farmhouse\b/,
    all: [/\b(white|farmhouse)\b/i, HOME_EXTERIOR_PATTERN],
    search: ['white farmhouse exterior front yard landscaping', 'farmhouse front yard landscaping']
  },
  {
    key: 'stone-house',
    label: 'Stone house or stone facade visible',
    when: /\bstone houses?\b|\bstone facade\b/,
    all: [/\bstone\b/i, HOME_EXTERIOR_PATTERN],
    search: ['stone house front yard landscaping']
  },
  {
    key: 'colonial-home',
    label: 'Colonial home cues visible',
    when: /\bcolonial\b/,
    all: [/\b(colonial|shutter|shutters|column|columns|symmetrical|symmetry)\b/i, HOME_EXTERIOR_PATTERN],
    search: ['colonial house front yard landscaping', 'colonial house curb appeal']
  },
  {
    key: 'small-front-yard',
    label: 'Small or compact front yard visible',
    when: /\b(small|compact|tiny|narrow|townhome|townhouse|city|row house|duplex|cape cod|zero lot|skinny|short walkway)\b/,
    any: [/\b(small|compact|tiny|narrow|townhome|townhouse|city house|row house|duplex|cape cod|zero lot|skinny|short walkway)\b/i, /\b(front yard|front garden|entry|porch|walkway|yard|garden|landscap\w*|home exterior|house exterior|house|home|exterior|facade|greenery|plants?)\b/i],
    search: ['small front yard landscaping', 'compact front yard curb appeal']
  },
  {
    key: 'low-maintenance',
    label: 'Low-maintenance front yard materials visible',
    when: /\b(low maintenance|easy|minimal|no grass|evergreen|drought|groundcover|slow-growing|rock mulch|native plants|mulch|shrubs)\b/,
    any: [/\b(gravel|rock|rocks|mulch|shrubs|bushes|greenery|evergreen|groundcover|drought|native plants|no grass|minimal lawn|low maintenance|easy care|lawn|grass|garden|yard|plants?|trees?|landscap\w*)\b/i],
    search: ['low maintenance front yard gravel shrubs', 'easy care front yard landscaping']
  },
  {
    key: 'lawn',
    label: 'Lawn, grass, or lawn stripes visible',
    when: /\b(lawn|grass|stripes|turf)\b/,
    any: [/\b(lawn|grass|grasses|stripes|striped lawn|turf)\b/i],
    search: ['front yard clean lawn stripes', 'front yard lawn landscaping']
  },
  {
    key: 'boxwood',
    label: 'Boxwood or neat hedges visible',
    when: /\bboxwood|hedge|hedges\b/,
    any: [/\b(boxwood|hedge|hedges|shrubs|bushes|topiary|structured planting|greenery|plants?|garden|yard|landscap\w*)\b/i],
    search: ['front yard boxwood landscaping', 'boxwood front walkway landscaping']
  },
  {
    key: 'planters',
    label: 'Planters or containers visible',
    when: /\b(planter|planters|container|containers|pots|potted)\b/,
    any: [/\b(planter|planters|container|containers|pots|potted)\b/i],
    search: ['front porch planters curb appeal', 'front yard container planters']
  },
  {
    key: 'lighting',
    label: 'Outdoor/path lighting visible',
    when: /\b(lighting|lights|solar path lights|low-voltage)\b/,
    any: [/\b(lighting|lights|lighted|lit|illuminated|illumination|lantern|lamp|lamps|path lights|solar lights|low-voltage|evening|night|dusk|twilight|sunset|warm|glow|exterior|front yard|yard|garden|entry|porch|walkway|path|house|home|landscap\w*)\b/i],
    search: ['front yard path lighting landscaping', 'front walkway lights curb appeal']
  },
  {
    key: 'driveway',
    label: 'Driveway or driveway edge visible',
    when: /\bdriveway\b/,
    any: [/\b(driveway|drive|garage|curb|road|pavement|paver|path|entry|front yard|yard|landscap\w*)\b/i],
    search: ['front yard driveway edge landscaping']
  },
  {
    key: 'fence-screen',
    label: 'Fence, gate, or privacy screen visible',
    when: /\b(fence|horizontal fence|privacy screen|screen|front gate|gate)\b/,
    any: [/\b(fence|screen|privacy screen|gate|hedge|wall)\b/i],
    search: ['front yard horizontal fence landscaping', 'front yard privacy screen landscaping']
  },
  {
    key: 'ornamental-grass',
    label: 'Ornamental grasses visible',
    when: /\b(ornamental grass|ornamental grasses|grasses)\b/,
    any: [/\b(ornamental grass|ornamental grasses|grass|grasses)\b/i],
    search: ['front yard ornamental grass landscaping', 'modern front yard grasses landscaping']
  },
  {
    key: 'walkway',
    label: 'Walkway or path visible',
    when: /\b(walkway|pathway|path|paver|pavers|stepping stone|steps|sidewalk|entry path|flagstone|bluestone)\b/,
    any: [/\b(walkway|pathway|path|paver|pavers|paving|stepping stone|steps|stairs|sidewalk|entry path|entry|porch|flagstone|bluestone|hardscape|garden|yard|front yard|house|home|exterior|plants?|greenery|landscap\w*)\b/i],
    search: ['front walkway landscaping', 'front yard path landscaping']
  },
  {
    key: 'front-yard-exterior',
    label: 'Front yard and exterior visible',
    when: /.*/,
    all: [FRONT_YARD_CONTEXT_PATTERN, HOME_EXTERIOR_PATTERN],
    search: ['front yard landscaping curb appeal']
  }
];

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeSignaturePart(value) {
  return String(value ?? '')
    .split('?')[0]
    .trim()
    .toLowerCase()
    .replace(/\\/g, '/')
    .replace(/[^a-z0-9:/.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function unsplashPhotoIdFrom(value) {
  const text = String(value ?? '').split('?')[0].trim();
  const match = text.match(/(?:images\.unsplash\.com\/)?((?:photo|premium_photo)-[a-z0-9-]+)/i);
  return match?.[1]?.toLowerCase() ?? '';
}

export function ruleForPin(pin) {
  const text = normalizeText(
    `${pin.article_title} ${pin.article_slug} ${pin.category} ${pin.category_slug}`
  );
  return REQUIRED_RULES.find((rule) => rule.when.test(text)) ?? REQUIRED_RULES.at(-1);
}

export function qualitySearchQueriesForPin(pin) {
  return ruleForPin(pin).search;
}

export function sourceKeyFor(source) {
  const sourceUrl = String(source?.sourceUrl || source?.quality_source_url || '').split('?')[0];
  const sourceId = String(source?.sourceId || source?.quality_source_id || '').trim();
  const fromUrl = sourceUrl.split('/').pop() || '';
  return normalizeText(sourceId || fromUrl || source?.cacheKey || source?.quality_source_key || '');
}

export function sourceSignatureFor(source) {
  const explicit = normalizeSignaturePart(source?.sourceSignature || source?.source_signature);
  if (explicit) return explicit.includes(':') ? explicit : `source:${explicit}`;

  const sourceUrl = String(source?.sourceUrl || source?.quality_source_url || source?.url || '').split('?')[0];
  const sourceId = String(source?.sourceId || source?.quality_source_id || '').trim();
  const sourceKey = String(source?.cacheKey || source?.quality_source_key || '').trim();
  const imageFile = String(source?.imageFile || source?.image_file || '').trim();
  const imageId = String(source?.imageId || source?.image_id || source?.manual_image_id || '').trim();
  const sourceType = normalizeSignaturePart(source?.sourceType || source?.quality_source_type || '');
  const unsplashId = unsplashPhotoIdFrom(sourceUrl) || unsplashPhotoIdFrom(sourceId) || unsplashPhotoIdFrom(sourceKey);

  if (unsplashId) return `unsplash:${unsplashId}`;
  if (imageId) return `manual:${normalizeSignaturePart(imageId)}`;
  if (imageFile) return `file:${normalizeSignaturePart(imageFile.split(/[\\/]/).pop())}`;
  if (sourceId) return `${sourceType || 'source-id'}:${normalizeSignaturePart(sourceId)}`;
  if (sourceKey) return `${sourceType || 'source-key'}:${normalizeSignaturePart(sourceKey)}`;
  if (sourceUrl) return `url:${normalizeSignaturePart(sourceUrl)}`;
  return '';
}

export function candidateQualityText(source) {
  return normalizeText(
    [
      source?.sourceText,
      source?.altDescription,
      source?.description,
      source?.slug,
      source?.tags,
      source?.topicTags
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function matchesRule(rule, text) {
  const all = rule.all ?? [];
  const any = rule.any ?? [];
  return all.every((pattern) => pattern.test(text)) && (!any.length || any.some((pattern) => pattern.test(text)));
}

export function evaluateImageCandidate(pin, source, { usedSourceOwners = new Map(), now = new Date() } = {}) {
  const rule = ruleForPin(pin);
  const sourceUrl = String(source?.sourceUrl || '').split('?')[0];
  const sourceKey = sourceKeyFor(source);
  const sourceSignature = sourceSignatureFor(source);
  const sourceType = String(source?.sourceType || '').trim();
  const sourceText = candidateQualityText(source);
  const sourceBlob = normalizeText(`${sourceUrl} ${sourceKey} ${sourceType} ${sourceText}`);
  const reasons = [];

  if (!sourceKey) reasons.push('missing_source_key');
  if (!sourceSignature) reasons.push('missing_source_signature');
  if (!/^https:\/\/images\.unsplash\.com\/photo-[a-z0-9-]+$/i.test(sourceUrl)) {
    reasons.push('not_clean_unsplash_photo_url');
  }
  if (/plus\.unsplash\.com/i.test(sourceUrl) || /premium[_-]?photo/i.test(sourceUrl) || /premium[_-]?photo/i.test(sourceKey)) {
    reasons.push('unsplash_plus_or_premium_source');
  }
  if (WATERMARK_PATTERN.test(sourceBlob)) reasons.push('watermark_or_preview_pattern');
  if (PEOPLE_PATTERN.test(sourceText)) reasons.push('people_pattern');
  if (BAD_CONTEXT_PATTERN.test(sourceText)) reasons.push('bad_context_pattern');
  if (DISTRACTION_PATTERN.test(sourceText)) reasons.push('vehicle_or_distraction_pattern');
  if (!sourceText) reasons.push('missing_source_metadata_text');
  if (!matchesRule(rule, sourceText)) reasons.push('missing_required_title_element');
  if (!FRONT_YARD_CONTEXT_PATTERN.test(sourceText)) reasons.push('missing_visible_front_yard');
  if (!HOME_EXTERIOR_PATTERN.test(sourceText)) reasons.push('missing_visible_house_exterior');
  if (!LANDSCAPING_ELEMENT_PATTERN.test(sourceText)) reasons.push('missing_landscaping_element');
  if (ARCHITECTURE_DOMINANT_PATTERN.test(sourceText) && !LANDSCAPING_ELEMENT_PATTERN.test(sourceText)) {
    reasons.push('architecture_dominates_frame');
  }
  if (SINGLE_SUBJECT_ONLY_PATTERN.test(sourceText)) reasons.push('single_subject_only_without_front_yard_landscaping');

  const sourceOwner = usedSourceOwners.get(sourceSignature);
  if (sourceOwner) {
    reasons.push(`duplicate_source_used_by:${sourceOwner}`);
  }

  const sourceScore = Number(source?.score || 0);
  let score = sourceScore;
  if (matchesRule(rule, sourceText)) score += 35;
  if (FRONT_YARD_CONTEXT_PATTERN.test(sourceText)) score += 8;
  if (HOME_EXTERIOR_PATTERN.test(sourceText)) score += 8;
  if (LANDSCAPING_ELEMENT_PATTERN.test(sourceText)) score += 10;
  if (sourceUrl.startsWith('https://images.unsplash.com/photo-')) score += 6;
  if (!BAD_CONTEXT_PATTERN.test(sourceText)) score += 4;
  if (!PEOPLE_PATTERN.test(sourceText)) score += 4;
  if (!DISTRACTION_PATTERN.test(sourceText)) score += 4;
  if (!WATERMARK_PATTERN.test(sourceBlob)) score += 4;

  if (score < 45) reasons.push('quality_score_below_threshold');

  return {
    ok: reasons.length === 0,
    reasons,
    ruleKey: rule.key,
    ruleLabel: rule.label,
    score,
    sourceKey,
    sourceSignature,
    sourceText,
    checkedAt: now.toISOString()
  };
}

export function applyQualityFields(pin, source, evaluation, status = evaluation.ok ? 'approved' : 'rejected') {
  return {
    ...pin,
    quality_status: status,
    quality_rejection_reasons: evaluation.reasons.join('; '),
    quality_rule_key: evaluation.ruleKey,
    quality_rule_label: evaluation.ruleLabel,
    quality_score: String(Math.round(evaluation.score)),
    source_signature: evaluation.sourceSignature || sourceSignatureFor(source || pin),
    quality_source_id: source?.sourceId || '',
    quality_source_key: evaluation.sourceKey,
    quality_source_type: source?.sourceType || '',
    quality_source_url: source?.sourceUrl || '',
    quality_source_text: evaluation.sourceText,
    quality_checked_at: evaluation.checkedAt
  };
}

export function isApprovedPin(pin) {
  return String(pin.quality_status || '').trim() === 'approved' && !String(pin.quality_rejection_reasons || '').trim();
}

export function auditPinRow(pin) {
  const source = {
    sourceId: pin.quality_source_id,
    cacheKey: pin.quality_source_key,
    sourceType: pin.quality_source_type,
    sourceUrl: pin.quality_source_url,
    sourceSignature: pin.source_signature,
    sourceText: pin.quality_source_text,
    score: pin.quality_score
  };
  const evaluation = evaluateImageCandidate(pin, source);
  const reasons = [...evaluation.reasons];

  if (!isApprovedPin(pin)) reasons.push('pin_not_approved');
  if (!pin.image_file) reasons.push('missing_image_file');
  if (!pin.image_url) reasons.push('missing_image_url');

  return {
    ...evaluation,
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)]
  };
}
