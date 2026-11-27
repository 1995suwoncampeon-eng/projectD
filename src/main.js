import * as THREE from 'three';
import {
  MODEL_ROTATION_Y,
  PLAYER_MODEL_PATH,
  RIVAL_MODEL_PATH,
  PLAYER_THEME,
  PLAYER_CARS,
  RIVALS,
} from './config.js?v=43';
import { TougeTrack } from './track.js?v=14';
import { buildTougeEnvironment } from './trackRenderer.js?v=21';
import { loadCarModel } from './carModel.js?v=18';
import {
  createVehicleState,
  resetVehicleToSpawn,
  recoverVehicleToTrack,
  updatePlayerPhysics,
  resolveCarCollision,
} from './physics.js?v=46';
import { updateRivalAI } from './ai.js?v=29';
import { EffectsManager } from './effects.js?v=15';
import { ArcadeAudio } from './audio.js?v=14';
import { HudController } from './hud.js?v=7';
import { UIController } from './ui.js?v=42';

class ProjectDGame {
  constructor() {
    this.state = 'TITLE'; // TITLE | SELECT | CUTSCENE_INTRO | COUNTDOWN | RACING | CUTSCENE_OUTRO | RESULT
    this.selectedRival = RIVALS[0];
    this.selectedPlayerCar = PLAYER_CARS[0];
    this.timeOfDay = 'night'; // 'night' | 'day'

    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050814);
    this.scene.fog = new THREE.FogExp2(0x050814, 0.0036);

    this.camera = new THREE.PerspectiveCamera(
      62,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.2,
      1900
    );

    this._setupLighting();

    // Core world & track
    const maxAnisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    this.track = new TougeTrack();
    this.envController = buildTougeEnvironment(this.scene, this.track, maxAnisotropy);

    // Subsystems
    this.effects = new EffectsManager(this.scene);
    this.audio = new ArcadeAudio();
    this.hud = new HudController(this.track);

    // 2D vehicle physics states
    this.player = createVehicleState(this.track, this.track.startS, -2.5);
    this.rival = createVehicleState(this.track, this.track.startS, 2.5);

    // 3D car visual controllers (loaded asynchronously)
    this.playerCar = null;
    this.playerCarCache = new Map();
    this._playerSwapSeq = 0;
    this.rivalCar = null;
    this.rivalCarCache = new Map();
    this._rivalSwapSeq = 0;
    this.modelsReady = false;

