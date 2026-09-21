/**
 * Procedural Pixel Art Texture & Sprite Generator for 90s Retro Raycaster.
 * Produces crisp, authentic pixel graphics on HTML5 Canvas with zero external assets.
 */

import { generateAllWeaponSprites } from './weaponSprites';
import { generateAllEnemySprites } from './enemySprites';
import { generateAllPickupSprites } from './pickupSprites';
import { generateAllPortalSprites } from './portalSprites';

export interface TextureMap {
  walls: ImageData[];
  floors: ImageData[];
  ceilings: ImageData[];
}

export class TextureManager {
  private static instance: TextureManager;
  public wallTextures: ImageData[] = [];
  public wallCanvases: HTMLCanvasElement[] = [];
  public wallPixels: Uint32Array[] = [];
  public animatedWallPixels: Record<number, Uint32Array[]> = {};
  public floorTextures: ImageData[] = [];
  public floorPixels: Uint32Array[] = [];
  public animatedFloorPixels: Record<number, Uint32Array[]> = {};
  public ceilingTextures: ImageData[] = [];
  public ceilingPixels: Uint32Array[] = [];
  
  // Pre-rendered offscreen canvases for sprites & weapons
  public weaponCanvases: Record<string, HTMLCanvasElement[]> = {};
  public enemyCanvases: Record<string, HTMLCanvasElement[]> = {};
  public ultraBossCanvases: HTMLCanvasElement[] = [];
  public stageBossCanvases: Record<number, HTMLCanvasElement[]> = {};
  public portalCanvases: Record<number, HTMLCanvasElement[]> = {};
  public teleportCanvas: HTMLCanvasElement | null = null;
  public chestCanvas: HTMLCanvasElement | null = null;
  public chestOpenCanvas: HTMLCanvasElement | null = null;
  public itemCanvases: Record<string, HTMLCanvasElement> = {};
  public gibCanvases: Record<string, HTMLCanvasElement> = {};
  public casingCanvases: Record<string, HTMLCanvasElement> = {};
  public decalCanvases: Record<string, HTMLCanvasElement> = {};
  public faceCanvases: Record<string, HTMLCanvasElement> = {};

  public readonly TEX_SIZE = 64;

  public static getInstance(): TextureManager {
    if (!TextureManager.instance) {
      TextureManager.instance = new TextureManager();
      TextureManager.instance.generateAll();
    }
    return TextureManager.instance;
  }

  public getWallPixels(texIdx: number, time = 0): Uint32Array {
    const animFrames = this.animatedWallPixels[texIdx];
    if (animFrames && animFrames.length > 0) {
      const fIdx = Math.floor(time * 5.5) % animFrames.length;
      return animFrames[fIdx];
    }
    return this.wallPixels[texIdx] || this.wallPixels[0];
  }

  public getFloorPixels(floorIdx: number, time = 0): Uint32Array {
    const animFrames = this.animatedFloorPixels[floorIdx];
    if (animFrames && animFrames.length > 0) {
      const fIdx = Math.floor(time * 5.5) % animFrames.length;
      return animFrames[fIdx];
    }
    return this.floorPixels[floorIdx] || this.floorPixels[0];
  }

  public getCeilingPixels(ceilIdx: number, time = 0): Uint32Array {
    return this.ceilingPixels[ceilIdx] || this.ceilingPixels[0];
  }

  public generateAll() {
    this.generateWallTextures();
    this.generateFloorAndCeilingTextures();
    this.generateWeaponSprites();
    this.generateEnemySprites();
    this.generateItemSprites();
    this.generateGibAndDecalSprites();
    this.generateFaceSprites();
  }

  // --- WALL TEXTURES ---
  private generateWallTextures() {
    const size = this.TEX_SIZE;

    const wallBuilders: ((ctx: CanvasRenderingContext2D) => void)[] = [
      // 0: Tech Wall Alpha (Reinforced gunmetal titanium panels, bevelled seams, glowing cyan data conduits, countersunk bolts)
      (ctx) => {
        // Base gunmetal armor plate
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(0, 0, size, size);

        // Micro-texture noise & steel grain
        ctx.fillStyle = '#263342';
        for (let i = 0; i < 90; i++) {
          const nx = (i * 17) % size;
          const ny = (i * 29) % size;
          ctx.fillRect(nx, ny, 2, 1);
        }

        // Heavy bevelled frame border
        ctx.strokeStyle = '#0e141c';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size - 2, size - 2);

        // Top/Left bevel highlight
        ctx.strokeStyle = '#475d77';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, size - 3); ctx.lineTo(2, 2); ctx.lineTo(size - 3, 2);
        ctx.stroke();

        // Inner panel indentation (Rounded Chamfer Panel)
        ctx.fillStyle = '#141b24';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(8, 8, size - 16, size - 16, 8); else ctx.rect(8, 8, size - 16, size - 16);
        ctx.fill();
        ctx.strokeStyle = '#2d3d50';
        ctx.stroke();

        // Pulsing turquoise fiber-optic energy conduits (Pill / Capsule)
        ctx.fillStyle = '#0891b2';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(10, 18, size - 20, 4, 2);
          ctx.roundRect(10, 42, size - 20, 4, 2);
        } else {
          ctx.rect(10, 18, size - 20, 4);
          ctx.rect(10, 42, size - 20, 4);
        }
        ctx.fill();

        // Industrial hex rivets with circular specular drop highlights
        [[6, 6], [size - 7, 6], [6, size - 7], [size - 7, size - 7], [6, 31], [size - 7, 31]].forEach(([bx, by]) => {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath(); ctx.arc(bx + 1, by + 1, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#94a3b8';
          ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath(); ctx.arc(bx - 0.5, by - 0.5, 0.8, 0, Math.PI * 2); ctx.fill();
        });
      },

