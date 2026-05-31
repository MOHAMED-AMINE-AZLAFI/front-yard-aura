import type { CollectionEntry } from 'astro:content';

export type OverlayPosition = 'top' | 'center' | 'bottom';

export type ImageIntent =
  | 'rocks'
  | 'flower-beds'
  | 'walkways'
  | 'low-maintenance'
  | 'modern'
  | 'budget'
  | 'small-yards'
  | 'curb-appeal';

export type ImageCandidate = {
  src: string;
  alt: string;
  category: ImageIntent;
  keywords: string[];
  overlayText: string;
  credit: string;
  score?: number;
  fallback?: boolean;
};

type PostLike = Pick<CollectionEntry<'blog'>, 'slug'> & {
  data: Pick<CollectionEntry<'blog'>['data'], 'title' | 'category' | 'tags' | 'imageAlt'>;
};

export type ArticleSectionImageContext = {
  title?: string;
  category?: string;
  slug?: string;
  heading?: string;
  previousParagraph?: string;
  nextParagraph?: string;
  alt?: string;
  caption?: string;
  overlay?: string;
  usedUrls?: string[];
  seed?: string;
};

const KEYWORDS: Record<ImageIntent, string[]> = {
  rocks: ['rock', 'rocks', 'boulder', 'boulders', 'gravel', 'river rock', 'stone', 'border', 'basalt', 'slate', 'granite', 'limestone', 'flagstone', 'decomposed granite', 'pea gravel', 'tan gravel', 'rock mulch'],
  'flower-beds': ['flower', 'flowers', 'bed', 'beds', 'bloom', 'blooms', 'hydrangea', 'rose', 'roses', 'peony', 'iris', 'tulip', 'dahlia', 'salvia', 'perennial', 'wildflower', 'pollinator', 'colorful'],
  walkways: ['walkway', 'walkways', 'path', 'paths', 'pathway', 'pathways', 'entrance', 'entry', 'stepping stone', 'stepping stones', 'paver', 'pavers', 'steps', 'sidewalk', 'landing', 'brick walkway'],
  'low-maintenance': ['low maintenance', 'easy', 'simple', 'drought', 'drought tolerant', 'minimal', 'minimalist', 'clean', 'native', 'evergreen', 'mulch', 'groundcover', 'artificial turf', 'clover', 'no grass', 'drip irrigation'],
  modern: ['modern', 'contemporary', 'clean lines', 'luxury', 'minimalist', 'architectural', 'linear', 'corten', 'metal', 'concrete', 'matte black', 'porcelain', 'glass', 'floating', 'sculptural'],
  budget: ['budget', 'cheap', 'affordable', 'inexpensive', 'diy', 'under 500', 'free materials', 'renters', 'weekend', 'reused', 'seed grown', 'simple upgrade'],
  'small-yards': ['small', 'tiny', 'compact', 'narrow', 'limited space', 'city', 'townhome', 'row house', 'bungalow', 'zero lot', 'skinny', 'short walkway', 'shared driveway'],
  'curb-appeal': ['curb appeal', 'luxury', 'entrance', 'exterior', 'front house', 'front door', 'porch', 'farmhouse', 'colonial', 'craftsman', 'ranch', 'pillars', 'symmetry', 'mailbox', 'foundation beds']
};

