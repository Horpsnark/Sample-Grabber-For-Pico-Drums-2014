const {
  sampleRate,
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
} = require('./audioCore.cjs');

// -------------------------------------------------------------
// PLUCKED INSTRUMENTS (Karplus-Strong & Physical / FM Modeling)
// -------------------------------------------------------------
function genPluckHarp(freq = 329.63, dur = 1.3) {
  // Celtic Acoustic Harp: Karplus-Strong string with resonant wood soundboard
  const raw = karplusStrongPluck(freq, dur, 0.42, 0.75);
  const bpWood = new Biquad();
  bpWood.setBandpass(420, 2.2);

  for (let i = 0; i < raw.length; i++) {
    const t = i / sampleRate;
    const body = bpWood.process(raw[i]) * 0.45;
    const chime = Math.sin(2 * Math.PI * (freq * 2.01) * t) * 0.15 * Math.exp(-t * 6);
    raw[i] = warmSaturate(raw[i] + body + chime, 1.15);
  }
  applyRoomDiffuser(raw, 0.22);
  return raw;
}

function genPluckKarplus(freq = 261.63, dur = 1.1) {
  // Pure Karplus-Strong Acoustic Pluck
  const raw = karplusStrongPluck(freq, dur, 0.38, 0.85);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = warmSaturate(raw[i] * 1.25, 1.1);
  }
  return raw;
}

function genPluckKalimba(freq = 440.0, dur = 1.2) {
  // African Thumb Piano (Steel tine over wooden resonator box)
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpGourd = new Biquad();
  bpGourd.setBandpass(650, 3.0);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const t1 = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 3.5);
    // Overhung tine overtone (approx 5.4x)
    const t2 = Math.sin(2 * Math.PI * (freq * 5.42) * t) * 0.35 * Math.exp(-t * 18.0);
    const thumbStrike = (Math.random() * 2 - 1) * Math.exp(-t * 240) * 0.35;
    const gourd = bpGourd.process(t1 + thumbStrike) * 0.5;
    data[i] = warmSaturate(t1 + t2 + thumbStrike + gourd, 1.18);
  }
  applyRoomDiffuser(data, 0.18);
  return data;
}

function genPluckPizzicato(freq = 329.63, dur = 0.9) {
  // Orchestral Pizzicato Pluck: Karplus-Strong with wooden violin body formants
  const raw = karplusStrongPluck(freq, dur, 0.52, 0.8);
  const bpBody1 = new Biquad();
  bpBody1.setBandpass(280, 2.5); // Air resonance
  const bpBody2 = new Biquad();
  bpBody2.setBandpass(520, 2.2); // Wood resonance

  for (let i = 0; i < raw.length; i++) {
    const inVal = raw[i];
    const b1 = bpBody1.process(inVal) * 0.5;
    const b2 = bpBody2.process(inVal) * 0.4;
    raw[i] = warmSaturate(inVal + b1 + b2, 1.18);
  }
  return raw;
}

function genPluckSynth(freq = 261.63, dur = 1.1) {
  // Punchy 24dB Ladder Synth Pluck
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * freq) / sampleRate;
    p2 += (2 * Math.PI * (freq * 1.004)) / sampleRate;

    const saw1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), freq / sampleRate);
    const saw2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), (freq * 1.004) / sampleRate);
    const sub = Math.sin(p1 * 0.5) * 0.4;

    const env = Math.exp(-t * 6.5);
    const filterEnv = Math.exp(-t * 12.0);
    const cutoff = 250 + 5200 * filterEnv;

    const filtered = ladder.process(saw1 + saw2 * 0.7 + sub, cutoff, 1.6);
    data[i] = warmSaturate(filtered * env * 1.5, 1.25);
  }
  return data;
}

