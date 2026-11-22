import fs from 'fs';
import path from 'path';

function createWavBuffer(samples, sampleRate = 44100) {
  // Apply 5ms anti-pop fade at tail
  const fadeLen = Math.floor(sampleRate * 0.005);
  for (let i = samples.length - fadeLen; i < samples.length; i++) {
    if (i >= 0) {
      samples[i] *= (samples.length - i) / fadeLen;
    }
  }

  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.floor(val), 44 + i * 2);
  }

  return buffer;
}

const sampleRate = 44100;

// 1. KICKS
function genKick(type) {
  const dur = 0.45;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);

  if (type === 0) {
    // Punchy Club 909 Kick
    const startF = 260;
    const endF = 48;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * (endF * t + ((startF - endF) / 38) * (1 - Math.exp(-t * 38)));
      const env = Math.exp(-t * 10);
      const click = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 240) * 0.35;
      let sample = Math.sin(phase) * env + click;
      arr[i] = Math.tanh(sample * 1.2);
    }
  } else if (type === 1) {
    // Deep 808 Sub Kick
    const startF = 160;
    const endF = 38;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * (endF * t + ((startF - endF) / 28) * (1 - Math.exp(-t * 28)));
      const env = Math.exp(-t * 6.5);
      const subRumble = Math.sin(phase * 0.5) * Math.exp(-t * 5) * 0.25;
      const click = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 220) * 0.3;
      arr[i] = Math.tanh((Math.sin(phase) * env + subRumble + click) * 1.15);
    }
  } else if (type === 2) {
    // Hard Modular Distorted Kick
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * (52 * t + (320 / 60) * (1 - Math.exp(-t * 60)));
      const body = Math.sin(phase) * Math.exp(-t * 13);
      const click = Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 280) * 0.35;
      arr[i] = Math.tanh((body + click) * 1.25);
    }
  } else {
    // Tight Studio Punch Kick
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const phase = 2 * Math.PI * (55 * t + (200 / 45) * (1 - Math.exp(-t * 45)));
      const body = Math.sin(phase) * Math.exp(-t * 14);
      const click = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 220) * 0.35;
      arr[i] = Math.tanh((body * 1.1 + click) * 1.15);
    }
  }
  return arr;
}

// 2. SNARES
function genSnare(type) {
  const dur = 0.35;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);

  let noiseState = 0;
  if (type === 0) {
    // Crisp 808 Analog Snare
    const toneF1 = 185;
    const toneF2 = 330;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const pitchDrop1 = toneF1 * Math.exp(-t * 22);
      const pitchDrop2 = toneF2 * Math.exp(-t * 26);
      const tone = (Math.sin(2 * Math.PI * pitchDrop1 * t) + 0.6 * Math.sin(2 * Math.PI * pitchDrop2 * t)) * Math.exp(-t * 18);
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.70 + rawNoise * 0.30; // 1-pole filter removes static
      const noise = noiseState * Math.exp(-t * 16);
      const click = Math.sin(2 * Math.PI * 1400 * t) * Math.exp(-t * 200) * 0.35;
      arr[i] = Math.tanh((tone * 0.5 + noise * 0.45 + click) * 1.15);
    }
  } else if (type === 1) {
    // 909 Tight Studio Punch Snare
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const pitchSweep = 250 * Math.exp(-t * 35) + 130;
      const body = Math.sin(2 * Math.PI * pitchSweep * t) * Math.exp(-t * 20);
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.68 + rawNoise * 0.32;
      const noise = noiseState * Math.exp(-t * 28);
      const transient = Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 220) * 0.4;
      arr[i] = Math.tanh((body * 0.55 + noise * 0.45 + transient) * 1.2);
    }
  } else if (type === 2) {
    // Trap Gated Snare
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const bodyTone = Math.sin(2 * Math.PI * (210 + 100 * Math.exp(-t * 50)) * t) * Math.exp(-t * 15);
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.65 + rawNoise * 0.35;
      const noise = noiseState * Math.exp(-t * 18);
      const gate = t > 0.14 ? Math.exp(-(t - 0.14) * 80) : 1.0;
      arr[i] = Math.tanh((bodyTone * 0.45 + noise * 0.55) * gate * 1.15);
    }
  } else {
    // Metallic Rimshot Ring Snare
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const ring1 = Math.sin(2 * Math.PI * 480 * t) * Math.exp(-t * 40);
      const ring2 = Math.sin(2 * Math.PI * 820 * t) * Math.exp(-t * 45) * 0.5;
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.72 + rawNoise * 0.28;
      const noise = noiseState * Math.exp(-t * 22) * 0.3;
      const rimClick = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 240) * 0.4;
      arr[i] = Math.tanh((ring1 + ring2 + noise + rimClick) * 1.1);
    }
  }
  return arr;
}

