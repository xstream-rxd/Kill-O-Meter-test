import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../engine/gameEngine';
import { RaycasterEngine } from '../engine/raycaster';
import { TextureManager } from '../engine/textures';
import { GameSettings } from '../types';
import { Minimap } from './Minimap';
import { DoomHud } from './DoomHud';
import { SectorDebriefModal } from './SectorDebriefModal';
import { soundSynth } from '../engine/soundSynth';
import { gamepadManager } from '../engine/gamepadManager';
import { AlertTriangle, Play, Compass, Flame, Trophy, Gamepad2 } from 'lucide-react';

interface GameCanvasProps {
  engine: GameEngine;
  settings: GameSettings;
  onTogglePause: () => void;
  onToggleMinimap?: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  settings,
  onTogglePause,
  onToggleMinimap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [hitmarker, setHitmarker] = useState(false);
  const [lookDirection, setLookDirection] = useState<'left' | 'right' | 'straight'>('straight');
  const [isAutomapOpen, setIsAutomapOpen] = useState(false);
  const [gamepadNotification, setGamepadNotification] = useState<{ name: string; type: 'connected' | 'disconnected' } | null>(null);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  const keysPressed = useRef<Record<string, boolean>>({});
  const lastTimeRef = useRef<number>(performance.now());
  const isGamepadActiveRef = useRef(false);
  const raycasterRef = useRef<RaycasterEngine>(new RaycasterEngine());
  const texturesRef = useRef<TextureManager>(TextureManager.getInstance());
  const prevKillsRef = useRef<number>(0);
  const lookDirTimerRef = useRef<number>(0);
  const walkBobPhaseRef = useRef<number>(0);
  const walkBobWeightRef = useRef<number>(0);
  const mouseInertiaXRef = useRef<number>(0);
  const mouseInertiaYRef = useRef<number>(0);
  const weaponSwayXRef = useRef<number>(0);
  const strafeTiltRef = useRef<number>(0);
  const lastPauseTimeRef = useRef<number>(0);

  // Gamepad Notification Listener
  useEffect(() => {
    return gamepadManager.onNotification((notif) => {
      setGamepadNotification({ name: notif.name, type: notif.type });
      setIsGamepadConnected(notif.type === 'connected');
      setTimeout(() => {
        setGamepadNotification((cur) => (cur?.name === notif.name ? null : cur));
      }, 3500);
    });
  }, []);

  // Setup Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape or KeyP: Close Automap first if open, else Pause game
      if (e.code === 'Escape' || e.code === 'KeyP') {
        // Prevent double toggle if pointerlockchange JUST paused the game within 200ms
        if (performance.now() - lastPauseTimeRef.current < 200) {
          e.preventDefault();
          return;
        }

        if (isAutomapOpen) {
          e.preventDefault();
          setIsAutomapOpen(false);
          return;
        }

        // If game is already paused, PauseMenu handles Escape to unpause
        if (engine.isPaused) {
          return;
        }

        keysPressed.current = {};
        onTogglePause();
        return;
      }

      // If game is paused, game over, or mutating, ignore all other gameplay keys
      if (engine.isPaused || engine.isGameOver || engine.isVictory || engine.isMutating) {
        return;
      }

      // Prevent browser default scrolling for common gameplay navigation keys
      if (e.code && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code) {
        keysPressed.current[e.code] = true;
      }

      const kb = settings.keyBindings;

      // Weapon switching (1: Fist, 2: Pistol, 3: Shotgun, 4: Chaingun, 5: Plasma)
      if (e.code === 'Digit1' || e.key === '1' || (kb && e.code === kb.weapon1)) engine.switchWeapon('fist');
      if (e.code === 'Digit2' || e.key === '2' || (kb && e.code === kb.weapon2)) engine.switchWeapon('pistol');
      if (e.code === 'Digit3' || e.key === '3' || (kb && e.code === kb.weapon3)) engine.switchWeapon('shotgun');
      if (e.code === 'Digit4' || e.key === '4' || (kb && e.code === kb.weapon4)) engine.switchWeapon('chaingun');
      if (e.code === 'Digit5' || e.key === '5' || (kb && e.code === kb.weapon5)) engine.switchWeapon('plasma');

      // Manual Weapon Reload (R)
      if (e.code === kb.reload || e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        engine.reloadWeapon();
      }

      // Glory Kill / Melee Execution (KeyF / kb.gloryKill / e.key 'f')
      if (e.code === 'KeyF' || e.key?.toLowerCase() === 'f' || (kb && e.code === kb.gloryKill)) {
        engine.executeGloryKill();
      }

      // Interact / Secret Trigger / Debrief Advance (KeyE / kb.interact)
      if (e.code === kb.interact || e.code === 'KeyE') {
        if (engine.levelTransition.active && engine.levelTransition.isDebriefWaiting) {
          engine.confirmLevelTransition();
        } else {
          engine.interact();
        }
      }

      // Diegetic Weapon Inspect (KeyI / KeyT)
      if (e.code === 'KeyI' || e.code === 'KeyT') {
        engine.triggerInspect();
      }

      // Dash on Shift or Space or Custom Bind
      if (e.code === kb.dash || e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        const moveForward = (keysPressed.current[kb.moveForward] || keysPressed.current['KeyW'] || keysPressed.current['ArrowUp'] ? 1 : 0) -
                           (keysPressed.current[kb.moveBackward] || keysPressed.current['KeyS'] || keysPressed.current['ArrowDown'] ? 1 : 0);
        const moveRight = (keysPressed.current[kb.strafeRight] || keysPressed.current['KeyD'] ? 1 : 0) -
                         (keysPressed.current[kb.strafeLeft] || keysPressed.current['KeyA'] ? 1 : 0);
        engine.triggerDash(moveForward, moveRight);
      }

