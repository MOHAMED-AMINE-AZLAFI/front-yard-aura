import path from 'node:path';
import {
  DATA_DIR,
  PUBLIC_PINS_DIR,
  SITE_URL,
  dedupe,
  duplicates,
  ensureDir,
  limitText,
  readBlogPosts,
  shortHash,
  slugify,
  wordsFromSlug,
  writeCsv,
  writeText
} from './pinterest-utils.mjs';
import { QUALITY_COLUMNS } from './pin-image-quality.mjs';

const PIN_COLUMNS = [
  'pin_id',
  'article_slug',
  'article_title',
  'category',
  'category_slug',
  'board_name',
  'board_slug',
  'pin_variant',
  'pin_title',
  'pin_description',
  'keywords',
  'alt_text',
  'destination_url',
  'image_file',
  'image_url',
  'image_prompt',
  'overlay_top',
  'overlay_center',
  'overlay_bottom',
  'overlay_style',
  'composition',
  'visual_focus',
  'quality_rules',
  'compliance_notes',
  ...QUALITY_COLUMNS
];

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

const BOARD_NAMES = {
  'small-front-yard-landscaping-ideas': 'Small Front Yard Landscaping Ideas',
  'modern-front-yard-landscaping': 'Modern Front Yard Landscaping',
  'front-yard-landscaping-on-a-budget': 'Front Yard Landscaping On A Budget',
  'front-yard-flower-bed-ideas': 'Front Yard Flower Bed Ideas',
  'front-yard-landscaping-with-rocks': 'Front Yard Landscaping With Rocks',
  'low-maintenance-front-yard-landscaping': 'Low Maintenance Front Yard Landscaping',
  'walkway-landscaping-ideas': 'Walkway Landscaping Ideas',
  'curb-appeal-landscaping-ideas': 'Curb Appeal Landscaping Ideas'
};

const VARIANTS = [
  {
    code: 'A',
    composition: 'Wide exterior view, hero shot, full property view',
    visualFocus: 'full American home exterior, front yard, entry path, foundation beds, street-facing curb appeal',
    angle: 'wide street-level architectural hero photograph showing the full property, driveway edge, walkway, porch, and complete landscape layout; this must read as a broad exterior establishing shot',
    titleSuffix: 'Hero Curb Appeal View',
    descriptionLead: 'See the full-property view',
    keywords: ['hero exterior', 'full property view', 'curb appeal view', 'front yard inspiration']
  },
  {
    code: 'B',
    composition: 'Close landscaping detail focused on the article topic',
    visualFocus: 'close detail of the main landscape material or planting, with real texture and the home softly visible',
    angle: 'close DSLR editorial detail at garden-bed height, focused tightly on the exact landscaping element from the article topic; do not show the full house and do not repeat the wide hero composition',
    titleSuffix: 'Close-Up Landscaping Details',
    descriptionLead: 'Save the close-up detail',
    keywords: ['landscaping detail', 'garden texture', 'close-up design', 'front yard detail']
  },
  {
    code: 'C',
    composition: 'Different angle of the same topic with a completely different composition',
    visualFocus: 'three-quarter entry view from the walkway or driveway, different framing from the hero and close-up images',
    angle: 'three-quarter angle from the walkway or driveway, with a different foreground, depth, and entry composition; this must be visibly different from both the wide hero shot and the close detail shot',
    titleSuffix: 'Fresh Angle Inspiration',
    descriptionLead: 'Explore a fresh angle',
    keywords: ['fresh angle', 'entry perspective', 'walkway view', 'save for later']
  }
];

