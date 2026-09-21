import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { Player, Enemy, PickupItem, LootChest, BossState, SecretArea } from '../types';
import {
  Maximize2,
  X,
  Compass,
  Crosshair,
  Shield,
  Skull,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export interface MinimapProps {
  engine?: GameEngine;
  // Fallbacks if engine is not provided directly
  player?: Player;
  grid?: number[][];
  enemies?: Enemy[];
  pickups?: PickupItem[];
  chests?: LootChest[];
  boss?: BossState;
  isLockdown?: boolean;
  secrets?: SecretArea[];
  exploredGrid?: boolean[][];
  exitPos?: { x: number; y: number };
  exitUnlocked?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCloseExpand?: () => void;
  onToggleVisibility?: () => void;
}

export const Minimap: React.FC<MinimapProps> = ({
  engine,
  player: propPlayer,
  grid: propGrid,
  enemies: propEnemies,
  pickups: propPickups,
  chests: propChests,
  boss: propBoss,
  isLockdown: propIsLockdown,
  secrets: propSecrets,
  exploredGrid: propExploredGrid,
  exitPos: propExitPos,
  exitUnlocked: propExitUnlocked,
  isExpanded = false,
  onToggleExpand,
  onCloseExpand,
  onToggleVisibility,
}) => {
  const cornerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const automapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // View settings
  const [radarFollowPlayer, setRadarFollowPlayer] = useState(false); // Default fits entire 32x32 tactical sector
  const [automapZoom, setAutomapZoom] = useState(1.0);
  const [automapPan, setAutomapPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  // Readouts for UI overlay
  const [stats, setStats] = useState({
    posX: 0,
    posY: 0,
    headingDeg: 0,
    cardinal: 'N',
    exploredPct: 0,
    hostilesAlive: 0,
    secretsFound: 0,
    totalSecrets: 0,
    exitUnlocked: false,
    stageName: 'SECTOR 1',
    stageNumber: 1,
  });

  // Helper to extract current state safely
  const getState = useCallback(() => {
    if (engine) {
      return {
        player: engine.player,
        grid: engine.mapData.grid,
        enemies: engine.mapData.enemies,
        pickups: engine.mapData.pickups,
        chests: engine.mapData.chests,
        boss: engine.boss,
        isLockdown: engine.isLockdown,
        secrets: engine.mapData.secrets,
        exploredGrid: engine.exploredGrid,
        exitPos: engine.mapData.exitPos,
        exitUnlocked: engine.mapData.exitUnlocked,
        neutralZone: engine.mapData.neutralZone,
        stageName: engine.mapData.stageName,
        stageNumber: engine.mapData.stageNumber,
        gameTime: engine.gameTime,
      };
    }

    return {
      player: propPlayer || { x: 16, y: 28, angle: -Math.PI / 2, health: 100, armor: 50 },
      grid: propGrid || [],
      enemies: propEnemies || [],
      pickups: propPickups || [],
      chests: propChests || [],
      boss: propBoss || { active: false, health: 0, maxHealth: 100, name: 'BOSS', shieldActive: false, isEnraged: false },
      isLockdown: Boolean(propIsLockdown),
      secrets: propSecrets || [],
      exploredGrid: propExploredGrid,
      exitPos: propExitPos,
      exitUnlocked: Boolean(propExitUnlocked),
      neutralZone: { minY: 41.5, maxY: 46.5, minX: 18.0, maxX: 30.0 },
      stageName: 'SECTOR 1',
      stageNumber: 1,
      gameTime: performance.now() / 1000,
    };
  }, [
    engine,
    propPlayer,
    propGrid,
    propEnemies,
    propPickups,
    propChests,
    propBoss,
    propIsLockdown,
    propSecrets,
    propExploredGrid,
    propExitPos,
    propExitUnlocked,
  ]);

  // Main 60 FPS RequestAnimationFrame Render Loop for Radar & Automap
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let radarAngle = 0;
    let statsUpdateTimer = 0;

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      radarAngle = (radarAngle + dt * 2.8) % (Math.PI * 2);

      const state = getState();
      const { player, grid, enemies, pickups, chests, boss, isLockdown, secrets, exploredGrid, exitPos, exitUnlocked, neutralZone, stageName, stageNumber, gameTime } = state;

      const mapH = grid.length || 32;
      const mapW = grid[0]?.length || 32;

      // Update UI statistics periodically (5 Hz for smooth readouts without excess React re-renders)
      statsUpdateTimer += dt;
      if (statsUpdateTimer > 0.2) {
        statsUpdateTimer = 0;
        let totalFloors = 0;
        let exploredFloors = 0;
        for (let y = 0; y < mapH; y++) {
          for (let x = 0; x < mapW; x++) {
            if (grid[y]?.[x] === 0) {
              totalFloors++;
              if (exploredGrid?.[y]?.[x]) {
                exploredFloors++;
              }
            }
          }
        }
        const exploredPct = totalFloors > 0 ? Math.round((exploredFloors / totalFloors) * 100) : 100;
        const hostilesAlive = enemies.filter((e) => e.health > 0).length;
        const secretsFound = secrets.filter((s) => s.revealed).length;

        // Heading: 0 deg = East (+X), 90 deg = South (+Y), 180 deg = West (-X), 270 deg = North (-Y)
        const headingDeg = Math.round((((player.angle * 180) / Math.PI) % 360 + 360) % 360);
        let cardinal = 'E';
        if (headingDeg >= 337.5 || headingDeg < 22.5) cardinal = 'E';
        else if (headingDeg >= 22.5 && headingDeg < 67.5) cardinal = 'SE';
        else if (headingDeg >= 67.5 && headingDeg < 112.5) cardinal = 'S';
        else if (headingDeg >= 112.5 && headingDeg < 157.5) cardinal = 'SW';
        else if (headingDeg >= 157.5 && headingDeg < 202.5) cardinal = 'W';
        else if (headingDeg >= 202.5 && headingDeg < 247.5) cardinal = 'NW';
        else if (headingDeg >= 247.5 && headingDeg < 292.5) cardinal = 'N';
        else if (headingDeg >= 292.5 && headingDeg < 337.5) cardinal = 'NE';

        setStats({
          posX: Math.round(player.x * 10) / 10,
          posY: Math.round(player.y * 10) / 10,
          headingDeg,
          cardinal,
          exploredPct,
          hostilesAlive,
          secretsFound,
          totalSecrets: secrets.length,
          exitUnlocked,
          stageName,
          stageNumber,
        });
      }

      // 1. Draw Corner HUD Radar
      if (cornerCanvasRef.current) {
        drawMap(cornerCanvasRef.current, {
          player,
          grid,
          enemies,
          pickups,
          chests,
          boss,
          isLockdown,
          secrets,
          exploredGrid,
          exitPos,
          exitUnlocked,
          neutralZone,
          gameTime,
          radarAngle,
          isFollowMode: radarFollowPlayer,
          zoom: radarFollowPlayer ? 2.2 : 1.0,
          pan: { x: 0, y: 0 },
          isExpanded: false,
        });
      }

      // 2. Draw Full Tactical Automap Overlay (if active)
      if (isExpanded && automapCanvasRef.current) {
        drawMap(automapCanvasRef.current, {
          player,
          grid,
          enemies,
          pickups,
          chests,
          boss,
          isLockdown,
          secrets,
          exploredGrid,
          exitPos,
          exitUnlocked,
          neutralZone,
          gameTime,
          radarAngle,
          isFollowMode: false,
          zoom: automapZoom,
          pan: automapPan,
          isExpanded: true,
        });
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [getState, isExpanded, radarFollowPlayer, automapZoom, automapPan]);

  // Core Tactical Map Renderer
  const drawMap = (
    canvas: HTMLCanvasElement,
    params: {
      player: Player;
      grid: number[][];
      enemies: Enemy[];
      pickups: PickupItem[];
      chests?: LootChest[];
      boss: BossState;
      isLockdown: boolean;
      secrets: SecretArea[];
      exploredGrid?: boolean[][];
      exitPos?: { x: number; y: number };
      exitUnlocked: boolean;
      neutralZone?: { minY: number; maxY: number; minX: number; maxX: number };
      gameTime: number;
      radarAngle: number;
      isFollowMode: boolean;
      zoom: number;
      pan: { x: number; y: number };
      isExpanded: boolean;
    }
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const {
      player,
      grid,
      enemies,
      pickups,
      chests,
      boss,
      isLockdown,
      secrets,
      exploredGrid,
      exitPos,
      exitUnlocked,
      neutralZone,
      gameTime,
      radarAngle,
      isFollowMode,
      zoom,
      pan,
      isExpanded,
    } = params;

    const width = canvas.width;
    const height = canvas.height;
    const mapH = grid.length || 32;
    const mapW = grid[0]?.length || 32;

    // Clear canvas
    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep tactical command background
    ctx.fillStyle = '#020612';
    ctx.fillRect(0, 0, width, height);

    // Coordinate space transformations
    let cellSize: number;
    let originX: number;
    let originY: number;

    if (isFollowMode) {
      // Centered on player with local zoom
      cellSize = (width / 14) * zoom;
      originX = width / 2 - player.x * cellSize + pan.x;
      originY = height / 2 - player.y * cellSize + pan.y;
    } else {
      // Sector Overview with zoom & pan
      const baseCell = Math.min(width / mapW, height / mapH);
      cellSize = baseCell * zoom;
      originX = (width - mapW * cellSize) / 2 + pan.x;
      originY = (height - mapH * cellSize) / 2 + pan.y;
    }

    // Clip to canvas area
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    // 1. Draw Subtle Tactical Grid Lines (every 4 tiles)
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = 'rgba(30, 58, 138, 0.2)';
    for (let x = 0; x <= mapW; x += 4) {
      const gx = originX + x * cellSize;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let y = 0; y <= mapH; y += 4) {
      const gy = originY + y * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // 2. Draw Explored Floors and Walls
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const isExplored = exploredGrid ? Boolean(exploredGrid[y]?.[x]) : true;
        if (!isExplored) continue; // Unexplored remains pitch black

        const cx = originX + x * cellSize;
        const cy = originY + y * cellSize;

        // Frustum cull cells outside visible canvas
        if (cx + cellSize < 0 || cx > width || cy + cellSize < 0 || cy > height) {
          continue;
        }

        const cell = grid[y][x];
        if (cell > 0) {
          // Explored Wall
          if (cell === 5) {
            // Lockdown Blast Door
            if (isLockdown) {
              const pulse = 0.6 + Math.sin(gameTime * 6) * 0.4;
              ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
            } else {
              ctx.fillStyle = '#64748b';
            }
          } else if (cell === 7) {
            ctx.fillStyle = '#991b1b'; // Demonic chamber wall
          } else {
            ctx.fillStyle = '#1e293b'; // Standard steel tech wall
          }

          ctx.fillRect(cx, cy, cellSize + 0.4, cellSize + 0.4);

          // Wall inner high-tech border
          ctx.strokeStyle = cell === 5 ? (isLockdown ? '#ef4444' : '#94a3b8') : '#334155';
          ctx.lineWidth = Math.max(0.75, cellSize * 0.08);
          ctx.strokeRect(cx, cy, cellSize, cellSize);
        } else {
          // Explored Walkable Floor / Corridor
          ctx.fillStyle = '#0a1120';
          ctx.fillRect(cx, cy, cellSize, cellSize);

          // Faint tile contour
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(cx, cy, cellSize, cellSize);
        }
      }
    }

    // 3. Draw Discovered Secrets (strictly hidden until discovered/revealed)
    for (const sec of secrets) {
      if (sec.revealed) {
        const isDoorExplored = exploredGrid ? Boolean(exploredGrid[sec.doorY]?.[sec.doorX]) : true;
        if (isDoorExplored) {
          const sx = originX + (sec.doorX + 0.5) * cellSize;
          const sy = originY + (sec.doorY + 0.5) * cellSize;

          // Revealed secret passage: Golden pulsing star
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(sx, sy, cellSize * 0.45, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (isExpanded) {
            ctx.fillStyle = '#fde047';
            ctx.font = `bold ${Math.max(8, cellSize * 0.6)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText('★ SECRET', sx, sy - cellSize * 0.6);
          }
        }
      }
    }

    // 4. Draw Exit Portal (Extraction Point) - ONLY shown when unlocked after level boss is defeated
    if (exitPos && exitUnlocked) {
      const ex = originX + (exitPos.x + 0.5) * cellSize;
      const ey = originY + (exitPos.y + 0.5) * cellSize;

      // Unlocked Exit Portal: Pulsating emerald beacon with radar shockwave rings
      const pulse = (gameTime * 2) % 1;
      const ringRadius = cellSize * (0.6 + pulse * 1.5);

      // Outer shockwave
      ctx.strokeStyle = `rgba(34, 197, 94, ${1 - pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ex, ey, ringRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner portal core
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(ex, ey, cellSize * 0.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Exit label
      ctx.fillStyle = '#4ade80';
      ctx.font = `bold ${Math.max(7, cellSize * 0.65)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', ex, ey - cellSize * 0.7);
    }

    // 4b. Draw Safe Staging Bunker Zone
    if (neutralZone) {
      const nzx = originX + neutralZone.minX * cellSize;
      const nzy = originY + neutralZone.minY * cellSize;
      const nzw = (neutralZone.maxX - neutralZone.minX) * cellSize;
      const nzh = (neutralZone.maxY - neutralZone.minY) * cellSize;

      ctx.fillStyle = 'rgba(6, 78, 59, 0.18)';
      ctx.fillRect(nzx, nzy, nzw, nzh);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(nzx, nzy, nzw, nzh);
      ctx.setLineDash([]);

      if (isExpanded) {
        ctx.fillStyle = '#34d399';
        ctx.font = `bold ${Math.max(7, cellSize * 0.45)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ SAFE BUNKER', nzx + nzw / 2, nzy + nzh / 2);
      }
    }

    // 5. Draw Pickups (in explored cells)
    for (const pk of pickups) {
      if (pk.collected) continue;
      const px = Math.floor(pk.x);
      const py = Math.floor(pk.y);
      const isExplored = exploredGrid ? Boolean(exploredGrid[py]?.[px]) : true;
      if (!isExplored) continue;

      // Ensure secret items are completely hidden until secret passage is revealed
      const isBehindClosedSecret = secrets.some(s => !s.revealed && Math.hypot(pk.x - (s.doorX + 0.5), pk.y - (s.doorY + 0.5)) < 2.5);
      if (isBehindClosedSecret) continue;

      const screenX = originX + pk.x * cellSize;
      const screenY = originY + pk.y * cellSize;

      const r = Math.max(2, cellSize * 0.35);

      const pkType = pk?.type || '';

      if (pkType.includes('health')) {
        // Cyan / Blue Medical Cross
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(screenX - r * 0.3, screenY - r, r * 0.6, r * 2);
        ctx.fillRect(screenX - r, screenY - r * 0.3, r * 2, r * 0.6);
      } else if (pkType.includes('armor')) {
        // Teal Shield Diamond
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - r);
        ctx.lineTo(screenX + r, screenY);
        ctx.lineTo(screenX, screenY + r);
        ctx.lineTo(screenX - r, screenY);
        ctx.closePath();
        ctx.fill();
      } else if (pkType.includes('weapon') || pkType.includes('berserk')) {
        // Golden / Magenta Star
        ctx.fillStyle = pkType.includes('berserk') ? '#ec4899' : '#facc15';
        ctx.beginPath();
        ctx.arc(screenX, screenY, r * 1.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      } else {
        // Ammo crate (Amber square)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(screenX - r * 0.8, screenY - r * 0.8, r * 1.6, r * 1.6);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(screenX - r * 0.8, screenY - r * 0.8, r * 1.6, r * 1.6);
      }
    }

    // 6. Draw Supply Chests
    if (chests) {
      for (const c of chests) {
        const cx = Math.floor(c.x);
        const cy = Math.floor(c.y);
        const isExplored = exploredGrid ? Boolean(exploredGrid[cy]?.[cx]) : true;
        if (!isExplored) continue;

        // Ensure secret chests are completely hidden until secret passage is revealed
        const isBehindClosedSecret = secrets.some(s => !s.revealed && Math.hypot(c.x - (s.doorX + 0.5), c.y - (s.doorY + 0.5)) < 2.5);
        if (isBehindClosedSecret) continue;

        const screenX = originX + c.x * cellSize;
        const screenY = originY + c.y * cellSize;
        const cr = Math.max(2.5, cellSize * 0.35);

        if (!c.opened) {
          // Closed supply chest: Bronze/Gold body with shiny lock
          ctx.fillStyle = '#d97706';
          ctx.fillRect(screenX - cr, screenY - cr * 0.7, cr * 2, cr * 1.4);
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 0.75;
          ctx.strokeRect(screenX - cr, screenY - cr * 0.7, cr * 2, cr * 1.4);
          // Lock latch
          ctx.fillStyle = '#fde047';
          ctx.fillRect(screenX - cr * 0.25, screenY - cr * 0.2, cr * 0.5, cr * 0.4);
        } else {
          // Opened supply chest: Dim metallic base
          ctx.fillStyle = '#78350f';
          ctx.fillRect(screenX - cr, screenY - cr * 0.7, cr * 2, cr * 1.4);
        }
      }
    }

    // 6.5 Draw Safe Staging Area Perimeter
    if (neutralZone) {
      const nzx = originX + neutralZone.minX * cellSize;
      const nzy = originY + neutralZone.minY * cellSize;
      const nzw = (neutralZone.maxX - neutralZone.minX) * cellSize;
      const nzh = (neutralZone.maxY - neutralZone.minY) * cellSize;

      ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.fillRect(nzx, nzy, nzw, nzh);

      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.strokeRect(nzx, nzy, nzw, nzh);
      ctx.setLineDash([]);

      if (isExpanded) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = `bold ${Math.max(7, cellSize * 0.45)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ SAFE STAGING AREA', nzx + nzw / 2, nzy + nzh / 2);
      }
    }

    // 7. Draw Enemies & Boss
    for (const e of enemies) {
      if (e.health <= 0) {
        // Slain hostile: faint gray skull/x
        if (isExpanded) {
          const ex = Math.floor(e.x);
          const ey = Math.floor(e.y);
          if (exploredGrid ? exploredGrid[ey]?.[ex] : true) {
            const screenX = originX + e.x * cellSize;
            const screenY = originY + e.y * cellSize;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            const xr = Math.max(2, cellSize * 0.25);
            ctx.beginPath();
            ctx.moveTo(screenX - xr, screenY - xr);
            ctx.lineTo(screenX + xr, screenY + xr);
            ctx.moveTo(screenX + xr, screenY - xr);
            ctx.lineTo(screenX - xr, screenY + xr);
            ctx.stroke();
          }
        }
        continue;
      }

      const ex = Math.floor(e.x);
      const ey = Math.floor(e.y);
      const isExplored = exploredGrid ? Boolean(exploredGrid[ey]?.[ex]) : true;
      const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);

      // Show if in explored zone OR within auditory/motion proximity (< 6.0 tiles)
      if (isExplored || distToPlayer < 6.0) {
        const screenX = originX + e.x * cellSize;
        const screenY = originY + e.y * cellSize;

        // Draw Enemy Tactical Field of View Cone on Radar
        const isAlerted = e.state === 'chase' || e.state === 'search' || e.state === 'attack' || e.state === 'pain';
        const coneHalfAngle = isAlerted ? 0.915 : 0.655; // ~52° or ~37° half angle
        const coneLen = cellSize * (isAlerted ? 3.8 : 2.6);

        ctx.fillStyle = isAlerted ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.15)';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.arc(screenX, screenY, coneLen, e.angle - coneHalfAngle, e.angle + coneHalfAngle);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isAlerted ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        if (e.type === 'boss') {
          // Heavy Cyber Boss: Large crimson hazard marker with warning pulse
          const pulse = Math.sin(gameTime * 5) * 0.2;
          const bossRadius = Math.max(6, cellSize * (1.2 + pulse));

          // Warning hazard radius
          ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(screenX, screenY, bossRadius * 1.6, 0, Math.PI * 2);
          ctx.stroke();

          // Crimson boss core
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(screenX, screenY, bossRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Health bar over boss
          const barW = bossRadius * 2.5;
          const barH = 3;
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX - barW / 2, screenY - bossRadius - 6, barW, barH);
          ctx.fillStyle = '#ef4444';
          const hpPct = Math.max(0, e.health / (e.maxHealth || 1));
          ctx.fillRect(screenX - barW / 2, screenY - bossRadius - 6, barW * hpPct, barH);

          if (isExpanded) {
            ctx.fillStyle = '#fca5a5';
            ctx.font = `bold ${Math.max(8, cellSize * 0.65)}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(boss.name || 'CYBER TITAN', screenX, screenY - bossRadius - 8);
          }
        } else if (e.type === 'baron' || e.isElite) {
          // Baron of Hell / Elite Demon: Diamond shape
          const r = Math.max(3.5, cellSize * 0.7);
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - r);
          ctx.lineTo(screenX + r, screenY);
          ctx.lineTo(screenX, screenY + r);
          ctx.lineTo(screenX - r, screenY);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(screenX, screenY, r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Standard Hostile: Red Blip with subtle threat pulse
          const r = Math.max(2.5, cellSize * 0.45);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#7f1d1d';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // 8. Draw Player: Vision Cone, Directional Arrow, and Sweeping Radar Scan
    const px = originX + player.x * cellSize;
    const py = originY + player.y * cellSize;

    // A. Vision Field Cone (FOV ~66 degrees)
    const fov = 1.15;
    const coneLen = cellSize * 5.5;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, coneLen, player.angle - fov / 2, player.angle + fov / 2);
    ctx.closePath();
    ctx.fill();

    // B. Rotating Tactical Radar Sweep Line (adds high-tech sensor scan immersion)
    const sweepLen = cellSize * 6.5;
    const sweepEndX = px + Math.cos(radarAngle) * sweepLen;
    const sweepEndY = py + Math.sin(radarAngle) * sweepLen;

    const sweepGrad = ctx.createRadialGradient(px, py, 0, px, py, sweepLen);
    sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
    sweepGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
    ctx.strokeStyle = sweepGrad;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sweepEndX, sweepEndY);
    ctx.stroke();

    // C. Directional Operative Arrowhead
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.angle);

    const arrowSize = Math.max(5, cellSize * 0.85);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(arrowSize * 1.2, 0); // Tip
    ctx.lineTo(-arrowSize * 0.8, arrowSize * 0.7); // Left wing
    ctx.lineTo(-arrowSize * 0.4, 0); // Inner notch
    ctx.lineTo(-arrowSize * 0.8, -arrowSize * 0.7); // Right wing
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    // D. Operative Core Blip
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(px, py, Math.max(2, cellSize * 0.25), 0, Math.PI * 2);
    ctx.fill();

    // E. Outer Compass / Bounds Border
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(originX, originY, mapW * cellSize, mapH * cellSize);

    ctx.restore();
  };

  // Automap Drag-to-Pan Handlers
  const handleAutomapMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...automapPan };
  };

  const handleAutomapMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setAutomapPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleAutomapMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleAutomapWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setAutomapZoom((prev) => Math.min(3.5, Math.max(0.6, prev + (e.deltaY < 0 ? 0.2 : -0.2))));
  };

  const resetAutomapView = () => {
    setAutomapZoom(1.0);
    setAutomapPan({ x: 0, y: 0 });
  };

  const centerOnPlayer = () => {
    setAutomapZoom(1.8);
    const canvas = automapCanvasRef.current;
    if (!canvas) return;
    const state = getState();
    const cellSize = (canvas.width / 32) * 1.8;
    setAutomapPan({
      x: canvas.width / 2 - state.player.x * cellSize - (canvas.width - 32 * cellSize) / 2,
      y: canvas.height / 2 - state.player.y * cellSize - (canvas.height - 32 * cellSize) / 2,
    });
  };

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* 1. CORNER HUD RADAR (Always visible, responsive, interactive) */}
      {/* ------------------------------------------------------------- */}
      <div
        id="minimap-panel"
        className="relative bg-neutral-950/90 border-2 border-cyan-600/70 rounded-md p-1.5 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.25)] select-none pointer-events-auto transition-all"
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-cyan-900/60 text-[9px] font-mono-tech">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
            <span className="text-cyan-300 font-bold tracking-wider uppercase">RADAR</span>
            <span className="text-neutral-500 font-bold hidden sm:inline">32x32</span>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1">
            {/* View Mode: Fit Sector vs Follow Operative */}
            <button
              id="radar-toggle-follow-btn"
              onClick={() => setRadarFollowPlayer((prev) => !prev)}
              className={`p-1 rounded cursor-pointer transition-colors ${
                radarFollowPlayer
                  ? 'bg-cyan-600 text-black font-bold'
                  : 'text-gray-400 hover:text-cyan-300 hover:bg-neutral-800'
              }`}
              title={radarFollowPlayer ? 'Switch to Full Sector View' : 'Switch to Follow Operative'}
            >
              <Crosshair className="w-3 h-3" />
            </button>

            {/* Expand Automap (Tab) */}
            {onToggleExpand && (
              <button
                id="radar-expand-btn"
                onClick={onToggleExpand}
                className="p-1 rounded text-gray-400 hover:text-amber-300 hover:bg-neutral-800 cursor-pointer transition-colors"
                title="Expand Tactical Automap (Tab)"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}

            {/* Close / Hide Radar (M) */}
            {onToggleVisibility && (
              <button
                id="radar-close-btn"
                onClick={onToggleVisibility}
                className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-neutral-800 cursor-pointer transition-colors"
                title="Hide Radar (M)"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Radar Canvas with double-resolution crispness */}
        <div
          className="relative cursor-pointer group"
          onClick={onToggleExpand}
          title="Click to expand Tactical Automap"
        >
          <canvas
            ref={cornerCanvasRef}
            width={280}
            height={280}
            className="w-28 h-28 sm:w-36 sm:h-36 block rounded bg-black border border-cyan-900/40"
          />

          {/* Subtle hover prompt */}
          <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded">
            <span className="text-[8px] font-pixel text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded border border-cyan-500">
              [TAB] EXPAND
            </span>
          </div>
        </div>

        {/* Live Coordinate & Exploration Readouts */}
        <div className="pt-1 mt-1 border-t border-cyan-900/60 flex items-center justify-between text-[8px] sm:text-[9px] font-mono-tech text-neutral-400">
          <span className="text-cyan-400 font-bold">
            POS: <strong className="text-gray-200">{stats.posX},{stats.posY}</strong>
          </span>
          <span className="text-amber-400 font-bold">
            DIR: <strong className="text-amber-300">{stats.cardinal}</strong>
          </span>
          <span className="text-emerald-400 font-bold">
            EXP: <strong className="text-emerald-300">{stats.exploredPct}%</strong>
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FULL TACTICAL AUTOMAP OVERLAY (Opened via TAB or Expand)    */}
      {/* ------------------------------------------------------------- */}
      {isExpanded && (
        <div
          id="tactical-automap-overlay"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fade-in pointer-events-auto"
        >
          <div className="max-w-4xl w-full bg-neutral-950 border-2 border-cyan-500 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.35)] flex flex-col max-h-[95vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-neutral-900/90 border-b border-cyan-800/80 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-cyan-400 animate-spin-slow" />
                <div>
                  <h2 className="text-xs sm:text-sm font-pixel text-cyan-400 font-bold tracking-wider">
                    UAC TACTICAL AUTOMAP SYSTEM
                  </h2>
                  <div className="text-[10px] font-mono-tech text-neutral-400">
                    STAGE {stats.stageNumber}: <strong className="text-amber-400">{stats.stageName}</strong> // LIVE SENSOR MATRIX
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAutomapView}
                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-mono-tech rounded flex items-center gap-1 border border-neutral-700 cursor-pointer"
                  title="Reset Zoom & Center (1x)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RESET</span>
                </button>

                <button
                  onClick={centerOnPlayer}
                  className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-mono-tech rounded flex items-center gap-1 border border-cyan-700 cursor-pointer"
                  title="Center on Operative"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">LOCATE</span>
                </button>

                <button
                  onClick={onCloseExpand}
                  className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-300 text-xs font-pixel rounded flex items-center gap-1 border border-red-700 cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                  title="Close Automap (TAB / ESC)"
                >
                  <X className="w-4 h-4" />
                  <span>CLOSE</span>
                </button>
              </div>
            </div>

            {/* Tactical Sector Stats Bar */}
            <div className="bg-neutral-950 border-b border-neutral-800 px-4 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-tech">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">EXPLORATION:</span>
                <span className="text-emerald-400 font-bold">{stats.exploredPct}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">HOSTILES:</span>
                <span className={`font-bold ${stats.hostilesAlive > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {stats.hostilesAlive > 0 ? `${stats.hostilesAlive} ACTIVE` : 'SECTOR PURGED'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">SECRETS:</span>
                <span className="text-amber-400 font-bold">
                  {stats.secretsFound} / {stats.totalSecrets} DISCOVERED
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">EXTRACTION GATE:</span>
                <span className={`font-bold ${stats.exitUnlocked ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`}>
                  {stats.exitUnlocked ? 'ONLINE (READY)' : 'DORMANT (DEFEAT BOSS)'}
                </span>
              </div>
            </div>

            {/* Interactive Automap Canvas */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden p-2">
              <canvas
                ref={automapCanvasRef}
                width={560}
                height={560}
                onMouseDown={handleAutomapMouseDown}
                onMouseMove={handleAutomapMouseMove}
                onMouseUp={handleAutomapMouseUp}
                onMouseLeave={handleAutomapMouseUp}
                onWheel={handleAutomapWheel}
                className="max-w-full max-h-[55vh] sm:max-h-[60vh] aspect-square block rounded border border-cyan-800/80 cursor-grab active:cursor-grabbing shadow-2xl"
              />

              {/* In-Canvas Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 bg-neutral-900/90 border border-neutral-700 p-1 rounded backdrop-blur">
                <button
                  onClick={() => setAutomapZoom((z) => Math.min(3.5, z + 0.3))}
                  className="p-1.5 text-gray-300 hover:text-cyan-300 hover:bg-neutral-800 rounded cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAutomapZoom((z) => Math.max(0.6, z - 0.3))}
                  className="p-1.5 text-gray-300 hover:text-cyan-300 hover:bg-neutral-800 rounded cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </div>

              {/* Drag instruction notice */}
              <div className="absolute top-4 left-4 text-[9px] font-mono-tech text-neutral-500 pointer-events-none bg-black/60 px-2 py-1 rounded">
                💡 DRAG TO PAN // SCROLL TO ZOOM
              </div>
            </div>

            {/* Tactical Legend Footer */}
            <div className="bg-neutral-900/95 border-t border-neutral-800 px-4 py-2.5 text-[9px] sm:text-[10px] font-mono-tech flex flex-wrap items-center justify-between gap-3 text-neutral-300">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-white border border-cyan-400 rounded-full" />
                  <span>OPERATIVE</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <span>HOSTILE</span>
                </div>
                <div className="flex items-center gap-1">
                  <Skull className="w-3 h-3 text-red-500" />
                  <span>BOSS</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-emerald-400 font-bold">EXIT GATE</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-sky-400" />
                  <span>HEALTH</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-cyan-400 transform rotate-45" />
                  <span>ARMOR</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-amber-400" />
                  <span>AMMO</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                  <span>SECRET</span>
                </div>
              </div>

              <div className="text-neutral-500 text-[8px] font-pixel">
                PRESS <kbd className="px-1 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700">TAB</kbd> OR <kbd className="px-1 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700">ESC</kbd> TO RETURN TO COMBAT
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
