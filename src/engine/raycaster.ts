import { Player, Enemy, Projectile, PickupItem, LootChest, ShellCasing, SteamParticle, SecretArea, AirlockDoor } from '../types';
import { TextureManager } from './textures';
import { ParticleSystem } from './particleSystem';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  player: Player;
  grid: number[][];
  floorGrid?: number[][];
  ceilingGrid?: number[][];
  stageNumber?: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: PickupItem[];
  chests?: LootChest[];
  secrets?: SecretArea[];
  airlockDoors?: AirlockDoor[];
  airlockAnimProgress?: number;
  particles: ParticleSystem;
  flashLight: number; // 0 to 1
  flashColor?: string;
  flashLightColor?: { r: number; g: number; b: number };
  isLockdown: boolean;
  time: number;
  exitPos?: { x: number; y: number };
  exitUnlocked?: boolean;
  fov?: number; // Field of View in radians (~1.05 to 1.3)
}

interface SpriteRenderItem {
  type: 'enemy' | 'projectile' | 'pickup' | 'chest' | 'gib' | 'casing' | 'spark' | 'steam' | 'portal';
  x: number;
  y: number;
  z: number;
  distSq: number;
  scale: number;
  data: unknown;
}

/**
 * High-Performance DDA Raycasting Engine with Realistic PBR Lighting
 * 
 * 1. DDA Raycasting: Grid intersection traversal along X and Y boundaries.
 * 2. Fish-Eye Correction: Perpendicular wall distance projection onto camera plane.
 * 3. Floor & Ceiling Perspective Sampling: Multi-texture grid sampling with dynamic point lights.
 * 4. Volumetric Stage Atmosphere: Atmospheric color grading & distance depth fog.
 * 5. Dynamic Point Lights: Flying projectiles, glowing exit portal, chests, and muzzle flash illuminate walls and floors.
 * 6. Contact Drop Shadows: Soft perspective shadows beneath enemies, chests, and pickups.
 * 7. Z-Buffer Sprite Billboarding: 1D depth buffer with column-by-column sprite clipping and back-to-front sorting.
 */
export class RaycasterEngine {
  // 1D Z-Buffer storing perpendicular wall distance for every screen column
  public zBuffer: number[] = [];
  private textures = TextureManager.getInstance();
  private screenImageData: ImageData | null = null;
  private screenBuffer: Uint32Array | null = null;
  private scratchCanvas: HTMLCanvasElement | null = null;
  private scratchCtx: CanvasRenderingContext2D | null = null;
  private curFogColorR = 10;
  private curFogColorG = 16;
  private curFogColorB = 24;
  private curFlashLight = 0;
  private curFlashLightColor: { r: number; g: number; b: number } = { r: 255, g: 215, b: 120 };
  private curDynamicLights: Array<{ x: number; y: number; radius: number; intensity: number; r: number; g: number; b: number }> = [];
  private curTime = 0;
  private curStageNumber = 1;

  // Cached door maps to eliminate garbage collection allocations per frame
  private secretDoorMap = new Map<number, SecretArea>();
  private airlockDoorMap = new Map<number, number>();
  private wallDecalMap = new Map<number, any[]>();
  private relevantFloorLights: Array<{ x: number; y: number; radius: number; intensity: number; r: number; g: number; b: number }> = [];
  private wallDecalsSlice: Array<{ colorR: number; colorG: number; colorB: number; opacity: number; yStart: number; yEnd: number }> = [];