// 3. CLAPS
function genClap(type) {
  const dur = 0.35;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);

  const burstOffsets = type === 2 ? [0, 0.014] : (type === 1 ? [0, 0.011, 0.022] : [0, 0.009, 0.018, 0.027]);
  let noiseState = 0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const rawNoise = (Math.random() * 2 - 1);
    noiseState = noiseState * 0.65 + rawNoise * 0.35;
    let clapImpulses = 0;
    burstOffsets.forEach(offset => {
      if (t >= offset) {
        clapImpulses += noiseState * Math.exp(-(t - offset) * 130);
      }
    });
    const tail = noiseState * Math.exp(-t * 18) * 0.4;
    const ring = Math.sin(2 * Math.PI * 1100 * t) * Math.exp(-t * 22) * 0.2;
    arr[i] = Math.tanh((clapImpulses * 0.4 + tail * 0.5 + ring) * 1.15) * 0.85;
  }
  return arr;
}

// 4. HI-HATS
function genHat(type) {
  const dur = type === 1 ? 0.35 : 0.12;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);

  let noiseState = 0;
  if (type === 0) {
    // Closed TR-808 Metallic Hat
    const sqFreqs = [205, 305, 365, 587, 840, 1175];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let sqSum = 0;
      sqFreqs.forEach(f => {
        sqSum += Math.sin(2 * Math.PI * f * t) > 0 ? 0.5 : -0.5;
      });
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.65 + rawNoise * 0.35;
      const env = Math.exp(-t * 75);
      const tickTransient = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 180) * 0.3;
      arr[i] = ((sqSum / sqFreqs.length) * 0.6 + noiseState * 0.25 + tickTransient) * env * 0.8;
    }
  } else if (type === 1) {
    // Open TR-909 Cymbal Hat
    const sqFreqs = [240, 380, 520, 890, 1340, 2400];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let sqSum = 0;
      sqFreqs.forEach(f => {
        sqSum += Math.sin(2 * Math.PI * f * t) > 0 ? 0.5 : -0.5;
      });
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.60 + rawNoise * 0.40;
      const env = Math.exp(-t * 10);
      const sizzle = Math.sin(2 * Math.PI * 9500 * t) * 0.2;
      arr[i] = ((sqSum / sqFreqs.length) * 0.45 + noiseState * 0.3 + sizzle) * env * 0.75;
    }
  } else if (type === 2) {
    // Trap Sizzle Pedal Hat
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.62 + rawNoise * 0.38;
      const sizzleFreq = Math.sin(2 * Math.PI * 11000 * t) * 0.3;
      const env = Math.exp(-t * 110);
      const transient = Math.sin(2 * Math.PI * 3800 * t) * Math.exp(-t * 220) * 0.4;
      arr[i] = (noiseState * 0.4 + sizzleFreq + transient) * env * 0.75;
    }
  } else {
    // Crisp Cyber Sizzle Digital Hat
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const sq1 = Math.sin(2 * Math.PI * 3800 * t) > 0 ? 0.5 : -0.5;
      const sq2 = Math.sin(2 * Math.PI * 7200 * t) > 0 ? 0.5 : -0.5;
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.65 + rawNoise * 0.35;
      const env = Math.exp(-t * 60);
      arr[i] = Math.tanh(((sq1 + sq2) * 0.3 + noiseState * 0.35) * 1.1) * env * 0.8;
    }
  }
  return arr;
}

