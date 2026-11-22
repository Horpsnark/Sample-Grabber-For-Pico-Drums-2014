const {
  sampleRate,
  polyBlepSaw,
  polyBlepSquare,
  PinkNoise,
  Biquad,
  ZdfSVF,
  warmSaturate,
  applyRoomDiffuser,
} = require('./audioCore.cjs');

// -------------------------------------------------------------
// KICKS
// -------------------------------------------------------------
function genKickPunch(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bpClick = new Biquad();
  bpClick.setBandpass(3800, 2.0);

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // 2-stage pitch sweep: fast 8ms attack snap + 40ms body settle to 52Hz
    const freq = 52 + 280 * Math.exp(-t * 70) + 65 * Math.exp(-t * 18);
    phase += (2 * Math.PI * freq) / sampleRate;

    // Body with warm 2nd harmonic
    const body = Math.sin(phase) + 0.15 * Math.sin(phase * 2) * Math.exp(-t * 15);
    const env = Math.exp(-t * 8.0);

    // Beater impact transient (acoustic felt beater broadband click)
    const beaterNoise = bpClick.process(pink.next()) * Math.exp(-t * 320) * 0.45;
    const clickTone = Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-t * 400) * 0.35;

    data[i] = warmSaturate((body * env + beaterNoise + clickTone), 1.25);
  }
  return data;
}

function genKickDeep808(dur = 0.8) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Classic 808 pitch dive: 130Hz -> 42Hz
    const freq = 42 + 120 * Math.exp(-t * 36);
    phase += (2 * Math.PI * freq) / sampleRate;

    const sub = Math.sin(phase);
    const harm = Math.sin(phase * 2) * 0.12 * Math.exp(-t * 10);
    const env = Math.exp(-t * 3.4);

    // Initial click pulse
    const click = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 500) * 0.3;
    data[i] = warmSaturate((sub + harm) * env + click, 1.18);
  }
  return data;
}

function genKickTight(dur = 0.38) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(4200, 2.2);

  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const freq = 58 + 240 * Math.exp(-t * 85);
    phase += (2 * Math.PI * freq) / sampleRate;

    const body = Math.sin(phase) * Math.exp(-t * 13.0);
    const beater = bp.process(pink.next()) * Math.exp(-t * 350) * 0.4;
    data[i] = warmSaturate(body + beater, 1.2);
  }
  return data;
}

function genKickModular(dur = 0.5) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const freq = 50 + 320 * Math.exp(-t * 75);
    phase += (2 * Math.PI * freq) / sampleRate;

    const body = Math.sin(phase) + 0.2 * Math.sin(phase * 3) * Math.exp(-t * 15);
    const env = Math.exp(-t * 7.5);
    const crack = Math.sin(2 * Math.PI * 2800 * t) * Math.exp(-t * 450) * 0.45;
    data[i] = warmSaturate((body * env + crack) * 1.35, 1.4);
  }
  return data;
}

function genKickAcoustic(dur = 0.6) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bpWood = new Biquad();
  bpWood.setBandpass(3200, 1.8);
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const freq = 54 + 180 * Math.exp(-t * 50) + 40 * Math.exp(-t * 14);
    phase += (2 * Math.PI * freq) / sampleRate;

    const shell = (Math.sin(phase) + 0.18 * Math.sin(phase * 2)) * Math.exp(-t * 8.5);
    const woodBeater = bpWood.process(pink.next()) * Math.exp(-t * 260) * 0.35;
    data[i] = warmSaturate(shell + woodBeater, 1.15);
  }
  return data;
}

