import { defineCollection, z } from 'astro:content';
import { scheduledDocsLoader } from './loaders/scheduledDocsLoader';
import { docsSchema } from '@astrojs/starlight/schema';
import { blogSchema } from 'starlight-blog/schema';

export const collections = {
    docs: defineCollection({
        loader: scheduledDocsLoader(),
        schema: docsSchema({
            // `seoTitle` is the shorter title used for the <title> tag in search
            // results; the post keeps its full `title` as the visible heading.
            extend: (context) => blogSchema(context).extend({ seoTitle: z.string().max(60).optional() }),
        }),
    }),
};
