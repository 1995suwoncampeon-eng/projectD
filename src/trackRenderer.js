import * as THREE from 'three';

/**
 * Generates procedural asphalt texture on an offscreen canvas (no external images required).
 */
function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#1b1f2a';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle tire wear lanes
  const grad = ctx.createLinearGradient(0, 0, 256, 0);
  grad.addColorStop(0.0, 'rgba(10, 12, 18, 0.35)');
  grad.addColorStop(0.22, 'rgba(38, 44, 58, 0.25)');
  grad.addColorStop(0.5, 'rgba(16, 20, 28, 0.15)');
  grad.addColorStop(0.78, 'rgba(38, 44, 58, 0.25)');
  grad.addColorStop(1.0, 'rgba(10, 12, 18, 0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Fine mineral grain for strong sense of speed
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 22 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 12}, 0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 220);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a glowing overhead banner texture for START / FINISH gantries.
 */
function createBannerTexture(label, bgHex, stripeHex, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 512, 128);

  // Checkered or hazard edges
  const sq = 16;
  for (let x = 0; x < 512; x += sq) {
    ctx.fillStyle = (x / sq) % 2 === 0 ? stripeHex : '#090d16';
    ctx.fillRect(x, 0, sq, 18);
    ctx.fillRect(x, 110, sq, 18);
  }

  ctx.fillStyle = accentHex;
  ctx.font = 'italic 900 44px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 256, 66);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a road ribbon geometry between lateralOffsetMin and lateralOffsetMax at height y.
 */
