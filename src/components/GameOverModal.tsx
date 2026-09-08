import React from 'react';
import { GameStats } from '../types';
import { Skull, RotateCcw, Flame, Crosshair, Trophy, Home, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart, onMainMenu }) => {
  const accuracy = stats.shotsFired > 0 ? Math.round((stats.shotsHit / stats.shotsFired) * 100) : 0;
  const minutes = Math.floor(stats.timeElapsed / 60);
  const seconds = Math.floor(stats.timeElapsed % 60);
  const isWardenEnd = !!stats.isWardenMutationEnd;

  return (
    <div id="game-over-modal" className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className={`max-w-md w-full bg-neutral-950 border-4 ${isWardenEnd ? 'border-purple-600 shadow-[0_0_40px_rgba(168,85,247,0.8)]' : 'border-red-700 shadow-2xl'} rounded-lg p-6 text-center relative overflow-hidden`}>
        {/* Siren Background Glow */}
        <div className={`absolute inset-0 ${isWardenEnd ? 'bg-purple-950/40' : 'bg-red-950/30'} animate-pulse pointer-events-none`} />

        <div className="relative z-10">
          <div className={`inline-flex p-3 ${isWardenEnd ? 'bg-purple-900/40 border-purple-500 shadow-[0_0_25px_#a855f7]' : 'bg-red-900/40 border-red-600 shadow-[0_0_20px_#dc2626]'} border-2 rounded-full mb-3`}>
            <Skull className={`w-10 h-10 ${isWardenEnd ? 'text-purple-400' : 'text-red-500'} animate-bounce`} />
          </div>

          <h2 className={`text-xl sm:text-2xl font-pixel font-bold ${isWardenEnd ? 'text-purple-300' : 'text-red-500'} mb-1 tracking-wider`}>
            {isWardenEnd ? 'YOU ARE NOW THE WARDEN. HAHHAAHA.' : 'YOU DIED'}
          </h2>
          <p className={`text-xs sm:text-sm font-mono-tech ${isWardenEnd ? 'text-purple-400' : 'text-neutral-400'} mb-6 uppercase tracking-widest font-bold`}>
            {isWardenEnd ? 'NONE SHALL ESCAPE.' : 'THE DEMONS FEASTED ON YOUR FLESH'}
          </p>

          {/* Stats Breakdown */}
          <div className={`bg-neutral-900/90 border ${isWardenEnd ? 'border-purple-900/60' : 'border-red-900/50'} rounded-md p-4 mb-6 space-y-2 text-left font-mono-tech text-sm`}>
            <div className={`flex justify-between items-center text-gray-300 pb-2 border-b ${isWardenEnd ? 'border-purple-900/40' : 'border-red-900/40'}`}>
              <span className="flex items-center gap-1.5 font-pixel text-xs text-amber-400"><Trophy className="w-4 h-4 text-amber-400" /> FINAL COMBAT SCORE:</span>
              <span className="font-pixel text-amber-300 font-extrabold text-base">{stats.score.toLocaleString()} PTS</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-red-400" /> TOTAL KILLS:</span>
              <span className="font-bold text-amber-400 text-base">{stats.kills}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Skull className="w-4 h-4 text-red-500" /> GIBS CREATED:</span>
              <span className="font-bold text-red-400 text-base">{stats.gibs}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-cyan-400" /> ACCURACY:</span>
              <span className="font-bold text-cyan-400">{accuracy}%</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-yellow-400" /> HIGHEST STREAK:</span>
              <span className="font-bold text-yellow-300">{stats.maxCombo}x</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> SECRETS FOUND:</span>
              <span className="font-bold text-amber-300">{stats.secretsFound} / {stats.totalSecrets || 4}</span>
            </div>
            <div className="flex justify-between items-center text-gray-300">
              <span>TIME SURVIVED:</span>
              <span className="font-bold text-gray-200">{minutes}m {seconds}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              id="restart-btn-gameover"
              onClick={onRestart}
              className={`py-3.5 px-4 ${isWardenEnd ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_20px_#a855f7]' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_#dc2626]'} text-black font-pixel font-bold text-xs sm:text-sm rounded transition-all flex items-center justify-center gap-2 cursor-pointer`}
            >
              <RotateCcw className="w-4 h-4" />
              RESTART
            </button>
            <button
              id="main-menu-btn-gameover"
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
