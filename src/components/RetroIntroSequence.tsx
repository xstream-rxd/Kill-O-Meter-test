import React, { useState, useEffect, useRef } from 'react';
import { soundSynth } from '../engine/soundSynth';
import { 
  Flame, 
  Play, 
  Crosshair, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Skull, 
  ChevronRight, 
  SkipForward,
  Terminal,
  Info,
  Package,
  Heart,
  Sparkles,
  Swords
} from 'lucide-react';

interface RetroIntroSequenceProps {
  onComplete: () => void;
  onStartDirectGame?: () => void;
}

type TabType = 'weapons' | 'health_armor' | 'powerups' | 'enemies';

export const RetroIntroSequence: React.FC<RetroIntroSequenceProps> = ({
  onComplete,
  onStartDirectGame,
}) => {
  const [phase, setPhase] = useState<'boot' | 'logo' | 'codex'>('boot');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('weapons');
  const audioStartedRef = useRef(false);

  // Initialize sound synth and dramatic intro sounds
  useEffect(() => {
    const handleInitialUserGesture = () => {
      if (!audioStartedRef.current) {
        audioStartedRef.current = true;
        soundSynth.init();
        soundSynth.resume();
        soundSynth.startMusic();
        soundSynth.playIntroRiser();
      }
    };

    window.addEventListener('keydown', handleInitialUserGesture, { once: true });
    window.addEventListener('click', handleInitialUserGesture, { once: true });

    return () => {
      window.removeEventListener('keydown', handleInitialUserGesture);
      window.removeEventListener('click', handleInitialUserGesture);
    };
  }, []);

  // Phase 1: Terminal Boot Sequence (Slower, deliberate pacing)
  useEffect(() => {
    const logs = [
      'KILL-O-METER SLAUGHTER OS v3.22 (C) 1993 SLAUGHTER CORP',
      'CPU: HELLFIRE PENTIUM 66MHz [OVERCLOCKED]',
      'INITIALIZING 2.5D RAYCAST MATRIX... [OK]',
      'LOADING WEAPON & DEMON DOSSIERS... [OK]',
      'SYNCHRONIZING AUDIO SYNTH ENGINE... [OK]',
      'WARNING: DEMONIC CONTAINMENT BREACH IN SECTOR 4!',
      'ENGAGING SLAUGHTER CORE PROTOCOL...',
    ];

    let currentLine = 0;
    const interval = setInterval(() => {
      if (currentLine < logs.length) {
        setTerminalLines(prev => [...prev, logs[currentLine]]);
        soundSynth.playTerminalBeep();
        currentLine++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          soundSynth.playIntroImpact();
          setPhase('logo');
        }, 1000);
      }
    }, 520);

    return () => clearInterval(interval);
  }, []);

  // Phase 2 -> Phase 3 transition (Slower, 4s hold on dramatic logo)
  useEffect(() => {
    if (phase === 'logo') {
      const timer = setTimeout(() => {
        setPhase('codex');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Keyboard shortcut listener for skip/enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        onComplete();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  return (
    <div 
      id="retro-intro-container"
      className="fixed inset-0 z-50 bg-black text-green-400 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden font-mono-tech select-none"
    >
      {/* Scanline & CRT Vignette Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[size:100%_4px] pointer-events-none z-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,0,0,0.95)_100%)] pointer-events-none z-20" />

      {/* Main Terminal Frame */}
      <div className="relative z-10 w-full max-w-4xl h-full max-h-[640px] bg-neutral-950/90 border-4 border-neutral-800 rounded-lg p-4 sm:p-6 flex flex-col shadow-[0_0_50px_rgba(220,38,38,0.25)] overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-pixel text-[11px] text-emerald-400 tracking-widest">
              KILL-O-METER // ARCHIVAL BRIEFING
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onComplete}
              className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/80 rounded text-[10px] font-pixel text-red-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_10px_rgba(220,38,38,0.4)]"
            >
              <span>SKIP INTRO</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* --- PHASE 1: MS-DOS BOOT SEQUENCE --- */}
        {phase === 'boot' && (
          <div className="flex-1 flex flex-col justify-end font-mono-tech text-xs sm:text-sm text-emerald-400 space-y-2 p-2 sm:p-4 bg-black/80 border border-emerald-950 rounded">
            {terminalLines.map((line, index) => (
              <div key={index} className="flex items-center gap-2 animate-fade-in">
                <span className="text-emerald-600 font-bold">&gt;</span>
                <span className={line?.includes('WARNING') ? 'text-amber-400 font-bold' : ''}>
                  {line}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-emerald-300 animate-pulse">
              <span className="text-emerald-500 font-bold">&gt;</span>
              <span>_</span>
            </div>
          </div>
        )}

        {/* --- PHASE 2: ANIMATED TITLE EXPLOSION --- */}
        {phase === 'logo' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 relative animate-fade-in">
            <div className="inline-flex p-4 bg-red-950/60 border-2 border-red-600 rounded-full mb-4 shadow-[0_0_40px_#dc2626] animate-bounce">
              <Flame className="w-12 h-12 text-red-500 animate-pulse" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-pixel font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-amber-400 to-red-500 tracking-wider mb-3 shadow-red-500 animate-pulse">
              KILL-O-METER
            </h1>
            <p className="text-xs sm:text-sm font-pixel text-amber-400 uppercase tracking-widest max-w-md">
              ULTRA-VIOLENT 2.5D HELLFIRE COMBAT
            </p>
          </div>
        )}

        {/* --- PHASE 3: TACTICAL FIELD DOSSIER / CODEX SHOWCASE --- */}
        {phase === 'codex' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Tab Navigation */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => { setActiveTab('weapons'); soundSynth.playMenuMove(); }}
                className={`py-2 px-2 rounded border text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'weapons'
                    ? 'bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 text-red-400" />
                <span>WEAPONS</span>
              </button>
              <button
                onClick={() => { setActiveTab('health_armor'); soundSynth.playMenuMove(); }}
                className={`py-2 px-2 rounded border text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'health_armor'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Heart className="w-3.5 h-3.5 text-emerald-400" />
                <span>HEALTH &amp; AMMO</span>
              </button>
              <button
                onClick={() => { setActiveTab('powerups'); soundSynth.playMenuMove(); }}
                className={`py-2 px-2 rounded border text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'powerups'
                    ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>POWER-UPS</span>
              </button>
              <button
                onClick={() => { setActiveTab('enemies'); soundSynth.playMenuMove(); }}
                className={`py-2 px-2 rounded border text-xs font-pixel flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === 'enemies'
                    ? 'bg-purple-950/90 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Skull className="w-3.5 h-3.5 text-purple-400" />
                <span>DEMON TYPES</span>
              </button>
            </div>

            {/* Content Panel */}
            <div className="flex-1 bg-neutral-900/90 border border-neutral-800 rounded-lg p-3 sm:p-4 overflow-y-auto space-y-3">
              {/* TAB 1: WEAPONS */}
              {activeTab === 'weapons' && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-400 font-pixel text-xs mb-2 flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-red-500" /> ARSENAL &amp; AMMO SPECIFICATIONS
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded">
                      <div className="font-pixel text-red-400 font-bold text-[11px] mb-1 flex justify-between">
                        <span>[1] FIST / KNUCKLES</span>
                        <span className="text-gray-400 text-[10px]">INFINITE</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">
                        Melee impact weapon. Deals crushing execution damage when enemies are staggered or Berserk active.
                      </p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded">
                      <div className="font-pixel text-cyan-400 font-bold text-[11px] mb-1 flex justify-between">
                        <span>[2] 9MM PISTOL</span>
                        <span className="text-cyan-300 text-[10px]">BULLET CLIPS</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">
                        Precision semi-automatic firearm. High accuracy for long-range targets.
                      </p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded">
                      <div className="font-pixel text-amber-400 font-bold text-[11px] mb-1 flex justify-between">
                        <span>[3] PUMP SHOTGUN</span>
                        <span className="text-amber-300 text-[10px]">SHOTGUN SHELLS</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">
                        Devastating wide pellet spread. Obliterates hordes and staggers demon elites up close.
                      </p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded">
                      <div className="font-pixel text-orange-400 font-bold text-[11px] mb-1 flex justify-between">
                        <span>[4] GATLING CHAINGUN</span>
                        <span className="text-orange-300 text-[10px]">CHAINGUN BELTS</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">
                        High-rate suppression gatling cannon. Watch heat gauge to prevent barrel overheat!
                      </p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded md:col-span-2">
                      <div className="font-pixel text-purple-400 font-bold text-[11px] mb-1 flex justify-between">
                        <span>[5] PLASMA RIFLE</span>
                        <span className="text-purple-300 text-[10px]">PLASMA CELLS</span>
                      </div>
                      <p className="text-gray-300 text-[11px]">
                        Fires hyper-velocity plasma cell bolts that melt demonic skin and splash area damage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HEALTH & AMMO */}
              {activeTab === 'health_armor' && (
                <div className="space-y-2 text-xs">
                  <div className="text-emerald-400 font-pixel text-xs mb-2 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-emerald-400" /> VITAL SURVIVAL PICKUPS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-neutral-950/80 border border-emerald-900/60 rounded">
                      <div className="font-pixel text-emerald-400 font-bold text-[11px] mb-1">STIMPACK (+10 HP)</div>
                      <p className="text-gray-300 text-[11px]">Quick combat field dressing. Heals up to 100 HP.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-emerald-900/60 rounded">
                      <div className="font-pixel text-emerald-300 font-bold text-[11px] mb-1">MEDKIT (+25 HP)</div>
                      <p className="text-gray-300 text-[11px]">Standard medical container. Crucial during intense wave surges.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-cyan-900/60 rounded">
                      <div className="font-pixel text-cyan-400 font-bold text-[11px] mb-1">SECURITY ARMOR (+50 AP)</div>
                      <p className="text-gray-300 text-[11px]">Green Kevlar suit. Absorbs 50% of incoming physical damage.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-blue-900/60 rounded">
                      <div className="font-pixel text-blue-400 font-bold text-[11px] mb-1">COMBAT ARMOR (+100 AP)</div>
                      <p className="text-gray-300 text-[11px]">Blue heavy combat armor plate. Absorbs 75% of demon attacks.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-amber-900/60 rounded sm:col-span-2">
                      <div className="font-pixel text-amber-400 font-bold text-[11px] mb-1">MEGA-HEALTH (+100 HP OVERCHARGE)</div>
                      <p className="text-gray-300 text-[11px]">Relic sphere that instantly boosts player health up to 200 HP maximum!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: POWER-UPS */}
              {activeTab === 'powerups' && (
                <div className="space-y-2 text-xs">
                  <div className="text-amber-400 font-pixel text-xs mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" /> COMBAT OVERCHARGE POWER-UPS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-neutral-950/80 border border-red-900/60 rounded">
                      <div className="font-pixel text-red-400 font-bold text-[11px] mb-1">BERSERK SPHERE</div>
                      <p className="text-gray-300 text-[11px]">Fully restores health and grants 10x Melee Fist damage for brutal gibs!</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-purple-900/60 rounded">
                      <div className="font-pixel text-purple-400 font-bold text-[11px] mb-1">QUAD DAMAGE</div>
                      <p className="text-gray-300 text-[11px]">Multiplies all weapon damage by 4x for 15 seconds of pure annihilation.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-amber-900/60 rounded">
                      <div className="font-pixel text-amber-400 font-bold text-[11px] mb-1">HASTE RELIC</div>
                      <p className="text-gray-300 text-[11px]">Doubles movement velocity and allows instant dash cooldown resets.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-yellow-900/60 rounded">
                      <div className="font-pixel text-yellow-300 font-bold text-[11px] mb-1">INVULNERABILITY</div>
                      <p className="text-gray-300 text-[11px]">Surrounds player in a golden shield providing 100% immunity to all damage.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ENEMIES */}
              {activeTab === 'enemies' && (
                <div className="space-y-2 text-xs">
                  <div className="text-purple-400 font-pixel text-xs mb-2 flex items-center gap-2">
                    <Skull className="w-4 h-4 text-purple-400" /> DEMONIC HOST &amp; BOSS THREATS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded">
                      <div className="font-pixel text-gray-300 font-bold text-[11px] mb-1">POSSESSED SOLDIER</div>
                      <p className="text-gray-400 text-[11px]">Zombified rifleman. Ranged firearm attacks, easy to stagger.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-red-950 rounded">
                      <div className="font-pixel text-red-400 font-bold text-[11px] mb-1">IMP DEMON</div>
                      <p className="text-gray-300 text-[11px]">Agile demon. Hurls explosive fireballs and leaps towards target.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-pink-950 rounded">
                      <div className="font-pixel text-pink-400 font-bold text-[11px] mb-1">PINKY BULL DEMON</div>
                      <p className="text-gray-300 text-[11px]">Armored charging beast. High health and aggressive melee bites.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-cyan-950 rounded">
                      <div className="font-pixel text-cyan-400 font-bold text-[11px] mb-1">CACODEMON</div>
                      <p className="text-gray-300 text-[11px]">Floating horned sphere. Spits ball lightning from above.</p>
                    </div>
                    <div className="p-2.5 bg-neutral-950/80 border border-purple-950 rounded sm:col-span-2">
                      <div className="font-pixel text-purple-300 font-bold text-[11px] mb-1">THE WARDEN (STAGE 4 BOSS)</div>
                      <p className="text-gray-300 text-[11px]">
                        Apex mutagenic cyber-titan. Triggers Arena Lockdown with barrage missiles and acid shockwaves.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[10px] font-mono-tech text-gray-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>PRESS <strong className="text-amber-300">SPACE / ENTER</strong> TO PROCEED TO SLAUGHTER MENU</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onComplete}
              className="flex-1 sm:flex-initial py-2.5 px-5 bg-red-600 hover:bg-red-500 text-black font-pixel text-xs font-bold rounded shadow-[0_0_20px_#dc2626] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>ENTER MAIN MENU</span>
            </button>
            {onStartDirectGame && (
              <button
                onClick={onStartDirectGame}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-pixel text-xs font-bold rounded shadow-[0_0_15px_#f59e0b] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Flame className="w-4 h-4 fill-black" />
                <span>PLAY NOW</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
