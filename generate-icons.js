const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, 'assets/images/ummy-logon.png');
const OUTPUT_DIR = path.join(__dirname, 'assets/images');
const SIZE = 1024;

async function generateIcons() {
  const input = sharp(INPUT);
  const metadata = await input.metadata();
  console.log(`Input: ${metadata.width}x${metadata.height}`);

  const catSize = Math.round(SIZE * 0.55);
  const padding = Math.round((SIZE - catSize) / 2);

  // 1. FOREGROUND: cats on transparent bg (remove purple bg first)
  // Extract the purple background region and make it transparent
  const catBuffer = await sharp(INPUT)
    .resize(catSize, catSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Remove purple-ish pixels (R:40-100, G:0-30, B:60-130) by making alpha=0
  const pixels = catBuffer.data;
  const channels = 4;
  for (let i = 0; i < pixels.length; i += channels) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Purple background range
    if (r < 120 && g < 50 && b > 40 && b < 200 && b > r) {
      pixels[i + 3] = 0; // transparent
    }
  }

  const processedCat = await sharp(pixels, {
    raw: { width: catSize, height: catSize, channels: 4 }
  }).png().toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: processedCat,
      left: padding,
      top: padding
    }])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'android-icon-foreground.png'));

  console.log('✅ Foreground generated (transparent bg)');

  // 2. BACKGROUND: solid deep purple matching the original
  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 55, g: 0, b: 95, alpha: 255 }
    }
  })
    .png()
    .toFile(path.join(OUTPUT_DIR, 'android-icon-background.png'));

  console.log('✅ Background generated');

  // 3. MONOCHROME: white silhouette on black bg
  // Use the processed transparent cat, make it white
  const whiteCatPixels = Buffer.from(processedCat);
  const wcData = await sharp(processedCat).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < wcData.data.length; i += 4) {
    if (wcData.data[i + 3] > 128) {
      wcData.data[i] = 255;     // R white
      wcData.data[i + 1] = 255; // G white
      wcData.data[i + 2] = 255; // B white
      wcData.data[i + 3] = 255; // A full
    }
  }

  const whiteCat = await sharp(wcData.data, {
    raw: { width: catSize, height: catSize, channels: 4 }
  }).png().toBuffer();

  await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 255 }
    }
  })
    .composite([{
      input: whiteCat,
      left: padding,
      top: padding
    }])
    .png()
    .toFile(path.join(OUTPUT_DIR, 'android-icon-monochrome.png'));

  console.log('✅ Monochrome generated');
  console.log('Done! Rebuild the app to see changes.');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