      // Automap Overlay Toggle (Tab)
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsAutomapOpen((prev) => !prev);
        return;
      }

      // Minimap Toggle
      if (e.code === kb.toggleMinimap || e.code === 'KeyM') {
        if (onToggleMinimap) {
          onToggleMinimap();
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    // Reset stuck keys on window blur / tab switch / unfocus
    const handleBlur = () => {
      keysPressed.current = {};
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [engine, settings, onTogglePause, onToggleMinimap, isAutomapOpen]);

  // Pointer Lock & Mouse Look
  const lastLockRequestRef = useRef<number>(0);
  const lastLockExitRef = useRef<number>(0);

  // Release pointer lock and reset keys when Automap overlay opens, when game is paused, or during mutation sequence
  useEffect(() => {
    if ((isAutomapOpen || engine.isPaused || engine.isMutating) && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (engine.isPaused || engine.isMutating) {
      keysPressed.current = {};
    }
  }, [isAutomapOpen, engine.isPaused, engine.isMutating]);

  const requestPointerLock = useCallback(() => {
    // Only attempt lock if game is active and automap is not open
    if (engine.isGameOver || engine.isVictory || engine.isPaused || engine.isMutating || isAutomapOpen) {
      return;
    }

    soundSynth.init();
    soundSynth.resume();
    soundSynth.startMusic();

    const now = performance.now();
    // Guard against browser rate-limiting: must wait at least 300ms between requests
    // and at least 250ms after user exited pointer lock (ESC / window blur)
    if (now - lastLockRequestRef.current < 300 || now - lastLockExitRef.current < 250) {
      return;
    }
    lastLockRequestRef.current = now;

    if (containerRef.current && document.pointerLockElement !== containerRef.current) {
      try {
        const result = containerRef.current.requestPointerLock();
        if (result && typeof (result as unknown as Promise<void>).catch === 'function') {
          (result as unknown as Promise<void>).catch((err: unknown) => {
            // Silently absorb expected browser rate-limiting / gesture cooldown rejections
            // e.g. "Pointer lock cannot be acquired immediately after the user has exited the lock."
            lastLockExitRef.current = performance.now();
          });
        }
      } catch {
        lastLockExitRef.current = performance.now();
      }
    }
  }, [engine.isGameOver, engine.isVictory, engine.isPaused, engine.isMutating, isAutomapOpen]);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      setIsPointerLocked(isLocked);
      if (!isLocked) {
        lastLockExitRef.current = performance.now();
        // Automatically pause game if pointer lock is exited while playing (unless using gamepad)
        if (!isGamepadActiveRef.current && !engine.isPaused && !engine.isGameOver && !engine.isVictory && !engine.isMutating) {
          lastPauseTimeRef.current = performance.now();
          onTogglePause();
        }
      }
    };

    const handlePointerLockError = () => {
      lastLockExitRef.current = performance.now();
      setIsPointerLocked(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (engine.isPaused || engine.isGameOver || engine.isVictory || engine.isMutating) return;
      if (document.pointerLockElement === containerRef.current) {
        engine.handleMouseMove(e.movementX, e.movementY);
        
        // Accumulate inertia sway impulse
        mouseInertiaXRef.current += e.movementX * 0.45;
        mouseInertiaYRef.current += e.movementY * 0.35;

        // Update Face looking direction
        if (e.movementX < -3) {
          setLookDirection('left');
          lookDirTimerRef.current = 0.5;
        } else if (e.movementX > 3) {
          setLookDirection('right');
          lookDirTimerRef.current = 0.5;
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (engine.isPaused || engine.isGameOver || engine.isVictory || engine.isMutating) return;
      if (e.button === 0) {
        keysPressed.current['MouseLeft'] = true;
        if (document.pointerLockElement === containerRef.current) {
          engine.fireWeapon();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        keysPressed.current['MouseLeft'] = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (engine.isPaused || engine.isGameOver || engine.isVictory || engine.isMutating) return;
      engine.cycleWeapon(e.deltaY > 0 ? 1 : -1);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [engine, onTogglePause]);

  // Re-acquire pointer lock automatically when unpaused or on arena mount
  const prevPausedRef = useRef<boolean>(engine.isPaused);
  useEffect(() => {
    if (prevPausedRef.current && !engine.isPaused) {
      const timer = setTimeout(() => {
        requestPointerLock();
      }, 50);
      return () => clearTimeout(timer);
    }
    prevPausedRef.current = engine.isPaused;
  }, [engine.isPaused, requestPointerLock]);

  useEffect(() => {
    if (!engine.isPaused && !engine.isGameOver && !engine.isVictory) {
      const timer = setTimeout(() => {
        requestPointerLock();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [requestPointerLock]);

  // Main 60 FPS Render & Animation Loop
  useEffect(() => {
    let animId: number;

    const renderLoop = (timestamp: number) => {
      // If paused, keep lastTimeRef aligned so no time accumulation happens on unpause
      if (engine.isPaused) {
        lastTimeRef.current = timestamp;
        // Static frame render
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            raycasterRef.current.render({
              ctx,
              width: canvas.width,
              height: canvas.height,
              player: engine.player,
              grid: engine.mapData.grid,
              floorGrid: engine.mapData.floorGrid,
              ceilingGrid: engine.mapData.ceilingGrid,
              stageNumber: engine.currentStage,
              enemies: engine.mapData.enemies,
              projectiles: engine.projectiles,
              pickups: engine.mapData.pickups,
              chests: engine.mapData.chests,
              secrets: engine.mapData.secrets,
              airlockDoors: engine.mapData.airlockDoors,
              airlockAnimProgress: engine.airlockAnimProgress,
              particles: engine.particles,
              flashLight: engine.player.weaponAnim.muzzleFlash ? 0.2 : (engine.isLockdown ? 0.2 : 0),
              isLockdown: engine.isLockdown,
              time: engine.gameTime,
              exitPos: engine.mapData.exitPos,
              exitUnlocked: engine.mapData.exitUnlocked,
            });
            renderWeaponViewmodel(ctx, canvas.width, canvas.height);
          }
        }
        animId = requestAnimationFrame(renderLoop);
        return;
      }

      const dt = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      // Update looking direction timer
      if (lookDirTimerRef.current > 0) {
        lookDirTimerRef.current -= dt;
        if (lookDirTimerRef.current <= 0) {
          setLookDirection('straight');
        }
      }

      // Gamepad Input Polling
      const pad = gamepadManager.poll({
        deadzone: settings.gamepadDeadzone ?? 0.15,
        invertY: settings.gamepadInvertY ?? false,
        dt,
      });

      if (pad.connected) {
        if (!isGamepadConnected) {
          setIsGamepadConnected(true);
        }
        isGamepadActiveRef.current = true;

        // Gamepad Pause / Resume Toggle
        if (pad.justPause) {
          onTogglePause();
          return;
        }

        // Gamepad Automap Overlay Toggle
        if (pad.justAutomap) {
          setIsAutomapOpen((prev) => !prev);
        }

        // Gamepad Minimap Toggle
        if (pad.justMinimap && onToggleMinimap) {
          onToggleMinimap();
        }

        // Gamepad Single Fire
        if (pad.justFire) {
          engine.fireWeapon();
        }

        // Gamepad Dash
        if (pad.justDash) {
          engine.triggerDash(pad.moveY || 1, pad.moveX || 0);
        }

        // Gamepad Interact (consoles, secrets, supply chests, debrief modal)
        if (pad.justInteract) {
          if (engine.levelTransition.active && engine.levelTransition.isDebriefWaiting) {
            engine.confirmLevelTransition();
          } else {
            engine.interact();
          }
        }

        // Gamepad Reload
        if (pad.justReload) {
          engine.reloadWeapon();
        }

        // Gamepad Glory Kill / Melee
        if (pad.justGloryKill) {
          engine.executeGloryKill();
        }

        // Gamepad Weapon Cycling & Direct Slots
        if (pad.justNextWeapon) {
          engine.cycleWeapon(1);
        } else if (pad.justPrevWeapon) {
          engine.cycleWeapon(-1);
        } else if (pad.directWeaponSlot !== null) {
          const types: ('fist' | 'pistol' | 'shotgun' | 'chaingun' | 'plasma')[] = [
            'fist',
            'pistol',
            'shotgun',
            'chaingun',
            'plasma',
          ];
          engine.switchWeapon(types[pad.directWeaponSlot - 1]);
        }

        // Gamepad Weapon Inspect
        if (pad.justInspect) {
          engine.triggerInspect();
        }

        // Gamepad Analog Look (Right Stick)
        if (Math.abs(pad.lookX) > 0.01) {
          const lookSens = (settings.gamepadSensitivity || 2.2) * 2.8;
          engine.player.angle += pad.lookX * lookSens * dt;
          mouseInertiaXRef.current += pad.lookX * 16 * dt;

          if (pad.lookX < -0.2) {
            setLookDirection('left');
            lookDirTimerRef.current = 0.35;
          } else if (pad.lookX > 0.2) {
            setLookDirection('right');
            lookDirTimerRef.current = 0.35;
          }
        }

        if (Math.abs(pad.lookY) > 0.01) {
          const lookSensY = (settings.gamepadSensitivity || 2.2) * 220;
          engine.player.pitch = Math.max(-120, Math.min(120, engine.player.pitch + pad.lookY * lookSensY * dt));
          mouseInertiaYRef.current += pad.lookY * 10 * dt;
        }
      }

      // Input vectors (Combining keyboard & controller)
      const kb = settings.keyBindings;
      let moveForward = ((keysPressed.current['KeyW'] || (kb && keysPressed.current[kb.moveForward]) || (!isPointerLocked && keysPressed.current['ArrowUp'])) ? 1 : 0) -
                        ((keysPressed.current['KeyS'] || (kb && keysPressed.current[kb.moveBackward]) || (!isPointerLocked && keysPressed.current['ArrowDown'])) ? 1 : 0);
      let moveRight = ((keysPressed.current['KeyD'] || (kb && keysPressed.current[kb.strafeRight])) ? 1 : 0) -
                      ((keysPressed.current['KeyA'] || (kb && keysPressed.current[kb.strafeLeft])) ? 1 : 0);

      if (pad.connected) {
        if (Math.abs(pad.moveY) > 0.04) moveForward = pad.moveY;
        if (Math.abs(pad.moveX) > 0.04) moveRight = pad.moveX;
      }

      // Keyboard turning if mouse not locked (KeyE is strictly interact, not turn!)
      if (keysPressed.current['KeyQ'] || (!isPointerLocked && keysPressed.current['ArrowLeft'])) engine.player.angle -= 2.6 * dt;
      if (!isPointerLocked && keysPressed.current['ArrowRight']) engine.player.angle += 2.6 * dt;

      // Continuous automatic firing (Chaingun & Plasma Rifle)
      if (keysPressed.current['MouseLeft'] || (pad.connected && pad.fire)) {
        const w = engine.player.weapons[engine.player.currentWeapon];
        if (w && w.isAutomatic) {
          engine.fireWeapon();
        }
      }

      // Check for hitmarker on new kills or hits
      if (engine.stats.kills < prevKillsRef.current) {
        prevKillsRef.current = engine.stats.kills;
      } else if (engine.stats.kills > prevKillsRef.current) {
        prevKillsRef.current = engine.stats.kills;
        setHitmarker(true);
        setTimeout(() => setHitmarker(false), 120);
      }

      // Update Engine
      engine.update(dt, moveForward, moveRight);

      // Smooth sine-wave walking bob accumulator & deceleration
      const currentVx = engine.player.lastMoveVx ?? engine.player.vx ?? 0;
      const currentVy = engine.player.lastMoveVy ?? engine.player.vy ?? 0;
      const isWalking = (moveForward !== 0 || moveRight !== 0) &&
        (Math.abs(currentVx) > 0.05 || Math.abs(currentVy) > 0.05);

      if (isWalking) {
        walkBobPhaseRef.current += dt * 8.5;
        walkBobWeightRef.current = Math.min(1.0, walkBobWeightRef.current + dt * 6.5);
      } else {
        walkBobWeightRef.current = Math.max(0.0, walkBobWeightRef.current - dt * 5.0);
      }

      // Damped spring physics for weapon look-sway and strafe inertia tilt
      weaponSwayXRef.current += (mouseInertiaXRef.current - weaponSwayXRef.current) * Math.min(1.0, dt * 14.0);
      mouseInertiaXRef.current *= Math.max(0.0, 1.0 - dt * 18.0);

      const targetStrafeTilt = -moveRight * 0.035;
      strafeTiltRef.current += (targetStrafeTilt - strafeTiltRef.current) * Math.min(1.0, dt * 10.0);

      // Canvas Rendering & Recoil Bump
      const canvas = canvasRef.current;
      if (canvas) {
        // Canvas recoil bump translation & camera kickback
        const recoilBumpY = engine.player.weaponAnim.recoilBumpY || 0;
        const shakeAmount = engine.player.screenShake || 0;
        const shakeX = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount * 1.5 : 0;
        const shakeY = shakeAmount > 0 ? (Math.random() - 0.5) * shakeAmount * 1.5 : 0;
        const bumpY = -recoilBumpY * 0.75 + shakeY;
        const bumpX = shakeX;
        const bumpScale = 1.0 + Math.min(0.035, recoilBumpY * 0.002);
        const rollDeg = (((engine.player.cameraTiltAngle || 0) * 180) / Math.PI).toFixed(2);
        canvas.style.transform = `translate3d(${bumpX.toFixed(2)}px, ${bumpY.toFixed(2)}px, 0) scale(${bumpScale.toFixed(4)}) rotate(${rollDeg}deg)`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;

          // Subtle ambient flash that softly illuminates immediate surroundings without blinding
          const shootFlash = Math.min(0.20, (engine.player.weaponAnim.shootFlashIntensity || 0) * 0.45);
          const muzzleFlash = engine.player.weaponAnim.muzzleFlash ? 0.16 : 0;
          const flashLight = Math.max(shootFlash, muzzleFlash, engine.isLockdown ? 0.2 : 0);

          const curWp = engine.player.currentWeapon;
          let flashLightColor = { r: 255, g: 215, b: 120 }; // Default warm weapon blast
          if (curWp === 'plasma') {
            flashLightColor = { r: 56, g: 220, b: 255 }; // Electric cyan plasma flash
          } else if (curWp === 'shotgun') {
            flashLightColor = { r: 255, g: 175, b: 70 }; // Incendiary orange blast
          } else if (curWp === 'fist') {
            flashLightColor = { r: 96, g: 165, b: 250 }; // Kinetic impact spark
          }

          // 1. Raycast 3D World (with exit portal, dynamic lights, and grounded entities)
          raycasterRef.current.render({
            ctx,
            width: canvas.width,
            height: canvas.height,
            player: engine.player,
            grid: engine.mapData.grid,
            floorGrid: engine.mapData.floorGrid,
            ceilingGrid: engine.mapData.ceilingGrid,
            stageNumber: engine.currentStage,
            enemies: engine.mapData.enemies,
            projectiles: engine.projectiles,
            pickups: engine.mapData.pickups,
            chests: engine.mapData.chests,
            secrets: engine.mapData.secrets,
            airlockDoors: engine.mapData.airlockDoors,
            airlockAnimProgress: engine.airlockAnimProgress,
            particles: engine.particles,
            flashLight,
            flashLightColor,
            isLockdown: engine.isLockdown,
            time: engine.gameTime,
            exitPos: engine.mapData.exitPos,
            exitUnlocked: engine.mapData.exitUnlocked,
            fov: settings.fov || 1.15,
          });

          // 2. Render Weapon Viewmodel at Bottom Center
          renderWeaponViewmodel(ctx, canvas.width, canvas.height);

          // 3. Render Subtle Screen-Space Color-Grading Flicker (Blinding Momentary Muzzle Discharge Simulation)
          renderScreenSpaceColorGrade(ctx, canvas.width, canvas.height);

          // 4. Render Mutation Sequence Overlay (Warden Defeated Sequence)
          if (engine.isMutating) {
            renderMutationOverlay(ctx, canvas.width, canvas.height);
          }
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [engine, isPointerLocked]);

  // --- MUTATION SEQUENCE OVERLAY RENDERING (Phase 1: 0-13s, Phase 2: 13-27s, Phase 3: 27s+) ---
  const renderMutatedClaws = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    timer: number
  ) => {
    ctx.save();
    const easeProgress = Math.min(1.0, Math.max(0.0, progress));
    const riseOffset = (1.0 - Math.pow(1 - easeProgress, 3)) * (height * 0.46);
    const baseY = height + 40 - riseOffset;
    const twitchX = Math.sin(timer * 11) * 6;
    const twitchY = Math.cos(timer * 9) * 4;

    // Mutagen Energy Aura
    const cx = width / 2;
    const auraGrad = ctx.createRadialGradient(cx, height, 10, cx, height, Math.max(80, width * 0.48));
    auraGrad.addColorStop(0, 'rgba(232, 121, 249, 0.75)');
    auraGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.45)');
    auraGrad.addColorStop(0.7, 'rgba(56, 189, 248, 0.2)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(cx, height, Math.max(80, width * 0.48), 0, Math.PI * 2);
    ctx.fill();

    // Mutagenic Energy Particles rising from the viewport
    const particleCount = 44;
    for (let i = 0; i < particleCount; i++) {
      const pCycle = 3.4;
      const pTime = (timer * 1.15 + i * (pCycle / particleCount) * 1.618) % pCycle;
      const pNorm = pTime / pCycle; // 0.0 at spawn -> 1.0 at peak
      const clawSide = (i % 2 === 0 ? -1 : 1);
      const clawBias = clawSide * (width * 0.24);
      const wobble = Math.sin(pTime * 4.5 + i * 2.3) * (width * 0.045);
      const px = cx + clawBias + wobble + (Math.sin(i * 19.3) * width * 0.09);
      const py = (baseY + height * 0.05) - (pNorm * height * 0.78);
      const pSize = Math.max(1.5, (1.0 - pNorm * 0.65) * (width * 0.011 + 2.5));
      const pAlpha = Math.sin(pNorm * Math.PI) * (0.45 + (i % 3) * 0.22);

      const colorPalette = ['#e879f9', '#c084fc', '#a855f7', '#38bdf8', '#f43f5e', '#d946ef'];
      const pColor = colorPalette[i % colorPalette.length];

      ctx.save();
      ctx.globalAlpha = Math.min(1.0, Math.max(0, pAlpha * easeProgress));
      ctx.fillStyle = pColor;
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();

      // Glowing trailing wisp
      if (pNorm > 0.08) {
        ctx.strokeStyle = pColor;
        ctx.lineWidth = Math.max(1, pSize * 0.55);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - wobble * 0.25, py + pSize * 4.0);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Mutagenic lightning arcs jumping between claw tips
    if (easeProgress > 0.4) {
      ctx.save();
      const arcAlpha = 0.4 + Math.sin(timer * 22) * 0.35;
      if (arcAlpha > 0.25) {
        ctx.strokeStyle = '#e879f9';
        ctx.shadowColor = '#d8b4fe';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        const tipL_X = width * 0.36 + twitchX;
        const tipL_Y = baseY - height * 0.42 + twitchY;
        const tipR_X = width * 0.64 - twitchX;
        const tipR_Y = baseY - height * 0.42 - twitchY;
        ctx.moveTo(tipL_X, tipL_Y);
        const midX = (tipL_X + tipR_X) / 2 + Math.sin(timer * 25) * 18;
        const midY = (tipL_Y + tipR_Y) / 2 + Math.cos(timer * 21) * 16;
        ctx.quadraticCurveTo(midX, midY, tipR_X, tipR_Y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Left Mutated Claw
    const leftX = width * 0.22 + twitchX;
    const leftY = baseY + twitchY;
    ctx.save();
    ctx.translate(leftX, leftY);
    ctx.rotate(-0.25 + Math.sin(timer * 6) * 0.04);

    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(-width * 0.18, height * 0.4);
    ctx.quadraticCurveTo(-width * 0.12, -height * 0.2, width * 0.05, -height * 0.35);
    ctx.quadraticCurveTo(width * 0.1, -height * 0.1, width * 0.14, height * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(-width * 0.10, height * 0.1);
    ctx.lineTo(-width * 0.05, -height * 0.15);
    ctx.lineTo(width * 0.02, -height * 0.22);
    ctx.lineTo(width * 0.08, height * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#d8b4fe';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-width * 0.08, height * 0.2);
    ctx.quadraticCurveTo(-width * 0.02, 0, width * 0.03, -height * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(width * 0.02, -height * 0.25);
    ctx.lineTo(width * 0.14, -height * 0.42);
    ctx.lineTo(width * 0.06, -height * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-width * 0.02, -height * 0.22);
    ctx.lineTo(width * 0.08, -height * 0.45);
    ctx.lineTo(width * 0.02, -height * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-width * 0.06, -height * 0.18);
    ctx.lineTo(width * 0.02, -height * 0.38);
    ctx.lineTo(-width * 0.02, -height * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right Mutated Claw
    const rightX = width * 0.78 - twitchX;
    const rightY = baseY - twitchY;
    ctx.save();
    ctx.translate(rightX, rightY);
    ctx.rotate(0.25 - Math.sin(timer * 6) * 0.04);

    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(width * 0.18, height * 0.4);
    ctx.quadraticCurveTo(width * 0.12, -height * 0.2, -width * 0.05, -height * 0.35);
    ctx.quadraticCurveTo(-width * 0.1, -height * 0.1, -width * 0.14, height * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(width * 0.10, height * 0.1);
    ctx.lineTo(width * 0.05, -height * 0.15);
    ctx.lineTo(-width * 0.02, -height * 0.22);
    ctx.lineTo(-width * 0.08, height * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 3.5;
    ctx.shadowColor = '#d8b4fe';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(width * 0.08, height * 0.2);
    ctx.quadraticCurveTo(width * 0.02, 0, -width * 0.03, -height * 0.25);
    ctx.stroke();

    ctx.fillStyle = '#e9d5ff';
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-width * 0.02, -height * 0.25);
    ctx.lineTo(-width * 0.14, -height * 0.42);
    ctx.lineTo(-width * 0.06, -height * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width * 0.02, -height * 0.22);
    ctx.lineTo(-width * 0.08, -height * 0.45);
    ctx.lineTo(-width * 0.02, -height * 0.26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width * 0.06, -height * 0.18);
    ctx.lineTo(-width * 0.02, -height * 0.38);
    ctx.lineTo(width * 0.02, -height * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  const renderMutationOverlay = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const phase = engine.mutationPhase;
    const timer = engine.mutationTimer;

    if (phase === 1) {
      // Phase 1 (0–13s): Screen-shake pulses with narrative text ("THE WARDEN HAS FALLEN..."). (Added 10 seconds)
      const pulseRate = Math.sin(timer * 8.5);
      const isRed = Math.floor(timer * 6) % 2 === 0;
      const pulseAlpha = 0.32 + pulseRate * 0.20;
      ctx.fillStyle = isRed ? `rgba(220, 38, 38, ${pulseAlpha})` : `rgba(147, 51, 234, ${pulseAlpha})`;
      ctx.fillRect(0, 0, width, height);

      // Radial dark vignette pulse
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.08, width / 2, height / 2, width * 0.72);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(48, 5, 80, 0.92)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Expanding seismic pulse ring from screen center
      const ringCycle = (timer * 1.5) % 1.0;
      const ringRadius = ringCycle * width * 0.6;
      ctx.save();
      ctx.strokeStyle = `rgba(244, 63, 94, ${Math.max(0, (1.0 - ringCycle) * 0.5)})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      const textSize = Math.max(18, Math.floor(width * 0.040));
      ctx.font = `bold ${textSize}px font-pixel, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 24;

      // Chromatic aberration / screen-shake offset on text
      const shakeIntensity = 6 + Math.sin(timer * 10) * 4;
      const shakeX = (Math.random() - 0.5) * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * shakeIntensity;

      // Cyan-Red chromatic split
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.fillText('THE WARDEN HAS FALLEN...', width / 2 + shakeX - 3, height * 0.45 + shakeY);
      ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
      ctx.fillText('THE WARDEN HAS FALLEN...', width / 2 + shakeX + 3, height * 0.45 + shakeY);
      ctx.fillStyle = '#f0abfc';
      ctx.fillText('THE WARDEN HAS FALLEN...', width / 2 + shakeX, height * 0.45 + shakeY);

      // Narrative subtitle
      const subTextSize = Math.max(11, Math.floor(width * 0.019));
      ctx.font = `bold ${subTextSize}px font-pixel, monospace`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = 'rgba(216, 180, 254, 0.88)';
      ctx.fillText('ANCIENT MUTAGEN ESCAPES FROM THE CRUSHED TITAN', width / 2, height * 0.53);
      ctx.restore();

    } else if (phase === 2) {
      // Phase 2 (13–27s): Screen darkens, normal weapons fade out, and mutated claws rise from the bottom of the viewport with mutagenic energy particles ("...BUT THE NEW ONE RISES..."). (Added 10 seconds)
      const darkenAlpha = Math.min(0.94, 0.75 + ((timer - 13.0) / 14.0) * 0.19);
      ctx.fillStyle = `rgba(10, 4, 20, ${darkenAlpha})`;
      ctx.fillRect(0, 0, width, height);

      // Mutated claws rise smoothly over first 6.5s of Phase 2, then stay raised menacingly
      const progress = Math.min(1.0, Math.max(0.0, (timer - 13.0) / 6.5));
      renderMutatedClaws(ctx, width, height, progress, timer);

      // Narrative text: "...BUT THE NEW ONE RISES..."
      ctx.save();
      const textSize = Math.max(20, Math.floor(width * 0.044));
      ctx.font = `bold ${textSize}px font-pixel, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 30;

      const textPulse = 1.0 + Math.sin(timer * 4.0) * 0.03;
      ctx.save();
      ctx.translate(width / 2, height * 0.26);
      ctx.scale(textPulse, textPulse);

      // Chromatic split
      ctx.fillStyle = 'rgba(232, 121, 249, 0.8)';
      ctx.fillText('...BUT THE NEW ONE RISES...', -2, 0);
      ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
      ctx.fillText('...BUT THE NEW ONE RISES...', 2, 0);
      ctx.fillStyle = '#fdf4ff';
      ctx.fillText('...BUT THE NEW ONE RISES...', 0, 0);
      ctx.restore();

      // Narrative subtitle
      const subSize = Math.max(11, Math.floor(width * 0.018));
      ctx.font = `bold ${subSize}px font-pixel, monospace`;
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#c084fc';
      ctx.fillText('THE APEX TRANSFORMATION CANNOT BE HALTED', width / 2, height * 0.33);
      ctx.restore();

      // Phase 3 (27s+) Smooth Transition:
      // In final 2.0s of Phase 2 (25.0s to 27.0s), smoothly fade out to deep void before end-game modal
      if (timer > 25.0) {
        const fadeProg = Math.min(1.0, (timer - 25.0) / 2.0);
        ctx.fillStyle = `rgba(3, 1, 8, ${fadeProg})`;
        ctx.fillRect(0, 0, width, height);
      }
    }
  };

  // Screen-Space Color-Grading Flicker: Simulates realistic momentary iris exposure kick & atmospheric muzzle bloom
  const renderScreenSpaceColorGrade = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const shootFlash = engine.player.weaponAnim.shootFlashIntensity || 0;
    if (shootFlash <= 0.01) return;

    const currentWeapon = engine.player.currentWeapon;
    if (currentWeapon === 'fist') return;

    ctx.save();

    // High-frequency combustion micro-flicker variance
    const microFlicker = 0.88 + Math.sin(engine.gameTime * 65.0) * 0.12;
    const intensity = Math.min(1.0, shootFlash * microFlicker);

    // Dynamic per-weapon optical grading profiles:
    // Plasma: Sub-atomic electric cyan / quantum blue optical wash
    // Shotgun: Incandescent warm amber-gold heavy propellant surge
    // Chaingun: Stroboscopic tungsten-gold high-cyclic flicker
    // Pistol: High-velocity crisp tungsten-white combustion flash
    let coreColor = 'rgba(255, 252, 242, ';
    let tintColor = 'rgba(245, 158, 11, ';
    let edgeBloomColor = 'rgba(217, 119, 6, ';
    let exposureAlpha = 0.16 * intensity;
    let tintAlpha = 0.11 * intensity;
    let edgeAlpha = 0.06 * intensity;

    if (currentWeapon === 'plasma') {
      coreColor = 'rgba(224, 242, 254, ';
      tintColor = 'rgba(56, 189, 248, ';
      edgeBloomColor = 'rgba(2, 132, 199, ';
      exposureAlpha = 0.20 * intensity;
      tintAlpha = 0.15 * intensity;
      edgeAlpha = 0.08 * intensity;
    } else if (currentWeapon === 'shotgun') {
      coreColor = 'rgba(255, 250, 225, ';
      tintColor = 'rgba(249, 115, 22, ';
      edgeBloomColor = 'rgba(180, 83, 9, ';
      exposureAlpha = 0.24 * intensity;
      tintAlpha = 0.17 * intensity;
      edgeAlpha = 0.10 * intensity;
    } else if (currentWeapon === 'chaingun') {
      coreColor = 'rgba(255, 248, 230, ';
      tintColor = 'rgba(245, 158, 11, ';
      edgeBloomColor = 'rgba(180, 83, 9, ';
      exposureAlpha = 0.14 * intensity;
      tintAlpha = 0.09 * intensity;
      edgeAlpha = 0.05 * intensity;
    } else if (currentWeapon === 'pistol') {
      coreColor = 'rgba(255, 252, 240, ';
      tintColor = 'rgba(251, 191, 36, ';
      edgeBloomColor = 'rgba(180, 83, 9, ';
      exposureAlpha = 0.16 * intensity;
      tintAlpha = 0.08 * intensity;
      edgeAlpha = 0.04 * intensity;
    }

    // Pass 1: Photographic Exposure Lift across viewport
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `${coreColor}${exposureAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, width, height);

    // Pass 2: Radial Discharge Color Temperature Grading (Discharge origin blooming into scene)
    const originX = width * 0.5;
    const originY = height * 0.88;
    const maxRadius = Math.max(width, height) * 1.05;

    const radialGrade = ctx.createRadialGradient(originX, originY, 15, originX, originY, maxRadius);
    radialGrade.addColorStop(0, `${tintColor}${tintAlpha.toFixed(3)})`);
    radialGrade.addColorStop(0.45, `${tintColor}${(tintAlpha * 0.55).toFixed(3)})`);
    radialGrade.addColorStop(1, `${edgeBloomColor}${edgeAlpha.toFixed(3)})`);

    ctx.fillStyle = radialGrade;
    ctx.fillRect(0, 0, width, height);

    // Pass 3: Subtle Optical Contrast Horizon Wash
    ctx.globalCompositeOperation = 'lighter';
    const horizonGrade = ctx.createLinearGradient(0, height * 0.35, 0, height);
    horizonGrade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    horizonGrade.addColorStop(1, `${coreColor}${(exposureAlpha * 0.45).toFixed(3)})`);
    ctx.fillStyle = horizonGrade;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  };

  // Render Weapon at Bottom Center with smooth sine-wave bobbing, recoil, and sway
  const renderWeaponViewmodel = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Normal weapons fade out during mutation sequence
    let weaponAlpha = 1.0;
    if (engine.isMutating) {
      if (engine.mutationTimer >= 14.5) {
        return; // Fully hidden once mutated claws emerge
      }
      if (engine.mutationTimer >= 11.0) {
        // Smooth fade out between 11.0s and 14.5s
        weaponAlpha = Math.max(0.0, 1.0 - (engine.mutationTimer - 11.0) / 3.5);
      }
    }

    ctx.save();
    ctx.globalAlpha = weaponAlpha;

    const textures = texturesRef.current;
    const currentWeapon = engine.player.currentWeapon;
    const canvases = textures.weaponCanvases[currentWeapon] || textures.weaponCanvases['pistol'];

    ctx.imageSmoothingEnabled = false;

    const isReloading = engine.player.reload.isReloading;
    const reloadProgress = isReloading && engine.player.reload.maxTimer > 0
      ? 1.0 - (engine.player.reload.timer / engine.player.reload.maxTimer)
      : 0;

    let frameIdx = 0;
    if (currentWeapon === 'fist') {
      frameIdx = Math.min(canvases.length - 1, engine.player.weaponAnim.frame);
    } else if (currentWeapon === 'shotgun') {
      if (isReloading) {
        frameIdx = reloadProgress < 0.55 ? 4 : 5; // Breach open & load slug -> slug seated & lock
      } else if (engine.player.weaponAnim.muzzleFlash) {
        frameIdx = 1;
      } else if (engine.player.weaponAnim.recoilY > 8) {
        frameIdx = 2; // Pump back & eject shell
      } else if (engine.player.weaponAnim.recoilY > 2) {
        frameIdx = 3; // Pump forward
      } else {
        frameIdx = 0;
      }
    } else if (currentWeapon === 'chaingun') {
      if (engine.player.weaponAnim.muzzleFlash || engine.player.isFiring) {
        frameIdx = (engine.player.weaponAnim.frame % 2) + 1;
      } else if (engine.player.weaponAnim.recoilY > 1) {
        frameIdx = 3; // Active coolant vent
      } else {
        frameIdx = 0;
      }
    } else if (currentWeapon === 'plasma') {
      if (isReloading) {
        frameIdx = reloadProgress < 0.5 ? 3 : 4; // Canopy open & pop core -> fresh core seated
      } else if (engine.player.weaponAnim.muzzleFlash) {
        frameIdx = 2; // Ion discharge blast
      } else if (engine.player.weaponAnim.shootFlashIntensity && engine.player.weaponAnim.shootFlashIntensity > 0.3) {
        frameIdx = 1; // Capacitor overcharge surge
      } else {
        frameIdx = 0;
      }
    } else {
      // Pistol
      if (isReloading) {
        frameIdx = reloadProgress < 0.5 ? 3 : 4; // Spent cell drop -> fresh cell locked
      } else if (engine.player.weaponAnim.muzzleFlash) {
        frameIdx = 1; // Slide blowback & ionized chamber
      } else if (engine.player.weaponAnim.recoilY > 2) {
        frameIdx = 2; // Slide return & recovery
      } else {
        frameIdx = 0;
      }
    }

    const img = canvases[frameIdx] || canvases[0];
    if (!img) return;

    // Smooth sine-wave walking bobbing with seamless deceleration and idle breathing
    const walkWeight = walkBobWeightRef.current;
    const walkPhase = walkBobPhaseRef.current;

    // Smooth horizontal sway (1 full cycle per 2 footsteps) and vertical dipping (2 dips per stride)
    const bobX = Math.sin(walkPhase) * 13 * walkWeight;
    const bobY = Math.abs(Math.sin(walkPhase * 2)) * 7.5 * walkWeight;

    // Subtle idle breathing sway when standing still
    const idleBreathX = Math.sin(engine.gameTime * 1.6) * 1.5 * (1.0 - walkWeight);
    const idleBreathY = Math.cos(engine.gameTime * 2.4) * 2.0 * (1.0 - walkWeight);

    // Natural weapon sway tilt along the stride
    const swayAngle = Math.sin(walkPhase) * 0.022 * walkWeight;

    // Dynamic Kinematic Reload Viewmodel Movement
    let reloadX = 0;
    let reloadY = 0;
    let reloadTilt = 0;
    if (isReloading) {
      if (reloadProgress < 0.45) {
        // Stage 1: Weapon dips downward & tilts inward to access chamber/magwell
        const p = reloadProgress / 0.45;
        reloadY = Math.sin(p * Math.PI * 0.5) * 36;
        reloadX = Math.sin(p * Math.PI * 0.5) * -16;
        reloadTilt = Math.sin(p * Math.PI * 0.5) * -0.09;
      } else if (reloadProgress < 0.72) {
        // Stage 2: Sharp mechanical slap upward impulse as new power cell/slug clicks in
        const p = (reloadProgress - 0.45) / 0.27;
        reloadY = 36 - Math.sin(p * Math.PI) * 22;
        reloadX = -16 + p * 12;
        reloadTilt = -0.09 + p * 0.05;
      } else {
        // Stage 3: Smooth return into neutral aim battery
        const p = (reloadProgress - 0.72) / 0.28;
        reloadY = (1 - p) * 14;
        reloadX = (1 - p) * -4;
        reloadTilt = (1 - p) * -0.04;
      }
    }

    // Weapon kickback recoil + Spring recoil physics displacement
    const recoilOffset = engine.player.weaponAnim.recoilY * 1.8;
    const recoilBumpOffset = (engine.player.weaponAnim.recoilBumpY || 0) * 0.6;
    const springRecoilOffset = (engine.player.weaponAnim.recoilPos || 0) * 1.2;

    // Viewmodel mouse inertia lag & strafe tilt
    const inertiaX = Math.max(-28, Math.min(28, -weaponSwayXRef.current * 0.35));
    const inertiaTilt = Math.max(-0.06, Math.min(0.06, -weaponSwayXRef.current * 0.0035 + strafeTiltRef.current));

    // Scale weapon so it looks sleek, centered, and cinematic
    const scale = (height / 320) * 0.82;
    const w = img.width * scale;
    const h = img.height * scale;
    const switchDip = (engine.player.weaponAnim.switchAnim || 0) * 55;

    // Melee Finisher kinematics: dip and push firearm away during cyber punch
    const isMeleeActive = !!(engine.player.meleeAnim && engine.player.meleeAnim.active);
    const meleeTimer = isMeleeActive ? engine.player.meleeAnim!.timer : 0;
    const meleeMaxTimer = isMeleeActive ? engine.player.meleeAnim!.maxTimer : 0.28;
    const meleeProgress = isMeleeActive ? Math.min(1.0, meleeTimer / meleeMaxTimer) : 0;
    const meleeGunDip = isMeleeActive && currentWeapon !== 'fist' ? Math.sin(meleeProgress * Math.PI) * 75 : 0;
    const meleeGunShiftX = isMeleeActive && currentWeapon !== 'fist' ? -Math.sin(meleeProgress * Math.PI) * 45 : 0;

    // Weapon Inspect Showcase Kinematics
    let inspectX = 0;
    let inspectY = 0;
    let inspectTilt = 0;
    if (engine.player.inspectAnim && engine.player.inspectAnim.active) {
      const p = Math.min(1.0, engine.player.inspectAnim.timer / engine.player.inspectAnim.maxTimer);
      const ease = Math.sin(p * Math.PI);
      inspectX = ease * -32;
      inspectY = ease * -16;
      inspectTilt = ease * -0.15;
    }

    const x = (width - w) / 2 + bobX + idleBreathX + reloadX + inertiaX + meleeGunShiftX + inspectX;
    const y = height - h + bobY + idleBreathY + recoilOffset + recoilBumpOffset + springRecoilOffset + reloadY + switchDip + meleeGunDip + inspectY + 10;

    ctx.save();
    const totalTilt = swayAngle + reloadTilt + inertiaTilt + inspectTilt;
    if (totalTilt !== 0) {
      ctx.translate(x + w / 2, y + h);
      ctx.rotate(totalTilt);
      ctx.translate(-(x + w / 2), -(y + h));
    }

    if (engine.player.berserkTimer > 0) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
    }

    // Draw Gun Base Sprite
    ctx.drawImage(img, x, y, w, h);

    // Diegetic Ammo Counters & Thermal Heat Overlays
    const weaponHeat = engine.player.weaponHeat || 0;
    if (currentWeapon === 'plasma') {
      // Receiver OLED ammo readout
      ctx.save();
      const oledX = x + w * 0.44;
      const oledY = y + h * 0.38;
      const curW = engine.player.weapons.plasma;
      const mag = curW ? curW.magazine : 0;
      const isLow = mag <= 5;
      
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(oledX - 16, oledY - 9, 32, 18);
      ctx.strokeStyle = isLow ? '#ef4444' : '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(oledX - 16, oledY - 9, 32, 18);

      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isLow ? '#ef4444' : '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText(mag.toString().padStart(2, '0'), oledX, oledY + 4);

      // Thermal coolant conduit glowing when hot
      if (weaponHeat > 15) {
        const heatAlpha = Math.min(1.0, weaponHeat / 80);
        ctx.fillStyle = `rgba(56, 189, 248, ${heatAlpha * 0.75})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillRect(x + w * 0.42, y + h * 0.28, w * 0.16, 3);
      }
      ctx.restore();
    } else if (currentWeapon === 'chaingun') {
      // Chaingun barrel heat incandescent glow
      if (weaponHeat > 15) {
        ctx.save();
        const heatNorm = Math.min(1.0, weaponHeat / 90);
        const barrelX = x + w * 0.48;
        const barrelY = y + h * 0.18;
        const heatGrad = ctx.createRadialGradient(barrelX, barrelY, 2, barrelX, barrelY, 24);
        if (heatNorm > 0.65) {
          heatGrad.addColorStop(0, `rgba(255, 255, 255, ${heatNorm * 0.85})`);
          heatGrad.addColorStop(0.35, `rgba(249, 115, 22, ${heatNorm * 0.75})`);
          heatGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          heatGrad.addColorStop(0, `rgba(249, 115, 22, ${heatNorm * 0.75})`);
          heatGrad.addColorStop(0.5, `rgba(220, 38, 38, ${heatNorm * 0.45})`);
          heatGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
        }
        ctx.fillStyle = heatGrad;
        ctx.beginPath();
        ctx.arc(barrelX, barrelY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (currentWeapon === 'shotgun') {
      // Shotgun side shell carrier indicator
      ctx.save();
      const shellHolderX = x + w * 0.36;
      const shellHolderY = y + h * 0.52;
      const curW = engine.player.weapons.shotgun;
      const loadedShells = curW ? Math.min(6, curW.magazine) : 0;
      for (let s = 0; s < 6; s++) {
        const sx = shellHolderX + s * 6;
        ctx.fillStyle = s < loadedShells ? '#dc2626' : '#334155';
        ctx.fillRect(sx, shellHolderY, 4.5, 9);
        if (s < loadedShells) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(sx, shellHolderY, 4.5, 2.5); // Brass base
        }
      }
      ctx.restore();
    }

    // Holographic Reload Status Readout Floating Near Weapon
    if (isReloading) {
      ctx.save();
      const holoX = x + w * 0.5;
      const holoY = Math.max(20, y + h * 0.28);
      const holoColor = currentWeapon === 'shotgun' ? '#f97316' : currentWeapon === 'plasma' ? '#38bdf8' : '#06b6d4';
      
      // Floating translucent HUD plate
      ctx.fillStyle = currentWeapon === 'shotgun'
        ? 'rgba(234, 88, 12, 0.18)'
        : currentWeapon === 'plasma'
        ? 'rgba(6, 182, 212, 0.22)'
        : 'rgba(6, 182, 212, 0.16)';
      ctx.beginPath();
      ctx.roundRect(holoX - 64, holoY - 14, 128, 26, 4);
      ctx.fill();
      ctx.strokeStyle = holoColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Progress bar track
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(holoX - 56, holoY + 3, 112, 5);
      
      // Active fill
      const fillW = Math.min(112, Math.max(0, reloadProgress * 112));
      ctx.fillStyle = holoColor;
      ctx.fillRect(holoX - 56, holoY + 3, fillW, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(holoX - 56, holoY + 3, fillW * 0.7, 1.5);

      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = holoColor;
      ctx.textAlign = 'center';
      const pct = Math.floor(reloadProgress * 100);
      let reloadMsg = `MAG CYCLE: ${pct}%`;
      if (currentWeapon === 'plasma') {
        if (reloadProgress < 0.3) {
          reloadMsg = `CORE PURGE: ${pct}%`;
        } else if (reloadProgress < 0.75) {
          reloadMsg = `ION MATRIX: ${pct}%`;
        } else {
          reloadMsg = `QUANTUM LOCK: ${pct}%`;
        }
      } else if (currentWeapon === 'shotgun') {
        reloadMsg = reloadProgress < 0.55 ? `BREACH LOAD: ${pct}%` : `SLUG SEATED: ${pct}%`;
      }
      ctx.fillText(reloadMsg, holoX, holoY - 2);
      ctx.restore();
    } else if (currentWeapon === 'chaingun' && (engine.player.chaingunOverheat?.isOverheated || (engine.player.chaingunOverheat?.shotsFired || 0) > 35)) {
      // Holographic Chaingun Overheat / Thermal Warning Floating Plate
      ctx.save();
      const holoX = x + w * 0.5;
      const holoY = Math.max(20, y + h * 0.28);
      const isOver = !!engine.player.chaingunOverheat?.isOverheated;
      const holoColor = isOver ? '#ef4444' : '#f97316';

      ctx.fillStyle = isOver ? 'rgba(239, 68, 68, 0.22)' : 'rgba(249, 115, 22, 0.16)';
      ctx.beginPath();
      ctx.roundRect(holoX - 68, holoY - 14, 136, 26, 4);
      ctx.fill();
      ctx.strokeStyle = holoColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Progress bar track
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(holoX - 58, holoY + 3, 116, 5);

      // Active fill
      const coolRatio = isOver
        ? (engine.player.chaingunOverheat!.cooldownTimer / engine.player.chaingunOverheat!.maxCooldown)
        : ((engine.player.chaingunOverheat?.shotsFired || 0) / 50);
      const fillW = Math.min(116, Math.max(0, coolRatio * 116));
      ctx.fillStyle = holoColor;
      ctx.fillRect(holoX - 58, holoY + 3, fillW, 5);

      ctx.font = 'bold 8.5px monospace';
      ctx.fillStyle = holoColor;
      ctx.textAlign = 'center';
      const msg = isOver
        ? `⚠️ OVERHEAT: ${engine.player.chaingunOverheat!.cooldownTimer.toFixed(1)}s`
        : `🔥 BARREL HEAT: ${engine.player.chaingunOverheat?.shotsFired || 0}/50`;
      ctx.fillText(msg, holoX, holoY - 2);
      ctx.restore();
    }

    // Subtle localized specular glow at the muzzle crown (clean, realistic, no flashy star particles)
    if (currentWeapon !== 'fist' && (engine.player.weaponAnim.muzzleFlash || (engine.player.weaponAnim.shootFlashIntensity && engine.player.weaponAnim.shootFlashIntensity > 0.08))) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const intensity = Math.min(1.0, (engine.player.weaponAnim.shootFlashIntensity || 0.35) * 1.5);
      
      let muzzleTipFraction = 0.24;
      if (currentWeapon === 'shotgun') muzzleTipFraction = 0.14;
      else if (currentWeapon === 'chaingun') muzzleTipFraction = 0.12;
      else if (currentWeapon === 'plasma') muzzleTipFraction = 0.12;
      else if (currentWeapon === 'pistol') muzzleTipFraction = 0.24;

      const muzzleX = x + w * 0.5;
      const muzzleY = y + h * muzzleTipFraction;

      const crownRadius = currentWeapon === 'chaingun' 
        ? Math.min(14, w * 0.07) 
        : (currentWeapon === 'shotgun' ? Math.min(24, w * 0.11) : Math.min(18, w * 0.09));

      // Tight, realistic specular barrel heat / gas combustion bloom
      const crownGrad = ctx.createRadialGradient(muzzleX, muzzleY, 1, muzzleX, muzzleY, crownRadius);
      if (currentWeapon === 'plasma') {
        crownGrad.addColorStop(0, `rgba(224, 242, 254, ${0.80 * intensity})`);
        crownGrad.addColorStop(0.4, `rgba(56, 189, 248, ${0.45 * intensity})`);
        crownGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      } else {
        crownGrad.addColorStop(0, `rgba(255, 252, 235, ${0.85 * intensity})`);
        crownGrad.addColorStop(0.4, `rgba(245, 158, 11, ${0.45 * intensity})`);
        crownGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.arc(muzzleX, muzzleY, crownRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.restore();

    // Cybernetic Melee Gauntlet Viewmodel Overlay (Glory Finisher / Quick Melee)
    if (isMeleeActive && currentWeapon !== 'fist') {
      const fistCanvases = textures.weaponCanvases['fist'];
      if (fistCanvases && fistCanvases.length > 0) {
        const punchFrame = engine.player.meleeAnim!.frame || 1;
        const fistImg = fistCanvases[punchFrame] || fistCanvases[1];

        // Dynamic punch arc: lunges from lower-right across screen toward target
        const punchEase = Math.sin(meleeProgress * Math.PI);
        const fistScale = scale * (1.15 + punchEase * 0.25);
        const fistW = fistImg.width * fistScale;
        const fistH = fistImg.height * fistScale;
        const fistX = (width - fistW) / 2 + (1.0 - punchEase) * 60;
        const fistY = height - fistH * 0.95 - punchEase * 55;

        ctx.save();
        if (engine.player.meleeAnim!.isFinisher) {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 24;
        } else {
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 12;
        }

        ctx.drawImage(fistImg, fistX, fistY, fistW, fistH);

        // Golden shockwave ring on lethal finisher impact
        if (engine.player.meleeAnim!.isFinisher && meleeProgress > 0.25 && meleeProgress < 0.75) {
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2 + 30, (meleeProgress - 0.25) * 160, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  };

  const boss = engine.mapData.enemies.find(e => e.type === 'boss');
  const bossHpPct = boss ? boss.health / boss.maxHealth : 0;

  return (
    <div
      ref={containerRef}
      id="game-viewport-container"
      className="relative w-full h-full flex flex-col items-center justify-between bg-black select-none overflow-hidden cursor-default"
      onClick={requestPointerLock}
    >
      {/* 3D Raycasting Viewport Area */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          id="raycaster-canvas"
          width={Math.round(960 * (settings.renderResolution || 1))}
          height={Math.round(540 * (settings.renderResolution || 1))}
          className={`w-full h-full object-cover ${engine.player.screenShake > 4 ? 'screen-shake' : ''}`}
          style={{
            transformOrigin: 'center center',
            imageRendering: (settings.renderResolution || 1) < 1 ? 'pixelated' : 'auto',
          }}
        />

        {/* CRT Scanline & Color Vignette Overlay */}
        <div className="absolute inset-0 crt-overlay pointer-events-none" />

        {/* Optical Muzzle Discharge Screen-Space Color-Grading Flicker Overlay */}
        {engine.player.weaponAnim.shootFlashIntensity && engine.player.weaponAnim.shootFlashIntensity > 0.02 && engine.player.currentWeapon !== 'fist' && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-30"
            style={{
              backgroundColor: engine.player.currentWeapon === 'plasma'
                ? `rgba(56, 189, 248, ${(engine.player.weaponAnim.shootFlashIntensity * 0.10).toFixed(3)})`
                : engine.player.currentWeapon === 'shotgun'
                ? `rgba(249, 115, 22, ${(engine.player.weaponAnim.shootFlashIntensity * 0.12).toFixed(3)})`
                : engine.player.currentWeapon === 'chaingun'
                ? `rgba(245, 158, 11, ${(engine.player.weaponAnim.shootFlashIntensity * 0.08).toFixed(3)})`
                : `rgba(251, 191, 36, ${(engine.player.weaponAnim.shootFlashIntensity * 0.07).toFixed(3)})`,
              mixBlendMode: 'screen',
              boxShadow: engine.player.currentWeapon === 'plasma'
                ? `inset 0 0 ${Math.round(engine.player.weaponAnim.shootFlashIntensity * 70)}px rgba(186, 230, 253, ${(engine.player.weaponAnim.shootFlashIntensity * 0.22).toFixed(2)})`
                : `inset 0 0 ${Math.round(engine.player.weaponAnim.shootFlashIntensity * 60)}px rgba(254, 240, 138, ${(engine.player.weaponAnim.shootFlashIntensity * 0.18).toFixed(2)})`,
            }}
          />
        )}

        {/* Damage Vignette Flash (Red on Hurt) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-75"
          style={{
            boxShadow: `inset 0 0 ${Math.round(engine.player.damageFlash * 120)}px rgba(220, 38, 38, ${engine.player.damageFlash})`,
            backgroundColor: `rgba(220, 38, 38, ${engine.player.damageFlash * 0.25})`,
          }}
        />

        {/* Heal Vignette Flash (Green on Pickup) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-75"
          style={{
            boxShadow: `inset 0 0 ${Math.round(engine.player.healFlash * 100)}px rgba(34, 197, 94, ${engine.player.healFlash})`,
          }}
        />

        {/* Berserk Rage Red Ambient Glow */}
        {engine.player.berserkTimer > 0 && (
          <div className="absolute inset-0 pointer-events-none bg-red-600/15 animate-pulse shadow-[inset_0_0_100px_rgba(239,68,68,0.4)]" />
        )}

        {/* Dash Speed Lines Overlay */}
        {engine.player.dash.active && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-cyan-500/10 backdrop-blur-[1px]">
            <div className="w-full h-full border-4 border-cyan-400/40 animate-ping" />
          </div>
        )}

        {/* Glory Kill Screen-Splatter & Dripping Gore Overlay */}
        {engine.glorySplatters.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-15 overflow-hidden"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="gore-blur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {engine.glorySplatters.map((drop) => {
              const cx = drop.x * 1000;
              const cy = drop.y * 600;
              const r = drop.size * 1.1;
              const dripLen = drop.length * (drop.dripProgress || 0);
              const dripY = cy + dripLen;
              const dripRadius = Math.max(2, r * 0.45 * (1 - drop.dripProgress * 0.3));

              return (
                <g key={drop.id} opacity={Math.max(0, Math.min(1, drop.opacity))} filter="url(#gore-blur)">
                  {/* Drip trail tendril running downwards */}
                  {dripLen > 3 && (
                    <path
                      d={`M ${cx - r * 0.35} ${cy} Q ${cx - dripRadius * 0.5} ${cy + dripLen * 0.6} ${cx - dripRadius} ${dripY} A ${dripRadius} ${dripRadius} 0 0 0 ${cx + dripRadius} ${dripY} Q ${cx + dripRadius * 0.5} ${cy + dripLen * 0.6} ${cx + r * 0.35} ${cy} Z`}
                      fill={drop.color}
                    />
                  )}

                  {/* Satellite droplets */}
                  {drop.satellites.map((sat, idx) => (
                    <circle
                      key={idx}
                      cx={cx + sat.dx}
                      cy={cy + sat.dy}
                      r={sat.r}
                      fill={drop.color}
                    />
                  ))}

                  {/* Main impact globule */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={drop.color}
                  />

                  {/* Inner viscera core */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r * 0.65}
                    fill={drop.color}
                    opacity="0.85"
                  />

                  {/* Wet specular light reflection arc */}
                  <ellipse
                    cx={cx - r * 0.3}
                    cy={cy - r * 0.3}
                    rx={r * 0.28}
                    ry={r * 0.16}
                    transform={`rotate(-25 ${cx - r * 0.3} ${cy - r * 0.3})`}
                    fill={drop.highlightColor}
                    opacity="0.75"
                  />

                  {/* Dripping tip specular highlight */}
                  {dripLen > 8 && (
                    <circle
                      cx={cx - dripRadius * 0.25}
                      cy={dripY - dripRadius * 0.25}
                      r={Math.max(1, dripRadius * 0.35)}
                      fill={drop.highlightColor}
                      opacity="0.65"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Top Status Pill: Compact, sleek status bar (Lockdown > Wave > Safe Zone) */}
        {engine.isLockdown ? (
          <div id="lockdown-banner" className="absolute top-3 inset-x-0 mx-auto max-w-sm px-3.5 py-1 bg-red-950/90 border border-red-500 rounded-full shadow-lg flex items-center justify-center gap-2 animate-pulse pointer-events-none z-20">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] font-pixel font-bold text-red-300 tracking-wider truncate">
              BOSS ARENA LOCKDOWN: TITAN DETECTED
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          </div>
        ) : engine.waveBanner ? (
          <div id="wave-banner" className="absolute top-3 inset-x-0 mx-auto max-w-sm px-3.5 py-1 bg-neutral-950/90 border border-amber-500/80 rounded-full shadow-lg flex items-center justify-center gap-2 pointer-events-none animate-pulse z-20">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-pixel font-bold text-amber-300 tracking-wider truncate">
              {engine.waveBanner}
            </span>
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
        ) : engine.inNeutralZone || engine.airlockState === 'closed' || engine.airlockState === 'decompressing' ? (
          <div id="neutral-zone-banner" className="absolute top-3 inset-x-0 mx-auto max-w-xs px-3.5 py-1 bg-cyan-950/90 border border-cyan-500/70 rounded-full shadow-lg flex items-center justify-center gap-2 pointer-events-none animate-pulse z-20">
            <span className="text-[10px] font-pixel font-bold text-cyan-300 tracking-wider truncate">
              {engine.airlockState === 'closed'
                ? '🛡️ SAFE ROOM: STAGING PHASE'
                : engine.airlockState === 'decompressing'
                ? `⚠️ AIRLOCK DECOMPRESSING: ${engine.airlockTimer.toFixed(1)}s`
                : engine.airlockSealed
                ? '🛑 QUARANTINE: PERMANENTLY SEALED'
                : '🛡️ SAFE ROOM: AIRLOCK OPEN'}
            </span>
          </div>
        ) : null}

        {/* Glory Kill Melee Finisher Interaction Prompt - Restricted to vulnerable smaller enemies in close melee range */}
        {engine.mapData.enemies.some(e => {
          if (e.health <= 0) return false;
          const isSmall = !e.isElite && !e.isUltraBoss && e.type !== 'boss' && e.type !== 'baron' &&
            (e.type === 'grunt' || e.type === 'imp' || e.type === 'scuttler' || e.type === 'lost_soul');
          if (!isSmall) return false;
          const dist = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
          if (dist > 2.2) return false;
          const isVulnerable = e.state === 'staggered' || e.health <= e.maxHealth * 0.35 || e.health <= 25;
          if (!isVulnerable) return false;
          const dx = e.x - engine.player.x;
          const dy = e.y - engine.player.y;
          let angleDiff = Math.abs(Math.atan2(dy, dx) - engine.player.angle);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
          return angleDiff <= 1.3;
        }) && (
          <div id="glorykill-prompt" className="absolute bottom-28 inset-x-0 mx-auto max-w-sm px-4 py-1.5 bg-amber-950/95 border-2 border-amber-500 rounded-full text-center pointer-events-none animate-pulse z-20 shadow-[0_0_25px_rgba(245,158,11,0.95)]">
            <span className="text-[11px] sm:text-xs font-pixel text-amber-300 font-extrabold tracking-wider">
              ⚡ PRESS [{settings.keyBindings.gloryKill ? settings.keyBindings.gloryKill.replace('Key', '').replace('Digit', 'NUM ') : 'F'}] FOR MELEE FINISHER! ⚡
            </span>
          </div>
        )}

        {/* Chest Interaction Prompt */}
        {engine.mapData.chests?.some(c => !c.opened && Math.hypot(c.x - engine.player.x, c.y - engine.player.y) < 1.85) && (
          <div id="chest-prompt" className="absolute bottom-24 inset-x-0 mx-auto max-w-xs px-3 py-1 bg-neutral-950/95 border border-amber-400 rounded-full text-center pointer-events-none animate-pulse z-20 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            <span className="text-[11px] font-pixel text-amber-300 font-bold">
              📦 PRESS [E] TO OPEN SUPPLY CHEST
            </span>
          </div>
        )}

        {/* Safe Staging Zone Airlock Console / Button Interaction Prompt */}
        {engine.airlockState === 'closed' && (
          <div id="airlock-prompt" className="absolute bottom-24 inset-x-0 mx-auto max-w-sm px-4 py-1.5 bg-emerald-950/95 border-2 border-emerald-400 rounded-full text-center pointer-events-none animate-pulse z-20 shadow-[0_0_20px_rgba(16,185,129,0.7)]">
            <span className="text-[11px] sm:text-xs font-pixel text-emerald-300 font-bold tracking-wide">
              🛡️ AIRLOCK CONSOLE // PRESS [E] TO DECOMPRESS & START LEVEL
            </span>
          </div>
        )}

        {engine.airlockState === 'decompressing' && (
          <div id="airlock-decompressing-prompt" className="absolute bottom-24 inset-x-0 mx-auto max-w-sm px-4 py-1.5 bg-amber-950/95 border-2 border-amber-400 rounded-full text-center pointer-events-none animate-pulse z-20 shadow-[0_0_20px_rgba(245,158,11,0.7)]">
            <span className="text-[11px] sm:text-xs font-pixel text-amber-300 font-bold tracking-wide">
              ⚠️ DECOMPRESSING AIRLOCK CHAMBER... [{engine.airlockTimer.toFixed(1)}s]
            </span>
          </div>
        )}

        {engine.airlockState === 'open' && !engine.airlockSealed && (
          <div id="airlock-open-prompt" className="absolute bottom-24 inset-x-0 mx-auto max-w-sm px-4 py-1.5 bg-cyan-950/95 border border-cyan-400 rounded-full text-center pointer-events-none animate-pulse z-20 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <span className="text-[11px] sm:text-xs font-pixel text-cyan-300 font-bold tracking-wide">
              🚪 BLAST DOORS OPEN // PROCEED INTO COMBAT SECTOR
            </span>
          </div>
        )}

        {/* Chrono-Haste Relic Temporal Overdrive Active Banner */}
        {Boolean(engine.player.infiniteDashTimer && engine.player.infiniteDashTimer > 0) && (
          <div id="chrono-haste-badge" className="absolute top-16 inset-x-0 mx-auto max-w-xs px-3.5 py-1 bg-cyan-950/90 border border-cyan-400 rounded-full text-center pointer-events-none animate-pulse z-30 shadow-[0_0_18px_rgba(56,189,248,0.6)]">
            <span className="text-[11px] font-pixel text-cyan-300 font-bold tracking-wide">
              ⚡ CHRONO-HASTE: {engine.player.infiniteDashTimer?.toFixed(1)}s (ZERO CD DASH)
            </span>
          </div>
        )}

        {/* Top Right: Score & Adrenaline Streak Badge */}
        <div id="score-badge" className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 pointer-events-none flex flex-col items-end gap-1 font-pixel">
          <div className="px-3 py-1 bg-neutral-950/90 border border-amber-500/80 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] sm:text-xs font-bold text-amber-300 tracking-wider">
              SCORE: <span className="text-white">{engine.stats.score.toLocaleString()}</span>
            </span>
          </div>
          {engine.combo.multiplier > 1 && (
            <div className="px-2.5 py-0.5 bg-red-950/90 border border-red-500 rounded-full text-[10px] text-red-300 font-bold animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              🔥 {engine.combo.multiplier}x MULTIPLIER ({engine.combo.count} KILLS)
            </div>
          )}
        </div>

        {/* Top Left: Tactical Minimap & Automap Overlay */}
        {settings.showMinimap ? (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 pointer-events-auto">
            <Minimap
              engine={engine}
              isExpanded={isAutomapOpen}
              onToggleExpand={() => setIsAutomapOpen((prev) => !prev)}
              onCloseExpand={() => setIsAutomapOpen(false)}
              onToggleVisibility={onToggleMinimap}
            />
          </div>
        ) : (
          <button
            id="show-minimap-btn"
            onClick={onToggleMinimap}
            className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30 px-2 py-1 bg-black/85 hover:bg-neutral-900 border border-cyan-700/60 hover:border-cyan-400 rounded text-[10px] font-mono-tech text-cyan-400 flex items-center gap-1.5 shadow-lg cursor-pointer transition-all pointer-events-auto"
            title="Enable Tactical Radar (Key M)"
          >
            <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
            <span>RADAR [M]</span>
          </button>
        )}

        {/* If Minimap HUD is hidden but user presses Tab to open full Automap */}
        {!settings.showMinimap && isAutomapOpen && (
          <Minimap
            engine={engine}
            isExpanded={true}
            onCloseExpand={() => setIsAutomapOpen(false)}
          />
        )}

        {/* Retro Sector Debriefing Telemetry Modal */}
        {engine.levelTransition.active && engine.levelTransition.isDebriefWaiting && (
          <SectorDebriefModal
            transition={engine.levelTransition}
            onProceed={() => {
              engine.confirmLevelTransition();
            }}
          />
        )}

        {/* Level Transition Dimensional Warp Overlay */}
        {engine.levelTransition.active && !engine.levelTransition.isDebriefWaiting && (
          <div id="level-transition-overlay" className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center pointer-events-none animate-fade-in">
            <div className="max-w-md w-full p-6 bg-red-950/80 border-2 border-amber-500 rounded-lg shadow-[0_0_40px_rgba(245,158,11,0.5)] flex flex-col items-center space-y-4">
              <div className="text-[10px] font-mono-tech uppercase tracking-widest text-emerald-400 font-bold animate-pulse">
                DIMENSIONAL TELEPORT MATRIX ENGAGED
              </div>
              <h2 className="text-2xl sm:text-3xl font-pixel font-black text-amber-400 tracking-wider">
                {engine.levelTransition.stageName}
              </h2>
              <p className="text-xs font-pixel text-red-400 font-bold animate-bounce">
                WARPING TO NEXT SECTOR...
              </p>
              <div className="w-full h-2.5 bg-neutral-900 border border-amber-500/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-75"
                  style={{
                    width: `${Math.min(100, Math.max(0, (1 - engine.levelTransition.timer / engine.levelTransition.maxTimer) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Hitmarker Flash Only (No Crosshair) */}
        {hitmarker && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-red-500 rounded-full animate-ping shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
          </div>
        )}

        {/* Top-Right Tactical Feed / Combat Log Notifications */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col items-end space-y-1.5 pointer-events-none z-30 max-w-xs">
          {engine.floatingTexts.filter(t => !t.isWorld).slice(-4).map((ft) => (
            <div
              key={ft.id}
              className="px-2.5 py-1 bg-black/85 border border-amber-500/50 rounded text-right shadow-md transition-all backdrop-blur-xs flex items-center gap-1.5"
              style={{ opacity: Math.min(1, ft.alpha) }}
            >
              <span className="font-pixel text-[11px] text-amber-300 font-bold tracking-wide">
                {ft.text}
              </span>
            </div>
          ))}
        </div>

        {/* Gamepad Connection Notification Toast */}
        {gamepadNotification && (
          <div id="gamepad-notification-toast" className="absolute top-16 inset-x-0 mx-auto max-w-sm px-4 py-2 bg-neutral-950/95 border-2 border-emerald-500/80 rounded-lg shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center gap-3 z-50 animate-bounce">
            <Gamepad2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-left truncate">
              <div className="font-pixel text-[10px] text-emerald-300 font-bold uppercase">
                {gamepadNotification.type === 'connected' ? 'CONTROLLER CONNECTED' : 'CONTROLLER DISCONNECTED'}
              </div>
              <div className="text-xs text-gray-200 font-mono-tech truncate">
                {gamepadNotification.name}
              </div>
            </div>
          </div>
        )}

        {/* Pointer Lock Prompt (When not locked and not actively using controller) */}
        {!isPointerLocked && !isGamepadConnected && !engine.isGameOver && !engine.isVictory && !engine.isPaused && !engine.isMutating && (
          <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
            <div className="p-4 bg-red-950/80 border-2 border-red-600 rounded-lg shadow-2xl max-w-sm">
              <h3 className="text-lg font-pixel text-red-500 font-bold mb-2">KILL-O-METER</h3>
              <p className="text-xs font-mono-tech text-gray-300 mb-4">
                Click anywhere inside the arena to lock mouse cursor, or connect a Gamepad to play immediately.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestPointerLock();
                }}
                className="w-full py-3 px-6 bg-red-600 hover:bg-red-500 text-black font-pixel text-xs font-bold rounded shadow-[0_0_15px_#dc2626] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" /> ENTER THE SLAUGHTER
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Classic DOOM HUD */}
      <div className="w-full flex-shrink-0 z-20">
        <DoomHud
          player={engine.player}
          combo={engine.combo}
          killOMeter={engine.killOMeter}
          levelKills={engine.levelKills}
          requiredKills={engine.requiredKills}
          totalLevelEnemies={engine.totalLevelEnemies}
          isLockdown={engine.isLockdown}
          boss={engine.boss}
          bossHpPct={bossHpPct}
          isTakingDamage={engine.player.damageFlash > 0.3}
          lookDirection={lookDirection}
          stage={engine.currentStage}
          totalStages={engine.totalStages}
          stageName={engine.mapData.stageName}
          onSwitchWeapon={(slot) => {
            const types: ('fist' | 'pistol' | 'shotgun' | 'chaingun' | 'plasma')[] = [
              'fist',
              'pistol',
              'shotgun',
              'chaingun',
              'plasma',
            ];
            engine.switchWeapon(types[slot - 1]);
          }}
        />
      </div>
    </div>
  );
};