function genPluckKoto(freq = 293.66, dur = 1.2) {
  // Japanese Koto Silk String with authentic micro-pitch bend
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(freq * 2, 3.5);

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Characteristic silk string pitch dip & bend
    const bend = t > 0.08 ? 12 * Math.sin((t - 0.08) * 4.0) * Math.exp(-(t - 0.08) * 3) : 0;
    const curFreq = freq + bend;
    phase += (2 * Math.PI * curFreq) / sampleRate;

    const saw = polyBlepSaw(phase % (2 * Math.PI) / (2 * Math.PI), curFreq / sampleRate);
    const fundamental = Math.sin(phase) * 1.2;
    const body = bp.process(saw) * 0.6;
    const env = Math.exp(-t * 4.8);
    const plectrum = (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.35;

    data[i] = warmSaturate((fundamental + saw * 0.5 + body) * env + plectrum, 1.2);
  }
  applyRoomDiffuser(data, 0.2);
  return data;
}

// -------------------------------------------------------------
// SUB 808 BASS
// -------------------------------------------------------------
function genSub808(rootFreq, dur = 1.6, drive = 1.2, glideSemis = 0) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Punch attack frequency dive (110Hz down to root)
    const punchSweep = 85 * Math.exp(-t * 38);
    let glideFreq = rootFreq;
    if (glideSemis !== 0 && t > 0.25) {
      const gProgress = Math.min(1.0, (t - 0.25) / 0.3);
      glideFreq = rootFreq * Math.pow(2, (glideSemis * gProgress) / 12);
    }

    const curF = glideFreq + punchSweep;
    phase += (2 * Math.PI * curF) / sampleRate;

    // Sub fundamental + rich 2nd and 3rd harmonics for phone/speaker translation
    const sub = Math.sin(phase);
    const harm2 = Math.sin(phase * 2) * 0.22 * Math.exp(-t * 3.5);
    const harm3 = Math.sin(phase * 3) * 0.12 * Math.exp(-t * 6.0);

    const env = Math.exp(-t * 2.2);
    const punchClick = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 450) * 0.25;

    data[i] = warmSaturate((sub + harm2 + harm3) * env * drive + punchClick, drive);
  }
  return data;
}

// -------------------------------------------------------------
// BASS & SAWTOOTH
// -------------------------------------------------------------
function genBassSawMoog(dur = 1.4) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 55.0; // A1
  let p1 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * root) / sampleRate;

    const saw = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1 * 0.5) * 0.5;

    const fEnv = Math.exp(-t * 5.0);
    const cutoff = 180 + 3800 * fEnv;
    const filtered = ladder.process(saw + sub, cutoff, 2.2);
    const env = Math.exp(-t * 2.8);

    data[i] = warmSaturate(filtered * env * 1.5, 1.3);
  }
  return data;
}

function genBassSawCyber(dur = 1.3) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 65.41; // C2
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * (root * 0.992)) / sampleRate;
    p2 += (2 * Math.PI * (root * 1.008)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1 * 0.5) * 0.6;

    const fEnv = Math.exp(-t * 4.5);
    const cutoff = 220 + 3200 * fEnv;
    const filtered = ladder.process((s1 + s2) * 0.6 + sub, cutoff, 1.8);
    const env = Math.exp(-t * 2.5);

    data[i] = warmSaturate(filtered * env * 1.5, 1.35);
  }
  return data;
}

function genBassSawPluck(dur = 1.1) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const svf = new ZdfSVF();
  const root = 73.42; // D2
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * root) / sampleRate;
    const saw = polyBlepSaw(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p) * 0.45;

    const cutoff = 250 + 4400 * Math.exp(-t * 14.0);
    const filtered = svf.process(saw + sub, cutoff, 2.8).lp;
    const env = Math.exp(-t * 4.5);

    data[i] = warmSaturate(filtered * env * 1.6, 1.25);
  }
  return data;
}

function genBassDarkReese(dur = 1.3) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 43.65; // F1
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * (root * 0.985)) / sampleRate;
    p2 += (2 * Math.PI * (root * 1.015)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1) * 0.7;

    const filtered = ladder.process((s1 + s2) * 0.5 + sub, 750, 1.2);
    const env = Math.exp(-t * 2.0);

    data[i] = warmSaturate(filtered * env * 1.45, 1.4);
  }
  return data;
}

