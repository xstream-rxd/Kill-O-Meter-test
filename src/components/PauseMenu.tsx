import React, { useState } from 'react';
import { GameSettings } from '../types';
import { Settings, Play, RotateCcw, Volume2, Crosshair, Home } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'audio' | 'controls'>('audio');

  React.useEffect(() => {
    const mountTime = performance.now();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (performance.now() - mountTime < 150) {
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
      <div className="max-w-lg w-full bg-neutral-950 border-2 border-neutral-700 rounded-lg p-6 shadow-2xl relative text-gray-200">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-pixel font-bold text-red-500">PAUSED / SETTINGS</h2>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono-tech text-neutral-400">
            <span className="text-amber-400 font-bold">WAVE {wave}</span>
            <span>•</span>
            <span className="text-cyan-400 font-bold">SECRETS: {secretsFound}/{totalSecrets}</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 mb-4 font-pixel text-xs">
          <button
            onClick={() => setActiveTab('audio')}
            className={`py-2 px-3 rounded border cursor-pointer transition-colors ${
              activeTab === 'audio'
                ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            AUDIO & SENSITIVITY
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={`py-2 px-3 rounded border cursor-pointer transition-colors ${
              activeTab === 'controls'
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            CONTROLS & KEYS
          </button>
        </div>

        {/* Settings Sliders */}
        {activeTab === 'audio' ? (
          <div className="space-y-4 mb-6 font-mono-tech text-sm">
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
        ) : (
          /* Controls Reference */
          <div className="bg-neutral-900 border border-neutral-800 rounded p-3 mb-6 font-mono-tech text-xs space-y-1.5 text-neutral-300 max-h-48 overflow-y-auto">
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

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            id="resume-btn"
            onClick={onResume}
            className="py-3 px-3 bg-cyan-600 hover:bg-cyan-500 text-black font-pixel text-xs font-bold rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_#06b6d4]"
          >
            <Play className="w-4 h-4" /> RESUME
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
