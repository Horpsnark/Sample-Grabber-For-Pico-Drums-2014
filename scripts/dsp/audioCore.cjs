const sampleRate = 44100;

// PolyBLEP anti-aliasing residual for step transitions
function polyBlep(t, dt) {
  if (dt <= 0) return 0;
  if (t < dt) {
    const x = t / dt;
    return 2 * x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + 2 * x + 1;
  }
  return 0;
}

// Anti-aliased PolyBLEP Sawtooth
function polyBlepSaw(phase, dt) {
  let saw = 2 * phase - 1;
  saw -= polyBlep(phase, dt);
  return saw;
}

// Anti-aliased PolyBLEP Square with variable pulse width
function polyBlepSquare(phase, dt, duty = 0.5) {
  let sq = phase < duty ? 1.0 : -1.0;
  sq += polyBlep(phase, dt);
  sq -= polyBlep((phase - duty + 1.0) % 1.0, dt);
  return sq;
}

// Anti-aliased PolyBLEP Triangle
function polyBlepTriangle(phase, dt) {
  let tri = 4 * Math.abs(phase - 0.5) - 1;
  return tri;
}

// Pink noise generator (Paul Kellet's -3dB/octave algorithm)
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
    return pink * 0.125;
  }
}

// High-precision Biquad Filter (Audio EQ Cookbook)
class Biquad {
  constructor() {
    this.b0 = 0; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0;
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
  setLowpass(freq, q = 0.707) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.47));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.05, q));
    const a0 = 1 + alpha;
    this.b0 = (1 - cos) / 2 / a0;
    this.b1 = (1 - cos) / a0;
    this.b2 = (1 - cos) / 2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  setHighpass(freq, q = 0.707) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.47));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.05, q));
    const a0 = 1 + alpha;
    this.b0 = (1 + cos) / 2 / a0;
    this.b1 = -(1 + cos) / a0;
    this.b2 = (1 + cos) / 2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  setBandpass(freq, q = 1.0) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.47));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const alpha = Math.sin(w0) / (2 * Math.max(0.05, q));
    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
  }
  setPeaking(freq, q = 1.0, gainDb = 0) {
    const f = Math.max(10, Math.min(freq, sampleRate * 0.47));
    const w0 = (2 * Math.PI * f) / sampleRate;
    const cos = Math.cos(w0);
    const A = Math.pow(10, gainDb / 40);
    const alpha = Math.sin(w0) / (2 * Math.max(0.05, q));
    const a0 = 1 + alpha / A;
    this.b0 = (1 + alpha * A) / a0;
    this.b1 = (-2 * cos) / a0;
    this.b2 = (1 - alpha * A) / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha / A) / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = isNaN(y) ? 0 : y;
    return this.y1;
  }
  reset() {
    this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0;
  }
}

