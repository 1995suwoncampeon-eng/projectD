import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  MODEL_ROTATION_Y,
  PLAYER_MODEL_PATH,
  RIVAL_MODEL_PATH,
  TARGET_CAR_WIDTH,
  PLAYER_THEME,
} from './config.js';

// Re-export orientation & path constants at top of module for quick tuning
export { MODEL_ROTATION_Y, PLAYER_MODEL_PATH, RIVAL_MODEL_PATH, TARGET_CAR_WIDTH };

const sharedLoader = new GLTFLoader();

/**
 * Normalizes a loaded GLTF scene using THREE.Box3 so its width matches
 * TARGET_CAR_WIDTH and its tires rest flush on the road plane (y = 0).
 */
export function normalizeLoadedModel(gltfScene, rotationY = MODEL_ROTATION_Y, targetWidth = TARGET_CAR_WIDTH) {
  const pivot = new THREE.Group();
  pivot.name = 'NormalizedGLBCar';

  gltfScene.rotation.y = rotationY;
  pivot.add(gltfScene);
  pivot.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(pivot);
  const initialSize = new THREE.Vector3();
  initialBox.getSize(initialSize);

  const measuredWidth = initialSize.x > 1e-4 ? initialSize.x : initialSize.z * 0.48;
  const scaleFactor = measuredWidth > 1e-4 ? targetWidth / measuredWidth : 1;
  gltfScene.scale.multiplyScalar(scaleFactor);
  pivot.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(pivot);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  // Center on X/Z and place bottom flush at Y = 0
  gltfScene.position.x -= center.x;
  gltfScene.position.z -= center.z;
  gltfScene.position.y -= scaledBox.min.y;
  pivot.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(pivot);
  const finalSize = new THREE.Vector3();
  finalBox.getSize(finalSize);

  return { pivot, size: finalSize };
}

/**
 * Builds a clean low-poly 3D arcade sports car facing +Z (width ~2.15m, length ~4.45m).
 * Includes headlights, brake-reactive taillights, cabin, GT spoiler, and spinning/steering wheels.
 */
export function createFallbackSportsCar({ isPlayer = true, bodyColor = 0xf8fafc, accentColor = 0x38bdf8 } = {}) {
  const car = new THREE.Group();
  car.name = isPlayer ? 'FallbackPlayerCar' : 'FallbackRivalCar';

  const bodyMat = new THREE.MeshLambertMaterial({
    color: bodyColor,
  });

  const trimMat = new THREE.MeshLambertMaterial({
    color: isPlayer ? PLAYER_THEME.lowerTrimColor : 0x111827,
  });

  const glassMat = new THREE.MeshLambertMaterial({
    color: 0x0f172a,
    emissive: 0x0a192f,
    emissiveIntensity: 0.35,
  });

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfefce8 });
  const taillightMat = new THREE.MeshLambertMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.35,
  });

  // 1. Lower aero skirt / chassis base (AE86 panda black lower half for player)
  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.34, 4.38), trimMat);
  lowerBody.position.set(0, 0.42, 0);
  car.add(lowerBody);

  // 2. Main upper body shell
  const upperBody = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.36, 4.24), bodyMat);
  upperBody.position.set(0, 0.72, -0.02);
  car.add(upperBody);

  // 3. Sculpted hood slope
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.14, 1.48), bodyMat);
  hood.position.set(0, 0.9, 1.2);
  hood.rotation.x = 0.08;
  car.add(hood);

  // 4. Cabin & greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.48, 1.92), bodyMat);
  cabin.position.set(0, 1.12, -0.26);
  car.add(cabin);

  // Front windshield
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.1), glassMat);
  windshield.position.set(0, 1.11, 0.7);
  windshield.rotation.x = -0.58;
  car.add(windshield);

  // Rear window
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.38, 0.1), glassMat);
  rearGlass.position.set(0, 1.11, -1.22);
  rearGlass.rotation.x = 0.62;
  car.add(rearGlass);

  // Side windows
  const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.34, 1.46), glassMat);
  sideGlass.position.set(0, 1.13, -0.26);
  car.add(sideGlass);

  // 5. Rear GT Wing / Spoiler
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.07, 0.34), trimMat);
  wingBlade.position.set(0, 1.14, -2.02);
  wingBlade.rotation.x = 0.09;
  car.add(wingBlade);

  const strutGeo = new THREE.BoxGeometry(0.08, 0.24, 0.16);
  for (const sx of [-0.62, 0.62]) {
    const strut = new THREE.Mesh(strutGeo, trimMat);
    strut.position.set(sx, 1.0, -2.0);
    car.add(strut);
  }

  // 6. Front splitter & racing stripe accent
  const frontLip = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.1, 0.35), trimMat);
  frontLip.position.set(0, 0.24, 2.15);
  car.add(frontLip);

  const sideStripeMat = new THREE.MeshBasicMaterial({ color: accentColor });
  for (const sx of [-1.03, 1.03]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 3.6), sideStripeMat);
    stripe.position.set(sx, 0.6, 0);
    car.add(stripe);
  }

  // 7. Headlights (+Z front)
  const headGeo = new THREE.BoxGeometry(0.46, 0.15, 0.08);
  for (const hx of [-0.66, 0.66]) {
    const hl = new THREE.Mesh(headGeo, headlightMat);
    hl.position.set(hx, 0.72, 2.14);
    car.add(hl);
  }

  // Front grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.06), trimMat);
  grille.position.set(0, 0.5, 2.2);
  car.add(grille);

  // 8. Taillights (-Z rear)
  const tailGeo = new THREE.BoxGeometry(0.56, 0.16, 0.08);
  for (const tx of [-0.64, 0.64]) {
    const tl = new THREE.Mesh(tailGeo, taillightMat);
    tl.position.set(tx, 0.74, -2.18);
    car.add(tl);
  }

  // Dual exhaust tips
  const exhaustGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.24, 8);
  exhaustGeo.rotateX(Math.PI / 2);
  const exhaustMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1 });
  for (const ex of [-0.52, -0.34]) {
    const pipe = new THREE.Mesh(exhaustGeo, exhaustMat);
    pipe.position.set(ex, 0.28, -2.22);
    car.add(pipe);
  }

  // 9. Four Wheels (Front wheels pivot for steering; all wheels spin)
  const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x0f1116 });

  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.3, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshLambertMaterial({
    color: isPlayer ? 0xe2e8f0 : 0xfacc15,
  });

  const wheelDefs = [
    { x: -1.0, z: 1.32, isFront: true },
    { x: 1.0, z: 1.32, isFront: true },
    { x: -1.0, z: -1.32, isFront: false },
    { x: 1.0, z: -1.32, isFront: false },
  ];

  const frontPivots = [];
  const spinMeshes = [];

  for (const def of wheelDefs) {
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(def.x, 0.35, def.z);

    const spinGroup = new THREE.Group();
    spinGroup.add(new THREE.Mesh(tireGeo, tireMat));
    spinGroup.add(new THREE.Mesh(rimGeo, rimMat));
    wheelPivot.add(spinGroup);

    car.add(wheelPivot);
    if (def.isFront) frontPivots.push(wheelPivot);
    spinMeshes.push(spinGroup);
  }

  return {
    mesh: car,
    bodyMat,
    sideStripeMat,
    taillightMat,
    frontPivots,
    spinMeshes,
    size: new THREE.Vector3(2.15, 1.36, 4.45),
  };
}