const TOPIC_RULES = [
  {
    key: 'rock',
    label: 'Rock Landscaping',
    test: /(rock|rocks|gravel|boulder|stone|river|basalt|limestone|slate|granite|pebble|flagstone|cactus|agave|yucca|desert|dry creek)/,
    elements: ['rocks', 'gravel', 'boulders', 'stone borders', 'real stone texture'],
    hooks: ['Must-See Stone Ideas', 'Low-Maintenance Stone Style', 'Natural Rock Curb Appeal'],
    keywords: ['rock landscaping', 'gravel front yard', 'stone border', 'boulder landscaping']
  },
  {
    key: 'flower',
    label: 'Flower Beds',
    test: /(flower|flowers|bed|beds|perennial|annual|hydrangea|tulip|rose|lavender|dahlia|iris|peony|salvia|wildflower|pollinator|native)/,
    elements: ['real flower beds', 'seasonal flowers', 'garden borders', 'layered planting'],
    hooks: ['Seasonal Curb Appeal', 'Beautiful Flower Bed Ideas', 'Save This Garden Look'],
    keywords: ['flower bed ideas', 'seasonal flowers', 'garden border', 'front yard flowers']
  },
  {
    key: 'walkway',
    label: 'Walkway Landscaping',
    test: /(walkway|pathway|path|paver|pavers|stepping|steps|sidewalk|entry path|brick walk|flagstone|bluestone)/,
    elements: ['pavers', 'walkways', 'garden paths', 'entrance paths'],
    hooks: ['Polished Entry Ideas', 'Save For Later', 'Welcoming Walkway Style'],
    keywords: ['walkway landscaping', 'front path', 'paver walkway', 'entry path']
  },
  {
    key: 'low-maintenance',
    label: 'Low Maintenance',
    test: /(low maintenance|easy|minimal lawn|no grass|evergreen|drought|drip|automatic|clover|artificial|groundcover|slow-growing|durable|busy|seniors|hoa)/,
    elements: ['simple landscaping', 'minimal shrubs', 'gravel yards', 'easy care garden structure'],
    hooks: ['Easy Maintenance', 'Simple Front Yard Ideas', 'Low-Upkeep Curb Appeal'],
    keywords: ['low maintenance landscaping', 'easy care front yard', 'minimal lawn', 'simple landscaping']
  },
  {
    key: 'modern',
    label: 'Modern Front Yard',
    test: /(modern|concrete|corten|courtyard|horizontal|flat roof|black and white|porcelain|metal edging|linear|floating|matte black|glass front doors)/,
    elements: ['modern American home', 'clean lines', 'architectural planting', 'restrained hardscape'],
    hooks: ['Clean Modern Curb Appeal', 'Modern Front Yard Look', 'Architectural Landscaping'],
    keywords: ['modern front yard', 'clean curb appeal', 'architectural landscaping', 'modern walkway']
  },
  {
    key: 'small',
    label: 'Small Front Yard',
    test: /(small|narrow|townhome|city|row house|duplex|cape cod|zero lot|tiny|short walkway|skinny|shared driveway|corner porch)/,
    elements: ['compact American front yard', 'small entry path', 'space-saving planting', 'neat borders'],
    hooks: ['Small Yard Big Impact', 'Compact Curb Appeal', 'Save This Small Yard Idea'],
    keywords: ['small front yard', 'compact landscaping', 'small yard curb appeal', 'narrow front yard']
  },
  {
    key: 'budget',
    label: 'Budget Landscaping',
    test: /(budget|cheap|affordable|diy|under 500|free materials|reused|secondhand|weekend|renters|starter|painted|seed-grown)/,
    elements: ['budget-friendly landscaping', 'simple materials', 'clean edging', 'affordable curb appeal'],
    hooks: ['Budget Friendly Ideas', 'Weekend Curb Appeal', 'Affordable Front Yard Look'],
    keywords: ['budget front yard', 'cheap curb appeal', 'affordable landscaping', 'diy landscaping']
  },
  {
    key: 'luxury',
    label: 'Luxury Curb Appeal',
    test: /(luxury|expensive|premium|curb appeal|statement|pillars|symmetry|symmetrical|lighting|colonial|craftsman|farmhouse|ranch|front door|porch|tree)/,
    elements: ['luxury American home exterior', 'elegant entry', 'premium landscaping', 'layered curb appeal'],
    hooks: ['Luxury Curb Appeal', 'Must-See Inspiration', 'Premium Front Yard Look'],
    keywords: ['luxury curb appeal', 'premium landscaping', 'front yard curb appeal', 'elegant exterior']
  }
];

