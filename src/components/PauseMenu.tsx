import React, { useState, useEffect, useRef } from 'react';
import { GameSettings } from '../types';
import { gamepadManager } from '../engine/gamepadManager';
import { soundSynth } from '../engine/soundSynth';
import { Settings, Play, RotateCcw, Volume2, Crosshair, Home, Gamepad2, Keyboard, Sparkles } from 'lucide-react';

interface PauseMenuProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
  secretsFound?: number;
  totalSecrets?: number;
  wave?: number;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  settings,
  onUpdateSettings,
  onResume,
  onRestart,
  onMainMenu,
  secretsFound = 0,
  totalSecrets = 4,
  wave = 1,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'controls' | 'gamepad'>('gamepad');
  const [gamepadInfo, setGamepadInfo] = useState<{ connected: boolean; name: string }>({ connected: false, name: 'No Controller Detected' });
  const [testRumbleSuccess, setTestRumbleSuccess] = useState(false);
  const mountTimeRef = useRef(performance.now());

  // Keyboard navigation & quick resume
  useEffect(() => {
    mountTimeRef.current = performance.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (performance.now() - mountTimeRef.current < 150) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onResume();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onResume]);

  // Controller Navigation Polling
  useEffect(() => {
    let animFrame: number;
    const pollLoop = () => {
      const pad = gamepadManager.poll();
      setGamepadInfo({
        connected: pad.connected,
        name: pad.name,
      });

      if (performance.now() - mountTimeRef.current > 200) {
        if (pad.justPause || pad.menuCancel) {
          soundSynth.playMenuSelect();
          onResume();
          return;
        }
        if (pad.justNextWeapon || pad.menuRight) {
          setActiveTab((prev) => (prev === 'audio' ? 'controls' : prev === 'controls' ? 'gamepad' : 'audio'));
          soundSynth.playMenuMove();
        } else if (pad.justPrevWeapon || pad.menuLeft) {
          setActiveTab((prev) => (prev === 'gamepad' ? 'controls' : prev === 'controls' ? 'audio' : 'gamepad'));
          soundSynth.playMenuMove();
        }
      }

      animFrame = requestAnimationFrame(pollLoop);
    };

    animFrame = requestAnimationFrame(pollLoop);
    return () => cancelAnimationFrame(animFrame);
  }, [onResume]);

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
    <div id="pause-menu-modal" className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="max-w-xl w-full bg-neutral-950 border-2 border-neutral-700 rounded-lg p-6 shadow-2xl relative text-gray-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-pixel font-bold text-red-500">PAUSED // CONFIG</h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-tech text-neutral-400">
            <span className="text-amber-400 font-bold">WAVE {wave}</span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">SECRETS: {secretsFound}/{totalSecrets}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-2 mb-4 font-pixel text-[11px]">
          <button
            id="tab-gamepad-btn"
            onClick={() => {
              setActiveTab('gamepad');
              soundSynth.playMenuMove();
            }}
            className={`py-2 px-2 rounded border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'gamepad'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>GAMEPAD</span>
          </button>
          <button
            id="tab-audio-btn"
            onClick={() => {
              setActiveTab('audio');
              soundSynth.playMenuMove();
            }}
            className={`py-2 px-2 rounded border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'audio'
                ? 'bg-red-950/90 border-red-500 text-red-300 font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>AUDIO & SENS</span>
          </button>
          <button
            id="tab-controls-btn"
            onClick={() => {
              setActiveTab('controls');
              soundSynth.playMenuMove();
            }}
            className={`py-2 px-2 rounded border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'controls'
                ? 'bg-cyan-950/90 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>KEYBOARD</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1 mb-4">
          {activeTab === 'gamepad' && (
            <div className="space-y-4 font-mono-tech text-xs">
              {/* Controller Status Banner */}
              <div className={`p-3 rounded border flex items-center justify-between ${
                gamepadInfo.connected
                  ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
              }`}>
                <div className="flex items-center gap-2">
                  <Gamepad2 className={`w-5 h-5 ${gamepadInfo.connected ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
                  <div>
                    <div className="font-pixel text-[10px] uppercase font-bold">
                      {gamepadInfo.connected ? 'CONTROLLER DETECTED' : 'NO CONTROLLER DETECTED'}
                    </div>
                    <div className="text-[11px] text-gray-300 font-sans truncate max-w-[280px]">
                      {gamepadInfo.name}
                    </div>
                  </div>
                </div>
                {gamepadInfo.connected && (
                  <button
                    onClick={handleTestVibration}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-black font-pixel text-[10px] font-bold rounded cursor-pointer transition-colors shadow flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{testRumbleSuccess ? 'RUMBLE OK!' : 'TEST RUMBLE'}</span>
                  </button>
                )}
              </div>

              {/* Gamepad Sliders & Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-900/60 border border-neutral-800 rounded p-3">
                {/* Gamepad Look Sensitivity */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 font-bold">Stick Sensitivity:</span>
                    <span className="text-emerald-400 font-bold font-pixel">{((settings.gamepadSensitivity || 2.2)).toFixed(1)}x</span>
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

                {/* Gamepad Deadzone */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-300 font-bold">Stick Deadzone:</span>
                    <span className="text-emerald-400 font-bold font-pixel">{Math.round((settings.gamepadDeadzone ?? 0.15) * 100)}%</span>
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

                {/* Invert Y-Axis */}
                <label className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 rounded cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <span className="text-gray-300">Invert Look Pitch (Y-Axis)</span>
                  <input
                    type="checkbox"
                    checked={settings.gamepadInvertY || false}
                    onChange={(e) => onUpdateSettings({ gamepadInvertY: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>

                {/* Haptic Vibration */}
                <label className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-800 rounded cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <span className="text-gray-300">Dual-Rumble Vibration</span>
                  <input
                    type="checkbox"
                    checked={settings.gamepadVibration ?? true}
                    onChange={(e) => onUpdateSettings({ gamepadVibration: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Gamepad Control Layout Reference Table */}
              <div className="bg-neutral-900 border border-neutral-800 rounded p-3">
                <div className="text-[10px] font-pixel text-emerald-400 font-bold mb-2 uppercase tracking-wider">
                  CONTROLLER BUTTON SCHEME
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div><strong className="text-amber-400">Left Stick (L3):</strong> Move / Strafe (Dash)</div>
                  <div><strong className="text-amber-400">Right Stick (R3):</strong> Aim / Look (Melee / Glory)</div>
                  <div><strong className="text-red-400">RT (R2):</strong> Fire Weapon (Rapid fire)</div>
                  <div><strong className="text-cyan-400">LT (L2) / B:</strong> Dash / Kinetic Slide</div>
                  <div><strong className="text-purple-400">RB / LB:</strong> Next / Previous Weapon</div>
                  <div><strong className="text-emerald-400">A (Cross):</strong> Interact / Proceed</div>
                  <div><strong className="text-blue-400">X (Square):</strong> Reload Magazine</div>
                  <div><strong className="text-yellow-400">Y (Triangle):</strong> Glory Kill / Melee Punch</div>
                  <div><strong className="text-gray-300">D-Pad:</strong> Quick Weapon Slots (1-5)</div>
                  <div><strong className="text-gray-300">Start / Select:</strong> Pause / Radar Map</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-4 font-mono-tech text-sm">
              {/* Mouse Sensitivity */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <Crosshair className="w-4 h-4 text-cyan-400" /> Mouse Sensitivity:
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

              {/* Sound FX Volume */}
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
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value);
                    onUpdateSettings({ soundVolume: vol });
                  }}
                  className="w-full accent-amber-400 bg-neutral-800 cursor-pointer"
                />
              </div>

              {/* Music Volume */}
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
            </div>
          )}

          {activeTab === 'controls' && (
            /* Keyboard Controls Reference */
            <div className="bg-neutral-900 border border-neutral-800 rounded p-3 font-mono-tech text-xs space-y-1.5 text-neutral-300">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div><strong className="text-amber-400">Forward:</strong> {formatKeyName(settings.keyBindings.moveForward)}</div>
                <div><strong className="text-amber-400">Backward:</strong> {formatKeyName(settings.keyBindings.moveBackward)}</div>
                <div><strong className="text-amber-400">Strafe Left:</strong> {formatKeyName(settings.keyBindings.strafeLeft)}</div>
                <div><strong className="text-amber-400">Strafe Right:</strong> {formatKeyName(settings.keyBindings.strafeRight)}</div>
                <div><strong className="text-cyan-400">Dash / Slide:</strong> {formatKeyName(settings.keyBindings.dash)}</div>
                <div><strong className="text-yellow-400">Interact/Secret:</strong> {formatKeyName(settings.keyBindings.interact)}</div>
                <div><strong className="text-red-400">Glory Kill / Melee:</strong> {formatKeyName(settings.keyBindings.gloryKill || 'KeyF')}</div>
                <div><strong className="text-blue-400">Reload Weapon:</strong> {formatKeyName(settings.keyBindings.reload || 'KeyR')}</div>
                <div><strong className="text-gray-100">Pistol / Shotgun:</strong> 1 / 2</div>
                <div><strong className="text-gray-100">Chaingun/Plasma:</strong> 3 / 4</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800">
          <button
            id="resume-btn"
            onClick={onResume}
            className="py-3 px-3 bg-cyan-600 hover:bg-cyan-500 text-black font-pixel text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_#06b6d4]"
          >
            <Play className="w-4 h-4" /> RESUME [A]
          </button>
          <button
            id="restart-pause-btn"
            onClick={onRestart}
            className="py-3 px-3 bg-neutral-800 hover:bg-red-900/60 text-red-400 border border-red-800/50 font-pixel text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> RESTART
          </button>
          <button
            id="main-menu-pause-btn"
            onClick={onMainMenu}
            className="py-3 px-3 bg-neutral-900 hover:bg-neutral-800 text-gray-200 border border-neutral-700 font-pixel text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" /> MENU
          </button>
        </div>
      </div>
    </div>
  );
};