// 5. TOMS
function genTom(type) {
  const dur = 0.5;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const startFreqs = [220, 175, 130, 95];
  const endFreqs = [120, 90, 70, 50];
  const startF = startFreqs[type];
  const endF = endFreqs[type];
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const f = endF + (startF - endF) * Math.exp(-t * 16);
    const phase = 2 * Math.PI * f * t;
    const body = Math.sin(phase) * Math.exp(-t * 8);
    const click = Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-t * 200) * 0.25;
    arr[i] = Math.tanh((body + click) * 1.2);
  }
  return arr;
}

// 6. PERCUSSION
function genPerc(type) {
  const dur = 0.35;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  
  if (type === 0) {
    // Woodblock
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const tone = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 45);
      const partial = Math.sin(2 * Math.PI * 2240 * t) * Math.exp(-t * 80) * 0.4;
      const tap = Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 250) * 0.35;
      arr[i] = Math.tanh((tone + partial + tap) * 1.2);
    }
  } else if (type === 1) {
    // Clave
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const tone1 = Math.sin(2 * Math.PI * 2200 * t) * Math.exp(-t * 35);
      const tone2 = Math.sin(2 * Math.PI * 2900 * t) * Math.exp(-t * 40) * 0.6;
      arr[i] = Math.tanh((tone1 + tone2) * 1.15);
    }
  } else if (type === 2) {
    // FM Bell Perc
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const mod = Math.sin(2 * Math.PI * 940 * t) * 400 * Math.exp(-t * 25);
      const tone = Math.sin(2 * Math.PI * (450 + mod) * t) * Math.exp(-t * 14);
      arr[i] = Math.tanh(tone * 1.2);
    }
  } else {
    // Conga Hit
    let noiseState = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const pitchDrop = 320 * Math.exp(-t * 30) + 180;
      const body = Math.sin(2 * Math.PI * pitchDrop * t) * Math.exp(-t * 12);
      const rawNoise = (Math.random() * 2 - 1);
      noiseState = noiseState * 0.70 + rawNoise * 0.30;
      const slap = noiseState * Math.exp(-t * 120) * 0.25;
      arr[i] = Math.tanh((body + slap) * 1.2);
    }
  }
  return arr;
}

// 7. SUB 808 BASS
function gen808(type) {
  const dur = 1.4;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const baseF = [32.7, 38.8, 43.6, 49.0][type]; // C1, D#1, F1, G1
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const drop = 90 * Math.exp(-t * 22);
    const phase = 2 * Math.PI * (baseF + drop) * t;
    const env = Math.exp(-t * 2.2);
    const sub = Math.sin(phase) * env;
    const saturation = Math.tanh(sub * 1.6);
    arr[i] = saturation * 0.9;
  }
  return arr;
}

