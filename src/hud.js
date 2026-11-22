const RPM_SEGMENTS = 20;

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
    this.rpmValEl = document.getElementById('hud-rpm-value');
    this.rpmBarsEl = document.getElementById('hud-rpm-bars');
    this.driftBadgeEl = document.getElementById('hud-drift-badge');
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

    this.rpmSegments = [];
    this.bannerTimer = 0;
    this.rivalColorHex = '#facc15';

    this._initRpmBars();
    this._prepareMinimapProjection();
  }

  _initRpmBars() {
    if (!this.rpmBarsEl) return;
    this.rpmBarsEl.innerHTML = '';
    for (let i = 0; i < RPM_SEGMENTS; i++) {
      const seg = document.createElement('div');
      seg.className = 'rpm-seg';
      const heightPct = 36 + (i / (RPM_SEGMENTS - 1)) * 64;
      seg.style.height = `${heightPct}%`;
      this.rpmBarsEl.appendChild(seg);
      this.rpmSegments.push(seg);
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
      this.rivalDotEl.style.boxShadow = `0 0 6px ${rivalConfig.colorHex}`;
    }
    if (this.markerRivalEl) {
      this.markerRivalEl.style.background = rivalConfig.colorHex;
      this.markerRivalEl.style.boxShadow = `0 0 10px ${rivalConfig.colorHex}`;
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

    // 1. Speedometer, Gear, RPM LEDs
    if (this.speedEl) {
      this.speedEl.textContent = String(Math.round(player.speedKmh));
    }
    if (this.gearEl) {
      this.gearEl.textContent = player.gear;
    }
    if (this.rpmValEl) {
      this.rpmValEl.textContent = (player.rpm / 1000).toFixed(1);
    }

    const rpmRatio = Math.max(0, Math.min(1, (player.rpm - 1000) / 7600));
    const litCount = Math.round(rpmRatio * RPM_SEGMENTS);
    for (let i = 0; i < this.rpmSegments.length; i++) {
      const seg = this.rpmSegments[i];
      if (i < litCount) {
        if (i >= 16) {
          seg.className = 'rpm-seg lit-red';
        } else if (i >= 11) {
          seg.className = 'rpm-seg lit-mid';
        } else {
          seg.className = 'rpm-seg lit-low';
        }
      } else {
        seg.className = 'rpm-seg';
      }
    }

    // Drift indicator + screen edge glow
    const showDrift = player.isDrifting && player.speedKmh > 30;
    if (this.driftBadgeEl) {
      this.driftBadgeEl.classList.toggle('hidden', !showDrift);
    }
    if (this.vignetteEl) {
      this.vignetteEl.classList.toggle('drifting', showDrift);
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

    // Subtle radar grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 38; x < w; x += 38) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 38; y < h; y += 38) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Course outer shadow
    ctx.beginPath();
    this.mapPolyline.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Course bright core
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2.6;
    ctx.stroke();

    // Finish marker
    if (this.mapFinishPt) {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(this.mapFinishPt.x, this.mapFinishPt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Rival dot
    const rPos = this._worldToMap(rival.x, rival.z);
    ctx.fillStyle = this.rivalColorHex;
    ctx.beginPath();
    ctx.arc(rPos.x, rPos.y, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Player dot (bright cyan with glow ring)
    const pPos = this._worldToMap(player.x, player.z);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(pPos.x, pPos.y, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pPos.x, pPos.y, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}