function genBassSlap(dur = 0.7) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 49.0; // G1
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * (root + 35 * Math.exp(-t * 40))) / sampleRate;
    const body = (Math.sin(p) + 0.3 * Math.sin(p * 2)) * Math.exp(-t * 6.5);
    const slap = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 140) * 0.45;
    data[i] = warmSaturate(body + slap, 1.25);
  }
  return data;
}

function genBassFretless(dur = 1.35) {
  // Warm singing fretless electric bass with expressive swell & woody body
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpWood = new Biquad();
  bpWood.setBandpass(480, 2.2);
  const root = 55.0; // A1
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const vib = t > 0.15 ? 0.006 * Math.sin(2 * Math.PI * 5.2 * t) : 0;
    p += (2 * Math.PI * root * (1 + vib)) / sampleRate;

    const fundamental = Math.sin(p);
    const harm2 = Math.sin(p * 2) * 0.45 * Math.exp(-t * 2.0);
    const harm3 = Math.sin(p * 3) * 0.2 * Math.exp(-t * 3.5);
    const body = bpWood.process(fundamental + harm2) * 0.6;
    const attackSwell = Math.min(1.0, t / 0.04);
    const env = attackSwell * Math.exp(-t * 2.2);

    data[i] = warmSaturate((fundamental + harm2 + harm3 + body) * env * 1.3, 1.2);
  }
  return data;
}

function genBassNeuroWobble(dur = 1.4) {
  // Neuro / Dubstep LFO-swept resonant wobble bass
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 43.65; // F1
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * (root * 0.99)) / sampleRate;
    p2 += (2 * Math.PI * (root * 1.01)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1) * 0.8;

    // Wobble LFO sweep
    const lfo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 3.5 * t);
    const cutoff = 180 + 2600 * lfo;
    const filtered = ladder.process((s1 + s2) * 0.6 + sub, cutoff, 2.5);
    const env = Math.exp(-t * 1.8);

    data[i] = warmSaturate(filtered * env * 1.6, 1.45);
  }
  return data;
}

function genBassAcidScreamer(dur = 1.2) {
  // High-resonance screeching 303 Devilfish saw with fast pitch dive
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 65.41; // C2
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const dive = 45 * Math.exp(-t * 25);
    p += (2 * Math.PI * (root + dive)) / sampleRate;

    const saw = polyBlepSaw(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p * 0.5) * 0.5;

    const cutoff = 350 + 4600 * Math.exp(-t * 6.5);
    const filtered = ladder.process(saw + sub, cutoff, 3.4);
    const env = Math.exp(-t * 2.6);

    data[i] = warmSaturate(filtered * env * 1.7, 1.6);
  }
  return data;
}

function genBassFMDonk(dur = 0.9) {
  // 90s UK Garage Lately Bass / TX81Z FM Organ Donk
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 55.0; // A1
  let pM1 = 0, pM2 = 0, pC = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Modulator 2 (ratio 2:1, snappy envelope)
    pM2 += (2 * Math.PI * (root * 2)) / sampleRate;
    const m2 = Math.sin(pM2) * (1.8 * Math.exp(-t * 25));

    // Modulator 1 (ratio 1:1)
    pM1 += (2 * Math.PI * root * (1 + m2)) / sampleRate;
    const m1 = Math.sin(pM1) * (2.2 * Math.exp(-t * 7.5));

    // Carrier
    pC += (2 * Math.PI * root * (1 + m1)) / sampleRate;
    const donk = Math.sin(pC) * Math.exp(-t * 4.2);
    const sub = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 3.0) * 0.5;

    data[i] = warmSaturate((donk + sub) * 1.45, 1.3);
  }
  return data;
}

function genBassJunoChorus(dur = 1.4) {
  // Roland Juno-106 sub-saw bass with analog chorus
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 65.41; // C2
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const chorusLfo = 0.007 * Math.sin(2 * Math.PI * 0.8 * t);
    p1 += (2 * Math.PI * root * (1 + chorusLfo)) / sampleRate;
    p2 += (2 * Math.PI * root * (1 - chorusLfo)) / sampleRate;

    const saw1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const saw2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1 * 0.5) * 0.7; // Sub-octave square/sine

    const cutoff = 400 + 2800 * Math.exp(-t * 4.8);
    const filtered = ladder.process((saw1 + saw2) * 0.55 + sub, cutoff, 1.4);
    const env = Math.exp(-t * 2.4);

    data[i] = warmSaturate(filtered * env * 1.4, 1.25);
  }
  return data;
}