const TOPICS: Record<ImageIntent, string[]> = {
  rocks: [
    'front yard rock garden boulders gravel landscaping',
    'river rock front yard landscaping stone border',
    'modern front yard gravel landscaping shrubs',
    'front yard stone retaining edge landscaping',
    'desert front yard rock landscaping cactus agave',
    'front yard basalt rock landscaping black stone',
    'front yard pea gravel landscaping low shrubs',
    'front yard flagstone path rock border',
    'front yard decomposed granite landscaping olive trees',
    'front yard slate chip landscaping',
    'front yard limestone gravel landscaping',
    'front yard raised stone bed landscaping',
    'front yard tan gravel rock landscaping',
    'front yard rock mulch evergreen shrubs',
    'front yard boulder accent bed landscaping',
    'front yard gravel courtyard landscaping',
    'front yard crushed granite landscaping',
    'front yard stone edging around trees',
    'front yard rock landscaping with yucca',
    'front yard rock landscaping with cactus accents',
    'front yard rock border along driveway',
    'front yard gravel path with low grasses',
    'front yard rock garden with flowers',
    'front yard dry creek bed landscaping',
    'front yard stone steps rock garden',
    'front yard modern rock landscape white house',
    'front yard rock landscaping brick house',
    'front yard rock landscaping corner lot',
    'front yard rock landscaping path lights',
    'front yard gravel and evergreen foundation bed',
    'front yard rock landscaping with agave',
    'front yard rock landscaping with tan gravel',
    'front yard rock landscaping with flagstone paths',
    'front yard rock landscaping raised stone beds',
    'front yard rock landscaping with low shrubs',
    'front yard rock landscaping white stone border',
    'front yard gravel garden drought tolerant',
    'front yard stone border flower bed',
    'front yard boulder landscaping modern farmhouse',
    'front yard black stone border landscaping'
  ],
  'flower-beds': [
    'front yard flower bed hydrangeas curb appeal',
    'front yard rose garden flower bed',
    'front yard perennial flower bed colorful blooms',
    'front yard white flower bed landscaping',
    'front yard peony flower bed',
    'front yard tulip bed landscaping',
    'front yard dahlia flower bed',
    'front yard iris flower bed ideas',
    'front yard salvia ornamental grass flower bed',
    'front yard native flower bed pollinator garden',
    'front yard purple perennial flower bed',
    'front yard pink perennial flower bed',
    'front yard flower bed with evergreen backdrop',
    'front yard cottage flower bed landscaping',
    'front yard flower bed with brick edging',
    'front yard flower bed with stone edging',
    'front yard flower bed around tree',
    'front yard flower border along walkway',
    'front yard mailbox flower bed landscaping',
    'front yard flower bed blue white blooms',
    'front yard yellow flower accents landscaping',
    'front yard flower bed for ranch house',
    'front yard flower bed for white house',
    'front yard shade flower bed landscaping',
    'front yard wildflower bed ideas',
    'front yard lavender flower bed walkway',
    'front yard colorful foundation flower bed',
    'front yard low boxwood flower bed',
    'front yard hydrangea bed curved edging',
    'front yard annual flower bed curb appeal',
    'front yard perennial flowers around porch',
    'front yard flower bed with mulch and edging',
    'front yard formal flower bed symmetry',
    'front yard native flowers with grasses',
    'front yard romantic cottage blooms',
    'front yard clean flower bed with evergreens',
    'front yard spring flower bed tulips',
    'front yard summer flower bed roses',
    'front yard layered flower bed design',
    'front yard flower bed with walkway border'
  ],
  walkways: [
    'front walkway pavers landscaping border plants',
    'front walkway stepping stones grass landscaping',
    'curved front walkway landscaping flowers',
    'front walkway lighting low voltage landscaping',
    'front walkway bluestone pavers landscaping',
    'front walkway brick and gravel landscaping',
    'front walkway boxwood lavender border',
    'front walkway formal hedges landscaping',
    'front walkway stone moss landscaping',
    'front walkway wide paver steps landscaping',
    'front walkway porch landing planting',
    'front yard pathway border plants',
    'front walkway driveway connection landscaping',
    'brick front walkway landscaping ideas',
    'flagstone front walkway landscaping',
    'front walkway modern slab steps landscaping',
    'front walkway soft curbside planting',
    'front walkway mixed border planting',
    'front walkway side garden beds',
    'front walkway flowering groundcover',
    'front walkway curved brick edging',
    'front walkway stone border ideas',
    'front walkway small yard landscaping',
    'front walkway colonial home landscaping',
    'front walkway cottage home landscaping',
    'front walkway low plants border',
    'front walkway pavers and gravel',
    'front walkway entrance path landscaping',
    'front walkway porch steps flowers',
    'front walkway with boxwood border',
    'front walkway with lavender border',
    'front walkway with grass joints',
    'front walkway modern gravel joints',
    'front walkway natural stone path',
    'front walkway clean edge landscaping',
    'front walkway with path lights',
    'front walkway with raised beds',
    'front walkway to black front door',
    'front walkway paver path modern home',
    'front walkway entry garden landscaping'
  ],
  'low-maintenance': [
    'low maintenance front yard evergreen shrubs mulch',
    'drought tolerant front yard landscaping gravel',
    'low maintenance front yard native plants',
    'low maintenance front yard no grass gravel',
    'low maintenance front yard groundcover landscaping',
    'low maintenance front yard boxwood border',
    'low maintenance front yard compact grasses',
    'low maintenance front yard rock mulch',
    'low maintenance front yard artificial turf',
    'low maintenance front yard clover lawn',
    'low maintenance front yard drip irrigation plants',
    'low maintenance front yard seniors easy shrubs',
    'low maintenance front yard wide mulch beds',
    'low maintenance front yard dwarf evergreens',
    'low maintenance front yard slow growing shrubs',
    'low maintenance front yard rain garden drainage',
    'low maintenance front yard HOA neighborhood',
    'low maintenance front yard dog owners',
    'low maintenance front yard cold climate evergreen',
    'low maintenance front yard hot climate gravel',
    'low maintenance front yard simple foundation plants',
    'low maintenance front yard clean mulch pathways',
    'low maintenance front yard no annuals',
    'low maintenance front yard native grasses',
    'low maintenance front yard drought smart borders',
    'low maintenance front yard durable paths',
    'low maintenance front yard minimal lawn',
    'low maintenance front yard evergreen groundcovers',
    'low maintenance front yard compact shrubs',
    'low maintenance front yard ornamental grasses',
    'low maintenance front yard simple planting design',
    'low maintenance front yard rock and mulch beds',
    'low maintenance front yard water wise plants',
    'low maintenance front yard clean curb appeal',
    'low maintenance front yard easy care landscaping',
    'low maintenance front yard evergreen border',
    'low maintenance front yard gravel and shrubs',
    'low maintenance front yard simple porch beds',
    'low maintenance front yard tidy foundation bed',
    'low maintenance front yard modern simple shrubs'
  ],
  modern: [
    'modern front yard clean lines landscaping',
    'modern front yard concrete walkway landscaping',
    'modern front yard ornamental grasses',
    'modern front yard corten steel landscaping',
    'modern front yard metal edging gravel',
    'modern front yard planter boxes',
    'modern front yard matte black planters',
    'modern front yard porcelain pavers',
    'modern front yard floating steps landscaping',
    'modern front yard linear planting beds',
    'modern front yard white stone landscaping',
    'modern front yard black mulch landscaping',
    'modern front yard sculptural trees',
    'modern front yard gravel courtyard ideas',
    'modern front yard flat roof home landscaping',
    'modern front yard cedar accents',
    'modern front yard limestone pavers',
    'modern front yard warm exterior lighting',
    'modern front yard glass front door landscaping',
    'modern front yard privacy screen landscaping',
    'modern front yard water feature landscaping',
    'modern front yard black and white exterior',
    'modern front yard horizontal fence landscaping',
    'modern front yard succulent rock ideas',
    'modern front yard boxwood structure',
    'modern front yard soft meadow grasses',
    'modern front yard black stone borders',
    'modern front yard concrete planters',
    'modern front yard limestone gravel',
    'modern front yard ranch home landscaping',
    'modern front yard paver ideas',
    'modern front yard lighting design',
    'modern front yard minimalist landscaping',
    'modern front yard architectural planting',
    'modern front yard clean lawn contrast',
    'modern front yard large paver path',
    'modern front yard contemporary exterior',
    'modern front yard low grasses gravel',
    'modern front yard luxury entry landscape',
    'modern front yard geometric planting beds'
  ],
  budget: [
    'budget front yard landscaping mulch edging',
    'cheap front yard landscaping flower bed',
    'affordable front yard porch planters',
    'diy front yard stepping stones budget',
    'budget front yard gravel path landscaping',
    'budget front yard mailbox flower bed',
    'front yard landscaping under 500 dollars',
    'budget front yard reused brick edging',
    'budget front yard seed grown flowers',
    'budget front yard simple wood edging',
    'budget front yard small evergreens',
    'budget front yard renters curb appeal',
    'budget front yard weekend makeover',
    'budget front yard mulch makeover',
    'budget front yard lighting ideas',
    'budget front yard planter containers',
    'budget front yard cheap border plants',
    'budget front yard mulch and pots',
    'budget front yard diy mailbox bed',
    'budget front yard reseeded lawn edges',
    'budget front yard simple stone rings',
    'budget front yard one focal planter',
    'budget front yard free materials',
    'budget front yard diy edging',
    'budget front yard affordable flower bed',
    'budget front yard curb appeal for renters',
    'budget front yard plants look expensive',
    'budget front yard porch planter ideas',
    'budget front yard inexpensive shrubs',
    'budget front yard simple gravel border',
    'budget front yard small upgrade landscaping',
    'budget front yard mulch foundation beds',
    'budget front yard clean edging project',
    'budget front yard cheap rock landscaping',
    'budget front yard easy weekend curb appeal',
    'budget front yard divided perennials',
    'budget front yard diy stepping stone path',
    'budget front yard affordable walkway border',
    'budget front yard low cost front porch',
    'budget front yard simple flower color'
  ],
  'small-yards': [
    'small front yard landscaping compact curb appeal',
    'narrow front yard landscaping ideas',
    'small front yard townhome landscaping',
    'small front yard city house landscaping',
    'small front yard bungalow landscaping',
    'small front yard row house landscaping',
    'small front yard narrow walkway planting',
    'small front yard raised planters',
    'small front yard one tree landscaping',
    'small front yard shared driveway landscaping',
    'small front yard porch steps landscaping',
    'small front yard corner porch landscaping',
    'small front yard skinny foundation beds',
    'small front yard zero lot line landscaping',
    'small front yard cape cod landscaping',
    'small front yard split level home landscaping',
    'small front yard brick home landscaping',
    'small front yard two story home landscaping',
    'small front yard hydrangea ideas',
    'small front yard evergreen landscaping',
    'small front yard sidewalk landscaping',
    'small front yard without grass ideas',
    'small front yard courtyard entry ideas',
    'small front yard driveway edge landscaping',
    'small front yard low privacy planting',
    'small front yard sidewalk to door flow',
    'small front yard short walkway ideas',
    'small front yard raised bed landscaping',
    'small front yard front gate landscaping',
    'small front yard narrow brick home',
    'small front yard limited space landscaping',
    'small front yard tiny lawn upgrade',
    'small front yard compact porch garden',
    'small front yard townhouse curb appeal',
    'small front yard simple path planting',
    'small front yard single tree focal point',
    'small front yard window view planting',
    'small front yard low border plants',
    'small front yard clean mulch beds',
    'small front yard compact flower bed'
  ],
  'curb-appeal': [
    'luxury curb appeal front yard landscaping entrance',
    'curb appeal landscaping front porch planters',
    'colonial home curb appeal landscaping',
    'farmhouse curb appeal front yard landscaping',
    'craftsman bungalow curb appeal landscaping',
    'ranch house curb appeal landscaping front yard',
    'front yard black front door landscaping curb appeal',
    'curb appeal landscaping stone pillars driveway entrance',
    'curb appeal symmetrical front yard planters',
    'curb appeal front yard clean foundation beds',
    'curb appeal front yard lighting landscaping',
    'curb appeal mailbox flower bed landscaping',
    'curb appeal front yard focal point landscaping',
    'curb appeal white farmhouse landscaping',
    'curb appeal gray house front yard landscaping',
    'curb appeal blue house landscaping',
    'curb appeal black house landscaping',
    'curb appeal brown house landscaping',
    'curb appeal cream house landscaping',
    'curb appeal light gray house landscaping',
    'curb appeal charcoal house landscaping',
    'curb appeal yellow house landscaping',
    'curb appeal green house landscaping',
    'curb appeal red brick home landscaping',
    'curb appeal front yard berms landscaping',
    'curb appeal driveway entry pillars',
    'curb appeal layered porch planters',
    'curb appeal clean lawn stripes',
    'curb appeal front yard trees',
    'curb appeal outdoor lighting landscaping',
    'curb appeal colonial front walkway',
    'curb appeal modern farmhouse entrance',
    'curb appeal luxury front entry',
    'curb appeal front house exterior garden',
    'curb appeal porch and path landscaping',
    'curb appeal seasonal containers',
    'curb appeal stone pillars front yard',
    'curb appeal front yard focal tree',
    'curb appeal clean border landscaping',
    'curb appeal premium American home exterior'
  ]
};

