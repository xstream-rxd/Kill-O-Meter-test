import {
  Player,
  WeaponType,
  Weapon,
  Enemy,
  Projectile,
  PickupItem,
  LootChest,
  BossState,
  KillCombo,
  GameStats,
  FloatingText,
  Difficulty,
} from '../types';
import { createStageMap, MapData } from './gameMap';
import { ParticleSystem } from './particleSystem';
import { soundSynth } from './soundSynth';

export class GameEngine {
  public mapData: MapData;
  public player: Player;
  public particles: ParticleSystem;
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingText[] = [];
  public combo: KillCombo;
  public boss: BossState;
  public stats: GameStats;
  public difficulty: Difficulty = 'normal';
  
  public currentStage = 1;
  public totalStages = 4;
  public inNeutralZone = true;
  public currentWave = 0;
  public waveBanner = '';
  public waveBannerTimer = 0;

  public levelKills = 0; // Number of enemies defeated on current stage
  public totalLevelEnemies = 0; // Total enemies placed on current stage
  public killOMeter = 0; // 0 to 100 Tachometer Kill-O'Meter progress toward Boss Lockdown
  public isLockdown = false;
  public isGameOver = false;
  public isVictory = false;
  public isPaused = false;
  public isMutating = false;
  public mutationTimer = 0;
  public mutationPhase = 1;
  public isWardenMutationEnd = false;
  public gameTime = 0;

  // Fog-of-war exploration grid (tracks visited/seen cells)
  public exploredGrid: boolean[][] = [];

  // Stage warp / level transition state
  public levelTransition = {
    active: false,
    timer: 0,
    maxTimer: 2.5,
    fromStage: 1,
    toStage: 2,
    stageName: '',
  };

  private nextProjId = 1;
  private nextTextId = 1;
  private spawnTimer = 4.0;
  private weaponFireTimer = 0;
  private lookSens = 0.0025;
  private pendingAttack = false;
  public hitstopTimer = 0;
  private ambientDemonAudioTimer = 2.0;
  private lastChaingunShotTime = 0;

  constructor(initialDifficulty: Difficulty = 'normal') {
    this.difficulty = initialDifficulty;
    this.currentStage = 1;
    this.totalStages = 4;
    this.mapData = createStageMap(1, this.difficulty);
    this.particles = new ParticleSystem();

    this.player = {
      x: this.mapData.playerStart.x,
      y: this.mapData.playerStart.y,
      angle: this.mapData.playerStart.angle,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      armor: 50,
      maxArmor: 100,
      ammo: {
        bullets: 60,
        maxBullets: 9999,
        shells: 16,
        maxShells: 9999,
        cells: 40,
        maxCells: 9999,
        belts: 100,
        maxBelts: 9999,
      },
      currentWeapon: 'pistol',
      weaponHeat: 0,
      chaingunOverheat: {
        heat: 0,
        maxHeat: 50,
        shotsFired: 0,
        maxShots: 50,
        isOverheated: false,
        cooldownTimer: 0,
        maxCooldown: 3.0,
      },
      inspectAnim: {
        active: false,
        timer: 0,
        maxTimer: 1.8,
      },
      weapons: {
        fist: {
          type: 'fist',
          name: 'MELEE KNUCKLES',
          slot: 1,
          damage: 40,
          fireRate: 0.32,
          ammoType: 'none',
          ammoPerShot: 0,
          magazine: 0,
          maxMagazine: 0,
          reloadTime: 0,
          spread: 0.05,
          pellets: 1,
          range: 2.2,
          knockback: 5.0,
          recoil: 12,
          sound: 'fist',
          isAutomatic: false,
          unlocked: true,
          needsReload: false,
        },
        pistol: {
          type: 'pistol',
          name: 'PISTOL',
          slot: 2,
          damage: 20,
          fireRate: 0.22,
          ammoType: 'bullets',
          ammoPerShot: 1,
          magazine: 12,
          maxMagazine: 12,
          reloadTime: 1.1,
          spread: 0.02,
          pellets: 1,
          range: 25,
          knockback: 1.2,
          recoil: 8,
          sound: 'pistol',
          isAutomatic: false,
          unlocked: true, // Starts unlocked
          needsReload: true,
        },
        shotgun: {
          type: 'shotgun',
          name: 'COMBAT SHOTGUN',
          slot: 3,
          damage: 16, // per pellet * 8 = 128 dmg
          fireRate: 0.42,
          ammoType: 'shells',
          ammoPerShot: 1,
          magazine: 4, // 4-shell internal tube
          maxMagazine: 4,
          reloadTime: 1.1,
          spread: 0.085,
          pellets: 8,
          range: 16,
          knockback: 4.8,
          recoil: 22,
          sound: 'shotgun',
          isAutomatic: false,
          unlocked: false, // Discovered in secret areas
          needsReload: true,
        },
        chaingun: {
          type: 'chaingun',
          name: 'CHAINGUN',
          slot: 4,
          damage: 16,
          fireRate: 0.08,
          ammoType: 'belts',
          ammoPerShot: 1,
          magazine: 0, // Direct continuous feed from reserve bullets - no reload!
          maxMagazine: 0,
          reloadTime: 0,
          spread: 0.055,
          pellets: 1,
          range: 22,
          knockback: 1.0,
          recoil: 6,
          sound: 'chaingun',
          isAutomatic: true,
          unlocked: false, // Discovered in secret areas
          needsReload: false,
        },
        plasma: {
          type: 'plasma',
          name: 'PLASMA RIFLE',
          slot: 5,
          damage: 36,
          fireRate: 0.11,
          ammoType: 'cells',
          ammoPerShot: 1,
          magazine: 25, // 25 plasma bolts per cell canister
          maxMagazine: 25,
          reloadTime: 4.1, // Extended 4.1s reload duration (3 seconds longer than pistol/shotgun)
          spread: 0.03,
          pellets: 1,
          range: 30,
          knockback: 2.2,
          recoil: 7,
          sound: 'plasma',
          isAutomatic: true,
          unlocked: false, // Discovered in secret areas
          needsReload: true,
        },
      },
      isFiring: false,
      weaponAnim: {
        frame: 0,
        recoilY: 0,
        muzzleFlash: false,
        timer: 0,
        shootFlashIntensity: 0,
        recoilBumpY: 0,
      },
      meleeAnim: {
        active: false,
        timer: 0,
        maxTimer: 0.28,
        frame: 1,
        isFinisher: false,
      },
      dash: {
        active: false,
        duration: 0,
        maxDuration: 0.22,
        cooldown: 0,
        maxCooldown: 1.2,
        dirX: 0,
        dirY: 0,
      },
      reload: {
        isReloading: false,
        timer: 0,
        maxTimer: 1.2,
      },
      invulnerableTimer: 0,
      berserkTimer: 0,
      screenShake: 0,
      damageFlash: 0,
      healFlash: 0,
      armorFlash: 0,
      lastDamageAngle: 0,
    };

    this.combo = {
      count: 0,
      multiplier: 1,
      timer: 0,
      maxTimer: 4.0,
      tierName: '',
    };

    this.boss = {
      active: false,
      spawned: false,
      name: 'CYBER-TITAN GOLIATH',
      phase: 1,
      shieldActive: false,
      shieldTimer: 0,
      specialAttackCooldown: 3.0,
      arenaLockdown: false,
    };

    this.stats = {
      score: 0,
      kills: 0,
      gibs: 0,
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
      damageTaken: 0,
      bossDamage: 0,
      maxCombo: 0,
      timeElapsed: 0,
      secretsFound: 0,
      totalSecrets: this.mapData.secrets.length,
      waveReached: 0,
      currentStage: 1,
      totalStages: 4,
    };

    this.totalLevelEnemies = this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.levelKills = 0;
    this.killOMeter = 0;

    this.sanitizeLoadedEnemies();
    this.initExploredGrid();
  }

  // Ensures all pre-placed stage enemies are 100% free of wall penetrations and out-of-bound errors
  public sanitizeLoadedEnemies() {
    for (const e of this.mapData.enemies) {
      const safe = this.findSafeEnemySpawnPos(e.x, e.y, e.radius || 0.35);
      e.x = safe.x;
      e.y = safe.y;
      e.spawnOrigin = { x: safe.x, y: safe.y };
      e.stuckTimer = 0;
      e.painTimer = 0;
    }
  }

  public initExploredGrid() {
    const h = this.mapData.grid.length;
    const w = this.mapData.grid[0]?.length || 32;
    this.exploredGrid = Array.from({ length: h }, () => Array(w).fill(false));
    this.updateExploration();
  }

  public updateExploration() {
    if (!this.exploredGrid || this.exploredGrid.length === 0) return;
    const h = this.mapData.grid.length;
    const w = this.mapData.grid[0]?.length || 32;

    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);

    if (px >= 0 && px < w && py >= 0 && py < h) {
      this.exploredGrid[py][px] = true;
    }

    // Cast 64 rays in a circle to map line-of-sight corridors and rooms accurately
    const numRays = 64;
    const maxDist = 14.0;
    const step = 0.2;

