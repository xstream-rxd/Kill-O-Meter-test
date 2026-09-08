import { PickupItem, LootChest, Enemy, SecretArea, Difficulty } from '../types';

export interface MapData {
  width: number;
  height: number;
  grid: number[][]; // 0 = empty, 1..N = wall texture ID + 1
  ceilingGrid: number[][];
  floorGrid: number[][];
  playerStart: { x: number; y: number; angle: number };
  neutralZone: { minY: number; maxY: number; minX: number; maxX: number };
  secrets: SecretArea[];
  pickups: PickupItem[];
  chests: LootChest[];
  enemies: Enemy[];
  bossSpawnPos: { x: number; y: number };
  stageNumber: number;
  stageName: string;
  exitPos: { x: number; y: number };
  exitUnlocked: boolean;
}

/**
 * Mathematical Dead-End Elimination Algorithm:
 * Converts any maze into a "Braided Maze" (a maze with ZERO dead ends / cul-de-sacs).
 * Every open floor tile is guaranteed to have at least 2 orthogonal exits, ensuring
 * that players and enemies can run infinitely without hitting a blind dead-end wall.
 */
export function removeAllDeadEnds(grid: number[][], width: number, height: number, maxIterations = 25): void {
  let foundDeadEnd = true;
  let iter = 0;

  while (foundDeadEnd && iter < maxIterations) {
    foundDeadEnd = false;
    iter++;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (grid[y][x] === 0) {
          // Count open orthogonal neighbors
          let openNeighbors = 0;
          const wallNeighbors: { x: number; y: number }[] = [];

          const checkNeighbor = (nx: number, ny: number) => {
            if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) {
              // Outer border is strictly impassable
              return;
            }
            if (grid[ny][nx] === 0) {
              openNeighbors++;
            } else {
              wallNeighbors.push({ x: nx, y: ny });
            }
          };

          checkNeighbor(x, y - 1);
          checkNeighbor(x, y + 1);
          checkNeighbor(x - 1, y);
          checkNeighbor(x + 1, y);

          // If a floor tile has <= 1 open neighbor, it is a dead end!
          if (openNeighbors <= 1 && wallNeighbors.length > 0) {
            // Find a wall neighbor that can be safely opened to loop into another path
            let bestWall = wallNeighbors[0];
            for (const wn of wallNeighbors) {
              const dx = wn.x - x;
              const dy = wn.y - y;
              const beyondX = wn.x + dx;
              const beyondY = wn.y + dy;
              // Prefer punching through to an existing floor tile to complete a loop
              if (
                beyondX > 0 &&
                beyondX < width - 1 &&
                beyondY > 0 &&
                beyondY < height - 1 &&
                grid[beyondY][beyondX] === 0
              ) {
                bestWall = wn;
                break;
              }
            }
            grid[bestWall.y][bestWall.x] = 0;
            foundDeadEnd = true;
          }
        }
      }
    }
  }
}

/**
 * Initializes an empty 48x48 map buffer with solid borders and default floors/ceilings.
 */
function createEmpty48Map(defaultFloor = 0, defaultCeil = 0): {
  width: number;
  height: number;
  grid: number[][];
  floorGrid: number[][];
  ceilingGrid: number[][];
  setWall: (x: number, y: number, tex: number) => void;
  fillBox: (x1: number, y1: number, x2: number, y2: number, tex: number) => void;
} {
  const width = 48;
  const height = 48;
  const grid: number[][] = [];
  const floorGrid: number[][] = [];
  const ceilingGrid: number[][] = [];

  for (let y = 0; y < height; y++) {
    grid[y] = [];
    floorGrid[y] = [];
    ceilingGrid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = 0;
      floorGrid[y][x] = defaultFloor;
      ceilingGrid[y][x] = defaultCeil;
    }
  }

  const setWall = (x: number, y: number, tex: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      grid[y][x] = tex;
    }
  };

  const fillBox = (x1: number, y1: number, x2: number, y2: number, tex: number) => {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(width - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(height - 1, Math.max(y1, y2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        grid[y][x] = tex;
      }
    }
  };

  // Outer Perimeter Walls (strictly border cells only)
  for (let x = 0; x < width; x++) {
    grid[0][x] = 3;
    grid[height - 1][x] = 3;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 3;
    grid[y][width - 1] = 3;
  }

  return { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox };
}