const BROAD_INTENT_KEYWORDS: Record<ImageIntent, string[]> = {
  rocks: ['rock landscaping', 'stone landscaping', 'gravel bed', 'hardscape', 'dry landscape'],
  'flower-beds': ['flower bed', 'front yard flowers', 'foundation planting', 'blooms', 'curb appeal flowers'],
  walkways: ['front walkway', 'pathway', 'entry path', 'walkway border', 'paver path'],
  'low-maintenance': ['low maintenance', 'easy care', 'simple landscaping', 'durable planting', 'clean curb appeal'],
  modern: ['modern home', 'contemporary home', 'clean lines', 'architectural landscaping', 'luxury exterior'],
  budget: ['budget landscaping', 'affordable curb appeal', 'diy front yard', 'low cost upgrade', 'weekend project'],
  'small-yards': ['small front yard', 'narrow front yard', 'compact yard', 'limited space', 'urban front yard'],
  'curb-appeal': ['curb appeal', 'front entry', 'front porch', 'home exterior', 'foundation beds']
};

const PRIORITY_KEYWORD_GROUPS = {
  plants: ['hydrangea', 'rose', 'roses', 'tulip', 'tulips', 'peony', 'peonies', 'iris', 'lavender', 'salvia'],
  walkways: ['walkway', 'walkways', 'paver', 'pavers', 'stepping stone', 'stepping stones', 'path', 'paths', 'pathway', 'pathways'],
  rocks: ['rock', 'rocks', 'gravel', 'boulder', 'boulders', 'stone', 'stones', 'river rock', 'basalt', 'slate', 'granite', 'limestone', 'flagstone'],
  modern: ['modern', 'luxury', 'contemporary'],
  small: ['small yard', 'small front yard', 'narrow yard', 'narrow front yard', 'townhouse', 'townhome', 'row house', 'row houses']
} as const;