// -------------------------------------------------------------
// SNARES
// -------------------------------------------------------------
function genSnareCrisp(dur = 0.5) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bpBody = new Biquad();
  bpBody.setBandpass(2400, 1.8);
  const hpAir = new Biquad();
  hpAir.setHighpass(4800, 1.2);

  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Drumhead fundamental modes with 12ms pitch drop
    p1 += (2 * Math.PI * (185 + 80 * Math.exp(-t * 55))) / sampleRate;
    p2 += (2 * Math.PI * (330 + 110 * Math.exp(-t * 60))) / sampleRate;

    const tone = (Math.sin(p1) + 0.55 * Math.sin(p2)) * Math.exp(-t * 16) * 0.6;
    const noiseRaw = pink.next();
    const wiresBody = bpBody.process(noiseRaw) * Math.exp(-t * 14) * 0.9;
    const wiresAir = hpAir.process(noiseRaw) * (Math.exp(-t * 12) + 0.2 * Math.exp(-t * 5)) * 1.1;

    // Drumstick head crack (transient burst)
    const stick = (Math.random() * 2 - 1) * Math.exp(-t * 400) * 0.35;
    data[i] = warmSaturate(tone + wiresBody + wiresAir + stick, 1.25);
  }
  applyRoomDiffuser(data, 0.12);
  return data;
}

function genSnare909(dur = 0.52) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const hp = new Biquad();
  hp.setHighpass(3000, 1.4);

  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * (210 + 110 * Math.exp(-t * 50))) / sampleRate;
    p2 += (2 * Math.PI * (335 + 130 * Math.exp(-t * 55))) / sampleRate;

    const body = (Math.sin(p1) + 0.45 * Math.sin(p2)) * Math.exp(-t * 18) * 0.7;
    const noise = hp.process(pink.next()) * Math.exp(-t * 11) * 1.35;
    const crack = (Math.random() * 2 - 1) * Math.exp(-t * 350) * 0.4;
    data[i] = warmSaturate(body + noise + crack, 1.3);
  }
  return data;
}

function genSnareTrap(dur = 0.42) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(4600, 2.2);

  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * (240 + 140 * Math.exp(-t * 60))) / sampleRate;
    const body = Math.sin(p) * Math.exp(-t * 22) * 0.5;
    const noise = bp.process(pink.next()) * Math.exp(-t * 15) * 1.6;
    const snap = (Math.random() * 2 - 1) * Math.exp(-t * 450) * 0.5;
    data[i] = warmSaturate(body + noise + snap, 1.3);
  }
  return data;
}

function genSnareRimshot(dur = 0.38) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp1 = new Biquad();
  bp1.setBandpass(880, 5.0);
  const bp2 = new Biquad();
  bp2.setBandpass(1760, 4.5);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 350);
    const ring1 = bp1.process(click) * Math.exp(-t * 28) * 2.2;
    const ring2 = bp2.process(click) * Math.exp(-t * 32) * 1.6;
    const acousticPing = Math.sin(2 * Math.PI * 1820 * t) * Math.exp(-t * 50) * 0.35;
    data[i] = warmSaturate(click * 0.4 + ring1 + ring2 + acousticPing, 1.25);
  }
  return data;
}

function genSnareMaple(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(2800, 1.6);
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * (175 + 65 * Math.exp(-t * 40))) / sampleRate;
    const shell = Math.sin(p) * Math.exp(-t * 14) * 0.65;
    const rattle = bp.process(pink.next()) * (Math.exp(-t * 13) + 0.15 * Math.exp(-t * 4.5)) * 1.2;
    const stick = (Math.random() * 2 - 1) * Math.exp(-t * 300) * 0.35;
    data[i] = warmSaturate(shell + rattle + stick, 1.2);
  }
  applyRoomDiffuser(data, 0.15);
  return data;
}

// -------------------------------------------------------------
// CLAPS
// -------------------------------------------------------------
function genClapHand(dur = 0.5) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(1350, 1.8);
  const hp = new Biquad();
  hp.setHighpass(3600, 1.4);

  // 3 staggered micro-claps then main clap
  const flams = [0, 0.011, 0.023, 0.035];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const pNoise = pink.next();
    const bandNoise = bp.process(pNoise);
    const sizzleNoise = hp.process(pNoise) * 0.5;
    const combo = bandNoise + sizzleNoise;

    let preHits = 0;
    for (let f = 0; f < 3; f++) {
      const ft = flams[f];
      if (t >= ft) {
        const dt = t - ft;
        preHits += combo * (1 - Math.exp(-dt * 800)) * Math.exp(-dt * 150) * 0.7;
      }
    }

    let mainHit = 0;
    if (t >= flams[3]) {
      const dt = t - flams[3];
      mainHit = combo * (1 - Math.exp(-dt * 600)) * (Math.exp(-dt * 12) + 0.25 * Math.exp(-dt * 4)) * 1.35;
    }

    data[i] = warmSaturate(preHits + mainHit, 1.25);
  }
  applyRoomDiffuser(data, 0.2);
  return data;
}

