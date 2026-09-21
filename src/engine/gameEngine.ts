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
  LevelTransition,
  SecretArea,
  GlorySplatterDrop,
} from '../types';
import { createStageMap, MapData } from './gameMap';
import { ParticleSystem } from './particleSystem';
import { soundSynth } from './soundSynth';
import { gamepadManager } from './gamepadManager';

export class GameEngine {
  public mapData: MapData;
  public player: Player;
  public particles: ParticleSystem;
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingText[] = [];
  public glorySplatters: GlorySplatterDrop[] = [];
  public combo: KillCombo;
  public boss: BossState;
  public stats: GameStats;
  public difficulty: Difficulty = 'normal';
  
  public currentStage = 1;
  public totalStages = 4;
  public inNeutralZone = true;
  public airlockState: 'closed' | 'decompressing' | 'open' | 'sealing' | 'permanently_sealed' = 'closed';
  public airlockTimer = 0;
  public airlockAnimProgress = 0;
  public airlockOpened = false;
  public airlockSealed = false;
  public safeZoneMedicUsed = false;
  public currentWave = 0;
  public waveBanner = '';
  public waveBannerTimer = 0;

  public levelKills = 0; // Number of enemies defeated on current stage
  public totalLevelEnemies = 0; // Total enemies placed on current stage
  public requiredKills = 0; // Kills required to trigger boss lockdown on current stage
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
  public levelTransition: LevelTransition = {
    active: false,
    timer: 0,
    maxTimer: 2.5,
    fromStage: 1,
    toStage: 2,
    stageName: '',
    isDebriefWaiting: false,
  };

  private nextProjId = 1;
  private nextTextId = 1;
  private nextSplatterId = 1;
  private spawnTimer = 4.0;
  private weaponFireTimer = 0;
  private lookSens = 0.0025;
  private pendingAttack = false;
  public hitstopTimer = 0;
  private ambientDemonAudioTimer = 2.0;
  private lastChaingunShotTime = 0;
  private lockedExitFeedbackTimer = 0;

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

    this.totalLevelEnemies = this.mapData.totalEnemies || this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.requiredKills = this.mapData.requiredKills || Math.max(1, Math.ceil(this.totalLevelEnemies * 0.75));
    this.levelKills = 0;
    this.killOMeter = 0;