// 8. SYNTHS
function genSynth(type) {
  const dur = 1.1;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);

  if (type === 0) {
    // Staccato House / Techno Pluck (C min7)
    const freqs = [261.63, 311.13, 392.00, 466.16];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let sum = 0;
      freqs.forEach(f => {
        const saw = (2 * ((f * t) % 1)) - 1;
        const sq = Math.sin(2 * Math.PI * f * t) > 0 ? 0.6 : -0.6;
        sum += saw * 0.6 + sq * 0.4;
      });
      const filterEnv = Math.exp(-t * 22.0) * 500;
      const ampEnv = Math.exp(-t * 5.0);
      let sample = (sum / freqs.length) * ampEnv;
      sample = Math.tanh(sample * (1.2 + filterEnv * 0.008));
      arr[i] = sample * 0.85;
    }
  } else if (type === 1) {
    // Thick Analog Supersaw Brass / Stab (A min7)
    const freqs = [220.00, 261.63, 329.63, 392.00];
    const detunes = [-0.015, -0.007, 0, 0.007, 0.015];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let sum = 0;
      freqs.forEach(f => {
        detunes.forEach(d => {
          sum += (2 * (((f * (1 + d)) * t) % 1)) - 1;
        });
      });
      const filterCutoff = Math.exp(-t * 6.0) * 1200 + 400;
      const ampEnv = Math.exp(-t * 2.2);
      let sample = (sum / (freqs.length * detunes.length)) * ampEnv;
      sample = Math.tanh(sample * (1.8 + filterCutoff * 0.0005));
      arr[i] = sample * 0.85;
    }
  } else if (type === 2) {
    // Cyberpunk FM Laser Stab
    const baseFreq = 380;
    const modRatio = 2.5;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const pitchDrop = baseFreq * (1.0 + 0.9 * Math.exp(-t * 35.0));
      const modEnv = Math.exp(-t * 18.0) * 800;
      const modulator = Math.sin(2 * Math.PI * (pitchDrop * modRatio) * t) * modEnv;
      const carrier = Math.sin(2 * Math.PI * (pitchDrop + modulator) * t);
      const ampEnv = Math.exp(-t * 4.0);
      arr[i] = Math.tanh(carrier * ampEnv * 1.6) * 0.85;
    }
  } else {
    // Retro 8-Bit Chiptune Arp
    const chord = [261.63, 329.63, 392.00, 523.25];
    const arpSpeed = 20;
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const noteIdx = Math.floor(t * arpSpeed) % chord.length;
      const freq = chord[noteIdx];
      const pwm = 0.5 + Math.sin(2 * Math.PI * 2 * t) * 0.3;
      const sq = ((freq * t) % 1) < pwm ? 0.7 : -0.7;
      const ampEnv = Math.exp(-t * 3.0);
      arr[i] = sq * ampEnv * 0.75;
    }
  }

  return arr;
}

// 9. BASSES
function genBass(type) {
  const dur = 1.1;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const notes = [43.65, 49.0, 55.0, 65.41, 58.27]; // F1, G1, A1, C2, A#1
  const baseF = notes[type % notes.length];
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const saw = (2 * ((baseF * t) % 1) - 1);
    const sub = Math.sin(2 * Math.PI * (baseF / 2) * t);
    const env = Math.exp(-t * 2.2);
    arr[i] = Math.tanh((saw * 0.6 + sub * 0.6) * env * 1.5);
  }
  return arr;
}

// 10. KEYS / PIANOS
function genKey(type) {
  const dur = 1.3;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const freqs = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4
  const rootF = freqs[type % freqs.length];

  if (type === 0) {
    // Rhodes FM Tine E-Piano
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const tineEnv = Math.exp(-t * 28.0) * 300;
      const bodyEnv = Math.exp(-t * 2.5);
      const tineMod = Math.sin(2 * Math.PI * (rootF * 14.0) * t) * tineEnv;
      const body = Math.sin(2 * Math.PI * (rootF + tineMod) * t);
      const sub = Math.sin(2 * Math.PI * (rootF * 0.5) * t) * 0.2;
      arr[i] = Math.tanh((body + sub) * bodyEnv * 1.3) * 0.85;
    }
  } else if (type === 1) {
    // Acoustic Grand Piano Hit
    const harmonics = [1, 2, 3, 4, 5, 6];
    const amps = [1.0, 0.5, 0.3, 0.2, 0.1, 0.05];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let tone = 0;
      harmonics.forEach((h, idx) => {
        tone += Math.sin(2 * Math.PI * (rootF * h) * t) * amps[idx] * Math.exp(-t * (3.5 * h));
      });
      const hammerClick = i < 80 ? (1 - i / 80) * 0.3 : 0;
      arr[i] = Math.tanh((tone + hammerClick) * 1.2) * 0.85;
    }
  } else if (type === 2) {
    // Organ Drawbar Full
    const drawbars = [1, 2, 3, 4, 6, 8];
    const drawbarAmps = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2];
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      let organSum = 0;
      const rotaryTrem = 1.0 + Math.sin(2 * Math.PI * 6.5 * t) * 0.15;
      drawbars.forEach((d, idx) => {
        organSum += Math.sin(2 * Math.PI * (rootF * d) * t) * drawbarAmps[idx];
      });
      const env = Math.exp(-t * 1.8);
      arr[i] = Math.tanh((organSum / 3) * env * rotaryTrem) * 0.8;
    }
  } else if (type === 3) {
    // Clavinet Funk Key
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const pulse = Math.sin(2 * Math.PI * rootF * t) > 0.3 ? 0.7 : -0.7;
      const wahFilter = Math.exp(-t * 25.0) * 1200 + 300;
      const env = Math.exp(-t * 4.5);
      let sample = pulse * env;
      sample = Math.tanh(sample * (1.5 + wahFilter * 0.001));
      arr[i] = sample * 0.8;
    }
  } else {
    // Wurlitzer Reed Key
    for (let i = 0; i < len; i++) {
      const t = i / sampleRate;
      const reed = Math.sin(2 * Math.PI * rootF * t) + 0.3 * Math.sin(2 * Math.PI * rootF * 3 * t);
      const tremolo = 1.0 + Math.sin(2 * Math.PI * 5.0 * t) * 0.1;
      const env = Math.exp(-t * 2.5);
      arr[i] = Math.tanh(reed * env * tremolo * 1.6) * 0.85;
    }
  }
  return arr;
}

