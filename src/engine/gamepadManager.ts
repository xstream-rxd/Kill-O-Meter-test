export interface GamepadState {
  connected: boolean;
  id: string;
  name: string;
  controllerType: 'xbox' | 'playstation' | 'nintendo' | 'generic';
  
  // Analog axes (-1 to 1)
  moveX: number; // Strafe: -1 (left) to 1 (right)
  moveY: number; // Forward/Back: 1 (forward) to -1 (backward)
  lookX: number; // Yaw turn: -1 (left) to 1 (right)
  lookY: number; // Pitch look: -1 (down) to 1 (up)

  // Actions (held vs just pressed)
  fire: boolean;
  justFire: boolean;
  dash: boolean;
  justDash: boolean;
  interact: boolean;
  justInteract: boolean;
  reload: boolean;
  justReload: boolean;
  gloryKill: boolean;
  justGloryKill: boolean;
  inspect: boolean;
  justInspect: boolean;

  // Weapon cycling / Direct slot selection
  nextWeapon: boolean;
  justNextWeapon: boolean;
  prevWeapon: boolean;
  justPrevWeapon: boolean;
  directWeaponSlot: number | null; // 1 to 5

  // Navigation & System
  pause: boolean;
  justPause: boolean;
  automap: boolean;
  justAutomap: boolean;
  minimap: boolean;
  justMinimap: boolean;

  // Menu navigation helpers (discrete pulses)
  menuUp: boolean;
  menuDown: boolean;
  menuLeft: boolean;
  menuRight: boolean;
  menuConfirm: boolean;
  menuCancel: boolean;
}

export interface GamepadNotification {
  id: string;
  type: 'connected' | 'disconnected';
  name: string;
  timestamp: number;
}

export class GamepadManager {
  private static instance: GamepadManager | null = null;

  private prevButtonStates: Record<number, boolean> = {};
  private menuNavCooldown = 0;
  private activeGamepadIndex: number | null = null;
  private notificationListeners: ((notification: GamepadNotification) => void)[] = [];
  private lastNotification: GamepadNotification | null = null;

