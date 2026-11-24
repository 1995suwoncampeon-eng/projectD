import { PLAYER_PHYSICS } from './config.js?v=20';
import { wrapAngle } from './track.js';

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

export function createVehicleState(track, startS, lateralOffset = 0) {
  const spawn = track.getWorldPosition(startS, lateralOffset);
  return {
    x: spawn.x,
    z: spawn.z,
    heading: spawn.heading,
    speed: 0, // m/s (forward along heading)
    speedKmh: 0,
    steerVisual: 0,
    visualSlip: 0,
    bodyRoll: 0,
    isDrifting: false,
    driftDir: 0, // -1 right, +1 left
    driftCharge: 0,
    driftBoostTimer: 0,
    cornerExitCharge: 0,
    turboBoostTimer: 0,
    inGutter: false,
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
  car.speed = 0;
  car.speedKmh = 0;
  car.steerVisual = 0;
  car.visualSlip = 0;
  car.bodyRoll = 0;
  car.isDrifting = false;
  car.driftDir = 0;
  car.driftCharge = 0;
  car.driftBoostTimer = 0;
  car.cornerExitCharge = 0;
  car.turboBoostTimer = 0;
  car.inGutter = false;
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
  car.trackIndex = pt.index;
  car.s = pt.s;
  car.lateral = 0;
  car.isDrifting = false;
  car.driftDir = 0;
  car.driftCharge = 0;
  car.inGutter = false;
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
      // Gently redirect heading back along road tangent (arcade wall-slide)
      const headingErr = wrapAngle(proj.heading - car.heading);
      const alignFactor = 1 - Math.exp(-dt * 14);
      car.heading = wrapAngle(car.heading + headingErr * Math.max(0.28, alignFactor));

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
 * Pure 2D (X, Z) arcade driving physics step for the Player vehicle.
 */
export function updatePlayerPhysics(car, input, track, dt) {
  const cfg = PLAYER_PHYSICS;
  const throttle = input.up ? 1 : 0;
  const brake = input.down ? 1 : 0;
  // Positive steer = LEFT (+heading), Negative steer = RIGHT (-heading)
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const wantDrift = Boolean(input.drift);

  // Decay drift exit boost & upshift cut timers
  if (car.driftBoostTimer > 0) {
    car.driftBoostTimer = Math.max(0, car.driftBoostTimer - dt);
  }
  if (car.shiftCutTimer > 0) {
    car.shiftCutTimer = Math.max(0, car.shiftCutTimer - dt);
  }

  const boostBonusMs = car.driftBoostTimer > 0 ? cfg.driftBoostMaxKmh * KMH_TO_MS : 0;
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
    const boostMult = car.driftBoostTimer > 0 ? 1.25 : 1.0;
    const aeroDrag = 0.52 * speedRatio * speedRatio;
    const accelNet = Math.max(0.18, cfg.accel * activeGear.torqueMult * powerband * shiftMult * boostMult - aeroDrag);
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

  // Arcade Drift State Machine
  const speedKmh = car.speed * MS_TO_KMH;
  const canDrift = wantDrift && speedKmh >= cfg.driftMinSpeedKmh;

  if (canDrift && (Math.abs(steer) > 0.05 || car.isDrifting)) {
    if (!car.isDrifting) {
      car.isDrifting = true;
      car.driftDir = steer !== 0 ? Math.sign(steer) : 0;
    } else if (car.driftDir === 0 && steer !== 0) {
      car.driftDir = Math.sign(steer);
    }

    // Drift builds charge for a crisp exit boost
    car.driftCharge = Math.min(1.0, car.driftCharge + dt * 0.68);
    // Slight arcade speed bleed while sliding deep
    car.speed = Math.max(cfg.driftMinSpeedKmh * 0.85 * KMH_TO_MS, car.speed - cfg.driftDrag * dt);
  } else {
    if (car.isDrifting && car.driftCharge > 0.32 && throttle > 0) {
      car.driftBoostTimer = 0.85;
    }
    car.isDrifting = false;
    car.driftDir = 0;
    car.driftCharge = Math.max(0, car.driftCharge - dt * 1.8);
  }

  // Steering angular velocity (speed-responsive, extra authority when drifting)
  const speedFactor = Math.min(1, Math.abs(car.speed) / 9.5);
  const reverseSign = car.speed >= -0.1 ? 1 : -1;

  let turnRate = 0;
  if (car.isDrifting && car.driftDir !== 0) {
    // Allow subtle counter-steering to widen or tighten the drift arc smoothly
    const driftSteer = steer === 0 ? car.driftDir * 0.42 : steer * 0.78 + car.driftDir * 0.48;
    turnRate = driftSteer * cfg.steerRate * cfg.driftSteerBoost * speedFactor;
  } else {
    // Slight high-speed stability damping on straights
    const highSpeedDamp = 1 - Math.min(0.28, (Math.max(0, speedKmh - 50) / 60) * 0.28);
    turnRate = steer * cfg.steerRate * highSpeedDamp * speedFactor * reverseSign;
  }

  // Decay gutter exit cooldown so car never immediately re-hooks into the same gutter tail
  if (car.gutterCooldown > 0) {
    car.gutterCooldown = Math.max(0, car.gutterCooldown - dt);
  }

  // Check if player is currently hooked in an inside-corner gutter (도랑타기)
  const curPt = track.getPointAtS(car.s);
  const gutterRailLat = track.maxCarLateral - 1.1;   // Smooth 1.1m clearance from guardrail
  const gutterCatchLat = track.maxCarLateral - 1.65; // Lateral threshold to drop inside wheels into gutter

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
    // Inside tires dropped into the corner gutter -> hook engaged!
    car.inGutter = true;
    car.gutterSide = curPt.gutterSide;
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

    car.x = nextX;
    car.z = nextZ;
    car.s = nextS;
    car.lateral = nextLat;
    car.trackIndex = nextInfo.index;
    car.scrapedWall = false;

    // Release cleanly aligned with the exit tangent with cooldown to prevent re-hooking
    if (nextInfo.gutterSide !== car.gutterSide) {
      car.heading = nextInfo.heading;
      car.inGutter = false;
      car.gutterSide = 0;
      car.gutterCooldown = 0.45;
      car.isDrifting = false;
      car.driftDir = 0;
    }

    fx = Math.sin(car.heading);
    fz = Math.cos(car.heading);
  } else {
    car.heading = wrapAngle(car.heading + turnRate * dt);

    // Move strictly on the 2D X-Z plane (Y = 0)
    fx = Math.sin(car.heading);
    fz = Math.cos(car.heading);

    // Subtle lateral slide component during drift for authentic Initial D feel
    const slideOffsetAngle = car.isDrifting ? -car.driftDir * 0.14 : 0;
    const moveHeading = car.heading + slideOffsetAngle;
    car.x += Math.sin(moveHeading) * car.speed * dt;
    car.z += Math.cos(moveHeading) * car.speed * dt;

    // Enforce guardrail collision bounds
    const proj = enforceTrackBounds(car, track, dt, 1.55);

    // If steering into the inside corner where a gutter exists (and not on exit cooldown), catch the gutter
    if (
      (car.gutterCooldown || 0) <= 0 &&
      proj.gutterSide !== 0 &&
      car.speed > 4.0 &&
      car.lateral * proj.gutterSide >= gutterCatchLat
    ) {
      car.inGutter = true;
      car.gutterSide = proj.gutterSide;
      car.scrapedWall = false;
    }
  }

  // Smooth visual feedback (body slip angle, front wheel steering, subtle roll)
  const targetSlip = car.inGutter
    ? -car.gutterSide * 0.18
    : car.isDrifting
      ? car.driftDir * cfg.maxVisualSlipRad * (0.7 + 0.3 * Math.min(1, speedKmh / 85))
      : steer * 0.05 * speedFactor;
  car.visualSlip += (targetSlip - car.visualSlip) * Math.min(1, dt * 9.5);

  // Subtle inward dip/roll when inside wheel is dropped into the gutter
  const targetRoll = car.inGutter
    ? -car.gutterSide * 0.095
    : (car.isDrifting ? car.driftDir * 0.075 : steer * 0.04) * speedFactor;
  car.bodyRoll += (targetRoll - car.bodyRoll) * Math.min(1, dt * 10);
  car.steerVisual += (steer - car.steerVisual) * Math.min(1, dt * 14);

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
