import * as THREE from 'three';

const MAX_SKID_MARKS = 520;
const MAX_PARTICLES = 240;
const MAX_SMOKE = 260;

/**
 * Manages lightweight arcade drift tire marks, billowing tire smoke,
 * and gutter-run / wall-scrape spark particles using pre-allocated InstancedMeshes.
 */
export class EffectsManager {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'RaceEffects';

    this._dummy = new THREE.Object3D();
    this._zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    // 1. Tire Skid Marks on road surface
    const skidGeo = new THREE.PlaneGeometry(0.32, 1.35);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x05070c,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
    });
    this.skidMesh = new THREE.InstancedMesh(skidGeo, skidMat, MAX_SKID_MARKS);
    this.skidMesh.frustumCulled = false;
    this.skidCursor = 0;
    this.skidCooldown = new Map();
    for (let i = 0; i < MAX_SKID_MARKS; i++) {
      this.skidMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;
    this.group.add(this.skidMesh);

    // 2. Sparks (used for gutter-run inside wheels, wall scrapes, and car collisions)
    const sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.42);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, MAX_PARTICLES);
    this.sparkMesh.frustumCulled = false;
    this.particles = [];
    this.particleCursor = 0;

    const defaultColor = new THREE.Color(0xff5500);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
      this.sparkMesh.setColorAt(i, defaultColor);
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        groundY: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
      });
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
    this.group.add(this.sparkMesh);

    // 3. Billowing Drift Tire Smoke (low-poly volumetric puffs, ultra-cheap on low-end GPUs)
    const smokeGeo = new THREE.IcosahedronGeometry(0.38, 1);
    const smokeMat = new THREE.MeshBasicMaterial({
      color: 0xdbe4ee,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    this.smokeMesh = new THREE.InstancedMesh(smokeGeo, smokeMat, MAX_SMOKE);
    this.smokeMesh.frustumCulled = false;
    this.smokes = [];
    this.smokeCursor = 0;
    this.gutterSparkCooldown = new Map();

    const defaultSmokeColor = new THREE.Color(0xe2e8f0);
    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokeMesh.setMatrixAt(i, this._zeroMatrix);
      this.smokeMesh.setColorAt(i, defaultSmokeColor);
      this.smokes.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.65,
        startScale: 0.5,
        endScale: 2.1,
        rotY: 0,
      });
    }
    this.smokeMesh.instanceMatrix.needsUpdate = true;
    if (this.smokeMesh.instanceColor) this.smokeMesh.instanceColor.needsUpdate = true;
    this.group.add(this.smokeMesh);

    scene.add(this.group);
  }

  clear() {
    this.skidCursor = 0;
    this.skidCooldown.clear();
    this.gutterSparkCooldown.clear();
    for (let i = 0; i < MAX_SKID_MARKS; i++) {
      this.skidMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
      this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokes[i].active = false;
      this.smokeMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.smokeMesh.instanceMatrix.needsUpdate = true;
  }

  _stampSkid(x, y, z, heading, slope = 0) {
    this._dummy.position.set(x, y + 0.03, z);
    this._dummy.rotation.order = 'YXZ';
    this._dummy.rotation.set(-slope, heading, 0);
    this._dummy.scale.set(1, 1, 1);
    this._dummy.updateMatrix();
    this.skidMesh.setMatrixAt(this.skidCursor, this._dummy.matrix);
    this.skidCursor = (this.skidCursor + 1) % MAX_SKID_MARKS;
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  spawnSparks(x, z, count = 6, colorHex = 0xff9e00, spread = 10, baseY = 0, biasVx = 0, biasVz = 0) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.sparkMesh.setColorAt(this.particleCursor, col);
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.25;
      p.groundY = baseY + 0.05;
      p.y = baseY + 0.14 + Math.random() * 0.16;
      p.z = z + (Math.random() - 0.5) * 0.25;
      p.vx = biasVx + (Math.random() - 0.5) * spread;
      p.vy = 2.4 + Math.random() * 4.8;
      p.vz = biasVz + (Math.random() - 0.5) * spread;
      p.life = 0;
      p.maxLife = 0.16 + Math.random() * 0.2;
      p.scale = 0.55 + Math.random() * 0.65;
    }
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
  }

  spawnSmoke(x, z, count = 2, baseY = 0, shadeHex = 0xe2e8f0) {
    const col = new THREE.Color(shadeHex);
    for (let i = 0; i < count; i++) {
      const s = this.smokes[this.smokeCursor];
      this.smokeMesh.setColorAt(this.smokeCursor, col);
      this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;

      s.active = true;
      s.x = x + (Math.random() - 0.5) * 0.45;
      s.y = baseY + 0.22 + Math.random() * 0.18;
      s.z = z + (Math.random() - 0.5) * 0.45;
      s.vx = (Math.random() - 0.5) * 1.4;
      s.vy = 0.9 + Math.random() * 0.9;
      s.vz = (Math.random() - 0.5) * 1.4;
      s.life = 0;
      s.maxLife = 0.52 + Math.random() * 0.32;
      s.startScale = 0.45 + Math.random() * 0.25;
      s.endScale = 1.65 + Math.random() * 0.75;
      s.rotY = Math.random() * Math.PI * 2;
    }
    if (this.smokeMesh.instanceColor) this.smokeMesh.instanceColor.needsUpdate = true;
  }

  emitCarEffects(carId, car, dt, baseY = 0, slope = 0) {
    const timer = (this.skidCooldown.get(carId) || 0) - dt;
    const bodyAngle = car.heading + car.visualSlip;
    const sinA = Math.sin(bodyAngle);
    const cosA = Math.cos(bodyAngle);
    // Right vector in local car frame: (-cosA, sinA)
    const rx = -cosA;
    const rz = sinA;

    // Rear left & rear right tire world positions
    const rearOffset = -1.35;
    const frontOffset = 1.3;
    const trackHalf = 0.88;
    const rlx = car.x + sinA * rearOffset - rx * trackHalf;
    const rlz = car.z + cosA * rearOffset - rz * trackHalf;
    const rrx = car.x + sinA * rearOffset + rx * trackHalf;
    const rrz = car.z + cosA * rearOffset + rz * trackHalf;

    // 1. Drift tire marks & billowing white/gray tire smoke (no sparks during regular drift)
    if (car.isDrifting && car.speedKmh > 30) {
      if (timer <= 0) {
        this._stampSkid(rlx, baseY, rlz, car.heading, slope);
        this._stampSkid(rrx, baseY, rrz, car.heading, slope);
        this.skidCooldown.set(carId, 0.038);

        const smokeTint = car.driftCharge > 0.55 ? 0xf1f5f9 : 0xcbd5e1;
        this.spawnSmoke(rlx, rlz, 2, baseY, smokeTint);
        this.spawnSmoke(rrx, rrz, 2, baseY, smokeTint);
      } else {
        this.skidCooldown.set(carId, timer);
      }
    } else {
      this.skidCooldown.set(carId, 0);
    }

    // 2. Gutter-run sparks: crisp metallic scrape sparks flying backward from gutter-hooked wheels
    const gTimer = (this.gutterSparkCooldown.get(carId) || 0) - dt;
    if (car.inGutter && car.gutterSide !== 0 && car.speedKmh > 20) {
      if (gTimer <= 0) {
        const gSide = car.gutterSide; // -1 = left wheels, +1 = right wheels
        const gFrontX = car.x + sinA * frontOffset + rx * gSide * trackHalf;
        const gFrontZ = car.z + cosA * frontOffset + rz * gSide * trackHalf;
        const gRearX = car.x + sinA * rearOffset + rx * gSide * trackHalf;
        const gRearZ = car.z + cosA * rearOffset + rz * gSide * trackHalf;
        const backVx = -sinA * 7.5;
        const backVz = -cosA * 7.5;

        this.spawnSparks(gFrontX, gFrontZ, 3, 0xffd166, 9.5, baseY, backVx, backVz);
        this.spawnSparks(gRearX, gRearZ, 3, 0xff7b00, 10.5, baseY, backVx, backVz);
        this.gutterSparkCooldown.set(carId, 0.045);
      } else {
        this.gutterSparkCooldown.set(carId, gTimer);
      }
    } else {
      this.gutterSparkCooldown.set(carId, 0);
    }

    // 3. Guardrail wall scrape sparks
    if (car.scrapedWall && car.speedKmh > 25) {
      this.spawnSparks(car.scrapeX, car.scrapeZ, 5, 0xff7b00, 10, baseY);
    }
  }

  update(dt) {
    let sparkDirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      sparkDirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
        continue;
      }

      p.vy -= 14.5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(p.groundY, p.y + p.vy * dt);
      p.z += p.vz * dt;

      const fade = 1 - p.life / p.maxLife;
      const s = p.scale * fade;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.order = 'XYZ';
      this._dummy.rotation.set(0, Math.atan2(p.vx, p.vz), 0);
      this._dummy.scale.set(s, s, s * 1.4);
      this._dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (sparkDirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }

    let smokeDirty = false;
    for (let i = 0; i < MAX_SMOKE; i++) {
      const s = this.smokes[i];
      if (!s.active) continue;

      smokeDirty = true;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        this.smokeMesh.setMatrixAt(i, this._zeroMatrix);
        continue;
      }

      const t = s.life / s.maxLife;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      // Billow outward rapidly then shrink away cleanly at end of life
      const envelope = t < 0.72 ? s.startScale + (s.endScale - s.startScale) * (t / 0.72) : s.endScale * (1 - (t - 0.72) / 0.28);
      const sc = Math.max(0.01, envelope);

      this._dummy.position.set(s.x, s.y, s.z);
      this._dummy.rotation.order = 'XYZ';
      this._dummy.rotation.set(t * 0.8, s.rotY + t * 1.2, 0);
      this._dummy.scale.set(sc, sc * 0.78, sc);
      this._dummy.updateMatrix();
      this.smokeMesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (smokeDirty) {
      this.smokeMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
