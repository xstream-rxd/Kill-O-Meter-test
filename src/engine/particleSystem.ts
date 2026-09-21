import { GibParticle, GibType, FloorDecal, WallDecal, ShellCasing, SteamParticle } from '../types';
import { soundSynth } from './soundSynth';

export interface SparkParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public gibs: GibParticle[] = [];
  public sparks: SparkParticle[] = [];
  public steam: SteamParticle[] = [];
  public floorDecals: FloorDecal[] = [];
  public wallDecals: WallDecal[] = [];
  public shellCasings: ShellCasing[] = [];

  private nextId = 1;
  private readonly MAX_FLOOR_DECALS = 500;
  private readonly MAX_WALL_DECALS = 300;
  private readonly MAX_GIBS = 220;
  private readonly MAX_SPARKS = 250;
  private readonly MAX_STEAM = 120;
  private readonly MAX_CASINGS = 120;

  // --- SPAWN VISCERAL GIBS & DISMEMBERED DEBRIS ---
  public spawnGibExplosion(x: number, y: number, count = 14, isHeavy = false, enemyType = 'grunt') {
    let pool: GibType[] = [];

    if (enemyType === 'baron') {
      pool = ['demon_horn', 'demon_horn', 'heart', 'jaw', 'severed_arm', 'severed_leg', 'rib', 'meat', 'skull', 'intestine', 'brain_lobe'];
    } else if (enemyType === 'plasma_gunner') {
      pool = ['metal_shard', 'metal_shard', 'severed_arm', 'skull', 'eyeball', 'meat', 'rib', 'brain_lobe', 'blood_drop'];
    } else if (enemyType === 'vile_spitter') {
      pool = ['eyeball', 'eyeball', 'intestine', 'severed_leg', 'jaw', 'meat', 'blood_drop', 'brain_lobe', 'rib'];
    } else if (enemyType === 'boss') {
      pool = ['demon_horn', 'heart', 'jaw', 'metal_shard', 'skull', 'severed_arm', 'severed_leg', 'brain_lobe', 'intestine', 'rib', 'meat'];
    } else if (enemyType === 'imp') {
      pool = ['demon_horn', 'jaw', 'severed_arm', 'heart', 'rib', 'meat', 'eyeball', 'blood_drop', 'skull'];
    } else if (enemyType === 'scuttler') {
      pool = ['severed_leg', 'severed_leg', 'eyeball', 'jaw', 'meat', 'blood_drop', 'metal_shard'];
    } else {
      // Grunt / standard humanoid demon
      pool = ['skull', 'brain_lobe', 'severed_arm', 'severed_leg', 'jaw', 'heart', 'rib', 'meat', 'eyeball', 'intestine', 'blood_drop'];
    }

    const actualCount = Math.max(8, Math.min(count, isHeavy ? 26 : 16));

    for (let i = 0; i < actualCount; i++) {
      if (this.gibs.length >= this.MAX_GIBS) {
        this.gibs.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = isHeavy ? (1.6 + Math.random() * 4.2) : (1.0 + Math.random() * 2.8);
      const gibType = pool[Math.floor(Math.random() * pool.length)];

      let color = '#7f1d1d'; // Deep arterial blood
      if (gibType === 'skull' || gibType === 'rib' || gibType === 'jaw') color = '#e2e8f0';
      else if (gibType === 'eyeball') color = '#f8fafc';
      else if (gibType === 'demon_horn') color = '#1c1917';
      else if (gibType === 'metal_shard') color = '#64748b';
      else if (gibType === 'brain_lobe') color = '#be123c';
      else if (enemyType === 'vile_spitter') color = '#15803d'; // Toxic green gore
      else if (enemyType === 'plasma_gunner') color = '#0284c7'; // Cyan energized gore

      let size = 0.14 + Math.random() * 0.08;
      if (gibType === 'blood_drop') size = 0.08 + Math.random() * 0.04;
      else if (gibType === 'skull' || gibType === 'demon_horn') size = 0.22 + Math.random() * 0.08;
      else if (gibType === 'heart' || gibType === 'brain_lobe') size = 0.18 + Math.random() * 0.06;
      else if (gibType === 'severed_arm' || gibType === 'severed_leg') size = 0.20 + Math.random() * 0.08;

      this.gibs.push({
        id: this.nextId++,
        x,
        y,
        z: 0.3 + Math.random() * 0.45,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: 1.8 + Math.random() * 3.2, // High kinetic explosive arc pop
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 18,
        gibType,
        size,
        color,
        bounces: 0,
        life: 0,
        maxLife: 6.0 + Math.random() * 3.5,
        settled: false,
      });
    }

    // Spawn rich blood pool on the floor directly beneath
    const decalType = enemyType === 'vile_spitter' ? 'slime' : 'blood';
    this.addFloorDecal(x, y, 0.75 + Math.random() * 0.40, decalType);
    // Satellite splatters
    this.addFloorDecal(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, 0.40 + Math.random() * 0.30, decalType);
    if (isHeavy) {
      this.addFloorDecal(x + (Math.random() - 0.5) * 0.9, y + (Math.random() - 0.5) * 0.9, 0.50 + Math.random() * 0.35, decalType);
      this.addFloorDecal(x + (Math.random() - 0.5) * 1.2, y + (Math.random() - 0.5) * 1.2, 0.35 + Math.random() * 0.25, decalType);
    }
  }

  // --- SPAWN EJECTED SHELL CASINGS (Physical 3D brass and shotgun shells) ---
  public spawnShellCasing(
    playerX: number,
    playerY: number,
    playerAngle: number,
    casingType: 'shotgun_red' | 'brass_bullet'
  ) {
    if (this.shellCasings.length >= this.MAX_CASINGS) {
      this.shellCasings.shift();
    }

    // Ejection port sits slightly to the right and forward of the weapon
    const rightAngle = playerAngle + Math.PI / 2;
    const startX = playerX + Math.cos(playerAngle) * 0.22 + Math.cos(rightAngle) * 0.25;
    const startY = playerY + Math.sin(playerAngle) * 0.22 + Math.sin(rightAngle) * 0.25;

    // Ejection vector: shoots out sideways to the right with slight forward push
    const ejectAngle = playerAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.35;
    const ejectSpeed = casingType === 'shotgun_red' ? (1.5 + Math.random() * 0.9) : (2.2 + Math.random() * 1.2);
    const fwdSpeed = 0.35 + Math.random() * 0.3;

    this.shellCasings.push({
      id: this.nextId++,
      x: startX,
      y: startY,
      z: 0.46, // Gun chamber height
      vx: Math.cos(ejectAngle) * ejectSpeed + Math.cos(playerAngle) * fwdSpeed,
      vy: Math.sin(ejectAngle) * ejectSpeed + Math.sin(playerAngle) * fwdSpeed,
      vz: 1.6 + Math.random() * 1.3, // Upward pop arc
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 18,
      pitch: (Math.random() - 0.5) * 0.8,
      vPitch: (Math.random() - 0.5) * 14,
      casingType,
      bounces: 0,
      life: 0,
      maxLife: 10.0, // Lingers on floor
      settled: false,
    });
  }

  // --- SPAWN SPARKS & IMPACTS ---
  public spawnSparks(x: number, y: number, z = 0.5, color = '#facc15', count = 12) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= this.MAX_SPARKS) this.sparks.shift();

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 3.5;

      this.sparks.push({
        id: this.nextId++,
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 2.0,
        color,
        size: 0.04 + Math.random() * 0.05,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.35,
      });
    }
  }

  // --- PRESSURIZED STEAM & DEPRESSURIZATION PARTICLES ---
  public spawnSteam(x: number, y: number, z = 0.25, count = 5, upwardSpeed = 1.2) {
    for (let i = 0; i < count; i++) {
      if (this.steam.length >= this.MAX_STEAM) this.steam.shift();

      const spread = 0.35;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.15 + Math.random() * 0.4;

      this.steam.push({
        id: this.nextId++,
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread,
        z: z + (Math.random() - 0.5) * 0.1,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: upwardSpeed * (0.6 + Math.random() * 0.8),
        size: 0.12 + Math.random() * 0.14,
        alpha: 0.75 + Math.random() * 0.25,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.6,
      });
    }
  }

  // --- FLOOR & WALL DECALS (Persistent & atmospheric) ---
  public addFloorDecal(
    x: number,
    y: number,
    size = 0.4,
    type: 'blood' | 'scorch' | 'plasma_burn' | 'slime' | 'scorch_blast' | 'acid_burn' = 'blood'
  ) {
    if (this.floorDecals.length >= this.MAX_FLOOR_DECALS) {
      this.floorDecals.shift();
    }
    const color =
      type === 'blood'
        ? '#650808'
        : type === 'scorch'
        ? '#18181b'
        : type === 'scorch_blast'
        ? '#0c0a09'
        : type === 'plasma_burn'
        ? '#06b6d4'
        : type === 'acid_burn'
        ? '#14532d'
        : '#15803d'; // Toxic green slime

    this.floorDecals.push({
      id: this.nextId++,
      x: x + (Math.random() - 0.5) * 0.15,
      y: y + (Math.random() - 0.5) * 0.15,
      size: type === 'scorch_blast' ? size * 1.4 : size,
      color,
      alpha: 0.95,
      type,
      life: 0,
      maxLife: 35.0, // Stays in the combat arena for 35 seconds
    });
  }

  public addWallDecal(
    mapX: number,
    mapY: number,
    side: 0 | 1,
    wallOffset: number,
    wallZ: number,
    type: 'blood_splat' | 'bullet_hole' | 'plasma_burn' | 'scorch_blast' | 'acid_burn' = 'blood_splat'
  ) {
    if (this.wallDecals.length >= this.MAX_WALL_DECALS) {
      this.wallDecals.shift();
    }
    let color = '#881337';
    if (type === 'bullet_hole') color = '#09090b';
    else if (type === 'plasma_burn') color = '#38bdf8';
    else if (type === 'scorch_blast') color = '#1c1917';
    else if (type === 'acid_burn') color = '#22c55e';

    this.wallDecals.push({
      id: this.nextId++,
      mapX,
      mapY,
      side,
      wallOffset: Math.max(0.05, Math.min(0.95, wallOffset)),
      wallZ: Math.max(0.15, Math.min(0.85, wallZ)),
      size: type === 'blood_splat' ? 0.42 + Math.random() * 0.2 : (type === 'scorch_blast' ? 0.55 : 0.18),
      color,
      type,
      life: 0,
      maxLife: 35.0, // Stays on walls for 35 seconds
    });
  }

  // --- UPDATE SIMULATION ---
  public update(dt: number, grid: number[][]) {
    const gravity = 12.0;

    // 1. Update Gibs
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const g = this.gibs[i];
      g.life += dt;

      if (!g.settled) {
        // Position update
        const nextX = g.x + g.vx * dt;
        const nextY = g.y + g.vy * dt;

        // Wall collision
        const mapX = Math.floor(nextX);
        const mapY = Math.floor(nextY);
        if (grid[mapY] && grid[mapY][mapX] === 0) {
          g.x = nextX;
          g.y = nextY;
        } else {
          g.vx = -g.vx * 0.45;
          g.vy = -g.vy * 0.45;
          // Cast blood splat onto wall if fast collision
          if (Math.abs(g.vx) > 0.8 || Math.abs(g.vy) > 0.8) {
            const side = Math.abs(nextX - mapX - 0.5) > Math.abs(nextY - mapY - 0.5) ? 0 : 1;
            const offset = side === 0 ? nextY - mapY : nextX - mapX;
            this.addWallDecal(mapX, mapY, side, offset, Math.max(0.2, Math.min(0.8, g.z)), 'blood_splat');
          }
        }

        // Vertical physics
        g.vz -= gravity * dt;
        g.z += g.vz * dt;
        g.rot += g.vRot * dt;

        // Floor bounce
        if (g.z <= 0) {
          g.z = 0;
          g.bounces++;
          g.vz = -g.vz * 0.42; // restitution
          g.vx *= 0.62;
          g.vy *= 0.62;
          g.vRot *= 0.6;

          // Splatter blood on bounce
          if (Math.random() < 0.8) {
            this.addFloorDecal(g.x, g.y, 0.28 + Math.random() * 0.22, 'blood');
          }

          if (Math.abs(g.vz) < 0.45 || g.bounces > 4) {
            g.settled = true;
            g.vz = 0;
            g.vx = 0;
            g.vy = 0;
          }
        }
      }

      // Remove after lifetime with smooth fade
      if (g.life >= g.maxLife) {
        this.gibs.splice(i, 1);
      }
    }

    // 2. Update Ejected Shell Casings
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const c = this.shellCasings[i];
      c.life += dt;

      if (!c.settled) {
        const nextX = c.x + c.vx * dt;
        const nextY = c.y + c.vy * dt;
        const mapX = Math.floor(nextX);
        const mapY = Math.floor(nextY);

        if (grid[mapY] && grid[mapY][mapX] === 0) {
          c.x = nextX;
          c.y = nextY;
        } else {
          c.vx = -c.vx * 0.45;
          c.vy = -c.vy * 0.45;
        }

        c.vz -= gravity * 0.95 * dt;
        c.z += c.vz * dt;
        c.rot += c.vRot * dt;
        c.pitch += c.vPitch * dt;

        // Floor collision
        if (c.z <= 0) {
          c.z = 0;
          c.bounces++;
          c.vz = -c.vz * 0.38; // restitution
          c.vx *= 0.65;
          c.vy *= 0.65;
          c.vRot *= 0.6;
          c.vPitch *= 0.5;

          // Play subtle metallic bounce audio
          if (c.bounces <= 2) {
            soundSynth.playShellBounce(0, c.casingType === 'shotgun_red');
          }

          if (Math.abs(c.vz) < 0.35 || c.bounces >= 3) {
            c.settled = true;
            c.vz = 0;
            c.vx = 0;
            c.vy = 0;
            c.vRot = 0;
            c.vPitch = 0;
          }
        }
      }

      if (c.life >= c.maxLife) {
        this.shellCasings.splice(i, 1);
      }
    }

    // 3. Update Floor Decals (fade out smoothly in final 4s)
    for (let i = this.floorDecals.length - 1; i >= 0; i--) {
      const d = this.floorDecals[i];
      d.life += dt;
      if (d.life >= d.maxLife) {
        this.floorDecals.splice(i, 1);
      } else if (d.life > d.maxLife - 4.0) {
        d.alpha = Math.max(0, (d.maxLife - d.life) / 4.0);
      }
    }

    // 4. Update Wall Decals (fade out smoothly in final 4s)
    for (let i = this.wallDecals.length - 1; i >= 0; i--) {
      const w = this.wallDecals[i];
      w.life += dt;
      if (w.life >= w.maxLife) {
        this.wallDecals.splice(i, 1);
      }
    }

    // 5. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vz -= gravity * 0.5 * dt;

      if (s.life >= s.maxLife) {
        this.sparks.splice(i, 1);
      }
    }

    // 6. Update Pressurized Steam / Vapor
    for (let i = this.steam.length - 1; i >= 0; i--) {
      const st = this.steam[i];
      st.life += dt;
      st.x += st.vx * dt;
      st.y += st.vy * dt;
      st.z += st.vz * dt;
      st.size += dt * 0.18; // Expanding cloud
      st.alpha = Math.max(0, 1.0 - (st.life / st.maxLife));

      if (st.life >= st.maxLife || st.z > 1.2) {
        this.steam.splice(i, 1);
      }
    }
  }

  public clear() {
    this.gibs = [];
    this.shellCasings = [];
    this.sparks = [];
    this.steam = [];
    this.floorDecals = [];
    this.wallDecals = [];
  }
}
