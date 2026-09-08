// ============================================================================
// SCI-FI MOVIE WEAPON SPRITES ENGINE
// Inspired by blockbuster sci-fi films: Aliens, Blade Runner 2049, Cyberpunk,
// Halo, District 9, and Doom Eternal.
// Features: Holographic ammo HUDs, magnetic accelerator guide rails, glowing
// plasma singularity cores, carbon-titanium composite chassis, thermal radiator
// vents, cybernetic exoskeleton combat gloves, and multi-stage reload animations!
// ============================================================================

type CanvasBuilder = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
) => HTMLCanvasElement;

// Helper: draw beveled rounded rectangle with distinct 3D lighting
function drawBevelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  baseCol: string,
  lightCol: string,
  darkCol: string,
  borderWidth: number = 1,
  radius: number = 4
) {
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();

  ctx.strokeStyle = lightCol;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
}

// Helper: draw cylindrical metallic gradient with rounded caps
function drawMetallicCylinder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  darkCol: string,
  midCol: string,
  lightCol: string,
  radius: number = 3
) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, darkCol);
  grad.addColorStop(0.22, midCol);
  grad.addColorStop(0.5, lightCol);
  grad.addColorStop(0.78, midCol);
  grad.addColorStop(1, darkCol);
  ctx.fillStyle = grad;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.rect(x, y, w, h);
  }
  ctx.fill();
}

// Helper: draw hex bolt / rivet
function drawHexRivet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string = '#94a3b8') {
  ctx.fillStyle = '#090d14';
  ctx.beginPath();
  ctx.arc(x, y, r + 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x - 0.4, y - 0.4, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - 0.4, y - 0.4, 1, 1);
}

// Helper: draw futuristic glowing holographic / OLED monitor display
function drawSciFiDisplay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  mainText: string,
  subText: string = '',
  neonColor: string = '#06b6d4',
  barsCount: number = 8,
  activeBars: number = 8
) {
  // Bezel container
  ctx.fillStyle = '#030712';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Holographic scanline background
  ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

  for (let sy = y + 2; sy < y + h; sy += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + 1, sy, w - 2, 1);
  }

  // Display text
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = neonColor;
  ctx.fillText(mainText, x + 4, y + 10);

  if (subText) {
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(subText, x + 4, y + 18);
  }

  // Mini energy gauge segment bars
  const barW = (w - 8) / barsCount;
  for (let b = 0; b < barsCount; b++) {
    const bx = x + 4 + b * barW;
    ctx.fillStyle = b < activeBars ? neonColor : 'rgba(30, 41, 59, 0.7)';
    ctx.fillRect(bx, y + h - 4, barW - 1, 2.5);
  }
}

// Helper: draw glowing neon energy conduits / fiber-optic circuits
function drawEnergyCircuit(
  ctx: CanvasRenderingContext2D,
  points: [number, number][],
  glowColor: string = '#06b6d4',
  coreColor: string = '#ffffff',
  lineWidth: number = 2
) {
  if (points.length < 2) return;

  // Outer neon glow
  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = lineWidth + 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();

  // Core laser trace
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = Math.max(1, lineWidth - 1);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}

// Helper: draw cybernetic exoskeleton combat glove with wrist holographic projector
function drawCyberGlove(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isRight: boolean,
  punchForward: number = 0,
  glowColor: string = '#06b6d4',
  isBerserk: boolean = false,
  showHoloHUD: boolean = true
) {
  ctx.save();
  ctx.translate(x, y + punchForward);
  if (isRight) {
    ctx.scale(-1, 1);
  }

  // Forearm sleeve (nanotube matte carbon weave)
  ctx.fillStyle = '#070b10';
  ctx.beginPath();
  ctx.moveTo(-38, 130);
  ctx.lineTo(38, 130);
  ctx.lineTo(28, 42);
  ctx.lineTo(-28, 42);
  ctx.closePath();
  ctx.fill();

  // Carbon weave texture ridges
  ctx.fillStyle = '#111827';
  for (let i = 48; i < 125; i += 7) {
    ctx.fillRect(-24, i, 48, 2);
  }

  // Segmented titanium forearm exoskeleton brace
  drawBevelBox(ctx, -30, 46, 60, 68, '#131b26', '#2d3b4e', '#070a0e', 2);

  // Recessed carbon fiber channel
  ctx.fillStyle = '#0b0f17';
  ctx.fillRect(-10, 50, 20, 60);

  // Micro hydraulic wrist stabilizer ram
  ctx.fillStyle = '#05070a';
  ctx.fillRect(-7, 42, 14, 46);
  ctx.fillStyle = '#cbd5e1'; // chrome ram rod
  ctx.fillRect(-4, 44, 8, 42);
  ctx.fillStyle = '#ffffff'; // specular gleam
  ctx.fillRect(-2, 44, 2, 42);

  // Power LED strip
  const ledGlow = isBerserk ? '#ef4444' : glowColor;
  ctx.fillStyle = '#030712';
  ctx.fillRect(-20, 72, 40, 6);
  ctx.fillStyle = ledGlow;
  ctx.fillRect(-18, 73, 36, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-12, 74, 14, 2);

  // Holographic wrist HUD emitter (projecting tactical compass and vitals)
  if (!isRight && showHoloHUD) {
    // Projector lens
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(-16, 56, 4, 0, Math.PI * 2);
    ctx.fill();

    // Projected holographic HUD hologram floating off the wrist
    ctx.save();
    ctx.translate(-54, 30);
    // Hologram background grid
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 44, 32, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Holo text & reticle
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = isBerserk ? '#ef4444' : '#38bdf8';
    ctx.fillText('SYS: OK', 4, 9);
    ctx.fillText('VIT: 100%', 4, 18);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(4, 22, 34, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 22, 26, 3);
    ctx.restore();
  }

  // Gauntlet wrist cuff bracket
  drawBevelBox(ctx, -32, 26, 64, 20, '#1c2432', '#3f4f66', '#090d13', 2);
  drawHexRivet(ctx, -24, 36, 2.5);
  drawHexRivet(ctx, 24, 36, 2.5);

  // Dorsal hand armor plate (faceted angular stealth geometry)
  ctx.fillStyle = '#0b0f16';
  ctx.beginPath();
  ctx.roundRect(-28, -6, 56, 36, 6);
  ctx.fill();

  ctx.fillStyle = '#17202d';
  ctx.beginPath();
  ctx.roundRect(-26, -4, 52, 32, 5);
  ctx.fill();

  // High-voltage kinetic arc capacitor line
  drawEnergyCircuit(
    ctx,
    [[-18, 22], [-10, 10], [0, 14], [10, 8], [18, 20]],
    ledGlow,
    '#ffffff',
    1.5
  );

  // Tungsten carbide heavy knuckle strike block
  drawBevelBox(ctx, -26, -24, 52, 20, '#1e293b', '#475569', '#0a0e14', 2);

  // 4 Spiked kinetic strike pyramids with internal charge nodes
  for (let k = 0; k < 4; k++) {
    const kx = -18 + k * 12;
    // Base node
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(kx - 4, -22, 8, 16);

    // Strike pyramid
    const spikeColor = isBerserk ? '#ef4444' : '#e2e8f0';
    ctx.fillStyle = spikeColor;
    ctx.beginPath();
    ctx.moveTo(kx, -31);
    ctx.lineTo(kx + 4, -22);
    ctx.lineTo(kx - 4, -22);
    ctx.closePath();
    ctx.fill();

    // Specular edge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(kx - 0.5, -30, 1, 8);

    // Glowing micro capacitor node
    ctx.fillStyle = ledGlow;
    ctx.fillRect(kx - 1.5, -20, 3, 3);
  }

  // Reinforced thumb plate
  ctx.fillStyle = '#0b0f16';
  ctx.beginPath();
  ctx.roundRect(-30, 4, 26, 20, 5);
  ctx.fill();

  drawBevelBox(ctx, -28, 6, 22, 16, '#202b3c', '#46566d', '#0c1118', 1);
  ctx.fillStyle = ledGlow;
  ctx.fillRect(-26, 12, 16, 2);

  ctx.restore();
}

