const fs = require('fs');
const path = require('path');

const sampleRate = 44100;

class PinkNoise {
  constructor() {
    this.b0 = 0; this.b1 = 0; this.b2 = 0; this.b3 = 0; this.b4 = 0; this.b5 = 0; this.b6 = 0;
  }
  next() {
    const white = Math.random() * 2 - 1;
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.96900 * this.b2 + white * 0.1538520;
    this.b3 = 0.86650 * this.b3 + white * 0.3104856;
    this.b4 = 0.55000 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.0168980;
    const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return pink * 0.13;
  }
}

class Biquad {
  constructor() {
    this.b0 = 0; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
  setLowpass(freq, q) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.46));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const a0 = 1 + alpha;
    this.b0 = (1 - cos) / 2 / a0;
    this.b1 = (1 - cos) / a0;
    this.b2 = (1 - cos) / 2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  setHighpass(freq, q) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.46));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const a0 = 1 + alpha;
    this.b0 = (1 + cos) / 2 / a0;
    this.b1 = -(1 + cos) / a0;
    this.b2 = (1 + cos) / 2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  setBandpass(freq, q) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.46));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = isNaN(y) ? 0 : y;
    return this.y1;
  }
}

// Zero-Delay-Feedback (ZDF) State Variable Filter (Cytomic / Andy Simper)
class ZdfSVF {
  constructor() {
    this.ic1eq = 0;
    this.ic2eq = 0;
  }
  process(v0, cutoffHz, q) {
    const freq = Math.max(15, Math.min(cutoffHz, sampleRate * 0.46));
    const g = Math.tan((Math.PI * freq) / sampleRate);
    const k = 1 / Math.max(0.08, q);
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = v0 - this.ic2eq;
    const v1 = a1 * this.ic1eq + a2 * v3;
    const v2 = this.ic2eq + a2 * this.ic1eq + a3 * v3;
    this.ic1eq = 2 * v1 - this.ic1eq;
    this.ic2eq = 2 * v2 - this.ic2eq;
    return {
      lp: isNaN(v2) ? 0 : v2,
      bp: isNaN(v1) ? 0 : v1,
      hp: isNaN(v0 - k * v1 - v2) ? 0 : (v0 - k * v1 - v2),
    };
  }
}

// TB-303 Sawtooth
function tb303Saw(phase, freq) {
  const harmCount = Math.min(32, Math.max(4, Math.floor((sampleRate * 0.45) / freq)));
  let saw = 0;
  for (let k = 1; k <= harmCount; k++) {
    saw += Math.sin(k * phase) / k;
  }
  return saw * (2 / Math.PI) + Math.sin(phase * 0.5) * 0.15;
}

// TB-303 Asymmetric Square
function tb303Square(phase, freq) {
  const harmCount = Math.min(32, Math.max(4, Math.floor((sampleRate * 0.45) / freq)));
  let sq = 0;
  const duty = 0.60;
  for (let k = 1; k <= harmCount; k++) {
    const factor = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    sq += factor * Math.cos(k * phase);
  }
  return sq * 1.5 + Math.sin(phase * 0.5) * 0.2;
}

// Bandlimited Sawtooth
function bandlimitedSaw(phase, freq, numHarmonics = 16) {
  let sum = 0;
  for (let n = 1; n <= numHarmonics; n++) {
    const f = freq * n;
    if (f >= sampleRate * 0.46) break;
    const damping = Math.exp(-n * 0.07);
    sum += (Math.sin(phase * n) / n) * damping;
  }
  return sum * (2 / Math.PI);
}

// Bandlimited Square
function bandlimitedSquare(phase, freq, numHarmonics = 12) {
  let sum = 0;
  for (let n = 1; n <= numHarmonics; n += 2) {
    const f = freq * n;
    if (f >= sampleRate * 0.46) break;
    const damping = Math.exp(-n * 0.05);
    sum += (Math.sin(phase * n) / n) * damping;
  }
  return sum * (4 / Math.PI);
}

// Smooth tube saturation
function warmSaturate(x, drive = 1.0) {
  return Math.tanh(x * drive * 0.9) * 0.94;
}

function finalizeAudio(data) {
  const len = data.length;
  // 2ms fade in
  const inSamples = Math.min(Math.floor(sampleRate * 0.002), Math.floor(len * 0.05));
  for (let i = 0; i < inSamples; i++) {
    data[i] *= i / inSamples;
  }
  // 8ms fade out
  const outSamples = Math.min(Math.floor(sampleRate * 0.008), Math.floor(len * 0.1));
  const startOut = len - outSamples;
  for (let i = startOut; i < len; i++) {
    data[i] *= (len - i) / outSamples;
  }
  // Peak normalization to 0.94 (-0.5 dBFS)
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0.001) {
    const gain = 0.94 / peak;
    for (let i = 0; i < len; i++) {
      data[i] *= gain;
    }
  }
}

function encodeWav(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // 16 bits
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intVal = clamped < 0 ? clamped * 32768 : clamped * 32767;
    buffer.writeInt16LE(Math.round(intVal), 44 + i * 2);
  }
  return buffer;
}

// -------------------------------------------------------------
// RECIPES FOR ALL 60 HIGH-FIDELITY STUDIO SAMPLES
// -------------------------------------------------------------