  public render(rc: RenderContext) {
    const { ctx, width, height, player, grid, flashLight, isLockdown, time, stageNumber = 1 } = rc;

    // 1. Initialize / resize 1D Z-Buffer and 32-bit Screen Pixel Buffer
    if (this.zBuffer.length !== width) {
      this.zBuffer = new Array(width).fill(Infinity);
    }
    if (!this.screenImageData || this.screenImageData.width !== width || this.screenImageData.height !== height) {
      this.screenImageData = ctx.createImageData(width, height);
      this.screenBuffer = new Uint32Array(this.screenImageData.data.buffer);
    }

    const buf = this.screenBuffer!;
    const fov = rc.fov || 1.15; // Field of View (~66 degrees default)
    const halfFov = fov / 2;
    const halfHeight = Math.round(height / 2 + (player.pitch || 0));

    // Secret Door Receding Animations:
    // Build quick lookup for secret doors actively lowering/sinking into the floor
    this.secretDoorMap.clear();
    if (rc.secrets) {
      for (let si = 0; si < rc.secrets.length; si++) {
        const sec = rc.secrets[si];
        if (sec.animating && sec.animOffset !== undefined) {
          this.secretDoorMap.set(sec.doorY * 1000 + sec.doorX, sec);
        }
      }
    }

    // Airlock Door Receding Animations:
    this.airlockDoorMap.clear();
    if (rc.airlockDoors) {
      for (let di = 0; di < rc.airlockDoors.length; di++) {
        const ad = rc.airlockDoors[di];
        if (ad.animOffset !== undefined && ad.animOffset > 0) {
          this.airlockDoorMap.set(ad.y * 1000 + ad.x, ad.animOffset);
        }
      }
    }

    // Direction & Camera Plane Vectors
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * Math.tan(halfFov);
    const planeY = dirX * Math.tan(halfFov);

    const texSize = this.textures.TEX_SIZE; // 64x64 textures

    // Stage Atmospheric Fog Color Palette
    let fogColorR = 10;
    let fogColorG = 16;
    let fogColorB = 24;

    if (isLockdown) {
      fogColorR = 36;
      fogColorG = 4;
      fogColorB = 4;
    } else if (stageNumber === 2) {
      // Toxic Biohazard - deep murky green fog
      fogColorR = 5;
      fogColorG = 22;
      fogColorB = 10;
    } else if (stageNumber === 3) {
      // Demonic Infernal - volcanic crimson/amber fog
      fogColorR = 28;
      fogColorG = 8;
      fogColorB = 6;
    } else if (stageNumber === 4) {
      // Cyber Quantum - deep cobalt nebula fog
      fogColorR = 8;
      fogColorG = 10;
      fogColorB = 26;
    }
    const fogClearPixel = 0xff000000 | (fogColorB << 16) | (fogColorG << 8) | fogColorR;

    // -------------------------------------------------------------
    // 2. GATHER DYNAMIC POINT LIGHTS IN WORLD
    // -------------------------------------------------------------
    interface DynamicLight {
      x: number;
      y: number;
      radius: number;
      intensity: number;
      r: number;
      g: number;
      b: number;
    }
    const dynamicLights: DynamicLight[] = [];

    // Flying Plasma Bolts & Rockets (subtle localized point lights, not blinding room strobes)
    for (let i = 0; i < rc.projectiles.length; i++) {
      const p = rc.projectiles[i];
      if (p.type === 'plasma_blue') {
        dynamicLights.push({ x: p.x, y: p.y, radius: 1.4, intensity: 0.28, r: 56, g: 189, b: 248 });
      } else if (p.type === 'plasma_green') {
        dynamicLights.push({ x: p.x, y: p.y, radius: 1.4, intensity: 0.28, r: 34, g: 197, b: 94 });
      } else {
        dynamicLights.push({ x: p.x, y: p.y, radius: 1.8, intensity: 0.34, r: 249, g: 115, b: 22 });
      }
    }

    // Exit Teleporter Gateway (Dynamic atmospheric light - ONLY active when exit unlocked after boss defeat)
    if (rc.exitPos && rc.exitUnlocked) {
      const pulse = 0.9 + Math.sin(time * 6) * 0.3;
      dynamicLights.push({ x: rc.exitPos.x, y: rc.exitPos.y, radius: 6.5, intensity: pulse, r: 16, g: 185, b: 129 });
    }

    // Supply Chests ambient gold glimmer
    if (rc.chests) {
      for (let i = 0; i < rc.chests.length; i++) {
        const c = rc.chests[i];
        if (!c.opened) {
          dynamicLights.push({ x: c.x, y: c.y, radius: 2.5, intensity: 0.45, r: 245, g: 158, b: 11 });
        }
      }
    }

    // Active Secret Doors Golden Amber Glow
    if (rc.secrets) {
      for (let i = 0; i < rc.secrets.length; i++) {
        const sec = rc.secrets[i];
        if (sec.animating || (sec.revealed && sec.animOffset !== undefined && sec.animOffset < 1.0)) {
          const pulse = 0.85 + Math.sin(time * 25) * 0.2;
          dynamicLights.push({
            x: sec.doorX + 0.5,
            y: sec.doorY + 0.5,
            radius: 4.2,
            intensity: 0.95 * pulse,
            r: 250,
            g: 204,
            b: 21,
          });
        }
      }
    }

    // Active Airlock Doors Cyan Decompression Glow
    if (rc.airlockDoors) {
      for (let i = 0; i < rc.airlockDoors.length; i++) {
        const ad = rc.airlockDoors[i];
        if (ad.animOffset !== undefined && ad.animOffset > 0 && ad.animOffset < 1.0) {
          const pulse = 0.85 + Math.sin(time * 30) * 0.18;
          dynamicLights.push({
            x: ad.x + 0.5,
            y: ad.y + 0.5,
            radius: 4.8,
            intensity: 1.0 * pulse,
            r: 56,
            g: 189,
            b: 248,
          });
        }
      }
    }

    // Cache ambient lighting parameters for sprite billboarding and distance fogging
    this.curFogColorR = fogColorR;
    this.curFogColorG = fogColorG;
    this.curFogColorB = fogColorB;
    this.curFlashLight = flashLight;
    this.curFlashLightColor = rc.flashLightColor || { r: 255, g: 215, b: 120 };
    this.curDynamicLights = dynamicLights;
    this.curTime = time;
    this.curStageNumber = stageNumber || 1;

    // -------------------------------------------------------------
    // 3. PERSPECTIVE TEXTURED FLOOR & CEILING RAYCASTING
    // -------------------------------------------------------------
    const rayDirX0 = dirX - planeX;
    const rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX;
    const rayDirY1 = dirY + planeY;

    // Default stage floor & ceiling selections
    const defaultFloorIdx = stageNumber === 2 ? 3 : (stageNumber === 3 ? 1 : 0);
    const defaultCeilIdx = stageNumber === 3 ? 1 : (stageNumber === 4 ? 2 : 0);

    // Clear horizon scanline if inside screen
    if (halfHeight >= 0 && halfHeight < height) {
      const rowOffset = halfHeight * width;
      for (let x = 0; x < width; x++) {
        buf[rowOffset + x] = fogClearPixel;
      }
    }

    // Scanline floor and ceiling projection
    for (let y = halfHeight + 1; y < height; y++) {
      const p = y - halfHeight;
      const posZ = 0.5 * height;
      const rowDist = posZ / p;

      const floorStepX = (rowDist * (rayDirX1 - rayDirX0)) / width;
      const floorStepY = (rowDist * (rayDirY1 - rayDirY0)) / width;

      let floorX = player.x + rowDist * rayDirX0;
      let floorY = player.y + rowDist * rayDirY0;

      const ceilY = halfHeight - p;
      const rowDistSq = rowDist * rowDist;
      let baseFog = 1.0 / (1.0 + rowDist * 0.085 + rowDistSq * 0.009);
      if (flashLight > 0) {
        baseFog += flashLight * 0.12 * Math.max(0, 1 - rowDist / 4);
      }
      baseFog = Math.max(0.04, Math.min(1.0, baseFog));

      const floorRowOffset = y * width;
      const ceilRowOffset = ceilY >= 0 ? ceilY * width : -1;

      // Pre-filter dynamic lights that can intersect this row distance
      this.relevantFloorLights.length = 0;
      for (let li = 0; li < dynamicLights.length; li++) {
        const dl = dynamicLights[li];
        const distToPlayer = Math.hypot(dl.x - player.x, dl.y - player.y);
        if (Math.abs(distToPlayer - rowDist) <= dl.radius * 1.5) {
          this.relevantFloorLights.push(dl);
        }
      }

      for (let x = 0; x < width; x++) {
        const cellX = Math.floor(floorX);
        const cellY = Math.floor(floorY);

        // Per-tile texture sampling if custom grids are provided
        let fTexIdx = defaultFloorIdx;
        if (rc.floorGrid && cellY >= 0 && cellY < rc.floorGrid.length && cellX >= 0 && cellX < rc.floorGrid[0].length) {
          fTexIdx = rc.floorGrid[cellY][cellX];
        }
        let cTexIdx = defaultCeilIdx;
        if (rc.ceilingGrid && cellY >= 0 && cellY < rc.ceilingGrid.length && cellX >= 0 && cellX < rc.ceilingGrid[0].length) {
          cTexIdx = rc.ceilingGrid[cellY][cellX];
        }

        const floorPixels = this.textures.getFloorPixels(fTexIdx, time);
        const ceilingPixels = this.textures.getCeilingPixels(cTexIdx, time);

        const tx = ((floorX * 64) | 0) & 63;
        const ty = ((floorY * 64) | 0) & 63;
        const texIdx = (ty << 6) | tx;

        // Dynamic light calculation at this floor point (using pre-filtered row lights)
        let floorDynR = 0;
        let floorDynG = 0;
        let floorDynB = 0;

        for (let li = 0; li < this.relevantFloorLights.length; li++) {
          const dl = this.relevantFloorLights[li];
          const dlDx = floorX - dl.x;
          const dlDy = floorY - dl.y;
          const dlDistSq = dlDx * dlDx + dlDy * dlDy;
          const dlRadSq = dl.radius * dl.radius;
          if (dlDistSq < dlRadSq) {
            const distNorm = Math.sqrt(dlDistSq) / dl.radius;
            const att = Math.max(0, 1.0 - distNorm * distNorm) * dl.intensity;
            floorDynR += dl.r * att;
            floorDynG += dl.g * att;
            floorDynB += dl.b * att;
          }
        }

        // Muzzle flash subtle floor reflection
        if (flashLight > 0) {
          const fColor = rc.flashLightColor || { r: 255, g: 215, b: 120 };
          const mAtt = flashLight * Math.max(0, 1 - rowDist / 3.5) * 0.18;
          floorDynR += fColor.r * mAtt;
          floorDynG += fColor.g * mAtt;
          floorDynB += fColor.b * mAtt;
        }

        // Floor pixel sampling with distance fog and dynamic point lights
        const fRaw = floorPixels ? floorPixels[texIdx] : 0xff1e1e24;
        const fR = fRaw & 0xff;
        const fG = (fRaw >> 8) & 0xff;
        const fB = (fRaw >> 16) & 0xff;

        const litFR = Math.min(255, fR + floorDynR);
        const litFG = Math.min(255, fG + floorDynG);
        const litFB = Math.min(255, fB + floorDynB);

        const finalFR = (litFR * baseFog + fogColorR * (1 - baseFog)) | 0;
        const finalFG = (litFG * baseFog + fogColorG * (1 - baseFog)) | 0;
        const finalFB = (litFB * baseFog + fogColorB * (1 - baseFog)) | 0;
        buf[floorRowOffset + x] = 0xff000000 | (finalFB << 16) | (finalFG << 8) | finalFR;

        // Ceiling pixel sampling
        if (ceilRowOffset >= 0) {
          const cRaw = ceilingPixels ? ceilingPixels[texIdx] : 0xff141720;
          const cR = cRaw & 0xff;
          const cG = (cRaw >> 8) & 0xff;
          const cB = (cRaw >> 16) & 0xff;

          const litCR = Math.min(255, cR + floorDynR * 0.65);
          const litCG = Math.min(255, cG + floorDynG * 0.65);
          const litCB = Math.min(255, cB + floorDynB * 0.65);

          const ceilFog = baseFog * 0.85;
          const finalCR = (litCR * ceilFog + fogColorR * (1 - ceilFog)) | 0;
          const finalCG = (litCG * ceilFog + fogColorG * (1 - ceilFog)) | 0;
          const finalCB = (litCB * ceilFog + fogColorB * (1 - ceilFog)) | 0;
          buf[ceilRowOffset + x] = 0xff000000 | (finalCB << 16) | (finalCG << 8) | finalCR;
        }

        floorX += floorStepX;
        floorY += floorStepY;
      }
    }

    // Fill top sky rows if look-down pitch exposed empty rows above ceiling
    const topCeilLimit = Math.max(0, halfHeight - (height - halfHeight));
    for (let cy = 0; cy < topCeilLimit; cy++) {
      const rOff = cy * width;
      for (let x = 0; x < width; x++) {
        buf[rOff + x] = fogClearPixel;
      }
    }

    // -------------------------------------------------------------
    // 4. ROCK-SOLID DDA RAYCASTING & PERSPECTIVE WALL RENDERING
    // -------------------------------------------------------------
    // Pre-index wall decals by cell and side to eliminate up to 192,000 array iterations per frame
    this.wallDecalMap.clear();
    if (rc.particles.wallDecals.length > 0) {
      for (let di = 0; di < rc.particles.wallDecals.length; di++) {
        const decal = rc.particles.wallDecals[di];
        const cellKey = (decal.mapY * 1000 + decal.mapX) * 2 + decal.side;
        let list = this.wallDecalMap.get(cellKey);
        if (!list) {
          list = [];
          this.wallDecalMap.set(cellKey, list);
        }
        list.push(decal);
      }
    }

    const flashColor = rc.flashLightColor || { r: 255, g: 215, b: 120 };

    for (let x = 0; x < width; x++) {
      const cameraX = (2 * x) / width - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      // Safe reciprocal step distances avoiding division by zero
      const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
      const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

      let stepX = 0;
      let stepY = 0;
      let sideDistX = 0;
      let sideDistY = 0;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (player.x - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
      }

      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (player.y - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
      }

      // Digital Differential Analysis (DDA) Grid Stepping
      let hit = 0;
      let side: 0 | 1 = 0; // 0 = X-wall (vertical grid line), 1 = Y-wall (horizontal grid line)
      let wallType = 1;
      let ddaSteps = 0;
      const maxDdaSteps = 96; // Extended DDA depth for massive 64x64 maps

      interface LoweringDoorHit {
        mapX: number;
        mapY: number;
        side: 0 | 1;
        wallType: number;
        perpWallDist: number;
        animOffset: number;
        seamType: 'secret' | 'airlock';
        stepX: number;
        stepY: number;
      }

      let doorHit: LoweringDoorHit | null = null;

      while (hit === 0 && ddaSteps < maxDdaSteps) {
        ddaSteps++;
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (mapY >= 0 && mapY < grid.length && mapX >= 0 && mapX < grid[0].length) {
          const cellVal = grid[mapY][mapX];
          if (cellVal > 0) {
            const cellKey = mapY * 1000 + mapX;
            const sec = this.secretDoorMap.get(cellKey);
            const airlockOffset = this.airlockDoorMap.get(cellKey);

            let isLowering = false;
            let offset = 0;
            let seam: 'secret' | 'airlock' = 'secret';

            if (sec && sec.animOffset !== undefined) {
              isLowering = true;
              offset = sec.animOffset;
              seam = 'secret';
            } else if (airlockOffset !== undefined && airlockOffset > 0) {
              isLowering = true;
              offset = airlockOffset;
              seam = 'airlock';
            }

            if (isLowering) {
              if (offset >= 1.0) {
                // Sunk all the way into the floor: ray passes through unobstructed!
                continue;
              }
              if (!doorHit) {
                const dist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
                doorHit = {
                  mapX,
                  mapY,
                  side,
                  wallType: cellVal,
                  perpWallDist: Math.max(0.08, dist),
                  animOffset: offset,
                  seamType: seam,
                  stepX,
                  stepY,
                };
              }
              // Ray continues through the lowering door opening to find the interior background wall!
              continue;
            }

            // Solid normal wall
            hit = 1;
            wallType = cellVal;
          }
        } else {
          hit = 1;
          wallType = 1;
        }
      }

      // Exact perpendicular distance (mathematically continuous, zero division by rayDir)
      let perpWallDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
      if (!isFinite(perpWallDist) || perpWallDist < 0.08) perpWallDist = 0.08;

      // 1D Z-Buffer for sprite billboarding occlusion
      this.zBuffer[x] = (doorHit && doorHit.animOffset < 0.45) ? doorHit.perpWallDist : perpWallDist;

      // True unclipped projected background wall coordinates
      const bgLineHeight = Math.round(height / perpWallDist);
      const bgUnclippedStart = -bgLineHeight / 2 + halfHeight;
      const bgDrawStart = Math.max(0, Math.floor(bgUnclippedStart));
      const bgDrawEnd = Math.min(height - 1, Math.floor(bgLineHeight / 2 + halfHeight));

      // 1. Render Background Wall Slice
      this.renderWallSlice(
        buf, width, height, x,
        mapX, mapY, side, wallType, perpWallDist,
        rayDirX, rayDirY, stepX, stepY,
        player.x, player.y, halfHeight,
        bgDrawStart, bgDrawEnd, bgLineHeight, bgUnclippedStart,
        null, 0,
        time, texSize, fogColorR, fogColorG, fogColorB,
        dynamicLights, flashLight, flashColor, isLockdown
      );

      // 2. If ray passed through a lowering door, render the sinking door slab in front!
      if (doorHit) {
        const doorLineHeight = Math.round(height / doorHit.perpWallDist);
        const doorUnclippedStart = -doorLineHeight / 2 + halfHeight;
        const doorTop = Math.floor(doorUnclippedStart + doorLineHeight * doorHit.animOffset);
        const doorFloor = Math.floor(doorLineHeight / 2 + halfHeight);
        const doorDrawStart = Math.max(0, doorTop);
        const doorDrawEnd = Math.min(height - 1, doorFloor);

        if (doorDrawStart <= doorDrawEnd) {
          this.renderWallSlice(
            buf, width, height, x,
            doorHit.mapX, doorHit.mapY, doorHit.side, doorHit.wallType, doorHit.perpWallDist,
            rayDirX, rayDirY, doorHit.stepX, doorHit.stepY,
            player.x, player.y, halfHeight,
            doorDrawStart, doorDrawEnd, doorLineHeight, doorUnclippedStart,
            doorHit.seamType, doorHit.animOffset,
            time, texSize, fogColorR, fogColorG, fogColorB,
            dynamicLights, flashLight, flashColor, isLockdown
          );
        }
      }
    }

    // -------------------------------------------------------------
    // 5. HARDWARE BLIT 3D SCENE TO CANVAS
    // -------------------------------------------------------------
    ctx.putImageData(this.screenImageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Floor decals (blood puddles on ground) with Z-buffer occlusion & perspective locking
    this.renderFloorDecals(rc, halfHeight, planeX, planeY, dirX, dirY);

    // -------------------------------------------------------------
    // 6. Z-BUFFER SPRITE BILLBOARDING (With Contact Drop Shadows)
    // -------------------------------------------------------------
    this.renderSprites(rc, halfHeight, planeX, planeY, dirX, dirY);

    // -------------------------------------------------------------
    // 7. ATMOSPHERIC AIRBORNE DUST PARTICLES & HEAT EMBERS
    // -------------------------------------------------------------
    this.renderAtmosphericDust(rc, halfHeight, time, stageNumber);

    // -------------------------------------------------------------
    // 8. CINEMATIC VIGNETTE & LENS DARKENING
    // -------------------------------------------------------------
    this.renderCinematicVignette(ctx, width, height, isLockdown);
  }

  // --- SUB-TEXEL WALL SLICE RASTERIZER & LIGHTING COMPOSITOR ---
  private renderWallSlice(
    buf: Uint32Array,
    width: number,
    height: number,
    x: number,
    mapX: number,
    mapY: number,
    side: 0 | 1,
    wallType: number,
    perpWallDist: number,
    rayDirX: number,
    rayDirY: number,
    stepX: number,
    stepY: number,
    playerX: number,
    playerY: number,
    halfHeight: number,
    drawStart: number,
    drawEnd: number,
    lineHeight: number,
    unclippedStart: number,
    doorSeamType: 'secret' | 'airlock' | null,
    animSinkFraction: number,
    time: number,
    texSize: number,
    fogColorR: number,
    fogColorG: number,
    fogColorB: number,
    dynamicLights: Array<{ x: number; y: number; radius: number; intensity: number; r: number; g: number; b: number }>,
    flashLight: number,
    flashColor: { r: number; g: number; b: number },
    isLockdown: boolean
  ) {
    if (drawStart > drawEnd || drawEnd < 0 || drawStart >= height) return;

    // Hit coordinate along wall surface
    let wallX = side === 0 ? playerY + perpWallDist * rayDirY : playerX + perpWallDist * rayDirX;
    wallX -= Math.floor(wallX);

    // Correct texture column orientation
    let texX = Math.floor(wallX * texSize);
    if (side === 0 && rayDirX > 0) texX = texSize - texX - 1;
    if (side === 1 && rayDirY < 0) texX = texSize - texX - 1;
    texX = Math.max(0, Math.min(texSize - 1, texX));

    // Select pre-rasterized 32-bit wall texture
    const texIdx = Math.max(0, Math.min(this.textures.wallPixels.length - 1, wallType - 1));
    const wallPixels = this.textures.getWallPixels(texIdx, time);

    // Directional 3D Shading for depth perception
    const dirShade = side === 0 ? (rayDirX > 0 ? 0.94 : 1.0) : (rayDirY > 0 ? 0.78 : 0.86);

    // Distance depth fog factor
    let fogFactor = 1.0 / (1.0 + perpWallDist * 0.085 + (perpWallDist * perpWallDist) * 0.009);
    fogFactor = Math.max(0.04, Math.min(1.0, fogFactor));

    // Hit world coordinates for dynamic point lights
    const hitWorldX = side === 0 ? (mapX + (stepX < 0 ? 1 : 0)) : (playerX + perpWallDist * rayDirX);
    const hitWorldY = side === 1 ? (mapY + (stepY < 0 ? 1 : 0)) : (playerY + perpWallDist * rayDirY);

    let dynR = 0;
    let dynG = 0;
    let dynB = 0;

    for (let li = 0; li < dynamicLights.length; li++) {
      const dl = dynamicLights[li];
      const dlDx = hitWorldX - dl.x;
      const dlDy = hitWorldY - dl.y;
      const dlDistSq = dlDx * dlDx + dlDy * dlDy;
      const dlRadSq = dl.radius * dl.radius;

      if (dlDistSq < dlRadSq) {
        const distNorm = Math.sqrt(dlDistSq) / dl.radius;
        const att = Math.max(0, (1.0 - distNorm * distNorm)) * dl.intensity;
        dynR += dl.r * att;
        dynG += dl.g * att;
        dynB += dl.b * att;
      }
    }

    if (flashLight > 0) {
      const flashAtt = flashLight * Math.max(0, 1 - perpWallDist / 3.5) * 0.20;
      dynR += flashColor.r * flashAtt;
      dynG += flashColor.g * flashAtt;
      dynB += flashColor.b * flashAtt;
    }

    if (isLockdown) {
      const sirenPulse = (Math.sin(time * 7) + 1) * 0.5;
      dynR += sirenPulse * 45;
    }

    // Wall Decals
    const cellKey = (mapY * 1000 + mapX) * 2 + side;
    const activeDecals = this.wallDecalMap.get(cellKey);
    this.wallDecalsSlice.length = 0;

    if (activeDecals && activeDecals.length > 0) {
      for (let di = 0; di < activeDecals.length; di++) {
        const decal = activeDecals[di];
        const diff = Math.abs(wallX - decal.wallOffset);
        if (diff < decal.size / 2) {
          const cy = unclippedStart + lineHeight * decal.wallZ;
          const h2 = Math.max(2, (lineHeight * decal.size) / 2);
          const decalColor = decal.color || '';
          const isBlood = decal.type === 'blood_splat' || decalColor.includes('99') || decalColor.includes('dc') || decalColor.includes('88') || decalColor.includes('red');
          let opacity = 0.75;
          if (decal.life !== undefined && decal.maxLife !== undefined && decal.life > decal.maxLife - 1.0) {
            opacity *= Math.max(0, (decal.maxLife - decal.life) / 1.0);
          }
          if (opacity > 0.02) {
            this.wallDecalsSlice.push({
              colorR: isBlood ? 165 : 20,
              colorG: isBlood ? 12 : 20,
              colorB: isBlood ? 12 : 20,
              opacity,
              yStart: Math.floor(cy - h2),
              yEnd: Math.floor(cy + h2),
            });
          }
        }
      }
    }

    const sliceHeight = drawEnd - drawStart + 1;
    const invLineHeight = 1.0 / lineHeight;
    const texStep = texSize * invLineHeight;
    const effectiveWallOrigin = doorSeamType ? (unclippedStart + lineHeight * animSinkFraction) : unclippedStart;
    let curTexY = (drawStart - effectiveWallOrigin) * texStep;

    for (let y = drawStart; y <= drawEnd; y++, curTexY += texStep) {
      const texY0 = Math.floor(curTexY) & (texSize - 1);
      const fracY = curTexY - Math.floor(curTexY);
      const texY1 = (texY0 + 1) & (texSize - 1);

      let r: number, g: number, b: number;
      if (wallPixels) {
        const raw0 = wallPixels[(texY0 << 6) | texX];
        const raw1 = wallPixels[(texY1 << 6) | texX];
        const r0 = raw0 & 0xff;
        const g0 = (raw0 >> 8) & 0xff;
        const b0 = (raw0 >> 16) & 0xff;
        const r1 = raw1 & 0xff;
        const g1 = (raw1 >> 8) & 0xff;
        const b1 = (raw1 >> 16) & 0xff;
        r = (r0 * (1 - fracY) + r1 * fracY) | 0;
        g = (g0 * (1 - fracY) + g1 * fracY) | 0;
        b = (b0 * (1 - fracY) + b1 * fracY) | 0;
      } else {
        r = 0x33; g = 0x44; b = 0x55;
      }

      // Ambient Occlusion contact shadow near ceiling and floor junctions
      let ao = 1.0;
      const distEdge = Math.min(y - drawStart, drawEnd - y);
      if (distEdge < 12 && sliceHeight > 18) {
        ao = 0.50 + (distEdge / 12) * 0.50;
      }

      // Decal overlay with smooth alpha blending
      if (this.wallDecalsSlice.length > 0) {
        for (let di = 0; di < this.wallDecalsSlice.length; di++) {
          const d = this.wallDecalsSlice[di];
          if (y >= d.yStart && y <= d.yEnd) {
            const op = d.opacity;
            r = (r * (1 - op) + d.colorR * op) | 0;
            g = (g * (1 - op) + d.colorG * op) | 0;
            b = (b * (1 - op) + d.colorB * op) | 0;
          }
        }
      }

      // Glowing Hydraulic Laser Seam / Mechanical Rim Highlight along top edge of descending door slab
      if (doorSeamType && (y - drawStart) <= 3) {
        const seamProgress = 1.0 - (y - drawStart) / 3.0;
        if (doorSeamType === 'secret') {
          r = Math.min(255, r + Math.round(230 * seamProgress));
          g = Math.min(255, g + Math.round(190 * seamProgress));
          b = Math.min(255, b + Math.round(30 * seamProgress));
        } else if (doorSeamType === 'airlock') {
          r = Math.min(255, r + Math.round(40 * seamProgress));
          g = Math.min(255, g + Math.round(190 * seamProgress));
          b = Math.min(255, b + Math.round(250 * seamProgress));
        }
      }

      // Directional shading + AO + Dynamic Point Lights
      const litR = Math.min(255, r * dirShade * ao + dynR);
      const litG = Math.min(255, g * dirShade * ao + dynG);
      const litB = Math.min(255, b * dirShade * ao + dynB);

      // Exponential distance depth fog
      const finalR = (litR * fogFactor + fogColorR * (1 - fogFactor)) | 0;
      const finalG = (litG * fogFactor + fogColorG * (1 - fogFactor)) | 0;
      const finalB = (litB * fogFactor + fogColorB * (1 - fogFactor)) | 0;

      buf[y * width + x] = 0xff000000 | (finalB << 16) | (finalG << 8) | finalR;
    }
  }

  // --- ATMOSPHERIC AIRBORNE DUST PARTICLES & HEAT EMBERS ---
  private renderAtmosphericDust(rc: RenderContext, halfHeight: number, time: number, stageNumber: number) {
    const { ctx, width, height, player, flashLight } = rc;
    const dustCount = 36;

    ctx.save();
    for (let i = 0; i < dustCount; i++) {
      // Procedural pseudo-random 3D dust positions based on world coords + time
      const seed = i * 133.7;
      const ox = ((Math.sin(seed) * 1000 + time * 0.4) % 16) - 8;
      const oy = ((Math.cos(seed) * 1000 + time * 0.3) % 16) - 8;
      const oz = ((Math.sin(seed * 2.1) * 1000 + time * 0.2) % 4) / 4;

      const wx = player.x + ox;
      const wy = player.y + oy;

      const dx = wx - player.x;
      const dy = wy - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.4 || dist > 10) continue;

      const angleToMote = Math.atan2(dy, dx) - player.angle;
      let diff = angleToMote;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) < 0.9) {
        const perpDist = dist * Math.cos(diff);
        if (perpDist <= 0.2) continue;

        const screenX = width / 2 + Math.tan(diff) * (width / 2);
        const col = Math.floor(screenX);

        if (col >= 0 && col < width && perpDist < this.zBuffer[col]) {
          const wallHeight = height / perpDist;
          const screenY = halfHeight + wallHeight * 0.5 - oz * wallHeight;

          if (screenY > 0 && screenY < height) {
            const moteSize = Math.max(1, (2.2 * height) / (dist * 200));
            let alpha = Math.max(0, 0.45 * (1 - dist / 10));
            if (flashLight > 0) alpha = Math.min(0.9, alpha * 2.2);

            ctx.globalAlpha = alpha;
            if (stageNumber === 2) {
              ctx.fillStyle = '#86efac'; // Mutagenic spore
            } else if (stageNumber === 3) {
              ctx.fillStyle = '#fb923c'; // Lava cinder / ember
            } else {
              ctx.fillStyle = '#e2e8f0'; // Industrial dust mote
            }

            ctx.beginPath();
            ctx.arc(screenX, screenY, moteSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();
  }

  // --- CINEMATIC VIGNETTE & CORNER DARKENING ---
  private renderCinematicVignette(ctx: CanvasRenderingContext2D, width: number, height: number, isLockdown: boolean) {
    ctx.save();
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(cx, cy) * 1.2;

    const grad = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
    if (isLockdown) {
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(60, 0, 0, 0.15)');
      grad.addColorStop(1, 'rgba(80, 0, 0, 0.6)');
    } else {
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.22)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.68)');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // --- FLOOR DECALS (With Z-Buffer Occlusion & Exact Perspective Locking) ---
  private renderFloorDecals(
    rc: RenderContext,
    halfHeight: number,
    planeX: number,
    planeY: number,
    dirX: number,
    dirY: number
  ) {
    const { ctx, width, height, player, particles } = rc;
    if (particles.floorDecals.length === 0) return;

    const invDet = 1.0 / (planeX * dirY - dirX * planeY);

    for (let di = 0; di < particles.floorDecals.length; di++) {
      const decal = particles.floorDecals[di];
      const spriteX = decal.x - player.x;
      const spriteY = decal.y - player.y;

      // Exact camera plane transformation matching raycaster & sprites
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

      if (transformY <= 0.15 || transformY > 14) continue;

      const screenX = Math.floor((width / 2) * (1 + transformX / transformY));
      const col = Math.floor(screenX);

      // Z-Buffer occlusion check: prevents blood from rendering through solid walls
      if (col >= 0 && col < width && transformY >= this.zBuffer[col] - 0.05) {
        continue;
      }

      // Ground plane screen Y: exactly at floor level (halfHeight + wall height / 2)
      const wallHeightAtDist = Math.abs(Math.floor(height / transformY));
      const screenY = Math.floor(halfHeight + wallHeightAtDist * 0.5);

      const radiusX = Math.max(2, (decal.size * height) / (transformY * 2.5));
      const radiusY = Math.max(1, radiusX * 0.40); // 3D perspective floor foreshortening

      if (screenY > halfHeight && screenY < height && screenX > -60 && screenX < width + 60) {
        const alpha = decal.alpha !== undefined ? Math.max(0, Math.min(1, decal.alpha)) : 0.95;
        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;

        if (decal.type === 'blood') {
          // Visceral 3-layer blood pool: dark coagulated center + arterial fringe + satellite droplets
          ctx.fillStyle = '#3f0404'; // Dark coagulated core
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, radiusX * 0.72, radiusY * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = decal.color || '#7f1d1d'; // Crimson fringe
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();

          // Satellite blood droplets
          ctx.fillStyle = '#650808';
          ctx.beginPath();
          ctx.ellipse(screenX + radiusX * 1.15, screenY - radiusY * 0.35, radiusX * 0.22, radiusY * 0.22, 0, 0, Math.PI * 2);
          ctx.ellipse(screenX - radiusX * 0.95, screenY + radiusY * 0.45, radiusX * 0.18, radiusY * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = decal.color;
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
  }

  // -------------------------------------------------------------
  // Z-BUFFER SPRITE BILLBOARDING WITH COLUMN-BY-COLUMN CLIPPING
  // -------------------------------------------------------------
  private renderSprites(
    rc: RenderContext,
    halfHeight: number,
    planeX: number,
    planeY: number,
    dirX: number,
    dirY: number
  ) {
    const { ctx, width, height, player, enemies, projectiles, pickups, chests, particles } = rc;

    const spriteList: SpriteRenderItem[] = [];

    // 1. Gather all dynamic world entities
    enemies.forEach((e) => {
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      // Normal proportions relative to wall height (1.0 = standard wall height)
      let scale = 0.88;
      if (e.type === 'baron') scale = 1.25;
      else if (e.type === 'boss') scale = e.isUltraBoss ? 2.0 : 1.75;
      else if (e.type === 'lost_soul') scale = 0.65;
      else if (e.type === 'imp') scale = 0.82;
      else if (e.type === 'scuttler') scale = 0.62;
      else if (e.type === 'plasma_gunner') scale = 0.90;
      else if (e.type === 'vile_spitter') scale = 1.08;

      // When dead or lying on floor, reduce vertical scale
      if (e.state === 'dead' || e.state === 'gibbed') {
        scale *= (e.type === 'scuttler' ? 0.35 : 0.55);
      }

      spriteList.push({
        type: 'enemy',
        x: e.x,
        y: e.y,
        z: 0, // All enemies firmly grounded on floor
        distSq: dx * dx + dy * dy,
        scale,
        data: e,
      });
    });

    projectiles.forEach((p) => {
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      spriteList.push({
        type: 'projectile',
        x: p.x,
        y: p.y,
        z: p.z || 0.45,
        distSq: dx * dx + dy * dy,
        scale: p.type === 'rocket' ? 0.24 : 0.16,
        data: p,
      });
    });

    pickups.forEach((pk) => {
      if (!pk.collected) {
        const dx = pk.x - player.x;
        const dy = pk.y - player.y;
        // Smooth sine-wave vertical hovering above floor
        const hoverZ = 0.16 + Math.sin(pk.bobPhase) * 0.07;
        spriteList.push({
          type: 'pickup',
          x: pk.x,
          y: pk.y,
          z: hoverZ,
          distSq: dx * dx + dy * dy,
          scale: 0.30,
          data: pk,
        });
      }
    });

    if (rc.chests) {
      rc.chests.forEach((c) => {
        const dx = c.x - player.x;
        const dy = c.y - player.y;
        spriteList.push({
          type: 'chest',
          x: c.x,
          y: c.y,
          z: 0,
          distSq: dx * dx + dy * dy,
          scale: 0.44,
          data: c,
        });
      });
    }

    // Exit Teleporter Gateway Pillar (rendered ONLY when exit is unlocked / boss is defeated)
    if (rc.exitPos && rc.exitUnlocked) {
      const dx = rc.exitPos.x - player.x;
      const dy = rc.exitPos.y - player.y;
      spriteList.push({
        type: 'portal',
        x: rc.exitPos.x,
        y: rc.exitPos.y,
        z: 0,
        distSq: dx * dx + dy * dy,
        scale: 1.1,
        data: { ...rc.exitPos, unlocked: true },
      });
    }

    particles.gibs.forEach((g) => {
      const dx = g.x - player.x;
      const dy = g.y - player.y;
      spriteList.push({
        type: 'gib',
        x: g.x,
        y: g.y,
        z: Math.max(0, g.z),
        distSq: dx * dx + dy * dy,
        scale: Math.max(0.2, g.size * 1.6),
        data: g,
      });
    });

    particles.shellCasings.forEach((c) => {
      const dx = c.x - player.x;
      const dy = c.y - player.y;
      spriteList.push({
        type: 'casing',
        x: c.x,
        y: c.y,
        z: Math.max(0, c.z),
        distSq: dx * dx + dy * dy,
        scale: c.casingType === 'shotgun_red' ? 0.22 : 0.16,
        data: c,
      });
    });

    particles.sparks.forEach((s) => {
      const dx = s.x - player.x;
      const dy = s.y - player.y;
      spriteList.push({
        type: 'spark',
        x: s.x,
        y: s.y,
        z: s.z,
        distSq: dx * dx + dy * dy,
        scale: 0.25,
        data: s,
      });
    });

    if (particles.steam) {
      particles.steam.forEach((st) => {
        const dx = st.x - player.x;
        const dy = st.y - player.y;
        spriteList.push({
          type: 'steam',
          x: st.x,
          y: st.y,
          z: st.z,
          distSq: dx * dx + dy * dy,
          scale: st.size * 2.0,
          data: st,
        });
      });
    }

    // 2. Sort sprites back-to-front (farthest first) for Painter's Algorithm ordering
    spriteList.sort((a, b) => b.distSq - a.distSq);

    // Inverse camera determinant
    const invDet = 1.0 / (planeX * dirY - dirX * planeY);

    // 3. Transform, project, and billboard each sprite with Z-Buffer testing
    for (const item of spriteList) {
      if (item.distSq < 0.02) continue; // Skip if touching camera origin

      // Translate sprite position relative to camera
      const spriteX = item.x - player.x;
      const spriteY = item.y - player.y;

      // Transform sprite with the inverse camera matrix
      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY); // Depth in camera space

      // If sprite is behind camera plane, do not render
      if (transformY <= 0.1) continue;

      // Calculate screen X center coordinate
      const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));

      // Calculate sprite height based on distance
      const wallHeightAtDist = Math.abs(Math.floor(height / transformY));
      const spriteHeight = Math.floor(wallHeightAtDist * item.scale);
      let spriteWidth = spriteHeight;

      // 1. Aspect Ratio Locking for enemy sprites
      if (item.type === 'enemy') {
        const enemy = item.data as Enemy;
        const eImg = this.getEnemyFrame(enemy);
        if (eImg && eImg.height > 0) {
          spriteWidth = Math.round(spriteHeight * (eImg.width / eImg.height));
        }
      }

      // Firm floor grounding:
      const groundScreenY = Math.floor(halfHeight + wallHeightAtDist / 2);
      const elevationPx = Math.floor((item.z || 0) * wallHeightAtDist);
      const feetY = groundScreenY - elevationPx;

      const drawEndY = Math.min(height - 1, feetY);
      const drawStartY = Math.max(0, drawEndY - spriteHeight);

      const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteWidth / 2));
      const drawEndX = Math.min(width - 1, Math.floor(spriteScreenX + spriteWidth / 2));

      if (drawStartX >= width || drawEndX < 0 || feetY <= 0 || (feetY - spriteHeight) >= height) continue;

      // Render Soft Contact Drop Shadow on Floor under grounded non-enemy entities
      if (item.type === 'chest' || item.type === 'pickup' || item.type === 'portal') {
        const shadowCol = Math.floor(spriteScreenX);
        if (shadowCol >= 0 && shadowCol < width && transformY < this.zBuffer[shadowCol] + 0.15) {
          const elev = item.z || 0;
          const shadowFactor = Math.max(0.62, 1.0 - elev * 0.75);
          const shadowRadiusX = Math.max(3, spriteWidth * 0.35 * shadowFactor);
          const shadowRadiusY = Math.max(1, shadowRadiusX * 0.38);
          ctx.save();
          ctx.globalAlpha = Math.max(0.04, Math.min(0.45, (0.65 / (1 + transformY * 0.15)) * shadowFactor));
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.ellipse(spriteScreenX, groundScreenY - 1, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 4. Render sprite entity using Z-Buffer column test
      if (item.type === 'enemy') {
        this.drawEnemyBillboard(
          ctx,
          item.data as Enemy,
          spriteScreenX,
          feetY,
          spriteHeight,
          transformY,
          width,
          height
        );
      } else if (item.type === 'projectile') {
        this.drawProjectileBillboard(
          ctx,
          item.data as Projectile,
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width
        );
      } else if (item.type === 'pickup') {
        this.drawPickupBillboard(
          ctx,
          item.data as PickupItem,
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width
        );
      } else if (item.type === 'chest') {
        this.drawChestBillboard(
          ctx,
          item.data as LootChest,
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width
        );
      } else if (item.type === 'gib') {
        this.drawGibBillboard(
          ctx,
          item.data as { gibType: string; size: number },
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width
        );
      } else if (item.type === 'casing') {
        this.drawCasingBillboard(
          ctx,
          item.data as ShellCasing,
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width
        );
      } else if (item.type === 'spark') {
        this.drawSparkBillboard(
          ctx,
          item.data as { color: string; size: number },
          spriteScreenX,
          drawStartY + (drawEndY - drawStartY) / 2,
          transformY,
          width
        );
      } else if (item.type === 'steam') {
        this.drawSteamBillboard(
          ctx,
          item.data as SteamParticle,
          spriteScreenX,
          drawStartY + (drawEndY - drawStartY) / 2,
          spriteWidth,
          transformY,
          width
        );
      } else if (item.type === 'portal') {
        const isUnlocked = (item.data as { unlocked?: boolean })?.unlocked ?? true;
        this.drawPortalBillboard(
          ctx,
          drawStartX,
          drawEndX,
          drawStartY,
          drawEndY,
          spriteScreenX,
          spriteWidth,
          spriteHeight,
          transformY,
          width,
          isUnlocked
        );
      }
    }
  }

  // --- SPRITE BILLBOARD RENDERING IMPLEMENTATIONS ---

  public getEnemyFrame(enemy: Enemy): HTMLCanvasElement {
    let canvases = this.textures.enemyCanvases[enemy.type] || this.textures.enemyCanvases['grunt'];
    if (enemy.type === 'boss') {
      if (enemy.stageBossId && this.textures.stageBossCanvases[enemy.stageBossId]) {
        canvases = this.textures.stageBossCanvases[enemy.stageBossId];
      } else if (enemy.isUltraBoss && this.textures.ultraBossCanvases && this.textures.ultraBossCanvases.length > 0) {
        canvases = this.textures.ultraBossCanvases;
      }
    } else if (enemy.isUltraBoss && this.textures.ultraBossCanvases && this.textures.ultraBossCanvases.length > 0) {
      canvases = this.textures.ultraBossCanvases;
    }
    let frameIdx = 0;

    if (enemy.state === 'gibbed') {
      if (canvases.length > 5) {
        frameIdx = 5;
      } else if (this.textures.gibCanvases['dismembered']) {
        return this.textures.gibCanvases['dismembered'];
      } else {
        frameIdx = Math.min(4, canvases.length - 1);
      }
    } else if (enemy.state === 'staggered' || enemy.state === 'pain') {
      frameIdx = Math.min(3, canvases.length - 1);
    } else if (enemy.state === 'dying' || enemy.state === 'dead') {
      frameIdx = Math.min(4, canvases.length - 1);
    } else if (enemy.state === 'attack') {
      frameIdx = Math.min(2, canvases.length - 1);
    } else if (enemy.state === 'alert') {
      frameIdx = 0;
    } else if (enemy.state === 'chase' || enemy.state === 'patrol') {
      frameIdx = enemy.animFrame % 2;
    }

    return canvases[frameIdx] || canvases[0];
  }

  // High-performance contiguous span batching for sprite billboard clipping against 1D Z-Buffer
  private drawClippedSpriteSpan(
    ctx: CanvasRenderingContext2D,
    sourceImg: CanvasImageSource,
    origLeft: number,
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    spriteWidth: number,
    sliceHeight: number,
    imgW: number,
    imgH: number,
    depth: number,
    screenWidth: number
  ) {
    let spanStart = -1;
    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      const isVisible = stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe];
      if (isVisible) {
        if (spanStart === -1) spanStart = stripe;
      } else {
        if (spanStart !== -1) {
          this.renderSpriteSpan(ctx, sourceImg, origLeft, spanStart, stripe - 1, drawStartY, spriteWidth, sliceHeight, imgW, imgH);
          spanStart = -1;
        }
      }
    }
    if (spanStart !== -1) {
      this.renderSpriteSpan(ctx, sourceImg, origLeft, spanStart, drawEndX, drawStartY, spriteWidth, sliceHeight, imgW, imgH);
    }
  }

  private renderSpriteSpan(
    ctx: CanvasRenderingContext2D,
    sourceImg: CanvasImageSource,
    origLeft: number,
    startCol: number,
    endCol: number,
    drawStartY: number,
    spriteWidth: number,
    sliceHeight: number,
    imgW: number,
    imgH: number
  ) {
    const colCount = endCol - startCol + 1;
    if (colCount <= 0 || spriteWidth <= 0) return;
    const srcX0 = Math.max(0, Math.min(imgW, ((startCol - origLeft) * imgW) / spriteWidth));
    const srcX1 = Math.max(0, Math.min(imgW, ((endCol + 1 - origLeft) * imgW) / spriteWidth));
    const srcW = Math.max(0.01, srcX1 - srcX0);
    ctx.drawImage(
      sourceImg,
      srcX0,
      0,
      srcW,
      imgH,
      startCol,
      drawStartY,
      colCount,
      sliceHeight
    );
  }

  private drawEnemyBillboard(
    ctx: CanvasRenderingContext2D,
    enemy: Enemy,
    spriteScreenX: number,
    feetY: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number,
    screenHeight: number
  ) {
    const img = this.getEnemyFrame(enemy);
    const imgW = img.width;
    const imgH = img.height;

    // 1. Aspect Ratio Locking:
    // Calculate sprite height based on distance, then strictly enforce spriteWidth = spriteHeight * (img.width / img.height)
    // so sprites never stretch or look like wide blocks.
    const spriteWidth = Math.round(spriteHeight * (imgW / imgH));
    const origLeft = spriteScreenX - spriteWidth / 2;
    const drawStartX = Math.max(0, Math.floor(origLeft));
    const drawEndX = Math.min(screenWidth - 1, Math.floor(origLeft + spriteWidth));

    if (drawStartX >= screenWidth || drawEndX < 0) return;

    // 5. Z-Index Wall Clipping check across horizontal span
    let visibleStripes = 0;
    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      if (stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe]) {
        visibleStripes++;
      }
    }
    if (visibleStripes === 0) return;

    // Corpse Fade-Out (vanishes smoothly after 1.5s)
    const prevAlpha = ctx.globalAlpha;
    let corpseAlpha = 1.0;
    if (enemy.state === 'dead' || enemy.state === 'gibbed') {
      const cTime = enemy.corpseTimer || 0;
      if (cTime > 1.5) {
        corpseAlpha = Math.max(0, 1.0 - (cTime - 1.5) / 1.5);
      }
    }

    // 2. Floor Contact Shadows:
    // Draw a semi-transparent black ellipse (rgba(0,0,0,0.5)) on the canvas at the sprite's bottom-center (feet level)
    // before drawing the enemy to anchor them to the ground.
    const shadowCol = Math.floor(spriteScreenX);
    const wallDistAtShadow = (shadowCol >= 0 && shadowCol < screenWidth) ? this.zBuffer[shadowCol] : Infinity;
    if (depth < wallDistAtShadow + 0.25) {
      const shadowRadiusX = Math.max(4, Math.round(spriteWidth * 0.38));
      const shadowRadiusY = Math.max(2, Math.round(shadowRadiusX * 0.35));
      ctx.save();
      ctx.globalAlpha = prevAlpha * corpseAlpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(spriteScreenX, feetY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Grounded Animation & Positioning:
    // Keep sprite feet anchored directly at feetY so enemies walk realistically on the floor without floating in the air.
    // Flying units (like lost_soul) handle their hover altitude naturally in their sprite generator and elevation.
    const drawStartY = Math.floor(feetY - spriteHeight);

    // 3. Distance Lighting & Fog Integration:
    // Apply distance-fog brightness scaling to enemy sprites (ctx.filter = brightness(...)) matching the wall slice fog math
    // so enemies blend into dark corridors.
    let fogFactor = 1.0 / (1.0 + depth * 0.085 + (depth * depth) * 0.009);
    fogFactor = Math.max(0.04, Math.min(1.0, fogFactor));

    // Muzzle flash omnidirectional illumination brightens nearby enemies
    if (this.curFlashLight > 0) {
      const flashBoost = this.curFlashLight * Math.max(0, 1 - depth / 11) * 0.85;
      fogFactor = Math.min(1.0, fogFactor + flashBoost);
    }

    // Dynamic lights illuminate nearby enemies (plasma bolts, rockets, portal, explosions)
    for (let li = 0; li < this.curDynamicLights.length; li++) {
      const dl = this.curDynamicLights[li];
      const dx = enemy.x - dl.x;
      const dy = enemy.y - dl.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < dl.radius * dl.radius) {
        const att = Math.max(0, 1 - Math.sqrt(dSq) / dl.radius) * dl.intensity * 0.45;
        fogFactor = Math.min(1.0, fogFactor + att);
      }
    }

    const isHitFlashing = (enemy.hitFlashTimer && enemy.hitFlashTimer > 0) || (enemy.state === 'pain' && (enemy.painTimer || 0) > 0.16);

    // Scratch canvas for high-impact white-flash hit reaction
    if (!this.scratchCanvas) {
      this.scratchCanvas = document.createElement('canvas');
      this.scratchCanvas.width = 128;
      this.scratchCanvas.height = 128;
      this.scratchCtx = this.scratchCanvas.getContext('2d', { willReadFrequently: false });
    }
    const sCtx = this.scratchCtx;
    let sourceImg: CanvasImageSource = img;
    if (isHitFlashing && sCtx) {
      sCtx.clearRect(0, 0, imgW, imgH);
      sCtx.globalCompositeOperation = 'source-over';
      sCtx.drawImage(img, 0, 0, imgW, imgH);
      const flashRatio = Math.min(1.0, (enemy.hitFlashTimer || 0.14) / 0.14);
      sCtx.globalCompositeOperation = 'source-atop';
      sCtx.fillStyle = `rgba(255, 255, 255, ${0.94 * flashRatio})`;
      sCtx.fillRect(0, 0, imgW, imgH);
      sCtx.globalCompositeOperation = 'source-over';
      sourceImg = this.scratchCanvas;
    }

    // 5. Z-Index Wall Clipping:
    // Ensure enemy vertical slices check against the raycaster's 1D distance buffer (zBuffer[x])
    // so enemies correctly hide behind wall edges without clipping glitches.
    ctx.save();
    ctx.globalAlpha = prevAlpha * corpseAlpha;
    if (isHitFlashing) {
      ctx.filter = `brightness(1.6) contrast(1.3)`;
    } else {
      ctx.filter = `brightness(${fogFactor.toFixed(3)})`;
    }

    this.drawClippedSpriteSpan(
      ctx,
      sourceImg,
      origLeft,
      drawStartX,
      drawEndX,
      drawStartY,
      spriteWidth,
      spriteHeight,
      imgW,
      imgH,
      depth,
      screenWidth
    );

    ctx.restore();
    ctx.filter = 'none';

    // 6. Combat Feedback: Glory Finisher & Stagger Indicators
    // ONLY smaller enemies (grunt, imp, scuttler, lost_soul) that are non-elite and non-boss are glory-killable
    const isSmallEnemy = !enemy.isElite && !enemy.isUltraBoss && enemy.type !== 'boss' && enemy.type !== 'baron' &&
      (enemy.type === 'grunt' || enemy.type === 'imp' || enemy.type === 'scuttler' || enemy.type === 'lost_soul');

    const isGloryKillable = isSmallEnemy && enemy.health > 0 && ((enemy.health <= enemy.maxHealth * 0.35) || enemy.state === 'staggered');
    const isStaggeredHeavy = !isSmallEnemy && enemy.health > 0 && enemy.state === 'staggered';

    if (visibleStripes > 3 && isGloryKillable && enemy.state !== 'dead' && enemy.state !== 'gibbed') {
      const pulse = 0.8 + Math.sin(this.curTime * 12) * 0.2;
      const pulseRing = 1.0 + Math.sin(this.curTime * 8) * 0.15;
      
      ctx.save();
      // Glowing golden execution beacon beneath feet
      ctx.globalAlpha = pulse * 0.75;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(spriteScreenX, feetY, Math.max(8, spriteWidth * 0.45 * pulseRing), Math.max(4, spriteWidth * 0.18 * pulseRing), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Floating Vulnerability Badge
      ctx.save();
      ctx.fillStyle = `rgba(251, 191, 36, ${pulse})`;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      const badgeText = enemy.state === 'staggered' ? '⚡ STAGGERED [FINISHER F] ⚡' : '⚡ FINISHER READY [F] ⚡';
      ctx.fillText(badgeText, spriteScreenX, drawStartY - 14);

      // Circling golden stun stars
      for (let s = 0; s < 3; s++) {
        const starAngle = this.curTime * 6 + (s * Math.PI * 2) / 3;
        const starX = spriteScreenX + Math.cos(starAngle) * (spriteWidth * 0.36);
        const starY = (drawStartY - 5) + Math.sin(starAngle) * 5;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(starX, starY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (visibleStripes > 3 && isStaggeredHeavy && enemy.state !== 'dead' && enemy.state !== 'gibbed') {
      // Staggered Heavy Demon / Elite / Boss: Stunned & vulnerable to gunfire, but IMMUNE to melee finisher
      const pulse = 0.8 + Math.sin(this.curTime * 10) * 0.2;
      ctx.save();
      ctx.fillStyle = `rgba(192, 132, 252, ${pulse})`;
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.fillText('⚡ STAGGERED [VULNERABLE] ⚡', spriteScreenX, drawStartY - (enemy.isElite ? 26 : 14));

      // Circling electric stun stars
      for (let s = 0; s < 3; s++) {
        const starAngle = this.curTime * 5 + (s * Math.PI * 2) / 3;
        const starX = spriteScreenX + Math.cos(starAngle) * (spriteWidth * 0.38);
        const starY = (drawStartY - 5) + Math.sin(starAngle) * 5;
        ctx.fillStyle = '#c084fc';
        ctx.beginPath();
        ctx.arc(starX, starY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Elite Enemy Electric Corona & Badge
    if (visibleStripes > 3 && enemy.isElite && enemy.state !== 'dead' && enemy.state !== 'gibbed') {
      ctx.save();
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 8;
      ctx.fillText('✦ ELITE ✦', spriteScreenX, drawStartY - (isStaggeredHeavy ? 26 : 14));

      // Electric spark arcs around head
      const sparkTime = this.curTime * 10 + enemy.id;
      for (let sp = 0; sp < 2; sp++) {
        const spAngle = sparkTime + sp * Math.PI;
        const sx = spriteScreenX + Math.cos(spAngle) * (spriteWidth * 0.28);
        const sy = drawStartY + Math.sin(spAngle * 1.5) * 6;
        ctx.fillStyle = sp % 2 === 0 ? '#e879f9' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Health bar for Baron / Boss / Elites if visible
    if (visibleStripes > 3 && enemy.health > 0 && (enemy.type === 'baron' || enemy.type === 'boss' || enemy.isElite)) {
      const isBoss = enemy.type === 'boss';
      // Only skip if non-boss at full health
      if (!isBoss && enemy.health >= enemy.maxHealth) {
        // Skip full health non-boss
      } else {
        const barW = Math.max(isBoss ? 45 : 30, spriteWidth * (isBoss ? 0.95 : 0.8));
        const barH = isBoss ? 7 : 5;
        const barX = spriteScreenX - barW / 2;
        const barY = drawStartY - (isGloryKillable ? 36 : (isBoss ? 28 : (enemy.isElite ? 22 : 10)));
        const hpPct = Math.max(0, enemy.health / enemy.maxHealth);

        ctx.save();
        // If boss, draw glowing Boss Name and Subtitle banner above health bar
        if (isBoss) {
          const bossName = enemy.bossName || (enemy.isUltraBoss ? 'THE WARDEN' : 'SECTOR BOSS');
          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.shadowColor = enemy.isUltraBoss ? '#a855f7' : '#ef4444';
          ctx.shadowBlur = 8;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`☠ ${bossName} ☠`, spriteScreenX, barY - 5);
        }

        ctx.fillStyle = '#000000';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        
        // Color-code health bar fill by boss type/elite
        if (isBoss) {
          if (enemy.stageBossId === 2) {
            ctx.fillStyle = '#22c55e';
          } else if (enemy.stageBossId === 3) {
            ctx.fillStyle = '#f97316';
          } else if (enemy.stageBossId === 4 || enemy.isUltraBoss) {
            ctx.fillStyle = '#a855f7';
          } else {
            ctx.fillStyle = '#ef4444';
          }
        } else {
          ctx.fillStyle = enemy.isElite ? '#a855f7' : '#ef4444';
        }
        ctx.fillRect(barX, barY, barW * hpPct, barH);
        ctx.restore();
      }
    }

    // Attack Telegraph Wind-Up Warning Indicator
    if (visibleStripes > 3 && enemy.health > 0 && enemy.state === 'attack') {
      ctx.save();
      const pulse = 0.8 + Math.sin(this.curTime * 18) * 0.2;
      const teleY = drawStartY + spriteHeight * 0.35;
      if (enemy.type === 'imp') {
        ctx.fillStyle = `rgba(34, 197, 94, ${pulse * 0.9})`;
        ctx.beginPath();
        ctx.arc(spriteScreenX - spriteWidth * 0.22, teleY, 4.5, 0, Math.PI * 2);
        ctx.arc(spriteScreenX + spriteWidth * 0.22, teleY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'lost_soul') {
        ctx.fillStyle = `rgba(249, 115, 22, ${pulse * 0.95})`;
        ctx.beginPath();
        ctx.arc(spriteScreenX, teleY + 4, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'baron') {
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse * 0.95})`;
        ctx.beginPath();
        ctx.arc(spriteScreenX, drawStartY + 8, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'plasma_gunner') {
        ctx.fillStyle = `rgba(56, 189, 248, ${pulse * 0.95})`;
        ctx.beginPath();
        ctx.arc(spriteScreenX + spriteWidth * 0.18, teleY, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'vile_spitter') {
        ctx.fillStyle = `rgba(168, 85, 247, ${pulse * 0.95})`;
        ctx.beginPath();
        ctx.arc(spriteScreenX, teleY, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Damaged Armor Sparks / Fluid Degradation
    if (visibleStripes > 3 && enemy.health > 0 && enemy.health < enemy.maxHealth * 0.5 && enemy.state !== 'dead') {
      ctx.save();
      const sparkCount = enemy.health < enemy.maxHealth * 0.25 ? 2 : 1;
      for (let s = 0; s < sparkCount; s++) {
        const sx = spriteScreenX + ((enemy.id * 17 + s * 31) % 10 - 5) * (spriteWidth * 0.05);
        const sy = drawStartY + spriteHeight * 0.45 + ((enemy.id * 23 + s * 13) % 10 - 5) * (spriteHeight * 0.04);
        ctx.fillStyle = (enemy.type === 'plasma_gunner' || enemy.type === 'boss') ? '#38bdf8' : '#ef4444';
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.restore();
    }

    // Fullbright Demonic Eye Luminescence in Darkness
    if (visibleStripes > 3 && enemy.health > 0 && enemy.state !== 'dead' && enemy.state !== 'gibbed' && depth < 18) {
      ctx.save();
      const eyeY = drawStartY + spriteHeight * 0.26;
      const eyeSpread = spriteWidth * 0.10;
      let eyeColor = '#ef4444';
      if (enemy.type === 'imp') eyeColor = '#22c55e';
      else if (enemy.type === 'lost_soul') eyeColor = '#fbbf24';
      else if (enemy.type === 'plasma_gunner') eyeColor = '#38bdf8';
      else if (enemy.type === 'vile_spitter') eyeColor = '#c084fc';
      else if (enemy.isElite) eyeColor = '#f43f5e';

      ctx.fillStyle = eyeColor;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 3;
      ctx.fillRect(spriteScreenX - eyeSpread, eyeY, Math.max(1.5, spriteWidth * 0.035), Math.max(1.5, spriteHeight * 0.025));
      ctx.fillRect(spriteScreenX + eyeSpread, eyeY, Math.max(1.5, spriteWidth * 0.035), Math.max(1.5, spriteHeight * 0.025));
      ctx.restore();
    }
  }

  private drawSteamBillboard(
    ctx: CanvasRenderingContext2D,
    steam: SteamParticle,
    spriteScreenX: number,
    spriteCenterY: number,
    spriteSize: number,
    transformY: number,
    width: number
  ) {
    if (spriteScreenX < -spriteSize || spriteScreenX > width + spriteSize) return;
    const alpha = Math.max(0, Math.min(1, 1.0 - (steam.life / steam.maxLife))) * 0.38;
    if (alpha <= 0.01) return;

    // Check Z-buffer at center
    const checkX = Math.floor(Math.max(0, Math.min(width - 1, spriteScreenX)));
    if (transformY > this.zBuffer[checkX] + 0.1) return;

    ctx.save();
    const grad = ctx.createRadialGradient(
      spriteScreenX,
      spriteCenterY,
      1,
      spriteScreenX,
      spriteCenterY,
      Math.max(2, spriteSize)
    );
    grad.addColorStop(0, `rgba(226, 232, 240, ${alpha})`);
    grad.addColorStop(0.5, `rgba(148, 163, 184, ${alpha * 0.5})`);
    grad.addColorStop(1, 'rgba(100, 116, 139, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(spriteScreenX, spriteCenterY, Math.max(2, spriteSize), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawProjectileBillboard(
    ctx: CanvasRenderingContext2D,
    proj: Projectile,
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number
  ) {
    // Check center column Z-Buffer
    if (spriteScreenX >= 0 && spriteScreenX < screenWidth && depth > this.zBuffer[spriteScreenX]) {
      return; // Occluded behind wall
    }

    const rad = Math.max(2.5, spriteWidth * (proj.radius || 0.18));
    const cx = spriteScreenX;
    const cy = drawStartY + (drawEndY - drawStartY) / 2;

    ctx.save();
    // Low, clean shadow blur to prevent blinding eye-strain halos
    ctx.shadowBlur = 3;

    if (proj.type === 'plasma_blue') {
      ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
      ctx.fillStyle = 'rgba(2, 132, 199, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'plasma_green') {
      ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
      ctx.fillStyle = 'rgba(21, 128, 61, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.68, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dcfce7';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'acid_glob') {
      ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(cx - rad * 0.2, cy - rad * 0.2, rad * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'rocket') {
      // Sleek ballistic rocket missile with small tail thruster
      ctx.shadowColor = 'rgba(234, 88, 12, 0.4)';
      const rw = rad * 1.8;
      const rh = rad * 0.9;
      // Dark metal casing
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - rw * 0.5, cy - rh * 0.5, rw * 0.7, rh);
      // Red warhead
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(cx + rw * 0.2, cy - rh * 0.5);
      ctx.lineTo(cx + rw * 0.5, cy);
      ctx.lineTo(cx + rw * 0.2, cy + rh * 0.5);
      ctx.closePath();
      ctx.fill();
      // Small exhaust flame
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(cx - rw * 0.55, cy, rh * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Molten incendiary fireball / plasma blast
      ctx.shadowColor = 'rgba(234, 88, 12, 0.45)';
      ctx.fillStyle = '#c2410c';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.30, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPickupBillboard(
    ctx: CanvasRenderingContext2D,
    pickup: PickupItem,
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number
  ) {
    const img = this.textures.itemCanvases[pickup.type] || this.textures.itemCanvases['medkit_small'];
    const imgW = img.width;
    const imgH = img.height;
    const origLeft = spriteScreenX - spriteWidth / 2;
    const sliceH = drawEndY - drawStartY + 1;
    if (sliceH <= 0) return;

    // Check if any part of sprite is visible
    let visibleStripes = 0;
    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      if (stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe]) {
        visibleStripes++;
      }
    }
    if (visibleStripes === 0) return;

    // 1. Soft additive glow halos behind high-tier pickups
    const haloConfig: Record<string, { inner: string; mid: string; mult: number }> = {
      infinite_dash_relic: { inner: 'rgba(56, 189, 248, 0.88)', mid: 'rgba(234, 179, 8, 0.42)', mult: 1.65 },
      berserk_sphere: { inner: 'rgba(239, 68, 68, 0.80)', mid: 'rgba(168, 85, 247, 0.38)', mult: 1.55 },
      weapon_plasma: { inner: 'rgba(56, 189, 248, 0.85)', mid: 'rgba(14, 165, 233, 0.38)', mult: 1.45 },
      weapon_chaingun: { inner: 'rgba(245, 158, 11, 0.80)', mid: 'rgba(217, 119, 6, 0.32)', mult: 1.35 },
      weapon_shotgun: { inner: 'rgba(249, 115, 22, 0.80)', mid: 'rgba(194, 65, 12, 0.32)', mult: 1.30 },
      armor_large: { inner: 'rgba(6, 182, 212, 0.80)', mid: 'rgba(14, 116, 144, 0.32)', mult: 1.30 },
      medkit_large: { inner: 'rgba(16, 185, 129, 0.80)', mid: 'rgba(5, 150, 105, 0.32)', mult: 1.30 },
      ammo_cells: { inner: 'rgba(139, 92, 246, 0.70)', mid: 'rgba(109, 40, 217, 0.28)', mult: 1.20 },
    };

    const halo = haloConfig[pickup.type];
    if (halo && spriteScreenX >= 0 && spriteScreenX < screenWidth && depth < this.zBuffer[spriteScreenX] + 0.3) {
      const cx = spriteScreenX;
      const cy = drawStartY + sliceH * 0.5;
      const pulse = 1.0 + Math.sin(this.curTime * 4.2 + pickup.bobPhase) * 0.16;
      const haloRadius = Math.max(14, (spriteWidth * 0.82) * halo.mult * pulse);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, haloRadius);
      grad.addColorStop(0, halo.inner);
      grad.addColorStop(0.42, halo.mid);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Distance-fog brightness scaling for the pickup sprite itself
    let fogFactor = 1.0 / (1.0 + depth * 0.085 + (depth * depth) * 0.009);
    fogFactor = Math.max(0.12, Math.min(1.0, fogFactor));
    if (this.curFlashLight > 0) {
      fogFactor = Math.min(1.0, fogFactor + this.curFlashLight * 0.55);
    }

    let sourceImg: CanvasImageSource = img;
    if (fogFactor < 0.96) {
      if (!this.scratchCanvas) {
        this.scratchCanvas = document.createElement('canvas');
        this.scratchCanvas.width = 128;
        this.scratchCanvas.height = 128;
        this.scratchCtx = this.scratchCanvas.getContext('2d', { willReadFrequently: false });
      }
      const sCtx = this.scratchCtx;
      if (sCtx) {
        sCtx.clearRect(0, 0, imgW, imgH);
        sCtx.globalCompositeOperation = 'source-over';
        sCtx.drawImage(img, 0, 0, imgW, imgH);
        const darkness = Math.min(0.85, 1.0 - fogFactor);
        sCtx.globalCompositeOperation = 'source-atop';
        sCtx.fillStyle = `rgba(${this.curFogColorR}, ${this.curFogColorG}, ${this.curFogColorB}, ${darkness})`;
        sCtx.fillRect(0, 0, imgW, imgH);
        sCtx.globalCompositeOperation = 'source-over';
        sourceImg = this.scratchCanvas;
      }
    }

    this.drawClippedSpriteSpan(
      ctx,
      sourceImg,
      origLeft,
      drawStartX,
      drawEndX,
      drawStartY,
      spriteWidth,
      sliceH,
      imgW,
      imgH,
      depth,
      screenWidth
    );
  }

  private drawChestBillboard(
    ctx: CanvasRenderingContext2D,
    chest: LootChest,
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number
  ) {
    const img = chest.opened ? this.textures.chestOpenCanvas : this.textures.chestCanvas;
    const imgW = img.width;
    const imgH = img.height;
    const origLeft = spriteScreenX - spriteWidth / 2;
    const sliceH = drawEndY - drawStartY + 1;
    if (sliceH <= 0) return;

    // Soft additive gold halo behind unopened loot chests
    if (!chest.opened && spriteScreenX >= 0 && spriteScreenX < screenWidth && depth < this.zBuffer[spriteScreenX] + 0.3) {
      const cx = spriteScreenX;
      const cy = drawStartY + sliceH * 0.55;
      const pulse = 1.0 + Math.sin(this.curTime * 3.5 + chest.x) * 0.14;
      const haloRadius = Math.max(14, (spriteWidth * 0.75) * 1.25 * pulse);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, haloRadius);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.55)');
      grad.addColorStop(0.4, 'rgba(217, 119, 6, 0.22)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.drawClippedSpriteSpan(
      ctx,
      img,
      origLeft,
      drawStartX,
      drawEndX,
      drawStartY,
      spriteWidth,
      sliceH,
      imgW,
      imgH,
      depth,
      screenWidth
    );
  }

  private drawGibBillboard(
    ctx: CanvasRenderingContext2D,
    gib: { gibType: string; size: number; life?: number; maxLife?: number },
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number
  ) {
    const img = this.textures.gibCanvases[gib.gibType] || this.textures.gibCanvases['meat'];
    const imgW = img.width;
    const imgH = img.height;
    const origLeft = spriteScreenX - spriteWidth / 2;
    const sliceH = drawEndY - drawStartY + 1;
    if (sliceH <= 0) return;

    let prevAlpha = ctx.globalAlpha;
    if (gib.life !== undefined && gib.maxLife !== undefined && gib.life > gib.maxLife - 1.2) {
      ctx.globalAlpha = Math.max(0, (gib.maxLife - gib.life) / 1.2);
    }

    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      if (stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe]) {
        const texX = Math.floor(((stripe - origLeft) * imgW) / spriteWidth);
        if (texX >= 0 && texX < imgW) {
          ctx.drawImage(
            img,
            texX,
            0,
            1,
            imgH,
            stripe,
            drawStartY,
            1,
            sliceH
          );
        }
      }
    }

    ctx.globalAlpha = prevAlpha;
  }

  private drawCasingBillboard(
    ctx: CanvasRenderingContext2D,
    casing: ShellCasing,
    drawStartX: number,
    drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number
  ) {
    const img = this.textures.casingCanvases[casing.casingType] || this.textures.casingCanvases['brass_bullet'];
    if (!img) return;
    const imgW = img.width;
    const imgH = img.height;
    const origLeft = spriteScreenX - spriteWidth / 2;
    const sliceH = drawEndY - drawStartY + 1;
    if (sliceH <= 0) return;

    let prevAlpha = ctx.globalAlpha;
    if (casing.life > casing.maxLife - 2.0) {
      ctx.globalAlpha = Math.max(0, (casing.maxLife - casing.life) / 2.0);
    }

    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      if (stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe]) {
        const texX = Math.floor(((stripe - origLeft) * imgW) / spriteWidth);
        if (texX >= 0 && texX < imgW) {
          ctx.drawImage(
            img,
            texX,
            0,
            1,
            imgH,
            stripe,
            drawStartY,
            1,
            sliceH
          );
        }
      }
    }

    ctx.globalAlpha = prevAlpha;
  }

  private drawSparkBillboard(
    ctx: CanvasRenderingContext2D,
    spark: { color: string; size: number },
    screenX: number,
    screenY: number,
    depth: number,
    screenWidth: number
  ) {
    if (screenX >= 0 && screenX < screenWidth && depth < this.zBuffer[screenX]) {
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, Math.max(1.5, (spark.size * 180) / depth), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPortalBillboard(
    ctx: CanvasRenderingContext2D,
    _drawStartX: number,
    _drawEndX: number,
    drawStartY: number,
    drawEndY: number,
    spriteScreenX: number,
    _spriteWidth: number,
    spriteHeight: number,
    depth: number,
    screenWidth: number,
    isUnlocked = true
  ) {
    const stagePortals = this.textures.portalCanvases[this.curStageNumber] || this.textures.portalCanvases[1];
    const numFrames = stagePortals ? stagePortals.length : 1;
    const frameIdx = isUnlocked ? (Math.floor(this.curTime * 6) % Math.max(1, numFrames)) : 0;
    const img = (stagePortals && stagePortals[frameIdx]) || this.textures.teleportCanvas;
    if (!img) return;

    // Strict Aspect Ratio Locking so portals never stretch or skew
    const actualWidth = spriteHeight * (img.width / img.height);
    const origLeft = spriteScreenX - actualWidth / 2;
    const pStartX = Math.max(0, Math.floor(origLeft));
    const pEndX = Math.min(screenWidth - 1, Math.floor(origLeft + actualWidth));
    const sliceH = drawEndY - drawStartY + 1;
    if (sliceH <= 0 || pStartX > pEndX) return;

    // Check if any part of portal is in front of walls
    let visibleCols = 0;
    for (let stripe = pStartX; stripe <= pEndX; stripe++) {
      if (depth < this.zBuffer[stripe]) {
        visibleCols++;
      }
    }
    if (visibleCols === 0) return;

    // 1. Stage-Specific Atmospheric Halo & Additive Volumetric Glow
    const portalHalos: Record<number, { core: string; mid: string }> = {
      1: { core: 'rgba(56, 189, 248, 0.75)', mid: 'rgba(2, 132, 199, 0.35)' },   // Cyan Tech
      2: { core: 'rgba(74, 222, 128, 0.75)', mid: 'rgba(22, 101, 52, 0.35)' },   // Emerald Toxic
      3: { core: 'rgba(249, 115, 22, 0.80)', mid: 'rgba(185, 28, 28, 0.40)' },   // Hellfire Crimson/Orange
      4: { core: 'rgba(192, 132, 252, 0.80)', mid: 'rgba(107, 33, 168, 0.38)' }, // Void Violet
      5: { core: 'rgba(251, 191, 36, 0.85)', mid: 'rgba(217, 119, 6, 0.42)' },   // Chrono Solar Gold
    };
    const halo = isUnlocked
      ? (portalHalos[this.curStageNumber] || portalHalos[1])
      : { core: 'rgba(239, 68, 68, 0.45)', mid: 'rgba(153, 27, 27, 0.20)' };

    if (spriteScreenX >= 0 && spriteScreenX < screenWidth && depth < this.zBuffer[spriteScreenX] + 0.5) {
      const cx = spriteScreenX;
      const cy = drawStartY + sliceH * 0.45;
      const pulse = isUnlocked ? (1.0 + Math.sin(this.curTime * 5.0) * 0.15) : (0.85 + Math.sin(this.curTime * 2.5) * 0.08);
      const haloRadius = Math.max(16, (actualWidth * (isUnlocked ? 0.85 : 0.55)) * pulse);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, haloRadius);
      grad.addColorStop(0, halo.core);
      grad.addColorStop(0.5, halo.mid);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic floor contact shockwave ring at portal base
      const footY = drawEndY;
      const ringRadiusX = Math.max(14, actualWidth * (isUnlocked ? 0.65 : 0.45) * pulse);
      const ringRadiusY = Math.max(4, ringRadiusX * 0.30);
      const floorGrad = ctx.createRadialGradient(cx, footY, 2, cx, footY, ringRadiusX);
      floorGrad.addColorStop(0, halo.core);
      floorGrad.addColorStop(0.6, halo.mid);
      floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = floorGrad;
      ctx.beginPath();
      ctx.ellipse(cx, footY, ringRadiusX, ringRadiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Render Portal Slices with Per-Column Z-Buffer Testing
    const imgW = img.width;
    const imgH = img.height;

    for (let stripe = pStartX; stripe <= pEndX; stripe++) {
      if (stripe >= 0 && stripe < screenWidth && depth < this.zBuffer[stripe]) {
        const texX = Math.floor(((stripe - origLeft) * imgW) / actualWidth);
        if (texX >= 0 && texX < imgW) {
          ctx.drawImage(
            img,
            texX,
            0,
            1,
            imgH,
            stripe,
            drawStartY,
            1,
            sliceH
          );
        }
      }
    }

    // 3. Dynamic Foreground Visuals (Active Vortex vs Locked Stasis Grid)
    if (spriteScreenX >= 0 && spriteScreenX < screenWidth && depth < this.zBuffer[spriteScreenX] + 0.5) {
      const cx = spriteScreenX;
      const cy = drawStartY + sliceH * 0.48;
      const t = this.curTime;

      if (isUnlocked) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Swirling orbital plasma rings
        for (let i = 0; i < 3; i++) {
          const angle = t * (2.2 + i * 0.8) + (i * Math.PI * 2) / 3;
          const rx = (actualWidth * 0.42) * (0.85 + Math.sin(t * 3 + i) * 0.15);
          const ry = rx * 0.38;
          const px = cx + Math.cos(angle) * rx;
          const py = cy + Math.sin(angle) * ry;

          ctx.fillStyle = halo.core;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, (actualWidth * 0.045)), 0, Math.PI * 2);
          ctx.fill();

          // Connected energy tracer trail
          ctx.strokeStyle = halo.mid;
          ctx.lineWidth = Math.max(1, actualWidth * 0.025);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, angle * 0.25, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Vertical ion beam shimmer down the portal center
        const beamGrad = ctx.createLinearGradient(cx - 3, drawStartY, cx + 3, drawEndY);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        beamGrad.addColorStop(0.3, halo.core);
        beamGrad.addColorStop(0.7, halo.core);
        beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = beamGrad;
        const beamW = Math.max(3, actualWidth * 0.12 * (1 + Math.sin(t * 8) * 0.25));
        ctx.fillRect(cx - beamW / 2, drawStartY, beamW, sliceH);

        ctx.restore();
      } else {
        // LOCKED STATE: Crimson Stasis Laser Grid & Warning Glyph
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        // Dark dormant stasis field overlay over opening
        const archW = actualWidth * 0.52;
        const archH = sliceH * 0.65;
        const archY = drawStartY + sliceH * 0.18;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(cx - archW / 2, archY, archW, archH);

        // Horizontal red quarantine laser barrier lines
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
        ctx.lineWidth = Math.max(1.5, actualWidth * 0.02);
        const numBeams = 5;
        for (let b = 1; b <= numBeams; b++) {
          const by = archY + (archH * b) / (numBeams + 1);
          const flicker = 0.6 + Math.sin(t * 12 + b) * 0.4;
          ctx.globalAlpha = flicker;
          ctx.beginPath();
          ctx.moveTo(cx - archW / 2, by);
          ctx.lineTo(cx + archW / 2, by);
          ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Central Stasis Lock Warning Glyph
        const lockSize = Math.max(12, actualWidth * 0.22);
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 1.5;

        // Draw lock body
        const lockX = cx - lockSize / 2;
        const lockY = cy - lockSize * 0.2;
        ctx.fillRect(lockX, lockY, lockSize, lockSize * 0.75);
        ctx.strokeRect(lockX, lockY, lockSize, lockSize * 0.75);

        // Lock shackle loop
        ctx.beginPath();
        ctx.arc(cx, lockY, lockSize * 0.32, Math.PI, 0);
        ctx.stroke();

        ctx.restore();
      }
    }
  }
}