function genBassRickenbacker(dur = 1.1) {
  // Vintage Picked Rickenbacker electric bass: sharp plectrum click + bright roundwound punch
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpBite = new Biquad();
  bpBite.setBandpass(2400, 2.5);
  const root = 65.41; // C2
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * root) / sampleRate;

    const saw = polyBlepSaw(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const fund = Math.sin(p) * 1.1;
    const bite = bpBite.process(saw) * 0.8 * Math.exp(-t * 8.0);
    const pickClick = (Math.random() * 2 - 1) * Math.exp(-t * 280) * 0.45;
    const env = Math.exp(-t * 3.8);

    data[i] = warmSaturate((fund + saw * 0.45 + bite) * env + pickClick, 1.25);
  }
  return data;
}

function genBassAnalogSquareSub(dur = 1.2) {
  // Rubbery analog pulse-width square + heavy sub
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const root = 49.0; // G1
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * root) / sampleRate;

    const sq = polyBlepSquare(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate, 0.4);
    const sub = Math.sin(p) * 0.75;
    const cutoff = 220 + 3400 * Math.exp(-t * 9.0);
    const filtered = ladder.process(sq * 0.6 + sub, cutoff, 2.0);
    const env = Math.exp(-t * 3.2);

    data[i] = warmSaturate(filtered * env * 1.5, 1.3);
  }
  return data;
}

function genBassOberheimSEM(dur = 1.35) {
  // Oberheim SEM 12dB multi-mode saw bass
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const svf = new ZdfSVF();
  const root = 55.0; // A1
  let p1 = 0, p2 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * root) / sampleRate;
    p2 += (2 * Math.PI * (root * 1.005)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p1 * 0.5) * 0.5;

    const cutoff = 300 + 3600 * Math.exp(-t * 4.2);
    const filtered = svf.process((s1 + s2) * 0.5 + sub, cutoff, 2.4).lp;
    const env = Math.exp(-t * 2.5);

    data[i] = warmSaturate(filtered * env * 1.45, 1.25);
  }
  return data;
}

// -------------------------------------------------------------
// KEYS (Rhodes, Piano, Organ, Clavinet, Wurlitzer)
// -------------------------------------------------------------
function genKeyRhodes(dur = 1.4) {
  // Fender Rhodes Mark I: 2-Op FM Tine + Cabinet Tremolo
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 261.63; // C4
  let pCarrier = 0, pMod = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const trem = 1.0 + 0.08 * Math.sin(2 * Math.PI * 4.8 * t);

    // FM Operator decay
    const modIndex = 1.8 * Math.exp(-t * 4.5);
    pMod += (2 * Math.PI * root) / sampleRate;
    const mod = Math.sin(pMod) * modIndex;

    pCarrier += (2 * Math.PI * root * (1 + mod)) / sampleRate;
    const tone = Math.sin(pCarrier) * Math.exp(-t * 2.2);

    // High tine chime (7x partial)
    const tine = Math.sin(2 * Math.PI * (root * 7.02) * t) * 0.35 * Math.exp(-t * 22.0);

    data[i] = warmSaturate((tone + tine) * trem * 1.35, 1.18);
  }
  applyRoomDiffuser(data, 0.15);
  return data;
}

