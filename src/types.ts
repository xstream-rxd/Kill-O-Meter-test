export type WeaponType = 'fist' | 'pistol' | 'shotgun' | 'chaingun' | 'plasma';

export interface Weapon {
  type: WeaponType;
  name: string;
  slot: number;
  damage: number;
  fireRate: number; // in seconds
  ammoType: 'none' | 'bullets' | 'shells' | 'cells' | 'belts';
  ammoPerShot: number;
  magazine: number;
  maxMagazine: number;
  reloadTime: number;
  spread: number;
  pellets: number;
  range: number;
  knockback: number;
  recoil: number;
  sound: string;
  isAutomatic: boolean;
  unlocked: boolean;
  needsReload?: boolean;
}

export type EnemyType = 'grunt' | 'imp' | 'baron' | 'lost_soul' | 'boss' | 'scuttler' | 'plasma_gunner' | 'vile_spitter';

export type EnemyState = 'idle' | 'patrol' | 'chase' | 'search' | 'guard' | 'attack' | 'pain' | 'staggered' | 'dying' | 'dead' | 'gibbed' | 'alert';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  maxHealth: number;
  state: EnemyState;
  stateTimer: number;
  animFrame: number;
  speed: number;
  attackCooldown: number;
  isElite: boolean;
  isUltraBoss?: boolean;
  colorVariation?: string;
  targetX?: number;
  targetY?: number;
  lastSeenPlayerPos?: { x: number; y: number };
  spawnOrigin?: { x: number; y: number };
  homePost?: { x: number; y: number };
  sectorName?: string;
  territoryRadius?: number;
  guardAngle?: number;
  guardTimer?: number;
  patrolTarget?: { x: number; y: number };
  patrolWaypoints?: { x: number; y: number }[];
  waypointIndex?: number;
  patrolTimer?: number;
  searchTimer?: number;
  alertTimer?: number;
  radius: number;
  strafeDir?: number;
  strafeTimer?: number;
  windupTimer?: number;
  corpseTimer?: number;
  specialStateTimer?: number;
  burstCount?: number;
  painTimer?: number;
  hitFlashTimer?: number;
  staggerTimer?: number;
  stuckTimer?: number;
  unstuckNudgeAngle?: number;
  stageBossId?: number;
  bossName?: string;
  bossSubtitle?: string;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  radius: number;
  fromPlayer: boolean;
  type: 'plasma_blue' | 'plasma_green' | 'fireball' | 'rocket' | 'boss_orb' | 'acid_glob';
  life: number;
  maxLife: number;
  splashRadius?: number;
}

export type GibType =
  | 'skull'
  | 'meat'
  | 'rib'
  | 'eyeball'
  | 'blood_drop'
  | 'metal_shard'
  | 'severed_arm'
  | 'severed_leg'
  | 'heart'
  | 'jaw'
  | 'intestine'
  | 'demon_horn'
  | 'brain_lobe';

export interface GibParticle {
  id: number;
  x: number;
  y: number;
  z: number; // 0 is floor, 1 is ceiling
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  gibType: GibType;
  size: number;
  color: string;
  bounces: number;
  life: number;
  maxLife: number;
  settled: boolean;
}

export interface SplatterSatellite {
  dx: number;
  dy: number;
  r: number;
}

export interface GlorySplatterDrop {
  id: number;
  x: number; // 0 to 1 percentage of screen width
  y: number; // 0 to 1 percentage of screen height
  size: number; // base splatter radius
  length: number; // drip trail length in px
  dripProgress: number; // 0 to 1
  opacity: number;
  color: string;
  highlightColor: string;
  satellites: SplatterSatellite[];
  dripSpeed: number;
  decaySpeed: number;
}

export interface FloorDecal {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  type: 'blood' | 'scorch' | 'plasma_burn' | 'slime' | 'scorch_blast' | 'acid_burn';
  life: number;
  maxLife: number;
}

export interface WallDecal {
  id: number;
  mapX: number;
  mapY: number;
  side: 0 | 1; // 0 for X wall, 1 for Y wall
  wallOffset: number; // 0 to 1 along wall
  wallZ: number; // 0 to 1 height
  size: number;
  color: string;
  type: 'blood_splat' | 'bullet_hole' | 'plasma_burn' | 'scorch_blast' | 'acid_burn';
  life: number;
  maxLife: number;
}

export interface SteamParticle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ShellCasing {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rot: number;
  vRot: number;
  pitch: number;
  vPitch: number;
  casingType: 'shotgun_red' | 'brass_bullet';
  bounces: number;
  life: number;
  maxLife: number;
  settled: boolean;
}

export type PickupType = 
  | 'medkit_small' 
  | 'medkit_large' 
  | 'armor_small' 
  | 'armor_large' 
  | 'ammo_bullets' 
  | 'ammo_shells' 
  | 'ammo_cells' 
  | 'ammo_belts'
  | 'weapon_shotgun' 
  | 'weapon_chaingun' 
  | 'weapon_plasma'
  | 'berserk_sphere'
  | 'infinite_dash_relic';

export interface PickupItem {
  id: number;
  x: number;
  y: number;
  type: PickupType;
  collected: boolean;
  respawnTimer?: number;
  bobPhase: number;
}

