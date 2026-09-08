// ============================================================================
// LEVEL-SPECIFIC SCI-FI DIMENSIONAL EXIT PORTALS
// High-tech warp gateways tailored to each level's atmospheric theme:
// Level 1: Subterranean Tech Void Slipgate (High-tech titanium gate & cyan event horizon)
// Level 2: Toxic Refinery Bio-Rift (Bio-containment pylon with boiling emerald mutagen rift)
// Level 3: Hellgate Infernal Singularity (Volcanic obsidian pillars & roaring crimson rift)
// Level 4: Apocalypse Quantum Singularity (Hovering dark-matter stabilizers & violet warp)
// Level 5+: Apex Chrono-Warp Gateway (Prismatic solar gateway with singularity core)
// ============================================================================

export type CanvasBuilder = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
) => HTMLCanvasElement;

export interface PortalTheme {
  name: string;
  pylonPrimary: string;
  pylonSecondary: string;
  pylonLight: string;
  pylonAccent: string;
  vortexCore: string;
  vortexMid: string;
  vortexOuter: string;
  sparkColor: string;
  hazardColor: string;
}

export const PORTAL_THEMES: Record<number, PortalTheme> = {
  // Stage 1: Subterranean Tech Void Slipgate
  1: {
    name: 'Tech Void Slipgate',
    pylonPrimary: '#1e293b',
    pylonSecondary: '#0f172a',
    pylonLight: '#475569',
    pylonAccent: '#06b6d4',
    vortexCore: '#ffffff',
    vortexMid: '#38bdf8',
    vortexOuter: 'rgba(2, 132, 199, 0.85)',
    sparkColor: '#7dd3fc',
    hazardColor: '#eab308',
  },
  // Stage 2: Toxic Refinery Bio-Rift
  2: {
    name: 'Toxic Bio-Rift',
    pylonPrimary: '#142918',
    pylonSecondary: '#09150b',
    pylonLight: '#264a2d',
    pylonAccent: '#22c55e',
    vortexCore: '#f0fdf4',
    vortexMid: '#4ade80',
    vortexOuter: 'rgba(22, 101, 52, 0.9)',
    sparkColor: '#86efac',
    hazardColor: '#84cc16',
  },
  // Stage 3: Hellgate Infernal Singularity
  3: {
    name: 'Hellgate Singularity',
    pylonPrimary: '#261214',
    pylonSecondary: '#14080a',
    pylonLight: '#4a1e22',
    pylonAccent: '#ef4444',
    vortexCore: '#fffbeb',
    vortexMid: '#f97316',
    vortexOuter: 'rgba(185, 28, 28, 0.92)',
    sparkColor: '#fde047',
    hazardColor: '#ea580c',
  },
  // Stage 4: Apocalypse Quantum Singularity
  4: {
    name: 'Apocalypse Void Singularity',
    pylonPrimary: '#1c132b',
    pylonSecondary: '#0e0818',
    pylonLight: '#392458',
    pylonAccent: '#a855f7',
    vortexCore: '#fdf4ff',
    vortexMid: '#c084fc',
    vortexOuter: 'rgba(107, 33, 168, 0.9)',
    sparkColor: '#e9d5ff',
    hazardColor: '#9333ea',
  },
  // Stage 5+: Apex Chrono-Warp Gateway
  5: {
    name: 'Apex Chrono Gateway',
    pylonPrimary: '#1e2024',
    pylonSecondary: '#111215',
    pylonLight: '#3f444e',
    pylonAccent: '#f59e0b',
    vortexCore: '#ffffff',
    vortexMid: '#fbbf24',
    vortexOuter: 'rgba(217, 119, 6, 0.92)',
    sparkColor: '#fef08a',
    hazardColor: '#f59e0b',
  },
};