// 11. PADS
function genPad(type) {
  const dur = 1.8;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const notes = [130.81, 164.81, 196.00, 246.94];
  const f1 = notes[type % notes.length];
  const f2 = f1 * 1.5;
  const f3 = f1 * 1.25;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.2);
    const decay = Math.exp(-t * 1.2);
    const lfo = Math.sin(2 * Math.PI * 1.5 * t) * 0.15 + 0.85;
    const s1 = Math.sin(2 * Math.PI * f1 * t);
    const s2 = Math.sin(2 * Math.PI * f2 * t + 0.5);
    const s3 = Math.sin(2 * Math.PI * f3 * t + 1.0);
    arr[i] = (s1 + s2 * 0.7 + s3 * 0.5) * attack * decay * lfo * 0.35;
  }
  return arr;
}

// 12. BELLS
function genBell(type) {
  const dur = 1.3;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const bellNotes = [523.25, 659.25, 783.99, 880.00];
  const baseF = bellNotes[type % bellNotes.length];
  const partials = [1.0, 2.756, 5.404, 8.93];
  const amps = [1.0, 0.6, 0.4, 0.2];
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    let sum = 0;
    for (let p = 0; p < partials.length; p++) {
      const pf = baseF * partials[p];
      const pDecay = Math.exp(-t * (5.0 + p * 6.0));
      sum += Math.sin(2 * Math.PI * pf * t) * amps[p] * pDecay;
    }
    const strike = Math.sin(2 * Math.PI * 3500 * t) * Math.exp(-t * 220) * 0.15;
    arr[i] = (sum + strike) * 0.65;
  }
  return arr;
}

// 13. ACID 303s
function genAcid(type) {
  const dur = 1.4;
  const len = Math.floor(dur * sampleRate);
  const arr = new Float32Array(len);
  const notes = [65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83];
  const freq = notes[type % notes.length];
  const isSquare = type % 2 === 1;
  const res = 6.0;
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const osc = isSquare ? (Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1) * 0.7 : (2 * ((freq * t) % 1)) - 1;
    const ampEnv = Math.exp(-t * 2.8);
    const filterEnv = Math.exp(-t * 12.0) * 300 * res;
    let sample = osc * ampEnv;
    sample = Math.tanh(sample * (1.5 + filterEnv * 0.01));
    arr[i] = sample * 0.85;
  }
  return arr;
}

