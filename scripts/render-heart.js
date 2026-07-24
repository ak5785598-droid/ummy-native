const sharp = require('sharp');

const svgHeart = `
<svg width="600" height="550" viewBox="0 0 600 550" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rimGold" cx="0.28" cy="0.22" r="0.85">
      <stop offset="0%" stop-color="#fde1d2"/>
      <stop offset="25%" stop-color="#f8c7b5"/>
      <stop offset="55%" stop-color="#d48a78"/>
      <stop offset="85%" stop-color="#a05a4a"/>
      <stop offset="100%" stop-color="#7a3c2e"/>
    </radialGradient>
    <linearGradient id="bevelLight" x1="0" y1="0" x2="0.8" y2="0.8">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="35%" stop-color="#fde8ee"/><stop offset="100%" stop-color="#f5c2d0"/></linearGradient>
    <linearGradient id="f2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff5f8"/><stop offset="100%" stop-color="#e9a6b8"/></linearGradient>
    <linearGradient id="f3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fbe0e7"/><stop offset="100%" stop-color="#d98ca2"/></linearGradient>
    <linearGradient id="f4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f0c1ce"/><stop offset="100%" stop-color="#b96b81"/></linearGradient>
    <linearGradient id="f5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e2a9b9"/><stop offset="100%" stop-color="#9d4f66"/></linearGradient>
    <linearGradient id="f6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d18fa3"/><stop offset="100%" stop-color="#7c2e48"/></linearGradient>
    <linearGradient id="f7" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#bc738a"/><stop offset="100%" stop-color="#672139"/></linearGradient>
    <linearGradient id="f8" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#a4576f"/><stop offset="54%" stop-color="#54162a"/></linearGradient>
    <linearGradient id="f9" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8a2a44"/><stop offset="100%" stop-color="#3d0a18"/></linearGradient>
    <linearGradient id="f10" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffedf2"/><stop offset="100%" stop-color="#e2a0b2"/></linearGradient>
    <linearGradient id="f11" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f3cbd6"/><stop offset="100%" stop-color="#c27a8e"/></linearGradient>
    <linearGradient id="f12" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e4b0bf"/><stop offset="100%" stop-color="#9f5a70"/></linearGradient>
    <linearGradient id="f13" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#cc8ca2"/><stop offset="100%" stop-color="#7e3450"/></linearGradient>
    <linearGradient id="f14" x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#7a2540"/><stop offset="100%" stop-color="#4b0f24"/></linearGradient>
    <linearGradient id="f15" x1="1" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#5c142a"/><stop offset="100%" stop-color="#2a0712"/></linearGradient>
    <radialGradient id="centerGlow" cx="0.5" cy="0.38" r="0.65">
      <stop offset="0%" stop-color="#ffe4ec" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#e291a8" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#7a1e3e" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clipHeart"><path d="M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z"/></clipPath>
  </defs>
  <g clip-path="url(#clipHeart)">
    <polygon points="185,115 280,121 300,150 220,180" fill="url(#f1)"/>
    <polygon points="185,115 120,135 140,210 220,180" fill="url(#f2)"/>
    <polygon points="120,135 95,160 140,210" fill="url(#f3)"/>
    <polygon points="95,160 86,245 140,210" fill="url(#f4)"/>
    <polygon points="86,245 160,280 140,210" fill="url(#f5)"/>
    <polygon points="86,245 128,328 160,280" fill="url(#f6)"/>
    <polygon points="128,328 198,398 210,330 160,280" fill="url(#f7)"/>
    <polygon points="128,328 198,398 300,457 210,330" fill="url(#f8)"/>
    <polygon points="198,398 300,457 270,360" fill="url(#f9)"/>
    <polygon points="415,115 320,121 300,150 380,180" fill="url(#f10)"/>
    <polygon points="415,115 480,135 460,210 380,180" fill="url(#f11)"/>
    <polygon points="480,135 505,160 460,210" fill="url(#f12)"/>
    <polygon points="505,160 514,245 460,210" fill="url(#f13)"/>
    <polygon points="514,245 440,280 460,210" fill="url(#f5)"/>
    <polygon points="514,245 472,328 440,280" fill="url(#f6)"/>
    <polygon points="472,328 402,398 390,330 440,280" fill="url(#f7)"/>
    <polygon points="472,328 402,398 300,457 390,330" fill="url(#f8)"/>
    <polygon points="402,398 300,457 330,360" fill="url(#f9)"/>
    <polygon points="220,180 300,200 300,150" fill="url(#f2)" opacity="0.95"/>
    <polygon points="380,180 300,200 300,150" fill="url(#f10)" opacity="0.9"/>
    <polygon points="220,180 240,250 300,200" fill="url(#f3)"/>
    <polygon points="380,180 360,250 300,200" fill="url(#f11)"/>
    <polygon points="240,250 300,270 300,200" fill="url(#f4)"/>
    <polygon points="360,250 300,270 300,200" fill="url(#f12)"/>
    <polygon points="220,180 160,280 240,250" fill="url(#f4)"/>
    <polygon points="380,180 440,280 360,250" fill="url(#f13)"/>
    <polygon points="160,280 210,330 240,250" fill="url(#f6)"/>
    <polygon points="440,280 390,330 360,250" fill="url(#f13)"/>
    <polygon points="240,250 270,360 300,270" fill="url(#f7)"/>
    <polygon points="360,250 330,360 300,270" fill="url(#f8)"/>
    <polygon points="210,330 270,360 240,250" fill="url(#f7)"/>
    <polygon points="390,330 330,360 360,250" fill="url(#f14)"/>
    <polygon points="210,330 270,360 300,457" fill="url(#f8)"/>
    <polygon points="390,330 330,360 300,457" fill="url(#f15)"/>
  </g>
  <g clip-path="url(#clipHeart)">
    <polygon points="185,115 280,121 220,180" fill="#ffffff" opacity="0.58"/>
    <polygon points="185,115 120,135 140,210 220,180" fill="#ffffff" opacity="0.35"/>
    <polygon points="280,121 300,150 300,200 220,180" fill="#ffffff" opacity="0.22"/>
    <polygon points="402,398 472,328 514,245 440,280" fill="#000000" opacity="0.18"/>
    <polygon points="330,360 390,330 300,457" fill="#000000" opacity="0.22"/>
  </g>
  <ellipse cx="300" cy="255" rx="95" ry="75" fill="url(#centerGlow)" opacity="0.7"/>
  <circle cx="196" cy="126" r="5" fill="#ffffff" opacity="0.95"/>
  <circle cx="167" cy="152" r="3" fill="#ffffff" opacity="0.85"/>
  <circle cx="132" cy="188" r="2" fill="#ffffff" opacity="0.7"/>
  <path d="M274 108 l10 -4 2 11 -12 -7z" fill="#ffffff" opacity="0.9"/>
  <circle cx="248" cy="142" r="1.8" fill="#ffffff" opacity="0.8"/>
  <path d="M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z" fill="url(#rimGold)" fill-rule="evenodd" stroke="#6e3a2e" stroke-width="1.2"/>
  <path d="M300 457 C160 363 52 258 90 162 C117 93 207 73 280 121 C291 129 297 139 300 150 C303 139 309 129 320 121 C393 73 483 93 510 162 C548 258 440 363 300 457 Z" fill="none" stroke="url(#bevelLight)" stroke-width="9" stroke-linejoin="round" opacity="0.5"/>
  <path d="M300 488 C140 390 20 270 62 150 C92 75 195 48 272 103 C289 115 296 128 300 143 C304 128 311 115 328 103 C405 48 508 75 538 150 C580 270 460 390 300 488 Z" fill="none" stroke="#5a2a20" stroke-width="2.5" opacity="0.55"/>
  <path d="M62 150 C92 75 195 48 272 103 C289 115 296 128 300 143" fill="none" stroke="#ffe0d1" stroke-width="6" stroke-linecap="round" opacity="0.45"/>
</svg>`;

async function render() {
  const buf = Buffer.from(svgHeart);
  await sharp(buf)
    .resize(240, 220)
    .png()
    .toFile('D:\\Ummy_Dev_Live\\ummy-native\\assets\\images\\cp_heart.png');
  console.log('Rendered: assets/images/cp_heart.png (240x220)');
}

render().catch(e => { console.error(e); process.exit(1); });
