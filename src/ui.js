import { RIVALS } from './config.js';
import { formatRaceTime } from './hud.js';

const STORAGE_KEY_PREFIX = 'projectD_bestTime_';

function safeGetBestTime(rivalId) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + rivalId);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch (_err) {
    return null;
  }
}

function safeSaveBestTime(rivalId, seconds) {
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + rivalId, String(seconds));
  } catch (_err) {
    // WebView or private mode may disallow localStorage — ignore safely
  }
}

export class UIController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.selectedRivalIndex = 0;

    this.screens = {
      TITLE: document.getElementById('screen-title'),
      SELECT: document.getElementById('screen-select'),
      CUTSCENE: document.getElementById('screen-cutscene'),
      RESULT: document.getElementById('screen-result'),
    };

    this.countdownOverlay = document.getElementById('countdown-overlay');
    this.countdownText = document.getElementById('countdown-text');
    this.countdownSub = document.getElementById('countdown-sub');

    this.cutscenePhaseBadge = document.getElementById('cutscene-phase-badge');
    this.cutsceneTitle = document.getElementById('cutscene-title');
    this.cutsceneRivalPill = document.getElementById('cutscene-rival-pill');
    this.cutsceneVideo = document.getElementById('cutscene-video');
    this.cutsceneImage = document.getElementById('cutscene-image');
    this.cutscenePlaceholder = document.getElementById('cutscene-placeholder');
    this.cutsceneSlotTag = document.getElementById('cutscene-slot-tag');
    this.cutsceneSlotHint = document.getElementById('cutscene-slot-hint');
    this.cutsceneCaption = document.getElementById('cutscene-caption');
    this.cutsceneContinueLabel = document.getElementById('cutscene-continue-label');

    this.rivalGrid = document.getElementById('rival-grid');
    this.selectedNameEl = document.getElementById('selected-rival-name');
    this.selectedDescEl = document.getElementById('selected-rival-desc');

    this.resultEyebrow = document.getElementById('result-eyebrow');
    this.resultOutcome = document.getElementById('result-outcome');
    this.resultSubtitle = document.getElementById('result-subtitle');
    this.resultRival = document.getElementById('result-rival');
    this.resultTime = document.getElementById('result-time');
    this.resultGap = document.getElementById('result-gap');
    this.resultTopSpeed = document.getElementById('result-top-speed');
    this.resultBestRow = document.getElementById('result-best-row');
    this.resultBestTime = document.getElementById('result-best-time');

    this.rivalCards = [];

    this._renderRivalCards();
    this._bindButtons();
    this.selectRival(0, false);
  }

  getSelectedRival() {
    return RIVALS[this.selectedRivalIndex];
  }

  _renderRivalCards() {
    if (!this.rivalGrid) return;
    this.rivalGrid.innerHTML = '';
    this.rivalCards = [];

    RIVALS.forEach((rival, idx) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `rival-card${rival.badgeClass === 'god' ? ' god-tier' : ''}`;
      card.dataset.rivalId = rival.id;
      card.setAttribute('role', 'option');
      card.setAttribute('aria-selected', 'false');

      const speedPct = Math.round(((rival.stats.topSpeedKmh - 95) / 60) * 100);
      const cornerPct = Math.round(rival.stats.corneringStability * 100);
      const aggrPct = Math.round(rival.stats.aggression * 100);

      card.innerHTML = `
        <div class="rival-card-top">
          <span class="difficulty-pill ${rival.badgeClass}">${rival.difficultyKr} // ${rival.difficulty}</span>
          <span class="car-swatch">
            <i class="car-swatch-dot" style="background:${rival.colorHex}; color:${rival.colorHex};"></i>
            ${rival.carLabel}
          </span>
        </div>
        <div>
          <div class="rival-name">${rival.name}</div>
          <div class="rival-team">${rival.team}</div>
        </div>
        <p class="rival-tagline">${rival.tagline}</p>
        <div class="stat-bars">
          <div class="stat-row">
            <div class="stat-row-head"><span>TOP SPEED</span><strong>${rival.stats.topSpeedKmh} km/h</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, Math.max(20, speedPct))}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-head"><span>CORNERING</span><strong>${cornerPct}%</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${cornerPct}%"></div></div>
          </div>
          <div class="stat-row">
            <div class="stat-row-head"><span>AGGRESSION</span><strong>${aggrPct}%</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width:${aggrPct}%"></div></div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectRival(idx, true);
      });

      this.rivalGrid.appendChild(card);
      this.rivalCards.push(card);
    });
  }

  selectRival(index, notify = true) {
    const safeIdx = ((index % RIVALS.length) + RIVALS.length) % RIVALS.length;
    this.selectedRivalIndex = safeIdx;
    const rival = RIVALS[safeIdx];

    this.rivalCards.forEach((card, i) => {
      const active = i === safeIdx;
      card.classList.toggle('selected', active);
      card.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    if (this.selectedNameEl) {
      this.selectedNameEl.textContent = `${rival.name} (${rival.difficultyKr} · ${rival.team})`;
    }
    if (this.selectedDescEl) {
      this.selectedDescEl.textContent = `최고속도 ${rival.stats.topSpeedKmh} km/h · 코너링 안정성 ${Math.round(rival.stats.corneringStability * 100)}%`;
    }

    if (notify && this.callbacks.onRivalPreview) {
      this.callbacks.onRivalPreview(rival);
    }
  }

  _bindButtons() {
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.callbacks.onOpenSelect?.();
    });
    document.getElementById('btn-back-title')?.addEventListener('click', () => {
      this.callbacks.onOpenTitle?.();
    });
    document.getElementById('btn-start-race')?.addEventListener('click', () => {
      this.callbacks.onStartRace?.(this.getSelectedRival());
    });
    document.getElementById('btn-retry-race')?.addEventListener('click', () => {
      this.callbacks.onRetryRace?.();
    });
    document.getElementById('btn-change-rival')?.addEventListener('click', () => {
      this.callbacks.onOpenSelect?.();
    });
    document.getElementById('btn-toggle-mute')?.addEventListener('click', () => {
      this.callbacks.onToggleMute?.();
    });
    document.getElementById('btn-quick-reset')?.addEventListener('click', () => {
      this.callbacks.onQuickReset?.();
    });
    document.getElementById('btn-cutscene-skip')?.addEventListener('click', () => {
      this.callbacks.onCutsceneComplete?.();
    });
    document.getElementById('btn-cutscene-continue')?.addEventListener('click', () => {
      this.callbacks.onCutsceneComplete?.();
    });
    this.cutsceneVideo?.addEventListener('ended', () => {
      this.callbacks.onCutsceneComplete?.();
    });
  }

  stopCutsceneMedia() {
    if (this.cutsceneVideo) {
      this.cutsceneVideo.pause();
      this.cutsceneVideo.removeAttribute('src');
      this.cutsceneVideo.load();
      this.cutsceneVideo.classList.add('hidden');
    }
    if (this.cutsceneImage) {
      this.cutsceneImage.removeAttribute('src');
      this.cutsceneImage.classList.add('hidden');
    }
    if (this.cutscenePlaceholder) {
      this.cutscenePlaceholder.classList.remove('hidden');
    }
  }

  showCutscene({ rival, phase, won = null }) {
    this.stopCutsceneMedia();

    const isIntro = phase === 'intro';
    const slot = rival.cutscenes?.[phase] || {};
    const slotId = `${rival.id}_${phase}`;

    if (this.cutscenePhaseBadge) {
      const outcomeTag = !isIntro && won !== null ? (won ? ' // VICTORY' : ' // DEFEAT') : '';
      this.cutscenePhaseBadge.textContent = isIntro
        ? 'PRE-RACE CUTSCENE'
        : `POST-RACE CUTSCENE${outcomeTag}`;
    }
    if (this.cutsceneTitle) {
      this.cutsceneTitle.textContent = slot.title || (isIntro ? `VS ${rival.name}` : `AFTER BATTLE // ${rival.name}`);
    }
    if (this.cutsceneRivalPill) {
      this.cutsceneRivalPill.className = `difficulty-pill ${rival.badgeClass}`;
      this.cutsceneRivalPill.textContent = `${rival.difficultyKr} // ${rival.difficulty}`;
    }
    if (this.cutsceneSlotTag) {
      this.cutsceneSlotTag.textContent = `CUTSCENE SLOT // ${slotId.toUpperCase()}`;
    }
    if (this.cutsceneSlotHint) {
      this.cutsceneSlotHint.textContent = `assets/cutscenes/${slotId}.*`;
    }
    if (this.cutsceneCaption) {
      this.cutsceneCaption.textContent =
        slot.caption || `[${rival.name} ${isIntro ? '시작 전' : '종료 후'} 컷신 영역]`;
    }
    if (this.cutsceneContinueLabel) {
      this.cutsceneContinueLabel.textContent = isIntro ? 'RACE START' : 'VIEW RESULT';
    }

    const mediaPath = slot.mediaPath;
    if (mediaPath && /\.(mp4|webm|ogg)(\?.*)?$/i.test(mediaPath) && this.cutsceneVideo) {
      this.cutscenePlaceholder?.classList.add('hidden');
      this.cutsceneVideo.src = mediaPath;
      this.cutsceneVideo.classList.remove('hidden');
      this.cutsceneVideo.play().catch(() => {});
    } else if (mediaPath && this.cutsceneImage) {
      this.cutscenePlaceholder?.classList.add('hidden');
      this.cutsceneImage.src = mediaPath;
      this.cutsceneImage.classList.remove('hidden');
    }

    this.showScreen('CUTSCENE');
  }

  showScreen(state) {
    if (state !== 'CUTSCENE') {
      this.stopCutsceneMedia();
    }
    Object.entries(this.screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('active', key === state);
    });

    if (state !== 'COUNTDOWN') {
      this.hideCountdown();
    }
  }

  showCountdown(text, isGo = false, subtitle = 'GET READY // DOWNHILL BATTLE') {
    if (!this.countdownOverlay || !this.countdownText) return;
    this.countdownOverlay.classList.remove('hidden');
    this.countdownText.textContent = text;
    this.countdownText.className = `countdown-number ${isGo ? 'go' : ''}`;
    if (this.countdownSub) {
      this.countdownSub.textContent = subtitle;
    }

    // Trigger pop animation
    void this.countdownText.offsetWidth;
    this.countdownText.classList.add('countdown-pop');
  }

  hideCountdown() {
    if (this.countdownOverlay) {
      this.countdownOverlay.classList.add('hidden');
    }
  }

  showResult({ won, rival, raceTime, gapMeters, topSpeedKmh }) {
    if (this.resultEyebrow) {
      this.resultEyebrow.textContent = won
        ? 'STAGE CLEAR // DOWNHILL VICTORY'
        : 'BATTLE FINISHED // TRY AGAIN';
    }
    if (this.resultOutcome) {
      this.resultOutcome.textContent = won ? 'YOU WIN!' : 'DEFEAT...';
      this.resultOutcome.className = `result-outcome ${won ? 'win' : 'lose'}`;
    }
    if (this.resultSubtitle) {
      this.resultSubtitle.textContent = won
        ? `${rival.name} (${rival.team})을(를) 제치고 고갯길 배틀에서 승리했습니다!`
        : `${rival.name}에게 아쉽게 패배했습니다. 코너 드리프트로 다시 도전해 보세요!`;
    }
    if (this.resultRival) {
      this.resultRival.textContent = `${rival.name} (${rival.difficultyKr})`;
    }
    if (this.resultTime) {
      this.resultTime.textContent = formatRaceTime(raceTime);
    }
    if (this.resultGap) {
      const sign = gapMeters >= 0 ? '+' : '';
      this.resultGap.textContent = `${sign}${Math.round(gapMeters)}m`;
      this.resultGap.style.color = gapMeters >= 0 ? '#4ade80' : '#fb923c';
    }
    if (this.resultTopSpeed) {
      this.resultTopSpeed.textContent = `${Math.round(topSpeedKmh)} km/h`;
    }

    // Track best time per rival safely
    const prevBest = safeGetBestTime(rival.id);
    const isNewBest = won && (prevBest === null || raceTime < prevBest);
    if (isNewBest) {
      safeSaveBestTime(rival.id, raceTime);
    }
    const displayBest = isNewBest ? raceTime : prevBest;

    if (this.resultBestRow && this.resultBestTime) {
      if (displayBest !== null) {
        this.resultBestRow.classList.remove('hidden');
        const badge = this.resultBestRow.querySelector('.best-badge');
        if (badge) badge.textContent = isNewBest ? 'NEW RECORD' : 'BEST RECORD';
        this.resultBestTime.textContent = `BEST (${rival.name}): ${formatRaceTime(displayBest)}`;
      } else {
        this.resultBestRow.classList.add('hidden');
      }
    }

    this.showScreen('RESULT');
  }
}
