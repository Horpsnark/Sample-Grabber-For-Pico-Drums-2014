export type ItemKey = 'bracelet' | 'dye' | 'food' | 'party' | 'tape';

export type Phase =
  | 'shop'
  | 'emerg'
  | 'lot'
  | 'result'
  | 'show'
  | 'after'
  | 'end';

export interface Song {
  n: string;
  t: 1 | 2 | 3 | 4;
  y: number;
}

export interface RealShow {
  d: string;
  s: Array<[string, string[]]>;
}

export interface VenueState {
  i: number;
  m: Record<ItemKey, number>;
  crowd: number;
  ticket: number;
}

export interface Stamp {
  i: number;
  v: string;
  y: number;
  all: string[];
  nw: string[];
  d: string;
  real: boolean;
}

export interface LogSegment {
  text: string;
  tone?: 'good' | 'bad' | 'ev' | 'bold';
}

export type LogEntry = LogSegment[];

export interface GameState {
  i: number;
  cash: number;
  vibes: number;
  shows: number;
  inv: Record<ItemKey, number>;
  buy: Record<ItemKey, number>;
  st: Record<ItemKey, number>;
  ph: Phase;
  log: LogEntry[];
  roadLog: LogEntry[];
  free: boolean;
  v: VenueState;
  why: string;
  heard: Record<string, 1>;
  stamps: Stamp[];
  last: {
    all: string[];
    nw: string[];
  };
  skip: number;
  baby: number;
  van: number;
  up: Record<string, 1>;
  tix: number;
  saved: number;
  score: number;
  cr: {
    dye?: 1;
    brace?: 1;
  };
  emIndex: number | null;
}

export interface ScoreRecord {
  n: string;
  s: number;
  y: number;
  source?: 'local' | 'challenge';
}

export interface PeerInfo {
  id: string;
  n: string;
  y: number;
  c: number;
  s: number;
  ts: number;
}

export interface ChallengeInfo {
  n: string;
  s: number;
  y: number;
}
