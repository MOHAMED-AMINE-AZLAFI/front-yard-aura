import { getCollection } from 'astro:content';
import { getReadingTime } from '@/lib/posts';
import { getImageForPost, getImageIntent } from '@/data/images';

function cleanBody(body = '') {
  return body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[{}()[\]"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const categoryCounts = new Map<string, number>();
  const body = posts
    .sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf())
    .map((post) => {
      const content = cleanBody(post.body);
      const imageIntent = getImageIntent([post.data.title, post.slug, post.data.category, ...(post.data.tags ?? [])].join(' '), post.data.category);
      const categoryIndex = categoryCounts.get(imageIntent) ?? 0;
      categoryCounts.set(imageIntent, categoryIndex + 1);
      const image = getImageForPost(post, categoryIndex);
      return {
        title: post.data.title,
        description: post.data.description,
        excerpt: post.data.description,
        category: post.data.category,
        tags: post.data.tags,
        url: `/blog/${post.slug}/`,
        image: image.src,
        imageAlt: image.alt,
        publishDate: post.data.publishDate.toISOString(),
        readingTime: getReadingTime(post.body),
        content
      };
    });

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