const recipes = {
  // --- KICKS ---
  'Kick_Punch_01.wav': (dur = 0.55) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 54 + 140 * Math.exp(-t * 38) + 40 * Math.exp(-t * 12);
      phase += (2 * Math.PI * freq) / sampleRate;
      const body = Math.sin(phase) + 0.12 * Math.sin(phase * 2) * Math.exp(-t * 20);
      const env = Math.exp(-t * 7.5);
      const beater = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 450) * 0.45;
      data[i] = warmSaturate(body * env + beater, 1.25);
    }
    return data;
  },

  'Kick_Deep808_02.wav': (dur = 0.75) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 48 + 110 * Math.exp(-t * 32);
      phase += (2 * Math.PI * freq) / sampleRate;
      const body = Math.sin(phase) + 0.08 * Math.sin(phase * 2) * Math.exp(-t * 12);
      const env = Math.exp(-t * 4.2);
      const click = Math.sin(2 * Math.PI * 2400 * t) * Math.exp(-t * 500) * 0.25;
      data[i] = warmSaturate(body * env + click, 1.15);
    }
    return data;
  },

  'Kick_Tight_03.wav': (dur = 0.38) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 56 + 180 * Math.exp(-t * 55);
      phase += (2 * Math.PI * freq) / sampleRate;
      const body = Math.sin(phase) * Math.exp(-t * 12.0);
      const beater = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 500) * 0.4;
      data[i] = warmSaturate(body + beater, 1.2);
    }
    return data;
  },

  'Kick_Modular_04.wav': (dur = 0.5) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 52 + 220 * Math.exp(-t * 65);
      phase += (2 * Math.PI * freq) / sampleRate;
      const body = Math.sin(phase) + 0.15 * Math.sin(phase * 3) * Math.exp(-t * 18);
      const env = Math.exp(-t * 8.0);
      const crack = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 600) * 0.5;
      data[i] = warmSaturate(body * env + crack, 1.35);
    }
    return data;
  },

  // --- SNARES ---
  'Snare_Crisp_01.wav': (dur = 0.5) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const bp = new Biquad();
    bp.setBandpass(2800, 1.6);
    let p1 = 0, p2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p1 += (2 * Math.PI * (185 + 70 * Math.exp(-t * 40))) / sampleRate;
      p2 += (2 * Math.PI * (330 + 90 * Math.exp(-t * 50))) / sampleRate;
      const tone = (Math.sin(p1) + 0.5 * Math.sin(p2)) * Math.exp(-t * 15) * 0.6;
      const wires = bp.process(pink.next()) * (Math.exp(-t * 12) + 0.25 * Math.exp(-t * 5)) * 1.2;
      const stick = Math.sin(2 * Math.PI * 4800 * t) * Math.exp(-t * 350) * 0.35;
      data[i] = warmSaturate(tone + wires + stick, 1.2);
    }
    return data;
  },

  'Snare_909Type_02.wav': (dur = 0.52) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const hp = new Biquad();
    hp.setHighpass(3200, 1.2);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * (210 + 120 * Math.exp(-t * 45))) / sampleRate;
      const body = Math.sin(p) * Math.exp(-t * 16) * 0.7;
      const wires = hp.process(pink.next()) * Math.exp(-t * 10) * 1.4;
      const stick = Math.sin(2 * Math.PI * 5400 * t) * Math.exp(-t * 400) * 0.4;
      data[i] = warmSaturate(body + wires + stick, 1.25);
    }
    return data;
  },

  'Snare_Trap_03.wav': (dur = 0.42) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const bp = new Biquad();
    bp.setBandpass(4200, 2.0);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * (240 + 160 * Math.exp(-t * 60))) / sampleRate;
      const body = Math.sin(p) * Math.exp(-t * 22) * 0.5;
      const noise = bp.process(pink.next()) * Math.exp(-t * 14) * 1.6;
      const click = Math.sin(2 * Math.PI * 6200 * t) * Math.exp(-t * 450) * 0.45;
      data[i] = warmSaturate(body + noise + click, 1.25);
    }
    return data;
  },

  'Snare_Rimshot_04.wav': (dur = 0.38) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const bpRim = new Biquad();
    bpRim.setBandpass(1650, 4.0);
    const bpWood = new Biquad();
    bpWood.setBandpass(880, 5.0);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const woodRing = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 35) * 0.5;
      const rimCrack = Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t * 50) * 0.5;
      const imp = Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 300) * 0.4;
      const ping = bpRim.process(imp) + bpWood.process(imp);
      const tail = (Math.random() * 2 - 1) * Math.exp(-t * 24) * 0.2;
      data[i] = warmSaturate(woodRing + rimCrack + ping + tail, 1.2);
    }
    return data;
  },

  // --- CLAPS ---
  'Clap_HandClap_01.wav': (dur = 0.5) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const bp = new Biquad();
    bp.setBandpass(1350, 1.8);
    const flams = [0, 0.011, 0.022];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = bp.process(pink.next());
      let bursts = 0;
      flams.forEach(b => {
        if (t >= b) {
          const dt = t - b;
          bursts += p * Math.min(1.0, dt / 0.0015) * Math.exp(-dt * 130);
        }
      });
      const tail = p * Math.exp(-t * 11) * 0.7;
      data[i] = warmSaturate(bursts * 0.7 + tail, 1.25);
    }
    return data;
  },

  'Clap_Studio808_02.wav': (dur = 0.55) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const bp = new Biquad();
    bp.setBandpass(1550, 2.0);
    const flams = [0, 0.012, 0.025];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = bp.process(pink.next());
      let bursts = 0;
      flams.forEach(b => {
        if (t >= b) {
          const dt = t - b;
          bursts += p * Math.min(1.0, dt / 0.0015) * Math.exp(-dt * 120);
        }
      });
      const tail = p * Math.exp(-t * 9) * 0.8;
      data[i] = warmSaturate(bursts * 0.75 + tail, 1.25);
    }
    return data;
  },

  'Clap_Snap_03.wav': (dur = 0.38) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const bp = new Biquad();
    bp.setBandpass(1850, 2.5);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const tone = Math.sin(2 * Math.PI * 1820 * t) * Math.exp(-t * 60) * 0.6;
      const noise = bp.process(Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.5;
      data[i] = warmSaturate(tone + noise, 1.2);
    }
    return data;
  },

  'Clap_GroupStack_04.wav': (dur = 0.6) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const pink = new PinkNoise();
    const bp = new Biquad();
    bp.setBandpass(1250, 1.6);
    const flams = [0, 0.009, 0.019, 0.031];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = bp.process(pink.next());
      let bursts = 0;
      flams.forEach(b => {
        if (t >= b) {
          const dt = t - b;
          bursts += p * Math.min(1.0, dt / 0.0015) * Math.exp(-dt * 110);
        }
      });
      const body = Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 30) * 0.35;
      const tail = p * Math.exp(-t * 8) * 0.75;
      data[i] = warmSaturate(bursts * 0.65 + body + tail, 1.25);
    }
    return data;
  },

  // --- HI-HATS ---
  'Hat_Closed_01.wav': (dur = 0.22) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const hp = new Biquad();
    hp.setHighpass(8200, 1.4);
    const freqs = [245, 306, 384, 523, 640, 820];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let oscSum = 0;
      freqs.forEach(f => {
        oscSum += Math.sin(2 * Math.PI * f * t) > 0 ? 0.3 : -0.3;
      });
      const raw = oscSum + (Math.random() * 2 - 1) * 0.8;
      const filtered = hp.process(raw);
      const env = Math.exp(-t * 40.0);
      data[i] = filtered * env * 1.5;
    }
    return data;
  },

  'Hat_Open_02.wav': (dur = 0.45) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const hp = new Biquad();
    hp.setHighpass(7400, 1.2);
    const freqs = [245, 306, 384, 523, 640, 820];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let oscSum = 0;
      freqs.forEach(f => {
        oscSum += Math.sin(2 * Math.PI * f * t) > 0 ? 0.25 : -0.25;
      });
      const raw = oscSum + (Math.random() * 2 - 1) * 0.7;
      const filtered = hp.process(raw);
      const env = Math.exp(-t * 9.0);
      data[i] = filtered * env * 1.4;
    }
    return data;
  },

  'Hat_Ticked_03.wav': (dur = 0.18) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const bp = new Biquad();
    bp.setBandpass(9500, 2.2);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const tick = Math.sin(2 * Math.PI * 9600 * t) * Math.exp(-t * 90) * 0.5;
      const noise = bp.process(Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.7;
      data[i] = (tick + noise) * 1.4;
    }
    return data;
  },

  'Hat_Metallic_04.wav': (dur = 0.3) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const hp = new Biquad();
    hp.setHighpass(6800, 1.5);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const c1 = Math.sin(2 * Math.PI * 8400 * t);
      const c2 = Math.sin(2 * Math.PI * 11200 * t) * 0.6;
      const chime = (c1 + c2) * Math.exp(-t * 18);
      const air = hp.process(Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.5;
      data[i] = (chime + air) * 1.35;
    }
    return data;
  },

  // --- TOMS ---
  'Tom_High_01.wav': (dur = 0.48) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 135 + 85 * Math.exp(-t * 28);
      p += (2 * Math.PI * freq) / sampleRate;
      const tone = Math.sin(p) * Math.exp(-t * 9.0);
      const slap = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 250) * 0.35;
      data[i] = warmSaturate(tone + slap, 1.2);
    }
    return data;
  },

  'Tom_Mid_02.wav': (dur = 0.52) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 100 + 65 * Math.exp(-t * 24);
      p += (2 * Math.PI * freq) / sampleRate;
      const tone = Math.sin(p) * Math.exp(-t * 7.5);
      const slap = Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 220) * 0.35;
      data[i] = warmSaturate(tone + slap, 1.2);
    }
    return data;
  },

  'Tom_Low_03.wav': (dur = 0.58) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 75 + 50 * Math.exp(-t * 20);
      p += (2 * Math.PI * freq) / sampleRate;
      const tone = Math.sin(p) * Math.exp(-t * 6.0);
      const slap = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-t * 200) * 0.35;
      data[i] = warmSaturate(tone + slap, 1.2);
    }
    return data;
  },

  'Tom_Floor_04.wav': (dur = 0.65) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 58 + 42 * Math.exp(-t * 18);
      p += (2 * Math.PI * freq) / sampleRate;
      const tone = Math.sin(p) * Math.exp(-t * 5.0);
      const slap = Math.sin(2 * Math.PI * 750 * t) * Math.exp(-t * 180) * 0.35;
      data[i] = warmSaturate(tone + slap, 1.2);
    }
    return data;
  },

  // --- PERCUSSION ---
  'Perc_WoodBlock_01.wav': (dur = 0.35) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f1 = 1750 * (1 + 0.3 * Math.exp(-t * 80));
      const f2 = 2450 * (1 + 0.2 * Math.exp(-t * 90));
      const t1 = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t * 45);
      const t2 = Math.sin(2 * Math.PI * f2 * t) * 0.5 * Math.exp(-t * 55);
      const click = (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.3;
      data[i] = (t1 + t2 + click) * 1.3;
    }
    return data;
  },

  'Perc_Clave_02.wav': (dur = 0.32) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = 2500 + 400 * Math.exp(-t * 100);
      const ping = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40);
      const ring = Math.sin(2 * Math.PI * (f * 2.1) * t) * 0.3 * Math.exp(-t * 60);
      data[i] = (ping + ring) * 1.4;
    }
    return data;
  },

  'Perc_FM_Bell_03.wav': (dur = 0.45) => {
    // Classic TR-808 Cowbell (Two bandpassed square waves at 540Hz and 800Hz)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const bp1 = new Biquad();
    bp1.setBandpass(540, 4.0);
    const bp2 = new Biquad();
    bp2.setBandpass(800, 4.0);
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const sq1 = Math.sin(2 * Math.PI * 540 * t) > 0 ? 1 : -1;
      const sq2 = Math.sin(2 * Math.PI * 800 * t) > 0 ? 1 : -1;
      const o1 = bp1.process(sq1) * 0.8;
      const o2 = bp2.process(sq2) * 1.0;
      const env = Math.exp(-t * 9.0);
      data[i] = warmSaturate((o1 + o2) * env, 1.25);
    }
    return data;
  },

  'Perc_Conga_04.wav': (dur = 0.42) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = 230 + 110 * Math.exp(-t * 40);
      p += (2 * Math.PI * freq) / sampleRate;
      const body = Math.sin(p) * Math.exp(-t * 11);
      const slap = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 260) * 0.45;
      data[i] = warmSaturate(body + slap, 1.2);
    }
    return data;
  },

  // --- SUB 808 ---
  'Sub808_SubC1_01.wav': (dur = 1.6) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    const base = 32.7; // C1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = base + 45 * Math.exp(-t * 24);
      p += (2 * Math.PI * f) / sampleRate;
      const sub = Math.sin(p);
      const harm = Math.sin(p * 2) * 0.12 * Math.exp(-t * 8);
      const env = Math.exp(-t * 2.0);
      data[i] = warmSaturate(sub * env + harm, 1.15);
    }
    return data;
  },

  'Sub808_Saturated_02.wav': (dur = 1.6) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    const base = 36.7; // D1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = base + 55 * Math.exp(-t * 26);
      p += (2 * Math.PI * f) / sampleRate;
      const sub = Math.sin(p);
      const harm = Math.sin(p * 2) * 0.25 + Math.sin(p * 3) * 0.12;
      const env = Math.exp(-t * 2.2);
      data[i] = warmSaturate((sub + harm) * env, 1.35);
    }
    return data;
  },

  'Sub808_Glide_03.wav': (dur = 1.8) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    const base = 41.2; // E1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const glide = t < 0.25 ? 25 * Math.sin((t / 0.25) * Math.PI) : 0;
      const f = base + glide + 30 * Math.exp(-t * 20);
      p += (2 * Math.PI * f) / sampleRate;
      const sub = Math.sin(p);
      const env = Math.exp(-t * 1.8);
      data[i] = warmSaturate(sub * env, 1.2);
    }
    return data;
  },

  'Sub808_Heavy_04.wav': (dur = 1.7) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    const base = 43.65; // F1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = base + 60 * Math.exp(-t * 30);
      p += (2 * Math.PI * f) / sampleRate;
      const sub = Math.sin(p);
      const overtone = Math.sin(p * 2) * 0.3 * Math.exp(-t * 4);
      const env = Math.exp(-t * 2.0);
      data[i] = warmSaturate((sub + overtone) * env, 1.45);
    }
    return data;
  },

  // --- SYNTHS ---
  'Synth_ChordCmin_01.wav': (dur = 1.2) => {
    // Lush C minor triad + 7th (C4, Eb4, G4, Bb4)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [261.63, 311.13, 392.0, 466.16];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let sum = 0;
      notes.forEach((f, idx) => {
        const p = 2 * Math.PI * f * t;
        const saw = bandlimitedSaw(p, f, 12);
        sum += saw;
      });
      const env = Math.min(1.0, t / 0.04) * Math.exp(-t * 2.8);
      data[i] = warmSaturate((sum / notes.length) * env, 1.2);
    }
    return data;
  },

  'Synth_Pluck_02.wav': (dur = 1.0) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 440; // A4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = 2 * Math.PI * root * t;
      // Filter sweep modeled in harmonics
      const filterHarmonics = Math.max(1, Math.floor(16 * Math.exp(-t * 12)));
      const osc = bandlimitedSaw(p, root, filterHarmonics);
      const env = Math.exp(-t * 4.5);
      data[i] = warmSaturate(osc * env, 1.25);
    }
    return data;
  },

  'Synth_Laser_03.wav': (dur = 0.8) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = 200 + 2600 * Math.exp(-t * 18);
      p += (2 * Math.PI * f) / sampleRate;
      const s = Math.sin(p);
      const env = Math.exp(-t * 5.0);
      data[i] = warmSaturate(s * env, 1.2);
    }
    return data;
  },

  'Synth_Pad_04.wav': (dur = 1.5) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 329.63; // E4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p1 = 2 * Math.PI * (root * 0.996) * t;
      const p2 = 2 * Math.PI * (root * 1.004) * t;
      const s1 = bandlimitedSaw(p1, root, 10);
      const s2 = bandlimitedSaw(p2, root, 10);
      const env = Math.min(1.0, t / 0.15) * Math.exp(-t * 1.8);
      data[i] = warmSaturate((s1 + s2) * 0.5 * env, 1.15);
    }
    return data;
  },

  // --- BASS ---
  'Bass_SlapFunk_01.wav': (dur = 0.7) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    let p = 0;
    const base = 82.41; // E2
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f = base + 60 * Math.exp(-t * 50);
      p += (2 * Math.PI * f) / sampleRate;
      const body = Math.sin(p) * Math.exp(-t * 6.5);
      const twang = bandlimitedSaw(p * 2, f * 2, 8) * Math.exp(-t * 15) * 0.45;
      const thumb = Math.sin(2 * Math.PI * 950 * t) * Math.exp(-t * 220) * 0.35;
      data[i] = warmSaturate(body + twang + thumb, 1.3);
    }
    return data;
  },

  'Bass_AcidSaw_02.wav': (dur = 1.0) => {
    // Authentic 303 Acid Bass Saw with resonant 24dB diode squelch
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 65.41; // C2
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = tb303Saw(p, root);
      const sub = Math.sin(p) * 0.45;
      const env = Math.exp(-t * 2.8);
      const cutoff = 320 + 4400 * Math.exp(-t * 5.5);
      const s1 = svf1.process(saw + sub, cutoff, 8.2).lp;
      const sat = Math.tanh(s1 * 1.3);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.5).lp;
      data[i] = warmSaturate(s2 * env * 1.6, 1.35);
    }
    return data;
  },

  'Bass_DarkReese_03.wav': (dur = 1.3) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 55.0; // A1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p1 = 2 * Math.PI * (root * 0.993) * t;
      const p2 = 2 * Math.PI * (root * 1.007) * t;
      const s1 = bandlimitedSaw(p1, root, 8);
      const s2 = bandlimitedSaw(p2, root, 8);
      const sub = Math.sin(2 * Math.PI * root * t) * 0.6;
      const env = Math.min(1.0, t / 0.05) * Math.exp(-t * 2.0);
      data[i] = warmSaturate((s1 + s2 + sub) * 0.45 * env, 1.3);
    }
    return data;
  },

  'Bass_SubMono_04.wav': (dur = 1.4) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 49.0; // G1
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = 2 * Math.PI * root * t;
      const sub = Math.sin(p);
      const harm = Math.sin(p * 2) * 0.18 * Math.exp(-t * 4);
      const env = Math.exp(-t * 1.8);
      data[i] = warmSaturate(sub * env + harm, 1.2);
    }
    return data;
  },

  'Bass_Resonant_05.wav': (dur = 0.9) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 73.42; // D2
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = 2 * Math.PI * root * t;
      const harmCount = Math.max(1, Math.floor(14 * Math.exp(-t * 8)));
      const pluck = bandlimitedSaw(p, root, harmCount);
      const env = Math.exp(-t * 4.0);
      data[i] = warmSaturate(pluck * env, 1.3);
    }
    return data;
  },

  'Bass_SawtoothMoog_01.wav': (dur = 1.4) => {
    // Moog 24dB Ladder Sawtooth Bass with sub fundamental and punchy envelope sweep
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 65.41; // C2
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = bandlimitedSaw(p, root, 24);
      const sub = Math.sin(p * 0.5) * 0.52;
      const env = Math.min(1.0, t / 0.002) * Math.exp(-t * 2.0);
      const cutoff = 240 + 3600 * Math.exp(-t * 8.5);
      const s1 = svf1.process(saw + sub, cutoff, 4.2).lp;
      const sat = Math.tanh(s1 * 1.3);
      const s2 = svf2.process(sat, cutoff * 0.95, 3.5).lp;
      data[i] = warmSaturate(s2 * env * 1.55, 1.35);
    }
    return data;
  },

  'Bass_SawtoothCyber_02.wav': (dur = 1.3) => {
    // Dual Detuned Cyber Saw Bass with aggressive stereo spread and biting harmonics
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 73.42; // D2
    const f1 = root * 0.9925;
    const f2 = root * 1.0075;
    let p1 = 0;
    let p2 = 0;
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p1 += (2 * Math.PI * f1) / sampleRate;
      p2 += (2 * Math.PI * f2) / sampleRate;
      const saw1 = bandlimitedSaw(p1, f1, 20);
      const saw2 = bandlimitedSaw(p2, f2, 20);
      const sub = Math.sin((p1 + p2) * 0.5) * 0.4;
      const env = Math.min(1.0, t / 0.003) * Math.exp(-t * 2.3);
      const cutoff = 380 + 4200 * Math.exp(-t * 7.5);
      const s1 = svf1.process((saw1 + saw2) * 0.55 + sub, cutoff, 5.2).lp;
      const sat = Math.tanh(s1 * 1.4);
      const s2 = svf2.process(sat, cutoff * 0.9, 4.0).lp;
      data[i] = warmSaturate(s2 * env * 1.6, 1.4);
    }
    return data;
  },

  'Bass_SawtoothPluck_03.wav': (dur = 1.1) => {
    // Snappy Sawtooth Pluck Bass (Fast 24dB filter snap, bouncy attack)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 82.41; // E2
    let p = 0;
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = bandlimitedSaw(p, root, 18);
      const click = t < 0.008 ? Math.sin(2 * Math.PI * 1600 * t) * (1.0 - t / 0.008) * 0.4 : 0;
      const env = Math.min(1.0, t / 0.001) * Math.exp(-t * 3.8);
      const cutoff = 280 + 4800 * Math.exp(-t * 18.0);
      const s1 = svf1.process(saw + click, cutoff, 6.0).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 4.5).lp;
      data[i] = warmSaturate(s2 * env * 1.6, 1.3);
    }
    return data;
  },

  'Bass_SawtoothSub_04.wav': (dur = 1.4) => {
    // Deep Sub Sawtooth Bass (Chest-thumping 55Hz sub + rich saw overtone)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 55.0; // A1
    let p = 0;
    const svf = new ZdfSVF();
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = bandlimitedSaw(p, root, 14) * 0.45;
      const sub = Math.sin(p) * 0.85;
      const env = Math.exp(-t * 1.8);
      const cutoff = 180 + 2200 * Math.exp(-t * 8.0);
      const s = svf.process(saw + sub, cutoff, 3.2).lp;
      data[i] = warmSaturate(s * env * 1.5, 1.25);
    }
    return data;
  },

  'Bass_Sawtooth80s_05.wav': (dur = 1.3) => {
    // 80s Disco / Juno-106 style Saw Bass with sub-square pulse
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 49.0; // G1
    let p = 0;
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = bandlimitedSaw(p, root, 16);
      const subSquare = (Math.sin(p * 0.5) > 0 ? 1 : -1) * 0.35;
      const env = Math.min(1.0, t / 0.002) * Math.exp(-t * 2.5);
      const cutoff = 320 + 3200 * Math.exp(-t * 11.0);
      const s1 = svf1.process(saw + subSquare, cutoff, 4.8).lp;
      const sat = Math.tanh(s1 * 1.3);
      const s2 = svf2.process(sat, cutoff * 0.95, 3.8).lp;
      data[i] = warmSaturate(s2 * env * 1.55, 1.3);
    }
    return data;
  },

  // --- KEYS ---
  'Key_Rhodes_01.wav': (dur = 1.4) => {
    // Rhodes EPiano (Bell tine + warm sine fundamental + gentle vibrato)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 261.63; // C4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const trem = 1.0 + 0.06 * Math.sin(2 * Math.PI * 4.5 * t);
      const fundamental = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 2.2);
      const octave = Math.sin(2 * Math.PI * (root * 2) * t) * 0.3 * Math.exp(-t * 3.5);
      const tine = Math.sin(2 * Math.PI * (root * 7.02) * t) * 0.45 * Math.exp(-t * 25);
      data[i] = warmSaturate((fundamental + octave + tine) * trem, 1.15);
    }
    return data;
  },

  'Key_GrandPiano_02.wav': (dur = 1.3) => {
    // Grand Piano hammer strike + acoustic decay
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 220.0; // A3
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p1 = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 2.5);
      const p2 = Math.sin(2 * Math.PI * (root * 2.002) * t) * 0.45 * Math.exp(-t * 3.5);
      const p3 = Math.sin(2 * Math.PI * (root * 3.008) * t) * 0.25 * Math.exp(-t * 5.0);
      const hammer = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.35;
      data[i] = warmSaturate(p1 + p2 + p3 + hammer, 1.15);
    }
    return data;
  },

  'Key_OrganDrawbar_03.wav': (dur = 1.5) => {
    // Hammond B3 Drawbar Organ with rotary chorus
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 261.63; // C4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const rotary = Math.sin(2 * Math.PI * 6.0 * t) * 0.005;
      const f = root * (1 + rotary);
      const h1 = Math.sin(2 * Math.PI * (f * 0.5) * t) * 0.5; // 16'
      const h2 = Math.sin(2 * Math.PI * f * t) * 1.0;          // 8'
      const h3 = Math.sin(2 * Math.PI * (f * 2) * t) * 0.6;    // 4'
      const h4 = Math.sin(2 * Math.PI * (f * 3) * t) * 0.35;   // 2-2/3'
      const env = Math.min(1.0, t / 0.02) * Math.exp(-t * 1.8);
      data[i] = warmSaturate((h1 + h2 + h3 + h4) * 0.35 * env, 1.15);
    }
    return data;
  },

  'Key_Clavinet_04.wav': (dur = 0.9) => {
    // Funky Clavinet pluck
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 196.0; // G3
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p = 2 * Math.PI * root * t;
      const pulse = bandlimitedSquare(p, root, 14);
      const env = Math.exp(-t * 5.5);
      const pluck = Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 180) * 0.3;
      data[i] = warmSaturate(pulse * env + pluck, 1.25);
    }
    return data;
  },

  'Key_Wurlitzer_05.wav': (dur = 1.3) => {
    // Wurlitzer 200A reed EPiano
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 293.66; // D4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const trem = 1.0 + 0.08 * Math.sin(2 * Math.PI * 5.5 * t);
      const p = 2 * Math.PI * root * t;
      const reed = Math.sin(p) + 0.3 * Math.sin(p * 3) + 0.15 * Math.sin(p * 5);
      const env = Math.exp(-t * 2.8);
      data[i] = warmSaturate(reed * env * trem, 1.25);
    }
    return data;
  },

  // --- PADS ---
  'Pad_WarmAtmos_01.wav': (dur = 1.8) => {
    // Warm atmospheric pad (A minor 9th: A3, C4, E4, B4)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [220, 261.63, 329.63, 493.88];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let sum = 0;
      notes.forEach((f, idx) => {
        const p1 = 2 * Math.PI * (f * 0.997) * t;
        const p2 = 2 * Math.PI * (f * 1.003) * t;
        sum += bandlimitedSaw(p1, f, 6) + bandlimitedSaw(p2, f, 6);
      });
      const env = Math.min(1.0, t / 0.3) * Math.exp(-t * 1.2);
      data[i] = warmSaturate((sum / notes.length) * 0.5 * env, 1.15);
    }
    return data;
  },

  'Pad_DreamyAmbient_02.wav': (dur = 1.9) => {
    // F major 7th (F3, A3, C4, E4)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [174.61, 220.0, 261.63, 329.63];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let sum = 0;
      notes.forEach((f) => {
        const p = 2 * Math.PI * f * t;
        sum += Math.sin(p) + 0.3 * Math.sin(p * 2);
      });
      const env = Math.min(1.0, t / 0.35) * Math.exp(-t * 1.1);
      data[i] = warmSaturate((sum / notes.length) * env, 1.15);
    }
    return data;
  },

  'Pad_VintageAnalog_03.wav': (dur = 1.7) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 196.0; // G3
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const p1 = 2 * Math.PI * (root * 0.995) * t;
      const p2 = 2 * Math.PI * (root * 1.005) * t;
      const s1 = bandlimitedSaw(p1, root, 8);
      const s2 = bandlimitedSaw(p2, root, 8);
      const env = Math.min(1.0, t / 0.25) * Math.exp(-t * 1.4);
      data[i] = warmSaturate((s1 + s2) * 0.5 * env, 1.15);
    }
    return data;
  },

  'Pad_EtherealCosmic_04.wav': (dur = 1.9) => {
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 293.66; // D4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const shimmer = Math.sin(2 * Math.PI * (root * 4.02) * t) * 0.25 * Math.exp(-t * 2);
      const fundamental = Math.sin(2 * Math.PI * root * t);
      const octave = Math.sin(2 * Math.PI * (root * 2) * t) * 0.4;
      const env = Math.min(1.0, t / 0.3) * Math.exp(-t * 1.2);
      data[i] = warmSaturate((fundamental + octave + shimmer) * 0.5 * env, 1.15);
    }
    return data;
  },

  // --- BELLS (FIXING "bells dont sound like bells") ---
  'Bell_CelestialChime_01.wav': (dur = 1.6) => {
    // Inharmonic bronze tubular chime (E5, 659Hz) with authentic modal partial series
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 659.25; // E5
    // Modes of struck cylindrical metal tube (Euler-Bernoulli acoustics)
    const partials = [
      { ratio: 1.0, amp: 1.0, decay: 2.2 },
      { ratio: 2.756, amp: 0.65, decay: 3.5 },
      { ratio: 5.404, amp: 0.40, decay: 5.2 },
      { ratio: 8.933, amp: 0.25, decay: 7.0 },
      { ratio: 13.34, amp: 0.15, decay: 10.0 },
    ];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let sum = 0;
      partials.forEach(p => {
        sum += Math.sin(2 * Math.PI * (root * p.ratio) * t) * p.amp * Math.exp(-t * p.decay);
      });
      // Metallic strike mallet click
      const strike = Math.sin(2 * Math.PI * 4800 * t) * Math.exp(-t * 150) * 0.25;
      data[i] = (sum * 0.45 + strike) * 1.35;
    }
    return data;
  },

  'Bell_FMCrystal_02.wav': (dur = 1.4) => {
    // Crystal glass bell chime (FM glass partials)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 880.0; // A5
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const mod = Math.sin(2 * Math.PI * (root * 3.5) * t) * Math.exp(-t * 10) * (root * 0.8);
      const carrier = Math.sin(2 * Math.PI * (root + mod) * t);
      const glass = Math.sin(2 * Math.PI * (root * 5.1) * t) * 0.3 * Math.exp(-t * 22);
      const env = Math.exp(-t * 2.8);
      data[i] = (carrier + glass) * env * 1.25;
    }
    return data;
  },

  'Bell_Glocken_03.wav': (dur = 1.2) => {
    // Orchestral Glockenspiel (C6, 1046Hz, pure bright metal bar)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 1046.5; // C6
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const f1 = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 3.2);
      const f2 = Math.sin(2 * Math.PI * (root * 2.76) * t) * 0.35 * Math.exp(-t * 8.0);
      const mallet = Math.sin(2 * Math.PI * 6200 * t) * Math.exp(-t * 250) * 0.3;
      data[i] = (f1 + f2 + mallet) * 1.3;
    }
    return data;
  },

  // --- ACID 303 (Cascaded 24dB Diode Ladder / ZDF SVF + Screaming Squelch + Tanh Diode Overdrive) ---
  'Acid_Squelch303_01.wav': (dur = 1.2) => {
    // 1. Classic 303 Saw Accent Squelch (The Screaming Accent Chirp)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 65.41; // C2
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = tb303Saw(p, root);
      const accentEnv = Math.exp(-t * 6.2);
      const cutoff = 360 + 4000 * accentEnv;
      const s1 = svf1.process(saw, cutoff, 8.2).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.2).lp;
      const click = (t < 0.015) ? (Math.sin(2 * Math.PI * 1800 * t) * (1 - t / 0.015) * 0.3) : 0;
      const env = 0.2 + 0.8 * accentEnv + 0.4 * Math.exp(-t * 2.2);
      data[i] = warmSaturate((s2 + click) * env * 1.45, 1.35);
    }
    return data;
  },

  'Acid_ResonantSquare_02.wav': (dur = 1.1) => {
    // 2. Resonant Hollow Square 303 (Rubbery Acid House Donk)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 73.42; // D2
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const sq = tb303Square(p, root);
      const squareEnv = Math.exp(-t * 5.0);
      const cutoff = 300 + 3200 * squareEnv;
      const s1 = svf1.process(sq, cutoff, 7.2).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 5.5).lp;
      const env = 0.25 + 0.75 * squareEnv + 0.3 * Math.exp(-t * 2.0);
      data[i] = warmSaturate(s2 * env * 1.4, 1.3);
    }
    return data;
  },

  'Acid_DistortedDevil_03.wav': (dur = 1.3) => {
    // 3. Devil Fish Heavy Overdrive Acid Squeal
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 55.0; // A1
    let p1 = 0;
    let p2 = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p1 += (2 * Math.PI * root) / sampleRate;
      p2 += (2 * Math.PI * (root * 1.006)) / sampleRate;
      const saw1 = tb303Saw(p1, root);
      const saw2 = tb303Saw(p2, root * 1.006);
      const osc = saw1 * 0.65 + saw2 * 0.45;
      const devilEnv = Math.exp(-t * 4.2);
      const cutoff = 450 + 4200 * devilEnv;
      const s1 = svf1.process(osc, cutoff, 9.6).lp;
      const sat = Math.tanh(s1 * 1.35);
      const s2 = svf2.process(sat, cutoff * 0.95, 7.2).lp;
      const env = 0.3 + 0.7 * devilEnv + 0.3 * Math.exp(-t * 1.8);
      data[i] = warmSaturate(s2 * env * 2.4, 2.2);
    }
    return data;
  },

  'Acid_AccentSlide_04.wav': (dur = 1.25) => {
    // 4. Iconic 303 Portamento Slide Note (C2 to C3 Octave Glide with Resonant Screamer)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      let freq = 65.41;
      if (t >= 0.35 && t < 0.70) {
        const slideProg = Math.min(1.0, (t - 0.35) / 0.16);
        freq = 65.41 + (130.81 - 65.41) * Math.pow(slideProg, 2);
      } else if (t >= 0.70 && t < 0.95) {
        freq = 130.81;
      } else if (t >= 0.95) {
        const downProg = Math.min(1.0, (t - 0.95) / 0.12);
        freq = 130.81 + (58.27 - 130.81) * downProg;
      }
      p += (2 * Math.PI * freq) / sampleRate;
      const saw = tb303Saw(p, freq);
      const slideEnv = Math.exp(-t * 3.2);
      const cutoff = 420 + 3400 * (0.4 * slideEnv + 0.6 * (freq / 130.81));
      const s1 = svf1.process(saw, cutoff, 7.8).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.0).lp;
      const env = Math.exp(-t * 2.2);
      data[i] = warmSaturate(s2 * env * 1.5, 1.35);
    }
    return data;
  },

  'Acid_FilterSweep_05.wav': (dur = 1.35) => {
    // 5. Live Filter Knob Sweep (Rising & Falling Resonant Squeal)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 82.41; // E2
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = tb303Saw(p, root);
      const sweepProgress = Math.min(1.0, t / (dur * 0.85));
      const sweepShape = Math.sin(sweepProgress * Math.PI);
      const cutoff = 350 + 3700 * sweepShape;
      const s1 = svf1.process(saw, cutoff, 8.6).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.5).lp;
      const env = Math.exp(-t * 1.8);
      data[i] = warmSaturate(s2 * env * 1.45, 1.35);
    }
    return data;
  },

  'Acid_SubHarmonic_06.wav': (dur = 1.2) => {
    // 6. Punchy Acid Accent Bass Drop (Sharp transient snap + deep sub)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 49.0; // G1
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const freq = root + 45.0 * Math.exp(-t * 35.0);
      p += (2 * Math.PI * freq) / sampleRate;
      const saw = tb303Saw(p, freq);
      const dropEnv = Math.exp(-t * 8.0);
      const cutoff = 260 + 4800 * dropEnv;
      const s1 = svf1.process(saw, cutoff, 7.5).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 5.8).lp;
      const click = (t < 0.015) ? (Math.sin(2 * Math.PI * 1800 * t) * (1 - t / 0.015) * 0.3) : 0;
      const env = Math.exp(-t * 2.5);
      data[i] = warmSaturate((s2 + click) * env * 1.55, 1.35);
    }
    return data;
  },

  'Acid_CyberSquelch_07.wav': (dur = 1.2) => {
    // 7. Cyber Resonant Squelch (High-register Acid Lead)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    const root = 98.0; // G2
    let p = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      p += (2 * Math.PI * root) / sampleRate;
      const saw = tb303Saw(p, root);
      const cyberEnv = Math.exp(-t * 7.5);
      const cutoff = 400 + 4600 * cyberEnv;
      const s1 = svf1.process(saw, cutoff, 8.8).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.8).lp;
      const env = Math.exp(-t * 3.0);
      data[i] = warmSaturate(s2 * env * 1.5, 1.4);
    }
    return data;
  },

  // --- STRINGS (ORGANIC ORCHESTRAL QUALITY) ---
  'Strings_Chamber_01.wav': (dur = 1.6) => {
    // Chamber Ensemble Legato (Warm detuned unison violins/violas, delayed expressive vibrato)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 261.63; // C4
    const detunes = [-0.006, 0, 0.006];
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1.0, t / 0.06);
      const release = Math.exp(-Math.max(0, t - 1.2) * 5.0);
      const vib = t > 0.1 ? Math.sin(2 * Math.PI * 5.2 * t) * 0.006 * Math.min(1.0, (t - 0.1) / 0.2) : 0;
      let sum = 0;
      detunes.forEach(d => {
        const f = root * (1 + d + vib);
        const p = 2 * Math.PI * f * t;
        sum += bandlimitedSaw(p, f, 12);
      });
      data[i] = warmSaturate((sum / detunes.length) * attack * release, 1.15);
    }
    return data;
  },

  'Strings_Pizzicato_02.wav': (dur = 0.9) => {
    // Orchestral Pizzicato Pluck (Sharp finger pluck impulse + warm resonant string decay)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 329.63; // E4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const fundamental = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 5.5);
      const overtone1 = Math.sin(2 * Math.PI * (root * 2) * t) * 0.4 * Math.exp(-t * 9.0);
      const overtone2 = Math.sin(2 * Math.PI * (root * 3) * t) * 0.2 * Math.exp(-t * 14.0);
      const pluck = Math.sin(2 * Math.PI * 2800 * t) * Math.exp(-t * 160) * 0.35;
      data[i] = warmSaturate(fundamental + overtone1 + overtone2 + pluck, 1.15);
    }
    return data;
  },

  'Strings_Cello_03.wav': (dur = 1.7) => {
    // Deep acoustic cello note (C2, 65.4Hz) with woody bow friction and resonant body
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 65.41; // C2
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1.0, t / 0.08);
      const release = Math.exp(-Math.max(0, t - 1.3) * 4.5);
      const vib = t > 0.15 ? Math.sin(2 * Math.PI * 4.8 * t) * 0.005 : 0;
      const f = root * (1 + vib);
      const p = 2 * Math.PI * f * t;
      const cello = bandlimitedSaw(p, f, 14);
      const body = Math.sin(p) * 0.5;
      data[i] = warmSaturate((cello + body) * 0.6 * attack * release, 1.2);
    }
    return data;
  },

  'Strings_Solina_04.wav': (dur = 1.8) => {
    // Vintage Solina String Ensemble (Dual BBD chorus emulation)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const root = 392.0; // G4
    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const lfo1 = Math.sin(2 * Math.PI * 0.6 * t) * 0.008;
      const lfo2 = Math.sin(2 * Math.PI * 6.0 * t) * 0.004;
      const p1 = 2 * Math.PI * (root * (1 + lfo1)) * t;
      const p2 = 2 * Math.PI * (root * (1 - lfo1 + lfo2)) * t;
      const s1 = bandlimitedSaw(p1, root, 10);
      const s2 = bandlimitedSaw(p2, root, 10);
      const env = Math.min(1.0, t / 0.1) * Math.exp(-t * 1.5);
      data[i] = warmSaturate((s1 + s2) * 0.5 * env, 1.15);
    }
    return data;
  },

  // ----------------------------------------------------
  // ARPEGGIATED PHRASES (16th-note studio arpeggios)
  // ----------------------------------------------------

  'Arp_Synthwave16th_01.wav': (dur = 1.55) => {
    // Synthwave 16th Arpeggio in A minor 9 (Ascending & descending rolling run)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [220.0, 261.63, 329.63, 493.88, 523.25, 493.88, 329.63, 261.63, 220.0, 261.63, 329.63, 392.0, 329.63, 261.63, 246.94, 220.0];
    const stepSec = 0.095;
    const delaySamples = Math.floor(sampleRate * (stepSec * 1.5));
    const delayBuf = new Float32Array(delaySamples);
    let delayIdx = 0;
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = notes[stepIdx];

      const attack = Math.min(1.0, stepTime / 0.003);
      const decay = Math.exp(-stepTime * 18.0);
      const noteEnv = attack * decay;

      const sweep = 0.4 + 0.6 * Math.sin((t / (notes.length * stepSec)) * Math.PI);
      const harmCount = Math.max(2, Math.floor(18 * sweep * decay));

      phase += (2 * Math.PI * freq) / sampleRate;
      const saw = bandlimitedSaw(phase, freq, harmCount);
      const sub = Math.sin(phase * 0.5) * 0.25;
      const dry = (saw + sub) * noteEnv;

      const del = delayBuf[delayIdx];
      delayBuf[delayIdx] = dry + del * 0.32;
      delayIdx = (delayIdx + 1) % delaySamples;

      const tail = Math.exp(-Math.max(0, t - 1.3) * 8.0);
      data[i] = warmSaturate((dry + del * 0.35) * 1.35 * tail, 1.2);
    }
    return data;
  },

  'Arp_AcidRolling_02.wav': (dur = 1.45) => {
    // Authentic 303 Rolling Octave Acid Arp in D minor with dual ZDF diode ladder squelch
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [73.42, 146.83, 87.31, 174.61, 110.0, 220.0, 130.81, 261.63, 146.83, 293.66, 130.81, 261.63, 110.0, 220.0, 87.31, 73.42];
    const stepSec = 0.09;
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = notes[stepIdx];

      const env = Math.min(1.0, stepTime / 0.002) * Math.exp(-stepTime * 18.0);
      phase += (2 * Math.PI * freq) / sampleRate;

      const mod = 0.6 + 0.4 * Math.sin(t * 5.0);
      const cutoff = 450 + 3800 * env * mod;

      const saw = tb303Saw(phase, freq);
      const sub = Math.sin(phase * 0.5) * 0.25;

      const s1 = svf1.process(saw + sub, cutoff, 8.0).lp;
      const sat = Math.tanh(s1 * 1.25);
      const s2 = svf2.process(sat, cutoff * 0.95, 6.2).lp;

      const tail = Math.exp(-Math.max(0, t - 1.25) * 8.0);
      data[i] = warmSaturate(s2 * env * 1.55 * tail, 1.35);
    }
    return data;
  },

  'Arp_NeoSoulChime_03.wav': (dur = 1.6) => {
    // Neo-Soul cascading chime/electric tine arpeggio in E minor 11
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33, 493.88, 440.0, 392.0, 329.63, 293.66, 246.94, 329.63];
    const stepSec = 0.10;
    const delaySamples = Math.floor(sampleRate * (stepSec * 1.5));
    const delayBuf = new Float32Array(delaySamples);
    let delayIdx = 0;
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = notes[stepIdx];

      const env = Math.min(1.0, stepTime / 0.003) * Math.exp(-stepTime * 14.0);
      phase += (2 * Math.PI * freq) / sampleRate;

      const p = phase;
      const tine = Math.sin(p) + 0.35 * Math.sin(p * 2) * Math.exp(-stepTime * 25) + 0.2 * Math.sin(p * 5.05) * Math.exp(-stepTime * 50);
      const dry = tine * env;

      const del = delayBuf[delayIdx];
      delayBuf[delayIdx] = dry + del * 0.35;
      delayIdx = (delayIdx + 1) % delaySamples;

      const tail = Math.exp(-Math.max(0, t - 1.35) * 6.0);
      data[i] = warmSaturate((dry + del * 0.4) * 1.4 * tail, 1.15);
    }
    return data;
  },

  'Arp_TranceOctave_04.wav': (dur = 1.5) => {
    // Trance uplifting octave arpeggio in F major (Punchy dual-saw drive)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [174.61, 349.23, 261.63, 523.25, 196.0, 392.0, 293.66, 587.33, 220.0, 440.0, 261.63, 523.25, 329.63, 659.25, 349.23, 698.46];
    const stepSec = 0.09;
    let phase1 = 0;
    let phase2 = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = notes[stepIdx];

      const env = Math.min(1.0, stepTime / 0.002) * Math.exp(-stepTime * 17.0);
      phase1 += (2 * Math.PI * freq) / sampleRate;
      phase2 += (2 * Math.PI * (freq * 1.004)) / sampleRate;

      const sweep = 0.5 + 0.5 * (t / dur);
      const harmCount = Math.max(2, Math.floor(18 * sweep * env));
      const s1 = bandlimitedSaw(phase1, freq, harmCount);
      const s2 = bandlimitedSaw(phase2, freq * 1.004, harmCount);
      const sub = Math.sin(phase1 * 0.5) * 0.25;

      const tail = Math.exp(-Math.max(0, t - 1.25) * 8.0);
      data[i] = warmSaturate((s1 + s2 + sub) * 0.7 * env * tail, 1.25);
    }
    return data;
  },

  'Arp_CyberOstinato_05.wav': (dur = 1.55) => {
    // Cyberpunk dark square ostinato arp in C minor
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const notes = [130.81, 155.56, 196.0, 207.65, 196.0, 155.56, 130.81, 116.54, 130.81, 155.56, 196.0, 261.63, 196.0, 155.56, 116.54, 130.81];
    const stepSec = 0.095;
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(notes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = notes[stepIdx];

      const env = Math.min(1.0, stepTime / 0.002) * Math.exp(-stepTime * 19.0);
      phase += (2 * Math.PI * freq) / sampleRate;

      const harmCount = Math.max(2, Math.floor(16 * env));
      const sq = bandlimitedSquare(phase, freq, harmCount);
      const sub = Math.sin(phase * 0.5) * 0.35;

      const tail = Math.exp(-Math.max(0, t - 1.3) * 8.0);
      data[i] = warmSaturate((sq + sub) * env * tail * 1.3, 1.3);
    }
    return data;
  },

  // ----------------------------------------------------
  // SEQUENCED RIFFS & OSTINATOS (16-step articulated riffs)
  // ----------------------------------------------------

  'Sequence_ModularOstinato_01.wav': (dur = 1.65) => {
    // Modular Berlin Ostinato in C minor (Accented 16-step bassline with filter dynamics)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const freqs = [65.41, 65.41, 77.78, 98.0, 130.81, 116.54, 98.0, 77.78, 87.31, 98.0, 130.81, 155.56, 130.81, 98.0, 116.54, 65.41];
    const accents = [true, false, false, true, false, false, true, false, false, true, false, true, false, false, true, false];
    const stepSec = 0.10;
    const lp = new Biquad();
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(freqs.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = freqs[stepIdx];
      const isAccent = accents[stepIdx];

      const gate = 0.78;
      const noteDur = stepSec * gate;
      let env = 0;
      if (stepTime < noteDur) {
        env = Math.min(1.0, stepTime / 0.003) * Math.exp(-stepTime * (isAccent ? 11.0 : 17.0));
      } else {
        env = Math.exp(-(stepTime - noteDur) * 35.0) * 0.15;
      }

      phase += (2 * Math.PI * freq) / sampleRate;

      const cutoff = (isAccent ? 2600 : 900) * (0.3 + 0.7 * env);
      lp.setLowpass(cutoff, isAccent ? 3.0 : 1.7);

      const harmCount = Math.max(2, Math.floor(16 * env));
      const saw = bandlimitedSaw(phase, freq, harmCount);
      const sub = Math.sin(phase) * 0.4;
      const filtered = lp.process((saw + sub) * (isAccent ? 1.3 : 0.95));

      const tail = Math.exp(-Math.max(0, t - 1.45) * 8.0);
      data[i] = warmSaturate(filtered * env * 1.5 * tail, isAccent ? 1.35 : 1.15);
    }
    return data;
  },

  'Sequence_DeepTechnoGroove_02.wav': (dur = 1.65) => {
    // Deep Techno syncopated rolling bass groove in F minor (Rests & accents)
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const fNotes = [43.65, 43.65, 0, 87.31, 0, 43.65, 51.91, 0, 58.27, 0, 43.65, 43.65, 77.78, 0, 65.41, 0];
    const accents = [true, false, false, true, false, false, true, false, true, false, false, false, true, false, false, false];
    const stepSec = 0.10;
    const lp = new Biquad();
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(fNotes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = fNotes[stepIdx];
      const isAccent = accents[stepIdx];

      if (freq === 0) {
        data[i] = 0;
        continue;
      }

      const noteDur = stepSec * 0.8;
      let env = 0;
      if (stepTime < noteDur) {
        env = Math.min(1.0, stepTime / 0.003) * Math.exp(-stepTime * 14.0);
      } else {
        env = Math.exp(-(stepTime - noteDur) * 35.0) * 0.1;
      }

      phase += (2 * Math.PI * freq) / sampleRate;

      const cutoff = (isAccent ? 2200 : 700) * (0.3 + 0.7 * env);
      lp.setLowpass(cutoff, 2.2);

      const saw = bandlimitedSaw(phase, freq, 14);
      const sub = Math.sin(phase) * 0.5;
      const filtered = lp.process((saw + sub) * (isAccent ? 1.3 : 1.0));

      const tail = Math.exp(-Math.max(0, t - 1.45) * 8.0);
      data[i] = warmSaturate(filtered * env * 1.5 * tail, 1.25);
    }
    return data;
  },

  'Sequence_AcidSlide_03.wav': (dur = 1.6) => {
    // Iconic 303 acid sequence with smooth portamento slides & cascaded diode ladder squelch in D minor
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const dNotes = [73.42, 73.42, 87.31, 98.0, 110.0, 130.81, 146.83, 73.42, 87.31, 98.0, 110.0, 87.31, 73.42, 0, 73.42, 0];
    const accents = [true, false, false, true, false, true, true, false, false, true, false, false, true, false, false, false];
    const slides = [false, false, true, false, true, false, false, false, false, true, false, false, false, false, false, false];
    const stepSec = 0.10;
    const svf1 = new ZdfSVF();
    const svf2 = new ZdfSVF();
    let currentFreq = dNotes[0];
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(dNotes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const targetFreq = dNotes[stepIdx];
      const isAccent = accents[stepIdx];
      const isSlide = slides[stepIdx];

      if (targetFreq === 0) {
        data[i] = 0;
        continue;
      }

      const nextStep = dNotes[Math.min(dNotes.length - 1, stepIdx + 1)];
      if (isSlide && nextStep > 0) {
        const slideProg = Math.min(1.0, stepTime / stepSec);
        currentFreq = targetFreq + (nextStep - targetFreq) * Math.pow(slideProg, 2);
      } else {
        currentFreq = targetFreq;
      }

      phase += (2 * Math.PI * currentFreq) / sampleRate;

      const noteDur = stepSec * 0.88;
      let env = 0;
      if (stepTime < noteDur) {
        env = Math.min(1.0, stepTime / 0.002) * Math.exp(-stepTime * (isAccent ? 9.5 : 15.0));
      } else {
        env = Math.exp(-(stepTime - noteDur) * 35.0) * 0.1;
      }

      const cutoff = (isAccent ? 3800 : 1200) * (0.28 + 0.72 * env);
      const q = isAccent ? 8.5 : 6.8;

      const sq = tb303Square(phase, currentFreq);
      const sub = Math.sin(phase) * 0.3;

      const s1 = svf1.process(sq + sub, cutoff, q).lp;
      const sat = Math.tanh(s1 * (isAccent ? 1.45 : 1.15));
      const s2 = svf2.process(sat, cutoff * 0.95, q * 0.75).lp;

      const tail = Math.exp(-Math.max(0, t - 1.4) * 8.0);
      data[i] = warmSaturate(s2 * env * 1.55 * tail, isAccent ? 1.4 : 1.2);
    }
    return data;
  },

  'Sequence_CyberLead_04.wav': (dur = 1.65) => {
    // Cyberpunk synth lead melodic sequence in D minor
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const leadNotes = [293.66, 293.66, 349.23, 440.0, 392.0, 349.23, 293.66, 0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25, 440.0, 293.66];
    const accents = [true, false, true, true, false, false, true, false, false, true, false, true, true, true, false, true];
    const stepSec = 0.10;
    const lp = new Biquad();
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(leadNotes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = leadNotes[stepIdx];
      const isAccent = accents[stepIdx];

      if (freq === 0) {
        data[i] = 0;
        continue;
      }

      const noteDur = stepSec * 0.85;
      let env = 0;
      if (stepTime < noteDur) {
        env = Math.min(1.0, stepTime / 0.003) * Math.exp(-stepTime * 14.0);
      } else {
        env = Math.exp(-(stepTime - noteDur) * 35.0) * 0.15;
      }

      phase += (2 * Math.PI * freq) / sampleRate;
      const cutoff = (isAccent ? 3800 : 1600) * (0.4 + 0.6 * env);
      lp.setLowpass(cutoff, 2.2);

      const saw = bandlimitedSaw(phase, freq, 16);
      const sub = Math.sin(phase * 0.5) * 0.25;
      const filtered = lp.process((saw + sub) * (isAccent ? 1.3 : 1.0));

      const tail = Math.exp(-Math.max(0, t - 1.45) * 8.0);
      data[i] = warmSaturate(filtered * env * 1.4 * tail, 1.25);
    }
    return data;
  },

  'Sequence_IndustrialEBM_05.wav': (dur = 1.55) => {
    // Heavy industrial EBM body bass sequence in E minor
    const n = Math.floor(sampleRate * dur);
    const data = new Float32Array(n);
    const ebmNotes = [41.2, 41.2, 82.41, 41.2, 49.0, 41.2, 55.0, 61.74, 41.2, 41.2, 73.42, 41.2, 65.41, 61.74, 55.0, 49.0];
    const accents = [true, false, true, false, true, false, false, true, true, false, true, false, true, false, false, false];
    const stepSec = 0.095;
    const lp = new Biquad();
    let phase = 0;

    for (let i = 0; i < n; i++) {
      const t = i / sampleRate;
      const stepIdx = Math.min(ebmNotes.length - 1, Math.floor(t / stepSec));
      const stepTime = t - stepIdx * stepSec;
      const freq = ebmNotes[stepIdx];
      const isAccent = accents[stepIdx];

      const noteDur = stepSec * 0.72;
      let env = 0;
      if (stepTime < noteDur) {
        env = Math.min(1.0, stepTime / 0.002) * Math.exp(-stepTime * 17.0);
      } else {
        env = Math.exp(-(stepTime - noteDur) * 40.0) * 0.1;
      }

      phase += (2 * Math.PI * freq) / sampleRate;
      const cutoff = (isAccent ? 2400 : 900) * (0.3 + 0.7 * env);
      lp.setLowpass(cutoff, 2.8);

      const saw = bandlimitedSaw(phase, freq, 16);
      const sub = Math.sin(phase) * 0.5;
      const filtered = lp.process((saw + sub) * (isAccent ? 1.35 : 0.95));

      const tail = Math.exp(-Math.max(0, t - 1.35) * 8.0);
      data[i] = warmSaturate(filtered * env * 1.5 * tail, 1.35);
    }
    return data;
  },
};

const outDir = path.join(process.cwd(), 'public/samples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Generating ${Object.keys(recipes).length} studio-quality WAV files...`);

const manifestEntries = [];

for (const [filename, generator] of Object.entries(recipes)) {
  const samples = generator();
  finalizeAudio(samples);
  const wavBuf = encodeWav(samples);
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, wavBuf);
  manifestEntries.push({
    name: filename,
    file: `/samples/${filename}`,
  });
}

// Write manifest.json
const manifestPath = path.join(outDir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestEntries, null, 2));

console.log(`Successfully generated ${manifestEntries.length} studio-grade WAV samples and updated manifest.json.`);