const SPECIFIC_ELEMENT_RULES = [
  ['river rock', 'river rock beds'],
  ['boulder', 'large natural landscape boulders'],
  ['basalt', 'dark basalt rock texture'],
  ['limestone', 'light limestone gravel'],
  ['slate', 'slate chip mulch'],
  ['pea gravel', 'pea gravel paths'],
  ['decomposed granite', 'decomposed granite surface'],
  ['crushed granite', 'crushed granite garden bed'],
  ['retaining', 'stone retaining edge'],
  ['raised stone', 'raised stone planting bed'],
  ['dry creek', 'dry creek bed'],
  ['agave', 'agave accents'],
  ['cactus', 'cactus accents'],
  ['yucca', 'yucca accents'],
  ['lavender', 'lavender border planting'],
  ['hydrangea', 'hydrangea bed'],
  ['rose', 'rose garden bed'],
  ['tulip', 'tulip flower bed'],
  ['dahlia', 'dahlia flower bed'],
  ['iris', 'iris planting bed'],
  ['peony', 'peony flower bed'],
  ['salvia', 'salvia and grass planting'],
  ['pollinator', 'pollinator-friendly flowers'],
  ['wildflower', 'wildflower bed'],
  ['native', 'native flower planting'],
  ['boxwood', 'low boxwood border'],
  ['evergreen', 'evergreen foundation planting'],
  ['paver', 'paver walkway'],
  ['brick', 'brick walkway or edging'],
  ['flagstone', 'flagstone path'],
  ['bluestone', 'bluestone pavers'],
  ['stepping stone', 'stepping stone walkway'],
  ['stone steps', 'stone front steps'],
  ['lighting', 'warm low-voltage path lighting'],
  ['mailbox', 'mailbox flower bed'],
  ['porch', 'front porch planters'],
  ['driveway', 'driveway border landscaping'],
  ['no grass', 'no-grass front yard'],
  ['minimal lawn', 'minimal lawn layout'],
  ['mulch', 'fresh mulch beds'],
  ['clover', 'clover lawn alternative'],
  ['artificial turf', 'artificial turf with clean borders'],
  ['drip', 'drip irrigation zones'],
  ['drought', 'drought-tolerant planting'],
  ['modern slab', 'modern slab walkway'],
  ['concrete', 'concrete walkway'],
  ['corten', 'corten steel edging'],
  ['courtyard', 'front courtyard planting'],
  ['metal edging', 'metal edging'],
  ['white stone', 'white stone groundcover'],
  ['black mulch', 'black mulch beds'],
  ['small evergreens', 'small evergreen shrubs'],
  ['wood edging', 'simple wood edging'],
  ['reused brick', 'reused brick border'],
  ['solar path lights', 'solar path lights']
];

function getBoard(post) {
  const boardName = BOARD_NAMES[post.categorySlug] ?? post.category;
  return {
    board_name: boardName,
    board_slug: post.categorySlug || slugify(boardName)
  };
}

function topicForPost(post) {
  const haystack = `${post.title} ${post.category} ${post.categorySlug} ${post.tags.join(' ')} ${post.slug}`.toLowerCase();
  return TOPIC_RULES.find((rule) => rule.test.test(haystack)) ?? TOPIC_RULES[3];
}

function specificElementsForPost(post, topic) {
  const haystack = `${post.title} ${post.slug} ${post.tags.join(' ')}`.toLowerCase();
  const matched = SPECIFIC_ELEMENT_RULES.filter(([needle]) => haystack.includes(needle)).map(([, element]) => element);
  return dedupe([...matched, ...topic.elements]).slice(0, 7);
}

function hookFor(post, topic, variantIndex) {
  const haystack = `${post.title} ${post.slug} ${post.category}`.toLowerCase();
  if (haystack.includes('budget') || haystack.includes('cheap') || haystack.includes('affordable')) {
    return ['Budget Friendly Ideas', 'Save This Affordable Look', 'Weekend Curb Appeal'][variantIndex];
  }
  if (haystack.includes('low maintenance') || haystack.includes('easy') || haystack.includes('minimal')) {
    return ['Easy Maintenance', 'Low-Upkeep Curb Appeal', 'Save For Later'][variantIndex];
  }
  if (haystack.includes('luxury') || haystack.includes('expensive') || haystack.includes('premium')) {
    return ['Luxury Curb Appeal', 'Premium Landscaping Details', 'Must-See Inspiration'][variantIndex];
  }
  return topic.hooks[variantIndex % topic.hooks.length];
}

function titleFragment(post) {
  const base = post.pinterestTitle || post.title;
  return limitText(base.replace(/^Front Yard\s+/i, 'Front Yard '), 64, post.title);
}

function buildPinTitle(post, topic, variant) {
  const fragment = titleFragment(post);
  const candidates = {
    A: `${fragment}: ${variant.titleSuffix}`,
    B: `${topic.label} Details for ${fragment}`,
    C: `${fragment}: ${variant.titleSuffix}`
  };
  return limitText(candidates[variant.code], 100, post.title);
}

function buildDescription(post, variant, elements) {
  const baseDescription = post.pinterestDescription || post.description;
  const elementText = elements.slice(0, 4).join(', ');
  const text = `${variant.descriptionLead} for ${post.title}: ${elementText}, real American curb appeal, natural light, and practical front yard landscaping ideas. ${baseDescription}`;
  return limitText(text, 500, baseDescription);
}

