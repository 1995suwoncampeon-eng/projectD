import { PLAYER_PHYSICS } from './config.js?v=45';
import { wrapAngle } from './track.js';
import { enforceTrackBounds, updateDrivetrain } from './physics.js?v=48';

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

/**
 * Waypoint-following Rival AI with cornering anticipation, racing-line apex
 * hugging, and smooth rubber-banding to sustain tense 1v1 touge battles.
 */
export function updateRivalAI(rival, player, rivalConfig, track, dt) {
  const baseAi = rivalConfig.ai;
  const p2 = baseAi.phase2;
  const inPhase2 = Boolean(p2 && (rival.z <= (p2.triggerZ ?? -925) || player.z <= (p2.triggerZ ?? -925)));
  const ai = inPhase2 ? { ...baseAi, ...p2 } : baseAi;

  // 1. Inspect upcoming curvature to calculate smooth cornering speed target
  // Tighter 68m lookahead keeps NPCs on full throttle longer and prevents sluggish corner exits
  const { peakAbs, signedPeak } = track.getUpcomingCurvature(rival.s, 8, 68);
  const entryPt = track.getPointAtS(rival.s);

  // Rotary / turbo corner-exit boost timer decay
  if (rival.turboBoostTimer > 0) {
    rival.turboBoostTimer = Math.max(0, rival.turboBoostTimer - dt);
  }
  const turboCfg = ai.twinTurboBoost || null;
  const turboActive = Boolean(turboCfg && rival.turboBoostTimer > 0);

  let targetSpeedKmh;
  let hardBrakingEntry = false;
  let godFootPhase = 'grip'; // 'grip' | 'hairpin_out_sprint' | 'hairpin_spin_turn'
  let godFootHairpinSign = 0;
  let jhyMode = 'straight'; // 'straight' | 'high_speed_drift' | 'gutter_hairpin'

  if (ai.fullThrottleCorners) {
    // Full throttle through every corner — never lifts off the accelerator
    targetSpeedKmh = ai.maxSpeedKmh;
  } else if (ai.jhyGodStyle) {
    // JHY (GOD) hybrid touge mastery:
    // - Mid-to-high speed corners (0.006 <= |curv| < gutterMinCurv): faster-than-gutter inside-apex power drift!
    // - Low-to-mid speed tight hairpins (|curv| >= gutterMinCurv): precision drainage gutter run!
    const gutterMinCurv = ai.gutterMinCurvature ?? 0.024;
    const shortAhead = track.getUpcomingCurvature(rival.s, 4, 42);
    const curAbs = Math.abs(entryPt.curvature);
    const effectiveCornerAbs = Math.max(curAbs, shortAhead.peakAbs);

    if (effectiveCornerAbs >= gutterMinCurv) {
      jhyMode = 'gutter_hairpin';
      const minCrawl = ai.maxSpeedKmh * (ai.minCornerSpeedRatio ?? 0.86);
      targetSpeedKmh = Math.max(minCrawl, ai.maxSpeedKmh / (1 + effectiveCornerAbs * 4.5));
    } else if (effectiveCornerAbs >= 0.0065) {
      jhyMode = 'high_speed_drift';
      // Carries MORE speed through mid-high speed corners than a gutter run via inside-apex drift!
      targetSpeedKmh = ai.maxSpeedKmh + (ai.highSpeedDriftBonusKmh ?? 8);
    } else {
      jhyMode = 'straight';
      targetSpeedKmh = ai.maxSpeedKmh;
    }
  } else if (ai.godFootStyle) {
    // Kozo Hoshino ("God Foot") style:
    // - Regular corners: aggressive late-brake & hard-throttle grip driving
    // - 5-consecutive hairpins (z in -930..-1150): sprint on the OUTSIDE, then slam brakes & spin-turn INSIDE!
    const in5HairpinZone = rival.z < -930 && rival.z > -1150;
    const immediateAhead = track.getUpcomingCurvature(rival.s, 6, 46);
    const hairpinAhead = track.getUpcomingCurvature(rival.s, 14, 72);
    const curAbs = Math.abs(entryPt.curvature);

    if (in5HairpinZone && (curAbs > 0.022 || immediateAhead.peakAbs > 0.032)) {
      // Phase 2: Hard brake and snap spin-turn into the inside apex
      godFootPhase = 'hairpin_spin_turn';
      godFootHairpinSign = curAbs > 0.022 ? Math.sign(entryPt.curvature) : Math.sign(immediateAhead.signedPeak);
      hardBrakingEntry = true;
      targetSpeedKmh = curAbs > 0.028 ? 58 : 52;
    } else if (in5HairpinZone && hairpinAhead.peakAbs > 0.032) {
      // Phase 1: Sprint hard along the outside line approaching the hairpin
      godFootPhase = 'hairpin_out_sprint';
      godFootHairpinSign = Math.sign(hairpinAhead.signedPeak);
      targetSpeedKmh = Math.min(ai.maxSpeedKmh, 122);
    } else {
      // Regular corners: aggressive late-brake & full-throttle grip
      const inCornerNow = curAbs >= 0.0085;
      const oppositeAhead =
        immediateAhead.peakAbs > 0.011 &&
        Math.sign(immediateAhead.signedPeak) !== Math.sign(entryPt.curvature);
      if (inCornerNow && !oppositeAhead) {
        targetSpeedKmh = ai.maxSpeedKmh;
      } else if (immediateAhead.peakAbs > 0.009) {
        hardBrakingEntry = true;
        targetSpeedKmh = Math.max(54, ai.maxSpeedKmh / (1 + immediateAhead.peakAbs * 30));
      } else {
        targetSpeedKmh = ai.maxSpeedKmh;
      }
    }
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

  if (turboCfg?.stackPermanent) {
    targetSpeedKmh += rival.stackedTurboKmh || 0;
  } else if (turboActive) {
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
  // Uses the 5-speed gear torque & NA powerband curve with immediate clutch-kick launch
  // so NPCs never bog down or feel late on the throttle off the line.
  if (rival.shiftCutTimer > 0) {
    rival.shiftCutTimer = Math.max(0, rival.shiftCutTimer - dt);
  }
  rival.isBraking = false;
  if (rival.speed < desiredSpeedMs) {
    const curKmh = rival.speed * MS_TO_KMH;
    const speedRatio = Math.max(0, rival.speed / Math.max(1, desiredSpeedMs));
    const gears = PLAYER_PHYSICS.gears;
    const activeGear = gears[Math.max(0, Math.min(gears.length - 1, rival.gearIndex ?? 0))];
    const rpmNorm = Math.max(0, Math.min(1, ((rival.rpm ?? 1200) - 1200) / 7300));
    const rawPowerband = 0.78 + 0.36 * Math.sin(rpmNorm * Math.PI * 0.86);
    // Immediate launch bite (0..45 km/h) so NPC never feels late hitting the gas at GO!
    const powerband = curKmh < 45 ? Math.max(0.98, rawPowerband) : rawPowerband;
    const shiftMult = rival.shiftCutTimer > 0 ? 0.35 : 1.0;
    const accelMult = turboActive ? turboCfg.boostAccelMult : 1.0;
    const highSpeedMult =
      ai.highSpeedDropKmh && curKmh >= ai.highSpeedDropKmh
        ? (ai.highSpeedAccelScale ?? 0.14)
        : 1.0;
    const aeroDrag = 0.52 * speedRatio * speedRatio;
    const pull = Math.max(
      0.15,
      (ai.accel * activeGear.torqueMult * powerband * shiftMult * accelMult - aeroDrag) * highSpeedMult
    );
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
  // For jhyGodStyle, only engage drainage gutter on low-to-mid speed tight corners (hairpins);
  // on mid-to-high speed corners, JHY takes a faster inside-apex power drift instead!
  const allowGutterNow = ai.useGutterRun && (!ai.jhyGodStyle || jhyMode === 'gutter_hairpin');
  const aheadGutterPt = allowGutterNow
    ? track.getPointAtS(Math.min(track.totalLength, rival.s + 18))
    : null;
  const activeGutterSide = allowGutterNow
    ? (curPt.gutterSide || (aheadGutterPt ? aheadGutterPt.gutterSide : 0))
    : 0;

  const apexRatio = ai.apexRatio ?? 0.56;
  const maxLatRatio = ai.maxLateralRatio ?? 0.78;
  const nearCurv = (ai.fullThrottleCorners || ai.jhyGodStyle)
    ? track.getUpcomingCurvature(rival.s, 4, 48)
    : { peakAbs, signedPeak };
  const curveThreshold = (ai.fullThrottleCorners || ai.jhyGodStyle) ? 0.0035 : 0.0065;

  // Check if player is currently side-by-side and blocking the inside/gutter lane
  const longDiff = Math.abs(rival.s - player.s);
  const sideBySide = longDiff < 5.6;
  const sideClearance = 2.35; // Minimum center-to-center lateral gap when side-by-side
  const gutterSideNow = curPt.gutterSide || (aheadGutterPt ? aheadGutterPt.gutterSide : 0);
  const playerBlocksGutter =
    longDiff < 6.4 &&
    gutterSideNow !== 0 &&
    (player.inGutter || player.lateral * gutterSideNow >= rival.lateral * gutterSideNow - 0.55);

  // If player is blocking the inside lane, AI cannot clip through to take the gutter!
  const effectiveGutterSide = playerBlocksGutter ? 0 : activeGutterSide;

  let targetLateral = ai.laneBias;
  if (effectiveGutterSide !== 0) {
    // Line up directly with the inside drainage gutter for gutter-run cornering
    targetLateral = effectiveGutterSide * gutterRailLat;
  } else if (ai.godFootStyle && godFootPhase === 'hairpin_out_sprint' && godFootHairpinSign !== 0) {
    // Swing wide to the OUTSIDE while sprinting into the 5-consecutive hairpin
    const outsideDir = godFootHairpinSign > 0 ? 1 : -1;
    targetLateral = outsideDir * (track.maxCarLateral * 0.80);
  } else if (ai.godFootStyle && godFootPhase === 'hairpin_spin_turn' && godFootHairpinSign !== 0) {
    // Snap sharply to the INSIDE apex for the spin-turn
    const insideDir = godFootHairpinSign > 0 ? -1 : 1;
    targetLateral = insideDir * (track.maxCarLateral * 0.84);
  } else if (ai.ffCorneringStyle) {
    // FF (Front-Wheel Drive) cornering line:
    // 1) Sharp lift-off tuck-in toward inside apex on corner entry
    // 2) Power-on understeer pushing smoothly toward the outside on corner exit
    const shortAhead = track.getUpcomingCurvature(rival.s, 6, 34);
    const curAbs = Math.abs(curPt.curvature);
    const exitingCorner = curAbs > 0.008 && shortAhead.peakAbs < curAbs * 0.82;
    if (exitingCorner) {
      const outsideDir = curPt.curvature > 0 ? 1 : -1;
      targetLateral = outsideDir * (track.maxCarLateral * 0.68);
    } else if (Math.abs(nearCurv.signedPeak) > curveThreshold) {
      const insideDir = nearCurv.signedPeak > 0 ? -1 : 1;
      targetLateral = insideDir * (track.maxCarLateral * apexRatio);
    }
  } else if (Math.abs(nearCurv.signedPeak) > curveThreshold) {
    const insideDir = nearCurv.signedPeak > 0 ? -1 : 1;
    targetLateral = insideDir * (track.maxCarLateral * apexRatio);
  }

  // Respect player's physical side-by-side blocking: AI cannot target across the player's body
  if (sideBySide) {
    if (rival.lateral >= player.lateral && targetLateral < player.lateral + sideClearance) {
      targetLateral = player.lateral + sideClearance;
    } else if (rival.lateral < player.lateral && targetLateral > player.lateral - sideClearance) {
      targetLateral = player.lateral - sideClearance;
    }
  } else if (
    longDiff < 14 &&
    effectiveGutterSide === 0 &&
    !((ai.fullThrottleCorners || ai.jhyGodStyle) && Math.abs(nearCurv.signedPeak) > curveThreshold)
  ) {
    const sideOffset = player.lateral > 0 ? -2.4 : 2.4;
    targetLateral = targetLateral * 0.45 + sideOffset * 0.55;
  }

  const latClamp = effectiveGutterSide !== 0
    ? Math.max(gutterRailLat, track.maxCarLateral * maxLatRatio)
    : track.maxCarLateral * maxLatRatio;
  targetLateral = Math.max(-latClamp, Math.min(latClamp, targetLateral));

  // Decay AI gutter exit cooldown
  if (rival.gutterCooldown > 0) {
    rival.gutterCooldown = Math.max(0, rival.gutterCooldown - dt);
  }

  // Engage / release gutter hook for gutter-run rivals (blocked if player occupies the inside lane!)
  if (allowGutterNow) {
    if (rival.inGutter) {
      if (curPt.gutterSide !== rival.gutterSide || rival.speed < 2.0) {
        rival.inGutter = false;
        rival.gutterSide = 0;
        rival.gutterCooldown = 0.45;
      }
    } else if (
      !playerBlocksGutter &&
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
  } else if (ai.fullThrottleCorners || (ai.jhyGodStyle && jhyMode === 'high_speed_drift')) {
    // Spline-guided inside-apex tracking with physically bounded lateral dive speed
    // and 2D speed conservation (prevents unnatural sideways teleporting in S-bends).
    const latFollow = 1 - Math.exp(-dt * (ai.jhyGodStyle ? 3.4 : 4.2));
    const desiredLat = Math.max(
      -track.maxCarLateral * maxLatRatio,
      Math.min(track.maxCarLateral * maxLatRatio, targetLateral)
    );
    const rawLatDelta = (desiredLat - rival.lateral) * latFollow;
    const maxLatSpeed = Math.max(4.5, rival.speed * 0.32); // Realistic max ~18 deg lateral cut-in angle
    const maxLatStep = maxLatSpeed * dt;
    const clampedLatDelta = Math.max(-maxLatStep, Math.min(maxLatStep, rawLatDelta));
    const nextLat = Math.max(
      -track.maxCarLateral * maxLatRatio,
      Math.min(track.maxCarLateral * maxLatRatio, rival.lateral + clampedLatDelta)
    );
    const actualLatDelta = nextLat - rival.lateral;

    // Conserve total 2D travel distance: diagonal cut-in trades forward distance for lateral movement
    const totalStep = rival.speed * dt;
    const forwardStep = Math.sqrt(Math.max(totalStep * totalStep * 0.36, totalStep * totalStep - actualLatDelta * actualLatDelta));
    // Inside of a turn has a shorter physical arc length: ds_world = ds_center * (1 + k * lat)
    const arcScale = Math.max(0.75, Math.min(1.25, 1 + curPt.curvature * nextLat));
    const nextS = Math.min(track.totalLength, rival.s + forwardStep / arcScale);
    const nextPt = track.getWorldPosition(nextS, nextLat);
    const moveDx = nextPt.x - rival.x;
    const moveDz = nextPt.z - rival.z;
    if (moveDx * moveDx + moveDz * moveDz > 1e-6) {
      const targetHeading = Math.atan2(moveDx, moveDz);
      headingDiff = wrapAngle(targetHeading - rival.heading);
      rival.heading = wrapAngle(rival.heading + headingDiff * Math.min(1, dt * 12));
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

    // Smooth steering authority proportional to cornering stability (with hairpin & agile-car turn boost)
    const hairpinBoost = nearPeak > 0.018 ? 1.45 : 1.0;
    const turnMult = ai.turnRateMult ?? 1.0;
    const maxTurnRate = (2.8 + ai.cornerSpeedFactor * 1.45) * hairpinBoost * turnMult * dt;
    const turnDelta = Math.max(-maxTurnRate, Math.min(maxTurnRate, headingDiff * 5.6 * turnMult * dt));
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
  const isGodFootSpinTurn = ai.godFootStyle && godFootPhase === 'hairpin_spin_turn';
  const isJhyHighSpeedDrift = ai.jhyGodStyle && jhyMode === 'high_speed_drift';
  const driftSlip = isGodFootSpinTurn ? 0.56 : (ai.driftSlipRad ?? 0.34);
  const entryCurv = (ai.fullThrottleCorners || ai.jhyGodStyle)
    ? track.getUpcomingCurvature(rival.s, 0, 24).signedPeak
    : proj.curvature;
  const effectiveCurv = Math.abs(proj.curvature) >= Math.abs(entryCurv) ? proj.curvature : entryCurv;
  const aiDrifting = ai.godFootStyle
    ? isGodFootSpinTurn && speedKmh > 32
    : isJhyHighSpeedDrift
      ? !rival.inGutter && Math.abs(effectiveCurv) > 0.0055 && speedKmh > 55
      : !ai.noDrift && !rival.inGutter && Math.abs(effectiveCurv) > driftThreshold && speedKmh > 52;
  rival.isDrifting = aiDrifting;
  rival.driftDir = aiDrifting
    ? (isGodFootSpinTurn && godFootHairpinSign !== 0 ? godFootHairpinSign : Math.sign(effectiveCurv))
    : 0;

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
      if (turboCfg.stackPermanent) {
        rival.stackedTurboKmh = (rival.stackedTurboKmh || 0) + turboCfg.boostKmh;
      }
    } else {
      rival.cornerExitCharge = Math.max(0, (rival.cornerExitCharge || 0) - dt * 0.6);
    }
  }

  updateDrivetrain(rival);
}