    this.sanitizeLoadedEnemies();
    this.initExploredGrid();
  }

  // Generates bounded room/sector patrol waypoints strictly within the enemy's assigned territory
  public generatePatrolRoute(
    target: Enemy | { x: number; y: number; radius?: number; homePost?: { x: number; y: number }; territoryRadius?: number; spawnOrigin?: { x: number; y: number } } | number,
    optY?: number,
    optRadius = 0.35
  ): { x: number; y: number }[] {
    let originX: number;
    let originY: number;
    let radius = optRadius;
    let maxRadius = 3.5;

    if (typeof target === 'number') {
      originX = target;
      originY = optY !== undefined ? optY : target;
    } else {
      const e = target;
      const home = e.homePost || e.spawnOrigin || { x: e.x, y: e.y };
      originX = home.x;
      originY = home.y;
      radius = e.radius || 0.35;
      maxRadius = Math.max(2.0, (e.territoryRadius || 5.5) * 0.55);
    }

    const waypoints: { x: number; y: number }[] = [{ x: originX, y: originY }];
    const angles = [0, Math.PI * 0.65, Math.PI * 1.35, Math.PI * 0.35, Math.PI * 1.7];

    for (const ang of angles) {
      if (waypoints.length >= 3) break;
      const dist = 1.5 + Math.random() * (maxRadius - 1.5);
      const tx = originX + Math.cos(ang) * dist;
      const ty = originY + Math.sin(ang) * dist;
      const gx = Math.floor(tx);
      const gy = Math.floor(ty);
      if (
        gx >= 1 && gx < this.mapData.width - 1 &&
        gy >= 1 && gy < this.mapData.height - 1 &&
        this.mapData.grid[gy] && this.mapData.grid[gy][gx] === 0 &&
        !this.checkWallCollision(tx, ty, radius + 0.12)
      ) {
        // Verify not inside player neutral start zone
        const nz = this.mapData.neutralZone;
        if (!nz || !(tx >= nz.minX - 0.5 && tx <= nz.maxX + 0.5 && ty >= nz.minY - 0.5 && ty <= nz.maxY + 0.5)) {
          waypoints.push({ x: tx, y: ty });
        }
      }
    }

    if (waypoints.length === 1) {
      waypoints.push({ x: originX, y: originY });
    }
    return waypoints;
  }

  // Ensures all pre-placed stage enemies are 100% free of wall penetrations and out-of-bound errors
  public sanitizeLoadedEnemies() {
    for (const e of this.mapData.enemies) {
      const safe = this.findSafeEnemySpawnPos(e.x, e.y, e.radius || 0.35);
      e.x = safe.x;
      e.y = safe.y;
      e.spawnOrigin = { x: safe.x, y: safe.y };
      if (!e.homePost) {
        e.homePost = { x: safe.x, y: safe.y };
      }
      e.patrolWaypoints = this.generatePatrolRoute(e);
      e.waypointIndex = 0;
      e.state = Math.random() < 0.6 ? 'patrol' : 'idle';
      e.stateTimer = 0.5 + Math.random() * 2.5;
      e.patrolTimer = 4.0 + Math.random() * 3.0;
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
        const sec = this.mapData.secrets.find(s => s.doorX === cx && s.doorY === cy);
        const airlock = this.mapData.airlockDoors?.find(a => a.x === cx && a.y === cy);
        const isLowered = (sec && ((sec.animOffset || 0) >= 0.7 || (sec.revealed && !sec.animating))) ||
                          (airlock && (airlock.animOffset || 0) >= 0.7);

        if (this.mapData.grid[cy][cx] > 0 && !isLowered) {
          break;
        }
      }
    }
  }

  public setDifficulty(diff: Difficulty) {
    this.difficulty = diff;
    if (this.levelKills === 0 && !this.boss.active) {
      // Re-apply difficulty balance to current stage if player is at start
      this.mapData = createStageMap(this.currentStage, this.difficulty);
      this.sanitizeLoadedEnemies();
      this.totalLevelEnemies = this.mapData.totalEnemies || this.mapData.enemies.filter(e => e.type !== 'boss').length;
      this.requiredKills = this.mapData.requiredKills || Math.max(1, Math.ceil(this.totalLevelEnemies * 0.75));
    }
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
    this.totalLevelEnemies = this.mapData.totalEnemies || this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.requiredKills = this.mapData.requiredKills || Math.max(1, Math.ceil(this.totalLevelEnemies * 0.75));
    this.levelKills = 0;
    this.particles.clear();
    this.projectiles = [];
    this.floatingTexts = [];
    this.glorySplatters = [];
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
    this.airlockState = 'closed';
    this.airlockTimer = 0;
    this.airlockAnimProgress = 0;
    this.airlockOpened = false;
    this.airlockSealed = false;
    this.safeZoneMedicUsed = false;
    soundSynth.setSafeZoneAudio(true);
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
    this.totalLevelEnemies = this.mapData.totalEnemies || this.mapData.enemies.filter(e => e.type !== 'boss').length;
    this.requiredKills = this.mapData.requiredKills || Math.max(1, Math.ceil(this.totalLevelEnemies * 0.75));
    this.levelKills = 0;
    this.particles.clear();
    this.projectiles = [];
    this.floatingTexts = [];
    this.glorySplatters = [];
    this.killOMeter = 0;
    this.isLockdown = false;
    this.inNeutralZone = true;
    this.airlockState = 'closed';
    this.airlockTimer = 0;
    this.airlockAnimProgress = 0;
    this.airlockOpened = false;
    this.airlockSealed = false;
    this.safeZoneMedicUsed = false;
    soundSynth.setSafeZoneAudio(true);
    this.currentWave = 0;
    this.waveBanner = '';
    this.waveBannerTimer = 0;
    this.spawnTimer = 4.0;

    this.levelTransition.active = false;
    this.levelTransition.isDebriefWaiting = false;

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
    const hasInfiniteDash = (this.player.infiniteDashTimer || 0) > 0;
    if ((this.player.dash.cooldown <= 0 || hasInfiniteDash) && !this.player.dash.active) {
      // Default to forward dash if stationary
      let effectiveX = moveX;
      let effectiveY = moveY;
      if (effectiveX === 0 && effectiveY === 0) {
        effectiveX = 1;
        effectiveY = 0;
      }

      this.player.dash.active = true;
      this.player.dash.duration = this.player.dash.maxDuration;
      this.player.dash.cooldown = hasInfiniteDash ? 0 : this.player.dash.maxCooldown;

      // Calculate world direction from movement vector
      const cos = Math.cos(this.player.angle);
      const sin = Math.sin(this.player.angle);
      this.player.dash.dirX = effectiveX * cos - effectiveY * sin;
      this.player.dash.dirY = effectiveX * sin + effectiveY * cos;
      this.player.invulnerableTimer = 0.25; // i-frames during dash!

      soundSynth.playDash();
      gamepadManager.playDashRumble();
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
      gamepadManager.playWeaponRumble('fist');

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
      gamepadManager.playWeaponRumble('chaingun');

      // Soundproofed gunfire: Alert nearby enemies in the sector outside the sealed safe room
      this.alertNearbyEnemies(this.player.x, this.player.y, 14);

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
    gamepadManager.playWeaponRumble(weapon.type);
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

    // Soundproofed gunfire: Alert nearby enemies in the sector outside the sealed safe room
    this.alertNearbyEnemies(this.player.x, this.player.y, 14);

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

      // 1. Check Enemies (with fast AABB pre-rejection)
      for (const e of this.mapData.enemies) {
        if (e.health > 0) {
          if (Math.abs(e.x - testX) > e.radius || Math.abs(e.y - testY) > e.radius) continue;
          const d = Math.hypot(e.x - testX, e.y - testY);
          if (d < e.radius) {
            hitEnemy = e;
            break;
          }
        }
      }
      if (hitEnemy) break;

      // 2. Check Supply Chests (shoot to open with fast AABB pre-rejection)
      if (this.mapData.chests) {
        for (const c of this.mapData.chests) {
          if (!c.opened) {
            if (Math.abs(c.x - testX) > 0.45 || Math.abs(c.y - testY) > 0.45) continue;
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
    }
  }

  // --- SOUNDPROOFED GUNFIRE ACOUSTIC SENSING ---
  public alertNearbyEnemies(originX: number, originY: number, soundRadius = 7.0) {
    // If player is inside the sealed safe staging zone or airlock is closed, gunshots are completely soundproofed
    if (this.inNeutralZone || this.airlockState !== 'open') return;

    // Localized gunfire acoustic propagation
    const effectiveRadius = originY >= 20 ? 4.5 : soundRadius;

    for (const enemy of this.mapData.enemies) {
      if (enemy.health <= 0 || enemy.state === 'dead' || enemy.state === 'gibbed' || enemy.state === 'pain' || enemy.state === 'staggered') continue;
      if (enemy.state === 'chase' || enemy.state === 'attack') continue;

      if (Math.abs(enemy.x - originX) >= effectiveRadius || Math.abs(enemy.y - originY) >= effectiveRadius) continue;
      const dist = Math.hypot(enemy.x - originX, enemy.y - originY);
      if (dist < effectiveRadius) {
        const hasAcousticLOS = this.checkLineOfSight(enemy.x, enemy.y, originX, originY);
        // Alert enemies only if close or with direct line of sight in their sector
        if (hasAcousticLOS || dist < 2.5) {
          enemy.lastSeenPlayerPos = { x: originX, y: originY };
          enemy.state = 'search';
          enemy.searchTimer = 2.5 + Math.random() * 1.5;
          enemy.angle = Math.atan2(originY - enemy.y, originX - enemy.x);
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

    // Tactical Alert Propagation: Alert max 1 nearby ally in the local room (<= 4.5 units with direct LOS)
    const isPlayerTargetable = !this.inNeutralZone && (this.mapData.neutralZone ? this.player.y <= this.mapData.neutralZone.minY : true);
    let alertedAllies = 0;
    for (const ally of this.mapData.enemies) {
      if (alertedAllies >= 1) break;
      if (ally.health > 0 && ally.id !== enemy.id && (ally.state === 'idle' || ally.state === 'patrol')) {
        if (Math.abs(ally.x - enemy.x) >= 4.5 || Math.abs(ally.y - enemy.y) >= 4.5) continue;
        const allyDist = Math.hypot(ally.x - enemy.x, ally.y - enemy.y);
        if (allyDist < 4.5) {
          const hasLOS = this.checkLineOfSight(ally.x, ally.y, enemy.x, enemy.y);
          if (hasLOS) {
            alertedAllies++;
            ally.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            if (isPlayerTargetable && this.checkLineOfSight(ally.x, ally.y, this.player.x, this.player.y)) {
              ally.state = 'chase';
            } else {
              ally.state = 'search';
            }
            ally.searchTimer = 3.0;
          }
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
      
      const reqKills = Math.max(1, this.requiredKills || Math.ceil(this.totalLevelEnemies * 0.75));
      const pct = Math.min(100, Math.round((this.levelKills / reqKills) * 100));
      this.killOMeter = pct;

      if (this.levelKills >= reqKills || pct >= 100) {
        this.killOMeter = 100;
        soundSynth.playRedlineWarning();
        this.spawnFloatingText(`🚨 REQUIRED KILLS REACHED (${this.levelKills}/${reqKills})! 🚨`, 0, 0, '#ef4444', false, 24);
        this.spawnFloatingText('⚡ MAX REDLINE: BOSS LOCKDOWN ENGAGED! ⚡', 0, 0, '#facc15', false, 22);
      } else {
        soundSynth.playTachometerRev();
      }

      // Check Boss Lockdown Trigger
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

      // Close-range violent gib splatters screen visor
      const distToPlayer = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
      if (distToPlayer <= 2.2) {
        this.triggerGloryKillScreenSplatter(enemy.type, true);
      }
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
        // Manifest extraction portal right where the boss fell in the arena
        this.mapData.exitPos = { x: enemy.x, y: enemy.y };
        soundSynth.playStageClear();
        this.particles.spawnGibExplosion(enemy.x, enemy.y, 18, true, 'boss');
        this.particles.spawnSparks(enemy.x, enemy.y, 0.6, '#38bdf8', 30);
        this.particles.spawnSteam(enemy.x, enemy.y, 0.3, 5, 1.4);
        this.spawnFloatingText(`⚡ SECTOR ${this.currentStage} BOSS DEFEATED! EXTRACTION PORTAL ONLINE! ⚡`, this.player.x, this.player.y, '#38bdf8', true, 26);
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
    const stageBossSubtitles = [
      '',
      'HEAVY HYDRAULIC COMMANDER // SECTOR 1 APEX',
      'CORROSIVE BIO-MECHANICAL OVERLORD // SECTOR 2 APEX',
      'VOLCANIC BRIMSTONE WARLORD // SECTOR 3 APEX',
      'APEX ELDRITCH MUTAGENIC COLOSSUS // FINAL THREAT'
    ];
    this.boss.name = stageBossNames[this.currentStage] || (isUltra ? 'THE WARDEN' : 'CYBER-TITAN GOLIATH');
    this.boss.subtitle = stageBossSubtitles[this.currentStage] || 'APEX SECTOR COLOSSUS';
    this.boss.phase = 1;
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

    // Speed and cooldown scaling by difficulty for fair 1-on-1 duel
    const speedMult = this.difficulty === 'easy' ? 0.85 : (this.difficulty === 'hard' ? 1.15 : (this.difficulty === 'nightmare' ? 1.30 : 1.0));
    const cdMult = this.difficulty === 'easy' ? 1.35 : (this.difficulty === 'hard' ? 0.85 : (this.difficulty === 'nightmare' ? 0.70 : 1.0));

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
      speed: +( (isUltra ? 3.3 : (this.currentStage === 1 ? 2.3 : 2.7)) * speedMult ).toFixed(2),
      attackCooldown: +( (isUltra ? 1.0 : (this.currentStage === 1 ? 1.7 : 1.4)) * cdMult ).toFixed(2),
      isElite: true,
      isUltraBoss: isUltra,
      stageBossId: this.currentStage,
      bossName: this.boss.name,
      bossSubtitle: this.boss.subtitle,
      radius: bossRadius,
      spawnOrigin: { x: safeBossPos.x, y: safeBossPos.y },
    };

    // 1-ON-1 BOSS DUEL MECHANIC:
    // When the kill-o-meter is filled and the boss spawns, all other enemies disappear
    // so the player fights the boss strictly 1 on 1!
    let banishedCount = 0;
    for (const e of this.mapData.enemies) {
      if (e.type !== 'boss' && e.health > 0) {
        banishedCount++;
        this.particles.spawnSparks(e.x, e.y, 0.6, '#ef4444', 12);
        this.particles.spawnSparks(e.x, e.y, 0.6, '#ff0055', 8);
        this.particles.spawnSparks(e.x, e.y, 0.5, '#facc15', 6);
        this.particles.addFloorDecal(e.x, e.y, 0.65, 'scorch_blast');
      }
    }

    // Replace the enemy array with ONLY the boss (pure 1v1 duel)
    this.mapData.enemies = [bossEnemy];

    // Clear any lingering minion projectiles so the player isn't hit unfairly as the duel begins
    this.projectiles = this.projectiles.filter(p => p.fromPlayer);

    this.spawnFloatingText(
      isUltra ? '☠️ WARNING: APOCALYPSE ULTRA BOSS SPAWNED ☠️' : `⚠️ EMERGENCY: ${this.boss.name} DETECTED ⚠️`,
      0,
      0,
      '#ef4444',
      false,
      24
    );
    this.spawnFloatingText(
      `⚡ 1-ON-1 DUEL ENGAGED: ${banishedCount} MINIONS BANISHED! ⚡`,
      0,
      0,
      '#38bdf8',
      false,
      20
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
    } else if (type === 'infinite_dash_relic') {
      this.player.infiniteDashTimer = 15.0;
      this.player.dash.cooldown = 0;
      soundSynth.playRelicPickup();
      lootLabel = `⚡ CHRONO-HASTE ZERO-COOLDOWN DASH ⚡`;
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
    gamepadManager.playDamageRumble(effectiveAmount);

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
      gamepadManager.playGloryKillRumble();

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

      // Trigger intense visceral screen splatter on glory kill!
      this.triggerGloryKillScreenSplatter(bestFinisherTarget.type, false);

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

    // 4. Whiff punch - play fist swing sound and trigger punch animation
    this.triggerMeleeAnimation(false);
    soundSynth.playFist();
    return false;
  }

  // --- GLORY KILL / MELEE SCREEN SPLATTER GENERATOR ---
  public triggerGloryKillScreenSplatter(enemyType = 'grunt', isMinor = false) {
    const count = isMinor ? (4 + Math.floor(Math.random() * 3)) : (9 + Math.floor(Math.random() * 5));

    let primaryColor = '#991b1b'; // Arterial dark crimson
    let highlightColor = '#fca5a5';
    let baseDark = '#7f1d1d';

    if (enemyType === 'vile_spitter') {
      primaryColor = '#15803d'; // Toxic green
      highlightColor = '#86efac';
      baseDark = '#14532d';
    } else if (enemyType === 'plasma_gunner') {
      primaryColor = '#0284c7'; // Energized bio-plasma cyan
      highlightColor = '#bae6fd';
      baseDark = '#0369a1';
    } else if (enemyType === 'baron') {
      primaryColor = '#b91c1c'; // Hellfire crimson
      highlightColor = '#fecaca';
      baseDark = '#450a0a';
    }

    for (let i = 0; i < count; i++) {
      const isCenterSplash = !isMinor && i < 4;
      const x = isCenterSplash
        ? 0.32 + Math.random() * 0.36
        : 0.04 + Math.random() * 0.92;
      const y = isCenterSplash
        ? 0.20 + Math.random() * 0.40
        : 0.06 + Math.random() * 0.76;

      const size = isCenterSplash
        ? 28 + Math.random() * 38
        : (isMinor ? 12 + Math.random() * 18 : 16 + Math.random() * 26);

      const length = isCenterSplash
        ? 70 + Math.random() * 140
        : (isMinor ? 30 + Math.random() * 60 : 45 + Math.random() * 95);

      const satCount = 4 + Math.floor(Math.random() * 5);
      const satellites = [];
      for (let s = 0; s < satCount; s++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = size * (0.9 + Math.random() * 1.6);
        satellites.push({
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist,
          r: Math.max(2, 2.5 + Math.random() * (size * 0.22)),
        });
      }

      this.glorySplatters.push({
        id: this.nextSplatterId++,
        x,
        y,
        size,
        length,
        dripProgress: 0,
        opacity: 0.96 + Math.random() * 0.04,
        color: Math.random() > 0.35 ? primaryColor : baseDark,
        highlightColor,
        satellites,
        dripSpeed: 0.35 + Math.random() * 0.55,
        decaySpeed: isMinor ? (0.45 + Math.random() * 0.20) : (0.28 + Math.random() * 0.12),
      });
    }

    // Limit maximum active screen splatters to maintain optimal FPS
    if (this.glorySplatters.length > 32) {
      this.glorySplatters = this.glorySplatters.slice(-32);
    }
  }

  // --- REVEAL SECRET WITH RECEDING WALL ANIMATION & SOUND ---
  public revealSecret(sec: SecretArea): boolean {
    if (sec.revealed) return false;
    sec.revealed = true;
    sec.animating = true;
    sec.animOffset = 0;
    sec.animTimer = 0;
    this.stats.secretsFound++;
    soundSynth.playSecretDoorSlide();
    soundSynth.playSecretDiscovery();
    this.player.screenShake = 4.2; // Heavy mechanical unseating tremor
    this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.6, '#facc15', 32);
    this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.4, '#fbbf24', 20);
    this.particles.spawnSteam(sec.doorX + 0.5, sec.doorY + 0.5, 0.25, 16, 1.1);
    this.spawnFloatingText(`⭐ SECRET REVEALED: ${sec.name}! (${this.stats.secretsFound}/${this.stats.totalSecrets})`, 0, 0, '#facc15', false, 20);
    this.spawnFloatingText(`REWARD: ${sec.rewardDescription}`, 0, 0, '#38bdf8', false, 17);
    return true;
  }

  // --- SAFE ZONE AIRLOCK DECOMPRESSION & SEALING CONTROLLER ---
  public triggerAirlockButton(): boolean {
    if (this.airlockState !== 'closed') return false;
    this.airlockState = 'decompressing';
    this.airlockTimer = 1.8;
    this.airlockAnimProgress = 0;

    const doorX = this.mapData.airlockDoors && this.mapData.airlockDoors.length > 0 ? (this.mapData.airlockDoors[0].x + 0.5) : 15.5;
    const doorY = this.mapData.airlockDoors && this.mapData.airlockDoors.length > 0 ? (this.mapData.airlockDoors[0].y + 0.2) : 26.2;

    soundSynth.playAirlockButtonPress();
    soundSynth.playAirlockCycle();
    this.particles.spawnSteam(doorX, doorY, 0.4, 20, 1.2);
    this.particles.spawnSparks(doorX, doorY, 0.5, '#38bdf8', 16);
    this.spawnFloatingText('⚠️ AIRLOCK DECOMPRESSION PROTOCOL INITIATED... ⚠️', 0, 0, '#38bdf8', false, 20);
    this.player.screenShake = 3.5;
    return true;
  }

  public openAirlock() {
    if (this.airlockState === 'closed') {
      this.triggerAirlockButton();
    }
  }

  // --- ADVANCE CONFIRMED AFTER SECTOR DEBRIEF ---
  public confirmLevelTransition() {
    if (!this.levelTransition.active || !this.levelTransition.isDebriefWaiting) return;
    this.levelTransition.isDebriefWaiting = false;
    soundSynth.playTeleport();
    this.levelTransition.timer = 1.3;
    this.levelTransition.maxTimer = 1.3;
  }

  // --- SECRET, AIRLOCK & CHEST INTERACTION ---
  public interact(): boolean {
    if (this.isGameOver || this.isVictory || this.isPaused) return false;

    // 1. Check Airlock Gate Switch in Safe Staging Zone (press [E] to start level)
    if (this.airlockState === 'closed' && this.inNeutralZone) {
      return this.triggerAirlockButton();
    }

    // 2. Check Secret Push Walls (requires player to be close and facing directly toward the hidden wall)
    for (const sec of this.mapData.secrets) {
      if (sec.revealed) continue;
      const dx = (sec.doorX + 0.5) - this.player.x;
      const dy = (sec.doorY + 0.5) - this.player.y;
      const distDoor = Math.hypot(dx, dy);
      if (distDoor < 1.85) {
        const facingAngle = this.player.angle;
        const toDoorAngle = Math.atan2(dy, dx);
        const angleDiff = Math.abs(Math.atan2(Math.sin(toDoorAngle - facingAngle), Math.cos(toDoorAngle - facingAngle)));
        if (angleDiff < 1.15) { // ~65 degree cone facing the wall
          return this.revealSecret(sec);
        }
      }
    }

    // 3. Check Supply Chests
    if (this.mapData.chests) {
      for (const c of this.mapData.chests) {
        if (!c.opened) {
          const dist = Math.hypot(c.x - this.player.x, c.y - this.player.y);
          if (dist < 1.85 && this.checkLineOfSight(this.player.x, this.player.y, c.x, c.y)) {
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

    // Collect all open safe tiles across the active sector, grouped into quadrants to distribute across rooms
    const quadrants: { x: number; y: number }[][] = [[], [], [], []]; // NW, NE, SW, SE
    const midX = this.mapData.width / 2;
    const midY = this.mapData.height / 2;

    for (let y = 1; y < this.mapData.height - 1; y++) {
      for (let x = 1; x < this.mapData.width - 1; x++) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        if (isSafe(cx, cy)) {
          const pDist = Math.hypot(cx - this.player.x, cy - this.player.y);
          if (pDist > 8.0) {
            const qIdx = (cx < midX ? 0 : 1) + (cy < midY ? 0 : 2);
            quadrants[qIdx].push({ x: cx, y: cy });
          }
        }
      }
    }

    // Pick a non-empty quadrant at random to guarantee room distribution
    const validQuads = quadrants.filter((q) => q.length > 0);
    if (validQuads.length > 0) {
      const chosenQuad = validQuads[Math.floor(Math.random() * validQuads.length)];
      return chosenQuad[Math.floor(Math.random() * chosenQuad.length)];
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

  // --- WAVE TRACKER ---
  public startWave(waveNum: number) {
    this.currentWave = waveNum;
    this.stats.waveReached = Math.max(this.stats.waveReached, waveNum);
    this.waveBanner = `DEMONIC ASSAULT: WAVE ${waveNum}`;
    this.waveBannerTimer = 3.5;
    soundSynth.playWaveIncoming();
    this.spawnFloatingText(`⚠️ WAVE ${waveNum} INCOMING! ⚠️`, 0, 0, '#ef4444', false, 20);
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

    // Check Exit Portal Proximity & Trigger Level Warp Transition (ONLY when unlocked after boss defeat)
    if (this.mapData.exitPos && this.mapData.exitUnlocked) {
      const distToExit = Math.hypot(this.player.x - this.mapData.exitPos.x, this.player.y - this.mapData.exitPos.y);

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

      if (distToExit < 1.35 && !this.levelTransition.active) {
        if (this.currentStage >= this.totalStages) {
          this.isVictory = true;
          soundSynth.playStageClear();
          return;
        }
        this.levelTransition.active = true;
        this.levelTransition.isDebriefWaiting = true;
        this.levelTransition.timer = 1.4;
        this.levelTransition.maxTimer = 1.4;
        this.levelTransition.fromStage = this.currentStage;
        this.levelTransition.toStage = this.currentStage + 1;
        this.levelTransition.stageName = `SECTOR ${this.currentStage + 1}`;
        this.levelTransition.stageCompleted = this.currentStage;
        // Accurately record sector-specific stats for debrief card
        this.levelTransition.kills = this.levelKills;
        this.levelTransition.secretsFound = this.mapData.secrets.filter(s => s.revealed).length;
        this.levelTransition.totalSecrets = this.mapData.secrets.length;
        this.levelTransition.timeElapsed = this.stats.timeElapsed;
        soundSynth.playStageClear();
      }
    }

    // Level Transition warp timer (debounced while player reviews sector debrief)
    if (this.levelTransition.active) {
      if (this.levelTransition.isDebriefWaiting) {
        return; // Pause combat updates during sector debrief resting phase
      }
      this.levelTransition.timer -= dt;
      if (this.levelTransition.timer <= 0) {
        this.levelTransition.active = false;
        this.advanceToNextStage();
        return;
      }
    }

    // Dynamic Safe Zone Check & Airlock Decompression / Lockdown Execution
    const nz = this.mapData.neutralZone;
    const isInsideSafeZone = Boolean(
      nz &&
      this.player.x >= nz.minX &&
      this.player.x <= nz.maxX &&
      this.player.y >= nz.minY &&
      this.player.y <= nz.maxY
    );

    // 1. Handle Active Airlock Decompression Cycle (Hydraulic Opening Sequence)
    if (this.airlockState === 'decompressing') {
      this.airlockTimer -= dt;
      const totalDuration = 2.0;
      const rawProgress = Math.max(0, Math.min(1.0, 1.0 - this.airlockTimer / totalDuration));

      // Multi-stage pneumatic & hydraulic easing curve:
      // - Phase 1 (0.0 to 0.15): Mechanical unseating shudder with initial clamp release
      // - Phase 2 (0.15 to 0.85): Smooth cubic ease-in-out pneumatic descent
      // - Phase 3 (0.85 to 1.0): Soft hydraulic damper cushion into floor recess
      let animOffset = 0;
      if (rawProgress < 0.15) {
        const t = rawProgress / 0.15;
        animOffset = t * 0.05 + Math.sin(this.gameTime * 40) * 0.012;
      } else if (rawProgress < 0.85) {
        const t = (rawProgress - 0.15) / 0.70;
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        animOffset = 0.05 + eased * 0.87;
      } else {
        const t = (rawProgress - 0.85) / 0.15;
        animOffset = 0.92 + (1 - Math.pow(1 - t, 2)) * 0.08;
      }
      this.airlockAnimProgress = Math.max(0, Math.min(1.0, animOffset));

      if (this.mapData.airlockDoors) {
        for (const d of this.mapData.airlockDoors) {
          d.animOffset = this.airlockAnimProgress;
        }
      }

      const door1 = this.mapData.airlockDoors?.[0];
      const door2 = this.mapData.airlockDoors?.[1] || door1;
      const doorX = door1 ? (door1.x + 0.5) : 15.5;
      const doorY = door1 ? door1.y : 26;

      // Continuous high-velocity lateral steam jets from door jambs and pneumatic clamp sparks
      if (Math.random() < 0.65) {
        this.particles.spawnSteam(door1 ? door1.x : 15, doorY + 0.2, 0.25, 3, 0.85);
        this.particles.spawnSteam(door2 ? door2.x + 1 : 16.5, doorY + 0.2, 0.25, 3, 0.85);
      }
      if (Math.random() < 0.35) {
        this.particles.spawnSparks(doorX + (Math.random() - 0.5) * 1.4, doorY + 0.2, 0.3, '#38bdf8', 4);
      }

      if (this.airlockTimer <= 0) {
        this.airlockState = 'open';
        this.airlockOpened = true;
        this.airlockAnimProgress = 1.0;

        // Clear solid door collision in grid
        if (this.mapData.airlockDoors) {
          for (const d of this.mapData.airlockDoors) {
            if (this.mapData.grid[d.y]) {
              this.mapData.grid[d.y][d.x] = 0;
            }
          }
        }

        soundSynth.playAirlockCycle();
        soundSynth.setSafeZoneAudio(false);
        this.particles.spawnSteam(doorX, doorY + 0.2, 0.5, 35, 1.6);
        this.particles.spawnSparks(doorX, doorY + 0.2, 0.6, '#38bdf8', 28);
        this.spawnFloatingText('🚪 BLAST DOORS OPEN // PROCEED INTO SECTOR', 0, 0, '#38bdf8', false, 22);
        this.player.screenShake = 4.5;
      }
    }

    const firstDoorY = this.mapData.airlockDoors?.[0]?.y ?? 26;
    const combatThresholdY = firstDoorY - 0.6;

    // 2. Handle Permanent Lockdown Transition (Closing Slam when Player leaves Safe Zone into Sector)
    if (this.airlockState === 'open' && !this.airlockSealed && this.player.y <= combatThresholdY) {
      this.airlockState = 'sealing';
      this.airlockTimer = 0.90; // 0.90s fast heavy pneumatic slam
      this.inNeutralZone = false;
      soundSynth.setSafeZoneAudio(false);
      this.spawnFloatingText('🛑 QUARANTINE BREACH: AIRLOCK SEALING...', 0, 0, '#ef4444', false, 20);
      this.player.screenShake = 4.0;
    }

    if (this.airlockState === 'sealing') {
      this.airlockTimer -= dt;
      const totalDuration = 0.90;
      const rawProgress = Math.max(0, Math.min(1.0, 1.0 - this.airlockTimer / totalDuration));

      // Softlock prevention: Push player into combat sector if attempting to step back into sealing threshold
      if (this.player.y > combatThresholdY) {
        this.player.y = combatThresholdY - 0.1;
        if (this.player.vy > 0) this.player.vy = 0;
      }

      // Accelerated heavy slam curve (easeInQuad)
      const slamT = rawProgress * rawProgress;
      this.airlockAnimProgress = Math.max(0, 1.0 - slamT);

      if (this.mapData.airlockDoors) {
        for (const d of this.mapData.airlockDoors) {
          d.animOffset = this.airlockAnimProgress;
        }
      }

      const door1 = this.mapData.airlockDoors?.[0];
      const doorX = door1 ? (door1.x + 0.5) : 15.5;
      const doorY = door1 ? door1.y : 26;

      // Warning sparks & emergency steam along seams during rapid rise
      if (Math.random() < 0.6) {
        this.particles.spawnSparks(doorX + (Math.random() - 0.5) * 1.4, doorY + 0.2, 0.4, '#f59e0b', 5);
        this.particles.spawnSteam(doorX, doorY + 0.2, 0.3, 4, 0.6);
      }

      // Re-enable solid collision at 50% closure
      if (this.airlockAnimProgress <= 0.5 && this.mapData.airlockDoors) {
        for (const d of this.mapData.airlockDoors) {
          if (this.mapData.grid[d.y] && this.mapData.grid[d.y][d.x] === 0) {
            this.mapData.grid[d.y][d.x] = 7;
          }
        }
      }

      if (this.airlockTimer <= 0) {
        this.airlockState = 'permanently_sealed';
        this.airlockSealed = true;
        this.airlockAnimProgress = 0.0;

        // Close blast doors permanently in grid
        if (this.mapData.airlockDoors) {
          for (const d of this.mapData.airlockDoors) {
            if (this.mapData.grid[d.y]) {
              this.mapData.grid[d.y][d.x] = 7;
            }
            d.animOffset = 0;
            d.sealed = true;
          }
        }

        soundSynth.playAirlockPermanentLockdown();
        this.particles.spawnSparks(doorX, doorY, 0.7, '#ef4444', 45);
        this.particles.spawnSteam(doorX, doorY, 0.45, 35, 1.2);
        this.player.screenShake = 9;
        this.spawnFloatingText('🛑 AIRLOCK SEALED — QUARANTINE PROTOCOL ENGAGED', 0, 0, '#ef4444', false, 24);
        this.spawnFloatingText('⚠️ SAFE ZONE LOCKED: NO RETREAT PERMITTED ⚠️', 0, 0, '#f97316', false, 18);
      }
    }

    // Dynamic safe zone state: Once permanently sealed, safe zone is strictly inaccessible
    this.inNeutralZone = !this.airlockSealed && (this.airlockState === 'closed' || this.airlockState === 'decompressing' || isInsideSafeZone);

    // Safe Zone Audio Muffling (Low-pass filter for calm sanctuary atmosphere inside bunker)
    soundSynth.setSafeZoneAudio(this.inNeutralZone);

    // Emergency Field Medic Restock Station inside Safe Staging Zone
    if (this.inNeutralZone && !this.safeZoneMedicUsed) {
      let restocked = false;
      if (this.player.health < 50) {
        this.player.health = 50;
        this.player.healFlash = 0.5;
        soundSynth.playPickup('medkit_large');
        this.spawnFloatingText('💉 FIELD MEDIC: VITALS RESTORED TO 50 HP', this.player.x, this.player.y, '#4ade80', false, 18);
        restocked = true;
      }
      if (this.player.ammo.bullets < 40) {
        this.player.ammo.bullets = 40;
        restocked = true;
      }
      if (this.player.weapons.shotgun.unlocked && this.player.ammo.shells < 12) {
        this.player.ammo.shells = 12;
        restocked = true;
      }
      if (restocked) {
        this.safeZoneMedicUsed = true;
      }
    }

    // Proximity Audio Feedback: Ultra-faint, subtle low-frequency mechanical hum only when directly adjacent to hidden seam
    let minSecretDist = 999;
    for (const sec of this.mapData.secrets) {
      if (!sec.revealed) {
        const d = Math.hypot((sec.doorX + 0.5) - this.player.x, (sec.doorY + 0.5) - this.player.y);
        if (d < minSecretDist) minSecretDist = d;
      }
    }
    if (minSecretDist < 1.4) {
      const proximity = Math.max(0, (1.0 - (minSecretDist / 1.4)) * 0.35);
      soundSynth.updateSecretHum(proximity);
    } else {
      soundSynth.updateSecretHum(0);
    }

    // Update Receding Secret Wall Animations (Multi-stage hydraulic & stone descent sequence)
    for (const sec of this.mapData.secrets) {
      if (sec.animating) {
        sec.animTimer = (sec.animTimer || 0) + dt;
        const totalDuration = 1.25;
        const rawProgress = Math.max(0, Math.min(1.0, sec.animTimer / totalDuration));

        // Ultra-fluid multi-stage mechanical easing:
        // - Phase 1 (0.0 to 0.15): Unseating shudder + initial latch release
        // - Phase 2 (0.15 to 0.85): Smooth quintic ease-in-out descent of heavy slab
        // - Phase 3 (0.85 to 1.0): Hydraulic damper cushion into floor recess
        let animOffset = 0;
        if (rawProgress < 0.15) {
          const t = rawProgress / 0.15;
          animOffset = t * 0.05 + Math.sin(this.gameTime * 45) * 0.014;
        } else if (rawProgress < 0.85) {
          const t = (rawProgress - 0.15) / 0.70;
          const eased = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
          animOffset = 0.05 + eased * 0.87;
        } else {
          const t = (rawProgress - 0.85) / 0.15;
          animOffset = 0.92 + (1 - Math.pow(1 - t, 2)) * 0.08;
        }
        sec.animOffset = Math.max(0, Math.min(1.0, animOffset));

        // Continuous sparks and steam along threshold seams during descent
        if (Math.random() < 0.65) {
          this.particles.spawnSparks(sec.doorX + 0.5, sec.doorY + 0.5, 0.3, '#facc15', 4);
          this.particles.spawnSteam(sec.doorX + 0.5, sec.doorY + 0.5, 0.15, 3, 0.75);
        }

        // Keep rendering the lowering wall slab through the entire descent; passability is handled via checkWallCollision once animOffset >= 0.7
        if (sec.animTimer >= totalDuration) {
          sec.animating = false;
          sec.animOffset = 1.0;
          this.mapData.grid[sec.doorY][sec.doorX] = 0;
        }
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

    // Update Glory Kill Screen-Splatter Drops & Visceral Drips
    if (this.glorySplatters.length > 0) {
      for (let i = this.glorySplatters.length - 1; i >= 0; i--) {
        const drop = this.glorySplatters[i];
        drop.dripProgress = Math.min(1.0, drop.dripProgress + dt * drop.dripSpeed);
        drop.opacity -= dt * drop.decaySpeed;
        if (drop.opacity <= 0) {
          this.glorySplatters.splice(i, 1);
        }
      }
    }

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

    // Infinite Dash Overdrive Timer
    if (this.player.infiniteDashTimer && this.player.infiniteDashTimer > 0) {
      this.player.infiniteDashTimer -= dt;
      this.player.dash.cooldown = 0;
      if (Math.random() < 0.25) {
        this.particles.spawnSparks(this.player.x, this.player.y, 0.2, '#38bdf8', 2);
      }
      if (this.player.infiniteDashTimer <= 0) {
        this.player.infiniteDashTimer = 0;
        this.spawnFloatingText('CHRONO-HASTE EXPIRED', this.player.x, this.player.y, '#94a3b8', false, 16);
      }
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
          // If secret door is sinking or revealed, it is passable once >= 70% lowered
          const sec = this.mapData.secrets.find(s => s.doorX === mx && s.doorY === my);
          if (sec && ((sec.animOffset || 0) >= 0.7 || (sec.revealed && !sec.animating))) {
            continue;
          }
          // If airlock door is lowering, passable once >= 70% lowered
          const airlock = this.mapData.airlockDoors?.find(a => a.x === mx && a.y === my);
          if (airlock && (airlock.animOffset || 0) >= 0.7) {
            continue;
          }
          return true;
        }
      }
    }
    return false;
  }

  // Depenetration Solver: Guarantees entity is never trapped inside wall geometry
  public normalizeAngle(angle: number): number {
    let a = angle;
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a > Math.PI) a -= Math.PI * 2;
    return a;
  }

  public smoothTurnAngle(current: number, target: number, maxRate: number, dt: number): number {
    const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    const maxStep = maxRate * dt;
    if (Math.abs(diff) <= maxStep) {
      return this.normalizeAngle(target);
    }
    return this.normalizeAngle(current + Math.sign(diff) * maxStep);
  }

  private resolveWallDepenetration(x: number, y: number, r: number): { x: number; y: number } {
    let curX = x;
    let curY = y;
    const minX = Math.floor(curX - r - 0.5);
    const maxX = Math.floor(curX + r + 0.5);
    const minY = Math.floor(curY - r - 0.5);
    const maxY = Math.floor(curY + r + 0.5);

    for (let my = minY; my <= maxY; my++) {
      for (let mx = minX; mx <= maxX; mx++) {
        const isOutOfBounds = my < 0 || my >= this.mapData.height || mx < 0 || mx >= this.mapData.width;
        let isSolidWall = isOutOfBounds;
        if (!isOutOfBounds && this.mapData.grid[my] && this.mapData.grid[my][mx] > 0) {
          const sec = this.mapData.secrets.find(s => s.doorX === mx && s.doorY === my);
          const isPassableSecret = sec && ((sec.animOffset || 0) >= 0.7 || (sec.revealed && !sec.animating));
          const airlock = this.mapData.airlockDoors?.find(a => a.x === mx && a.y === my);
          const isPassableAirlock = airlock && (airlock.animOffset || 0) >= 0.7;
          if (!isPassableSecret && !isPassableAirlock) {
            isSolidWall = true;
          }
        }

        if (isSolidWall) {
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

      // Sub-stepping to prevent high-speed tunneling through thin walls or enemies
      const moveDist = Math.hypot(p.vx * dt, p.vy * dt);
      const subSteps = Math.max(1, Math.ceil(moveDist / 0.32));
      const subDt = dt / subSteps;
      let hit = false;

      for (let step = 0; step < subSteps; step++) {
        p.x += p.vx * subDt;
        p.y += p.vy * subDt;

        // Wall hit check
        const mapX = Math.floor(p.x);
        const mapY = Math.floor(p.y);

        if (mapY < 0 || mapY >= this.mapData.height || mapX < 0 || mapX >= this.mapData.width || (this.mapData.grid[mapY] && this.mapData.grid[mapY][mapX] > 0)) {
          hit = true;
          // Projectile impact on wall geometry
          break;
        }

        // Enemy hit check (with fast AABB pre-rejection)
        if (p.fromPlayer) {
          for (const e of this.mapData.enemies) {
            if (e.health > 0) {
              const hitDist = e.radius + p.radius;
              if (Math.abs(e.x - p.x) > hitDist || Math.abs(e.y - p.y) > hitDist) continue;
              if (Math.hypot(e.x - p.x, e.y - p.y) < hitDist) {
                this.damageEnemy(e, p.damage);
                hit = true;
                break;
              }
            }
          }
          if (hit) break;
        }

        // Player hit check
        if (!p.fromPlayer) {
          const playerHitDist = 0.35 + p.radius;
          if (Math.abs(this.player.x - p.x) <= playerHitDist && Math.abs(this.player.y - p.y) <= playerHitDist) {
            if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < playerHitDist) {
              this.damagePlayer(p.damage, p.x, p.y);
              hit = true;
              break;
            }
          }
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
          // Splash damage for player plasma projectiles (with fast AABB pre-rejection)
          if (p.fromPlayer && p.splashRadius && p.splashRadius > 0) {
            for (const other of this.mapData.enemies) {
              if (other.health > 0) {
                if (Math.abs(other.x - p.x) > p.splashRadius || Math.abs(other.y - p.y) > p.splashRadius) continue;
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
      const dist = 1.5 + Math.random() * 3.0;
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

    // Dynamic 11-whisker probe array: direct angle first, then alternating wide fan probes to navigate around pillars & doorway jams
    const testAngles = [
      desiredAngle,
      desiredAngle + Math.PI / 8,         // +22.5 deg
      desiredAngle - Math.PI / 8,         // -22.5 deg
      desiredAngle + Math.PI / 4,         // +45 deg
      desiredAngle - Math.PI / 4,         // -45 deg
      desiredAngle + (3 * Math.PI) / 8,   // +67.5 deg
      desiredAngle - (3 * Math.PI) / 8,   // -67.5 deg
      desiredAngle + Math.PI / 2,         // +90 deg
      desiredAngle - Math.PI / 2,         // -90 deg
      desiredAngle + (3 * Math.PI) / 4,   // +135 deg
      desiredAngle - (3 * Math.PI) / 4,   // -135 deg
    ];

    let chosenVx = 0;
    let chosenVy = 0;
    let foundPath = false;

    const stepDist = speed * dt;
    const checkDist = Math.max(stepDist * 1.8, e.radius + 0.16);

    for (const ang of testAngles) {
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      const probeX = e.x + Math.cos(ang) * checkDist;
      const probeY = e.y + Math.sin(ang) * checkDist;

      if (!this.checkWallCollision(probeX, probeY, e.radius + 0.05)) {
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
    if (actualMoved < 0.15 * speed * dt) {
      e.stuckTimer = (e.stuckTimer || 0) + dt;
      if (e.stuckTimer > 0.12) {
        // Pick an escape flank angle perpendicular to obstacle and commit to it until unstuck
        if (e.unstuckNudgeAngle === undefined) {
          const sign = Math.random() < 0.5 ? 1 : -1;
          e.unstuckNudgeAngle = Math.atan2(dy, dx) + (Math.PI / 2) * sign;
        }
        if (e.stuckTimer > 1.8) {
          // If stuck for too long, flip flanking direction to test the other side of the obstacle
          e.unstuckNudgeAngle = (e.unstuckNudgeAngle || 0) + Math.PI;
          e.stuckTimer = 0.4;
        }
      }
    } else {
      e.stuckTimer = Math.max(0, (e.stuckTimer || 0) - dt * 2);
      if (e.stuckTimer <= 0) {
        e.unstuckNudgeAngle = undefined;
      }
    }
  }

  // Alert Trigger with Telegraph Pause & Localized Squad Propagation
  public triggerEnemyAlert(e: Enemy) {
    const wasUnaware = e.state === 'idle' || e.state === 'patrol' || e.state === 'search' || e.state === 'guard';
    if (wasUnaware) {
      e.state = 'alert';
      // Telegraph delay before actively rushing / engaging (0.35s to 0.70s depending on enemy archetype)
      const alertTime = e.type === 'boss' ? 0.30 : (e.type === 'scuttler' ? 0.35 : (e.type === 'baron' ? 0.65 : (e.type === 'vile_spitter' ? 0.60 : 0.45)));
      e.alertTimer = alertTime;
      e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
      soundSynth.playEnemyAlert(e.type);
      this.spawnFloatingText('!', e.x, e.y, '#ef4444', false, 20);

      // Squad alert propagation: notify max 1 nearby ally within 4.5 units in same room with direct LOS
      let alertedCount = 0;
      for (const ally of this.mapData.enemies) {
        if (alertedCount >= 1) break;
        if (ally.health > 0 && ally.id !== e.id && (ally.state === 'idle' || ally.state === 'patrol' || ally.state === 'guard')) {
          if (Math.abs(ally.x - e.x) >= 4.5 || Math.abs(ally.y - e.y) >= 4.5) continue;
          const allyDist = Math.hypot(ally.x - e.x, ally.y - e.y);
          if (allyDist < 4.5) {
            const losToAlerting = this.checkLineOfSight(ally.x, ally.y, e.x, e.y);
            const losToPlayer = this.checkLineOfSight(ally.x, ally.y, this.player.x, this.player.y);
            if (losToAlerting || losToPlayer) {
              alertedCount++;
              ally.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
              if (losToPlayer) {
                ally.state = 'alert';
                ally.alertTimer = 0.50;
                this.spawnFloatingText('!', ally.x, ally.y, '#f97316', false, 18);
              } else {
                ally.state = 'search';
                ally.searchTimer = 2.5;
                this.spawnFloatingText('?', ally.x, ally.y, '#facc15', false, 18);
              }
              ally.angle = this.smoothTurnAngle(ally.angle, Math.atan2(this.player.y - ally.y, this.player.x - ally.x), 12.0, 0.016);
            }
          }
        }
      }
    } else if (e.state === 'search') {
      e.state = 'chase';
      e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
    }
  }

  // --- ENEMY AI & SPAWNS ---
  private updateEnemies(dt: number) {
    // 1. Boss 1-on-1 Lockdown Duel:
    // Reinforcements are strictly disabled during boss lockdown to guarantee a fair 1-on-1 battle.

    // 2. Boss Special Attacks Update
    if (this.boss.active && this.boss.spawned) {
      this.updateBossBehavior(dt);
    }

    // 3. Enemy-to-Enemy Soft Separation & Anti-Clustering Repulsion
    // Keeps enemies comfortably scattered and prevents grouping up into clumps
    for (let a = 0; a < this.mapData.enemies.length; a++) {
      const e1 = this.mapData.enemies[a];
      if (e1.health <= 0) continue;
      for (let b = a + 1; b < this.mapData.enemies.length; b++) {
        const e2 = this.mapData.enemies[b];
        if (e2.health <= 0) continue;
        const edx = e2.x - e1.x;
        const edy = e2.y - e1.y;
        const bodyDist = (e1.radius || 0.35) + (e2.radius || 0.35);
        const comfortDist = bodyDist + 0.65; // Extended anti-grouping comfort separation bubble
        if (Math.abs(edx) >= comfortDist || Math.abs(edy) >= comfortDist) continue;
        const eDist = Math.hypot(edx, edy);
        if (eDist > 0.001 && eDist < comfortDist) {
          // Stronger repulsion if touching, gentle repulsion in comfort zone
          const intensity = eDist < bodyDist ? 1.0 : (1.0 - (eDist - bodyDist) / 0.65) * 0.45;
          const overlap = (comfortDist - eDist) * 0.5 * intensity;
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
      const isSunkenDoor = this.mapData.secrets.some(s => s.doorX === gx && s.doorY === gy && ((s.animOffset || 0) >= 0.5 || s.revealed || s.animating)) ||
        this.mapData.airlockDoors?.some(a => a.x === gx && a.y === gy && (a.animOffset || 0) >= 0.5);

      if (gy < 1 || gy >= this.mapData.height - 1 || gx < 1 || gx >= this.mapData.width - 1) {
        // Out of global map bounds - clamp safely
        e.x = Math.max(1.5, Math.min(this.mapData.width - 1.5, e.x));
        e.y = Math.max(1.5, Math.min(this.mapData.height - 1.5, e.y));
      }

      // Smooth continuous wall depenetration (slides enemy smoothly out of walls/corners along collision normal)
      const depen = this.resolveWallDepenetration(e.x, e.y, e.radius);
      e.x = depen.x;
      e.y = depen.y;

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const distToPlayer = Math.hypot(dx, dy);

      // Home & Sector calculations
      const homePos = e.homePost || e.spawnOrigin || { x: e.x, y: e.y };
      const distFromHome = Math.hypot(e.x - homePos.x, e.y - homePos.y);
      const territoryRadius = e.territoryRadius || 5.5;
      const isOutsideTerritory = distFromHome > territoryRadius;

      // Targetability check: Player is targetable ONLY outside safe neutral zone and while game is active
      const isPlayerTargetable = !this.inNeutralZone && !this.isGameOver && !this.isVictory;
      const baseRange = e.isElite || e.type === 'baron' ? 10.5 : (e.type === 'boss' ? 14.0 : 8.5);
      const isAlerted = e.state === 'chase' || e.state === 'search' || e.state === 'attack' || e.state === 'pain';
      const detectionRange = isAlerted ? baseRange * 1.15 : baseRange;
      const playerSpeed = Math.hypot(this.player.vx || 0, this.player.vy || 0);

      // Multi-Zone FOV Perception (optimized: only raycast if inside potential sensory range):
      let hasLOS = false;
      let canDetectPlayer = false;

      if (isPlayerTargetable && distToPlayer <= detectionRange) {
        // Exact angle wrapping normalized to [-PI, PI]
        const angleToPlayer = Math.atan2(dy, dx);
        const relAngle = Math.atan2(Math.sin(angleToPlayer - e.angle), Math.cos(angleToPlayer - e.angle));
        const absAngleDiff = Math.abs(relAngle);

        let isInVisionCone = false;
        if (isAlerted) {
          isInVisionCone = absAngleDiff <= 1.60 && distToPlayer < detectionRange;
        } else if (absAngleDiff <= 0.70) { // ~40 degree forward viewcone
          isInVisionCone = distToPlayer < detectionRange;
        } else if (absAngleDiff <= 1.25) { // Peripheral detection
          const peripheralRange = playerSpeed > 2.5 ? detectionRange * 0.75 : detectionRange * 0.55;
          isInVisionCone = distToPlayer < peripheralRange;
        }

        const rearTouchSense = distToPlayer < 1.35;
        const footstepSense = playerSpeed > 3.8 && distToPlayer < 2.8;

        if (isInVisionCone || rearTouchSense || footstepSense) {
          hasLOS = this.checkLineOfSight(e.x, e.y, this.player.x, this.player.y);
          canDetectPlayer = hasLOS;
        }
      }

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
          // Look around smoothly
          const scanAngle = e.angle + Math.sin(this.gameTime * 2.2) * 0.018;
          e.angle = this.smoothTurnAngle(e.angle, scanAngle, 3.0, dt);

          if (canDetectPlayer) {
            this.triggerEnemyAlert(e);
          } else if (e.stateTimer <= 0) {
            e.state = 'patrol';
            if (!e.patrolWaypoints || e.patrolWaypoints.length === 0) {
              e.patrolWaypoints = this.generatePatrolRoute(e);
              e.waypointIndex = 0;
            }
            e.patrolTimer = 4.0 + Math.random() * 2.5;
          }
          break;
        }

        case 'guard': {
          // Guard state: Enemy holds their post at the sector perimeter / doorway
          e.guardTimer = (e.guardTimer !== undefined ? e.guardTimer : 2.5) - dt;
          const targetAng = e.guardAngle !== undefined ? e.guardAngle : (e.lastSeenPlayerPos ? Math.atan2(e.lastSeenPlayerPos.y - e.y, e.lastSeenPlayerPos.x - e.x) : e.angle);
          e.angle = this.smoothTurnAngle(e.angle, targetAng, 6.0, dt);
          e.animFrame = 0;

          if (canDetectPlayer && distFromHome <= territoryRadius + 1.5) {
            this.triggerEnemyAlert(e);
            break;
          }

          if (e.guardTimer <= 0) {
            // Revert to patrolling own sector
            e.state = 'patrol';
            e.patrolWaypoints = this.generatePatrolRoute(e);
            e.waypointIndex = 0;
            e.patrolTimer = 4.0 + Math.random() * 2.5;
          }
          break;
        }

        case 'patrol': {
          if (canDetectPlayer) {
            this.triggerEnemyAlert(e);
            break;
          }

          if (!e.patrolWaypoints || e.patrolWaypoints.length === 0) {
            e.patrolWaypoints = this.generatePatrolRoute(e);
            e.waypointIndex = 0;
          }

          const waypoints = e.patrolWaypoints;
          const idx = e.waypointIndex || 0;
          const currentWp = waypoints[idx] || homePos;

          e.patrolTimer = (e.patrolTimer || 4.0) - dt;
          
          const ptx = currentWp.x - e.x;
          const pty = currentWp.y - e.y;
          const ptDist = Math.hypot(ptx, pty);

          if (ptDist < 0.65 || e.patrolTimer <= 0) {
            // Reached waypoint or timer expired: advance to next room waypoint and pause to observe
            e.waypointIndex = (idx + 1) % waypoints.length;
            e.state = 'idle';
            e.stateTimer = 1.8 + Math.random() * 2.0;
            e.patrolTimer = 4.0 + Math.random() * 2.5;
          } else {
            const targetAngle = Math.atan2(pty, ptx);
            e.angle = this.smoothTurnAngle(e.angle, targetAngle, 7.5, dt);
            const patrolSpeed = e.speed * 0.45;
            this.steerEnemySmartly(e, currentWp.x, currentWp.y, patrolSpeed, dt);
            e.animFrame = Math.floor(this.gameTime * 3.5) % 2;
          }
          break;
        }

        case 'alert': {
          // Alert telegraph stance: Enemy spots player, smoothly locks orientation toward player, but DOES NOT immediately rush
          const targetAngle = Math.atan2(dy, dx);
          e.angle = this.smoothTurnAngle(e.angle, targetAngle, 14.0, dt);
          e.animFrame = 0;
          e.alertTimer = (e.alertTimer !== undefined ? e.alertTimer : 0.5) - dt;

          if (!isPlayerTargetable) {
            e.state = 'guard';
            e.guardTimer = 2.0;
            e.guardAngle = e.angle;
            break;
          }

          if (e.alertTimer <= 0) {
            e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };
            if (hasLOS) {
              e.state = 'chase';
            } else {
              e.state = 'search';
              e.searchTimer = 3.0;
            }
          }
          break;
        }

        case 'chase': {
          // If player is no longer targetable, revert to guard / patrol
          if (!isPlayerTargetable) {
            e.state = 'guard';
            e.guardTimer = 2.0;
            e.guardAngle = e.angle;
            break;
          }

          const targetAngle = Math.atan2(dy, dx);
          e.angle = this.smoothTurnAngle(e.angle, targetAngle, 16.0, dt);

          // If player has broken line of sight (ducked behind wall/corner), switch to search
          if (!hasLOS) {
            e.state = 'search';
            e.searchTimer = 3.0;
            break;
          }

          // Player is spotted: refresh last known position
          e.lastSeenPlayerPos = { x: this.player.x, y: this.player.y };

          // --- SECTOR HOLDING & TERRITORIAL LEASH ENFORCEMENT ---
          // Non-boss enemies strictly defend their assigned sector and don't rush across the whole base
          if (e.type !== 'boss' && isOutsideTerritory) {
            // If enemy reached the sector perimeter/doorway:
            if (e.type === 'scuttler' || e.type === 'lost_soul') {
              // Melee rusher breaks off if player moved beyond its territory
              if (distToPlayer > 4.5 || distFromHome > territoryRadius + 1.8) {
                e.state = 'guard';
                e.guardTimer = 2.0;
                e.guardAngle = Math.atan2(homePos.y - e.y, homePos.x - e.x);
                break;
              }
            } else {
              // Ranged enemies anchor at the sector boundary / doorway to provide suppressive fire
              if (distToPlayer > 12.0) {
                e.state = 'guard';
                e.guardTimer = 2.5;
                e.guardAngle = targetAngle;
                break;
              }
            }
          }

          const isEnraged = (e.type === 'baron' && e.health < e.maxHealth * 0.5) || e.isElite;
          let spd = e.speed * (isEnraged ? 1.35 : 1.0);

          let flankAngle = 0;
          let keepDistance = 0;

          // Unique lane angle dispersion per enemy ID so multiple enemies fan out around the player
          const laneOffset = ((e.id % 5) - 2) * 0.22; // -0.44, -0.22, 0, +0.22, +0.44

          if (e.type === 'grunt') {
            keepDistance = 3.8;
            flankAngle = (e.strafeDir || 1) * 0.35 + laneOffset;
          } else if (e.type === 'imp') {
            keepDistance = 5.0;
            flankAngle = (e.strafeDir || 1) * 0.4 + laneOffset;
          } else if (e.type === 'scuttler') {
            // Fast zig-zag predator flanking & leaping
            flankAngle = Math.sin(this.gameTime * 12 + e.id) * 0.65 + laneOffset;
            // Check leap pounce when closing in
            if (distToPlayer < 3.6 && (!e.specialStateTimer || e.specialStateTimer <= 0)) {
              spd *= 2.2;
              soundSynth.playScuttlerLeap();
              e.specialStateTimer = 2.2;
            }
          } else if (e.type === 'plasma_gunner') {
            // Tactical standoff kiting & circle-strafing
            keepDistance = 6.8;
            flankAngle = (e.strafeDir || 1) * 0.75 + laneOffset;
          } else if (e.type === 'vile_spitter') {
            // Heavy artillery bio-mortar positioning
            keepDistance = 9.5;
            flankAngle = Math.sin(this.gameTime * 2.5 + e.id) * 0.5 + laneOffset;
          } else if (e.type === 'lost_soul') {
            flankAngle = Math.sin(this.gameTime * 6) * 0.45 + laneOffset;
          } else if (e.type === 'baron') {
            flankAngle = laneOffset * 0.5; // Inexorable direct march with slight angular spread
          } else if (e.type === 'boss') {
            keepDistance = 4.5;
            flankAngle = Math.sin(this.gameTime * 2.5) * 0.4;
          }

          // If holding sector boundary, steer toward sector edge rather than diving deep into other rooms
          if (e.type !== 'boss' && isOutsideTerritory && hasLOS) {
            // Hold ground & strafe at perimeter
            this.steerEnemySmartly(e, homePos.x, homePos.y, spd * 0.4, dt, (e.strafeDir || 1) * 0.6, 2.0);
          } else {
            this.steerEnemySmartly(e, this.player.x, this.player.y, spd, dt, flankAngle, keepDistance);
          }

          e.animFrame = Math.floor(this.gameTime * 5) % 2;

          // Attack Trigger
          const maxAttackDist =
            e.type === 'scuttler'
              ? 1.85
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
          // If player is untargetable, return to guard / patrol
          if (!isPlayerTargetable) {
            e.state = 'guard';
            e.guardTimer = 2.0;
            e.guardAngle = e.angle;
            break;
          }

          // If player re-enters line of sight or proximity within sector limits, immediately resume chase
          if (canDetectPlayer && distFromHome <= territoryRadius + 1.5) {
            this.triggerEnemyAlert(e);
            break;
          }

          // If enemy wandered too far from home during search, abort and guard
          if (e.type !== 'boss' && distFromHome > territoryRadius + 1.5) {
            e.state = 'guard';
            e.guardTimer = 2.5;
            e.guardAngle = Math.atan2(homePos.y - e.y, homePos.x - e.x);
            break;
          }

          e.searchTimer = (e.searchTimer || 3.0) - dt;
          if (e.searchTimer <= 0) {
            // Target lost completely, hold guard briefly then patrol home
            e.state = 'guard';
            e.guardTimer = 2.0;
            e.guardAngle = e.angle;
            break;
          }

          // Hunt towards last seen spot with intelligent steering
          if (e.lastSeenPlayerPos) {
            const sx = e.lastSeenPlayerPos.x - e.x;
            const sy = e.lastSeenPlayerPos.y - e.y;
            const sDist = Math.hypot(sx, sy);

            if (sDist > 0.8) {
              const targetAngle = Math.atan2(sy, sx);
              e.angle = this.smoothTurnAngle(e.angle, targetAngle, 12.0, dt);
              const searchSpd = e.speed * 0.92;
              this.steerEnemySmartly(e, e.lastSeenPlayerPos.x, e.lastSeenPlayerPos.y, searchSpd, dt);
              e.animFrame = Math.floor(this.gameTime * 5) % 2;
            } else {
              // Reached corner: actively sweep vision cone searching for player
              const sweepAngle = Math.atan2(sy, sx) + Math.sin(this.gameTime * 4) * 0.75;
              e.angle = this.smoothTurnAngle(e.angle, sweepAngle, 8.0, dt);
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
    } else if (e.type === 'boss') {
      // 1-on-1 Boss Tactical Attacks
      const diffDmgMult = this.difficulty === 'easy' ? 0.75 : (this.difficulty === 'hard' ? 1.25 : (this.difficulty === 'nightmare' ? 1.5 : 1.0));
      if (distToPlayer < 2.3) {
        // Devastating close-range ground slam / titan smash
        soundSynth.playHeavyImpactCrunch();
        this.damagePlayer(Math.round(28 * diffDmgMult), e.x, e.y);
        this.player.screenShake = Math.max(this.player.screenShake, 7);
        this.particles.spawnSparks(e.x, e.y, 0.6, '#ef4444', 16);
      } else {
        // Heavy twin plasma volley with predictive aim
        soundSynth.playFireballLaunch();
        const pSpeed = this.difficulty === 'easy' ? 9.5 : (this.difficulty === 'hard' ? 12.0 : (this.difficulty === 'nightmare' ? 13.0 : 10.5));
        const leadTime = Math.min(0.45, distToPlayer / pSpeed);
        const predX = this.player.x + pVx * leadTime * 0.7;
        const predY = this.player.y + pVy * leadTime * 0.7;
        const baseAimAngle = Math.atan2(predY - e.y, predX - e.x);
        [-0.15, 0.15].forEach((offset) => {
          const ang = baseAimAngle + offset;
          this.projectiles.push({
            id: this.nextProjId++,
            x: e.x + Math.cos(ang) * 0.6,
            y: e.y + Math.sin(ang) * 0.6,
            z: 0.5,
            vx: Math.cos(ang) * pSpeed,
            vy: Math.sin(ang) * pSpeed,
            vz: 0,
            damage: Math.round(24 * diffDmgMult),
            radius: 0.32,
            fromPlayer: false,
            type: 'plasma_green',
            life: 0,
            maxLife: 4.0,
          });
        });
      }
    }
  }

  private updateBossBehavior(dt: number) {
    const boss = this.mapData.enemies.find(e => e.type === 'boss');
    if (!boss || boss.health <= 0) return;

    // Dynamic Boss Phase Tracking
    const hpPct = Math.max(0, boss.health / boss.maxHealth);
    const oldPhase = this.boss.phase || 1;
    let currentPhase = 1;
    if (hpPct <= 0.30) {
      currentPhase = 3;
    } else if (hpPct <= 0.65) {
      currentPhase = 2;
    }

    if (currentPhase > oldPhase) {
      this.boss.phase = currentPhase;
      soundSynth.playBossAlarm();
      this.player.damageFlash = 0.3;
      if (currentPhase === 2) {
        this.spawnFloatingText(`⚡ ${this.boss.name} // PHASE II: OVERDRIVE! ⚡`, boss.x, boss.y, '#f59e0b', true, 24);
        this.particles.spawnSparks(boss.x, boss.y, 0.8, '#f59e0b', 28);
      } else if (currentPhase === 3) {
        this.spawnFloatingText(`☠️ ${this.boss.name} // PHASE III: APOCALYPTIC ENRAGE! ☠️`, boss.x, boss.y, '#ef4444', true, 26);
        this.particles.spawnSparks(boss.x, boss.y, 1.0, '#ef4444', 36);
      }
    }

    // Ambient Boss Aura Particle Emission based on stage & phase
    if (Math.random() < (currentPhase === 3 ? 0.75 : (currentPhase === 2 ? 0.50 : 0.28))) {
      const stage = this.currentStage;
      if (stage === 1) {
        this.particles.spawnSparks(boss.x + (Math.random() - 0.5) * 0.8, boss.y + (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.4, '#38bdf8', 2);
      } else if (stage === 2) {
        this.particles.spawnSparks(boss.x + (Math.random() - 0.5) * 0.8, boss.y + (Math.random() - 0.5) * 0.8, 0.3 + Math.random() * 0.4, '#22c55e', 3);
      } else if (stage === 3) {
        this.particles.spawnSparks(boss.x + (Math.random() - 0.5) * 0.8, boss.y + (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.5, '#f97316', 3);
      } else {
        this.particles.spawnSparks(boss.x + (Math.random() - 0.5) * 0.8, boss.y + (Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.5, '#c084fc', 3);
      }
    }

    this.boss.specialAttackCooldown -= dt;
    if (this.boss.specialAttackCooldown <= 0) {
      const baseCd = this.boss.isUltra ? (currentPhase === 3 ? 2.0 : 2.8) : (currentPhase === 3 ? 2.5 : (currentPhase === 2 ? 3.2 : 4.0));
      const cdMult = this.difficulty === 'easy' ? 1.35 : (this.difficulty === 'hard' ? 0.85 : (this.difficulty === 'nightmare' ? 0.70 : 1.0));
      this.boss.specialAttackCooldown = +(baseCd * cdMult).toFixed(2);
      const roll = Math.random();

      if (this.boss.isUltra && roll < 0.40) {
        // Ultra Boss Attack 1: 8-Way Apocalypse Nova
        soundSynth.playPlasmaRifle();
        const novaSpeed = this.difficulty === 'easy' ? 8.0 : (this.difficulty === 'hard' ? 11.0 : (this.difficulty === 'nightmare' ? 12.0 : 9.5));
        for (let a = 0; a < 8; a++) {
          const ang = (Math.PI * 2 / 8) * a + (this.gameTime % Math.PI);
          this.projectiles.push({
            id: this.nextProjId++,
            x: boss.x + Math.cos(ang) * 0.7,
            y: boss.y + Math.sin(ang) * 0.7,
            z: 0.5,
            vx: Math.cos(ang) * novaSpeed,
            vy: Math.sin(ang) * novaSpeed,
            vz: 0,
            damage: this.difficulty === 'easy' ? 20 : (this.difficulty === 'hard' ? 32 : (this.difficulty === 'nightmare' ? 38 : 26)),
            radius: 0.32,
            fromPlayer: false,
            type: 'plasma_green',
            life: 0,
            maxLife: 4.5,
          });
        }
        this.spawnFloatingText('💥 8-WAY APOCALYPSE NOVA! 💥', boss.x, boss.y, '#22c55e', true);
      } else if (this.currentStage === 2 && roll < 0.50) {
        // Stage 2 Boss: Toxic Slag Barrage (spread of 4 toxic green acidic mortars)
        soundSynth.playExplosion();
        const spreads = [-0.30, -0.10, 0.10, 0.30];
        spreads.forEach((angOff) => {
          const ang = boss.angle + angOff;
          this.projectiles.push({
            id: this.nextProjId++,
            x: boss.x + Math.cos(ang) * 0.6,
            y: boss.y + Math.sin(ang) * 0.6,
            z: 0.5,
            vx: Math.cos(ang) * 9.5,
            vy: Math.sin(ang) * 9.5,
            vz: 0,
            damage: 26,
            radius: 0.35,
            fromPlayer: false,
            type: 'plasma_green',
            life: 0,
            maxLife: 4.0,
          });
        });
        this.spawnFloatingText('☣️ TOXIC SLAG BARRAGE! ☣️', boss.x, boss.y, '#22c55e', true);
      } else if (roll < 0.68) {
        // Rocket Barrage (spread of 5 rockets for Ultra Boss, 3 for regular boss)
        soundSynth.playExplosion();
        const spreads = this.boss.isUltra ? [-0.36, -0.18, 0, 0.18, 0.36] : [-0.22, 0, 0.22];
        const rSpeed = this.difficulty === 'easy' ? 9.0 : (this.difficulty === 'hard' ? 12.0 : (this.difficulty === 'nightmare' ? 13.5 : 10.5));
        const rDmg = this.difficulty === 'easy' ? 25 : (this.difficulty === 'hard' ? 40 : (this.difficulty === 'nightmare' ? 48 : 32));
        spreads.forEach((angOff) => {
          const ang = boss.angle + angOff;
          this.projectiles.push({
            id: this.nextProjId++,
            x: boss.x + Math.cos(ang) * 0.6,
            y: boss.y + Math.sin(ang) * 0.6,
            z: 0.5,
            vx: Math.cos(ang) * rSpeed,
            vy: Math.sin(ang) * rSpeed,
            vz: 0,
            damage: rDmg,
            radius: 0.35,
            fromPlayer: false,
            type: 'rocket',
            life: 0,
            maxLife: 4.0,
          });
        });
        this.spawnFloatingText(this.boss.isUltra ? '⚠️ ULTRA MISSILE STORM! ⚠️' : (this.currentStage === 3 ? '🔥 HELLFIRE BARRAGE! 🔥' : '⚠️ TITAN ROCKET BARRAGE! ⚠️'), boss.x, boss.y, '#ef4444', true);
      } else {
        // Shield Phase (shorter on Easy, longer on Nightmare)
        this.boss.shieldActive = true;
        this.boss.shieldTimer = this.difficulty === 'easy' ? 1.8 : (this.difficulty === 'nightmare' ? 3.5 : (this.boss.isUltra ? 2.5 : 2.8));
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

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 0.25);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let s = 1; s < steps; s++) {
      const tx = Math.floor(x1 + dx * s);
      const ty = Math.floor(y1 + dy * s);

      if (ty < 0 || ty >= this.mapData.height || tx < 0 || tx >= this.mapData.width) {
        return false;
      }

      if (this.mapData.grid[ty] && this.mapData.grid[ty][tx] > 0) {
        return false;
      }

      // If airlock doors are not fully open, block line-of-sight across the airlock threshold
      if (this.airlockState !== 'open' && this.mapData.airlockDoors) {
        for (let di = 0; di < this.mapData.airlockDoors.length; di++) {
          const ad = this.mapData.airlockDoors[di];
          if (ty === ad.y && tx === ad.x) {
            return false;
          }
        }
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
        // Prevent picking up items through walls or closed secret doors
        if (!this.checkLineOfSight(this.player.x, this.player.y, pk.x, pk.y)) {
          continue;
        }

        // If pickup is inside a secret area that hasn't been unsealed yet, prevent collection
        const isBehindClosedSecret = this.mapData.secrets.some(s => {
          if (s.revealed && (s.animOffset || 0) >= 0.7) return false;
          return Math.hypot(pk.x - (s.doorX + 0.5), pk.y - (s.doorY + 0.5)) < 2.5;
        });
        if (isBehindClosedSecret) continue;

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
        } else if (pk.type === 'infinite_dash_relic') {
          this.player.infiniteDashTimer = 15.0;
          this.player.dash.cooldown = 0;
          soundSynth.playRelicPickup();
          this.spawnFloatingText('⚡ CHRONO-HASTE RELIC ACTIVATED: ZERO-COOLDOWN DASH! ⚡', 0, 0, '#38bdf8', false, 24);
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