// -------------------------------------------------------------
// STAGE 1: SUBTERRANEAN LABYRINTH (48x48 Open Braided Maze)
// -------------------------------------------------------------
export function createStage1Map(): MapData {
  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox } = createEmpty48Map(0, 0);

  // Border styling (Tech Steel 3)
  for (let x = 0; x < width; x++) {
    grid[0][x] = 3;
    grid[height - 1][x] = 3;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 3;
    grid[y][width - 1] = 3;
  }

  // --- OPEN BRAIDED HIGHWAY SYSTEM (ZERO DEAD ENDS, CONTINUOUS LOOPS) ---
  // Outer Highway: 3-wide open corridor (x: 1..3, 44..46; y: 1..3, 44..46)
  // Mid Highway: 3-wide open corridor around x: 10..12, 35..37; y: 10..12, 35..37
  // Inner Highway: 3-wide open corridor around x: 18..20, 27..29; y: 18..20, 27..29
  // Central Plaza: 8x8 open rotunda at x: 20..27, y: 20..27 with monument columns

  // Grand Cardinal Arteries (Continuous North-South & East-West Avenues)
  // X: 23..24 is an open, unobstructed thoroughfare spanning the full map length
  // Y: 23..24 is an open, unobstructed thoroughfare spanning the full map width

  // 1. Central Monument Plaza Columns (Tech Wall 1 with cyan energy)
  setWall(21, 21, 1);
  setWall(26, 21, 1);
  setWall(21, 26, 1);
  setWall(26, 26, 1);

  // 2. Mid Ring Island Dividers (Looped walls with dual-ended bypasses)
  // North-West Quadrant Maze Islands (X: 4..18, Y: 4..18)
  fillBox(6, 6, 8, 7, 1);
  fillBox(6, 10, 7, 13, 1);
  fillBox(11, 6, 14, 7, 1);
  fillBox(11, 11, 13, 13, 3);
  fillBox(16, 6, 17, 9, 1);
  fillBox(16, 13, 17, 16, 1);
  fillBox(6, 16, 9, 17, 3);
  fillBox(12, 16, 14, 17, 1);

  // North-East Quadrant Maze Islands (X: 29..43, Y: 4..18)
  fillBox(39, 6, 41, 7, 1);
  fillBox(40, 10, 41, 13, 1);
  fillBox(33, 6, 36, 7, 1);
  fillBox(34, 11, 36, 13, 3);
  fillBox(30, 6, 31, 9, 1);
  fillBox(30, 13, 31, 16, 1);
  fillBox(38, 16, 41, 17, 3);
  fillBox(33, 16, 35, 17, 1);

  // South-West Quadrant Maze Islands (X: 4..18, Y: 29..43)
  fillBox(6, 40, 8, 41, 1);
  fillBox(6, 34, 7, 37, 1);
  fillBox(11, 40, 14, 41, 1);
  fillBox(11, 34, 13, 36, 3);
  fillBox(16, 38, 17, 41, 1);
  fillBox(16, 31, 17, 34, 1);
  fillBox(6, 30, 9, 31, 3);
  fillBox(12, 30, 14, 31, 1);

  // South-East Quadrant Maze Islands (X: 29..43, Y: 29..43)
  fillBox(39, 40, 41, 41, 1);
  fillBox(40, 34, 41, 37, 1);
  fillBox(33, 40, 36, 41, 1);
  fillBox(34, 34, 36, 36, 3);
  fillBox(30, 38, 31, 41, 1);
  fillBox(30, 31, 31, 34, 1);
  fillBox(38, 30, 41, 31, 3);
  fillBox(33, 30, 35, 31, 1);

  // 3. Ring Partition Pillars (spacious column arrays providing cover while keeping 100% flow)
  const ringPillars = [
    [10, 10], [14, 10], [33, 10], [37, 10],
    [10, 37], [14, 37], [33, 37], [37, 37],
    [10, 20], [10, 27], [37, 20], [37, 27],
    [20, 10], [27, 10], [20, 37], [27, 37],
  ];
  for (const [px, py] of ringPillars) {
    setWall(px, py, 3);
    setWall(px + 1, py, 3);
  }

  // 4. North Colosseum (Boss Arena at X: 18..29, Y: 3..10)
  // Completely open to North, South, East, West with grand monument pillars
  setWall(19, 5, 3);
  setWall(28, 5, 3);
  setWall(19, 9, 3);
  setWall(28, 9, 3);

  // 5. Secret Cache Pillars (Special monument pillars that unlock secret weapon caches when shot/interacted)
  // Secret 1: West Tactical Armory (Shotgun & Shells) inside monument pillar
  setWall(13, 12, 7); // Secret Door Texture
  // Secret 2: East Chaingun Bunker (Chaingun & Drum Ammo) inside monument pillar
  setWall(34, 12, 7);

  // Ensure absolute zero dead ends throughout the entire 48x48 layout
  removeAllDeadEnds(grid, width, height);

  // Secret Areas
  const secrets: SecretArea[] = [
    {
      id: 101,
      name: 'WEST TACTICAL ARMORY',
      triggerX: 13,
      triggerY: 13,
      doorX: 13,
      doorY: 12,
      revealed: false,
      rewardDescription: 'TACTICAL PUMP SHOTGUN & 12-GAUGE MAGNUM SHELLS',
    },
    {
      id: 102,
      name: 'EAST HEAVY CHAINGUN CACHE',
      triggerX: 34,
      triggerY: 13,
      doorX: 34,
      doorY: 12,
      revealed: false,
      rewardDescription: 'HEAVY ROTARY CHAINGUN & DRUM AMMO',
    },
  ];

  // Pickups spread across the expansive 48x48 braided labyrinth
  const pickups: PickupItem[] = [
    // Starting Safe Zone & South Boulevard
    { id: 1, x: 22.5, y: 44.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 25.5, y: 44.5, type: 'ammo_bullets', collected: false, bobPhase: 0.5 },
    { id: 3, x: 23.5, y: 41.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 24.5, y: 38.5, type: 'ammo_bullets', collected: false, bobPhase: 1.5 },
    // Outer Highway Loops
    { id: 5, x: 2.5, y: 24.0, type: 'medkit_large', collected: false, bobPhase: 0.2 },
    { id: 6, x: 45.5, y: 24.0, type: 'armor_large', collected: false, bobPhase: 0.7 },
    { id: 7, x: 2.5, y: 12.0, type: 'ammo_bullets', collected: false, bobPhase: 1.2 },
    { id: 8, x: 45.5, y: 12.0, type: 'ammo_shells', collected: false, bobPhase: 1.7 },
    { id: 9, x: 2.5, y: 36.0, type: 'ammo_shells', collected: false, bobPhase: 2.1 },
    { id: 10, x: 45.5, y: 36.0, type: 'medkit_small', collected: false, bobPhase: 2.4 },
    // Quadrants & Central Avenues
    { id: 11, x: 9.5, y: 9.5, type: 'ammo_shells', collected: false, bobPhase: 0.3 },
    { id: 12, x: 38.5, y: 9.5, type: 'ammo_bullets', collected: false, bobPhase: 0.8 },
    { id: 13, x: 9.5, y: 38.5, type: 'armor_small', collected: false, bobPhase: 1.3 },
    { id: 14, x: 38.5, y: 38.5, type: 'medkit_small', collected: false, bobPhase: 1.8 },
    { id: 15, x: 23.5, y: 23.5, type: 'armor_large', collected: false, bobPhase: 2.2 },
    { id: 16, x: 24.5, y: 24.5, type: 'medkit_large', collected: false, bobPhase: 2.6 },
    // North Colosseum Boss Approaches
    { id: 17, x: 23.5, y: 12.0, type: 'ammo_shells', collected: false, bobPhase: 0.4 },
    { id: 18, x: 24.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 0.9 },
    // Inside Secrets
    { id: 101, x: 13.5, y: 11.5, type: 'weapon_shotgun', collected: false, bobPhase: 0.1 },
    { id: 102, x: 13.5, y: 10.5, type: 'ammo_shells', collected: false, bobPhase: 0.6 },
    { id: 103, x: 34.5, y: 11.5, type: 'weapon_chaingun', collected: false, bobPhase: 1.1 },
    { id: 104, x: 34.5, y: 10.5, type: 'ammo_belts', collected: false, bobPhase: 1.6 },
  ];

  // Tactical Loot Chests placed at key looping intersections
  const chests: LootChest[] = [
    { id: 1, x: 4.5, y: 43.5, opened: false, lootType: 'armor_large', lootName: 'TACTICAL ASSAULT VEST', lootAmount: 50 },
    { id: 2, x: 43.5, y: 43.5, opened: false, lootType: 'ammo_bullets', lootName: 'HIGH CAPACITY DRUM', lootAmount: 100 },
    { id: 3, x: 4.5, y: 4.5, opened: false, lootType: 'medkit_large', lootName: 'PARAMEDIC MEDKIT', lootAmount: 60 },
    { id: 4, x: 43.5, y: 4.5, opened: false, lootType: 'ammo_shells', lootName: 'MAGNUM 12-GAUGE CRATE', lootAmount: 24 },
    { id: 5, x: 18.5, y: 23.5, opened: false, lootType: 'armor_small', lootName: 'KEVLAR PLATES', lootAmount: 25 },
    { id: 6, x: 29.5, y: 23.5, opened: false, lootType: 'medkit_small', lootName: 'FIELD STIMPACKS', lootAmount: 30 },
    { id: 7, x: 23.5, y: 17.5, opened: false, lootType: 'ammo_bullets', lootName: 'ARMOR PIERCING ROUNDS', lootAmount: 80 },
    { id: 8, x: 24.5, y: 31.5, opened: false, lootType: 'ammo_shells', lootName: 'BUCKSHOT SUPPLY', lootAmount: 20 },
  ];

  // Enemies positioned throughout the 48x48 braided maze (Stage 1: strictly introductory Grunts, Imps, and Scuttlers)
  const enemies: Enemy[] = [
    // South Approach (Grunts & Imps)
    { id: 1, type: 'grunt', x: 20.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 2, type: 'grunt', x: 27.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 3, type: 'imp', x: 24.0, y: 34.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 55, maxHealth: 55, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.3, attackCooldown: 1.9, isElite: false, radius: 0.35 },
    // South-West Quadrant
    { id: 4, type: 'scuttler', x: 10.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: 0, health: 48, maxHealth: 48, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
    { id: 5, type: 'grunt', x: 5.5, y: 31.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 4, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 3.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 6, type: 'imp', x: 14.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 55, maxHealth: 55, state: 'patrol', stateTimer: 2.5, animFrame: 0, speed: 2.3, attackCooldown: 1.9, isElite: false, radius: 0.35 },
    // South-East Quadrant
    { id: 7, type: 'scuttler', x: 37.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 48, maxHealth: 48, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
    { id: 8, type: 'grunt', x: 42.5, y: 31.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 4, health: 40, maxHealth: 40, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.2, attackCooldown: 1.5, isElite: false, radius: 0.35 },
    { id: 9, type: 'imp', x: 33.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 55, maxHealth: 55, state: 'patrol', stateTimer: 2.5, animFrame: 0, speed: 2.3, attackCooldown: 1.9, isElite: false, radius: 0.35 },
    // Central Grand Plaza
    { id: 10, type: 'imp', x: 24.0, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 65, maxHealth: 65, state: 'patrol', stateTimer: 3.0, animFrame: 0, speed: 2.4, attackCooldown: 1.8, isElite: false, radius: 0.35 },
    { id: 11, type: 'grunt', x: 19.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: 0, health: 40, maxHealth: 40, state: 'idle', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 12, type: 'scuttler', x: 28.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 48, maxHealth: 48, state: 'idle', stateTimer: 2.0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
    // North-West Quadrant
    { id: 13, type: 'grunt', x: 9.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: 0, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 14, type: 'scuttler', x: 14.5, y: 9.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 48, maxHealth: 48, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
    { id: 15, type: 'grunt', x: 5.5, y: 15.5, z: 0, vx: 0, vy: 0, angle: 0, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    // North-East Quadrant
    { id: 16, type: 'imp', x: 38.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 55, maxHealth: 55, state: 'patrol', stateTimer: 2.5, animFrame: 0, speed: 2.3, attackCooldown: 1.9, isElite: false, radius: 0.35 },
    { id: 17, type: 'scuttler', x: 33.5, y: 9.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 48, maxHealth: 48, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
    { id: 18, type: 'grunt', x: 42.5, y: 15.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 35, maxHealth: 35, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    // North Colosseum Guardians (Approach to exit)
    { id: 19, type: 'imp', x: 21.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 65, maxHealth: 65, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.4, attackCooldown: 1.8, isElite: false, radius: 0.35 },
    { id: 20, type: 'scuttler', x: 26.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 50, maxHealth: 50, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 5.2, attackCooldown: 0.75, isElite: false, radius: 0.32 },
  ];

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 24.0, y: 44.0, angle: -Math.PI / 2 },
    neutralZone: { minY: 41.5, maxY: 46.5, minX: 18.0, maxX: 30.0 },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 24.0, y: 7.0 },
    stageNumber: 1,
    stageName: 'SUBTERRANEAN LABYRINTH',
    exitPos: { x: 24.0, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 2: TOXIC REFINERY & CATACOMBS (48x48 Open Braided Maze)
// -------------------------------------------------------------
export function createStage2Map(): MapData {
  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox } = createEmpty48Map(3, 0);

  // Border: Warning Hazard Stripes (5) & Corrugated Steel (3)
  for (let x = 0; x < width; x++) {
    grid[0][x] = 5;
    grid[height - 1][x] = 5;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 5;
    grid[y][width - 1] = 5;
  }

  // --- OPEN BRAIDED CHEMICAL REFINERY (ZERO DEAD ENDS) ---
  // Grand Arterial Avenues (X: 23..24, Y: 23..24 completely clear)
  // Bio-hazard Vat Columns and Looped Reactor Islands

  // Central Chemical Reactor Core (4 freestanding columns with open center)
  setWall(21, 21, 5);
  setWall(26, 21, 5);
  setWall(21, 26, 5);
  setWall(26, 26, 5);

  // NW Bio-Vats & Looped Siphons
  fillBox(6, 6, 9, 7, 5);
  fillBox(6, 11, 7, 14, 3);
  fillBox(12, 6, 15, 7, 3);
  fillBox(12, 11, 14, 13, 5);
  fillBox(17, 7, 18, 10, 5);
  fillBox(17, 14, 18, 17, 3);
  fillBox(7, 17, 10, 18, 3);
  fillBox(13, 17, 15, 18, 5);

  // NE Bio-Vats & Looped Siphons
  fillBox(38, 6, 41, 7, 5);
  fillBox(40, 11, 41, 14, 3);
  fillBox(32, 6, 35, 7, 3);
  fillBox(33, 11, 35, 13, 5);
  fillBox(29, 7, 30, 10, 5);
  fillBox(29, 14, 30, 17, 3);
  fillBox(37, 17, 40, 18, 3);
  fillBox(32, 17, 34, 18, 5);

  // SW Chemical Channels
  fillBox(6, 40, 9, 41, 5);
  fillBox(6, 33, 7, 36, 3);
  fillBox(12, 40, 15, 41, 3);
  fillBox(12, 34, 14, 36, 5);
  fillBox(17, 37, 18, 40, 5);
  fillBox(17, 30, 18, 33, 3);
  fillBox(7, 29, 10, 30, 3);
  fillBox(13, 29, 15, 30, 5);

  // SE Chemical Channels
  fillBox(38, 40, 41, 41, 5);
  fillBox(40, 33, 41, 36, 3);
  fillBox(32, 40, 35, 41, 3);
  fillBox(33, 34, 35, 36, 5);
  fillBox(29, 37, 30, 40, 5);
  fillBox(29, 30, 30, 33, 3);
  fillBox(37, 29, 40, 30, 3);
  fillBox(32, 29, 34, 30, 5);

  // North Bio-Synthesis Arena (Boss Chamber)
  setWall(19, 5, 5);
  setWall(28, 5, 5);
  setWall(19, 9, 5);
  setWall(28, 9, 5);

  // Secrets: Secret Bio-Vaults tucked into monument pillars
  setWall(13, 12, 7);
  setWall(34, 12, 7);

  // Mathematical zero dead ends pass
  removeAllDeadEnds(grid, width, height);

  const secrets: SecretArea[] = [
    {
      id: 201,
      name: 'CLASSIFIED CHEMICAL WEAPONS LAB',
      triggerX: 13,
      triggerY: 13,
      doorX: 13,
      doorY: 12,
      revealed: false,
      rewardDescription: 'SUPER SHOTGUN & INCENDIARY SHELL CRATE',
    },
    {
      id: 202,
      name: 'HIGH-VOLTAGE PLASMA CONDENSER',
      triggerX: 34,
      triggerY: 13,
      doorX: 34,
      doorY: 12,
      revealed: false,
      rewardDescription: 'RAPID-FIRE PLASMA RIFLE & ENERGY CELLS',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 22.5, y: 44.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 25.5, y: 44.5, type: 'ammo_bullets', collected: false, bobPhase: 0.5 },
    { id: 3, x: 24.0, y: 41.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 24.0, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 45.5, y: 24.0, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 2.5, y: 12.0, type: 'ammo_shells', collected: false, bobPhase: 0.4 },
    { id: 7, x: 45.5, y: 12.0, type: 'ammo_cells', collected: false, bobPhase: 0.9 },
    { id: 8, x: 2.5, y: 36.0, type: 'ammo_shells', collected: false, bobPhase: 1.4 },
    { id: 9, x: 45.5, y: 36.0, type: 'ammo_bullets', collected: false, bobPhase: 1.9 },
    { id: 10, x: 23.5, y: 23.5, type: 'berserk_sphere', collected: false, bobPhase: 2.3 },
    { id: 11, x: 24.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 0.7 },
    { id: 12, x: 23.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.2 },
    // Inside Secrets
    { id: 201, x: 13.5, y: 11.5, type: 'weapon_shotgun', collected: false, bobPhase: 0.2 },
    { id: 202, x: 13.5, y: 10.5, type: 'ammo_shells', collected: false, bobPhase: 0.7 },
    { id: 203, x: 34.5, y: 11.5, type: 'weapon_plasma', collected: false, bobPhase: 1.2 },
    { id: 204, x: 34.5, y: 10.5, type: 'ammo_cells', collected: false, bobPhase: 1.7 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 4.5, y: 43.5, opened: false, lootType: 'armor_large', lootName: 'CHEMICAL HAZMAT VEST', lootAmount: 50 },
    { id: 2, x: 43.5, y: 43.5, opened: false, lootType: 'ammo_cells', lootName: 'HIGH DENSITY CELLS', lootAmount: 60 },
    { id: 3, x: 4.5, y: 4.5, opened: false, lootType: 'medkit_large', lootName: 'DECONTAMINATION MEDKIT', lootAmount: 60 },
    { id: 4, x: 43.5, y: 4.5, opened: false, lootType: 'ammo_shells', lootName: 'MAGNUM SHELL CRATE', lootAmount: 24 },
    { id: 5, x: 23.5, y: 18.5, opened: false, lootType: 'ammo_cells', lootName: 'ION ENERGY CELLS', lootAmount: 50 },
    { id: 6, x: 24.5, y: 29.5, opened: false, lootType: 'armor_large', lootName: 'HEAVY SLIME PLATES', lootAmount: 40 },
  ];

  const enemies: Enemy[] = [
    // South Approach (Grunts & Spitters)
    { id: 1, type: 'grunt', x: 21.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 45, maxHealth: 45, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.3, attackCooldown: 1.4, isElite: false, radius: 0.35 },
    { id: 2, type: 'grunt', x: 26.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 45, maxHealth: 45, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.3, attackCooldown: 1.4, isElite: false, radius: 0.35 },
    { id: 3, type: 'vile_spitter', x: 24.0, y: 34.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 140, maxHealth: 140, state: 'patrol', stateTimer: 2.5, animFrame: 0, speed: 2.1, attackCooldown: 2.0, isElite: false, radius: 0.44 },
    // SW Quadrant
    { id: 4, type: 'scuttler', x: 10.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: 0, health: 60, maxHealth: 60, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.5, attackCooldown: 0.65, isElite: false, radius: 0.32 },
    { id: 5, type: 'imp', x: 5.5, y: 31.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 4, health: 70, maxHealth: 70, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.5, attackCooldown: 1.7, isElite: false, radius: 0.35 },
    { id: 6, type: 'plasma_gunner', x: 14.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 95, maxHealth: 95, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.3, attackCooldown: 1.3, isElite: true, radius: 0.38 },
    // SE Quadrant
    { id: 7, type: 'scuttler', x: 37.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 60, maxHealth: 60, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.5, attackCooldown: 0.65, isElite: false, radius: 0.32 },
    { id: 8, type: 'vile_spitter', x: 42.5, y: 31.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 4, health: 140, maxHealth: 140, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 2.0, isElite: false, radius: 0.44 },
    { id: 9, type: 'plasma_gunner', x: 33.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 95, maxHealth: 95, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.3, attackCooldown: 1.3, isElite: true, radius: 0.38 },
    // Central Plaza (Spitters and Imps - Stage 2 introduces Acid Spitters and Plasma Gunners)
    { id: 10, type: 'vile_spitter', x: 24.0, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 125, maxHealth: 125, state: 'patrol', stateTimer: 3.0, animFrame: 0, speed: 2.0, attackCooldown: 2.2, isElite: false, radius: 0.44 },
    { id: 11, type: 'vile_spitter', x: 19.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: 0, health: 125, maxHealth: 125, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 2.0, attackCooldown: 2.2, isElite: false, radius: 0.44 },
    { id: 12, type: 'imp', x: 28.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 70, maxHealth: 70, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 2.4, attackCooldown: 1.8, isElite: false, radius: 0.35 },
    // NW Quadrant
    { id: 13, type: 'plasma_gunner', x: 9.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: 0, health: 90, maxHealth: 90, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.2, attackCooldown: 1.4, isElite: false, radius: 0.38 },
    { id: 14, type: 'scuttler', x: 14.5, y: 9.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 60, maxHealth: 60, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.4, attackCooldown: 0.7, isElite: false, radius: 0.32 },
    // NE Quadrant
    { id: 15, type: 'vile_spitter', x: 38.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 125, maxHealth: 125, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.0, attackCooldown: 2.2, isElite: false, radius: 0.44 },
    { id: 16, type: 'scuttler', x: 33.5, y: 9.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 60, maxHealth: 60, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.4, attackCooldown: 0.7, isElite: false, radius: 0.32 },
    // North Arena Guardians
    { id: 17, type: 'plasma_gunner', x: 21.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 95, maxHealth: 95, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.2, attackCooldown: 1.4, isElite: true, radius: 0.38 },
    { id: 18, type: 'vile_spitter', x: 26.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 130, maxHealth: 130, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.1, attackCooldown: 2.0, isElite: true, radius: 0.44 },
  ];

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 24.0, y: 44.0, angle: -Math.PI / 2 },
    neutralZone: { minY: 41.5, maxY: 46.5, minX: 18.0, maxX: 30.0 },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 24.0, y: 7.0 },
    stageNumber: 2,
    stageName: 'TOXIC REFINERY & CATACOMBS',
    exitPos: { x: 24.0, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 3: HELLGATE CITADEL (48x48 Open Braided Maze)
// -------------------------------------------------------------
export function createStage3Map(): MapData {
  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox } = createEmpty48Map(1, 1);

  // Border: Brutal Hell Obsidian Brick (2)
  for (let x = 0; x < width; x++) {
    grid[0][x] = 2;
    grid[height - 1][x] = 2;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 2;
    grid[y][width - 1] = 2;
  }

  // --- OPEN BRAIDED INFERNAL CITADEL ---
  // Grand Cardinal Arteries (X: 23..24, Y: 23..24 completely clear)
  // Basalt Monoliths, Demonic Gargoyle Relinquaries (6), Obsidian Columns (2)

  // Central Obsidian Colonnade
  setWall(21, 21, 6);
  setWall(26, 21, 6);
  setWall(21, 26, 6);
  setWall(26, 26, 6);

  // NW Infernal Monoliths
  fillBox(6, 6, 9, 8, 2);
  fillBox(6, 12, 7, 15, 6);
  fillBox(13, 6, 16, 7, 2);
  fillBox(12, 11, 15, 13, 2);
  fillBox(17, 6, 18, 9, 6);
  fillBox(17, 14, 18, 17, 2);
  fillBox(7, 17, 10, 18, 2);
  fillBox(13, 17, 15, 18, 6);

  // NE Infernal Monoliths
  fillBox(38, 6, 41, 8, 2);
  fillBox(40, 12, 41, 15, 6);
  fillBox(31, 6, 34, 7, 2);
  fillBox(32, 11, 35, 13, 2);
  fillBox(29, 6, 30, 9, 6);
  fillBox(29, 14, 30, 17, 2);
  fillBox(37, 17, 40, 18, 2);
  fillBox(32, 17, 34, 18, 6);

  // SW Demonic Vault Columns
  fillBox(6, 39, 9, 41, 2);
  fillBox(6, 32, 7, 35, 6);
  fillBox(13, 40, 16, 41, 2);
  fillBox(12, 34, 15, 36, 2);
  fillBox(17, 38, 18, 41, 6);
  fillBox(17, 30, 18, 33, 2);
  fillBox(7, 29, 10, 30, 2);
  fillBox(13, 29, 15, 30, 6);

  // SE Demonic Vault Columns
  fillBox(38, 39, 41, 41, 2);
  fillBox(40, 32, 41, 35, 6);
  fillBox(31, 40, 34, 41, 2);
  fillBox(32, 34, 35, 36, 2);
  fillBox(29, 38, 30, 41, 6);
  fillBox(29, 30, 30, 33, 2);
  fillBox(37, 29, 40, 30, 2);
  fillBox(32, 29, 34, 30, 6);

  // North Hellgate Sanctum
  setWall(19, 5, 6);
  setWall(28, 5, 6);
  setWall(19, 9, 6);
  setWall(28, 9, 6);

  // Secrets: Demonic Reliquaries
  setWall(13, 12, 7);
  setWall(34, 12, 7);

  // Mathematical zero dead ends pass
  removeAllDeadEnds(grid, width, height);

  const secrets: SecretArea[] = [
    {
      id: 301,
      name: 'SACRED INFERNAL VAULT',
      triggerX: 13,
      triggerY: 13,
      doorX: 13,
      doorY: 12,
      revealed: false,
      rewardDescription: 'HEAVY CHAINGUN & MEGABARREL AMMO',
    },
    {
      id: 302,
      name: 'DEMON LORD FORGE',
      triggerX: 34,
      triggerY: 13,
      doorX: 34,
      doorY: 12,
      revealed: false,
      rewardDescription: 'PLASMA RIFLE & OVERCHARGED PLASMA CORE',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 22.5, y: 44.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 25.5, y: 44.5, type: 'ammo_shells', collected: false, bobPhase: 0.5 },
    { id: 3, x: 24.0, y: 41.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 24.0, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 45.5, y: 24.0, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 23.5, y: 23.5, type: 'berserk_sphere', collected: false, bobPhase: 0.3 },
    { id: 7, x: 24.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 0.8 },
    { id: 8, x: 23.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.3 },
    { id: 301, x: 13.5, y: 11.5, type: 'weapon_chaingun', collected: false, bobPhase: 0.2 },
    { id: 302, x: 13.5, y: 10.5, type: 'ammo_bullets', collected: false, bobPhase: 0.7 },
    { id: 303, x: 34.5, y: 11.5, type: 'weapon_plasma', collected: false, bobPhase: 1.2 },
    { id: 304, x: 34.5, y: 10.5, type: 'ammo_cells', collected: false, bobPhase: 1.7 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 4.5, y: 43.5, opened: false, lootType: 'armor_large', lootName: 'BLOODSTONE DEMON ARMOR', lootAmount: 50 },
    { id: 2, x: 43.5, y: 43.5, opened: false, lootType: 'ammo_cells', lootName: 'OVERCHARGED PLASMA CELLS', lootAmount: 60 },
    { id: 3, x: 4.5, y: 4.5, opened: false, lootType: 'medkit_large', lootName: 'SOUL REJUVENATION MEDKIT', lootAmount: 60 },
    { id: 4, x: 43.5, y: 4.5, opened: false, lootType: 'ammo_shells', lootName: 'INFERNAL SLUG BOX', lootAmount: 24 },
    { id: 5, x: 23.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'HEAVY TITANIUM PLATING', lootAmount: 50 },
  ];

  const enemies: Enemy[] = [
    { id: 1, type: 'imp', x: 21.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 70, maxHealth: 70, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.6, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 2, type: 'imp', x: 26.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 70, maxHealth: 70, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.6, attackCooldown: 1.6, isElite: false, radius: 0.35 },
    { id: 3, type: 'baron', x: 24.0, y: 34.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 240, maxHealth: 240, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.6, attackCooldown: 1.5, isElite: true, radius: 0.45 },
    { id: 4, type: 'scuttler', x: 10.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: 0, health: 65, maxHealth: 65, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.6, attackCooldown: 0.6, isElite: false, radius: 0.32 },
    { id: 5, type: 'scuttler', x: 37.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 65, maxHealth: 65, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.6, attackCooldown: 0.6, isElite: false, radius: 0.32 },
    { id: 6, type: 'plasma_gunner', x: 14.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 100, maxHealth: 100, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.4, attackCooldown: 1.2, isElite: true, radius: 0.38 },
    { id: 7, type: 'plasma_gunner', x: 33.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 100, maxHealth: 100, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.4, attackCooldown: 1.2, isElite: true, radius: 0.38 },
    { id: 8, type: 'baron', x: 24.0, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 260, maxHealth: 260, state: 'patrol', stateTimer: 3.0, animFrame: 0, speed: 2.7, attackCooldown: 1.4, isElite: true, radius: 0.45 },
    { id: 9, type: 'vile_spitter', x: 19.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: 0, health: 150, maxHealth: 150, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 2.2, attackCooldown: 1.9, isElite: false, radius: 0.44 },
    { id: 10, type: 'vile_spitter', x: 28.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 150, maxHealth: 150, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 2.2, attackCooldown: 1.9, isElite: false, radius: 0.44 },
    { id: 11, type: 'scuttler', x: 9.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: 0, health: 65, maxHealth: 65, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 5.6, attackCooldown: 0.6, isElite: false, radius: 0.32 },
    { id: 12, type: 'scuttler', x: 38.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 65, maxHealth: 65, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 5.6, attackCooldown: 0.6, isElite: false, radius: 0.32 },
    { id: 13, type: 'baron', x: 21.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 260, maxHealth: 260, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.7, attackCooldown: 1.4, isElite: true, radius: 0.45 },
    { id: 14, type: 'baron', x: 26.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 260, maxHealth: 260, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.7, attackCooldown: 1.4, isElite: true, radius: 0.45 },
  ];

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 24.0, y: 44.0, angle: -Math.PI / 2 },
    neutralZone: { minY: 41.5, maxY: 46.5, minX: 18.0, maxX: 30.0 },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 24.0, y: 7.0 },
    stageNumber: 3,
    stageName: 'HELLGATE CITADEL',
    exitPos: { x: 24.0, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 4: VOID CORE / APOCALYPSE SANCTUM (48x48 Open Braided Maze)
// -------------------------------------------------------------
export function createStage4Map(): MapData {
  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox } = createEmpty48Map(1, 2);

  // Border: Obsidian (2) and Bronze Demon Reliefs (6)
  for (let x = 0; x < width; x++) {
    grid[0][x] = 2;
    grid[height - 1][x] = 2;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = 2;
    grid[y][width - 1] = 2;
  }

  // --- MONUMENTAL APOCALYPSE COLOSSEUM (ZERO DEAD ENDS) ---
  // Grand Cardinal Boulevards (X: 23..24, Y: 23..24 wide open)
  // Multi-tier Concentric Ring Colonnade with Void Pylons

  // Central Core Crucible
  setWall(21, 21, 6);
  setWall(26, 21, 6);
  setWall(21, 26, 6);
  setWall(26, 26, 6);

  // Concentric Void Pylon Rings (spaced evenly, keeping all corridors 3+ tiles wide)
  const pylonRings = [
    [8, 8], [14, 8], [33, 8], [39, 8],
    [8, 39], [14, 39], [33, 39], [39, 39],
    [8, 20], [8, 27], [39, 20], [39, 27],
    [20, 8], [27, 8], [20, 39], [27, 39],
    [14, 14], [33, 14], [14, 33], [33, 33],
  ];
  for (const [px, py] of pylonRings) {
    fillBox(px, py, px + 1, py + 1, 2);
  }

  // Intermediate Chicane Dividers (giving tactical cover for bullet dodging while looping)
  fillBox(10, 16, 11, 19, 6);
  fillBox(16, 10, 19, 11, 6);
  fillBox(36, 16, 37, 19, 6);
  fillBox(28, 10, 31, 11, 6);

  fillBox(10, 28, 11, 31, 6);
  fillBox(16, 36, 19, 37, 6);
  fillBox(36, 28, 37, 31, 6);
  fillBox(28, 36, 31, 37, 6);

  // Grand Colosseum North Tier
  setWall(19, 5, 6);
  setWall(28, 5, 6);
  setWall(19, 9, 6);
  setWall(28, 9, 6);

  // Secrets: Ultimate Apocalypse Armory (Plasma Rifle & Chaingun)
  setWall(14, 15, 7);
  setWall(33, 15, 7);

  // Mathematical zero dead ends pass
  removeAllDeadEnds(grid, width, height);

  const secrets: SecretArea[] = [
    {
      id: 401,
      name: 'APOCALYPSE SUPERWEAPON VAULT',
      triggerX: 14,
      triggerY: 16,
      doorX: 14,
      doorY: 15,
      revealed: false,
      rewardDescription: 'OVERCHARGED PLASMA RIFLE & DRUM AMMO CRATE',
    },
    {
      id: 402,
      name: 'TITAN BUSTER ARSENAL',
      triggerX: 33,
      triggerY: 16,
      doorX: 33,
      doorY: 15,
      revealed: false,
      rewardDescription: 'SUPER SHOTGUN & 50 MAGNUM SHELLS',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 22.5, y: 44.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 25.5, y: 44.5, type: 'ammo_cells', collected: false, bobPhase: 0.5 },
    { id: 3, x: 24.0, y: 41.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 24.0, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 45.5, y: 24.0, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 23.5, y: 23.5, type: 'berserk_sphere', collected: false, bobPhase: 0.3 },
    { id: 7, x: 24.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 0.8 },
    { id: 8, x: 23.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.3 },
    { id: 401, x: 14.5, y: 14.5, type: 'weapon_plasma', collected: false, bobPhase: 0.2 },
    { id: 402, x: 14.5, y: 13.5, type: 'ammo_cells', collected: false, bobPhase: 0.7 },
    { id: 403, x: 33.5, y: 14.5, type: 'weapon_shotgun', collected: false, bobPhase: 1.2 },
    { id: 404, x: 33.5, y: 13.5, type: 'ammo_shells', collected: false, bobPhase: 1.7 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 4.5, y: 43.5, opened: false, lootType: 'armor_large', lootName: 'APOCALYPTIC BULWARK ARMOR', lootAmount: 60 },
    { id: 2, x: 43.5, y: 43.5, opened: false, lootType: 'ammo_cells', lootName: 'QUANTUM CELL BATTERY', lootAmount: 80 },
    { id: 3, x: 4.5, y: 4.5, opened: false, lootType: 'medkit_large', lootName: 'MEGA-STIM NANO-MEDKIT', lootAmount: 80 },
    { id: 4, x: 43.5, y: 4.5, opened: false, lootType: 'ammo_bullets', lootName: 'HEAVY ROTARY DRUM CRATE', lootAmount: 120 },
    { id: 5, x: 23.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'WARLORD KINETIC SHIELD', lootAmount: 50 },
  ];

  const enemies: Enemy[] = [
    { id: 1, type: 'plasma_gunner', x: 21.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 110, maxHealth: 110, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.4, attackCooldown: 1.1, isElite: true, radius: 0.38 },
    { id: 2, type: 'plasma_gunner', x: 26.5, y: 38.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 110, maxHealth: 110, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 3.4, attackCooldown: 1.1, isElite: true, radius: 0.38 },
    { id: 3, type: 'baron', x: 24.0, y: 34.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 280, maxHealth: 280, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.8, attackCooldown: 1.3, isElite: true, radius: 0.45 },
    { id: 4, type: 'scuttler', x: 10.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: 0, health: 70, maxHealth: 70, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.7, attackCooldown: 0.55, isElite: true, radius: 0.32 },
    { id: 5, type: 'scuttler', x: 37.5, y: 35.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 70, maxHealth: 70, state: 'idle', stateTimer: 0, animFrame: 0, speed: 5.7, attackCooldown: 0.55, isElite: true, radius: 0.32 },
    { id: 6, type: 'vile_spitter', x: 14.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 160, maxHealth: 160, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.3, attackCooldown: 1.8, isElite: true, radius: 0.44 },
    { id: 7, type: 'vile_spitter', x: 33.5, y: 33.5, z: 0, vx: 0, vy: 0, angle: -Math.PI / 2, health: 160, maxHealth: 160, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.3, attackCooldown: 1.8, isElite: true, radius: 0.44 },
    { id: 8, type: 'baron', x: 24.0, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 300, maxHealth: 300, state: 'patrol', stateTimer: 3.0, animFrame: 0, speed: 2.8, attackCooldown: 1.3, isElite: true, radius: 0.45 },
    { id: 9, type: 'plasma_gunner', x: 19.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: 0, health: 110, maxHealth: 110, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 3.4, attackCooldown: 1.1, isElite: true, radius: 0.38 },
    { id: 10, type: 'plasma_gunner', x: 28.5, y: 23.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 110, maxHealth: 110, state: 'idle', stateTimer: 1.5, animFrame: 0, speed: 3.4, attackCooldown: 1.1, isElite: true, radius: 0.38 },
    { id: 11, type: 'scuttler', x: 9.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: 0, health: 70, maxHealth: 70, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 5.7, attackCooldown: 0.55, isElite: true, radius: 0.32 },
    { id: 12, type: 'scuttler', x: 38.5, y: 14.5, z: 0, vx: 0, vy: 0, angle: Math.PI, health: 70, maxHealth: 70, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 5.7, attackCooldown: 0.55, isElite: true, radius: 0.32 },
    { id: 13, type: 'baron', x: 21.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 300, maxHealth: 300, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.8, attackCooldown: 1.3, isElite: true, radius: 0.45 },
    { id: 14, type: 'baron', x: 26.5, y: 7.5, z: 0, vx: 0, vy: 0, angle: Math.PI / 2, health: 300, maxHealth: 300, state: 'patrol', stateTimer: 2.0, animFrame: 0, speed: 2.8, attackCooldown: 1.3, isElite: true, radius: 0.45 },
  ];

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 24.0, y: 44.0, angle: -Math.PI / 2 },
    neutralZone: { minY: 41.5, maxY: 46.5, minX: 18.0, maxX: 30.0 },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 24.0, y: 7.0 },
    stageNumber: 4,
    stageName: 'APOCALYPSE VOID CORE',
    exitPos: { x: 24.0, y: 4.5 },
    exitUnlocked: false,
  };
}

