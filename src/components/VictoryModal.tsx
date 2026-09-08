import React from 'react';
import { GameStats } from '../types';
import { Trophy, RotateCcw, Flame, Skull, Crosshair, Sparkles, Home } from 'lucide-react';

interface VictoryModalProps {
  stats: GameStats;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ stats, onRestart, onMainMenu }) => {
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = Math.floor(stats.timeElapsed % 60);

  return (
    <div id="victory-modal" className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full bg-neutral-950 border-4 border-amber-500 rounded-lg p-6 shadow-2xl text-center relative overflow-hidden">
        {/* Golden Triumph Glow */}
        <div className="absolute inset-0 bg-amber-500/10 animate-pulse pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex p-3 bg-amber-500/20 border-2 border-amber-400 rounded-full mb-3 shadow-[0_0_25px_#f59e0b]">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-pixel font-bold text-amber-400 mb-1 tracking-wider">
            CAMPAIGN CONQUERED!
          </h2>
          <p className="text-xs sm:text-sm font-mono-tech text-cyan-300 mb-6 uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            ALL 4 STAGES CLEARED &bull; ULTRA BOSS OBLITERATED
            <Sparkles className="w-4 h-4 text-amber-400" />
          </p>

          {/* Stats Breakdown */}
          <div className="bg-neutral-900/90 border border-amber-500/40 rounded-md p-4 mb-6 space-y-2 text-left font-mono-tech text-sm">
            <div className="flex justify-between items-center text-gray-300 pb-2 border-b border-amber-500/30">
              <span className="flex items-center gap-1.5 font-pixel text-xs text-amber-400"><Trophy className="w-4 h-4 text-amber-400" /> FINAL CHAMPION SCORE:</span>
              <span className="font-pixel text-amber-300 font-extrabold text-lg">{stats.score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-red-400" /> TOTAL DEMONS PURGED:</span>
              <span className="font-bold text-amber-400 text-base">{stats.kills}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Skull className="w-4 h-4 text-red-500" /> GIB MASSACRES:</span>
              <span className="font-bold text-red-400 text-base">{stats.gibs}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-cyan-400" /> ACCURACY:</span>
              <span className="font-bold text-cyan-400">{accuracy}%</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-yellow-400" /> MAX ADRENALINE STREAK:</span>
              <span className="font-bold text-yellow-300">{stats.maxCombo}x</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> SECRETS DISCOVERED:</span>
              <span className="font-bold text-amber-300">{stats.secretsFound} / {stats.totalSecrets || 4}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span>CLEAR TIME:</span>
              <span className="font-bold text-emerald-400">{minutes}m {seconds}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="restart-btn-victory"
              onClick={onRestart}
              className="py-3.5 px-4 bg-amber-400 hover:bg-amber-300 text-black font-pixel font-bold text-xs sm:text-sm rounded transition-all shadow-[0_0_20px_#f59e0b] flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
            <button
              id="main-menu-btn-victory"
              onClick={onMainMenu}
              className="py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-gray-200 border border-neutral-700 font-pixel font-bold text-xs sm:text-sm rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              MAIN MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
