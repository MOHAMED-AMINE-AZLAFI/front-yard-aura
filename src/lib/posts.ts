import type { CollectionEntry } from 'astro:content';

export function getReadingTime(body = '') {
  const words = body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 225));
}

export function getRelatedPosts(
  current: CollectionEntry<'blog'>,
  posts: CollectionEntry<'blog'>[],
  count = 3
) {
  return posts
    .filter((post) => post.slug !== current.slug && !post.data.draft)
    .map((post) => {
      const categoryScore = post.data.category === current.data.category ? 3 : 0;
      const tagScore = post.data.tags.filter((tag) => current.data.tags.includes(tag)).length;
      return { post, score: categoryScore + tagScore };
    })
    .sort((a, b) => b.score - a.score || b.post.data.publishDate.valueOf() - a.post.data.publishDate.valueOf())
    .slice(0, count)
    .map(({ post }) => post);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}
