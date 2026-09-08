// ============================================================================
// SCI-FI MUTANTS & ZOMBIES ENEMY SPRITES ENGINE
// Complete visual makeover transforming all enemies and bosses into horrifying
// bio-mechanical mutants, shambling undead zombies, and cybernetic abominations:
// 1. Grunt: Necrotic Marine Zombie (shambling undead soldier in torn combat gear)
// 2. Imp: Feral Xenomorphic Mutant Ghoul (spined bio-mutant with venomous talons)
// 3. Baron: Colossal Mutated Bio-Juggernaut (towering hulking mutated brute)
// 4. Lost Soul: Cyber-Necrotic Bio-Skull (floating decayed skull with jet thrusters)
// 5. Scuttler: Arachno-Mutant Horror (rotting zombie torso on 6 chitinous legs)
// 6. Plasma Gunner: Cyber-Mutant Heavy Enforcer (cyborg zombie with grafted cannon)
// 7. Vile Spitter: Acid-Bloat Zombie Abomination (swollen mutant vomiting toxic acid)
// 8. Boss: Goliath Cyber-Mutant Titan (hydraulic industrial behemoth with rocket pod)
// 9. Ultra Boss: Apex Bio-Terror Hive Colossus (eldritch mutant hive-mind titan)
// ============================================================================

export type CanvasBuilder = (
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void
) => HTMLCanvasElement;

