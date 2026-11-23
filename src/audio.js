/**
 * Lightweight zero-asset Web Audio API synthesizer for arcade racing SFX:
 * countdown tones, RPM-linked engine hum, drift tire screech, and finish fanfare.
 * Safely degrades to a no-op in headless or restricted WebView contexts.
 */
export class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.screechGain = null;
    this.initialized = false;
  }

  unlock() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.initialized = true;

      // Dual-harmonic engine synth voice (fundamental exhaust sawtooth + 2x high-RPM intake harmonic)
      const osc = this.ctx.createOscillator();
      const harmOsc = this.ctx.createOscillator();
      const harmGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 55;
      harmOsc.type = 'triangle';
      harmOsc.frequency.value = 110;
      harmGain.gain.value = 0.35;

      filter.type = 'lowpass';
      filter.frequency.value = 320;
      filter.Q.value = 2.2;
      gain.gain.value = 0;

      osc.connect(filter);
      harmOsc.connect(harmGain);
      harmGain.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      harmOsc.start();

      this.engineOsc = osc;
      this.engineHarmOsc = harmOsc;
      this.engineHarmGain = harmGain;
      this.engineFilter = filter;
      this.engineGain = gain;

      // Filtered white noise for drift tire screech
      const bufferSize = this.ctx.sampleRate;
      const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;

      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1850;
      bp.Q.value = 6.5;

      const sGain = this.ctx.createGain();
      sGain.gain.value = 0;

      noise.connect(bp);
      bp.connect(sGain);
      sGain.connect(this.ctx.destination);
      noise.start();

      this.screechGain = sGain;
    } catch (_err) {
      this.ctx = null;
      this.initialized = false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.silenceEngine();
    }
    return this.muted;
  }

  silenceEngine() {
    if (!this.ctx || !this.engineGain || !this.screechGain) return;
    const now = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, now, 0.05);
    this.screechGain.gain.setTargetAtTime(0, now, 0.04);
  }

  updateEngine(rpm, isDrifting, active, throttle = 0, isShifting = false) {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.screechGain) return;
    const now = this.ctx.currentTime;

    if (this.muted || !active) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.06);
      this.screechGain.gain.setTargetAtTime(0, now, 0.05);
      return;
    }

    const rpmNorm = Math.max(0, Math.min(1, (rpm - 1100) / 7700));
    const baseFreq = 42 + rpmNorm * 198;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.032);
    if (this.engineHarmOsc && this.engineHarmGain) {
      this.engineHarmOsc.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.032);
      // High-RPM twin-cam induction growl blooms above 5000 RPM
      const harmLevel = 0.22 + rpmNorm * rpmNorm * 0.55;
      this.engineHarmGain.gain.setTargetAtTime(harmLevel, now, 0.04);
    }

    const loadBoost = throttle > 0 && !isShifting ? 460 : 0;
    const cutoff = 210 + rpmNorm * 1150 + loadBoost;
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.04);

    // Subtle volume dip during upshift cut makes gear changes audibly crisp
    const targetGain = isShifting ? 0.014 : 0.026 + (throttle > 0 ? 0.018 : 0) + rpmNorm * 0.012;
    this.engineGain.gain.setTargetAtTime(targetGain, now, 0.035);

    const screechTarget = isDrifting ? 0.032 : 0;
    this.screechGain.gain.setTargetAtTime(screechTarget, now, 0.04);
  }

  playTone(freq, duration = 0.14, type = 'triangle', volume = 0.09) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (_err) {
      // Ignore audio scheduling errors in restricted WebViews
    }
  }

  playCountdown(isGo = false) {
    if (isGo) {
      this.playTone(880, 0.28, 'square', 0.08);
    } else {
      this.playTone(440, 0.14, 'triangle', 0.08);
    }
  }

  playFinish(won) {
    if (this.muted || !this.ctx) return;
    const notes = won ? [523, 659, 784, 1046] : [392, 349, 311, 261];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.18, 'triangle', 0.08), idx * 95);
    });
  }
}
