const SOURCES = {
    serpentAtlas: './assets/sprites/amara-serpent-atlas.png',
    apple: './assets/sprites/apple.png', berry: './assets/sprites/river-fish.png',
    golden: './assets/sprites/water-orb.png', bonus: './assets/sprites/lightning.png',
    amaraPortrait: './assets/amara_snake_transparent.png', arena: './assets/art/stone-arena.jpg'
};

/** Small offline sprite atlas loader. Canvas primitives remain a safe fallback. */
export class SnakeAssets {
    static async load(ImageClass = globalThis.Image) {
        if (!ImageClass) return {};
        const entries = await Promise.all(Object.entries(SOURCES).map(async ([name, src]) => {
            const image = new ImageClass();
            image.src = src;
            try {
                if (image.decode) await image.decode();
                else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
                // Uploaded sprites have generous transparent margins. Trim their
                // draw surface so food remains legible at a single-cell size.
                if (['apple', 'berry', 'golden', 'bonus'].includes(name) && globalThis.document) {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width; canvas.height = image.height;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(image, 0, 0);
                    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                    let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
                    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
                        if (pixels[(y * canvas.width + x) * 4 + 3] < 24) continue;
                        left = Math.min(left, x); top = Math.min(top, y);
                        right = Math.max(right, x); bottom = Math.max(bottom, y);
                    }
                    if (right >= left) {
                        const sprite = document.createElement('canvas');
                        sprite.width = 192; sprite.height = 192;
                        const size = Math.max(right - left + 1, bottom - top + 1);
                        sprite.getContext('2d').drawImage(canvas, left - (size - (right - left + 1)) / 2,
                            top - (size - (bottom - top + 1)) / 2, size, size, 0, 0, 192, 192);
                        return [name, sprite];
                    }
                }
                return [name, image];
            } catch { return [name, null]; }
        }));
        const assets = Object.fromEntries(entries.filter(([, image]) => image));
        if (assets.serpentAtlas && globalThis.document) {
            const atlas = assets.serpentAtlas;
            for (const [name, column, row] of [['head', 0, 0], ['segment', 1, 0], ['bend', 0, 1], ['tail', 1, 1]]) {
                const frame = document.createElement('canvas');
                frame.width = 256; frame.height = 256;
                const ctx = frame.getContext('2d');
                if (name === 'segment' || name === 'tail') {
                    // Horizontal sprites occupy a narrow band of the atlas.
                    // Normalize their thickness independently of transparent padding.
                    const sourceY = name === 'segment' ? .18 : .66;
                    ctx.drawImage(atlas, atlas.width * .5, atlas.height * sourceY,
                        atlas.width * .5, atlas.height * .17, 0, 44, 256, 168);
                } else {
                    ctx.drawImage(atlas, column * atlas.width / 2, row * atlas.height / 2,
                        atlas.width / 2, atlas.height / 2, 0, 0, 256, 256);
                }
                assets[name] = frame;
            }
        }
        if (globalThis.document && (!assets.head || !assets.segment)) {
            throw new Error('Amara character artwork could not load. Reload once you are connected.');
        }
        return assets;
    }
}