function genClapStudio808(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(1550, 2.0);

  const flams = [0, 0.012, 0.025, 0.038];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const nVal = bp.process(pink.next());

    let flamSum = 0;
    flams.forEach((fTime, idx) => {
      if (t >= fTime) {
        const dt = t - fTime;
        const decay = idx === 3 ? 10 : 130;
        flamSum += nVal * Math.exp(-dt * decay) * (idx === 3 ? 1.2 : 0.65);
      }
    });

    data[i] = warmSaturate(flamSum, 1.25);
  }
  return data;
}

function genClapSnap(dur = 0.38) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(2600, 2.5);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const skinContact = (Math.random() * 2 - 1) * Math.exp(-t * 380) * 0.5;
    const tone = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 55) * 0.65;
    const body = Math.sin(2 * Math.PI * 920 * t) * Math.exp(-t * 40) * 0.4;
    const snapNoise = bp.process(Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.5;
    data[i] = warmSaturate(skinContact + tone + body + snapNoise, 1.2);
  }
  return data;
}

function genClapGroup(dur = 0.6) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(1300, 1.6);
  const hp = new Biquad();
  hp.setHighpass(3400, 1.2);

  const hits = [0, 0.008, 0.016, 0.025, 0.036, 0.048];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const p = pink.next();
    const filtered = bp.process(p) + hp.process(p) * 0.4;

    let sum = 0;
    hits.forEach((hitT) => {
      if (t >= hitT) {
        const dt = t - hitT;
        sum += filtered * Math.exp(-dt * 45) * 0.45;
      }
    });

    const tail = filtered * Math.exp(-t * 8.5) * 0.6;
    data[i] = warmSaturate(sum + tail, 1.25);
  }
  applyRoomDiffuser(data, 0.25);
  return data;
}

// -------------------------------------------------------------
// HI-HATS
// -------------------------------------------------------------
// TR-808/909 6-Oscillator Inharmonic Metallic Pulse Matrix
function genHatClosed(dur = 0.22) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const freqs = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0];
  const phases = [0, 0, 0, 0, 0, 0];

  const hp1 = new Biquad();
  hp1.setHighpass(7600, 1.5);
  const hp2 = new Biquad();
  hp2.setHighpass(8800, 1.4);
  const bp = new Biquad();
  bp.setBandpass(9800, 2.5);

  const pink = new PinkNoise();

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let oscCluster = 0;
    for (let f = 0; f < 6; f++) {
      phases[f] += (2 * Math.PI * freqs[f]) / sampleRate;
      oscCluster += Math.sin(phases[f]) > 0 ? 0.2 : -0.2;
    }

    const sizzle = pink.next() * 0.65;
    const raw = oscCluster + sizzle;
    const filtered = bp.process(hp2.process(hp1.process(raw)));

    // Sharp stick tick (1ms) + crisp 50ms decay
    const tick = (Math.random() * 2 - 1) * Math.exp(-t * 350) * 0.4;
    const env = Math.exp(-t * 45.0);

    data[i] = warmSaturate(filtered * env * 2.8 + tick, 1.2);
  }
  return data;
}

function genHatOpen(dur = 0.45) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const freqs = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0];
  const phases = [0, 0, 0, 0, 0, 0];

  const hp1 = new Biquad();
  hp1.setHighpass(7200, 1.4);
  const hp2 = new Biquad();
  hp2.setHighpass(8200, 1.3);
  const pink = new PinkNoise();

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let oscCluster = 0;
    for (let f = 0; f < 6; f++) {
      phases[f] += (2 * Math.PI * freqs[f]) / sampleRate;
      oscCluster += Math.sin(phases[f]) > 0 ? 0.2 : -0.2;
    }

    const air = pink.next() * 0.8;
    const filtered = hp2.process(hp1.process(oscCluster + air));
    const env = (Math.exp(-t * 35) * 0.4 + Math.exp(-t * 8.5) * 0.6);

    data[i] = warmSaturate(filtered * env * 2.2, 1.2);
  }
  return data;
}

