import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/projects',
  }),
  schema: z.object({
    title: z.string(),
    studentName: z.string(),
    github: z.url().nullable().optional(),
    demo: z.url().nullable().optional(),
    linkedin: z.url().nullable().optional(),
    description: z.string(),
    stack: z.array(z.string()).default([]),
    lookingFor: z.array(z.string()).default([]),
    category: z.string().default('Other'),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
    privateRepo: z.boolean().default(false),
  }),
});

export const collections = { projects };
