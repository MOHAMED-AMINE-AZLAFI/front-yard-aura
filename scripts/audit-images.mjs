import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'content', 'blog');
const distSearch = path.join(root, 'dist', 'search.json');
const distBlog = path.join(root, 'dist', 'blog');

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

function countBy(items) {
  return items.reduce((acc, item) => {
    acc.set(item, (acc.get(item) ?? 0) + 1);
    return acc;
  }, new Map());
}

function topCounts(items, limit = 10) {
  return [...countBy(items).entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function getImageSources(html) {
  return [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((src) => !src.includes('/brand/'));
}

function isRealPhotographyUrl(src) {
  return /^https:\/\/images\.unsplash\.com\/photo-/.test(src);
}

const mdxFiles = walkFiles(contentDir, (file) => file.endsWith('.mdx'));
const posts = fs.existsSync(distSearch) ? JSON.parse(readText(distSearch)) : [];

const featuredImages = posts.map((post) => post.image).filter(Boolean);
const nonRealFeaturedImages = featuredImages.filter((src) => !isRealPhotographyUrl(src));
const first60 = featuredImages.slice(0, 60);
const first60Dupes = topCounts(first60).filter(([, count]) => count > 1);
const allDupes = topCounts(featuredImages);
const missingFeatured = posts.filter((post) => !post.image);

const articleReports = posts.map((post) => {
  const slug = post.url.replace(/^\/blog\//, '').replace(/\/$/, '');
  const htmlPath = path.join(distBlog, slug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return {
      slug,
      missingHtml: true,
      contentImageCount: 0,
      duplicateContentImages: []
    };
  }

  const images = getImageSources(readText(htmlPath));
  const contentImages = images.slice(2);
  const nonRealImages = contentImages.filter((src) => !isRealPhotographyUrl(src));
  const duplicateContentImages = topCounts(contentImages).filter(([, count]) => count > 1);

  return {
    slug,
    missingHtml: false,
    contentImageCount: contentImages.length,
    realContentImageCount: contentImages.length - nonRealImages.length,
    nonRealImages,
    duplicateContentImages
  };
});

const missingHtml = articleReports.filter((report) => report.missingHtml);
const fewerThanFive = articleReports.filter((report) => report.contentImageCount < 5);
const duplicateInsideArticle = articleReports.filter((report) => report.duplicateContentImages.length > 0);
const articlesWithNonRealImages = articleReports.filter((report) => report.nonRealImages?.length > 0);
const allContentImages = articleReports.flatMap((report) => {
  if (report.missingHtml) return [];
  const htmlPath = path.join(distBlog, report.slug, 'index.html');
  return getImageSources(readText(htmlPath)).slice(2);
});
const realContentImages = allContentImages.filter(isRealPhotographyUrl);

const result = {
  articlesInSource: mdxFiles.length,
  articlesInSearchIndex: posts.length,
  featuredImages: featuredImages.length,
  uniqueFeaturedImages: new Set(featuredImages).size,
  nonRealFeaturedImages: nonRealFeaturedImages.length,
  totalRealContentImages: realContentImages.length,
  uniqueRealContentImages: new Set(realContentImages).size,
  highestFeaturedImageRepeats: allDupes[0] ?? null,
  topFeaturedImageRepeats: allDupes.slice(0, 5),
  missingFeaturedImages: missingFeatured.map((post) => post.url),
  first60DuplicateImages: first60Dupes,
  missingArticleHtml: missingHtml.map((report) => report.slug),
  articlesWithFewerThanFiveContentImages: fewerThanFive.map((report) => ({
    slug: report.slug,
    contentImageCount: report.contentImageCount
  })),
  articlesWithNonRealImages: articlesWithNonRealImages.map((report) => ({
    slug: report.slug,
    nonRealImages: report.nonRealImages
  })),
  articlesWithDuplicateContentImages: duplicateInsideArticle.map((report) => ({
    slug: report.slug,
    duplicateContentImages: report.duplicateContentImages
  }))
};

console.log(JSON.stringify(result, null, 2));

const failures = [];
if (mdxFiles.length !== 300) failures.push(`Expected 300 source articles, found ${mdxFiles.length}.`);
if (posts.length !== 300) failures.push(`Expected 300 search index articles, found ${posts.length}.`);
if (missingFeatured.length) failures.push(`${missingFeatured.length} articles are missing featured images.`);
if (nonRealFeaturedImages.length) failures.push(`${nonRealFeaturedImages.length} featured images are not approved real photography URLs.`);
if (first60Dupes.length) failures.push(`First 60 blog cards contain duplicate image URLs.`);
if (missingHtml.length) failures.push(`${missingHtml.length} article HTML files are missing.`);
if (fewerThanFive.length) failures.push(`${fewerThanFive.length} articles have fewer than 5 content images.`);
if (articlesWithNonRealImages.length) failures.push(`${articlesWithNonRealImages.length} articles contain non-real or placeholder image URLs.`);
if (duplicateInsideArticle.length) failures.push(`${duplicateInsideArticle.length} articles repeat an image inside the content area.`);
if ((allDupes[0]?.[1] ?? 0) > 3) failures.push(`Highest featured image repeat is ${allDupes[0][1]}, expected 3 or fewer.`);

if (failures.length) {
  console.error('\nImage audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nImage audit passed.');
