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

  // Higher cornerSpeedFactor (e.g. Ryosuke 0.97) carries far more speed through hairpins
  const cornerSensitivity = 48 - ai.cornerSpeedFactor * 27;
  let targetSpeedKmh = ai.maxSpeedKmh / (1 + peakAbs * cornerSensitivity);

  // Clamp minimum hairpin crawl so rival always feels lively
  targetSpeedKmh = Math.max(76 + ai.cornerSpeedFactor * 28, targetSpeedKmh);

  // 2. Smooth Rubber-Banding (tapers off in final 130m sprint for fair finishes)
  const distToFinish = Math.max(0, track.finishS - rival.s);
  const finishFairness = Math.min(1, distToFinish / 130);
  const gap = rival.s - player.s; // >0 means rival is ahead, <0 means rival is behind

  let rubberMultiplier = 1.0;
  if (gap < -16) {
    // Rival is behind -> smooth catch-up boost
    const factor = Math.min(1, (-gap - 16) / 95);
    rubberMultiplier = 1 + ai.rubberBandCatchup * factor * finishFairness;
  } else if (gap > 30) {
    // Rival is far ahead -> mild mercy ease so battle stays exciting
    const factor = Math.min(1, (gap - 30) / 100);
    rubberMultiplier = 1 - ai.rubberBandEase * factor * finishFairness;
  }

  const desiredSpeedMs = targetSpeedKmh * rubberMultiplier * KMH_TO_MS;

  // 3. Longitudinal acceleration / braking toward desired speed
  rival.isBraking = false;
  if (rival.speed < desiredSpeedMs) {
    const ratio = Math.max(0, rival.speed / Math.max(1, desiredSpeedMs));
    const pull = ai.accel * (1.12 - 0.45 * ratio * ratio);
    rival.speed = Math.min(desiredSpeedMs, rival.speed + pull * dt);
  } else {
    const excess = rival.speed - desiredSpeedMs;
    if (excess > 4.5) rival.isBraking = true;
    rival.speed = Math.max(desiredSpeedMs, rival.speed - 28.0 * dt);
  }

  // 4. Target Waypoint & Racing Line Lateral Offset
  // Hug inside apex on sharp turns (turning left -> negative right offset)
  let targetLateral = ai.laneBias;
  if (Math.abs(signedPeak) > 0.0065) {
    const insideDir = signedPeak > 0 ? -1 : 1;
    targetLateral = insideDir * (track.maxCarLateral * 0.56);
  }

  // Polite lateral spacing when side-by-side with player
  const longDiff = Math.abs(rival.s - player.s);
  if (longDiff < 14) {
    const sideOffset = player.lateral > 0 ? -2.4 : 2.4;
    targetLateral = targetLateral * 0.45 + sideOffset * 0.55;
  }

  targetLateral = Math.max(
    -track.maxCarLateral * 0.78,
    Math.min(track.maxCarLateral * 0.78, targetLateral)
  );

  const lookAheadDist = ai.lookAheadBase + rival.speed * 0.34;
  const targetPt = track.getWorldPosition(rival.s + lookAheadDist, targetLateral);

  const desiredHeading = Math.atan2(targetPt.x - rival.x, targetPt.z - rival.z);
  const headingDiff = wrapAngle(desiredHeading - rival.heading);

  // Smooth steering authority proportional to cornering stability
  const maxTurnRate = (2.6 + ai.cornerSpeedFactor * 1.35) * dt;
  const turnDelta = Math.max(-maxTurnRate, Math.min(maxTurnRate, headingDiff * 4.8 * dt));
  rival.heading = wrapAngle(rival.heading + turnDelta);

  // Advance on 2D X-Z plane
  rival.x += Math.sin(rival.heading) * rival.speed * dt;
  rival.z += Math.cos(rival.heading) * rival.speed * dt;

  // Enforce 2D track boundaries
  const proj = enforceTrackBounds(rival, track, 0.9);

  // Expressive AI drift visual on tight hairpins
  const speedKmh = rival.speed * MS_TO_KMH;
  const absCurv = Math.abs(proj.curvature);
  const aiDrifting = absCurv > 0.0085 && speedKmh > 86;
  rival.isDrifting = aiDrifting;
  rival.driftDir = aiDrifting ? Math.sign(proj.curvature) : 0;

  const targetSlip = aiDrifting ? rival.driftDir * 0.34 : Math.max(-0.08, Math.min(0.08, headingDiff * 0.25));
  rival.visualSlip += (targetSlip - rival.visualSlip) * Math.min(1, dt * 8);
  rival.steerVisual += (Math.max(-1, Math.min(1, headingDiff * 2.2)) - rival.steerVisual) * Math.min(1, dt * 10);
  rival.bodyRoll += (rival.driftDir * 0.06 - rival.bodyRoll) * Math.min(1, dt * 9);

  updateDrivetrain(rival);
}