const SEMANTIC_ALIASES: Record<string, string[]> = {
  hydrangea: ['hydrangeas', 'blue flowers', 'soft blooms', 'flower bed'],
  rose: ['roses', 'rose garden', 'summer flowers', 'flower bed'],
  tulip: ['tulips', 'spring flowers', 'bulbs', 'flower bed'],
  peony: ['peonies', 'romantic blooms', 'pink flowers', 'flower bed'],
  iris: ['irises', 'purple flowers', 'spring blooms', 'flower bed'],
  lavender: ['lavender border', 'purple flowers', 'fragrant plants', 'walkway border'],
  salvia: ['purple perennial', 'ornamental grasses', 'pollinator flowers', 'flower bed'],
  yucca: ['yuccas', 'desert plants', 'spiky plants', 'rocks'],
  agave: ['agaves', 'desert plants', 'succulents', 'rocks'],
  cactus: ['cacti', 'desert landscaping', 'succulents', 'rocks'],
  walkway: ['walkways', 'entry path', 'pathway', 'front path'],
  paver: ['pavers', 'paver path', 'paver walkway'],
  gravel: ['pea gravel', 'decomposed granite', 'gravel path', 'rock landscaping'],
  rock: ['rocks', 'stone', 'boulder', 'gravel'],
  modern: ['contemporary', 'clean lines', 'luxury home', 'architectural'],
  luxury: ['premium', 'estate exterior', 'high end', 'modern home'],
  'row house': ['row houses', 'small front yard'],
  townhome: ['townhouse', 'small front yard'],
  lighting: ['path lights', 'low voltage lighting', 'exterior lighting', 'evening curb appeal'],
  water: ['water feature', 'fountain', 'reflecting pool', 'modern home']
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'around', 'for', 'from', 'front', 'ideas', 'into', 'landscaping',
  'of', 'on', 'or', 'that', 'the', 'to', 'with', 'yard', 'home', 'homes', 'house', 'houses'
]);

