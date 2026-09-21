import React from 'react';
import { Player, KillCombo, BossState } from '../types';
import { KillOMeterTachometer } from './KillOMeterTachometer';
import { WeaponPixelIcon } from './WeaponPixelIcon';
import { Shield, Skull, Heart, Lock, Flame, Radio, Target } from 'lucide-react';

interface DoomHudProps {
  player: Player;
  combo: KillCombo;
  killOMeter: number;
  levelKills?: number;
  requiredKills?: number;
  totalLevelEnemies?: number;
  isLockdown?: boolean;
  boss: BossState;
  bossHpPct: number;
  isTakingDamage?: boolean;
  onSwitchWeapon: (slot: number) => void;
  stage?: number;
  totalStages?: number;
  stageName?: string;
}

export const DoomHud: React.FC<DoomHudProps> = ({
  player,
  combo,
  killOMeter,
  levelKills = 0,
  requiredKills,
  totalLevelEnemies = 10,
  isLockdown = false,
  boss,
  bossHpPct,
  isTakingDamage = false,
  onSwitchWeapon,
  stage = 1,
  totalStages = 4,
  stageName = 'SUBTERRANEAN OUTPOST',
}) => {
  const currentWeapon = player.weapons[player.currentWeapon];
  const isMelee = currentWeapon.type === 'fist';
  const isChaingun = currentWeapon.type === 'chaingun';
  const ammoReserve = isMelee ? Infinity : player.ammo[currentWeapon.ammoType];

  const isLowAmmo = !isMelee && (isChaingun ? ammoReserve <= 20 && ammoReserve > 0 : currentWeapon.magazine <= 2 && ammoReserve > 0);
  const isOutAmmo = !isMelee && (isChaingun ? ammoReserve <= 0 : ammoReserve <= 0 && currentWeapon.magazine <= 0);
  const canReload = !isMelee && !isChaingun && currentWeapon.maxMagazine > 0 && currentWeapon.magazine < currentWeapon.maxMagazine && ammoReserve > 0 && !player.reload.isReloading;

  // Dynamic animation conditions
  const isDamageVibrating = isTakingDamage || player.damageFlash > 0.08;
  const isArmorGlowing = (player.armorFlash || 0) > 0.05;

  // Health visual styling
  const getHealthColor = (hp: number) => {
    if (hp > 60) return 'text-emerald-400';
    if (hp > 25) return 'text-amber-400';
    return 'text-red-500 animate-pulse';
  };

  const getHealthBorderColor = (hp: number) => {
    if (isDamageVibrating) {
      return 'border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.75)] bg-red-950/40 animate-hud-vibrate';
    }
    if (hp > 60) return 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    if (hp > 25) return 'border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
    return 'border-red-600 shadow-[0_0_14px_rgba(239,68,68,0.6)] bg-red-950/30 animate-pulse';
  };

  const getArmorBorderColor = (armor: number) => {
    if (isArmorGlowing) {
      return 'border-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.95)] bg-cyan-950/50 animate-armor-glow';
    }
    if (armor > 50) return 'border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.25)]';
    if (armor > 0) return 'border-sky-700/50 shadow-[0_0_6px_rgba(14,165,233,0.15)]';
    return 'border-neutral-800';
  };

  const getArmorColor = (armor: number) => {
    if (isArmorGlowing) return 'text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]';
    if (armor > 50) return 'text-cyan-400';
    if (armor > 0) return 'text-sky-400';
    return 'text-neutral-500';
  };

  const weaponList: {
    slot: number;
    type: 'fist' | 'pistol' | 'shotgun' | 'chaingun' | 'plasma';
    name: string;
    shortName: string;
    ammoType: 'none' | 'bullets' | 'shells' | 'cells' | 'belts';
  }[] = [
    { slot: 1, type: 'fist', name: 'Melee Knuckles', shortName: 'FIST', ammoType: 'none' },
    { slot: 2, type: 'pistol', name: 'Combat Pistol', shortName: 'PSTL', ammoType: 'bullets' },
    { slot: 3, type: 'shotgun', name: 'Combat Shotgun', shortName: 'SHTG', ammoType: 'shells' },
    { slot: 4, type: 'chaingun', name: 'Rotary Chaingun', shortName: 'CHGN', ammoType: 'belts' },
    { slot: 5, type: 'plasma', name: 'Plasma Rifle', shortName: 'PLSM', ammoType: 'cells' },
  ];

  return (
    <div id="doom-hud-root" className="w-full flex flex-col pointer-events-auto select-none font-mono-tech">
      {/* Top Boss Health Bar (during Lockdown) */}
      {boss.active && (
        <div
          id="boss-health-bar"
          className={`w-full max-w-2xl mx-auto mb-1 px-4 py-2 bg-black/95 rounded-md backdrop-blur-md transition-all duration-300 ${
            bossHpPct <= 0.25
              ? 'border-2 border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.8)] animate-pulse'
              : stage === 2
              ? 'border-2 border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.6)]'
              : stage === 3
              ? 'border-2 border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
              : stage === 4
              ? 'border-2 border-purple-500 shadow-[0_0_28px_rgba(168,85,247,0.7)]'
              : 'border-2 border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.6)]'
          }`}
        >
          {/* Top Label & Subtitle Row */}
          <div className="flex justify-between items-center mb-1 text-[11px] font-pixel tracking-wider">
            <div className="flex items-center gap-2">
              <span className={`p-1 rounded ${
                stage === 2 ? 'bg-green-950 text-green-400' :
                stage === 3 ? 'bg-amber-950 text-amber-400' :
                stage === 4 ? 'bg-purple-950 text-purple-300' : 'bg-red-950 text-red-400'
              }`}>
                <Skull className="w-4 h-4 animate-bounce" />
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">
                  {boss.name}
                </span>
                {boss.subtitle && (
                  <span className="text-[8px] font-mono-tech uppercase tracking-wider text-gray-400">
                    {boss.subtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Boss Phase Badge */}
              <span className={`px-2 py-0.5 rounded text-[8px] font-pixel font-bold tracking-widest border ${
                boss.phase === 3
                  ? 'bg-red-950 text-red-300 border-red-600 animate-pulse'
                  : boss.phase === 2
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-neutral-900 text-cyan-300 border-cyan-800'
              }`}>
                {boss.phase === 3 ? '⚡ PHASE III: ENRAGED' : boss.phase === 2 ? '⚡ PHASE II: OVERDRIVE' : 'PHASE I: SIEGE'}
              </span>

              {/* HP Percentage */}
              <span className="font-mono-tech text-red-200 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-700 text-xs shadow-inner">
                {Math.max(0, Math.round(bossHpPct * 100))}%
              </span>
            </div>
          </div>

          {/* Segmented Boss Health Bar with Shield FX */}
          <div className="w-full h-3.5 bg-neutral-950 border border-neutral-800 rounded-sm overflow-hidden relative shadow-inner">
            {/* Segmented tick markers (10 segments) */}
            <div className="absolute inset-0 grid grid-cols-10 pointer-events-none z-20">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border-r border-black/80 h-full" />
              ))}
            </div>

            {/* Health Fill Bar */}
            <div
              className={`h-full transition-all duration-150 relative ${
                boss.shieldActive
                  ? 'bg-cyan-400 shadow-[0_0_15px_#38bdf8]'
                  : stage === 2
                  ? 'bg-gradient-to-r from-green-700 via-emerald-500 to-lime-400 shadow-[0_0_12px_#22c55e]'
                  : stage === 3
                  ? 'bg-gradient-to-r from-red-800 via-orange-600 to-yellow-400 shadow-[0_0_12px_#f97316]'
                  : stage === 4
                  ? 'bg-gradient-to-r from-purple-900 via-violet-600 to-fuchsia-400 shadow-[0_0_15px_#a855f7]'
                  : 'bg-gradient-to-r from-red-800 via-red-600 to-amber-500 shadow-[0_0_12px_#ef4444]'
              }`}
              style={{ width: `${Math.max(0, bossHpPct * 100)}%` }}
            />

            {/* Shield Active Overlay */}
            {boss.shieldActive && (
              <div className="absolute inset-0 flex items-center justify-center text-[8px] font-pixel text-cyan-200 font-bold tracking-widest bg-cyan-950/80 animate-pulse z-30 border border-cyan-400/50">
                <Shield className="w-3 h-3 mr-1 text-cyan-300" />
                CYBER SHIELD ACTIVE
              </div>
            )}
          </div>
        </div>
      )}

      {/* Futuristic Sci-Fi Top Telemetry Bezel: Sector Scanlines, Combo & Global Ammo Reserves */}
      <div id="hud-top-bezel" className="w-full bg-[#08090e] border-t-2 border-cyan-900/60 px-3 py-0.5 flex items-center justify-between text-[8px] sm:text-[9px] font-pixel relative overflow-hidden">
        {/* Holographic grid light beam */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 pointer-events-none" />

        <div className="flex items-center gap-2 truncate z-10">
          <span className="flex items-center gap-1 text-cyan-400 font-bold">
            <Radio className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            SEC {stage}/{totalStages}:
          </span>
          <span className="text-gray-200 font-mono-tech uppercase font-bold tracking-widest truncate">{stageName}</span>
        </div>
        
        {combo.count > 1 ? (
          <div className="flex items-center gap-1.5 bg-red-950/90 border border-amber-500/80 px-2 py-0.5 rounded text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.4)] animate-pulse z-10">
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[7.5px] sm:text-[8px] font-bold tracking-wider">{combo.tierName}</span>
            <span className="font-mono-tech font-bold text-amber-200 text-[9px] sm:text-[10px]">[{combo.multiplier.toFixed(1)}x DMG]</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-neutral-400 font-mono-tech text-[8px] sm:text-[9px] z-10">
            <span className="flex items-center gap-1">
              <span className="text-neutral-500">PST:</span>
              <strong className="text-amber-400 font-bold">{player.ammo.bullets}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-neutral-500">BELT:</span>
              <strong className="text-amber-400 font-bold">{player.ammo.belts}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-neutral-500">SHL:</span>
              <strong className="text-amber-400 font-bold">{player.ammo.shells}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-neutral-500">CEL:</span>
              <strong className="text-cyan-400 font-bold">{player.ammo.cells}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main High-Tech Tactical HUD Console (Streamlined Sci-Fi Dashboard) */}
      <div id="doom-status-bar" className="w-full bg-gradient-to-b from-[#090b12] to-[#040508] border-t-2 border-[#1e293b] text-gray-200 shadow-[0_-6px_20px_rgba(0,0,0,0.95)] relative">
        <div className="max-w-7xl mx-auto px-1.5 sm:px-3 py-1 flex items-center justify-between gap-1 sm:gap-2">
          
          {/* 1. ACTIVE WEAPON & DYNAMIC AMMO MODULE (Left Wing) */}
          <div
            id="hud-ammo-block"
            className={`flex-1 min-w-[130px] max-w-[210px] flex flex-col justify-between bg-[#0a0c14]/95 border-2 rounded-md p-1.5 transition-all relative overflow-hidden ${
              isChaingun && player.chaingunOverheat?.isOverheated
                ? 'border-red-600 bg-red-950/40 shadow-[0_0_16px_rgba(239,68,68,0.7)] animate-pulse'
                : player.reload.isReloading
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_14px_rgba(6,182,212,0.5)]'
                : isOutAmmo
                ? 'border-red-600 bg-red-950/30 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                : isLowAmmo || (isChaingun && (player.chaingunOverheat?.shotsFired || 0) > 35)
                ? 'border-amber-500 bg-amber-950/30 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'border-neutral-800 hover:border-neutral-700'
            }`}
          >
            {/* Corner Header: Weapon Type & Mode Status */}
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-pixel text-neutral-400 leading-none mb-1">
              <span className="truncate flex items-center gap-1 text-cyan-400 font-bold">
                <Target className="w-2.5 h-2.5 text-cyan-400" />
                {currentWeapon.name}
              </span>
              <span className={`font-mono-tech uppercase font-bold text-[7.5px] sm:text-[8px] px-1.5 py-0.5 rounded border leading-none ${
                isChaingun && player.chaingunOverheat?.isOverheated
                  ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                  : isChaingun && (player.chaingunOverheat?.shotsFired || 0) > 35
                  ? 'bg-amber-950 border-amber-500 text-amber-300'
                  : player.reload.isReloading
                  ? 'bg-cyan-900/90 border-cyan-400 text-cyan-200 animate-pulse'
                  : isOutAmmo
                  ? 'bg-red-950/90 border-red-600 text-red-400 animate-pulse'
                  : isLowAmmo
                  ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400'
              }`}>
                {isChaingun && player.chaingunOverheat?.isOverheated
                  ? `COOLING [${player.chaingunOverheat.cooldownTimer.toFixed(1)}s]`
                  : isChaingun && (player.chaingunOverheat?.shotsFired || 0) > 35
                  ? `HOT [${player.chaingunOverheat?.shotsFired || 0}/50]`
                  : player.reload.isReloading
                  ? player.currentWeapon === 'plasma'
                    ? 'CHARGING CORE'
                    : 'RELOADING'
                  : isMelee
                  ? 'MELEE'
                  : isChaingun
                  ? 'DIRECT BELT'
                  : isOutAmmo
                  ? 'EMPTY'
                  : 'LOADED'}
              </span>
            </div>

            {/* Main Row: Pixel-Art Weapon Icon + Dynamic Ammo Counter */}
            <div className="flex items-center justify-between gap-2 my-auto py-0.5">
              {/* Pixel-Art Weapon Icon with Backlit Frame */}
              <div className="flex flex-col items-center justify-center p-1 bg-black/70 border border-neutral-800 rounded shadow-inner">
                <WeaponPixelIcon
                  type={player.currentWeapon}
                  active={true}
                  size="md"
                  className={
                    isChaingun && player.chaingunOverheat?.isOverheated
                      ? 'filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                      : 'filter drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                  }
                />
                <span className="text-[6.5px] font-pixel text-neutral-400 tracking-tighter mt-0.5 uppercase">
                  SLOT {currentWeapon.slot}
                </span>
              </div>

              {/* Dynamic Magazine Status & Total Reserve Ammunition */}
              <div className="flex-1 flex flex-col items-end leading-none">
                {isMelee ? (
                  <div className="text-xl sm:text-2xl font-mono-tech font-black tracking-wider leading-none text-emerald-400">
                    ∞
                  </div>
                ) : isChaingun ? (
                  <div className="flex items-baseline gap-1 text-xl sm:text-2xl font-mono-tech font-black tracking-wider leading-none text-amber-300">
                    <span>{player.ammo.belts}</span>
                    <span className="text-neutral-500 text-[9px] font-mono-tech font-normal">BELT</span>
                  </div>
                ) : (
                  <div className={`flex items-baseline gap-1 text-xl sm:text-2xl font-mono-tech font-black tracking-wider leading-none ${
                    player.reload.isReloading
                      ? 'text-cyan-400 animate-pulse'
                      : currentWeapon.magazine === 0
                      ? 'text-red-500 animate-pulse'
                      : 'text-amber-300'
                  }`}>
                    <span>{currentWeapon.magazine}</span>
                    <span className="text-neutral-500 text-[11px] sm:text-xs font-normal">/ {currentWeapon.maxMagazine}</span>
                  </div>
                )}
                
                {/* Total Reserve Ammunition & Heat / Cooldown Info */}
                <div className="text-[7.5px] sm:text-[8.5px] font-mono-tech text-neutral-400 font-bold mt-1 flex items-center gap-1.5 leading-none">
                  {isChaingun ? (
                    player.chaingunOverheat?.isOverheated ? (
                      <span className="text-red-400 font-bold animate-pulse">OVERHEAT: {player.chaingunOverheat.cooldownTimer.toFixed(1)}s</span>
                    ) : (
                      <span className="text-neutral-400">
                        HEAT: <strong className={(player.chaingunOverheat?.shotsFired || 0) > 35 ? 'text-amber-400' : 'text-cyan-400'}>{player.chaingunOverheat?.shotsFired || 0}/50</strong>
                      </span>
                    )
                  ) : (
                    <span>RES: <strong className="text-amber-400">{isMelee ? '∞' : ammoReserve}</strong></span>
                  )}
                  {canReload ? (
                    <span className="text-cyan-400 font-pixel text-[6.5px] sm:text-[7px] animate-pulse bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800">[R] RELOAD</span>
                  ) : isChaingun ? (
                    <span className={`font-pixel text-[6.5px] ${player.chaingunOverheat?.isOverheated ? 'text-red-400 animate-pulse' : 'text-emerald-400/90'}`}>
                      {player.chaingunOverheat?.isOverheated ? '3.0S CD' : 'AUTO-FEED'}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Dynamic Reload / Overheat / Magazine Gauge Bar */}
            <div className="w-full h-1.5 bg-neutral-950 border border-neutral-800 rounded-xs overflow-hidden relative mt-1">
              {isChaingun && player.chaingunOverheat?.isOverheated ? (
                <div
                  className="h-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 transition-all duration-75 shadow-[0_0_10px_#ef4444] relative animate-pulse"
                  style={{ width: `${Math.min(100, Math.max(0, (player.chaingunOverheat.cooldownTimer / player.chaingunOverheat.maxCooldown) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/40 animate-laser-sweep" />
                </div>
              ) : isChaingun ? (
                <div
                  className={`h-full transition-all duration-75 ${
                    (player.chaingunOverheat?.shotsFired || 0) > 40
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_0_8px_#ef4444]'
                      : (player.chaingunOverheat?.shotsFired || 0) > 25
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                      : 'bg-gradient-to-r from-cyan-500 to-cyan-300'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, ((player.chaingunOverheat?.shotsFired || 0) / 50) * 100))}%` }}
                />
              ) : player.reload.isReloading ? (
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-75 shadow-[0_0_8px_#38bdf8] relative"
                  style={{ width: `${Math.min(100, Math.max(0, (1 - player.reload.timer / player.reload.maxTimer) * 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-laser-sweep" />
                </div>
              ) : (
                <div
                  className={`h-full transition-all duration-100 ${
                    isOutAmmo
                      ? 'bg-red-600'
                      : isLowAmmo
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-amber-600 to-amber-400'
                  }`}
                  style={{
                    width: isMelee
                      ? '100%'
                      : `${Math.min(100, Math.max(0, (currentWeapon.magazine / currentWeapon.maxMagazine) * 100))}%`,
                  }}
                />
              )}
            </div>
          </div>

          {/* 2. HEALTH MODULE (Vibrates and Flashes on Damage) */}
          <div
            id="hud-health-block"
            className={`flex-1 min-w-[75px] max-w-[155px] flex flex-col justify-between bg-[#0a0c14]/95 border-2 rounded-md p-1.5 transition-all ${getHealthBorderColor(
              player.health
            )}`}
          >
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-pixel text-neutral-400 leading-none mb-0.5">
              <span className="flex items-center gap-1 text-red-400">
                <Heart className={`w-2.5 h-2.5 ${player.health <= 25 ? 'text-red-500 animate-ping' : 'text-red-500'}`} />
                HEALTH
              </span>
              {player.berserkTimer > 0 ? (
                <span className="text-[7px] font-pixel text-red-400 font-bold animate-pulse">BERSERK</span>
              ) : (
                <span className="text-[7.5px] font-mono-tech text-neutral-500 font-bold">V-CORE</span>
              )}
            </div>

            <div className="my-auto py-0.5 text-center leading-none">
              <div className={`text-xl sm:text-2xl font-mono-tech font-black tracking-wider leading-none transition-transform duration-75 ${
                isDamageVibrating ? 'scale-110' : ''
              } ${getHealthColor(player.health)}`}>
                {Math.max(0, Math.round(player.health))}%
              </div>
              <div className="text-[7.5px] sm:text-[8px] font-mono-tech text-neutral-500 font-bold mt-1">
                {player.health > 100 ? 'OVERCHARGED' : player.health <= 25 ? 'CRITICAL VITAL' : 'OPTIMAL'}
              </div>
            </div>

            {/* Health Status Bar */}
            <div className="w-full h-1.5 bg-neutral-950 border border-neutral-800 rounded-xs overflow-hidden relative mt-0.5">
              <div
                className={`h-full transition-all duration-150 ${
                  player.health > 60
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_6px_#10b981]'
                    : player.health > 25
                    ? 'bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_6px_#f59e0b]'
                    : 'bg-gradient-to-r from-red-700 to-red-500 animate-pulse shadow-[0_0_8px_#ef4444]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, player.health))}%` }}
              />
            </div>
          </div>

          {/* 3. PROMINENT CENTERPIECE: TACHOMETER KILL-O'METER */}
          <div id="hud-tachometer-block" className="flex-shrink-0 flex items-center justify-center -my-2 z-20">
            <KillOMeterTachometer
              killOMeter={killOMeter}
              levelKills={levelKills}
              requiredKills={requiredKills}
              totalLevelEnemies={totalLevelEnemies}
              isLockdown={isLockdown}
              isBerserk={player.berserkTimer > 0}
              comboCount={combo.count}
              comboMultiplier={combo.multiplier}
              dashCooldown={player.dash.cooldown}
              dashMaxCooldown={player.dash.maxCooldown}
            />
          </div>

          {/* 4. ARMOR MODULE (Glows and Pulses on Pickup) */}
          <div
            id="hud-armor-block"
            className={`flex-1 min-w-[75px] max-w-[155px] flex flex-col justify-between bg-[#0a0c14]/95 border-2 rounded-md p-1.5 transition-all ${getArmorBorderColor(
              player.armor
            )}`}
          >
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-pixel text-neutral-400 leading-none mb-0.5">
              <span className="flex items-center gap-1 text-cyan-400">
                <Shield className="w-2.5 h-2.5 text-cyan-400" />
                ARMOR
              </span>
              <span className="text-[7.5px] font-mono-tech text-cyan-400 font-bold">-60% SHLD</span>
            </div>

            <div className="my-auto py-0.5 text-center leading-none">
              <div className={`text-xl sm:text-2xl font-mono-tech font-black tracking-wider leading-none transition-transform duration-75 ${
                isArmorGlowing ? 'scale-110' : ''
              } ${getArmorColor(player.armor)}`}>
                {Math.max(0, Math.round(player.armor))}%
              </div>
              <div className="text-[7.5px] sm:text-[8px] font-mono-tech text-neutral-500 font-bold mt-1">
                {player.armor > 100 ? 'TITANIUM PLATED' : player.armor > 0 ? 'ENERGY BARRIER' : 'DEPLETED'}
              </div>
            </div>

            {/* Armor Status Bar */}
            <div className="w-full h-1.5 bg-neutral-950 border border-neutral-800 rounded-xs overflow-hidden relative mt-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-sky-300 transition-all duration-150 shadow-[0_0_8px_#06b6d4]"
                style={{ width: `${Math.min(100, Math.max(0, player.armor))}%` }}
              />
            </div>
          </div>

          {/* 5. ARSENAL LOADOUT MATRIX: DYNAMIC AMMO COUNTERS FOR EACH OF THE 4 WEAPONS + MELEE */}
          <div
            id="hud-arms-block"
            className="flex-1 min-w-[150px] max-w-[280px] flex flex-col justify-between bg-[#0a0c14]/95 border-2 border-neutral-800 rounded-md p-1.5 transition-all hover:border-neutral-700"
          >
            <div className="flex items-center justify-between text-[7px] sm:text-[8px] font-pixel text-neutral-400 mb-1 leading-none">
              <span className="text-amber-400 font-bold">TACTICAL ARSENAL LOADOUT</span>
              <span className="text-[7.5px] font-mono-tech text-neutral-500">[KEYS 1-5]</span>
            </div>

            {/* Loadout Matrix Grid: 5 Slots with Pixel-Art Icons, Loaded Mag & Total Reserves */}
            <div className="grid grid-cols-5 gap-1 my-auto">
              {weaponList.map((w) => {
                const isActive = player.currentWeapon === w.type;
                const isUnlocked = player.weapons[w.type]?.unlocked;
                const wObj = player.weapons[w.type];
                const resCount = w.type === 'fist' ? Infinity : player.ammo[w.ammoType];
                const isMagEmpty = w.type !== 'fist' && w.type !== 'chaingun' && wObj?.magazine === 0;

                return (
                  <button
                    key={w.slot}
                    id={`weapon-slot-${w.slot}`}
                    onClick={() => onSwitchWeapon(w.slot)}
                    disabled={!isUnlocked}
                    title={`${w.name} ${
                      isUnlocked
                        ? w.type === 'fist'
                          ? '(Infinite)'
                          : w.type === 'chaingun'
                          ? `(${player.ammo.belts} Belt Direct)`
                          : `(${wObj?.magazine}/${wObj?.maxMagazine} Mag, ${resCount} Reserve)`
                        : '(Locked)'
                    }`}
                    className={`py-1 px-0.5 rounded text-center transition-all flex flex-col items-center justify-between cursor-pointer border relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-b from-amber-500/30 to-amber-900/50 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.6)] ring-1 ring-amber-400/50'
                        : isUnlocked
                        ? 'bg-neutral-900/90 border-neutral-700 text-gray-300 hover:border-cyan-500 hover:bg-neutral-800'
                        : 'bg-neutral-950/80 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {/* Top Slot Header: Slot Key & Status */}
                    <div className="w-full flex items-center justify-between px-0.5 text-[6.5px] sm:text-[7px] font-mono-tech font-bold leading-none">
                      <span className={isActive ? 'text-amber-300 font-black' : 'text-neutral-500'}>[{w.slot}]</span>
                      <span className="truncate text-[6px] font-pixel text-neutral-400">{w.shortName}</span>
                    </div>

                    {/* Pixel Art Weapon Sprite */}
                    <div className="my-0.5 flex items-center justify-center h-4">
                      {isUnlocked ? (
                        <WeaponPixelIcon
                          type={w.type}
                          active={isActive}
                          size="sm"
                          className={isActive ? 'filter drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]' : ''}
                        />
                      ) : (
                        <Lock className="w-2.5 h-2.5 text-neutral-600" />
                      )}
                    </div>

                    {/* Dynamic Ammo Readout: Loaded Magazine */}
                    <div className="w-full text-center leading-tight">
                      {isUnlocked ? (
                        <>
                          <div className={`text-[7.5px] sm:text-[8px] font-mono-tech font-bold ${
                            isActive
                              ? 'text-amber-300'
                              : isMagEmpty || (w.type === 'chaingun' && player.chaingunOverheat?.isOverheated)
                              ? 'text-red-400 animate-pulse'
                              : 'text-gray-200'
                          }`}>
                            {w.type === 'fist' ? (
                              '∞'
                            ) : w.type === 'chaingun' ? (
                              player.chaingunOverheat?.isOverheated ? (
                                `${player.chaingunOverheat.cooldownTimer.toFixed(1)}s`
                              ) : (
                                `${player.ammo.belts}`
                              )
                            ) : (
                              `${wObj?.magazine}/${wObj?.maxMagazine}`
                            )}
                          </div>
                          {/* Reserve Ammunition Readout / Heat Status */}
                          <div className="text-[6px] sm:text-[6.5px] font-mono-tech text-neutral-400 leading-none">
                            {w.type === 'fist' ? (
                              'MELEE'
                            ) : w.type === 'chaingun' ? (
                              player.chaingunOverheat?.isOverheated ? (
                                <span className="text-red-400 font-bold">COOLING</span>
                              ) : (player.chaingunOverheat?.shotsFired || 0) > 30 ? (
                                <span className="text-amber-400 font-bold">{player.chaingunOverheat?.shotsFired}/50H</span>
                              ) : (
                                `BELT`
                              )
                            ) : (
                              `R:${resCount}`
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-[6px] font-pixel text-neutral-600 uppercase">LOCK</span>
                      )}
                    </div>

                    {/* Mini Loaded Magazine Level Pip */}
                    {isUnlocked && w.type !== 'fist' && (
                      <div className="w-full h-0.5 bg-neutral-950 mt-0.5 rounded-xs overflow-hidden">
                        <div
                          className={`h-full ${
                            isActive ? 'bg-amber-400' : isMagEmpty ? 'bg-red-500' : 'bg-cyan-500'
                          }`}
                          style={{
                            width: w.type === 'chaingun'
                              ? `${player.ammo.belts > 0 ? 100 : 0}%`
                              : `${Math.min(100, Math.max(0, ((wObj?.magazine || 0) / (wObj?.maxMagazine || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Weapon Name / Status */}
            <div className="text-[7px] sm:text-[7.5px] font-mono-tech text-neutral-400 text-center truncate pt-1 flex items-center justify-center gap-1.5">
              <span className="text-neutral-500">ACTIVE:</span>
              <strong className="text-amber-400">{currentWeapon.name}</strong>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
