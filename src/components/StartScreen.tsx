import React, { useState } from 'react';
import { Difficulty, GameSettings, KeyBindings } from '../types';
import { soundSynth } from '../engine/soundSynth';
import { 
  Skull, 
  Play, 
  Settings, 
  Volume2, 
  Crosshair, 
  Keyboard, 
  Sparkles, 
  ShieldAlert, 
  Flame, 
  HelpCircle, 
  RotateCcw, 
  Compass,
  Zap,
  Film
} from 'lucide-react';

interface StartScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onStartGame: (difficulty: Difficulty) => void;
  onOpenIntro?: () => void;
}

type MenuState = 'main' | 'difficulty' | 'options' | 'bindings' | 'guide';

export const StartScreen: React.FC<StartScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
  onOpenIntro,
}) => {
  const [menuState, setMenuState] = useState<MenuState>('main');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(settings.difficulty || 'normal');
  const [activeRebindAction, setActiveRebindAction] = useState<keyof KeyBindings | null>(null);

  const playSelect = () => soundSynth.playMenuSelect();
  const playMove = () => soundSynth.playMenuMove();

  const difficulties: { id: Difficulty; name: string; tag: string; desc: string; color: string; badgeBg: string }[] = [
    {
      id: 'easy',
      name: "I'M TOO YOUNG TO DIE",
      tag: 'EASY',
      desc: 'Player takes 40% less damage. Ammo and health pickups grant abundant supplies. Slower demonic projectiles.',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
    },
    {
      id: 'normal',
      name: 'HURT ME PLENTY',
      tag: 'NORMAL',
      desc: 'The definitive retro challenge. Standard demonic damage, wave escalation, and tactical mobility required.',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
    },
    {
      id: 'hard',
      name: 'ULTRA-VIOLENCE',
      tag: 'HARD',
      desc: 'Demons hit with 1.35x force and advance with increased velocity. Elite demonic variants spawn earlier.',
      color: 'text-orange-500',
      badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-300',
    },
    {
      id: 'nightmare',
      name: 'NIGHTMARE!',
      tag: 'BRUTAL',
      desc: 'Punishing hellfire carnage. 1.75x incoming damage, hyper-aggressive demon AI, and rapid wave onslaughts.',
      color: 'text-red-500',
      badgeBg: 'bg-red-950/80 border-red-600 text-red-400',
    },
  ];

  // Key Binding Helper
  const handleStartRebind = (actionKey: keyof KeyBindings) => {
    setActiveRebindAction(actionKey);
    playSelect();
  };

  React.useEffect(() => {
    if (!activeRebindAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newKey = e.code;
      const currentBindings = { ...settings.keyBindings };
      currentBindings[activeRebindAction] = newKey;

      onUpdateSettings({ keyBindings: currentBindings });
      setActiveRebindAction(null);
      soundSynth.playSecretDiscovery();
    };

    window.addEventListener('keydown', handleKeyDown, { once: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeRebindAction, settings.keyBindings, onUpdateSettings]);

  const resetDefaultKeyBindings = () => {
    playSelect();
    onUpdateSettings({
      keyBindings: {
        moveForward: 'KeyW',
        moveBackward: 'KeyS',
        strafeLeft: 'KeyA',
        strafeRight: 'KeyD',
        dash: 'ShiftLeft',
        fire: 'Mouse0',
        interact: 'KeyE',
        gloryKill: 'KeyF',
        reload: 'KeyR',
        weapon1: 'Digit1',
        weapon2: 'Digit2',
        weapon3: 'Digit3',
        weapon4: 'Digit4',
        weapon5: 'Digit5',
        toggleMinimap: 'KeyM',
      },
    });
  };

  const formatKeyName = (code: string) => {
    if (!code) return 'UNBOUND';
    return code
      .replace('Key', '')
      .replace('Digit', 'NUM ')
      .replace('ShiftLeft', 'L-SHIFT')
      .replace('ShiftRight', 'R-SHIFT')
      .replace('Space', 'SPACEBAR')
      .replace('ControlLeft', 'L-CTRL')
      .replace('Mouse0', 'LEFT CLICK')
      .toUpperCase();
  };

  return (
    <div
      id="start-screen-container"
      className="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center p-4 select-none overflow-y-auto"
      style={{
        backgroundImage: `radial-gradient(circle at center, rgba(185, 28, 28, 0.15) 0%, rgba(10, 10, 10, 0.95) 75%, #050505 100%)`,
      }}
    >
      {/* Background Grid Accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f1f15_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-xl w-full flex flex-col items-center text-center my-auto py-6">
        
        {/* KILL-O-METER Logo Banner */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-950/70 border border-red-800/60 rounded-full mb-3 shadow-[0_0_15px_#dc2626]">
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-mono-tech uppercase tracking-widest text-red-400 font-bold">
              2.5D RETRO HELLFIRE RAYCASTER
            </span>
            <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          </div>

          <h1 className="text-4xl sm:text-6xl font-pixel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-600 to-amber-700 drop-shadow-[0_5px_15px_rgba(220,38,38,0.7)] mb-1">
            KILL-O-METER
          </h1>
          <p className="text-xs sm:text-sm font-mono-tech text-neutral-400 uppercase tracking-widest">
            BRUTAL RETRO FIRST-PERSON ARENA
          </p>
        </div>

        {/* --- MAIN MENU STATE --- */}
        {menuState === 'main' && (
          <div className="w-full space-y-3 font-pixel text-sm sm:text-base">
            <button
              id="start-new-game-btn"
              onClick={() => {
                playSelect();
                setMenuState('difficulty');
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 text-black font-extrabold rounded border-2 border-red-400/80 shadow-[0_0_25px_#dc2626] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Play className="w-5 h-5 fill-current text-black group-hover:animate-bounce" />
              <span>ENTER THE ARENA (NEW GAME)</span>
            </button>

            {onOpenIntro && (
              <button
                id="start-intro-btn"
                onClick={() => {
                  playSelect();
                  onOpenIntro();
                }}
                className="w-full py-3.5 px-6 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 rounded border border-emerald-600/60 hover:border-emerald-400 shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <Film className="w-5 h-5 text-emerald-400" />
                <span>RETRO BRIEFING &amp; CODEX</span>
              </button>
            )}

            <button
              id="start-options-btn"
              onClick={() => {
                playSelect();
                setMenuState('options');
              }}
              className="w-full py-3.5 px-6 bg-neutral-900/90 hover:bg-neutral-800 text-gray-200 hover:text-white rounded border border-neutral-700 hover:border-red-500/50 shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Settings className="w-5 h-5 text-red-500" />
              <span>SETTINGS & AUDIO</span>
            </button>

            <button
              id="start-bindings-btn"
              onClick={() => {
                playSelect();
                setMenuState('bindings');
              }}
              className="w-full py-3.5 px-6 bg-neutral-900/90 hover:bg-neutral-800 text-gray-200 hover:text-white rounded border border-neutral-700 hover:border-cyan-500/50 shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Keyboard className="w-5 h-5 text-cyan-400" />
              <span>CUSTOM KEY BINDINGS</span>
            </button>

            <button
              id="start-guide-btn"
              onClick={() => {
                playSelect();
                setMenuState('guide');
              }}
              className="w-full py-3.5 px-6 bg-neutral-900/90 hover:bg-neutral-800 text-gray-200 hover:text-white rounded border border-neutral-700 hover:border-amber-500/50 shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>FIELD GUIDE & SECRETS</span>
            </button>
          </div>
        )}

        {/* --- DIFFICULTY SELECTION STATE --- */}
        {menuState === 'difficulty' && (
          <div className="w-full bg-neutral-950/95 border-2 border-red-800/80 rounded-lg p-5 sm:p-6 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-red-900/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Skull className="w-6 h-6 text-red-500" />
                <h2 className="text-lg sm:text-xl font-pixel font-bold text-red-500">SELECT DIFFICULTY</h2>
              </div>
              <span className="text-xs font-mono-tech text-neutral-400 uppercase">CHOOSE YOUR FATE</span>
            </div>

            <div className="space-y-3 mb-6">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <div
                    key={diff.id}
                    id={`diff-option-${diff.id}`}
                    onClick={() => {
                      playMove();
                      setSelectedDifficulty(diff.id);
                    }}
                    className={`p-3.5 rounded border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]'
                        : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-pixel font-bold text-sm sm:text-base ${diff.color}`}>
                        {diff.name}
                      </span>
                      <span className={`text-[10px] font-mono-tech font-bold px-2 py-0.5 rounded border ${diff.badgeBg}`}>
                        {diff.tag}
                      </span>
                    </div>
                    <p className="text-xs font-mono-tech text-neutral-300 leading-relaxed">
                      {diff.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 font-pixel text-xs sm:text-sm">
              <button
                id="back-diff-btn"
                onClick={() => {
                  playMove();
                  setMenuState('main');
                }}
                className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-gray-300 border border-neutral-700 rounded transition-colors cursor-pointer"
              >
                BACK
              </button>
              <button
                id="confirm-start-btn"
                onClick={() => {
                  playSelect();
                  onStartGame(selectedDifficulty);
                }}
                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-black font-extrabold rounded shadow-[0_0_20px_#dc2626] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current text-black" />
                START BATTLE
              </button>
            </div>
          </div>
        )}

        {/* --- OPTIONS / AUDIO SETTINGS STATE --- */}
        {menuState === 'options' && (
          <div className="w-full bg-neutral-950/95 border-2 border-neutral-700 rounded-lg p-5 sm:p-6 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6 text-red-500" />
                <h2 className="text-lg sm:text-xl font-pixel font-bold text-red-500">OPTIONS & AUDIO</h2>
              </div>
              <span className="text-xs font-mono-tech text-neutral-400">CONFIG</span>
            </div>

            <div className="space-y-4 mb-6 font-mono-tech text-sm">
              {/* Sound FX Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Volume2 className="w-4 h-4 text-amber-400" /> Sound FX Volume:
                  </span>
                  <span className="text-amber-400 font-bold">{Math.round(settings.soundVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-neutral-800 cursor-pointer"
                />
              </div>

              {/* Music Volume Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Volume2 className="w-4 h-4 text-red-400" /> Dynamic Music Volume:
                  </span>
                  <span className="text-red-400 font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => onUpdateSettings({ musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-red-500 bg-neutral-800 cursor-pointer"
                />
              </div>

              {/* Mouse Sensitivity */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Crosshair className="w-4 h-4 text-cyan-400" /> Mouse Look Sensitivity:
                  </span>
                  <span className="text-cyan-400 font-bold">{(settings.mouseSensitivity * 1000).toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.006"
                  step="0.0005"
                  value={settings.mouseSensitivity}
                  onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 bg-neutral-800 cursor-pointer"
                />
              </div>

              {/* Render Resolution */}
              <div>
                <label className="text-gray-300 text-xs block mb-1">Render Resolution Scale:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Retro (0.5x)', val: 0.5 },
                    { label: 'Standard (0.75x)', val: 0.75 },
                    { label: 'Crisp (1.0x)', val: 1.0 },
                  ].map((res) => (
                    <button
                      key={res.val}
                      onClick={() => {
                        playMove();
                        onUpdateSettings({ renderResolution: res.val });
                      }}
                      className={`py-1.5 px-2 rounded text-xs font-mono-tech border cursor-pointer ${
                        settings.renderResolution === res.val
                          ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              id="back-options-btn"
              onClick={() => {
                playSelect();
                setMenuState('main');
              }}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs sm:text-sm rounded border border-neutral-700 transition-colors cursor-pointer"
            >
              SAVE & RETURN TO MENU
            </button>
          </div>
        )}

        {/* --- CUSTOM KEY BINDINGS STATE --- */}
        {menuState === 'bindings' && (
          <div className="w-full bg-neutral-950/95 border-2 border-cyan-800/80 rounded-lg p-5 sm:p-6 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-cyan-900/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="w-6 h-6 text-cyan-400" />
                <h2 className="text-lg sm:text-xl font-pixel font-bold text-cyan-400">KEY BINDINGS</h2>
              </div>
              <button
                onClick={resetDefaultKeyBindings}
                className="text-xs font-mono-tech text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> RESET DEFAULTS
              </button>
            </div>

            {activeRebindAction && (
              <div className="mb-4 p-3 bg-cyan-950/90 border border-cyan-400 rounded text-center animate-pulse">
                <span className="font-pixel text-xs text-cyan-200">
                  PRESS ANY KEY TO REBIND: <strong className="text-amber-300">{activeRebindAction.toUpperCase()}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 font-mono-tech text-xs max-h-64 overflow-y-auto pr-1">
              {[
                { key: 'moveForward' as keyof KeyBindings, label: 'Move Forward' },
                { key: 'moveBackward' as keyof KeyBindings, label: 'Move Backward' },
                { key: 'strafeLeft' as keyof KeyBindings, label: 'Strafe Left' },
                { key: 'strafeRight' as keyof KeyBindings, label: 'Strafe Right' },
                { key: 'dash' as keyof KeyBindings, label: 'Dash / Slide' },
                { key: 'interact' as keyof KeyBindings, label: 'Interact / Secrets' },
                { key: 'gloryKill' as keyof KeyBindings, label: 'Glory Kill / Melee' },
                { key: 'reload' as keyof KeyBindings, label: 'Reload Weapon' },
                { key: 'weapon2' as keyof KeyBindings, label: 'Weapon 2 (Shotgun)' },
                { key: 'weapon3' as keyof KeyBindings, label: 'Weapon 3 (Chaingun)' },
                { key: 'weapon4' as keyof KeyBindings, label: 'Weapon 4 (Plasma)' },
                { key: 'toggleMinimap' as keyof KeyBindings, label: 'Toggle Minimap' },
              ].map((b) => (
                <div
                  key={b.key}
                  onClick={() => handleStartRebind(b.key)}
                  className={`flex justify-between items-center p-2 rounded border cursor-pointer transition-colors ${
                    activeRebindAction === b.key
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-gray-300'
                  }`}
                >
                  <span>{b.label}:</span>
                  <span className="font-bold px-2 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-amber-400 text-[11px]">
                    {formatKeyName(settings.keyBindings[b.key])}
                  </span>
                </div>
              ))}
            </div>

            <button
              id="back-bindings-btn"
              onClick={() => {
                playSelect();
                setMenuState('main');
              }}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs sm:text-sm rounded border border-neutral-700 transition-colors cursor-pointer"
            >
              SAVE & RETURN TO MENU
            </button>
          </div>
        )}

        {/* --- FIELD GUIDE & SECRETS STATE --- */}
        {menuState === 'guide' && (
          <div className="w-full bg-neutral-950/95 border-2 border-amber-700/80 rounded-lg p-5 sm:p-6 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-amber-900/50 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-6 h-6 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-pixel font-bold text-amber-400">FIELD GUIDE & SECRETS</h2>
              </div>
              <span className="text-xs font-mono-tech text-neutral-400">INTEL</span>
            </div>

            <div className="space-y-4 mb-6 font-mono-tech text-xs text-neutral-300 max-h-72 overflow-y-auto pr-2">
              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5 font-pixel text-[11px]">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" /> 1. NEUTRAL SAFE ZONE
                </div>
                <p>
                  You spawn in the South Bunker, an inactive safe zone. Gear up with weapons and ammo. Crossing the airlock threshold triggers Wave 1 demonic activation.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5 font-pixel text-[11px]">
                  <Zap className="w-4 h-4 text-cyan-400" /> 2. MOBILITY & DASH DODGING
                </div>
                <p>
                  Use [SHIFT] or [SPACEBAR] to perform a high-velocity dash slide. Use dashes to slip past baron plasma barrages and imp fireballs.
                </p>
              </div>

              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5 font-pixel text-[11px]">
                  <Sparkles className="w-4 h-4 text-yellow-400" /> 3. HIDDEN SECRET VAULTS (4 TOTAL)
                </div>
                <p className="leading-relaxed">
                  Search walls for subtle seams, cracked textures, and ancient runes. Press [E] or touch the wall to reveal secret chambers containing Mega Health, Demonic Blood Armor, and Berserk Spheres!
                </p>
              </div>
            </div>

            <button
              id="back-guide-btn"
              onClick={() => {
                playSelect();
                setMenuState('main');
              }}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs sm:text-sm rounded border border-neutral-700 transition-colors cursor-pointer"
            >
              RETURN TO MENU
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 text-[10px] font-mono-tech text-neutral-500">
          DOOMPULSE V2.0 RETRO ENGINE • ALL RIGHTS RESERVED
        </div>
      </div>
    </div>
  );
};
