import React, { useEffect, useRef, useState } from 'react';

interface CraftModalProps {
  mode: 'dye' | 'brace';
  onClose: (reward?: { item: 'dye' | 'bracelet'; amount: number; vibes: number }) => void;
}

type DyeStyleKey = 'spiral' | 'bull' | 'stripe' | 'scrunch';

interface DyeSpot {
  c: string;
  t: number;
  x: number;
  y: number;
}

interface CraftRuntime {
  t: 'dye' | 'brace';
  sty?: DyeStyleKey;
  step: number;
  p: number;
  a: number;
  pick: number;
  cols: Array<DyeSpot | null>;
  bands: number[];
  bt: number[];
  cut: number[];
  ct: number[];
  bc: number[];
  bct: number[];
  sub: number;
  tm: number;
  at: number;
  dip: number;
  dn: number;
  mist: number;
  row: number;
  ord: number[];
  ki: number;
  knots: Array<{ c: number; r: number; col: string }>;
  held: number;
  shake: number;
  anim: { t: number; tgt: number } | null;
  la: number | null;
  la2: { x: number; y: number } | null;
  px?: number[];
  pat?: HTMLCanvasElement;
}

const PI = Math.PI;
const DYE = ['#e63946', '#f4a261', '#ffd166', '#2ec4b6', '#4361ee', '#9d4edd'];
const CC = ['#d62839', '#f5c518', '#1f9d55', '#8a4fff'];
const CX = [80, 140, 200, 260];

const STY: Record<DyeStyleKey, { n: number; name: string; e: string }> = {
  spiral: { n: 6, name: 'Spiral', e: '🌀' },
  bull: { n: 4, name: 'Bullseye', e: '🎯' },
  stripe: { n: 5, name: 'Stripes', e: '🦓' },
  scrunch: { n: 6, name: 'Scrunch', e: '🍥' },
};

const MSG0: Record<DyeStyleKey, string> = {
  spiral: 'Pinch the center of the shirt and drag in circles to twist it into a flat spiral.',
  bull: 'Pinch the center and pull it up into a cone. Keep dragging to gather the shirt.',
  stripe: 'Fold the shirt back and forth like an accordion. Keep dragging side to side.',
  scrunch: 'Crumple the shirt into a tight ball. Scribble all over it!',
};

const MSG = {
  dye: [
    'Pinch the center of the shirt and drag in circles to twist it into a flat spiral.',
    'Tap three times to snap rubber bands across the disc.',
    'Press and hold to dip the bundle in the soda ash bath. It helps the dye stick.',
    'Pick a color, then tap a section to squeeze dye on it. Fill every section.',
    'Wrapped in plastic to stay damp while the dye sets (6 to 8 hours, sped up here).',
    'Tap to snip each rubber band, then press and hold to rinse until the water runs clear.',
    'Wash and dry, then unfold the shirt!',
  ],
  brace: [
    'Tap each hemp cord to cut it to length.',
    'Tap to fold the cords in half and tie the loop knot, taped to the table.',
    'Tap the glowing cord next to the leader to tie a forward knot over it (two loops per cord).',
    'Tap to tie off the ends with a knot and a bead.',
    'Your bracelet is done!',
  ],
};

function createRuntime(mode: 'dye' | 'brace'): CraftRuntime {
  return {
    t: mode,
    step: 0,
    p: 0,
    a: 0,
    pick: 0,
    cols: Array(6).fill(null),
    bands: [0, 0, 0],
    bt: [0, 0, 0],
    cut: [0, 0, 0],
    ct: [0, 0, 0],
    bc: [0, 0, 0, 0],
    bct: [0, 0, 0, 0],
    sub: 0,
    tm: 0,
    at: 0,
    dip: 0,
    dn: 0,
    mist: 0,
    row: 0,
    ord: [0, 1, 2, 3],
    ki: 0,
    knots: [],
    held: 0,
    shake: 0,
    anim: null,
    la: null,
    la2: null,
  };
}

function getStars(C: CraftRuntime): number {
  if (C.t === 'dye') {
    return Math.min(3, new Set(C.cols.filter((k): k is DyeSpot => Boolean(k)).map((k) => k.c)).size) || 1;
  }
  return 3 - Math.min(2, Math.floor(C.mist / 3));
}