    // Input state
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      drift: false,
      interact: false,
    };

    // Race timing & countdown state
    this.clockTime = 0;
    this.raceElapsed = 0;
    this.countdownTimer = 0;
    this.lastCountdownStep = -1;
    this.goBannerTimer = 0;
    this.rivalFinishedWait = 0;

    // Smooth camera state
    this.camPos = new THREE.Vector3(0, 6, 12);
    this.camLook = new THREE.Vector3(0, 1, -10);
    this.camRoll = 0;

    // Pending race result carried across post-race outro cutscene
    this._pendingResult = null;

    // Screen UI controller
    this.ui = new UIController({
      onOpenTitle: () => this.enterTitle(),
      onOpenSelect: () => this.enterSelect(),
      onPlayerCarPreview: (carCfg) => this.applyPlayerCarSelection(carCfg),
      onRivalPreview: (rival) => this.applyRivalSelection(rival),
      onTimeOfDayChange: (mode) => this.setTimeOfDay(mode),
      onStartRace: (rival) => this.enterIntroCutscene(rival),
      onRetryRace: () => this.startRace(this.selectedRival),
      onCutsceneComplete: () => this.completeCutscene(),
      onToggleMute: () => this.toggleMute(),
      onQuickReset: () => this.triggerTrackRecovery(),
    });

    this._bindEvents();
    this._loadVehicleModels();
    this.setTimeOfDay('night');
    this.enterTitle();

    // Expose safe diagnostic handle for verification & WebView bridges
    window.__PROJECT_D__ = {
      getState: () => ({
        screen: this.state,
        timeOfDay: this.timeOfDay,
        modelsReady: this.modelsReady,
        playerFallback: this.playerCar ? this.playerCar.isFallback : null,
        rivalFallback: this.rivalCar ? this.rivalCar.isFallback : null,
        playerSize: this.playerCar ? this.playerCar.size.toArray() : null,
        rivalSize: this.rivalCar ? this.rivalCar.size.toArray() : null,
        selectedRival: this.selectedRival.id,
        raceElapsed: this.raceElapsed,
        trackRaceDistance: this.track.raceDistance,
        startS: this.track.startS,
        finishS: this.track.finishS,
        player: {
          x: this.player.x,
          z: this.player.z,
          s: this.player.s,
          lateral: this.player.lateral,
          speedKmh: this.player.speedKmh,
          gear: this.player.gear,
          isDrifting: this.player.isDrifting,
          finished: this.player.finished,
        },
        rival: {
          x: this.rival.x,
          z: this.rival.z,
          s: this.rival.s,
          speedKmh: this.rival.speedKmh,
          finished: this.rival.finished,
        },
      }),
      // Helper for automated E2E finish-line verification without waiting 50s
      debugWarpNearFinish: (distanceBeforeFinish = 45) => {
        if (this.state !== 'RACING') return false;
        const targetS = Math.max(this.track.startS + 10, this.track.finishS - distanceBeforeFinish);
        const pt = this.track.getPointAtS(targetS);
        this.player.x = pt.x;
        this.player.z = pt.z;
        this.player.heading = pt.heading;
        this.player.s = pt.s;
        this.player.trackIndex = pt.index;
        this.player.speed = 46;
        const rPt = this.track.getWorldPosition(targetS - 18, 2.2);
        this.rival.x = rPt.x;
        this.rival.z = rPt.z;
        this.rival.heading = rPt.heading;
        this.rival.s = rPt.s;
        this.rival.trackIndex = rPt.index;
        this.rival.speed = 42;
        return true;
      },
    };

    this._lastFrameTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _setupLighting() {
    // Minimal 2-light rig (1 Hemisphere + 1 Directional) for fast low-end GPU rendering
    this.hemiLight = new THREE.HemisphereLight(0x64748b, 0x1e293b, 1.55);
    this.scene.add(this.hemiLight);

    this.mainDirLight = new THREE.DirectionalLight(0xc7d2fe, 1.25);
    this.mainDirLight.position.set(-120, 240, -180);
    this.scene.add(this.mainDirLight);
  }

  setTimeOfDay(mode) {
    const isDay = mode === 'day';
    this.timeOfDay = isDay ? 'day' : 'night';

    if (isDay) {
      this.scene.background.setHex(0xc8dce8);
      this.scene.fog.color.setHex(0xcfe0ec);
      this.scene.fog.density = 0.00105;
      this.renderer.toneMappingExposure = 1.02;

      this.hemiLight.color.setHex(0xdcebf7);
      this.hemiLight.groundColor.setHex(0x4f5d52);
      this.hemiLight.intensity = 1.85;

      this.mainDirLight.color.setHex(0xfff6e5);
      this.mainDirLight.intensity = 2.05;
      this.mainDirLight.position.set(260, 350, -320);
    } else {
      this.scene.background.setHex(0x050814);
      this.scene.fog.color.setHex(0x0a1124);
      this.scene.fog.density = 0.0036;
      this.renderer.toneMappingExposure = 1.15;

      this.hemiLight.color.setHex(0x64748b);
      this.hemiLight.groundColor.setHex(0x162033);
      this.hemiLight.intensity = 1.55;

      this.mainDirLight.color.setHex(0xc7d2fe);
      this.mainDirLight.intensity = 1.25;
      this.mainDirLight.position.set(-120, 240, -180);
    }

    this.envController?.setTimeOfDay(this.timeOfDay);
    this.hud?.setTimeOfDay(this.timeOfDay);
    this.ui?.setTimeOfDay(this.timeOfDay);

    if (this.playerCar) {
      this.playerCar.setTimeOfDay(this.timeOfDay);
    }
    for (const promise of this.playerCarCache.values()) {
      promise.then((car) => car.setTimeOfDay(this.timeOfDay));
    }
    for (const promise of this.rivalCarCache.values()) {
      promise.then((car) => car.setTimeOfDay(this.timeOfDay));
    }
  }

  _getOrLoadPlayerCar(carCfg) {
    if (!this.playerCarCache.has(carCfg.id)) {
      const promise = loadCarModel({
        path: carCfg.modelPath ?? PLAYER_MODEL_PATH,
        rotationY: carCfg.modelRotationY ?? MODEL_ROTATION_Y,
        isPlayer: true,
        bodyColor: carCfg.colorNum ?? PLAYER_THEME.bodyColor,
        accentColor: carCfg.accentNum ?? PLAYER_THEME.accentColor,
        taillights: carCfg.taillights ?? null,
        wheelStyle: carCfg.wheelStyle ?? null,
      }).then((car) => {
        car.setTimeOfDay(this.timeOfDay);
        return car;
      });
      this.playerCarCache.set(carCfg.id, promise);
    }
    return this.playerCarCache.get(carCfg.id);
  }

  _getOrLoadRivalCar(rival) {
    if (!this.rivalCarCache.has(rival.id)) {
      const promise = loadCarModel({
        path: rival.modelPath ?? RIVAL_MODEL_PATH,
        rotationY: rival.modelRotationY ?? MODEL_ROTATION_Y,
        isPlayer: false,
        bodyColor: rival.colorNum,
        accentColor: rival.colorNum,
        taillights: rival.taillights ?? null,
        wheelStyle: rival.wheelStyle ?? null,
      }).then((car) => {
        car.setTimeOfDay(this.timeOfDay);
        return car;
      });
      this.rivalCarCache.set(rival.id, promise);
    }
    return this.rivalCarCache.get(rival.id);
  }

  async _loadVehicleModels() {
    const initialPlayerCar = this.selectedPlayerCar;
    const initialRival = this.selectedRival;
    const [playerCar, rivalCar] = await Promise.all([
      this._getOrLoadPlayerCar(initialPlayerCar),
      this._getOrLoadRivalCar(initialRival),
    ]);

    if (this.selectedPlayerCar.id === initialPlayerCar.id && !this.playerCar) {
      this.playerCar = playerCar;
      this.playerCar.setTimeOfDay(this.timeOfDay);
      this.scene.add(this.playerCar.root);
    }

    // Attach initial rival car only if user has not already switched to another rival
    if (this.selectedRival.id === initialRival.id && !this.rivalCar) {
      this.rivalCar = rivalCar;
      this.rivalCar.setTimeOfDay(this.timeOfDay);
      this.scene.add(this.rivalCar.root);
    }

    this.modelsReady = true;
    this.applyPlayerCarSelection(this.selectedPlayerCar);
    this.applyRivalSelection(this.selectedRival);
    this._syncCarMeshes(0);

    // Preload remaining rival models in the background for instant switching
    for (const r of RIVALS) {
      if (r.id !== initialRival.id) {
        this._getOrLoadRivalCar(r);
      }
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = Math.max(1, window.innerHeight);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });

    window.addEventListener('keydown', (e) => {
      this.audio.unlock();

      const code = e.code;
      if (
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space' ||
        (e.ctrlKey &&
          (this.state === 'RACING' || this.state === 'COUNTDOWN') &&
          (code === 'KeyA' || code === 'KeyS' || code === 'KeyD' || code === 'KeyW' || code === 'KeyR'))
      ) {
        e.preventDefault();
      }

      // Menu keyboard navigation
      if (this.state === 'TITLE') {
        if (code === 'Enter' || code === 'Space') {
          this.enterSelect();
        }
        return;
      }

      if (this.state === 'SELECT') {
        if (code === 'ArrowLeft' || code === 'KeyA') {
          this.ui.selectRival(this.ui.selectedRivalIndex - 1, true);
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          this.ui.selectRival(this.ui.selectedRivalIndex + 1, true);
        } else if (code === 'Enter') {
          this.enterIntroCutscene(this.ui.getSelectedRival());
        } else if (code === 'Escape') {
          this.enterTitle();
        }
        return;
      }

      if (this.state === 'CUTSCENE_INTRO' || this.state === 'CUTSCENE_OUTRO') {
        if (!e.repeat) {
          if (code === 'Escape') {
            this.completeCutscene();
          } else if (code === 'Enter' || code === 'Space') {
            this.ui.advanceCutscene();
          }
        }
        return;
      }

      if (this.state === 'RESULT') {
        if (code === 'Enter') {
          this.startRace(this.selectedRival);
        } else if (code === 'Escape') {
          this.enterSelect();
        }
        return;
      }

      // Gameplay controls
      if (code === 'KeyW' || code === 'ArrowUp') this.input.up = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.down = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.drift = true;
      if (code === 'ControlLeft' || (e.key === 'Control' && e.location === 1)) {
        e.preventDefault();
        this.input.interact = true;
      }

      if (!e.repeat && code === 'KeyR' && this.state === 'RACING') {
        this.triggerTrackRecovery();
      }
      if (!e.repeat && code === 'KeyM') {
        this.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.input.up = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.drift = false;
      if (code === 'ControlLeft' || (e.key === 'Control' && e.location === 1) || (!e.ctrlKey && this.input.interact)) {
        this.input.interact = false;
      }
    });

    window.addEventListener('blur', () => {
      this._clearInputs();
    });

    this._initTouchControls();
  }

  _initTouchControls() {
    const hasTouch =
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (hasTouch) {
      document.body.classList.add('touch-device');
    }

    // Fallback for hybrid tablets / 2-in-1 devices on first touch
    window.addEventListener(
      'touchstart',
      () => {
        document.body.classList.add('touch-device');
      },
      { once: true, passive: true }
    );

    const steerPad = document.getElementById('touch-steer-pad');
    const leftBtn = document.getElementById('btn-touch-left');
    const rightBtn = document.getElementById('btn-touch-right');

    // Steering pad supports both direct taps and smooth thumb sliding between LEFT and RIGHT
    if (steerPad && leftBtn && rightBtn) {
      let steerPointerId = null;

      const applySteerFromClientX = (clientX) => {
        const rect = steerPad.getBoundingClientRect();
        const midX = rect.left + rect.width * 0.5;
        const goLeft = clientX < midX;
        this.input.left = goLeft;
        this.input.right = !goLeft;
        leftBtn.classList.toggle('pressed', goLeft);
        rightBtn.classList.toggle('pressed', !goLeft);
      };

      const releaseSteer = () => {
        steerPointerId = null;
        this.input.left = false;
        this.input.right = false;
        leftBtn.classList.remove('pressed');
        rightBtn.classList.remove('pressed');
      };

      steerPad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.audio.unlock();
        steerPointerId = e.pointerId;
        steerPad.setPointerCapture?.(e.pointerId);
        applySteerFromClientX(e.clientX);
      });

      steerPad.addEventListener('pointermove', (e) => {
        if (e.pointerId !== steerPointerId) return;
        e.preventDefault();
        applySteerFromClientX(e.clientX);
      });

      steerPad.addEventListener('pointerup', (e) => {
        if (e.pointerId === steerPointerId) releaseSteer();
      });
      steerPad.addEventListener('pointercancel', (e) => {
        if (e.pointerId === steerPointerId) releaseSteer();
      });
      steerPad.addEventListener('lostpointercapture', (e) => {
        if (e.pointerId === steerPointerId) releaseSteer();
      });
    }

    // Independent multi-touch pointer tracking for ACCEL, BRAKE, DRIFT, and GUTTER INTERACT buttons
    const pedalDefs = [
      { id: 'btn-touch-accel', key: 'up' },
      { id: 'btn-touch-brake', key: 'down' },
      { id: 'btn-touch-drift', key: 'drift' },
      { id: 'btn-touch-interact', key: 'interact' },
    ];

    for (const def of pedalDefs) {
      const btn = document.getElementById(def.id);
      if (!btn) continue;
      const activePointers = new Set();

      const sync = () => {
        const pressed = activePointers.size > 0;
        this.input[def.key] = pressed;
        btn.classList.toggle('pressed', pressed);
      };

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.audio.unlock();
        activePointers.add(e.pointerId);
        btn.setPointerCapture?.(e.pointerId);
        sync();
      });

      const release = (e) => {
        if (activePointers.delete(e.pointerId)) {
          sync();
        }
      };

      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
    }
  }

  _clearInputs() {
    this.input.up = false;
    this.input.down = false;
    this.input.left = false;
    this.input.right = false;
    this.input.drift = false;
    this.input.interact = false;
    document.querySelectorAll('.touch-btn.pressed').forEach((el) => {
      el.classList.remove('pressed');
    });
  }

  toggleMute() {
    this.audio.unlock();
    const muted = this.audio.toggleMute();
    this.hud.setMuteLabel(muted);
  }

  triggerTrackRecovery() {
    if (this.state !== 'RACING') return;
    recoverVehicleToTrack(this.player, this.track);
    this.hud.showBanner('TRACK RECOVERED', 1.4);
  }

  applyPlayerCarSelection(carCfg) {
    if (!carCfg) return;
    this.selectedPlayerCar = carCfg;

    const swapSeq = ++this._playerSwapSeq;
    this._getOrLoadPlayerCar(carCfg).then((nextPlayerCar) => {
      if (swapSeq !== this._playerSwapSeq) return;
      if (this.playerCar && this.playerCar !== nextPlayerCar) {
        this.scene.remove(this.playerCar.root);
      }
      this.playerCar = nextPlayerCar;
      if (this.playerCar.root.parent !== this.scene) {
        this.scene.add(this.playerCar.root);
      }
      this.playerCar.setColors(
        carCfg.colorNum ?? PLAYER_THEME.bodyColor,
        carCfg.accentNum ?? PLAYER_THEME.accentColor
      );
      this._syncCarMeshes(0);
    });
  }

  applyRivalSelection(rival) {
    this.selectedRival = rival;
    this.hud.setRivalAppearance(rival);

    const swapSeq = ++this._rivalSwapSeq;
    this._getOrLoadRivalCar(rival).then((nextRivalCar) => {
      if (swapSeq !== this._rivalSwapSeq) return;
      if (this.rivalCar && this.rivalCar !== nextRivalCar) {
        this.scene.remove(this.rivalCar.root);
      }
      this.rivalCar = nextRivalCar;
      if (this.rivalCar.root.parent !== this.scene) {
        this.scene.add(this.rivalCar.root);
      }
      this.rivalCar.setColors(rival.colorNum, rival.colorNum);
      this._syncCarMeshes(0);
    });
  }

  enterTitle() {
    this.state = 'TITLE';
    this._clearInputs();
    this.audio.silenceEngine();
    this.effects.clear();
    resetVehicleToSpawn(this.player, this.track, this.track.startS, -2.5);
    resetVehicleToSpawn(this.rival, this.track, this.track.startS, 2.5);
    this.hud.setVisible(false);
    this.ui.showScreen('TITLE');
    this._syncCarMeshes(0);
  }

  enterSelect() {
    this.audio.unlock();
    this.state = 'SELECT';
    this._clearInputs();
    this.audio.silenceEngine();
    this.effects.clear();
    resetVehicleToSpawn(this.player, this.track, this.track.startS, -2.6);
    resetVehicleToSpawn(this.rival, this.track, this.track.startS, 2.6);
    this.applyPlayerCarSelection(this.ui.getSelectedPlayerCar());
    this.applyRivalSelection(this.ui.getSelectedRival());
    this.hud.setVisible(false);
    this.ui.showScreen('SELECT');
    this._syncCarMeshes(0);
  }

  enterIntroCutscene(rivalConfig) {
    this.audio.unlock();
    const rival = rivalConfig || this.selectedRival;
    this.applyRivalSelection(rival);

    if (rival.cutscenes?.intro?.enabled === false) {
      this.startRace(rival);
      return;
    }

    this.state = 'CUTSCENE_INTRO';
    this._clearInputs();
    this.audio.silenceEngine();
    this.hud.setVisible(false);
    this.ui.showCutscene({ rival, phase: 'intro' });
  }

  completeCutscene() {
    if (this.state === 'CUTSCENE_INTRO') {
      this.startRace(this.selectedRival);
    } else if (this.state === 'CUTSCENE_OUTRO') {
      this._showResultScreen();
    }
  }

  startRace(rivalConfig) {
    this.audio.unlock();
    this.applyRivalSelection(rivalConfig || this.selectedRival);
    this.state = 'COUNTDOWN';
    this._clearInputs();
    this.effects.clear();

    resetVehicleToSpawn(this.player, this.track, this.track.startS, -2.6);
    resetVehicleToSpawn(this.rival, this.track, this.track.startS, 2.6);
    this._syncCarMeshes(0);

    // Snap chase camera cleanly behind player along visual downhill elevation
    const fx = Math.sin(this.player.heading);
    const fz = Math.cos(this.player.heading);
    const behindY = this.track.getElevationAtS(Math.max(0, this.player.s - 8.2));
    const aheadY = this.track.getElevationAtS(Math.min(this.track.totalLength, this.player.s + 14.0));
    this.camPos.set(this.player.x - fx * 8.2, behindY + 3.2, this.player.z - fz * 8.2);
    this.camLook.set(this.player.x + fx * 14.0, aheadY + 1.05, this.player.z + fz * 14.0);
    this.camRoll = 0;

    this.raceElapsed = 0;
    this.countdownTimer = 3.0;
    this.lastCountdownStep = -1;
    this.goBannerTimer = 0;
    this.rivalFinishedWait = 0;
    this.midRaceTriggered = false;

    this.ui.showScreen('COUNTDOWN');
    this.hud.setVisible(true);
    this.hud.clearBanner();
    this.hud.resetMidRace(this.selectedRival);
    this.hud.update(this.player, this.rival, 0, 0);
  }

  _finishRace(won) {
    this._clearInputs();
    this.audio.silenceEngine();
    this.audio.playFinish(won);
    this.hud.setVisible(false);

    const gapMeters = this.player.s - this.rival.s;
    this._pendingResult = {
      won,
      rival: this.selectedRival,
      raceTime: this.raceElapsed,
      gapMeters,
      topSpeedKmh: this.player.maxSpeedAchievedKmh,
    };

    if (this.selectedRival.cutscenes?.outro?.enabled !== false) {
      this.state = 'CUTSCENE_OUTRO';
      this.ui.showCutscene({ rival: this.selectedRival, phase: 'outro', won });
      return;
    }

    this._showResultScreen();
  }

  _showResultScreen() {
    this.state = 'RESULT';
    if (this._pendingResult) {
      this.ui.showResult(this._pendingResult);
    }
  }

  _syncCarMeshes(dt) {
    if (this.playerCar) {
      const py = this.track.getElevationAtS(this.player.s);
      const pSlope = this.track.getSlopeAtS(this.player.s);
      this.playerCar.root.position.set(this.player.x, py, this.player.z);
      this.playerCar.root.rotation.order = 'YXZ';
      this.playerCar.root.rotation.y = this.player.heading;
      this.playerCar.root.rotation.x = -pSlope;
      this.playerCar.visualBody.rotation.y = this.player.visualSlip;
      this.playerCar.visualBody.rotation.z = this.player.bodyRoll;
      this.playerCar.setBrakeIntensity(this.player.isBraking ? 1 : 0);
      this.playerCar.updateWheelAnimation(this.player.steerVisual, this.player.speed * dt, this.player.speedKmh);
    }

    if (this.rivalCar) {
      const ry = this.track.getElevationAtS(this.rival.s);
      const rSlope = this.track.getSlopeAtS(this.rival.s);
      this.rivalCar.root.position.set(this.rival.x, ry, this.rival.z);
      this.rivalCar.root.rotation.order = 'YXZ';
      this.rivalCar.root.rotation.y = this.rival.heading;
      this.rivalCar.root.rotation.x = -rSlope;
      this.rivalCar.visualBody.rotation.y = this.rival.visualSlip;
      this.rivalCar.visualBody.rotation.z = this.rival.bodyRoll;
      this.rivalCar.setBrakeIntensity(this.rival.isBraking ? 1 : 0);
      this.rivalCar.updateWheelAnimation(this.rival.steerVisual, this.rival.speed * dt, this.rival.speedKmh);
    }
  }

  _updateCamera(dt) {
    const smooth = 1 - Math.exp(-dt * 7.5);

    if (this.state === 'TITLE') {
      const pt = this.track.getPointAtS(this.track.startS);
      const orbitAngle = this.clockTime * 0.24;
      const radius = 14.5;
      const targetPos = new THREE.Vector3(
        pt.x + Math.sin(orbitAngle) * radius,
        pt.y + 4.8 + Math.sin(this.clockTime * 0.5) * 0.5,
        pt.z + Math.cos(orbitAngle) * radius
      );
      const targetLook = new THREE.Vector3(pt.x, pt.y + 1.1, pt.z - 2);
      this.camPos.lerp(targetPos, Math.min(1, dt * 3.5));
      this.camLook.lerp(targetLook, Math.min(1, dt * 3.5));
      this.camera.fov += (58 - this.camera.fov) * smooth;
      this.camRoll += (0 - this.camRoll) * smooth;
    } else if (this.state === 'SELECT' || this.state === 'CUTSCENE_INTRO') {
      const pt = this.track.getPointAtS(this.track.startS);
      const sway = Math.sin(this.clockTime * 0.65) * 2.2;
      const targetPos = new THREE.Vector3(pt.x + 2.6 + sway, pt.y + 3.6, pt.z - 10.5);
      const targetLook = new THREE.Vector3(pt.x + 1.4, pt.y + 1.0, pt.z);
      this.camPos.lerp(targetPos, Math.min(1, dt * 4.5));
      this.camLook.lerp(targetLook, Math.min(1, dt * 4.5));
      this.camera.fov += (54 - this.camera.fov) * smooth;
      this.camRoll += (0 - this.camRoll) * smooth;
    } else if (this.state === 'RESULT' || this.state === 'CUTSCENE_OUTRO') {
      const py = this.track.getElevationAtS(this.player.s);
      const orbitAngle = this.clockTime * 0.42;
      const targetPos = new THREE.Vector3(
        this.player.x + Math.sin(orbitAngle) * 10.5,
        py + 3.6,
        this.player.z + Math.cos(orbitAngle) * 10.5
      );
      const targetLook = new THREE.Vector3(this.player.x, py + 1.0, this.player.z);
      this.camPos.lerp(targetPos, Math.min(1, dt * 3.5));
      this.camLook.lerp(targetLook, Math.min(1, dt * 3.5));
      this.camera.fov += (56 - this.camera.fov) * smooth;
      this.camRoll += (0 - this.camRoll) * smooth;
    } else {
      // COUNTDOWN & RACING: Natural chase cam following blended trajectory + nose heading
      // so sideways drifts visibly kick the rear out like a real touge chase camera
      const slipAngle = this.player.slipAngle || 0;
      const camHeading = this.player.heading - slipAngle * 0.55;
      const fx = Math.sin(camHeading);
      const fz = Math.cos(camHeading);
      const rx = -fz;
      const rz = fx;

      const speedNorm = Math.min(1, this.player.speedKmh / 105);
      const camDist = 7.9 + speedNorm * 1.0;
      const camHeightOffset = 3.15 + speedNorm * 0.22;
      const lookAhead = 14.0 + speedNorm * 2.5;
      const driftSideSwing = slipAngle * 1.65;

      const behindY = this.track.getElevationAtS(Math.max(0, this.player.s - camDist));
      const aheadY = this.track.getElevationAtS(Math.min(this.track.totalLength, this.player.s + lookAhead));

      const desiredPos = new THREE.Vector3(
        this.player.x - fx * camDist - rx * driftSideSwing,
        behindY + camHeightOffset,
        this.player.z - fz * camDist - rz * driftSideSwing
      );
      const desiredLook = new THREE.Vector3(
        this.player.x + fx * lookAhead,
        aheadY + 1.05,
        this.player.z + fz * lookAhead
      );

      this.camPos.lerp(desiredPos, 1 - Math.exp(-dt * 8.5));
      this.camLook.lerp(desiredLook, 1 - Math.exp(-dt * 11.5));

      const targetFov = 60 + speedNorm * 8 + (this.player.driftBoostTimer > 0 ? 3 : 0);
      this.camera.fov += (targetFov - this.camera.fov) * smooth;

      // Subtle downhill cornering camera bank (capped ~2.0 deg)
      const targetRoll = Math.max(-0.035, Math.min(0.035, -slipAngle * 0.055));
      this.camRoll += (targetRoll - this.camRoll) * smooth;
    }

    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (Math.abs(this.camRoll) > 0.0001) {
      this.camera.rotateZ(this.camRoll);
    }
    this.envController?.syncSkyToCamera(this.camPos);
  }

  _stepGame(dt) {
    this.clockTime += dt;

    if (this.state === 'COUNTDOWN') {
      this.countdownTimer -= dt;
      const step = Math.ceil(this.countdownTimer);
      if (step !== this.lastCountdownStep && step >= 1) {
        this.lastCountdownStep = step;
        this.ui.showCountdown(String(step), false, `VS ${this.selectedRival.name} (${this.selectedRival.team})`);
        this.audio.playCountdown(false);
      }

      if (this.countdownTimer <= 0) {
        this.state = 'RACING';
        this.goBannerTimer = 0.85;
        this.ui.showCountdown('GO!!', true, 'FULL THROTTLE DOWNHILL!');
        this.audio.playCountdown(true);
      }

      this.audio.updateEngine(1500 + (this.input.up ? 3400 : 0), false, true, this.input.up ? 1 : 0, false);
      this.hud.update(this.player, this.rival, 0, dt);
    } else if (this.state === 'RACING') {
      this.raceElapsed += dt;

      if (this.goBannerTimer > 0) {
        this.goBannerTimer -= dt;
        if (this.goBannerTimer <= 0) {
          this.ui.hideCountdown();
        }
      }

      // 1. Update 2D physics for Player & Rival AI
      updatePlayerPhysics(this.player, this.input, this.track, dt, this.selectedPlayerCar?.physics ?? null);
      updateRivalAI(this.rival, this.player, this.selectedRival, this.track, dt);

      // 2. Resolve 2D car-to-car contact
      const playerY = this.track.getElevationAtS(this.player.s);
      const playerSlope = this.track.getSlopeAtS(this.player.s);
      const rivalY = this.track.getElevationAtS(this.rival.s);
      const rivalSlope = this.track.getSlopeAtS(this.rival.s);

      const hit = resolveCarCollision(this.player, this.rival, this.track);
      if (hit) {
        this.effects.spawnSparks(hit.x, hit.z, 8, 0x38bdf8, 11, (playerY + rivalY) * 0.5);
      }

      // 3. Emit drift tire marks & sparks at visual road elevation
      this.effects.emitCarEffects('player', this.player, dt, playerY, playerSlope);
      this.effects.emitCarEffects('rival', this.rival, dt, rivalY, rivalSlope);
      this.effects.update(dt);

      // 4. Mid-race Phase 2 trigger right before the 5-consecutive hairpins (z <= -925)
      if (!this.midRaceTriggered && this.player.z <= -925) {
        this.midRaceTriggered = true;
        this.hud.triggerMidRacePhase2(this.selectedRival);
      }

      // 5. Audio & HUD updates
      this.audio.updateEngine(
        this.player.rpm,
        this.player.isDrifting,
        true,
        this.input.up ? 1 : 0,
        this.player.shiftCutTimer > 0
      );
      this.hud.update(this.player, this.rival, this.raceElapsed, dt);

      // 5. Check Finish Line crossing
      if (!this.rival.finished && this.rival.s >= this.track.finishS) {
        this.rival.finished = true;
        this.rival.finishTime = this.raceElapsed;
        if (!this.player.finished) {
          this.hud.showBanner(`${this.selectedRival.name} FINISHED! HURRY!`, 4.0);
        }
      }

      if (!this.player.finished && this.player.s >= this.track.finishS) {
        this.player.finished = true;
        this.player.finishTime = this.raceElapsed;
        const won = !this.rival.finished || this.player.finishTime <= this.rival.finishTime;
        this._finishRace(won);
      } else if (this.rival.finished) {
        // Safety grace timer so player cannot stall indefinitely after rival finishes
        this.rivalFinishedWait += dt;
        if (this.rivalFinishedWait >= 12.0) {
          this._finishRace(false);
        }
      }
    } else {
      this.effects.update(dt);
    }

    this._syncCarMeshes(dt);
    this._updateCamera(dt);
  }

  _loop(now) {
    const rawDt = Math.min(0.25, Math.max(0.001, (now - this._lastFrameTime) / 1000));
    this._lastFrameTime = now;

    // Fixed-cap substepping keeps 2D physics & countdown accurate even on low-FPS WebViews
    const maxStep = 1 / 30;
    let remaining = rawDt;
    while (remaining > 0) {
      const step = Math.min(remaining, maxStep);
      this._stepGame(step);
      remaining -= step;
    }

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(this._loop);
  }
}

function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  const installBtn = document.getElementById('btn-install-app');
  if (!installBtn) return;

  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch (_err) {
      // ignore cancelled prompt
    }
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });
}

window.addEventListener('DOMContentLoaded', () => {
  setupPWA();
  new ProjectDGame();
});