export function generateAllPortalSprites(
  createCanvas: CanvasBuilder
): Record<number, HTMLCanvasElement[]> {
  const portalCanvases: Record<number, HTMLCanvasElement[]> = {};
  const size = 64;
  const numFrames = 4;

  const stageKeys = [1, 2, 3, 4, 5];

  for (const stage of stageKeys) {
    const theme = PORTAL_THEMES[stage] || PORTAL_THEMES[1];
    portalCanvases[stage] = [];

    for (let f = 0; f < numFrames; f++) {
      const frameAngle = (f / numFrames) * Math.PI * 2;

      const canvas = createCanvas(size, size, (ctx) => {
        ctx.clearRect(0, 0, size, size);

        // 1. Quantum Base Platform & Floor Shockwave
        const baseGrad = ctx.createRadialGradient(32, 54, 4, 32, 54, 28);
        baseGrad.addColorStop(0, theme.vortexCore);
        baseGrad.addColorStop(0.35, theme.vortexMid);
        baseGrad.addColorStop(0.75, theme.vortexOuter);
        baseGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(32, 54, 28, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Heavy Base Emitter Ring
        ctx.fillStyle = theme.pylonSecondary;
        ctx.beginPath();
        ctx.ellipse(32, 53, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.pylonLight;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 2. Swirling Dimensional Vortex Event Horizon (Center Ellipse)
        const vortexGrad = ctx.createRadialGradient(32, 30, 2, 32, 30, 22);
        vortexGrad.addColorStop(0, theme.vortexCore);
        vortexGrad.addColorStop(0.3, theme.vortexMid);
        vortexGrad.addColorStop(0.7, theme.vortexOuter);
        vortexGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = vortexGrad;
        ctx.beginPath();
        ctx.ellipse(32, 30, 18, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Rotating Dimensional Energy Rings (Animated with frame angle)
        ctx.save();
        ctx.translate(32, 30);
        ctx.rotate(frameAngle);
        ctx.strokeStyle = theme.vortexMid;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 20, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(Math.PI / 3);
        ctx.strokeStyle = theme.vortexCore;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 15, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 4. Heavy Industrial Quantum Pylon Pillars (Left & Right)
        // Left Pylon
        drawPylon(ctx, 4, 8, 12, 46, theme, false, f);
        // Right Pylon
        drawPylon(ctx, 48, 8, 12, 46, theme, true, f);

        // Overhead Quantum Arch / Stabilizer Bridge
        ctx.fillStyle = theme.pylonSecondary;
        ctx.fillRect(14, 6, 36, 6);
        ctx.fillStyle = theme.pylonPrimary;
        ctx.fillRect(16, 8, 32, 3);
        ctx.fillStyle = theme.pylonLight;
        ctx.fillRect(14, 6, 36, 1);

        // Center Arch Emitter Node (Pulsing)
        const pulse = (Math.sin(frameAngle * 2) + 1) * 0.5;
        ctx.fillStyle = theme.vortexMid;
        ctx.beginPath();
        ctx.arc(32, 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.vortexCore;
        ctx.beginPath();
        ctx.arc(32, 9, 1.5 + pulse, 0, Math.PI * 2);
        ctx.fill();

        // 5. Electric Discharge Arcs & Floating Energy Sparks
        for (let s = 0; s < 6; s++) {
          const sparkAngle = frameAngle + (s * Math.PI * 2) / 6;
          const dist = 12 + Math.sin(s * 2 + frameAngle) * 5;
          const sx = 32 + Math.cos(sparkAngle) * dist * 0.8;
          const sy = 30 + Math.sin(sparkAngle) * dist * 1.2;
          ctx.fillStyle = theme.sparkColor;
          ctx.fillRect(Math.floor(sx), Math.floor(sy), 2, 2);
        }

        // Warning Hazard Chevrons on Base
        ctx.fillStyle = theme.hazardColor;
        ctx.fillRect(12, 54, 3, 2);
        ctx.fillRect(18, 54, 3, 2);
        ctx.fillRect(43, 54, 3, 2);
        ctx.fillRect(49, 54, 3, 2);
      });

      portalCanvases[stage].push(canvas);
    }
  }

  return portalCanvases;
}

function drawPylon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  theme: PortalTheme,
  isRight: boolean,
  frame: number
) {
  // Main Pylon Body
  ctx.fillStyle = theme.pylonSecondary;
  ctx.fillRect(x, y, w, h);

  // Bevel & Metallic Face
  ctx.fillStyle = theme.pylonPrimary;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

  // Highlight Edge
  ctx.fillStyle = theme.pylonLight;
  ctx.fillRect(isRight ? x + w - 2 : x, y, 2, h);

  // Vertical Conduit / Energy Emitter Column
  const conduitX = isRight ? x + 3 : x + w - 5;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(conduitX, y + 6, 2, h - 14);

  // Pulsing Emitter Nodes along Pylon
  const nodeOffset = (frame * 3) % 8;
  for (let ny = y + 8; ny < y + h - 10; ny += 9) {
    const active = ((ny - y + nodeOffset) % 18) < 9;
    ctx.fillStyle = active ? theme.vortexMid : theme.pylonAccent;
    ctx.fillRect(conduitX, ny, 2, 4);
    if (active) {
      ctx.fillStyle = theme.vortexCore;
      ctx.fillRect(conduitX, ny + 1, 2, 2);
    }
  }

  // Pylon Top Cap
  ctx.fillStyle = theme.pylonLight;
  ctx.fillRect(x - 1, y, w + 2, 3);
  ctx.fillStyle = theme.vortexCore;
  ctx.fillRect(x + (w / 2) - 1, y - 2, 2, 2);

  // Pylon Base Clamp
  ctx.fillStyle = theme.pylonSecondary;
  ctx.fillRect(x - 2, y + h - 5, w + 4, 6);
  ctx.fillStyle = theme.hazardColor;
  ctx.fillRect(x, y + h - 3, 2, 2);
  ctx.fillRect(x + w - 2, y + h - 3, 2, 2);
}