/**
 * Ensures that all critical entities (player, enemies, chests, pickups) are positioned
 * in open floor space with proper boundary distance and clearance margins.
 */
export function sanitizeMapData(map: MapData): MapData {
  const isWall = (gx: number, gy: number): boolean => {
    if (gx < 0 || gx >= map.width || gy < 0 || gy >= map.height) return true;
    return map.grid[gy] !== undefined && map.grid[gy][gx] > 0;
  };

  const isCollision = (x: number, y: number, r = 0.35): boolean => {
    const minX = Math.floor(x - r);
    const maxX = Math.floor(x + r);
    const minY = Math.floor(y - r);
    const maxY = Math.floor(y + r);
    for (let my = minY; my <= maxY; my++) {
      for (let mx = minX; mx <= maxX; mx++) {
        if (isWall(mx, my)) return true;
      }
    }
    return false;
  };

  const findNearestClearSpot = (startX: number, startY: number, r = 0.35): { x: number; y: number } => {
    if (!isCollision(startX, startY, r)) return { x: startX, y: startY };
    for (let radius = 1; radius < 15; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const testX = Math.floor(startX) + dx + 0.5;
          const testY = Math.floor(startY) + dy + 0.5;
          if (!isCollision(testX, testY, r)) {
            return { x: testX, y: testY };
          }
        }
      }
    }
    return { x: startX, y: startY };
  };

  // Sanitize playerStart
  const safePlayer = findNearestClearSpot(map.playerStart.x, map.playerStart.y, 0.3);
  map.playerStart.x = safePlayer.x;
  map.playerStart.y = safePlayer.y;

  // Sanitize enemies
  for (const e of map.enemies) {
    const safe = findNearestClearSpot(e.x, e.y, e.radius || 0.35);
    e.x = safe.x;
    e.y = safe.y;
    e.spawnOrigin = { x: safe.x, y: safe.y };
  }

  // Sanitize chests
  for (const c of map.chests) {
    const safe = findNearestClearSpot(c.x, c.y, 0.35);
    c.x = safe.x;
    c.y = safe.y;
  }

  // Sanitize pickups
  for (const p of map.pickups) {
    const safe = findNearestClearSpot(p.x, p.y, 0.25);
    p.x = safe.x;
    p.y = safe.y;
  }

  return map;
}