function buildRibbonGeometry(samples, leftOffset, rightOffset, y, uvScaleV = 0.12) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const normals = new Float32Array(n * 2 * 3);
  const uvs = new Float32Array(n * 2 * 2);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const lx = p.x + p.rx * leftOffset;
    const lz = p.z + p.rz * leftOffset;
    const rx = p.x + p.rx * rightOffset;
    const rz = p.z + p.rz * rightOffset;

    const vi = i * 6;
    positions[vi] = lx;
    positions[vi + 1] = y;
    positions[vi + 2] = lz;
    positions[vi + 3] = rx;
    positions[vi + 4] = y;
    positions[vi + 5] = rz;

    normals[vi] = 0;
    normals[vi + 1] = 1;
    normals[vi + 2] = 0;
    normals[vi + 3] = 0;
    normals[vi + 4] = 1;
    normals[vi + 5] = 0;

    const ui = i * 4;
    uvs[ui] = 0;
    uvs[ui + 1] = p.s * uvScaleV;
    uvs[ui + 2] = 1;
    uvs[ui + 3] = p.s * uvScaleV;

    if (i < n - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      // Front-facing upward (+Y)
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

/**
 * Generates a continuous guardrail vertical beam ribbon along either side of the road.
 */
function buildGuardrailBeamGeometry(samples, sideOffset, yBottom, yTop) {
  const n = samples.length;
  const positions = new Float32Array(n * 2 * 3);
  const indices = [];

  for (let i = 0; i < n; i++) {
    const p = samples[i];
    const gx = p.x + p.rx * sideOffset;
    const gz = p.z + p.rz * sideOffset;
    const vi = i * 6;
    positions[vi] = gx;
    positions[vi + 1] = yBottom;
    positions[vi + 2] = gz;
    positions[vi + 3] = gx;
    positions[vi + 4] = yTop;
    positions[vi + 5] = gz;

    if (i < n - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the entire flat-plane night mountain pass environment:
 * asphalt road, shoulder/center markings, guardrails, corner chevron boards,
 * sodium-vapor streetlamps, start/finish gantries, starfield, and valley backdrop.
 */
export function buildTougeEnvironment(scene, track) {
  const envGroup = new THREE.Group();
  envGroup.name = 'TougeEnvironment';

  const { samples, halfWidth, guardrailOffset } = track;

  // 1. Dark ground plane (mountain floor slightly below asphalt to avoid Z-fighting)
  const groundGeo = new THREE.PlaneGeometry(6000, 6000);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x070b14,
    roughness: 0.98,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  const centerX = (track.bounds.minX + track.bounds.maxX) * 0.5;
  const centerZ = (track.bounds.minZ + track.bounds.maxZ) * 0.5;
  ground.position.set(centerX, -0.08, centerZ);
  envGroup.add(ground);

  // 2. Asphalt Road Surface (flat at Y = 0)
  const asphaltTex = createAsphaltTexture();
  const roadGeo = buildRibbonGeometry(samples, -halfWidth, halfWidth, 0.0, 0.08);
  const roadMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.86,
    metalness: 0.08,
  });
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  envGroup.add(roadMesh);

  // 3. Outer Shoulder Apron (slightly darker concrete gutter strip)
  const gutterMat = new THREE.MeshStandardMaterial({
    color: 0x111622,
    roughness: 0.92,
  });
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, -guardrailOffset - 0.5, -halfWidth, -0.015), gutterMat)
  );
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, halfWidth, guardrailOffset + 0.5, -0.015), gutterMat)
  );

  // 4. Solid White Road Edge Lines
  const edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xdbeafe });
  const edgeOffset = halfWidth - 0.36;
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, -edgeOffset - 0.14, -edgeOffset, 0.018), edgeLineMat)
  );
  envGroup.add(
    new THREE.Mesh(buildRibbonGeometry(samples, edgeOffset, edgeOffset + 0.14, 0.018), edgeLineMat)
  );

  // 5. Dashed Amber/Yellow Center Line (classic Japanese Touge)
  const dashGeo = new THREE.PlaneGeometry(0.24, 3.8);
  dashGeo.rotateX(-Math.PI / 2);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const dashSpacing = 8.5;
  const dashCount = Math.floor(track.totalLength / dashSpacing);
  const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < dashCount; i++) {
    const pt = track.getPointAtS(i * dashSpacing + 4);
    dummy.position.set(pt.x, 0.022, pt.z);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    dashInst.setMatrixAt(i, dummy.matrix);
  }
  dashInst.instanceMatrix.needsUpdate = true;
  envGroup.add(dashInst);

  // 6. Guardrails (left & right metallic W-beam + posts)
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.42,
    metalness: 0.65,
    side: THREE.DoubleSide,
  });
  const railLeft = new THREE.Mesh(
    buildGuardrailBeamGeometry(samples, -guardrailOffset, 0.42, 0.88),
    railMat
  );
  const railRight = new THREE.Mesh(
    buildGuardrailBeamGeometry(samples, guardrailOffset, 0.42, 0.88),
    railMat
  );
  envGroup.add(railLeft, railRight);

  // Reflective orange/white strip along guardrails for crisp night readability
  const reflectorMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
  });
  envGroup.add(
    new THREE.Mesh(buildGuardrailBeamGeometry(samples, -guardrailOffset + 0.04, 0.62, 0.7), reflectorMat)
  );
  envGroup.add(
    new THREE.Mesh(buildGuardrailBeamGeometry(samples, guardrailOffset - 0.04, 0.62, 0.7), reflectorMat)
  );

  // Guardrail Posts (InstancedMesh)
  const postSpacing = 11;
  const postPairs = Math.floor(track.totalLength / postSpacing);
  const postGeo = new THREE.BoxGeometry(0.14, 0.95, 0.14);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.5 });
  const postInst = new THREE.InstancedMesh(postGeo, postMat, postPairs * 2);
  let postIdx = 0;
  for (let i = 0; i < postPairs; i++) {
    const pt = track.getPointAtS(i * postSpacing);
    for (const side of [-1, 1]) {
      dummy.position.set(
        pt.x + pt.rx * side * (guardrailOffset + 0.12),
        0.47,
        pt.z + pt.rz * side * (guardrailOffset + 0.12)
      );
      dummy.rotation.set(0, pt.heading, 0);
      dummy.updateMatrix();
      postInst.setMatrixAt(postIdx++, dummy.matrix);
    }
  }
  postInst.instanceMatrix.needsUpdate = true;
  envGroup.add(postInst);

  // 7. Corner Warning Chevron Boards on outside of tight turns
  const chevronPositions = [];
  for (let s = 40; s < track.totalLength - 40; s += 13) {
    const pt = track.getPointAtS(s);
    if (Math.abs(pt.curvature) > 0.0085) {
      // Turning left (curvature > 0) -> outside is right (+1)
      const outsideSide = pt.curvature > 0 ? 1 : -1;
      chevronPositions.push({ pt, side: outsideSide });
    }
  }
  if (chevronPositions.length > 0) {
    const boardGeo = new THREE.BoxGeometry(1.15, 0.9, 0.12);
    const boardMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const stripeGeo = new THREE.BoxGeometry(0.45, 0.65, 0.14);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const boardInst = new THREE.InstancedMesh(boardGeo, boardMat, chevronPositions.length);
    const stripeInst = new THREE.InstancedMesh(stripeGeo, stripeMat, chevronPositions.length);

    chevronPositions.forEach(({ pt, side }, idx) => {
      const dist = guardrailOffset + 0.45;
      dummy.position.set(pt.x + pt.rx * side * dist, 1.5, pt.z + pt.rz * side * dist);
      // Face oncoming traffic slightly angled inward
      dummy.rotation.set(0, pt.heading + side * 0.25, 0);
      dummy.updateMatrix();
      boardInst.setMatrixAt(idx, dummy.matrix);
      stripeInst.setMatrixAt(idx, dummy.matrix);
    });
    boardInst.instanceMatrix.needsUpdate = true;
    stripeInst.instanceMatrix.needsUpdate = true;
    envGroup.add(boardInst, stripeInst);
  }

  // 8. Sodium-Vapor Touge Streetlamps + Warm Ground Light Pools
  const lampSpacing = 46;
  const lampCount = Math.floor((track.totalLength - 60) / lampSpacing);
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, 6.8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.6 });
  const armGeo = new THREE.BoxGeometry(2.6, 0.12, 0.12);
  const headGeo = new THREE.BoxGeometry(0.95, 0.16, 0.42);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd27d });
  const poolGeo = new THREE.CircleGeometry(5.6, 14);
  const poolMat = new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
  });

  const poleInst = new THREE.InstancedMesh(poleGeo, poleMat, lampCount);
  const armInst = new THREE.InstancedMesh(armGeo, poleMat, lampCount);
  const headInst = new THREE.InstancedMesh(headGeo, headMat, lampCount);
  const poolInst = new THREE.InstancedMesh(poolGeo, poolMat, lampCount);

  for (let i = 0; i < lampCount; i++) {
    const s = 32 + i * lampSpacing;
    const pt = track.getPointAtS(s);
    const side = i % 2 === 0 ? 1 : -1;
    const poleDist = guardrailOffset + 0.85;
    const px = pt.x + pt.rx * side * poleDist;
    const pz = pt.z + pt.rz * side * poleDist;

    dummy.position.set(px, 3.4, pz);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    poleInst.setMatrixAt(i, dummy.matrix);

    const armX = pt.x + pt.rx * side * (poleDist - 1.2);
    const armZ = pt.z + pt.rz * side * (poleDist - 1.2);
    dummy.position.set(armX, 6.75, armZ);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    armInst.setMatrixAt(i, dummy.matrix);

    const headX = pt.x + pt.rx * side * (poleDist - 2.35);
    const headZ = pt.z + pt.rz * side * (poleDist - 2.35);
    dummy.position.set(headX, 6.62, headZ);
    dummy.rotation.set(0, pt.heading, 0);
    dummy.updateMatrix();
    headInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(headX, 0.028, headZ);
    dummy.rotation.set(-Math.PI / 2, 0, 0);
    dummy.updateMatrix();
    poolInst.setMatrixAt(i, dummy.matrix);
  }
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  headInst.instanceMatrix.needsUpdate = true;
  poolInst.instanceMatrix.needsUpdate = true;
  envGroup.add(poleInst, armInst, headInst, poolInst);

  // 9. Stylized Low-Poly Roadside Pine Silhouettes (strictly outside all guardrails, even in switchbacks)
  const treeCandidates = 360;
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 3.0, 5);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 1.0 });
  const crownGeo = new THREE.ConeGeometry(2.6, 8.5, 6);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x0d1f1c, roughness: 0.95 });
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCandidates);
  const crownInst = new THREE.InstancedMesh(crownGeo, crownMat, treeCandidates);

  let tIdx = 0;
  for (let i = 0; i < treeCandidates; i++) {
    const s = 10 + (i / treeCandidates) * (track.totalLength - 20);
    const pt = track.getPointAtS(s);
    const side = i % 2 === 0 ? -1 : 1;
    // Pseudo-random deterministic offset well outside guardrail
    const rand = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    const dist = guardrailOffset + 6.5 + rand * 16;
    const scale = 0.8 + rand * 0.9;
    const tx = pt.x + pt.rx * side * dist;
    const tz = pt.z + pt.rz * side * dist;

    // Guard against landing on an adjacent hairpin leg
    const nearest = track.projectPoint(tx, tz, -1);
    if (Math.abs(nearest.lateral) < guardrailOffset + 4.5) {
      continue;
    }

    dummy.position.set(tx, 1.5 * scale, tz);
    dummy.rotation.set(0, rand * Math.PI * 2, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(tIdx, dummy.matrix);

    dummy.position.set(tx, 6.2 * scale, tz);
    dummy.updateMatrix();
    crownInst.setMatrixAt(tIdx, dummy.matrix);
    tIdx++;
  }
  trunkInst.count = tIdx;
  crownInst.count = tIdx;
  dummy.scale.set(1, 1, 1);
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  envGroup.add(trunkInst, crownInst);

  // 10. Start & Finish Overhead Gantries + Painted Road Lines
  envGroup.add(
    createGantry(track, track.startS + 6.5, 'PROJECT D // START', '#0b1224', '#38bdf8', '#facc15')
  );
  envGroup.add(
    createGantry(track, track.finishS, 'FINISH LINE', '#111827', '#ffffff', '#4ade80')
  );

  // 11. Distant Night Starfield & Horizon Mountain Ring
  envGroup.add(createNightSkyBackdrop());

  scene.add(envGroup);
  return envGroup;
}