function genHatTicked(dur = 0.18) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(10500, 2.8);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const tickPulse = (Math.random() * 2 - 1) * Math.exp(-t * 220);
    const filtered = bp.process(tickPulse);
    const env = Math.exp(-t * 60.0);
    data[i] = filtered * env * 3.2;
  }
  return data;
}

function genHatMetallic(dur = 0.3) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp1 = new Biquad();
  bp1.setBandpass(8400, 4.0);
  const bp2 = new Biquad();
  bp2.setBandpass(11200, 3.5);
  const pink = new PinkNoise();

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const nVal = pink.next();
    const ring1 = bp1.process(nVal) * Math.exp(-t * 18);
    const ring2 = bp2.process(nVal) * Math.exp(-t * 24);
    const air = Math.exp(-t * 22) * nVal * 0.25;
    data[i] = warmSaturate((ring1 + ring2 + air) * 2.6, 1.25);
  }
  return data;
}

function genHatHalfOpen(dur = 0.35) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const hp = new Biquad();
  hp.setHighpass(7400, 1.5);
  const bp = new Biquad();
  bp.setBandpass(9200, 2.2);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const raw = hp.process(pink.next());
    const sizzle = bp.process(raw);
    const env = (Math.exp(-t * 28) * 0.5 + Math.exp(-t * 14) * 0.5);
    data[i] = warmSaturate((raw + sizzle) * env * 1.9, 1.2);
  }
  return data;
}

function genHatPedalFoot(dur = 0.22) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(6800, 1.8);
  let p = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * 480) / sampleRate;
    const footThump = Math.sin(p) * Math.exp(-t * 40) * 0.25;
    const chick = bp.process(pink.next()) * Math.exp(-t * 36) * 1.4;
    data[i] = warmSaturate(footThump + chick, 1.15);
  }
  return data;
}

// -------------------------------------------------------------
// TOMS
// -------------------------------------------------------------
function genTom(fundamentalHz, dur = 0.5) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bpStick = new Biquad();
  bpStick.setBandpass(2600, 2.0);

  // Coupled circular drumhead modes: fundamental (0,1), (1,1) at 1.59x, (0,2) at 2.14x
  let p0 = 0, p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Pitch drops slightly on impact as tension settles
    const f0 = fundamentalHz + 45 * Math.exp(-t * 25);
    p0 += (2 * Math.PI * f0) / sampleRate;
    p1 += (2 * Math.PI * (f0 * 1.593)) / sampleRate;
    p2 += (2 * Math.PI * (f0 * 2.135)) / sampleRate;

    // Higher modes damp rapidly in 20-30ms
    const m0 = Math.sin(p0) * Math.exp(-t * 8.5);
    const m1 = Math.sin(p1) * Math.exp(-t * 28.0) * 0.4;
    const m2 = Math.sin(p2) * Math.exp(-t * 40.0) * 0.25;

    // Wooden stick strike
    const stick = bpStick.process(pink.next()) * Math.exp(-t * 180) * 0.45;
    data[i] = warmSaturate(m0 + m1 + m2 + stick, 1.2);
  }
  return data;
}

// -------------------------------------------------------------
// PERCUSSION
// -------------------------------------------------------------
function genWoodBlock(dur = 0.35) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bpCavity = new Biquad();
  bpCavity.setBandpass(920, 4.0); // Helmholtz cavity
  const bpWood = new Biquad();
  bpWood.setBandpass(2250, 5.0); // Wood beam mode

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const strike = (Math.random() * 2 - 1) * Math.exp(-t * 300);
    const c1 = bpCavity.process(strike) * Math.exp(-t * 35) * 2.0;
    const c2 = bpWood.process(strike) * Math.exp(-t * 45) * 2.2;
    data[i] = warmSaturate(c1 + c2, 1.25);
  }
  return data;
}

