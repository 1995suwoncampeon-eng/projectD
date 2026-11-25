import { PLAYER_PHYSICS } from './config.js?v=37';
import { wrapAngle } from './track.js';

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

export function createVehicleState(track, startS, lateralOffset = 0) {
  const spawn = track.getWorldPosition(startS, lateralOffset);
  return {
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading,
    travelHeading: spawn.heading, // actual 2D velocity direction (separates from heading during drift)
    speed: 0, // m/s (along travelHeading)
    speedKmh: 0,
    steerInput: 0,  // smoothed steering wheel angle (-1..+1)
    yawRate: 0,     // current angular velocity (rad/s) for rotational inertia
    slipAngle: 0,   // physical slip angle = wrapAngle(heading - travelHeading)
    steerVisual: 0,
    visualSlip: 0,
    bodyRoll: 0,
    isDrifting: false,
    isKanseiDrift: false, // true during continuous pendulum swing-transition drift
    driftDir: 0, // -1 right, +1 left
    driftInitTimer: 0,
    oppositeHoldTimer: 0, // how long opposite steer is held during an active drift (distinguishes swing vs dab)
    driftCharge: 0,
    driftBoostTimer: 0,
    kanseiBoostActive: false,
    lateralLoad: 0,       // sustained high-speed cornering lateral load (-1..+1)
    cornerLoadDir: 0,     // direction of sustained high-speed corner before whip
    cornerLoadTimer: 0,   // freshness window for corner-to-corner swing transition
    gripWhipTimer: 0,     // how long opposite steer is held after high-speed corner
    cornerExitCharge: 0,
    turboBoostTimer: 0,
    inGutter: false,
    nearGutter: false,
    interactBufferTimer: 0,
    gutterSide: 0,
    isBraking: false,
    scrapedWall: false,
    scrapeX: spawn.x,
    scrapeZ: spawn.z,
    trackIndex: spawn.index,
    s: spawn.s,
    lateral: lateralOffset,
    gear: '1',
    gearIndex: 0,
    shiftCutTimer: 0,
    rpm: 1200,
    maxSpeedAchievedKmh: 0,
    finished: false,
    finishTime: null,
  };
}

export function resetVehicleToSpawn(car, track, startS, lateralOffset = 0) {
  const spawn = track.getWorldPosition(startS, lateralOffset);
  car.x = spawn.x;
  car.z = spawn.z;
  car.heading = spawn.heading;
  car.travelHeading = spawn.heading;
  car.speed = 0;
  car.speedKmh = 0;
  car.steerInput = 0;
  car.yawRate = 0;
  car.slipAngle = 0;
  car.steerVisual = 0;
  car.visualSlip = 0;
  car.bodyRoll = 0;
  car.isDrifting = false;
  car.isKanseiDrift = false;
  car.driftDir = 0;
  car.driftInitTimer = 0;
  car.oppositeHoldTimer = 0;
  car.driftCharge = 0;
  car.driftBoostTimer = 0;
  car.kanseiBoostActive = false;
  car.lateralLoad = 0;
  car.cornerLoadDir = 0;
  car.cornerLoadTimer = 0;
  car.gripWhipTimer = 0;
  car.cornerExitCharge = 0;
  car.turboBoostTimer = 0;
  car.inGutter = false;
  car.nearGutter = false;
  car.interactBufferTimer = 0;
  car.gutterSide = 0;
  car.isBraking = false;
  car.scrapedWall = false;
  car.trackIndex = spawn.index;
  car.s = spawn.s;
  car.lateral = lateralOffset;
  car.gear = '1';
  car.gearIndex = 0;
  car.shiftCutTimer = 0;
  car.rpm = 1200;
  car.maxSpeedAchievedKmh = 0;
  car.finished = false;
  car.finishTime = null;
}

/**
 * R-key Track Recovery: cleanly places car on track centerline facing forward.
 */
