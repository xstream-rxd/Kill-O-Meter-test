import { PickupItem, LootChest, Enemy, SecretArea, Difficulty, AirlockDoor, AirlockConsole } from '../types';

export interface MapData {
  width: number;
  height: number;
  grid: number[][]; // 0 = empty, 1..N = wall texture ID + 1
  ceilingGrid: number[][];
  floorGrid: number[][];
  playerStart: { x: number; y: number; angle: number };
  neutralZone: { minY: number; maxY: number; minX: number; maxX: number };
  airlockDoors?: AirlockDoor[];
  airlockConsole?: AirlockConsole;
  secrets: SecretArea[];
  pickups: PickupItem[];
  chests: LootChest[];
  enemies: Enemy[];
  bossSpawnPos: { x: number; y: number };
  stageNumber: number;
  stageName: string;
  exitPos: { x: number; y: number };
  exitUnlocked: boolean;
  totalEnemies?: number;
  requiredKills?: number;
}

/**
 * Builds the enclosed Safe Staging Bunker Room at the south sector (X: 10..17, Y: 23..27).
 * - Encloses the room with perimeter walls and a solid dual-blast door at (13, 23) & (14, 23)
 * - Guarantees clear floor inside (X: 11..16, Y: 24..26)
 * - Guarantees clear egress corridor outside (X: 13..14, Y: 20..22)
 */