function genKeyPiano(dur = 1.3) {
  // Concert Grand Piano with inharmonic string dispersion
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 220.0; // A3
  const B = 0.00015; // String inharmonicity coefficient
  const ladder = new ZdfMoogLadder();
  const bpWood = new Biquad();
  bpWood.setBandpass(380, 2.5); // Soundboard resonance

  let raw = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let stringSum = 0;
    // 6 inharmonic partials
    for (let k = 1; k <= 6; k++) {
      const fk = k * root * Math.sqrt(1 + B * k * k);
      const amp = Math.exp(-k * 0.35);
      const decay = Math.exp(-t * (2.2 + k * 0.8));
      stringSum += Math.sin(2 * Math.PI * fk * t) * amp * decay;
    }

    // Wooden hammer impact
    const hammer = (Math.random() * 2 - 1) * Math.exp(-t * 180) * 0.3;
    const soundboard = bpWood.process(hammer) * 0.5;

    const filtered = ladder.process(stringSum, 3200 * Math.exp(-t * 3.5) + 600, 0.5);
    data[i] = warmSaturate(filtered + hammer + soundboard, 1.15);
  }
  applyRoomDiffuser(data, 0.2);
  return data;
}

function genKeyOrgan(dur = 1.5) {
  // Hammond B3 Drawbars with Leslie Rotary Chorus
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 261.63; // C4
  // 9 Drawbar harmonic multipliers (16', 5-1/3', 8', 4', 2-2/3', 2', 1-3/5', 1-1/3', 1')
  const harmonics = [0.5, 1.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0];
  const amps = [0.8, 0.6, 1.0, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2];

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Leslie rotary speaker modulation
    const rotaryF = Math.sin(2 * Math.PI * 6.2 * t) * 0.006;
    const rotaryAmp = 1.0 + 0.12 * Math.sin(2 * Math.PI * 6.2 * t);

    let drawbarSum = 0;
    for (let h = 0; h < harmonics.length; h++) {
      const f = root * harmonics[h] * (1 + rotaryF);
      drawbarSum += Math.sin(2 * Math.PI * f * t) * amps[h];
    }

    const click = (Math.random() * 2 - 1) * Math.exp(-t * 220) * 0.25;
    const env = Math.min(1.0, t / 0.015) * Math.exp(-t * 1.8);
    data[i] = warmSaturate((drawbarSum * 0.25 * rotaryAmp + click) * env, 1.2);
  }
  return data;
}

function genKeyClavinet(dur = 0.9) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 196.0; // G3
  const bp = new Biquad();
  bp.setBandpass(2200, 2.0);
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * root) / sampleRate;
    const pulse = polyBlepSquare(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate, 0.25);
    const pickup = bp.process(pulse);
    const pluck = (Math.random() * 2 - 1) * Math.exp(-t * 250) * 0.35;
    const env = Math.exp(-t * 5.2);
    data[i] = warmSaturate((pulse * 0.4 + pickup * 0.8) * env + pluck, 1.25);
  }
  return data;
}

function genKeyWurlitzer(dur = 1.3) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 261.63; // C4
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const trem = 1.0 + 0.08 * Math.sin(2 * Math.PI * 5.5 * t);
    const p = 2 * Math.PI * root * t;
    const reed = Math.sin(p) + 0.35 * Math.sin(p * 3) + 0.18 * Math.sin(p * 5);
    const env = Math.exp(-t * 2.8);
    data[i] = warmSaturate(reed * env * trem * 1.3, 1.2);
  }
  return data;
}

// -------------------------------------------------------------
// PADS
// -------------------------------------------------------------
function genPadWarm(notes = [220, 261.63, 329.63, 493.88], dur = 1.8) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  const phases = notes.map(() => 0);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const lfo = Math.sin(2 * Math.PI * 0.45 * t) * 0.005;

    let sum = 0;
    notes.forEach((f, idx) => {
      phases[idx] += (2 * Math.PI * f * (1 + lfo)) / sampleRate;
      sum += polyBlepSaw(phases[idx] % (2 * Math.PI) / (2 * Math.PI), f / sampleRate);
    });

    const attack = Math.min(1.0, t / 0.25);
    const release = Math.exp(-Math.max(0, t - 1.2) * 3.5);
    const filtered = ladder.process(sum / notes.length, 1400 + 400 * Math.sin(t * 1.5), 0.6);

    data[i] = warmSaturate(filtered * attack * release * 1.4, 1.15);
  }
  applyRoomDiffuser(data, 0.28);
  return data;
}

