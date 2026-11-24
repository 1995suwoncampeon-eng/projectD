import { wrapAngle } from './track.js';
import { enforceTrackBounds, updateDrivetrain } from './physics.js';

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

/**
 * Waypoint-following Rival AI with cornering anticipation, racing-line apex
 * hugging, and smooth rubber-banding to sustain tense 1v1 touge battles.
 */
export function updateRivalAI(rival, player, rivalConfig, track, dt) {
  const ai = rivalConfig.ai;

  // 1. Inspect upcoming curvature to calculate smooth cornering speed target
  const { peakAbs, signedPeak } = track.getUpcomingCurvature(rival.s, 10, 92);
  const entryPt = track.getPointAtS(rival.s);

  // Rotary / turbo corner-exit boost timer decay
  if (rival.turboBoostTimer > 0) {
    rival.turboBoostTimer = Math.max(0, rival.turboBoostTimer - dt);
  }
  const turboCfg = ai.twinTurboBoost || null;
  const turboActive = Boolean(turboCfg && rival.turboBoostTimer > 0);

  let targetSpeedKmh;
  let hardBrakingEntry = false;
  if (ai.fullThrottleCorners) {
    // Full throttle through every corner — never lifts off the accelerator
    targetSpeedKmh = ai.maxSpeedKmh;
  } else if (ai.lateBrakeApexFullThrottle) {
    // Grip-turbo style (e.g. Takeshi): hard brake on corner entry, then full throttle through the apex!
    const immediateAhead = track.getUpcomingCurvature(rival.s, 8, 52);
    const inCornerNow = Math.abs(entryPt.curvature) >= 0.008;
    const oppositeCornerAhead =
      immediateAhead.peakAbs > 0.011 &&
      Math.sign(immediateAhead.signedPeak) !== Math.sign(entryPt.curvature);

    if (inCornerNow && !oppositeCornerAhead) {
      // Already clipped into the corner -> get back on full throttle through the turn!
      targetSpeedKmh = ai.maxSpeedKmh;
    } else if (immediateAhead.peakAbs > 0.0085) {
      // Approaching a corner -> hard late braking to set up the inside apex
      hardBrakingEntry = true;
      const entrySensitivity = 36;
      targetSpeedKmh = Math.max(46, ai.maxSpeedKmh / (1 + immediateAhead.peakAbs * entrySensitivity));
    } else {
      targetSpeedKmh = ai.maxSpeedKmh;
    }
  } else {
    // Higher cornerSpeedFactor (e.g. Ryosuke 0.97) carries far more speed through hairpins
    const baseSensitivity = 48 - ai.cornerSpeedFactor * 27;
    const cornerSensitivity = baseSensitivity * (ai.cornerDecelScale ?? 1.0);
    targetSpeedKmh = ai.maxSpeedKmh / (1 + peakAbs * cornerSensitivity);

    // Clamp minimum hairpin crawl so rival always feels lively
    const minCrawl = ai.minCornerSpeedRatio
      ? ai.maxSpeedKmh * ai.minCornerSpeedRatio
      : 44 + ai.cornerSpeedFactor * 18;
    targetSpeedKmh = Math.max(minCrawl, targetSpeedKmh);
  }

  if (turboActive) {
    targetSpeedKmh += turboCfg.boostKmh;
  }

  // 2. Smooth Rubber-Banding (tapers off in final 130m sprint for fair finishes)
  const distToFinish = Math.max(0, track.finishS - rival.s);
  const finishFairness = Math.min(1, distToFinish / 130);
  const gap = rival.s - player.s; // >0 means rival is ahead, <0 means rival is behind

  let rubberMultiplier = 1.0;
  if (gap < -16) {
    // Rival is behind -> smooth catch-up boost
    const factor = Math.min(1, (-gap - 16) / 95);
    rubberMultiplier = 1 + ai.rubberBandCatchup * factor * finishFairness;
  } else if (gap > 30 && ai.rubberBandEase > 0) {
    // Rival is far ahead -> mild mercy ease so battle stays exciting
    const factor = Math.min(1, (gap - 30) / 100);
    rubberMultiplier = 1 - ai.rubberBandEase * factor * finishFairness;
  }

  const desiredSpeedMs = targetSpeedKmh * rubberMultiplier * KMH_TO_MS;

  // 3. Longitudinal acceleration / braking / lift-off coasting toward desired speed
  rival.isBraking = false;
  if (rival.speed < desiredSpeedMs) {
    const ratio = Math.max(0, rival.speed / Math.max(1, desiredSpeedMs));
    const accelMult = turboActive ? turboCfg.boostAccelMult : 1.0;
    const pull = ai.accel * accelMult * (1.12 - 0.45 * ratio * ratio);
    rival.speed = Math.min(desiredSpeedMs, rival.speed + pull * dt);
  } else if (!ai.fullThrottleCorners) {
    const excess = rival.speed - desiredSpeedMs;
    if (ai.coastOnlyCorners) {
      // Lift off the throttle (engine braking only); barely ever touches the brake
      const decelRate = ai.coastDecel ?? 3.4;
      if (excess > 9.5) rival.isBraking = true;
      rival.speed = Math.max(desiredSpeedMs, rival.speed - decelRate * dt);
    } else if (hardBrakingEntry && ai.hardBrakeDecel) {
      if (excess > 1.2) rival.isBraking = true;
      rival.speed = Math.max(desiredSpeedMs, rival.speed - ai.hardBrakeDecel * dt);
    } else {
      if (excess > 3.0) rival.isBraking = true;
      rival.speed = Math.max(desiredSpeedMs, rival.speed - 16.0 * dt);
    }
  }

  // 4. Target Waypoint & Racing Line Lateral Offset
  // Hug inside apex on sharp turns (turning left -> negative right offset)
  const curPt = track.getPointAtS(rival.s);
  const gutterRailLat = track.maxCarLateral - 1.1;
  const aheadGutterPt = ai.useGutterRun
    ? track.getPointAtS(Math.min(track.totalLength, rival.s + 18))
    : null;
  const activeGutterSide = ai.useGutterRun
    ? (curPt.gutterSide || (aheadGutterPt ? aheadGutterPt.gutterSide : 0))
    : 0;

  const apexRatio = ai.apexRatio ?? 0.56;
  const maxLatRatio = ai.maxLateralRatio ?? 0.78;
  const nearCurv = ai.fullThrottleCorners
    ? track.getUpcomingCurvature(rival.s, 4, 48)
    : { peakAbs, signedPeak };
  const curveThreshold = ai.fullThrottleCorners ? 0.003 : 0.0065;

  let targetLateral = ai.laneBias;
  if (activeGutterSide !== 0) {
    // Line up directly with the inside drainage gutter for gutter-run cornering
    targetLateral = activeGutterSide * gutterRailLat;
  } else if (Math.abs(nearCurv.signedPeak) > curveThreshold) {
    const insideDir = nearCurv.signedPeak > 0 ? -1 : 1;
    targetLateral = insideDir * (track.maxCarLateral * apexRatio);
  }

  // Polite lateral spacing when side-by-side with player (skipped if apex-locked or gutter-running)
  const longDiff = Math.abs(rival.s - player.s);
  if (
    longDiff < 14 &&
    activeGutterSide === 0 &&
    !(ai.fullThrottleCorners && Math.abs(nearCurv.signedPeak) > curveThreshold)
  ) {
    const sideOffset = player.lateral > 0 ? -2.4 : 2.4;
    targetLateral = targetLateral * 0.45 + sideOffset * 0.55;
  }

  const latClamp = activeGutterSide !== 0
    ? Math.max(gutterRailLat, track.maxCarLateral * maxLatRatio)
    : track.maxCarLateral * maxLatRatio;
  targetLateral = Math.max(-latClamp, Math.min(latClamp, targetLateral));

  // Decay AI gutter exit cooldown
  if (rival.gutterCooldown > 0) {
    rival.gutterCooldown = Math.max(0, rival.gutterCooldown - dt);
  }

  // Engage / release gutter hook for gutter-run rivals (e.g. BUNTA)
  if (ai.useGutterRun) {
    if (rival.inGutter) {
      if (curPt.gutterSide !== rival.gutterSide || rival.speed < 2.0) {
        rival.inGutter = false;
        rival.gutterSide = 0;
        rival.gutterCooldown = 0.45;
      }
    } else if (
      (rival.gutterCooldown || 0) <= 0 &&
      curPt.gutterSide !== 0 &&
      rival.speed > 4.0 &&
      rival.lateral * curPt.gutterSide >= gutterRailLat - 0.95
    ) {
      rival.inGutter = true;
      rival.gutterSide = curPt.gutterSide;
    }
  } else {
    rival.inGutter = false;
    rival.gutterSide = 0;
  }

  let headingDiff = 0;
  let proj;
  if (rival.inGutter) {
    // Gutter-rail guided cornering (mirrors player's gutter run cleanly through tight hairpins)
    const targetLat = rival.gutterSide * gutterRailLat;
    const latSnap = 1 - Math.exp(-dt * 12);
    const nextLat = rival.lateral + (targetLat - rival.lateral) * latSnap;
    const arcScale = Math.max(0.72, Math.min(1.25, 1 + curPt.curvature * nextLat));
    const nextS = Math.min(track.totalLength, rival.s + (rival.speed * dt) / arcScale);
    const nextInfo = track.getPointAtS(nextS);
    const nextX = nextInfo.x + nextInfo.rx * nextLat;
    const nextZ = nextInfo.z + nextInfo.rz * nextLat;

    headingDiff = wrapAngle(nextInfo.heading - rival.heading);
    rival.heading = wrapAngle(rival.heading + headingDiff * Math.min(1, dt * 20));
    rival.x = nextX;
    rival.z = nextZ;
    rival.s = nextS;
    rival.lateral = nextLat;
    rival.trackIndex = nextInfo.index;
    rival.scrapedWall = false;
    proj = nextInfo;

    if (nextInfo.gutterSide !== rival.gutterSide) {
      rival.heading = nextInfo.heading;
      rival.inGutter = false;
      rival.gutterSide = 0;
      rival.gutterCooldown = 0.45;
    }
  } else if (ai.fullThrottleCorners) {
    // High-precision spline-locked inside-apex tracking so full-throttle cornering
    // hugs right up to the guardrail limit without scraping or decelerating.
    const latFollow = 1 - Math.exp(-dt * 5.2);
    const nextLat = Math.max(
      -track.maxCarLateral * maxLatRatio,
      Math.min(track.maxCarLateral * maxLatRatio, rival.lateral + (targetLateral - rival.lateral) * latFollow)
    );
    // Inside of a turn has a shorter physical arc length: ds_world = ds_center * (1 + k * lat)
    const arcScale = Math.max(0.75, Math.min(1.25, 1 + curPt.curvature * nextLat));
    const nextS = Math.min(track.totalLength, rival.s + (rival.speed * dt) / arcScale);
    const nextPt = track.getWorldPosition(nextS, nextLat);
    const moveDx = nextPt.x - rival.x;
    const moveDz = nextPt.z - rival.z;
    if (moveDx * moveDx + moveDz * moveDz > 1e-6) {
      const targetHeading = Math.atan2(moveDx, moveDz);
      headingDiff = wrapAngle(targetHeading - rival.heading);
      rival.heading = wrapAngle(rival.heading + headingDiff * Math.min(1, dt * 16));
    } else {
      rival.heading = nextPt.heading;
    }
    rival.x = nextPt.x;
    rival.z = nextPt.z;
    rival.s = nextS;
    rival.lateral = nextLat;
    rival.trackIndex = nextPt.index;
    rival.scrapedWall = false;
    proj = track.getPointAtS(nextS);
  } else {
    const baseLookAhead = ai.lookAheadBase + rival.speed * 0.3;
    const nearPeak = track.getUpcomingCurvature(rival.s, 4, 42).peakAbs;
    const lookAheadDist = Math.max(7.5, baseLookAhead / (1 + nearPeak * 68));
    const targetPt = track.getWorldPosition(rival.s + lookAheadDist, targetLateral);

    const desiredHeading = Math.atan2(targetPt.x - rival.x, targetPt.z - rival.z);
    headingDiff = wrapAngle(desiredHeading - rival.heading);

    // Smooth steering authority proportional to cornering stability (with hairpin turn boost)
    const hairpinBoost = nearPeak > 0.018 ? 1.45 : 1.0;
    const maxTurnRate = (2.8 + ai.cornerSpeedFactor * 1.45) * hairpinBoost * dt;
    const turnDelta = Math.max(-maxTurnRate, Math.min(maxTurnRate, headingDiff * 5.6 * dt));
    rival.heading = wrapAngle(rival.heading + turnDelta);

    // Advance on 2D X-Z plane
    rival.x += Math.sin(rival.heading) * rival.speed * dt;
    rival.z += Math.cos(rival.heading) * rival.speed * dt;

    // Enforce 2D track boundaries
    proj = enforceTrackBounds(rival, track, dt, 1.2);
  }

  // Expressive AI drift visual on corners (configurable per rival)
  const speedKmh = rival.speed * MS_TO_KMH;
  const driftThreshold = ai.driftCurvatureThreshold ?? 0.0085;
  const driftSlip = ai.driftSlipRad ?? 0.34;
  const entryCurv = ai.fullThrottleCorners
    ? track.getUpcomingCurvature(rival.s, 0, 24).signedPeak
    : proj.curvature;
  const effectiveCurv = Math.abs(proj.curvature) >= Math.abs(entryCurv) ? proj.curvature : entryCurv;
  const aiDrifting = !ai.noDrift && !rival.inGutter && Math.abs(effectiveCurv) > driftThreshold && speedKmh > 52;
  rival.isDrifting = aiDrifting;
  rival.driftDir = aiDrifting ? Math.sign(effectiveCurv) : 0;

  const targetSlip = rival.inGutter
    ? 0
    : aiDrifting
      ? rival.driftDir * driftSlip
      : Math.max(-0.08, Math.min(0.08, headingDiff * 0.25));
  rival.visualSlip += (targetSlip - rival.visualSlip) * Math.min(1, dt * 8.5);
  rival.steerVisual += (Math.max(-1, Math.min(1, headingDiff * 2.2)) - rival.steerVisual) * Math.min(1, dt * 10);
  const targetRoll = rival.inGutter
    ? rival.gutterSide * 0.055
    : rival.driftDir * (aiDrifting ? 0.085 : 0.06);
  rival.bodyRoll += (targetRoll - rival.bodyRoll) * Math.min(1, dt * 9);

  // Rotary twin-turbo spool: charge through corner apex, fire boost on exit!
  if (turboCfg) {
    const absProjCurv = Math.abs(proj.curvature);
    if (absProjCurv > 0.0065) {
      rival.cornerExitCharge = Math.min(1.0, (rival.cornerExitCharge || 0) + dt * 1.45);
    } else if ((rival.cornerExitCharge || 0) >= 0.32 && absProjCurv < 0.0055) {
      rival.turboBoostTimer = turboCfg.boostDuration;
      rival.cornerExitCharge = 0;
    } else {
      rival.cornerExitCharge = Math.max(0, (rival.cornerExitCharge || 0) - dt * 0.6);
    }
  }

  updateDrivetrain(rival);
}