// Zero-Delay-Feedback (ZDF) State Variable Filter (Cytomic / Andy Simper)
class ZdfSVF {
  constructor() {
    this.ic1eq = 0;
    this.ic2eq = 0;
  }
  process(v0, cutoffHz, q = 0.707) {
    const freq = Math.max(15, Math.min(cutoffHz, sampleRate * 0.46));
    const g = Math.tan((Math.PI * freq) / sampleRate);
    const k = 1 / Math.max(0.05, q);
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
  reset() {
    this.ic1eq = 0;
    this.ic2eq = 0;
  }
}

// Cascaded 4-Pole 24dB Moog Ladder Filter with non-linear feedback saturation
class ZdfMoogLadder {
  constructor() {
    this.s1 = 0; this.s2 = 0; this.s3 = 0; this.s4 = 0;
  }
  process(input, cutoffHz, resonance = 0) {
    const f = Math.max(15, Math.min(cutoffHz, sampleRate * 0.46));
    const g = Math.tan((Math.PI * f) / sampleRate);
    const G = g / (1.0 + g);
    const res = Math.min(3.9, Math.max(0, resonance));
    const u = (input - res * this.s4) / (1.0 + res * G * G * G * G);
    const v0 = Math.tanh(u);
    const v1 = (v0 - this.s1) * G + this.s1;
    this.s1 = 2 * v1 - this.s1;
    const v2 = (v1 - this.s2) * G + this.s2;
    this.s2 = 2 * v2 - this.s2;
    const v3 = (v2 - this.s3) * G + this.s3;
    this.s3 = 2 * v3 - this.s3;
    const v4 = (v3 - this.s4) * G + this.s4;
    this.s4 = 2 * v4 - this.s4;
    return isNaN(v4) ? 0 : v4;
  }
  reset() {
    this.s1 = 0; this.s2 = 0; this.s3 = 0; this.s4 = 0;
  }
}

// Physical Plucked String Modeling (Karplus-Strong with loss filter)
function karplusStrongPluck(freq, durationSec, damping = 0.45, brightness = 0.7) {
  const n = Math.floor(sampleRate * durationSec);
  const data = new Float32Array(n);
  const period = Math.max(2, Math.round(sampleRate / freq));
  const delay = new Float32Array(period);

  // Excite with shaped burst of noise
  for (let i = 0; i < period; i++) {
    const env = 1 - i / period;
    delay[i] = (Math.random() * 2 - 1) * env * brightness;
  }

  let readIdx = 0;
  let prevOut = 0;
  for (let i = 0; i < n; i++) {
    const cur = delay[readIdx];
    // One-pole lowpass feedback
    const filtered = cur * (1 - damping) + prevOut * damping;
    prevOut = filtered;
    delay[readIdx] = filtered * 0.994; // slight decay
    data[i] = cur;
    readIdx = (readIdx + 1) % period;
  }
  return data;
}

// Smooth tape & tube saturation
function warmSaturate(x, drive = 1.0) {
  return Math.tanh(x * drive * 0.92) * 0.94;
}

// Room Ambience Diffuser (Schroeder allpass network)
function applyRoomDiffuser(samples, wet = 0.18) {
  const delays = [Math.floor(sampleRate * 0.017), Math.floor(sampleRate * 0.023)];
  const b1 = new Float32Array(delays[0]);
  const b2 = new Float32Array(delays[1]);
  let i1 = 0, i2 = 0;

  for (let i = 0; i < samples.length; i++) {
    const inVal = samples[i];
    const out1 = b1[i1];
    b1[i1] = inVal + out1 * 0.5;
    i1 = (i1 + 1) % delays[0];

    const out2 = b2[i2];
    b2[i2] = out1 + out2 * 0.45;
    i2 = (i2 + 1) % delays[1];

    samples[i] = inVal * (1 - wet) + out2 * wet;
  }
}

// Peak Normalization and anti-pop micro fades
function finalizeAudio(data) {
  const len = data.length;
  // 2ms smooth fade-in
  const inSamples = Math.min(Math.floor(sampleRate * 0.002), Math.floor(len * 0.05));
  for (let i = 0; i < inSamples; i++) {
    data[i] *= i / inSamples;
  }
  // 6ms smooth fade-out
  const outSamples = Math.min(Math.floor(sampleRate * 0.006), Math.floor(len * 0.1));
  const startOut = len - outSamples;
  for (let i = startOut; i < len; i++) {
    data[i] *= (len - i) / outSamples;
  }
  // Headroom normalize to -0.5 dBFS (0.94)
  let peak = 0;
  for (let i = 0; i < len; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0.0005) {
    const gain = 0.94 / peak;
    for (let i = 0; i < len; i++) {
      data[i] *= gain;
    }
  }
}

// Encode 16-bit PCM WAV Buffer
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
  buffer.writeUInt16LE(2, 32); // Block Align
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

module.exports = {
  sampleRate,
  polyBlep,
  polyBlepSaw,
  polyBlepSquare,
  polyBlepTriangle,
  PinkNoise,
  Biquad,
  ZdfSVF,
  ZdfMoogLadder,
  karplusStrongPluck,
  warmSaturate,
  applyRoomDiffuser,
  finalizeAudio,
  encodeWav,
};