// -------------------------------------------------------------
// BELLS
// -------------------------------------------------------------
function genBellCelestial(root = 659.25, dur = 1.6) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const partials = [
    { ratio: 1.0, amp: 1.0, decay: 2.2 },
    { ratio: 2.756, amp: 0.65, decay: 3.8 },
    { ratio: 5.404, amp: 0.40, decay: 5.5 },
    { ratio: 8.933, amp: 0.22, decay: 7.5 },
  ];

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let sum = 0;
    partials.forEach(p => {
      sum += Math.sin(2 * Math.PI * (root * p.ratio) * t) * p.amp * Math.exp(-t * p.decay);
    });
    const strike = Math.sin(2 * Math.PI * 5200 * t) * Math.exp(-t * 220) * 0.25;
    data[i] = warmSaturate(sum * 0.6 + strike, 1.2);
  }
  applyRoomDiffuser(data, 0.25);
  return data;
}

function genBellFMCrystal(root = 880.0, dur = 1.4) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let pMod = 0, pCarrier = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const modIdx = 2.4 * Math.exp(-t * 8.0);
    pMod += (2 * Math.PI * (root * 3.5)) / sampleRate;
    const mod = Math.sin(pMod) * modIdx;

    pCarrier += (2 * Math.PI * root * (1 + mod)) / sampleRate;
    const carrier = Math.sin(pCarrier) * Math.exp(-t * 2.8);
    const chime = Math.sin(2 * Math.PI * (root * 5.05) * t) * 0.25 * Math.exp(-t * 18);

    data[i] = warmSaturate((carrier + chime) * 1.35, 1.15);
  }
  applyRoomDiffuser(data, 0.25);
  return data;
}

// -------------------------------------------------------------
// STRINGS
// -------------------------------------------------------------
function genStringsChamber(root = 261.63, dur = 1.6) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpBody1 = new Biquad();
  bpBody1.setBandpass(300, 2.2); // Violin air cavity
  const bpBody2 = new Biquad();
  bpBody2.setBandpass(520, 2.5); // Wood top plate
  const bpBridge = new Biquad();
  bpBridge.setBandpass(2400, 2.0); // Bridge hill

  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const vib = t > 0.15 ? 0.005 * Math.sin(2 * Math.PI * 5.4 * t) : 0;
    p1 += (2 * Math.PI * root * (1 + vib)) / sampleRate;
    p2 += (2 * Math.PI * (root * 0.994) * (1 + vib)) / sampleRate;
    p3 += (2 * Math.PI * (root * 1.006) * (1 + vib)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s3 = polyBlepSaw(p3 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);

    const ensemble = (s1 + s2 + s3) * 0.333;
    const b1 = bpBody1.process(ensemble) * 0.5;
    const b2 = bpBody2.process(ensemble) * 0.45;
    const bBridge = bpBridge.process(ensemble) * 0.3;

    const attack = Math.min(1.0, t / 0.08);
    const release = Math.exp(-Math.max(0, t - 1.2) * 4.0);

    data[i] = warmSaturate((ensemble * 0.4 + b1 + b2 + bBridge) * attack * release * 1.5, 1.2);
  }
  applyRoomDiffuser(data, 0.25);
  return data;
}

function genStringsCello(root = 65.41, dur = 1.7) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpCello = new Biquad();
  bpCello.setBandpass(220, 2.0);
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const vib = t > 0.2 ? 0.005 * Math.sin(2 * Math.PI * 4.8 * t) : 0;
    p += (2 * Math.PI * root * (1 + vib)) / sampleRate;

    const saw = polyBlepSaw(p % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = Math.sin(p) * 0.6;
    const body = bpCello.process(saw) * 0.7;

    const attack = Math.min(1.0, t / 0.1);
    const release = Math.exp(-Math.max(0, t - 1.3) * 4.0);

    data[i] = warmSaturate((saw * 0.5 + sub + body) * attack * release * 1.3, 1.25);
  }
  return data;
}

