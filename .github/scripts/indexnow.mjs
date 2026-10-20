// Copyright (c) Cratis. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const maxUrls = 10_000;
const warning = message => console.warn(`::warning::${String(message).replace(/[\r\n]/g, ' ')}`);

async function fetchSitemap(url, fetchUrl, wait) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const response = await fetchUrl(url, { signal: AbortSignal.timeout(10_000) });
            if (!response.ok) throw new Error(`Sitemap ${url}: HTTP ${response.status}`);
            const xml = await response.text();
            if (!/<(?:sitemapindex|urlset)\b/i.test(xml)) throw new Error(`Invalid sitemap: ${url}`);
            return xml;
        } catch (error) {
            if (attempt === 2) throw error;
            await wait(2_000);
        }
    }
}

function locations(xml) {
    return [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(([, value]) =>
        value.trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1')
            .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
                if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
                if (entity.startsWith('#')) return String.fromCodePoint(Number(entity.slice(1)));
                return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[entity.toLowerCase()];
            }));
}

export async function notifyIndexNow(host, key, { dryRun = false, fetchUrl = fetch, wait = delay } = {}) {
    const origin = `https://${host}`;
    if (new URL(origin).host !== host || !/^[a-f0-9]{32}$/.test(key)) throw new Error('Invalid IndexNow host or key');
    let xml;
    let sitemap = `${origin}/sitemap.xml`;
    try {
        xml = await fetchSitemap(sitemap, fetchUrl, wait);
    } catch {
        sitemap = `${origin}/sitemap-index.xml`;
        xml = await fetchSitemap(sitemap, fetchUrl, wait);
    }
    const pending = [{ url: sitemap, xml }];
    const visited = new Set();
    const urls = new Set();
    while (pending.length && urls.size < maxUrls) {
        const current = pending.shift();
        if (visited.has(current.url)) continue;
        if (visited.size >= 100) throw new Error('Sitemap traversal exceeded 100 documents');
        visited.add(current.url);
        const document = current.xml ?? await fetchSitemap(current.url, fetchUrl, wait);
        const isIndex = /<sitemapindex\b/i.test(document);
        for (const location of locations(document)) {
            const url = new URL(location);
            if (url.origin !== origin) continue;
            if (isIndex) pending.push({ url: url.href });
            else urls.add(url.href);
            if (urls.size === maxUrls) break;
        }
    }
    if (!urls.size) throw new Error('No same-host URLs found in the deployed sitemap');
    const payload = JSON.stringify({ host, key, keyLocation: `${origin}/${key}.txt`, urlList: [...urls] });
    console.log(`IndexNow: ${urls.size} URLs, ${Buffer.byteLength(payload)} payload bytes${dryRun ? ' (dry-run, no POST)' : ''}`);
    if (dryRun) return;
    const response = await fetchUrl('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: payload,
        signal: AbortSignal.timeout(15_000)
    });
    console.log(`IndexNow: HTTP ${response.status}`);
    if (!response.ok) warning(`IndexNow submission returned HTTP ${response.status}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [host, key, ...options] = process.argv.slice(2);
    try {
        await notifyIndexNow(host, key, { dryRun: options.includes('--dry-run') });
    } catch (error) {
        warning(`IndexNow notification skipped: ${error.message}`);
    }
}