export function recoverVehicleToTrack(car, track) {
  const safeS = Math.max(track.startS, Math.min(track.finishS - 5, car.s));
  const pt = track.getPointAtS(safeS);
  car.x = pt.x;
  car.z = pt.z;
  car.heading = pt.heading;
  car.travelHeading = pt.heading;
  car.trackIndex = pt.index;
  car.s = pt.s;
  car.lateral = 0;
  car.steerInput = 0;
  car.yawRate = 0;
  car.slipAngle = 0;
  car.isDrifting = false;
  car.isKanseiDrift = false;
  car.driftDir = 0;
  car.driftInitTimer = 0;
  car.oppositeHoldTimer = 0;
  car.driftCharge = 0;
  car.kanseiBoostActive = false;
  car.lateralLoad = 0;
  car.cornerLoadDir = 0;
  car.cornerLoadTimer = 0;
  car.gripWhipTimer = 0;
  car.inGutter = false;
  car.nearGutter = false;
  car.interactBufferTimer = 0;
  car.gutterSide = 0;
  car.visualSlip = 0;
  car.bodyRoll = 0;
  car.speed = Math.min(Math.max(car.speed, 4), 10);
  car.speedKmh = Math.abs(car.speed * MS_TO_KMH);
  car.gearIndex = 0;
  car.shiftCutTimer = 0;
}

/**
 * Computes realistic 5-speed gear with shift hysteresis and RPM readout for HUD & audio.
 */
export function updateDrivetrain(car) {
  const kmh = car.speed * MS_TO_KMH;
  car.speedKmh = Math.abs(kmh);
  if (car.speedKmh > car.maxSpeedAchievedKmh) {
    car.maxSpeedAchievedKmh = car.speedKmh;
  }

  if (kmh < -1.5) {
    car.gear = 'R';
    car.rpm = Math.min(6200, 1400 + Math.abs(kmh) * 160);
    return;
  }

  const speed = Math.max(0, kmh);
  const gears = PLAYER_PHYSICS.gears;
  let gi = Math.max(0, Math.min(gears.length - 1, car.gearIndex ?? 0));

  // Shift hysteresis prevents rapid gear hunting around corner speeds
  while (gi < gears.length - 1 && speed >= gears[gi].upshiftKmh) {
    gi++;
    car.shiftCutTimer = PLAYER_PHYSICS.shiftCutDuration ?? 0.14;
  }
  while (gi > 0 && speed < gears[gi].downshiftKmh) {
    gi--;
  }

  car.gearIndex = gi;
  const g = gears[gi];
  const ratio = Math.max(0, Math.min(1, (speed - g.minKmh) / Math.max(1, g.maxKmh - g.minKmh)));
  const baseRpm = g.minRpm + ratio * (g.maxRpm - g.minRpm);
  const driftRevBump = car.isDrifting ? 620 : 0;
  car.gear = g.gear;
  car.rpm = Math.min(8850, baseRpm + driftRevBump);
}

/**
 * Enforces 2D planar guardrail walls by projecting onto the track spline.
 * Prevents tunneling, escaping, or flipping under any circumstances.
 */