function buildKeywords(post, topic, variant, elements) {
  const titleWords = wordsFromSlug(post.slug).slice(0, 8).join(' ');
  const keywords = dedupe([
    topic.label,
    ...topic.keywords,
    ...variant.keywords,
    ...post.tags,
    post.category,
    titleWords,
    ...elements.slice(0, 4),
    'front yard landscaping',
    'American home curb appeal'
  ]);
  return keywords.slice(0, 16).join('; ');
}

function buildAltText(post, variant, elements) {
  const elementText = elements.slice(0, 3).join(', ');
  const text = `${variant.composition} for ${post.title}, showing ${elementText} around a realistic American home.`;
  return limitText(text, 300, post.imageAlt);
}

function buildImagePrompt(post, topic, variant, elements) {
  const elementText = elements.join(', ');
  const slugWords = wordsFromSlug(post.slug).join(' ');
  return [
    `Ultra realistic photorealistic DSLR vertical 2:3 Pinterest image, 1000x1500 composition, professional architectural photography of a real American home.`,
    `Article match: "${post.title}" in "${post.category}", slug concept "${slugWords}", keywords "${post.tags.join(', ')}".`,
    `Scene: ${variant.angle}. The image must immediately communicate ${topic.label} and must visibly include ${elementText}.`,
    `Use natural daylight, believable American suburban architecture, real landscaping, real plant scale, authentic stone/soil/mulch/flower textures, magazine-quality curb appeal, no staged showroom look.`,
    `Reserve clean readable negative space for a later overlay without covering the main landscaping subject; keep the most important yard feature away from the center title zone and bottom CTA zone.`,
    `Do not render text into the base photo; add the overlay in post-production using the overlay fields.`
  ].join(' ');
}

function buildOverlayStyle(variant) {
  const placement =
    variant.code === 'A'
      ? 'center title over calm sky, lawn, or facade negative space'
      : variant.code === 'B'
        ? 'center title on a subtle translucent dark gradient above the close detail'
        : 'center title offset over clean path or planting negative space';

  return [
    'Premium Pinterest typography with strict mobile-safe layout: title max width 820px, 90px side padding, automatic font sizing, controlled line wrapping, and no text overflow outside the image.',
    'Use a light readability treatment only: subtle shadow, soft local panel behind title, and reduced dark overlay so the photo stays bright.',
    'Keep title and CTA inside safe margins and away from the core landscape detail.',
    placement
  ].join(' ');
}

function makePins(posts) {
  const rows = [];

  for (const post of posts) {
    const topic = topicForPost(post);
    const elements = specificElementsForPost(post, topic);
    const board = getBoard(post);

    VARIANTS.forEach((variant, variantIndex) => {
      const hook = hookFor(post, topic, variantIndex);
      const imageFile = `${post.slug}-pin-${variant.code.toLowerCase()}-${shortHash(`${post.slug}:${variant.code}`, 5)}.jpg`;
      const pinId = `${post.slug}-${variant.code.toLowerCase()}`;
      rows.push({
        pin_id: pinId,
        article_slug: post.slug,
        article_title: post.title,
        category: post.category,
        category_slug: post.categorySlug,
        board_name: board.board_name,
        board_slug: board.board_slug,
        pin_variant: variant.code,
        pin_title: buildPinTitle(post, topic, variant),
        pin_description: buildDescription(post, variant, elements),
        keywords: buildKeywords(post, topic, variant, elements),
        alt_text: buildAltText(post, variant, elements),
        destination_url: `${SITE_URL}/blog/${post.slug}/`,
        image_file: imageFile,
        image_url: `${SITE_URL}/pins/${imageFile}`,
        image_prompt: buildImagePrompt(post, topic, variant, elements),
        overlay_top: 'FRONT YARD AURA',
        overlay_center: post.title,
        overlay_bottom: hook,
        overlay_style: buildOverlayStyle(variant),
        composition: variant.composition,
        visual_focus: variant.visualFocus,
        quality_rules: 'Ultra realistic; photorealistic; DSLR photography; natural lighting; real American homes; real landscaping; real textures; professional architectural photography; Pinterest worthy; magazine quality.',
        compliance_notes: 'Candidate only. Do not publish until scripts/generate-production-pins.mjs assigns quality_status=approved after strict image-source filtering.',
        quality_status: 'candidate',
        quality_rejection_reasons: 'requires_strict_image_quality_filter',
        quality_rule_key: '',
        quality_rule_label: '',
        quality_score: '',
        quality_source_id: '',
        quality_source_key: '',
        quality_source_type: '',
        quality_source_url: '',
        quality_source_text: '',
        quality_checked_at: ''
      });
    });
  }

  return rows;
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
    image_generated: 'no',
    image_reviewed: 'no',
    text_overlay_added: 'no',
    text_legible_mobile: 'no',
    topic_match_checked: 'no',
    no_ai_artifacts: 'no',
    image_uploaded_to_public_pins: 'no',
    ready_for_api: 'no'
  }));
}

