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

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.32,
    metalness: 0.42,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? PLAYER_THEME.lowerTrimColor : 0x111827,
    roughness: 0.65,
    metalness: 0.25,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.85,
  });

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfefce8 });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0xef4444,
    emissiveIntensity: 1.35,
    roughness: 0.25,
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
  const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.2 });
  for (const ex of [-0.52, -0.34]) {
    const pipe = new THREE.Mesh(exhaustGeo, exhaustMat);
    pipe.position.set(ex, 0.28, -2.22);
    car.add(pipe);
  }

  // 9. Four Wheels (Front wheels pivot for steering; all wheels spin)
  const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.9 });

  const rimGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.3, 10);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xe2e8f0 : 0xfacc15,
    metalness: 0.75,
    roughness: 0.25,
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

/**
 * Adds common night-touge arcade attachments (road headlight beams, rear taillight glow,
 * subtle underglow) around either a loaded GLB car or the fallback sports car.
 */
function attachArcadeLights(root, { isPlayer, accentColor, carSize }) {
  const halfLen = Math.max(1.8, carSize.z * 0.5);
  const halfWid = Math.max(0.85, carSize.x * 0.42);

  // Subtle projected headlight cones on the road ahead (+Z)
  const beamGeo = new THREE.ConeGeometry(2.6, 15.0, 12, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef9c3,
    transparent: true,
    opacity: isPlayer ? 0.13 : 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  for (const hx of [-halfWid * 0.62, halfWid * 0.62]) {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(hx, 0.55, halfLen + 7.2);
    beam.scale.set(1.0, 0.22, 1.0);
    root.add(beam);
  }

  // Rear taillight halo glow sprites (reacts to braking)
  const tailGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff2a2a,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const tailGlowGeo = new THREE.PlaneGeometry(0.65, 0.32);
  for (const tx of [-halfWid * 0.68, halfWid * 0.68]) {
    const glow = new THREE.Mesh(tailGlowGeo, tailGlowMat);
    glow.position.set(tx, 0.72, -halfLen - 0.08);
    glow.rotation.y = Math.PI;
    root.add(glow);
  }

  // Subtle underglow on asphalt so both cars remain razor-clear in dark hairpins
  const underglowMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const underglow = new THREE.Mesh(
    new THREE.PlaneGeometry(carSize.x * 1.15, carSize.z * 0.98),
    underglowMat
  );
  underglow.rotation.x = -Math.PI / 2;
  underglow.position.y = 0.04;
  root.add(underglow);

  // Real spotlight attached to player car for authentic midnight touge illumination
  let headlightSpot = null;
  if (isPlayer) {
    headlightSpot = new THREE.SpotLight(0xfff7d6, 95, 58, Math.PI / 4.2, 0.65, 1.4);
    headlightSpot.position.set(0, 1.05, halfLen - 0.1);
    const target = new THREE.Object3D();
    target.position.set(0, 0.1, halfLen + 26);
    root.add(target);
    headlightSpot.target = target;
    root.add(headlightSpot);
  }

  return { tailGlowMat, underglowMat, headlightSpot };
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

  return {
    root,
    visualBody,
    isFallback,
    size: carSize,
    setColors(newBodyColor, newAccentColor) {
      if (fallbackRefs) {
        fallbackRefs.bodyMat.color.set(newBodyColor);
        fallbackRefs.sideStripeMat.color.set(newAccentColor ?? newBodyColor);
      }
      lightRefs.underglowMat.color.set(newAccentColor ?? newBodyColor);
    },
    setBrakeIntensity(intensity) {
      const clamped = Math.max(0, Math.min(1, intensity));
      lightRefs.tailGlowMat.opacity = 0.36 + clamped * 0.56;
      if (fallbackRefs) {
        fallbackRefs.taillightMat.emissiveIntensity = 1.2 + clamped * 2.4;
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
