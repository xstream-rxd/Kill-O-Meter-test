import React, { useEffect, useRef } from 'react';
import { Flame, Skull, Zap, AlertTriangle, Radio, Activity, Thermometer } from 'lucide-react';

interface KillOMeterTachometerProps {
  killOMeter: number; // 0 to 100
  levelKills?: number;
  totalLevelEnemies?: number;
  isLockdown?: boolean;
  isBerserk?: boolean;
  comboCount?: number;
  comboMultiplier?: number;
  dashCooldown?: number;
  dashMaxCooldown?: number;
}

interface HeatEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

export const KillOMeterTachometer: React.FC<KillOMeterTachometerProps> = ({
  killOMeter,
  levelKills = 0,
  totalLevelEnemies = 10,
  isLockdown = false,
  isBerserk = false,
  comboCount = 0,
  comboMultiplier = 1,
  dashCooldown = 0,
  dashMaxCooldown = 1.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  
  // Animation state references
  const needleAngleRef = useRef<number>(0);
  const targetAngleRef = useRef<number>(0);
  const throttleBlipRef = useRef<number>(0);
  const prevKillOMeterRef = useRef<number>(killOMeter);
  const prevKillsRef = useRef<number>(levelKills);
  const shiftLightFlashRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const embersRef = useRef<HeatEmber[]>([]);

  // Detect new kill or meter increase to trigger realistic engine rev throttle blip
  useEffect(() => {
    if (killOMeter > prevKillOMeterRef.current || levelKills > prevKillsRef.current) {
      // Throttle blip: surge needle forward momentarily on kill
      throttleBlipRef.current = 20;
    }
    prevKillOMeterRef.current = killOMeter;
    prevKillsRef.current = levelKills;
  }, [killOMeter, levelKills]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.035;
      const t = timeRef.current;

      if (throttleBlipRef.current > 0) {
        throttleBlipRef.current -= 0.65;
        if (throttleBlipRef.current < 0) throttleBlipRef.current = 0;
      }

      // Gauge Geometry (Canvas is 320x220 for ultra-crisp high-DPI rendering)
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.54;
      const radius = 96;
      const innerRadius = 66;

      // Tachometer Sweep Angle definition:
      // Start at 135 deg (bottom-left = 0 RPM / 0% Kills)
      // End at 405 deg (bottom-right = 10,000 RPM / 100% Kills / ALL ENEMIES SLAIN)
      const startAngle = Math.PI * 0.75; // 135 degrees
      const endAngle = Math.PI * 2.25;   // 405 degrees
      const totalSweep = endAngle - startAngle; // 270 degrees

      // Calculate Target Angle based on exact killOMeter progress (0 to 100)
      const clampedPct = Math.max(0, Math.min(100, killOMeter));
      const normalizedProgress = clampedPct / 100;
      const heatLevel = normalizedProgress; // 0.0 to 1.0

      // Pulse frequency escalates rapidly as kill count increases
      // At 0% heat: 4 rad/s pulse. At 100% heat: 24 rad/s rapid throbbing!
      const pulseSpeed = 4 + heatLevel * 20;
      const pulseVal = (Math.sin(t * pulseSpeed) + 1) * 0.5; // 0.0 to 1.0

      // Calculate effective target with throttle blip and heat-induced engine vibration
      const blipOffset = (throttleBlipRef.current / 100) * totalSweep * 0.28;
      let targetA = startAngle + normalizedProgress * totalSweep + blipOffset;

      // Rev-limiter bounce when reaching 100% / Boss Lockdown
      if (clampedPct >= 100 || isLockdown) {
        const limiterBounce = Math.sin(t * 28) * 0.12 + Math.cos(t * 20) * 0.06;
        targetA = endAngle + limiterBounce;
      } else {
        // Engine rumble vibration intensifies as heat rises
        const idleVibration = Math.sin(t * (24 + heatLevel * 16)) * (0.008 + heatLevel * 0.018);
        targetA += idleVibration;
      }

      targetAngleRef.current = targetA;

      // Smooth spring needle lag
      needleAngleRef.current += (targetAngleRef.current - needleAngleRef.current) * 0.2;
      const currentNeedleAngle = Math.max(startAngle - 0.06, Math.min(endAngle + 0.18, needleAngleRef.current));

      // Clear Canvas
      ctx.clearRect(0, 0, w, h);

      // ========================================================
      // 0. VISUAL HEATING UP: THERMAL RADIAL AURA & HEAT BLOOM
      // ========================================================
      ctx.save();
      const auraRadius = radius + 22 + heatLevel * 16 + pulseVal * 8 * heatLevel;
      const auraGrad = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, auraRadius);

      if (heatLevel >= 0.85 || isLockdown) {
        const alpha = 0.35 + pulseVal * 0.45;
        auraGrad.addColorStop(0, `rgba(255, 30, 0, ${alpha * 0.8})`);
        auraGrad.addColorStop(0.5, `rgba(239, 68, 68, ${alpha * 0.6})`);
        auraGrad.addColorStop(0.85, `rgba(185, 28, 28, ${alpha * 0.3})`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (heatLevel >= 0.5) {
        const alpha = 0.25 + pulseVal * 0.35;
        auraGrad.addColorStop(0, `rgba(245, 158, 11, ${alpha * 0.7})`);
        auraGrad.addColorStop(0.6, `rgba(217, 119, 6, ${alpha * 0.4})`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else if (heatLevel >= 0.25) {
        const alpha = 0.18 + pulseVal * 0.22;
        auraGrad.addColorStop(0, `rgba(16, 185, 129, ${alpha * 0.6})`);
        auraGrad.addColorStop(0.7, `rgba(6, 182, 212, ${alpha * 0.3})`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        const alpha = 0.12 + pulseVal * 0.12;
        auraGrad.addColorStop(0, `rgba(6, 182, 212, ${alpha})`);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ========================================================
      // 1. SCI-FI ANGULAR HOUSING & CARBON CORE CHASSIS
      // ========================================================
      ctx.save();
      // Outer shadow & mounting casing
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 20, 0, Math.PI * 2);
      ctx.fillStyle = '#06070a';
      ctx.fill();

      // Metallic Cyber Bezel Outer Rim with Sci-Fi Accent Chamfer
      const bezelGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      if (clampedPct >= 100 || isLockdown) {
        const whiteHot = Math.floor(t * 12) % 2 === 0;
        bezelGrad.addColorStop(0, whiteHot ? '#ffffff' : '#ff0033');
        bezelGrad.addColorStop(0.3, '#ef4444');
        bezelGrad.addColorStop(0.7, '#991b1b');
        bezelGrad.addColorStop(1, '#ff0055');
      } else if (heatLevel >= 0.75) {
        bezelGrad.addColorStop(0, '#ef4444');
        bezelGrad.addColorStop(0.4, '#f59e0b');
        bezelGrad.addColorStop(0.8, '#b91c1c');
        bezelGrad.addColorStop(1, '#dc2626');
      } else if (heatLevel >= 0.4) {
        bezelGrad.addColorStop(0, '#f59e0b');
        bezelGrad.addColorStop(0.5, '#78350f');
        bezelGrad.addColorStop(1, '#d97706');
      } else {
        bezelGrad.addColorStop(0, '#0284c7');
        bezelGrad.addColorStop(0.25, '#1e293b');
        bezelGrad.addColorStop(0.5, '#0ea5e9');
        bezelGrad.addColorStop(0.75, '#0f172a');
        bezelGrad.addColorStop(1, '#38bdf8');
      }
      ctx.lineWidth = 3.5 + heatLevel * 1.5;
      ctx.strokeStyle = bezelGrad;
      ctx.stroke();

      // High-Tech Cyber Screws / Optical Sensors (at 30, 90, 150, 210, 270, 330 deg)
      const boltAngles = [30, 90, 150, 210, 270, 330];
      boltAngles.forEach((deg) => {
        const rad = (deg * Math.PI) / 180;
        const bx = cx + Math.cos(rad) * (radius + 13);
        const by = cy + Math.sin(rad) * (radius + 13);
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = heatLevel >= 0.75 ? '#ef4444' : heatLevel >= 0.4 ? '#f59e0b' : '#0284c7';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Glowing LED center with heat pulse
        ctx.fillStyle = heatLevel >= 0.75 ? '#ff0033' : heatLevel >= 0.4 ? '#fbbf24' : '#38bdf8';
        ctx.fillRect(bx - 1, by - 1, 2, 2);
      });

      // Dark Carbon-Matrix Dial Face (Shifts to molten ember red as heat builds)
      const dialGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius + 6);
      if (heatLevel >= 0.85) {
        dialGrad.addColorStop(0, `rgba(45, 8, 5, 1)`);
        dialGrad.addColorStop(0.65, `rgba(25, 4, 3, 1)`);
        dialGrad.addColorStop(1, '#060202');
      } else if (heatLevel >= 0.4) {
        dialGrad.addColorStop(0, '#1c120a');
        dialGrad.addColorStop(0.65, '#0f0a06');
        dialGrad.addColorStop(1, '#050403');
      } else {
        dialGrad.addColorStop(0, '#11131c');
        dialGrad.addColorStop(0.65, '#0a0c12');
        dialGrad.addColorStop(1, '#040508');
      }
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = dialGrad;
      ctx.fill();

      // Cyber Matrix Concentric Tech Rings & Grid Lines (Glows with thermal heat)
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = heatLevel >= 0.75
        ? `rgba(239, 68, 68, ${0.12 + pulseVal * 0.15})`
        : heatLevel >= 0.4
        ? `rgba(245, 158, 11, ${0.1 + pulseVal * 0.1})`
        : 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      // Concentric rings
      [30, 50, 75].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Crosshair tech axis
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();
      ctx.restore();

      // ========================================================
      // 1.5. FLOATING HEAT EMBERS & THERMAL PARTICLES IN GAUGE
      // ========================================================
      if (heatLevel > 0.15) {
        // Spawn new embers based on heat level
        const spawnChance = heatLevel * 0.65;
        if (Math.random() < spawnChance) {
          const spawnAngle = startAngle + Math.random() * totalSweep * (0.3 + heatLevel * 0.7);
          const spawnR = innerRadius + Math.random() * (radius - innerRadius - 10);
          const px = cx + Math.cos(spawnAngle) * spawnR;
          const py = cy + Math.sin(spawnAngle) * spawnR;

          const emberColors = heatLevel > 0.75
            ? ['#ff0033', '#ef4444', '#f97316', '#fef08a']
            : ['#f97316', '#f59e0b', '#fbbf24'];

          embersRef.current.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.4 - Math.random() * 0.8 - heatLevel * 0.6,
            size: 1.0 + Math.random() * (1.8 + heatLevel * 1.2),
            alpha: 0.8 + Math.random() * 0.2,
            life: 0,
            maxLife: 20 + Math.random() * 25,
            color: emberColors[Math.floor(Math.random() * emberColors.length)],
          });
        }

        // Update and draw active heat embers
        ctx.save();
        for (let i = embersRef.current.length - 1; i >= 0; i--) {
          const e = embersRef.current[i];
          e.life++;
          e.x += e.vx + Math.sin(t * 8 + e.y) * 0.2;
          e.y += e.vy;
          const fade = 1 - e.life / e.maxLife;

          if (e.life >= e.maxLife || fade <= 0) {
            embersRef.current.splice(i, 1);
            continue;
          }

          ctx.fillStyle = e.color;
          ctx.globalAlpha = Math.max(0, fade * e.alpha);
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // ========================================================
      // 2. REDLINE OVERDRIVE SECTOR BACKGROUND (8.0 - 10.0 RPM)
      // ========================================================
      const redlineStartAngle = startAngle + totalSweep * 0.78; // 78% to 100%
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2, redlineStartAngle, endAngle);
      ctx.arc(cx, cy, innerRadius + 4, endAngle, redlineStartAngle, true);
      ctx.closePath();
      
      const redlineZoneGrad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, radius);
      if (clampedPct >= 100 || isLockdown) {
        // Active Pulsing Redline Fury
        const pulse = 0.4 + pulseVal * 0.55;
        redlineZoneGrad.addColorStop(0, `rgba(255, 0, 85, ${pulse * 0.6})`);
        redlineZoneGrad.addColorStop(1, `rgba(239, 68, 68, ${pulse})`);
      } else {
        const pulse = 0.2 + heatLevel * 0.4 + pulseVal * 0.2;
        redlineZoneGrad.addColorStop(0, `rgba(153, 27, 27, ${pulse * 0.4})`);
        redlineZoneGrad.addColorStop(1, `rgba(220, 38, 38, ${pulse})`);
      }
      ctx.fillStyle = redlineZoneGrad;
      ctx.fill();

      // Redline warning stripes
      ctx.clip();
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.35 + heatLevel * 0.4})`;
      ctx.lineWidth = 2;
      for (let x = cx - radius; x < cx + radius + 40; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, cy - radius);
        ctx.lineTo(x - 22, cy + radius);
        ctx.stroke();
      }
      ctx.restore();

      // ========================================================
      // 3. BACKGROUND SWEEP TRACK
      // ========================================================
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 6, startAngle, endAngle);
      ctx.strokeStyle = '#111422';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // ========================================================
      // 4. ACTIVE ILLUMINATED ARC SWEEP (Tachometer Progression)
      // ========================================================
      if (normalizedProgress > 0.01) {
        const sweepAngle = Math.min(endAngle, startAngle + normalizedProgress * totalSweep);
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius - 6, startAngle, sweepAngle);
        
        const activeArcGrad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        activeArcGrad.addColorStop(0, '#06b6d4');   // 0% Cyan
        activeArcGrad.addColorStop(0.4, '#10b981'); // 40% Emerald
        activeArcGrad.addColorStop(0.7, '#f59e0b'); // 70% Amber
        activeArcGrad.addColorStop(0.88, '#ef4444'); // 88% Red
        activeArcGrad.addColorStop(1, '#ff0055');   // 100% Neon Crimson

        ctx.strokeStyle = activeArcGrad;
        ctx.lineWidth = 8 + pulseVal * heatLevel * 3;
        ctx.lineCap = 'round';
        ctx.shadowColor = clampedPct >= 100 ? '#ff0055' : clampedPct >= 75 ? '#ef4444' : '#06b6d4';
        ctx.shadowBlur = 8 + heatLevel * 14 + pulseVal * 8;
        ctx.stroke();
      }
      ctx.restore();

      // ========================================================
      // 5. GRADUATED TICKS & RPM NUMBERS (0 to 10 x1000 RPM)
      // ========================================================
      ctx.save();
      const numMajorTicks = 10;
      const subTicksPerMajor = 2;
      const totalSteps = numMajorTicks * subTicksPerMajor;

      for (let i = 0; i <= totalSteps; i++) {
        const pct = i / totalSteps;
        const tickAngle = startAngle + pct * totalSweep;
        const isMajor = i % subTicksPerMajor === 0;
        const rpmVal = (i / subTicksPerMajor);
        const isRedline = rpmVal >= 8;

        const outerR = radius - 1;
        const innerR = isMajor ? radius - 14 : radius - 8;

        const cosA = Math.cos(tickAngle);
        const sinA = Math.sin(tickAngle);

        const x1 = cx + cosA * innerR;
        const y1 = cy + sinA * innerR;
        const x2 = cx + cosA * outerR;
        const y2 = cy + sinA * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (isRedline) {
          ctx.strokeStyle = isMajor ? '#ef4444' : '#f87171';
          ctx.lineWidth = isMajor ? 2.8 : 1.6;
        } else if (rpmVal >= 6) {
          ctx.strokeStyle = isMajor ? '#fbbf24' : '#fde047';
          ctx.lineWidth = isMajor ? 2.2 : 1.3;
        } else {
          ctx.strokeStyle = isMajor ? '#38bdf8' : '#64748b';
          ctx.lineWidth = isMajor ? 2.0 : 1.0;
        }
        ctx.stroke();

        // Render RPM Numbers for Major Ticks: 0, 2, 4, 6, 8, 10
        if (isMajor && (rpmVal % 2 === 0 || rpmVal === 10 || rpmVal === 0)) {
          const textR = radius - 25;
          const tx = cx + cosA * textR;
          const ty = cy + sinA * textR;

          ctx.font = 'bold 11px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = isRedline ? '#ef4444' : rpmVal >= 6 ? '#fbbf24' : '#38bdf8';
          
          if (isRedline && (clampedPct >= 100 || isLockdown)) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 8 + pulseVal * 6;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.fillText(rpmVal.toString(), tx, ty);
        }
      }
      ctx.restore();

      // ========================================================
      // 6. SCI-FI DIAL BRANDING & LABELS (Heat Escalation Text)
      // ========================================================
      ctx.save();
      // KILL-O-METER Header
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      
      const headerColor = isBerserk || clampedPct >= 100 || isLockdown
        ? (Math.floor(t * 10) % 2 === 0 ? '#ffffff' : '#ff0033')
        : heatLevel >= 0.75
        ? '#ef4444'
        : heatLevel >= 0.4
        ? '#f59e0b'
        : '#38bdf8';

      ctx.fillStyle = headerColor;
      ctx.shadowColor = heatLevel >= 0.75 ? '#ff0033' : heatLevel >= 0.4 ? '#f59e0b' : '#0284c7';
      ctx.shadowBlur = 4 + heatLevel * 14 + pulseVal * 6;
      ctx.fillText("KILL-O'METER", cx, cy - 44);

      // Sub-label: Heat Level / Core Temperature
      const tempC = Math.round(150 + heatLevel * 1850);
      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = heatLevel >= 0.75 ? '#fca5a5' : heatLevel >= 0.4 ? '#fcd34d' : '#64748b';
      ctx.shadowBlur = 0;
      ctx.fillText(`HEAT: ${tempC}°C // CORE FEED`, cx, cy - 31);

      // Redline Text Marker at upper right arc
      ctx.font = '900 9px monospace';
      ctx.fillStyle = heatLevel >= 0.75 ? '#ff0033' : '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = heatLevel >= 0.75 ? 8 + pulseVal * 6 : 0;
      ctx.fillText(heatLevel >= 0.9 ? 'HOT OVERDRIVE' : 'OVERDRIVE', cx + 48, cy - 20);
      ctx.restore();

      // ========================================================
      // 7. MULTI-FUNCTION DIGITAL SCREEN (Bottom of Tachometer)
      // ========================================================
      const mfdW = 114;
      const mfdH = 36;
      const mfdX = cx - mfdW / 2;
      const mfdY = cy + 18;

      ctx.save();
      // Screen Bezel
      ctx.fillStyle = '#040508';
      ctx.fillRect(mfdX, mfdY, mfdW, mfdH);
      ctx.strokeStyle = heatLevel >= 0.75 ? '#ef4444' : heatLevel >= 0.4 ? '#f59e0b' : '#0284c7';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(mfdX, mfdY, mfdW, mfdH);

      // Screen Inner Background
      const screenGrad = ctx.createLinearGradient(mfdX, mfdY, mfdX, mfdY + mfdH);
      if (heatLevel >= 0.75) {
        screenGrad.addColorStop(0, '#1c0808');
        screenGrad.addColorStop(1, '#080202');
      } else if (heatLevel >= 0.4) {
        screenGrad.addColorStop(0, '#1c1206');
        screenGrad.addColorStop(1, '#080502');
      } else {
        screenGrad.addColorStop(0, '#090d16');
        screenGrad.addColorStop(1, '#03050a');
      }
      ctx.fillStyle = screenGrad;
      ctx.fillRect(mfdX + 1, mfdY + 1, mfdW - 2, mfdH - 2);

      // Primary Status Text (Top line inside screen)
      ctx.font = 'bold 10.5px monospace';
      ctx.textAlign = 'center';
      if (clampedPct >= 100 || isLockdown) {
        // Flashing Lockdown Warning
        const isFlash = Math.floor(t * 8) % 2 === 0;
        ctx.fillStyle = isFlash ? '#ef4444' : '#fbbf24';
        ctx.fillText('⚠ TITAN LOCKDOWN ⚠', cx, mfdY + 13);
      } else {
        const remaining = Math.max(0, totalLevelEnemies - levelKills);
        ctx.fillStyle = remaining === 0 ? '#10b981' : heatLevel >= 0.75 ? '#f87171' : heatLevel >= 0.4 ? '#fbbf24' : '#38bdf8';
        ctx.fillText(
          remaining === 0
            ? 'ALL DEMONS SLAIN'
            : `HOSTILES: ${remaining} ACTIVE`,
          cx,
          mfdY + 13
        );
      }

      // Secondary Counter line (Kills & Thermal Status)
      ctx.font = 'bold 10px monospace';
      if (clampedPct >= 100 || isLockdown) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('MAX REDLINE ENGAGED', cx, mfdY + 27);
      } else {
        const thermalStatus = heatLevel >= 0.85 ? 'OVERHEAT!' : heatLevel >= 0.5 ? 'HEATING UP' : 'STABLE';
        ctx.fillStyle = heatLevel >= 0.85 ? '#f87171' : heatLevel >= 0.5 ? '#fcd34d' : '#e2e8f0';
        ctx.fillText(
          `${levelKills}/${totalLevelEnemies} (${Math.round(clampedPct)}%) ${thermalStatus}`,
          cx,
          mfdY + 27
        );
      }
      ctx.restore();

      // ========================================================
      // 8. TACHOMETER NEEDLE & NEEDLE HUB (Front Layer)
      // ========================================================
      ctx.save();
      const needleLength = radius - 8;
      const counterWeightLength = 20;
      const needleAngle = currentNeedleAngle;

      const nCos = Math.cos(needleAngle);
      const nSin = Math.sin(needleAngle);
      const perpCos = Math.cos(needleAngle + Math.PI / 2);
      const perpSin = Math.sin(needleAngle + Math.PI / 2);

      // Needle Shadow on dial face
      ctx.beginPath();
      ctx.moveTo(cx + perpCos * 3.5 + 2, cy + perpSin * 3.5 + 2);
      ctx.lineTo(cx + nCos * (needleLength - 2) + 2, cy + nSin * (needleLength - 2) + 2);
      ctx.lineTo(cx - perpCos * 3.5 + 2, cy - perpSin * 3.5 + 2);
      ctx.lineTo(cx - nCos * counterWeightLength + 2, cy - nSin * counterWeightLength + 2);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fill();

      // Needle Body (Tapered fluorescent red/orange blade)
      ctx.beginPath();
      ctx.moveTo(cx + perpCos * 3.8, cy + perpSin * 3.8);
      ctx.lineTo(cx + nCos * needleLength, cy + nSin * needleLength);
      ctx.lineTo(cx - perpCos * 3.8, cy - perpSin * 3.8);
      ctx.lineTo(cx - nCos * counterWeightLength, cy - nSin * counterWeightLength);
      ctx.closePath();

      const needleGrad = ctx.createLinearGradient(
        cx - nCos * counterWeightLength,
        cy - nSin * counterWeightLength,
        cx + nCos * needleLength,
        cy + nSin * needleLength
      );
      needleGrad.addColorStop(0, '#991b1b');
      needleGrad.addColorStop(0.3, '#dc2626');
      needleGrad.addColorStop(0.85, heatLevel >= 0.75 ? '#ff0033' : '#f97316');
      needleGrad.addColorStop(1, '#ffffff'); // Glowing hot white tip

      ctx.fillStyle = needleGrad;
      ctx.shadowColor = heatLevel >= 0.75 ? '#ff0033' : '#ea580c';
      ctx.shadowBlur = 8 + heatLevel * 14 + pulseVal * 8;
      ctx.fill();

      // Center White Spine on Needle for 3D ridge effect
      ctx.beginPath();
      ctx.moveTo(cx - nCos * (counterWeightLength - 4), cy - nSin * (counterWeightLength - 4));
      ctx.lineTo(cx + nCos * (needleLength - 4), cy + nSin * (needleLength - 4));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 0;
      ctx.stroke();

      // Center Spun Chrome Needle Hub Cap
      const hubRadius = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, hubRadius);
      hubGrad.addColorStop(0, '#94a3b8');
      hubGrad.addColorStop(0.5, '#334155');
      hubGrad.addColorStop(0.85, '#090d16');
      hubGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = hubGrad;
      ctx.fill();
      ctx.strokeStyle = heatLevel >= 0.75 ? '#ef4444' : heatLevel >= 0.4 ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center Chrome Pin
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = heatLevel >= 0.75 ? '#ff0033' : heatLevel >= 0.4 ? '#fbbf24' : '#38bdf8';
      ctx.fill();
      ctx.restore();

      // ========================================================
      // 9. SHIFT LIGHT / LOCKDOWN ALARM LED (Top-Right Bezel)
      // ========================================================
      const slX = cx + radius * 0.76;
      const slY = cy - radius * 0.74;
      const slR = 9;

      ctx.save();
      // Shift light housing bezel
      ctx.beginPath();
      ctx.arc(slX, slY, slR + 2, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = heatLevel >= 0.75 ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Shift light lamp state
      ctx.beginPath();
      ctx.arc(slX, slY, slR, 0, Math.PI * 2);

      if (clampedPct >= 100 || isLockdown) {
        // High-Intensity Strobe Alarm (Flashing Red/White)
        shiftLightFlashRef.current += 0.25;
        const isWhite = Math.floor(t * 16) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#ff0033';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 18;
        ctx.fill();

        // Shift alert text badge
        ctx.font = 'bold 7.5px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('LOCK', slX, slY + 2.5);
      } else if (heatLevel >= 0.65) {
        // High Heat Pulsing Red Light
        const redPulse = 0.5 + pulseVal * 0.5;
        ctx.fillStyle = `rgba(239, 68, 68, ${redPulse})`;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fill();
      } else if (heatLevel >= 0.35) {
        // Warning Amber Pulse
        const amberPulse = 0.6 + pulseVal * 0.4;
        ctx.fillStyle = `rgba(245, 158, 11, ${amberPulse})`;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.fill();
      } else {
        // Standby Dark Blue/Cyan
        ctx.fillStyle = '#091e3a';
        ctx.shadowBlur = 0;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(slX, slY, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
      }
      ctx.restore();

      // ========================================================
      // 10. GLASS LENS SPECULAR REFLECTION HIGHLIGHT
      // ========================================================
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx - 26, cy - 35, radius * 0.75, radius * 0.38, -Math.PI / 5, 0, Math.PI * 2);
      const glassGrad = ctx.createLinearGradient(cx - 50, cy - 60, cx + 20, cy);
      glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
      glassGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
      glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glassGrad;
      ctx.fill();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [killOMeter, levelKills, totalLevelEnemies, isLockdown, isBerserk]);

  const isMax = killOMeter >= 100 || isLockdown;
  const isHigh = killOMeter >= 75;
  const isMid = killOMeter >= 40;
  const heatRatio = Math.max(0, Math.min(1.0, killOMeter / 100));

  // Dynamic heat pulse animation speed: from 1.8s relaxed down to 0.28s frantic hyper-throbbing!
  const pulseDuration = `${(1.8 - heatRatio * 1.5).toFixed(2)}s`;
  const glowIntensity = (14 + heatRatio * 32).toFixed(0);
  const glowAlpha = (0.35 + heatRatio * 0.65).toFixed(2);
  const glowColor = isHigh ? '239, 68, 68' : isMid ? '245, 158, 11' : '6, 182, 212';

  return (
    <div
      id="kill-o-meter-tachometer-root"
      className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-all select-none ${
        isMax
          ? 'bg-gradient-to-b from-red-950/95 via-black/95 to-red-950/90 border-2 border-red-500 animate-pulse animate-hud-vibrate'
          : isHigh
          ? 'bg-gradient-to-b from-red-950/80 via-black/95 to-neutral-950 border-2 border-red-500/90 animate-hud-vibrate'
          : isMid
          ? 'bg-gradient-to-b from-amber-950/80 via-black/95 to-neutral-950 border-2 border-amber-500/80'
          : 'bg-gradient-to-b from-cyan-950/50 via-[#0a0c12]/95 to-black/95 border-2 border-cyan-500/60'
      }`}
      style={{
        boxShadow: `0 0 ${glowIntensity}px rgba(${glowColor}, ${glowAlpha}), inset 0 0 ${Math.round(heatRatio * 16)}px rgba(${glowColor}, ${(heatRatio * 0.45).toFixed(2)})`,
        animationDuration: pulseDuration,
      }}
    >
      {/* Top Header Label Bar */}
      <div className="w-full flex items-center justify-between px-1.5 mb-0.5 text-[8px] sm:text-[9px] font-pixel leading-none">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <Flame className={`w-3 h-3 ${isMax ? 'text-red-500 animate-bounce' : isHigh ? 'text-red-400 animate-pulse' : isMid ? 'text-amber-400' : 'text-cyan-400'}`} />
          <span className="font-bold text-gray-100 tracking-wider">KILL-O'METER</span>
        </span>
        <span
          className={`font-mono-tech font-bold text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded ${
            isMax
              ? 'bg-red-900/90 text-white font-black animate-ping'
              : isHigh
              ? 'bg-red-950/90 text-red-300 border border-red-500/80 animate-pulse'
              : isMid
              ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50'
              : 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/50'
          }`}
        >
          {isMax ? 'LOCKDOWN' : `${Math.round(killOMeter)}%`}
        </span>
      </div>

      {/* Prominent Center Tachometer Canvas Display */}
      <div className="relative w-[155px] h-[108px] sm:w-[175px] sm:h-[120px] md:w-[195px] md:h-[134px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={320}
          height={220}
          className="w-full h-full object-contain"
        />

        {/* Max Redline / Boss Lockdown Alert Overlay Banner */}
        {isMax && (
          <div className="absolute top-1 inset-x-0 flex justify-center pointer-events-none">
            <span className="px-2 py-0.5 bg-red-950/95 border border-red-400 text-red-200 font-pixel text-[7px] sm:text-[8px] font-black tracking-wider rounded shadow-lg flex items-center gap-1 animate-bounce">
              <AlertTriangle className="w-2.5 h-2.5 text-amber-300" />
              LOCKDOWN ENGAGED
            </span>
          </div>
        )}
      </div>

      {/* Sub-gauge: Tactical Warp Dash Energy Core */}
      <div className="mt-1 w-full max-w-[155px] sm:max-w-[175px] md:max-w-[190px] flex flex-col gap-0.5">
        <div className="flex items-center justify-between text-[7px] sm:text-[7.5px] font-pixel leading-none px-0.5">
          <span className="text-cyan-400 flex items-center gap-1">
            <Zap className="w-2 h-2 text-cyan-400" />
            <span>WARP DASH</span>
          </span>
          <span className={`font-mono-tech text-[7.5px] sm:text-[8px] font-bold ${dashCooldown <= 0 ? 'text-cyan-300 animate-pulse' : 'text-neutral-400'}`}>
            {dashCooldown <= 0 ? 'READY [SHIFT]' : `${(dashMaxCooldown - dashCooldown).toFixed(1)}s`}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-950 border border-cyan-800/60 rounded-xs overflow-hidden relative">
          <div
            className={`h-full transition-all duration-75 ${
              dashCooldown <= 0
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-[0_0_8px_#38bdf8]'
                : 'bg-neutral-600'
            }`}
            style={{
              width: `${
                dashCooldown <= 0 ? 100 : Math.max(0, (1 - dashCooldown / dashMaxCooldown) * 100)
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
