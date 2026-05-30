import { SITE } from './site';

type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
};

export function getSeo({
  title,
  description = SITE.description,
  path = '/',
  image = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.5&w=1200&h=630&q=84',
  type = 'website',
  publishedTime,
  modifiedTime
}: SeoInput = {}) {
  const absoluteTitle = title ? `${title} | ${SITE.name}` : SITE.name;
  const canonical = new URL(path, SITE.url).toString();
  const imageUrl = new URL(image, SITE.url).toString();

  return {
    title: absoluteTitle,
    description,
    canonical,
    imageUrl,
    type,
    publishedTime,
    modifiedTime
  };
}
