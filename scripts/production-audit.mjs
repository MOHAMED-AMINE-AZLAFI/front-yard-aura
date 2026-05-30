import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const contentDir = path.join(root, 'src', 'content', 'blog');
const siteUrl = 'https://frontyardaura.com';

function walk(dir, matcher, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, matcher, files);
    else if (matcher(full)) files.push(full);
  }
  return files;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function routeFromHtml(file) {
  const rel = path.relative(dist, file).replaceAll(path.sep, '/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))?.[1] ?? '';
}

function getTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? '';
}

function getMetaContent(html, selector) {
  const tag = html.match(selector)?.[0] ?? '';
  return attr(tag, 'content');
}

function getCanonical(html) {
  const tag = html.match(/<link\b[^>]*rel="canonical"[^>]*>/i)?.[0] ?? '';
  return attr(tag, 'href');
}

function getLinks(html) {
  return [...html.matchAll(/<a\b[^>]*href="([^"]+)"/gi)].map((match) => match[1]);
}

function getImages(html) {
  return [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function countBy(items) {
  const map = new Map();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return map;
}

function duplicates(items) {
  return [...countBy(items).entries()].filter(([, count]) => count > 1);
}

function normalizeInternalHref(href) {
  if (!href || href.startsWith('#')) return null;
  if (/^(mailto:|tel:|javascript:)/i.test(href)) return null;
  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);
      if (url.origin !== siteUrl) return null;
      return `${url.pathname}${url.pathname.endsWith('/') || path.extname(url.pathname) ? '' : '/'}${url.search}`;
    } catch {
      return null;
    }
  }
  if (!href.startsWith('/')) return null;
  const [pathname] = href.split(/[?#]/);
  if (pathname === '') return '/';
  return pathname.endsWith('/') || path.extname(pathname) ? pathname : `${pathname}/`;
}

function existsRoute(route, existingRoutes) {
  if (!route) return true;
  const [pathname] = route.split(/[?#]/);
  if (existingRoutes.has(pathname)) return true;
  const assetPath = path.join(dist, pathname.replace(/^\//, ''));
  return fs.existsSync(assetPath);
}

function parseSitemapUrls() {
  const sitemap = path.join(dist, 'sitemap.xml');
  if (!fs.existsSync(sitemap)) return [];
  return [...read(sitemap).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
}

const htmlFiles = walk(dist, (file) => file.endsWith('.html'));
const routes = new Map(htmlFiles.map((file) => [routeFromHtml(file), file]));
const existingRoutes = new Set(routes.keys());
const blogHtmlFiles = htmlFiles.filter((file) => routeFromHtml(file).startsWith('/blog/') && routeFromHtml(file) !== '/blog/');
const mdxFiles = walk(contentDir, (file) => file.endsWith('.mdx'));
const sitemapUrls = parseSitemapUrls();
const robotsPath = path.join(dist, 'robots.txt');
const searchIndexPath = path.join(dist, 'search.json');
const searchIndex = fs.existsSync(searchIndexPath) ? JSON.parse(read(searchIndexPath)) : [];

const pageReports = htmlFiles.map((file) => {
  const html = read(file);
  const route = routeFromHtml(file);
  const title = getTitle(html);
  const description = getMetaContent(html, /<meta\b[^>]*name="description"[^>]*>/i);
  const canonical = getCanonical(html);
  const ogTitle = getMetaContent(html, /<meta\b[^>]*property="og:title"[^>]*>/i);
  const ogDescription = getMetaContent(html, /<meta\b[^>]*property="og:description"[^>]*>/i);
  const ogImage = getMetaContent(html, /<meta\b[^>]*property="og:image"[^>]*>/i);
  const twitterCard = getMetaContent(html, /<meta\b[^>]*name="twitter:card"[^>]*>/i);
  const twitterTitle = getMetaContent(html, /<meta\b[^>]*name="twitter:title"[^>]*>/i);
  const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1].trim());
  const images = getImages(html);
  const imagesMissingAlt = images.filter((tag) => !attr(tag, 'alt').trim());
  const links = getLinks(html);
  const brokenLinks = links
    .map(normalizeInternalHref)
    .filter(Boolean)
    .filter((href) => !existsRoute(href, existingRoutes));
  const monetagSlots = (html.match(/data-monetag-placeholder="true"/g) ?? []).length;
  const adsenseSlots = (html.match(/data-adsense-placeholder="true"/g) ?? []).length;

  return {
    route,
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    twitterTitle,
    schemas,
    imagesMissingAlt,
    brokenLinks,
    monetagSlots,
    adsenseSlots,
    hasViewport: /<meta\b[^>]*name="viewport"[^>]*content="[^"]*width=device-width/i.test(html)
  };
});

const articleReports = pageReports.filter((report) => report.route.startsWith('/blog/') && report.route !== '/blog/');
const titleDupes = duplicates(articleReports.map((report) => report.title).filter(Boolean));
const descriptionDupes = duplicates(articleReports.map((report) => report.description).filter(Boolean));
const brokenLinks = pageReports.flatMap((report) => report.brokenLinks.map((href) => ({ page: report.route, href })));
const missingSeo = articleReports.filter((report) => !report.title || !report.description || !report.canonical);
const missingOg = articleReports.filter((report) => !report.ogTitle || !report.ogDescription || !report.ogImage);
const missingTwitter = articleReports.filter((report) => !report.twitterCard || !report.twitterTitle);
const missingSchema = articleReports.filter((report) => !report.schemas.some((schema) => schema.includes('"BlogPosting"')));
const imagesMissingAlt = pageReports.flatMap((report) => report.imagesMissingAlt.map((tag) => ({ page: report.route, tag })));
const pagesMissingViewport = pageReports.filter((report) => !report.hasViewport);
const sitemapSet = new Set(sitemapUrls.map((url) => new URL(url).pathname));
const pagesMissingFromSitemap = [...existingRoutes].filter((route) => !sitemapSet.has(route));
const jsFiles = walk(path.join(dist, '_astro'), (file) => file.endsWith('.js'));
const totalJsBytes = jsFiles.reduce((total, file) => total + fs.statSync(file).size, 0);
const monetagSlots = pageReports.reduce((total, report) => total + report.monetagSlots, 0);
const adsenseSlots = pageReports.reduce((total, report) => total + report.adsenseSlots, 0);

const result = {
  totalPosts: mdxFiles.length,
  indexedPosts: searchIndex.length,
  totalPages: htmlFiles.length,
  articlePages: blogHtmlFiles.length,
  sitemapUrls: sitemapUrls.length,
  robotsExists: fs.existsSync(robotsPath),
  robotsHasSitemap: fs.existsSync(robotsPath) && read(robotsPath).includes(`${siteUrl}/sitemap.xml`),
  brokenLinksCount: brokenLinks.length,
  duplicateTitlesCount: titleDupes.length,
  duplicateMetaDescriptionsCount: descriptionDupes.length,
  missingSeoMetadataArticles: missingSeo.length,
  missingOpenGraphArticles: missingOg.length,
  missingTwitterCardArticles: missingTwitter.length,
  missingBlogPostingSchemaArticles: missingSchema.length,
  imageAltMissingCount: imagesMissingAlt.length,
  pagesMissingViewportCount: pagesMissingViewport.length,
  pagesMissingFromSitemapCount: pagesMissingFromSitemap.length,
  monetagPlaceholderSlots: monetagSlots,
  adsensePlaceholderSlots: adsenseSlots,
  totalClientJsBytes: totalJsBytes,
  coreWebVitalsStaticChecks: {
    staticOutput: true,
    smallClientBundle: totalJsBytes < 50000,
    viewportMetaPresent: pagesMissingViewport.length === 0,
    imageAltTextComplete: imagesMissingAlt.length === 0
  },
  samples: {
    brokenLinks: brokenLinks.slice(0, 10),
    duplicateTitles: titleDupes.slice(0, 5),
    duplicateMetaDescriptions: descriptionDupes.slice(0, 5),
    pagesMissingFromSitemap: pagesMissingFromSitemap.slice(0, 10)
  }
};

console.log(JSON.stringify(result, null, 2));

const failures = [];
if (mdxFiles.length !== 300) failures.push(`Expected 300 source posts, found ${mdxFiles.length}.`);
if (searchIndex.length !== 300) failures.push(`Expected 300 indexed posts, found ${searchIndex.length}.`);
if (blogHtmlFiles.length !== 300) failures.push(`Expected 300 article pages, found ${blogHtmlFiles.length}.`);
if (!result.robotsExists) failures.push('robots.txt is missing from dist.');
if (!result.robotsHasSitemap) failures.push('robots.txt does not reference sitemap.xml.');
if (sitemapUrls.length !== htmlFiles.length) failures.push(`Expected sitemap URL count to match HTML pages (${htmlFiles.length}), found ${sitemapUrls.length}.`);
if (brokenLinks.length) failures.push(`${brokenLinks.length} broken internal links found.`);
if (titleDupes.length) failures.push(`${titleDupes.length} duplicate article titles found.`);
if (descriptionDupes.length) failures.push(`${descriptionDupes.length} duplicate article meta descriptions found.`);
if (missingSeo.length) failures.push(`${missingSeo.length} article pages have missing SEO metadata.`);
if (missingOg.length) failures.push(`${missingOg.length} article pages have missing Open Graph metadata.`);
if (missingTwitter.length) failures.push(`${missingTwitter.length} article pages have missing Twitter Card metadata.`);
if (missingSchema.length) failures.push(`${missingSchema.length} article pages have missing BlogPosting schema.`);
if (imagesMissingAlt.length) failures.push(`${imagesMissingAlt.length} images are missing alt text.`);
if (pagesMissingViewport.length) failures.push(`${pagesMissingViewport.length} pages are missing mobile viewport meta.`);
if (pagesMissingFromSitemap.length) failures.push(`${pagesMissingFromSitemap.length} pages are missing from sitemap.xml.`);
if (!monetagSlots) failures.push('No Monetag placeholders found.');
if (!adsenseSlots) failures.push('No Future AdSense placeholders found.');
if (totalJsBytes >= 50000) failures.push(`Client JS bundle is too large for this static site: ${totalJsBytes} bytes.`);

if (failures.length) {
  console.error('\nProduction audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nProduction audit passed.');
