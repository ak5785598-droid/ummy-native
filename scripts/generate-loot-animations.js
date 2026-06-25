const fs = require('fs');
const path = require('path');

const ANIM_DIR = path.join(__dirname, '..', 'assets', 'animations');

const LEVELS = [
  { id: 'home', color: [251, 191, 36], name: 'Home' },
  { id: 'bank', color: [156, 163, 175], name: 'Bank' },
  { id: 'car', color: [239, 68, 68], name: 'Car' },
  { id: 'hotel', color: [168, 85, 247], name: 'Hotel' },
  { id: 'bus', color: [59, 130, 246], name: 'Bus' },
  { id: 'train', color: [34, 197, 94], name: 'Train' },
  { id: 'ship', color: [6, 182, 212], name: 'Ship' },
  { id: 'aeroplane', color: [244, 114, 182], name: 'Aeroplane' },
];

function createGateLottie(level) {
  const [r, g, b] = level.color;
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 90,
    w: 400,
    h: 400,
    nm: `gate_${level.id}`,
    ddd: 0,
    assets: [],
    layers: [
      // Background circle (glow)
      {
        ddd: 0,
        ind: 1,
        ty: 4,
        nm: 'glow',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [200, 200, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { t: 0, s: [0, 0, 100], e: [120, 120, 100] },
              { t: 45, s: [120, 120, 100], e: [0, 0, 100] },
              { t: 90, s: [0, 0, 100] },
            ],
          },
        },
        ao: 0,
        shapes: [
          {
            ty: 'el',
            d: 1,
            s: { a: 0, k: [300, 300] },
            p: { a: 0, k: [0, 0] },
            nm: 'circle',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [r / 255, g / 255, b / 255, 0.3] },
            o: { a: 0, k: 100 },
            r: 1,
            nm: 'fill',
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
      },
      // Gate left panel
      {
        ddd: 0,
        ind: 2,
        ty: 4,
        nm: 'gate_left',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [200, 200, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 },
        },
        ao: 0,
        shapes: [
          {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [160, 280] },
            p: { a: 0, k: [-80, 0] },
            r: { a: 0, k: 8 },
            nm: 'left_panel',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [r / 255, g / 255, b / 255, 1] },
            o: { a: 0, k: 100 },
            r: 1,
            nm: 'fill',
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
            sk: { a: 0, k: 0 },
            sa: { a: 0, k: 0 },
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
      },
      // Gate right panel
      {
        ddd: 0,
        ind: 3,
        ty: 4,
        nm: 'gate_right',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [200, 200, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 },
        },
        ao: 0,
        shapes: [
          {
            ty: 'rc',
            d: 1,
            s: { a: 0, k: [160, 280] },
            p: { a: 0, k: [80, 0] },
            r: { a: 0, k: 8 },
            nm: 'right_panel',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [r / 255, g / 255, b / 255, 1] },
            o: { a: 0, k: 100 },
            r: 1,
            nm: 'fill',
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 },
            sk: { a: 0, k: 0 },
            sa: { a: 0, k: 0 },
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
      },
      // Handle
      {
        ddd: 0,
        ind: 4,
        ty: 4,
        nm: 'handle',
        sr: 1,
        ks: {
          o: {
            a: 1,
            k: [
              { t: 0, s: [100], e: [0] },
              { t: 30, s: [0] },
            ],
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [200, 200, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: { a: 0, k: [100, 100, 100] },
        },
        ao: 0,
        shapes: [
          {
            ty: 'el',
            d: 1,
            s: { a: 0, k: [20, 20] },
            p: { a: 0, k: [0, 0] },
            nm: 'knob',
          },
          {
            ty: 'fl',
            c: { a: 0, k: [1, 1, 1, 1] },
            o: { a: 0, k: 100 },
            r: 1,
            nm: 'fill',
          },
        ],
        ip: 0,
        op: 90,
        st: 0,
      },
      // Sparkle particles
      ...Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const ex = Math.cos(angle) * 150;
        const ey = Math.sin(angle) * 150;
        return {
          ddd: 0,
          ind: 10 + i,
          ty: 4,
          nm: `sparkle_${i}`,
          sr: 1,
          ks: {
            o: {
              a: 1,
              k: [
                { t: 20, s: [0], e: [100] },
                { t: 40, s: [100], e: [0] },
                { t: 60, s: [0] },
              ],
            },
            r: { a: 0, k: 0 },
            p: {
              a: 1,
              k: [
                { t: 20, s: [200, 200, 0], e: [200 + ex, 200 + ey, 0] },
                { t: 60, s: [200 + ex, 200 + ey, 0] },
              ],
            },
            a: { a: 0, k: [0, 0, 0] },
            s: {
              a: 1,
              k: [
                { t: 20, s: [0, 0, 100], e: [100, 100, 100] },
                { t: 40, s: [100, 100, 100], e: [0, 0, 100] },
                { t: 60, s: [0, 0, 100] },
              ],
            },
          },
          ao: 0,
          shapes: [
            {
              ty: 'sr',
              sy: 1,
              d: 1,
              pt: { a: 0, k: 4 },
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: 0 },
              ir: { a: 0, k: 3 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 6 },
              os: { a: 0, k: 0 },
              nm: 'star',
            },
            {
              ty: 'fl',
              c: { a: 0, k: [1, 0.84, 0.2, 1] },
              o: { a: 0, k: 100 },
              r: 1,
              nm: 'fill',
            },
          ],
          ip: 20,
          op: 60,
          st: 0,
        };
      }),
    ],
  };
}

