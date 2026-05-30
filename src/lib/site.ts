export const SITE = {
  name: 'Front Yard Aura',
  domain: 'frontyardaura.com',
  url: 'https://frontyardaura.com',
  description:
    'Luxury front yard landscaping ideas, curb appeal inspiration, planting guides, and exterior design resources for American homes.',
  locale: 'en_US',
  author: 'Front Yard Aura Editorial',
  social: {
    pinterest: 'https://www.pinterest.com/frontyardaura/'
  }
} as const;

export const NAV_ITEMS = [
  { label: 'Ideas', href: '/ideas/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'About', href: '/about/' }
] as const;
