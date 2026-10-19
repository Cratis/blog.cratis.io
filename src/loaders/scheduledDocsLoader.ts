import type { Loader, LoaderContext } from 'astro/loaders';
import { docsLoader } from '@astrojs/starlight/loaders';

type ScheduledData = { date?: unknown; draft?: boolean; scheduled?: boolean };

/**
 * Starlight's docs loader that treats a post dated after the build time as a
 * draft. Drafts are left out of pages, listings, tags, RSS and the sitemap in
 * production builds, so a post appears on the first build on or after its date
 * (the Pages workflow rebuilds daily for this).
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