// Cached procedural textures shared across all car instances (zero per-frame cost)
let _contactShadowTex = null;
let _headlightBeamTex = null;
let _softGlowTex = null;

function getContactShadowTexture() {
  if (_contactShadowTex) return _contactShadowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 128, 18, 64, 128, 118);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.save();
  ctx.scale(0.56, 1.0);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.restore();
  _contactShadowTex = new THREE.CanvasTexture(c);
  return _contactShadowTex;
}

function getHeadlightBeamTexture() {
  if (_headlightBeamTex) return _headlightBeamTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  // Dual overlapping warm headlight pools fanning out forward (+Z)
  for (const cx of [92, 164]) {
    const grad = ctx.createRadialGradient(cx, 232, 6, cx, 130, 140);
    grad.addColorStop(0.0, 'rgba(255, 251, 214, 0.72)');
    grad.addColorStop(0.32, 'rgba(254, 243, 176, 0.34)');
    grad.addColorStop(0.7, 'rgba(254, 243, 176, 0.10)');
    grad.addColorStop(1.0, 'rgba(254, 243, 176, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  _headlightBeamTex = new THREE.CanvasTexture(c);
  _headlightBeamTex.colorSpace = THREE.SRGBColorSpace;
  return _headlightBeamTex;
}

function getSoftGlowTexture() {
  if (_softGlowTex) return _softGlowTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _softGlowTex = new THREE.CanvasTexture(c);
  return _softGlowTex;
}

/**
 * Adds lightweight baked-texture car lighting (road headlight beam pool,
 * soft taillight glow, subtle underglow, and grounded contact shadow).
 * Zero real-time PointLight/SpotLight overhead for smooth low-end performance.
 */
function attachArcadeLights(root, { isPlayer, accentColor, carSize }) {
  const halfLen = Math.max(1.8, carSize.z * 0.5);
  const halfWid = Math.max(0.85, carSize.x * 0.42);

  // 1. Grounded contact shadow (works in both Day and Night for solid road grip look)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(carSize.x * 1.38, carSize.z * 1.18),
    shadowMat
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.032;
  root.add(contactShadow);

  // 2. Baked soft headlight road projection pool (+Z forward, replaces costly real-time SpotLight)
  const beamMat = new THREE.MeshBasicMaterial({
    map: getHeadlightBeamTexture(),
    transparent: true,
    opacity: isPlayer ? 0.55 : 0.36,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const roadBeam = new THREE.Mesh(
    new THREE.PlaneGeometry(isPlayer ? 8.6 : 6.8, isPlayer ? 24.0 : 18.0),
    beamMat
  );
  roadBeam.rotation.x = -Math.PI / 2;
  roadBeam.position.set(0, 0.048, halfLen + (isPlayer ? 11.4 : 8.5));
  root.add(roadBeam);
  const headlightBeams = [roadBeam];

  // 3. Rear taillight soft halo glow sprites (reacts to braking)
  const tailGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    map: getSoftGlowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const tailGlowGeo = new THREE.PlaneGeometry(0.9, 0.46);
  for (const tx of [-halfWid * 0.68, halfWid * 0.68]) {
    const glow = new THREE.Mesh(tailGlowGeo, tailGlowMat);
    glow.position.set(tx, 0.72, -halfLen - 0.08);
    glow.rotation.y = Math.PI;
    root.add(glow);
  }

  // 4. Soft radial underglow on asphalt for night readability
  const underglowMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    map: getSoftGlowTexture(),
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(carSize.x * 1.55, carSize.z * 1.2),
    underglowMat
  );
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.042;
  root.add(underglow);

  return { headlightBeams, tailGlowMat, underglow, underglowMat, headlightSpot: null };
}

/**
 * Loads a 3D car via GLTFLoader with Box3 auto-normalization and automatic fallback
 * to a low-poly 3D sports car if the .glb file is absent or fails to load.
 */
export async function loadCarModel({
  path,
  rotationY = MODEL_ROTATION_Y,
  targetWidth = TARGET_CAR_WIDTH,
  isPlayer = true,
  bodyColor = 0xf8fafc,
  accentColor = 0x38bdf8,
}) {
  const root = new THREE.Group();
  root.name = isPlayer ? 'PlayerCarRoot' : 'RivalCarRoot';

  // Inner body group allows visual drift yaw slip & body roll independently of heading
  const visualBody = new THREE.Group();
  root.add(visualBody);

  let isFallback = false;
  let fallbackRefs = null;
  let carSize = new THREE.Vector3(targetWidth, 1.35, 4.4);

  try {
    if (!path) {
      throw new Error('No model path specified');
    }
    const gltf = await new Promise((resolve, reject) => {
      sharedLoader.load(path, resolve, undefined, reject);
    });
    const normalized = normalizeLoadedModel(gltf.scene, rotationY, targetWidth);
    visualBody.add(normalized.pivot);
    carSize = normalized.size;
  } catch (_err) {
    // Graceful silent fallback when custom .glb is not yet placed in assets/models/
    isFallback = true;
    fallbackRefs = createFallbackSportsCar({ isPlayer, bodyColor, accentColor });
    visualBody.add(fallbackRefs.mesh);
    carSize = fallbackRefs.size;
  }

  const lightRefs = attachArcadeLights(visualBody, { isPlayer, accentColor, carSize });
  let isDayMode = false;

  return {
    root,
    visualBody,
    isFallback,
    size: carSize,
    setTimeOfDay(mode) {
      isDayMode = mode === 'day';
      for (const beam of lightRefs.headlightBeams) {
        beam.visible = !isDayMode;
      }
      lightRefs.underglow.visible = !isDayMode;
      if (lightRefs.headlightSpot) {
        lightRefs.headlightSpot.intensity = isDayMode ? 0 : 95;
      }
    },
    setColors(newBodyColor, newAccentColor) {
      if (fallbackRefs) {
        fallbackRefs.bodyMat.color.set(newBodyColor);
        fallbackRefs.sideStripeMat.color.set(newAccentColor ?? newBodyColor);
      }
      lightRefs.underglowMat.color.set(newAccentColor ?? newBodyColor);
    },
    setBrakeIntensity(intensity) {
      const clamped = Math.max(0, Math.min(1, intensity));
      const baseOpacity = isDayMode ? 0.08 : 0.36;
      lightRefs.tailGlowMat.opacity = baseOpacity + clamped * (isDayMode ? 0.48 : 0.56);
      if (fallbackRefs) {
        fallbackRefs.taillightMat.emissiveIntensity = (isDayMode ? 0.45 : 1.2) + clamped * 2.4;
      }
    },
    updateWheelAnimation(steerRad, distanceMeters) {
      if (!fallbackRefs) return;
      for (const pivot of fallbackRefs.frontPivots) {
        pivot.rotation.y = steerRad * 0.45;
      }
      const spinDelta = distanceMeters / 0.35;
      for (const wheel of fallbackRefs.spinMeshes) {
        wheel.rotation.x += spinDelta;
      }
    },
  };
}