export function enforceTrackBounds(car, track, dt = 1 / 60, wallFriction = 1.65) {
  const proj = track.projectPoint(car.x, car.z, car.trackIndex, car.speed > 0.5);
  car.trackIndex = proj.index;
  car.s = proj.s;
  car.lateral = proj.lateral;
  car.scrapedWall = false;

  const limit = proj.noGuardrail ? track.maxCarLateral + 3.5 : track.maxCarLateral;
  if (Math.abs(proj.lateral) > limit) {
    const clampedLat = Math.sign(proj.lateral) * limit;
    car.x = proj.centerX + proj.rx * clampedLat;
    car.z = proj.centerZ + proj.rz * clampedLat;
    car.lateral = clampedLat;

    if (!proj.noGuardrail) {
      // Gently redirect heading & travel momentum back along road tangent (arcade wall-slide)
      const headingErr = wrapAngle(proj.heading - car.heading);
      const alignFactor = 1 - Math.exp(-dt * 14);
      car.heading = wrapAngle(car.heading + headingErr * Math.max(0.28, alignFactor));
      if (car.travelHeading !== undefined) {
        const travelErr = wrapAngle(proj.heading - car.travelHeading);
        car.travelHeading = wrapAngle(car.travelHeading + travelErr * Math.max(0.35, alignFactor));
      }
      car.yawRate = (car.yawRate || 0) * 0.65;

      // Frame-rate independent arcade scrape drag (scales with impact angle)
      const impactSeverity = 0.45 + Math.min(1, Math.abs(Math.sin(headingErr)) * 2.2);
      car.speed *= Math.exp(-dt * wallFriction * impactSeverity);
      car.scrapedWall = true;
      car.scrapeX = proj.centerX + proj.rx * Math.sign(proj.lateral) * (limit + 0.7);
      car.scrapeZ = proj.centerZ + proj.rz * Math.sign(proj.lateral) * (limit + 0.7);
    }
  }

  // Prevent reversing behind start buffer
  if (car.s < 8 && car.speed < 0) {
    car.speed = 0;
  }

  return proj;
}

/**
 * Pure 2D (X, Z) simcade driving physics step for the Player vehicle.
 * Features progressive steering ramp, yaw rotational inertia, and
 * true velocity-heading separation (slip angle) for tangible drifts.
 */