export function generateAllWeaponSprites(createCanvas: CanvasBuilder): Record<string, HTMLCanvasElement[]> {
  const weaponCanvases: Record<string, HTMLCanvasElement[]> = {};

  // ==========================================================================
  // 1. MELEE: TITAN CYBERNETIC COMBAT EXOSKELETON GAUNTLETS (300 x 220)
  // ==========================================================================
  const fW = 300;
  const fH = 220;

  weaponCanvases['fist'] = [
    // Frame 0: Tactical Combat Guard (Both cyber-gauntlets raised, holographic HUD active)
    createCanvas(fW, fH, (ctx) => {
      drawCyberGlove(ctx, 88, 130, false, 0, '#06b6d4', false, true);
      drawCyberGlove(ctx, 212, 140, true, 0, '#06b6d4', false, false);
    }),

    // Frame 1: Left Pneumatic Jab (Thrust forward with cyan kinetic displacement wave)
    createCanvas(fW, fH, (ctx) => {
      drawCyberGlove(ctx, 226, 148, true, 0, '#06b6d4', false, false);

      // Kinetic displacement wave
      const trailGrad = ctx.createLinearGradient(70, 160, 140, 70);
      trailGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
      trailGrad.addColorStop(1, 'rgba(56, 189, 248, 0.45)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(68, 160);
      ctx.lineTo(138, 70);
      ctx.lineTo(162, 70);
      ctx.lineTo(98, 160);
      ctx.closePath();
      ctx.fill();

      // Extended Left Fist
      drawCyberGlove(ctx, 148, 88, false, 0, '#38bdf8', false, true);

      // Impact shock ring at the knuckle tips
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(148, 54, 18, 0, Math.PI * 2);
      ctx.stroke();
    }),

    // Frame 2: Right Haymaker (Full power kinetic swing with amber/crimson arc)
    createCanvas(fW, fH, (ctx) => {
      drawCyberGlove(ctx, 74, 146, false, 0, '#06b6d4', false, true);

      // Kinetic arc
      const hayGrad = ctx.createRadialGradient(150, 90, 10, 150, 90, 80);
      hayGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
      hayGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = hayGrad;
      ctx.beginPath();
      ctx.arc(150, 90, 80, 0, Math.PI * 2);
      ctx.fill();

      // Extended Right Fist
      drawCyberGlove(ctx, 152, 92, true, 0, '#ef4444', true, false);
    })
  ];

  // ==========================================================================
  // 2. SIDEARM: APEX-9 MAG-PULSE RAIL PISTOL (280 x 220)
  // Sleek hard sci-fi sidearm with digital OLED ammo counter, dual magnetic
  // accelerator rails with step-illuminated charge nodes, vented compensator,
  // and multi-stage reload animations (spent battery drop + fresh pack snap).
  // ==========================================================================
  const pW = 280;
  const pH = 220;

  const drawSciFiPistol = (
    ctx: CanvasRenderingContext2D,
    opts: {
      slideBack: number; // 0 to 16px blowback
      isFiring: boolean;
      reloadStage: number; // 0 = idle, 1 = battery ejecting, 2 = fresh pack inserting
      ammoDisplay: string;
      batteryLevel: number; // 0 to 8 bars
    }
  ) => {
    const cx = 140; // Gun centerline
    const sb = opts.slideBack;

    // --- CYBERNETIC SUPPORT HANDS ---
    // Right Hand (Main firing grip)
    drawCyberGlove(ctx, cx + 48, 175, true, 0, '#06b6d4', false, false);

    // Left Support Hand
    if (opts.reloadStage === 0) {
      // Steadying two-handed tactical stance
      drawCyberGlove(ctx, cx - 44, 182, false, 0, '#06b6d4', false, false);
    } else if (opts.reloadStage === 1) {
      // Left hand reaching down to catch/drop the spent energy cell
      drawCyberGlove(ctx, cx - 35, 205, false, 0, '#06b6d4', false, false);
    } else if (opts.reloadStage === 2) {
      // Left hand thrusting fresh glowing blue battery cell upward into the magwell
      drawCyberGlove(ctx, cx - 18, 186, false, 0, '#38bdf8', false, false);
    }

    // --- MAGAZINE & POWER CELL ---
    if (opts.reloadStage === 1) {
      // Spent cell falling down out of grip with lingering spark particles
      const cellY = 175;
      drawBevelBox(ctx, cx - 8, cellY, 16, 32, '#0f172a', '#1e293b', '#020617', 1.5);
      // Depleted amber/dim blue status indicator
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 5, cellY + 4, 10, 4);
      // Sparks
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 2, cellY - 4, 2, 2);
      ctx.fillRect(cx + 4, cellY + 12, 1.5, 1.5);
      ctx.fillRect(cx - 6, cellY + 22, 2, 2);
    } else if (opts.reloadStage === 2) {
      // Fresh glowing high-capacity cyan battery pack being inserted
      const cellY = 152;
      drawBevelBox(ctx, cx - 8, cellY, 16, 30, '#090d16', '#38bdf8', '#020617', 2);
      // Glowing energy rods
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 5, cellY + 4, 10, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 3, cellY + 6, 6, 3);
      // Insertion lock flash
      ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, cellY + 10, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- LOWER RECEIVER & GRIP ---
    // Carbon-composite grip
    drawBevelBox(ctx, cx - 14, 130, 28, 70, '#0a0f18', '#1e293b', '#04070d', 2);
    // Tactile hexagonal grip panels
    ctx.fillStyle = '#111827';
    for (let gy = 142; gy < 190; gy += 8) {
      ctx.fillRect(cx - 10, gy, 20, 3.5);
    }

    // Extended beavertail & trigger guard
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx - 14, 126, 6, 0, Math.PI * 2);
    ctx.fill();
    // Trigger guard loop
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(cx - 7, 122, 14, 16, 3);
    ctx.stroke();
    // Silver trigger
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 2, 126, 3, 9);

    // Frame rail & dust cover
    drawBevelBox(ctx, cx - 18, 86, 36, 42, '#0f172a', '#334155', '#020617', 2);

    // Underbarrel tactical smart-targeting module
    drawBevelBox(ctx, cx - 12, 88, 24, 14, '#1e293b', '#475569', '#090d16', 1);
    // Targeting laser emitter lens
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(cx, 95, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 0.5, 94, 1, 1);

    // --- ACCELERATOR SLIDE & BARREL ASSEMBLY ---
    // The slide moves backward with `sb` recoil blowback
    ctx.save();
    ctx.translate(0, sb);

    // Recessed interior barrel / chamber (revealed when slide blows back)
    if (sb > 2) {
      drawMetallicCylinder(ctx, cx - 8, 48, 16, sb + 6, '#0f172a', '#475569', '#cbd5e1');
      // Blue ionized chamber glow
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx - 6, 48, 12, 3);
    }

    // Main slide body (angular aerospace graphite)
    drawBevelBox(ctx, cx - 20, 36, 40, 84, '#0b111c', '#384860', '#03060a', 2);

    // Chamfered top crown
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 15, 38, 30, 4);

    // Integrated Holographic OLED Ammo & Diagnostics Screen
    drawSciFiDisplay(
      ctx,
      cx - 16,
      94,
      32,
      22,
      opts.ammoDisplay,
      'APEX-9',
      opts.reloadStage > 0 ? '#f59e0b' : '#06b6d4',
      6,
      opts.batteryLevel
    );

    // DUAL MAGNETIC ACCELERATOR RAILS (Left & Right Flanks)
    // Left rail with 4 charging micro-LED nodes
    drawBevelBox(ctx, cx - 22, 42, 5, 52, '#182435', '#486588', '#090e17', 1);
    for (let n = 0; n < 4; n++) {
      const ny = 46 + n * 12;
      ctx.fillStyle = opts.isFiring ? '#ffffff' : '#06b6d4';
      ctx.fillRect(cx - 21, ny, 3, 5);
    }

    // Right rail with 4 charging micro-LED nodes
    drawBevelBox(ctx, cx + 17, 42, 5, 52, '#182435', '#486588', '#090e17', 1);
    for (let n = 0; n < 4; n++) {
      const ny = 46 + n * 12;
      ctx.fillStyle = opts.isFiring ? '#ffffff' : '#06b6d4';
      ctx.fillRect(cx + 18, ny, 3, 5);
    }

    // Vented Sci-Fi Muzzle Compensator
    drawBevelBox(ctx, cx - 18, 22, 36, 16, '#111827', '#374151', '#030712', 2);
    // Compensator diagonal gas ports
    ctx.fillStyle = '#030712';
    ctx.fillRect(cx - 14, 25, 6, 3);
    ctx.fillRect(cx + 8, 25, 6, 3);
    ctx.fillRect(cx - 14, 31, 6, 3);
    ctx.fillRect(cx + 8, 31, 6, 3);

    // Bore aperture
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, 24, 6, 0, Math.PI * 2);
    ctx.fill();

    // Combat Tritium Optics (Two rear cyan dots, one front emerald post)
    // Rear sights
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(cx - 13, 114, 3, 3);
    ctx.fillRect(cx + 10, 114, 3, 3);
    // Front post sight
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cx - 1.5, 23, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 0.5, 23, 1, 1);

    ctx.restore();

    // Muzzle flash particle arcs on firing
    if (opts.isFiring) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, 16, 26, 0, Math.PI * 2);
      ctx.fill();
      // Kinetic shock sparks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const ang = (s / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, 16);
        ctx.lineTo(cx + Math.cos(ang) * 22, 16 + Math.sin(ang) * 16);
        ctx.stroke();
      }
    }
  };

  weaponCanvases['pistol'] = [
    // Frame 0: Idle Ready Stance (Slide forward, ammo display [ 12 ], rails humming)
    createCanvas(pW, pH, (ctx) => {
      drawSciFiPistol(ctx, { slideBack: 0, isFiring: false, reloadStage: 0, ammoDisplay: '12/12', batteryLevel: 6 });
    }),
    // Frame 1: Recoil Blowback & Arc Blast (Slide kicks back 14px, chamber ionized)
    createCanvas(pW, pH, (ctx) => {
      drawSciFiPistol(ctx, { slideBack: 14, isFiring: true, reloadStage: 0, ammoDisplay: '11/12', batteryLevel: 5 });
    }),
    // Frame 2: Slide Recovery (Slide resetting forward, compensator cooling)
    createCanvas(pW, pH, (ctx) => {
      drawSciFiPistol(ctx, { slideBack: 4, isFiring: false, reloadStage: 0, ammoDisplay: '11/12', batteryLevel: 5 });
    }),
    // Frame 3: Reload Phase 1 (Magazine ejection - spent cell drops with sparks, display: [RELOAD])
    createCanvas(pW, pH, (ctx) => {
      drawSciFiPistol(ctx, { slideBack: 2, isFiring: false, reloadStage: 1, ammoDisplay: 'RELOAD', batteryLevel: 0 });
    }),
    // Frame 4: Reload Phase 2 (Fresh cell inserted - glowing blue battery pack locks home with flash)
    createCanvas(pW, pH, (ctx) => {
      drawSciFiPistol(ctx, { slideBack: 0, isFiring: false, reloadStage: 2, ammoDisplay: 'READY', batteryLevel: 6 });
    })
  ];

  // ==========================================================================
  // 3. COMBAT SCATTER-CANNON: UAC-X2 SCATTER-PULSE ION BREACHER (320 x 220)
  // Heavy sci-fi shotgun inspired by Aliens M41A and Doom Eternal.
  // Thick polygonal shroud, glowing orange thermal radiator louvers, holographic
  // shell counter [ 02 / 02 ], quad-rail electromagnetic choke, and 2-stage reload.
  // ==========================================================================
  const sW = 320;
  const sH = 220;

  const drawSciFiShotgun = (
    ctx: CanvasRenderingContext2D,
    opts: {
      pumpOffset: number; // 0 = forward, 22 = racked back
      isFiring: boolean;
      ejectSlug: boolean;
      reloadStage: number; // 0 = normal, 1 = breach open & loading, 2 = slug seated
    }
  ) => {
    const cx = 160; // Centerline

    // --- CYBERNETIC SUPPORT HANDS ---
    // Right hand grip on rear pistol handle
    drawCyberGlove(ctx, cx + 56, 178, true, 0, '#06b6d4', false, false);

    // Left hand on the pump foregrip or loading breach
    if (opts.reloadStage === 0) {
      // Clamped firmly to the sci-fi pump slide
      drawCyberGlove(ctx, cx - 48, 128 + opts.pumpOffset, false, 0, '#06b6d4', false, false);
    } else if (opts.reloadStage === 1) {
      // Left hand inserting glowing orange fusion slug into the breach
      drawCyberGlove(ctx, cx - 36, 106, false, 0, '#f97316', false, false);
    } else if (opts.reloadStage === 2) {
      // Left hand slamming the breach lock forward
      drawCyberGlove(ctx, cx - 42, 122, false, 0, '#06b6d4', false, false);
    }

    // --- REAR RECEIVER & STOCK ---
    drawBevelBox(ctx, cx - 28, 122, 56, 88, '#0d131d', '#273549', '#05080c', 2);

    // Receiver top carbon curve & warning decals
    ctx.fillStyle = '#172232';
    ctx.fillRect(cx - 24, 124, 48, 5);

    // Hazard yellow/black diagonal warning stripes on receiver
    for (let h = 0; h < 3; h++) {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 18 + h * 14, 134, 6, 4);
      ctx.fillStyle = '#090d14';
      ctx.fillRect(cx - 12 + h * 14, 134, 6, 4);
    }

    // Holographic Micro-HUD: Floating orange shell counter [ 02 / 02 ]
    ctx.save();
    ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
    ctx.beginPath();
    ctx.roundRect(cx - 26, 144, 52, 18, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#f97316';
    const hudText = opts.reloadStage > 0 ? 'RELOAD' : 'SLUGS: 02';
    ctx.fillText(hudText, cx - 21, 156);
    ctx.restore();

    // --- HEAVY BARREL & THERMAL RADIATOR SHROUD ---
    // Outer polygonal shroud
    drawBevelBox(ctx, cx - 22, 28, 44, 102, '#0c111a', '#2c3b50', '#04070b', 2);

    // Top ventilated cooling rib
    drawBevelBox(ctx, cx - 6, 24, 12, 106, '#182436', '#435874', '#080c12', 1.5);
    // Oval heat dissipation slots
    for (let slot = 36; slot < 118; slot += 14) {
      ctx.fillStyle = '#04070a';
      ctx.beginPath();
      ctx.roundRect(cx - 3.5, slot, 7, 7, 2);
      ctx.fill();

      // Glowing internal orange thermal core
      const ventCol = opts.isFiring ? '#fef08a' : '#ea580c';
      ctx.fillStyle = ventCol;
      ctx.fillRect(cx - 2, slot + 2, 4, 3);
    }

    // THERMAL RADIATOR LOUVERS (Left & Right Flanks)
    // Glowing orange heatsink elements that heat up during sustained fire
    for (let l = 0; l < 5; l++) {
      const ly = 42 + l * 14;
      // Left louver
      ctx.fillStyle = '#05070a';
      ctx.fillRect(cx - 20, ly, 6, 6);
      ctx.fillStyle = opts.isFiring ? '#fef08a' : '#f97316';
      ctx.fillRect(cx - 19, ly + 1, 4, 4);

      // Right louver
      ctx.fillStyle = '#05070a';
      ctx.fillRect(cx + 14, ly, 6, 6);
      ctx.fillStyle = opts.isFiring ? '#fef08a' : '#f97316';
      ctx.fillRect(cx + 15, ly + 1, 4, 4);
    }

    // Underbarrel cylindrical magazine tube with knurled endcap
    drawMetallicCylinder(ctx, cx - 11, 40, 22, 88, '#0b0f16', '#2b394d', '#71849f');
    drawBevelBox(ctx, cx - 13, 26, 26, 12, '#212d3d', '#4d627d', '#0c121a', 2);

    // QUAD-PORTED ELECTROMAGNETIC CHOKE & MUZZLE
    drawBevelBox(ctx, cx - 20, 14, 40, 14, '#151f2d', '#455974', '#060a0f', 2);
    // Bore aperture (massive 12-gauge flechette bore)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx, 16, 9, 0, Math.PI * 2);
    ctx.fill();
    // Glowing magnetic focus ring
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, 16, 7.5, 0, Math.PI * 2);
    ctx.stroke();

    // Tactical fiber-optic bead sight
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(cx, 15, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 0.5, 14, 1, 1);

    // --- PUMP FOREGRIP (Moves with pumpOffset) ---
    if (opts.reloadStage === 0) {
      const py = 74 + opts.pumpOffset;
      drawBevelBox(ctx, cx - 24, py, 48, 36, '#0f1722', '#2f3f56', '#05070c', 2);
      // Ribbed tactile grip grooves
      ctx.fillStyle = '#05080c';
      for (let r = py + 6; r < py + 32; r += 6) {
        ctx.fillRect(cx - 20, r, 40, 3);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(cx - 20, r + 1, 40, 1);
      }
      // Underbarrel tactical light projector
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, py + 38, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- EJECTING SPENT SLUG CASING ---
    if (opts.ejectSlug) {
      const slugX = cx + 38;
      const slugY = 100;
      // Tumbling high-brass thermal slug
      ctx.save();
      ctx.translate(slugX, slugY);
      ctx.rotate(0.35);
      // Red composite hull
      drawBevelBox(ctx, -6, -14, 12, 28, '#dc2626', '#f87171', '#7f1d1d', 1);
      // Brass base
      drawMetallicCylinder(ctx, -7, 6, 14, 8, '#78350f', '#d97706', '#fef08a');
      // Glowing thermal primer
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-2, 11, 4, 3);
      // Smoke puff
      ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.beginPath();
      ctx.arc(8, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- RELOAD ANIMATIONS: BREACH OPEN & INSERTING SLUG ---
    if (opts.reloadStage === 1) {
      // Breach opened upward on hydraulic hinge
      ctx.fillStyle = '#030712';
      ctx.fillRect(cx + 8, 118, 22, 16);
      // Glowing orange thermal breach interior
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(cx + 10, 120, 18, 12);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(cx + 14, 123, 10, 6);

      // Fresh glowing high-density fusion slug in player's cyber-fingers
      const fx = cx - 4;
      const fy = 108;
      drawBevelBox(ctx, fx, fy, 14, 26, '#ea580c', '#fdba74', '#7c2d12', 1.5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(fx + 2, fy + 4, 10, 8);
      // Thermal pulse glow
      ctx.fillStyle = 'rgba(249, 115, 22, 0.35)';
      ctx.beginPath();
      ctx.arc(fx + 7, fy + 12, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (opts.reloadStage === 2) {
      // Slug seated, breach snapping closed with bright amber lock flash
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx + 8, 120, 20, 12);
      // Lock seal flash
      ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
      ctx.beginPath();
      ctx.arc(cx + 18, 126, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 16, 124, 4, 4);
    }

    // Thermal concussion blast flash on firing
    if (opts.isFiring) {
      ctx.fillStyle = 'rgba(249, 115, 22, 0.5)';
      ctx.beginPath();
      ctx.arc(cx, 12, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, 14, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  weaponCanvases['shotgun'] = [
    // Frame 0: Idle Ready Stance (Pump forward in battery, orange louvers glowing, shell counter [ 02 ])
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 0, isFiring: false, ejectSlug: false, reloadStage: 0 });
    }),
    // Frame 1: Thermal Discharge Blast (Concussion explosion, louvers flare incandescent)
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 0, isFiring: true, ejectSlug: false, reloadStage: 0 });
    }),
    // Frame 2: Pump Racked Back & Casing Ejection (Pump -22px, red/brass slug casing ejecting)
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 22, isFiring: false, ejectSlug: true, reloadStage: 0 });
    }),
    // Frame 3: Pump Returning Forward (Chambering fresh round into battery)
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 6, isFiring: false, ejectSlug: false, reloadStage: 0 });
    }),
    // Frame 4: Reload Stage 1 (Breach open, player inserting fresh glowing orange thermal slug)
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 0, isFiring: false, ejectSlug: false, reloadStage: 1 });
    }),
    // Frame 5: Reload Stage 2 (Slug seated, breach snapping shut with amber seal pulse)
    createCanvas(sW, sH, (ctx) => {
      drawSciFiShotgun(ctx, { pumpOffset: 0, isFiring: false, ejectSlug: false, reloadStage: 2 });
    })
  ];

  // ==========================================================================
  // 4. ROTARY CANNON: VULCAN-X MAG-ACCELERATED MINIGUN (340 x 220)
  // High-tech rotary suppression platform. 3 electromagnetic coil-wrapped
  // accelerated barrels, digital RPM monitor, illuminated neon ammo link chute,
  // heavy hazard styling, and heat dissipation cooling vents.
  // ==========================================================================
  const cW = 340;
  const cH = 220;

  const drawSciFiChaingun = (
    ctx: CanvasRenderingContext2D,
    opts: {
      rotFrame: number; // 0 = idle, 1 = spin A, 2 = spin B
      isFiring: boolean;
      rpmText: string;
      ventVapor: boolean;
    }
  ) => {
    const cx = 170; // Centerline

    // --- CYBERNETIC SUPPORT HANDS ---
    // Twin heavy tactical spade handles
    drawCyberGlove(ctx, cx - 68, 168, false, 0, '#06b6d4', false, false);
    drawCyberGlove(ctx, cx + 68, 168, true, 0, '#06b6d4', false, false);

    // --- REAR GEARBOX HOUSING & MOTOR ASSEMBLY ---
    drawBevelBox(ctx, cx - 44, 118, 88, 92, '#0a0e16', '#253549', '#030508', 2);

    // High-torque electric motor housing
    drawMetallicCylinder(ctx, cx - 22, 142, 44, 46, '#06090e', '#1e293b', '#475569');

    // Industrial Yellow/Black Hazard Stripes
    for (let hz = 0; hz < 4; hz++) {
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 36 + hz * 18, 122, 8, 5);
      ctx.fillStyle = '#090d14';
      ctx.fillRect(cx - 28 + hz * 18, 122, 8, 5);
    }

    // Digital OLED RPM Tachometer & Diagnostics Screen
    drawSciFiDisplay(
      ctx,
      cx - 20,
      128,
      40,
      20,
      opts.rpmText,
      'VULCAN-X',
      opts.isFiring ? '#ef4444' : '#06b6d4',
      6,
      opts.isFiring ? 6 : 2
    );

    // AMMUNITION CONDUIT CHUTE (Left Side Hopper)
    drawBevelBox(ctx, cx - 68, 134, 26, 42, '#0f1722', '#2f4258', '#05080d', 1.5);
    // Illuminated neon energy links in the chute
    for (let ak = 0; ak < 4; ak++) {
      const aky = 138 + ak * 9;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 64, aky, 18, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 60, aky + 1, 10, 1.5);
    }

    // --- ROTATING BARREL CLUSTER & SHROUD ---
    // Cylindrical outer thermal shroud
    drawBevelBox(ctx, cx - 36, 42, 72, 80, '#0d131d', '#2b3b51', '#04070a', 2);

    // Circular cooling perforation holes in the shroud
    for (let r = 0; r < 4; r++) {
      const ry = 52 + r * 16;
      for (let c = 0; c < 3; c++) {
        const rx = cx - 24 + c * 24;
        ctx.fillStyle = '#030508';
        ctx.beginPath();
        ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.fill();

        // Glowing internal copper coil or heat haze
        const coilCol = opts.isFiring ? '#ea580c' : '#0284c7';
        ctx.fillStyle = coilCol;
        ctx.beginPath();
        ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3 ROTARY BARRELS (Position depends on rotFrame)
    const barrelRadius = 14;
    const baseAngle = opts.rotFrame === 1 ? Math.PI / 3 : opts.rotFrame === 2 ? (Math.PI * 2) / 3 : 0;

    for (let b = 0; b < 3; b++) {
      const ang = baseAngle + (b * Math.PI * 2) / 3;
      const bx = cx + Math.cos(ang) * barrelRadius;
      const bScale = Math.sin(ang) * 0.15 + 0.85;
      const bw = 14 * bScale;

      // Barrel tube
      drawMetallicCylinder(ctx, bx - bw / 2, 14, bw, 42, '#060a10', '#1e2b3c', '#60748e');

      // Copper induction coil windings along the barrel
      for (let w = 20; w < 42; w += 6) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx - bw / 2 + 1, w, bw - 2, 2);
      }

      // Barrel crown muzzle
      const isFiringThisBarrel = opts.isFiring && b === 0;
      const crownCol = isFiringThisBarrel ? '#fef08a' : opts.isFiring ? '#ea580c' : '#334155';
      ctx.fillStyle = crownCol;
      ctx.beginPath();
      ctx.arc(bx, 14, bw / 2, 0, Math.PI * 2);
      ctx.fill();

      // Bore hole
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(bx, 14, bw / 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front barrel clamp stabilization ring
    drawBevelBox(ctx, cx - 28, 22, 56, 10, '#1c2838', '#425874', '#080c12', 1.5);
    drawHexRivet(ctx, cx - 20, 27, 2);
    drawHexRivet(ctx, cx + 20, 27, 2);

    // VENTING COOLANT VAPOR (During rapid cooling)
    if (opts.ventVapor) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(cx - 32, 50, 14, 0, Math.PI * 2);
      ctx.arc(cx + 32, 50, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    // SPENT HIGH-VELOCITY CASINGS EJECTING
    if (opts.isFiring) {
      for (let s = 0; s < 2; s++) {
        const sx = cx + 46 + s * 14;
        const sy = 132 + s * 12;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(0.4 + s * 0.2);
        drawMetallicCylinder(ctx, -3, -6, 6, 12, '#78350f', '#d97706', '#fef08a');
        ctx.restore();
      }
    }

    // MULTI-PRONGED ROTARY MUZZLE BURST
    if (opts.isFiring) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.beginPath();
      ctx.arc(cx, 8, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, 10, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  weaponCanvases['chaingun'] = [
    // Frame 0: Idle Ready Stance (Aligned barrels, display: [SPIN: RDY])
    createCanvas(cW, cH, (ctx) => {
      drawSciFiChaingun(ctx, { rotFrame: 0, isFiring: false, rpmText: 'RDY 00', ventVapor: false });
    }),
    // Frame 1: Rotary Position A (Rotated 60°, muzzle blast, RPM: 3800)
    createCanvas(cW, cH, (ctx) => {
      drawSciFiChaingun(ctx, { rotFrame: 1, isFiring: true, rpmText: '3800 RPM', ventVapor: false });
    }),
    // Frame 2: Rotary Position B (Rotated 120°, alternate barrel blast, RPM: 5200)
    createCanvas(cW, cH, (ctx) => {
      drawSciFiChaingun(ctx, { rotFrame: 2, isFiring: true, rpmText: '5200 RPM', ventVapor: false });
    }),
    // Frame 3: Active Coolant Vent (Coolant vapor venting from shroud after burst)
    createCanvas(cW, cH, (ctx) => {
      drawSciFiChaingun(ctx, { rotFrame: 0, isFiring: false, rpmText: 'VENTING', ventVapor: true });
    })
  ];

  // ==========================================================================
  // 5. ENERGY ACCELERATOR: MARK-V QUANTUM SINGULARITY ACCELERATOR (320 x 220)
  // Hard sci-fi energy superweapon. Central tempered quartz vacuum chamber
  // containing a swirling turquoise singularity vortex with floating magnetic
  // rings, twin superconducting emitter prongs with lightning micro-arcs,
  // OLED diagnostics monitor, and 2-stage reload animations (canopy unlatches,
  // dark core pops, fresh singularity cell slapped into place).
  // ==========================================================================
  const plW = 320;
  const plH = 220;

  const drawSciFiPlasma = (
    ctx: CanvasRenderingContext2D,
    opts: {
      powerLevel: number; // 0 = idle, 1 = surge, 2 = blast
      reloadStage: number; // 0 = normal, 1 = canopy open / eject, 2 = fresh core inserted
      coreBrightness: number;
    }
  ) => {
    const cx = 160; // Centerline

    // --- CYBERNETIC SUPPORT HANDS ---
    // Right hand on trigger grip
    drawCyberGlove(ctx, cx + 58, 174, true, 0, '#06b6d4', false, false);

    // Left support hand
    if (opts.reloadStage === 0) {
      drawCyberGlove(ctx, cx - 58, 168, false, 0, '#06b6d4', false, false);
    } else if (opts.reloadStage === 1) {
      // Left hand reaching up to extract the depleted dark core
      drawCyberGlove(ctx, cx - 32, 108, false, 0, '#38bdf8', false, false);
    } else if (opts.reloadStage === 2) {
      // Left hand thrusting fresh glowing cyan singularity cell into the open core chamber
      drawCyberGlove(ctx, cx - 18, 98, false, 0, '#06b6d4', false, false);
    }

    // --- REAR RECEIVER & DIAGNOSTICS DECK ---
    drawBevelBox(ctx, cx - 36, 122, 72, 90, '#080d15', '#1e2d40', '#030508', 2);

    // OLED Quantum Diagnostics Screen
    const diagText = opts.reloadStage > 0 ? 'CANOPY OPEN' : opts.powerLevel === 2 ? 'SURGE: 100%' : 'ION: 99%';
    drawSciFiDisplay(
      ctx,
      cx - 24,
      130,
      48,
      22,
      diagText,
      '1.21 GW',
      opts.reloadStage > 0 ? '#f59e0b' : '#38bdf8',
      6,
      opts.reloadStage === 1 ? 1 : 6
    );

    // LATERAL VECTOR COOLING FINS (Left & Right Flanks)
    for (let f = 0; f < 4; f++) {
      const fy = 138 + f * 14;
      // Left fin
      drawBevelBox(ctx, cx - 48, fy, 12, 8, '#141e2b', '#2e415a', '#060a0f', 1);
      ctx.fillStyle = opts.powerLevel > 0 ? '#38bdf8' : '#0284c7';
      ctx.fillRect(cx - 46, fy + 2, 8, 4);

      // Right fin
      drawBevelBox(ctx, cx + 36, fy, 12, 8, '#141e2b', '#2e415a', '#060a0f', 1);
      ctx.fillStyle = opts.powerLevel > 0 ? '#38bdf8' : '#0284c7';
      ctx.fillRect(cx + 38, fy + 2, 8, 4);
    }

    // --- CENTRAL QUANTUM SINGULARITY CONTAINMENT CHAMBER ---
    // If reload stage 1, the upper canopy pivots open
    const canopyOpen = opts.reloadStage === 1;

    // Chamber base cradle
    drawBevelBox(ctx, cx - 28, 86, 56, 38, '#0d1624', '#283c56', '#04070c', 2);

    // Tempered Vacuum Quartz Cylinder
    const glassGrad = ctx.createLinearGradient(cx - 24, 52, cx + 24, 52);
    glassGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    glassGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(cx - 24, 52, 48, 38);
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 24, 52, 48, 38);

    // SWIRLING TURQUOISE SINGULARITY VORTEX & MAGNETIC STABILIZER RINGS
    const coreY = 71;
    if (opts.reloadStage === 1) {
      // Depleted dark core popping out of chamber with cyan vapor cloud
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, coreY - 14, 22, 0, Math.PI * 2);
      ctx.fill();

      // Depleted core housing
      drawBevelBox(ctx, cx - 12, coreY - 24, 24, 18, '#0b0f16', '#334155', '#020617', 1.5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx - 8, coreY - 18, 16, 4);
    } else {
      // Active Swirling Singularity Core
      const coreR = opts.powerLevel === 2 ? 18 : opts.powerLevel === 1 ? 14 : 10;
      const vortexGrad = ctx.createRadialGradient(cx, coreY, 2, cx, coreY, coreR);
      vortexGrad.addColorStop(0, '#ffffff');
      vortexGrad.addColorStop(0.4, '#38bdf8');
      vortexGrad.addColorStop(0.8, '#0284c7');
      vortexGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = vortexGrad;
      ctx.beginPath();
      ctx.arc(cx, coreY, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Floating concentric magnetic stabilizer rings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, coreY, 18, 6, 0.35, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx, coreY, 16, 5, -0.35, 0, Math.PI * 2);
      ctx.stroke();

      // Specular quartz glass highlight reflection
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(cx - 20, 56, 3, 30);
    }

    if (canopyOpen) {
      // Upper canopy pivoted up 45 degrees on chrome hydraulic hinge
      ctx.save();
      ctx.translate(cx, 44);
      ctx.rotate(-0.35);
      drawBevelBox(ctx, -26, -14, 52, 14, '#1c2838', '#455b77', '#080d14', 2);
      ctx.restore();
    } else {
      // Canopy clamped down tight
      drawBevelBox(ctx, cx - 26, 42, 52, 12, '#152130', '#3b4e67', '#070b11', 2);
    }

    // --- TWIN SUPERCONDUCTING EMITTER PRONGS ---
    // Left Emitter Blade
    drawBevelBox(ctx, cx - 24, 12, 10, 36, '#182436', '#475e7d', '#080d14', 2);
    // Left coil windings
    for (let py = 18; py < 44; py += 6) {
      ctx.fillStyle = opts.powerLevel > 0 ? '#38bdf8' : '#0284c7';
      ctx.fillRect(cx - 23, py, 8, 2.5);
    }

    // Right Emitter Blade
    drawBevelBox(ctx, cx + 14, 12, 10, 36, '#182436', '#475e7d', '#080d14', 2);
    // Right coil windings
    for (let py = 18; py < 44; py += 6) {
      ctx.fillStyle = opts.powerLevel > 0 ? '#38bdf8' : '#0284c7';
      ctx.fillRect(cx + 15, py, 8, 2.5);
    }

    // Micro-lightning electric arcs bridging between emitter prongs
    if (opts.powerLevel >= 1) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 14, 20);
      ctx.lineTo(cx - 4, 16);
      ctx.lineTo(cx + 4, 24);
      ctx.lineTo(cx + 14, 20);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx - 14, 32);
      ctx.lineTo(cx, 36);
      ctx.lineTo(cx + 14, 30);
      ctx.stroke();
    }

    // RELOAD PHASE 2: Fresh Singularity Cell Slapped In
    if (opts.reloadStage === 2) {
      // High-density glowing cyan cell inserted with lightning flare
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx, coreY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, coreY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Insertion electrical arcs
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      for (let a = 0; a < 4; a++) {
        const ang = (a * Math.PI) / 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, coreY);
        ctx.lineTo(cx + Math.cos(ang) * 22, coreY + Math.sin(ang) * 22);
        ctx.stroke();
      }
    }

    // QUANTUM ION PULSE DETONATION BLAST
    if (opts.powerLevel === 2) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
      ctx.beginPath();
      ctx.arc(cx, 14, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, 14, 20, 0, Math.PI * 2);
      ctx.fill();

      // Radial shockwave ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, 14, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  weaponCanvases['plasma'] = [
    // Frame 0: Idle Containment (Plasma vortex swirling stably, emitter charged)
    createCanvas(plW, plH, (ctx) => {
      drawSciFiPlasma(ctx, { powerLevel: 0, reloadStage: 0, coreBrightness: 1 });
    }),
    // Frame 1: Capacitor Overcharge Surge (Vortex expands, lightning arcing across prongs)
    createCanvas(plW, plH, (ctx) => {
      drawSciFiPlasma(ctx, { powerLevel: 1, reloadStage: 0, coreBrightness: 1.5 });
    }),
    // Frame 2: Quantum Ion Pulse Blast (Massive spherical plasma detonation)
    createCanvas(plW, plH, (ctx) => {
      drawSciFiPlasma(ctx, { powerLevel: 2, reloadStage: 0, coreBrightness: 2 });
    }),
    // Frame 3: Reload Phase 1 (Canopy open, depleted core cell ejected with cyan vapor)
    createCanvas(plW, plH, (ctx) => {
      drawSciFiPlasma(ctx, { powerLevel: 0, reloadStage: 1, coreBrightness: 0.2 });
    }),
    // Frame 4: Reload Phase 2 (Fresh blinding quantum singularity cell slotted into place)
    createCanvas(plW, plH, (ctx) => {
      drawSciFiPlasma(ctx, { powerLevel: 0, reloadStage: 2, coreBrightness: 2 });
    })
  ];

  return weaponCanvases;
}