function genStringsSolina(root = 392.0, dur = 1.8) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let p1 = 0, p2 = 0, p3 = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // 3-Phase BBD Chorus (0 deg, 120 deg, 240 deg)
    const m1 = 0.006 * Math.sin(2 * Math.PI * 0.6 * t);
    const m2 = 0.006 * Math.sin(2 * Math.PI * 0.6 * t + (2 * Math.PI) / 3);
    const m3 = 0.006 * Math.sin(2 * Math.PI * 0.6 * t + (4 * Math.PI) / 3);

    p1 += (2 * Math.PI * root * (1 + m1)) / sampleRate;
    p2 += (2 * Math.PI * root * (1 + m2)) / sampleRate;
    p3 += (2 * Math.PI * root * (1 + m3)) / sampleRate;

    const s1 = polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s2 = polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const s3 = polyBlepSaw(p3 % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);

    const env = Math.min(1.0, t / 0.12) * Math.exp(-t * 1.4);
    data[i] = warmSaturate((s1 + s2 + s3) * 0.35 * env * 1.4, 1.2);
  }
  return data;
}

// -------------------------------------------------------------
// ACID 303 SYNTHESIZER
// -------------------------------------------------------------
function genAcid303(type = 1, root = 65.41, dur = 1.2) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let freq = root;
    if (type === 4 && t > 0.35) {
      // Slide up an octave
      const prog = Math.min(1.0, (t - 0.35) / 0.18);
      freq = root + (root * 2 - root) * prog;
    }

    phase += (2 * Math.PI * freq) / sampleRate;
    const saw = polyBlepSaw(phase % (2 * Math.PI) / (2 * Math.PI), freq / sampleRate);
    const sub = Math.sin(phase * 0.5) * 0.35;

    const accentEnv = Math.exp(-t * (type === 1 ? 7.5 : 5.0));
    const cutoff = 280 + 4200 * accentEnv;
    const res = type === 3 ? 3.2 : 2.5;

    const filtered = ladder.process(saw + sub, cutoff, res);
    const env = Math.exp(-t * 2.5);
    data[i] = warmSaturate(filtered * env * 1.6, type === 3 ? 1.6 : 1.3);
  }
  return data;
}

function genPluckGuitar(freq = 246.94, dur = 1.2) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(freq * 2.2, 3.0);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * freq) / sampleRate;
    const body = Math.sin(p) * 1.1 + Math.sin(p * 2) * 0.45;
    const pluck = (Math.random() * 2 - 1) * Math.exp(-t * 240) * 0.4;
    const env = Math.exp(-t * 4.2);
    data[i] = warmSaturate((body + bp.process(pluck)) * env * 1.3, 1.2);
  }
  applyRoomDiffuser(data, 0.15);
  return data;
}

function genPluckBanjo(freq = 293.66, dur = 0.95) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * freq) / sampleRate;
    const twang = Math.sin(p) + 0.6 * Math.sin(p * 3) + 0.3 * Math.sin(p * 5);
    const pick = Math.sin(2 * Math.PI * 3400 * t) * Math.exp(-t * 220) * 0.5;
    const env = Math.exp(-t * 5.8);
    data[i] = warmSaturate((twang * env + pick) * 1.25, 1.2);
  }
  return data;
}

function genKeyDX7EPiano(dur = 1.35) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 261.63; // C4
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const m = Math.sin(2 * Math.PI * (root * 4.0) * t) * (root * 2.5) * Math.exp(-t * 12.0);
    const carrier = Math.sin(2 * Math.PI * (root + m) * t);
    const tine = Math.sin(2 * Math.PI * (root * 7.0) * t) * 0.25 * Math.exp(-t * 25.0);
    const env = Math.exp(-t * 2.8);
    data[i] = warmSaturate((carrier + tine) * env * 1.4, 1.15);
  }
  applyRoomDiffuser(data, 0.2);
  return data;
}

