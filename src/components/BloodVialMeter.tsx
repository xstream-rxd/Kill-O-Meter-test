import React, { useEffect, useRef } from 'react';
import { Flame, Skull, Zap } from 'lucide-react';

interface BloodVialMeterProps {
  killOMeter: number; // 0 to 100
  comboCount?: number;
  comboMultiplier?: number;
  isBerserk?: boolean;
  dashCooldown?: number;
  dashMaxCooldown?: number;
}

export const BloodVialMeter: React.FC<BloodVialMeterProps> = ({
  killOMeter,
  comboCount = 0,
  comboMultiplier = 1,
  isBerserk = false,
  dashCooldown = 0,
  dashMaxCooldown = 1.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const smoothedLevelRef = useRef<number>(killOMeter);
  const prevLevelRef = useRef<number>(killOMeter);
  const bloodSplashTimerRef = useRef<number>(0);
  const bubblesRef = useRef<Array<{ x: number; y: number; size: number; speed: number; wobble: number; alpha: number }>>([]);

  // Initialize bubbles
  useEffect(() => {
    bubblesRef.current = Array.from({ length: 12 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2.5,
      speed: 0.15 + Math.random() * 0.35,
      wobble: Math.random() * Math.PI * 2,
      alpha: 0.4 + Math.random() * 0.5,
    }));
  }, []);

  // Detect blood increase to trigger splash effect
  useEffect(() => {
    if (killOMeter > prevLevelRef.current + 1) {
      bloodSplashTimerRef.current = 0.5; // half second splash
    }
    prevLevelRef.current = killOMeter;
  }, [killOMeter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.035;

      if (bloodSplashTimerRef.current > 0) {
        bloodSplashTimerRef.current -= 0.016;
      }

      // Smooth interpolation for liquid level
      const targetLevel = Math.max(0, Math.min(100, killOMeter));
      smoothedLevelRef.current += (targetLevel - smoothedLevelRef.current) * 0.12;
      const levelPct = smoothedLevelRef.current / 100;

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Vial inner dimensions
      const vialPaddingX = 8;
      const vialTop = 8;
      const vialBottom = h - 10;
      const vialWidth = w - vialPaddingX * 2;
      const vialHeight = vialBottom - vialTop;

      // 1. Draw Vial Glass Background (Dark empty tube)
      ctx.save();
      ctx.beginPath();
      // Round bottom of glass tube
      ctx.roundRect
        ? ctx.roundRect(vialPaddingX, vialTop, vialWidth, vialHeight, [2, 2, vialWidth / 2, vialWidth / 2])
        : ctx.rect(vialPaddingX, vialTop, vialWidth, vialHeight);
      ctx.fillStyle = 'rgba(12, 6, 8, 0.85)';
      ctx.fill();
      ctx.restore();

      // 2. Liquid Fill with Waves & Bubbles
      if (levelPct > 0.01) {
        ctx.save();

        // Clip to vial interior shape
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(vialPaddingX, vialTop, vialWidth, vialHeight, [2, 2, vialWidth / 2, vialWidth / 2]);
        } else {
          ctx.rect(vialPaddingX, vialTop, vialWidth, vialHeight);
        }
        ctx.clip();

        const liquidY = vialBottom - levelPct * vialHeight;
        const waveAmp = isBerserk || killOMeter >= 100 ? 3.0 : 1.6;
        const waveSpeed = isBerserk || killOMeter >= 100 ? 4.5 : 2.5;

        // Wave path
        ctx.beginPath();
        ctx.moveTo(vialPaddingX - 2, vialBottom + 5);
        ctx.lineTo(vialPaddingX - 2, liquidY);

        for (let x = vialPaddingX; x <= vialPaddingX + vialWidth; x += 2) {
          const wave1 = Math.sin(time * waveSpeed + x * 0.18) * waveAmp;
          const wave2 = Math.cos(time * (waveSpeed * 0.7) + x * 0.3) * (waveAmp * 0.5);
          ctx.lineTo(x, liquidY + wave1 + wave2);
        }

        ctx.lineTo(vialPaddingX + vialWidth + 2, liquidY);
        ctx.lineTo(vialPaddingX + vialWidth + 2, vialBottom + 5);
        ctx.closePath();

        // Blood liquid gradient
        const bloodGrad = ctx.createLinearGradient(0, vialBottom, 0, liquidY);
        if (killOMeter >= 100 || isBerserk) {
          // Demonic boiling fury (deep ruby to glowing fiery scarlet/gold)
          bloodGrad.addColorStop(0, '#4a0404');
          bloodGrad.addColorStop(0.4, '#880808');
          bloodGrad.addColorStop(0.85, '#dc2626');
          bloodGrad.addColorStop(1.0, '#f59e0b');
        } else {
          // Rich visceral demon blood
          bloodGrad.addColorStop(0, '#2e0202');
          bloodGrad.addColorStop(0.3, '#5c0606');
          bloodGrad.addColorStop(0.7, '#991b1b');
          bloodGrad.addColorStop(1.0, '#dc2626');
        }

        ctx.fillStyle = bloodGrad;
        ctx.fill();

        // Blood foam / meniscus line
        ctx.strokeStyle = killOMeter >= 100 ? '#fef08a' : '#f87171';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rising Bubbles
        const numBubbles = bubblesRef.current.length;
        for (let i = 0; i < numBubbles; i++) {
          const b = bubblesRef.current[i];
          b.y -= (b.speed * 0.01) * (killOMeter >= 100 ? 2.2 : 1.0);
          b.wobble += 0.05;
          if (b.y < 0) {
            b.y = 1.0;
            b.x = Math.random();
          }

          const bx = vialPaddingX + 3 + b.x * (vialWidth - 6) + Math.sin(b.wobble) * 1.5;
          const by = vialBottom - b.y * (vialBottom - liquidY);

          if (by >= liquidY && by <= vialBottom) {
            ctx.beginPath();
            ctx.arc(bx, by, b.size, 0, Math.PI * 2);
            ctx.fillStyle = killOMeter >= 100 ? `rgba(254, 240, 138, ${b.alpha})` : `rgba(248, 113, 113, ${b.alpha})`;
            ctx.fill();
          }
        }

        // Inner glowing core
        const coreGrad = ctx.createRadialGradient(
          vialPaddingX + vialWidth / 2,
          liquidY + (vialBottom - liquidY) / 2,
          1,
          vialPaddingX + vialWidth / 2,
          liquidY + (vialBottom - liquidY) / 2,
          vialWidth / 1.5
        );
        coreGrad.addColorStop(0, killOMeter >= 100 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(220, 38, 38, 0.25)');
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.fillRect(vialPaddingX, liquidY - 5, vialWidth, vialBottom - liquidY + 5);

        ctx.restore();
      }

      // 3. Etched Measurement Tick Marks (25%, 50%, 75%, 100%)
      ctx.save();
      const ticks = [0.25, 0.5, 0.75, 1.0];
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;

      ticks.forEach((t) => {
        const ty = vialBottom - t * vialHeight;
        // Right side tick
        ctx.beginPath();
        ctx.moveTo(vialPaddingX + vialWidth - (t === 1.0 || t === 0.5 ? 5 : 3), ty);
        ctx.lineTo(vialPaddingX + vialWidth - 1, ty);
        ctx.stroke();

        // Left side tick
        ctx.beginPath();
        ctx.moveTo(vialPaddingX + 1, ty);
        ctx.lineTo(vialPaddingX + (t === 1.0 || t === 0.5 ? 5 : 3), ty);
        ctx.stroke();
      });
      ctx.restore();

      // 4. Glass Highlights & Specular Reflections
      ctx.save();
      // Curved left highlight (cylindrical sheen)
      const leftSheenGrad = ctx.createLinearGradient(vialPaddingX, 0, vialPaddingX + 6, 0);
      leftSheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
      leftSheenGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      leftSheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = leftSheenGrad;
      ctx.fillRect(vialPaddingX + 2, vialTop + 2, 4, vialHeight - 8);

      // Right soft specular edge
      const rightSheenGrad = ctx.createLinearGradient(vialPaddingX + vialWidth - 4, 0, vialPaddingX + vialWidth, 0);
      rightSheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      rightSheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
      ctx.fillStyle = rightSheenGrad;
      ctx.fillRect(vialPaddingX + vialWidth - 3, vialTop + 2, 2, vialHeight - 8);
      ctx.restore();

      // 5. Blood Splatter on Glass (When kills register)
      if (bloodSplashTimerRef.current > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(185, 28, 28, ${Math.min(0.8, bloodSplashTimerRef.current * 1.6)})`;
        ctx.beginPath();
        ctx.arc(vialPaddingX + vialWidth * 0.4, vialTop + vialHeight * 0.35, 2.5, 0, Math.PI * 2);
        ctx.arc(vialPaddingX + vialWidth * 0.65, vialTop + vialHeight * 0.55, 2.0, 0, Math.PI * 2);
        ctx.arc(vialPaddingX + vialWidth * 0.35, vialTop + vialHeight * 0.7, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Metal Hardware Caps (Top Brass/Steel Seal & Bottom Base Fitting)
      // Top Cap
      ctx.save();
      const topCapGrad = ctx.createLinearGradient(0, 0, 0, vialTop + 2);
      topCapGrad.addColorStop(0, '#52525b');
      topCapGrad.addColorStop(0.5, '#27272a');
      topCapGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = topCapGrad;
      ctx.fillRect(vialPaddingX - 2, 1, vialWidth + 4, vialTop + 1);

      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1;
      ctx.strokeRect(vialPaddingX - 2, 1, vialWidth + 4, vialTop + 1);

      // Top Valve Screw
      ctx.fillStyle = killOMeter >= 100 ? '#f59e0b' : '#a1a1aa';
      ctx.fillRect(w / 2 - 3, 0, 6, 3);
      ctx.restore();

      // Bottom Base Mount
      ctx.save();
      const botBaseGrad = ctx.createLinearGradient(0, vialBottom - 2, 0, h);
      botBaseGrad.addColorStop(0, '#27272a');
      botBaseGrad.addColorStop(0.5, '#3f3f46');
      botBaseGrad.addColorStop(1, '#18181b');
      ctx.fillStyle = botBaseGrad;
      ctx.fillRect(vialPaddingX - 3, vialBottom - 2, vialWidth + 6, h - (vialBottom - 2));

      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 1;
      ctx.strokeRect(vialPaddingX - 3, vialBottom - 2, vialWidth + 6, h - (vialBottom - 2));

      // Brass Rivets
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(vialPaddingX - 1, vialBottom + 2, 2, 2);
      ctx.fillRect(vialPaddingX + vialWidth - 1, vialBottom + 2, 2, 2);
      ctx.restore();

      // 7. Glass Outer Contour Border
      ctx.save();
      ctx.strokeStyle = killOMeter >= 100 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(113, 113, 122, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(vialPaddingX, vialTop, vialWidth, vialHeight, [2, 2, vialWidth / 2, vialWidth / 2]);
      } else {
        ctx.rect(vialPaddingX, vialTop, vialWidth, vialHeight);
      }
      ctx.stroke();
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [killOMeter, isBerserk]);

  const isMax = killOMeter >= 100;
  const isHigh = killOMeter >= 75;

  return (
    <div
      id="blood-vial-meter"
      className={`relative flex flex-col items-center justify-center p-1 rounded transition-all select-none ${
        isMax
          ? 'bg-gradient-to-b from-red-950/80 to-amber-950/80 shadow-[0_0_16px_rgba(245,158,11,0.6)] border border-amber-500/80 animate-pulse'
          : isHigh
          ? 'bg-neutral-950/90 shadow-[0_0_10px_rgba(220,38,38,0.4)] border border-red-700/60'
          : 'bg-neutral-950/90 border border-neutral-800'
      }`}
    >
      {/* Label Header */}
      <div className="w-full flex items-center justify-between px-1 mb-0.5 text-[8px] font-pixel">
        <span className="flex items-center gap-0.5 text-neutral-400">
          <Flame className={`w-2.5 h-2.5 ${isMax ? 'text-amber-400 animate-bounce' : 'text-red-500'}`} />
          <span className="hidden xs:inline">BLOOD</span>
        </span>
        <span
          className={`font-mono-tech font-bold text-[9px] ${
            isMax ? 'text-amber-300 font-black' : isHigh ? 'text-red-400' : 'text-gray-300'
          }`}
        >
          {Math.round(killOMeter)}%
        </span>
      </div>

      {/* Center Canvas: Cylindrical Blood Vial */}
      <div className="relative w-8 h-10 sm:w-9 sm:h-11 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={40}
          height={46}
          className="w-full h-full object-contain"
        />

        {/* Max Fury / Titan Warning Overlay */}
        {isMax && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="px-1 py-0 bg-red-950/95 border border-amber-400 text-amber-300 font-pixel text-[6.5px] font-black tracking-tighter rounded shadow-md animate-bounce">
              TITAN
            </span>
          </div>
        )}
      </div>

      {/* Dash Energy Sub-Gauge */}
      <div className="mt-0.5 w-full max-w-[44px] flex flex-col gap-0.5">
        <div className="flex items-center justify-between text-[6.5px] font-pixel leading-none">
          <span className="text-cyan-400 flex items-center gap-0.5">
            <Zap className="w-1.5 h-1.5 text-cyan-400" />
            <span>DASH</span>
          </span>
          <span className="font-mono-tech text-[6.5px] text-neutral-400">
            {dashCooldown <= 0 ? 'RDY' : `${(dashMaxCooldown - dashCooldown).toFixed(1)}s`}
          </span>
        </div>
        <div className="w-full h-1 bg-neutral-900 border border-neutral-700/80 rounded-xs overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              dashCooldown <= 0 ? 'bg-cyan-400 shadow-[0_0_4px_#38bdf8]' : 'bg-neutral-600'
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
