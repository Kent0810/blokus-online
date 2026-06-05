export type SoundEffect = 'place' | 'invalid' | 'turnStart' | 'gameStart' | 'gameEnd';

const BPM = 118;
const BEAT = 60 / BPM; // seconds per beat
const EIGHTH = BEAT / 2;

// C major pentatonic: C4 E4 G4 A4 C5 E5
const MELODY_FREQS = [261.63, 329.63, 392.0, 440.0, 523.25, 659.25];
// 16 eighth-note melody pattern (indices into MELODY_FREQS)
const MELODY_PATTERN = [0, 2, 4, 3, 2, 4, 5, 3, 1, 3, 4, 2, 0, 2, 3, 4];
// Bass: C3 G3 C3 E3 (one per beat)
const BASS_FREQS = [130.81, 196.0, 130.81, 164.81];

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private musicTimeout: ReturnType<typeof setTimeout> | null = null;
  private musicRunning = false;
  private _muted: boolean;

  constructor() {
    this._muted = localStorage.getItem('blockus_muted') === 'true';
  }

  private init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.55;
      this.sfxGain.connect(this.masterGain);
    } catch {
      // AudioContext unavailable
    }
  }

  private getNoiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    if (this.noiseBuffer) return this.noiseBuffer;
    const size = ctx.sampleRate * 0.1;
    this.noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return this.noiseBuffer;
  }

  resume() {
    this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  startMusic() {
    if (this.musicRunning) return;
    this.musicRunning = true;
    this.init();
    if (!this.ctx) return;
    this.scheduleLoop(this.ctx.currentTime + 0.05);
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.musicTimeout) {
      clearTimeout(this.musicTimeout);
      this.musicTimeout = null;
    }
  }

  // ── loop scheduler ───────────────────────────────────────────────────────────

  private scheduleLoop(t0: number) {
    if (!this.musicRunning || !this.ctx || !this.musicGain) return;
    const ctx = this.ctx;

    // Melody — 16 eighth notes
    MELODY_PATTERN.forEach((noteIdx, i) => {
      const t = t0 + i * EIGHTH;
      const freq = MELODY_FREQS[noteIdx];
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(this.musicGain!);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + EIGHTH * 0.8);
      osc.start(t);
      osc.stop(t + EIGHTH);
    });

    // Bass — one per beat
    BASS_FREQS.forEach((freq, i) => {
      const t = t0 + i * BEAT;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(g);
      g.connect(this.musicGain!);
      g.gain.setValueAtTime(1.0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + BEAT * 0.65);
      osc.start(t);
      osc.stop(t + BEAT);
    });

    // Kick — beats 1 and 3 (index 0 and 2)
    [0, 2].forEach((beatIdx) => {
      const t = t0 + beatIdx * BEAT;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);
      osc.connect(g);
      g.connect(this.musicGain!);
      g.gain.setValueAtTime(2.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.2);
    });

    // Hi-hat — every eighth note
    for (let i = 0; i < 16; i++) {
      const t = t0 + i * EIGHTH;
      const source = ctx.createBufferSource();
      source.buffer = this.getNoiseBuffer();
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      const g = ctx.createGain();
      // Accent on-beat hats, ghost off-beat
      const vol = i % 2 === 0 ? 0.18 : 0.07;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      source.connect(filter);
      filter.connect(g);
      g.connect(this.musicGain!);
      source.start(t);
      source.stop(t + 0.05);
    }

    // Schedule next loop ~100ms before it ends to avoid gaps
    const loopDur = BEAT * 4;
    const delay = (t0 + loopDur - ctx.currentTime - 0.1) * 1000;
    this.musicTimeout = setTimeout(
      () => {
        if (this.musicRunning) this.scheduleLoop(t0 + loopDur);
      },
      Math.max(0, delay),
    );
  }

  // ── sound effects ────────────────────────────────────────────────────────────

  playSound(type: SoundEffect) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    this.resume();
    switch (type) {
      case 'place':
        return this.sfxPlace();
      case 'invalid':
        return this.sfxInvalid();
      case 'turnStart':
        return this.sfxTurnStart();
      case 'gameStart':
        return this.sfxGameStart();
      case 'gameEnd':
        return this.sfxGameEnd();
    }
  }

  private sfxPlace() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.1);
    g.gain.setValueAtTime(0.45, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private sfxInvalid() {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(this.sfxGain!);
    osc.type = 'square';
    osc.frequency.value = 110;
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private sfxTurnStart() {
    const ctx = this.ctx!;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  private sfxGameStart() {
    const ctx = this.ctx!;
    [261.63, 329.63, 392.0, 523.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  private sfxGameEnd() {
    const ctx = this.ctx!;
    [392.0, 349.23, 329.63, 261.63].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  get muted() {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    localStorage.setItem('blockus_muted', String(this._muted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this._muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
    return this._muted;
  }
}

export const audioManager = new AudioManager();