function validatePins(posts, pins) {
  const errors = [];
  const warnings = [];
  const requiredQualityWords = ['photorealistic', 'DSLR', 'natural daylight', 'real American home'];

  if (pins.length !== posts.length * 3) {
    errors.push(`Expected ${posts.length * 3} pins, found ${pins.length}.`);
  }

  for (const post of posts) {
    const postPins = pins.filter((pin) => pin.article_slug === post.slug);
    const variants = new Set(postPins.map((pin) => pin.pin_variant));
    if (postPins.length !== 3 || !['A', 'B', 'C'].every((variant) => variants.has(variant))) {
      errors.push(`${post.slug} does not have exactly Pin A, Pin B, and Pin C.`);
    }
  }

  const uniqueChecks = [
    ['pin titles', pins.map((pin) => pin.pin_title)],
    ['pin descriptions', pins.map((pin) => pin.pin_description)],
    ['alt text', pins.map((pin) => pin.alt_text)],
    ['image files', pins.map((pin) => pin.image_file)],
    ['image prompts', pins.map((pin) => pin.image_prompt)]
  ];

  for (const [label, values] of uniqueChecks) {
    const dupes = duplicates(values);
    if (dupes.length) errors.push(`Duplicate ${label}: ${dupes.slice(0, 3).map(([value]) => value).join(' | ')}`);
  }

  for (const pin of pins) {
    if (pin.overlay_top !== 'FRONT YARD AURA') errors.push(`${pin.pin_id} has invalid top overlay.`);
    if (pin.overlay_center !== pin.article_title) errors.push(`${pin.pin_id} center overlay does not match article title.`);
    if (!pin.destination_url.endsWith(`/blog/${pin.article_slug}/`)) errors.push(`${pin.pin_id} has mismatched destination URL.`);
    if (pin.pin_title.length > 100) errors.push(`${pin.pin_id} title is longer than 100 characters.`);
    if (pin.pin_description.length > 500) errors.push(`${pin.pin_id} description is longer than 500 characters.`);
    if (pin.keywords.split(';').length < 8) warnings.push(`${pin.pin_id} has fewer than 8 keywords.`);
    for (const word of requiredQualityWords) {
      if (!pin.image_prompt.includes(word)) errors.push(`${pin.pin_id} prompt is missing quality phrase: ${word}.`);
    }
  }

  const boards = new Set(pins.map((pin) => pin.board_slug));
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    articles: posts.length,
    pins: pins.length,
    uniqueImages: new Set(pins.map((pin) => pin.image_file)).size,
    boards: boards.size,
    boardSlugs: [...boards].sort()
  };
}

const startedAt = Date.now();
const posts = readBlogPosts();
const pins = makePins(posts);
const imagePromptRows = makeImagePromptRows(pins);
const checklistRows = makeChecklistRows(pins);
const report = validatePins(posts, pins);

ensureDir(DATA_DIR);
ensureDir(PUBLIC_PINS_DIR);

writeCsv(path.join(DATA_DIR, 'pinterest-pins.csv'), pins, PIN_COLUMNS);
writeCsv(path.join(DATA_DIR, 'image-prompts.csv'), imagePromptRows, IMAGE_PROMPT_COLUMNS);
writeCsv(path.join(DATA_DIR, 'pin-production-checklist.csv'), checklistRows, CHECKLIST_COLUMNS);
writeText(path.join(PUBLIC_PINS_DIR, '.gitkeep'), '');
writeText(
  path.join(DATA_DIR, 'pinterest-export-report.json'),
  `${JSON.stringify({ ...report, generatedAt: new Date().toISOString(), runtimeMs: Date.now() - startedAt }, null, 2)}\n`
);

console.log(
  JSON.stringify(
    {
      generated: report.ok,
      articles: report.articles,
      pins: report.pins,
      uniqueImages: report.uniqueImages,
      boards: report.boards,
      errors: report.errors.length,
      warnings: report.warnings.length,
      output: {
        pins: 'data/pinterest/pinterest-pins.csv',
        imagePrompts: 'data/pinterest/image-prompts.csv',
        checklist: 'data/pinterest/pin-production-checklist.csv',
        report: 'data/pinterest/pinterest-export-report.json'
      }
    },
    null,
    2
  )
);

if (!report.ok) {
  for (const error of report.errors) console.error(`- ${error}`);
  process.exit(1);
}
