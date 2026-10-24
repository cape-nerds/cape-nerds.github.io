/**
 * Procedural Web Audio Engine for "THE ROAD TO ALEVEL"
 * Exactly replicated from user attachment
 */

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private windG: GainNode | null = null;
  private windF: BiquadFilterNode | null = null;
  private musicG: GainNode | null = null;
  private droneF: BiquadFilterNode | null = null;
  private isStarted: boolean = false;
  private isMuted: boolean = false;

  private initCtx() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 4;

    this.master = this.ctx.createGain();
    this.master.gain.value = this.isMuted ? 0 : 0.9;
    this.master.connect(this.comp);
    this.comp.connect(this.ctx.destination);

    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    /* wind */
    const wn = this.noise();
    this.windF = this.ctx.createBiquadFilter();
    this.windF.type = 'bandpass';
    this.windF.frequency.value = 500;
    this.windF.Q.value = 0.8;

    this.windG = this.ctx.createGain();
    this.windG.gain.value = 0.0;
    wn.connect(this.windF);
    this.windF.connect(this.windG);
    this.windG.connect(this.master);
    wn.start();

    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 0.13;
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(this.windF.frequency);
    lfo.start();

    /* drone: two detuned saws + sub through slow lowpass */
    this.musicG = this.ctx.createGain();
    this.musicG.gain.value = 0;
    this.musicG.connect(this.master);

    this.droneF = this.ctx.createBiquadFilter();
    this.droneF.type = 'lowpass';
    this.droneF.frequency.value = 380;
    this.droneF.Q.value = 2;
    this.droneF.connect(this.musicG);

    [55, 55.4, 82.4, 27.5].forEach((f, i) => {
      if (!this.ctx || !this.droneF) return;
      const o = this.ctx.createOscillator();
      o.type = i === 3 ? 'sine' : 'sawtooth';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = i === 3 ? 0.9 : 0.25;
      o.connect(g);
      g.connect(this.droneF);
      o.start();
    });

    this.isStarted = true;
  }

  private noise(): AudioBufferSourceNode {
    if (!this.ctx || !this.noiseBuf) throw new Error('No audio context');
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    return s;
  }

  private env(g: GainNode, t0: number, a: number, d: number, peak: number, sus: number = 0) {
    g.gain.cancelScheduledValues(t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t0 + a + d);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(muted ? 0 : 0.9, this.ctx.currentTime);
    }
  }

  public getMuted() {
    return this.isMuted;
  }

  public startAmbient() {
    this.initCtx();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playClick() {
    this.step(0.18);
  }

  public step(vol: number = 0.25, when: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime + when;
      const s = this.noise(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'lowpass';
      f.frequency.value = 420 + Math.random() * 160;
      this.env(g, t, 0.005, 0.11, vol);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t, Math.random());
      s.stop(t + 0.16);
    } catch {
      // Ignored
    }
  }

  public drum(vol: number = 0.7, f0: number = 95) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0 * 1.8, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 0.45, t + 0.28);
      this.env(g, t, 0.004, 0.5, vol);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.6);

      const s = this.noise(), nf = this.ctx.createBiquadFilter(), ng = this.ctx.createGain();
      nf.type = 'bandpass';
      nf.frequency.value = 900;
      this.env(ng, t, 0.002, 0.07, vol * 0.25);
      s.connect(nf);
      nf.connect(ng);
      ng.connect(this.master);
      s.start(t);
      s.stop(t + 0.1);
    } catch {
      // Ignored
    }
  }

  public note(freq: number, dur: number = 1.6, vol: number = 0.12, type: OscillatorType = 'triangle', when: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = type;
      o2.type = 'sine';
      o.frequency.value = freq;
      o2.frequency.value = freq * 2.004;
      f.type = 'lowpass';
      f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f);
      o2.connect(f);
      f.connect(g);
      g.connect(this.master);
      o.start(t);
      o2.start(t);
      o.stop(t + dur + 0.1);
      o2.stop(t + dur + 0.1);
    } catch {
      // Ignored
    }
  }

  public rumble(dur: number = 5, vol: number = 0.9) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime, s = this.noise(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(90, t);
      f.frequency.linearRampToValueAtTime(260, t + dur * 0.4);
      f.frequency.linearRampToValueAtTime(70, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + dur + 0.1);

      const o = this.ctx.createOscillator(), og = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(34, t);
      o.frequency.linearRampToValueAtTime(26, t + dur);
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.9, t + 0.8);
      og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(og);
      og.connect(this.master);
      o.start(t);
      o.stop(t + dur + 0.1);
    } catch {
      // Ignored
    }
  }

  public crack() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime, s = this.noise(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'highpass';
      f.frequency.value = 1400;
      this.env(g, t, 0.003, 0.5, 0.7);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + 0.7);
    } catch {
      // Ignored
    }
  }

  public roar(dur: number = 3.4) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime;
      [0, 1, 2].forEach(i => {
        if (!this.ctx || !this.master) return;
        const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter(), ws = this.ctx.createWaveShaper();
        const c = new Float32Array(256);
        for (let k = 0; k < 256; k++) {
          const x = k / 128 - 1;
          c[k] = Math.tanh(x * 5);
        }
        ws.curve = c;
        const base = 78 + i * 31;
        o.type = 'sawtooth';
        o2.type = 'square';
        o.frequency.setValueAtTime(base * 2.2, t + i * 0.06);
        o.frequency.exponentialRampToValueAtTime(base, t + dur * 0.8);
        o2.frequency.setValueAtTime(base * 2.25, t + i * 0.06);
        o2.frequency.exponentialRampToValueAtTime(base * 1.01, t + dur * 0.8);

        const lf = this.ctx.createOscillator(), lg = this.ctx.createGain();
        lf.frequency.value = 23 + i * 5;
        lg.gain.value = 18;
        lf.connect(lg);
        lg.connect(o.frequency);
        lf.start(t);
        lf.stop(t + dur + 0.2);

        bp.type = 'bandpass';
        bp.Q.value = 1.2;
        bp.frequency.setValueAtTime(700, t);
        bp.frequency.exponentialRampToValueAtTime(220, t + dur);

        g.gain.setValueAtTime(0.0001, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.5, t + 0.25 + i * 0.06);
        g.gain.setValueAtTime(0.5, t + dur * 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        o.connect(ws);
        o2.connect(ws);
        ws.connect(bp);
        bp.connect(g);
        g.connect(this.master);
        o.start(t);
        o2.start(t);
        o.stop(t + dur + 0.2);
        o2.stop(t + dur + 0.2);
      });
    } catch {
      // Ignored
    }
  }

  public fire(dur: number = 2, vol: number = 0.55, when: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime + when, s = this.noise(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'bandpass';
      f.Q.value = 0.6;
      f.frequency.setValueAtTime(500, t);
      f.frequency.linearRampToValueAtTime(1500, t + dur * 0.3);
      f.frequency.linearRampToValueAtTime(380, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.2);
      g.gain.setValueAtTime(vol, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + dur + 0.1);
    } catch {
      // Ignored
    }
  }

  public shing(when: number = 0) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx || !this.master) return;
      const t = this.ctx.currentTime + when, s = this.noise(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
      f.type = 'bandpass';
      f.Q.value = 6;
      f.frequency.setValueAtTime(2600, t);
      f.frequency.exponentialRampToValueAtTime(7600, t + 0.45);
      this.env(g, t, 0.02, 0.5, 0.35);
      s.connect(f);
      f.connect(g);
      g.connect(this.master);
      s.start(t);
      s.stop(t + 0.6);
      this.note(1568, 1.1, 0.04, 'sine', when + 0.05);
    } catch {
      // Ignored
    }
  }

  public hit(vol: number = 1) {
    this.drum(vol, 70);
    this.drum(vol * 0.7, 48);
    this.rumble(3.2, 0.5);
  }

  public chord(root: number = 110, dur: number = 5, vol: number = 0.1) {
    [1, 1.5, 2, 2.378, 3].forEach((r, i) => this.note(root * r, dur, vol / (1 + i * 0.3), 'triangle', i * 0.04));
  }

  public set(tt: number) {
    if (!this.isStarted || !this.ctx || !this.windG || !this.musicG || !this.droneF) return;
    const now = this.ctx.currentTime;
    const wind = 0.16 + 0.12 * sm(30, 40, tt) - 0.14 * sm(55.5, 56.5, tt);
    this.windG.gain.setTargetAtTime(Math.max(0, wind), now, 0.2);
    const m = sm(3, 9, tt) * 0.22 + sm(34, 38, tt) * 0.2 + sm(51, 53, tt) * 0.18;
    this.musicG.gain.setTargetAtTime(m * (tt > 55.8 ? 0.5 : 1), now, 0.3);
    this.droneF.frequency.setTargetAtTime(260 + 900 * sm(34, 44, tt) + 600 * sm(50, 55, tt), now, 0.3);
  }

  public playDragonRoar() {
    this.roar(3.4);
  }

  public playSwordSlash() {
    this.shing();
  }

  public playVictoryFanfare() {
    this.chord(220, 4, 0.15);
  }
}

export const soundManager = new SoundEngine();
