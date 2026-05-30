import { getCollection } from 'astro:content';
import { CATEGORIES } from '@/data/categories';
import { SITE } from '@/lib/site';

const staticRoutes = ['/', '/blog/', '/ideas/', '/about/', '/contact/', '/privacy/', '/search/'];

function urlEntry(path: string, lastmod?: Date, priority = '0.8') {
  const loc = new URL(path, SITE.url).toString();
  const mod = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';

  return `  <url>
    <loc>${loc}</loc>
    ${mod}
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const entries = [
    ...staticRoutes.map((route) => urlEntry(route, undefined, route === '/' ? '1.0' : '0.8')),
    ...CATEGORIES.map((category) => urlEntry(`/ideas/${category.slug}/`, undefined, '0.9')),
    ...posts
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((post) => urlEntry(`/blog/${post.slug}/`, post.data.updatedDate ?? post.data.publishDate, '0.7'))
  ];

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