export function buildSafeStagingBunker(
  grid: number[][],
  wallTex: number = 3,
  doorTex: number = 7
): void {
  // 1. Clear inner bunker floor
  for (let y = 24; y <= 26; y++) {
    for (let x = 11; x <= 16; x++) {
      grid[y][x] = 0;
    }
  }

  // 2. West and East bunker containment walls
  for (let y = 23; y <= 27; y++) {
    grid[y][10] = wallTex;
    grid[y][17] = wallTex;
  }

  // 3. South rear wall
  for (let x = 10; x <= 17; x++) {
    grid[27][x] = wallTex;
  }

  // 4. North front blast wall
  for (let x = 10; x <= 12; x++) {
    grid[23][x] = wallTex;
  }
  for (let x = 15; x <= 17; x++) {
    grid[23][x] = wallTex;
  }

  // 5. Sealed Airlock Blast Doors (Solid on level start)
  grid[23][13] = doorTex;
  grid[23][14] = doorTex;

  // 6. Ensure egress thoroughfare outside the airlock is clear
  for (let y = 20; y <= 22; y++) {
    grid[y][13] = 0;
    grid[y][14] = 0;
  }
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
            let bestWall = wallNeighbors[0];
            for (const wn of wallNeighbors) {
              const dx = wn.x - x;
              const dy = wn.y - y;
              const beyondX = wn.x + dx;
              const beyondY = wn.y + dy;
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

export interface MazeTheme {
  wallMain: number;
  wallAccent: number;
  doorTex: number;
  floor: number;
  ceil: number;
}

/**
 * Builds a balanced 28x28 FPS layout featuring expansive combat chambers
 * (North Boss Colosseum, Central Rotunda, 4 Large Quadrant Wings, 2 Mid-Wing Chambers)
 * and interconnected braided corridors (2 tiles wide) with mathematically guaranteed zero dead ends.
 */
export function buildBraidedMazeBase(theme: MazeTheme): {
  width: number;
  height: number;
  grid: number[][];
  floorGrid: number[][];
  ceilingGrid: number[][];
  setWall: (x: number, y: number, tex: number) => void;
  fillBox: (x1: number, y1: number, x2: number, y2: number, tex: number) => void;
  clearArea: (x1: number, y1: number, x2: number, y2: number) => void;
} {
  const width = 28;
  const height = 28;
  const grid: number[][] = [];
  const floorGrid: number[][] = [];
  const ceilingGrid: number[][] = [];

  // 1. Fill entire 28x28 level buffer with solid thematic facility walls
  for (let y = 0; y < height; y++) {
    grid[y] = [];
    floorGrid[y] = [];
    ceilingGrid[y] = [];
    for (let x = 0; x < width; x++) {
      grid[y][x] = theme.wallMain;
      floorGrid[y][x] = theme.floor;
      ceilingGrid[y][x] = theme.ceil;
    }
  }

  const clearArea = (x1: number, y1: number, x2: number, y2: number) => {
    const minX = Math.max(1, Math.min(x1, x2));
    const maxX = Math.min(width - 2, Math.max(x1, x2));
    const minY = Math.max(1, Math.min(y1, y2));
    const maxY = Math.min(height - 2, Math.max(y1, y2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        grid[y][x] = 0;
      }
    }
  };

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

  // 2. Carve Major Combat Arenas & Chambers
  // North Boss Colosseum (X: 9..18, Y: 2..7) - 10x6 open sanctum
  clearArea(9, 2, 18, 7);
  setWall(11, 4, theme.wallAccent);
  setWall(16, 4, theme.wallAccent);

  // Central Rotunda Hub (X: 9..18, Y: 11..17) - 10x7 open plaza
  clearArea(9, 11, 18, 17);
  setWall(11, 13, theme.wallAccent);
  setWall(16, 13, theme.wallAccent);
  setWall(11, 15, theme.wallAccent);
  setWall(16, 15, theme.wallAccent);

  // North-West Arena (Sector 1) (X: 2..7, Y: 2..7) - 6x6 room
  clearArea(2, 2, 7, 7);
  setWall(4, 4, theme.wallAccent);

  // North-East Arena (Sector 2) (X: 20..25, Y: 2..7) - 6x6 room
  clearArea(20, 2, 25, 7);
  setWall(23, 4, theme.wallAccent);

  // West Mid-Wing Chamber (Sector 4) (X: 2..7, Y: 9..13)
  clearArea(2, 9, 7, 13);
  setWall(5, 11, theme.wallAccent);

  // East Mid-Wing Chamber (Sector 5) (X: 20..25, Y: 9..13)
  clearArea(20, 9, 25, 13);
  setWall(22, 11, theme.wallAccent);

  // South-West Arena (Sector 7) (X: 2..7, Y: 15..20) - 6x6 room
  clearArea(2, 15, 7, 20);
  setWall(4, 18, theme.wallAccent);

  // South-East Arena (Sector 8) (X: 20..25, Y: 15..20) - 6x6 room
  clearArea(20, 15, 25, 20);
  setWall(23, 18, theme.wallAccent);

  // 3. Carve Interconnecting Braided Corridors (Wide 2-tile thoroughfares)
  // Outer perimeter loop highways (ensuring rapid cross-map flanking)
  clearArea(2, 2, 25, 2);   // North outer corridor
  clearArea(2, 21, 25, 21); // South outer corridor
  clearArea(2, 2, 2, 21);   // West outer corridor
  clearArea(25, 2, 25, 21); // East outer corridor

  // Cardinal Spines & Avenues
  clearArea(13, 7, 14, 11);   // North Spine (Boss Colosseum to Central Rotunda)
  clearArea(13, 17, 14, 23); // South Spine (Central Rotunda to Bunker Egress)
  clearArea(7, 13, 9, 14);   // West Avenue (West wing to Central Rotunda)
  clearArea(18, 13, 20, 14); // East Avenue (East wing to Central Rotunda)

  // Direct Upper Inter-Chamber Links
  clearArea(7, 4, 9, 5);    // NW chamber to Boss Colosseum
  clearArea(18, 4, 20, 5);  // Boss Colosseum to NE chamber

  // Mid-wing corridor bypasses
  clearArea(4, 7, 5, 15);   // West N-S connector
  clearArea(22, 7, 23, 15); // East N-S connector

  // Lower Inter-Chamber Links
  clearArea(7, 17, 9, 18);   // SW chamber to South Spine
  clearArea(18, 17, 20, 18); // South Spine to SE chamber

  // Outer Perimeter Boundary Walls
  for (let x = 0; x < width; x++) {
    grid[0][x] = theme.wallMain;
    grid[height - 1][x] = theme.wallMain;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = theme.wallMain;
    grid[y][width - 1] = theme.wallMain;
  }

  // 4. Mathematical Zero Dead Ends Pass (Braided Maze Guarantee)
  removeAllDeadEnds(grid, width, height);

  // 5. Build Safe Staging Bunker at South (X: 10..17, Y: 23..27)
  buildSafeStagingBunker(grid, theme.wallMain, theme.doorTex);

  return { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox, clearArea };
}

// -------------------------------------------------------------
// HIGH-DISPERSION BALANCED DEMONIC SPAWN NODES ACROSS ALL 12 SECTORS
// (Strict exclusion: Zero enemies in the South Airlock Safe Zone X: 10..17, Y >= 20.5)
// -------------------------------------------------------------
interface EnemySpawnDef {
  x: number;
  y: number;
  angle?: number;
  sectorName: string;
  territoryRadius?: number;
  types: [Enemy['type'], Enemy['type'], Enemy['type'], Enemy['type']]; // S1, S2, S3, S4
  elites?: number[]; // stage numbers where this enemy is elite
}

const ENEMY_SPAWN_NODES: EnemySpawnDef[] = [
  // --- Sector 1: North-West Arena (X: 2..7, Y: 2..7) ---
  { x: 3.5, y: 3.5, angle: Math.PI / 4, sectorName: 'NW Arena', territoryRadius: 5.5, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 6.0, y: 6.0, angle: -Math.PI / 4, sectorName: 'NW Arena', territoryRadius: 5.5, types: ['scuttler', 'scuttler', 'scuttler', 'plasma_gunner'] },
  { x: 2.5, y: 6.5, angle: 0, sectorName: 'NW Arena', territoryRadius: 5.5, types: ['grunt', 'scuttler', 'imp', 'baron'], elites: [4] },
  { x: 6.5, y: 2.5, angle: Math.PI / 2, sectorName: 'NW Arena', territoryRadius: 5.5, types: ['imp', 'imp', 'plasma_gunner', 'baron'] },

  // --- Sector 2: North-East Arena (X: 20..25, Y: 2..7) ---
  { x: 23.5, y: 3.5, angle: 3 * Math.PI / 4, sectorName: 'NE Arena', territoryRadius: 5.5, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 21.0, y: 6.0, angle: Math.PI, sectorName: 'NE Arena', territoryRadius: 5.5, types: ['scuttler', 'scuttler', 'vile_spitter', 'baron'], elites: [3, 4] },
  { x: 24.5, y: 6.5, angle: -Math.PI / 2, sectorName: 'NE Arena', territoryRadius: 5.5, types: ['grunt', 'plasma_gunner', 'baron', 'baron'], elites: [4] },
  { x: 21.5, y: 2.5, angle: -3 * Math.PI / 4, sectorName: 'NE Arena', territoryRadius: 5.5, types: ['imp', 'vile_spitter', 'plasma_gunner', 'baron'] },

  // --- Sector 3: North Colosseum Sanctum (X: 9..18, Y: 2..7) ---
  { x: 10.5, y: 3.5, angle: 0, sectorName: 'North Colosseum', territoryRadius: 6.5, types: ['imp', 'vile_spitter', 'plasma_gunner', 'baron'], elites: [3, 4] },
  { x: 16.5, y: 3.5, angle: Math.PI, sectorName: 'North Colosseum', territoryRadius: 6.5, types: ['grunt', 'plasma_gunner', 'plasma_gunner', 'baron'], elites: [3, 4] },
  { x: 13.5, y: 5.5, angle: Math.PI / 2, sectorName: 'North Colosseum', territoryRadius: 6.5, types: ['imp', 'imp', 'imp', 'plasma_gunner'] },
  { x: 12.0, y: 2.5, angle: 0, sectorName: 'North Colosseum', territoryRadius: 6.5, types: ['grunt', 'plasma_gunner', 'baron', 'baron'] },
  { x: 15.0, y: 2.5, angle: Math.PI, sectorName: 'North Colosseum', territoryRadius: 6.5, types: ['scuttler', 'scuttler', 'vile_spitter', 'baron'] },

  // --- Sector 4: West Mid-Wing Chamber (X: 2..7, Y: 9..13) ---
  { x: 3.5, y: 9.5, angle: Math.PI / 2, sectorName: 'West Mid-Wing', territoryRadius: 5.0, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 6.5, y: 11.5, angle: 0, sectorName: 'West Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 3.5, y: 12.5, angle: -Math.PI / 2, sectorName: 'West Mid-Wing', territoryRadius: 5.0, types: ['imp', 'vile_spitter', 'baron', 'baron'], elites: [2, 3, 4] },
  { x: 2.5, y: 10.5, angle: 0, sectorName: 'West Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'plasma_gunner', 'plasma_gunner', 'baron'] },

  // --- Sector 5: East Mid-Wing Chamber (X: 20..25, Y: 9..13) ---
  { x: 24.5, y: 9.5, angle: -Math.PI / 2, sectorName: 'East Mid-Wing', territoryRadius: 5.0, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 21.5, y: 11.5, angle: Math.PI, sectorName: 'East Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 24.5, y: 12.5, angle: Math.PI / 2, sectorName: 'East Mid-Wing', territoryRadius: 5.0, types: ['imp', 'vile_spitter', 'baron', 'baron'], elites: [2, 3, 4] },
  { x: 25.5, y: 10.5, angle: Math.PI, sectorName: 'East Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'plasma_gunner', 'plasma_gunner', 'baron'] },

  // --- Sector 6: Central Rotunda Hub Plaza (X: 9..18, Y: 11..17) ---
  { x: 10.5, y: 12.5, angle: Math.PI / 4, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 16.5, y: 12.5, angle: 3 * Math.PI / 4, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['grunt', 'scuttler', 'scuttler', 'plasma_gunner'] },
  { x: 10.5, y: 15.5, angle: -Math.PI / 4, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 16.5, y: 15.5, angle: -3 * Math.PI / 4, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['imp', 'vile_spitter', 'baron', 'baron'], elites: [3, 4] },
  { x: 13.5, y: 12.0, angle: -Math.PI / 2, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['grunt', 'plasma_gunner', 'plasma_gunner', 'baron'] },
  { x: 13.5, y: 16.0, angle: Math.PI / 2, sectorName: 'Central Rotunda', territoryRadius: 6.0, types: ['imp', 'imp', 'vile_spitter', 'baron'] },

  // --- Sector 7: South-West Arena (X: 2..7, Y: 15..20) ---
  { x: 3.5, y: 16.5, angle: Math.PI / 4, sectorName: 'SW Arena', territoryRadius: 5.5, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 6.5, y: 19.5, angle: -Math.PI / 4, sectorName: 'SW Arena', territoryRadius: 5.5, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 2.5, y: 19.5, angle: Math.PI / 2, sectorName: 'SW Arena', territoryRadius: 5.5, types: ['imp', 'vile_spitter', 'baron', 'baron'], elites: [2, 3, 4] },
  { x: 5.5, y: 16.0, angle: 0, sectorName: 'SW Arena', territoryRadius: 5.5, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },

  // --- Sector 8: South-East Arena (X: 20..25, Y: 15..20) ---
  { x: 23.5, y: 16.5, angle: 3 * Math.PI / 4, sectorName: 'SE Arena', territoryRadius: 5.5, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 21.5, y: 19.5, angle: -3 * Math.PI / 4, sectorName: 'SE Arena', territoryRadius: 5.5, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 24.5, y: 19.5, angle: -Math.PI / 2, sectorName: 'SE Arena', territoryRadius: 5.5, types: ['imp', 'vile_spitter', 'baron', 'baron'], elites: [2, 3, 4] },
  { x: 21.5, y: 16.0, angle: Math.PI, sectorName: 'SE Arena', territoryRadius: 5.5, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },

  // --- Sector 9: Outer Perimeter Highways & Corridor Flanks ---
  { x: 13.5, y: 4.0, angle: 0, sectorName: 'North Colosseum', territoryRadius: 6.0, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  { x: 4.5, y: 21.5, angle: 0, sectorName: 'SW Outer Flank', territoryRadius: 5.0, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 22.5, y: 21.5, angle: Math.PI, sectorName: 'SE Outer Flank', territoryRadius: 5.0, types: ['scuttler', 'scuttler', 'scuttler', 'scuttler'] },
  { x: 2.5, y: 8.0, angle: Math.PI / 2, sectorName: 'West Outer Loop', territoryRadius: 5.0, types: ['grunt', 'plasma_gunner', 'vile_spitter', 'baron'], elites: [4] },
  { x: 25.5, y: 8.0, angle: -Math.PI / 2, sectorName: 'East Outer Loop', territoryRadius: 5.0, types: ['grunt', 'plasma_gunner', 'vile_spitter', 'baron'], elites: [4] },
  { x: 13.5, y: 8.5, angle: -Math.PI / 2, sectorName: 'North Spine', territoryRadius: 5.0, types: ['imp', 'imp', 'plasma_gunner', 'baron'] },
  { x: 13.5, y: 18.5, angle: Math.PI / 2, sectorName: 'South Spine', territoryRadius: 5.0, types: ['grunt', 'grunt', 'imp', 'plasma_gunner'] },
  // Additional tactical nodes for deep patrol coverage & balanced density
  { x: 4.5, y: 5.0, angle: 0, sectorName: 'NW Arena', territoryRadius: 5.0, types: ['grunt', 'scuttler', 'imp', 'plasma_gunner'] },
  { x: 22.5, y: 5.0, angle: Math.PI, sectorName: 'NE Arena', territoryRadius: 5.0, types: ['grunt', 'scuttler', 'imp', 'plasma_gunner'] },
  { x: 11.0, y: 5.0, angle: Math.PI / 4, sectorName: 'North Colosseum', territoryRadius: 6.0, types: ['imp', 'vile_spitter', 'plasma_gunner', 'baron'] },
  { x: 16.0, y: 5.0, angle: 3 * Math.PI / 4, sectorName: 'North Colosseum', territoryRadius: 6.0, types: ['imp', 'vile_spitter', 'plasma_gunner', 'baron'] },
  { x: 5.0, y: 11.0, angle: -Math.PI / 2, sectorName: 'West Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'imp', 'vile_spitter', 'baron'] },
  { x: 22.0, y: 11.0, angle: Math.PI / 2, sectorName: 'East Mid-Wing', territoryRadius: 5.0, types: ['grunt', 'imp', 'vile_spitter', 'baron'] },
  { x: 11.5, y: 14.0, angle: 0, sectorName: 'Central Rotunda', territoryRadius: 5.5, types: ['scuttler', 'imp', 'plasma_gunner', 'baron'] },
  { x: 15.5, y: 14.0, angle: Math.PI, sectorName: 'Central Rotunda', territoryRadius: 5.5, types: ['scuttler', 'imp', 'plasma_gunner', 'baron'] },
  { x: 4.5, y: 18.0, angle: Math.PI / 4, sectorName: 'SW Arena', territoryRadius: 5.0, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },
  { x: 22.5, y: 18.0, angle: 3 * Math.PI / 4, sectorName: 'SE Arena', territoryRadius: 5.0, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },
  { x: 8.5, y: 5.5, angle: 0, sectorName: 'NW Corridor Link', territoryRadius: 4.5, types: ['scuttler', 'scuttler', 'imp', 'plasma_gunner'] },
  { x: 18.5, y: 5.5, angle: Math.PI, sectorName: 'NE Corridor Link', territoryRadius: 4.5, types: ['scuttler', 'scuttler', 'imp', 'plasma_gunner'] },
  { x: 8.5, y: 14.5, angle: 0, sectorName: 'West Corridor Link', territoryRadius: 4.5, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },
  { x: 18.5, y: 14.5, angle: Math.PI, sectorName: 'East Corridor Link', territoryRadius: 4.5, types: ['grunt', 'imp', 'plasma_gunner', 'baron'] },
  { x: 2.5, y: 14.0, angle: Math.PI / 2, sectorName: 'West Outer Highway', territoryRadius: 5.0, types: ['scuttler', 'grunt', 'vile_spitter', 'baron'] },
  { x: 25.5, y: 14.0, angle: -Math.PI / 2, sectorName: 'East Outer Highway', territoryRadius: 5.0, types: ['scuttler', 'grunt', 'vile_spitter', 'baron'] },
];

export function buildStageEnemies(stage: number): Enemy[] {
  const stageIdx = Math.max(0, Math.min(3, stage - 1));
  const countPerStage = [36, 42, 48, 54];
  const targetCount = countPerStage[stageIdx] || 36;

  // Strict Airlock Buffer Zone Filter:
  // Central airlock buffer: X: 10..17, Y >= 20.5 (keeps the south entry corridor 100% safe)
  const isInsideSafeZone = (x: number, y: number): boolean => {
    return x >= 10.0 && x <= 17.0 && y >= 20.5;
  };

  const enemies: Enemy[] = [];
  let enemyId = 1;

  for (let i = 0; i < ENEMY_SPAWN_NODES.length && enemies.length < targetCount; i++) {
    const node = ENEMY_SPAWN_NODES[i];
    if (isInsideSafeZone(node.x, node.y)) continue;

    const enemyType = node.types[stageIdx] || 'grunt';
    const isElite = node.elites ? node.elites.includes(stage) : false;

    // Base attributes per enemy archetype
    let maxHealth = 70;
    let speed = 2.4;
    let radius = 0.35;
    let attackCooldown = 1.2;

    if (enemyType === 'grunt') {
      maxHealth = 60;
      speed = 2.4;
      radius = 0.32;
      attackCooldown = 1.1;
    } else if (enemyType === 'imp') {
      maxHealth = 100;
      speed = 2.1;
      radius = 0.36;
      attackCooldown = 1.5;
    } else if (enemyType === 'scuttler') {
      maxHealth = 45;
      speed = 3.6;
      radius = 0.28;
      attackCooldown = 0.7;
    } else if (enemyType === 'plasma_gunner') {
      maxHealth = 140;
      speed = 2.3;
      radius = 0.38;
      attackCooldown = 1.3;
    } else if (enemyType === 'vile_spitter') {
      maxHealth = 220;
      speed = 1.6;
      radius = 0.44;
      attackCooldown = 2.4;
    } else if (enemyType === 'baron') {
      maxHealth = 480;
      speed = 1.75;
      radius = 0.50;
      attackCooldown = 1.8;
    }

    if (isElite) {
      maxHealth = Math.round(maxHealth * 1.5);
      speed *= 1.15;
    }

    enemies.push({
      id: enemyId++,
      x: node.x,
      y: node.y,
      z: 0,
      vx: 0,
      vy: 0,
      angle: node.angle || 0,
      type: enemyType,
      health: maxHealth,
      maxHealth,
      speed,
      radius,
      state: 'idle',
      stateTimer: 2.0 + (i % 3) * 1.2,
      attackCooldown: attackCooldown + (i % 2) * 0.4,
      isElite,
      animFrame: 0,
      spawnOrigin: { x: node.x, y: node.y },
      homePost: { x: node.x, y: node.y },
      sectorName: node.sectorName,
      territoryRadius: node.territoryRadius || 5.5,
      guardAngle: node.angle || 0,
    });
  }

  return enemies;
}

// -------------------------------------------------------------
// STAGE 1: SUBTERRANEAN LABYRINTH
// -------------------------------------------------------------
export function createStage1Map(): MapData {
  const theme: MazeTheme = {
    wallMain: 1,   // Industrial Concrete
    wallAccent: 3, // Corrugated Steel
    doorTex: 7,    // Bulkhead Door
    floor: 0,      // Steel Deck Plate
    ceil: 0,       // Industrial Duct Ceiling
  };

  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox, clearArea } = buildBraidedMazeBase(theme);

  // --- 3 PROPERLY CONSTRUCTED & FULLY SEALED SECRET VAULTS ---
  // Secret 1: West Tactical Armory (Inside room: X: 1..2, Y: 10..12)
  clearArea(1, 10, 2, 12);
  fillBox(0, 9, 3, 9, theme.wallMain);      // North sealed wall
  fillBox(0, 13, 3, 13, theme.wallMain);    // South sealed wall
  setWall(3, 10, theme.wallAccent);         // East wall upper
  setWall(3, 12, theme.wallAccent);         // East wall lower
  setWall(3, 11, theme.doorTex);            // Reinforced Secret Door at (3, 11)

  // Secret 2: East Heavy Chaingun Cache (Inside room: X: 25..26, Y: 10..12)
  clearArea(25, 10, 26, 12);
  fillBox(24, 9, 27, 9, theme.wallMain);    // North sealed wall
  fillBox(24, 13, 27, 13, theme.wallMain);  // South sealed wall
  setWall(24, 10, theme.wallAccent);        // West wall upper
  setWall(24, 12, theme.wallAccent);        // West wall lower
  setWall(24, 11, theme.doorTex);           // Reinforced Secret Door at (24, 11)

  // Secret 3: North Colosseum Sanctum Reliquary (Inside room: X: 13..14, Y: 1)
  clearArea(13, 1, 14, 1);
  fillBox(12, 0, 15, 0, theme.wallMain);    // North perimeter wall
  fillBox(12, 1, 12, 2, theme.wallAccent);  // West sealed flank
  fillBox(15, 1, 15, 2, theme.wallAccent);  // East sealed flank
  setWall(14, 2, theme.wallAccent);         // South sealed wall
  setWall(13, 2, theme.doorTex);            // Reinforced Secret Door at (13, 2)

  const secrets: SecretArea[] = [
    {
      id: 101,
      name: 'WEST TACTICAL ARMORY',
      triggerX: 4,
      triggerY: 11,
      doorX: 3,
      doorY: 11,
      revealed: false,
      rewardDescription: 'TACTICAL PUMP SHOTGUN & 12-GAUGE MAGNUM SHELLS',
    },
    {
      id: 102,
      name: 'EAST HEAVY ORDNANCE CACHE',
      triggerX: 23,
      triggerY: 11,
      doorX: 24,
      doorY: 11,
      revealed: false,
      rewardDescription: 'BERSERK SPHERE & BALLISTIC AMMO CACHE',
    },
    {
      id: 103,
      name: 'NORTH COLOSSEUM SANCTUM RELIQUARY',
      triggerX: 13,
      triggerY: 3,
      doorX: 13,
      doorY: 2,
      revealed: false,
      rewardDescription: 'CHRONO-HASTE RELIC & SUPER ARMOR',
    },
  ];

  // Pickups spread across chambers & corridors (strictly on open floor outside secret vaults)
  const pickups: PickupItem[] = [
    // Starting Safe Bunker & Egress
    { id: 1, x: 12.5, y: 25.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 14.5, y: 25.5, type: 'ammo_bullets', collected: false, bobPhase: 0.5 },
    { id: 3, x: 13.5, y: 24.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 13.5, y: 21.5, type: 'ammo_bullets', collected: false, bobPhase: 1.5 },
    // Outer Highway Loops (placed in open corridor clearings outside secret rooms)
    { id: 5, x: 2.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 0.2 },
    { id: 6, x: 25.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 0.7 },
    { id: 7, x: 2.5, y: 4.5, type: 'ammo_bullets', collected: false, bobPhase: 1.2 },
    { id: 8, x: 25.5, y: 4.5, type: 'ammo_shells', collected: false, bobPhase: 1.7 },
    { id: 17, x: 2.5, y: 16.5, type: 'medkit_small', collected: false, bobPhase: 2.1 },
    { id: 18, x: 25.5, y: 16.5, type: 'ammo_bullets', collected: false, bobPhase: 2.4 },
    // Chamber Complexes
    { id: 9, x: 5.5, y: 5.5, type: 'ammo_shells', collected: false, bobPhase: 0.3 },
    { id: 10, x: 22.5, y: 5.5, type: 'ammo_bullets', collected: false, bobPhase: 0.8 },
    { id: 11, x: 5.5, y: 18.5, type: 'armor_small', collected: false, bobPhase: 1.3 },
    { id: 12, x: 22.5, y: 18.5, type: 'medkit_small', collected: false, bobPhase: 1.8 },
    { id: 13, x: 13.5, y: 14.5, type: 'armor_large', collected: false, bobPhase: 2.2 },
    { id: 14, x: 14.5, y: 13.5, type: 'medkit_large', collected: false, bobPhase: 2.6 },
    // North Colosseum Boss Approaches
    { id: 15, x: 13.5, y: 6.5, type: 'ammo_shells', collected: false, bobPhase: 0.4 },
    { id: 16, x: 13.5, y: 4.5, type: 'medkit_large', collected: false, bobPhase: 0.9 },
    // Secret 1 Loot (strictly inside sealed secret room X: 1..2, Y: 10..12 behind door at 3,11) - ONLY WEAPON IN LEVEL 1: SHOTGUN
    { id: 101, x: 1.5, y: 11.0, type: 'weapon_shotgun', collected: false, bobPhase: 0.2 },
    { id: 102, x: 1.5, y: 10.3, type: 'ammo_shells', collected: false, bobPhase: 0.7 },
    { id: 105, x: 1.5, y: 11.7, type: 'infinite_dash_relic', collected: false, bobPhase: 1.2 },
    // Secret 2 Loot (strictly inside sealed secret room X: 25..26, Y: 10..12 behind door at 24,11) - ARMOR & BERSERK (NO SECOND WEAPON)
    { id: 103, x: 25.5, y: 11.0, type: 'armor_large', collected: false, bobPhase: 1.2 },
    { id: 104, x: 25.5, y: 10.3, type: 'ammo_bullets', collected: false, bobPhase: 1.7 },
    { id: 106, x: 25.5, y: 11.7, type: 'berserk_sphere', collected: false, bobPhase: 2.2 },
    // Secret 3 Loot (strictly inside sealed secret room X: 13..14, Y: 1 behind door at 13,2)
    { id: 107, x: 13.5, y: 1.2, type: 'armor_large', collected: false, bobPhase: 0.5 },
    { id: 108, x: 14.5, y: 1.2, type: 'infinite_dash_relic', collected: false, bobPhase: 1.8 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 3.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'REINFORCED STEEL ARMOR', lootAmount: 40 },
    { id: 2, x: 24.5, y: 18.5, opened: false, lootType: 'ammo_bullets', lootName: 'BALLISTIC MUNITIONS CASE', lootAmount: 60 },
    { id: 3, x: 3.5, y: 3.5, opened: false, lootType: 'medkit_large', lootName: 'SURGICAL TRAUMA PACK', lootAmount: 50 },
    { id: 4, x: 24.5, y: 3.5, opened: false, lootType: 'ammo_shells', lootName: '12-GAUGE SHOTGUN CRATE', lootAmount: 20 },
    { id: 5, x: 13.5, y: 12.5, opened: false, lootType: 'ammo_bullets', lootName: 'CALIBER AMMO CACHE', lootAmount: 40 },
  ];

  const enemies = buildStageEnemies(1);

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 13.5, y: 25.5, angle: -Math.PI / 2 },
    neutralZone: { minY: 23.0, maxY: 27.5, minX: 10.0, maxX: 17.0 },
    airlockDoors: [
      { x: 13, y: 23, animOffset: 0, sealed: false },
      { x: 14, y: 23, animOffset: 0, sealed: false },
    ],
    airlockConsole: { x: 13.5, y: 23.8, triggered: false },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 13.5, y: 4.5 },
    stageNumber: 1,
    stageName: 'SUBTERRANEAN LABYRINTH',
    exitPos: { x: 13.5, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 2: TOXIC REFINERY & CATACOMBS
// -------------------------------------------------------------
export function createStage2Map(): MapData {
  const theme: MazeTheme = {
    wallMain: 5,   // Hazard Stripes
    wallAccent: 3, // Corrugated Steel
    doorTex: 7,    // Bulkhead Door
    floor: 3,      // Grated Toxic Mesh floor
    ceil: 0,
  };

  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox, clearArea } = buildBraidedMazeBase(theme);

  // --- 3 PROPERLY CONSTRUCTED & FULLY SEALED SECRET BIO-VAULTS ---
  // Secret 1: West Bio-Weapons Vault (Inside room: X: 1..2, Y: 10..12)
  clearArea(1, 10, 2, 12);
  fillBox(0, 9, 3, 9, theme.wallMain);      // North sealed wall
  fillBox(0, 13, 3, 13, theme.wallMain);    // South sealed wall
  setWall(3, 10, theme.wallAccent);         // East wall upper
  setWall(3, 12, theme.wallAccent);         // East wall lower
  setWall(3, 11, theme.doorTex);            // Reinforced Secret Door at (3, 11)

  // Secret 2: East High-Voltage Plasma Condenser (Inside room: X: 25..26, Y: 10..12)
  clearArea(25, 10, 26, 12);
  fillBox(24, 9, 27, 9, theme.wallMain);    // North sealed wall
  fillBox(24, 13, 27, 13, theme.wallMain);  // South sealed wall
  setWall(24, 10, theme.wallAccent);        // West wall upper
  setWall(24, 12, theme.wallAccent);        // West wall lower
  setWall(24, 11, theme.doorTex);           // Reinforced Secret Door at (24, 11)

  // Secret 3: North Colosseum Hazmat Stash (Inside room: X: 13..14, Y: 1)
  clearArea(13, 1, 14, 1);
  fillBox(12, 0, 15, 0, theme.wallMain);    // North perimeter wall
  fillBox(12, 1, 12, 2, theme.wallAccent);  // West sealed flank
  fillBox(15, 1, 15, 2, theme.wallAccent);  // East sealed flank
  setWall(14, 2, theme.wallAccent);         // South sealed wall
  setWall(13, 2, theme.doorTex);            // Reinforced Secret Door at (13, 2)

  const secrets: SecretArea[] = [
    {
      id: 201,
      name: 'CLASSIFIED CHEMICAL WEAPONS LAB',
      triggerX: 4,
      triggerY: 11,
      doorX: 3,
      doorY: 11,
      revealed: false,
      rewardDescription: 'BERSERK SPHERE & BIO-PLATING ARMOR',
    },
    {
      id: 202,
      name: 'EAST HEAVY CHAINGUN CACHE',
      triggerX: 23,
      triggerY: 11,
      doorX: 24,
      doorY: 11,
      revealed: false,
      rewardDescription: 'HEAVY ROTARY CHAINGUN & DRUM AMMO',
    },
    {
      id: 203,
      name: 'HAZMAT CONTAINMENT ARSENAL',
      triggerX: 13,
      triggerY: 3,
      doorX: 13,
      doorY: 2,
      revealed: false,
      rewardDescription: 'CHRONO-HASTE RELIC & BIO-PLATING ARMOR',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 12.5, y: 25.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 14.5, y: 25.5, type: 'ammo_bullets', collected: false, bobPhase: 0.5 },
    { id: 3, x: 13.5, y: 24.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 25.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 2.5, y: 4.5, type: 'ammo_shells', collected: false, bobPhase: 0.4 },
    { id: 7, x: 25.5, y: 4.5, type: 'ammo_cells', collected: false, bobPhase: 0.9 },
    { id: 8, x: 13.5, y: 14.5, type: 'berserk_sphere', collected: false, bobPhase: 2.3 },
    { id: 9, x: 14.5, y: 4.5, type: 'medkit_large', collected: false, bobPhase: 0.7 },
    { id: 10, x: 12.5, y: 4.5, type: 'armor_large', collected: false, bobPhase: 1.2 },
    // Secret 1 Loot (strictly inside sealed secret room X: 1..2, Y: 10..12 behind door at 3,11) - ARMOR & BERSERK
    { id: 201, x: 1.5, y: 11.0, type: 'armor_large', collected: false, bobPhase: 0.2 },
    { id: 202, x: 1.5, y: 10.3, type: 'ammo_shells', collected: false, bobPhase: 0.7 },
    { id: 205, x: 1.5, y: 11.7, type: 'berserk_sphere', collected: false, bobPhase: 1.3 },
    // Secret 2 Loot (strictly inside sealed secret room X: 25..26, Y: 10..12 behind door at 24,11) - ONLY WEAPON IN LEVEL 2: CHAINGUN
    { id: 203, x: 25.5, y: 11.0, type: 'weapon_chaingun', collected: false, bobPhase: 1.2 },
    { id: 204, x: 25.5, y: 10.3, type: 'ammo_belts', collected: false, bobPhase: 1.7 },
    { id: 206, x: 25.5, y: 11.7, type: 'infinite_dash_relic', collected: false, bobPhase: 2.2 },
    // Secret 3 Loot (strictly inside sealed secret room X: 13..14, Y: 1 behind door at 13,2)
    { id: 207, x: 13.5, y: 1.2, type: 'armor_large', collected: false, bobPhase: 0.5 },
    { id: 208, x: 14.5, y: 1.2, type: 'infinite_dash_relic', collected: false, bobPhase: 1.5 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 3.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'CHEMICAL HAZMAT VEST', lootAmount: 50 },
    { id: 2, x: 24.5, y: 18.5, opened: false, lootType: 'ammo_cells', lootName: 'HIGH DENSITY CELLS', lootAmount: 60 },
    { id: 3, x: 3.5, y: 3.5, opened: false, lootType: 'medkit_large', lootName: 'DECONTAMINATION MEDKIT', lootAmount: 60 },
    { id: 4, x: 24.5, y: 3.5, opened: false, lootType: 'ammo_shells', lootName: 'MAGNUM SHELL CRATE', lootAmount: 24 },
    { id: 5, x: 13.5, y: 13.5, opened: false, lootType: 'ammo_cells', lootName: 'ION ENERGY CELLS', lootAmount: 50 },
  ];

  const enemies = buildStageEnemies(2);

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 13.5, y: 25.5, angle: -Math.PI / 2 },
    neutralZone: { minY: 23.0, maxY: 27.5, minX: 10.0, maxX: 17.0 },
    airlockDoors: [
      { x: 13, y: 23, animOffset: 0, sealed: false },
      { x: 14, y: 23, animOffset: 0, sealed: false },
    ],
    airlockConsole: { x: 13.5, y: 23.8, triggered: false },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 13.5, y: 4.5 },
    stageNumber: 2,
    stageName: 'TOXIC REFINERY & CATACOMBS',
    exitPos: { x: 13.5, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 3: HELLGATE CITADEL
// -------------------------------------------------------------
export function createStage3Map(): MapData {
  const theme: MazeTheme = {
    wallMain: 2,   // Hell Obsidian Brick
    wallAccent: 6, // Demonic Gargoyle Wall
    doorTex: 7,    // Bulkhead Door
    floor: 1,      // Hellstone Lava Rock
    ceil: 1,       // Crimson Hellfire Sky
  };

  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox, clearArea } = buildBraidedMazeBase(theme);

  // --- 3 PROPERLY CONSTRUCTED & FULLY SEALED SECRET RELIQUARY VAULTS ---
  // Secret 1: West Infernal Armory (Inside room: X: 1..2, Y: 10..12)
  clearArea(1, 10, 2, 12);
  fillBox(0, 9, 3, 9, theme.wallMain);      // North sealed wall
  fillBox(0, 13, 3, 13, theme.wallMain);    // South sealed wall
  setWall(3, 10, theme.wallAccent);         // East wall upper
  setWall(3, 12, theme.wallAccent);         // East wall lower
  setWall(3, 11, theme.doorTex);            // Reinforced Secret Door at (3, 11)

  // Secret 2: East Demon Lord Forge (Inside room: X: 25..26, Y: 10..12)
  clearArea(25, 10, 26, 12);
  fillBox(24, 9, 27, 9, theme.wallMain);    // North sealed wall
  fillBox(24, 13, 27, 13, theme.wallMain);  // South sealed wall
  setWall(24, 10, theme.wallAccent);        // West wall upper
  setWall(24, 12, theme.wallAccent);        // West wall lower
  setWall(24, 11, theme.doorTex);           // Reinforced Secret Door at (24, 11)

  // Secret 3: North Colosseum Brimstone Relic (Inside room: X: 13..14, Y: 1)
  clearArea(13, 1, 14, 1);
  fillBox(12, 0, 15, 0, theme.wallMain);    // North perimeter wall
  fillBox(12, 1, 12, 2, theme.wallAccent);  // West sealed flank
  fillBox(15, 1, 15, 2, theme.wallAccent);  // East sealed flank
  setWall(14, 2, theme.wallAccent);         // South sealed wall
  setWall(13, 2, theme.doorTex);            // Reinforced Secret Door at (13, 2)

  const secrets: SecretArea[] = [
    {
      id: 301,
      name: 'SACRED INFERNAL VAULT',
      triggerX: 4,
      triggerY: 11,
      doorX: 3,
      doorY: 11,
      revealed: false,
      rewardDescription: 'BERSERK SPHERE & INFERNAL DEMON ARMOR',
    },
    {
      id: 302,
      name: 'DEMON LORD FORGE',
      triggerX: 23,
      triggerY: 11,
      doorX: 24,
      doorY: 11,
      revealed: false,
      rewardDescription: 'PLASMA RIFLE & OVERCHARGED PLASMA CORE',
    },
    {
      id: 303,
      name: 'BRIMSTONE ARCH-DEVIL RELIQUARY',
      triggerX: 13,
      triggerY: 3,
      doorX: 13,
      doorY: 2,
      revealed: false,
      rewardDescription: 'INFINITE DASH RELIC & BLOODSTONE SUPER ARMOR',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 12.5, y: 25.5, type: 'medkit_small', collected: false, bobPhase: 0 },
    { id: 2, x: 14.5, y: 25.5, type: 'ammo_shells', collected: false, bobPhase: 0.5 },
    { id: 3, x: 13.5, y: 24.5, type: 'armor_small', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 25.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 13.5, y: 14.5, type: 'berserk_sphere', collected: false, bobPhase: 0.3 },
    { id: 7, x: 14.5, y: 4.5, type: 'medkit_large', collected: false, bobPhase: 0.8 },
    { id: 8, x: 12.5, y: 4.5, type: 'armor_large', collected: false, bobPhase: 1.3 },
    // Secret 1 Loot (strictly inside sealed secret room X: 1..2, Y: 10..12 behind door at 3,11) - ARMOR & BERSERK
    { id: 301, x: 1.5, y: 11.0, type: 'armor_large', collected: false, bobPhase: 0.2 },
    { id: 302, x: 1.5, y: 10.3, type: 'ammo_shells', collected: false, bobPhase: 0.7 },
    { id: 305, x: 1.5, y: 11.7, type: 'berserk_sphere', collected: false, bobPhase: 1.4 },
    // Secret 2 Loot (strictly inside sealed secret room X: 25..26, Y: 10..12 behind door at 24,11) - ONLY WEAPON IN LEVEL 3: PLASMA RIFLE
    { id: 303, x: 25.5, y: 11.0, type: 'weapon_plasma', collected: false, bobPhase: 1.2 },
    { id: 304, x: 25.5, y: 10.3, type: 'ammo_cells', collected: false, bobPhase: 1.7 },
    { id: 306, x: 25.5, y: 11.7, type: 'infinite_dash_relic', collected: false, bobPhase: 2.3 },
    // Secret 3 Loot (strictly inside sealed secret room X: 13..14, Y: 1 behind door at 13,2)
    { id: 307, x: 13.5, y: 1.2, type: 'armor_large', collected: false, bobPhase: 0.6 },
    { id: 308, x: 14.5, y: 1.2, type: 'infinite_dash_relic', collected: false, bobPhase: 1.9 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 3.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'BLOODSTONE DEMON ARMOR', lootAmount: 50 },
    { id: 2, x: 24.5, y: 18.5, opened: false, lootType: 'ammo_cells', lootName: 'OVERCHARGED PLASMA CELLS', lootAmount: 60 },
    { id: 3, x: 3.5, y: 3.5, opened: false, lootType: 'medkit_large', lootName: 'SOUL REJUVENATION MEDKIT', lootAmount: 60 },
    { id: 4, x: 24.5, y: 3.5, opened: false, lootType: 'ammo_shells', lootName: 'INFERNAL SLUG BOX', lootAmount: 24 },
    { id: 5, x: 13.5, y: 13.5, opened: false, lootType: 'armor_large', lootName: 'HEAVY TITANIUM PLATING', lootAmount: 50 },
  ];

  const enemies = buildStageEnemies(3);

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 13.5, y: 25.5, angle: -Math.PI / 2 },
    neutralZone: { minY: 23.0, maxY: 27.5, minX: 10.0, maxX: 17.0 },
    airlockDoors: [
      { x: 13, y: 23, animOffset: 0, sealed: false },
      { x: 14, y: 23, animOffset: 0, sealed: false },
    ],
    airlockConsole: { x: 13.5, y: 23.8, triggered: false },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 13.5, y: 4.5 },
    stageNumber: 3,
    stageName: 'HELLGATE CITADEL',
    exitPos: { x: 13.5, y: 4.5 },
    exitUnlocked: false,
  };
}

// -------------------------------------------------------------
// STAGE 4: VOID CORE / APOCALYPSE SANCTUM
// -------------------------------------------------------------
export function createStage4Map(): MapData {
  const theme: MazeTheme = {
    wallMain: 2,   // Obsidian Brick
    wallAccent: 6, // Bronze Demon Reliefs
    doorTex: 7,    // Bulkhead Door
    floor: 1,      // Hellstone Lava Rock
    ceil: 2,       // Void Starfield
  };

  const { width, height, grid, floorGrid, ceilingGrid, setWall, fillBox, clearArea } = buildBraidedMazeBase(theme);

  // --- 3 PROPERLY CONSTRUCTED & FULLY SEALED SECRET APOCALYPSE VAULTS ---
  // Secret 1: West Apocalypse Superweapon Vault (Inside room: X: 1..2, Y: 10..12)
  clearArea(1, 10, 2, 12);
  fillBox(0, 9, 3, 9, theme.wallMain);      // North sealed wall
  fillBox(0, 13, 3, 13, theme.wallMain);    // South sealed wall
  setWall(3, 10, theme.wallAccent);         // East wall upper
  setWall(3, 12, theme.wallAccent);         // East wall lower
  setWall(3, 11, theme.doorTex);            // Reinforced Secret Door at (3, 11)

  // Secret 2: East Titan Buster Arsenal (Inside room: X: 25..26, Y: 10..12)
  clearArea(25, 10, 26, 12);
  fillBox(24, 9, 27, 9, theme.wallMain);    // North sealed wall
  fillBox(24, 13, 27, 13, theme.wallMain);  // South sealed wall
  setWall(24, 10, theme.wallAccent);        // West wall upper
  setWall(24, 12, theme.wallAccent);        // West wall lower
  setWall(24, 11, theme.doorTex);           // Reinforced Secret Door at (24, 11)

  // Secret 3: North Colosseum God-Slayer Reliquary (Inside room: X: 13..14, Y: 1)
  clearArea(13, 1, 14, 1);
  fillBox(12, 0, 15, 0, theme.wallMain);    // North perimeter wall
  fillBox(12, 1, 12, 2, theme.wallAccent);  // West sealed flank
  fillBox(15, 1, 15, 2, theme.wallAccent);  // East sealed flank
  setWall(14, 2, theme.wallAccent);         // South sealed wall
  setWall(13, 2, theme.doorTex);            // Reinforced Secret Door at (13, 2)

  const secrets: SecretArea[] = [
    {
      id: 401,
      name: 'APOCALYPSE SUPERWEAPON VAULT',
      triggerX: 4,
      triggerY: 11,
      doorX: 3,
      doorY: 11,
      revealed: false,
      rewardDescription: 'OVERCHARGED PLASMA RIFLE & DRUM AMMO CRATE',
    },
    {
      id: 402,
      name: 'TITAN BUSTER ARSENAL',
      triggerX: 23,
      triggerY: 11,
      doorX: 24,
      doorY: 11,
      revealed: false,
      rewardDescription: 'HEAVY CHAINGUN & MEGABARREL AMMO CACHE',
    },
    {
      id: 403,
      name: 'GOD-SLAYER VOID RELIQUARY',
      triggerX: 13,
      triggerY: 3,
      doorX: 13,
      doorY: 2,
      revealed: false,
      rewardDescription: 'CHRONO-HASTE RELIC & APOCALYPSE TITAN SHIELD',
    },
  ];

  const pickups: PickupItem[] = [
    { id: 1, x: 12.5, y: 25.5, type: 'medkit_large', collected: false, bobPhase: 0 },
    { id: 2, x: 14.5, y: 25.5, type: 'ammo_cells', collected: false, bobPhase: 0.5 },
    { id: 3, x: 13.5, y: 24.5, type: 'armor_large', collected: false, bobPhase: 1.0 },
    { id: 4, x: 2.5, y: 8.5, type: 'armor_large', collected: false, bobPhase: 1.5 },
    { id: 5, x: 25.5, y: 8.5, type: 'medkit_large', collected: false, bobPhase: 2.0 },
    { id: 6, x: 13.5, y: 14.5, type: 'berserk_sphere', collected: false, bobPhase: 0.3 },
    { id: 7, x: 14.5, y: 4.5, type: 'medkit_large', collected: false, bobPhase: 0.8 },
    { id: 8, x: 12.5, y: 4.5, type: 'armor_large', collected: false, bobPhase: 1.3 },
    // Secret 1 Loot (strictly inside sealed secret room X: 1..2, Y: 10..12 behind door at 3,11)
    { id: 401, x: 1.5, y: 11.0, type: 'weapon_plasma', collected: false, bobPhase: 0.2 },
    { id: 402, x: 1.5, y: 10.3, type: 'ammo_cells', collected: false, bobPhase: 0.7 },
    { id: 405, x: 1.5, y: 11.7, type: 'infinite_dash_relic', collected: false, bobPhase: 1.4 },
    // Secret 2 Loot (strictly inside sealed secret room X: 25..26, Y: 10..12 behind door at 24,11) - ARMOR & BERSERK
    { id: 403, x: 25.5, y: 11.0, type: 'armor_large', collected: false, bobPhase: 1.2 },
    { id: 404, x: 25.5, y: 10.3, type: 'ammo_cells', collected: false, bobPhase: 1.7 },
    { id: 406, x: 25.5, y: 11.7, type: 'berserk_sphere', collected: false, bobPhase: 2.3 },
    // Secret 3 Loot (strictly inside sealed secret room X: 13..14, Y: 1 behind door at 13,2)
    { id: 407, x: 13.5, y: 1.2, type: 'armor_large', collected: false, bobPhase: 0.6 },
    { id: 408, x: 14.5, y: 1.2, type: 'infinite_dash_relic', collected: false, bobPhase: 1.9 },
  ];

  const chests: LootChest[] = [
    { id: 1, x: 3.5, y: 18.5, opened: false, lootType: 'armor_large', lootName: 'APOCALYPSE TITAN PLATING', lootAmount: 60 },
    { id: 2, x: 24.5, y: 18.5, opened: false, lootType: 'ammo_cells', lootName: 'ZERO-POINT ENERGY CORE', lootAmount: 80 },
    { id: 3, x: 3.5, y: 3.5, opened: false, lootType: 'medkit_large', lootName: 'NANITE TRAUMA MATRIX', lootAmount: 60 },
    { id: 4, x: 24.5, y: 3.5, opened: false, lootType: 'ammo_belts', lootName: 'HEAVY TITAN BELT CRATE', lootAmount: 100 },
    { id: 5, x: 13.5, y: 13.5, opened: false, lootType: 'armor_large', lootName: 'VOID REINFORCED SHIELD', lootAmount: 60 },
  ];

  const enemies = buildStageEnemies(4);

  return {
    width,
    height,
    grid,
    floorGrid,
    ceilingGrid,
    playerStart: { x: 13.5, y: 25.5, angle: -Math.PI / 2 },
    neutralZone: { minY: 23.0, maxY: 27.5, minX: 10.0, maxX: 17.0 },
    airlockDoors: [
      { x: 13, y: 23, animOffset: 0, sealed: false },
      { x: 14, y: 23, animOffset: 0, sealed: false },
    ],
    airlockConsole: { x: 13.5, y: 23.8, triggered: false },
    secrets,
    pickups,
    chests,
    enemies,
    bossSpawnPos: { x: 13.5, y: 4.5 },
    stageNumber: 4,
    stageName: 'APOCALYPSE VOID CORE',
    exitPos: { x: 13.5, y: 4.5 },
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
    e.homePost = { x: safe.x, y: safe.y };
  }

  // Sanitize chests
  for (const c of map.chests) {
    const safe = findNearestClearSpot(c.x, c.y, 0.35);
    c.x = safe.x;
    c.y = safe.y;
  }

  // Sanitize pickups (keep secret vault loot at their designated positions if floor is clear)
  for (const p of map.pickups) {
    const safe = findNearestClearSpot(p.x, p.y, 0.20);
    p.x = safe.x;
    p.y = safe.y;
  }

  return map;
}

// Calibrated difficulty configs for the 28x28 maps:
interface StageDifficultyConfig {
  requiredKills: number;
  totalEnemies: number;
}

const STAGE_DIFFICULTY_BALANCING: Record<number, Record<Difficulty, StageDifficultyConfig>> = {
  1: {
    easy: { requiredKills: 16, totalEnemies: 22 },
    normal: { requiredKills: 22, totalEnemies: 28 },
    hard: { requiredKills: 26, totalEnemies: 32 },
    nightmare: { requiredKills: 30, totalEnemies: 36 },
  },
  2: {
    easy: { requiredKills: 20, totalEnemies: 26 },
    normal: { requiredKills: 26, totalEnemies: 32 },
    hard: { requiredKills: 32, totalEnemies: 38 },
    nightmare: { requiredKills: 36, totalEnemies: 42 },
  },
  3: {
    easy: { requiredKills: 24, totalEnemies: 30 },
    normal: { requiredKills: 30, totalEnemies: 36 },
    hard: { requiredKills: 36, totalEnemies: 44 },
    nightmare: { requiredKills: 42, totalEnemies: 48 },
  },
  4: {
    easy: { requiredKills: 28, totalEnemies: 34 },
    normal: { requiredKills: 35, totalEnemies: 42 },
    hard: { requiredKills: 42, totalEnemies: 48 },
    nightmare: { requiredKills: 46, totalEnemies: 52 },
  },
};

function selectBalancedEnemies(enemies: Enemy[], targetCount: number): Enemy[] {
  if (enemies.length <= targetCount) return [...enemies];
  const step = enemies.length / targetCount;
  const result: Enemy[] = [];
  for (let i = 0; i < targetCount; i++) {
    const idx = Math.min(enemies.length - 1, Math.floor(i * step));
    result.push({ ...enemies[idx], id: i + 1 });
  }
  return result;
}

export function applyDifficultyToMap(map: MapData, difficulty: Difficulty = 'normal'): MapData {
  const stageNum = map.stageNumber || 1;
  const stageBalancing = STAGE_DIFFICULTY_BALANCING[stageNum] || STAGE_DIFFICULTY_BALANCING[1];
  const config = stageBalancing[difficulty] || stageBalancing.normal;

  // 1. Balance the enemy array to match target total enemies for this stage & difficulty
  const nonBossEnemies = map.enemies.filter(e => e.type !== 'boss');
  const balancedEnemies = selectBalancedEnemies(nonBossEnemies, config.totalEnemies);
  map.enemies = balancedEnemies;
  map.totalEnemies = balancedEnemies.length;
  map.requiredKills = Math.min(config.requiredKills, map.totalEnemies);

  const hpMult = difficulty === 'easy' ? 0.75 : (difficulty === 'hard' ? 1.25 : (difficulty === 'nightmare' ? 1.5 : 1.0));
  const speedMult = difficulty === 'easy' ? 0.85 : (difficulty === 'hard' ? 1.18 : (difficulty === 'nightmare' ? 1.38 : 1.0));
  const cdMult = difficulty === 'easy' ? 1.35 : (difficulty === 'hard' ? 0.82 : (difficulty === 'nightmare' ? 0.68 : 1.0));

  // 2. Scale enemy stats
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

  // 3. Scale loot supply on Easy mode
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
