// Blog authors — the single source of truth for bylines, author pages, and
// the per-post signature block.
//
// - `name`, `title`, `url`, `picture` feed starlight-blog (byline on each
//   post and the /authors/<id>/ archive pages).
// - `signature` is the personal sign-off rendered below each post by
//   src/components/Footer.astro, so posts carry the author's own voice.
export const authors = {
    einar: {
        name: 'Einar Ingebrigtsen',
        title: 'Co-founder, Cratis',
        url: 'https://github.com/einari',
        picture: 'https://github.com/einari.png?size=160',
        signature:
            'Einar has been building developer platforms and event-sourced systems for decades — and still gets excited when a design finally clicks. Expect strong opinions, held loosely, and the occasional tangent that turns out to be the point.',
    },
    sindre: {
        name: 'Sindre Alstad Wilting',
        title: 'Co-founder, Cratis',
        url: 'https://github.com/woksin',
        picture: 'https://github.com/woksin.png?size=160',
        signature:
            'Sindre works across the Cratis stack, from the Chronicle kernel to the clients that talk to it. He writes the way he builds: precise, grounded in what actually ships, and skeptical of claims without evidence.',
    },
    'cratis-team': {
        name: 'The Cratis Team',
        title: 'Cratis',
        url: 'https://github.com/cratis',
        picture: 'https://github.com/cratis.png?size=160',
        signature:
            'Written by the Cratis team. Everything we publish today is open source and MIT licensed — come build with us on GitHub or say hi on Discord.',
    },
};
