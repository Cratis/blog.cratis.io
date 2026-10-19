// /llms.txt — a plain-text index of the blog for language-model crawlers.
// Generated at build time from the published posts (future-dated posts are
// drafts until their date and are left out), newest first.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const site = 'https://blog.cratis.io';

export const GET: APIRoute = async () => {
    const posts = (await getCollection('docs', ({ id, data }) => /^blog\/[^/]+$/.test(id) && data.draft !== true && 'date' in data))
        .map((post) => ({ slug: post.id.replace(/^blog\//, ''), data: post.data as { title: string; description?: string; date: Date } }))
        .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

    const lines = [
        '# Cratis Blog',
        '',
        '> Essays and engineering explainers on event sourcing, CQRS, and building the open-source (MIT) Cratis stack: Chronicle, Arc, Components, and friends. Product documentation lives at https://www.cratis.io.',
        '',
        '## Posts',
        '',
        ...posts.map(({ slug, data }) => `- [${data.title}](${site}/${slug}/)${data.description ? `: ${data.description}` : ''}`),
        '',
        '## Optional',
        '',
        `- [RSS feed](${site}/rss.xml)`,
        `- [Sitemap](${site}/sitemap-index.xml)`,
        '- [Cratis documentation](https://www.cratis.io)',
        '',
    ];

    return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
