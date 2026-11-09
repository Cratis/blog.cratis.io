import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

// Bundled Inter from https://github.com/google/fonts/tree/main/ofl/inter
// (Inter[opsz,wght].ttf), SIL Open Font License 1.1; see src/assets/fonts/OFL.txt.
// Explicit fontfile avoids depending on fonts installed on the build machine.
const fontfile = resolve('src/assets/fonts/Inter.ttf');
const escapeMarkup = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function text(value, size, color, height) {
    return sharp({ text: {
        text: `<span foreground="${color}">${escapeMarkup(value)}</span>`,
        font: `Inter Bold ${size}`, fontfile, width: 1056, dpi: 72,
        rgba: true, wrap: 'word-char',
    } }).resize({ width: 1056, height, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
}

export async function socialImage(title, series) {
    const logo = await sharp(await readFile(resolve('src/assets/cratis-mark-dark.svg'))).resize(72, 72).png().toBuffer();
    const layers = [
        { input: logo, left: 64, top: 48 },
        { input: await text('Cratis Blog', 30, '#ffffff', 48), left: 152, top: 70 },
        { input: await text(title, 62, '#ffffff', 250), left: 64, top: 258 },
        { input: await text('blog.cratis.io', 23, '#c3d4fb', 36), left: 64, top: 552 },
    ];
    if (series) layers.push({
        input: await text(`${series.title} · ${series.order === 0 ? 'Introduction' : `Part ${series.order}`}`, 25, '#c3d4fb', 76), left: 64, top: 156,
    });
    return sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0d1325"/><rect width="1200" height="12" fill="#3b6fed"/><path d="M880 630L1200 310V630Z" fill="#14224a"/></svg>'))
        .composite(layers).png().toBuffer();
}