      // 1: Brutal Hell Obsidian Brick (Volcanic basalt stone blocks with glowing magma mortar and dried blood rivulets)
      (ctx) => {
        ctx.fillStyle = '#1f0808';
        ctx.fillRect(0, 0, size, size);

        // Basalt block rows
        const rows = 4;
        const rowH = size / rows;
        for (let r = 0; r < rows; r++) {
          const y = r * rowH;
          const cols = 2;
          const colW = size / cols;
          const xOffset = (r % 2) * (colW / 2);

          for (let c = -1; c <= cols; c++) {
            const x = c * colW + xOffset;
            // Stone face
            ctx.fillStyle = (r + c) % 2 === 0 ? '#2d0d0d' : '#381010';
            ctx.fillRect(x + 1, y + 1, colW - 2, rowH - 2);

            // Rough stone grain
            ctx.fillStyle = '#4a1717';
            ctx.fillRect(x + 4, y + 3, colW - 8, 2);
            ctx.fillRect(x + 2, y + 8, 4, 3);

            // Magma fissure mortar lines
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(x, y + rowH - 1, colW, 1);
            ctx.fillRect(x + colW - 1, y, 1, rowH);
            ctx.fillStyle = '#ea580c';
            ctx.fillRect(x + 2, y + rowH - 1, 4, 1);
          }
        }

        // Dark coagulated blood spatters & drips
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(16, 0, 4, 28);
        ctx.fillRect(18, 28, 3, 14);
        ctx.fillRect(44, 0, 5, 38);
        ctx.fillRect(46, 38, 3, 16);
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(17, 2, 2, 24);
      },

      // 2: Corrugated Heavy Steel Bulkhead (Deep shadowed ribs, oxidized rust stains, heavy rivets)
      (ctx) => {
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 0, size, size);

        // Corrugated vertical steel ribs with specular light & deep occlusion
        for (let x = 0; x < size; x += 8) {
          ctx.fillStyle = '#52525b'; // Highlight rib edge
          ctx.fillRect(x, 0, 1, size);
          ctx.fillStyle = '#3f3f46'; // Face
          ctx.fillRect(x + 1, 0, 3, size);
          ctx.fillStyle = '#18181b'; // Shadow crevice
          ctx.fillRect(x + 4, 0, 4, size);
        }

        // Industrial rust & corrosion patches
        ctx.fillStyle = '#78350f';
        ctx.fillRect(10, 14, 18, 16);
        ctx.fillRect(36, 34, 22, 20);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(12, 16, 12, 10);
        ctx.fillRect(38, 36, 14, 12);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(14, 18, 6, 6);