export const IMAGE_STYLE_GUIDE = {
  ratio: '2:3',
  direction:
    'Ultra realistic DSLR photography, luxury American homes, authentic landscaping, natural light, realistic textures, and no overprocessed or artificial look.'
} as const;

export const OVERLAY_EXAMPLES = [
  '25 Stunning Front Yard Ideas',
  'Luxury Curb Appeal',
  'Budget Landscaping Ideas',
  'Modern Front Yard Inspiration',
  'Beautiful Flower Bed Designs'
] as const;

export function photo(id: string, width = 1000, height = 1500, quality = 82) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=${quality}`;
}

const UNSPLASH_IDS_BY_INTENT: Record<ImageIntent, string[]> = {
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

const FOCAL_POINTS = [
  [0.5, 0.5],
  [0.38, 0.48],
  [0.62, 0.5],
  [0.5, 0.38],
  [0.5, 0.62],
  [0.34, 0.56],
  [0.66, 0.44],
  [0.46, 0.5]
] as const;

const BLOCKED_PHOTO_IDS = new Set([
  'photo-1600566752355-35792bedcfea',
  'photo-1600566753190-17f0baa2a6c3',
  'photo-1600585154526-990dced4db0d',
  'photo-1558904541-efa843a96f01',
  'photo-1600573472550-8090b5e0745e',
  'photo-1600047509807-ba8f99d2cdde',
  'photo-1600047509358-9dc75507daeb',
  'photo-1600607687644-c7171b42498f',
  'photo-1600607687920-4e2a09cf159d',
  'photo-1600607687939-ce8a6c25118c',
  'photo-1600607688969-a5bfcd646154'
]);

function curatedUnsplashPhoto(intent: ImageIntent, index: number, variantIndex = 0, width = 1000, height = 1500, quality = 84) {
  const ids = UNSPLASH_IDS_BY_INTENT[intent].filter((id) => !BLOCKED_PHOTO_IDS.has(id));
  const id = ids[(index + variantIndex * 3) % ids.length];
  const [fpX, fpY] = FOCAL_POINTS[(index + variantIndex) % FOCAL_POINTS.length];
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&crop=focalpoint&fp-x=${fpX}&fp-y=${fpY}&w=${width}&h=${height}&q=${quality}`;
}

export function isRealPhotographyUrl(src = '') {
  return /^https:\/\/images\.unsplash\.com\/photo-/.test(src);
}

export function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function scoreKeywordMatch(queryKeyword: string, imageKeyword: string) {
  if (queryKeyword === imageKeyword) return queryKeyword.includes(' ') ? 10 : 6;
  if (queryKeyword.includes(imageKeyword) || imageKeyword.includes(queryKeyword)) {
    return queryKeyword.includes(' ') || imageKeyword.includes(' ') ? 5 : 2;
  }
  return 0;
}

function groupMatches(group: readonly string[], keywords: string[]) {
  return group.some((keyword) => keywords.includes(normalizeText(keyword)));
}

function scoreImageCandidate(image: ImageCandidate, queryKeywords: string[], categoryIntent: ImageIntent, excluded: Set<string>) {
  if (excluded.has(image.src)) return Number.NEGATIVE_INFINITY;

  let score = image.category === categoryIntent ? 5 : 0;
  const imageKeywords = image.keywords;
  const imageKeywordSet = new Set(imageKeywords);

  for (const queryKeyword of queryKeywords) {
    if (imageKeywordSet.has(queryKeyword)) {
      score += queryKeyword.includes(' ') ? 10 : 6;
      continue;
    }
    score += imageKeywords.reduce((best, imageKeyword) => Math.max(best, scoreKeywordMatch(queryKeyword, imageKeyword)), 0);
  }

  const priorityRules = [
    { group: PRIORITY_KEYWORD_GROUPS.plants, exact: 18, category: 'flower-beds' as ImageIntent },
    { group: PRIORITY_KEYWORD_GROUPS.walkways, exact: 14, category: 'walkways' as ImageIntent },
    { group: PRIORITY_KEYWORD_GROUPS.rocks, exact: 14, category: 'rocks' as ImageIntent },
    { group: PRIORITY_KEYWORD_GROUPS.modern, exact: 10, category: 'modern' as ImageIntent },
    { group: PRIORITY_KEYWORD_GROUPS.small, exact: 12, category: 'small-yards' as ImageIntent }
  ];

  for (const rule of priorityRules) {
    if (!groupMatches(rule.group, queryKeywords)) continue;
    if (image.category === rule.category) score += 8;
    if (groupMatches(rule.group, imageKeywords)) score += rule.exact;
    else score -= 14;
  }

  return score;
}

function getKeywordIntent(keyword: string): ImageIntent | null {
  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some((candidate) => normalizeText(candidate) === keyword)) return intent as ImageIntent;
  }
  for (const [intent, keywords] of Object.entries(BROAD_INTENT_KEYWORDS)) {
    if (keywords.some((candidate) => normalizeText(candidate) === keyword)) return intent as ImageIntent;
  }
  return null;
}

