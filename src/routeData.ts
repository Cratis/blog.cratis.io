import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { getImage } from 'astro:assets';

// Social-preview size. Cards crop to roughly 1.91:1 on some networks; the
// covers are 16:10, so keep the whole cover (1200x750) rather than cropping
// away the text that sits near the edges.
const previewWidth = 1200;
const previewHeight = 750;

// The site-wide head entries in astro.config.mjs default every page to the
// favicon as its social image; these are the tags a post cover replaces.
const socialImageTags = new Set(['og:image', 'twitter:card', 'twitter:image']);

// The whole site is the blog, so no page gets docs chrome: no left sidebar
// (and therefore no mobile menu button), no right-hand table of contents, and
// no docs-style prev/next footer pagination — blog posts get their own
// chronological prev/next links from starlight-blog instead.
export const onRequest = defineRouteMiddleware(async (context) => {
    const { starlightRoute } = context.locals;
    starlightRoute.hasSidebar = false;
    starlightRoute.toc = undefined;
    starlightRoute.pagination = { prev: undefined, next: undefined };

    await useCoverAsSocialPreview(context, starlightRoute);
});

// starlight-blog ignores a post's `cover:` frontmatter for social metadata, so
// for posts that have one, swap the favicon defaults for the cover. Pages
// without a (local) cover keep the defaults untouched.
async function useCoverAsSocialPreview(
    context: Parameters<Parameters<typeof defineRouteMiddleware>[0]>[0],
    starlightRoute: App.Locals['starlightRoute'],
) {
    const cover = (starlightRoute.entry.data as { cover?: any }).cover;
    // A single `image`, or a `light`/`dark` pair (light suits a preview card).
    const source = cover?.image ?? cover?.light;
    if (!source || typeof source === 'string') return;

    const image = await getImage({ src: source, width: previewWidth, height: previewHeight, format: 'png' });
    const url = new URL(image.src, context.site).href;

    starlightRoute.head = [
        ...starlightRoute.head.filter(
            ({ tag, attrs }) => !(tag === 'meta' && socialImageTags.has(String(attrs?.property ?? attrs?.name))),
        ),
        { tag: 'meta', attrs: { property: 'og:image', content: url } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: cover.alt } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: String(previewWidth) } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: String(previewHeight) } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: url } },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: cover.alt } },
    ];
}
