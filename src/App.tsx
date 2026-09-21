import React, { useState, useRef, useEffect } from 'react';
import { GameEngine } from './engine/gameEngine';
import { GameSettings, Difficulty } from './types';
import { StartScreen } from './components/StartScreen';
import { GameCanvas } from './components/GameCanvas';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { soundSynth } from './engine/soundSynth';

export default function App() {
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');

  const [settings, setSettings] = useState<GameSettings>({
    mouseSensitivity: 0.0025,
    gamepadSensitivity: 2.2,
    gamepadDeadzone: 0.15,
    gamepadInvertY: false,
    gamepadVibration: true,
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
  const [, setTick] = useState(0);

  // Sync settings to engine
  useEffect(() => {
    engine.setDifficulty(settings.difficulty || 'normal');
    engine.setMouseSensitivity(settings.mouseSensitivity);
  }, [settings.difficulty, settings.mouseSensitivity, engine]);

  // Force re-render for modal state updates (game over, victory, pause) only when actively playing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 150);
    return () => clearInterval(interval);
  }, [gameState]);

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
        soundSynth.setVolumes(updated.soundVolume, updated.musicVolume);
      }
      return updated;
    });
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
      {/* Main Screen: Start Menu OR Game Arena */}
      {gameState === 'menu' ? (
        <StartScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onStartGame={handleStartGame}
        />
      ) : (
        <main className="relative flex-1 w-full h-full overflow-hidden">
          <GameCanvas
            engine={engine}
            settings={settings}
            onTogglePause={handleTogglePause}
            onToggleMinimap={handleToggleMinimap}
          />
        </main>
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
