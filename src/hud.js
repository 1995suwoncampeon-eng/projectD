const SVG_NS = 'http://www.w3.org/2000/svg';
const GAUGE_START_DEG = -135;
const GAUGE_SWEEP_DEG = 270;
const RPM_MAX = 9000;
const SPEED_MAX = 140;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

export function formatRaceTime(seconds) {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const cs = Math.floor((safe * 100) % 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export class HudController {
  constructor(track) {
    this.track = track;

    this.root = document.getElementById('race-hud');
    this.speedEl = document.getElementById('hud-speed');
    this.gearEl = document.getElementById('hud-gear');
    this.rpmSvg = document.getElementById('gauge-rpm-svg');
    this.speedSvg = document.getElementById('gauge-speed-svg');
    this.shiftLightEl = document.getElementById('hud-shift-light');
    this.driftBadgeEl = document.getElementById('hud-drift-badge');
    this.gutterBadgeEl = document.getElementById('hud-gutter-badge');
    this.vignetteEl = document.getElementById('speed-vignette');

    this.positionEl = document.getElementById('hud-position');
    this.gapEl = document.getElementById('hud-gap');
    this.timerEl = document.getElementById('hud-timer');
    this.remainingEl = document.getElementById('hud-remaining');
    this.progressFillEl = document.getElementById('hud-progress-fill');
    this.markerPlayerEl = document.getElementById('hud-marker-player');
    this.markerRivalEl = document.getElementById('hud-marker-rival');
    this.bannerEl = document.getElementById('hud-banner');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
    this.rivalDotEl = document.getElementById('minimap-rival-dot');
    this.rivalShortEl = document.getElementById('hud-rival-short');

    this.muteBtn = document.getElementById('btn-toggle-mute');

    this.rpmNeedleEl = null;
    this.speedNeedleEl = null;
    this._displayRpm = 1200;
    this._displaySpeed = 0;

    this.bannerTimer = 0;
    this.rivalColorHex = '#ffd000';

    this._initAnalogGauges();
    this._prepareMinimapProjection();
  }

  _buildDial(svg, { maxVal, majorStep, minorStep, labelDivisor = 1, redlineStart = null, sublabel }) {
    if (!svg) return null;
    svg.innerHTML = '';

    // Machined outer bezel, inner recessed lip & dial face
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 97, class: 'gauge-bezel-outer' }));
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 91, class: 'gauge-bezel' }));
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 87, class: 'gauge-face' }));
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 66, class: 'gauge-inner-ring' }));

    // Optional redline arc
    if (redlineStart !== null) {
      const a0 = GAUGE_START_DEG + (redlineStart / maxVal) * GAUGE_SWEEP_DEG;
      const a1 = GAUGE_START_DEG + GAUGE_SWEEP_DEG;
      svg.appendChild(
        svgEl('path', {
          d: describeArc(100, 100, 78, a0, a1),
          class: 'gauge-redline-arc',
        })
      );
    }

    // Tick marks & numbers
    const totalSteps = Math.round(maxVal / minorStep);
    for (let i = 0; i <= totalSteps; i++) {
      const val = i * minorStep;
      const ratio = val / maxVal;
      const deg = GAUGE_START_DEG + ratio * GAUGE_SWEEP_DEG;
      const isMajor = Math.abs(val % majorStep) < 1e-4;
      const isRed = redlineStart !== null && val >= redlineStart;

      const outerR = 83;
      const innerR = isMajor ? 70 : 76;
      const p1 = polarToCartesian(100, 100, outerR, deg);
      const p2 = polarToCartesian(100, 100, innerR, deg);

      svg.appendChild(
        svgEl('line', {
          x1: p1.x.toFixed(2),
          y1: p1.y.toFixed(2),
          x2: p2.x.toFixed(2),
          y2: p2.y.toFixed(2),
          class: isRed ? 'gauge-tick-red' : isMajor ? 'gauge-tick-major' : 'gauge-tick-minor',
        })
      );

      if (isMajor) {
        const np = polarToCartesian(100, 100, 56, deg);
        const text = svgEl('text', {
          x: np.x.toFixed(2),
          y: np.y.toFixed(2),
          class: isRed ? 'gauge-num gauge-num-red' : 'gauge-num',
        });
        text.textContent = String(Math.round(val / labelDivisor));
        svg.appendChild(text);
      }
    }

    // Dial caption
    const sub = svgEl('text', { x: 100, y: 74, class: 'gauge-sublabel' });
    sub.textContent = sublabel;
    svg.appendChild(sub);

    // Pivoting analog needle (SVG rotate(deg 100 100) uses viewBox coordinates directly)
    const needleGroup = svgEl('g', {
      class: 'gauge-needle-group',
      transform: `rotate(${GAUGE_START_DEG} 100 100)`,
    });
    // Tapered needle pointing straight up (-Y at 0 deg) with counterweight tail
    needleGroup.appendChild(
      svgEl('path', {
        d: 'M 96.8 115 L 98.5 28 L 100 20 L 101.5 28 L 103.2 115 Z',
        class: 'gauge-needle-shaft',
      })
    );
    svg.appendChild(needleGroup);

    // Center hub cap
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 9.5, class: 'gauge-needle-cap' }));
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 3.8, class: 'gauge-needle-cap-core' }));

    return needleGroup;
  }

  _initAnalogGauges() {
    this.rpmNeedleEl = this._buildDial(this.rpmSvg, {
      maxVal: RPM_MAX,
      majorStep: 1000,
      minorStep: 500,
      labelDivisor: 1000,
      redlineStart: 7500,
      sublabel: 'RPM x1000',
    });

    this.speedNeedleEl = this._buildDial(this.speedSvg, {
      maxVal: SPEED_MAX,
      majorStep: 20,
      minorStep: 10,
      labelDivisor: 1,
      redlineStart: null,
      sublabel: 'SPEED',
    });
  }

  setTimeOfDay(mode) {
    if (this.root) {
      this.root.dataset.time = mode === 'day' ? 'day' : 'night';
    }
  }

  _prepareMinimapProjection() {
    if (!this.minimapCanvas) return;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const pad = 16;

    const { minX, maxX, minZ, maxZ } = this.track.bounds;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);

    const offsetX = (w - spanX * scale) * 0.5;
    const offsetY = (h - spanZ * scale) * 0.5;

    this.mapTransform = { minX, minZ, scale, offsetX, offsetY, w, h };

    // Pre-sample simplified track polyline for crisp minimap rendering
    this.mapPolyline = [];
    const step = 4;
    for (let i = 0; i < this.track.samples.length; i += step) {
      const s = this.track.samples[i];
      this.mapPolyline.push(this._worldToMap(s.x, s.z));
    }
    const last = this.track.samples[this.track.samples.length - 1];
    this.mapPolyline.push(this._worldToMap(last.x, last.z));

    const finishPt = this.track.getPointAtS(this.track.finishS);
    this.mapFinishPt = this._worldToMap(finishPt.x, finishPt.z);
  }

  _worldToMap(wx, wz) {
    const t = this.mapTransform;
    // Flip Z so moving downhill (-Z) climbs toward top of minimap
    return {
      x: t.offsetX + (wx - t.minX) * t.scale,
      y: t.h - (t.offsetY + (wz - t.minZ) * t.scale),
    };
  }

  setVisible(visible) {
    if (!this.root) return;
    this.root.classList.toggle('hidden', !visible);
    if (!visible && this.vignetteEl) {
      this.vignetteEl.classList.remove('drifting');
    }
  }

  setRivalAppearance(rivalConfig) {
    this.rivalColorHex = rivalConfig.colorHex;
    if (this.rivalDotEl) {
      this.rivalDotEl.style.background = rivalConfig.colorHex;
      this.rivalDotEl.style.boxShadow = 'none';
    }
    if (this.markerRivalEl) {
      this.markerRivalEl.style.background = rivalConfig.colorHex;
      this.markerRivalEl.style.boxShadow = 'none';
    }
    if (this.rivalShortEl) {
      this.rivalShortEl.textContent = rivalConfig.name;
    }
  }

  setMuteLabel(muted) {
    if (this.muteBtn) {
      this.muteBtn.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
    }
  }

  showBanner(text, durationSec = 2.0) {
    if (!this.bannerEl) return;
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden');
    this.bannerTimer = durationSec;
  }

  clearBanner() {
    this.bannerTimer = 0;
    if (this.bannerEl) {
      this.bannerEl.classList.add('hidden');
    }
  }

  update(player, rival, elapsedSeconds, dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.clearBanner();
      }
    }

    // 1. Dual Analog Needles (RPM + Speedometer) + Shift-Light LED + Gear / Digital Speed Readout
    const smooth = dt > 0 ? 1 - Math.exp(-dt * 16) : 1;
    this._displayRpm += (player.rpm - this._displayRpm) * smooth;
    this._displaySpeed += (player.speedKmh - this._displaySpeed) * smooth;

    const rpmRatio = Math.max(0, Math.min(1, this._displayRpm / RPM_MAX));
    const rpmDeg = GAUGE_START_DEG + rpmRatio * GAUGE_SWEEP_DEG;
    if (this.rpmNeedleEl) {
      this.rpmNeedleEl.setAttribute('transform', `rotate(${rpmDeg.toFixed(2)} 100 100)`);
    }

    if (this.shiftLightEl) {
      this.shiftLightEl.classList.toggle('active', this._displayRpm >= 7300);
    }

    const speedRatio = Math.max(0, Math.min(1, this._displaySpeed / SPEED_MAX));
    const speedDeg = GAUGE_START_DEG + speedRatio * GAUGE_SWEEP_DEG;
    if (this.speedNeedleEl) {
      this.speedNeedleEl.setAttribute('transform', `rotate(${speedDeg.toFixed(2)} 100 100)`);
    }

    if (this.speedEl) {
      this.speedEl.textContent = String(Math.round(player.speedKmh));
    }
    if (this.gearEl) {
      this.gearEl.textContent = player.gear;
    }

    // Drift & Gutter Hook indicators + screen edge glow
    const showDrift = player.isDrifting && player.speedKmh > 30;
    if (this.driftBadgeEl) {
      this.driftBadgeEl.classList.toggle('hidden', !showDrift);
    }
    if (this.gutterBadgeEl) {
      this.gutterBadgeEl.classList.toggle('hidden', !player.inGutter);
    }
    if (this.vignetteEl) {
      this.vignetteEl.classList.toggle('drifting', showDrift || Boolean(player.inGutter));
    }

    // 2. Position, Gap (+/- meters), Elapsed Time
    const gapMeters = Math.round(player.s - rival.s);
    const isAhead = gapMeters >= 0;

    if (this.positionEl) {
      this.positionEl.textContent = isAhead ? '1ST' : '2ND';
      this.positionEl.className = `position-badge ${isAhead ? 'pos-1' : 'pos-2'}`;
    }
    if (this.gapEl) {
      this.gapEl.textContent = `${isAhead ? '+' : ''}${gapMeters}m`;
      this.gapEl.className = `gap-value ${isAhead ? 'ahead' : 'behind'}`;
    }
    if (this.timerEl) {
      this.timerEl.textContent = formatRaceTime(elapsedSeconds);
    }

    // 3. Remaining distance & Progress bar
    const raceDist = Math.max(1, this.track.raceDistance);
    const playerPct = Math.max(0, Math.min(100, ((player.s - this.track.startS) / raceDist) * 100));
    const rivalPct = Math.max(0, Math.min(100, ((rival.s - this.track.startS) / raceDist) * 100));
    const remainM = Math.max(0, Math.round(this.track.finishS - player.s));

    if (this.remainingEl) {
      this.remainingEl.textContent = `${remainM.toLocaleString()}m LEFT`;
    }
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${playerPct.toFixed(1)}%`;
    }
    if (this.markerPlayerEl) {
      this.markerPlayerEl.style.left = `${playerPct.toFixed(1)}%`;
    }
    if (this.markerRivalEl) {
      this.markerRivalEl.style.left = `${rivalPct.toFixed(1)}%`;
    }

    // 4. 2D Minimap
    this._renderMinimap(player, rival);
  }

  _renderMinimap(player, rival) {
    const ctx = this.minimapCtx;
    if (!ctx || !this.mapPolyline) return;

    const { w, h } = this.mapTransform;
    ctx.clearRect(0, 0, w, h);

    // Authentic Initial D Arcade Stage frameless course trace:
    // Thick obsidian casing + crisp bright-white touge ribbon
    ctx.beginPath();
    this.mapPolyline.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(8, 9, 12, 0.92)';
    ctx.lineWidth = 8.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.strokeStyle = '#e8ecf2';
    ctx.lineWidth = 3.4;
    ctx.stroke();

    // Finish marker (racing yellow ring + red core)
    if (this.mapFinishPt) {
      ctx.fillStyle = '#08090c';
      ctx.beginPath();
      ctx.arc(this.mapFinishPt.x, this.mapFinishPt.y, 6.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd000';
      ctx.beginPath();
      ctx.arc(this.mapFinishPt.x, this.mapFinishPt.y, 4.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e6192e';
      ctx.beginPath();
      ctx.arc(this.mapFinishPt.x, this.mapFinishPt.y, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rival marker (solid rival color with crisp dark casing)
    const rPos = this._worldToMap(rival.x, rival.z);
    ctx.fillStyle = this.rivalColorHex;
    ctx.beginPath();
    ctx.arc(rPos.x, rPos.y, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#08090c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player marker (1P motorsport blue + crisp white ring)
    const pPos = this._worldToMap(player.x, player.z);
    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(pPos.x, pPos.y, 5.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