function hasExactKeywordMatch(image: ImageCandidate, keywords: string[]) {
  const imageKeywords = new Set(image.keywords.map((keyword) => normalizeText(keyword)));
  const imageText = normalizeText([image.alt, image.overlayText, ...image.keywords].join(' '));
  return keywords.some((keyword) => imageKeywords.has(keyword) || imageText.includes(keyword));
}

function prepareSectionImageScore(context: ArticleSectionImageContext) {
  const sectionKeywords = getSectionKeywords(context.heading, context.previousParagraph, context.nextParagraph);
  const titleKeywords = getSectionKeywords(context.title);
  const slugKeywords = getSectionKeywords(context.slug);
  const categoryKeywords = getSectionKeywords(context.category);
  const descriptiveKeywords = getSectionKeywords(context.alt, context.caption, context.overlay);
  const articleIntent = getImageIntent([context.title, context.slug].filter(Boolean).join(' '), context.category);
  const sectionIntent = getImageIntent(
    [context.heading, context.previousParagraph, context.nextParagraph, context.alt, context.caption, context.overlay].filter(Boolean).join(' '),
    context.category
  );
  const strictKeywordIntents = sectionKeywords
    .map(getKeywordIntent)
    .filter((intent): intent is ImageIntent => Boolean(intent));
  const strictIntent = strictKeywordIntents[0] ?? sectionIntent;
  const allKeywords = uniqueValues([...sectionKeywords, ...descriptiveKeywords, ...titleKeywords, ...slugKeywords, ...categoryKeywords]);

  return {
    sectionKeywords,
    titleKeywords,
    slugKeywords,
    categoryKeywords,
    descriptiveKeywords,
    articleIntent,
    sectionIntent,
    strictIntent,
    allKeywords
  };
}

function scorePreparedImageForSection(
  image: ImageCandidate,
  prepared: ReturnType<typeof prepareSectionImageScore>,
  excludedUrls: string[] = []
) {
  if (excludedUrls.includes(image.src)) return Number.NEGATIVE_INFINITY;

  let score = 0;
  if (hasExactKeywordMatch(image, prepared.sectionKeywords)) score += 15;
  if (hasExactKeywordMatch(image, prepared.titleKeywords)) score += 10;
  if (hasExactKeywordMatch(image, prepared.slugKeywords)) score += 8;
  if (image.category === prepared.articleIntent || image.category === prepared.sectionIntent || hasExactKeywordMatch(image, prepared.categoryKeywords)) score += 5;
  if (hasExactKeywordMatch(image, prepared.descriptiveKeywords)) score += 5;

  if (prepared.strictIntent && image.category !== prepared.strictIntent) score -= 20;
  if (image.fallback) score -= 10;

  score += scoreImageCandidate(image, prepared.allKeywords, prepared.strictIntent, new Set(excludedUrls)) / 3;

  return score;
}

export function getSectionKeywords(...values: Array<string | string[] | undefined>) {
  return extractSemanticKeywords(...values).filter((keyword) => {
    const normalized = normalizeText(keyword);
    if (!normalized || normalized.length < 3) return false;
    if (STOP_WORDS.has(normalized)) return false;
    return true;
  });
}

export function scoreImageForSection(
  image: ImageCandidate,
  context: ArticleSectionImageContext,
  excludedUrls: string[] = context.usedUrls ?? []
) {
  return scorePreparedImageForSection(image, prepareSectionImageScore(context), excludedUrls);
}

function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeText(value = '') {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => normalizeText(value)).filter(Boolean))];
}

function getWords(value = '') {
  return normalizeText(value)
    .split(' ')
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function getPhrases(value = '') {
  const words = getWords(value);
  const phrases: string[] = [];
  for (let index = 0; index < words.length; index += 1) {
    phrases.push(words[index]);
    if (words[index + 1]) phrases.push(`${words[index]} ${words[index + 1]}`);
    if (words[index + 2]) phrases.push(`${words[index]} ${words[index + 1]} ${words[index + 2]}`);
  }
  return phrases;
}

function expandSemanticKeywords(keywords: string[]) {
  const expanded = [...keywords];
  for (const keyword of keywords) {
    const normalized = normalizeText(keyword);
    expanded.push(...(SEMANTIC_ALIASES[normalized] ?? []));
    for (const [source, aliases] of Object.entries(SEMANTIC_ALIASES)) {
      if (aliases.map((alias) => normalizeText(alias)).includes(normalized)) expanded.push(source);
    }
  }
  return uniqueValues(expanded);
}

export function extractSemanticKeywords(...values: Array<string | string[] | undefined>) {
  const text = values.flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean).join(' ');
  const normalized = normalizeText(text);
  const directMatches = [
    ...Object.values(PRIORITY_KEYWORD_GROUPS).flat(),
    ...Object.keys(SEMANTIC_ALIASES),
    ...Object.values(SEMANTIC_ALIASES).flat()
  ].filter((keyword) => normalized.includes(normalizeText(keyword)));

  return expandSemanticKeywords([...directMatches, ...getPhrases(normalized)]).slice(0, 80);
}