function createGantry(track, s, label, bgHex, stripeHex, accentHex) {
  const group = new THREE.Group();
  const pt = track.getPointAtS(s);

  group.position.set(pt.x, 0, pt.z);
  group.rotation.y = pt.heading;

  const span = track.guardrailOffset * 2 + 1.8;
  const height = 6.2;

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.7,
  });
  const pillarGeo = new THREE.BoxGeometry(0.55, height, 0.55);

  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(span / 2, height / 2, 0);
  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(-span / 2, height / 2, 0);
  group.add(leftPillar, rightPillar);

  // Overhead banner board
  const bannerTex = createBannerTexture(label, bgHex, stripeHex, accentHex);
  const bannerGeo = new THREE.BoxGeometry(span + 0.6, 1.9, 0.45);
  const bannerMats = [
    pillarMat,
    pillarMat,
    pillarMat,
    pillarMat,
    new THREE.MeshBasicMaterial({ map: bannerTex }),
    new THREE.MeshBasicMaterial({ map: bannerTex }),
  ];
  const banner = new THREE.Mesh(bannerGeo, bannerMats);
  banner.position.set(0, height - 0.6, 0);
  group.add(banner);

  // Painted Start/Finish Checker Strip on the Asphalt
  const checkerCanvas = document.createElement('canvas');
  checkerCanvas.width = 256;
  checkerCanvas.height = 64;
  const ctx = checkerCanvas.getContext('2d');
  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f8fafc' : '#0f172a';
      ctx.fillRect(x * 16, y * 32, 16, 32);
    }
  }
  const checkerTex = new THREE.CanvasTexture(checkerCanvas);
  checkerTex.colorSpace = THREE.SRGBColorSpace;
  const lineMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(track.roadWidth - 0.8, 2.2),
    new THREE.MeshBasicMaterial({ map: checkerTex })
  );
  lineMesh.rotation.x = -Math.PI / 2;
  lineMesh.position.y = 0.032;
  group.add(lineMesh);

  return group;
}

function createNightSkyBackdrop() {
  const skyGroup = new THREE.Group();

  // Starfield points high above the mountain pass
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const radius = 500 + Math.random() * 1400;
    starPos[i * 3] = Math.cos(theta) * radius;
    starPos[i * 3 + 1] = 110 + Math.random() * 480;
    starPos[i * 3 + 2] = -700 + Math.sin(theta) * radius;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xcbd5e1,
    size: 2.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.78,
  });
  skyGroup.add(new THREE.Points(starGeo, starMat));

  // Stylized pale full moon in the midnight touge sky
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(26, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe2e8f0, fog: false })
  );
  moon.position.set(-420, 310, -1650);
  skyGroup.add(moon);

  return skyGroup;
}
