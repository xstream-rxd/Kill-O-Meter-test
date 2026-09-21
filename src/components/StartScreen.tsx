import React, { useState, useEffect, useRef } from 'react';
import { Difficulty, GameSettings, KeyBindings } from '../types';
import { soundSynth } from '../engine/soundSynth';
import { gamepadManager } from '../engine/gamepadManager';
import { 
  Skull, 
  Play, 
  Settings, 
  Volume2, 
  Crosshair, 
  Keyboard, 
  Flame, 
  RotateCcw, 
  Zap,
  BookOpen,
  Gamepad2,
  Sparkles,
  Shield,
  Radio,
  ChevronRight,
  Eye,
  Crosshair as CrosshairIcon,
  HelpCircle,
  Activity,
  Layers
} from 'lucide-react';

interface StartScreenProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onStartGame: (difficulty: Difficulty) => void;
}

type MenuState = 'title_screen' | 'main' | 'difficulty' | 'options' | 'gamepad' | 'codex' | 'bindings';

export const StartScreen: React.FC<StartScreenProps> = ({
  settings,
  onUpdateSettings,
  onStartGame,
}) => {
  const [menuState, setMenuState] = useState<MenuState>('title_screen');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(settings.difficulty || 'normal');
  const [activeRebindAction, setActiveRebindAction] = useState<keyof KeyBindings | null>(null);
  const [codexTab, setCodexTab] = useState<'demons' | 'weapons' | 'tactics'>('demons');
  const [gamepadInfo, setGamepadInfo] = useState<{ connected: boolean; name: string }>({ connected: false, name: '' });
  const [testRumbleSuccess, setTestRumbleSuccess] = useState(false);
  const [mainSelectedIndex, setMainSelectedIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const playSelect = () => soundSynth.playMenuSelect();
  const playMove = () => soundSynth.playMenuMove();

  const handleEnterMenu = () => {
    soundSynth.init();
    soundSynth.resume();
    soundSynth.playMenuSelect();
    setMenuState('main');
  };

  const difficulties: { id: Difficulty; name: string; tag: string; skulls: string; desc: string; color: string; badgeBg: string }[] = [
    {
      id: 'easy',
      name: "I'M TOO YOUNG TO DIE",
      tag: 'EASY',
      skulls: '💀',
      desc: 'Player takes 40% reduced damage. Ammo and health pickups grant abundant supplies. Slower demon projectile velocity.',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
    },
    {
      id: 'normal',
      name: 'HURT ME PLENTY',
      tag: 'NORMAL',
      skulls: '💀💀',
      desc: 'The definitive retro challenge. Standard demonic damage, wave escalation, and tactical mobility required.',
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
    },
    {
      id: 'hard',
      name: 'ULTRA-VIOLENCE',
      tag: 'HARD',
      skulls: '💀💀💀',
      desc: 'Demons hit with 1.35x force and advance with increased velocity. Elite demonic variants spawn earlier.',
      color: 'text-orange-500',
      badgeBg: 'bg-orange-950/80 border-orange-500/50 text-orange-300',
    },
    {
      id: 'nightmare',
      name: 'NIGHTMARE!',
      tag: 'BRUTAL',
      skulls: '💀💀💀💀',
      desc: 'Punishing hellfire carnage. 1.75x incoming damage, hyper-aggressive demon AI, and rapid wave onslaughts.',
      color: 'text-red-500',
      badgeBg: 'bg-red-950/80 border-red-600 text-red-400',
    },
  ];

  // Dynamic Background Embers Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -(0.4 + Math.random() * 1.3),
      size: 1 + Math.random() * 2.5,
      alpha: 0.15 + Math.random() * 0.6,
      color: Math.random() > 0.4 ? '#dc2626' : '#f59e0b',
    }));

    let tick = 0;
    const render = () => {
      tick++;
      ctx.fillStyle = '#080404';
      ctx.fillRect(0, 0, width, height);

      // Radial dark red pulse
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        80,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.75
      );
      grad.addColorStop(0, 'rgba(185, 28, 28, 0.22)');
      grad.addColorStop(0.5, 'rgba(30, 10, 10, 0.55)');
      grad.addColorStop(1, '#050303');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal cyber raster lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 8) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw embers
      particles.forEach((p) => {
        p.x += p.vx + Math.sin(tick * 0.02 + p.y * 0.01) * 0.3;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha * (0.6 + Math.sin(tick * 0.04 + p.x) * 0.4);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Keyboard navigation for main menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeRebindAction) return;

      if (menuState === 'title_screen') {
        e.preventDefault();
        handleEnterMenu();
        return;
      }

      if (menuState === 'main') {
        const totalOptions = 6;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          setMainSelectedIndex((prev) => (prev + 1) % totalOptions);
          soundSynth.playMenuMove();
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          setMainSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
          soundSynth.playMenuMove();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          soundSynth.playMenuSelect();
          if (mainSelectedIndex === 0) setMenuState('difficulty');
          else if (mainSelectedIndex === 1) onStartGame('normal');
          else if (mainSelectedIndex === 2) setMenuState('codex');
          else if (mainSelectedIndex === 3) setMenuState('options');
          else if (mainSelectedIndex === 4) setMenuState('gamepad');
          else if (mainSelectedIndex === 5) setMenuState('bindings');
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          soundSynth.playMenuSelect();
          setMenuState('title_screen');
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        soundSynth.playMenuSelect();
        setMenuState('main');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuState, mainSelectedIndex, activeRebindAction, onStartGame]);

  // Gamepad Polling in Menu
  useEffect(() => {
    let animFrame: number;
    let lastNavTime = 0;

    const poll = () => {
      const pad = gamepadManager.poll();
      setGamepadInfo({
        connected: pad.connected,
        name: pad.name,
      });

      const now = performance.now();
      if (now - lastNavTime > 180) {
        if (menuState === 'title_screen') {
          if (
            pad.menuConfirm ||
            pad.menuCancel ||
            pad.fire ||
            pad.dash ||
            pad.interact ||
            pad.reload ||
            pad.menuUp ||
            pad.menuDown
          ) {
            handleEnterMenu();
            lastNavTime = now;
          }
        } else if (menuState === 'main') {
          const totalOptions = 6;
          if (pad.menuDown) {
            setMainSelectedIndex((prev) => (prev + 1) % totalOptions);
            soundSynth.playMenuMove();
            lastNavTime = now;
          } else if (pad.menuUp) {
            setMainSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
            soundSynth.playMenuMove();
            lastNavTime = now;
          } else if (pad.menuConfirm) {
            soundSynth.playMenuSelect();
            if (mainSelectedIndex === 0) setMenuState('difficulty');
            else if (mainSelectedIndex === 1) onStartGame('normal');
            else if (mainSelectedIndex === 2) setMenuState('codex');
            else if (mainSelectedIndex === 3) setMenuState('options');
            else if (mainSelectedIndex === 4) setMenuState('gamepad');
            else if (mainSelectedIndex === 5) setMenuState('bindings');
            lastNavTime = now;
          } else if (pad.menuCancel) {
            soundSynth.playMenuSelect();
            setMenuState('title_screen');
            lastNavTime = now;
          }
        } else if (menuState === 'difficulty') {
          const diffIdx = difficulties.findIndex((d) => d.id === selectedDifficulty);
          if (pad.menuDown) {
            const nextIdx = (diffIdx + 1) % difficulties.length;
            setSelectedDifficulty(difficulties[nextIdx].id);
            soundSynth.playMenuMove();
            lastNavTime = now;
          } else if (pad.menuUp) {
            const prevIdx = (diffIdx - 1 + difficulties.length) % difficulties.length;
            setSelectedDifficulty(difficulties[prevIdx].id);
            soundSynth.playMenuMove();
            lastNavTime = now;
          } else if (pad.menuConfirm) {
            soundSynth.playMenuSelect();
            onStartGame(selectedDifficulty);
            lastNavTime = now;
          } else if (pad.menuCancel) {
            soundSynth.playMenuSelect();
            setMenuState('main');
            lastNavTime = now;
          }
        } else if (menuState === 'options' || menuState === 'gamepad' || menuState === 'codex' || menuState === 'bindings') {
          if (pad.menuCancel) {
            soundSynth.playMenuSelect();
            setMenuState('main');
            lastNavTime = now;
          }
        }
      }

      animFrame = requestAnimationFrame(poll);
    };

    animFrame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animFrame);
  }, [menuState, selectedDifficulty, mainSelectedIndex, onStartGame]);

  // Key Binding Helper
  const handleStartRebind = (actionKey: keyof KeyBindings) => {
    setActiveRebindAction(actionKey);
    playSelect();
  };

  useEffect(() => {
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

  const handleTestVibration = () => {
    gamepadManager.vibrate(250, 0.7, 0.9);
    setTestRumbleSuccess(true);
    soundSynth.playRelicPickup();
    setTimeout(() => setTestRumbleSuccess(false), 1200);
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
      onClick={menuState === 'title_screen' ? handleEnterMenu : undefined}
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-3 sm:p-6 select-none overflow-y-auto font-mono-tech ${
        menuState === 'title_screen' ? 'cursor-pointer' : ''
      }`}
    >
      {/* Full-Screen Title Image Background */}
      <img
        src="/killometer_fullscreen.jpg"
        alt="KILLOMETER Title Background"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0 brightness-[0.88] contrast-[1.05]"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/killometer.jpeg';
        }}
      />

      {/* Background Animated Hellfire Embers Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[1] mix-blend-screen opacity-70" />

      {/* CRT Scanline & Radial Vignette Filter */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.3)_50%)] bg-[size:100%_4px] pointer-events-none z-[2]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.75)_100%)] pointer-events-none z-[2]" />

      {/* Top Bar / Gamepad Connection Indicator */}
      <div className="relative z-20 w-full flex items-center justify-between max-w-4xl pt-1">
        {gamepadInfo.connected ? (
          <div id="gamepad-connected-pill" className="px-3 py-1 bg-neutral-950/90 border border-emerald-500/60 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-2 animate-pulse">
            <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-pixel text-emerald-300 font-bold tracking-wide truncate max-w-[200px]">
              {gamepadInfo.name} ACTIVE
            </span>
            <span className="text-[9px] font-mono-tech text-neutral-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
              {menuState === 'title_screen' ? 'ANY BUTTON TO START' : '[A] SELECT'}
            </span>
          </div>
        ) : menuState === 'title_screen' ? (
          <div className="text-[10px] font-mono-tech text-amber-500/80 bg-black/60 px-2.5 py-1 rounded border border-amber-900/40 backdrop-blur-sm">
            KILL-O-METER ARCADE SYSTEM ONLINE
          </div>
        ) : (
          <div className="text-[10px] font-mono-tech text-amber-500/80 bg-black/60 px-2.5 py-1 rounded border border-amber-900/40 backdrop-blur-sm">
            [W/S / ARROWS] NAVIGATE • [ENTER] SELECT
          </div>
        )}

        <div className="text-[10px] font-mono-tech text-neutral-400 bg-black/60 px-2.5 py-1 rounded border border-neutral-800 backdrop-blur-sm">
          KILL-O-METER ENGINE v4.02
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 0. TITLE ART SCREEN (BOTTOM CALL TO ACTION - CENTER IS KEPT CLEAR) */}
      {/* ========================================================================= */}
      {menuState === 'title_screen' && (
        <div
          id="title-screen-prompt-container"
          className="relative z-20 w-full max-w-xl flex flex-col items-center justify-center gap-3 pb-3 sm:pb-6 mt-auto animate-fade-in"
        >
          {/* Pulsing Arcade Call-to-Action Button */}
          <button
            id="press-start-title-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleEnterMenu();
            }}
            className="group px-8 sm:px-12 py-3.5 sm:py-4 bg-gradient-to-r from-red-700 via-amber-500 to-red-700 hover:from-red-600 hover:to-amber-400 text-black font-pixel font-black text-xs sm:text-sm md:text-base rounded-2xl border-2 border-amber-300 shadow-[0_0_35px_rgba(239,68,68,0.95)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer animate-pulse flex items-center gap-3 tracking-wider backdrop-blur-sm"
          >
            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current text-black group-hover:scale-110 transition-transform" />
            <span>PRESS START TO ENTER</span>
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-black group-hover:scale-110 transition-transform" />
          </button>

          {/* Input Hints Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono-tech text-neutral-300 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-500/40 shadow-xl">
            <span className="text-amber-400 font-bold">[CLICK / ENTER / SPACE]</span>
            <span className="text-neutral-500">•</span>
            <span className="text-emerald-400 font-bold">[ANY CONTROLLER BUTTON]</span>
          </div>

          <div className="text-[9px] sm:text-[10px] font-pixel text-red-500/90 tracking-widest uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]">
            ★ HELLFIRE ENGINE READY ★
          </div>
        </div>
      )}

      {/* Main Menu Cybernetic Card Frame (Displayed when not on pure Title Screen) */}
      {menuState !== 'title_screen' && (
        <div className="relative z-20 max-w-xl w-full flex flex-col items-center text-center my-auto py-2">

        {/* ========================================================================= */}
        {/* MAIN MENU STATE (GLASS CYBERNETIC MENU SUITE) */}
        {/* ========================================================================= */}
        {menuState === 'main' && (
          <div className="w-full space-y-2.5 font-pixel text-xs sm:text-sm bg-black/65 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-red-600/40 shadow-[0_0_35px_rgba(0,0,0,0.85)] animate-fade-in">
            
            {/* Header / Return to Title Art Screen */}
            <div className="flex items-center justify-between border-b border-red-900/50 pb-2 mb-2 text-left">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-[11px] sm:text-xs font-pixel text-red-400 tracking-wider">
                  MISSION CONTROL
                </span>
              </div>
              <button
                id="return-title-screen-btn"
                onClick={() => {
                  soundSynth.playMenuSelect();
                  setMenuState('title_screen');
                }}
                className="text-[10px] font-mono-tech text-neutral-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-900/80 border border-neutral-800 hover:border-amber-500/40 cursor-pointer"
              >
                <span>« TITLE SCREEN</span>
                <span className="text-neutral-500">[ESC]</span>
              </button>
            </div>
            
            {/* 1. Enter Arena (Campaign Difficulty Select) */}
            <button
              id="start-new-game-btn"
              onMouseEnter={() => { setMainSelectedIndex(0); playMove(); }}
              onClick={() => {
                playSelect();
                setMenuState('difficulty');
              }}
              className={`w-full py-3.5 px-4 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 hover:from-red-600 hover:to-amber-500 text-black font-extrabold rounded-lg border-2 transition-all transform hover:scale-[1.01] flex items-center justify-between cursor-pointer group shadow-[0_0_20px_#dc2626] ${
                mainSelectedIndex === 0 ? 'border-amber-300 ring-2 ring-red-500' : 'border-red-400/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 fill-current text-black group-hover:animate-bounce" />
                <span>ENTER THE ARENA (CAMPAIGN)</span>
              </div>
              <span className="text-[10px] font-mono-tech bg-black/30 px-2 py-0.5 rounded text-black font-bold">
                [ENTER / A]
              </span>
            </button>

            {/* 2. Quick Play */}
            <button
              id="start-quick-play-btn"
              onMouseEnter={() => { setMainSelectedIndex(1); playMove(); }}
              onClick={() => {
                playSelect();
                onStartGame('normal');
              }}
              className={`w-full py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 rounded-lg border shadow-md transition-all flex items-center justify-between cursor-pointer ${
                mainSelectedIndex === 1 ? 'border-amber-400 ring-2 ring-amber-500/40 bg-amber-950/40' : 'border-neutral-800 hover:border-amber-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>QUICK START (NORMAL MODE)</span>
              </div>
              <span className="text-[10px] font-mono-tech text-neutral-400">INSTANT DROP</span>
            </button>

            {/* 3. Mission Codex & Demon Intel */}
            <button
              id="start-codex-btn"
              onMouseEnter={() => { setMainSelectedIndex(2); playMove(); }}
              onClick={() => {
                playSelect();
                setMenuState('codex');
              }}
              className={`w-full py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 text-emerald-300 hover:text-emerald-200 rounded-lg border shadow-md transition-all flex items-center justify-between cursor-pointer ${
                mainSelectedIndex === 2 ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/40' : 'border-neutral-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span>MISSION CODEX &amp; DEMON INTEL</span>
              </div>
              <span className="text-[10px] font-mono-tech text-emerald-400 font-bold">BESTIARY &amp; WEAPONS</span>
            </button>

            {/* 4. Audio & Graphics Configuration */}
            <button
              id="start-options-btn"
              onMouseEnter={() => { setMainSelectedIndex(3); playMove(); }}
              onClick={() => {
                playSelect();
                setMenuState('options');
              }}
              className={`w-full py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 text-gray-200 hover:text-white rounded-lg border shadow-md transition-all flex items-center justify-between cursor-pointer ${
                mainSelectedIndex === 3 ? 'border-red-500 ring-2 ring-red-500/40 bg-red-950/40 text-red-300' : 'border-neutral-800 hover:border-red-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-red-500" />
                <span>AUDIO &amp; GRAPHICS CONFIG</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            {/* 5. Gamepad & Controller */}
            <button
              id="start-gamepad-btn"
              onMouseEnter={() => { setMainSelectedIndex(4); playMove(); }}
              onClick={() => {
                playSelect();
                setMenuState('gamepad');
              }}
              className={`w-full py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 text-emerald-300 hover:text-emerald-200 rounded-lg border shadow-md transition-all flex items-center justify-between cursor-pointer ${
                mainSelectedIndex === 4 ? 'border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-950/40 text-emerald-300' : 'border-neutral-800 hover:border-emerald-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span>GAMEPAD &amp; CONTROLLER</span>
              </div>
              <span className="text-[10px] font-mono-tech text-emerald-400 font-bold">
                {gamepadInfo.connected ? 'CONNECTED' : 'MAPPINGS'}
              </span>
            </button>

            {/* 6. Keyboard Rebinding */}
            <button
              id="start-bindings-btn"
              onMouseEnter={() => { setMainSelectedIndex(5); playMove(); }}
              onClick={() => {
                playSelect();
                setMenuState('bindings');
              }}
              className={`w-full py-3 px-4 bg-neutral-900/90 hover:bg-neutral-800 text-gray-200 hover:text-white rounded-lg border shadow-md transition-all flex items-center justify-between cursor-pointer ${
                mainSelectedIndex === 5 ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/40 text-cyan-300' : 'border-neutral-800 hover:border-cyan-500/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Keyboard className="w-4 h-4 text-cyan-400" />
                <span>KEYBOARD REBINDING</span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DIFFICULTY SELECT STATE */}
        {/* ========================================================================= */}
        {menuState === 'difficulty' && (
          <div className="w-full bg-neutral-950/95 border-2 border-red-800/80 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-red-900/50 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-500" />
                <h2 className="text-base sm:text-lg font-pixel font-bold text-red-500">SELECT DIFFICULTY</h2>
              </div>
              <span className="text-xs font-mono-tech text-amber-400 uppercase tracking-widest font-bold">
                CAMPAIGN OPS
              </span>
            </div>

            <div className="space-y-2 mb-4">
              {difficulties.map((diff) => {
                const isSelected = selectedDifficulty === diff.id;
                return (
                  <div
                    key={diff.id}
                    onClick={() => {
                      playMove();
                      setSelectedDifficulty(diff.id);
                    }}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] ring-1 ring-red-500'
                        : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-pixel font-bold text-xs sm:text-sm ${diff.color}`}>
                          {diff.name}
                        </span>
                        <span className="text-xs">{diff.skulls}</span>
                      </div>
                      <span className={`text-[9px] font-pixel px-1.5 py-0.5 rounded border font-bold ${diff.badgeBg}`}>
                        {diff.tag}
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-neutral-400 leading-relaxed">
                      {diff.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-pixel text-xs">
              <button
                id="back-diff-btn"
                onClick={() => {
                  playSelect();
                  setMenuState('main');
                }}
                className="py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-gray-300 rounded-lg border border-neutral-700 transition-colors cursor-pointer text-center"
              >
                BACK [ESC]
              </button>
              <button
                id="confirm-start-btn"
                onClick={() => {
                  playSelect();
                  onStartGame(selectedDifficulty);
                }}
                className="py-2.5 px-3 bg-red-600 hover:bg-red-500 text-black font-extrabold rounded-lg shadow-[0_0_20px_#dc2626] transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-black" />
                START BATTLE [ENTER]
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MISSION CODEX & INTEL */}
        {/* ========================================================================= */}
        {menuState === 'codex' && (
          <div className="w-full bg-neutral-950/95 border-2 border-emerald-700/80 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base sm:text-lg font-pixel font-bold text-emerald-400">TACTICAL CODEX</h2>
              </div>
              <span className="text-[10px] font-mono-tech text-emerald-300">FIELD DOSSIER</span>
            </div>

            {/* Codex Category Tabs */}
            <div className="grid grid-cols-3 gap-2 mb-3.5 font-pixel text-[11px]">
              <button
                onClick={() => { playMove(); setCodexTab('demons'); }}
                className={`py-1.5 px-2 rounded-lg border cursor-pointer transition-colors ${
                  codexTab === 'demons'
                    ? 'bg-red-950 border-red-500 text-red-300 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                DEMON BESTIARY
              </button>
              <button
                onClick={() => { playMove(); setCodexTab('weapons'); }}
                className={`py-1.5 px-2 rounded-lg border cursor-pointer transition-colors ${
                  codexTab === 'weapons'
                    ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                WEAPON ARSENAL
              </button>
              <button
                onClick={() => { playMove(); setCodexTab('tactics'); }}
                className={`py-1.5 px-2 rounded-lg border cursor-pointer transition-colors ${
                  codexTab === 'tactics'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                TACTICS &amp; SECRETS
              </button>
            </div>

            {/* Tab Contents */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs font-mono-tech mb-4">
              {codexTab === 'demons' && (
                <>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-red-400 font-pixel text-[11px]">POSSESSED GRUNT</strong>
                      <span className="text-[10px] text-neutral-500">HP: 28 • HITSCAN</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Basic foot soldier. Emits burst hitscan fire. Vulnerable to close-range shotgun pellets and point-blank glory kills.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-orange-400 font-pixel text-[11px]">HELL IMP</strong>
                      <span className="text-[10px] text-neutral-500">HP: 40 • FIREBALL</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Launches searing hellfire with predictive lead aiming. Dash sideways when they raise arms to dodge incoming volleys.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-cyan-400 font-pixel text-[11px]">PLASMA GUNNER</strong>
                      <span className="text-[10px] text-neutral-500">HP: 65 • RAPID BURST</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Fires 3-round rapid plasma bolts. Staggers easily under chaingun suppression fire.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-emerald-400 font-pixel text-[11px]">VILE SPITTER</strong>
                      <span className="text-[10px] text-neutral-500">HP: 85 • ACID LOB</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Lobs corrosive bile puddles that linger on the floor. Splatters bright green toxic viscera upon violent execution.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-purple-400 font-pixel text-[11px]">BARON OF HELL</strong>
                      <span className="text-[10px] text-neutral-500">HP: 240 • BRUISER</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Immense demonic juggernaut with obsidian horns and twin green plasma volleys. Requires sustained heavy ordinance.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-red-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-red-500 font-pixel text-[11px]">CYBER-TITAN GOLIATH (BOSS)</strong>
                      <span className="text-[10px] text-neutral-500">HP: 850 • MEGA-BOSS</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Stage boss with invulnerability energy shields, ground shockwave smashes, and heavy plasma battery barrages.</p>
                  </div>
                </>
              )}

              {codexTab === 'weapons' && (
                <>
                  <div className="p-2.5 bg-neutral-900/70 border border-amber-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-amber-400 font-pixel text-[11px]">1. SLAYER FIST (MELEE / FINISHER)</strong>
                      <span className="text-[10px] text-neutral-500">SLOT 1 • UNLIMITED</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Heavy titanium-knuckle strike. Deals 2.5x critical execute damage and triggers screen splatter gore on staggered enemies.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-amber-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-neutral-300 font-pixel text-[11px]">2. TACTICAL COMBAT PISTOL</strong>
                      <span className="text-[10px] text-neutral-500">SLOT 2 • 12 ROUND MAG</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Reliable semi-auto sidearm with fast cycling, clean sights, and unlimited ammunition reserve.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-amber-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-orange-400 font-pixel text-[11px]">3. SUPER SHOTGUN</strong>
                      <span className="text-[10px] text-neutral-500">SLOT 3 • 8 ROUND MAG</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Twin-barrel kinetic cannon firing 10 heavy buckshot pellets per trigger pull. Maximum close-range gib potential.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-amber-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-red-400 font-pixel text-[11px]">4. ROTARY CHAINGUN</strong>
                      <span className="text-[10px] text-neutral-500">SLOT 4 • DIRECT BELT FEED</span>
                    </div>
                    <p className="text-[11px] text-gray-300">600 RPM triple-barrel rotary gun. No reload required. Stagger locks demons in sustained corridors.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-amber-900/40 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-cyan-400 font-pixel text-[11px]">5. BIO-PLASMA RIFLE</strong>
                      <span className="text-[10px] text-neutral-500">SLOT 5 • 40 CELL BATTERY</span>
                    </div>
                    <p className="text-[11px] text-gray-300">Discharges ionized cyan energy bolts that detonate with electrical splash damage on impact.</p>
                  </div>
                </>
              )}

              {codexTab === 'tactics' && (
                <>
                  <div className="p-2.5 bg-neutral-900/70 border border-emerald-900/40 rounded-lg">
                    <strong className="text-emerald-400 font-pixel text-[11px] block mb-1">TACHOMETER KILL-O'METER &amp; LOCKDOWN</strong>
                    <p className="text-[11px] text-gray-300">Rack up kills quickly to build the tachometer gauge. Reaching 100% unleashes the Arena Lockdown and summons the Sector Boss!</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-emerald-900/40 rounded-lg">
                    <strong className="text-cyan-400 font-pixel text-[11px] block mb-1">DASH MOBILITY &amp; STRAFE-JUMPING</strong>
                    <p className="text-[11px] text-gray-300">Press [SHIFT] or [LT] to execute high-speed dashes. Dashing makes you harder to hit and avoids explosive splashes.</p>
                  </div>
                  <div className="p-2.5 bg-neutral-900/70 border border-emerald-900/40 rounded-lg">
                    <strong className="text-yellow-400 font-pixel text-[11px] block mb-1">SECRET PUSH-WALLS &amp; REWARD CHESTS</strong>
                    <p className="text-[11px] text-gray-300">Approach suspicious misaligned wall panels and press [E] / [A] to reveal secret passages, Soul Spheres, and quad damage boosts.</p>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { playSelect(); setMenuState('main'); }}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              RETURN TO MENU [ESC]
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* OPTIONS / AUDIO / GRAPHICS SETTINGS */}
        {/* ========================================================================= */}
        {menuState === 'options' && (
          <div className="w-full bg-neutral-950/95 border-2 border-neutral-700 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-red-500" />
                <h2 className="text-base sm:text-lg font-pixel font-bold text-red-500">AUDIO &amp; GRAPHICS</h2>
              </div>
              <span className="text-xs font-mono-tech text-neutral-400">SETTINGS</span>
            </div>

            <div className="space-y-3 mb-4 font-mono-tech text-xs">
              {/* Sound FX Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-gray-300 text-xs">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Sound FX Volume:
                  </span>
                  <span className="text-amber-400 font-bold text-xs">{Math.round(settings.soundVolume * 100)}%</span>
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
                  <span className="flex items-center gap-1.5 text-gray-300 text-xs">
                    <Volume2 className="w-3.5 h-3.5 text-red-400" /> Dynamic Music Volume:
                  </span>
                  <span className="text-red-400 font-bold text-xs">{Math.round(settings.musicVolume * 100)}%</span>
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
                  <span className="flex items-center gap-1.5 text-gray-300 text-xs">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" /> Mouse Look Sensitivity:
                  </span>
                  <span className="text-cyan-400 font-bold text-xs">{(settings.mouseSensitivity * 1000).toFixed(1)}</span>
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
                <label className="text-gray-300 text-xs block mb-1">Raycaster Resolution Scale:</label>
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
                      className={`py-1 px-2 rounded-lg text-xs font-mono-tech border cursor-pointer ${
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
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              SAVE &amp; RETURN TO MENU [ESC]
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* GAMEPAD & CONTROLLER STATE */}
        {/* ========================================================================= */}
        {menuState === 'gamepad' && (
          <div className="w-full bg-neutral-950/95 border-2 border-emerald-700 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base sm:text-lg font-pixel font-bold text-emerald-400">GAMEPAD CONFIGURATION</h2>
              </div>
              <span className="text-[10px] font-mono-tech text-emerald-300">CONTROLLER</span>
            </div>

            <div className="space-y-3 mb-4 font-mono-tech text-xs">
              {/* Gamepad Connection Status */}
              <div className={`p-2.5 rounded-lg border flex items-center justify-between ${
                gamepadInfo.connected
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
              }`}>
                <div className="flex items-center gap-2">
                  <Gamepad2 className={`w-4 h-4 ${gamepadInfo.connected ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
                  <div>
                    <div className="font-pixel text-[10px] uppercase font-bold">
                      {gamepadInfo.connected ? 'CONTROLLER CONNECTED' : 'NO CONTROLLER DETECTED'}
                    </div>
                    <div className="text-[10px] text-gray-300 font-sans truncate max-w-[240px]">
                      {gamepadInfo.connected ? gamepadInfo.name : 'Plug in a controller and press any button'}
                    </div>
                  </div>
                </div>
                {gamepadInfo.connected && (
                  <button
                    onClick={handleTestVibration}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-black font-pixel text-[9px] font-bold rounded cursor-pointer transition-colors shadow flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{testRumbleSuccess ? 'RUMBLE OK!' : 'TEST RUMBLE'}</span>
                  </button>
                )}
              </div>

              {/* Gamepad Configuration Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-900/60 border border-neutral-800 rounded-lg p-2.5">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 font-bold text-[10px]">Stick Sensitivity:</span>
                    <span className="text-emerald-400 font-bold font-pixel text-[10px]">{((settings.gamepadSensitivity || 2.2)).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.2"
                    value={settings.gamepadSensitivity || 2.2}
                    onChange={(e) => onUpdateSettings({ gamepadSensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-400 bg-neutral-800 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 font-bold text-[10px]">Stick Deadzone:</span>
                    <span className="text-emerald-400 font-bold font-pixel text-[10px]">{Math.round((settings.gamepadDeadzone ?? 0.15) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.35"
                    step="0.01"
                    value={settings.gamepadDeadzone ?? 0.15}
                    onChange={(e) => onUpdateSettings({ gamepadDeadzone: parseFloat(e.target.value) })}
                    className="w-full accent-emerald-400 bg-neutral-800 cursor-pointer"
                  />
                </div>

                <label className="flex items-center justify-between p-1.5 bg-neutral-950 border border-neutral-800 rounded cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <span className="text-gray-300 text-[10px]">Invert Pitch (Y-Axis)</span>
                  <input
                    type="checkbox"
                    checked={settings.gamepadInvertY || false}
                    onChange={(e) => onUpdateSettings({ gamepadInvertY: e.target.checked })}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-1.5 bg-neutral-950 border border-neutral-800 rounded cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <span className="text-gray-300 text-[10px]">Haptic Vibration</span>
                  <input
                    type="checkbox"
                    checked={settings.gamepadVibration ?? true}
                    onChange={(e) => onUpdateSettings({ gamepadVibration: e.target.checked })}
                    className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Controller Button Scheme */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-2.5">
                <div className="text-[10px] font-pixel text-emerald-400 font-bold mb-1 uppercase tracking-wider">
                  CONTROLLER BUTTON MAP
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                  <div><strong className="text-amber-400">Left Stick (L3):</strong> Move (Dash)</div>
                  <div><strong className="text-amber-400">Right Stick (R3):</strong> Look (Melee)</div>
                  <div><strong className="text-red-400">RT (R2):</strong> Fire Weapon</div>
                  <div><strong className="text-cyan-400">LT (L2) / B:</strong> Dash / Slide</div>
                  <div><strong className="text-purple-400">RB / LB:</strong> Next / Prev Weapon</div>
                  <div><strong className="text-emerald-400">A (Cross):</strong> Interact / Select</div>
                  <div><strong className="text-blue-400">X (Square):</strong> Reload Weapon</div>
                  <div><strong className="text-yellow-400">Y (Triangle):</strong> Glory Kill</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                playSelect();
                setMenuState('main');
              }}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              SAVE &amp; RETURN TO MENU [ESC]
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* KEY BINDINGS STATE */}
        {/* ========================================================================= */}
        {menuState === 'bindings' && (
          <div className="w-full bg-neutral-950/95 border-2 border-cyan-800/80 rounded-xl p-4 sm:p-5 shadow-2xl backdrop-blur animate-fade-in text-left">
            <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base sm:text-lg font-pixel font-bold text-cyan-400">KEY BINDINGS</h2>
              </div>
              <button
                onClick={resetDefaultKeyBindings}
                className="text-[11px] font-mono-tech text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> RESET DEFAULTS
              </button>
            </div>

            {activeRebindAction && (
              <div className="mb-3 p-2.5 bg-cyan-950/90 border border-cyan-400 rounded-lg text-center animate-pulse">
                <span className="font-pixel text-[11px] text-cyan-200">
                  PRESS ANY KEY TO REBIND: <strong className="text-amber-300">{activeRebindAction.toUpperCase()}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4 font-mono-tech text-xs max-h-60 overflow-y-auto pr-1">
              {[
                { key: 'moveForward' as keyof KeyBindings, label: 'Move Forward' },
                { key: 'moveBackward' as keyof KeyBindings, label: 'Move Backward' },
                { key: 'strafeLeft' as keyof KeyBindings, label: 'Strafe Left' },
                { key: 'strafeRight' as keyof KeyBindings, label: 'Strafe Right' },
                { key: 'dash' as keyof KeyBindings, label: 'Dash / Slide' },
                { key: 'interact' as keyof KeyBindings, label: 'Interact / Secrets' },
                { key: 'gloryKill' as keyof KeyBindings, label: 'Glory Kill / Melee' },
                { key: 'reload' as keyof KeyBindings, label: 'Reload Weapon' },
                { key: 'weapon1' as keyof KeyBindings, label: 'Weapon 1 (Fist)' },
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
                  <span className="font-bold px-1.5 py-0.5 bg-neutral-950 border border-neutral-700 rounded text-amber-400 text-[10px]">
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
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-200 font-pixel text-xs rounded-lg border border-neutral-700 transition-colors cursor-pointer"
            >
              SAVE &amp; RETURN TO MENU [ESC]
            </button>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-3 text-[9px] font-mono-tech text-neutral-500">
          KILL-O-METER ENGINE v4.02 • HIGH-PERFORMANCE RAYCASTER • GAMEPAD &amp; CONTROLLER READY
        </div>
      </div>
    )}
  </div>
);
};