function creg(C: CraftRuntime, x: number, y: number): number {
  const dx = x - 180;
  const dy = y - 185;
  const r = Math.hypot(dx, dy);
  if (C.sty === 'bull') return r < 105 ? Math.min(3, Math.floor((105 - r) / 26.25)) : -1;
  if (C.sty === 'stripe') return x >= 85 && x < 275 && y >= 100 && y <= 270 ? Math.floor((x - 85) / 38) : -1;
  if (r >= 105) return -1;
  const a = Math.atan2(dy, dx);
  return (
    Math.floor(
      (((a - (C.sty === 'scrunch' ? Math.sin(r * 0.12) * 0.14 : r * 0.045)) % (2 * PI)) + 2 * PI) %
        (2 * PI) /
        (PI / 3)
    ) % 6
  );
}

function cfold(g: CanvasRenderingContext2D, C: CraftRuntime, cx: number, cy: number, R: number): void {
  g.strokeStyle = 'rgba(0,0,0,.2)';
  g.lineWidth = 2;
  const st = C.sty;
  if (st === 'bull') {
    for (let k = 1; k < 4; k++) {
      g.beginPath();
      g.arc(cx, cy, (R * k) / 4, 0, 2 * PI);
      g.stroke();
    }
    return;
  }
  if (st === 'stripe') {
    for (let k = 1; k < 5; k++) {
      g.beginPath();
      g.moveTo(85 + k * 38, 100);
      g.lineTo(85 + k * 38, 270);
      g.stroke();
    }
    return;
  }
  for (let w = 0; w < 6; w++) {
    g.beginPath();
    for (let r = 0; r <= R; r += 4) {
      const a = (w * PI) / 3 + (st === 'scrunch' ? Math.sin(r * 0.12) * 0.14 : r * 0.045);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.stroke();
  }
}

function cfold0(g: CanvasRenderingContext2D, C: CraftRuntime): void {
  const p = C.p;
  g.save();
  g.translate(180, 185);
  if (C.sty === 'scrunch') g.rotate(Math.sin(C.at * 14) * 0.1 * (1 - p));
  const k = 1 - p * 0.4;
  g.scale(k, k);
  g.globalAlpha = 1 - p * 0.85;
  g.fillStyle = '#fff';
  g.beginPath();
  g.moveTo(-50, -90);
  g.lineTo(-120, -50);
  g.lineTo(-95, -15);
  g.lineTo(-60, -35);
  g.lineTo(-60, 95);
  g.lineTo(60, 95);
  g.lineTo(60, -35);
  g.lineTo(95, -15);
  g.lineTo(120, -50);
  g.lineTo(50, -90);
  g.quadraticCurveTo(0, -65, -50, -90);
  g.fill();
  g.restore();

  g.save();
  g.globalAlpha = p;
  g.fillStyle = '#f7f3ff';
  g.beginPath();
  if (C.sty === 'stripe') g.rect(85, 100, 190, 170);
  else g.arc(180, 185, 105, 0, 2 * PI);
  g.fill();
  cfold(g, C, 180, 185, 105);
  g.restore();
}

function cmkpat(C: CraftRuntime): void {
  const cv = document.createElement('canvas');
  cv.width = 160;
  cv.height = 160;
  const g = cv.getContext('2d');
  if (!g) return;
  const im = g.createImageData(160, 160);
  const st = C.sty;
  const cs = C.cols.map((k) => {
    const hex = k ? k.c : DYE[0];
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  });
  const SD = [
    [30, 35],
    [110, 25],
    [75, 75],
    [30, 115],
    [125, 95],
    [85, 140],
  ];

  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const dx = x - 80;
      const dy = y - 80;
      const r = Math.hypot(dx, dy);
      let w = 0;
      let e = 0;
      if (st === 'bull') {
        const q = r + Math.sin(Math.atan2(dy, dx) * 6) * 2;
        const m = q % 22;
        w = 3 - Math.min(3, Math.floor(q / 22));
        e = q > 77 ? 99 : Math.min(m, 22 - m);
      } else if (st === 'stripe') {
        const u = x + Math.sin(y * 0.1) * 3;
        const m = ((u % 32) + 32) % 32;
        w = Math.min(4, Math.max(0, Math.floor(u / 32)));
        e = u < 0 || u > 160 ? 99 : Math.min(m, 32 - m);
      } else if (st === 'scrunch') {
        const X = x + Math.sin(y * 0.15) * 3;
        const Y = y + Math.sin(x * 0.12) * 3;
        let b = 1e9;
        let b2 = 1e9;
        let bi = 0;
        SD.forEach((p, i) => {
          const d = Math.hypot(X - p[0], Y - p[1]);
          if (d < b) {
            b2 = b;
            b = d;
            bi = i;
          } else if (d < b2) {
            b2 = d;
          }
        });
        w = bi;
        e = (b2 - b) / 2;
      } else {
        const u = (((Math.atan2(dy, dx) - r * 0.045 + Math.sin(r * 0.25) * 0.04) % (2 * PI)) + 2 * PI) % (2 * PI);
        const f = u % (PI / 3);
        w = Math.floor(u / (PI / 3));
        e = Math.min(f, PI / 3 - f) * r;
      }
      const m2 = e < 1.8 ? 0.6 * (1 - e / 1.8) : 0;
      const c = cs[w % cs.length];
      const i = (y * 160 + x) * 4;
      im.data[i] = c[0] + (255 - c[0]) * m2;
      im.data[i + 1] = c[1] + (255 - c[1]) * m2;
      im.data[i + 2] = c[2] + (255 - c[2]) * m2;
      im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  C.pat = cv;
}

function cbar(g: CanvasRenderingContext2D, p: number): void {
  g.fillStyle = 'rgba(255,255,255,.15)';
  g.fillRect(40, 12, 280, 8);
  g.fillStyle = '#06d6a0';
  g.fillRect(40, 12, 280 * Math.min(1, p), 8);
}

function cwedge(g: CanvasRenderingContext2D, C: CraftRuntime, cx: number, cy: number, R: number, w: number): void {
  const st = C.sty;
  if (st === 'bull') {
    g.beginPath();
    g.arc(cx, cy, R - (w * R) / 4, 0, 2 * PI);
    if (w < 3) {
      const r2 = R - ((w + 1) * R) / 4;
      g.moveTo(cx + r2, cy);
      g.arc(cx, cy, r2, 0, 2 * PI, true);
    }
    return;
  }
  if (st === 'stripe') {
    g.beginPath();
    g.rect(85 + w * 38, 100, 38, 170);
    return;
  }
  const f = (k: number, r: number) => (k * PI) / 3 + (st === 'scrunch' ? Math.sin(r * 0.12) * 0.14 : r * 0.045);
  g.beginPath();
  g.moveTo(cx, cy);
  for (let r = 0; r <= R; r += 4) g.lineTo(cx + Math.cos(f(w, r)) * r, cy + Math.sin(f(w, r)) * r);
  for (let r = R; r >= 0; r -= 4) g.lineTo(cx + Math.cos(f(w + 1, r)) * r, cy + Math.sin(f(w + 1, r)) * r);
  g.closePath();
}

function cfinal(g: CanvasRenderingContext2D, C: CraftRuntime): void {
  const cx = 180;
  const cy = 190;
  if (!C.dn) {
    g.strokeStyle = '#cfd8ff';
    g.lineWidth = 12;
    g.beginPath();
    g.arc(cx, cy, 105, 0, 2 * PI);
    g.stroke();
    C.cols.forEach((k, i) => {
      if (!k) return;
      const a = C.at * 5 + (i * PI) / 3;
      g.fillStyle = k.c;
      g.beginPath();
      g.arc(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58, 24, 0, 2 * PI);
      g.fill();
    });
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      g.arc(cx + Math.sin(C.at * 3 + i * 2) * 80, cy + 80 - ((C.at * 50 + i * 23) % 140), 4, 0, 2 * PI);
      g.fill();
    }
    g.fillStyle = '#fff';
    g.font = '16px sans-serif';
    g.fillText('Washing out the extra dye...', 95, 345);
    return;
  }

  const sc = Math.min(1, (C.tm - 2.6) * 3 + 0.5);
  g.strokeStyle = '#c9b38a';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(0, 30);
  g.lineTo(360, 30);
  g.stroke();

  g.save();
  g.translate(cx, cy + 10);
  g.scale(sc * 1.15, sc * 1.15);
  g.beginPath();
  g.moveTo(-50, -90);
  g.lineTo(-120, -50);
  g.lineTo(-95, -15);
  g.lineTo(-60, -35);
  g.lineTo(-60, 95);
  g.lineTo(60, 95);
  g.lineTo(60, -35);
  g.lineTo(95, -15);
  g.lineTo(120, -50);
  g.lineTo(50, -90);
  g.quadraticCurveTo(0, -65, -50, -90);
  g.closePath();
  g.save();
  g.clip();
  if (C.pat) g.drawImage(C.pat, -130, -120, 260, 260);
  g.restore();
  g.strokeStyle = '#fff8';
  g.lineWidth = 2;
  g.stroke();
  g.restore();

  g.fillStyle = '#ffd166';
  [100, 260].forEach((x) => g.fillRect(x, 22, 10, 22));
  for (let i = 0; i < 8; i++) {
    const a = 0.5 + 0.5 * Math.sin(C.at * 4 + i * 1.7);
    g.globalAlpha = a;
    g.fillStyle = '#fff';
    g.font = '22px serif';
    g.fillText('✨', 30 + ((i * 83) % 300), 80 + ((i * 61) % 240));
    g.globalAlpha = 1;
  }
}