export type ChestLootType = 
  | 'medkit_small' 
  | 'medkit_large' 
  | 'armor_small' 
  | 'armor_large' 
  | 'ammo_bullets' 
  | 'ammo_shells' 
  | 'ammo_cells' 
  | 'ammo_belts'
  | 'berserk_sphere'
  | 'infinite_dash_relic';

export interface LootChest {
  id: number;
  x: number;
  y: number;
  opened: boolean;
  openAnimProgress?: number; // 0 to 1
  lootType?: ChestLootType;
  lootName?: string;
  lootAmount?: number;
}

export interface Player {
  x: number;
  y: number;
  angle: number; // direction in radians
  pitch: number; // vertical look
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  ammo: {
    bullets: number;
    maxBullets: number;
    shells: number;
    maxShells: number;
    cells: number;
    maxCells: number;
    belts: number;
    maxBelts: number;
  };
  currentWeapon: WeaponType;
  weapons: Record<WeaponType, Weapon>;
  isFiring: boolean;
  weaponAnim: {
    frame: number;
    recoilY: number;
    muzzleFlash: boolean;
    timer: number;
    shootFlashIntensity?: number;
    recoilBumpY?: number;
    recoilPos?: number;
    recoilVel?: number;
    switchAnim?: number;
  };
  meleeAnim?: {
    active: boolean;
    timer: number;
    maxTimer: number;
    frame: number;
    isFinisher: boolean;
  };
  dash: {
    active: boolean;
    duration: number;
    maxDuration: number;
    cooldown: number;
    maxCooldown: number;
    dirX: number;
    dirY: number;
  };
  reload: {
    isReloading: boolean;
    timer: number;
    maxTimer: number;
  };
  invulnerableTimer: number;
  berserkTimer: number; // double damage + speed
  infiniteDashTimer?: number; // chrono-haste: 0 cooldown dash
  screenShake: number;
  damageFlash: number; // 0 to 1 red vignette
  healFlash: number; // green vignette
  armorFlash?: number; // cyan armor pickup pulse (0 to 1)
  lastDamageAngle: number;
  cameraTiltAngle?: number;
  lastMoveVx?: number;
  lastMoveVy?: number;
  vx?: number;
  vy?: number;
  weaponHeat?: number;
  chaingunOverheat?: {
    heat: number;
    maxHeat: number;
    shotsFired: number;
    maxShots: number;
    isOverheated: boolean;
    cooldownTimer: number;
    maxCooldown: number;
  };
  inspectAnim?: {
    active: boolean;
    timer: number;
    maxTimer: number;
  };
}

export interface KillCombo {
  count: number;
  multiplier: number;
  timer: number;
  maxTimer: number;
  tierName: string;
}

export interface BossState {
  active: boolean;
  spawned: boolean;
  enemyId?: number;
  name: string;
  subtitle?: string;
  phase: number; // 1, 2, 3
  shieldActive: boolean;
  shieldTimer: number;
  specialAttackCooldown: number;
  arenaLockdown: boolean;
  isUltra?: boolean;
}

export type Difficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface KeyBindings {
  moveForward: string;
  moveBackward: string;
  strafeLeft: string;
  strafeRight: string;
  dash: string;
  fire: string;
  interact: string;
  gloryKill: string;
  reload: string;
  weapon1: string;
  weapon2: string;
  weapon3: string;
  weapon4: string;
  weapon5: string;
  toggleMinimap: string;
}

export interface LevelTransition {
  active: boolean;
  stageCompleted?: number;
  nextStage?: number;
  fromStage?: number;
  toStage?: number;
  stageName: string;
  timer: number;
  maxTimer: number;
  kills?: number;
  secretsFound?: number;
  totalSecrets?: number;
  isDebriefWaiting?: boolean; // Wait for player click or Spacebar to deploy
  timeElapsed?: number;
}

export interface SecretArea {
  id: number;
  name: string;
  triggerX: number;
  triggerY: number;
  doorX: number;
  doorY: number;
  revealed: boolean;
  rewardDescription: string;
  animOffset?: number; // 0 (closed) to 1 (fully receded into floor)
  animating?: boolean;
  animTimer?: number;
}

export interface AirlockDoor {
  x: number;
  y: number;
  animOffset?: number; // 0 (closed) to 1 (fully receded / opened)
  sealed?: boolean; // true once permanently closed behind player
}

export interface AirlockConsole {
  x: number;
  y: number;
  triggered?: boolean;
}

export interface GameSettings {
  difficulty: Difficulty;
  mouseSensitivity: number;
  gamepadSensitivity: number; // 1.0 to 5.0, default 2.2
  gamepadDeadzone: number; // 0.05 to 0.35, default 0.15
  gamepadInvertY: boolean; // default false
  gamepadVibration: boolean; // default true
  soundVolume: number;
  musicVolume: number;
  renderResolution: number; // 1 = full, 0.75 = medium, 0.5 = retro low-res
  bloodDensity: number;
  showMinimap: boolean;
  fov: number; // in radians (~1.05 to 1.3)
  keyBindings: KeyBindings;
}

export interface FloatingText {
  id: number;
  x: number; // world or screen
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  isWorld: boolean;
  fontSize?: number;
}

export interface GameStats {
  score: number;
  kills: number;
  gibs: number;
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
  damageTaken: number;
  bossDamage: number;
  maxCombo: number;
  timeElapsed: number;
  secretsFound: number;
  totalSecrets: number;
  waveReached: number;
  currentStage: number;
  totalStages: number;
  isWardenMutationEnd?: boolean;
}