  public static getInstance(): GamepadManager {
    if (!GamepadManager.instance) {
      GamepadManager.instance = new GamepadManager();
    }
    return GamepadManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
        this.activeGamepadIndex = e.gamepad.index;
        const info = this.parseGamepadInfo(e.gamepad);
        this.dispatchNotification({
          id: e.gamepad.id,
          type: 'connected',
          name: info.name,
          timestamp: performance.now(),
        });
        // Short greeting rumble on connection
        this.vibrate(150, 0.4, 0.4);
      });

      window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
        const info = this.parseGamepadInfo(e.gamepad);
        this.dispatchNotification({
          id: e.gamepad.id,
          type: 'disconnected',
          name: info.name,
          timestamp: performance.now(),
        });
        if (this.activeGamepadIndex === e.gamepad.index) {
          this.activeGamepadIndex = null;
        }
      });
    }
  }

  public onNotification(listener: (notification: GamepadNotification) => void): () => void {
    this.notificationListeners.push(listener);
    if (this.lastNotification && performance.now() - this.lastNotification.timestamp < 4000) {
      listener(this.lastNotification);
    }
    return () => {
      this.notificationListeners = this.notificationListeners.filter((l) => l !== listener);
    };
  }

  private dispatchNotification(notification: GamepadNotification) {
    this.lastNotification = notification;
    this.notificationListeners.forEach((listener) => {
      try {
        listener(notification);
      } catch {
        // Safe absorb
      }
    });
  }

  private parseGamepadInfo(gamepad: Gamepad): { name: string; type: 'xbox' | 'playstation' | 'nintendo' | 'generic' } {
    const idLower = (gamepad.id || '').toLowerCase();
    if (idLower.includes('playstation') || idLower.includes('dualshock') || idLower.includes('dualsense') || idLower.includes('ps4') || idLower.includes('ps5') || idLower.includes('054c')) {
      return { name: 'PlayStation DualShock / DualSense', type: 'playstation' };
    }
    if (idLower.includes('xbox') || idLower.includes('x-box') || idLower.includes('microsoft') || idLower.includes('045e') || idLower.includes('xinput')) {
      return { name: 'Xbox Controller', type: 'xbox' };
    }
    if (idLower.includes('nintendo') || idLower.includes('switch') || idLower.includes('pro controller') || idLower.includes('joy-con') || idLower.includes('057e')) {
      return { name: 'Nintendo Switch Controller', type: 'nintendo' };
    }
    return { name: gamepad.id ? gamepad.id.slice(0, 32) : 'Standard Game Controller', type: 'generic' };
  }

  /**
   * Applies deadzone filtering and polynomial curve response for natural analog control
   */
  private applyDeadzone(value: number, deadzone: number, exponent = 1.6): number {
    const absVal = Math.abs(value);
    if (absVal <= deadzone) return 0;
    const scaled = (absVal - deadzone) / (1.0 - deadzone);
    const curved = Math.pow(Math.min(1.0, scaled), exponent);
    return value < 0 ? -curved : curved;
  }

  /**
   * Polls currently connected gamepad and computes smooth inputs
   */
  public poll(options?: {
    deadzone?: number;
    invertY?: boolean;
    dt?: number;
  }): GamepadState {
    const deadzone = options?.deadzone ?? 0.15;
    const invertY = options?.invertY ?? false;
    const dt = options?.dt ?? 0.016;

    const defaultState: GamepadState = {
      connected: false,
      id: '',
      name: 'No Controller',
      controllerType: 'generic',
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      fire: false,
      justFire: false,
      dash: false,
      justDash: false,
      interact: false,
      justInteract: false,
      reload: false,
      justReload: false,
      gloryKill: false,
      justGloryKill: false,
      inspect: false,
      justInspect: false,
      nextWeapon: false,
      justNextWeapon: false,
      prevWeapon: false,
      justPrevWeapon: false,
      directWeaponSlot: null,
      pause: false,
      justPause: false,
      automap: false,
      justAutomap: false,
      minimap: false,
      justMinimap: false,
      menuUp: false,
      menuDown: false,
      menuLeft: false,
      menuRight: false,
      menuConfirm: false,
      menuCancel: false,
    };

    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') {
      return defaultState;
    }

    const gamepads = navigator.getGamepads();
    let activeGamepad: Gamepad | null = null;

    if (this.activeGamepadIndex !== null && gamepads[this.activeGamepadIndex]) {
      activeGamepad = gamepads[this.activeGamepadIndex];
    } else {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i]!.connected) {
          activeGamepad = gamepads[i];
          this.activeGamepadIndex = i;
          break;
        }
      }
    }

    if (!activeGamepad || !activeGamepad.connected) {
      this.prevButtonStates = {};
      return defaultState;
    }

    const info = this.parseGamepadInfo(activeGamepad);
    const buttons = activeGamepad.buttons;
    const axes = activeGamepad.axes;

    // Helper to test button press / trigger analog threshold
    const isBtnPressed = (idx: number, analogThreshold = 0.35): boolean => {
      if (!buttons[idx]) return false;
      return buttons[idx].pressed || buttons[idx].value > analogThreshold;
    };

    const isBtnJustPressed = (idx: number, analogThreshold = 0.35): boolean => {
      const current = isBtnPressed(idx, analogThreshold);
      const prev = !!this.prevButtonStates[idx];
      return current && !prev;
    };

    // Standard Gamepad Mapping:
    // Axes:
    // 0: Left Stick X (-1 Left, +1 Right)
    // 1: Left Stick Y (-1 Up, +1 Down)
    // 2: Right Stick X (-1 Left, +1 Right)
    // 3: Right Stick Y (-1 Up, +1 Down)
    // Buttons:
    // 0: A / Cross
    // 1: B / Circle
    // 2: X / Square
    // 3: Y / Triangle
    // 4: LB / L1 (Left Bumper)
    // 5: RB / R1 (Right Bumper)
    // 6: LT / L2 (Left Trigger)
    // 7: RT / R2 (Right Trigger)
    // 8: Back / Select / Share / Touchpad
    // 9: Start / Options / Menu
    // 10: L3 (Left Stick Click)
    // 11: R3 (Right Stick Click)
    // 12: D-Pad Up
    // 13: D-Pad Down
    // 14: D-Pad Left
    // 15: D-Pad Right

    const rawMoveX = axes.length > 0 ? axes[0] : 0;
    const rawMoveY = axes.length > 1 ? axes[1] : 0;
    const rawLookX = axes.length > 2 ? axes[2] : 0;
    const rawLookY = axes.length > 3 ? axes[3] : 0;

    // Left Stick (Movement) with D-Pad fallback
    let moveX = this.applyDeadzone(rawMoveX, deadzone, 1.0);
    let moveY = -this.applyDeadzone(rawMoveY, deadzone, 1.0); // Invert Y so up (+1) is forward

    // Right Stick (Aim / Look) with smooth polynomial curve
    const lookX = this.applyDeadzone(rawLookX, deadzone, 1.7);
    let lookY = -this.applyDeadzone(rawLookY, deadzone, 1.7); // Invert Y so up (+1) looks up
    if (invertY) {
      lookY = -lookY;
    }

    // Actions
    const fire = isBtnPressed(7, 0.25); // RT (Right Trigger)
    const justFire = isBtnJustPressed(7, 0.25);

    const dash = isBtnPressed(6, 0.25) || isBtnPressed(1) || isBtnPressed(10); // LT, B, or L3
    const justDash = isBtnJustPressed(6, 0.25) || isBtnJustPressed(1) || isBtnJustPressed(10);

    const interact = isBtnPressed(0); // A / Cross
    const justInteract = isBtnJustPressed(0);

    const reload = isBtnPressed(2); // X / Square
    const justReload = isBtnJustPressed(2);

    // Glory Kill / Melee is R3 (Right Stick Click - standard DOOM melee)
    const gloryKill = isBtnPressed(11);
    const justGloryKill = isBtnJustPressed(11);

    // Inspect weapon is Y / Triangle
    const inspect = isBtnPressed(3);
    const justInspect = isBtnJustPressed(3);

    // Weapon Switching
    const nextWeapon = isBtnPressed(5); // RB (Right Bumper)
    const justNextWeapon = isBtnJustPressed(5);

    const prevWeapon = isBtnPressed(4); // LB (Left Bumper)
    const justPrevWeapon = isBtnJustPressed(4);

    // D-Pad direct weapon selection:
    // D-Pad Up: Fist / Melee (Slot 1) or next
    // D-Pad Right: Pistol / Shotgun (Slot 2 or 3)
    // D-Pad Down: Chaingun (Slot 4)
    // D-Pad Left: Plasma (Slot 5)
    let directWeaponSlot: number | null = null;
    if (isBtnJustPressed(12)) directWeaponSlot = 1; // Up: Fist
    else if (isBtnJustPressed(15)) directWeaponSlot = 2; // Right: Pistol/Shotgun
    else if (isBtnJustPressed(13)) directWeaponSlot = 4; // Down: Chaingun
    else if (isBtnJustPressed(14)) directWeaponSlot = 5; // Left: Plasma

    // System
    const pause = isBtnPressed(9); // Start / Menu
    const justPause = isBtnJustPressed(9);

    const automap = isBtnPressed(8); // Back / Select / Share
    const justAutomap = isBtnJustPressed(8);

    // Minimap toggle via L3 + R3 combo or D-pad hold, separate from automap
    const minimap = false;
    const justMinimap = false;

    // Menu Navigation Pulsing (with repeat cooldown for smooth list scrolling)
    if (this.menuNavCooldown > 0) {
      this.menuNavCooldown -= dt;
    }

    let menuUp = isBtnJustPressed(12);
    let menuDown = isBtnJustPressed(13);
    let menuLeft = isBtnJustPressed(14);
    let menuRight = isBtnJustPressed(15);

    // Also support Left Stick for UI menu navigation
    if (this.menuNavCooldown <= 0) {
      if (rawMoveY < -0.6) {
        menuUp = true;
        this.menuNavCooldown = 0.22;
      } else if (rawMoveY > 0.6) {
        menuDown = true;
        this.menuNavCooldown = 0.22;
      } else if (rawMoveX < -0.6) {
        menuLeft = true;
        this.menuNavCooldown = 0.22;
      } else if (rawMoveX > 0.6) {
        menuRight = true;
        this.menuNavCooldown = 0.22;
      }
    }

    const menuConfirm = isBtnJustPressed(0) || isBtnJustPressed(9); // A or Start
    const menuCancel = isBtnJustPressed(1); // B

    // Record button states for edge detection next frame
    for (let i = 0; i < buttons.length; i++) {
      this.prevButtonStates[i] = buttons[i].pressed || buttons[i].value > 0.35;
    }

    return {
      connected: true,
      id: activeGamepad.id,
      name: info.name,
      controllerType: info.type,
      moveX,
      moveY,
      lookX,
      lookY,
      fire,
      justFire,
      dash,
      justDash,
      interact,
      justInteract,
      reload,
      justReload,
      gloryKill,
      justGloryKill,
      inspect,
      justInspect,
      nextWeapon,
      justNextWeapon,
      prevWeapon,
      justPrevWeapon,
      directWeaponSlot,
      pause,
      justPause,
      automap,
      justAutomap,
      minimap,
      justMinimap,
      menuUp,
      menuDown,
      menuLeft,
      menuRight,
      menuConfirm,
      menuCancel,
    };
  }

  /**
   * Triggers dual-rumble haptic feedback on supported gamepads
   */
  public vibrate(durationMs = 120, weakMagnitude = 0.5, strongMagnitude = 0.5): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;

    try {
      const gamepads = navigator.getGamepads();
      let pad: Gamepad | null = null;
      if (this.activeGamepadIndex !== null && gamepads[this.activeGamepadIndex]) {
        pad = gamepads[this.activeGamepadIndex];
      } else {
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && gamepads[i]!.connected) {
            pad = gamepads[i];
            break;
          }
        }
      }

      if (!pad) return;

      const actuator = (pad as unknown as { vibrationActuator?: { playEffect: (type: string, params: object) => Promise<unknown> } }).vibrationActuator;
      if (actuator && typeof actuator.playEffect === 'function') {
        actuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1.0, Math.max(0.0, weakMagnitude)),
          strongMagnitude: Math.min(1.0, Math.max(0.0, strongMagnitude)),
        }).catch(() => {
          // Ignore gamepad vibration errors
        });
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * Weapon-specific firing rumble
   */
  public playWeaponRumble(weaponType: string): void {
    switch (weaponType) {
      case 'pistol':
        this.vibrate(70, 0.45, 0.2);
        break;
      case 'shotgun':
        this.vibrate(180, 0.65, 0.95);
        break;
      case 'chaingun':
        this.vibrate(55, 0.5, 0.3);
        break;
      case 'plasma':
        this.vibrate(90, 0.6, 0.45);
        break;
      case 'fist':
        this.vibrate(120, 0.7, 0.6);
        break;
      default:
        this.vibrate(80, 0.4, 0.3);
        break;
    }
  }

  /**
   * Glory kill visceral rumble
   */
  public playGloryKillRumble(): void {
    this.vibrate(350, 0.85, 1.0);
  }

  /**
   * Damage taken jolt rumble
   */
  public playDamageRumble(amount = 20): void {
    const intensity = Math.min(1.0, Math.max(0.3, amount / 40));
    this.vibrate(220, intensity * 0.8, intensity);
  }

  /**
   * Dash burst rumble
   */
  public playDashRumble(): void {
    this.vibrate(110, 0.35, 0.45);
  }
}

export const gamepadManager = GamepadManager.getInstance();