function buildImageKeywords(topic: string, intent: ImageIntent) {
  const topicKeywords = getPhrases(topic);
  const exactPriorityMatches = Object.values(PRIORITY_KEYWORD_GROUPS)
    .flat()
    .filter((keyword) => normalizeText(topic).includes(normalizeText(keyword)));
  return expandSemanticKeywords([
    ...BROAD_INTENT_KEYWORDS[intent],
    ...topicKeywords,
    ...exactPriorityMatches
  ]);
}

function buildPool(intent: ImageIntent, baseSignature: number): ImageCandidate[] {
  const photographyVariants = [
    'DSLR natural light American home exterior',
    'premium realistic front yard magazine photography'
  ];

  return TOPICS[intent].flatMap((topic, index) => photographyVariants.map((_, variantIndex) => ({
    src: curatedUnsplashPhoto(intent, index + baseSignature, variantIndex),
    alt: `${titleCase(topic)} for a realistic American front yard`,
    category: intent,
    keywords: buildImageKeywords(topic, intent),
    overlayText: titleCase(topic.replace(/\b(front|yard|landscaping|ideas)\b/g, '').replace(/\s+/g, ' ').trim()),
    credit: 'Curated Unsplash photography URL, cropped for a Pinterest 2:3 editorial layout'
  })));
}

export const IMAGE_POOLS: Record<ImageIntent, ImageCandidate[]> = {
  rocks: buildPool('rocks', 1000),
  'flower-beds': buildPool('flower-beds', 2000),
  walkways: buildPool('walkways', 3000),
  'low-maintenance': buildPool('low-maintenance', 4000),
  modern: buildPool('modern', 5000),
  budget: buildPool('budget', 6000),
  'small-yards': buildPool('small-yards', 7000),
  'curb-appeal': buildPool('curb-appeal', 8000)
};

export const IMAGE_KEYWORD_DATABASE: ImageCandidate[] = Object.values(IMAGE_POOLS)
  .flat()
  .map((image) => ({
    src: image.src,
    alt: image.alt,
    category: image.category,
    keywords: image.keywords,
    overlayText: image.overlayText,
    credit: image.credit,
    score: 0
  }));

export const LANDSCAPE_PHOTOS = {
  luxuryCurbAppeal: IMAGE_POOLS['curb-appeal'][0].src,
  modernHome: IMAGE_POOLS.modern[0].src,
  budgetYard: IMAGE_POOLS.budget[0].src,
  flowerBeds: IMAGE_POOLS['flower-beds'][0].src,
  rockGarden: IMAGE_POOLS.rocks[0].src,
  walkway: IMAGE_POOLS.walkways[0].src,
  smallYard: IMAGE_POOLS['small-yards'][0].src,
  porchGarden: IMAGE_POOLS['curb-appeal'][1].src,
  estateExterior: IMAGE_POOLS['curb-appeal'][39].src,
  classicHome: IMAGE_POOLS['curb-appeal'][33].src,
  beforeExterior: IMAGE_POOLS.budget[30].src,
  gardenDetail: IMAGE_POOLS['flower-beds'][26].src,
  cottageFlowers: IMAGE_POOLS['flower-beds'][13].src
} as const;

function getIntentFromCategory(category = ''): ImageIntent {
  const normalized = category.toLowerCase();
  if (normalized.includes('rock')) return 'rocks';
  if (normalized.includes('flower')) return 'flower-beds';
  if (normalized.includes('walkway')) return 'walkways';
  if (normalized.includes('low maintenance')) return 'low-maintenance';
  if (normalized.includes('modern')) return 'modern';
  if (normalized.includes('budget')) return 'budget';
  if (normalized.includes('small')) return 'small-yards';
  if (normalized.includes('curb appeal')) return 'curb-appeal';
  return 'curb-appeal';
}

