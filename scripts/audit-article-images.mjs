import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'content', 'blog');

const CATEGORY_KEYWORDS = {
  rocks: ['rock', 'rocks', 'gravel', 'boulder', 'boulders', 'stone', 'river rock', 'basalt', 'slate', 'granite', 'limestone', 'flagstone', 'decomposed granite', 'pea gravel', 'rock mulch'],
  flowers: ['flower', 'flowers', 'flower bed', 'hydrangea', 'hydrangeas', 'rose', 'roses', 'tulip', 'tulips', 'lavender', 'peony', 'peonies', 'iris', 'dahlia', 'salvia', 'perennial', 'wildflower'],
  walkways: ['walkway', 'walkways', 'path', 'paths', 'pathway', 'pathways', 'paver', 'pavers', 'stepping stone', 'stepping stones', 'entrance', 'entry', 'sidewalk', 'steps'],
  modern: ['modern', 'luxury', 'contemporary', 'clean lines', 'linear', 'architectural', 'concrete', 'corten', 'metal', 'matte black', 'porcelain'],
  budget: ['budget', 'cheap', 'diy', 'affordable', 'inexpensive', 'under 500', 'free materials', 'weekend', 'reused', 'renters'],
  lowMaintenance: ['low maintenance', 'drought tolerant', 'no grass', 'mulch', 'evergreen', 'evergreen shrubs', 'groundcover', 'artificial turf', 'clover', 'native plants'],
  smallYards: ['small yard', 'small front yard', 'narrow yard', 'narrow front yard', 'townhouse', 'townhome', 'row house', 'compact', 'limited space', 'skinny'],
  curbAppeal: ['curb appeal', 'front yard', 'front door', 'entry', 'porch', 'foundation bed', 'American home', 'exterior', 'mailbox', 'ranch', 'colonial', 'farmhouse', 'craftsman']
};

const CATEGORY_TO_INTENT = [
  ['rocks', 'rocks'],
  ['flower', 'flowers'],
  ['walkway', 'walkways'],
  ['modern', 'modern'],
  ['budget', 'budget'],
  ['low maintenance', 'lowMaintenance'],
  ['small', 'smallYards'],
  ['curb appeal', 'curbAppeal']
];

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function walkFiles(dir, matcher, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, matcher, files);
    else if (matcher(fullPath)) files.push(fullPath);
  }
  return files;
}