// Map factory helper with stage and difficulty progression scaling
export function applyDifficultyToMap(map: MapData, difficulty: Difficulty = 'normal'): MapData {
  const hpMult = difficulty === 'easy' ? 0.75 : (difficulty === 'hard' ? 1.25 : (difficulty === 'nightmare' ? 1.5 : 1.0));
  const speedMult = difficulty === 'easy' ? 0.85 : (difficulty === 'hard' ? 1.18 : (difficulty === 'nightmare' ? 1.38 : 1.0));
  const cdMult = difficulty === 'easy' ? 1.35 : (difficulty === 'hard' ? 0.82 : (difficulty === 'nightmare' ? 0.68 : 1.0));

  // 1. Scale enemy stats (health, speed, attack cooldowns)
  for (const e of map.enemies) {
    e.health = Math.round(e.health * hpMult);
    e.maxHealth = Math.round(e.maxHealth * hpMult);
    e.speed = +(e.speed * speedMult).toFixed(2);
    e.attackCooldown = +(e.attackCooldown * cdMult).toFixed(2);

    if (difficulty === 'hard' && !e.isElite && Math.random() < 0.25) {
      e.isElite = true;
      e.health = Math.round(e.health * 1.2);
      e.maxHealth = e.health;
    } else if (difficulty === 'nightmare' && !e.isElite && Math.random() < 0.45) {
      e.isElite = true;
      e.health = Math.round(e.health * 1.3);
      e.maxHealth = e.health;
    }
  }

  // 2. Adjust enemy count on Easy mode so novice players are not swarmed
  if (difficulty === 'easy' && map.enemies.length > 14) {
    map.enemies = map.enemies.filter((e, idx) => e.type === 'boss' || (idx % 4 !== 3));
  }

  // 3. Scale loot supply on Easy mode for forgiving exploration
  if (difficulty === 'easy') {
    for (const chest of map.chests) {
      if (chest.lootAmount) {
        chest.lootAmount = Math.round(chest.lootAmount * 1.35);
      }
    }
  }

  return map;
}

export function createStageMap(stage: number, difficulty: Difficulty = 'normal'): MapData {
  let map: MapData;
  switch (stage) {
    case 1:
      map = createStage1Map();
      break;
    case 2:
      map = createStage2Map();
      break;
    case 3:
      map = createStage3Map();
      break;
    case 4:
    default:
      map = createStage4Map();
      break;
  }
  const sanitized = sanitizeMapData(map);
  return applyDifficultyToMap(sanitized, difficulty);
}

// Backward compatibility alias
export function createRetroArenaMap(): MapData {
  return createStageMap(1, 'normal');
}
