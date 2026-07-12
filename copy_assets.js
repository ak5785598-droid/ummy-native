const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\967c0446-d007-414f-ab3c-037bed842b75';
const destDir = 'D:\\Ummy_Dev_Live\\ummy-native\\assets\\images\\themes';

const mapping = {
  'svip_dragon_bubble_1783645346007.png': 'svip_dragon_bubble.png',
  'svip_dragon_entrance_1783645359819.png': 'svip_dragon_entrance.png',
  'svip_dragon_wave_1783645372287.png': 'svip_dragon_wave.png',
  'svip_tiger_bubble_1783645384675.png': 'svip_tiger_bubble.png',
  'svip_tiger_entrance_1783645396863.png': 'svip_tiger_entrance.png',
  'svip_tiger_wave_1783645411402.png': 'svip_tiger_wave.png',
  'svip_scorpion_bubble_1783645423987.png': 'svip_scorpion_bubble.png',
  'svip_scorpion_entrance_1783645436170.png': 'svip_scorpion_entrance.png'
};

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

Object.entries(mapping).forEach(([srcFile, destFile]) => {
  const srcPath = path.join(srcDir, srcFile);
  const destPath = path.join(destDir, destFile);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${srcFile} to ${destFile}`);
  } else {
    console.log(`Source file not found: ${srcFile}`);
  }
});
console.log('Batch 2 asset copy complete!');