function genClave(dur = 0.32) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  // Rosewood acoustic resonance frequencies
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f1 = 2550 + 200 * Math.exp(-t * 100);
    const f2 = 5250 + 300 * Math.exp(-t * 120);
    const ping1 = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-t * 38);
    const ping2 = Math.sin(2 * Math.PI * f2 * t) * 0.35 * Math.exp(-t * 55);
    const tap = (Math.random() * 2 - 1) * Math.exp(-t * 400) * 0.25;
    data[i] = warmSaturate(ping1 + ping2 + tap, 1.2);
  }
  return data;
}

function genCowbell808(dur = 0.45) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp1 = new Biquad();
  bp1.setBandpass(587, 5.0);
  const bp2 = new Biquad();
  bp2.setBandpass(845, 5.0);

  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p1 += (2 * Math.PI * 587) / sampleRate;
    p2 += (2 * Math.PI * 845) / sampleRate;

    const sq1 = polyBlepSquare(p1 % (2 * Math.PI) / (2 * Math.PI), 587 / sampleRate);
    const sq2 = polyBlepSquare(p2 % (2 * Math.PI) / (2 * Math.PI), 845 / sampleRate);

    const f1 = bp1.process(sq1) * 1.0;
    const f2 = bp2.process(sq2) * 1.2;
    const env = Math.exp(-t * 9.5);
    data[i] = warmSaturate((f1 + f2) * env * 1.8, 1.25);
  }
  return data;
}

function genCongaSlap(dur = 0.42) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bpSlap = new Biquad();
  bpSlap.setBandpass(1850, 2.5);

  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * (215 + 85 * Math.exp(-t * 40))) / sampleRate;
    const skinTone = Math.sin(p) * Math.exp(-t * 12.0) * 0.8;
    const palmSlap = bpSlap.process(pink.next()) * Math.exp(-t * 180) * 0.6;
    data[i] = warmSaturate(skinTone + palmSlap, 1.2);
  }
  return data;
}

function genKickHardstyle(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = 52 + 180 * Math.exp(-t * 35);
    p += (2 * Math.PI * f) / sampleRate;
    const body = Math.sin(p);
    const punch = Math.sin(2 * Math.PI * 450 * t) * Math.exp(-t * 70) * 0.5;
    const dist = Math.tanh((body + punch) * 2.8);
    const env = Math.exp(-t * (2.8 / dur));
    data[i] = warmSaturate(dist * env * 1.4, 1.4);
  }
  return data;
}

function genKickLofi(dur = 0.48) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const lp = new Biquad();
  lp.setLowpass(320, 1.2);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = 48 + 90 * Math.exp(-t * 28);
    p += (2 * Math.PI * f) / sampleRate;
    const body = Math.sin(p) * Math.exp(-t * 6.5);
    const filtered = lp.process(body);
    data[i] = warmSaturate(filtered * 1.5, 1.2);
  }
  return data;
}

function genSnareBrass(dur = 0.45) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(2400, 2.0);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * 220) / sampleRate;
    const tone = Math.sin(p) * Math.exp(-t * 22);
    const noise = bp.process(pink.next()) * Math.exp(-t * 14);
    const rim = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.4;
    data[i] = warmSaturate(tone * 0.6 + noise * 1.1 + rim, 1.3);
  }
  return data;
}

function genSnarePiccolo(dur = 0.35) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(3800, 2.4);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * 280) / sampleRate;
    const tone = Math.sin(p) * Math.exp(-t * 28);
    const wires = bp.process(pink.next()) * Math.exp(-t * 20);
    const crack = (Math.random() * 2 - 1) * Math.exp(-t * 160) * 0.5;
    data[i] = warmSaturate(tone * 0.5 + wires * 1.2 + crack, 1.25);
  }
  return data;
}

function genSnareGated80s(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(2100, 1.8);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * 185) / sampleRate;
    const tone = Math.sin(p) * Math.exp(-t * 15);
    const gate = t < 0.22 ? 1.0 : Math.exp(-(t - 0.22) * 50);
    const noise = bp.process(pink.next()) * gate * 1.2;
    data[i] = warmSaturate(tone * 0.7 + noise, 1.3);
  }
  return data;
}

