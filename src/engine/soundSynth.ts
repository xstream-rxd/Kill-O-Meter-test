/**
 * High-performance Web Audio Synthesizer for Retro 90s FPS Sound Effects & Dynamic Metal Music.
 * Features a Studio Mastering Chain (Compressor + Saturation Drive), Precision Lookahead Sequencer,
 * Layered Weapon Audio Engineering, 3D Spatial Audio, and Dynamic Multi-Tier Thrash Metal Synthesizer.
 */

class SoundSynthEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private driveNode: WaveShaperNode | null = null;

  // Music lookahead scheduler state
  private isMusicPlaying = false;
  private musicIntensity = 1; // 1 = Exploration, 2 = Combat/Rampage, 3 = Boss Redline
  private musicStep = 0; // 0..63 (64 sixteenth notes per 4-bar loop)
  private nextNoteTime = 0;
  private lookaheadTimer: number | null = null;
  private currentBpm = 142;

  // Pre-allocated noise buffers
  private sharedNoiseBuffer: AudioBuffer | null = null;
  private sharedSnareBuffer: AudioBuffer | null = null;
  private sharedCrashBuffer: AudioBuffer | null = null;
  private lastRicochetTime = 0;

  // Safe Zone Audio Muffle Filter & Secret Ambient Proximity Hum
  private musicFilter: BiquadFilterNode | null = null;
  private secretHumOsc: OscillatorNode | null = null;
  private secretHumGain: GainNode | null = null;
  private isSafeZoneMuffled = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      // Master Output Chain with Clean Transparent Limiting (prevents clipping without pumping echoes)
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.85;

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-1.5, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(10, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(2.0, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.03, this.ctx.currentTime);

      // Clean signal routing: sub-busses -> compressor -> masterGain -> destination
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Sub-busses
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.85;
      this.sfxGain.connect(this.compressor);

      // Music dynamic output bus with safe-zone low-pass muffling filter
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.42;

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.musicFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.musicGain.connect(this.musicFilter);
      this.musicFilter.connect(this.compressor);

      // Secret Proximity Ambient Resonance Hum (Subtle subterranean 65-110Hz frequency)
      try {
        this.secretHumOsc = this.ctx.createOscillator();
        this.secretHumGain = this.ctx.createGain();
        this.secretHumOsc.type = 'triangle';
        this.secretHumOsc.frequency.setValueAtTime(74, this.ctx.currentTime);
        this.secretHumGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        const humFilter = this.ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.setValueAtTime(160, this.ctx.currentTime);

        this.secretHumOsc.connect(humFilter);
        humFilter.connect(this.secretHumGain);
        this.secretHumGain.connect(this.sfxGain);
        this.safeStart(this.secretHumOsc, this.ctx.currentTime);
      } catch {
        // Audio node creation fallback
      }

      // Pre-allocate audio noise buffers to eliminate garbage collection stutters
      const sampleRate = this.ctx.sampleRate;

      // 1. White Noise Buffer
      const noiseLen = Math.floor(sampleRate * 2.0);
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, noiseLen, sampleRate);
      const nData = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        nData[i] = Math.random() * 2 - 1;
      }

      // 2. Snare Impact Buffer
      const snareLen = Math.floor(sampleRate * 0.18);
      this.sharedSnareBuffer = this.ctx.createBuffer(1, snareLen, sampleRate);
      const sData = this.sharedSnareBuffer.getChannelData(0);
      for (let i = 0; i < snareLen; i++) {
        const env = Math.exp(-i / (sampleRate * 0.025));
        sData[i] = (Math.random() * 2 - 1) * env;
      }

      // 3. Crash Cymbal Buffer
      const crashLen = Math.floor(sampleRate * 1.8);
      this.sharedCrashBuffer = this.ctx.createBuffer(1, crashLen, sampleRate);
      const cData = this.sharedCrashBuffer.getChannelData(0);
      for (let i = 0; i < crashLen; i++) {
        const env = Math.exp(-i / (sampleRate * 0.35));
        cData[i] = (Math.random() * 2 - 1) * env;
      }
    } catch {
      // Audio context initialization fallback
    }
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private createNoiseSource(): AudioBufferSourceNode | null {
    if (!this.ctx || !this.sharedNoiseBuffer) return null;
    try {
      const node = this.ctx.createBufferSource();
      node.buffer = this.sharedNoiseBuffer;
      return node;
    } catch {
      return null;
    }
  }

  public safeStart(node: AudioScheduledSourceNode | null | undefined, startTime = 0, stopTime?: number) {
    if (!node) return;
    try {
      node.start(startTime);
      if (stopTime !== undefined) {
        node.stop(stopTime);
      }
    } catch {
      // Prevents InvalidStateError if node was already started or context interrupted
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume();
      } catch {
        // Safe no-op
      }
    }
  }

  public setVolumes(sfx: number, music: number) {
    if (!this.ctx) return;
    if (this.sfxGain) this.sfxGain.gain.setValueAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime);
    if (this.musicGain) this.musicGain.gain.setValueAtTime(Math.max(0, Math.min(1, music)), this.ctx.currentTime);
  }

  // ========================================================
  // --- INTRO & CINEMATIC SOUND EFFECTS ---
  // ========================================================

  public playTerminalBeep() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 + Math.random() * 200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, this.ctx.currentTime, this.ctx.currentTime + 0.06);
    } catch {
      // Ignored
    }
  }

  public playCyberBoot() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      // Retro FM synth power-on sweep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.55);

      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(400, now);
      f.frequency.exponentialRampToValueAtTime(3200, now + 0.4);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(f);
      f.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now, now + 0.65);
    } catch {
      // Ignored
    }
  }

  public playGlitchStatic() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const noise = this.createNoiseSource();
      if (noise) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.12);
        filter.Q.setValueAtTime(6.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        this.safeStart(noise, now, now + 0.13);
      }
    } catch {
      // Ignored
    }
  }

  public playBreachSiren() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.25);
      osc.frequency.linearRampToValueAtTime(880, now + 0.5);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.52);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now, now + 0.55);
    } catch {
      // Ignored
    }
  }

  public playIntroRiser() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const now = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(45, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 2.2);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.exponentialRampToValueAtTime(2600, now + 2.2);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.45, now + 2.0);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now, now + 2.6);
    } catch {
      // Ignored
    }
  }

  public playIntroImpact() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.9);

      subGain.gain.setValueAtTime(0.85, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);
      this.safeStart(sub, now, now + 1.2);

      if (this.sharedCrashBuffer) {
        this.playCrashCymbal(now);
      }
    } catch {
      // Ignored
    }
  }

  // ========================================================
  // --- WEAPON SOUNDS (STUDIO PUNCH & DUAL-LAYER IMPACTS) ---
  // ========================================================

  public playPistol() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Layer 1: High transient crack & muzzle blast
    const noise = this.createNoiseSource();
    if (noise) {
      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, now);
      noiseFilter.Q.setValueAtTime(2.5, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(1.1, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.09);
    }

    // Layer 2: Mechanical slide punch oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.11);

    oscGain.gain.setValueAtTime(0.85, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    this.safeStart(osc, now, now + 0.12);
  }

  public playShotgun() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Layer 1: Heavy Sub-Bass Boom (35Hz Drop)
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(190, now);
    sub.frequency.exponentialRampToValueAtTime(32, now + 0.32);

    subGain.gain.setValueAtTime(1.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(sub, now, now + 0.34);

    // Layer 2: Dense Muzzle Explosion Noise Blast
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.35);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(1.6, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.39);
    }

    // Layer 3: High Metal Crack
    const crack = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(850, now);
    crack.frequency.exponentialRampToValueAtTime(120, now + 0.08);

    crackGain.gain.setValueAtTime(0.7, now);
    crackGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    crack.connect(crackGain);
    crackGain.connect(this.sfxGain);
    this.safeStart(crack, now, now + 0.09);
  }

  private playShotgunPump() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Pump Rack Back
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(650, now);
    osc1.frequency.setValueAtTime(950, now + 0.04);
    osc1.frequency.setValueAtTime(350, now + 0.08);

    gain1.gain.setValueAtTime(0.45, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    this.safeStart(osc1, now, now + 0.13);

    // Metallic Shell Clack
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1800, now + 0.05);

      const ngain = this.ctx.createGain();
      ngain.gain.setValueAtTime(0.001, now);
      ngain.gain.setValueAtTime(0.4, now + 0.05);
      ngain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      noise.connect(filter);
      filter.connect(ngain);
      ngain.connect(this.sfxGain);
      this.safeStart(noise, now + 0.05, now + 0.15);
    }
  }

  public playChaingun() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Alternating barrel pitches for heavy continuous firing
    const altPitch = (Math.floor(now * 30) % 2 === 0) ? 520 : 460;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(altPitch + (Math.random() * 40 - 20), now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.075);

    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.075);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.08);

    // Rotary Whirring Noise
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);

      const ngain = this.ctx.createGain();
      ngain.gain.setValueAtTime(0.5, now);
      ngain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      noise.connect(filter);
      filter.connect(ngain);
      ngain.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.07);
    }
  }

  public playPlasmaRifle() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Layer 1: High Voltage FM Resonance Sweep
    const osc = this.ctx.createOscillator();
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);

    modOsc.type = 'sine';
    modOsc.frequency.setValueAtTime(120, now);
    modGain.gain.setValueAtTime(400, now);
    modOsc.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.Q.setValueAtTime(4.5, now);

    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    this.safeStart(modOsc, now, now + 0.15);
    this.safeStart(osc, now, now + 0.15);

    // Layer 2: Electric Arc Sizzle
    const noise = this.createNoiseSource();
    if (noise) {
      const nfilter = this.ctx.createBiquadFilter();
      nfilter.type = 'highpass';
      nfilter.frequency.setValueAtTime(2500, now);

      const ngain = this.ctx.createGain();
      ngain.gain.setValueAtTime(0.4, now);
      ngain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      noise.connect(nfilter);
      nfilter.connect(ngain);
      ngain.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.11);
    }
  }

  public playWeaponSwitch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.setValueAtTime(1150, now + 0.04);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.1);
  }

  public playEmptyClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1900, now);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.035);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.04);
  }

  // ========================================================
  // --- IMPACT & GORE SOUNDS ---
  // ========================================================

  public playFleshHit() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.07);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.08);
  }

  public playGibExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Sub-Explosion Crunch
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(180, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.42);
    subGain.gain.setValueAtTime(1.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(sub, now, now + 0.44);

    // Wet Squelchy Flesh Splatter Noise
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.48);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.52);
    }
  }

  public playWallRicochet() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    if (now - this.lastRicochetTime < 0.09) return;
    this.lastRicochetTime = now;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200 + Math.random() * 600, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.055);
  }

  // ========================================================
  // --- MOBILITY & PLAYER SOUNDS ---
  // ========================================================

  public playDash() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Thruster Jet Pressure Wave
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(1600, now + 0.09);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.22);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.23);
    }

    // Low Thruster Rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(45, now + 0.2);
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(sub, now, now + 0.21);
  }

  public playFootstep() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + Math.random() * 200, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.06);
    }
  }

  public playFist() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy Sub Thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.18);
    gain.gain.setValueAtTime(1.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.19);

    // Air Woosh & Bone Snap Noise
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      const ngain = this.ctx.createGain();
      ngain.gain.setValueAtTime(0.9, now);
      ngain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);
      noise.connect(filter);
      filter.connect(ngain);
      ngain.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.14);
    }
  }

  public playReload() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Stage 1: Mag ejection click
    const click1 = this.ctx.createOscillator();
    const cGain1 = this.ctx.createGain();
    click1.type = 'triangle';
    click1.frequency.setValueAtTime(480, now);
    click1.frequency.exponentialRampToValueAtTime(110, now + 0.08);
    cGain1.gain.setValueAtTime(0.7, now);
    cGain1.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
    click1.connect(cGain1);
    cGain1.connect(this.sfxGain);
    this.safeStart(click1, now, now + 0.1);

    // Stage 2: Slap in fresh magazine (+0.35s)
    const click2 = this.ctx.createOscillator();
    const cGain2 = this.ctx.createGain();
    click2.type = 'sawtooth';
    click2.frequency.setValueAtTime(320, now + 0.35);
    click2.frequency.exponentialRampToValueAtTime(160, now + 0.45);
    cGain2.gain.setValueAtTime(0.001, now);
    cGain2.gain.setValueAtTime(0.8, now + 0.35);
    cGain2.gain.exponentialRampToValueAtTime(0.01, now + 0.48);
    click2.connect(cGain2);
    cGain2.connect(this.sfxGain);
    this.safeStart(click2, now + 0.35, now + 0.5);

    // Stage 3: Slide rack / chamber bolt cock (+0.65s)
    const rack = this.ctx.createOscillator();
    const rGain = this.ctx.createGain();
    rack.type = 'square';
    rack.frequency.setValueAtTime(680, now + 0.65);
    rack.frequency.exponentialRampToValueAtTime(980, now + 0.72);
    rack.frequency.exponentialRampToValueAtTime(300, now + 0.8);
    rGain.gain.setValueAtTime(0.001, now);
    rGain.gain.setValueAtTime(0.6, now + 0.65);
    rGain.gain.exponentialRampToValueAtTime(0.01, now + 0.82);
    rack.connect(rGain);
    rGain.connect(this.sfxGain);
    this.safeStart(rack, now + 0.65, now + 0.84);
  }

  public playPlasmaReload() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Stage 1: Depleted Core Ejection Hiss & Magnetic Unlatch (0.0s - 0.8s)
    const ejectOsc = this.ctx.createOscillator();
    const ejectGain = this.ctx.createGain();
    ejectOsc.type = 'sawtooth';
    ejectOsc.frequency.setValueAtTime(820, now);
    ejectOsc.frequency.exponentialRampToValueAtTime(160, now + 0.35);
    ejectGain.gain.setValueAtTime(0.65, now);
    ejectGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    ejectOsc.connect(ejectGain);
    ejectGain.connect(this.sfxGain);
    this.safeStart(ejectOsc, now, now + 0.4);

    const ejectNoise = this.createNoiseSource();
    if (ejectNoise) {
      const eFilter = this.ctx.createBiquadFilter();
      eFilter.type = 'highpass';
      eFilter.frequency.setValueAtTime(3200, now);
      eFilter.frequency.exponentialRampToValueAtTime(800, now + 0.6);
      const enGain = this.ctx.createGain();
      enGain.gain.setValueAtTime(0.45, now);
      enGain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);
      ejectNoise.connect(eFilter);
      eFilter.connect(enGain);
      enGain.connect(this.sfxGain);
      this.safeStart(ejectNoise, now, now + 0.7);
    }

    // Stage 2: Sub-atomic Vacuum Purge Vent (+1.1s)
    const purgeNoise = this.createNoiseSource();
    if (purgeNoise) {
      const pFilter = this.ctx.createBiquadFilter();
      pFilter.type = 'bandpass';
      pFilter.frequency.setValueAtTime(1400, now + 1.1);
      pFilter.Q.setValueAtTime(3.5, now + 1.1);
      const pGain = this.ctx.createGain();
      pGain.gain.setValueAtTime(0.001, now);
      pGain.gain.setValueAtTime(0.35, now + 1.1);
      pGain.gain.exponentialRampToValueAtTime(0.01, now + 1.8);
      purgeNoise.connect(pFilter);
      pFilter.connect(pGain);
      pGain.connect(this.sfxGain);
      this.safeStart(purgeNoise, now + 1.1, now + 1.85);
    }

    // Stage 3: Superconducting Capacitor Charging Rising Sweep (+2.0s - 3.8s)
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = 'sine';
    chargeOsc.frequency.setValueAtTime(220, now + 2.0);
    chargeOsc.frequency.exponentialRampToValueAtTime(1850, now + 3.8);
    chargeGain.gain.setValueAtTime(0.001, now);
    chargeGain.gain.setValueAtTime(0.45, now + 2.1);
    chargeGain.gain.setValueAtTime(0.75, now + 3.6);
    chargeGain.gain.exponentialRampToValueAtTime(0.01, now + 3.85);
    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.sfxGain);
    this.safeStart(chargeOsc, now + 2.0, now + 3.9);

    // Stage 4: Quantum Lock & Ion Seal Slam (+3.8s)
    const lockOsc = this.ctx.createOscillator();
    const lockGain = this.ctx.createGain();
    lockOsc.type = 'triangle';
    lockOsc.frequency.setValueAtTime(1200, now + 3.8);
    lockOsc.frequency.setValueAtTime(2400, now + 3.9);
    lockOsc.frequency.exponentialRampToValueAtTime(450, now + 4.1);
    lockGain.gain.setValueAtTime(0.001, now);
    lockGain.gain.setValueAtTime(0.85, now + 3.8);
    lockGain.gain.exponentialRampToValueAtTime(0.01, now + 4.15);
    lockOsc.connect(lockGain);
    lockGain.connect(this.sfxGain);
    this.safeStart(lockOsc, now + 3.8, now + 4.2);
  }

  public playChaingunOverheat() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Overheat Alert Beeps (Two-tone emergency siren)
    const beep1 = this.ctx.createOscillator();
    const bGain1 = this.ctx.createGain();
    beep1.type = 'square';
    beep1.frequency.setValueAtTime(1400, now);
    beep1.frequency.setValueAtTime(1760, now + 0.08);
    beep1.frequency.setValueAtTime(1400, now + 0.16);
    beep1.frequency.setValueAtTime(1760, now + 0.24);
    bGain1.gain.setValueAtTime(0.65, now);
    bGain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    beep1.connect(bGain1);
    bGain1.connect(this.sfxGain);
    this.safeStart(beep1, now, now + 0.36);

    // High Pressure Steam Venting Hiss
    const steamNoise = this.createNoiseSource();
    if (steamNoise) {
      const sFilter = this.ctx.createBiquadFilter();
      sFilter.type = 'bandpass';
      sFilter.frequency.setValueAtTime(2400, now);
      sFilter.frequency.exponentialRampToValueAtTime(900, now + 0.9);
      sFilter.Q.setValueAtTime(4.0, now);
      const sGain = this.ctx.createGain();
      sGain.gain.setValueAtTime(0.75, now);
      sGain.gain.exponentialRampToValueAtTime(0.01, now + 0.95);
      steamNoise.connect(sFilter);
      sFilter.connect(sGain);
      sGain.connect(this.sfxGain);
      this.safeStart(steamNoise, now, now + 1.0);
    }
  }

  public playChaingunCooled() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Ascending System Ready Chime (3-tone electronic ready chime)
    const chime = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(587.33, now); // D5
    chime.frequency.setValueAtTime(880, now + 0.07); // A5
    chime.frequency.setValueAtTime(1174.66, now + 0.14); // D6
    cGain.gain.setValueAtTime(0.55, now);
    cGain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    chime.connect(cGain);
    cGain.connect(this.sfxGain);
    this.safeStart(chime, now, now + 0.3);

    // Mechanical Breach Ready Click
    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(750, now + 0.12);
    click.frequency.exponentialRampToValueAtTime(180, now + 0.2);
    clickGain.gain.setValueAtTime(0.001, now);
    clickGain.gain.setValueAtTime(0.6, now + 0.12);
    clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    click.connect(clickGain);
    clickGain.connect(this.sfxGain);
    this.safeStart(click, now + 0.12, now + 0.24);
  }

  public playTachometerRev() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.16);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.19);
  }

  public playRedlineWarning() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.setValueAtTime(460, now + 0.08);
    osc.frequency.setValueAtTime(920, now + 0.16);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.29);
  }

  public playLootDrop() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.16);
  }

  public playWarpTeleport() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.6);
    osc.frequency.exponentialRampToValueAtTime(200, now + 1.2);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 1.3);
  }

  public playPlayerPain() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.15);
    gain.gain.setValueAtTime(0.95, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.16);
  }

  public playPlayerDeath() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.85);
    gain.gain.setValueAtTime(1.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.88);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.9);
  }

  public playBerserkRage() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.linearRampToValueAtTime(350, now + 0.3);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.7);
    gain.gain.setValueAtTime(1.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.72);
  }

  public playGloryKillSiphon() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Sub-drop crunch
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(135, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    subGain.gain.setValueAtTime(1.1, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(sub, now, now + 0.36);

    // Ascending health siphon shimmer
    const shimmer = this.ctx.createOscillator();
    const shimGain = this.ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(300, now + 0.05);
    shimmer.frequency.exponentialRampToValueAtTime(950, now + 0.38);
    shimGain.gain.setValueAtTime(0.01, now);
    shimGain.gain.linearRampToValueAtTime(0.7, now + 0.12);
    shimGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
    shimmer.connect(shimGain);
    shimGain.connect(this.sfxGain);
    this.safeStart(shimmer, now + 0.05, now + 0.43);
  }

  // ========================================================
  // --- ENEMY SOUNDS & 3D POSITIONAL DEMON SNARLS ---
  // ========================================================

  public playEnemyAlert(type: string) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    if (type === 'grunt') {
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.18);
    } else if (type === 'imp') {
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.22);
    } else if (type === 'baron') {
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);
    } else if (type === 'scuttler') {
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(1250, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);
    } else if (type === 'plasma_gunner') {
      osc.frequency.setValueAtTime(230, now);
      osc.frequency.linearRampToValueAtTime(560, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(170, now + 0.25);
    } else if (type === 'vile_spitter') {
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.15);
    }

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.36);
  }

  public playEnemyPain() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.13);
  }

  public playEnemyDeath(type: string) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    let pitch = 160;
    if (type === 'baron') pitch = 100;
    else if (type === 'imp') pitch = 230;
    else if (type === 'scuttler') pitch = 500;
    else if (type === 'plasma_gunner') pitch = 200;
    else if (type === 'vile_spitter') pitch = 120;

    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.38);
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.4);
  }

  public playPannedDemonSnarl(type: string, pan = 0, distanceVolume = 1.0, isOccluded = false) {
    if (!this.ctx || !this.sfxGain || distanceVolume <= 0.02) return;
    const now = this.ctx.currentTime;

    const clampedPan = Math.max(-0.92, Math.min(0.92, pan));
    let panner: StereoPannerNode | null = null;
    if (this.ctx.createStereoPanner) {
      try {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(clampedPan, now);
      } catch {
        panner = null;
      }
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isOccluded ? 360 : 2600, now);

    const gain = this.ctx.createGain();
    const baseVol = (isOccluded ? 0.38 : 0.65) * Math.min(1.0, distanceVolume);
    gain.gain.setValueAtTime(baseVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    const osc = this.ctx.createOscillator();
    const modOsc = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    let baseFreq = 125;
    if (type === 'baron') baseFreq = 60;
    else if (type === 'imp') baseFreq = 250;
    else if (type === 'scuttler') baseFreq = 500;
    else if (type === 'plasma_gunner') baseFreq = 180;
    else if (type === 'vile_spitter') baseFreq = 85;

    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.62, now + 0.38);

    modOsc.type = 'sawtooth';
    modOsc.frequency.setValueAtTime(type === 'scuttler' ? 42 : 18, now);
    modGain.gain.setValueAtTime(baseFreq * 0.5, now);
    modOsc.connect(osc.frequency);

    osc.connect(filter);
    filter.connect(gain);

    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    this.safeStart(modOsc, now, now + 0.42);
    this.safeStart(osc, now, now + 0.42);
  }

  public playShellBounce(pan = 0, isShotgun = false) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let panner: StereoPannerNode | null = null;
    if (this.ctx.createStereoPanner) {
      try {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), now);
      } catch {
        panner = null;
      }
    }

    if (isShotgun) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300 + Math.random() * 250, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.045);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
    } else {
      osc.type = 'sine';
      const baseFreq = 2800 + Math.random() * 500;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.032);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    }

    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.sfxGain);
    } else {
      gain.connect(this.sfxGain);
    }

    this.safeStart(osc, now, now + 0.05);
  }

  public playDemonStagger(type: string) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const freq = type === 'baron' ? 90 : 175;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.6, now + 0.35);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(920, now);
    ring.frequency.exponentialRampToValueAtTime(460, now + 0.35);
    ringGain.gain.setValueAtTime(0.3, now);
    ringGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);

    this.safeStart(osc, now, now + 0.4);
    this.safeStart(ring, now, now + 0.36);
  }

  public playHeavyImpactCrunch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.15);
  }

  public playScuttlerLeap() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.22);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.23);
  }

  public playPlasmaGunnerCharge() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(1450, now + 0.18);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.21);
  }

  public playPlasmaGunnerFire() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1250, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.14);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.16);
  }

  public playAcidSpit() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.linearRampToValueAtTime(440, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.28);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.29);
  }

  public playAcidSplat() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.frequency.exponentialRampToValueAtTime(380, now + 0.25);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.75, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.27);
    }
  }

  public playWaveAlert() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(660, now + 0.1);
    osc.frequency.setValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.46);
  }

  public playFireballLaunch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(230, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.2);
    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.21);
  }

  public playExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + 0.6);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.65);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.68);
    }
  }

  // ========================================================
  // --- PICKUPS, ANNOUNCERS, & CHESTS ---
  // ========================================================

  public playPickup(type?: string) {
    if (!this.ctx || !this.sfxGain || !type) return;
    const safeType = type || '';
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    if (safeType.includes('health')) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.05);
      osc.frequency.setValueAtTime(880, now + 0.1);
    } else if (safeType.includes('armor')) {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(520, now + 0.06);
      osc.frequency.setValueAtTime(780, now + 0.12);
    } else if (safeType.includes('weapon')) {
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.setValueAtTime(420, now + 0.08);
      osc.frequency.setValueAtTime(560, now + 0.16);
      osc.frequency.setValueAtTime(840, now + 0.24);
    } else {
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.setValueAtTime(930, now + 0.06);
    }

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.26);
  }

  public playComboFanfare(tier: number) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const base = 440 + tier * 110;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.setValueAtTime(base * 1.25, now + 0.08);
    osc.frequency.setValueAtTime(base * 1.5, now + 0.16);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.36);
  }

  public playBossAlarm() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(820, now);
    osc.frequency.linearRampToValueAtTime(410, now + 0.4);
    osc.frequency.linearRampToValueAtTime(820, now + 0.8);
    gain.gain.setValueAtTime(0.85, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.88);
  }

  public playTeleport() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(1850, now + 0.35);
    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.4);
  }

  public playStageClear() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.75, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now + idx * 0.1, now + idx * 0.1 + 0.48);
    });
  }

  public playChestOpen() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1300, now);
      filter.frequency.linearRampToValueAtTime(3400, now + 0.15);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.22);
    }

    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(230, now);
    osc1.frequency.exponentialRampToValueAtTime(680, now + 0.08);
    gain1.gain.setValueAtTime(0.65, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    this.safeStart(osc1, now, now + 0.12);

    [523.25, 783.99, 1046.5, 1318.51].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + 0.08 + idx * 0.06);

      gain.gain.setValueAtTime(0.001, now + 0.08 + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.7, now + 0.08 + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + idx * 0.06 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now + 0.08 + idx * 0.06, now + 0.08 + idx * 0.06 + 0.38);
    });
  }

  public playSecretDiscovery() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.65, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now + idx * 0.08, now + idx * 0.08 + 0.38);
    });
  }

  public playSecretDoorSlide() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy hydraulic stone grinding slide
    const noise = this.createNoiseSource();
    if (noise) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(220, now);
      filter.frequency.linearRampToValueAtTime(380, now + 0.4);
      filter.frequency.linearRampToValueAtTime(140, now + 0.85);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.85);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      this.safeStart(noise, now, now + 0.88);
    }

    // Sub-bass stone rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(65, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.85);
    subGain.gain.setValueAtTime(0.65, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(subOsc, now, now + 0.88);
  }

  /**
   * Safe Zone Muffled Audio Shift:
   * Smoothly low-passes the synth background music down to ~450 Hz with resonance
   * when player is inside the safe bunker / staging area, and snaps open when entering combat.
   */
  public setSafeZoneAudio(inSafeZone: boolean) {
    if (!this.ctx || !this.musicFilter) return;
    if (this.isSafeZoneMuffled === inSafeZone) return;
    this.isSafeZoneMuffled = inSafeZone;
    const now = this.ctx.currentTime;
    this.musicFilter.frequency.cancelScheduledValues(now);

    if (inSafeZone) {
      this.musicFilter.frequency.setTargetAtTime(450, now, 0.4);
    } else {
      this.musicFilter.frequency.setTargetAtTime(20000, now, 0.25);
    }
  }

  /**
   * Secret Area Proximity Resonance Hum:
   * Updates gain on subterranean 74Hz oscillator when player is near an unrevealed secret wall.
   */
  public updateSecretHum(proximity: number) {
    if (!this.ctx || !this.secretHumGain) return;
    const target = Math.max(0, Math.min(1, proximity)) * 0.22;
    const now = this.ctx.currentTime;
    this.secretHumGain.gain.setTargetAtTime(target, now, 0.12);
  }

  /**
   * Relic / Artifact Pickup Chime (Chrono-Haste / Infinite Dash Relic)
   */
  public playRelicPickup() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const chords = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    chords.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(freq * 1.5, now + idx * 0.05);
      f.Q.setValueAtTime(5, now + idx * 0.05);

      gain.gain.setValueAtTime(0.001, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.55, now + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.6);

      osc.connect(f);
      f.connect(gain);
      gain.connect(this.sfxGain);
      this.safeStart(osc, now + idx * 0.05, now + idx * 0.05 + 0.65);
    });
  }

  /**
   * Airlock Button / Console Switch Activation Click
   */
  public playAirlockButtonPress() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy mechanical switch click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.065);

    // Electronic authorization chime
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.04);
    osc2.frequency.setValueAtTime(1318.51, now + 0.12);
    gain2.gain.setValueAtTime(0.01, now + 0.04);
    gain2.gain.linearRampToValueAtTime(0.55, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    this.safeStart(osc2, now + 0.04, now + 0.36);
  }

  /**
   * Airlock / Gate Switch Cycling Decompression Sound
   */
  public playAirlockCycle() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Steam decompression hiss
    const noise = this.createNoiseSource();
    if (noise) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(1400, now);
      f.frequency.exponentialRampToValueAtTime(450, now + 1.2);
      f.Q.setValueAtTime(2.0, now);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.8, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      noise.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      this.safeStart(noise, now, now + 1.25);
    }

    // Heavy mechanical latch thud
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    g.gain.setValueAtTime(0.9, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(g);
    g.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.45);
  }

  /**
   * Airlock Permanent Lockdown Slam & Magnetic Seal Sound
   */
  public playAirlockPermanentLockdown() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Massive pneumatic slam & sub-bass impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(28, now + 0.55);
    subGain.gain.setValueAtTime(1.3, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    this.safeStart(sub, now, now + 0.58);

    // Industrial metal impact clamp
    const noise = this.createNoiseSource();
    if (noise) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(950, now);
      f.frequency.exponentialRampToValueAtTime(80, now + 0.4);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(1.1, now);
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
      noise.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      this.safeStart(noise, now, now + 0.45);
    }

    // High frequency pneumatic latch click
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(240, now + 0.08);
    osc.frequency.setValueAtTime(120, now + 0.16);
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.setValueAtTime(0.6, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now + 0.08, now + 0.32);
  }

  public playWaveIncoming() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(170, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.6);

    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.62);
  }

  public playMenuMove() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(460, now);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.045);
  }

  public playMenuSelect() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(900, now + 0.06);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    this.safeStart(osc, now, now + 0.16);
  }

  // ========================================================
  // --- DYNAMIC THRASH METAL MUSIC SEQUENCER (LOOKAHEAD) ---
  // ========================================================

  public startMusic() {
    this.stopMusic();
    this.resume();
    this.isMusicPlaying = true;
    this.musicStep = 0;
    this.currentBpm = this.musicIntensity >= 3 ? 162 : 142;

    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      // Precision lookahead timer running every 25ms
      this.lookaheadTimer = window.setInterval(() => {
        this.scheduler();
      }, 25);
    }
  }

  public pauseMusic() {
    if (this.lookaheadTimer) {
      clearInterval(this.lookaheadTimer);
      this.lookaheadTimer = null;
    }
  }

  public resumeMusic() {
    if (!this.isMusicPlaying) return;
    if (this.lookaheadTimer) return;

    this.resume();
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.05;
      this.lookaheadTimer = window.setInterval(() => {
        this.scheduler();
      }, 25);
    }
  }

  public stopMusic() {
    if (this.lookaheadTimer) {
      clearInterval(this.lookaheadTimer);
      this.lookaheadTimer = null;
    }
    this.isMusicPlaying = false;
    this.musicStep = 0;
  }

  public setMusicIntensity(intensity: number) {
    const prev = this.musicIntensity;
    this.musicIntensity = intensity;
    this.currentBpm = intensity >= 3 ? 162 : 142;

    // Trigger crash cymbal on intensity escalation
    if (intensity > prev && this.ctx && this.musicGain) {
      this.playCrashCymbal(this.ctx.currentTime);
    }
  }

  private scheduler() {
    if (!this.ctx) return;
    // Catch-up protection against background tab throttling or audio context drift
    if (this.nextNoteTime < this.ctx.currentTime) {
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }
    const scheduleAheadTime = 0.12; // Queue nodes 120ms into future
    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleMusicStep(this.musicStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    // 16th note step duration in seconds
    const secondsPerBeat = 60.0 / this.currentBpm;
    const secondsPer16th = secondsPerBeat / 4.0;
    this.nextNoteTime += secondsPer16th;
    this.musicStep = (this.musicStep + 1) % 64; // 64 sixteenth steps = 4 bars
  }

  private scheduleMusicStep(step: number, time: number) {
    if (!this.ctx || !this.musicGain) return;

    // --- 1. HEAVY DRUM KIT ---

    // A. Kick Drum (Four-on-floor + syncopated metal double-bass)
    const isKick =
      step % 4 === 0 ||
      (this.musicIntensity >= 2 && (step % 8 === 6 || step % 16 === 14)) ||
      (this.musicIntensity >= 3 && step % 2 === 0); // 32nd note speed metal double bass in Boss mode!

    if (isKick) {
      const kick = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(160, time);
      kick.frequency.exponentialRampToValueAtTime(32, time + 0.11);

      const kickVol = this.musicIntensity >= 3 ? 0.8 : 0.7;
      kickGain.gain.setValueAtTime(kickVol, time);
      kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.11);

      kick.connect(kickGain);
      kickGain.connect(this.musicGain);
      this.safeStart(kick, time, time + 0.12);

      // Kick transient click for metal bite
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(2400, time);
      click.frequency.exponentialRampToValueAtTime(200, time + 0.02);
      clickGain.gain.setValueAtTime(0.4, time);
      clickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);
      click.connect(clickGain);
      clickGain.connect(this.musicGain);
      this.safeStart(click, time, time + 0.025);
    }

    // B. Snare Drum (Backbeats on steps 4, 12, 20, 28...)
    if (step % 8 === 4) {
      // Body oscillator
      const snareOsc = this.ctx.createOscillator();
      const snareGain = this.ctx.createGain();
      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(220, time);
      snareOsc.frequency.exponentialRampToValueAtTime(80, time + 0.1);

      snareGain.gain.setValueAtTime(0.65, time);
      snareGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      snareOsc.connect(snareGain);
      snareGain.connect(this.musicGain);
      this.safeStart(snareOsc, time, time + 0.11);

      // Snare noise snap
      if (this.sharedSnareBuffer) {
        try {
          const sNode = this.ctx.createBufferSource();
          sNode.buffer = this.sharedSnareBuffer;

          const sGain = this.ctx.createGain();
          sGain.gain.setValueAtTime(0.6, time);
          sGain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

          sNode.connect(sGain);
          sGain.connect(this.musicGain);
          this.safeStart(sNode, time, time + 0.13);
        } catch {
          // Ignored
        }
      }
    }

    // C. Hi-Hat / Ride Cymbals
    if (step % 2 === 0) {
      const hat = this.createNoiseSource();
      if (hat) {
        const hfilter = this.ctx.createBiquadFilter();
        hfilter.type = 'highpass';
        hfilter.frequency.setValueAtTime(6500, time);

        const hgain = this.ctx.createGain();
        const isOpen = step % 8 === 2 || step % 8 === 6;
        const vol = isOpen ? 0.25 : 0.15;
        const dur = isOpen ? 0.08 : 0.035;

        hgain.gain.setValueAtTime(vol, time);
        hgain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        hat.connect(hfilter);
        hfilter.connect(hgain);
        hgain.connect(this.musicGain);
        this.safeStart(hat, time, time + dur + 0.01);
      }
    }

    // D. Crash Cymbal on bar transitions (Step 0)
    if (step === 0) {
      this.playCrashCymbal(time);
    }

    // --- 2. HEAVY CHUGGING GUITAR / BASS RIFFS ---
    if (step % 2 === 0) {
      // E-Minor Heavy Metal Riff Progression:
      // Bar 1: E, E, E, G | Bar 2: E, E, F#, E | Bar 3: E, E, A#, A | Bar 4: E, F#, F, E
      const notes = [
        41.2, 41.2, 41.2, 49.0, 41.2, 41.2, 46.2, 41.2,
        41.2, 41.2, 58.2, 55.0, 41.2, 46.2, 43.6, 41.2,
      ];
      const noteIdx = Math.floor(step / 2) % notes.length;
      let freq = notes[noteIdx];

      if (this.musicIntensity >= 3) {
        freq *= 1.5; // Pitch up into fierce high speed metal in Boss mode
      }

      // 2-Operator FM Synthesis Heavy Guitar Oscillator
      const g1 = this.ctx.createOscillator();
      const g2 = this.ctx.createOscillator();
      const fmMod = this.ctx.createOscillator();
      const fmGain = this.ctx.createGain();
      const gGain = this.ctx.createGain();
      const gFilter = this.ctx.createBiquadFilter();

      g1.type = 'sawtooth';
      g1.frequency.setValueAtTime(freq, time);

      g2.type = 'sawtooth';
      g2.frequency.setValueAtTime(freq * 1.008, time); // Detuned thick chorus

      // FM Modulator for growling metallic distortion harmonics
      fmMod.type = 'square';
      fmMod.frequency.setValueAtTime(freq * 2.0, time);
      fmGain.gain.setValueAtTime(freq * 1.4, time);
      fmMod.connect(fmGain);
      fmGain.connect(g1.frequency);
      fmGain.connect(g2.frequency);

      gFilter.type = 'lowpass';
      const cutoff = this.musicIntensity >= 2 ? 1800 : 950;
      gFilter.frequency.setValueAtTime(cutoff, time);

      const noteVol = this.musicIntensity >= 2 ? 0.44 : 0.34;
      gGain.gain.setValueAtTime(noteVol, time);
      gGain.gain.exponentialRampToValueAtTime(0.01, time + 0.11);

      g1.connect(gFilter);
      g2.connect(gFilter);
      gFilter.connect(gGain);
      gGain.connect(this.musicGain);

      this.safeStart(fmMod, time, time + 0.12);
      this.safeStart(g1, time, time + 0.12);
      this.safeStart(g2, time, time + 0.12);
    }

    // --- 3. SCREAMING HIGH SYNTH LEAD (Intensity >= 2) ---
    if (this.musicIntensity >= 2 && step % 4 === 2) {
      const lead = this.ctx.createOscillator();
      const lGain = this.ctx.createGain();
      lead.type = 'square';

      const leadScale = [330, 392, 493, 587, 659, 784, 987]; // E minor pentatonic lead
      const leadFreq = leadScale[(step / 2) % leadScale.length];
      lead.frequency.setValueAtTime(leadFreq, time);

      lGain.gain.setValueAtTime(0.18, time);
      lGain.gain.exponentialRampToValueAtTime(0.01, time + 0.09);

      lead.connect(lGain);
      lGain.connect(this.musicGain);
      this.safeStart(lead, time, time + 0.1);
    }
  }

  private playCrashCymbal(time: number) {
    if (!this.ctx || !this.musicGain || !this.sharedCrashBuffer) return;
    try {
      const crash = this.ctx.createBufferSource();
      crash.buffer = this.sharedCrashBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(3500, time);

      const cGain = this.ctx.createGain();
      cGain.gain.setValueAtTime(0.45, time);
      cGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

      crash.connect(filter);
      filter.connect(cGain);
      cGain.connect(this.musicGain);

      this.safeStart(crash, time, time + 1.25);
    } catch {
      // Ignored
    }
  }
}

export const soundSynth = new SoundSynthEngine();