        // Structural cross-beam plates top and bottom
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, 0, size, 6);
        ctx.fillRect(0, size - 6, size, 6);
        ctx.strokeStyle = '#09090b';
        ctx.strokeRect(0, 0, size, 6);
        ctx.strokeRect(0, size - 6, size, 6);

        // Heavy industrial bolts
        ctx.fillStyle = '#a1a1aa';
        for (let x = 4; x < size; x += 12) {
          ctx.fillRect(x, 2, 2, 2);
          ctx.fillRect(x, size - 4, 2, 2);
        }
      },

      // 3: Biohazard Mutagenic Reactor Wall (Carbon composite frame, illuminated bubbling green acid chamber, caution chevrons)
      (ctx) => {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, size, size);

        // Reinforced containment frame
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(2, 2, size - 4, size - 4);
        ctx.strokeStyle = '#030712';
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Glass containment tube in center
        ctx.fillStyle = '#052e16';
        ctx.fillRect(14, 0, 36, size);

        // Glowing luminous toxic green acid
        ctx.fillStyle = '#15803d';
        ctx.fillRect(18, 0, 28, size);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(22, 0, 20, size);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(26, 4, 6, size - 8);

        // Radioactive bubbles
        ctx.fillStyle = '#dcfce7';
        ctx.fillRect(28, 12, 4, 4);
        ctx.fillRect(36, 28, 5, 5);
        ctx.fillRect(26, 44, 4, 4);
        ctx.fillRect(38, 52, 3, 3);

        // Warning Hazard Chevrons on top and bottom headers
        for (let x = 0; x < size; x += 12) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x, 0, 6, 6);
          ctx.fillRect(x, size - 6, 6, 6);
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 6, 0, 6, 6);
          ctx.fillRect(x + 6, size - 6, 6, 6);
        }
      },

      // 4: Heavy Armored Blast Gate (Hydraulic locking pistons, hazard warning lights, reinforced skull crest)
      (ctx) => {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, size, size);

        // Bevelled armored blast door
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(4, 4, size - 8, size - 8);
        ctx.fillStyle = '#27272a';
        ctx.fillRect(8, 8, size - 16, size - 16);
        ctx.strokeStyle = '#09090b';
        ctx.strokeRect(8, 8, size - 16, size - 16);

        // Hydraulic steel pistons
        ctx.fillStyle = '#71717a';
        ctx.fillRect(10, 12, 6, 40);
        ctx.fillRect(size - 16, 12, 6, 40);
        ctx.fillStyle = '#d4d4d8';
        ctx.fillRect(11, 14, 2, 36);
        ctx.fillRect(size - 15, 14, 2, 36);

        // Skull Crest / Lockdown Insignia
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(22, 20, 20, 16);
        ctx.fillRect(25, 36, 14, 10);
        // Eye sockets & nasal cavity
        ctx.fillStyle = '#000000';
        ctx.fillRect(26, 24, 4, 6);
        ctx.fillRect(34, 24, 4, 6);
        ctx.fillRect(30, 32, 4, 4);

        // Warning Strobe Siren Beacon
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(26, 4, 12, 4);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(29, 5, 6, 2);
      },

      // 5: Demonic Runestone Pentagram (Deeply carved volcanic basalt with glowing blood-red occult pentagram)
      (ctx) => {
        ctx.fillStyle = '#140c0c';
        ctx.fillRect(0, 0, size, size);

        // Ancient stone relief border
        ctx.strokeStyle = '#291414';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Glowing runic circle
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(32, 32, 23, 0, Math.PI * 2);
        ctx.stroke();

        // Pentagram 5-point star
        ctx.beginPath();
        const pts: [number, number][] = [];
        for (let i = 0; i < 5; i++) {
          const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
          pts.push([32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20]);
        }
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.closePath();
        ctx.stroke();

        // Glowing arcane center core
        ctx.fillStyle = '#f87171';
        ctx.fillRect(30, 30, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(31, 31, 2, 2);

        // Arcane script markings in 4 corners
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(6, 6, 4, 2); ctx.fillRect(8, 8, 2, 4);
        ctx.fillRect(size - 10, 6, 4, 2); ctx.fillRect(size - 10, 8, 2, 4);
        ctx.fillRect(6, size - 10, 4, 2); ctx.fillRect(8, size - 8, 2, 4);
        ctx.fillRect(size - 10, size - 10, 4, 2); ctx.fillRect(size - 10, size - 8, 2, 4);
      },

      // 6: Concealed Stealth Bulkhead / Secret Receding Wall (Stealthy, seamless blend with surrounding walls with subtle mechanical tells)
      (ctx) => {
        // Base matches surrounding gunmetal & composite armor plates
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(0, 0, size, size);

        // Subtle steel grain & micro-texture noise
        ctx.fillStyle = '#263342';
        for (let i = 0; i < 80; i++) {
          const nx = (i * 19) % size;
          const ny = (i * 31) % size;
          ctx.fillRect(nx, ny, 2, 1);
        }

        // Heavy bevelled frame border matching adjacent walls
        ctx.strokeStyle = '#0e141c';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, size - 2, size - 2);

        // Top/Left subtle highlight bevel
        ctx.strokeStyle = '#3b4c60';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, size - 3); ctx.lineTo(2, 2); ctx.lineTo(size - 3, 2);
        ctx.stroke();

        // Inner recessed panel (identical chamfer proportions to standard tech panels)
        ctx.fillStyle = '#161e28';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') ctx.roundRect(8, 8, size - 16, size - 16, 6); else ctx.rect(8, 8, size - 16, size - 16);
        ctx.fill();
        ctx.strokeStyle = '#253242';
        ctx.stroke();

        // Very faint, hairline vertical hydraulic sliding seam (stealth tell 1)
        ctx.fillStyle = '#0d131a';
        ctx.fillRect(31, 8, 1, size - 16);

        // Subtle floor track recess shadow at the bottom edge (stealth tell 2)
        ctx.fillStyle = '#080c10';
        ctx.fillRect(8, size - 11, size - 16, 2);

        // Standard countersunk rivets at the 4 corners
        [[12, 12], [size - 13, 12], [12, size - 13], [size - 13, size - 13]].forEach(([bx, by]) => {
          ctx.fillStyle = '#090d14';
          ctx.beginPath(); ctx.arc(bx + 1, by + 1, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#64748b';
          ctx.beginPath(); ctx.arc(bx, by, 1.2, 0, Math.PI * 2); ctx.fill();
        });

        // Faint weathered surface abrasion across the seam (stealth tell 3 - only visible upon close inspection)
        ctx.strokeStyle = '#2d3b4e';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 28); ctx.lineTo(32, 31); ctx.lineTo(39, 29);
        ctx.stroke();
      },

      // 7: Dimensional Rift Portal Gateway (Swirling cobalt vortex, quantum event horizon, runic energy conduits)
      (ctx) => {
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, size, size);

        // Gateway housing arch
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Swirling radial plasma vortex
        const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 28);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, '#67e8f9');
        grad.addColorStop(0.55, '#0284c7');
        grad.addColorStop(0.85, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 27, 0, Math.PI * 2);
        ctx.fill();

        // Energy focus emitters
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(29, 4, 6, 8);
        ctx.fillRect(29, 52, 6, 8);
        ctx.fillRect(4, 29, 8, 6);
        ctx.fillRect(52, 29, 8, 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(31, 6, 2, 4);
        ctx.fillRect(31, 54, 2, 4);
        ctx.fillRect(6, 31, 4, 2);
        ctx.fillRect(54, 31, 4, 2);
      },

      // 8: Cyber Supercomputer Matrix Terminal (Multi-screen tactical monitors, green oscilloscopes, digital wave graphs)
      (ctx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, size, size);

        // Frame
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, 2, size - 4, size - 4);
        ctx.strokeStyle = '#020617';
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Top Main CRT Screen (Phosphor green telemetry)
        ctx.fillStyle = '#022c22';
        ctx.fillRect(6, 6, size - 12, 24);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(6, 6, size - 12, 24);

        // Waveform on screen
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 8; x < size - 8; x += 2) {
          const wy = 18 + Math.sin(x * 0.4) * 6;
          if (x === 8) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();

        // Bottom Screen (Diagnostics readouts)
        ctx.fillStyle = '#082f49';
        ctx.fillRect(6, 34, 32, 22);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8, 38, 20, 2);
        ctx.fillRect(8, 43, 26, 2);
        ctx.fillRect(8, 48, 16, 2);

        // Blinkenlights matrix
        for (let y = 36; y <= 52; y += 5) {
          ctx.fillStyle = (y % 2 === 0) ? '#22c55e' : '#ef4444';
          ctx.fillRect(44, y, 3, 3);
          ctx.fillStyle = (y % 3 === 0) ? '#eab308' : '#38bdf8';
          ctx.fillRect(50, y, 3, 3);
        }
      },

      // 9: Gothic Crypt Basalt Pillar (Ancient damp stone blocks with moss, torch sconce mount, and bloodstains)
      (ctx) => {
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, size, size);

        // Heavy stone blocks
        ctx.strokeStyle = '#0c0a09';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, size, size);
        ctx.strokeRect(4, 4, size - 8, size - 8);

        // Damp moss patches
        ctx.fillStyle = '#14532d';
        ctx.fillRect(6, size - 18, 16, 12);
        ctx.fillRect(36, size - 14, 18, 8);
        ctx.fillStyle = '#166534';
        ctx.fillRect(8, size - 14, 8, 6);

        // Iron torch bracket mount in center
        ctx.fillStyle = '#292524';
        ctx.fillRect(28, 14, 8, 14);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(30, 16, 4, 10);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(30, 10, 4, 4);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(31, 11, 2, 2);
      }
    ];

    this.wallTextures = [];
    this.wallCanvases = [];

    wallBuilders.forEach((builder) => {
      const canvas = this.createCanvas(size, size, builder);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const imgData = ctx ? ctx.getImageData(0, 0, size, size) : new ImageData(size, size);
      this.wallCanvases.push(canvas);
      this.wallTextures.push(imgData);
    });
    this.wallPixels = this.wallTextures.map((img) => new Uint32Array(img.data.buffer));

    // Generate multi-frame animated wall textures
    this.animatedWallPixels = {};

    // 1. Wall 3: Biohazard Mutagenic Reactor (4 animated bubbling frames)
    this.animatedWallPixels[3] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(2, 2, size - 4, size - 4);
        ctx.strokeStyle = '#030712';
        ctx.strokeRect(2, 2, size - 4, size - 4);

        ctx.fillStyle = '#052e16';
        ctx.fillRect(14, 0, 36, size);
        ctx.fillStyle = '#15803d';
        ctx.fillRect(18, 0, 28, size);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(22, 0, 20, size);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(26, 4, 6, size - 8);

        // Rising animated mutagen bubbles
        ctx.fillStyle = '#dcfce7';
        const b1Y = (12 - f * 8 + size) % size;
        const b2Y = (28 - f * 8 + size) % size;
        const b3Y = (44 - f * 8 + size) % size;
        ctx.fillRect(28, b1Y, 4, 4);
        ctx.fillRect(36, b2Y, 5, 5);
        ctx.fillRect(25, b3Y, 4, 4);

        for (let x = 0; x < size; x += 12) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x, 0, 6, 6);
          ctx.fillRect(x, size - 6, 6, 6);
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 6, 0, 6, 6);
          ctx.fillRect(x + 6, size - 6, 6, 6);
        }
      });
      this.animatedWallPixels[3].push(new Uint32Array(imgData.data.buffer));
    }

    // 2. Wall 7: Dimensional Rift Portal Gateway (4 rotating vortex frames)
    this.animatedWallPixels[7] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, size, size);
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        const grad = ctx.createRadialGradient(32, 32, 2 + f * 2, 32, 32, 28);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.25, '#67e8f9');
        grad.addColorStop(0.55, '#0284c7');
        grad.addColorStop(0.85, '#0f172a');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(32, 32, 27, 0, Math.PI * 2);
        ctx.fill();

        // Rotating energy pulses
        const angleOff = (f * Math.PI) / 2;
        ctx.fillStyle = '#38bdf8';
        for (let a = 0; a < 4; a++) {
          const rad = angleOff + (a * Math.PI) / 2;
          const px = 32 + Math.cos(rad) * 18;
          const py = 32 + Math.sin(rad) * 18;
          ctx.fillRect(px - 2, py - 2, 4, 4);
        }
      });
      this.animatedWallPixels[7].push(new Uint32Array(imgData.data.buffer));
    }

    // 3. Wall 8: Cyber Supercomputer Matrix Terminal (4 scrolling code & waveform frames)
    this.animatedWallPixels[8] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, 2, size - 4, size - 4);
        ctx.strokeStyle = '#020617';
        ctx.strokeRect(2, 2, size - 4, size - 4);

        ctx.fillStyle = '#022c22';
        ctx.fillRect(6, 6, size - 12, 24);
        ctx.strokeStyle = '#10b981';
        ctx.strokeRect(6, 6, size - 12, 24);

        // Animated oscillating sine wave
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 8; x < size - 8; x += 2) {
          const wy = 18 + Math.sin((x + f * 6) * 0.45) * 6;
          if (x === 8) ctx.moveTo(x, wy);
          else ctx.lineTo(x, wy);
        }
        ctx.stroke();

        ctx.fillStyle = '#082f49';
        ctx.fillRect(6, 34, 32, 22);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8, 38 + ((f * 3) % 12), 22, 2);
        ctx.fillRect(8, 43, 26, 2);

        // Blinkenlights matrix cycling
        for (let y = 36; y <= 52; y += 5) {
          ctx.fillStyle = ((y + f) % 2 === 0) ? '#22c55e' : '#ef4444';
          ctx.fillRect(44, y, 3, 3);
          ctx.fillStyle = ((y + f) % 3 === 0) ? '#eab308' : '#38bdf8';
          ctx.fillRect(50, y, 3, 3);
        }
      });
      this.animatedWallPixels[8].push(new Uint32Array(imgData.data.buffer));
    }

    // 4. Wall 6: Concealed Secret Wall / Telegraphed Hydraulic Seam (4 subtle pulsing diode frames)
    this.animatedWallPixels[6] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#1e2836';
        ctx.fillRect(0, 0, size, size);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, size - 4, size - 4);

        // Vertical sliding hydraulic split line
        ctx.fillStyle = '#090d14';
        ctx.fillRect(31, 0, 2, size);

        // Structural stress fracture / crack across seam
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(14, 18); ctx.lineTo(32, 26); ctx.lineTo(24, 38); ctx.lineTo(32, 46); ctx.lineTo(50, 52);
        ctx.stroke();

        // Pulsing amber/golden optical sensor diode
        const pulseColors = ['#ca8a04', '#eab308', '#facc15', '#eab308'];
        const coreColors = ['#facc15', '#fef08a', '#ffffff', '#fef08a'];
        ctx.fillStyle = pulseColors[f];
        ctx.fillRect(28, 28, 8, 8);
        ctx.fillStyle = coreColors[f];
        ctx.fillRect(30, 30, 4, 4);

        // Hydraulic latch vents
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(10, 52, 12, 3);
        ctx.fillRect(42, 52, 12, 3);
      });
      this.animatedWallPixels[6].push(new Uint32Array(imgData.data.buffer));
    }
  }
  private generateFloorAndCeilingTextures() {
    const size = this.TEX_SIZE;

    // Floor 0: Diamond Tread Industrial Steel (Grip metal with specular highlights and corner hex bolts)
    this.floorTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#181b22';
      ctx.fillRect(0, 0, size, size);

      // Diamond tread pattern
      for (let x = 0; x < size; x += 8) {
        for (let y = 0; y < size; y += 8) {
          const shift = (y % 16 === 0) ? 0 : 4;
          const px = (x + shift) % size;
          ctx.fillStyle = '#333b4d';
          ctx.fillRect(px + 1, y + 2, 4, 2);
          ctx.fillStyle = '#475569';
          ctx.fillRect(px + 2, y + 2, 2, 1);
          ctx.fillStyle = '#0f1217';
          ctx.fillRect(px + 1, y + 4, 4, 1);
        }
      }

      // Panel seam border
      ctx.strokeStyle = '#090b0e';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

      // Steel bolts
      ctx.fillStyle = '#64748b';
      [[3, 3], [size - 5, 3], [3, size - 5], [size - 5, size - 5]].forEach(([rx, ry]) => {
        ctx.fillRect(rx, ry, 2, 2);
      });
    }));

    // Floor 1: Demonic Bloodstone Pavers (Weathered dark flagstone with dried blood pools and magma veins)
    this.floorTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#221816';
      ctx.fillRect(0, 0, size, size);

      // Stone paver tiles
      ctx.strokeStyle = '#0f0a09';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 32, 32);
      ctx.strokeRect(32, 0, 32, 32);
      ctx.strokeRect(0, 32, 32, 32);
      ctx.strokeRect(32, 32, 32, 32);

      // Dark blood puddle
      ctx.fillStyle = '#5c1313';
      ctx.fillRect(12, 8, 38, 32);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(16, 12, 28, 22);
      ctx.fillStyle = '#3f0c0c';
      ctx.fillRect(22, 18, 16, 12);
    }));

    // Floor 2: High-Tech Cyber Carbon Hex Tiles (Carbon composite with glowing cyan power conduits)
    this.floorTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, size, size);

      // Carbon weave
      ctx.fillStyle = '#161b22';
      ctx.fillRect(2, 2, size - 4, size - 4);
      ctx.strokeStyle = '#030712';
      ctx.strokeRect(2, 2, size - 4, size - 4);

      // Illuminated turquoise conduit cross
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(29, 0, 6, size);
      ctx.fillRect(0, 29, size, 6);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(31, 0, 2, size);
      ctx.fillRect(0, 31, size, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(31, 31, 2, 2);
    }));

    // Floor 3: Toxic Radioactive Acid Sludge (Luminous bubbling mutagenic green slime)
    this.floorTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#052e16';
      ctx.fillRect(0, 0, size, size);

      // Acid fluid layers
      ctx.fillStyle = '#15803d';
      ctx.fillRect(4, 4, size - 8, size - 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(10, 8, 44, 44);

      // Sludge bubbles
      ctx.fillStyle = '#86efac';
      ctx.fillRect(14, 16, 8, 8);
      ctx.fillRect(36, 22, 10, 10);
      ctx.fillRect(24, 42, 6, 6);
      ctx.fillStyle = '#dcfce7';
      ctx.fillRect(16, 18, 3, 3);
      ctx.fillRect(39, 24, 4, 4);
    }));

    // Floor 4: Molten Magma Fissures (Fiery molten volcanic crust with glowing heat cracks)
    this.floorTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#1c0707';
      ctx.fillRect(0, 0, size, size);

      // Magma cracks
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(8, 0, 12, size);
      ctx.fillRect(0, 24, size, 14);

      ctx.fillStyle = '#ea580c';
      ctx.fillRect(11, 0, 6, size);
      ctx.fillRect(0, 27, size, 8);

      ctx.fillStyle = '#fde047';
      ctx.fillRect(13, 0, 2, size);
      ctx.fillRect(0, 30, size, 2);
    }));

    // Ceiling 0: High-Tech Industrial Grating & Recessed Fluorescent Light Tube
    this.ceilingTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#12151c';
      ctx.fillRect(0, 0, size, size);

      // Recessed metallic ceiling panel
      ctx.fillStyle = '#1f2430';
      ctx.fillRect(4, 4, size - 8, size - 8);
      ctx.strokeStyle = '#080a0f';
      ctx.strokeRect(4, 4, size - 8, size - 8);

      // Recessed fluorescent tube fixture
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(24, 0, 16, size);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(27, 0, 10, size);
      ctx.fillStyle = '#f0f9ff';
      ctx.fillRect(30, 0, 4, size);
    }));

    // Ceiling 1: Volcanic Obsidian Cavern Roof with Magma Veins
    this.ceilingTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#1c0808';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#3f1010';
      for (let i = 0; i < 30; i++) {
        ctx.fillRect((i * 19) % size, (i * 23) % size, 6, 4);
      }
      ctx.fillStyle = '#991b1b';
      for (let i = 0; i < 15; i++) {
        ctx.fillRect((i * 31) % size, (i * 13) % size, 3, 3);
      }
    }));

    // Ceiling 2: Cyber Matrix Ceiling Conduit Trays
    this.ceilingTextures.push(this.createImageData(size, size, (ctx) => {
      ctx.fillStyle = '#080b12';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#131c2e';
      ctx.fillRect(6, 6, size - 12, size - 12);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(6, 6, size - 12, size - 12);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(30, 0, 4, size);
    }));

    // Pre-calculate 32-bit pixel buffers
    this.floorPixels = this.floorTextures.map((img) => new Uint32Array(img.data.buffer));
    this.ceilingPixels = this.ceilingTextures.map((img) => new Uint32Array(img.data.buffer));

    // Multi-frame animated floors
    this.animatedFloorPixels = {};

    // Floor 3: Animated Toxic Acid Sludge (4 frames of undulating bubbles & fluid ripples)
    this.animatedFloorPixels[3] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#052e16';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#15803d';
        ctx.fillRect(4, 4, size - 8, size - 8);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(10, 8, 44, 44);

        // Animated sludge bubbles
        ctx.fillStyle = '#86efac';
        const bub1X = (14 + f * 4) % 48;
        const bub2Y = (22 + f * 5) % 48;
        ctx.fillRect(bub1X, 16, 8, 8);
        ctx.fillRect(36, bub2Y, 10, 10);
        ctx.fillRect(24, (42 - f * 3 + 48) % 48, 6, 6);

        ctx.fillStyle = '#dcfce7';
        ctx.fillRect(bub1X + 2, 18, 3, 3);
        ctx.fillRect(38, bub2Y + 2, 4, 4);
      });
      this.animatedFloorPixels[3].push(new Uint32Array(imgData.data.buffer));
    }

    // Floor 4: Animated Molten Magma Fissures (4 frames of pulsing heat cracks)
    this.animatedFloorPixels[4] = [];
    for (let f = 0; f < 4; f++) {
      const imgData = this.createImageData(size, size, (ctx) => {
        ctx.fillStyle = '#1c0707';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#991b1b';
        ctx.fillRect(8, 0, 12, size);
        ctx.fillRect(0, 24, size, 14);

        // Pulsing heat glow
        const glowShift = Math.sin((f * Math.PI) / 2) * 2;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(11 - glowShift, 0, 6 + glowShift * 2, size);
        ctx.fillRect(0, 27 - glowShift, size, 8 + glowShift * 2);

        ctx.fillStyle = f % 2 === 0 ? '#fde047' : '#ffffff';
        ctx.fillRect(13, 0, 2, size);
        ctx.fillRect(0, 30, size, 2);
      });
      this.animatedFloorPixels[4].push(new Uint32Array(imgData.data.buffer));
    }
  }

  // --- WEAPON SPRITES ---
  private generateWeaponSprites() {
    this.weaponCanvases = generateAllWeaponSprites(this.createCanvas.bind(this));
  }

  // --- ENEMY SPRITES (MUTANTS & ZOMBIES) ---
  private generateEnemySprites() {
    const { enemyCanvases, ultraBossCanvases, stageBossCanvases } = generateAllEnemySprites(this.createCanvas.bind(this));
    this.enemyCanvases = enemyCanvases;
    this.ultraBossCanvases = ultraBossCanvases;
    this.stageBossCanvases = stageBossCanvases;
  }

  // --- SCI-FI ITEM / PICKUP & PORTAL SPRITES ---
  private generateItemSprites() {
    this.itemCanvases = generateAllPickupSprites(this.createCanvas.bind(this));
    this.portalCanvases = generateAllPortalSprites(this.createCanvas.bind(this));
    this.teleportCanvas = this.portalCanvases[1]?.[0] || null;

    // Heavy High-Tech Reinforced Supply Chest (Closed)
    this.chestCanvas = this.createCanvas(64, 64, (ctx) => {
      // Floor Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(32, 58, 26, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lower Base Casing (Gunmetal Steel)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, 28, 48, 28);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 30, 44, 24);

      // Metal reinforced corner struts
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 28, 8, 28);
      ctx.fillRect(48, 28, 8, 28);
      ctx.fillRect(8, 50, 48, 6);

      // Silver Hardware Rivets
      ctx.fillStyle = '#94a3b8';
      [[10, 32], [50, 32], [10, 52], [50, 52], [28, 52], [36, 52]].forEach(([rx, ry]) => {
        ctx.fillRect(rx, ry, 2, 2);
      });

      // Heavy Armored Lid
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, 18, 52, 13);
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, 19, 48, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 23, 48, 7);

      // Hazard Stripes on Lid Trim
      ctx.fillStyle = '#eab308';
      ctx.fillRect(12, 24, 6, 4);
      ctx.fillRect(24, 24, 6, 4);
      ctx.fillRect(36, 24, 4, 4);
      ctx.fillRect(46, 24, 6, 4);

      // Central Electronic Biometric Lock (Glowing Cyan / Green)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(26, 28, 12, 12);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(28, 30, 8, 8);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(29, 32, 6, 4);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(31, 33, 2, 2); // Ready green diode
    });

    // Heavy High-Tech Supply Chest (Opened)
    this.chestOpenCanvas = this.createCanvas(64, 64, (ctx) => {
      // Floor Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(32, 58, 26, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Open Lid Tilted Upward and Back
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(6, 6, 52, 14);
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, 8, 48, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 12, 48, 6);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(14, 13, 6, 4);
      ctx.fillRect(44, 13, 6, 4);

      // Lower Base Casing
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, 28, 48, 28);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 30, 44, 24);

      // Glowing Interior Cache Tray
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(12, 22, 40, 14);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(14, 24, 36, 10);

      // Internal Supplies Visible (Vials & Ammo Pods)
      ctx.fillStyle = '#22c55e'; // Medkit vials
      ctx.fillRect(16, 26, 6, 7);
      ctx.fillStyle = '#eab308'; // Shells/Bullets
      ctx.fillRect(26, 25, 12, 8);
      ctx.fillStyle = '#06b6d4'; // Plasma Battery
      ctx.fillRect(42, 26, 6, 7);

      // Base Brackets
      ctx.fillStyle = '#334155';
      ctx.fillRect(8, 28, 8, 28);
      ctx.fillRect(48, 28, 8, 28);
      ctx.fillRect(8, 50, 48, 6);
      ctx.fillStyle = '#94a3b8';
      [[10, 32], [50, 32], [10, 52], [50, 52]].forEach(([rx, ry]) => {
        ctx.fillRect(rx, ry, 2, 2);
      });
    });
  }

  // --- GIBS & BLOOD DECALS ---
  private generateGibAndDecalSprites() {
    const size = 32;

    // Skull gib
    this.gibCanvases['skull'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(8, 6, 16, 14);
      ctx.fillRect(10, 20, 12, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(11, 10, 4, 4);
      ctx.fillRect(17, 10, 4, 4);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(6, 4, 6, 6); // Blood smeared
    });

    // Meat chunk
    this.gibCanvases['meat'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(6, 6, 20, 18);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(9, 9, 14, 12);
      ctx.fillStyle = '#fee2e2'; // Bone fragment
      ctx.fillRect(12, 12, 4, 4);
    });

    // Ribcage
    this.gibCanvases['rib'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(8, 6, 4, 20);
      ctx.fillRect(12, 8, 10, 4);
      ctx.fillRect(12, 14, 10, 4);
      ctx.fillRect(12, 20, 10, 4);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(6, 10, 8, 4);
    });

    // Eyeball
    this.gibCanvases['eyeball'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(16, 16, 9, 0, Math.PI * 2);
      ctx.fill();
      // Red bloody iris with dilated pupil
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(16, 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(16, 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Severed optic nerve & blood trail
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(6, 14, 6, 4);
      ctx.fillRect(3, 16, 4, 3);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(8, 15, 3, 2);
    });

    // Blood drop / Visceral Globule
    this.gibCanvases['blood_drop'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(16, 18, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, 16);
      ctx.lineTo(16, 4);
      ctx.lineTo(22, 16);
      ctx.closePath();
      ctx.fill();
      // Bright arterial core & specular highlight
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.arc(16, 18, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(14, 14, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cybernetic Metal Shard
    this.gibCanvases['metal_shard'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#334155'; // Armor slate
      ctx.beginPath();
      ctx.moveTo(6, 6);
      ctx.lineTo(26, 10);
      ctx.lineTo(22, 26);
      ctx.lineTo(8, 22);
      ctx.closePath();
      ctx.fill();
      // Metallic bevel
      ctx.fillStyle = '#64748b';
      ctx.fillRect(8, 8, 12, 4);
      ctx.fillRect(10, 14, 8, 4);
      // Energized cyan circuit fracture
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(12, 10, 2, 10);
      ctx.fillRect(14, 14, 6, 2);
      ctx.fillStyle = '#991b1b'; // Splattered blood on plating
      ctx.fillRect(6, 16, 5, 5);
    });

    // Severed Demon / Grunt Arm
    this.gibCanvases['severed_arm'] = this.createCanvas(size, size, (ctx) => {
      // Forearm flesh
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(8, 10, 14, 8);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(10, 11, 10, 6);
      // Severed bloody elbow joint & bone stump
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(6, 12, 4, 4);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(6, 9, 3, 10);
      // Clawed hand & talon fingers
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(22, 10, 6, 8);
      ctx.fillStyle = '#f8fafc'; // Claws
      ctx.fillRect(27, 9, 3, 2);
      ctx.fillRect(28, 12, 3, 2);
      ctx.fillRect(27, 15, 3, 2);
    });

    // Severed Demon Leg / Clawed Foot
    this.gibCanvases['severed_leg'] = this.createCanvas(size, size, (ctx) => {
      // Shin flesh
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(10, 6, 8, 16);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(12, 8, 5, 12);
      // Torn thigh bone stump
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(12, 4, 4, 4);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(9, 3, 10, 3);
      // Demonic hooved / clawed foot
      ctx.fillStyle = '#18181b';
      ctx.fillRect(10, 22, 14, 6);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(23, 24, 4, 3);
    });

    // Pulsing Demon Heart
    this.gibCanvases['heart'] = this.createCanvas(size, size, (ctx) => {
      // Heart muscular chambers
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2);
      ctx.arc(20, 14, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, 16);
      ctx.lineTo(16, 28);
      ctx.lineTo(26, 16);
      ctx.closePath();
      ctx.fill();
      // Aortic valves & severed tubes
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(10, 4, 4, 6);
      ctx.fillRect(17, 5, 4, 5);
      // Arterial shine
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(11, 13, 4, 4);
      ctx.fillRect(17, 13, 4, 4);
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(12, 12, 2, 2);
    });

    // Snapping Demon Jaw with Fangs
    this.gibCanvases['jaw'] = this.createCanvas(size, size, (ctx) => {
      // Mandible bone
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(16, 14, 10, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(8, 12, 16, 5);
      // Sharp predatory teeth / fangs
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(8, 7, 3, 5);
      ctx.fillRect(12, 8, 3, 4);
      ctx.fillRect(17, 8, 3, 4);
      ctx.fillRect(21, 7, 3, 5);
      // Blood dripping
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(11, 16, 3, 8);
      ctx.fillRect(18, 16, 3, 6);
    });

    // Coiled Visceral Intestine
    this.gibCanvases['intestine'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(6, 8, 20, 6);
      ctx.fillRect(8, 14, 18, 6);
      ctx.fillRect(6, 20, 18, 6);
      // Highlights & gore tissue
      ctx.fillStyle = '#f87171';
      ctx.fillRect(8, 9, 15, 3);
      ctx.fillRect(10, 15, 13, 3);
      ctx.fillRect(8, 21, 13, 3);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(4, 7, 4, 20);
    });

    // Demon Horn
    this.gibCanvases['demon_horn'] = this.createCanvas(size, size, (ctx) => {
      // Obsidian horn curved spike
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(6, 26);
      ctx.quadraticCurveTo(12, 12, 26, 6);
      ctx.quadraticCurveTo(18, 22, 12, 28);
      ctx.closePath();
      ctx.fill();
      // Molten orange vein fissure
      ctx.fillStyle = '#f97316';
      ctx.fillRect(12, 18, 4, 3);
      ctx.fillRect(16, 14, 3, 3);
      // Bloody fracture base
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(6, 24, 7, 5);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(7, 25, 3, 2);
    });

    // Cerebral Brain Lobe
    this.gibCanvases['brain_lobe'] = this.createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#be123c'; // Deep crimson cortex
      ctx.beginPath();
      ctx.arc(16, 16, 11, 0, Math.PI * 2);
      ctx.fill();
      // Cerebral sulci / fissures
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(9, 10, 6, 3);
      ctx.fillRect(17, 10, 6, 3);
      ctx.fillRect(8, 15, 7, 3);
      ctx.fillRect(17, 15, 7, 3);
      ctx.fillRect(10, 20, 12, 3);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(15, 8, 2, 16);
    });

    // Blood splatter decals (floor and walls)
    this.decalCanvases['blood_1'] = this.createCanvas(48, 48, (ctx) => {
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(24, 24, 14, 0, Math.PI * 2);
      ctx.fill();
      // Satellite droplets
      ctx.fillRect(8, 12, 5, 4);
      ctx.fillRect(36, 18, 6, 5);
      ctx.fillRect(20, 40, 4, 6);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(18, 18, 12, 12);
    });

    this.decalCanvases['scorch'] = this.createCanvas(48, 48, (ctx) => {
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(24, 24, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.fillRect(22, 22, 4, 4);
    });

    // Ejected Brass Bullet Casing (Pistol / Chaingun)
    this.casingCanvases['brass_bullet'] = this.createCanvas(16, 16, (ctx) => {
      // Golden reflective cylindrical body
      ctx.fillStyle = '#ca8a04'; // Deep brass
      ctx.fillRect(4, 5, 8, 5);
      ctx.fillStyle = '#fef08a'; // Specular highlight
      ctx.fillRect(5, 5, 6, 2);
      ctx.fillStyle = '#eab308'; // Mid gold
      ctx.fillRect(5, 7, 6, 2);
      // Rim rim and dark hollow opening
      ctx.fillStyle = '#854d0e'; // Dark brass rim
      ctx.fillRect(3, 4, 2, 7);
      ctx.fillStyle = '#1c1917'; // Hollow tip
      ctx.fillRect(11, 6, 2, 3);
    });

    // Ejected Red Shotgun Hull Casing
    this.casingCanvases['shotgun_red'] = this.createCanvas(18, 18, (ctx) => {
      // Brass rim base
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(3, 4, 3, 9);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(4, 5, 1, 7);
      // Red ribbed plastic shell tube
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(6, 4, 9, 9);
      ctx.fillStyle = '#ef4444'; // Top highlight
      ctx.fillRect(6, 5, 9, 2);
      ctx.fillStyle = '#991b1b'; // Underside shadow
      ctx.fillRect(6, 10, 9, 3);
      // Open crimped mouth
      ctx.fillStyle = '#18181b';
      ctx.fillRect(14, 5, 2, 7);
    });

    // Universal Dismembered Gore Puddle Sprite (Flat carcass remnant)
    this.gibCanvases['dismembered'] = this.createCanvas(size, size, (ctx) => {
      // Visceral blood puddle
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(16, 20, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fresh bright blood ring
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.ellipse(16, 20, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Broken rib bones & vertebrae
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, 17, 3, 6);
      ctx.fillRect(14, 16, 3, 7);
      ctx.fillRect(18, 17, 3, 5);
      // Smashed flesh chunk
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(12, 19, 8, 5);
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(15, 18, 2, 2);
    });
  }

  // --- PROCEDURAL REACTIVE DOOM FACE ---
  private generateFaceSprites() {
    const fw = 32;
    const fh = 36;

    // Helper for base head
    const drawBaseHead = (ctx: CanvasRenderingContext2D, skinTone = '#fca5a5', hair = '#78350f') => {
      // Hair
      ctx.fillStyle = hair;
      ctx.fillRect(6, 2, 20, 8);
      ctx.fillRect(4, 6, 24, 4);
      // Face skin
      ctx.fillStyle = skinTone;
      ctx.fillRect(6, 8, 20, 22);
      ctx.fillRect(8, 30, 16, 4); // Chin
      // Ears
      ctx.fillRect(4, 14, 2, 8);
      ctx.fillRect(26, 14, 2, 8);
    };

    // 0: Healthy Straight Look
    this.faceCanvases['healthy_straight'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      // Eyes looking forward
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 14, 5, 4);
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#1e3a8a'; // Blue pupils
      ctx.fillRect(11, 15, 2, 3);
      ctx.fillRect(20, 15, 2, 3);
      // Eyebrows
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 12, 6, 2);
      ctx.fillRect(18, 12, 6, 2);
      // Nose & Mouth
      ctx.fillStyle = '#f87171';
      ctx.fillRect(15, 18, 2, 4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 25, 8, 2);
    });

    // 1: Healthy Look Left
    this.faceCanvases['healthy_left'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 14, 5, 4);
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(9, 15, 2, 3);
      ctx.fillRect(18, 15, 2, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 12, 6, 2);
      ctx.fillRect(18, 12, 6, 2);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(14, 18, 2, 4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 25, 8, 2);
    });

    // 2: Healthy Look Right
    this.faceCanvases['healthy_right'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 14, 5, 4);
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(12, 15, 2, 3);
      ctx.fillRect(21, 15, 2, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 12, 6, 2);
      ctx.fillRect(18, 12, 6, 2);
      ctx.fillStyle = '#f87171';
      ctx.fillRect(16, 18, 2, 4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(12, 25, 8, 2);
    });

    // 3: Evil Grin (Killstreak / Berserk / Weapon pickup)
    this.faceCanvases['evil_grin'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 15, 5, 3);
      ctx.fillRect(18, 15, 5, 3);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 16, 2, 2);
      ctx.fillRect(19, 16, 2, 2);
      // Slanted devious brows
      ctx.fillStyle = '#451a03';
      ctx.fillRect(8, 14, 6, 2);
      ctx.fillRect(18, 14, 6, 2);
      // Wide evil smile with teeth
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 24, 12, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 25, 10, 2);
    });

    // 4: Pain / Hit Grit
    this.faceCanvases['pain_grit'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      // Closed tight eyes
      ctx.fillStyle = '#451a03';
      ctx.fillRect(9, 15, 5, 2);
      ctx.fillRect(18, 15, 5, 2);
      // Clenched teeth
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 24, 12, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 25, 10, 2);
      // Red bruise
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(7, 10, 4, 6);
    });

    // 5: Bleeding 50% HP
    this.faceCanvases['bleed_mid'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(9, 14, 5, 4);
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 15, 2, 3);
      ctx.fillRect(19, 15, 2, 3);
      // Blood on forehead & mouth
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(10, 8, 3, 8);
      ctx.fillRect(13, 26, 4, 4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(11, 24, 10, 3);
    });

    // 6: Bleeding <25% HP Heavy Damage
    this.faceCanvases['bleed_heavy'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx, '#e2e8f0'); // Pale skin
      // Left eye swollen shut
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(8, 13, 7, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(19, 15, 2, 3);
      // Gory tears and open bloody jaw
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(9, 8, 4, 14);
      ctx.fillRect(18, 19, 3, 10);
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 24, 12, 6);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(12, 26, 8, 3);
    });

    // 7: Berserk Rage (Glowing Red Eyes)
    this.faceCanvases['berserk'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx, '#f87171');
      // Fiery glowing red eyes
      ctx.fillStyle = '#fde047';
      ctx.fillRect(8, 13, 7, 5);
      ctx.fillRect(17, 13, 7, 5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(10, 14, 3, 3);
      ctx.fillRect(19, 14, 3, 3);
      // Snarl
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 23, 12, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, 24, 10, 3);
    });

    // 8: Dead Face (0% HP)
    this.faceCanvases['dead'] = this.createCanvas(fw, fh, (ctx) => {
      drawBaseHead(ctx, '#94a3b8'); // Grayish corpse skin
      // X eyes
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(9, 14, 5, 4);
      ctx.fillRect(18, 14, 5, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(10, 14, 2, 4);
      ctx.fillRect(19, 14, 2, 4);
      // Blood streaming
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(10, 18, 3, 12);
      ctx.fillRect(19, 18, 3, 12);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(11, 26, 10, 5);
    });
  }

  // --- CANVAS HELPERS ---
  private createCanvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
    }
    return canvas;
  }

  private createImageData(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      draw(ctx);
      return ctx.getImageData(0, 0, w, h);
    }
    return new ImageData(w, h);
  }
}