function createExplosionLottie() {
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 120 + Math.random() * 80;
    const ex = Math.cos(angle) * dist;
    const ey = Math.sin(angle) * dist;
    const colors = [
      [1, 0.84, 0.2],
      [1, 0.6, 0.1],
      [1, 0.4, 0.05],
      [0.9, 0.3, 0.05],
    ];
    const c = colors[i % colors.length];
    return {
      ddd: 0,
      ind: 10 + i,
      ty: 4,
      nm: `particle_${i}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [100], e: [0] },
            { t: 45, s: [0] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [180 + Math.random() * 180] },
            { t: 45, s: [180 + Math.random() * 180] },
          ],
        },
        p: {
          a: 1,
          k: [
            { t: 0, s: [200, 200, 0], e: [200 + ex, 200 + ey, 0] },
            { t: 45, s: [200 + ex, 200 + ey, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], e: [120, 120, 100] },
            { t: 20, s: [120, 120, 100], e: [0, 0, 100] },
            { t: 45, s: [0, 0, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'el',
          d: 1,
          s: { a: 0, k: [24, 24] },
          p: { a: 0, k: [0, 0] },
          nm: 'circle',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [c[0], c[1], c[2], 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: 'fill',
        },
      ],
      ip: 0,
      op: 45,
      st: 0,
    };
  });

  // Center flash
  const flash = {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: 'flash',
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [100], e: [0] },
          { t: 15, s: [0] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [200, 200, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 0, s: [0, 0, 100], e: [200, 200, 100] },
          { t: 15, s: [200, 200, 100], e: [0, 0, 100] },
          { t: 30, s: [0, 0, 100] },
        ],
      },
    },
    ao: 0,
    shapes: [
      {
        ty: 'el',
        d: 1,
        s: { a: 0, k: [100, 100] },
        p: { a: 0, k: [0, 0] },
        nm: 'flash_circle',
      },
      {
        ty: 'fl',
        c: { a: 0, k: [1, 0.95, 0.8, 1] },
        o: { a: 0, k: 100 },
        r: 1,
        nm: 'fill',
      },
    ],
    ip: 0,
    op: 30,
    st: 0,
  };

  // Shockwave ring
  const ring = {
    ddd: 0,
    ind: 2,
    ty: 4,
    nm: 'shockwave',
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 5, s: [80], e: [0] },
          { t: 30, s: [0] },
        ],
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [200, 200, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 5, s: [0, 0, 100], e: [180, 180, 100] },
          { t: 30, s: [180, 180, 100] },
        ],
      },
    },
    ao: 0,
    shapes: [
      {
        ty: 'el',
        d: 1,
        s: { a: 0, k: [100, 100] },
        p: { a: 0, k: [0, 0] },
        nm: 'ring',
      },
      {
        ty: 'st',
        c: { a: 0, k: [1, 0.84, 0.2, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 4 },
        lc: 1,
        lj: 1,
        nm: 'stroke',
      },
    ],
    ip: 5,
    op: 30,
    st: 0,
  };

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 45,
    w: 400,
    h: 400,
    nm: 'crack_explosion',
    ddd: 0,
    assets: [],
    layers: [flash, ring, ...particles],
  };
}

// Generate gate animations
LEVELS.forEach((level) => {
  const lottie = createGateLottie(level);
  const filePath = path.join(ANIM_DIR, `loot_gate_${level.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(lottie, null, 2));
  console.log(`Created: loot_gate_${level.id}.json (${(JSON.stringify(lottie).length / 1024).toFixed(1)} KB)`);
});

// Generate explosion
const explosion = createExplosionLottie();
const explosionPath = path.join(ANIM_DIR, 'loot_crack_explosion.json');
fs.writeFileSync(explosionPath, JSON.stringify(explosion, null, 2));
console.log(`Created: loot_crack_explosion.json (${(JSON.stringify(explosion).length / 1024).toFixed(1)} KB)`);

console.log('\nDone! 9 Lottie animations generated.');