export function updatePlayerPhysics(car, input, track, dt, physicsOverride = null) {
  const cfg = physicsOverride ? { ...PLAYER_PHYSICS, ...physicsOverride } : PLAYER_PHYSICS;
  const throttle = input.up ? 1 : 0;
  const brake = input.down ? 1 : 0;
  // Positive steer = LEFT (+heading), Negative steer = RIGHT (-heading)
  const rawSteer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const wantDrift = Boolean(input.drift);
  const wantInteract = Boolean(input.interact);

  // Smooth steering wheel ramp (prevents snappy binary jerks on keyboard & touch)
  const prevSteer = car.steerInput ?? 0;
  let steerStepRate = cfg.steerBuildRate ?? 5.2;
  if (rawSteer === 0) {
    steerStepRate = cfg.steerReturnRate ?? 7.5;
  } else if (prevSteer !== 0 && Math.sign(rawSteer) !== Math.sign(prevSteer)) {
    steerStepRate = cfg.steerCounterRate ?? 9.5;
  }
  const steerDelta = rawSteer - prevSteer;
  const maxSteerStep = steerStepRate * dt;
  if (Math.abs(steerDelta) <= maxSteerStep) {
    car.steerInput = rawSteer;
  } else {
    car.steerInput = prevSteer + Math.sign(steerDelta) * maxSteerStep;
  }

  // Non-linear progressive steering curve: fine control on quick taps, full authority when held
  const sAbs = Math.abs(car.steerInput);
  const steer = Math.sign(car.steerInput) * (0.42 * sAbs + 0.58 * sAbs * sAbs);

  // Decay drift exit boost & upshift cut timers
  if (car.driftBoostTimer > 0) {
    car.driftBoostTimer = Math.max(0, car.driftBoostTimer - dt);
    if (car.driftBoostTimer <= 0) {
      car.kanseiBoostActive = false;
    }
  }
  if (car.shiftCutTimer > 0) {
    car.shiftCutTimer = Math.max(0, car.shiftCutTimer - dt);
  }

  const activeBoostKmh = car.kanseiBoostActive ? (cfg.kanseiBoostMaxKmh ?? 10) : cfg.driftBoostMaxKmh;
  const boostBonusMs = car.driftBoostTimer > 0 ? activeBoostKmh * KMH_TO_MS : 0;
  const maxSpeedMs = cfg.maxSpeedKmh * KMH_TO_MS + boostBonusMs;
  const reverseMaxMs = cfg.reverseMaxKmh * KMH_TO_MS;

  // Longitudinal acceleration / braking / coasting (gear-ratio torque + high-RPM powerband + aero drag)
  car.isBraking = false;
  if (throttle > 0) {
    const speedRatio = Math.max(0, car.speed / maxSpeedMs);
    const activeGear = cfg.gears[Math.max(0, Math.min(cfg.gears.length - 1, car.gearIndex ?? 0))];
    const rpmNorm = Math.max(0, Math.min(1, (car.rpm - 1200) / 7300));
    // High-revving NA powerband: builds pull strongly above 5000 RPM, tapers slightly at redline
    const powerband = 0.78 + 0.36 * Math.sin(rpmNorm * Math.PI * 0.86);
    const shiftMult = car.shiftCutTimer > 0 ? 0.15 : 1.0;
    const boostMult = car.driftBoostTimer > 0 ? (car.kanseiBoostActive ? 1.32 : 1.25) : 1.0;
    const curKmh = car.speed * MS_TO_KMH;
    const highSpeedMult =
      cfg.highSpeedDropKmh && curKmh >= cfg.highSpeedDropKmh
        ? (cfg.highSpeedAccelScale ?? 0.18)
        : 1.0;
    const aeroDrag = 0.52 * speedRatio * speedRatio;
    const accelNet = Math.max(
      0.12,
      (cfg.accel * activeGear.torqueMult * powerband * shiftMult * boostMult - aeroDrag) * highSpeedMult
    );
    car.speed += accelNet * dt;
    if (car.speed > maxSpeedMs) {
      car.speed += (maxSpeedMs - car.speed) * Math.min(1, dt * 4.5);
    }
  } else if (brake > 0) {
    if (car.speed > 1.2) {
      car.isBraking = true;
      car.speed = Math.max(0, car.speed - cfg.brakeDecel * dt);
    } else {
      car.speed = Math.max(-reverseMaxMs, car.speed - cfg.accel * 0.55 * dt);
    }
  } else {
    // Natural coasting drag
    if (Math.abs(car.speed) < 0.25) {
      car.speed = 0;
    } else {
      car.speed -= Math.sign(car.speed) * cfg.coastDecel * dt;
    }
  }

  // Tap-to-Initiate + Continuous Pendulum Swing-Transition (Kansei Drift) State Machine
  const speedKmh = car.speed * MS_TO_KMH;
  const speedFactor = Math.min(1, Math.abs(car.speed) / 9.5);
  const reverseSign = car.speed >= -0.1 ? 1 : -1;
  const exitSlipRad = cfg.driftExitSlipRad ?? 0.10;
  const minSustainKmh = cfg.driftMinSpeedKmh * 0.72;

  if (car.driftInitTimer > 0) {
    car.driftInitTimer = Math.max(0, car.driftInitTimer - dt);
  }

  // Track sustained lateral cornering load while in high-speed grip (for gentle-turn -> tight-turn Kansei swing)
  const targetLatLoad = car.steerInput * Math.min(1, speedKmh / 65);
  const loadRate = Math.abs(targetLatLoad) > Math.abs(car.lateralLoad || 0) ? 3.8 : 2.5;
  car.lateralLoad = (car.lateralLoad || 0) + (targetLatLoad - (car.lateralLoad || 0)) * (1 - Math.exp(-dt * loadRate));

  if (!car.isDrifting && Math.abs(car.lateralLoad) >= (cfg.kanseiGripMinLoad ?? 0.50) && speedKmh >= (cfg.kanseiGripMinSpeedKmh ?? 62)) {
    car.cornerLoadDir = Math.sign(car.lateralLoad);
    car.cornerLoadTimer = 0.55;
  } else if (car.cornerLoadTimer > 0) {
    car.cornerLoadTimer = Math.max(0, car.cornerLoadTimer - dt);
    if (car.cornerLoadTimer <= 0) car.cornerLoadDir = 0;
  }

  if (!car.isDrifting && car.cornerLoadTimer > 0 && rawSteer !== 0 && Math.sign(rawSteer) === -car.cornerLoadDir) {
    car.gripWhipTimer = (car.gripWhipTimer || 0) + dt;
  } else {
    car.gripWhipTimer = 0;
  }

  const steerDir = rawSteer !== 0
    ? Math.sign(rawSteer)
    : Math.abs(car.steerInput) > 0.10
      ? Math.sign(car.steerInput)
      : 0;

  // 1A) High-speed grip corner -> immediate opposite whip into Kansei Drift (Episode 1 gentle right -> tight left)
  const gripCornerSwingTrigger =
    !car.isDrifting &&
    !car.inGutter &&
    speedKmh >= (cfg.kanseiGripMinSpeedKmh ?? 62) &&
    car.cornerLoadTimer > 0 &&
    car.cornerLoadDir !== 0 &&
    rawSteer !== 0 &&
    Math.sign(rawSteer) === -car.cornerLoadDir &&
    car.gripWhipTimer >= (cfg.kanseiGripWhipHoldSec ?? 0.14);

  if (gripCornerSwingTrigger) {
    const dir = Math.sign(rawSteer);
    car.isDrifting = true;
    car.isKanseiDrift = true;
    car.driftDir = dir;
    car.driftInitTimer = 0.34;
    car.oppositeHoldTimer = 0;
    car.cornerLoadTimer = 0;
    car.cornerLoadDir = 0;
    car.gripWhipTimer = 0;
    car.yawRate = (car.yawRate ?? 0) + dir * 1.15;
    if (car.travelHeading === undefined) car.travelHeading = car.heading;
    car.travelHeading = wrapAngle(car.heading - dir * 0.13);
    car.slipAngle = wrapAngle(car.heading - car.travelHeading);
  } else if (!car.isDrifting && wantDrift && speedKmh >= cfg.driftMinSpeedKmh && steerDir !== 0) {
    // 1B) Standard Tap-to-Initiate Drift (DRIFT key)
    car.isDrifting = true;
    car.isKanseiDrift = false;
    car.driftDir = steerDir;
    car.driftInitTimer = cfg.driftInitGraceSec ?? 0.28;
    car.oppositeHoldTimer = 0;
    car.yawRate = (car.yawRate ?? 0) + steerDir * 1.05;
    if (car.travelHeading === undefined) car.travelHeading = car.heading;
    car.travelHeading = wrapAngle(car.heading - steerDir * 0.11);
    car.slipAngle = wrapAngle(car.heading - car.travelHeading);
  }

  // 2) Sustain drift, allow smooth counter-steering, and trigger Kansei flip ONLY when
  // the car actually overshoots past 0 deg into the opposite side by kanseiOvershootRad!
  let holdingOpposite = false;
  if (car.isDrifting) {
    if (car.driftDir === 0 && steerDir !== 0) {
      car.driftDir = steerDir;
    }

    holdingOpposite =
      !car.inGutter &&
      car.driftDir !== 0 &&
      speedKmh >= (cfg.kanseiSwingMinSpeedKmh ?? 46) &&
      rawSteer !== 0 &&
      Math.sign(rawSteer) === -car.driftDir;

    // Positive once the nose has swung past 0 deg (travelHeading) into the opposite side
    const oppositeOvershoot = -(car.slipAngle || 0) * car.driftDir;
    const overshootThreshold = cfg.kanseiOvershootRad ?? 0.115;

    if (holdingOpposite && oppositeOvershoot >= overshootThreshold) {
      const newDir = -car.driftDir;
      car.driftDir = newDir;
      car.isKanseiDrift = true;
      car.driftInitTimer = 0.34;
      car.oppositeHoldTimer = 0;
      car.yawRate = newDir * Math.max(Math.abs(car.yawRate || 0), 1.55) + newDir * 0.85;
      holdingOpposite = false;
    }

    const alignedEnough =
      car.driftInitTimer <= 0 &&
      !wantDrift &&
      !holdingOpposite &&
      Math.abs(car.slipAngle || 0) < exitSlipRad;

    if (speedKmh < minSustainKmh || alignedEnough) {
      if (car.driftCharge > 0.30 && throttle > 0) {
        car.kanseiBoostActive = Boolean(car.isKanseiDrift);
        car.driftBoostTimer = car.isKanseiDrift ? (cfg.kanseiBoostDuration ?? 1.0) : 0.85;
      }
      car.isDrifting = false;
      car.isKanseiDrift = false;
      car.driftDir = 0;
      car.driftInitTimer = 0;
      car.oppositeHoldTimer = 0;
      car.driftCharge = Math.max(0, car.driftCharge - dt * 1.8);
    } else {
      // Drift builds charge for a crisp exit boost
      car.driftCharge = Math.min(1.0, car.driftCharge + dt * (car.isKanseiDrift ? 0.78 : 0.68));
      // Kansei swing-transition preserves more speed through linked corners
      const slipScrub = 0.65 + 0.7 * Math.min(1, Math.abs(car.slipAngle || 0) / (cfg.maxSlipAngleRad ?? 0.5));
      const kanseiDragMult = car.isKanseiDrift ? (cfg.kanseiDragMult ?? 0.65) : 1.0;
      car.speed = Math.max(minSustainKmh * KMH_TO_MS, car.speed - cfg.driftDrag * slipScrub * kanseiDragMult * dt);
    }
  } else {
    car.isKanseiDrift = false;
    car.oppositeHoldTimer = 0;
    car.driftCharge = Math.max(0, car.driftCharge - dt * 1.8);
  }

  // Steering angular velocity with yaw rotational inertia
  let targetTurnRate = 0;
  if (car.isDrifting && car.driftDir !== 0) {
    // Steering into the turn deepens the slide; gentle counter-steering holds a shallow long drift;
    // holding opposite steer all the way past 0 deg overshoots into an opposite Kansei Drift
    let driftSteer = 0;
    if (rawSteer === 0) {
      driftSteer = wantDrift ? car.driftDir * 0.32 : 0;
    } else if (Math.sign(rawSteer) === car.driftDir) {
      driftSteer = steer * 0.92 + car.driftDir * 0.28;
    } else {
      // Smooth, controllable counter-steering (no forced snap!)
      driftSteer = steer * 0.82;
    }
    const kanseiYawBonus = car.isKanseiDrift ? 1.08 : 1.0;
    targetTurnRate = driftSteer * cfg.steerRate * cfg.driftSteerBoost * kanseiYawBonus * speedFactor;
  } else {
    // Stronger high-speed stability damping on straights for calm, planted feel
    const highSpeedDamp = 1 - Math.min(0.36, (Math.max(0, speedKmh - 42) / 62) * 0.36);
    targetTurnRate = steer * cfg.steerRate * highSpeedDamp * speedFactor * reverseSign;
  }

  const yawAccel = car.isDrifting ? (cfg.yawAccelDrift ?? 7.5) : (cfg.yawAccelGrip ?? 11.0);
  car.yawRate = (car.yawRate ?? 0) + (targetTurnRate - (car.yawRate ?? 0)) * (1 - Math.exp(-dt * yawAccel));

  // Decay gutter exit cooldown so car never immediately re-hooks into the same gutter tail
  if (car.gutterCooldown > 0) {
    car.gutterCooldown = Math.max(0, car.gutterCooldown - dt);
  }

  // Interact key buffer (0.35s) so tapping L CTRL right before touching the gutter still hooks cleanly
  if (wantInteract) {
    car.interactBufferTimer = 0.35;
  } else if (car.interactBufferTimer > 0) {
    car.interactBufferTimer = Math.max(0, car.interactBufferTimer - dt);
  }
  const interactActive = wantInteract || (car.interactBufferTimer || 0) > 0;

  // Check if player is currently hooked in an inside-corner gutter (도랑타기)
  const curPt = track.getPointAtS(car.s);
  const gutterRailLat = track.maxCarLateral - 1.1;   // Smooth 1.1m clearance from guardrail
  const gutterCatchLat = track.maxCarLateral - 2.15; // Forgiving lateral threshold to drop inside wheels into gutter
  car.nearGutter = false;

  if (car.inGutter) {
    // Stay locked in the gutter until the gutter ends or the car stops
    if (curPt.gutterSide !== car.gutterSide || car.speed < 2.0) {
      car.inGutter = false;
      car.gutterSide = 0;
      car.gutterCooldown = 0.45;
    }
  } else if (
    (car.gutterCooldown || 0) <= 0 &&
    curPt.gutterSide !== 0 &&
    car.speed > 4.0 &&
    car.lateral * curPt.gutterSide >= gutterCatchLat
  ) {
    if (interactActive) {
      // Interact key pressed while touching inside gutter -> hook engaged!
      car.inGutter = true;
      car.gutterSide = curPt.gutterSide;
      car.interactBufferTimer = 0;
    } else {
      // Touching gutter without interact key -> show prompt only, do NOT auto-hook
      car.nearGutter = true;
    }
  }

  let fx, fz;
  if (car.inGutter) {
    // Gutter-rail guided cornering: smoothly follows the gutter tangent without washing out or snagging
    const targetLat = car.gutterSide * gutterRailLat;
    const latSnap = 1 - Math.exp(-dt * 12);
    const nextLat = car.lateral + (targetLat - car.lateral) * latSnap;
    const arcScale = Math.max(0.72, Math.min(1.25, 1 + curPt.curvature * nextLat));
    const nextS = Math.min(track.totalLength, car.s + (car.speed * dt) / arcScale);
    const nextInfo = track.getPointAtS(nextS);
    const nextX = nextInfo.x + nextInfo.rx * nextLat;
    const nextZ = nextInfo.z + nextInfo.rz * nextLat;

    // Smoothly align directly to the road spline tangent (eliminates chord/jitter heading errors)
    const hDiff = wrapAngle(nextInfo.heading - car.heading);
    car.heading = wrapAngle(car.heading + hDiff * Math.min(1, dt * 20));
    car.travelHeading = car.heading;
    car.slipAngle = 0;
    car.yawRate = 0;

    car.x = nextX;
    car.z = nextZ;
    car.s = nextS;
    car.lateral = nextLat;
    car.trackIndex = nextInfo.index;
    car.scrapedWall = false;

    // Release cleanly aligned with the exit tangent with cooldown to prevent re-hooking
    if (nextInfo.gutterSide !== car.gutterSide) {
      car.heading = nextInfo.heading;
      car.travelHeading = nextInfo.heading;
      car.inGutter = false;
      car.gutterSide = 0;
      car.gutterCooldown = 0.45;
      car.isDrifting = false;
      car.isKanseiDrift = false;
      car.driftDir = 0;
      car.driftInitTimer = 0;
      car.oppositeHoldTimer = 0;
    }

    fx = Math.sin(car.heading);
    fz = Math.cos(car.heading);
  } else {
    car.heading = wrapAngle(car.heading + car.yawRate * dt);

    if (car.travelHeading === undefined) {
      car.travelHeading = car.heading;
    }

    if (car.speed > 1.0) {
      // True 2D velocity-heading separation:
      // During drift (and while swinging across into an opposite Kansei Drift),
      // lateral grip stays soft so the tail whips smoothly across without snapping to grip.
      const prevSlip = Math.abs(car.slipAngle || 0);
      const settlingDrift =
        car.isDrifting &&
        !wantDrift &&
        !holdingOpposite &&
        (rawSteer === 0 || Math.sign(rawSteer) !== car.driftDir);
      const alignRate = car.isDrifting
        ? (settlingDrift ? (cfg.driftSettleAlignRate ?? 4.1) : (cfg.driftAlignRate ?? 2.35))
        : prevSlip > 0.06
          ? (cfg.driftRecoveryAlignRate ?? 5.6)
          : (cfg.gripAlignRate ?? 9.5);

      const headingGap = wrapAngle(car.heading - car.travelHeading);
      car.travelHeading = wrapAngle(car.travelHeading + headingGap * (1 - Math.exp(-dt * alignRate)));

      // Clamp maximum physical slip angle so slides feel dramatic yet stay controllable
      const maxSlip = cfg.maxSlipAngleRad ?? 0.50;
      let slip = wrapAngle(car.heading - car.travelHeading);
      if (Math.abs(slip) > maxSlip) {
        slip = Math.sign(slip) * maxSlip;
        car.travelHeading = wrapAngle(car.heading - slip);
      }
      car.slipAngle = slip;

      car.x += Math.sin(car.travelHeading) * car.speed * dt;
      car.z += Math.cos(car.travelHeading) * car.speed * dt;
    } else {
      car.travelHeading = car.heading;
      car.slipAngle = 0;
      car.x += Math.sin(car.heading) * car.speed * dt;
      car.z += Math.cos(car.heading) * car.speed * dt;
    }

    fx = Math.sin(car.heading);
    fz = Math.cos(car.heading);

    // Enforce guardrail collision bounds
    const proj = enforceTrackBounds(car, track, dt, 1.55);

    // If touching an inside-corner gutter (and not on exit cooldown), engage only when interact key is pressed
    if (
      (car.gutterCooldown || 0) <= 0 &&
      proj.gutterSide !== 0 &&
      car.speed > 4.0 &&
      car.lateral * proj.gutterSide >= gutterCatchLat
    ) {
      if (interactActive) {
        car.inGutter = true;
        car.gutterSide = proj.gutterSide;
        car.nearGutter = false;
        car.interactBufferTimer = 0;
        car.scrapedWall = false;
      } else {
        car.nearGutter = true;
      }
    }
  }

  // Smooth visual feedback driven by real physical slip & lateral G-force
  const slipNow = car.slipAngle || 0;
  const targetSlip = car.inGutter
    ? -car.gutterSide * 0.18
    : Math.max(-0.18, Math.min(0.18, slipNow * 0.25));
  car.visualSlip += (targetSlip - car.visualSlip) * Math.min(1, dt * 10);

  // Suspension body roll driven by actual lateral acceleration (yawRate * speed)
  const lateralG = Math.max(-1.4, Math.min(1.4, (car.yawRate || 0) * Math.abs(car.speed) / 22));
  const targetRoll = car.inGutter
    ? -car.gutterSide * 0.095
    : lateralG * 0.068;
  car.bodyRoll += (targetRoll - car.bodyRoll) * Math.min(1, dt * 9.0);

  // Front wheels show natural counter-steer angle when tail slides out
  const counterSteerVisual = Math.abs(slipNow) > 0.08
    ? Math.max(-1, Math.min(1, -slipNow * 1.6 + car.steerInput * 0.45))
    : car.steerInput;
  car.steerVisual += (counterSteerVisual - car.steerVisual) * Math.min(1, dt * 13);

  updateDrivetrain(car);

  return { fx, fz };
}

