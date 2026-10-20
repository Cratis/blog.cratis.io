// Reads the published posts' frontmatter straight from the content folder, for
// build configuration that runs before the content collections exist (the
// sitemap in astro.config.mjs). Every post with a date is published, whatever
// the date; an author draft (`draft: true`) is not.
import { readdirSync, readFileSync } from 'node:fs';

const blogDir = new URL('../content/docs/blog/', import.meta.url);

function field(frontmatter, name) {
    return new RegExp(`^${name}:\\s*["']?([^"'\\n]+?)["']?\\s*$`, 'm').exec(frontmatter)?.[1];
}

function tagsOf(frontmatter) {
    const block = /^tags:\s*\n((?:[ \t]+-[^\n]*\n?)+)/m.exec(frontmatter)?.[1] ?? '';
    return [...block.matchAll(/^[ \t]+-\s*["']?([^"'\n]+?)["']?\s*$/gm)].map((match) => match[1]);
}

export function readPublishedPosts() {
    const posts = [];
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
        if (Number.isNaN(date.getTime()) || field(frontmatter, 'draft') === 'true') continue;
        const updated = new Date(field(frontmatter, 'lastUpdated') ?? NaN);
        posts.push({
            slug: entry.name,
            lastModified: Number.isNaN(updated.getTime()) ? date : updated,
            tags: tagsOf(frontmatter),
        });
    }
    return posts;
}
