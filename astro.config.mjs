// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import { authors } from './src/data/authors.mjs';
import { rootBlogUrls } from './src/integrations/root-blog-urls.ts';

// starlight-blog wants only the fields it knows about; `signature` is used by
// src/components/Footer.astro for the per-post sign-off block.
const blogAuthors = Object.fromEntries(
    Object.entries(authors).map(([id, { name, title, url, picture }]) => [id, { name, title, url, picture }]),
);

// https://astro.build/config
export default defineConfig({
    site: 'https://blog.cratis.io',
    // Keeps the dev-time root working by pointing at starlight-blog's own
    // /blog index; the build output is relocated to the root by the
    // rootBlogUrls integration below, which overwrites this redirect page
    // with the real landing page. Old /blog/* URLs are permanently
    // redirected to their root form by the same integration.
    redirects: { '/': '/blog' },
    integrations: [
        // Relocates the built blog from /blog/* to /* and permanently
        // redirects the old URLs. starlight-blog itself requires the /blog
        // prefix, so this runs on the built output instead.
        rootBlogUrls(),
        // Starlight would add its own sitemap; registering it here lets us
        // rewrite the relocated URLs (posts move from /blog/<slug> to
        // /<slug> at build time, see src/integrations/root-blog-urls.ts).
        sitemap({
            serialize(item) {
                return { ...item, url: item.url.replace('/blog/', '/') };
            },
        }),
        starlight({
            title: 'Cratis Blog',
            description:
                'The Cratis blog — essays and engineering explainers on event sourcing, CQRS, and building the open-source (MIT) Cratis stack: Chronicle, Arc, Components, and friends.',
            // Default social-sharing metadata for every page.
            head: [
                { tag: 'meta', attrs: { property: 'og:image', content: 'https://blog.cratis.io/favicon-512.png' } },
                { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
                { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://blog.cratis.io/favicon-512.png' } },
            ],
            logo: {
                light: './src/assets/cratis-mark-light.svg',
                dark: './src/assets/cratis-mark-dark.svg',
                alt: 'Cratis',
            },
            // Brand-font preloading without the cold-load swap reflow — same
            // technique as cratis.io (see the component for details).
            components: {
                Head: './src/components/Head.astro',
                // Appends the author signature block below each blog post.
                Footer: './src/components/Footer.astro',
                // Editorial masthead: logo + Blog/cratis.io links + social icons.
                Header: './src/components/Header.astro',
                // Renders the blog landing as a hero + large post cards;
                // delegates everything else to starlight-blog's override.
                MarkdownContent: './src/components/MarkdownContent.astro',
            },
            // Strips the remaining docs chrome (sidebar, ToC, docs pagination)
            // from every route — this site is a blog, not a docs site.
            routeMiddleware: './src/routeData.ts',
            favicon: '/favicon.ico',
            customCss: ['./src/styles/cratis.css'],
            tableOfContents: false,
            pagefind: false,
            // Same code-block look as cratis.io: vivid dark + soft light theme.
            expressiveCode: {
                themes: ['laserwave', 'slack-ochin'],
                styleOverrides: { borderRadius: '0.5rem' },
            },
            social: [
                { icon: 'github', label: 'GitHub', href: 'https://github.com/cratis' },
                { icon: 'discord', label: 'Discord', href: 'https://discord.gg/kt4AMpV8WV' },
                { icon: 'rss', label: 'RSS', href: '/rss.xml' },
            ],
            plugins: [
                starlightBlog({
                    title: 'Blog',
                    authors: blogAuthors,
                    // RSS is generated at /blog/rss.xml because `site` is set;
                    // rootBlogUrls relocates it to /rss.xml at build time.
                    metrics: { readingTime: true },
                    // The masthead has its own Blog link; skip the plugin's.
                    navigation: 'none',
                    // The landing lists every post as a card, so keep the
                    // built-in index on a single page (no /blog/2 pagination).
                    postCount: 100,
                }),
            ],
        }),
    ],
});