function genPadLush(dur = 1.8) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const notes = [220.0, 277.18, 329.63, 415.3]; // A maj7
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let sum = 0;
    notes.forEach((f) => {
      const p1 = 2 * Math.PI * (f * 0.996) * t;
      const p2 = 2 * Math.PI * (f * 1.004) * t;
      sum += polyBlepSaw(p1 % (2 * Math.PI) / (2 * Math.PI), f / sampleRate) * 0.5;
      sum += polyBlepSaw(p2 % (2 * Math.PI) / (2 * Math.PI), f / sampleRate) * 0.5;
    });
    const env = Math.min(1.0, t / 0.15) * Math.exp(-t * 1.2);
    data[i] = warmSaturate((sum / notes.length) * env * 1.5, 1.2);
  }
  applyRoomDiffuser(data, 0.3);
  return data;
}

function genBellVibraphone(dur = 1.4) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const root = 440.0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const trem = 1.0 + 0.15 * Math.sin(2 * Math.PI * 4.8 * t);
    const f1 = Math.sin(2 * Math.PI * root * t) * Math.exp(-t * 2.5);
    const f2 = Math.sin(2 * Math.PI * (root * 4.0) * t) * 0.35 * Math.exp(-t * 8.0);
    const strike = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 160) * 0.25;
    data[i] = warmSaturate((f1 + f2 + strike) * trem * 1.35, 1.15);
  }
  return data;
}

function genBassSubOsc(root = 55.0, dur = 1.4) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  let phase = 0;
  let subPhase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    phase += (2 * Math.PI * root) / sampleRate;
    subPhase += (2 * Math.PI * (root * 0.5)) / sampleRate;
    const saw = polyBlepSaw(phase % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const sub = (Math.sin(subPhase) + 0.25 * Math.sin(subPhase * 2)) * 0.75;
    const cutoff = 220 + 3200 * Math.exp(-t * 8.5);
    const filtered = ladder.process(saw + sub, cutoff, 2.8);
    const env = Math.exp(-t * 2.4);
    data[i] = warmSaturate(filtered * env * 1.5, 1.3);
  }
  return data;
}

function genSynthSubOsc(root = 220.0, dur = 1.5) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const ladder = new ZdfMoogLadder();
  let phase = 0;
  let subPhase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    phase += (2 * Math.PI * root) / sampleRate;
    subPhase += (2 * Math.PI * (root * 0.5)) / sampleRate;
    const saw1 = polyBlepSaw(phase % (2 * Math.PI) / (2 * Math.PI), root / sampleRate);
    const saw2 = polyBlepSaw((phase * 1.006) % (2 * Math.PI) / (2 * Math.PI), (root * 1.006) / sampleRate);
    const sub = (Math.sin(subPhase) + 0.2 * Math.sin(subPhase * 2)) * 0.7;
    const cutoff = 400 + 4400 * Math.exp(-t * 6.0);
    const filtered = ladder.process((saw1 + saw2) * 0.5 + sub, cutoff, 2.4);
    const env = Math.min(1.0, t / 0.005) * Math.exp(-t * 2.8);
    data[i] = warmSaturate(filtered * env * 1.5, 1.25);
  }
  return data;
}

module.exports = {
  genPluckHarp,
  genPluckKarplus,
  genPluckKalimba,
  genPluckPizzicato,
  genPluckSynth,
  genPluckKoto,
  genPluckGuitar,
  genPluckBanjo,
  genSub808,
  genBassSawMoog,
  genBassSawCyber,
  genBassSawPluck,
  genBassDarkReese,
  genBassSlap,
  genBassFretless,
  genBassNeuroWobble,
  genBassAcidScreamer,
  genBassFMDonk,
  genBassJunoChorus,
  genBassRickenbacker,
  genBassAnalogSquareSub,
  genBassOberheimSEM,
  genBassSubOsc,
  genSynthSubOsc,
  genKeyRhodes,
  genKeyPiano,
  genKeyOrgan,
  genKeyClavinet,
  genKeyWurlitzer,
  genKeyDX7EPiano,
  genPadWarm,
  genPadLush,
  genBellCelestial,
  genBellFMCrystal,
  genBellVibraphone,
  genStringsChamber,
  genStringsCello,
  genStringsSolina,
  genAcid303,
};