    for (let r = 0; r < numRays; r++) {
      const rayAngle = (r / numRays) * Math.PI * 2;
      const cosA = Math.cos(rayAngle);
      const sinA = Math.sin(rayAngle);

      for (let d = 0.2; d <= maxDist; d += step) {
        const cx = Math.floor(this.player.x + cosA * d);
        const cy = Math.floor(this.player.y + sinA * d);

        if (cx < 0 || cx >= w || cy < 0 || cy >= h) break;

        this.exploredGrid[cy][cx] = true;

        // Stop ray at solid wall, revealing the wall surface boundary but keeping secret rooms behind it pitch dark
        if (this.mapData.grid[cy][cx] > 0) {
          break;
        }
      }
    }
  }

  public setDifficulty(diff: Difficulty) {
    this.difficulty = diff;
  }

  // --- RESTART GAME ---
  public restart(diff?: Difficulty) {
    if (diff) {
      this.difficulty = diff;
    }
    this.currentStage = 1;
    this.totalStages = 4;
    this.mapData = createStageMap(1, this.difficulty);
    this.sanitizeLoadedEnemies();
    this.totalLevelEnemies = this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.levelKills = 0;
    this.particles.clear();
    this.projectiles = [];
    this.floatingTexts = [];
    this.killOMeter = 0;
    this.isLockdown = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    this.isMutating = false;
    this.mutationTimer = 0;
    this.mutationPhase = 1;
    this.isWardenMutationEnd = false;
    this.gameTime = 0;
    this.weaponFireTimer = 0;
    this.inNeutralZone = true;
    this.currentWave = 0;
    this.waveBanner = '';
    this.waveBannerTimer = 0;
    this.spawnTimer = 4.0;
    this.hitstopTimer = 0;
    this.ambientDemonAudioTimer = 2.0;

    this.levelTransition = {
      active: false,
      timer: 0,
      maxTimer: 2.5,
      fromStage: 1,
      toStage: 2,
      stageName: '',
    };

    this.player.x = this.mapData.playerStart.x;
    this.player.y = this.mapData.playerStart.y;
    this.player.angle = this.mapData.playerStart.angle;
    this.player.pitch = 0;
    this.player.health = 100;
    this.player.armor = 50;
    this.player.ammo = { bullets: 60, maxBullets: 9999, shells: 16, maxShells: 9999, cells: 40, maxCells: 9999, belts: 100, maxBelts: 9999 };
    this.player.currentWeapon = 'pistol';
    this.player.weaponHeat = 0;
    this.lastChaingunShotTime = 0;
    this.player.chaingunOverheat = {
      heat: 0,
      maxHeat: 50,
      shotsFired: 0,
      maxShots: 50,
      isOverheated: false,
      cooldownTimer: 0,
      maxCooldown: 3.0,
    };
    this.player.invulnerableTimer = 0;
    this.player.berserkTimer = 0;
    this.player.damageFlash = 0;
    this.player.healFlash = 0;
    this.player.armorFlash = 0;
    this.player.screenShake = 0;
    this.player.dash.cooldown = 0;
    this.player.dash.active = false;

    // Reset weapons: Only fist & pistol unlocked, rest discovered in secret areas
    this.player.weapons.fist.unlocked = true;
    this.player.weapons.pistol.unlocked = true;
    this.player.weapons.pistol.magazine = 12;
    this.player.weapons.shotgun.unlocked = false;
    this.player.weapons.shotgun.magazine = 4;
    this.player.weapons.chaingun.unlocked = false;
    this.player.weapons.chaingun.magazine = 0;
    this.player.weapons.plasma.unlocked = false;
    this.player.weapons.plasma.magazine = 25;
    this.player.weapons.plasma.reloadTime = 4.1;

    this.player.reload = {
      isReloading: false,
      timer: 0,
      maxTimer: 1.2,
    };

    this.initExploredGrid();

    this.combo = { count: 0, multiplier: 1, timer: 0, maxTimer: 4.0, tierName: '' };
    this.boss = { active: false, spawned: false, name: 'CYBER-TITAN GOLIATH', phase: 1, shieldActive: false, shieldTimer: 0, specialAttackCooldown: 3.0, arenaLockdown: false, isUltra: false };
    this.stats = { score: 0, kills: 0, gibs: 0, shotsFired: 0, shotsHit: 0, damageDealt: 0, damageTaken: 0, bossDamage: 0, maxCombo: 0, timeElapsed: 0, secretsFound: 0, totalSecrets: this.mapData.secrets.length, waveReached: 1, currentStage: 1, totalStages: 4 };

    soundSynth.setMusicIntensity(1);
  }

  // --- STAGE ADVANCEMENT (4-STAGE CAMPAIGN) ---
  public advanceToNextStage() {
    if (this.currentStage >= this.totalStages) {
      this.isVictory = true;
      soundSynth.playStageClear();
      this.spawnFloatingText('🏆 ULTRA BOSS DESTROYED! ALL STAGES COMPLETED! 🏆', this.player.x, this.player.y, '#22c55e', true, 28);
      return;
    }

    this.currentStage++;
    this.stats.currentStage = this.currentStage;
    this.mapData = createStageMap(this.currentStage, this.difficulty);
    this.sanitizeLoadedEnemies();
    this.totalLevelEnemies = this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.levelKills = 0;
    this.particles.clear();
    this.projectiles = [];
    this.floatingTexts = [];
    this.killOMeter = 0;
    this.isLockdown = false;
    this.inNeutralZone = true;
    this.currentWave = 0;
    this.waveBanner = '';
    this.waveBannerTimer = 0;
    this.spawnTimer = 4.0;

    this.levelTransition.active = false;

    // Reset player position to new stage entrance
    this.player.x = this.mapData.playerStart.x;
    this.player.y = this.mapData.playerStart.y;
    this.player.angle = this.mapData.playerStart.angle;
    this.player.pitch = 0;
    this.player.dash.active = false;
    this.player.dash.cooldown = 0;
    this.player.invulnerableTimer = 1.2; // spawn grace
    this.player.reload.isReloading = false;

    // Stage completion bonus: replenish health and ammo if depleted
    this.player.health = Math.max(this.player.health, 80);
    this.player.ammo.bullets = Math.max(this.player.ammo.bullets, 50);
    this.player.ammo.shells = Math.max(this.player.ammo.shells, 12);
    this.player.ammo.cells = Math.max(this.player.ammo.cells, 30);

    // Refill magazines for unlocked weapons
    for (const key of Object.keys(this.player.weapons) as WeaponType[]) {
      const w = this.player.weapons[key];
      if (w.unlocked) {
        w.magazine = w.maxMagazine;
      }
    }

    this.boss = {
      active: false,
      spawned: false,
      name: this.currentStage === 4 ? 'APOCALYPSE CYBER-TITAN (ULTRA BOSS)' : 'SECTOR COMMANDER',
      phase: 1,
      shieldActive: false,
      shieldTimer: 0,
      specialAttackCooldown: 3.0,
      arenaLockdown: false,
      isUltra: this.currentStage === 4,
    };

    this.stats.totalSecrets += this.mapData.secrets.length;

    this.initExploredGrid();

    soundSynth.setMusicIntensity(1);
    soundSynth.playTeleport();
    soundSynth.playStageClear();
    this.spawnFloatingText(
      `🌟 SECTOR ${this.currentStage}/${this.totalStages}: ${this.mapData.stageName}! 🌟`,
      0,
      0,
      '#38bdf8',
      false,
      24
    );
  }

  // --- INPUT CONTROLS ---
  public setMouseSensitivity(sens: number) {
    this.lookSens = sens;
  }

  public handleMouseMove(movementX: number, movementY: number) {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    this.player.angle += movementX * this.lookSens;
    this.player.pitch = Math.max(-120, Math.min(120, this.player.pitch - movementY * (this.lookSens * 350)));
  }

  public switchWeapon(type: WeaponType) {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    if (this.player.weapons[type] && this.player.weapons[type].unlocked && this.player.currentWeapon !== type) {
      this.player.currentWeapon = type;
      this.player.weaponAnim.frame = 0;
      this.player.weaponAnim.recoilY = 0;
      this.player.weaponAnim.muzzleFlash = false;
      this.player.weaponAnim.shootFlashIntensity = 0;
      this.player.weaponAnim.recoilBumpY = 0;
      this.player.weaponAnim.switchAnim = 1.0; // Kinematic lower-and-raise weapon switch animation
      this.player.reload.isReloading = false; // Cancel reload on weapon switch
      this.weaponFireTimer = 0.18; // small switch delay
      soundSynth.playWeaponSwitch();
    }
  }

  public cycleWeapon(direction: 1 | -1) {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    const unlockedWeapons = (Object.keys(this.player.weapons) as WeaponType[])
      .filter((type) => this.player.weapons[type].unlocked)
      .sort((a, b) => this.player.weapons[a].slot - this.player.weapons[b].slot);

    if (unlockedWeapons.length <= 1) return;

    const currentIndex = unlockedWeapons.indexOf(this.player.currentWeapon);
    const nextIndex = (currentIndex + direction + unlockedWeapons.length) % unlockedWeapons.length;
    this.switchWeapon(unlockedWeapons[nextIndex]);
  }

  public autoSwitchToAvailableWeapon() {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    // Priority order: Plasma -> Chaingun -> Shotgun -> Pistol -> Fist
    const priority: WeaponType[] = ['plasma', 'chaingun', 'shotgun', 'pistol', 'fist'];
    for (const wType of priority) {
      if (wType === this.player.currentWeapon) continue;
      const w = this.player.weapons[wType];
      if (!w || !w.unlocked) continue;
      if (w.type === 'fist') {
        this.switchWeapon('fist');
        return;
      }
      if (w.type === 'chaingun' && this.player.ammo.belts > 0 && !this.player.chaingunOverheat?.isOverheated) {
        this.switchWeapon('chaingun');
        return;
      }
      if (w.magazine > 0 || (w.ammoType !== 'none' && this.player.ammo[w.ammoType] > 0)) {
        this.switchWeapon(wType);
        return;
      }
    }
    // Fallback to fist
    this.switchWeapon('fist');
  }

  public triggerDash(moveX: number, moveY: number) {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    if (this.player.dash.cooldown <= 0 && !this.player.dash.active) {
      // Default to forward dash if stationary
      let effectiveX = moveX;
      let effectiveY = moveY;
      if (effectiveX === 0 && effectiveY === 0) {
        effectiveX = 1;
        effectiveY = 0;
      }

      this.player.dash.active = true;
      this.player.dash.duration = this.player.dash.maxDuration;
      this.player.dash.cooldown = this.player.dash.maxCooldown;

      // Calculate world direction from movement vector
      const cos = Math.cos(this.player.angle);
      const sin = Math.sin(this.player.angle);
      this.player.dash.dirX = effectiveX * cos - effectiveY * sin;
      this.player.dash.dirY = effectiveX * sin + effectiveY * cos;
      this.player.invulnerableTimer = 0.25; // i-frames during dash!

      soundSynth.playDash();
    }
  }

  // --- MANUAL WEAPON RELOAD ---
  public reloadWeapon() {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    const weapon = this.player.weapons[this.player.currentWeapon];
    if (!weapon || weapon.type === 'fist') return;

    // Chaingun is direct continuous belt feed - no reload needed!
    if (weapon.type === 'chaingun' || !weapon.needsReload || weapon.maxMagazine <= 0) {
      if (weapon.type === 'chaingun') {
        this.spawnFloatingText('CHAINGUN: DIRECT BELT FEED (NO RELOAD NEEDED)', this.player.x, this.player.y, '#38bdf8', false, 14);
      }
      return;
    }

    if (this.player.reload.isReloading) return;
    if (weapon.magazine >= weapon.maxMagazine) return;
    if (this.player.ammo[weapon.ammoType] <= 0) {
      soundSynth.playEmptyClick();
      return;
    }

    this.player.reload.isReloading = true;
    this.player.reload.timer = weapon.reloadTime;
    this.player.reload.maxTimer = weapon.reloadTime;
    if (weapon.type === 'plasma') {
      soundSynth.playPlasmaReload();
      this.spawnFloatingText(`QUANTUM CHARGING ${weapon.name} [4.1s]...`, this.player.x, this.player.y, '#38bdf8', false, 16);
    } else {
      soundSynth.playReload();
      this.spawnFloatingText(`RELOADING ${weapon.name}...`, this.player.x, this.player.y, '#38bdf8', false, 16);
    }
  }

  // --- WEAPON INSPECT / DIEGETIC VIEW ---
  public triggerInspect() {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    if (this.player.reload.isReloading || (this.player.meleeAnim && this.player.meleeAnim.active)) return;
    if (this.player.inspectAnim && this.player.inspectAnim.active) return;
    this.player.inspectAnim = {
      active: true,
      timer: 0,
      maxTimer: 1.8,
    };
  }

  // --- WEAPON FIRING ---
  public fireWeapon() {
    if (this.isGameOver || this.isVictory || this.isPaused) return;
    const weapon = this.player.weapons[this.player.currentWeapon];
    if (!weapon || this.weaponFireTimer > 0) return;

    // Block firing during active reload
    if (this.player.reload.isReloading) {
      soundSynth.playEmptyClick();
      this.weaponFireTimer = 0.18;
      return;
    }

    // Damage Multiplier (Berserk / Combo)
    const damageMult = (this.player.berserkTimer > 0 ? 2.2 : 1.0) * (this.combo.multiplier > 1 ? 1.0 + (this.combo.multiplier - 1) * 0.2 : 1.0);

    // Special Melee Fist Attack
    if (weapon.type === 'fist') {
      this.weaponFireTimer = weapon.fireRate;
      this.stats.shotsFired++;
      this.player.weaponAnim.frame = (this.player.weaponAnim.frame % 2) + 1; // Left or right punch
      this.player.weaponAnim.recoilY = weapon.recoil;
      this.player.weaponAnim.recoilBumpY = 4;
      this.player.weaponAnim.shootFlashIntensity = 0;
      this.player.weaponAnim.recoilVel = 22;
      this.player.screenShake = 2.5;
      soundSynth.playFist();

      // Visceral close-range punch
      this.executeHitscan(this.player.angle, weapon.damage * damageMult, weapon.range, weapon.knockback);
      return;
    }

    // Special Continuous Belt Feed for Chaingun with 50-bullet Overheat & 3.0s Cooldown Cycle
    if (weapon.type === 'chaingun') {
      // Check if chaingun is overheated or cooling down
      if (this.player.chaingunOverheat?.isOverheated || (this.player.chaingunOverheat?.cooldownTimer || 0) > 0) {
        soundSynth.playEmptyClick();
        this.weaponFireTimer = 0.22;
        const remainSec = (this.player.chaingunOverheat?.cooldownTimer || 0).toFixed(1);
        this.spawnFloatingText(`⚠️ ROTARY OVERHEATED: COOLING [${remainSec}s]`, this.player.x, this.player.y, '#ef4444', false, 15);
        return;
      }

      if (this.player.ammo.belts <= 0) {
        soundSynth.playEmptyClick();
        this.weaponFireTimer = 0.22;
        this.autoSwitchToAvailableWeapon();
        return;
      }

      // Consume 1 belt round directly from reserve
      this.player.ammo.belts -= 1;
      this.weaponFireTimer = weapon.fireRate;
      this.stats.shotsFired += 1;
      this.lastChaingunShotTime = this.gameTime;

      // Track continuous heat accumulation (1.0 heat per belt round fired)
      if (!this.player.chaingunOverheat) {
        this.player.chaingunOverheat = {
          heat: 0,
          maxHeat: 50,
          shotsFired: 0,
          maxShots: 50,
          isOverheated: false,
          cooldownTimer: 0,
          maxCooldown: 3.0,
        };
      }
      this.player.chaingunOverheat.heat = Math.min(50, this.player.chaingunOverheat.heat + 1.0);
      this.player.chaingunOverheat.shotsFired = Math.round(this.player.chaingunOverheat.heat);
      this.player.weaponHeat = (this.player.chaingunOverheat.heat / 50) * 100;

      // Check if 50-belt threshold reached -> trigger 3-second locked overheat cooldown
      if (this.player.chaingunOverheat.heat >= 50) {
        this.player.chaingunOverheat.isOverheated = true;
        this.player.chaingunOverheat.cooldownTimer = 3.0;
        this.player.weaponHeat = 100;
        this.weaponFireTimer = 0.35;
        soundSynth.playChaingunOverheat();
        this.spawnFloatingText('🔥 50-BELT THRESHOLD REACHED! ROTARY OVERHEAT [3.0s]! 🔥', this.player.x, this.player.y, '#ef4444', true, 22);
        this.particles.spawnSparks(this.player.x, this.player.y, 0.4, '#ef4444', 24);
      }

      // Weapon Animation & Recoil
      this.player.weaponAnim.frame = (this.player.weaponAnim.frame % 2) + 1;
      this.player.weaponAnim.muzzleFlash = true;
      this.player.weaponAnim.recoilY = weapon.recoil;
      this.player.weaponAnim.recoilBumpY = 5;
      this.player.weaponAnim.shootFlashIntensity = 0.22;
      this.player.weaponAnim.recoilVel = 26;
      this.player.screenShake = Math.max(this.player.screenShake, 2.5);

      // Eject physical brass shell casing sideways
      this.particles.spawnShellCasing(this.player.x, this.player.y, this.player.angle, 'brass_bullet');

      soundSynth.playChaingun();

      // Alert lurking enemies in the maze within acoustic radius (20 units)
      for (const enemy of this.mapData.enemies) {
        if (enemy.health > 0 && (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'search')) {
          const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
          if (dist < 20) {
            enemy.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            const hasLOS = this.checkLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y);
            if (hasLOS) {
              enemy.state = 'chase';
            } else {
              enemy.state = 'search';
              enemy.searchTimer = 4.5;
            }
          }
        }
      }

      const spreadAngle = (Math.random() - 0.5) * weapon.spread;
      const shootAngle = this.player.angle + spreadAngle;
      this.executeHitscan(shootAngle, weapon.damage * damageMult, weapon.range, weapon.knockback);
      return;
    }

    // Check Magazine Ammo for reloadable weapons (Pistol, Shotgun, Plasma)
    if (weapon.magazine <= 0) {
      if (this.player.ammo[weapon.ammoType] > 0) {
        this.reloadWeapon();
      } else {
        soundSynth.playEmptyClick();
        this.weaponFireTimer = 0.3;
        this.autoSwitchToAvailableWeapon();
      }
      return;
    }

    // Consume 1 round from magazine
    weapon.magazine -= 1;
    this.weaponFireTimer = weapon.fireRate;
    this.stats.shotsFired += weapon.pellets;
    if (weapon.type === 'shotgun') {
      this.player.weaponHeat = Math.min(100, (this.player.weaponHeat || 0) + 14.0);
    } else if (weapon.type === 'plasma') {
      this.player.weaponHeat = Math.min(100, (this.player.weaponHeat || 0) + 6.0);
    } else if (weapon.type === 'pistol') {
      this.player.weaponHeat = Math.min(100, (this.player.weaponHeat || 0) + 3.0);
    }

    // Weapon Animation & Recoil
    this.player.weaponAnim.frame = 1;
    this.player.weaponAnim.muzzleFlash = true;
    this.player.weaponAnim.recoilY = weapon.recoil;
    if (weapon.type === 'shotgun') {
      this.player.weaponAnim.recoilBumpY = 16;
      this.player.weaponAnim.shootFlashIntensity = 0.40;
      this.player.weaponAnim.recoilVel = 42;
    } else if (weapon.type === 'plasma') {
      this.player.weaponAnim.recoilBumpY = 8;
      this.player.weaponAnim.shootFlashIntensity = 0.28;
      this.player.weaponAnim.recoilVel = 32;
    } else {
      this.player.weaponAnim.recoilBumpY = 7;
      this.player.weaponAnim.shootFlashIntensity = 0.25;
      this.player.weaponAnim.recoilVel = 28;
    }
    this.player.screenShake = Math.max(this.player.screenShake, weapon.recoil * 0.4);

    // Audio
    if (weapon.type === 'pistol') {
      soundSynth.playPistol();
      this.particles.spawnShellCasing(this.player.x, this.player.y, this.player.angle, 'brass_bullet');
    } else if (weapon.type === 'shotgun') {
      soundSynth.playShotgun();
      this.particles.spawnShellCasing(this.player.x, this.player.y, this.player.angle, 'shotgun_red');
      // Heavy shotgun kick roll tilt
      this.player.cameraTiltAngle = (this.player.cameraTiltAngle || 0) + (Math.random() > 0.5 ? 0.038 : -0.038);
    } else if (weapon.type === 'plasma') {
      soundSynth.playPlasmaRifle();
    }

    // Alert lurking enemies in the maze within acoustic radius (20 units)
    for (const enemy of this.mapData.enemies) {
      if (enemy.health > 0 && (enemy.state === 'idle' || enemy.state === 'patrol' || enemy.state === 'search')) {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist < 20) {
          enemy.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
          const hasLOS = this.checkLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y);
          if (hasLOS) {
            enemy.state = 'chase';
          } else {
            enemy.state = 'search';
            enemy.searchTimer = 4.5;
          }
        }
      }
    }

    // Projectile vs Hitscan execution
    if (weapon.type === 'plasma') {
      // Launch glowing blue plasma ball
      const pSpeed = 16.0;
      this.projectiles.push({
        id: this.nextProjId++,
        x: this.player.x + Math.cos(this.player.angle) * 0.4,
        y: this.player.y + Math.sin(this.player.angle) * 0.4,
        z: 0.45,
        vx: Math.cos(this.player.angle) * pSpeed,
        vy: Math.sin(this.player.angle) * pSpeed,
        vz: 0,
        damage: weapon.damage * damageMult,
        radius: 0.25,
        fromPlayer: true,
        type: 'plasma_blue',
        life: 0,
        maxLife: 3.0,
        splashRadius: 1.5,
      });
    } else {
      // Hitscan firing (Pistol, Shotgun)
      for (let p = 0; p < weapon.pellets; p++) {
        const spreadAngle = (Math.random() - 0.5) * weapon.spread;
        const shootAngle = this.player.angle + spreadAngle;
        this.executeHitscan(shootAngle, weapon.damage * damageMult, weapon.range, weapon.knockback, p === 0);
      }
    }
  }

  private executeHitscan(angle: number, damage: number, maxRange: number, knockback: number, playImpactAudio = true) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // Step ray
    const stepSize = 0.1;
    let currDist = 0.2;
    let hitEnemy: Enemy | null = null;
    let hitChest: LootChest | null = null;
    let hitWallX = 0;
    let hitWallY = 0;
    let hitSide: 0 | 1 = 0;

    while (currDist < maxRange) {
      currDist += stepSize;
      const testX = this.player.x + dirX * currDist;
      const testY = this.player.y + dirY * currDist;

      // 1. Check Enemies
      for (const e of this.mapData.enemies) {
        if (e.health > 0) {
          const d = Math.hypot(e.x - testX, e.y - testY);
          if (d < e.radius) {
            hitEnemy = e;
            break;
          }
        }
      }
      if (hitEnemy) break;

      // 2. Check Supply Chests (shoot to open)
      if (this.mapData.chests) {
        for (const c of this.mapData.chests) {
          if (!c.opened) {
            if (Math.hypot(c.x - testX, c.y - testY) < 0.45) {
              hitChest = c;
              break;
            }
          }
        }
      }
      if (hitChest) break;

      // 3. Check Walls
      const mapX = Math.floor(testX);
      const mapY = Math.floor(testY);
      if (this.mapData.grid[mapY] && this.mapData.grid[mapY][mapX] > 0) {
        hitWallX = testX;
        hitWallY = testY;
        hitSide = Math.abs(testX - mapX - 0.5) > Math.abs(testY - mapY - 0.5) ? 0 : 1;
        break;
      }
    }

    if (hitEnemy) {
      this.stats.shotsHit++;
      this.damageEnemy(hitEnemy, damage, dirX * knockback, dirY * knockback);
      if (playImpactAudio) soundSynth.playFleshHit();
      this.particles.spawnSparks(hitEnemy.x, hitEnemy.y, 0.5, hitEnemy.type === 'vile_spitter' ? '#22c55e' : '#dc2626', 4);
    } else if (hitChest) {
      this.stats.shotsHit++;
      this.openChest(hitChest);
    } else if (hitWallX !== 0) {
      // Hit wall -> ricochet sound + spark + bullet hole decal
      if (playImpactAudio) soundSynth.playWallRicochet();
      this.particles.spawnSparks(hitWallX, hitWallY, 0.5, '#facc15', 8);
      const mX = Math.floor(hitWallX);
      const mY = Math.floor(hitWallY);
      const offset = hitSide === 0 ? hitWallY - mY : hitWallX - mX;
      this.particles.addWallDecal(mX, mY, hitSide, offset, 0.5, 'bullet_hole');

      // Check if shooting a secret wall reveals the hidden passage
      for (const sec of this.mapData.secrets) {
        if (!sec.revealed && ((sec.doorX === mX && sec.doorY === mY) || (sec.triggerX === mX && sec.triggerY === mY))) {
          sec.revealed = true;
          this.mapData.grid[sec.doorY][sec.doorX] = 0;
          this.stats.secretsFound++;
          soundSynth.playSecretDoorSlide();
          soundSynth.playSecretDiscovery();
          this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.5, '#facc15', 24);
          this.spawnFloatingText(`⭐ SECRET REVEALED: ${sec.name}! (${this.stats.secretsFound}/${this.stats.totalSecrets})`, 0, 0, '#facc15', false, 20);
          this.spawnFloatingText(`REWARD: ${sec.rewardDescription}`, 0, 0, '#38bdf8', false, 17);
        }
      }
    }
  }

  // --- DAMAGE ENEMY & GIB LOGIC ---
  public damageEnemy(enemy: Enemy, amount: number, kx = 0, ky = 0) {
    if (enemy.health <= 0) return;

    // Shield check for boss
    if (enemy.type === 'boss' && this.boss.shieldActive) {
      soundSynth.playWallRicochet();
      this.particles.spawnSparks(enemy.x, enemy.y, 0.5, '#38bdf8', 12);
      return;
    }

    // Vulnerability Bonus if attacking a STAGGERED demon (+50% amplified critical execution damage)
    let effectiveDamage = amount;
    const wasStaggered = enemy.state === 'staggered';
    if (wasStaggered) {
      effectiveDamage *= 1.5;
      this.spawnFloatingText('⚡ CRIT EXECUTION! ⚡', enemy.x, enemy.y, '#facc15', false, 15);
      this.hitstopTimer = 0.045; // Micro hit-stun pause
      soundSynth.playHeavyImpactCrunch();
    }

    enemy.health -= effectiveDamage;
    enemy.vx += kx;
    enemy.vy += ky;
    enemy.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
    const alreadyInPain = (enemy.painTimer || 0) > 0.05;
    enemy.state = wasStaggered && enemy.health > 0 ? 'staggered' : 'pain';
    enemy.stateTimer = 0.22;
    enemy.painTimer = 0.28;
    enemy.hitFlashTimer = 0.14; // High-impact white-flash hit reaction
    this.stats.damageDealt += effectiveDamage;

    // Cast persistent blood decals on floor
    this.particles.addFloorDecal(enemy.x, enemy.y, 0.45 + Math.random() * 0.35, enemy.type === 'vile_spitter' ? 'slime' : 'blood');

    // Cast blood splatters to adjacent walls
    this.castBloodSplattersToWalls(enemy.x, enemy.y, kx !== 0 || ky !== 0 ? Math.atan2(ky, kx) : Math.random() * Math.PI * 2, 2);

    // Tactical Alert Propagation: Alert nearby allies within acoustic radius (12 units)
    for (const ally of this.mapData.enemies) {
      if (ally.health > 0 && ally.id !== enemy.id && (ally.state === 'idle' || ally.state === 'patrol')) {
        const allyDist = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
        if (allyDist < 12.0) {
          ally.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
          ally.state = this.checkLineOfSight(ally.x, ally.y, this.player.x, this.player.y) ? 'chase' : 'search';
          ally.searchTimer = 4.5;
        }
      }
    }

    if (enemy.type === 'boss') {
      this.stats.bossDamage += effectiveDamage;
    }

    // Floating damage text
    this.spawnFloatingText(`-${Math.round(effectiveDamage)}`, enemy.x, enemy.y, wasStaggered ? '#facc15' : '#ef4444');

    // Stagger interrupt logic:
    // 1. Smaller enemies stagger when brought below 35% health or taking heavy hits (opening them for glory kill melee finisher [F])
    // 2. Heavy/elite demons stagger on heavy burst damage (interrupting their attacks and increasing weapon damage)
    const isSmall = this.isSmallerEnemy(enemy);
    const shouldStaggerSmall = isSmall && (enemy.health <= enemy.maxHealth * 0.35 || effectiveDamage >= 24);
    const shouldStaggerHeavy = !isSmall && (effectiveDamage >= 36 || (this.player.currentWeapon === 'shotgun' && effectiveDamage >= 24));

    if (
      enemy.health > 0 &&
      !wasStaggered &&
      (shouldStaggerSmall || shouldStaggerHeavy)
    ) {
      enemy.state = 'staggered';
      enemy.staggerTimer = isSmall ? 3.0 : 2.4;
      enemy.attackCooldown = Math.max(enemy.attackCooldown, 2.6);
      soundSynth.playDemonStagger(enemy.type);
      this.particles.spawnSparks(enemy.x, enemy.y, 0.6, isSmall ? '#f59e0b' : '#c084fc', 14);
      this.spawnFloatingText(isSmall ? '⚡ STAGGERED [EXECUTE F]! ⚡' : '⚡ STAGGERED! ⚡', enemy.x, enemy.y, isSmall ? '#facc15' : '#c084fc', false, 18);
      this.hitstopTimer = 0.04;
    }

    if (enemy.health <= 0) {
      // Gibs ONLY fall when killed or executed with shotgun, plasma, fist/berserk, or when executing a staggered demon
      const isGibKill =
        this.player.currentWeapon === 'shotgun' ||
        this.player.currentWeapon === 'plasma' ||
        this.player.currentWeapon === 'fist' ||
        this.player.berserkTimer > 0 ||
        wasStaggered;
      this.killEnemy(enemy, isGibKill);
    } else if (!alreadyInPain) {
      soundSynth.playEnemyPain();
    }
  }

  public castBloodSplattersToWalls(originX: number, originY: number, baseAngle: number, count = 2) {
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (Math.random() - 0.5) * 1.6;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let curX = originX;
      let curY = originY;
      const step = 0.12;
      for (let s = 0; s < 22; s++) {
        curX += dirX * step;
        curY += dirY * step;
        const mX = Math.floor(curX);
        const mY = Math.floor(curY);
        if (mY >= 0 && mY < this.mapData.height && mX >= 0 && mX < this.mapData.width) {
          if (this.mapData.grid[mY][mX] > 0) {
            const hitSide: 0 | 1 = Math.abs(curX - mX - 0.5) > Math.abs(curY - mY - 0.5) ? 0 : 1;
            const wallOffset = hitSide === 0 ? curY - mY : curX - mX;
            const wallZ = 0.3 + Math.random() * 0.4;
            this.particles.addWallDecal(mX, mY, hitSide, wallOffset, wallZ, 'blood_splat');
            break;
          }
        }
      }
    }
  }

  private killEnemy(enemy: Enemy, violentGib: boolean) {
    enemy.health = 0;
    this.stats.kills++;

    // Register combo
    this.addComboKill();

    // Fill Tachometer Kill-O'Meter progress toward Boss Lockdown
    if (enemy.type !== 'boss') {
      this.levelKills++;
      
      // Count remaining living non-boss enemies on this stage
      const remainingLiving = this.mapData.enemies.filter(
        e => e.type !== 'boss' && e.id !== enemy.id && e.health > 0
      ).length;

      if (remainingLiving === 0) {
        // Meter fills to 100% full ONLY if ALL enemies are killed on the level!
        this.killOMeter = 100;
        soundSynth.playRedlineWarning();
        this.spawnFloatingText('🚨 ALL LEVEL HOSTILES EXTERMINATED! 🚨', 0, 0, '#ef4444', false, 24);
        this.spawnFloatingText('⚡ MAX REDLINE: BOSS LOCKDOWN ENGAGED! ⚡', 0, 0, '#facc15', false, 22);
      } else {
        const targetTotal = Math.max(this.totalLevelEnemies, this.levelKills + remainingLiving);
        this.totalLevelEnemies = targetTotal;
        this.killOMeter = Math.min(99, Math.round((this.levelKills / targetTotal) * 100));
        soundSynth.playTachometerRev();
      }

      // Check Boss Lockdown Trigger (Engaged strictly when all level hostiles are eliminated)
      if (this.killOMeter >= 100 && !this.boss.active && !this.boss.spawned) {
        this.triggerBossLockdown();
      }
    }

    if (violentGib) {
      // Explode into flying bloody gibs with micro hitstop & visceral crunch!
      this.stats.gibs++;
      enemy.state = 'gibbed';
      enemy.corpseTimer = 0;
      this.hitstopTimer = 0.045; // 45ms impact freeze
      this.player.screenShake = Math.min(0.65, this.player.screenShake + 0.35);
      this.player.cameraTiltAngle = (this.player.cameraTiltAngle || 0) + (Math.random() > 0.5 ? 0.03 : -0.03);
      soundSynth.playGibExplosion();
      soundSynth.playHeavyImpactCrunch();
      this.particles.spawnGibExplosion(enemy.x, enemy.y, enemy.type === 'baron' ? 12 : 8, true, enemy.type);
      this.particles.addFloorDecal(enemy.x, enemy.y, 0.75, enemy.type === 'vile_spitter' ? 'slime' : 'blood');
      this.castBloodSplattersToWalls(enemy.x, enemy.y, Math.random() * Math.PI * 2, 4);
    } else {
      enemy.state = 'dead';
      enemy.corpseTimer = 0;
      soundSynth.playEnemyDeath(enemy.type);
    }

    // Glory Siphon: Melee Knuckle kills restore vital health and armor
    if (this.player.currentWeapon === 'fist') {
      const healHp = 8;
      const healArmor = 4;
      if (this.player.health < this.player.maxHealth) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + healHp);
      }
      if (this.player.armor < this.player.maxArmor) {
        this.player.armor = Math.min(this.player.maxArmor, this.player.armor + healArmor);
      }
      this.player.healFlash = 0.45;
      soundSynth.playGloryKillSiphon();
      this.spawnFloatingText(`+${healHp} HP [GLORY SIPHON]`, this.player.x, this.player.y, '#22c55e', false, 18);
    }

    // Score calculation based on enemy difficulty
    const enemyScores: Record<string, number> = {
      grunt: 100,
      imp: 200,
      scuttler: 250,
      plasma_gunner: 350,
      vile_spitter: 500,
      baron: 1000,
      lost_soul: 150,
      boss: enemy.isUltraBoss ? 10000 : 5000,
    };
    const baseScore = enemyScores[enemy.type] || 200;
    const comboMult = this.combo.multiplier || 1;
    const gibMult = violentGib ? 1.5 : 1.0;
    const eliteMult = enemy.isElite ? 1.5 : 1.0;
    const earnedScore = Math.round(baseScore * comboMult * gibMult * eliteMult);

    this.stats.score += earnedScore;
    this.spawnFloatingText(`+${earnedScore} PTS`, enemy.x, enemy.y, '#facc15', false, 18);

    // Random health, ammo, or armor loot drop when killed (85% on normal enemies, 100% on barons and elites)
    const lootChance = enemy.isElite || enemy.type === 'baron' ? 1.0 : 0.85;
    if (Math.random() < lootChance) {
      let pool: PickupItem['type'][] = [];

      if (enemy.isElite || enemy.isUltraBoss) {
        // High chance for Elites to drop rare rotary chaingun belts!
        pool = ['ammo_belts', 'ammo_belts', 'medkit_large', 'armor_large', 'ammo_cells', 'ammo_shells'];
      } else if (enemy.type === 'baron') {
        pool = ['ammo_belts', 'medkit_large', 'armor_large', 'ammo_cells', 'ammo_shells'];
      } else if (enemy.type === 'vile_spitter') {
        pool = ['ammo_belts', 'ammo_cells', 'medkit_large', 'armor_large'];
      } else if (enemy.type === 'grunt') {
        pool = ['ammo_bullets', 'ammo_bullets', 'medkit_small', 'armor_small'];
      } else if (enemy.type === 'imp') {
        pool = ['ammo_shells', 'ammo_bullets', 'medkit_small', 'armor_small'];
      } else if (enemy.type === 'scuttler') {
        pool = ['ammo_shells', 'medkit_small', 'armor_small', 'ammo_bullets'];
      } else if (enemy.type === 'plasma_gunner') {
        pool = ['ammo_cells', 'ammo_cells', 'ammo_bullets', 'armor_small', 'medkit_small'];
      } else if (enemy.type === 'lost_soul') {
        pool = ['medkit_small', 'ammo_cells', 'armor_small'];
      } else {
        pool = ['medkit_large', 'armor_large', 'ammo_cells', 'ammo_shells', 'ammo_bullets'];
      }

      let pick = pool[Math.floor(Math.random() * pool.length)];

      // For regular non-elite enemies, make belt drops rare (only 5% chance)
      if (!enemy.isElite && enemy.type !== 'baron' && enemy.type !== 'vile_spitter' && enemy.type !== 'boss') {
        if (pick === 'ammo_belts' && Math.random() > 0.05) {
          pick = 'ammo_bullets';
        }
      }

      this.mapData.pickups.push({
        id: Date.now() + Math.random(),
        x: enemy.x,
        y: enemy.y,
        type: pick,
        collected: false,
        bobPhase: Math.random() * 5,
      });

      soundSynth.playLootDrop();
      this.particles.spawnSparks(enemy.x, enemy.y, 0.4, '#38bdf8', 10);
      this.spawnFloatingText('LOOT DROP!', enemy.x, enemy.y, '#38bdf8', false, 14);
    }

    // Boss Defeated
    if (enemy.type === 'boss') {
      if (this.currentStage >= this.totalStages) {
        this.triggerWardenMutationSequence();
      } else {
        this.mapData.exitUnlocked = true;
        soundSynth.playStageClear();
        this.spawnFloatingText(`⚡ SECTOR ${this.currentStage} BOSS DEFEATED! ENTER THE RIFT! ⚡`, this.player.x, this.player.y, '#38bdf8', true, 24);
      }
    }
  }

  public triggerWardenMutationSequence() {
    this.isMutating = true;
    this.mutationTimer = 0;
    this.mutationPhase = 1;
    this.isWardenMutationEnd = true;
    this.stats.isWardenMutationEnd = true;
    this.isLockdown = false;
    this.boss.active = false;

    // Halt velocity & cancel firing
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isFiring = false;

    // Lock player movement and release Pointer Lock
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock();
    }

    soundSynth.playBossAlarm();
    this.spawnFloatingText('⚠️ THE WARDEN HAS FALLEN... ⚠️', this.player.x, this.player.y, '#c084fc', true, 28);
  }

  // --- COMBO KILL-STREAK SYSTEM ---
  private addComboKill() {
    this.combo.count++;
    this.combo.timer = this.combo.maxTimer;

    let tier = 1;
    let name = 'DOUBLE KILL!';
    if (this.combo.count >= 8) {
      tier = 5;
      name = '⚡ GODLIKE!! ⚡';
      this.combo.multiplier = 3.0;
      this.player.berserkTimer = 4.0; // Auto-Berserk on Godlike!
    } else if (this.combo.count >= 6) {
      tier = 4;
      name = '🔥 RAMPAGE!! 🔥';
      this.combo.multiplier = 2.5;
    } else if (this.combo.count >= 4) {
      tier = 3;
      name = 'ULTRA KILL!';
      this.combo.multiplier = 2.0;
    } else if (this.combo.count >= 2) {
      tier = 2;
      name = 'TRIPLE KILL!';
      this.combo.multiplier = 1.5;
    } else {
      this.combo.multiplier = 1.0;
      name = '';
    }

    this.combo.tierName = name;
    if (tier > 1) {
      soundSynth.playComboFanfare(tier);
      this.spawnFloatingText(name, 0, 0, '#fde047', false, 24);
    }

    if (this.combo.count > this.stats.maxCombo) {
      this.stats.maxCombo = this.combo.count;
    }
  }

  // --- BOSS LOCKDOWN EVENT ---
  private triggerBossLockdown() {
    const isUltra = this.currentStage === 4;
    this.boss.active = true;
    this.boss.spawned = true;
    this.boss.isUltra = isUltra;
    const stageBossNames = [
      '',
      'CYBER-CENTURION COMMANDER',
      'TOXIC REFINERY OVERLORD',
      'HELLFIRE ARCH-TITAN',
      'THE WARDEN'
    ];
    this.boss.name = stageBossNames[this.currentStage] || (isUltra ? 'THE WARDEN' : 'CYBER-TITAN GOLIATH');
    this.isLockdown = true;

    // Siren sound & alarm
    soundSynth.playBossAlarm();
    soundSynth.setMusicIntensity(3);

    // Open Boss Arena Gates (clear blast doors)
    const midY = Math.min(10, this.mapData.height - 5);
    const midX = Math.floor(this.mapData.width / 2);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.mapData.grid[midY + dy] && this.mapData.grid[midY + dy][midX + dx] === 4) {
          this.mapData.grid[midY + dy][midX + dx] = 0;
        }
      }
    }

    // Health scaling based on stage and difficulty (Stage 4 Warden high HP)
    const stageBaseHps = [0, 380, 620, 950, 2500];
    const baseHp = stageBaseHps[this.currentStage] || (isUltra ? 2500 : 800);
    const diffMult = this.difficulty === 'easy' ? 0.75 : (this.difficulty === 'hard' ? 1.25 : (this.difficulty === 'nightmare' ? 1.5 : 1.0));
    const finalHp = Math.round(baseHp * diffMult);

    // Spawn the Boss in North Sanctum with safe clearance
    const bossRadius = isUltra ? 0.95 : 0.8;
    const safeBossPos = this.findSafeEnemySpawnPos(this.mapData.bossSpawnPos.x, this.mapData.bossSpawnPos.y, bossRadius);
    const bossEnemy: Enemy = {
      id: 9999,
      type: 'boss',
      x: safeBossPos.x,
      y: safeBossPos.y,
      z: 0,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      health: finalHp,
      maxHealth: finalHp,
      state: 'chase',
      stateTimer: 0,
      animFrame: 0,
      speed: isUltra ? 3.3 : (this.currentStage === 1 ? 2.3 : 2.7),
      attackCooldown: isUltra ? 1.0 : (this.currentStage === 1 ? 1.7 : 1.4),
      isElite: true,
      isUltraBoss: isUltra,
      radius: bossRadius,
      spawnOrigin: { x: safeBossPos.x, y: safeBossPos.y },
    };
    this.mapData.enemies.push(bossEnemy);

    this.spawnFloatingText(
      isUltra ? '☠️ WARNING: APOCALYPSE ULTRA BOSS SPAWNED ☠️' : `⚠️ EMERGENCY: ${this.boss.name} DETECTED ⚠️`,
      0,
      0,
      '#ef4444',
      false,
      24
    );
  }

  // --- SUPPLY CHESTS ---
  public openChest(chest: LootChest): boolean {
    if (chest.opened) return false;
    chest.opened = true;
    chest.openAnimProgress = 1;

    soundSynth.playChestOpen();
    this.particles.spawnSparks(chest.x, chest.y, 0.4, '#38bdf8', 16);
    this.particles.spawnSparks(chest.x, chest.y, 0.4, '#facc15', 12);

    const type = chest.lootType || 'medkit_large';
    const amount = chest.lootAmount || 50;
    let lootLabel = chest.lootName || 'SUPPLIES';

    if (type === 'medkit_small') {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + amount);
      this.player.healFlash = 0.6;
      lootLabel = `+${amount} HEALTH PACK`;
    } else if (type === 'medkit_large') {
      this.player.health = Math.min(200, this.player.health + amount);
      this.player.healFlash = 0.8;
      lootLabel = `+${amount} MEGA HEALTH PACK`;
    } else if (type === 'armor_small') {
      this.player.armor = Math.min(this.player.maxArmor, this.player.armor + amount);
      this.player.armorFlash = 0.7;
      lootLabel = `+${amount} COMBAT ARMOR`;
    } else if (type === 'armor_large') {
      this.player.armor = Math.min(200, this.player.armor + amount);
      this.player.armorFlash = 1.0;
      lootLabel = `+${amount} HEAVY TITANIUM ARMOR`;
    } else if (type === 'ammo_bullets') {
      this.player.ammo.bullets += amount;
      lootLabel = `+${amount} CALIBER ROUNDS`;
    } else if (type === 'ammo_shells') {
      this.player.ammo.shells += amount;
      lootLabel = `+${amount} HEAVY SHELLS`;
    } else if (type === 'ammo_cells') {
      this.player.ammo.cells += amount;
      lootLabel = `+${amount} PLASMA CELLS`;
    } else if (type === 'ammo_belts') {
      this.player.ammo.belts += amount;
      lootLabel = `+${amount} ROTARY CHAINGUN BELTS`;
    } else if (type === 'berserk_sphere') {
      this.player.berserkTimer = 15.0;
      this.player.health = Math.max(100, this.player.health);
      soundSynth.playBerserkRage();
      lootLabel = `🔥 BERSERK COMBAT OVERDRIVE 🔥`;
    }

    this.player.healFlash = 0.5;
    this.spawnFloatingText(`📦 OPENED SUPPLY CHEST: ${lootLabel}! 📦`, this.player.x, this.player.y, '#facc15', true, 18);
    return true;
  }

  public updateChests(_dt: number) {
    if (!this.mapData.chests) return;
    for (const c of this.mapData.chests) {
      if (!c.opened) {
        const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
        // Automatically open if player walks into or close to chest
        if (dist < 1.0) {
          this.openChest(c);
        }
      }
    }
  }

  // --- DAMAGE PLAYER ---
  public damagePlayer(amount: number, fromX?: number, fromY?: number) {
    if (this.player.invulnerableTimer > 0 || this.player.health <= 0) return;

    // Difficulty scaling
    const diffMult = this.difficulty === 'easy' ? 0.6 : (this.difficulty === 'hard' ? 1.35 : (this.difficulty === 'nightmare' ? 1.75 : 1.0));
    const effectiveAmount = Math.max(1, Math.round(amount * diffMult));

    // Armor absorbs 60% of damage
    let remaining = effectiveAmount;
    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, Math.round(effectiveAmount * 0.6));
      this.player.armor -= absorbed;
      remaining -= absorbed;
    }

    this.player.health = Math.max(0, this.player.health - remaining);
    this.stats.damageTaken += effectiveAmount;
    this.player.damageFlash = 0.8;
    this.player.screenShake = Math.max(this.player.screenShake, 14);

    if (fromX !== undefined && fromY !== undefined) {
      this.player.lastDamageAngle = Math.atan2(fromY - this.player.y, fromX - this.player.x);
      // Directional camera tilt feedback:
      let diffAngle = this.player.lastDamageAngle - this.player.angle;
      while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
      while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;
      const tiltImpulse = (diffAngle > 0 ? -0.075 : 0.075) * Math.min(1.5, effectiveAmount / 20);
      this.player.cameraTiltAngle = (this.player.cameraTiltAngle || 0) + tiltImpulse;
    }

    if (this.player.health <= 0) {
      this.isGameOver = true;
      soundSynth.playPlayerDeath();
    } else {
      soundSynth.playPlayerPain();
    }
  }

  // Helper to check if an enemy is a smaller regular enemy (not an elite, boss, or heavyweight demon)
  public isSmallerEnemy(enemy: Enemy): boolean {
    if (enemy.isElite || enemy.isUltraBoss) return false;
    if (enemy.type === 'boss' || enemy.type === 'baron' || enemy.type === 'vile_spitter' || enemy.type === 'plasma_gunner') return false;
    return (
      enemy.type === 'grunt' ||
      enemy.type === 'imp' ||
      enemy.type === 'scuttler' ||
      enemy.type === 'lost_soul'
    );
  }

  // Trigger dedicated melee animation without firing held firearms or flashing muzzle flash
  private triggerMeleeAnimation(isFinisher: boolean) {
    this.weaponFireTimer = Math.max(this.weaponFireTimer, 0.28);
    this.player.meleeAnim = {
      active: true,
      timer: 0,
      maxTimer: 0.28,
      frame: isFinisher ? 2 : 1,
      isFinisher,
    };
    if (this.player.currentWeapon === 'fist') {
      this.player.weaponAnim.frame = isFinisher ? 2 : 1;
      this.player.weaponAnim.recoilY = 16;
      this.player.weaponAnim.recoilVel = 26;
    }
  }

  // --- GLORY KILL / MELEE FINISHER (DESIGNATED F KEY) ---
  public executeGloryKill(): boolean {
    if (this.isGameOver || this.isVictory || this.isPaused) return false;

    // 1. Check if player is trying to melee finisher an Elite monster, Boss, or Heavy demon in close melee range
    const MELEE_RANGE = 1.95;
    let closestImmuneTarget: Enemy | null = null;
    let closestImmuneDist = 999;

    for (const enemy of this.mapData.enemies) {
      if (enemy.health <= 0) continue;
      const isImmune = enemy.isElite || enemy.isUltraBoss || enemy.type === 'boss' || enemy.type === 'baron' || enemy.type === 'vile_spitter';
      if (!isImmune) continue;

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MELEE_RANGE) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToEnemy - this.player.angle);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

      if (angleDiff <= 1.25 && dist < closestImmuneDist) {
        closestImmuneDist = dist;
        closestImmuneTarget = enemy;
      }
    }

    if (closestImmuneTarget) {
      // Glory finisher strictly fails against elites and bosses - metal deflection!
      soundSynth.playWallRicochet();
      this.player.screenShake = Math.max(this.player.screenShake, 5);
      this.triggerMeleeAnimation(false);
      const isBoss = closestImmuneTarget.type === 'boss' || closestImmuneTarget.isUltraBoss;
      this.spawnFloatingText(
        isBoss ? '✦ BOSS: IMMUNE TO GLORY FINISHER! ✦' : '✦ ELITE: IMMUNE TO GLORY FINISHER! ✦',
        closestImmuneTarget.x,
        closestImmuneTarget.y,
        '#f87171',
        false,
        18
      );
      this.particles.spawnSparks(closestImmuneTarget.x, closestImmuneTarget.y, 0.5, '#c084fc', 12);
      return false;
    }

    // 2. Search for a living smaller regular enemy in close melee range (<= 1.95 units) that is in finisher threshold
    let bestFinisherTarget: Enemy | null = null;
    let bestFinisherDist = 999;
    let bestSmallEnemyInMelee: Enemy | null = null;
    let bestSmallDist = 999;

    for (const enemy of this.mapData.enemies) {
      if (enemy.health <= 0) continue;
      if (!this.isSmallerEnemy(enemy)) continue;

      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > MELEE_RANGE) continue;

      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToEnemy - this.player.angle);
      while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);

      if (angleDiff > 1.25) continue;

      // Track any close small enemy for normal quick-melee if not in finisher threshold
      if (dist < bestSmallDist) {
        bestSmallDist = dist;
        bestSmallEnemyInMelee = enemy;
      }

      // Check finisher vulnerability: staggered state or critically low health (<= 35% HP or <= 25 HP)
      const isFinisherVulnerable = enemy.state === 'staggered' || enemy.health <= enemy.maxHealth * 0.35 || enemy.health <= 25;
      if (isFinisherVulnerable && dist < bestFinisherDist) {
        bestFinisherDist = dist;
        bestFinisherTarget = enemy;
      }
    }

    if (bestFinisherTarget) {
      // Snap player angle towards target
      const dx = bestFinisherTarget.x - this.player.x;
      const dy = bestFinisherTarget.y - this.player.y;
      this.player.angle = Math.atan2(dy, dx);

      // Trigger dedicated melee finisher animation (does NOT fire weapons or trigger muzzle flash!)
      this.triggerMeleeAnimation(true);

      const damageMult = (this.player.berserkTimer > 0 ? 2.5 : 1.0) * (this.combo.multiplier > 1 ? 1.0 + (this.combo.multiplier - 1) * 0.25 : 1.0);
      const executeDamage = Math.max(bestFinisherTarget.health + 100, 260) * damageMult;

      soundSynth.playFist();
      soundSynth.playHeavyImpactCrunch();
      soundSynth.playGloryKillSiphon();

      this.hitstopTimer = 0.08;
      this.player.screenShake = 12;

      // Glory Kill siphon health & armor reward
      const healHp = 25;
      const healArmor = 15;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + healHp);
      this.player.armor = Math.min(this.player.maxArmor, this.player.armor + healArmor);
      this.player.healFlash = 0.65;

      // Visual punch particles & sparks
      this.particles.spawnSparks(bestFinisherTarget.x, bestFinisherTarget.y, 0.5, '#f59e0b', 24);

      // Deal lethal finisher damage & force gib execution
      this.damageEnemy(bestFinisherTarget, executeDamage, Math.cos(this.player.angle) * 1.8, Math.sin(this.player.angle) * 1.8);

      this.spawnFloatingText(
        '⚡ GLORY MELEE FINISHER! ⚡',
        bestFinisherTarget.x,
        bestFinisherTarget.y,
        '#facc15',
        false,
        22
      );
      this.spawnFloatingText(`+${healHp} HP  +${healArmor} ARMOR`, 0, 0, '#22c55e', false, 18);

      return true;
    }

    // 3. If there is an ordinary small enemy in close range, but NOT in finisher threshold:
    // It can only receive a standard quick melee punch (deals minor 25 damage, does NOT siphon, does NOT execute)
    if (bestSmallEnemyInMelee) {
      this.triggerMeleeAnimation(false);
      soundSynth.playFist();
      const punchDmg = 25 * (this.player.berserkTimer > 0 ? 2.5 : 1.0);
      this.damageEnemy(bestSmallEnemyInMelee, punchDmg, Math.cos(this.player.angle) * 1.0, Math.sin(this.player.angle) * 1.0);
      this.spawnFloatingText('👊 QUICK MELEE', bestSmallEnemyInMelee.x, bestSmallEnemyInMelee.y, '#f59e0b', false, 15);
      return false;
    }

    // 4. Whiff punch - play fist swing sound, trigger punch animation, and check secret/chest interact
    this.triggerMeleeAnimation(false);
    soundSynth.playFist();
    this.interact();
    return false;
  }

  // --- SECRET & CHEST INTERACTION ---
  public interact(): boolean {
    if (this.isGameOver || this.isVictory || this.isPaused) return false;

    // 1. Check Secret Walls
    for (const sec of this.mapData.secrets) {
      if (sec.revealed) continue;
      const distTrigger = Math.hypot((sec.triggerX + 0.5) - this.player.x, (sec.triggerY + 0.5) - this.player.y);
      const distDoor = Math.hypot((sec.doorX + 0.5) - this.player.x, (sec.doorY + 0.5) - this.player.y);
      if (distTrigger < 2.0 || distDoor < 2.0) {
        sec.revealed = true;
        this.mapData.grid[sec.doorY][sec.doorX] = 0; // slide wall open
        this.stats.secretsFound++;
        soundSynth.playSecretDoorSlide();
        soundSynth.playSecretDiscovery();
        this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.5, '#facc15', 24);
        this.spawnFloatingText(`⭐ SECRET REVEALED: ${sec.name}! (${this.stats.secretsFound}/${this.stats.totalSecrets})`, 0, 0, '#facc15', false, 20);
        this.spawnFloatingText(`REWARD: ${sec.rewardDescription}`, 0, 0, '#38bdf8', false, 17);
        return true;
      }
    }

    // 2. Check Supply Chests
    if (this.mapData.chests) {
      for (const c of this.mapData.chests) {
        if (!c.opened) {
          const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
          if (dist < 1.85) {
            return this.openChest(c);
          }
        }
      }
    }

    return false;
  }

  // Safe Enemy Spawn Position Discovery: guarantees no enemies ever spawn in walls or out of bounds
  public findSafeEnemySpawnPos(preferredX?: number, preferredY?: number, radius = 0.35): { x: number; y: number } {
    const minPadding = radius + 0.18; // clearance margin around bounding circle

    const isSafe = (cx: number, cy: number): boolean => {
      // 1. Boundary check: must be strictly inside map grid with margin
      if (cx < 1.2 || cx > this.mapData.width - 1.2 || cy < 1.2 || cy > this.mapData.height - 1.2) {
        return false;
      }
      // 2. Cell check: base tile must be completely open
      const gx = Math.floor(cx);
      const gy = Math.floor(cy);
      if (!this.mapData.grid[gy] || this.mapData.grid[gy][gx] !== 0) {
        return false;
      }
      // 3. Wall collision check with safety padding
      if (this.checkWallCollision(cx, cy, minPadding)) {
        return false;
      }
      // 4. Neutral zone check: do not spawn inside player's starting safe bunker
      const nz = this.mapData.neutralZone;
      if (nz && cx >= nz.minX - 0.5 && cx <= nz.maxX + 0.5 && cy >= nz.minY - 0.5 && cy <= nz.maxY + 0.5) {
        return false;
      }
      return true;
    };

    // If preferred coordinates are provided, check them first
    if (preferredX !== undefined && preferredY !== undefined) {
      if (isSafe(preferredX, preferredY)) {
        return { x: preferredX, y: preferredY };
      }
      // Spiral search outwards from preferred coordinates
      for (let r = 1; r <= 10; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (Math.abs(dx) === r || Math.abs(dy) === r) {
              const tx = Math.floor(preferredX) + dx + 0.5;
              const ty = Math.floor(preferredY) + dy + 0.5;
              if (isSafe(tx, ty)) {
                return { x: tx, y: ty };
              }
            }
          }
        }
      }
    }

    // Collect all open safe tiles across the active sector
    const openTiles: { x: number; y: number }[] = [];
    for (let y = 1; y < this.mapData.height - 1; y++) {
      for (let x = 1; x < this.mapData.width - 1; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        if (isSafe(cx, cy)) {
          const pDist = Math.hypot(cx - this.player.x, cy - this.player.y);
          if (pDist > 4.5) {
            openTiles.push({ x: cx, y: cy });
          }
        }
      }
    }

    if (openTiles.length > 0) {
      return openTiles[Math.floor(Math.random() * openTiles.length)];
    }

    // Fallback: any walkable cell with collision clearance
    for (let y = 1; y < this.mapData.height - 1; y++) {
      for (let x = 1; x < this.mapData.width - 1; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        if (this.mapData.grid[y] && this.mapData.grid[y][x] === 0 && !this.checkWallCollision(cx, cy, radius)) {
          return { x: cx, y: cy };
        }
      }
    }

    return { x: this.mapData.playerStart.x, y: this.mapData.playerStart.y };
  }

  // --- WAVE ASSAULT SYSTEM ---
  public startWave(waveNum: number) {
    this.currentWave = waveNum;
    this.stats.waveReached = Math.max(this.stats.waveReached, waveNum);
    this.waveBanner = `DEMONIC ASSAULT: WAVE ${waveNum}`;
    this.waveBannerTimer = 3.5;
    soundSynth.playWaveIncoming();
    this.spawnFloatingText(`⚠️ WAVE ${waveNum} INCOMING! ⚠️`, 0, 0, '#ef4444', false, 20);

    if (this.currentStage === 1) {
      // Stage 1: Strictly introductory Grunts, Imps, and Scuttlers
      if (waveNum === 1) {
        this.spawnEnemyAt(14.0, 22.0, 'grunt', false);
        this.spawnEnemyAt(18.0, 22.0, 'grunt', false);
        this.spawnEnemyAt(16.0, 18.0, 'scuttler', false);
      } else if (waveNum === 2) {
        this.spawnEnemyAt(12.0, 18.0, 'scuttler', false);
        this.spawnEnemyAt(20.0, 18.0, 'scuttler', false);
        this.spawnEnemyAt(16.0, 16.0, 'imp', false);
        this.spawnEnemyAt(16.0, 22.0, 'grunt', false);
      } else if (waveNum === 3) {
        this.spawnEnemyAt(14.0, 16.0, 'imp', false);
        this.spawnEnemyAt(18.0, 16.0, 'imp', false);
        this.spawnEnemyAt(12.0, 20.0, 'scuttler', false);
        this.spawnEnemyAt(20.0, 20.0, 'scuttler', false);
        this.spawnEnemyAt(16.0, 24.0, 'grunt', true);
      } else if (waveNum >= 4) {
        if (!this.boss.active && !this.boss.spawned) {
          this.triggerBossLockdown();
        } else {
          this.spawnRandomEnemyWave();
        }
      }
    } else if (this.currentStage === 2) {
      // Stage 2: Introduces Vile Spitters and Plasma Gunners
      if (waveNum === 1) {
        this.spawnEnemyAt(14.0, 22.0, 'grunt', false);
        this.spawnEnemyAt(18.0, 22.0, 'imp', false);
        this.spawnEnemyAt(16.0, 18.0, 'scuttler', false);
      } else if (waveNum === 2) {
        this.spawnEnemyAt(12.0, 18.0, 'plasma_gunner', false);
        this.spawnEnemyAt(20.0, 18.0, 'scuttler', true);
        this.spawnEnemyAt(16.0, 16.0, 'imp', true);
      } else if (waveNum === 3) {
        this.spawnEnemyAt(14.0, 16.0, 'vile_spitter', false);
        this.spawnEnemyAt(18.0, 16.0, 'plasma_gunner', true);
        this.spawnEnemyAt(16.0, 22.0, 'scuttler', true);
      } else if (waveNum >= 4) {
        if (!this.boss.active && !this.boss.spawned) {
          this.triggerBossLockdown();
        } else {
          this.spawnRandomEnemyWave();
        }
      }
    } else if (this.currentStage === 3) {
      // Stage 3: Introduces Demonic Barons of Hell & Lost Souls
      if (waveNum === 1) {
        this.spawnEnemyAt(14.0, 22.0, 'imp', false);
        this.spawnEnemyAt(18.0, 22.0, 'plasma_gunner', false);
        this.spawnEnemyAt(16.0, 18.0, 'lost_soul', false);
      } else if (waveNum === 2) {
        this.spawnEnemyAt(12.0, 18.0, 'vile_spitter', true);
        this.spawnEnemyAt(20.0, 18.0, 'plasma_gunner', true);
        this.spawnEnemyAt(16.0, 16.0, 'lost_soul', false);
      } else if (waveNum === 3) {
        this.spawnEnemyAt(16.0, 14.0, 'baron', true);
        this.spawnEnemyAt(12.0, 18.0, 'vile_spitter', true);
        this.spawnEnemyAt(20.0, 18.0, 'plasma_gunner', true);
      } else if (waveNum >= 4) {
        if (!this.boss.active && !this.boss.spawned) {
          this.triggerBossLockdown();
        } else {
          this.spawnRandomEnemyWave();
        }
      }
    } else {
      // Stage 4: Apocalypse Demonic Horde
      if (waveNum === 1) {
        this.spawnEnemyAt(14.0, 22.0, 'plasma_gunner', true);
        this.spawnEnemyAt(18.0, 22.0, 'vile_spitter', true);
        this.spawnEnemyAt(16.0, 18.0, 'lost_soul', false);
      } else if (waveNum === 2) {
        this.spawnEnemyAt(12.0, 18.0, 'baron', true);
        this.spawnEnemyAt(20.0, 18.0, 'plasma_gunner', true);
        this.spawnEnemyAt(16.0, 16.0, 'vile_spitter', true);
      } else if (waveNum === 3) {
        this.spawnEnemyAt(14.0, 14.0, 'baron', true);
        this.spawnEnemyAt(18.0, 14.0, 'baron', true);
        this.spawnEnemyAt(16.0, 20.0, 'plasma_gunner', true);
      } else if (waveNum >= 4) {
        if (!this.boss.active && !this.boss.spawned) {
          this.triggerBossLockdown();
        } else {
          this.spawnRandomEnemyWave();
          this.spawnRandomEnemyWave();
        }
      }
    }
  }

  private spawnEnemyAt(x: number, y: number, type: Enemy['type'], isElite: boolean) {
    let radius = 0.35;
    if (type === 'baron') radius = 0.45;
    else if (type === 'vile_spitter') radius = 0.44;
    else if (type === 'plasma_gunner') radius = 0.38;
    else if (type === 'scuttler' || type === 'lost_soul') radius = 0.32;

    const safePos = this.findSafeEnemySpawnPos(x, y, radius);
    let health = 40;
    if (type === 'baron') health = 220;
    else if (type === 'vile_spitter') health = 140;
    else if (type === 'plasma_gunner') health = 90;
    else if (type === 'imp') health = 70;
    else if (type === 'scuttler') health = 55;
    else if (type === 'lost_soul') health = 45;

    const diffHpMult = this.difficulty === 'easy' ? 0.75 : (this.difficulty === 'hard' ? 1.25 : (this.difficulty === 'nightmare' ? 1.5 : 1.0));
    const speedMult = this.difficulty === 'easy' ? 0.85 : (this.difficulty === 'hard' ? 1.18 : (this.difficulty === 'nightmare' ? 1.38 : 1.0));
    const cdMult = this.difficulty === 'easy' ? 1.35 : (this.difficulty === 'hard' ? 0.82 : (this.difficulty === 'nightmare' ? 0.68 : 1.0));

    let baseSpeed = 2.2 * speedMult;
    if (type === 'scuttler') baseSpeed = 5.4 * speedMult;
    else if (type === 'lost_soul') baseSpeed = 4.5 * speedMult;
    else if (type === 'plasma_gunner') baseSpeed = 3.2 * speedMult;
    else if (type === 'imp') baseSpeed = 2.6 * speedMult;
    else if (type === 'baron') baseSpeed = 2.4 * speedMult;
    else if (type === 'vile_spitter') baseSpeed = 2.1 * speedMult;

    const finalHp = Math.round(health * diffHpMult * (isElite ? 1.5 : 1.0));

    this.mapData.enemies.push({
      id: Date.now() + Math.random(),
      type,
      x: safePos.x,
      y: safePos.y,
      z: 0,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      health: finalHp,
      maxHealth: finalHp,
      state: 'patrol',
      stateTimer: 1.5 + Math.random() * 2.0,
      patrolTimer: 3.0 + Math.random() * 3.0,
      animFrame: 0,
      speed: baseSpeed,
      attackCooldown: +(1.4 * cdMult).toFixed(2),
      isElite,
      radius,
      spawnOrigin: { x: safePos.x, y: safePos.y },
    });
  }

  // --- FLOATING TEXT ---
  public spawnFloatingText(text: string, x: number, y: number, color = '#ffffff', isWorld = false, fontSize = 16) {
    this.floatingTexts.push({
      id: this.nextTextId++,
      text,
      x,
      y,
      color,
      alpha: 1.0,
      life: 0,
      maxLife: 1.8,
      isWorld,
      fontSize,
    });
  }

  // --- CORE GAME UPDATE TICK (60 FPS) ---
  public update(dt: number, moveForward: number, moveRight: number) {
    if (this.isPaused || this.isGameOver || this.isVictory) return;

    // Mutation Sequence State Machine
    if (this.isMutating) {
      this.mutationTimer += dt;
      this.player.vx = 0;
      this.player.vy = 0;
      this.player.isFiring = false;

      // Phase 1 (0–13s): 10 seconds added to original 0-3s duration
      if (this.mutationTimer < 13.0) {
        this.mutationPhase = 1;
        // Screen-shake pulses with increasing seismic tremors
        const pulse = Math.sin(this.mutationTimer * 7.0);
        this.player.screenShake = Math.max(this.player.screenShake, pulse > 0.2 ? pulse * 10.0 : 2.5);
      } else if (this.mutationTimer < 27.0) {
        // Phase 2 (13–27s): 10 seconds added to original 3-7s duration
        if (this.mutationPhase === 1) {
          soundSynth.playBerserkRage();
        }
        this.mutationPhase = 2;
        // Ominous rhythmic sub-bass pulse shake
        this.player.screenShake = Math.max(0.5, Math.sin(this.mutationTimer * 3.5) * 3.0);
      } else {
        // Phase 3 (27s+): Final transition to Warden Game Over modal
        this.mutationPhase = 3;
        this.isMutating = false;
        this.isGameOver = true;
        this.stats.isWardenMutationEnd = true;
        if (typeof document !== 'undefined' && document.pointerLockElement) {
          document.exitPointerLock();
        }
      }

      this.particles.update(dt, this.mapData.grid);
      return;
    }

    // Micro Hit-Stun (Hitstop): 35-50ms visual pause on heavy impact crunch
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      if (this.player.screenShake > 0) {
        this.player.screenShake = Math.max(0, this.player.screenShake - dt * 25);
      }
      return;
    }

    this.gameTime += dt;
    this.stats.timeElapsed += dt;

    // Check Exit Portal Proximity & Trigger Level Warp Transition
    if (this.mapData.exitUnlocked && this.mapData.exitPos) {
      // Atmospheric Exit Depressurization Steam & Particle Venting
      if (Math.random() < dt * 4.5) {
        this.particles.spawnSteam(
          this.mapData.exitPos.x + (Math.random() - 0.5) * 0.45,
          this.mapData.exitPos.y + (Math.random() - 0.5) * 0.45,
          0.2,
          2,
          1.3
        );
      }

      const distToExit = Math.hypot(this.player.x - this.mapData.exitPos.x, this.player.y - this.mapData.exitPos.y);
      if (distToExit < 1.35 && !this.levelTransition.active) {
        if (this.currentStage >= this.totalStages) {
          this.isVictory = true;
          soundSynth.playStageClear();
          return;
        }
        this.levelTransition.active = true;
        this.levelTransition.timer = 2.4;
        this.levelTransition.maxTimer = 2.4;
        this.levelTransition.fromStage = this.currentStage;
        this.levelTransition.toStage = this.currentStage + 1;
        this.levelTransition.stageName = `SECTOR ${this.currentStage + 1}`;
        soundSynth.playTeleport();
        soundSynth.playStageClear();
      }
    }

    // Level Transition warp timer
    if (this.levelTransition.active) {
      this.levelTransition.timer -= dt;
      if (this.levelTransition.timer <= 0) {
        this.levelTransition.active = false;
        this.advanceToNextStage();
        return;
      }
    }

    // Check Neutral Zone Exit
    if (this.inNeutralZone && this.player.y < this.mapData.neutralZone.minY) {
      this.inNeutralZone = false;
      this.startWave(1);
    }

    // Auto-check secrets proximity as walk-up discovery
    for (const sec of this.mapData.secrets) {
      if (!sec.revealed && Math.hypot((sec.triggerX + 0.5) - this.player.x, (sec.triggerY + 0.5) - this.player.y) < 0.85) {
        this.interact();
      }
    }

    // Wave Banner Timer
    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer -= dt;
      if (this.waveBannerTimer <= 0) {
        this.waveBanner = '';
      }
    }

    // Weapon Reload Processing
    if (this.player.reload.isReloading) {
      this.player.reload.timer -= dt;
      if (this.player.reload.timer <= 0) {
        this.player.reload.isReloading = false;
        const curW = this.player.weapons[this.player.currentWeapon];
        if (curW && curW.type !== 'fist') {
          const needed = curW.maxMagazine - curW.magazine;
          const available = this.player.ammo[curW.ammoType];
          const toLoad = Math.min(needed, available);
          curW.magazine += toLoad;
          this.player.ammo[curW.ammoType] -= toLoad;
          this.spawnFloatingText(`MAG LOADED [${curW.magazine}/${curW.maxMagazine}]`, this.player.x, this.player.y, '#22c55e', false, 16);
        }
      }
    }

    // Timers
    if (this.weaponFireTimer > 0) this.weaponFireTimer -= dt;

    // Frame-bound Auto-Reload when magazine is empty and reserve ammo is available
    if (!this.player.reload.isReloading && this.weaponFireTimer <= 0) {
      const curW = this.player.weapons[this.player.currentWeapon];
      if (
        curW &&
        curW.type !== 'fist' &&
        curW.needsReload &&
        curW.magazine === 0 &&
        this.player.ammo[curW.ammoType] > 0
      ) {
        this.reloadWeapon();
      }
    }
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= dt;
    if (this.player.berserkTimer > 0) this.player.berserkTimer -= dt;
    if (this.player.screenShake > 0) this.player.screenShake = Math.max(0, this.player.screenShake - dt * 25);
    if (this.player.damageFlash > 0) this.player.damageFlash = Math.max(0, this.player.damageFlash - dt * 2.5);
    if (this.player.healFlash > 0) this.player.healFlash = Math.max(0, this.player.healFlash - dt * 2.5);
    if ((this.player.armorFlash || 0) > 0) this.player.armorFlash = Math.max(0, (this.player.armorFlash || 0) - dt * 2.5);

    // Dynamic Chaingun Overheat & Heat Dissipation Loop
    if (this.player.chaingunOverheat) {
      if (this.player.chaingunOverheat.isOverheated) {
        this.player.chaingunOverheat.cooldownTimer = Math.max(0, this.player.chaingunOverheat.cooldownTimer - dt);
        this.player.chaingunOverheat.heat = (this.player.chaingunOverheat.cooldownTimer / this.player.chaingunOverheat.maxCooldown) * 50.0;
        this.player.chaingunOverheat.shotsFired = Math.round(this.player.chaingunOverheat.heat);
        
        if (this.player.currentWeapon === 'chaingun') {
          this.player.weaponHeat = (this.player.chaingunOverheat.heat / 50.0) * 100;
          // Venting cooling sparks/steam particles around player
          if (Math.random() < dt * 8.0) {
            this.particles.spawnSparks(this.player.x, this.player.y, 0.3, '#38bdf8', 2);
          }
        }

        // Cooldown finished!
        if (this.player.chaingunOverheat.cooldownTimer <= 0) {
          this.player.chaingunOverheat.isOverheated = false;
          this.player.chaingunOverheat.cooldownTimer = 0;
          this.player.chaingunOverheat.heat = 0;
          this.player.chaingunOverheat.shotsFired = 0;
          if (this.player.currentWeapon === 'chaingun') {
            this.player.weaponHeat = 0;
          }
          soundSynth.playChaingunCooled();
          this.spawnFloatingText('❄️ ROTARY CHAINGUN COOLED & READY! ❄️', this.player.x, this.player.y, '#38bdf8', false, 18);
        }
      } else {
        // Natural gradual cooling when not actively shooting (e.g. trigger released for >0.2s)
        const timeSinceLastShot = this.gameTime - this.lastChaingunShotTime;
        if (timeSinceLastShot > 0.22 && this.player.chaingunOverheat.heat > 0) {
          this.player.chaingunOverheat.heat = Math.max(0, this.player.chaingunOverheat.heat - dt * 5.0);
          this.player.chaingunOverheat.shotsFired = Math.round(this.player.chaingunOverheat.heat);
          if (this.player.currentWeapon === 'chaingun') {
            this.player.weaponHeat = (this.player.chaingunOverheat.heat / 50.0) * 100;
          }
        }
      }
    }

    if (this.player.currentWeapon !== 'chaingun' && (this.player.weaponHeat || 0) > 0) {
      this.player.weaponHeat = Math.max(0, (this.player.weaponHeat || 0) - dt * 24);
    }

    // Weapon Inspect Animation Progression
    if (this.player.inspectAnim && this.player.inspectAnim.active) {
      this.player.inspectAnim.timer += dt;
      if (this.player.inspectAnim.timer >= this.player.inspectAnim.maxTimer) {
        this.player.inspectAnim.active = false;
      }
    }

    // Camera Tilt Physics: strafe roll + damage flinch decay
    const strafeTargetRoll = (moveRight > 0 ? 0.024 : (moveRight < 0 ? -0.024 : 0));
    this.player.cameraTiltAngle = (this.player.cameraTiltAngle || 0) * (1 - Math.min(1, dt * 9)) + strafeTargetRoll * Math.min(1, dt * 9);

    // Spatial Demon Snarls & Audio Directionality Ambience
    this.ambientDemonAudioTimer -= dt;
    if (this.ambientDemonAudioTimer <= 0) {
      this.ambientDemonAudioTimer = 2.4 + Math.random() * 2.2;
      this.triggerSpatialDemonAudio();
    }

    // Dash Cooldown & Active
    if (this.player.dash.cooldown > 0) this.player.dash.cooldown -= dt;
    if (this.player.dash.active) {
      this.player.dash.duration -= dt;
      if (this.player.dash.duration <= 0) {
        this.player.dash.active = false;
      }
    }

    // Combo Timer
    if (this.combo.timer > 0) {
      this.combo.timer -= dt;
      if (this.combo.timer <= 0) {
        this.combo.count = 0;
        this.combo.multiplier = 1.0;
        this.combo.tierName = '';
      }
    }

    // 1. Player Movement & Wall Collision
    this.updatePlayerMovement(dt, moveForward, moveRight);

    // Update fog-of-war explored cells based on player's continuous line-of-sight
    this.updateExploration();

    // 2. Weapon Animation update
    this.updateWeaponAnimation(dt);

    // 3. Projectiles update
    this.updateProjectiles(dt);

    // 4. Enemy AI & Spawns
    this.updateEnemies(dt);

    // 5. Item Pickups & Supply Chests
    this.updatePickups(dt);
    this.updateChests(dt);

    // 6. Particles update
    this.particles.update(dt, this.mapData.grid);

    // 7. Floating Texts update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      ft.alpha = Math.max(0, 1.0 - ft.life / ft.maxLife);
      if (ft.isWorld) {
        ft.y -= dt * 0.4;
      }
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // --- PLAYER MOVEMENT ---
  private updatePlayerMovement(dt: number, moveForward: number, moveRight: number) {
    let speed = 4.8 * (this.player.berserkTimer > 0 ? 1.4 : 1.0);
    let targetVx = 0;
    let targetVy = 0;

    if (this.player.dash.active) {
      speed = 14.0;
      targetVx = this.player.dash.dirX * speed;
      targetVy = this.player.dash.dirY * speed;
      // Spawn dash speed line particles
      if (Math.random() < 0.4) {
        this.particles.spawnSparks(this.player.x, this.player.y, 0.2, '#38bdf8', 2);
      }
    } else if (moveForward !== 0 || moveRight !== 0) {
      const cos = Math.cos(this.player.angle);
      const sin = Math.sin(this.player.angle);
      const len = Math.hypot(moveForward, moveRight) || 1;
      const nx = (moveForward * cos - moveRight * sin) / len;
      const ny = (moveForward * sin + moveRight * cos) / len;
      targetVx = nx * speed;
      targetVy = ny * speed;
    }

    // Kinematic momentum smoothing: Snappy responsiveness + butter-smooth physical deceleration
    const currentVx = this.player.vx || 0;
    const currentVy = this.player.vy || 0;
    const isMoving = targetVx !== 0 || targetVy !== 0;
    const accelRate = this.player.dash.active ? 50 : (isMoving ? 26 : 20);

    const smoothVx = currentVx + (targetVx - currentVx) * Math.min(1.0, dt * accelRate);
    const smoothVy = currentVy + (targetVy - currentVy) * Math.min(1.0, dt * accelRate);

    const vx = Math.abs(smoothVx) < 0.005 ? 0 : smoothVx;
    const vy = Math.abs(smoothVy) < 0.005 ? 0 : smoothVy;

    // Collision Box Sliding with diagonal corner prevention & sub-pixel depenetration
    this.player.lastMoveVx = vx;
    this.player.lastMoveVy = vy;
    this.player.vx = vx;
    this.player.vy = vy;

    const moved = this.moveEntityWithWallSlide(this.player.x, this.player.y, vx, vy, 0.30, dt);
    this.player.x = moved.x;
    this.player.y = moved.y;
  }

  private checkWallCollision(x: number, y: number, r: number): boolean {
    const minX = Math.floor(x - r);
    const maxX = Math.floor(x + r);
    const minY = Math.floor(y - r);
    const maxY = Math.floor(y + r);

    for (let my = minY; my <= maxY; my++) {
      for (let mx = minX; mx <= maxX; mx++) {
        if (my < 0 || my >= this.mapData.height || mx < 0 || mx >= this.mapData.width) {
          return true;
        }
        if (this.mapData.grid[my] && this.mapData.grid[my][mx] > 0) {
          return true;
        }
      }
    }
    return false;
  }

  // Depenetration Solver: Guarantees entity is never trapped inside wall geometry
  private resolveWallDepenetration(x: number, y: number, r: number): { x: number; y: number } {
    let curX = x;
    let curY = y;
    const minX = Math.floor(curX - r - 0.5);
    const maxX = Math.floor(curX + r + 0.5);
    const minY = Math.floor(curY - r - 0.5);
    const maxY = Math.floor(curY + r + 0.5);

    for (let my = minY; my <= maxY; my++) {
      for (let mx = minX; mx <= maxX; mx++) {
        if (my < 0 || my >= this.mapData.height || mx < 0 || mx >= this.mapData.width || (this.mapData.grid[my] && this.mapData.grid[my][mx] > 0)) {
          const nearestX = Math.max(mx, Math.min(mx + 1, curX));
          const nearestY = Math.max(my, Math.min(my + 1, curY));
          const dx = curX - nearestX;
          const dy = curY - nearestY;
          const distSq = dx * dx + dy * dy;
          if (distSq < r * r) {
            const dist = Math.sqrt(distSq);
            if (dist > 0.0001) {
              const overlap = r - dist + 0.005;
              curX += (dx / dist) * overlap;
              curY += (dy / dist) * overlap;
            } else {
              // Deep inside tile, resolve along closest bounding edge
              const toLeft = curX - mx;
              const toRight = (mx + 1) - curX;
              const toTop = curY - my;
              const toBottom = (my + 1) - curY;
              const minEdge = Math.min(toLeft, toRight, toTop, toBottom);
              if (minEdge === toLeft) curX = mx - r - 0.01;
              else if (minEdge === toRight) curX = mx + 1 + r + 0.01;
              else if (minEdge === toTop) curY = my - r - 0.01;
              else curY = my + 1 + r + 0.01;
            }
          }
        }
      }
    }
    return { x: curX, y: curY };
  }

  // Smooth continuous wall sliding with diagonal corner safety & depenetration
  private moveEntityWithWallSlide(x: number, y: number, vx: number, vy: number, radius: number, dt: number): { x: number; y: number } {
    const nextX = x + vx * dt;
    const nextY = y + vy * dt;
    let resX = x;
    let resY = y;

    const canMoveX = !this.checkWallCollision(nextX, y, radius);
    const canMoveY = !this.checkWallCollision(x, nextY, radius);

    if (canMoveX && canMoveY) {
      if (!this.checkWallCollision(nextX, nextY, radius)) {
        resX = nextX;
        resY = nextY;
      } else {
        if (Math.abs(vx) > Math.abs(vy)) resX = nextX;
        else resY = nextY;
      }
    } else if (canMoveX) {
      resX = nextX;
    } else if (canMoveY) {
      resY = nextY;
    }

    return this.resolveWallDepenetration(resX, resY, radius);
  }

  // --- WEAPON ANIMATION ---
  private updateWeaponAnimation(dt: number) {
    const anim = this.player.weaponAnim;
    anim.recoilPos = anim.recoilPos || 0;
    anim.recoilVel = anim.recoilVel || 0;

    // Spring displacement recoil physics: velocity += kick; position += velocity; velocity -= position * spring; velocity *= damping;
    const spring = 140;
    const damping = 0.80;
    anim.recoilVel -= anim.recoilPos * spring * dt;
    anim.recoilVel *= Math.pow(damping, dt * 60);
    anim.recoilPos += anim.recoilVel * dt;
    anim.recoilPos = Math.max(0, anim.recoilPos);

    if (this.player.weaponAnim.recoilY > 0) {
      this.player.weaponAnim.recoilY = Math.max(0, this.player.weaponAnim.recoilY - dt * 45);
    }
    if (this.player.weaponAnim.recoilBumpY && this.player.weaponAnim.recoilBumpY > 0) {
      this.player.weaponAnim.recoilBumpY = Math.max(0, this.player.weaponAnim.recoilBumpY - dt * 38);
    }
    if (this.player.weaponAnim.shootFlashIntensity && this.player.weaponAnim.shootFlashIntensity > 0) {
      this.player.weaponAnim.shootFlashIntensity = Math.max(0, this.player.weaponAnim.shootFlashIntensity - dt * 18.0);
    }
    if (this.player.weaponAnim.switchAnim && this.player.weaponAnim.switchAnim > 0) {
      this.player.weaponAnim.switchAnim = Math.max(0, this.player.weaponAnim.switchAnim - dt * 5.2);
    }
    if (this.player.weaponAnim.muzzleFlash) {
      this.player.weaponAnim.timer += dt;
      if (this.player.weaponAnim.timer > 0.08) {
        this.player.weaponAnim.muzzleFlash = false;
        this.player.weaponAnim.timer = 0;
        this.player.weaponAnim.frame = 0;
      }
    }
    if (this.player.meleeAnim && this.player.meleeAnim.active) {
      this.player.meleeAnim.timer += dt;
      if (this.player.meleeAnim.timer >= this.player.meleeAnim.maxTimer) {
        this.player.meleeAnim.active = false;
        if (this.player.currentWeapon === 'fist') {
          this.player.weaponAnim.frame = 0;
        }
      }
    }
  }

  // --- PROJECTILES ---
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Wall hit check
      const mapX = Math.floor(p.x);
      const mapY = Math.floor(p.y);
      let hit = false;

      if (mapY < 0 || mapY >= this.mapData.height || mapX < 0 || mapX >= this.mapData.width || (this.mapData.grid[mapY] && this.mapData.grid[mapY][mapX] > 0)) {
        hit = true;
        if (p.fromPlayer) {
          for (const sec of this.mapData.secrets) {
            if (!sec.revealed && ((sec.doorX === mapX && sec.doorY === mapY) || (sec.triggerX === mapX && sec.triggerY === mapY))) {
              sec.revealed = true;
              this.mapData.grid[sec.doorY][sec.doorX] = 0;
              this.stats.secretsFound++;
              soundSynth.playSecretDoorSlide();
              soundSynth.playSecretDiscovery();
              this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.5, '#facc15', 24);
              this.spawnFloatingText(`⭐ SECRET REVEALED: ${sec.name}! (${this.stats.secretsFound}/${this.stats.totalSecrets})`, 0, 0, '#facc15', false, 20);
              this.spawnFloatingText(`REWARD: ${sec.rewardDescription}`, 0, 0, '#38bdf8', false, 17);
            }
          }
        }
      }

      // Enemy hit check
      if (!hit && p.fromPlayer) {
        for (const e of this.mapData.enemies) {
          if (e.health > 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            this.damageEnemy(e, p.damage);
            hit = true;
            break;
          }
        }
      }

      // Player hit check
      if (!hit && !p.fromPlayer) {
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < 0.35 + p.radius) {
          this.damagePlayer(p.damage, p.x, p.y);
          hit = true;
        }
      }

      if (hit || p.life >= p.maxLife) {
        // Detonate impact / splash
        if (p.type === 'acid_glob') {
          soundSynth.playAcidSplat();
          this.particles.spawnSparks(p.x, p.y, p.z, '#4ade80', 20);
          this.particles.spawnSparks(p.x, p.y, p.z, '#22c55e', 14);
          this.particles.addFloorDecal(p.x, p.y, 0.65, 'slime');
          // Area splash damage to player if nearby
          if (!p.fromPlayer) {
            const splashDist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
            if (splashDist < (p.splashRadius || 1.8)) {
              const falloff = 1.0 - splashDist / (p.splashRadius || 1.8);
              this.damagePlayer(Math.round(p.damage * falloff * 0.75), p.x, p.y);
            }
          }
        } else if (p.type === 'plasma_blue' || p.type === 'plasma_green') {
          soundSynth.playPlasmaRifle();
          this.particles.spawnSparks(p.x, p.y, p.z, p.type === 'plasma_blue' ? '#38bdf8' : '#22c55e', 14);
          this.particles.addFloorDecal(p.x, p.y, 0.4, p.type === 'plasma_blue' ? 'plasma_burn' : 'scorch');
          // Splash damage for player plasma projectiles
          if (p.fromPlayer && p.splashRadius && p.splashRadius > 0) {
            for (const other of this.mapData.enemies) {
              if (other.health > 0) {
                const sDist = Math.hypot(other.x - p.x, other.y - p.y);
                if (sDist < p.splashRadius) {
                  const falloff = 1.0 - sDist / p.splashRadius;
                  this.damageEnemy(other, Math.round(p.damage * falloff * 0.5));
                }
              }
            }
          }
        } else {
          soundSynth.playExplosion();
          this.particles.spawnSparks(p.x, p.y, p.z, '#ea580c', 16);
          this.particles.addFloorDecal(p.x, p.y, 0.4, 'scorch');
        }
        this.projectiles.splice(i, 1);
      }
    }
  }

  // Helper to discover a clear patrol waypoint near an enemy
  private findPatrolWaypoint(fromX: number, fromY: number, origin?: { x: number; y: number }): { x: number; y: number } {
    const center = origin || { x: fromX, y: fromY };
    for (let attempts = 0; attempts < 12; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 2.5 + Math.random() * 4.0;
      const tx = center.x + Math.cos(angle) * dist;
      const ty = center.y + Math.sin(angle) * dist;
      const gx = Math.floor(tx);
      const gy = Math.floor(ty);
      if (
        gx >= 1 && gx < this.mapData.width - 1 &&
        gy >= 1 && gy < this.mapData.height - 1 &&
        this.mapData.grid[gy] && this.mapData.grid[gy][gx] === 0 &&
        !this.checkWallCollision(tx, ty, 0.45)
      ) {
        return { x: tx, y: ty };
      }
    }
    return { x: fromX, y: fromY };
  }

  // Intelligent Obstacle-Aware Steering with Whisker Corner Probing & Flanking
  private steerEnemySmartly(
    e: Enemy,
    targetX: number,
    targetY: number,
    baseSpeed: number,
    dt: number,
    flankAngle = 0,
    keepDistance = 0
  ) {
    // If enemy is currently stunned by pain/flinch, slow down significantly
    const speed = (e.painTimer && e.painTimer > 0) ? baseSpeed * 0.25 : baseSpeed;

    const dx = targetX - e.x;
    const dy = targetY - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 0.05) return;

    let desiredAngle = Math.atan2(dy, dx) + flankAngle;

    // Distancing & Tactical Formation: Backpedal or lateral circle-strafe if too close
    if (keepDistance > 0) {
      if (dist < keepDistance * 0.7) {
        // Backpedal away from target
        desiredAngle = Math.atan2(e.y - targetY, e.x - targetX);
      } else if (dist < keepDistance) {
        // Lateral circle strafe around target
        const strafeSign = e.strafeDir || 1;
        desiredAngle = Math.atan2(dy, dx) + (Math.PI / 2) * strafeSign;
      }
    }

    // Unstuck assistance: if enemy has been stuck against a wall or corner, apply evasion angle
    if (e.unstuckNudgeAngle !== undefined && (e.stuckTimer || 0) > 0) {
      desiredAngle = e.unstuckNudgeAngle;
    }

    // Whisker probes: direct angle first, then alternating angled probes to discover open pathways around corners
    const testAngles = [
      desiredAngle,
      desiredAngle + Math.PI / 6,       // +30 deg
      desiredAngle - Math.PI / 6,       // -30 deg
      desiredAngle + Math.PI / 3,       // +60 deg
      desiredAngle - Math.PI / 3,       // -60 deg
      desiredAngle + Math.PI / 2,       // +90 deg
      desiredAngle - Math.PI / 2,       // -90 deg
      desiredAngle + (2 * Math.PI) / 3, // +120 deg
      desiredAngle - (2 * Math.PI) / 3, // -120 deg
    ];

    let chosenVx = 0;
    let chosenVy = 0;
    let foundPath = false;

    const stepDist = speed * dt;
    const checkDist = Math.max(stepDist * 1.5, e.radius + 0.12);

    for (const ang of testAngles) {
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      const probeX = e.x + Math.cos(ang) * checkDist;
      const probeY = e.y + Math.sin(ang) * checkDist;

      if (!this.checkWallCollision(probeX, probeY, e.radius)) {
        chosenVx = vx;
        chosenVy = vy;
        foundPath = true;
        break;
      }
    }

    if (!foundPath) {
      chosenVx = Math.cos(desiredAngle) * speed;
      chosenVy = Math.sin(desiredAngle) * speed;
    }

    const prevX = e.x;
    const prevY = e.y;
    const moved = this.moveEntityWithWallSlide(e.x, e.y, chosenVx, chosenVy, e.radius, dt);
    e.x = moved.x;
    e.y = moved.y;

    const actualMoved = Math.hypot(e.x - prevX, e.y - prevY);
    if (actualMoved < 0.12 * speed * dt) {
      e.stuckTimer = (e.stuckTimer || 0) + dt;
      if (e.stuckTimer > 0.3) {
        // Pick an escape flank angle perpendicular to desired angle
        const sign = Math.random() < 0.5 ? 1 : -1;
        e.unstuckNudgeAngle = Math.atan2(dy, dx) + (Math.PI / 2) * sign;
        if (e.stuckTimer > 1.2) {
          // Relocate safely if severely wedged
          const safe = this.findSafeEnemySpawnPos(e.x, e.y, e.radius);
          e.x = safe.x;
          e.y = safe.y;
          e.stuckTimer = 0;
          e.unstuckNudgeAngle = undefined;
        }
      }
    } else {
      e.stuckTimer = Math.max(0, (e.stuckTimer || 0) - dt * 2);
      if (e.stuckTimer <= 0) {
        e.unstuckNudgeAngle = undefined;
      }
    }
  }

  // --- ENEMY AI & SPAWNS ---
  private updateEnemies(dt: number) {
    // 1. Spawning Escalation (Reinforcement waves during Boss Lockdown Arena battle)
    if (this.isLockdown && this.boss.active && this.boss.spawned && this.mapData.enemies.filter(e => e.health > 0).length < 8) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnRandomEnemyWave();
        this.spawnTimer = Math.max(3.0, 7.0 - (this.stats.kills * 0.05));
      }
    }

    // 2. Boss Special Attacks Update
    if (this.boss.active && this.boss.spawned) {
      this.updateBossBehavior(dt);
    }

    // 3. Enemy-to-Enemy Soft Separation (prevents crowd-clipping and sticking)
    for (let a = 0; a < this.mapData.enemies.length; a++) {
      const e1 = this.mapData.enemies[a];
      if (e1.health <= 0) continue;
      for (let b = a + 1; b < this.mapData.enemies.length; b++) {
        const e2 = this.mapData.enemies[b];
        if (e2.health <= 0) continue;
        const edx = e2.x - e1.x;
        const edy = e2.y - e1.y;
        const eDist = Math.hypot(edx, edy);
        const minDist = (e1.radius || 0.35) + (e2.radius || 0.35);
        if (eDist > 0.001 && eDist < minDist) {
          const overlap = (minDist - eDist) * 0.5;
          const pushX = (edx / eDist) * overlap;
          const pushY = (edy / eDist) * overlap;
          if (!this.checkWallCollision(e1.x - pushX * 0.5, e1.y - pushY * 0.5, e1.radius)) {
            e1.x -= pushX * 0.5;
            e1.y -= pushY * 0.5;
          }
          if (!this.checkWallCollision(e2.x + pushX * 0.5, e2.y + pushY * 0.5, e2.radius)) {
            e2.x += pushX * 0.5;
            e2.y += pushY * 0.5;
          }
        }
      }
    }

    // 4. Enemy State Machine & Tactical AI
    for (let i = this.mapData.enemies.length - 1; i >= 0; i--) {
      const e = this.mapData.enemies[i];

      // Dead / Corpse Handling & Disappearance Lifecycle (vanish after 3.5s)
      if (e.health <= 0 || e.state === 'dead' || e.state === 'gibbed') {
        e.corpseTimer = (e.corpseTimer || 0) + dt;
        if (e.corpseTimer >= 3.5) {
          this.mapData.enemies.splice(i, 1);
        }
        continue;
      }

      // Staggered State: immobilize enemy while vulnerable
      if (e.state === 'staggered') {
        if (e.staggerTimer !== undefined) {
          e.staggerTimer -= dt;
          if (e.staggerTimer <= 0) {
            e.state = 'chase';
          }
        }
        if (Math.random() < 0.2) {
          this.particles.spawnSparks(e.x, e.y, 0.6, '#facc15', 2);
        }
        continue;
      }

      // Guarantee depenetration and non-wall grid containment every frame
      const gx = Math.floor(e.x);
      const gy = Math.floor(e.y);
      if (
        gy < 1 || gy >= this.mapData.height - 1 ||
        gx < 1 || gx >= this.mapData.width - 1 ||
        (this.mapData.grid[gy] && this.mapData.grid[gy][gx] > 0)
      ) {
        const safe = this.findSafeEnemySpawnPos(e.x, e.y, e.radius);
        e.x = safe.x;
        e.y = safe.y;
      } else {
        const depen = this.resolveWallDepenetration(e.x, e.y, e.radius);
        e.x = depen.x;
        e.y = depen.y;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const distToPlayer = Math.hypot(dx, dy);

      // Line of Sight check
      const hasLOS = this.checkLineOfSight(e.x, e.y, this.player.x, this.player.y);
      const detectionRange = e.isElite || e.type === 'baron' || e.type === 'boss' ? 20 : 16;

      if (e.attackCooldown > 0) e.attackCooldown -= dt;
      if (e.specialStateTimer && e.specialStateTimer > 0) e.specialStateTimer -= dt;
      if (e.painTimer && e.painTimer > 0) e.painTimer -= dt;
      if (e.hitFlashTimer && e.hitFlashTimer > 0) e.hitFlashTimer -= dt;

      // Update strafing timer and lateral direction
      if (e.strafeTimer !== undefined) {
        e.strafeTimer -= dt;
        if (e.strafeTimer <= 0) {
          e.strafeDir = (Math.random() < 0.5 ? 1 : -1) * (Math.random() < 0.7 ? 1 : 0);
          e.strafeTimer = 1.0 + Math.random() * 2.0;
        }
      } else {
        e.strafeDir = Math.random() < 0.5 ? 1 : -1;
        e.strafeTimer = 1.5;
      }

      // Knockback / Velocity Friction with wall collision checks
      if (Math.abs(e.vx) > 0.01 || Math.abs(e.vy) > 0.01) {
        const moved = this.moveEntityWithWallSlide(e.x, e.y, e.vx, e.vy, e.radius, dt);
        e.x = moved.x;
        e.y = moved.y;
        e.vx *= Math.pow(0.1, dt);
        e.vy *= Math.pow(0.1, dt);
      }

      // STATE MACHINE EXECUTION
      switch (e.state) {
        case 'idle': {
          e.stateTimer -= dt;
          // Look around
          e.angle += Math.sin(this.gameTime * 2) * 0.02;

          // Sensory Perception: direct sight or acoustic proximity
          if ((hasLOS && distToPlayer < detectionRange) || distToPlayer < 3.5) {
            e.state = 'chase';
            e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            soundSynth.playEnemyAlert(e.type);
          } else if (e.stateTimer <= 0) {
            e.state = 'patrol';
            e.patrolTarget = this.findPatrolWaypoint(e.x, e.y, e.spawnOrigin);
            e.patrolTimer = 3.5 + Math.random() * 3.0;
          }
          break;
        }

        case 'patrol': {
          // Sensory Perception: direct sight or acoustic proximity
          if ((hasLOS && distToPlayer < detectionRange) || distToPlayer < 3.5) {
            e.state = 'chase';
            e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            soundSynth.playEnemyAlert(e.type);
            break;
          }

          e.patrolTimer = (e.patrolTimer || 3.0) - dt;
          if (!e.patrolTarget || e.patrolTimer <= 0) {
            e.state = 'idle';
            e.stateTimer = 1.5 + Math.random() * 2.0;
            break;
          }

          const ptx = e.patrolTarget.x - e.x;
          const pty = e.patrolTarget.y - e.y;
          const ptDist = Math.hypot(ptx, pty);

          if (ptDist < 0.6) {
            // Reached waypoint! Pause and look around
            e.state = 'idle';
            e.stateTimer = 1.5 + Math.random() * 2.0;
          } else {
            e.angle = Math.atan2(pty, ptx);
            const patrolSpeed = e.speed * 0.45;
            this.steerEnemySmartly(e, e.patrolTarget.x, e.patrolTarget.y, patrolSpeed, dt);
            e.animFrame = Math.floor(this.gameTime * 3.5) % 2;
          }
          break;
        }

        case 'chase': {
          e.angle = Math.atan2(dy, dx);

          // If player has broken line of sight (ducked behind wall/corner), switch to search
          if (!hasLOS) {
            e.state = 'search';
            e.searchTimer = 4.5;
            break;
          }

          // Player is spotted: refresh last known position
          e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };

          const isEnraged = (e.type === 'baron' && e.health < e.maxHealth * 0.5) || e.isElite;
          let spd = e.speed * (isEnraged ? 1.35 : 1.0);

          let flankAngle = 0;
          let keepDistance = 0;

          if (e.type === 'grunt') {
            keepDistance = 3.8;
            flankAngle = (e.strafeDir || 1) * 0.35;
          } else if (e.type === 'imp') {
            keepDistance = 5.0;
            flankAngle = (e.strafeDir || 1) * 0.4;
          } else if (e.type === 'scuttler') {
            // Fast zig-zag predator flanking & leaping
            flankAngle = Math.sin(this.gameTime * 12 + e.id) * 0.65;
            // Check leap pounce when closing in
            if (distToPlayer < 3.6 && (!e.specialStateTimer || e.specialStateTimer <= 0)) {
              spd *= 2.2;
              soundSynth.playScuttlerLeap();
              e.specialStateTimer = 2.2;
            }
          } else if (e.type === 'plasma_gunner') {
            // Tactical standoff kiting & circle-strafing
            keepDistance = 6.8;
            flankAngle = (e.strafeDir || 1) * 0.75;
          } else if (e.type === 'vile_spitter') {
            // Heavy artillery bio-mortar positioning
            keepDistance = 9.5;
            flankAngle = Math.sin(this.gameTime * 2.5 + e.id) * 0.5;
          } else if (e.type === 'lost_soul') {
            flankAngle = Math.sin(this.gameTime * 6) * 0.45;
          } else if (e.type === 'baron') {
            flankAngle = 0; // Inexorable direct march
          } else if (e.type === 'boss') {
            keepDistance = 4.5;
            flankAngle = Math.sin(this.gameTime * 2.5) * 0.4;
          }

          this.steerEnemySmartly(e, this.player.x, this.player.y, spd, dt, flankAngle, keepDistance);

          e.animFrame = Math.floor(this.gameTime * 5) % 2;

          // Attack Trigger
          const maxAttackDist =
            e.type === 'scuttler'
              ? 1.45
              : e.type === 'plasma_gunner'
              ? 18.0
              : e.type === 'vile_spitter'
              ? 16.0
              : e.type === 'grunt'
              ? 14.0
              : e.type === 'imp'
              ? 12.0
              : e.type === 'baron'
              ? 15.0
              : 8.0;

          if (hasLOS && e.attackCooldown <= 0 && distToPlayer < maxAttackDist) {
            e.state = 'attack';
            e.stateTimer =
              e.type === 'scuttler'
                ? 0.22
                : e.type === 'plasma_gunner'
                ? 0.45
                : e.type === 'vile_spitter'
                ? 0.55
                : e.type === 'grunt'
                ? 0.3
                : e.type === 'imp'
                ? 0.45
                : 0.5;
            e.animFrame = 2;
            this.performEnemyAttack(e);
          }
          break;
        }

        case 'search': {
          // If player re-enters line of sight, immediately resume aggressive chase
          if (hasLOS && distToPlayer < detectionRange) {
            e.state = 'chase';
            e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            soundSynth.playEnemyAlert(e.type);
            break;
          }

          e.searchTimer = (e.searchTimer || 4.5) - dt;
          if (e.searchTimer <= 0) {
            // Target lost completely, return to patrol
            e.state = 'patrol';
            e.patrolTarget = this.findPatrolWaypoint(e.x, e.y, e.spawnOrigin);
            e.patrolTimer = 3.5 + Math.random() * 3.0;
            break;
          }

          // Aggressively hunt towards last seen spot with intelligent steering
          if (e.lastSeenPlayerPos) {
            const sx = e.lastSeenPlayerPos.x - e.x;
            const sy = e.lastSeenPlayerPos.y - e.y;
            const sDist = Math.hypot(sx, sy);

            if (sDist > 0.8) {
              e.angle = Math.atan2(sy, sx);
              const searchSpd = e.speed * 0.92;
              this.steerEnemySmartly(e, e.lastSeenPlayerPos.x, e.lastSeenPlayerPos.y, searchSpd, dt);
              e.animFrame = Math.floor(this.gameTime * 5) % 2;
            } else {
              // Reached corner: actively sweep vision searching for player
              e.angle += Math.sin(this.gameTime * 4) * 0.06;
              e.animFrame = 0;
            }
          }
          break;
        }

        case 'attack':
          e.stateTimer -= dt;
          e.animFrame = 2; // Attack stance frame
          if (e.stateTimer <= 0) {
            e.state = hasLOS ? 'chase' : 'search';
            const baseCd =
              e.type === 'scuttler'
                ? 0.65
                : e.type === 'plasma_gunner'
                ? 1.4
                : e.type === 'vile_spitter'
                ? 2.2
                : e.type === 'grunt'
                ? 1.2
                : e.type === 'imp'
                ? 1.8
                : e.type === 'baron'
                ? 1.6
                : 1.0;
            const diffCdMult = this.difficulty === 'easy' ? 1.35 : (this.difficulty === 'hard' ? 0.82 : (this.difficulty === 'nightmare' ? 0.68 : 1.0));
            e.attackCooldown = +(baseCd * diffCdMult * (e.isElite ? 0.75 : 1.0)).toFixed(2);
          }
          break;

        case 'pain':
          e.stateTimer -= dt;
          e.animFrame = 3; // Pain frame
          if (e.stateTimer <= 0) {
            e.state = hasLOS ? 'chase' : 'search';
          }
          break;
      }
    }
  }

  private performEnemyAttack(e: Enemy) {
    const distToPlayer = Math.hypot(this.player.x - e.x, this.player.y - e.y);
    const pVx = this.player.lastMoveVx || 0;
    const pVy = this.player.lastMoveVy || 0;

    if (e.type === 'grunt') {
      // Hitscan burst fire with audio and slight accuracy penalty if player is sprinting/dashing
      soundSynth.playPistol();
      const isPlayerMovingFast = Math.hypot(pVx, pVy) > 4.0 || this.player.dash.active;
      const baseAccuracy = e.isElite ? 0.75 : (this.difficulty === 'easy' ? 0.42 : (this.difficulty === 'hard' ? 0.65 : (this.difficulty === 'nightmare' ? 0.75 : 0.55)));
      const accuracy = isPlayerMovingFast ? baseAccuracy * 0.7 : baseAccuracy;
      if (Math.random() < accuracy) {
        this.damagePlayer(e.isElite ? 16 : 10, e.x, e.y);
      }
    } else if (e.type === 'imp') {
      // Launch fireball with predictive lead on player velocity scaled by difficulty
      soundSynth.playFireballLaunch();
      const pSpeed = this.difficulty === 'easy' ? 7.2 : (this.difficulty === 'hard' ? 9.5 : (this.difficulty === 'nightmare' ? 10.5 : 8.5));
      const leadRatio = this.difficulty === 'easy' ? 0.4 : 0.75;
      const leadTime = Math.min(0.55, distToPlayer / pSpeed);
      const predX = this.player.x + pVx * leadTime * leadRatio;
      const predY = this.player.y + pVy * leadTime * leadRatio;
      const aimAngle = Math.atan2(predY - e.y, predX - e.x);
      this.projectiles.push({
        id: this.nextProjId++,
        x: e.x + Math.cos(aimAngle) * 0.4,
        y: e.y + Math.sin(aimAngle) * 0.4,
        z: 0.5,
        vx: Math.cos(aimAngle) * pSpeed,
        vy: Math.sin(aimAngle) * pSpeed,
        vz: 0,
        damage: e.isElite ? 28 : 20,
        radius: 0.28,
        fromPlayer: false,
        type: 'fireball',
        life: 0,
        maxLife: 4.0,
      });
    } else if (e.type === 'scuttler') {
      // Fast melee flurry strike
      soundSynth.playFleshHit();
      this.damagePlayer(e.isElite ? 22 : 15, e.x, e.y);
      this.player.screenShake = Math.max(this.player.screenShake, 5);
    } else if (e.type === 'plasma_gunner') {
      // Rapid 2-3 round blue plasma burst with predictive lead
      const pSpeed = 12.0;
      const leadTime = Math.min(0.45, distToPlayer / pSpeed);
      const predX = this.player.x + pVx * leadTime * 0.8;
      const predY = this.player.y + pVy * leadTime * 0.8;
      const baseAimAngle = Math.atan2(predY - e.y, predX - e.x);
      const burstRounds = e.isElite ? 3 : 2;
      for (let b = 0; b < burstRounds; b++) {
        setTimeout(() => {
          if (e.health > 0 && !this.isGameOver && !this.isVictory && !this.isPaused) {
            soundSynth.playPlasmaGunnerFire();
            const spread = (Math.random() - 0.5) * 0.08;
            const ang = baseAimAngle + spread;
            this.projectiles.push({
              id: this.nextProjId++,
              x: e.x + Math.cos(ang) * 0.45,
              y: e.y + Math.sin(ang) * 0.45,
              z: 0.5,
              vx: Math.cos(ang) * pSpeed,
              vy: Math.sin(ang) * pSpeed,
              vz: 0,
              damage: e.isElite ? 18 : 12,
              radius: 0.22,
              fromPlayer: false,
              type: 'plasma_blue',
              life: 0,
              maxLife: 3.5,
            });
          }
        }, b * 110);
      }
    } else if (e.type === 'vile_spitter') {
      // Heavy toxic bio-mortar lob with lead
      soundSynth.playAcidSpit();
      const pSpeed = 8.5;
      const leadTime = Math.min(0.7, distToPlayer / pSpeed);
      const predX = this.player.x + pVx * leadTime * 0.85;
      const predY = this.player.y + pVy * leadTime * 0.85;
      const aimAngle = Math.atan2(predY - e.y, predX - e.x);
      this.projectiles.push({
        id: this.nextProjId++,
        x: e.x + Math.cos(aimAngle) * 0.55,
        y: e.y + Math.sin(aimAngle) * 0.55,
        z: 0.5,
        vx: Math.cos(aimAngle) * pSpeed,
        vy: Math.sin(aimAngle) * pSpeed,
        vz: 0,
        damage: e.isElite ? 36 : 26,
        radius: 0.35,
        fromPlayer: false,
        type: 'acid_glob',
        life: 0,
        maxLife: 4.0,
        splashRadius: 2.0,
      });
    } else if (e.type === 'baron') {
      // Spreading green plasma salvo with predictive lead
      soundSynth.playFireballLaunch();
      const pSpeed = 10.0;
      const leadTime = Math.min(0.45, distToPlayer / pSpeed);
      const predX = this.player.x + pVx * leadTime * 0.65;
      const predY = this.player.y + pVy * leadTime * 0.65;
      const baseAimAngle = Math.atan2(predY - e.y, predX - e.x);
      [-0.22, 0, 0.22].forEach((offset) => {
        const ang = baseAimAngle + offset;
        this.projectiles.push({
          id: this.nextProjId++,
          x: e.x + Math.cos(ang) * 0.5,
          y: e.y + Math.sin(ang) * 0.5,
          z: 0.5,
          vx: Math.cos(ang) * pSpeed,
          vy: Math.sin(ang) * pSpeed,
          vz: 0,
          damage: 26,
          radius: 0.3,
          fromPlayer: false,
          type: 'plasma_green',
          life: 0,
          maxLife: 4.0,
        });
      });
    } else if (e.type === 'lost_soul') {
      // High-speed diving bite
      if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 1.1) {
        this.damagePlayer(24, e.x, e.y);
        soundSynth.playFleshHit();
      }
    }
  }

  private updateBossBehavior(dt: number) {
    const boss = this.mapData.enemies.find(e => e.type === 'boss');
    if (!boss || boss.health <= 0) return;

    this.boss.specialAttackCooldown -= dt;
    if (this.boss.specialAttackCooldown <= 0) {
      this.boss.specialAttackCooldown = this.boss.isUltra ? 3.0 : 4.2;
      const roll = Math.random();

      if (this.boss.isUltra && roll < 0.35) {
        // Ultra Boss Attack 1: 8-Way Apocalypse Nova
        soundSynth.playPlasmaRifle();
        for (let a = 0; a < 8; a++) {
          const ang = (Math.PI * 2 / 8) * a + (this.gameTime % Math.PI);
          this.projectiles.push({
            id: this.nextProjId++,
            x: boss.x + Math.cos(ang) * 0.7,
            y: boss.y + Math.sin(ang) * 0.7,
            z: 0.5,
            vx: Math.cos(ang) * 9.5,
            vy: Math.sin(ang) * 9.5,
            vz: 0,
            damage: 28,
            radius: 0.32,
            fromPlayer: false,
            type: 'plasma_green',
            life: 0,
            maxLife: 4.5,
          });
        }
        this.spawnFloatingText('💥 8-WAY APOCALYPSE NOVA! 💥', boss.x, boss.y, '#22c55e', true);
      } else if (roll < 0.68) {
        // Rocket Barrage (spread of 5 rockets for Ultra Boss, 3 for regular boss)
        soundSynth.playExplosion();
        const spreads = this.boss.isUltra ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.22, 0, 0.22];
        spreads.forEach((angOff) => {
          const ang = boss.angle + angOff;
          this.projectiles.push({
            id: this.nextProjId++,
            x: boss.x + Math.cos(ang) * 0.6,
            y: boss.y + Math.sin(ang) * 0.6,
            z: 0.5,
            vx: Math.cos(ang) * 11.0,
            vy: Math.sin(ang) * 11.0,
            vz: 0,
            damage: 35,
            radius: 0.35,
            fromPlayer: false,
            type: 'rocket',
            life: 0,
            maxLife: 4.0,
          });
        });
        this.spawnFloatingText(this.boss.isUltra ? '⚠️ ULTRA MISSILE STORM! ⚠️' : '⚠️ TITAN ROCKET BARRAGE! ⚠️', boss.x, boss.y, '#ef4444', true);
      } else {
        // Shield Phase
        this.boss.shieldActive = true;
        this.boss.shieldTimer = this.boss.isUltra ? 2.5 : 3.0;
        soundSynth.playWeaponSwitch();
        this.spawnFloatingText('🛡️ KINETIC SHIELD ENGAGED! 🛡️', boss.x, boss.y, '#38bdf8', true);
      }
    }

    if (this.boss.shieldActive) {
      this.boss.shieldTimer -= dt;
      if (this.boss.shieldTimer <= 0) {
        this.boss.shieldActive = false;
      }
    }
  }

  private spawnRandomEnemyWave() {
    const eliteChance = this.difficulty === 'easy' ? 0.08 : (this.difficulty === 'normal' ? 0.22 : (this.difficulty === 'hard' ? 0.4 : 0.6));
    const isElite = Math.random() < eliteChance;
    
    // Tiered escalating enemy pool strictly locked by current stage
    let pool: Enemy['type'][] = ['grunt', 'scuttler', 'imp'];
    if (this.currentStage === 1) {
      // Level 1 strictly spawns only Imps, Grunts, and Scuttlers
      pool = ['grunt', 'scuttler', 'imp'];
    } else if (this.currentStage === 2) {
      // Level 2 introduces Vile Spitters and Plasma Gunners
      pool = ['grunt', 'scuttler', 'imp', 'vile_spitter', 'plasma_gunner'];
    } else if (this.currentStage === 3) {
      // Level 3 introduces Demonic Barons of Hell and Lost Souls
      pool = ['imp', 'scuttler', 'vile_spitter', 'plasma_gunner', 'lost_soul', 'baron'];
    } else {
      // Level 4: Endgame demonic horde
      pool = ['plasma_gunner', 'vile_spitter', 'baron', 'lost_soul', 'scuttler'];
    }

    const type = pool[Math.floor(Math.random() * pool.length)];

    let radius = 0.35;
    if (type === 'baron') radius = 0.45;
    else if (type === 'vile_spitter') radius = 0.44;
    else if (type === 'plasma_gunner') radius = 0.38;
    else if (type === 'scuttler' || type === 'lost_soul') radius = 0.32;

    const pos = this.findSafeEnemySpawnPos(undefined, undefined, radius);

    let health = 40;
    if (type === 'baron') health = 220;
    else if (type === 'vile_spitter') health = 140;
    else if (type === 'plasma_gunner') health = 90;
    else if (type === 'imp') health = 70;
    else if (type === 'scuttler') health = 55;
    else if (type === 'lost_soul') health = 45;

    const diffHpMult = this.difficulty === 'easy' ? 0.75 : (this.difficulty === 'hard' ? 1.25 : (this.difficulty === 'nightmare' ? 1.5 : 1.0));
    const speedMult = this.difficulty === 'easy' ? 0.85 : (this.difficulty === 'hard' ? 1.18 : (this.difficulty === 'nightmare' ? 1.38 : 1.0));
    const cdMult = this.difficulty === 'easy' ? 1.35 : (this.difficulty === 'hard' ? 0.82 : (this.difficulty === 'nightmare' ? 0.68 : 1.0));

    let baseSpeed = 2.2 * speedMult;
    if (type === 'scuttler') baseSpeed = 5.4 * speedMult;
    else if (type === 'lost_soul') baseSpeed = 4.5 * speedMult;
    else if (type === 'plasma_gunner') baseSpeed = 3.2 * speedMult;
    else if (type === 'imp') baseSpeed = 2.6 * speedMult;
    else if (type === 'baron') baseSpeed = 2.4 * speedMult;
    else if (type === 'vile_spitter') baseSpeed = 2.1 * speedMult;

    const finalHp = Math.round(health * diffHpMult * (isElite ? 1.5 : 1.0));

    this.mapData.enemies.push({
      id: Date.now() + Math.random(),
      type,
      x: pos.x,
      y: pos.y,
      z: 0,
      vx: 0,
      vy: 0,
      angle: Math.random() * Math.PI * 2,
      health: finalHp,
      maxHealth: finalHp,
      state: 'patrol',
      stateTimer: 1.5 + Math.random() * 2.0,
      patrolTimer: 3.0 + Math.random() * 3.0,
      animFrame: 0,
      speed: baseSpeed,
      attackCooldown: +(1.4 * cdMult).toFixed(2),
      isElite,
      radius,
      spawnOrigin: { x: pos.x, y: pos.y },
    });
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 0.25);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let s = 1; s < steps; s++) {
      const tx = Math.floor(x1 + dx * s);
      const ty = Math.floor(y1 + dy * s);
      if (this.mapData.grid[ty] && this.mapData.grid[ty][tx] > 0) {
        return false;
      }
    }
    return true;
  }

  // --- PICKUPS ---
  private updatePickups(dt: number) {
    for (const pk of this.mapData.pickups) {
      if (pk.collected) continue;
      pk.bobPhase += dt * 3;

      const dist = Math.hypot(pk.x - this.player.x, pk.y - this.player.y);
      if (dist < 0.65) {
        let collected = false;

        if (pk.type === 'medkit_small' && this.player.health < this.player.maxHealth) {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
          collected = true;
        } else if (pk.type === 'medkit_large' && this.player.health < 200) {
          this.player.health = Math.min(200, this.player.health + 100);
          collected = true;
        } else if (pk.type === 'armor_small' && this.player.armor < this.player.maxArmor) {
          this.player.armor = Math.min(this.player.maxArmor, this.player.armor + 25);
          this.player.armorFlash = 0.7;
          collected = true;
        } else if (pk.type === 'armor_large' && this.player.armor < 200) {
          this.player.armor = Math.min(200, this.player.armor + 100);
          this.player.armorFlash = 1.0;
          collected = true;
        } else if (pk.type === 'ammo_bullets') {
          this.player.ammo.bullets += 40;
          collected = true;
        } else if (pk.type === 'ammo_shells') {
          this.player.ammo.shells += 15;
          collected = true;
        } else if (pk.type === 'ammo_cells') {
          this.player.ammo.cells += 30;
          collected = true;
        } else if (pk.type === 'ammo_belts') {
          this.player.ammo.belts += 100;
          collected = true;
        } else if (pk.type.startsWith('weapon_')) {
          const wType = pk.type.replace('weapon_', '') as WeaponType;
          if (this.player.weapons[wType]) {
            const wasLocked = !this.player.weapons[wType].unlocked;
            this.player.weapons[wType].unlocked = true;
            this.player.weapons[wType].magazine = this.player.weapons[wType].maxMagazine;
            if (wType === 'shotgun') this.player.ammo.shells += 20;
            if (wType === 'chaingun') this.player.ammo.belts += 100;
            if (wType === 'plasma') this.player.ammo.cells += 60;

            this.switchWeapon(wType);
            collected = true;
            if (wasLocked) {
              soundSynth.playComboFanfare(4);
              this.spawnFloatingText(`💥 SECRET WEAPON UNLOCKED: ${this.player.weapons[wType].name}! 💥`, this.player.x, this.player.y, '#facc15', true, 22);
            }
          }
        } else if (pk.type === 'berserk_sphere') {
          this.player.berserkTimer = 15.0;
          this.player.health = Math.max(100, this.player.health);
          soundSynth.playBerserkRage();
          this.spawnFloatingText('🔥 BERSERK RAGE ACTIVATED! 🔥', 0, 0, '#ef4444', false, 24);
          collected = true;
        }

        if (collected) {
          pk.collected = true;
          this.player.healFlash = 0.5;
          soundSynth.playPickup(pk.type);
        }
      }
    }
  }

  private triggerSpatialDemonAudio() {
    const candidates = this.mapData.enemies.filter(
      (e) => e.health > 0 && (e.state === 'chase' || e.state === 'attack' || e.state === 'patrol' || e.state === 'search')
    );
    if (candidates.length === 0) return;

    candidates.sort((a, b) => {
      const da = Math.hypot(a.x - this.player.x, a.y - this.player.y);
      const db = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      return da - db;
    });

    const target = candidates[Math.floor(Math.random() * Math.min(3, candidates.length))];
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 14) return;

    let relAngle = Math.atan2(dy, dx) - this.player.angle;
    while (relAngle < -Math.PI) relAngle += Math.PI * 2;
    while (relAngle > Math.PI) relAngle -= Math.PI * 2;
    const pan = Math.sin(relAngle);

    const distVol = Math.max(0.05, 1.0 - dist / 14);
    const hasLOS = this.checkLineOfSight(this.player.x, this.player.y, target.x, target.y);
    soundSynth.playPannedDemonSnarl(target.type, pan, distVol, !hasLOS);
  }
}