export function generateAllEnemySprites(createCanvas: CanvasBuilder): {
  enemyCanvases: Record<string, HTMLCanvasElement[]>;
  ultraBossCanvases: HTMLCanvasElement[];
} {
  const enemyCanvases: Record<string, HTMLCanvasElement[]> = {};
  const size = 64;

  // ==========================================================================
  // 1. GRUNT: Necrotic Marine Zombie
  // Shambling infected soldier with rotting green/grey necrotic flesh, torn hazard
  // combat vest exposing bone ribs, glowing yellow zombie eyes, and sparking rifle
  // ==========================================================================
  enemyCanvases['grunt'] = [
    // Frame 0: Shambling Walk Stride A
    createCanvas(size, size, (ctx) => {
      drawGruntBase(ctx, 0, 0, 0, false);
    }),
    // Frame 1: Shambling Walk Stride B
    createCanvas(size, size, (ctx) => {
      drawGruntBase(ctx, 1, 0, 0, false);
    }),
    // Frame 2: Attack (Firing sparking rifle with muzzle flash)
    createCanvas(size, size, (ctx) => {
      drawGruntBase(ctx, 0, 0, 0, true);
    }),
    // Frame 3: Pain / Flinch (Reeling backward with blood/ichor spray)
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(4, -2);
      ctx.rotate(0.08);
      drawGruntBase(ctx, 0, 0, 0, false);
      // Pain droplets
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(20, 16, 3, 3);
      ctx.fillRect(40, 22, 3, 3);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse (Collapsed flat on floor in pool of dark necrotic bile)
    createCanvas(size, size, (ctx) => {
      // Necrotic blood puddle
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(32, 54, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#365314';
      ctx.beginPath();
      ctx.ellipse(32, 54, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Corpse limbs sprawled
      ctx.fillStyle = '#1c1917'; // boots & torn pants
      ctx.fillRect(8, 50, 14, 5);
      ctx.fillRect(44, 48, 12, 6);
      ctx.fillStyle = '#1e293b'; // torn vest
      ctx.fillRect(20, 46, 24, 7);
      ctx.fillStyle = '#3f6212'; // rotting torso & arms
      ctx.fillRect(16, 48, 8, 4);
      ctx.fillRect(38, 49, 8, 4);
      ctx.fillStyle = '#65a30d'; // necrotic head on floor
      ctx.fillRect(28, 42, 10, 6);
      ctx.fillStyle = '#18181b'; // discarded rifle
      ctx.fillRect(14, 52, 20, 3);
    }),
    // Frame 5: Gibbed Explosion (Shattered skull, ribs, and gore)
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#65a30d', '#14532d', '#84cc16');
    }),
  ];

  // ==========================================================================
  // 2. IMP: Feral Xenomorphic Mutant Ghoul
  // Hunched bio-mutant with mottled toxic purple-grey flesh, razor-sharp scythe claws,
  // jagged mutated spinal bone spikes, and radioactive yellow slit eyes
  // ==========================================================================
  enemyCanvases['imp'] = [
    // Frame 0: Stalking Stride A
    createCanvas(size, size, (ctx) => {
      drawImpBase(ctx, 0, false);
    }),
    // Frame 1: Stalking Stride B
    createCanvas(size, size, (ctx) => {
      drawImpBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Rearing back, claws crackling with toxic green bio-plasma)
    createCanvas(size, size, (ctx) => {
      drawImpBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(-2, -3);
      drawImpBase(ctx, 0, false);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(28, 20, 4, 4);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse (Curled mutant body leaking acidic slime)
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#1e1b4b'; // toxic purple slime pool
      ctx.beginPath();
      ctx.ellipse(32, 54, 25, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(32, 54, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Curled limbs
      ctx.fillStyle = '#3b2d54';
      ctx.fillRect(14, 46, 36, 8);
      ctx.fillStyle = '#581c87';
      ctx.fillRect(18, 48, 28, 6);
      // Bone spikes on dead spine
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(22, 43, 3, 4);
      ctx.fillRect(28, 42, 3, 5);
      ctx.fillRect(34, 43, 3, 4);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#7e22ce', '#3b0764', '#4ade80');
    }),
  ];

  // ==========================================================================
  // 3. BARON: Colossal Mutated Bio-Juggernaut
  // Towering mutated behemoth with massive overgrown bone carapace plates bursting
  // through hypertrophied muscle, pulsing bio-chemical tumor sacs, and brutal claws
  // ==========================================================================
  enemyCanvases['baron'] = [
    // Frame 0: Heavy Stomp A
    createCanvas(size, size, (ctx) => {
      drawBaronBase(ctx, 0, false);
    }),
    // Frame 1: Heavy Stomp B
    createCanvas(size, size, (ctx) => {
      drawBaronBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Both massive mutant arms raised, chest bio-reactor flaring)
    createCanvas(size, size, (ctx) => {
      drawBaronBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(2, -2);
      drawBaronBase(ctx, 0, false);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(26, 16, 5, 5);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse (Colossal mutant toppled over)
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#450a0a';
      ctx.beginPath();
      ctx.ellipse(32, 54, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(12, 42, 42, 12);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(16, 44, 34, 8);
      // Overgrown bone horns & armor plates
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(14, 38, 6, 6);
      ctx.fillRect(44, 38, 6, 6);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#dc2626', '#7f1d1d', '#f97316');
    }),
  ];

  // ==========================================================================
  // 4. LOST SOUL: Cyber-Necrotic Bio-Skull
  // Floating decayed zombie skull spliced with neural cybernetics and roaring
  // twin green/cyan bio-plasma jet thrusters from its severed spinal column
  // ==========================================================================
  enemyCanvases['lost_soul'] = [
    // Frame 0: Hover A
    createCanvas(size, size, (ctx) => {
      drawLostSoulBase(ctx, 0, false);
    }),
    // Frame 1: Hover B
    createCanvas(size, size, (ctx) => {
      drawLostSoulBase(ctx, 1, false);
    }),
    // Frame 2: Charge Attack (Jaws snapping wide, thrusters surging with flame)
    createCanvas(size, size, (ctx) => {
      drawLostSoulBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(-2, 2);
      drawLostSoulBase(ctx, 1, false);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(24, 20, 4, 4);
      ctx.restore();
    }),
    // Frame 4: Death / Shatter Burst
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#fef08a', '#10b981', '#38bdf8');
    }),
  ];

  // ==========================================================================
  // 5. SCUTTLER: Arachno-Mutant Horror
  // Grotesque hybrid with a decaying zombie upper torso fused onto six chitinous
  // spider legs with dripping venom glands, pulsing abdomen sacs, and multiple eyes
  // ==========================================================================
  enemyCanvases['scuttler'] = [
    // Frame 0: Skittering Walk A
    createCanvas(size, size, (ctx) => {
      drawScuttlerBase(ctx, 0, false);
    }),
    // Frame 1: Skittering Walk B
    createCanvas(size, size, (ctx) => {
      drawScuttlerBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Rearing up on hind legs, forelegs lashing forward)
    createCanvas(size, size, (ctx) => {
      drawScuttlerBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(2, -2);
      drawScuttlerBase(ctx, 0, false);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(30, 22, 4, 4);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse (Curled spider legs on floor)
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#064e3b';
      ctx.beginPath();
      ctx.ellipse(32, 54, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#14532d';
      ctx.fillRect(16, 46, 32, 8);
      // Curled legs
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(10, 48, 6, 6);
      ctx.fillRect(48, 48, 6, 6);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#065f46', '#022c22', '#84cc16');
    }),
  ];

  // ==========================================================================
  // 6. PLASMA GUNNER: Cyber-Mutant Heavy Enforcer
  // Heavy shock trooper mutated with necrotic flesh grafted into industrial armor,
  // right arm replaced with a cyber-plasma cannon with glowing cooling coils
  // ==========================================================================
  enemyCanvases['plasma_gunner'] = [
    // Frame 0: Heavy Stride A
    createCanvas(size, size, (ctx) => {
      drawPlasmaGunnerBase(ctx, 0, false);
    }),
    // Frame 1: Heavy Stride B
    createCanvas(size, size, (ctx) => {
      drawPlasmaGunnerBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Firing glowing cyan plasma bolts)
    createCanvas(size, size, (ctx) => {
      drawPlasmaGunnerBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(-2, -2);
      drawPlasmaGunnerBase(ctx, 0, false);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(32, 22, 4, 4);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#082f49';
      ctx.beginPath();
      ctx.ellipse(32, 54, 26, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(14, 46, 36, 8);
      ctx.fillStyle = '#0284c7'; // cracked cyber cannon
      ctx.fillRect(36, 48, 14, 5);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#0284c7', '#0f172a', '#38bdf8');
    }),
  ];

  // ==========================================================================
  // 7. VILE SPITTER: Acid-Bloat Zombie Abomination
  // Hideously bloated necrotic mutant with a translucent distended belly of boiling
  // toxic green acid, weeping boil clusters, and split jaw vomiting corrosive bile
  // ==========================================================================
  enemyCanvases['vile_spitter'] = [
    // Frame 0: Bloated Shamble A
    createCanvas(size, size, (ctx) => {
      drawVileSpitterBase(ctx, 0, false);
    }),
    // Frame 1: Bloated Shamble B
    createCanvas(size, size, (ctx) => {
      drawVileSpitterBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Convulsing belly spewing torrent of green acid vomit)
    createCanvas(size, size, (ctx) => {
      drawVileSpitterBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(2, -2);
      drawVileSpitterBase(ctx, 0, false);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(28, 26, 6, 6);
      ctx.restore();
    }),
    // Frame 4: Dead Corpse (Ruptured deflated belly pool)
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.ellipse(32, 54, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(32, 54, 20, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#365314';
      ctx.fillRect(16, 48, 32, 6);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#22c55e', '#14532d', '#86efac');
    }),
  ];

  // ==========================================================================
  // 8. BOSS: Goliath Cyber-Mutant Titan
  // Huge multi-story mutated cyber-goliath. Fused rotting mutant flesh and industrial
  // titanium hydraulics, shoulder-mounted rocket pod, hydraulic crusher claw,
  // horned mutant skull with cyber eye, and exhaust smokestacks
  // ==========================================================================
  enemyCanvases['boss'] = [
    // Frame 0: Titan Stride A
    createCanvas(size, size, (ctx) => {
      drawBossBase(ctx, 0, false);
    }),
    // Frame 1: Titan Stride B
    createCanvas(size, size, (ctx) => {
      drawBossBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Rocket pod rotating and firing high-explosive missiles)
    createCanvas(size, size, (ctx) => {
      drawBossBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(2, -2);
      drawBossBase(ctx, 0, false);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(26, 18, 6, 6);
      ctx.restore();
    }),
    // Frame 4: Dead Wreckage
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(32, 54, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(10, 42, 44, 12);
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(16, 44, 32, 8);
      // Rocket pod wreckage
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 40, 14, 8);
      ctx.fillStyle = '#eab308'; // hazard stripes
      ctx.fillRect(42, 41, 3, 6);
      ctx.fillRect(47, 41, 3, 6);
    }),
    // Frame 5: Gibbed Explosion
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#ef4444', '#18181b', '#f59e0b');
    }),
  ];

  // ==========================================================================
  // 9. ULTRA BOSS: Apex Bio-Terror Hive Colossus
  // Giant eldritch necrotic mutant hive-mind boss with glowing toxic tendrils,
  // exposed mutant organs, twin grafted heavy plasma cannons, and mutagen core
  // ==========================================================================
  const ultraBossCanvases = [
    // Frame 0: Hover / Stride A
    createCanvas(size, size, (ctx) => {
      drawUltraBossBase(ctx, 0, false);
    }),
    // Frame 1: Hover / Stride B
    createCanvas(size, size, (ctx) => {
      drawUltraBossBase(ctx, 1, false);
    }),
    // Frame 2: Attack (Twin plasma cannons blasting with psionic core flare)
    createCanvas(size, size, (ctx) => {
      drawUltraBossBase(ctx, 0, true);
    }),
    // Frame 3: Pain / Flinch
    createCanvas(size, size, (ctx) => {
      ctx.save();
      ctx.translate(-2, -2);
      drawUltraBossBase(ctx, 0, false);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(28, 16, 8, 8);
      ctx.restore();
    }),
    // Frame 4: Dead Core
    createCanvas(size, size, (ctx) => {
      ctx.fillStyle = '#3b0764';
      ctx.beginPath();
      ctx.ellipse(32, 54, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#581c87';
      ctx.fillRect(12, 42, 40, 12);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(24, 44, 16, 6);
    }),
    // Frame 5: Gibbed Singularity
    createCanvas(size, size, (ctx) => {
      drawGibBlast(ctx, '#a855f7', '#3b0764', '#f0abfc');
    }),
  ];

  return { enemyCanvases, ultraBossCanvases };
}

// ----------------------------------------------------------------------------
// HELPER: Grunt (Zombie Soldier) Rendering (Smooth Rounded Organic Shapes)
// ----------------------------------------------------------------------------
function drawGruntBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  _offsetX: number,
  _offsetY: number,
  isAttacking: boolean
) {
  const stride = frame === 1;

  // 1. Shambling Legs & Torn Trousers (Rounded Pill Legs)
  ctx.fillStyle = '#1c1917';
  const leftLegX = stride ? 19 : 21;
  const rightLegX = stride ? 35 : 33;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(leftLegX, 38, 9, 14, 4);
    ctx.roundRect(rightLegX, 38, 9, 14, 4);
  } else {
    ctx.rect(leftLegX, 38, 9, 14);
    ctx.rect(rightLegX, 38, 9, 14);
  }
  ctx.fill();

  // Heavy combat boots (scuffed with dried blood - rounded caps)
  ctx.fillStyle = '#0c0a09';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(leftLegX - 2, 51, 11, 7, 3);
    ctx.roundRect(rightLegX, 51, 11, 7, 3);
  } else {
    ctx.rect(leftLegX - 2, 51, 11, 7);
    ctx.rect(rightLegX, 51, 11, 7);
  }
  ctx.fill();

  // 2. Torn Tactical Hazard Vest (Rounded Vest Body)
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(20, 20, 24, 18, 6); else ctx.rect(20, 20, 24, 18);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(22, 22, 20, 14, 4); else ctx.rect(22, 22, 20, 14);
  ctx.fill();

  // Exposed Fractured Ribs & Rotting Necrotic Flesh inside torn vest
  ctx.fillStyle = '#3f6212';
  ctx.beginPath();
  ctx.ellipse(31, 30, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rotting Zombie Head & Jaws (Rounded Head & Circular Eyes)
  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath();
  ctx.ellipse(32, 14, 10, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sunken Necrotic Eye Sockets (Circular)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(27, 13, 3.5, 0, Math.PI * 2);
  ctx.arc(37, 13, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Glowing mutant pupil (left) + milky dead eye (right)
  ctx.fillStyle = '#fef08a';
  ctx.beginPath(); ctx.arc(27, 13, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(37, 13, 1.8, 0, Math.PI * 2); ctx.fill();

  // Slavering Snarl Jaw with crooked rotten teeth
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(25, 17, 14, 4, 2); else ctx.rect(25, 17, 14, 4);
  ctx.fill();

  // 4. Arms & Weapon (Rounded Shoulders & Barrel)
  ctx.fillStyle = '#4d7c0f';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(13, 21, 7, 12, 3);
    ctx.roundRect(44, 21, 7, 12, 3);
  } else {
    ctx.rect(13, 21, 7, 12);
    ctx.rect(44, 21, 7, 12);
  }
  ctx.fill();

  // Oxidized Sci-Fi Carbine with rounded stock & barrel
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(20, 29, 28, 7, 3); else ctx.rect(20, 29, 28, 7);
  ctx.fill();

  ctx.fillStyle = '#52525b';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(48, 30, 8, 4, 2); else ctx.rect(48, 30, 8, 4);
  ctx.fill();

  if (isAttacking) {
    // High-contrast additive muzzle blast
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(58, 32, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(58, 32, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(58, 32, 13, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Imp (Feral Xenomorphic Bio-Mutant Ghoul) Rendering
// ----------------------------------------------------------------------------
function drawImpBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const stride = frame === 1;

  // 1. Hunched Mutated Legs (Digitigrade claws)
  ctx.fillStyle = '#2e1065'; // Mottled dark purple-violet hide
  const leftLegX = stride ? 17 : 20;
  const rightLegX = stride ? 37 : 34;
  ctx.fillRect(leftLegX, 38, 9, 12);
  ctx.fillRect(leftLegX - 3, 48, 8, 8);
  ctx.fillRect(rightLegX, 38, 9, 12);
  ctx.fillRect(rightLegX + 3, 48, 8, 8);

  // Mutated foot talons (bone white)
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(leftLegX - 6, 54, 7, 4);
  ctx.fillRect(rightLegX + 7, 54, 7, 4);

  // 2. Hunched Muscular Torso with Toxic Veins
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(17, 18, 30, 22);
  ctx.fillStyle = '#581c87';
  ctx.fillRect(19, 20, 26, 18);

  // Pulsing Emerald Toxic Veins across chest
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(23, 23, 8, 2);
  ctx.fillRect(28, 25, 2, 7);
  ctx.fillRect(32, 26, 8, 2);
  ctx.fillRect(37, 28, 2, 6);
  ctx.fillStyle = '#86efac';
  ctx.fillRect(25, 23, 4, 1);
  ctx.fillRect(34, 26, 4, 1);

  // Mutated Vertebrae Bone Spikes along hunched spine
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(14, 15, 4, 6);
  ctx.fillRect(16, 21, 4, 6);
  ctx.fillRect(15, 27, 4, 5);
  ctx.fillRect(17, 33, 3, 4);
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(15, 16, 2, 4);

  // 3. Feral Mutant Head
  ctx.fillStyle = '#581c87';
  ctx.fillRect(20, 6, 24, 14);
  ctx.fillStyle = '#7e22ce';
  ctx.fillRect(22, 7, 20, 6);

  // Glowing Radioactive Slit Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(23, 10, 6, 5);
  ctx.fillRect(35, 10, 6, 5);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(25, 10, 2, 5); // vertical slit pupil
  ctx.fillRect(37, 10, 2, 5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(25, 12, 2, 2);
  ctx.fillRect(37, 12, 2, 2);

  // Gaping Maw of Razor Teeth
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 15, 16, 5);
  ctx.fillStyle = '#fef08a';
  for (let t = 0; t < 5; t++) {
    ctx.fillRect(25 + t * 3, 15, 2, 2);
    ctx.fillRect(26 + t * 3, 18, 2, 2);
  }

  // 4. Arms & Long Curved Scythe Claws
  ctx.fillStyle = '#581c87';
  const armY = isAttacking ? 14 : 20;
  ctx.fillRect(11, armY, 8, 14);
  ctx.fillRect(45, armY, 8, 14);

  // Curved Bone Talons (dripping venom)
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(9, armY + 12, 6, 8);
  ctx.fillRect(49, armY + 12, 6, 8);
  ctx.fillStyle = '#22c55e'; // Green venom drops
  ctx.fillRect(9, armY + 20, 3, 4);
  ctx.fillRect(52, armY + 20, 3, 4);

  if (isAttacking) {
    // Crackling green bio-plasma fire in raised hands
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(12, 14, 7, 0, Math.PI * 2);
    ctx.arc(52, 14, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, 14, 3, 0, Math.PI * 2);
    ctx.arc(52, 14, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Baron (Colossal Mutated Bio-Juggernaut) Rendering
// ----------------------------------------------------------------------------
function drawBaronBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const stride = frame === 1;

  // 1. Massive Mutated Pillar Legs
  ctx.fillStyle = '#450a0a'; // Dark blood-red mutated hide
  const leftLegX = stride ? 14 : 17;
  const rightLegX = stride ? 41 : 38;
  ctx.fillRect(leftLegX, 36, 12, 18);
  ctx.fillRect(rightLegX, 36, 12, 18);

  // Heavy bone-plated cloven feet
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(leftLegX - 2, 50, 15, 8);
  ctx.fillRect(rightLegX - 1, 50, 15, 8);
  ctx.fillStyle = '#fef3c7'; // Bone hooves
  ctx.fillRect(leftLegX, 54, 11, 4);
  ctx.fillRect(rightLegX + 1, 54, 11, 4);

  // 2. Colossal Muscular Torso & Bio-Reactor
  ctx.fillStyle = '#570a0a';
  ctx.fillRect(12, 14, 40, 26);
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(15, 16, 34, 22);

  // Overgrown Calcified Bone Carapace bursting through shoulder flesh
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(6, 10, 10, 8); // left bone shoulder guard
  ctx.fillRect(48, 10, 10, 8); // right bone shoulder guard
  ctx.fillStyle = '#ca8a04';
  ctx.fillRect(8, 11, 6, 5);
  ctx.fillRect(50, 11, 6, 5);

  // Exposed Pulsating Bio-Chemical Core in chest
  ctx.fillStyle = '#f97316';
  ctx.fillRect(25, 20, 14, 10);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(27, 22, 10, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(30, 24, 4, 3);

  // Stitched Mutant Flesh seams
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(20, 17, 2, 18);
  ctx.fillRect(42, 17, 2, 18);

  // 3. Ferocious Mutant Skull with Dual Lower Mandibles
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(22, 4, 20, 12);
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(24, 5, 16, 5);

  // Overgrown Curved Mutant Horns
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(16, 2, 6, 5);
  ctx.fillRect(13, 0, 5, 4);
  ctx.fillRect(42, 2, 6, 5);
  ctx.fillRect(46, 0, 5, 4);

  // Molten Burning Red Eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 7, 5, 4);
  ctx.fillRect(35, 7, 5, 4);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(25, 8, 3, 2);
  ctx.fillRect(36, 8, 3, 2);

  // Multi-layered mutant mandibles
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(24, 12, 16, 4);
  ctx.fillStyle = '#fef3c7'; // Teeth
  ctx.fillRect(25, 12, 3, 2);
  ctx.fillRect(30, 12, 3, 2);
  ctx.fillRect(36, 12, 3, 2);

  // 4. Massive Spiked Mutant Arms
  const armY = isAttacking ? 8 : 16;
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(6, armY, 10, 18);
  ctx.fillRect(48, armY, 10, 18);

  // Spiked Knuckles
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(5, armY + 16, 12, 7);
  ctx.fillRect(47, armY + 16, 12, 7);
  ctx.fillRect(7, armY + 22, 3, 4); // knuckle spike
  ctx.fillRect(12, armY + 22, 3, 4);
  ctx.fillRect(49, armY + 22, 3, 4);
  ctx.fillRect(54, armY + 22, 3, 4);

  if (isAttacking) {
    // Twin blazing fireballs in massive fists
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.arc(11, 8, 8, 0, Math.PI * 2);
    ctx.arc(53, 8, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(11, 8, 4, 0, Math.PI * 2);
    ctx.arc(53, 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Lost Soul (Cyber-Necrotic Bio-Skull) Rendering
// ----------------------------------------------------------------------------
function drawLostSoulBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isCharging: boolean
) {
  const bobY = frame === 1 ? 2 : 0;

  // 1. Roaring Bio-Plasma Jet Flames from severed spinal cord
  const flameLength = isCharging ? 22 : 14;
  const flameGrad = ctx.createLinearGradient(0, 34 + bobY, 0, 34 + bobY + flameLength);
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.3, '#38bdf8');
  flameGrad.addColorStop(0.7, '#10b981');
  flameGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.ellipse(32, 38 + bobY, 10, flameLength, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Severed Spine & Cybernetic Jet Nozzle Assembly
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, 32 + bobY, 12, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(28, 33 + bobY, 8, 2);
  ctx.fillStyle = '#06b6d4'; // Thruster glow ring
  ctx.fillRect(27, 36 + bobY, 10, 2);

  // 3. Decayed Human Skull Visage
  ctx.fillStyle = '#fef3c7'; // Bone ivory
  ctx.beginPath();
  ctx.arc(32, 22 + bobY, 14, 0, Math.PI * 2);
  ctx.fill();

  // Exposed Glowing Brain Matter (Cranium cracked open)
  ctx.fillStyle = '#0284c7'; // Neural cyber-cables
  ctx.fillRect(26, 7 + bobY, 12, 3);
  const brainGrad = ctx.createRadialGradient(32, 12 + bobY, 1, 32, 12 + bobY, 7);
  brainGrad.addColorStop(0, '#67e8f9');
  brainGrad.addColorStop(0.5, '#06b6d4');
  brainGrad.addColorStop(1, '#0e7490');
  ctx.fillStyle = brainGrad;
  ctx.beginPath();
  ctx.ellipse(32, 11 + bobY, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Glowing Irradiated Eye Sockets
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(26, 21 + bobY, 4, 0, Math.PI * 2);
  ctx.arc(38, 21 + bobY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e'; // Emerald radioactive fire inside eyes
  ctx.fillRect(25, 20 + bobY, 3, 3);
  ctx.fillRect(37, 20 + bobY, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(26, 21 + bobY, 1, 1);
  ctx.fillRect(38, 21 + bobY, 1, 1);

  // 5. Grinning Titanium Teeth & Open Jaw
  const jawDrop = isCharging ? 6 : 2;
  ctx.fillStyle = '#0f172a'; // mouth cavity
  ctx.fillRect(26, 27 + bobY, 12, 4 + jawDrop);
  ctx.fillStyle = '#cbd5e1'; // Titanium teeth
  ctx.fillRect(27, 27 + bobY, 2, 2);
  ctx.fillRect(30, 27 + bobY, 2, 2);
  ctx.fillRect(33, 27 + bobY, 2, 2);
  ctx.fillRect(36, 27 + bobY, 2, 2);
  ctx.fillRect(28, 29 + bobY + jawDrop, 2, 2);
  ctx.fillRect(31, 29 + bobY + jawDrop, 2, 2);
  ctx.fillRect(34, 29 + bobY + jawDrop, 2, 2);

  // Sparks spraying from cracked skull
  if (isCharging) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(18, 14 + bobY, 2, 2);
    ctx.fillRect(44, 16 + bobY, 2, 2);
  }
}

// ----------------------------------------------------------------------------
// HELPER: Scuttler (Arachno-Mutant Horror) Rendering
// ----------------------------------------------------------------------------
function drawScuttlerBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const stride = frame === 1;

  // 1. 6 Chitinous Jointed Arachnid Legs
  ctx.fillStyle = '#0f172a';
  // Left 3 legs
  drawSpiderLeg(ctx, 22, 38, -1, stride ? 0 : 1);
  drawSpiderLeg(ctx, 22, 42, -1, stride ? 1 : 0);
  drawSpiderLeg(ctx, 22, 46, -1, stride ? 0 : 1);
  // Right 3 legs
  drawSpiderLeg(ctx, 42, 38, 1, stride ? 1 : 0);
  drawSpiderLeg(ctx, 42, 42, 1, stride ? 0 : 1);
  drawSpiderLeg(ctx, 42, 46, 1, stride ? 1 : 0);

  // 2. Bloated Abdomen Sac (Behind torso)
  const sacGrad = ctx.createRadialGradient(32, 44, 2, 32, 44, 14);
  sacGrad.addColorStop(0, '#84cc16');
  sacGrad.addColorStop(0.4, '#15803d');
  sacGrad.addColorStop(1, '#052e16');
  ctx.fillStyle = sacGrad;
  ctx.beginPath();
  ctx.ellipse(32, 44, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pulsing mutant egg sacs / veins on abdomen
  ctx.fillStyle = '#bef264';
  ctx.fillRect(28, 42, 3, 3);
  ctx.fillRect(34, 45, 4, 3);
  ctx.fillRect(30, 48, 3, 2);

  // 3. Fused Zombie Upper Torso
  ctx.fillStyle = '#14532d'; // Rotting necrotic skin
  ctx.fillRect(22, 18, 20, 18);
  ctx.fillStyle = '#166534';
  ctx.fillRect(24, 20, 16, 14);

  // Weeping Chemical Pustules
  ctx.fillStyle = '#eab308';
  ctx.fillRect(25, 23, 4, 4);
  ctx.fillRect(34, 27, 4, 4);

  // 4. Bloated Head with Multiple Twitching Spider Eyes
  ctx.fillStyle = '#14532d';
  ctx.fillRect(23, 7, 18, 12);

  // Multiple beady compound eyes (6 red / yellow dots)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(25, 10, 3, 3);
  ctx.fillRect(29, 9, 3, 3);
  ctx.fillRect(33, 9, 3, 3);
  ctx.fillRect(37, 10, 3, 3);
  ctx.fillRect(27, 13, 3, 3);
  ctx.fillRect(34, 13, 3, 3);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(26, 11, 1, 1);
  ctx.fillRect(30, 10, 1, 1);
  ctx.fillRect(34, 10, 1, 1);
  ctx.fillRect(38, 11, 1, 1);

  // Venomous Pedipalps / Mandibles
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(28, 17, 3, 5);
  ctx.fillRect(33, 17, 3, 5);
  ctx.fillStyle = '#84cc16'; // Dripping acid venom
  ctx.fillRect(28, 21, 2, 3);
  ctx.fillRect(34, 21, 2, 3);

  // 5. Fore-Claws (Extended if attacking)
  ctx.fillStyle = '#14532d';
  const armY = isAttacking ? 12 : 20;
  ctx.fillRect(14, armY, 6, 12);
  ctx.fillRect(44, armY, 6, 12);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(12, armY + 10, 4, 7);
  ctx.fillRect(48, armY + 10, 4, 7);
}

function drawSpiderLeg(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  dir: number,
  phase: number
) {
  const kneeX = originX + dir * (12 + phase * 2);
  const kneeY = originY - (6 + phase * 2);
  const footX = originX + dir * (18 + phase * 3);
  const footY = 56;

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();

  ctx.strokeStyle = '#22c55e'; // Toxic spine along leg
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
}

// ----------------------------------------------------------------------------
// HELPER: Plasma Gunner (Cyber-Mutant Heavy Enforcer) Rendering
// ----------------------------------------------------------------------------
function drawPlasmaGunnerBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const stride = frame === 1;

  // 1. Heavy Reinforced Armored Combat Boots & Legs
  ctx.fillStyle = '#0f172a';
  const leftLegX = stride ? 18 : 21;
  const rightLegX = stride ? 36 : 33;
  ctx.fillRect(leftLegX, 38, 10, 14);
  ctx.fillRect(rightLegX, 38, 10, 14);
  ctx.fillStyle = '#334155'; // Armor plates on thighs
  ctx.fillRect(leftLegX + 1, 39, 8, 7);
  ctx.fillRect(rightLegX + 1, 39, 8, 7);
  ctx.fillStyle = '#0284c7'; // Cyan status LED
  ctx.fillRect(leftLegX + 3, 44, 4, 1.5);

  // Heavy steel boots
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(leftLegX - 2, 51, 12, 7);
  ctx.fillRect(rightLegX, 51, 12, 7);

  // 2. Heavy Titanium Cybernetic Exo-Plating over Necrotic Muscle
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(18, 18, 28, 20);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(20, 20, 24, 16);

  // Necrotic Green Flesh bulging between cracked armor plates
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(22, 24, 8, 8);
  ctx.fillRect(34, 22, 6, 7);

  // Backpack Battery Power Conduit (Glowing Cyan)
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(14, 16, 4, 18);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(15, 18, 2, 14);

  // 3. Half-Skull, Half-Cyber Visor Head
  ctx.fillStyle = '#4d7c0f'; // Rotten flesh side
  ctx.fillRect(23, 6, 10, 14);
  ctx.fillStyle = '#1e293b'; // Cyber armor side
  ctx.fillRect(33, 6, 9, 14);

  // Cyber Targeting Optic (Glowing Red)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(34, 9, 7, 5);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(36, 10, 4, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(37, 11, 2, 1);

  // Undead Eye Socket on flesh side (Hollow yellow)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(25, 9, 5, 5);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(26, 10, 2, 2);

  // Titanium jaw clamp
  ctx.fillStyle = '#64748b';
  ctx.fillRect(27, 16, 12, 4);

  // 4. Left Arm (Organic Claw) & Right Arm (Grafted Heavy Plasma Cannon)
  // Left arm
  ctx.fillStyle = '#4d7c0f';
  ctx.fillRect(12, 20, 7, 14);

  // Grafted Heavy Cyber Plasma Cannon (Right side)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(38, 20, 20, 14);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(40, 22, 16, 10);

  // Glowing Plasma Radiator Vents
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(42, 24, 12, 3);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(44, 24, 8, 2);

  // Heavy plasma cannon emitter nozzle
  ctx.fillStyle = '#475569';
  ctx.fillRect(56, 23, 6, 8);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(60, 25, 3, 4);

  if (isAttacking) {
    // High-energy cyan plasma discharge
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(62, 27, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(62, 27, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Vile Spitter (Acid-Bloat Zombie Abomination) Rendering
// ----------------------------------------------------------------------------
function drawVileSpitterBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isVomiting: boolean
) {
  const shamble = frame === 1;

  // 1. Swollen Gangrenous Shambling Legs
  ctx.fillStyle = '#14532d';
  const leftLegX = shamble ? 18 : 20;
  const rightLegX = shamble ? 36 : 34;
  ctx.fillRect(leftLegX, 42, 10, 14);
  ctx.fillRect(rightLegX, 42, 10, 14);
  ctx.fillStyle = '#365314'; // necrotic sores on feet
  ctx.fillRect(leftLegX - 2, 52, 12, 6);
  ctx.fillRect(rightLegX, 52, 12, 6);

  // 2. Massive Translucent Distended Acid Belly (The core feature)
  const bellyGrad = ctx.createRadialGradient(32, 34, 4, 32, 34, 18);
  bellyGrad.addColorStop(0, '#d9f99d'); // bright bubbling acid center
  bellyGrad.addColorStop(0.4, '#84cc16'); // toxic lime
  bellyGrad.addColorStop(0.8, '#15803d'); // gangrenous outer membrane
  bellyGrad.addColorStop(1, '#052e16');
  ctx.fillStyle = bellyGrad;
  ctx.beginPath();
  ctx.ellipse(32, 34, 20, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Acid Bubbles inside translucent belly
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 28, 3, 3);
  ctx.fillRect(35, 34, 4, 3);
  ctx.fillRect(26, 38, 3, 2);
  ctx.fillRect(38, 29, 2, 2);

  // Grotesque Chemical Boil Clusters along shoulders
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.arc(18, 20, 5, 0, Math.PI * 2);
  ctx.arc(46, 20, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(17, 19, 2, 2);
  ctx.fillRect(45, 19, 2, 2);

  // 3. Rotting Zombie Head with 4-way Split Jaw
  ctx.fillStyle = '#14532d';
  ctx.fillRect(24, 7, 16, 12);

  // Yellow sunken eyes
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(26, 9, 4, 4);
  ctx.fillRect(34, 9, 4, 4);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(27, 10, 2, 2);
  ctx.fillRect(35, 10, 2, 2);

  // 4-Way Split Fleshy Mandibles
  ctx.fillStyle = '#7f1d1d'; // gaping acid maw
  ctx.fillRect(25, 14, 14, 7);
  ctx.fillStyle = '#fef08a'; // Sharp needles fangs
  ctx.fillRect(24, 13, 2, 4);
  ctx.fillRect(38, 13, 2, 4);
  ctx.fillRect(28, 20, 3, 2);
  ctx.fillRect(33, 20, 3, 2);

  // 4. Withered Claws
  ctx.fillStyle = '#14532d';
  ctx.fillRect(10, 22, 6, 14);
  ctx.fillRect(48, 22, 6, 14);

  // Torrent of Corrosive Vomit
  if (isVomiting) {
    const streamGrad = ctx.createLinearGradient(32, 18, 32, 48);
    streamGrad.addColorStop(0, '#ffffff');
    streamGrad.addColorStop(0.3, '#bef264');
    streamGrad.addColorStop(0.7, '#65a30d');
    streamGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = streamGrad;
    ctx.beginPath();
    ctx.moveTo(28, 18);
    ctx.lineTo(36, 18);
    ctx.lineTo(44, 46);
    ctx.lineTo(20, 46);
    ctx.closePath();
    ctx.fill();

    // Splattering acid blobs
    ctx.fillStyle = '#bef264';
    ctx.fillRect(16, 42, 4, 4);
    ctx.fillRect(44, 40, 4, 4);
    ctx.fillRect(18, 48, 5, 4);
    ctx.fillRect(40, 50, 5, 4);
  }
}

// ----------------------------------------------------------------------------
// HELPER: Boss (Goliath Cyber-Mutant Titan) Rendering
// ----------------------------------------------------------------------------
function drawBossBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const stomp = frame === 1;

  // 1. Massive Industrial Hydraulic Legs
  ctx.fillStyle = '#18181b';
  const leftLegX = stomp ? 12 : 16;
  const rightLegX = stomp ? 42 : 38;
  ctx.fillRect(leftLegX, 36, 14, 18);
  ctx.fillRect(rightLegX, 36, 14, 18);

  // Hydraulic Chrome Piston Struts
  ctx.fillStyle = '#71717a';
  ctx.fillRect(leftLegX + 2, 38, 4, 12);
  ctx.fillRect(rightLegX + 2, 38, 4, 12);
  ctx.fillStyle = '#38bdf8'; // hydraulic pressure lines
  ctx.fillRect(leftLegX + 7, 39, 2, 10);
  ctx.fillRect(rightLegX + 7, 39, 2, 10);

  // Heavy steel crusher boots
  ctx.fillStyle = '#09090b';
  ctx.fillRect(leftLegX - 2, 50, 18, 8);
  ctx.fillRect(rightLegX - 1, 50, 18, 8);

  // 2. Colossal Torso with Industrial Armor & Bio-Furnace
  ctx.fillStyle = '#27272a';
  ctx.fillRect(10, 12, 44, 26);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(12, 14, 40, 22);

  // Mutated Necrotic Muscle fusing directly into steel chassis
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(14, 18, 12, 14);
  ctx.fillRect(38, 18, 12, 14);

  // Glowing Plasma Reactor Furnace (Chest Center)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(24, 18, 16, 12);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(26, 20, 12, 8);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(29, 22, 6, 4);

  // Exhaust Smokestacks on Back (Billowing smoke)
  ctx.fillStyle = '#09090b';
  ctx.fillRect(14, 4, 6, 9);
  ctx.fillRect(44, 4, 6, 9);
  ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
  ctx.beginPath();
  ctx.arc(17, 2, 4, 0, Math.PI * 2);
  ctx.arc(47, 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // 3. Cybernetic Horned Demon-Mutant Skull Head
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(22, 4, 20, 11);

  // Titanium horns
  ctx.fillStyle = '#a1a1aa';
  ctx.fillRect(16, 2, 6, 4);
  ctx.fillRect(14, 0, 4, 3);
  ctx.fillRect(42, 2, 6, 4);
  ctx.fillRect(46, 0, 4, 3);

  // Red Cyber Targeting Eye (Left) & Hollow Undead Socket (Right)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(24, 7, 5, 4);
  ctx.fillRect(35, 7, 5, 4);
  ctx.fillStyle = '#ef4444'; // glowing red targeting eye
  ctx.fillRect(25, 8, 3, 2);
  ctx.fillStyle = '#fef08a'; // yellow rotten eye
  ctx.fillRect(36, 8, 2, 2);

  // Heavy steel jaw grille
  ctx.fillStyle = '#3f3f46';
  ctx.fillRect(24, 11, 16, 4);

  // 4. Arms: Left Shoulder Rocket Battery & Right Crusher Claw
  // Right Crusher Claw Arm
  ctx.fillStyle = '#18181b';
  ctx.fillRect(4, 16, 10, 20);
  ctx.fillStyle = '#71717a'; // Titanium Piston Claw
  ctx.fillRect(2, 34, 12, 9);
  ctx.fillRect(1, 40, 4, 6); // claw pinchers
  ctx.fillRect(9, 40, 4, 6);

  // Left Shoulder Heavy Rocket Pod Battery
  ctx.fillStyle = '#09090b';
  ctx.fillRect(46, 12, 16, 18);
  ctx.fillStyle = '#18181b';
  ctx.fillRect(48, 14, 12, 14);

  // 4 Rocket Tubes with Yellow Warning Hazard Chevrons
  ctx.fillStyle = '#eab308';
  ctx.fillRect(46, 12, 16, 2);
  ctx.fillRect(46, 28, 16, 2);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(49, 16, 4, 4);
  ctx.fillRect(55, 16, 4, 4);
  ctx.fillRect(49, 22, 4, 4);
  ctx.fillRect(55, 22, 4, 4);

  // Rocket warhead tips (Crimson)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(50, 17, 2, 2);
  ctx.fillRect(56, 17, 2, 2);
  ctx.fillRect(50, 23, 2, 2);
  ctx.fillRect(56, 23, 2, 2);

  if (isAttacking) {
    // Rocket launch backblast & fiery missile plume
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(55, 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(55, 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(55, 14, 16, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Ultra Boss (Apex Bio-Terror Hive Colossus) Rendering
// ----------------------------------------------------------------------------
function drawUltraBossBase(
  ctx: CanvasRenderingContext2D,
  frame: number,
  isAttacking: boolean
) {
  const hoverY = frame === 1 ? 2 : 0;

  // 1. Swirling Eldritch Mutant Tendrils beneath Colossus
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(18, 44 + hoverY, 6, 14);
  ctx.fillRect(28, 46 + hoverY, 8, 12);
  ctx.fillRect(40, 44 + hoverY, 6, 14);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(19, 52 + hoverY, 4, 6);
  ctx.fillRect(29, 54 + hoverY, 6, 4);
  ctx.fillRect(41, 52 + hoverY, 4, 6);

  // 2. Colossal Mutant Hive Carapace
  ctx.fillStyle = '#1e1b4b';
  ctx.fillRect(10, 12 + hoverY, 44, 32);
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(12, 14 + hoverY, 40, 28);

  // Pulsating Eldritch Mutagen Core (Center Violet/Cyan)
  const coreGrad = ctx.createRadialGradient(32, 28 + hoverY, 2, 32, 28 + hoverY, 14);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.3, '#f0abfc');
  coreGrad.addColorStop(0.7, '#c084fc');
  coreGrad.addColorStop(1, '#581c87');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(32, 28 + hoverY, 12, 0, Math.PI * 2);
  ctx.fill();

  // 3. Multi-Eyed Hive Mind Demonic Visage
  ctx.fillStyle = '#581c87';
  ctx.fillRect(20, 2 + hoverY, 24, 14);

  // Psionic Horn Array
  ctx.fillStyle = '#c084fc';
  ctx.fillRect(14, 0 + hoverY, 6, 6);
  ctx.fillRect(12, -3 + hoverY, 4, 4);
  ctx.fillRect(44, 0 + hoverY, 6, 6);
  ctx.fillRect(48, -3 + hoverY, 4, 4);

  // 5 Glowing Psionic Eyes
  ctx.fillStyle = '#f0abfc';
  ctx.fillRect(23, 7 + hoverY, 3, 3);
  ctx.fillRect(39, 7 + hoverY, 3, 3);
  ctx.fillRect(27, 5 + hoverY, 3, 3);
  ctx.fillRect(34, 5 + hoverY, 3, 3);
  ctx.fillRect(31, 8 + hoverY, 3, 3); // central third eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(32, 9 + hoverY, 1, 1);

  // 4. Twin Grafted Cyber Heavy Plasma Cannons
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, 18 + hoverY, 12, 20);
  ctx.fillRect(50, 18 + hoverY, 12, 20);
  ctx.fillStyle = '#a855f7';
  ctx.fillRect(4, 22 + hoverY, 8, 4);
  ctx.fillRect(52, 22 + hoverY, 8, 4);

  if (isAttacking) {
    // Twin intense psionic beam flare
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, 38 + hoverY, 6, 0, Math.PI * 2);
    ctx.arc(56, 38 + hoverY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(8, 38 + hoverY, 12, 0, Math.PI * 2);
    ctx.arc(56, 38 + hoverY, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ----------------------------------------------------------------------------
// HELPER: Gib Blast (Exploding gore & bone fragments)
// ----------------------------------------------------------------------------
function drawGibBlast(
  ctx: CanvasRenderingContext2D,
  colorA: string,
  colorB: string,
  colorC: string
) {
  // Central burst
  ctx.fillStyle = colorB;
  ctx.beginPath();
  ctx.arc(32, 34, 18, 0, Math.PI * 2);
  ctx.fill();

  // Flying Gore chunks & bone splinters
  ctx.fillStyle = colorA;
  ctx.fillRect(20, 18, 8, 6);
  ctx.fillRect(38, 16, 7, 7);
  ctx.fillRect(14, 32, 9, 8);
  ctx.fillRect(42, 34, 8, 9);
  ctx.fillRect(26, 44, 10, 7);

  // Acid / blood splatters
  ctx.fillStyle = colorC;
  ctx.fillRect(12, 14, 4, 4);
  ctx.fillRect(48, 12, 5, 4);
  ctx.fillRect(8, 42, 4, 5);
  ctx.fillRect(52, 40, 5, 4);
  ctx.fillRect(22, 52, 6, 3);
  ctx.fillRect(38, 52, 5, 3);
  ctx.fillRect(30, 8, 4, 5);
}
