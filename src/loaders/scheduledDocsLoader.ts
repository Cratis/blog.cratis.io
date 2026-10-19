import type { Loader, LoaderContext } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';

type ScheduledData = { date?: unknown; draft?: boolean; scheduled?: boolean };

/**
 * Starlight's docs loader that marks a post dated after the build time as a
 * draft (`scheduled`). starlight-blog leaves drafts out of listings, tags,
 * authors and RSS, and Starlight builds no page for them; src/pages/[slug].astro
 * builds the page of a scheduled post at its final URL instead, as `noindex`,
 * so links from published posts to later parts keep working. The first build
 * on or after its date (the Pages workflow rebuilds daily) publishes it.
 *
 * This runs after the wrapped loader on every load, because Astro keeps
 * unchanged entries from its content cache: a post marked as scheduled in an
 * earlier build is released here once its date has passed.
 */
export function scheduledDocsLoader(): Loader {
    const inner = docsLoader();
    return {
        ...inner,
        async load(context) {
            await inner.load(context);
            const now = Date.now();
            for (const entry of [...context.store.values()]) {
                const data = entry.data as ScheduledData;
                const isFuture = data.date instanceof Date && data.date.getTime() > now;
                if (isFuture) {
                    replace(context.store, entry, { ...data, draft: true, scheduled: true });
                } else if (data.scheduled) {
                    replace(context.store, entry, { ...data, draft: false, scheduled: false });
                }
            }
        },
    };
}

// `store.set` ignores an entry whose digest is unchanged, so remove it first.
function replace(store: LoaderContext['store'], entry: NonNullable<ReturnType<LoaderContext['store']['get']>>, data: ScheduledData) {
    store.delete(entry.id);
    store.set({ ...entry, data });
}