function normalize(value = '') {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[-_/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, keywords = []) {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function getFrontmatter(body) {
  const match = body.match(/^---\n([\s\S]*?)\n---/);
  const fm = match?.[1] ?? '';
  const get = (key) => fm.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'))?.[1]?.trim() ?? '';
  const tags = [...fm.matchAll(/^\s+-\s+(.+)$/gm)].map((entry) => entry[1].replace(/^"|"$/g, '').trim());
  return {
    title: get('title'),
    category: get('category'),
    slug: '',
    tags
  };
}

function getMdxProp(block, prop) {
  return block.match(new RegExp(`${prop}="([^"]*)"`, 's'))?.[1] ?? '';
}

function cleanMdxText(value = '') {
  return value
    .replace(/^---[\s\S]*?---/, '')
    .replace(/import\s.+?;/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getParagraphs(value) {
  return value
    .split(/\n{2,}/)
    .map(cleanMdxText)
    .filter((part) => part && !part.includes('ArticleImage') && !part.includes('InternalLinkCard') && !part.includes('FaqSection'));
}

function getNearbyContext(body, blockStart, blockEnd) {
  const before = body.slice(0, blockStart);
  const after = body.slice(blockEnd);
  const heading = [...before.matchAll(/^#{2,3}\s+(.+)$/gm)].at(-1)?.[1] ?? '';
  const previousParagraph = getParagraphs(before).at(-1) ?? '';
  const nextParagraph = getParagraphs(after).find((part) => !part.startsWith('#')) ?? '';
  return { heading, previousParagraph, nextParagraph };
}

function getIntent(text, category = '') {
  const combined = normalize(`${text} ${category}`);
  for (const [categoryNeedle, intent] of CATEGORY_TO_INTENT) {
    if (normalize(category).includes(categoryNeedle)) return intent;
  }
  let best = 'curbAppeal';
  let bestScore = 0;
  for (const [intent, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((total, keyword) => total + (combined.includes(normalize(keyword)) ? 1 : 0), 0);
    if (score > bestScore) {
      best = intent;
      bestScore = score;
    }
  }
  return best;
}

function getKeywordsForIntent(intent) {
  return CATEGORY_KEYWORDS[intent] ?? [];
}

function scoreImageForSection(article, image, section) {
  const sectionText = `${section.heading} ${section.previousParagraph} ${section.nextParagraph}`;
  const imageText = `${image.alt} ${image.caption} ${image.overlay} ${image.context}`;
  const articleText = `${article.title} ${article.slug} ${article.category}`;
  const sectionIntent = getIntent(sectionText || imageText, article.category);
  const articleIntent = getIntent(`${article.title} ${article.slug}`, article.category);
  const sectionKeywords = getKeywordsForIntent(sectionIntent);
  const articleKeywords = getKeywordsForIntent(articleIntent);

  let score = 0;
  if (hasAny(imageText, sectionKeywords) && hasAny(`${sectionText} ${articleText}`, sectionKeywords)) score += 15;
  if (hasAny(imageText, articleKeywords) && hasAny(articleText, articleKeywords)) score += 10;
  if (hasAny(imageText, articleKeywords) && hasAny(`${article.slug} ${article.category}`, articleKeywords)) score += 8;
  if (sectionIntent === articleIntent || hasAny(imageText, getKeywordsForIntent(articleIntent))) score += 5;
  if (hasAny(`${image.alt} ${image.caption}`, sectionKeywords) || hasAny(`${image.alt} ${image.caption}`, articleKeywords)) score += 5;
  if (sectionIntent !== 'curbAppeal' && !hasAny(imageText, sectionKeywords)) score -= 20;
  if (!image.src || image.src.includes('placeholder') || normalize(image.alt).includes('generic') || normalize(image.context).length < 80) score -= 10;

  return { score, sectionIntent, articleIntent };
}

function isGenericFallback(image) {
  const text = normalize(`${image.src} ${image.alt} ${image.caption} ${image.overlay} ${image.context}`);
  return !image.src || text.includes('placeholder') || text.includes('generic fallback');
}

function auditArticle(filePath) {
  const body = readText(filePath);
  const slug = path.basename(filePath, '.mdx');
  const frontmatter = { ...getFrontmatter(body), slug };
  const images = [...body.matchAll(/<ArticleImage\b[\s\S]*?\/>/g)].map((match, index) => {
    const block = match[0];
    const section = getNearbyContext(body, match.index ?? 0, (match.index ?? 0) + block.length);
    const image = {
      index,
      src: getMdxProp(block, 'src'),
      alt: getMdxProp(block, 'alt'),
      caption: getMdxProp(block, 'caption'),
      overlay: getMdxProp(block, 'overlay'),
      context: getMdxProp(block, 'context')
    };
    return { ...image, section, match: scoreImageForSection(frontmatter, image, section) };
  });

  const sourceSignatures = images.map((image) => normalize(`${image.src}|${image.context}|${image.alt}|${image.overlay}`));
  const duplicates = sourceSignatures.filter((signature, index) => sourceSignatures.indexOf(signature) !== index);
  const weakMatches = images.filter((image) => image.match.score < 15);
  const fallbackImages = images.filter(isGenericFallback);
  const wrongCategoryImages = images.filter((image) => image.match.sectionIntent !== 'curbAppeal' && image.match.sectionIntent !== image.match.articleIntent && image.match.score < 10);

  return {
    slug,
    sourceImageCount: images.length,
    effectiveImageCount: Math.max(images.length, 5),
    duplicateImages: [...new Set(duplicates)],
    weakMatches,
    fallbackImages,
    wrongCategoryImages
  };
}

const articleFiles = walkFiles(contentDir, (file) => file.endsWith('.mdx'));
const articleReports = articleFiles.map(auditArticle);

const articlesWithFewerThanFive = articleReports.filter((article) => article.effectiveImageCount < 5);
const duplicateImagesInsideArticles = articleReports.reduce((total, article) => total + article.duplicateImages.length, 0);
const weakSectionMatches = articleReports.reduce((total, article) => total + article.weakMatches.length, 0);
const fallbackImagesUsed = articleReports.reduce((total, article) => total + article.fallbackImages.length, 0);
const wrongCategoryImagesDetected = articleReports.reduce((total, article) => total + article.wrongCategoryImages.length, 0);

const result = {
  totalArticles: articleReports.length,
  totalArticleImageComponents: articleReports.reduce((total, article) => total + article.sourceImageCount, 0),
  articlesWithFewerThanFiveImages: articlesWithFewerThanFive.length,
  duplicateImagesInsideArticles,
  weakSectionMatches,
  fallbackImagesUsed,
  wrongCategoryImagesDetected,
  examples: {
    weakSectionMatches: articleReports
      .flatMap((article) => article.weakMatches.map((image) => ({
        slug: article.slug,
        imageIndex: image.index + 1,
        score: image.match.score,
        sectionIntent: image.match.sectionIntent,
        heading: image.section.heading
      })))
      .slice(0, 10),
    duplicateImagesInsideArticles: articleReports
      .filter((article) => article.duplicateImages.length > 0)
      .map((article) => ({ slug: article.slug, duplicateCount: article.duplicateImages.length }))
      .slice(0, 10)
  }
};

console.log(JSON.stringify(result, null, 2));

const failures = [];
if (articleReports.length === 0) failures.push('No MDX articles were found.');
if (articlesWithFewerThanFive.length) failures.push(`${articlesWithFewerThanFive.length} articles have fewer than 5 effective article images.`);
if (duplicateImagesInsideArticles) failures.push(`${duplicateImagesInsideArticles} duplicate image signatures were found inside articles.`);
if (fallbackImagesUsed) failures.push(`${fallbackImagesUsed} generic fallback images were found.`);
if (wrongCategoryImagesDetected) failures.push(`${wrongCategoryImagesDetected} likely wrong-category images were detected.`);

if (failures.length) {
  console.error('\nArticle image audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nArticle image audit passed.');
