import * as THREE from 'three';

const MAX_SKID_MARKS = 520;
const MAX_PARTICLES = 240;

/**
 * Manages lightweight arcade drift tire marks and spark/smoke particles
 * using pre-allocated InstancedMeshes (zero per-frame geometry allocation).
 */
export class EffectsManager {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'RaceEffects';

    this._dummy = new THREE.Object3D();
    this._zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);

    // 1. Tire Skid Marks on flat Y = 0.025 road plane
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

    // 2. Sparks & Drift Glow Particles
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

    const defaultColor = new THREE.Color(0xffb703);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
      this.sparkMesh.setColorAt(i, defaultColor);
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
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

    scene.add(this.group);
  }

  clear() {
    this.skidCursor = 0;
    this.skidCooldown.clear();
    for (let i = 0; i < MAX_SKID_MARKS; i++) {
      this.skidMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.skidMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
      this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
  }

  _stampSkid(x, z, heading) {
    this._dummy.position.set(x, 0.026, z);
    this._dummy.rotation.set(0, heading, 0);
    this._dummy.scale.set(1, 1, 1);
    this._dummy.updateMatrix();
    this.skidMesh.setMatrixAt(this.skidCursor, this._dummy.matrix);
    this.skidCursor = (this.skidCursor + 1) % MAX_SKID_MARKS;
    this.skidMesh.instanceMatrix.needsUpdate = true;
  }

  spawnSparks(x, z, count = 6, colorHex = 0xffae00, spread = 8) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.particleCursor];
      this.sparkMesh.setColorAt(this.particleCursor, col);
      this.particleCursor = (this.particleCursor + 1) % MAX_PARTICLES;

      p.active = true;
      p.x = x + (Math.random() - 0.5) * 0.5;
      p.y = 0.25 + Math.random() * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * spread;
      p.vy = 2.0 + Math.random() * 4.2;
      p.vz = (Math.random() - 0.5) * spread;
      p.life = 0;
      p.maxLife = 0.22 + Math.random() * 0.26;
      p.scale = 0.7 + Math.random() * 0.85;
    }
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
  }

  emitCarEffects(carId, car, dt) {
    const timer = (this.skidCooldown.get(carId) || 0) - dt;
    const bodyAngle = car.heading + car.visualSlip;
    const sinA = Math.sin(bodyAngle);
    const cosA = Math.cos(bodyAngle);
    // Right vector in local car frame: (-cosA, sinA)
    const rx = -cosA;
    const rz = sinA;

    // Rear left & rear right tire world positions
    const rearOffset = -1.35;
    const trackHalf = 0.88;
    const rlx = car.x + sinA * rearOffset - rx * trackHalf;
    const rlz = car.z + cosA * rearOffset - rz * trackHalf;
    const rrx = car.x + sinA * rearOffset + rx * trackHalf;
    const rrz = car.z + cosA * rearOffset + rz * trackHalf;

    if (car.isDrifting && car.speedKmh > 30) {
      if (timer <= 0) {
        this._stampSkid(rlx, rlz, car.heading);
        this._stampSkid(rrx, rrz, car.heading);
        this.skidCooldown.set(carId, 0.035);

        // Emit bright drift sparks / heat particles from rear tires
        const sparkCol = car.driftCharge > 0.55 ? 0x38bdf8 : 0xffb703;
        this.spawnSparks(rlx, rlz, 2, sparkCol, 5.5);
        this.spawnSparks(rrx, rrz, 2, sparkCol, 5.5);
      } else {
        this.skidCooldown.set(carId, timer);
      }
    } else {
      this.skidCooldown.set(carId, 0);
    }

    if (car.scrapedWall && car.speedKmh > 25) {
      this.spawnSparks(car.scrapeX, car.scrapeZ, 5, 0xff7b00, 10);
    }
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      dirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.sparkMesh.setMatrixAt(i, this._zeroMatrix);
        continue;
      }

      p.vy -= 14.5 * dt;
      p.x += p.vx * dt;
      p.y = Math.max(0.05, p.y + p.vy * dt);
      p.z += p.vz * dt;

      const fade = 1 - p.life / p.maxLife;
      const s = p.scale * fade;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.set(0, Math.atan2(p.vx, p.vz), 0);
      this._dummy.scale.set(s, s, s * 1.4);
      this._dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this._dummy.matrix);
    }

    if (dirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
