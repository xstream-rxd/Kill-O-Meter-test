import React from 'react';
import { WeaponType } from '../types';

interface WeaponPixelIconProps {
  type: WeaponType;
  className?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const WeaponPixelIcon: React.FC<WeaponPixelIconProps> = ({
  type,
  className = '',
  active = false,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-3.5',
    md: 'w-10 h-5',
    lg: 'w-14 h-7',
    xl: 'w-20 h-10',
  };

  const containerClass = `${sizeClasses[size]} ${className} shrink-0 inline-block`;

  switch (type) {
    case 'fist':
      return (
        <svg
          viewBox="0 0 32 16"
          className={containerClass}
          style={{ shapeRendering: 'crispEdges' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Fist / Spiked Knuckles Pixel Art */}
          {/* Wrist / Forearm Band */}
          <rect x="2" y="5" width="6" height="7" fill={active ? '#1e293b' : '#0f172a'} />
          <rect x="3" y="6" width="4" height="5" fill="#334155" />
          <rect x="4" y="7" width="2" height="3" fill="#64748b" />
          {/* Metal Gauntlet Plate */}
          <rect x="8" y="4" width="8" height="9" fill="#475569" />
          <rect x="9" y="5" width="6" height="7" fill="#64748b" />
          <rect x="10" y="6" width="4" height="5" fill="#94a3b8" />
          <rect x="11" y="7" width="2" height="3" fill="#cbd5e1" />
          {/* Knuckle Guard */}
          <rect x="16" y="3" width="10" height="11" fill="#334155" />
          <rect x="17" y="4" width="8" height="9" fill="#64748b" />
          {/* 4 Knuckle Ridges */}
          <rect x="19" y="3" width="2" height="2" fill="#e2e8f0" />
          <rect x="22" y="4" width="2" height="2" fill="#e2e8f0" />
          <rect x="25" y="6" width="2" height="2" fill="#e2e8f0" />
          <rect x="26" y="9" width="2" height="2" fill="#e2e8f0" />
          {/* Spikes / Brass Studs */}
          <rect x="21" y="1" width="2" height="2" fill="#f59e0b" />
          <rect x="24" y="2" width="2" height="2" fill="#fbbf24" />
          <rect x="27" y="5" width="2" height="2" fill="#fbbf24" />
          <rect x="28" y="8" width="2" height="2" fill="#f59e0b" />
          {/* Cyber Power Circuit Accent */}
          <rect x="10" y="8" width="6" height="1" fill={active ? '#ef4444' : '#dc2626'} />
          <rect x="16" y="7" width="2" height="3" fill={active ? '#f87171' : '#ef4444'} />
        </svg>
      );

    case 'pistol':
      return (
        <svg
          viewBox="0 0 32 16"
          className={containerClass}
          style={{ shapeRendering: 'crispEdges' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Pistol Pixel Art */}
          {/* Slide & Barrel Top */}
          <rect x="6" y="3" width="22" height="4" fill="#334155" />
          <rect x="7" y="3" width="20" height="2" fill="#64748b" />
          <rect x="8" y="3" width="18" height="1" fill="#94a3b8" />
          <rect x="26" y="3" width="2" height="1" fill="#e2e8f0" /> {/* Front Sight */}
          <rect x="7" y="3" width="2" height="1" fill="#e2e8f0" /> {/* Rear Sight */}
          {/* Ejection Port */}
          <rect x="15" y="4" width="4" height="2" fill="#1e293b" />
          <rect x="16" y="4" width="2" height="1" fill="#f59e0b" />
          {/* Slide Serrations */}
          <rect x="8" y="4" width="1" height="2" fill="#1e293b" />
          <rect x="10" y="4" width="1" height="2" fill="#1e293b" />
          <rect x="12" y="4" width="1" height="2" fill="#1e293b" />
          {/* Frame / Receiver */}
          <rect x="8" y="7" width="18" height="2" fill="#1e293b" />
          <rect x="9" y="7" width="16" height="1" fill="#334155" />
          {/* Muzzle Tip */}
          <rect x="28" y="4" width="1" height="2" fill="#0f172a" />
          {/* Trigger Guard & Trigger */}
          <rect x="14" y="9" width="6" height="4" fill="#334155" />
          <rect x="15" y="9" width="4" height="3" fill="#0f172a" />
          <rect x="16" y="9" width="1" height="2" fill="#cbd5e1" /> {/* Trigger */}
          {/* Grip / Handle */}
          <rect x="9" y="9" width="6" height="6" fill="#1e293b" />
          <rect x="8" y="10" width="6" height="5" fill="#334155" />
          <rect x="9" y="11" width="4" height="3" fill="#475569" />
          <rect x="10" y="12" width="2" height="2" fill="#64748b" />
          {/* Magazine Base Plate */}
          <rect x="8" y="14" width="6" height="1" fill="#0f172a" />
          <rect x="9" y="14" width="4" height="1" fill="#f59e0b" />
        </svg>
      );

    case 'shotgun':
      return (
        <svg
          viewBox="0 0 32 16"
          className={containerClass}
          style={{ shapeRendering: 'crispEdges' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Combat Shotgun Pixel Art */}
          {/* Long Twin Barrel */}
          <rect x="8" y="4" width="22" height="2" fill="#475569" />
          <rect x="9" y="4" width="21" height="1" fill="#94a3b8" />
          <rect x="29" y="3" width="1" height="1" fill="#facc15" /> {/* Bead sight */}
          {/* Magazine Under-Tube */}
          <rect x="12" y="6" width="17" height="2" fill="#334155" />
          <rect x="13" y="6" width="15" height="1" fill="#64748b" />
          <rect x="28" y="6" width="2" height="2" fill="#1e293b" /> {/* Cap */}
          {/* Pump Forend Slide */}
          <rect x="17" y="7" width="8" height="3" fill="#78350f" />
          <rect x="18" y="7" width="6" height="2" fill="#92400e" />
          {/* Pump Grooves */}
          <rect x="19" y="7" width="1" height="3" fill="#451a03" />
          <rect x="21" y="7" width="1" height="3" fill="#451a03" />
          <rect x="23" y="7" width="1" height="3" fill="#451a03" />
          {/* Receiver / Action */}
          <rect x="6" y="4" width="8" height="5" fill="#1e293b" />
          <rect x="7" y="5" width="6" height="3" fill="#334155" />
          {/* Red Shell Ejection Port */}
          <rect x="9" y="5" width="3" height="2" fill="#dc2626" />
          <rect x="11" y="5" width="1" height="2" fill="#facc15" /> {/* Brass rim */}
          {/* Trigger Guard */}
          <rect x="10" y="9" width="4" height="3" fill="#334155" />
          <rect x="11" y="9" width="2" height="2" fill="#0f172a" />
          <rect x="12" y="9" width="1" height="1" fill="#e2e8f0" />
          {/* Wooden / Tactical Stock & Grip */}
          <rect x="4" y="8" width="4" height="5" fill="#78350f" />
          <rect x="1" y="9" width="4" height="4" fill="#451a03" />
          <rect x="2" y="10" width="3" height="3" fill="#78350f" />
          <rect x="1" y="10" width="1" height="3" fill="#0f172a" /> {/* Recoil pad */}
        </svg>
      );

    case 'chaingun':
      return (
        <svg
          viewBox="0 0 32 16"
          className={containerClass}
          style={{ shapeRendering: 'crispEdges' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Chaingun / Minigun Pixel Art */}
          {/* Rotating Multi-Barrels */}
          <rect x="14" y="3" width="16" height="2" fill="#475569" />
          <rect x="15" y="3" width="14" height="1" fill="#94a3b8" />
          <rect x="14" y="6" width="16" height="2" fill="#334155" />
          <rect x="15" y="6" width="14" height="1" fill="#64748b" />
          <rect x="14" y="9" width="16" height="2" fill="#475569" />
          <rect x="15" y="9" width="14" height="1" fill="#94a3b8" />
          {/* Barrel Spacer Rings */}
          <rect x="20" y="2" width="2" height="10" fill="#1e293b" />
          <rect x="21" y="2" width="1" height="10" fill="#64748b" />
          <rect x="27" y="2" width="2" height="10" fill="#1e293b" />
          <rect x="28" y="2" width="1" height="10" fill="#94a3b8" />
          {/* Muzzle Flash Suppressor Tip */}
          <rect x="30" y="3" width="1" height="8" fill="#f59e0b" />
          {/* Heavy Motor Rotor Body */}
          <rect x="7" y="3" width="8" height="9" fill="#1e293b" />
          <rect x="8" y="4" width="6" height="7" fill="#334155" />
          <rect x="9" y="5" width="4" height="5" fill="#475569" />
          {/* Ammo Belt Feed Chute (Brass Links) */}
          <rect x="9" y="11" width="5" height="3" fill="#f59e0b" />
          <rect x="10" y="12" width="1" height="2" fill="#78350f" />
          <rect x="12" y="12" width="1" height="2" fill="#78350f" />
          {/* Dual Top Carry Handle */}
          <rect x="5" y="2" width="8" height="2" fill="#475569" />
          <rect x="6" y="1" width="6" height="2" fill="#1e293b" />
          <rect x="7" y="1" width="4" height="1" fill="#94a3b8" />
          {/* Rear Spade Grip / Trigger Box */}
          <rect x="2" y="5" width="6" height="6" fill="#0f172a" />
          <rect x="3" y="6" width="4" height="4" fill="#334155" />
          <rect x="1" y="7" width="2" height="2" fill="#ef4444" /> {/* Electric firing solenoid */}
        </svg>
      );

    case 'plasma':
      return (
        <svg
          viewBox="0 0 32 16"
          className={containerClass}
          style={{ shapeRendering: 'crispEdges' }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Plasma Rifle Pixel Art */}
          {/* High-Tech Chassis Body */}
          <rect x="4" y="4" width="22" height="7" fill="#0f172a" />
          <rect x="5" y="5" width="20" height="5" fill="#1e293b" />
          {/* Magnetic Accelerator Barrel Rail */}
          <rect x="14" y="3" width="15" height="2" fill="#334155" />
          <rect x="15" y="3" width="13" height="1" fill="#06b6d4" />
          <rect x="14" y="9" width="15" height="2" fill="#334155" />
          <rect x="15" y="10" width="13" height="1" fill="#06b6d4" />
          {/* Dual Glowing Plasma Coils */}
          <rect x="16" y="5" width="3" height="4" fill="#06b6d4" />
          <rect x="17" y="5" width="1" height="4" fill="#ffffff" />
          <rect x="21" y="5" width="3" height="4" fill="#06b6d4" />
          <rect x="22" y="5" width="1" height="4" fill="#ffffff" />
          <rect x="26" y="5" width="3" height="4" fill="#38bdf8" />
          <rect x="27" y="5" width="1" height="4" fill="#ffffff" />
          {/* Muzzle Aperture */}
          <rect x="29" y="4" width="2" height="6" fill="#0891b2" />
          <rect x="30" y="5" width="1" height="4" fill="#a5f3fc" />
          {/* Plasma Battery Cell Chamber */}
          <rect x="8" y="6" width="6" height="5" fill="#0e7490" />
          <rect x="9" y="7" width="4" height="3" fill="#38bdf8" />
          <rect x="10" y="8" width="2" height="1" fill="#ffffff" />
          {/* Heat Vents & Display Panel */}
          <rect x="8" y="4" width="5" height="1" fill="#f59e0b" />
          {/* Ergonomic Bullpup Stock & Grip */}
          <rect x="2" y="5" width="3" height="7" fill="#0f172a" />
          <rect x="3" y="6" width="2" height="5" fill="#1e293b" />
          <rect x="8" y="11" width="4" height="4" fill="#0f172a" />
          <rect x="9" y="12" width="2" height="2" fill="#334155" />
        </svg>
      );

    default:
      return null;
  }
};
