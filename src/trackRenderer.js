import * as THREE from 'three';

/**
 * Generates high-detail 512x512 procedural touge asphalt texture with
 * worn tire tracks, multi-scale mineral grain, tar-sealed cracks, and edge dust.
 */
function createAsphaltTexture(anisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base dark asphalt
  ctx.fillStyle = '#202530';
  ctx.fillRect(0, 0, size, size);

  // Realistic two-lane tire wear bands + subtle shoulder dust darkening
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0.0, 'rgba(10, 12, 16, 0.55)');
  grad.addColorStop(0.07, 'rgba(46, 52, 64, 0.25)');
  grad.addColorStop(0.18, 'rgba(14, 16, 22, 0.42)');
  grad.addColorStop(0.28, 'rgba(34, 40, 52, 0.18)');
  grad.addColorStop(0.38, 'rgba(14, 16, 22, 0.38)');
  grad.addColorStop(0.5, 'rgba(48, 55, 68, 0.22)');
  grad.addColorStop(0.62, 'rgba(14, 16, 22, 0.38)');
  grad.addColorStop(0.72, 'rgba(34, 40, 52, 0.18)');
  grad.addColorStop(0.82, 'rgba(14, 16, 22, 0.42)');
  grad.addColorStop(0.93, 'rgba(46, 52, 64, 0.25)');
  grad.addColorStop(1.0, 'rgba(10, 12, 16, 0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle asphalt repair patches
  for (let i = 0; i < 6; i++) {
    const px = 40 + ((i * 89) % (size - 120));
    const py = (i * 97) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(16, 19, 26, 0.32)' : 'rgba(54, 60, 74, 0.18)';
    ctx.fillRect(px, py, 36 + (i % 3) * 18, 48 + (i % 2) * 28);
  }

  // Fine + coarse mineral aggregate grain for strong sense of speed
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 22 + Math.floor(Math.random() * 44);
    const sz = i % 7 === 0 ? 3 : 2;
    ctx.fillStyle = `rgba(${v}, ${v + 3}, ${v + 9}, 0.34)`;
    ctx.fillRect(x, y, sz, sz);
  }

  // Subtle tar-sealed hairline cracks
  ctx.strokeStyle = 'rgba(8, 10, 14, 0.52)';
  ctx.lineWidth = 1.6;
  for (let c = 0; c < 5; c++) {
    let cx = 60 + c * 92;
    let cy = (c * 103) % size;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let step = 0; step < 7; step++) {
      cx += (Math.random() - 0.5) * 22;
      cy += 14 + Math.random() * 18;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates weathered mountain concrete retaining wall texture (blocks + drainage weep holes + moss streaks).
 */
function createRetainingWallTexture(anisotropy = 4) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#333c4a';
  ctx.fillRect(0, 0, size, size);

  // Subtle concrete grain
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 38 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 10}, 0.3)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Horizontal & staggered vertical concrete block seams
  ctx.strokeStyle = 'rgba(14, 18, 26, 0.55)';
  ctx.lineWidth = 2;
  const rows = 8;
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();

    const offset = (r % 2) * 32;
    for (let x = offset; x < size; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  // Vertical rain/moss weathering streaks & drainage weep holes
  for (let i = 0; i < 6; i++) {
    const wx = 20 + i * 42;
    const streak = ctx.createLinearGradient(wx, 0, wx, size);
    streak.addColorStop(0.0, 'rgba(16, 26, 20, 0.42)');
    streak.addColorStop(0.5, 'rgba(18, 30, 22, 0.22)');
    streak.addColorStop(1.0, 'rgba(10, 14, 18, 0.05)');
    ctx.fillStyle = streak;
    ctx.fillRect(wx - 4, 0, 8, size);

    ctx.fillStyle = '#0f131a';
    ctx.beginPath();
    ctx.arc(wx, 48 + (i % 2) * 96, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates baked metallic W-beam guardrail texture (3D corrugated highlights & bolts without PBR cost).
 */
function createGuardrailTexture(anisotropy = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Vertical W-beam corrugated profile shading
  const grad = ctx.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0.0, '#64748b');
  grad.addColorStop(0.16, '#dbe4f0');
  grad.addColorStop(0.34, '#7c8ba1');
  grad.addColorStop(0.5, '#475569');
  grad.addColorStop(0.66, '#cbd5e1');
  grad.addColorStop(0.84, '#64748b');
  grad.addColorStop(1.0, '#334155');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 64);

  // Subtle grime & scuff marks
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 64;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)';
    ctx.fillRect(x, y, 4, 1);
  }

  // Section seam & bolts
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(126, 0, 3, 64);
  for (const by of [14, 32, 50]) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(121, by, 2.5, 0, Math.PI * 2);
    ctx.arc(134, by, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates textured mountain forest/rock valley ground texture (replaces flat single color).
 */
function createValleyTerrainTexture(anisotropy = 4) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d4436';
  ctx.fillRect(0, 0, size, size);

  // Layered forest canopy & rocky slope mottling
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 22;
    const pick = i % 3;
    ctx.fillStyle =
      pick === 0
        ? 'rgba(22, 42, 30, 0.35)'
        : pick === 1
          ? 'rgba(58, 86, 62, 0.28)'
          : 'rgba(42, 52, 58, 0.24)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine foliage & soil grain
  for (let i = 0; i < 6000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 25 + Math.floor(Math.random() * 45);
    ctx.fillStyle = `rgba(${shade}, ${shade + 16}, ${shade + 6}, 0.22)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.anisotropy = anisotropy;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates layered pine needle texture with baked top-to-bottom ambient occlusion.
 */
function createPineFoliageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#4f7d5b');
  grad.addColorStop(0.45, '#2b5239');
  grad.addColorStop(1.0, '#12261b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  // Branch tier shading stripes
  for (let y = 16; y < 128; y += 22) {
    ctx.fillStyle = 'rgba(8, 18, 12, 0.32)';
    ctx.fillRect(0, y, 128, 5);
    ctx.fillStyle = 'rgba(130, 180, 130, 0.14)';
    ctx.fillRect(0, y + 5, 128, 3);
  }

  for (let i = 0; i < 900; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(14, 30, 20, 0.35)' : 'rgba(110, 160, 115, 0.18)';
    ctx.fillRect(x, y, 2, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates crisp Japanese touge yellow/black reflective chevron warning sign texture.
 */
function createChevronTexture(pointLeft) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 96);

  // Dark border frame
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 90);

  // Bold directional chevron arrow
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (pointLeft) {
    ctx.moveTo(88, 14);
    ctx.lineTo(54, 14);
    ctx.lineTo(24, 48);
    ctx.lineTo(54, 82);
    ctx.lineTo(88, 82);
    ctx.lineTo(58, 48);
  } else {
    ctx.moveTo(40, 14);
    ctx.lineTo(74, 14);
    ctx.lineTo(104, 48);
    ctx.lineTo(74, 82);
    ctx.lineTo(40, 82);
    ctx.lineTo(70, 48);
  }
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates soft radial sodium-vapor lamp pool texture for night asphalt.
 */
function createLampPoolTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0.0, 'rgba(255, 210, 125, 0.55)');
  grad.addColorStop(0.45, 'rgba(255, 175, 70, 0.22)');
  grad.addColorStop(1.0, 'rgba(255, 160, 50, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a realistic equirectangular sky dome texture.
 * Day mode renders physically-inspired atmospheric gradients, sun Mie scattering,
 * layered cirrus & shaded cumulus clouds, and multi-octave mountain ridges with valley haze.
 */
function createSkyDomeTexture(isDay) {
  const canvas = document.createElement('canvas');
  const W = isDay ? 2048 : 512;
  const H = isDay ? 1024 : 256;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (!isDay) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0.0, '#02040a');
    grad.addColorStop(0.32, '#070f24');
    grad.addColorStop(0.49, '#13203d');
    grad.addColorStop(0.56, '#1c2438');
    grad.addColorStop(1.0, '#050812');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const nightLayers = [
      { baseY: 136, amp: 18, freq: 0.025, phase: 0.4, color: 'rgba(11, 18, 36, 0.72)' },
      { baseY: 143, amp: 13, freq: 0.042, phase: 2.1, color: 'rgba(6, 10, 22, 0.92)' },
    ];
    for (const layer of nightLayers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 4) {
        const h =
          Math.sin(x * layer.freq + layer.phase) * layer.amp +
          Math.sin(x * layer.freq * 2.3 + layer.phase * 1.7) * (layer.amp * 0.45);
        ctx.lineTo(x, layer.baseY - Math.abs(h));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Deterministic PRNG for repeatable realistic cloud & ridge placement
  let seed = 1995086;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // 1. Realistic Rayleigh + Horizon Haze sky gradient (natural desaturated mountain daylight)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0.0, '#1f4e8c');   // Deep zenith cerulean
  skyGrad.addColorStop(0.18, '#3871b2');  // Upper sky blue
  skyGrad.addColorStop(0.34, '#659ad0');  // Mid sky
  skyGrad.addColorStop(0.45, '#a4c7e2');  // Lower sky atmospheric scatter
  skyGrad.addColorStop(0.505, '#dce8f0'); // Pale misty horizon band
  skyGrad.addColorStop(0.54, '#c7d8e4');  // Below-horizon valley haze
  skyGrad.addColorStop(0.66, '#7a9088');  // Distant forest basin
  skyGrad.addColorStop(1.0, '#3e4d45');   // Deep ground tone
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. Soft Mie sun-side atmospheric scattering glow aligned with sun azimuth
  // SphereGeometry UV mapping puts sun at (360, 410, -1120) near u ≈ 0.30, v ≈ 0.38
  const sunU = 0.295 * W;
  const sunV = 0.375 * H;
  const mieGlow = ctx.createRadialGradient(sunU, sunV, 12, sunU, sunV, W * 0.32);
  mieGlow.addColorStop(0.0, 'rgba(255, 250, 232, 0.55)');
  mieGlow.addColorStop(0.16, 'rgba(255, 244, 214, 0.24)');
  mieGlow.addColorStop(0.45, 'rgba(232, 240, 248, 0.10)');
  mieGlow.addColorStop(1.0, 'rgba(232, 240, 248, 0.0)');
  ctx.fillStyle = mieGlow;
  ctx.fillRect(0, 0, W, H * 0.56);

  // Helper to draw horizontally seamless wrapped elements across equirectangular seam
  const drawWrapped = (cx, fn) => {
    fn(cx);
    if (cx < W * 0.22) fn(cx + W);
    if (cx > W * 0.78) fn(cx - W);
  };

  // 3. High-altitude wispy cirrus cloud streaks
  ctx.save();
  for (let i = 0; i < 38; i++) {
    const cx = rand() * W;
    const cy = H * (0.12 + rand() * 0.25);
    const len = 110 + rand() * 240;
    const thick = 6 + rand() * 14;
    const tilt = (rand() - 0.5) * 0.14;
    const alpha = 0.06 + rand() * 0.11;

    drawWrapped(cx, (xPos) => {
      ctx.save();
      ctx.translate(xPos, cy);
      ctx.rotate(tilt);
      const cg = ctx.createRadialGradient(0, 0, thick * 0.15, 0, 0, len * 0.5);
      cg.addColorStop(0.0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
      cg.addColorStop(0.55, `rgba(240, 247, 255, ${(alpha * 0.45).toFixed(3)})`);
      cg.addColorStop(1.0, 'rgba(240, 247, 255, 0)');
      ctx.scale(1, thick / (len * 0.5));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, len * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.restore();

  // 4. Layered realistic cumulus cloud banks (sunlit tops + cool atmospheric undersides)
  const cloudBands = [
    { count: 22, yMin: 0.24, yMax: 0.36, scaleMin: 0.85, scaleMax: 1.45, alpha: 0.82 },
    { count: 34, yMin: 0.36, yMax: 0.46, scaleMin: 0.55, scaleMax: 1.05, alpha: 0.72 },
    { count: 44, yMin: 0.44, yMax: 0.495, scaleMin: 0.32, scaleMax: 0.62, alpha: 0.52 },
  ];

  for (const band of cloudBands) {
    for (let i = 0; i < band.count; i++) {
      const cx = rand() * W;
      const cy = H * (band.yMin + rand() * (band.yMax - band.yMin));
      const sc = band.scaleMin + rand() * (band.scaleMax - band.scaleMin);
      const puffCount = 5 + Math.floor(rand() * 6);
      const puffs = [];
      for (let p = 0; p < puffCount; p++) {
        const px = (p / (puffCount - 1) - 0.5) * 140 * sc + (rand() - 0.5) * 24 * sc;
        const arch = Math.sin((p / (puffCount - 1)) * Math.PI);
        const py = -arch * (18 + rand() * 14) * sc + (rand() - 0.5) * 7 * sc;
        const rx = (28 + rand() * 34) * sc;
        const ry = (13 + rand() * 14) * sc;
        puffs.push({ px, py, rx, ry });
      }

      // Slightly warmer highlight when closer to the sun
      const sunDist = Math.min(Math.abs(cx - sunU), W - Math.abs(cx - sunU)) / (W * 0.5);
      const warmMix = Math.max(0, 1 - sunDist * 1.4);
      const topR = 255;
      const topG = Math.round(252 + warmMix * 3);
      const topB = Math.round(255 - warmMix * 10);

      drawWrapped(cx, (xPos) => {
        // Underside atmospheric shadow first
        for (const pf of puffs) {
          const sg = ctx.createRadialGradient(
            xPos + pf.px,
            cy + pf.py + pf.ry * 0.38,
            pf.rx * 0.1,
            xPos + pf.px,
            cy + pf.py + pf.ry * 0.38,
            pf.rx
          );
          sg.addColorStop(0.0, `rgba(148, 172, 196, ${(band.alpha * 0.42).toFixed(3)})`);
          sg.addColorStop(0.7, `rgba(164, 186, 208, ${(band.alpha * 0.18).toFixed(3)})`);
          sg.addColorStop(1.0, 'rgba(164, 186, 208, 0)');
          ctx.save();
          ctx.translate(xPos + pf.px, cy + pf.py + pf.ry * 0.38);
          ctx.scale(1, pf.ry / pf.rx);
          ctx.fillStyle = sg;
          ctx.beginPath();
          ctx.arc(0, 0, pf.rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // Sunlit cloud body on top
        for (const pf of puffs) {
          const lg = ctx.createRadialGradient(
            xPos + pf.px - pf.rx * 0.12,
            cy + pf.py - pf.ry * 0.25,
            pf.rx * 0.08,
            xPos + pf.px,
            cy + pf.py,
            pf.rx
          );
          lg.addColorStop(0.0, `rgba(${topR}, ${topG}, ${topB}, ${(band.alpha * 0.85).toFixed(3)})`);
          lg.addColorStop(0.55, `rgba(242, 248, 253, ${(band.alpha * 0.48).toFixed(3)})`);
          lg.addColorStop(1.0, 'rgba(235, 244, 252, 0)');
          ctx.save();
          ctx.translate(xPos + pf.px, cy + pf.py);
          ctx.scale(1, pf.ry / pf.rx);
          ctx.fillStyle = lg;
          ctx.beginPath();
          ctx.arc(0, 0, pf.rx, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });
    }
  }

  // 5. Multi-octave periodic FBM mountain ridges (seamless 360° Japanese mountain ranges + aerial perspective)
  const periodicFbm = (uNorm, freqs, phases, amps) => {
    let val = 0;
    const tau = Math.PI * 2;
    for (let k = 0; k < freqs.length; k++) {
      val += Math.sin(uNorm * tau * freqs[k] + phases[k]) * amps[k];
    }
    return val;
  };

  const mountainLayers = [
    {
      // Far pale alpine silhouettes almost dissolved into horizon haze
      baseY: H * 0.506,
      freqs: [2, 5, 9, 17, 31],
      phases: [0.6, 1.9, 3.4, 0.8, 2.2],
      amps: [26, 17, 10, 5.5, 2.5],
      topColor: 'rgba(150, 176, 198, 0.56)',
      botColor: 'rgba(186, 206, 220, 0.72)',
    },
    {
      // Mid-far misty blue-grey ridge
      baseY: H * 0.516,
      freqs: [3, 7, 13, 23, 41],
      phases: [2.4, 0.7, 4.1, 1.5, 3.6],
      amps: [22, 14, 8.5, 4.5, 2.0],
      topColor: 'rgba(104, 134, 152, 0.74)',
      botColor: 'rgba(142, 168, 180, 0.85)',
    },
    {
      // Mid-near Gunma/Akina forested range
      baseY: H * 0.530,
      freqs: [4, 8, 15, 29, 53],
      phases: [1.1, 3.8, 0.5, 2.9, 4.7],
      amps: [16, 11, 6.5, 3.5, 1.8],
      topColor: 'rgba(67, 94, 94, 0.88)',
      botColor: 'rgba(84, 110, 102, 0.96)',
    },
    {
      // Closest dark cedar ridge base
      baseY: H * 0.548,
      freqs: [5, 11, 19, 37],
      phases: [3.2, 1.4, 5.0, 2.1],
      amps: [10, 6.5, 3.8, 2.0],
      topColor: 'rgba(48, 69, 60, 0.96)',
      botColor: 'rgba(42, 56, 49, 1.0)',
    },
  ];

  for (const layer of mountainLayers) {
    const ridgeGrad = ctx.createLinearGradient(0, layer.baseY - 58, 0, layer.baseY + 80);
    ridgeGrad.addColorStop(0.0, layer.topColor);
    ridgeGrad.addColorStop(1.0, layer.botColor);
    ctx.fillStyle = ridgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const u = x / W;
      const n = periodicFbm(u, layer.freqs, layer.phases, layer.amps);
      // Smooth undulating mountain profile (no harsh V-shaped Math.abs spikes)
      const elev = Math.max(0, n + 26);
      ctx.lineTo(x, layer.baseY - elev);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  // 6. Subtle horizon atmospheric mist veil blending distant ridges seamlessly into fog
  const mistGrad = ctx.createLinearGradient(0, H * 0.47, 0, H * 0.56);
  mistGrad.addColorStop(0.0, 'rgba(218, 232, 242, 0.0)');
  mistGrad.addColorStop(0.55, 'rgba(208, 224, 236, 0.28)');
  mistGrad.addColorStop(1.0, 'rgba(186, 206, 218, 0.0)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, H * 0.47, W, H * 0.09);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Generates a soft realistic additive sun bloom texture (replaces flat cartoon sun sphere).
 */
function createSunGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size * 0.5;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.0, 'rgba(255, 255, 248, 1.0)');
  grad.addColorStop(0.09, 'rgba(255, 252, 232, 0.92)');
  grad.addColorStop(0.22, 'rgba(255, 242, 204, 0.42)');
  grad.addColorStop(0.52, 'rgba(255, 232, 185, 0.12)');
  grad.addColorStop(1.0, 'rgba(255, 230, 180, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a glowing overhead banner texture for START / FINISH gantries.
 */
function createBannerTexture(label, bgHex, stripeHex, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  // Checkered or hazard edges
  const sq = 16;
  for (let x = 0; x < 512; x += sq) {
    ctx.fillStyle = (x / sq) % 2 === 0 ? stripeHex : '#090d16';
    ctx.fillRect(x, 0, sq, 18);
    ctx.fillRect(x, 110, sq, 18);
  }

  ctx.fillStyle = accentHex;
  ctx.font = 'italic 900 44px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a road ribbon geometry between lateralOffsetMin and lateralOffsetMax at height y.
 */
function buildRibbonGeometry(samples, leftOffset, rightOffset, y, uvScaleV = 0.12) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const normals = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const lx = p.x + p.rx * leftOffset;
    const lz = p.z + p.rz * leftOffset;
    const rx = p.x + p.rx * rightOffset;
    const rz = p.z + p.rz * rightOffset;

    const vi = i * 6;
    const baseY = p.y || 0;
    positions[vi] = lx;
    positions[vi + 1] = baseY + y;
    positions[vi + 2] = lz;
    positions[vi + 3] = rx;
    positions[vi + 4] = baseY + y;
    positions[vi + 5] = rz;

    normals[vi] = 0;
    normals[vi + 1] = 1;
    normals[vi + 2] = 0;
    normals[vi + 3] = 0;
    normals[vi + 4] = 1;
    normals[vi + 5] = 0;

    const ui = i * 4;
    uvs[ui] = 0;
    uvs[ui + 1] = p.s * uvScaleV;
    uvs[ui + 2] = 1;
    uvs[ui + 3] = p.s * uvScaleV;

    if (i < n - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      // Front-facing upward (+Y)
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a continuous vertical ribbon (guardrail beam or retaining wall skirt) with UVs.
 */
function buildGuardrailBeamGeometry(samples, sideOffset, yBottom, yTop, uvScaleU = 0.22, uvScaleV = 1.0) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const baseY = p.y || 0;
    const gx = p.x + p.rx * sideOffset;
    const gz = p.z + p.rz * sideOffset;
    const vi = i * 6;
    positions[vi] = gx;
    positions[vi + 1] = baseY + yBottom;
    positions[vi + 2] = gz;
    positions[vi + 3] = gx;
    positions[vi + 4] = baseY + yTop;
    positions[vi + 5] = gz;

    const ui = i * 4;
    const u = p.s * uvScaleU;
    uvs[ui] = u;
    uvs[ui + 1] = 0;
    uvs[ui + 2] = u;
    uvs[ui + 3] = uvScaleV;

    if (i < n - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Generates a natural grassy/rocky mountain berm sloping downward from the road shoulder
 * into the valley floor, automatically narrowing on tight inside hairpin bends so it never
 * folds or pokes onto the road.
 */
function buildRoadsideSlopeGeometry(samples, side, innerOffset, maxWidth, yInner, yOuter, uvScaleU = 0.08) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const baseY = p.y || 0;

    // If this side is the inside of a sharp curve, cap outer width safely inside the radius of curvature
    const isInsideTurn = (p.curvature > 0 && side === -1) || (p.curvature < 0 && side === 1);
    let width = maxWidth;
    if (isInsideTurn && Math.abs(p.curvature) > 0.005) {
      const safeRadius = 0.78 / Math.abs(p.curvature);
      width = Math.max(0.6, Math.min(maxWidth, safeRadius - innerOffset));
    }

    const outerOffset = innerOffset + width;
    const ix = p.x + p.rx * side * innerOffset;
    const iz = p.z + p.rz * side * innerOffset;
    const ox = p.x + p.rx * side * outerOffset;
    const oz = p.z + p.rz * side * outerOffset;

    const vi = i * 6;
    positions[vi] = ix;
    positions[vi + 1] = baseY + yInner;
    positions[vi + 2] = iz;
    positions[vi + 3] = ox;
    positions[vi + 4] = baseY + yOuter;
    positions[vi + 5] = oz;

    const ui = i * 4;
    const u = p.s * uvScaleU;
    uvs[ui] = u;
    uvs[ui + 1] = 0;
    uvs[ui + 2] = u;
    uvs[ui + 3] = 1;

    if (i < n - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      if (side > 0) {
        indices.push(a, b, c, b, d, c);
      } else {
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the entire mountain pass environment using lightweight MeshLambertMaterial
 * + high-detail procedural textures for crisp visuals and smooth low-end GPU performance.
 */
export function buildTougeEnvironment(scene, track, maxAnisotropy = 4) {
  const envGroup = new THREE.Group();
  envGroup.name = 'TougeEnvironment';

  const { samples, halfWidth, guardrailOffset } = track;

  // 1. High-resolution (10m grid) mountain terrain hugging right beneath the road (-0.35m).
  // Build a lightweight 2D spatial hash over track samples so each terrain vertex finds
  // all road segments within 22m in O(1) time:
  // - Right next to any road: sits snugly at (localMinRoadY - 0.35m) -> zero floating, zero poke-through!
  // - Farther from the road: blends smoothly into surrounding mountain slopes.
  const centerX = (track.bounds.minX + track.bounds.maxX) * 0.5;
  const centerZ = (track.bounds.minZ + track.bounds.maxZ) * 0.5;

  const cellSize = 24;
  const spatialGrid = new Map();
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    const cx = Math.floor(p.x / cellSize);
    const cz = Math.floor(p.z / cellSize);
    const key = `${cx},${cz}`;
    let arr = spatialGrid.get(key);
    if (!arr) {
      arr = [];
      spatialGrid.set(key, arr);
    }
    arr.push(p);
  }

  const getTerrainY = (wx, wz) => {
    const cx = Math.floor(wx / cellSize);
    const cz = Math.floor(wz / cellSize);
    let localMinY = Infinity;
    let nearestDistSq = Infinity;
    let nearestY = 0;

    // Check 3x3 neighborhood (~24..48m radius) for any nearby road legs
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const bucket = spatialGrid.get(`${cx + dx},${cz + dz}`);
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) {
          const p = bucket[k];
          const ddx = p.x - wx;
          const ddz = p.z - wz;
          const d2 = ddx * ddx + ddz * ddz;
          if (d2 < 22 * 22 && p.y < localMinY) {
            localMinY = p.y;
          }
          if (d2 < nearestDistSq) {
            nearestDistSq = d2;
            nearestY = p.y;
          }
        }
      }
    }

    if (localMinY < Infinity) {
      // Directly under or adjacent to road: hug 0.35m below lowest nearby road leg
      return localMinY - 0.35;
    }

    // Outside 22m of any road: use nearest track point elevation + subtle natural mountain undulation
    let baseY;
    let distFromRoad;
    if (nearestDistSq < Infinity) {
      baseY = nearestY;
      distFromRoad = Math.sqrt(nearestDistSq);
    } else {
      const nearest = track.projectPoint(wx, wz, -1);
      baseY = track.getElevationAtS(nearest.s);
      distFromRoad = Math.abs(nearest.lateral);
    }
    const farBlend = Math.min(1, Math.max(0, (distFromRoad - 26) / 60));
    const ridge = (Math.sin(wx * 0.018) * Math.cos(wz * 0.014) * 5.5 - 1.2) * farBlend;
    return baseY - 0.45 + ridge - Math.min(24, Math.max(0, distFromRoad - 140) * 0.06);
  };

  // Core high-res terrain covering entire course footprint (10m x 10m cells -> ~8k verts)
  const coreWidth = Math.ceil((track.bounds.maxX - track.bounds.minX + 280) / 10) * 10;
  const coreDepth = Math.ceil((track.bounds.maxZ - track.bounds.minZ + 280) / 10) * 10;
  const segX = Math.max(40, Math.round(coreWidth / 10));
  const segZ = Math.max(100, Math.round(coreDepth / 10));

  const groundGeo = new THREE.PlaneGeometry(coreWidth, coreDepth, segX, segZ);
  groundGeo.rotateX(-Math.PI / 2);
  const gPos = groundGeo.attributes.position;
  for (let i = 0; i < gPos.count; i++) {
    const wx = gPos.getX(i) + centerX;
    const wz = gPos.getZ(i) + centerZ;
    gPos.setY(i, getTerrainY(wx, wz));
  }
  groundGeo.computeVertexNormals();

  const valleyTex = createValleyTerrainTexture(maxAnisotropy);
  valleyTex.repeat.set(Math.round(coreWidth / 28), Math.round(coreDepth / 28));
  const groundMat = new THREE.MeshLambertMaterial({
    map: valleyTex,
    color: 0x3b4d5c,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(centerX, 0, centerZ);
  envGroup.add(ground);

  // Far outer horizon mountain apron (keeps distant horizon seamless beyond core terrain)
  const outerGeo = new THREE.PlaneGeometry(4600, 3600, 24, 32);
  outerGeo.rotateX(-Math.PI / 2);
  const oPos = outerGeo.attributes.position;
  for (let i = 0; i < oPos.count; i++) {
    const wx = oPos.getX(i) + centerX;
    const wz = oPos.getZ(i) + centerZ;
    const nearest = track.projectPoint(wx, wz, -1);
    const baseY = track.getElevationAtS(nearest.s);
    // Keep outer apron cleanly below core terrain so it never z-fights or pokes through
    oPos.setY(i, baseY - 18.0 - Math.min(45, Math.abs(nearest.lateral) * 0.04));
  }
  outerGeo.computeVertexNormals();
  const outerGround = new THREE.Mesh(outerGeo, groundMat);
  outerGround.position.set(centerX, 0, centerZ);
  envGroup.add(outerGround);

  // 2. Asphalt Road Surface (512x512 textured asphalt + lightweight Lambert shading)
  const asphaltTex = createAsphaltTexture(maxAnisotropy);
  const roadGeo = buildRibbonGeometry(samples, -halfWidth, halfWidth, 0.0, 0.065);
  const roadMat = new THREE.MeshLambertMaterial({
    map: asphaltTex,
    color: 0xe2e8f0,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  envGroup.add(roadMesh);

  // 3. Outer Shoulder Apron + Natural Mountain Berm Slopes + Concrete Retaining Wall Skirt
  const gutterMat = new THREE.MeshLambertMaterial({
    color: 0x1e2533,
  });
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, -guardrailOffset - 0.5, -halfWidth, -0.015), gutterMat)
  );
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, halfWidth, guardrailOffset + 0.5, -0.015), gutterMat)
  );

  // Roadside mountain slope berms bridge the small ~0.35m seam between road shoulder and terrain
  const shoulderEdge = guardrailOffset + 0.5;
  const bermMat = new THREE.MeshLambertMaterial({
    map: valleyTex,
    color: 0x3b4d5c,
    side: THREE.DoubleSide,
  });
  envGroup.add(
    new THREE.Mesh(buildRoadsideSlopeGeometry(samples, -1, shoulderEdge, 4.2, -0.02, -1.6), bermMat),
    new THREE.Mesh(buildRoadsideSlopeGeometry(samples, 1, shoulderEdge, 4.2, -0.02, -1.6), bermMat)
  );

  const wallTex = createRetainingWallTexture(maxAnisotropy);
  const wallMat = new THREE.MeshLambertMaterial({
    map: wallTex,
    color: 0x94a3b8,
    side: THREE.DoubleSide,
  });
  envGroup.add(
    new THREE.Mesh(buildGuardrailBeamGeometry(samples, -shoulderEdge, -32, -0.05, 0.09, 2.8), wallMat),
    new THREE.Mesh(buildGuardrailBeamGeometry(samples, shoulderEdge, -32, -0.05, 0.09, 2.8), wallMat)
  );

  // 3.5. Inside-Corner Drainage Gutters (도랑 — recessed concrete trench right next to inside guardrail)
  const ditchCanvas = document.createElement('canvas');
  ditchCanvas.width = 64;
  ditchCanvas.height = 64;
  const dCtx = ditchCanvas.getContext('2d');
  // Concrete outer lip + deep dark drainage trough + subtle grate ribs
  dCtx.fillStyle = '#05070d';
  dCtx.fillRect(0, 0, 64, 64);
  dCtx.fillStyle = '#64748b';
  dCtx.fillRect(0, 0, 9, 64);
  dCtx.fillRect(55, 0, 9, 64);
  dCtx.fillStyle = '#263348';
  for (let y = 0; y < 64; y += 16) {
    dCtx.fillRect(9, y, 46, 3);
  }
  const ditchTex = new THREE.CanvasTexture(ditchCanvas);
  ditchTex.wrapS = THREE.ClampToEdgeWrapping;
  ditchTex.wrapT = THREE.RepeatWrapping;
  ditchTex.anisotropy = maxAnisotropy;
  ditchTex.colorSpace = THREE.SRGBColorSpace;

  const ditchMat = new THREE.MeshLambertMaterial({
    map: ditchTex,
    color: 0xdbeafe,
  });

  // Extract contiguous inside-corner gutter segments and place recessed trough beside inside guardrail
  let segStart = -1;
  let segSide = 0;
  for (let i = 0; i <= samples.length; i++) {
    const side = i < samples.length ? samples[i].gutterSide : 0;
    if (side !== segSide) {
      if (segSide !== 0 && i - segStart >= 2) {
        const segSamples = samples.slice(segStart, i);
        // Leave ~0.9m concrete shoulder buffer between guardrail (7.35m) and gutter trough (5.25m..6.45m)
        const innerEdge = segSide === -1 ? -(halfWidth - 0.3) : halfWidth - 1.5;
        const outerEdge = segSide === -1 ? -(halfWidth - 1.5) : halfWidth - 0.3;
        const ditchGeo = buildRibbonGeometry(segSamples, innerEdge, outerEdge, 0.014, 0.45);
        envGroup.add(new THREE.Mesh(ditchGeo, ditchMat));
      }
      segStart = side !== 0 ? i : -1;
      segSide = side;
    }
  }

  // 4. Solid White Road Edge Lines
  const edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
  const edgeOffset = halfWidth - 0.36;
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, -edgeOffset - 0.14, -edgeOffset, 0.018), edgeLineMat)
  );
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, edgeOffset, edgeOffset + 0.14, 0.018), edgeLineMat)
  );

  // 5. Dashed Amber/Yellow Center Line (classic Japanese Touge)
  const dashGeo = new THREE.PlaneGeometry(0.24, 3.8);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const dashSpacing = 8.5;
  const dashCount = Math.floor(track.totalLength / dashSpacing);
  const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < dashCount; i++) {
    const pt = track.getPointAtS(i * dashSpacing + 4);
    dummy.position.set(pt.x, pt.y + 0.025, pt.z);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.set(-pt.slope, pt.heading, 0);
    dummy.updateMatrix();
    dashInst.setMatrixAt(i, dummy.matrix);
  }
  dashInst.instanceMatrix.needsUpdate = true;
  envGroup.add(dashInst);

  // 6. Guardrails (baked corrugated W-beam texture + lightweight Lambert + posts)
  const railTex = createGuardrailTexture(maxAnisotropy);
  const railMat = new THREE.MeshLambertMaterial({
    map: railTex,
    color: 0xe2e8f0,
    side: THREE.DoubleSide,
  });

  // Reflective strip along guardrails for crisp night readability
  const reflectorMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
  });

  let railStart = -1;
  for (let i = 0; i <= samples.length; i++) {
    const hasRail = i < samples.length && !samples[i].noGuardrail;
    if (hasRail && railStart === -1) {
      railStart = i;
    } else if (!hasRail && railStart !== -1) {
      if (i - railStart >= 2) {
        const seg = samples.slice(railStart, i);
        envGroup.add(
          new THREE.Mesh(buildGuardrailBeamGeometry(seg, -guardrailOffset, 0.42, 0.88, 0.25, 1.0), railMat),
          new THREE.Mesh(buildGuardrailBeamGeometry(seg, guardrailOffset, 0.42, 0.88, 0.25, 1.0), railMat),
          new THREE.Mesh(buildGuardrailBeamGeometry(seg, -guardrailOffset + 0.04, 0.62, 0.7), reflectorMat),
          new THREE.Mesh(buildGuardrailBeamGeometry(seg, guardrailOffset - 0.04, 0.62, 0.7), reflectorMat)
        );
      }
      railStart = -1;
    }
  }

  // Guardrail Posts (InstancedMesh)
  const postSpacing = 11;
  const postPairs = Math.floor(track.totalLength / postSpacing);
  const postGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
  const postInst = new THREE.InstancedMesh(postGeo, postMat, postPairs * 2);
  let postIdx = 0;
  for (let i = 0; i < postPairs; i++) {
    const pt = track.getPointAtS(i * postSpacing);
    if (pt.noGuardrail) continue;
    for (const side of [-1, 1]) {
      dummy.position.set(
        pt.x + pt.rx * side * (guardrailOffset + 0.12),
        pt.y + 0.47,
        pt.z + pt.rz * side * (guardrailOffset + 0.12)
      );
      dummy.rotation.order = 'XYZ';
      dummy.rotation.set(0, pt.heading, 0);
      dummy.updateMatrix();
      postInst.setMatrixAt(postIdx++, dummy.matrix);
    }
  }
  postInst.count = postIdx;
  postInst.instanceMatrix.needsUpdate = true;
  envGroup.add(postInst);

  // 7. Directional Reflective Corner Chevron Signs on outside of tight turns
  const leftTurnChevrons = [];
  const rightTurnChevrons = [];
  for (let s = 40; s < track.totalLength - 40; s += 13) {
    const pt = track.getPointAtS(s);
    if (Math.abs(pt.curvature) > 0.0085) {
      if (pt.curvature > 0) {
        // Turning left -> outside is right (+1), arrow points left
        leftTurnChevrons.push({ pt, side: 1 });
      } else {
        // Turning right -> outside is left (-1), arrow points right
        rightTurnChevrons.push({ pt, side: -1 });
      }
    }
  }
  const addChevronGroup = (items, pointLeft) => {
    if (items.length === 0) return;
    const signGeo = new THREE.BoxGeometry(1.25, 0.92, 0.1);
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const faceMat = new THREE.MeshBasicMaterial({ map: createChevronTexture(pointLeft) });
    const signInst = new THREE.InstancedMesh(
      signGeo,
      [frameMat, frameMat, frameMat, frameMat, faceMat, faceMat],
      items.length
    );
    items.forEach(({ pt, side }, idx) => {
      const dist = guardrailOffset + 0.45;
      dummy.position.set(pt.x + pt.rx * side * dist, pt.y + 1.5, pt.z + pt.rz * side * dist);
      dummy.rotation.order = 'XYZ';
      dummy.rotation.set(0, pt.heading + side * 0.25, 0);
      dummy.updateMatrix();
      signInst.setMatrixAt(idx, dummy.matrix);
    });
    signInst.instanceMatrix.needsUpdate = true;
    envGroup.add(signInst);
  };
  addChevronGroup(leftTurnChevrons, true);
  addChevronGroup(rightTurnChevrons, false);

  // 8. Sodium-Vapor Touge Streetlamps + Soft Radial Ground Light Pools
  const lampSpacing = 46;
  const lampCount = Math.floor((track.totalLength - 60) / lampSpacing);
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 6.8, 6);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
  const armGeo = new THREE.BoxGeometry(2.6, 0.12, 0.12);
  const headGeo = new THREE.BoxGeometry(0.95, 0.16, 0.42);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
  const poolGeo = new THREE.PlaneGeometry(13.0, 13.0);
  const poolMat = new THREE.MeshBasicMaterial({
    map: createLampPoolTexture(),
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const armInst = new THREE.InstancedMesh(armGeo, poleMat, lampCount);
  const headInst = new THREE.InstancedMesh(headGeo, headMat, lampCount);
  const poolInst = new THREE.InstancedMesh(poolGeo, poolMat, lampCount);

  for (let i = 0; i < lampCount; i++) {
    const s = 32 + i * lampSpacing;
    const pt = track.getPointAtS(s);
    const side = i % 2 === 0 ? 1 : -1;
    const poleDist = guardrailOffset + 0.85;
    const px = pt.x + pt.rx * side * poleDist;
    const pz = pt.z + pt.rz * side * poleDist;

    dummy.position.set(px, pt.y + 3.4, pz);
    dummy.rotation.order = 'XYZ';
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);

    const armX = pt.x + pt.rx * side * (poleDist - 1.2);
    const armZ = pt.z + pt.rz * side * (poleDist - 1.2);
    dummy.position.set(armX, pt.y + 6.75, armZ);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    armInst.setMatrixAt(i, dummy.matrix);

    const headX = pt.x + pt.rx * side * (poleDist - 2.35);
    const headZ = pt.z + pt.rz * side * (poleDist - 2.35);
    dummy.position.set(headX, pt.y + 6.62, headZ);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    headInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(headX, pt.y + 0.038, headZ);
    dummy.rotation.order = 'YXZ';
    dummy.rotation.set(-Math.PI / 2 - pt.slope, pt.heading, 0);
    dummy.updateMatrix();
    poolInst.setMatrixAt(i, dummy.matrix);
  }
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  headInst.instanceMatrix.needsUpdate = true;
  poolInst.instanceMatrix.needsUpdate = true;
  envGroup.add(poleInst, armInst, headInst, poolInst);

  // 9. Textured Low-Poly Roadside Pine Trees (baked needle shading, strictly outside guardrails)
  const treeCandidates = 360;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3.0, 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3b2f26 });
  const crownGeo = new THREE.ConeGeometry(2.6, 8.5, 6);
  const crownMat = new THREE.MeshLambertMaterial({
    map: createPineFoliageTexture(),
    color: 0x6b8f78,
  });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCandidates);
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCandidates);

  let tIdx = 0;
  for (let i = 0; i < treeCandidates; i++) {
    const s = 10 + (i / treeCandidates) * (track.totalLength - 20);
    const pt = track.getPointAtS(s);
    const side = i % 2 === 0 ? -1 : 1;
    // Pseudo-random deterministic offset well outside guardrail
    const rand = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const dist = guardrailOffset + 6.5 + rand * 16;
    const scale = 0.8 + rand * 0.9;
    const tx = pt.x + pt.rx * side * dist;
    const tz = pt.z + pt.rz * side * dist;

    // Guard against landing on an adjacent hairpin leg
    const nearest = track.projectPoint(tx, tz, -1);
    if (Math.abs(nearest.lateral) < guardrailOffset + 4.5) {
      continue;
    }

    const baseY = getTerrainY(tx, tz) - 0.4;
    dummy.rotation.order = 'XYZ';
    dummy.position.set(tx, baseY + 1.5 * scale, tz);
    dummy.rotation.set(0, rand * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(tIdx, dummy.matrix);

    dummy.position.set(tx, baseY + 6.2 * scale, tz);
    dummy.updateMatrix();
    crownInst.setMatrixAt(tIdx, dummy.matrix);
    tIdx++;
  }
  trunkInst.count = tIdx;
  crownInst.count = tIdx;
  dummy.scale.set(1, 1, 1);
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  envGroup.add(trunkInst, crownInst);

  // 10. Start & Finish Overhead Gantries + Painted Road Lines
  envGroup.add(
    createGantry(track, track.startS + 6.5, 'PROJECT D // START', '#0b1224', '#38bdf8', '#facc15')
  );
  envGroup.add(
    createGantry(track, track.finishS, 'FINISH LINE', '#111827', '#ffffff', '#4ade80')
  );

  // 11. Gradient Mountain Sky Dome + Night Starfield/Moon & Daytime Sun
  const skyBackdrop = createSkyBackdrop();
  envGroup.add(skyBackdrop.group);

  scene.add(envGroup);

  return {
    group: envGroup,
    setTimeOfDay(mode) {
      const isDay = mode === 'day';
      skyBackdrop.nightGroup.visible = !isDay;
      skyBackdrop.dayGroup.visible = isDay;
      poolInst.visible = !isDay;
      headMat.color.setHex(isDay ? 0x94a3b8 : 0xffd27d);
      groundMat.color.setHex(isDay ? 0x9db8a0 : 0x263442);
      bermMat.color.setHex(isDay ? 0x9db8a0 : 0x263442);
      wallMat.color.setHex(isDay ? 0xcbd5e1 : 0x64748b);
      crownMat.color.setHex(isDay ? 0xb5d6ba : 0x3b594d);
      reflectorMat.color.setHex(isDay ? 0xe2e8f0 : 0x38bdf8);
    },
    syncSkyToCamera(camPos) {
      skyBackdrop.group.position.set(camPos.x, camPos.y, camPos.z);
    },
  };
}

function createGantry(track, s, label, bgHex, stripeHex, accentHex) {
  const group = new THREE.Group();
  const pt = track.getPointAtS(s);

  group.position.set(pt.x, pt.y, pt.z);
  group.rotation.y = pt.heading;

  const span = track.guardrailOffset * 2 + 1.8;
  const height = 6.8;

  const pillarMat = new THREE.MeshLambertMaterial({
    color: 0x475569,
  });
  const pillarGeo = new THREE.BoxGeometry(0.55, height, 0.55);

  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(span / 2, height / 2, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(-span / 2, height / 2, 0);
  group.add(leftPillar, rightPillar);

  // Overhead banner board
  const bannerTex = createBannerTexture(label, bgHex, stripeHex, accentHex);
  const bannerGeo = new THREE.BoxGeometry(span + 0.6, 1.9, 0.45);
  const bannerMats = [
    pillarMat,
    pillarMat,
    pillarMat,
    pillarMat,
    new THREE.MeshBasicMaterial({ map: bannerTex }),
    new THREE.MeshBasicMaterial({ map: bannerTex }),
  ];
  const banner = new THREE.Mesh(bannerGeo, bannerMats);
  banner.position.set(0, height - 0.6, 0);
  group.add(banner);

  // Painted Start/Finish Checker Strip on the Asphalt (tilted to match road slope)
  const checkerCanvas = document.createElement('canvas');
  checkerCanvas.width = 256;
  checkerCanvas.height = 64;
  const ctx = checkerCanvas.getContext('2d');
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f8fafc' : '#0f172a';
      ctx.fillRect(x * 16, y * 32, 16, 32);
    }
  }
  const checkerTex = new THREE.CanvasTexture(checkerCanvas);
  checkerTex.colorSpace = THREE.SRGBColorSpace;
  const lineMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(track.roadWidth - 0.8, 2.2),
    new THREE.MeshBasicMaterial({ map: checkerTex })
  );
  lineMesh.rotation.x = -Math.PI / 2 - pt.slope;
  lineMesh.position.y = 0.036;
  group.add(lineMesh);

  return group;
}

function createSkyBackdrop() {
  const group = new THREE.Group();
  const nightGroup = new THREE.Group();
  const dayGroup = new THREE.Group();
  dayGroup.visible = false;

  // Smooth gradient sky domes with distant mountain ridge silhouettes (1 draw call, fog disabled)
  const domeGeo = new THREE.SphereGeometry(1550, 40, 24);
  const nightDome = new THREE.Mesh(
    domeGeo,
    new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(false),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  nightGroup.add(nightDome);

  const dayDome = new THREE.Mesh(
    domeGeo,
    new THREE.MeshBasicMaterial({
      map: createSkyDomeTexture(true),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  dayGroup.add(dayDome);

  // Night: Starfield points high above the mountain pass
  const starCount = 550;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 500 + Math.random() * 900;
    starPos[i * 3] = Math.cos(theta) * radius;
    starPos[i * 3 + 1] = 130 + Math.random() * 420;
    starPos[i * 3 + 2] = Math.sin(theta) * radius;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xcbd5e1,
    size: 2.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.82,
    fog: false,
  });
  nightGroup.add(new THREE.Points(starGeo, starMat));

  // Night: Stylized pale full moon in the midnight touge sky
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(24, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0, fog: false })
  );
  moon.position.set(-360, 290, -1150);
  nightGroup.add(moon);

  // Day: Realistic soft atmospheric sun bloom sprite (no hard cartoon sphere edge)
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createSunGlowTexture(),
      color: 0xfffdf2,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
    })
  );
  sunSprite.position.set(360, 410, -1120);
  sunSprite.scale.set(340, 340, 1);
  dayGroup.add(sunSprite);

  group.add(nightGroup, dayGroup);
  return { group, nightGroup, dayGroup };
}
