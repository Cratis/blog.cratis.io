/**
 * Serves the blog from the site root instead of /blog.
 *
 * starlight-blog hard-requires posts to live in `content/docs/<prefix>/` and
 * serves the index, tags, authors, and RSS under that prefix (see
 * https://github.com/HiDeoo/starlight-blog/issues/167 — a root prefix is
 * explicitly unsupported). This site is nothing but the blog, so the /blog
 * segment adds nothing to the URL. Rather than forking the plugin, this
 * build-time integration relocates the built output:
 *
 *  1. Move everything from `dist/blog/…` to `dist/…` (the blog index page
 *     becomes the site root page, rss.xml moves to /rss.xml).
 *  2. Rewrite the `/blog/…` URLs inside the HTML/XML output (canonical
 *     links, Open Graph, JSON-LD, RSS entries, tag/author links) to their
 *     root-relative form.
 *  3. Emit a permanent-redirect page at every old location (instant
 *     meta refresh + canonical + noindex — the strongest redirect signal
 *     GitHub Pages can serve, since it cannot do HTTP-level 301s).
 *
 * `npm run dev` still serves the blog under /blog; only the built output is
 * relocated. The `/` → `/blog` Astro redirect in astro.config.mjs keeps the
 * dev-time root working and its build artifact is overwritten by the real
 * landing page in step 1.
 */
import type { AstroIntegration } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://blog.cratis.io';
const BLOG_DIR = 'blog';

export function rootBlogUrls(): AstroIntegration {
    return {
        name: 'cratis:root-blog-urls',
        hooks: {
            'astro:build:done': async ({ dir, logger }) => {
                const outDir = fileURLToPath(dir);
                const blogDir = path.join(outDir, BLOG_DIR);

                const builtFiles = await listFiles(blogDir);
                if (builtFiles.length === 0) {
                    logger.info('No blog output found under /blog — nothing to relocate.');
                    return;
                }

                // 1. Relocate: strip the blog directory from every path. The
                //    blog index page (blog/index.html) becomes the site root.
                const moves = builtFiles.map((file) => ({
                    from: file,
                    to: path.join(outDir, path.relative(blogDir, file)),
                }));
                for (const move of moves) {
                    await fs.mkdir(path.dirname(move.to), { recursive: true });
                    await fs.rename(move.from, move.to);
                }
                await fs.rm(blogDir, { recursive: true, force: true });

                // 2. Rewrite interior URLs in text outputs. Absolute URLs
                //    (canonical, JSON-LD, RSS entries, sitemap) and the
                //    relative/attribute forms emitted by starlight-blog all
                //    carry the /blog prefix; every occurrence found in the
                //    output is a URL, so contextual patterns are sufficient.
                const rewrites: Array<[RegExp, string]> = [
                    [new RegExp(`${SITE}/blog/`, 'g'), `${SITE}/`],
                    // JSON-escaped form (e.g. inside inline scripts): \/blog\/
                    [/\\\/blog\\\//g, '\\/'],
                    [/"\/blog\//g, '"/'],
                    [/'\/blog\//g, "'/"],
                    [/\(\/blog\//g, '(/'],
                    [/url=\/blog\//g, 'url=/'],
                ];
                let rewritten = 0;
                for (const file of await listFiles(outDir)) {
                    if (!/\.(html|xml|txt)$/.test(file)) continue;
                    const contents = await fs.readFile(file, 'utf8');
                    const updated = rewrites.reduce(
                        (text, [pattern, replacement]) => text.replace(pattern, replacement),
                        contents,
                    );
                    if (updated !== contents) {
                        await fs.writeFile(file, updated);
                        rewritten++;
                    }
                }

                // 3. Permanent redirects at every old location. The old tags
                //    index keeps pointing at the /topics catalogue, as it did
                //    before the move; everything else follows its file.
                const redirects = new Map<string, string>([
                    ['/blog/tags/', '/topics/'],
                    ['/blog/', '/'],
                ]);
                for (const move of moves) {
                    const from = joinUrl(BLOG_DIR, publicPath(blogDir, move.from));
                    if (!redirects.has(from)) {
                        redirects.set(from, publicPath(outDir, move.to));
                    }
                }
                for (const [from, to] of redirects) {
                    // A redirect for a directory path is served by an index
                    // page; file paths (e.g. the old rss.xml) reuse the file
                    // name so the old exact URL keeps responding.
                    const file = from.endsWith('/')
                        ? path.join(outDir, from, 'index.html')
                        : path.join(outDir, from);
                    await fs.mkdir(path.dirname(file), { recursive: true });
                    await fs.writeFile(file, redirectPage({ from, to }));
                }

                logger.info(`Relocated ${moves.length} file(s) from /blog to the site root, rewrote ${rewritten} file(s), wrote ${redirects.size} redirect page(s).`);
            },
        },
    };
}

/** Public URL path of a built file: `…/tags/chronicle/index.html` → `/tags/chronicle/`. */
function publicPath(baseDir: string, file: string): string {
    const relative = path.relative(baseDir, file).split(path.sep).join('/');
    const withoutIndex = relative.replace(/(^|\/)index\.html$/, '$1');
    return `/${withoutIndex}`;
}

/** Joins URL fragments: `('blog', '/')` → `/blog/`, `('blog', 'rss.xml')` → `/blog/rss.xml`. */
function joinUrl(base: string, path: string): string {
    if (path === '/') return `/${base}/`;
    return `/${base}${path}`;
}

async function listFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
    return entries
        .filter((entry) => entry.isFile())
        .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

/**
 * The same instant-redirect page Astro emits for its own `redirects` config:
 * a 0-second meta refresh plus a canonical link, marked noindex. GitHub
 * Pages cannot answer with an HTTP 301, so this is the strongest permanent
 * redirect signal available on that host.
 */
function redirectPage({ from, to }: { from: string; to: string }): string {
    const absolute = to === '/' ? `${SITE}/` : `${SITE}${to}`;
    const escape = (value: string) =>
        value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    return [
        '<!doctype html>',
        `<title>Redirecting to: ${escape(to)}</title>`,
        `<meta http-equiv="refresh" content="0;url=${escape(to)}">`,
        '<meta name="robots" content="noindex">',
        `<link rel="canonical" href="${escape(absolute)}">`,
        '<body>',
        `\t<a href="${escape(to)}">Redirecting from <code>${escape(from)}</code> to <code>${escape(to)}</code></a>`,
        '</body>',
    ].join('\n');
}
