// Reads the published posts' frontmatter straight from the content folder, for
// build configuration that runs before the content collections exist (the
// sitemap in astro.config.mjs). A post dated after the build time is scheduled,
// not published, matching src/loaders/scheduledDocsLoader.ts.
import { readdirSync, readFileSync } from 'node:fs';

const blogDir = new URL('../content/docs/blog/', import.meta.url);

function field(frontmatter, name) {
    return new RegExp(`^${name}:\\s*["']?([^"'\\n]+?)["']?\\s*$`, 'm').exec(frontmatter)?.[1];
}

function tagsOf(frontmatter) {
    const block = /^tags:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m.exec(frontmatter)?.[1] ?? '';
    return [...block.matchAll(/^[ \t]+-\s*["']?([^"'\n]+?)["']?\s*$/gm)].map((match) => match[1]);
}

export function readPublishedPosts(now = new Date()) {
    return readPosts(now).published;
}

/** Slugs of posts dated after `now`: built, but not listed. */
export function readScheduledSlugs(now = new Date()) {
    return readPosts(now).scheduled;
}

function readPosts(now) {
    const posts = [];
    const scheduled = [];
    for (const entry of readdirSync(blogDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const file = ['index.mdx', 'index.md']
            .map((name) => new URL(`${entry.name}/${name}`, blogDir))
            .find((url) => {
                try {
                    return readFileSync(url, 'utf8').length > 0;
                } catch {
                    return false;
                }
            });
        if (!file) continue;
        const frontmatter = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'))?.[1] ?? '';
        const date = new Date(field(frontmatter, 'date') ?? NaN);
        if (Number.isNaN(date.getTime())) continue;
        if (date > now) {
            scheduled.push(entry.name);
            continue;
        }
        const updated = new Date(field(frontmatter, 'lastUpdated') ?? NaN);
        posts.push({
            slug: entry.name,
            lastModified: Number.isNaN(updated.getTime()) ? date : updated,
            tags: tagsOf(frontmatter),
        });
    }
    return { published: posts, scheduled };
}