/**
 * Resolves 2D circle-based car-to-car contact so vehicles bounce cleanly off each other
 * without overlapping or tunneling through guardrails.
 */
export function resolveCarCollision(carA, carB, track) {
  const minDist = PLAYER_PHYSICS.carCollisionRadius * 2;
  const dx = carA.x - carB.x;
  const dz = carA.z - carB.z;
  const distSq = dx * dx + dz * dz;

  if (distSq >= minDist * minDist || distSq < 1e-6) {
    return null;
  }

  const dist = Math.sqrt(distSq);
  const overlap = (minDist - dist) * 0.52;
  const nx = dx / dist;
  const nz = dz / dist;

  carA.x += nx * overlap;
  carA.z += nz * overlap;
  carB.x -= nx * overlap;
  carB.z -= nz * overlap;

  // Mild momentum transfer
  const avgSpeed = (carA.speed + carB.speed) * 0.5;
  carA.speed = carA.speed * 0.85 + avgSpeed * 0.15;
  carB.speed = carB.speed * 0.85 + avgSpeed * 0.15;

  enforceTrackBounds(carA, track, 1 / 60, 0.8);
  enforceTrackBounds(carB, track, 1 / 60, 0.8);

  return {
    x: (carA.x + carB.x) * 0.5,
    z: (carA.z + carB.z) * 0.5,
  };
}
