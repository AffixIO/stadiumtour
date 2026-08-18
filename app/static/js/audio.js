// Credit: @paparichens

export class AudioEngine {
  constructor() {
    this.ctx = null;
  }

  _ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  _tone(freq, duration, type = "sine", gainValue = 0.05) {
    const ctx = this._ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  allow() {
    this._tone(880, 0.12, "sine", 0.06);
    setTimeout(() => this._tone(1320, 0.08, "triangle", 0.04), 80);
  }

  deny() {
    this._tone(220, 0.15, "sawtooth", 0.07);
    setTimeout(() => this._tone(180, 0.18, "square", 0.06), 120);
  }

  door() {
    this._tone(520, 0.1, "triangle", 0.05);
  }

  warning() {
    this._tone(640, 0.12, "square", 0.05);
    setTimeout(() => this._tone(640, 0.12, "square", 0.05), 160);
  }
}
