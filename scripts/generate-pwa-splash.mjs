/**
 * Generate iOS apple-touch-startup-image assets and Android PWA icons
 * with the deploy logo centered on a white background.
 *
 * Usage: node scripts/generate-pwa-splash.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import path from 'path';

const logoPath = 'public/deploy-logo.png';
const outDir = 'public/splash';

await mkdir(outDir, { recursive: true });

async function makeSplash(width, height, filename, logoMaxWidthRatio = 0.55) {
    const maxLogoW = Math.round(width * logoMaxWidthRatio);
    const maxLogoH = Math.round(height * 0.12);
    const resized = await sharp(logoPath)
        .resize({
            width: maxLogoW,
            height: maxLogoH,
            fit: 'inside',
            withoutEnlargement: false,
        })
        .png()
        .toBuffer({ resolveWithObject: true });

    const left = Math.round((width - resized.info.width) / 2);
    const top = Math.round((height - resized.info.height) / 2);

    await sharp({
        create: {
            width,
            height,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
        },
    })
        .composite([{ input: resized.data, left, top }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, filename));

    console.log('wrote', filename);
}

async function makeIcon(size, filename) {
    const maxLogoW = Math.round(size * 0.72);
    const resized = await sharp(logoPath)
        .resize({ width: maxLogoW, fit: 'inside' })
        .png()
        .toBuffer({ resolveWithObject: true });
    const left = Math.round((size - resized.info.width) / 2);
    const top = Math.round((size - resized.info.height) / 2);
    await sharp({
        create: {
            width: size,
            height: size,
            channels: 3,
            background: { r: 255, g: 255, b: 255 },
        },
    })
        .composite([{ input: resized.data, left, top }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(outDir, filename));
    console.log('wrote', filename);
}

const splashes = [
    { w: 1290, h: 2796, name: 'apple-splash-1290-2796.png' },
    { w: 1179, h: 2556, name: 'apple-splash-1179-2556.png' },
    { w: 1170, h: 2532, name: 'apple-splash-1170-2532.png' },
    { w: 1284, h: 2778, name: 'apple-splash-1284-2778.png' },
    { w: 1125, h: 2436, name: 'apple-splash-1125-2436.png' },
    { w: 1242, h: 2688, name: 'apple-splash-1242-2688.png' },
    { w: 828, h: 1792, name: 'apple-splash-828-1792.png' },
    { w: 750, h: 1334, name: 'apple-splash-750-1334.png' },
    { w: 1242, h: 2208, name: 'apple-splash-1242-2208.png' },
    { w: 640, h: 1136, name: 'apple-splash-640-1136.png' },
    { w: 1668, h: 2388, name: 'apple-splash-1668-2388.png' },
    { w: 2048, h: 2732, name: 'apple-splash-2048-2732.png' },
    { w: 1536, h: 2048, name: 'apple-splash-1536-2048.png' },
    { w: 1640, h: 2360, name: 'apple-splash-1640-2360.png' },
    { w: 1620, h: 2160, name: 'apple-splash-1620-2160.png' },
];

for (const s of splashes) {
    await makeSplash(s.w, s.h, s.name);
}

await makeIcon(192, 'pwa-icon-192.png');
await makeIcon(512, 'pwa-icon-512.png');
console.log('done');
