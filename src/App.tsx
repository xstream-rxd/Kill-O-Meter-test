import React, { useState, useRef, useEffect } from 'react';
import { GameEngine } from './engine/gameEngine';
import { GameSettings, Difficulty } from './types';
import { StartScreen } from './components/StartScreen';
import { RetroIntroSequence } from './components/RetroIntroSequence';
import { GameCanvas } from './components/GameCanvas';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { soundSynth } from './engine/soundSynth';
import { Volume2, VolumeX, Maximize2, Settings, Flame, HelpCircle, Swords, Home, Film } from 'lucide-react';

export default function App() {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  const [gameState, setGameState] = useState<'intro' | 'menu' | 'playing'>('intro');

  const [settings, setSettings] = useState<GameSettings>({
    mouseSensitivity: 0.0025,
    soundVolume: 0.8,
    musicVolume: 0.35,
    renderResolution: 1,
    bloodDensity: 1,
    showMinimap: true,
    fov: 1.15,
    difficulty: 'normal',
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

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [, setTick] = useState(0);

  // Sync settings to engine
  useEffect(() => {
    engine.setDifficulty(settings.difficulty || 'normal');
    engine.setMouseSensitivity(settings.mouseSensitivity);
  }, [settings.difficulty, settings.mouseSensitivity, engine]);

  // Force re-render for modal state updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.mouseSensitivity !== undefined) {
        engine.setMouseSensitivity(updated.mouseSensitivity);
      }
      if (newSettings.difficulty !== undefined) {
        engine.setDifficulty(newSettings.difficulty);
      }
      if (newSettings.soundVolume !== undefined || newSettings.musicVolume !== undefined) {
        soundSynth.setVolumes(isMuted ? 0 : updated.soundVolume, isMuted ? 0 : updated.musicVolume);
      }
      return updated;
    });
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    soundSynth.setVolumes(nextMute ? 0 : settings.soundVolume, nextMute ? 0 : settings.musicVolume);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleTogglePause = () => {
    const nextPaused = !engine.isPaused;
    engine.isPaused = nextPaused;
    setIsPaused(nextPaused);

    if (nextPaused) {
      soundSynth.pauseMusic();
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      soundSynth.resumeMusic();
    }
  };

  const handleStartGame = (diff: Difficulty) => {
    handleUpdateSettings({ difficulty: diff });
    engine.setDifficulty(diff);
    engine.restart();
    soundSynth.init();
    soundSynth.resume();
    soundSynth.startMusic();
    setGameState('playing');
    setIsPaused(false);
  };

  const handleRestart = () => {
    engine.restart();
    engine.isPaused = false;
    setIsPaused(false);
    soundSynth.resumeMusic();
  };

  const handleReturnToMenu = () => {
    engine.isPaused = true;
    setIsPaused(false);
    soundSynth.stopMusic();
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    setGameState('menu');
  };

  const handleToggleMinimap = () => {
    setSettings(prev => ({ ...prev, showMinimap: !prev.showMinimap }));
  };

  return (
    <div className="relative w-screen h-screen bg-black text-gray-100 flex flex-col overflow-hidden font-mono-tech select-none">
      {/* Top Header Bar */}
      <header className="h-10 bg-neutral-950 border-b border-neutral-800 px-3 sm:px-6 flex items-center justify-between text-xs z-30">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="font-pixel text-[11px] sm:text-xs text-red-500 font-bold tracking-widest">
            KILL-O-METER <span className="text-[9px] text-neutral-500 font-mono-tech">v3.0</span>
          </span>
          <span className="hidden md:inline-block text-[10px] bg-red-950/80 border border-red-800/60 px-1.5 py-0.5 rounded text-red-300">
            2.5D RETRO RAYCASTER
          </span>
          {gameState === 'playing' && (
            <span className="text-[10px] font-mono-tech text-amber-400 font-bold px-2 py-0.5 bg-neutral-900 border border-neutral-700 rounded ml-2">
              DIFF: {(settings.difficulty || 'normal').toUpperCase()}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setGameState('intro')}
            className="flex items-center gap-1 text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer px-1.5 py-1"
            title="Watch Intro & Field Briefing"
          >
            <Film className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">BRIEFING</span>
          </button>

          {gameState === 'playing' && (
            <button
              onClick={handleReturnToMenu}
              className="flex items-center gap-1 text-gray-400 hover:text-amber-400 transition-colors cursor-pointer px-1.5 py-1"
              title="Return to Main Menu"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">MENU</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1 text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer px-1.5 py-1"
            title="Help / Controls"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">CONTROLS</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="text-gray-400 hover:text-amber-400 transition-colors cursor-pointer p-1"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {gameState === 'playing' && (
            <button
              onClick={handleTogglePause}
              className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors cursor-pointer p-1"
              title="Settings & Pause"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleToggleFullscreen}
            className="text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer p-1"
            title="Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Screen: Retro Intro OR Start Menu OR Game Arena */}
      {gameState === 'intro' ? (
        <RetroIntroSequence
          onComplete={() => setGameState('menu')}
          onStartDirectGame={() => handleStartGame('normal')}
        />
      ) : gameState === 'menu' ? (
        <StartScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartGame={handleStartGame}
          onOpenIntro={() => setGameState('intro')}
        />
      ) : (
        <main className="relative flex-1 w-full h-[calc(100vh-2.5rem)] overflow-hidden">
          <GameCanvas
            engine={engine}
            settings={settings}
            onTogglePause={handleTogglePause}
            onToggleMinimap={handleToggleMinimap}
          />
        </main>
      )}

      {/* Controls / Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="max-w-md w-full bg-neutral-950 border-2 border-cyan-600 rounded-lg p-6 shadow-2xl text-gray-200">
            <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-4">
              <Swords className="w-6 h-6 text-cyan-400" />
              <h3 className="text-base sm:text-lg font-pixel text-cyan-400 font-bold">COMBAT FIELD GUIDE</h3>
            </div>

            <div className="space-y-3 text-xs sm:text-sm font-mono-tech mb-6">
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-gray-400">WASD / Arrow Keys</span>
                <span className="font-bold text-gray-100">Walk & Strafe</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-gray-400">Mouse Movement</span>
                <span className="font-bold text-gray-100">Look & Turn</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-gray-400">Left Click</span>
                <span className="font-bold text-gray-100">Fire Weapon</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-cyan-400 font-bold">Shift / Spacebar</span>
                <span className="font-bold text-cyan-300">Dash / Slide (i-frames!)</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-yellow-400 font-bold">Key E / F / Touch</span>
                <span className="font-bold text-yellow-300">Investigate / Secret Doors</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-gray-400">Keys 1-5 / Wheel</span>
                <span className="font-bold text-gray-100">Switch Weapon</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-cyan-400 font-bold">M / Click Radar</span>
                <span className="font-bold text-gray-100">Toggle HUD Radar</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-amber-400 font-bold">Tab Key</span>
                <span className="font-bold text-amber-300">Tactical Automap Overlay</span>
              </div>
            </div>

            <div className="bg-red-950/40 border border-red-900/60 rounded p-3 mb-6 text-xs text-neutral-300">
              <strong className="text-red-400">Tactical Objective:</strong> Gear up in the safe bunker zone, cross the airlock to trigger demonic assault waves, uncover hidden secret rooms, and slay the Cyber-Titan!
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-pixel text-xs font-bold rounded transition-colors shadow-[0_0_15px_#06b6d4] cursor-pointer"
            >
              GOT IT, LOCK & LOAD
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {gameState === 'playing' && isPaused && (
        <PauseMenu
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResume={handleTogglePause}
          onRestart={handleRestart}
          onMainMenu={handleReturnToMenu}
          secretsFound={engine.stats.secretsFound}
          totalSecrets={engine.stats.totalSecrets}
          wave={engine.currentWave}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'playing' && engine.isGameOver && (
        <GameOverModal
          stats={engine.stats}
          onRestart={handleRestart}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Victory Modal */}
      {gameState === 'playing' && engine.isVictory && (
        <VictoryModal
          stats={engine.stats}
          onRestart={handleRestart}
          onMainMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}