function ccord(
  g: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  c: string
): void {
  g.lineCap = 'round';
  g.strokeStyle = c;
  g.lineWidth = 7;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.3)';
  g.setLineDash([3, 5]);
  g.stroke();
  g.setLineDash([]);
}

function cknot(g: CanvasRenderingContext2D, x: number, y: number, c: string): void {
  g.save();
  g.translate(x, y);
  g.rotate(0.45);
  g.fillStyle = c;
  g.fillRect(-22, -8, 44, 16);
  g.strokeStyle = 'rgba(255,255,255,.35)';
  g.lineWidth = 2;
  g.setLineDash([3, 4]);
  g.beginPath();
  g.moveTo(-16, -1);
  g.lineTo(16, -1);
  g.stroke();
  g.setLineDash([]);
  g.restore();
}

export const CraftModal: React.FC<CraftModalProps> = ({ mode, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<CraftRuntime>(createRuntime(mode));
  const [, setUiTick] = useState(0);

  const syncUi = () => setUiTick((t) => t + 1);

  useEffect(() => {
    const C = runtimeRef.current;
    let rafId = 0;
    let lastTime = 0;
    const timeouts: number[] = [];

    const advanceStep = () => {
      C.step++;
      C.p = 0;
      C.tm = 0;
      C.sub = 0;
      syncUi();
    };

    const drawDye = (g: CanvasRenderingContext2D, dt: number) => {
      const cx = 180;
      const R = 105;
      const s = C.step;
      let cy = 185;
      C.at += dt;
      g.clearRect(0, 0, 360, 360);
      g.fillStyle = '#241540';
      g.fillRect(0, 0, 360, 360);
      if (!C.sty) {
        g.font = '54px serif';
        ['🌀', '🎯', '🦓', '🍥'].forEach((e, i) =>
          g.fillText(e, 40 + i * 74, 190 + Math.sin(C.at * 3 + i) * 10)
        );
        return;
      }
      if (s === 0) {
        cbar(g, C.p);
        if (C.sty !== 'spiral') {
          cfold0(g, C);
          return;
        }
        g.save();
        g.translate(cx, cy);
        g.rotate(C.a);
        g.globalAlpha = 1 - C.p * 0.9;
        g.fillStyle = '#fff';
        g.beginPath();
        g.moveTo(-50, -90);
        g.lineTo(-120, -50);
        g.lineTo(-95, -15);
        g.lineTo(-60, -35);
        g.lineTo(-60, 95);
        g.lineTo(60, 95);
        g.lineTo(60, -35);
        g.lineTo(95, -15);
        g.lineTo(120, -50);
        g.lineTo(50, -90);
        g.quadraticCurveTo(0, -65, -50, -90);
        g.fill();
        g.globalAlpha = 1;
        g.strokeStyle = '#bdb4d6';
        g.lineWidth = 4;
        g.beginPath();
        for (let t = 0; t < C.p * 6 * PI; t += 0.1) {
          const r = (t * R) / (6 * PI);
          g.lineTo(Math.cos(t) * r, Math.sin(t) * r);
        }
        g.stroke();
        g.restore();
        return;
      }

      if (s === 2) {
        C.tm += dt;
        C.dip += ((C.held ? 1 : 0) - C.dip) * Math.min(1, dt * 5);
        if (C.held) C.p += dt / 1.6;
        cbar(g, C.p);
        if (C.p >= 1) advanceStep();
        cy += C.dip * 60;
      }
      if (s === 4) {
        C.tm += dt;
        if (C.tm > 3.2) advanceStep();
      }
      if (s === 5 && C.sub === 1) {
        if (C.held) C.p += dt / 2;
        cbar(g, C.p);
        if (C.p >= 1) advanceStep();
      }
      if (s === 6) {
        C.tm += dt;
        if (C.tm > 2.6 && !C.dn) {
          C.dn = 1;
          cmkpat(C);
          syncUi();
        }
        cfinal(g, C);
        return;
      }

      g.fillStyle = s >= 2 ? '#dcd6f5' : '#f7f3ff';
      g.beginPath();
      if (C.sty === 'stripe') g.rect(85, 100, 190, 170);
      else g.arc(cx, cy, R, 0, 2 * PI);
      g.fill();

      C.cols.forEach((k, w) => {
        if (!k) return;
        k.t = Math.min(1, k.t + dt * 1.2);
        g.save();
        cwedge(g, C, cx, cy, R, w);
        g.clip();
        const rr = (1 - (1 - k.t) ** 3) * R * 1.7;
        const gr = g.createRadialGradient(k.x, k.y, 0, k.x, k.y, rr);
        gr.addColorStop(0, k.c);
        gr.addColorStop(0.7, k.c);
        gr.addColorStop(1, k.c + '00');
        g.fillStyle = gr;
        g.fillRect(0, 0, 360, 360);
        g.restore();
      });

      cfold(g, C, cx, cy, R);

      for (let i = 0; i < 3; i++) {
        if (!C.bands[i]) continue;
        C.bt[i] = Math.min(1, C.bt[i] + dt * 4);
        let off = 0;
        let al = 1;
        if (s === 5 && C.cut[i]) {
          C.ct[i] += dt;
          if (C.ct[i] > 0.5) continue;
          al = 1 - C.ct[i] * 2;
          off = C.ct[i] * 60;
        }
        const bs = C.sty;
        const a = bs === 'stripe' ? PI / 2 : bs === 'bull' ? 0 : (i * PI) / 3;
        const bx = bs === 'stripe' ? (i - 1) * 60 : 0;
        const by = bs === 'bull' ? (i - 1) * 38 : 0;
        const L = bs === 'bull' ? Math.sqrt(R * R - by * by) * 1.02 : R * 1.03;
        const ex = Math.cos(a) * L;
        const ey = Math.sin(a) * L;
        g.globalAlpha = al;
        g.strokeStyle = '#ff6fb0';
        g.lineWidth = 5 * (1 + 0.7 * Math.sin(C.bt[i] * PI));
        g.beginPath();
        g.moveTo(cx + bx - ex - off * Math.sin(a), cy + by - ey + off * Math.cos(a));
        g.lineTo(cx + bx + ex + off * Math.sin(a), cy + by + ey - off * Math.cos(a));
        g.stroke();
        g.globalAlpha = 1;
      }

      if (s === 2) {
        g.fillStyle = 'rgba(90,160,255,.55)';
        g.beginPath();
        g.moveTo(0, 255);
        for (let x = 0; x <= 360; x += 20) g.lineTo(x, 255 + Math.sin(x / 30 + C.at * 3) * 4);
        g.lineTo(360, 345);
        g.lineTo(0, 345);
        g.fill();
        if (C.held) {
          g.fillStyle = 'rgba(255,255,255,.6)';
          for (let i = 0; i < 7; i++) {
            g.beginPath();
            g.arc(120 + i * 20, 340 - ((C.tm * 70 + i * 40) % 90), 3 + (i % 3), 0, 2 * PI);
            g.fill();
          }
        }
      }

      if (s === 4) {
        g.save();
        g.beginPath();
        g.arc(cx, cy, R + 8, 0, 2 * PI);
        g.fillStyle = 'rgba(255,255,255,.2)';
        g.fill();
        g.clip();
        const o = ((C.tm * 90) % 300) - 60;
        const sh = g.createLinearGradient(cx - R + o - 50, 0, cx - R + o + 50, 0);
        sh.addColorStop(0, 'rgba(255,255,255,0)');
        sh.addColorStop(0.5, 'rgba(255,255,255,.55)');
        sh.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sh;
        g.fillRect(0, 0, 360, 360);
        g.restore();

        g.strokeStyle = '#fff';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(310, 55, 26, 0, 2 * PI);
        g.stroke();
        g.beginPath();
        g.moveTo(310, 55);
        g.lineTo(310 + Math.cos(C.tm * 9) * 20, 55 + Math.sin(C.tm * 9) * 20);
        g.stroke();
        g.fillStyle = '#fff';
        g.font = '12px sans-serif';
        g.fillText('6-8 hrs', 290, 98);
      }

      if (s === 5 && C.sub === 1) {
        if (C.held) {
          g.strokeStyle = 'rgba(130,195,255,.75)';
          g.lineWidth = 3;
          for (let i = 0; i < 16; i++) {
            const x = 60 + i * 16;
            const y = (C.at * 320 + i * 37) % 360;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x, y + 26);
            g.stroke();
          }
        }
        C.cols.forEach((k, w) => {
          if (!k) return;
          g.globalAlpha = Math.max(0, 1 - C.p);
          g.fillStyle = k.c;
          g.beginPath();
          g.arc(cx + (w - 2.5) * 30, cy + R + ((C.at * 90 + w * 30) % 110), 5, 0, 2 * PI);
          g.fill();
          g.globalAlpha = 1;
        });
      }
    };

    const drawBrace = (g: CanvasRenderingContext2D, dt: number) => {
      const s = C.step;
      C.at += dt;
      g.fillStyle = '#2a1a3d';
      g.fillRect(0, 0, 360, 360);
      g.fillStyle = 'rgba(255,255,255,.04)';
      for (let i = 0; i < 360; i += 12) g.fillRect(0, i, 360, 3);
      if (C.shake > 0) C.shake -= dt;

      g.save();
      g.translate(C.shake > 0 ? Math.sin(C.shake * 70) * 5 : 0, 0);

      if (s === 0) {
        for (let i = 0; i < 4; i++) {
          const cut = C.bc[i];
          if (cut) C.bct[i] += dt;
          const y2 = cut ? 300 : 350;
          ccord(g, CX[i], 20, CX[i], y2, CC[i]);
          if (cut) {
            g.font = '26px serif';
            g.fillText('✂️', CX[i] - 14, y2 + Math.sin(C.bct[i] * 25) * 4 + 12);
          }
        }
      } else {
        C.px = C.px || CX.slice();
        const px = C.px;
        C.ord.forEach((id, k) => {
          px[id] += (CX[k] - px[id]) * Math.min(1, dt * 9);
        });
        const top = C.sub || s > 1;
        if (s === 1 && C.sub) C.tm += dt;
        for (let i = 0; i < 4; i++) {
          const x = px[i];
          ccord(g, x, top ? 64 : 20, x, 320, CC[i]);
          if (top) {
            g.strokeStyle = CC[i];
            g.lineWidth = 7;
            g.beginPath();
            g.moveTo(180, 40);
            g.lineTo(x, 64);
            g.stroke();
          }
        }
        if (top) {
          const k = s === 1 ? Math.min(1, C.tm * 3) : 1;
          g.strokeStyle = '#d9c7a0';
          g.lineWidth = 7;
          g.beginPath();
          g.arc(180, 28, 16 * k, 0, 2 * PI);
          g.stroke();
          g.fillStyle = 'rgba(255,214,102,.75)';
          g.fillRect(140, 34, 80, 18 * k);
        }
        C.knots.forEach((k) => cknot(g, CX[k.c], 72 + k.r * 20 + k.c * 6, k.col));

        if (s === 2) {
          const y = 72 + C.row * 20 + (C.ki + 1) * 6;
          const lid = C.ord[C.ki];
          g.fillStyle = '#fff';
          g.font = '22px serif';
          g.fillText('★', px[lid] - 9, 56);
          if (!C.anim) {
            g.strokeStyle = '#fff';
            g.globalAlpha = 0.5 + 0.5 * Math.sin(C.at * 8);
            g.lineWidth = 3;
            g.beginPath();
            g.arc(CX[C.ki + 1], y, 22, 0, 2 * PI);
            g.stroke();
            g.globalAlpha = 1;
          }
          if (C.anim) {
            const a = C.anim;
            a.t += dt;
            const kx = px[lid];
            const tx = CX[a.tgt];
            const yy = 72 + C.row * 20 + a.tgt * 6;
            g.strokeStyle = CC[lid];
            g.lineWidth = 7;
            g.beginPath();
            g.moveTo(kx, yy - 26);
            g.bezierCurveTo(kx + 20, yy - 50, tx + 20, yy - 44, tx, yy - 8);
            g.stroke();
            for (let l = 0; l < 2; l++) {
              const ph = Math.max(0, Math.min(1, (a.t - l * 0.3) * 3));
              if (ph > 0) {
                g.beginPath();
                g.arc(tx, yy, 16 - ph * 6, 0, ph * 2 * PI);
                g.stroke();
              }
            }
            if (a.t > 0.75) {
              C.knots.push({ c: a.tgt, r: C.row, col: CC[lid] });
              const k = C.ki;
              [C.ord[k], C.ord[k + 1]] = [C.ord[k + 1], C.ord[k]];
              C.ki++;
              C.anim = null;
              if (C.ki === 3) {
                C.ki = 0;
                C.row++;
                if (C.row >= 6) {
                  C.step = 3;
                  C.tm = 0;
                  C.sub = 0;
                  syncUi();
                }
              }
            }
          }
        }
        if ((s >= 3 && C.sub) || s >= 4) {
          C.tm += dt;
          g.fillStyle = '#e9d8a6';
          g.beginPath();
          g.arc(180, 326, Math.min(14, C.tm * 40), 0, 2 * PI);
          g.fill();
        }
        if (s >= 4) {
          for (let i = 0; i < 8; i++) {
            g.globalAlpha = 0.5 + 0.5 * Math.sin(C.at * 4 + i * 1.7);
            g.font = '22px serif';
            g.fillText('✨', 20 + ((i * 89) % 300), 90 + ((i * 57) % 220));
            g.globalAlpha = 1;
          }
        }
      }

      g.restore();
    };

    const tick = (t: number) => {
      rafId = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const g = canvas.getContext('2d');
      if (!g) return;
      const dt = Math.min(0.05, (t - lastTime) / 1000 || 0.016);
      lastTime = t;
      if (C.t === 'dye') drawDye(g, dt);
      else drawBrace(g, dt);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const scheduleAdvance = (delayMs: number, expectedStep: number) => {
    window.setTimeout(() => {
      const C = runtimeRef.current;
      if (C.step === expectedStep) {
        C.step++;
        C.p = 0;
        C.tm = 0;
        C.sub = 0;
        syncUi();
      }
    }, delayMs);
  };

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>, down: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) * 360) / r.width;
    const y = ((e.clientY - r.top) * 360) / r.height;
    const C = runtimeRef.current;
    const s = C.step;

    if (C.t === 'dye') {
      if (!C.sty) return;
      if (s === 0 && C.sty !== 'spiral') {
        if (C.held && C.la2) C.a += Math.hypot(x - C.la2.x, y - C.la2.y) / 60;
        C.la2 = { x, y };
        C.p = Math.min(1, C.a / (5 * PI));
        if (C.p >= 1) {
          C.step++;
          C.p = 0;
          C.tm = 0;
          C.sub = 0;
          syncUi();
        }
      } else if (s === 0) {
        const a = Math.atan2(y - 185, x - 180);
        if (C.held && C.la !== null) {
          let d = a - C.la;
          if (d > PI) d -= 2 * PI;
          if (d < -PI) d += 2 * PI;
          if (d > 0) C.a += d;
        }
        C.la = a;
        C.p = Math.min(1, C.a / (5 * PI));
        if (C.p >= 1) {
          C.step++;
          C.p = 0;
          C.tm = 0;
          C.sub = 0;
          syncUi();
        }
      } else if (down && s === 1) {
        const n = C.bands.indexOf(0);
        if (n >= 0) {
          C.bands[n] = 1;
          C.bt[n] = 0;
          if (n === 2) scheduleAdvance(800, 1);
        }
      } else if (down && s === 3) {
        const dx = x - 180;
        const dy = y - 185;
        if (Math.hypot(dx, dy) < 135) {
          const w = creg(C, x, y);
          if (w < 0) return;
          C.cols[w] = { c: DYE[C.pick], t: 0, x, y };
          if (C.cols.every(Boolean)) scheduleAdvance(1800, 3);
        }
      } else if (down && s === 5 && C.sub === 0) {
        const n = C.cut.indexOf(0);
        if (n >= 0) {
          C.cut[n] = 1;
          C.ct[n] = 0;
          if (n === 2) C.sub = 1;
        }
      }
      return;
    }

    if (!down) return;
    if (s === 0) {
      const n = C.bc.indexOf(0);
      if (n >= 0) {
        C.bc[n] = 1;
        C.bct[n] = 0;
        if (n === 3) scheduleAdvance(900, 0);
      }
    } else if (s === 1) {
      if (!C.sub) {
        C.sub = 1;
        C.tm = 0;
        scheduleAdvance(1300, 1);
      }
    } else if (s === 2) {
      if (C.anim) return;
      const t = C.ki + 1;
      if (Math.abs(x - CX[t]) < 38) C.anim = { t: 0, tgt: t };
      else {
        C.mist++;
        C.shake = 0.4;
      }
    } else if (s === 3 && !C.sub) {
      C.sub = 1;
      C.tm = 0;
      scheduleAdvance(1200, 3);
    }
  };

  const C = runtimeRef.current;
  const fin = C.t === 'dye' ? Boolean(C.dn) : C.step >= 4;
  const stars = getStars(C);
  const title = C.t === 'dye' ? '🌈 Tie-dye workshop' : '📿 Hemp bracelet bench';
  let prompt = '';
  if (C.t === 'dye' && !C.sty) {
    prompt = 'Choose a tie-dye style:';
  } else if (fin) {
    prompt = `Done! ${'⭐'.repeat(stars)} quality.`;
  } else if (C.t === 'dye' && C.step === 0 && C.sty) {
    prompt = MSG0[C.sty];
  } else {
    prompt = MSG[C.t][Math.min(C.step, MSG[C.t].length - 1)];
  }

  return (
    <div id="ov" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cbox">
        <h2 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 'bold' }}>{title}</h2>
        <div className="muted" style={{ minHeight: '44px', marginBottom: '6px' }}>
          {prompt}
        </div>
        <canvas
          ref={canvasRef}
          width={360}
          height={360}
          onPointerDown={(e) => {
            runtimeRef.current.held = 1;
            handlePointer(e, true);
          }}
          onPointerMove={(e) => handlePointer(e, false)}
          onPointerUp={() => {
            runtimeRef.current.held = 0;
            runtimeRef.current.la = null;
            runtimeRef.current.la2 = null;
          }}
          onPointerLeave={() => {
            runtimeRef.current.held = 0;
            runtimeRef.current.la = null;
            runtimeRef.current.la2 = null;
          }}
        />
        <div style={{ marginTop: '8px' }}>
          {C.t === 'dye' && !C.sty && (
            <div>
              {(Object.keys(STY) as DyeStyleKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="tour-btn alt"
                  onClick={() => {
                    runtimeRef.current.sty = k;
                    runtimeRef.current.cols = Array(STY[k].n).fill(null);
                    syncUi();
                  }}
                >
                  {STY[k].e} {STY[k].name}
                </button>
              ))}
            </div>
          )}

          {C.t === 'dye' && C.sty && C.step === 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {DYE.map((color, idx) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select dye color ${idx + 1}`}
                  onClick={() => {
                    runtimeRef.current.pick = idx;
                    syncUi();
                  }}
                  style={{
                    background: color,
                    width: '36px',
                    height: '36px',
                    padding: 0,
                    margin: '3px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: C.pick === idx ? '3px solid #fff' : '0',
                  }}
                />
              ))}
            </div>
          )}

          {fin && (
            <button
              type="button"
              className="tour-btn go"
              onClick={() =>
                onClose({
                  item: C.t === 'dye' ? 'dye' : 'bracelet',
                  amount: C.t === 'dye' ? stars * 2 : stars * 8,
                  vibes: stars * 2,
                })
              }
            >
              Collect {C.t === 'dye' ? `${stars * 2} tie-dyes` : `${stars * 8} bracelets`}
            </button>
          )}
        </div>
        <button type="button" className="tour-btn alt" onClick={() => onClose(undefined)}>
          Close
        </button>
      </div>
    </div>
  );
};