function genClapStereoWide(dur = 0.55) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const pink = new PinkNoise();
  const bp = new Biquad();
  bp.setBandpass(1400, 1.8);
  const taps = [0, 0.012, 0.024, 0.038];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let burst = 0;
    taps.forEach((tap) => {
      if (t >= tap) {
        burst += Math.exp(-(t - tap) * 90) * 0.45;
      }
    });
    const tail = Math.exp(-t * 9.5) * 0.8;
    const noise = bp.process(pink.next());
    data[i] = warmSaturate(noise * (burst + tail) * 1.4, 1.25);
  }
  return data;
}

function genClapFingerSnap(dur = 0.32) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(3200, 3.0);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const click = Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 140) * 0.8;
    const noise = bp.process(Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.5;
    data[i] = warmSaturate((click + noise) * 1.3, 1.2);
  }
  return data;
}

function genHatSizzle(dur = 0.48) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(9800, 2.5);
  const hp = new Biquad();
  hp.setHighpass(8500, 1.0);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const raw = Math.random() * 2 - 1;
    const sizzle = bp.process(hp.process(raw));
    const env = Math.exp(-t * (4.2 / dur));
    data[i] = warmSaturate(sizzle * env * 2.2, 1.15);
  }
  return data;
}

function genHatDarkWash(dur = 0.42) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(6200, 1.8);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const noise = bp.process(Math.random() * 2 - 1);
    const env = Math.exp(-t * 6.5);
    data[i] = warmSaturate(noise * env * 1.8, 1.2);
  }
  return data;
}

function genPercBongo(dur = 0.38) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * (420 + 120 * Math.exp(-t * 60))) / sampleRate;
    const slap = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 180) * 0.4;
    const tone = Math.sin(p) * Math.exp(-t * 18);
    data[i] = warmSaturate((tone + slap) * 1.35, 1.2);
  }
  return data;
}

function genPercShaker(dur = 0.32) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp = new Biquad();
  bp.setBandpass(5800, 2.8);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const raw = Math.random() * 2 - 1;
    const env = Math.sin(Math.min(Math.PI, t * 20)) * Math.exp(-t * 8.0);
    data[i] = bp.process(raw) * env * 2.0;
  }
  return data;
}

function genPercTambourine(dur = 0.42) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  const bp1 = new Biquad();
  bp1.setBandpass(7200, 3.2);
  const bp2 = new Biquad();
  bp2.setBandpass(11000, 2.5);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const raw = Math.random() * 2 - 1;
    const jangle = bp1.process(raw) * 0.7 + bp2.process(raw) * 0.8;
    const strike = Math.sin(2 * Math.PI * 850 * t) * Math.exp(-t * 90) * 0.4;
    const env = Math.exp(-t * 9.0);
    data[i] = warmSaturate((jangle * env + strike) * 1.4, 1.15);
  }
  return data;
}

function genPercAgogo(dur = 0.45) {
  const n = Math.floor(sampleRate * dur);
  const data = new Float32Array(n);
  let p = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    p += (2 * Math.PI * 784) / sampleRate;
    const ring = Math.sin(p) + 0.35 * Math.sin(p * 2.14);
    const env = Math.exp(-t * 8.5);
    const strike = (Math.random() * 2 - 1) * Math.exp(-t * 220) * 0.3;
    data[i] = (ring * env + strike) * 1.3;
  }
  return data;
}

module.exports = {
  genKickPunch,
  genKickDeep808,
  genKickTight,
  genKickModular,
  genKickAcoustic,
  genKickHardstyle,
  genKickLofi,
  genSnareCrisp,
  genSnare909,
  genSnareTrap,
  genSnareRimshot,
  genSnareMaple,
  genSnareBrass,
  genSnarePiccolo,
  genSnareGated80s,
  genClapHand,
  genClapStudio808,
  genClapSnap,
  genClapGroup,
  genClapStereoWide,
  genClapFingerSnap,
  genHatClosed,
  genHatOpen,
  genHatTicked,
  genHatMetallic,
  genHatHalfOpen,
  genHatPedalFoot,
  genHatSizzle,
  genHatDarkWash,
  genTom,
  genWoodBlock,
  genClave,
  genCowbell808,
  genCongaSlap,
  genPercBongo,
  genPercShaker,
  genPercTambourine,
  genPercAgogo,
};