const outDir = path.join(process.cwd(), 'public', 'samples');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const samplesList = [
  { name: 'Kick_Punch_01.wav', gen: () => genKick(0) },
  { name: 'Kick_Deep808_02.wav', gen: () => genKick(1) },
  { name: 'Kick_Tight_03.wav', gen: () => genKick(2) },
  { name: 'Kick_Modular_04.wav', gen: () => genKick(3) },

  { name: 'Snare_Crisp_01.wav', gen: () => genSnare(0) },
  { name: 'Snare_909Type_02.wav', gen: () => genSnare(1) },
  { name: 'Snare_Trap_03.wav', gen: () => genSnare(2) },
  { name: 'Snare_Rimshot_04.wav', gen: () => genSnare(3) },

  { name: 'Clap_HandClap_01.wav', gen: () => genClap(0) },
  { name: 'Clap_Studio808_02.wav', gen: () => genClap(1) },
  { name: 'Clap_Snap_03.wav', gen: () => genClap(2) },
  { name: 'Clap_GroupStack_04.wav', gen: () => genClap(3) },

  { name: 'Hat_Closed_01.wav', gen: () => genHat(0) },
  { name: 'Hat_Open_02.wav', gen: () => genHat(1) },
  { name: 'Hat_Ticked_03.wav', gen: () => genHat(2) },
  { name: 'Hat_Metallic_04.wav', gen: () => genHat(3) },

  { name: 'Tom_High_01.wav', gen: () => genTom(0) },
  { name: 'Tom_Mid_02.wav', gen: () => genTom(1) },
  { name: 'Tom_Low_03.wav', gen: () => genTom(2) },
  { name: 'Tom_Floor_04.wav', gen: () => genTom(3) },

  { name: 'Perc_WoodBlock_01.wav', gen: () => genPerc(0) },
  { name: 'Perc_Clave_02.wav', gen: () => genPerc(1) },
  { name: 'Perc_FM_Bell_03.wav', gen: () => genPerc(2) },
  { name: 'Perc_Conga_04.wav', gen: () => genPerc(3) },

  { name: 'Sub808_SubC1_01.wav', gen: () => gen808(0) },
  { name: 'Sub808_Saturated_02.wav', gen: () => gen808(1) },
  { name: 'Sub808_Glide_03.wav', gen: () => gen808(2) },
  { name: 'Sub808_Heavy_04.wav', gen: () => gen808(3) },

  { name: 'Synth_ChordCmin_01.wav', gen: () => genSynth(0) },
  { name: 'Synth_Pluck_02.wav', gen: () => genSynth(1) },
  { name: 'Synth_Laser_03.wav', gen: () => genSynth(2) },
  { name: 'Synth_Pad_04.wav', gen: () => genSynth(3) },

  { name: 'Bass_SlapFunk_01.wav', gen: () => genBass(0) },
  { name: 'Bass_AcidSaw_02.wav', gen: () => genBass(1) },
  { name: 'Bass_DarkReese_03.wav', gen: () => genBass(2) },
  { name: 'Bass_SubMono_04.wav', gen: () => genBass(3) },
  { name: 'Bass_Resonant_05.wav', gen: () => genBass(4) },

  { name: 'Key_Rhodes_01.wav', gen: () => genKey(0) },
  { name: 'Key_GrandPiano_02.wav', gen: () => genKey(1) },
  { name: 'Key_OrganDrawbar_03.wav', gen: () => genKey(2) },
  { name: 'Key_Clavinet_04.wav', gen: () => genKey(3) },
  { name: 'Key_Wurlitzer_05.wav', gen: () => genKey(4) },

  { name: 'Pad_WarmAtmos_01.wav', gen: () => genPad(0) },
  { name: 'Pad_DreamyAmbient_02.wav', gen: () => genPad(1) },
  { name: 'Pad_VintageAnalog_03.wav', gen: () => genPad(2) },
  { name: 'Pad_EtherealCosmic_04.wav', gen: () => genPad(3) },

  { name: 'Bell_CelestialChime_01.wav', gen: () => genBell(0) },
  { name: 'Bell_FMCrystal_02.wav', gen: () => genBell(1) },
  { name: 'Bell_Glocken_03.wav', gen: () => genBell(2) },

  { name: 'Acid_Squelch303_01.wav', gen: () => genAcid(0) },
  { name: 'Acid_ResonantSquare_02.wav', gen: () => genAcid(1) },
  { name: 'Acid_DistortedDevil_03.wav', gen: () => genAcid(2) },
];

const manifest = [];

for (const item of samplesList) {
  const pcm = item.gen();
  const wavBuf = createWavBuffer(pcm, sampleRate);
  const filePath = path.join(outDir, item.name);
  fs.writeFileSync(filePath, wavBuf);
  console.log(`Generated ${item.name} (${wavBuf.length} bytes)`);
  manifest.push({ name: item.name, file: `/samples/${item.name}` });
}

fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Sample folder generation complete with manifest.json!');
