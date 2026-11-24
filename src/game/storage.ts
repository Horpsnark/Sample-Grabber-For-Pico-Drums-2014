import { ChallengeInfo, GameState, PeerInfo, ScoreRecord } from './types';

const NAME_KEY = 'gdname';
const SCORES_KEY = 'gdscores';
const BEST_YRS_KEY = 'gdbestyrs';
const SAVED_GAME_KEY = 'gdsave_v1';
const PEERS_KEY = 'gd_peers_v1';
const CHANNEL_NAME = 'have-a-grate-tour-peers';
const PEER_TTL_MS = 15000;

export function getTourName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || 'Head';
  } catch {
    return 'Head';
  }
}

export function setTourName(name: string): string {
  const clean = name.slice(0, 14);
  try {
    localStorage.setItem(NAME_KEY, clean || 'Head');
  } catch {
    // ignore storage errors
  }
  return clean || 'Head';
}

export function getLocalScores(): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is ScoreRecord =>
          Boolean(x) &&
          typeof x.n === 'string' &&
          typeof x.s === 'number' &&
          typeof x.y === 'number'
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

export function saveLocalScore(
  score: number,
  years: number,
  playerName?: string,
  source: 'local' | 'challenge' = 'local'
): ScoreRecord[] {
  const name = (playerName ?? getTourName()).slice(0, 14) || 'Head';
  const list = getLocalScores();
  const isDuplicate =
    source === 'challenge' &&
    list.some((item) => item.n === name && item.s === score && item.y === years);
  if (!isDuplicate) {
    list.push({ n: name, s: score, y: years, source });
  }
  list.sort((a, b) => b.s - a.s);
  const top = list.slice(0, 10);
  try {
    localStorage.setItem(SCORES_KEY, JSON.stringify(top));
  } catch {
    // ignore storage errors
  }
  return top;
}

export function getBestYears(): number {
  try {
    return Number(localStorage.getItem(BEST_YRS_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

export function saveBestYears(years: number): number {
  const best = Math.max(years, getBestYears());
  try {
    localStorage.setItem(BEST_YRS_KEY, String(best));
  } catch {
    // ignore storage errors
  }
  return best;
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (
      !parsed ||
      typeof parsed.i !== 'number' ||
      typeof parsed.cash !== 'number' ||
      !parsed.inv ||
      !parsed.v
    ) {
      return null;
    }
    return {
      ...parsed,
      roadLog: Array.isArray(parsed.roadLog) ? parsed.roadLog : [],
      emIndex: typeof parsed.emIndex === 'number' ? parsed.emIndex : null,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
    };
  } catch {
    return null;
  }
}

export function saveActiveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getCleanBaseUrl(): string {
  try {
    return `${window.location.origin}${window.location.pathname}`;
  } catch {
    return '';
  }
}

export function buildChallengeUrl(name: string, score: number, years: number): string {
  const base = getCleanBaseUrl();
  const payload = JSON.stringify({
    n: (name || 'Head').slice(0, 14),
    s: Math.round(score),
    y: Math.round(years),
  });
  const encoded = btoa(unescape(encodeURIComponent(payload)));
  return `${base}?challenge=${encodeURIComponent(encoded)}`;
}

export function parseChallengeFromUrl(): ChallengeInfo | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('challenge');
    if (!raw) return null;
    // Support compact format name|score|years or Base64 JSON
    if (raw.includes('|')) {
      const [n, sStr, yStr] = raw.split('|');
      const s = Number(sStr);
      const y = Number(yStr);
      if (n && Number.isFinite(s) && Number.isFinite(y)) {
        return { n: n.slice(0, 14), s: Math.round(s), y: Math.round(y) };
      }
      return null;
    }
    const json = decodeURIComponent(escape(atob(raw)));
    const data = JSON.parse(json);
    if (
      data &&
      typeof data.n === 'string' &&
      typeof data.s === 'number' &&
      typeof data.y === 'number'
    ) {
      return {
        n: data.n.slice(0, 14),
        s: Math.round(data.s),
        y: Math.round(data.y),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function createPeerSessionId(): string {
  return `tab-${Math.random().toString(36).slice(2, 10)}`;
}

function readPeerMap(): Record<string, PeerInfo> {
  try {
    const raw = localStorage.getItem(PEERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PeerInfo>;
    const now = Date.now();
    const fresh: Record<string, PeerInfo> = {};
    Object.entries(parsed).forEach(([id, info]) => {
      if (info && typeof info.ts === 'number' && now - info.ts < PEER_TTL_MS) {
        fresh[id] = info;
      }
    });
    return fresh;
  } catch {
    return {};
  }
}

function writePeerMap(map: Record<string, PeerInfo>): void {
  try {
    localStorage.setItem(PEERS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export class TabPeerManager {
  private readonly myId: string;
  private channel: BroadcastChannel | null = null;
  private onChange: (peers: PeerInfo[]) => void;
  private lastPresence: Omit<PeerInfo, 'id' | 'ts'> = {
    n: getTourName(),
    y: 1965,
    c: 80,
    s: 0,
  };
  private timer: number | null = null;

  constructor(onChange: (peers: PeerInfo[]) => void) {
    this.myId = createPeerSessionId();
    this.onChange = onChange;

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = () => {
          this.emitPeers();
        };
      } catch {
        this.channel = null;
      }
    }

    window.addEventListener('storage', this.handleStorage);
    window.addEventListener('beforeunload', this.cleanup);

    this.timer = window.setInterval(() => {
      this.publish(this.lastPresence);
    }, 5000);
  }

  private handleStorage = (e: StorageEvent): void => {
    if (e.key === PEERS_KEY) {
      this.emitPeers();
    }
  };

  private emitPeers(): void {
    const map = readPeerMap();
    const others = Object.values(map).filter((p) => p.id !== this.myId);
    this.onChange(others);
  }

  publish(info: Omit<PeerInfo, 'id' | 'ts'>): void {
    this.lastPresence = info;
    const map = readPeerMap();
    map[this.myId] = {
      ...info,
      id: this.myId,
      ts: Date.now(),
    };
    writePeerMap(map);
    try {
      this.channel?.postMessage({ type: 'ping', id: this.myId });
    } catch {
      // ignore
    }
    this.emitPeers();
  }

  cleanup = (): void => {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener('storage', this.handleStorage);
    window.removeEventListener('beforeunload', this.cleanup);

    const map = readPeerMap();
    if (map[this.myId]) {
      delete map[this.myId];
      writePeerMap(map);
    }
    try {
      this.channel?.postMessage({ type: 'leave', id: this.myId });
      this.channel?.close();
    } catch {
      // ignore
    }
  };
}