export function getImageIntent(text = '', category = ''): ImageIntent {
  const normalized = normalizeText(`${text} ${category}`);
  const categoryIntent = getIntentFromCategory(category);

  const priorityOrder: ImageIntent[] = [
    'rocks',
    'budget',
    'walkways',
    'flower-beds',
    'low-maintenance',
    'small-yards',
    'modern',
    'curb-appeal'
  ];

  for (const intent of priorityOrder) {
    if (KEYWORDS[intent].some((keyword) => normalized.includes(keyword))) {
      return intent;
    }
  }

  const scores = Object.entries(KEYWORDS).map(([intent, keywords]) => {
    const score = keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0);
    return { intent: intent as ImageIntent, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0].intent : categoryIntent;
}

function chooseBestImage(text: string, seed: string, category = '', variant?: number, excludedUrls: string[] = []) {
  const queryKeywords = extractSemanticKeywords(text, category);
  const categoryIntent = getImageIntent(text, category);
  const excluded = new Set(excludedUrls);
  const seedHash = hashText(`${seed}:${variant ?? 'primary'}`);

  const scored = IMAGE_KEYWORD_DATABASE
    .map((image, index) => {
      const semanticScore = scoreImageCandidate(image, queryKeywords, categoryIntent, excluded);
      const tieBreaker = ((seedHash + index * 17) % 997) / 10000;
      return { image, score: semanticScore + tieBreaker };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);

  const fallback = IMAGE_POOLS[categoryIntent][seedHash % IMAGE_POOLS[categoryIntent].length];
  const selected = scored[0]?.image ?? fallback;
  const selectedScore = Math.floor(scored[0]?.score ?? 0);

  return {
    ...selected,
    score: selectedScore,
    fallback: selectedScore <= 0,
    intent: selected.category
  };
}

export function getImageForArticleSection(context: ArticleSectionImageContext) {
  const sectionText = [
    context.title,
    context.category,
    context.slug,
    context.heading,
    context.previousParagraph,
    context.nextParagraph,
    context.alt,
    context.caption,
    context.overlay
  ].filter(Boolean).join(' ');
  const sectionIntent = getImageIntent(
    [context.heading, context.previousParagraph, context.nextParagraph, context.alt, context.caption, context.overlay].filter(Boolean).join(' '),
    context.category
  );
  const seed = context.seed ?? sectionText;
  const seedHash = hashText(seed);
  const preparedScore = prepareSectionImageScore(context);
  const excludedUrls = context.usedUrls ?? [];

  const scored = IMAGE_KEYWORD_DATABASE
    .map((image, index) => {
      const sectionScore = scorePreparedImageForSection(image, preparedScore, excludedUrls);
      const tieBreaker = ((seedHash + index * 19) % 997) / 10000;
      return { image, score: sectionScore + tieBreaker };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);

  const fallback = IMAGE_POOLS[sectionIntent][seedHash % IMAGE_POOLS[sectionIntent].length];
  const selected = scored[0]?.image ?? fallback;
  const selectedScore = Math.floor(scored[0]?.score ?? 0);

  return {
    ...selected,
    score: selectedScore,
    fallback: selectedScore <= 0,
    intent: selected.category,
    src: withVariantSignature(selected.src, hashText(`${seed}:${selected.src}`))
  };
}

function withVariantSignature(src: string, variant?: number) {
  if (typeof variant !== 'number') return src;
  const signature = 90000 + (variant % 100000);
  if (isRealPhotographyUrl(src)) return `${src}${src.includes('?') ? '&' : '?'}fya=${signature}`;
  return src;
}

export function getResolvedArticleImage(_src: string, text: string, seed = text, category = '') {
  return getImageForArticleSection({
    title: text,
    category,
    heading: text,
    previousParagraph: text,
    alt: text,
    overlay: text,
    seed
  });
}

export function getImageForPost(post: PostLike, variant?: number, excludedUrls: string[] = []) {
  const text = [post.data.title, post.slug, post.data.category, ...(post.data.tags ?? [])].join(' ');
  const image = chooseBestImage(text, post.slug, post.data.category, variant, excludedUrls);
  return {
    ...image,
    src: withVariantSignature(image.src, typeof variant === 'number' ? hashText(`${post.slug}:${variant}`) : undefined),
    alt: post.data.imageAlt ?? image.alt,
    intent: image.intent
  };
}

export function getImageForText(text: string, seed = text, category = '', variant?: number, excludedUrls: string[] = []) {
  const image = chooseBestImage(text, seed, category, variant, excludedUrls);
  return {
    ...image,
    src: withVariantSignature(image.src, variant),
    intent: image.intent
  };
}

export function getImagesForArticleSections(post: PostLike, count = 8, excludedUrls: string[] = [], sectionContexts: string[] = []) {
  const baseText = [post.data.title, post.slug, post.data.category, ...(post.data.tags ?? [])].join(' ');
  const used = new Set(excludedUrls);
  const images: Array<ImageCandidate & { intent: ImageIntent }> = [];

  for (let step = 0; images.length < count && step < count * 8 + 8; step += 1) {
    const sectionText = sectionContexts[step % Math.max(1, sectionContexts.length)] ?? baseText;
    const image = getImageForArticleSection({
      title: post.data.title,
      slug: post.slug,
      category: post.data.category,
      heading: sectionText,
      previousParagraph: sectionText,
      alt: sectionText,
      overlay: sectionText,
      usedUrls: [...used],
      seed: `${post.slug}:supplemental:${step}`
    });
    if (!used.has(image.src)) {
      used.add(image.src);
      images.push({ ...image, intent: image.intent });
    }
  }

  return images;
}

export function getFallbackImageForCategory(category: string) {
  const intent = getIntentFromCategory(category);
  const image = IMAGE_POOLS[intent][0];
  return {
    ...image,
    intent
  };
}

export function getImagePoolStats() {
  const entries = Object.values(IMAGE_POOLS).flat();
  return {
    categories: Object.keys(IMAGE_POOLS).length,
    totalEntries: entries.length,
    uniqueUrls: new Set(entries.map((entry) => entry.src)).size,
    perCategory: Object.fromEntries(Object.entries(IMAGE_POOLS).map(([category, images]) => [category, images.length]))
  };
}
