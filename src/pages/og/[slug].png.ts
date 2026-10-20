import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { socialImage } from '../../../scripts/social-image.mjs';

// Match the site's production draft handling; dates are already interpreted by
// the content schema. Do not introduce a separate publication-date filter.
export const getStaticPaths = (async () => {
    const posts = await getCollection('docs', ({ id, data }) =>
        /^blog\/[^/]+$/.test(id) && !('cover' in data && data.cover)
        && (import.meta.env.MODE !== 'production' || data.draft !== true) && 'date' in data,
    );
    return posts.map(({ id, data }) => ({
        params: { slug: id.slice('blog/'.length) },
        props: { title: data.seoTitle ?? data.title, series: data.series },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => new Response(
    new Uint8Array(await socialImage(props.title, props.series)),
    { headers: { 'Content-Type': 'image/png' } },
);
