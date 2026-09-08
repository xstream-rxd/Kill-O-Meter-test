import React, { useEffect, useRef } from 'react';
import { TextureManager } from '../engine/textures';

interface DoomFaceProps {
  health: number;
  isTakingDamage: boolean;
  isBerserk: boolean;
  comboCount: number;
  lookDirection: 'left' | 'right' | 'straight';
}

export const DoomFace: React.FC<DoomFaceProps> = ({
  health,
  isTakingDamage,
  isBerserk,
  comboCount,
  lookDirection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const textures = TextureManager.getInstance();
    let faceKey = 'healthy_straight';

    if (health <= 0) {
      faceKey = 'dead';
    } else if (isBerserk) {
      faceKey = 'berserk';
    } else if (isTakingDamage) {
      faceKey = 'pain_grit';
    } else if (comboCount >= 3) {
      faceKey = 'evil_grin';
    } else if (health < 25) {
      faceKey = 'bleed_heavy';
    } else if (health < 55) {
      faceKey = 'bleed_mid';
    } else {
      if (lookDirection === 'left') faceKey = 'healthy_left';
      else if (lookDirection === 'right') faceKey = 'healthy_right';
      else faceKey = 'healthy_straight';
    }

    const faceImg = textures.faceCanvases[faceKey] || textures.faceCanvases['healthy_straight'];
    if (faceImg) {
      ctx.drawImage(faceImg, 0, 0, canvas.width, canvas.height);
    }
  }, [health, isTakingDamage, isBerserk, comboCount, lookDirection]);

  return (
    <div id="doom-face-container" className="relative w-16 h-18 sm:w-20 sm:h-22 bg-neutral-900 border-2 border-neutral-700 shadow-inner overflow-hidden flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={32}
        height={36}
        className="w-full h-full pixelated object-contain"
      />
      {isBerserk && (
        <div className="absolute inset-0 bg-red-600/30 animate-pulse pointer-events-none" />
      )}
    </div>
  );
};
