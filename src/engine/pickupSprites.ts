// ============================================================================
// SCI-FI MOVIE PICKUP SPRITES ENGINE
// Inspired by blockbuster sci-fi films and high-tech combat simulations:
// Features: Nano-stim injectors, Bio-regen trauma cores, Hard-light shield modules,
// Aegis over-shield reactors, Hyper-matter plasma cells, Tungsten penetrator mags,
// Thermite buckshot canisters, High-tech weapon pickups, and Quantum Overdrive cores!
// ============================================================================

export type CanvasBuilder = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
) => HTMLCanvasElement;

export function generateAllPickupSprites(
  createCanvas: CanvasBuilder
): Record<string, HTMLCanvasElement> {
  const items: Record<string, HTMLCanvasElement> = {};
  const size = 64;

  // --------------------------------------------------------------------------
  // 1. SMALL MEDKIT: Nano-Stim Injector Cartridge (Sleek Rounded Capsule)
  // --------------------------------------------------------------------------
  items['medkit_small'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chassis Base (Dark Titanium Composite - Rounded Capsule)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(14, 18, 36, 34, 10); else ctx.rect(14, 18, 36, 34);
    ctx.fill();

    // Beveled Main Body
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(16, 20, 32, 30, 8); else ctx.rect(16, 20, 32, 30);
    ctx.fill();

    // Pressurized Bio-Stim Ampoule (Glowing Cyan Oval Chamber)
    ctx.fillStyle = '#083344';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(22, 24, 20, 18, 6); else ctx.rect(22, 24, 20, 18);
    ctx.fill();

    const fluidGrad = ctx.createLinearGradient(0, 24, 0, 42);
    fluidGrad.addColorStop(0, '#06b6d4');
    fluidGrad.addColorStop(0.5, '#22d3ee');
    fluidGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = fluidGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(24, 26, 16, 14, 5); else ctx.rect(24, 26, 16, 14);
    ctx.fill();

    // Medical Cross Emblem
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(30, 29, 4, 10, 2);
      ctx.roundRect(27, 32, 10, 4, 2);
    } else {
      ctx.rect(30, 29, 4, 10);
      ctx.rect(27, 32, 10, 4);
    }
    ctx.fill();

    // Status Display & LED
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(22, 46, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Top Injection Needle Assembly
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(28, 12, 8, 6, 3); else ctx.rect(28, 12, 8, 6);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(31, 8, 2, 5);
  });

  // --------------------------------------------------------------------------
  // 2. LARGE MEDKIT: Cybernetic Trauma Core / Bio-Regen Matrix
  // --------------------------------------------------------------------------
  items['medkit_large'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(32, 58, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft Ambient Green Bio-Glow
    const glow = ctx.createRadialGradient(32, 34, 4, 32, 34, 26);
    glow.addColorStop(0, 'rgba(34, 197, 94, 0.45)');
    glow.addColorStop(0.6, 'rgba(16, 185, 129, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(32, 34, 26, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Industrial Alloy Casing (Rounded Pill Chamber)
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(16, 14, 32, 40, 12); else ctx.rect(16, 14, 32, 40);
    ctx.fill();

    ctx.fillStyle = '#022c22';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(18, 16, 28, 36, 10); else ctx.rect(18, 16, 28, 36);
    ctx.fill();

    // Cylindrical Bio-Fluids Chamber (Bright Emerald Rounded Cylinder)
    const fluidGrad = ctx.createLinearGradient(0, 18, 0, 48);
    fluidGrad.addColorStop(0, '#10b981');
    fluidGrad.addColorStop(0.5, '#4ade80');
    fluidGrad.addColorStop(1, '#059669');
    ctx.fillStyle = fluidGrad;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') ctx.roundRect(22, 18, 20, 30, 8); else ctx.rect(22, 18, 20, 30);
    ctx.fill();

    // Glass Reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(24, 20, 3, 26);
    ctx.fillRect(36, 22, 2, 22);

    // Holographic Medical Cross (Floating / Bright White-Cyan)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(29, 26, 6, 14);
    ctx.fillRect(25, 30, 14, 6);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(30, 27, 4, 12);
    ctx.fillRect(26, 31, 12, 4);

    // Top Pressure Regulator Valve & Titanium Cap
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 8, 24, 6);
    ctx.fillStyle = '#475569';
    ctx.fillRect(22, 10, 20, 3);
    ctx.fillStyle = '#10b981'; // Pressure gauge
    ctx.beginPath();
    ctx.arc(32, 11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Bottom Shock Absorbers & Base Flange
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(14, 52, 36, 6);
    ctx.fillStyle = '#334155';
    ctx.fillRect(16, 53, 32, 2);
  });

  // --------------------------------------------------------------------------
  // 3. SMALL ARMOR: Hard-Light Kinetic Shield Battery
  // Sleek hexagonal energy module with amber power conduits
  // --------------------------------------------------------------------------
  items['armor_small'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Matte Carbon-Steel Outer Frame
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(32, 12);
    ctx.lineTo(50, 22);
    ctx.lineTo(50, 44);
    ctx.lineTo(32, 54);
    ctx.lineTo(14, 44);
    ctx.lineTo(14, 22);
    ctx.closePath();
    ctx.fill();

    // Inner Alloy Plate
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(32, 15);
    ctx.lineTo(47, 24);
    ctx.lineTo(47, 42);
    ctx.lineTo(32, 51);
    ctx.lineTo(17, 42);
    ctx.lineTo(17, 24);
    ctx.closePath();
    ctx.fill();

    // Kinetic Hard-Light Energy Matrix (Glowing Emerald / Lime)
    const shieldGrad = ctx.createRadialGradient(32, 33, 2, 32, 33, 16);
    shieldGrad.addColorStop(0, '#ecfdf5');
    shieldGrad.addColorStop(0.4, '#10b981');
    shieldGrad.addColorStop(0.8, '#047857');
    shieldGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.moveTo(32, 19);
    ctx.lineTo(43, 26);
    ctx.lineTo(43, 40);
    ctx.lineTo(32, 47);
    ctx.lineTo(21, 40);
    ctx.lineTo(21, 26);
    ctx.closePath();
    ctx.fill();

    // Hexagonal Matrix Lines
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(32, 23);
    ctx.lineTo(39, 28);
    ctx.lineTo(39, 38);
    ctx.lineTo(32, 43);
    ctx.lineTo(25, 38);
    ctx.lineTo(25, 28);
    ctx.closePath();
    ctx.stroke();

    // Center Quantum Node
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(30, 31, 4, 4);

    // Connector Terminals (Gold/Bronze)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(18, 45, 4, 3);
    ctx.fillRect(42, 45, 4, 3);
  });

  // --------------------------------------------------------------------------
  // 4. LARGE ARMOR: Heavy Aegis Over-Shield Reactor
  // Dark titanium blast plating with dual glowing cobalt plasma coils & shield crest
  // --------------------------------------------------------------------------
  items['armor_large'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(32, 58, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient Cobalt Shield Aura
    const aura = ctx.createRadialGradient(32, 32, 4, 32, 32, 26);
    aura.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
    aura.addColorStop(0.6, 'rgba(2, 132, 199, 0.18)');
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Reinforced Shield Plate (Shaped like a tactical ballistic shield)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(52, 10);
    ctx.lineTo(48, 42);
    ctx.lineTo(32, 54);
    ctx.lineTo(16, 42);
    ctx.closePath();
    ctx.fill();

    // Metallic Bevel Body
    ctx.fillStyle = '#1e3a8a';
    ctx.beginPath();
    ctx.moveTo(15, 13);
    ctx.lineTo(49, 13);
    ctx.lineTo(45, 40);
    ctx.lineTo(32, 51);
    ctx.lineTo(19, 40);
    ctx.closePath();
    ctx.fill();

    // Titanium Ridge Plates
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 16, 24, 4);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(20, 20, 24, 2);

    // Dual Plasma Containment Coils (Left and Right)
    const coilGrad = ctx.createLinearGradient(0, 24, 0, 42);
    coilGrad.addColorStop(0, '#38bdf8');
    coilGrad.addColorStop(0.5, '#ffffff');
    coilGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = coilGrad;
    ctx.fillRect(22, 24, 7, 16);
    ctx.fillRect(35, 24, 7, 16);

    // Magnetic Coil Rings
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 27, 11, 2);
    ctx.fillRect(20, 33, 11, 2);
    ctx.fillRect(33, 27, 11, 2);
    ctx.fillRect(33, 33, 11, 2);

    // Center Quantum Aegis Core (Glowing White-Cyan)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, 32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#60a5fa';
    ctx.fillRect(31, 38, 2, 8); // conduit
  });

  // --------------------------------------------------------------------------
  // 5. AMMO BULLETS: Tungsten Caseless Penetrator Magazine
  // Translucent composite magazine with visible high-velocity tungsten rounds & digital gauge
  // --------------------------------------------------------------------------
  items['ammo_bullets'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Magazine Baseplate (Gunmetal Titanium)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(18, 48, 28, 6);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(20, 49, 24, 2);

    // Translucent Smoked Polymer Magazine Body
    ctx.fillStyle = '#27272a';
    ctx.fillRect(20, 16, 24, 32);
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(22, 18, 20, 28);

    // Transparent Inspection Window showing Caseless Ammo Rounds (Golden Tungsten)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(25, 20, 14, 24);

    for (let r = 0; r < 5; r++) {
      const ry = 22 + r * 4.5;
      // Brass / Tungsten projectile
      ctx.fillStyle = '#eab308';
      ctx.fillRect(27, ry, 10, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(28, ry, 3, 3);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(33, ry, 4, 3);
    }

    // High-Tech Magnetic Feed Lips & Guide Rail (Top)
    ctx.fillStyle = '#52525b';
    ctx.fillRect(22, 10, 20, 6);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(28, 8, 8, 3); // top round visible in feed lips
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(30, 8, 4, 2);

    // Digital Capacity Bar LED (Yellow Glow)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(41, 22, 2, 18);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(41, 24, 2, 4);
  });

  // --------------------------------------------------------------------------
  // 6. AMMO SHELLS: Thermite Heavy Shotgun Canister
  // Carbon-fiber canister with illuminated crimson status bands & primer seals
  // --------------------------------------------------------------------------
  items['ammo_shells'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Industrial Heavy Ammo Crate Box
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(14, 18, 36, 36);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(16, 20, 32, 32);

    // Reinforced Carbon-Fiber Ribs
    ctx.fillStyle = '#18181b';
    ctx.fillRect(14, 24, 36, 4);
    ctx.fillRect(14, 36, 36, 4);

    // Crimson Illuminated Status Band
    const bandGrad = ctx.createLinearGradient(16, 0, 48, 0);
    bandGrad.addColorStop(0, '#dc2626');
    bandGrad.addColorStop(0.5, '#f87171');
    bandGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = bandGrad;
    ctx.fillRect(16, 30, 32, 4);

    // 4 High-Density Shell Primers Visible on Top (Brass & Crimson Caps)
    for (let s = 0; s < 4; s++) {
      const sx = 18 + s * 8;
      // Brass rim
      ctx.fillStyle = '#eab308';
      ctx.fillRect(sx, 12, 6, 6);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx + 1, 13, 2, 4);
      // Red hull tip
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(sx + 1, 9, 4, 3);
    }

    // Hazard Stripes & Lock Clamp
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(28, 43, 8, 5);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(30, 44, 4, 3);
  });

  // --------------------------------------------------------------------------
  // 7. AMMO CELLS: Hyper-Matter Plasma Cell Canister
  // Cylindrical magnetic containment vessel with pulsing electric-blue core
  // --------------------------------------------------------------------------
  items['ammo_cells'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(32, 57, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient Cyan Plasma Aura
    const glow = ctx.createRadialGradient(32, 33, 2, 32, 33, 22);
    glow.addColorStop(0, 'rgba(34, 211, 238, 0.45)');
    glow.addColorStop(0.5, 'rgba(6, 182, 212, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(32, 33, 22, 0, Math.PI * 2);
    ctx.fill();

    // Dark Titanium Containment Frame
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(18, 12, 28, 42);

    // Magnetic Stabilizer Rings (Top and Bottom)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(16, 12, 32, 6);
    ctx.fillRect(16, 48, 32, 6);
    ctx.fillStyle = '#38bdf8'; // Status LED rings
    ctx.fillRect(18, 16, 28, 1.5);
    ctx.fillRect(18, 48, 28, 1.5);

    // Super-Critical Plasma Core (Electric Cyan / Pure White Center)
    const plasmaGrad = ctx.createLinearGradient(0, 18, 0, 48);
    plasmaGrad.addColorStop(0, '#06b6d4');
    plasmaGrad.addColorStop(0.5, '#ffffff');
    plasmaGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = plasmaGrad;
    ctx.fillRect(23, 18, 18, 30);

    // Magnetic Containment Struts (Protecting Core)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(20, 27, 24, 3);
    ctx.fillRect(20, 36, 24, 3);
    ctx.fillStyle = '#334155';
    ctx.fillRect(21, 28, 22, 1);
    ctx.fillRect(21, 37, 22, 1);

    // Electric Arcs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28, 22, 3, 2);
    ctx.fillRect(33, 31, 2, 3);
    ctx.fillRect(27, 41, 4, 2);
  });

  // --------------------------------------------------------------------------
  // 7b. AMMO BELTS: Heavy Rotary Chaingun Linked Belt Crate
  // Heavy armor-plated green canister with linked metallic brass rounds spilling out
  // --------------------------------------------------------------------------
  items['ammo_belts'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(32, 57, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Industrial Steel Ammo Box Body
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(12, 22, 40, 32);
    ctx.fillStyle = '#14532d'; // Tactical olive drab / heavy green
    ctx.fillRect(14, 24, 36, 28);

    // Reinforced Steel Frame & Latches
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(12, 28, 40, 3);
    ctx.fillRect(12, 42, 40, 3);

    // Amber Hazard Status Strip
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(14, 34, 36, 3);

    // Metal Buckle / Clasp
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(28, 32, 8, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(30, 34, 4, 3);

    // Continuous Flexible Linked Belt of Heavy Brass Cartridges spilling over top
    // Metallic Steel Links holding Brass Rounds
    const beltX = [16, 22, 28, 34, 40];
    for (let i = 0; i < beltX.length; i++) {
      const bx = beltX[i];
      // Golden Brass Shell Case
      ctx.fillStyle = '#eab308';
      ctx.fillRect(bx, 10, 5, 14);
      // Bright Metallic Highlight
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(bx + 1, 11, 2, 12);
      // Lead/Copper Tip
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx + 1, 7, 3, 3);
      // Steel Metallic Belt Link Connector Loop
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx - 1, 16, 7, 3);
    }
  });

  // --------------------------------------------------------------------------
  // 8. WEAPON: UAC-X2 Breacher Tactical Shotgun Pickup
  // High-tech combat shotgun on magnetic anti-grav weapon mount with crimson LED
  // --------------------------------------------------------------------------
  items['weapon_shotgun'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 24, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Anti-Grav Weapon Platform Base (Carbon-Alloy Crate)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 44, 48, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 45, 44, 8);
    ctx.fillStyle = '#f97316'; // Orange magnetic guide rails
    ctx.fillRect(12, 44, 40, 2);

    // Shotgun Receiver (Matte Black Titanium)
    ctx.fillStyle = '#18181b';
    ctx.fillRect(16, 24, 26, 12);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(18, 25, 22, 8);

    // Ribbed Heat-Shield Heavy Barrel
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(38, 25, 18, 5);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(40, 24, 2, 7);
    ctx.fillRect(45, 24, 2, 7);
    ctx.fillRect(50, 24, 2, 7);

    // Muzzle Brake
    ctx.fillStyle = '#52525b';
    ctx.fillRect(56, 24, 3, 7);

    // Tubular Magazine underneath barrel
    ctx.fillStyle = '#27272a';
    ctx.fillRect(36, 31, 18, 4);

    // Ergonomic Combat Grip & Stock
    ctx.fillStyle = '#09090b';
    ctx.fillRect(10, 28, 10, 14);
    ctx.fillRect(18, 34, 6, 8); // trigger grip

    // Crimson Status LED & Holographic Scope
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(24, 23, 8, 2);
    ctx.fillStyle = '#38bdf8'; // Holographic scope dot
    ctx.fillRect(26, 18, 4, 4);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(25, 21, 6, 2);
  });

  // --------------------------------------------------------------------------
  // 9. WEAPON: Vulcan-X Rotary Heavy Minigun Pickup
  // Multi-barrel rotary chaingun with high-speed motor housings & hazard decals
  // --------------------------------------------------------------------------
  items['weapon_chaingun'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy Weapon Platform
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(6, 45, 52, 9);
    ctx.fillStyle = '#f59e0b'; // Hazard stripes on mount
    ctx.fillRect(8, 45, 5, 2);
    ctx.fillRect(18, 45, 5, 2);
    ctx.fillRect(28, 45, 5, 2);
    ctx.fillRect(38, 45, 5, 2);
    ctx.fillRect(48, 45, 5, 2);

    // Heavy Rotary Motor Casing
    ctx.fillStyle = '#18181b';
    ctx.fillRect(12, 22, 22, 18);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(14, 24, 18, 14);

    // Motor Cooling Vents & Amber Spin Indicator
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(16, 28, 12, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(18, 29, 6, 1);

    // 4 Heavy Gatling Barrels (Extending Right)
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(34, 23, 24, 3);
    ctx.fillRect(34, 27, 24, 3);
    ctx.fillRect(34, 32, 24, 3);
    ctx.fillRect(34, 36, 24, 3);

    // Rotating Barrel Clamp Rings
    ctx.fillStyle = '#18181b';
    ctx.fillRect(42, 21, 3, 20);
    ctx.fillRect(52, 21, 3, 20);
    ctx.fillStyle = '#71717a';
    ctx.fillRect(56, 20, 3, 22); // muzzle crown

    // Rear Dual Combat Handles
    ctx.fillStyle = '#09090b';
    ctx.fillRect(6, 26, 8, 10);
    ctx.fillRect(8, 22, 4, 18);
  });

  // --------------------------------------------------------------------------
  // 10. WEAPON: Mark-V High-Energy Plasma Rifle Pickup
  // Futuristic rail carbine with glowing neon-cyan rail channels & heatsink fins
  // --------------------------------------------------------------------------
  items['weapon_plasma'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(32, 56, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient Cyan Weapon Glow
    const glow = ctx.createRadialGradient(32, 30, 2, 32, 30, 24);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
    glow.addColorStop(0.6, 'rgba(2, 132, 199, 0.12)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(32, 30, 24, 0, Math.PI * 2);
    ctx.fill();

    // High-Tech Anti-Grav Holster
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(8, 44, 48, 10);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(10, 44, 44, 2);

    // Plasma Rifle Main Chassis (Deep Matte Cobalt / Graphite)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(14, 23, 44, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 25, 40, 10);

    // Neon Cyan Magnetic Accelerator Rails (Top and Bottom)
    const railGrad = ctx.createLinearGradient(20, 0, 56, 0);
    railGrad.addColorStop(0, '#0284c7');
    railGrad.addColorStop(0.5, '#38bdf8');
    railGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = railGrad;
    ctx.fillRect(20, 21, 36, 3);
    ctx.fillRect(24, 34, 30, 2);

    // Exposed Heatsink Radiator Fins
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(22, 26, 3, 7);
    ctx.fillRect(28, 26, 3, 7);
    ctx.fillRect(34, 26, 3, 7);

    // Hyper-Plasma Capacitor Cell in Receiver (White-Cyan Core)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 27, 8, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(39, 26, 10, 1);
    ctx.fillRect(39, 32, 10, 1);

    // Forward Plasma Focusing Nozzle
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(57, 23, 3, 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(59, 25, 2, 3);

    // Rear Stock & Pistol Grip
    ctx.fillStyle = '#05080e';
    ctx.fillRect(8, 27, 8, 12);
    ctx.fillRect(16, 35, 6, 8);
  });

  // --------------------------------------------------------------------------
  // 11. POWER-UP: Quantum Overdrive / Berserk Singularity Core
  // Pulsing crimson hyper-cube suspended in gyroscopic dark-matter containment rings
  // --------------------------------------------------------------------------
  items['berserk_sphere'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(32, 57, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing Crimson / Violet Singularity Field
    const fieldGrad = ctx.createRadialGradient(32, 30, 2, 32, 30, 26);
    fieldGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    fieldGrad.addColorStop(0.2, '#ef4444');
    fieldGrad.addColorStop(0.5, '#dc2626');
    fieldGrad.addColorStop(0.75, 'rgba(168, 85, 247, 0.45)');
    fieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fieldGrad;
    ctx.beginPath();
    ctx.arc(32, 30, 26, 0, Math.PI * 2);
    ctx.fill();

    // Outer Gyroscopic Dark-Matter Containment Ring
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(32, 30, 22, 16, Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(32, 30, 22, 16, Math.PI / 6, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Counter-Rotating Ring
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, 30, 16, 21, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    // Super-Dense Singularity Hyper-Cube (Center)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(26, 24, 12, 12);
    ctx.fillStyle = '#fda4af';
    ctx.fillRect(27, 25, 10, 10);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(29, 27, 6, 6);

    // Bio-Hazard Overdrive Runes / Demon Slit Eyes inside core
    ctx.fillStyle = '#000000';
    ctx.fillRect(28, 29, 3, 2);
    ctx.fillRect(33, 29, 3, 2);

    // Crackling Energy Arcs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 18, 2, 4);
    ctx.fillRect(41, 22, 3, 2);
    ctx.fillRect(22, 40, 2, 3);
    ctx.fillRect(43, 38, 3, 2);
  });

  // 13: Chrono-Haste Relic / Infinite Dash Artifact (Secret Vault Powerup)
  items['infinite_dash_relic'] = createCanvas(size, size, (ctx) => {
    // Floor Contact Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(32, 57, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Radiant Cyan / Amber Temporal Forcefield
    const fieldGrad = ctx.createRadialGradient(32, 30, 2, 32, 30, 26);
    fieldGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    fieldGrad.addColorStop(0.2, '#38bdf8');
    fieldGrad.addColorStop(0.5, '#0284c7');
    fieldGrad.addColorStop(0.75, 'rgba(234, 179, 8, 0.4)');
    fieldGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fieldGrad;
    ctx.beginPath();
    ctx.arc(32, 30, 26, 0, Math.PI * 2);
    ctx.fill();

    // Outer Chronometer Brass Ring
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(32, 30, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Counter-Rotating Temporal Ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(32, 30, 18, 14, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    // Radiant Core Hourglass Prism (Center)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(26, 20);
    ctx.lineTo(38, 20);
    ctx.lineTo(32, 30);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(32, 30);
    ctx.lineTo(38, 40);
    ctx.lineTo(26, 40);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(30, 28, 4, 4);

    // Crackling Cyan Lightning Sparks
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(18, 22, 3, 2);
    ctx.fillRect(44, 24, 2, 3);
    ctx.fillRect(20, 38, 2, 3);
    ctx.fillRect(42, 36, 3, 2);
  });

  return items;
}
