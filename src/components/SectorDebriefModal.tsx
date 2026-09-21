import React, { useEffect } from 'react';
import { LevelTransition } from '../types';
import { ShieldCheck, Award, Timer, Target, ArrowRight, Radio } from 'lucide-react';

interface SectorDebriefModalProps {
  transition: LevelTransition;
  onProceed: () => void;
}

export const SectorDebriefModal: React.FC<SectorDebriefModalProps> = ({
  transition,
  onProceed,
}) => {
  // Listen for Enter or Space to proceed seamlessly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        onProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onProceed]);

  const kills = transition.kills || 0;
  const secretsFound = transition.secretsFound || 0;
  const totalSecrets = transition.totalSecrets || 2;
  const timeElapsed = transition.timeElapsed || 0;

  const minutes = Math.floor(timeElapsed / 60);
  const seconds = Math.floor(timeElapsed % 60);
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Efficiency Rank Evaluation
  let rank = 'B';
  let rankColor = 'text-amber-400 border-amber-500/50 bg-amber-950/30';
  let rankTitle = 'FIELD SURVIVOR';

  if (secretsFound >= totalSecrets && kills >= 10) {
    rank = 'S';
    rankColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
    rankTitle = 'NIGHTMARE OPERATOR';
  } else if (secretsFound > 0 || kills >= 15) {
    rank = 'A';
    rankColor = 'text-cyan-400 border-cyan-500/50 bg-cyan-950/30';
    rankTitle = 'VETERAN SLAYER';
  }

  return (
    <div
      id="sector-debrief-modal"
      className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="max-w-xl w-full bg-neutral-950/95 border-2 border-emerald-500/60 rounded-lg shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden font-mono-tech flex flex-col">
        {/* Retro Terminal Scanline Header */}
        <div className="bg-emerald-950/70 border-b border-emerald-500/40 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs tracking-widest text-emerald-300 font-bold uppercase">
              UAC TACTICAL COMM // SECTOR DEBRIEF
            </span>
          </div>
          <div className="text-[11px] text-emerald-400/80 font-pixel uppercase">
            STATUS: SECURED
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Sector Cleared Banner */}
          <div className="text-center space-y-1">
            <div className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
              MISSION INFILTRATION COMPLETE
            </div>
            <h2 className="text-2xl sm:text-3xl font-pixel text-amber-400 font-black tracking-wider drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              SECTOR 0{transition.fromStage} CLEARED
            </h2>
            <p className="text-xs text-neutral-400 font-sans">
              Hostile demonic presence neutralized. Warp gate stabilized.
            </p>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Kills */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded p-3 text-center flex flex-col items-center justify-center">
              <Target className="w-4 h-4 text-red-400 mb-1" />
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                KILLS
              </span>
              <span className="text-lg font-pixel font-bold text-red-300">
                {kills}
              </span>
            </div>

            {/* Secrets */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded p-3 text-center flex flex-col items-center justify-center">
              <Award className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                SECRETS
              </span>
              <span className="text-lg font-pixel font-bold text-amber-300">
                {secretsFound} / {totalSecrets}
              </span>
            </div>

            {/* Time */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded p-3 text-center flex flex-col items-center justify-center">
              <Timer className="w-4 h-4 text-cyan-400 mb-1" />
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">
                TIME
              </span>
              <span className="text-lg font-pixel font-bold text-cyan-300">
                {timeFormatted}
              </span>
            </div>

            {/* Rating */}
            <div className={`border rounded p-3 text-center flex flex-col items-center justify-center ${rankColor}`}>
              <ShieldCheck className="w-4 h-4 mb-1" />
              <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                RANK
              </span>
              <span className="text-lg font-pixel font-black">
                {rank}
              </span>
            </div>
          </div>

          {/* Efficiency Rank Title */}
          <div className="bg-neutral-900/60 border border-emerald-500/20 rounded px-4 py-2.5 flex items-center justify-between text-xs">
            <span className="text-neutral-400 font-bold">EVALUATION:</span>
            <span className="font-pixel text-emerald-300 font-bold tracking-wide">
              {rankTitle}
            </span>
          </div>

          {/* Safe Zone / Airlock Notice */}
          <div className="bg-emerald-950/30 border-l-2 border-emerald-500 px-4 py-3 text-left space-y-1">
            <div className="text-[11px] text-emerald-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
              <span>🛡️ SAFE ZONE PROTOCOL ENGAGED</span>
            </div>
            <p className="text-xs text-neutral-300 font-sans leading-relaxed">
              Sector 0{transition.toStage} insertion will be inside a protected staging chamber. Take a breath, replenish vitals at the Field Medic terminal, and cycle the airlock gate when you are ready to engage.
            </p>
          </div>

          {/* Action Button */}
          <button
            id="btn-proceed-sector"
            onClick={onProceed}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-black font-pixel text-xs font-bold rounded shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>PROCEED TO SECTOR 0{transition.toStage}</span>
            <ArrowRight className="w-4 h-4" />
            <span className="ml-2 text-[10px] text-emerald-950/70 font-mono-tech tracking-normal">
              [SPACE / ENTER]
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
