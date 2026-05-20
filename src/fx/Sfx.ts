// 零素材音效：用 Web Audio 振荡器实时合成。无需加载任何文件。
// 单独的 AudioContext，不碰 Phaser 声音系统。

type SfxName =
  | "jump"
  | "doubleJump"
  | "dash"
  | "wallJump"
  | "glide"
  | "bash"
  | "bashImpact"
  | "hurt"
  | "pickupDust"
  | "pickupHeart"
  | "land"
  | "death"
  | "biome";

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume = 0.8;

  // 必须在用户手势内调用一次（浏览器自动播放策略）。
  ensureContext(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);

    // 预生成一段白噪声给冲刺/落地/命中用
    const len = Math.floor(this.ctx.sampleRate * 0.4);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.volume;
  }

  getVolume(): number {
    return this.volume;
  }

  play(name: SfxName): void {
    if (!this.ctx || !this.master || this.volume <= 0) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "jump":
        this.tone(t, "triangle", 240, 460, 0.09, 0.5);
        break;
      case "doubleJump":
        this.tone(t, "triangle", 360, 720, 0.1, 0.45);
        break;
      case "wallJump":
        this.tone(t, "square", 220, 520, 0.08, 0.32);
        break;
      case "dash":
        this.tone(t, "sawtooth", 520, 140, 0.14, 0.32);
        this.noise(t, 0.1, 0.18, 1800);
        break;
      case "glide":
        this.tone(t, "sine", 720, 760, 0.18, 0.16);
        break;
      case "bash":
        this.tone(t, "sine", 420, 940, 0.16, 0.34);
        break;
      case "bashImpact":
        this.tone(t, "sine", 180, 70, 0.22, 0.5);
        this.noise(t, 0.14, 0.3, 900);
        break;
      case "hurt":
        this.tone(t, "sawtooth", 320, 110, 0.22, 0.4);
        break;
      case "pickupDust":
        this.tone(t, "sine", 880, 1180, 0.08, 0.3);
        break;
      case "pickupHeart":
        this.tone(t, "sine", 660, 660, 0.09, 0.34);
        this.tone(t + 0.08, "sine", 990, 990, 0.12, 0.34);
        break;
      case "land":
        this.tone(t, "sine", 150, 90, 0.1, 0.3);
        this.noise(t, 0.07, 0.16, 700);
        break;
      case "death":
        this.tone(t, "sawtooth", 420, 70, 0.6, 0.45);
        break;
      case "biome":
        this.tone(t, "sine", 523, 523, 0.18, 0.3);
        this.tone(t + 0.12, "sine", 784, 784, 0.3, 0.3);
        break;
    }
  }

  // 单音：频率从 f0 滑到 f1，带快速包络。
  private tone(
    start: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    gain: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), start + dur);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  // 噪声 burst（经低通），给冲撞/落地用。
  private noise(start: number, dur: number, gain: number, cutoff: number): void {
    if (!this.ctx || !this.master || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start(start);
    src.stop(start + dur + 0.02);
  }
}

export const Sfx = new SfxEngine();
