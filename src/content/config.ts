import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seoTitle: z.string().optional(),
      description: z.string().max(160),
      publishDate: z.date(),
      updatedDate: z.date().optional(),
      author: z.string().default('Front Yard Aura Editorial'),
      category: z.string(),
      categorySlug: z.string().optional(),
      tags: z.array(z.string()).default([]),
      featuredImage: image().optional(),
      featuredImageUrl: z.string().url().optional(),
      imageAlt: z.string().optional(),
      pinterestTitle: z.string().optional(),
      pinterestDescription: z.string().max(500).optional(),
      canonicalUrl: z.string().url().optional(),
      faqs: z.array(
        z.object({
          question: z.string(),
          answer: z.string()
        })
      ).default([]),
      relatedPosts: z.array(z.string()).default([]),
      draft: z.boolean().default(false)
    })
});

export const collections = { blog };
