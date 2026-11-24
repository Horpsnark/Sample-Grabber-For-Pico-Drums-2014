import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CraftModal } from './components/CraftModal';
import {
  bustSound,
  c$,
  createInitialGameState,
  createVenue,
  EMERGENCIES,
  fmtMoney,
  getShopCost,
  inf,
  ITEMS,
  KEYS,
  lotf,
  pickEmergencyIndex,
  playSetForStop,
  randBetween,
  REAL,
  SCENE_EMOJIS,
  SONGS,
  ST,
  UPGRADES,
  V,
} from './game/data';
import {
  buildChallengeUrl,
  clearSavedGame,
  getCleanBaseUrl,
  getLocalScores,
  getTourName,
  loadSavedGame,
  parseChallengeFromUrl,
  saveActiveGame,
  saveBestYears,
  saveLocalScore,
  setTourName,
  TabPeerManager,
} from './game/storage';
import {
  ChallengeInfo,
  GameState,
  ItemKey,
  LogEntry,
  PeerInfo,
  ScoreRecord,
} from './game/types';

function renderLogEntry(entry: LogEntry, key: React.Key) {
  return (
    <p key={key}>
      {entry.map((seg, idx) => {
        if (seg.tone === 'good') {
          return (
            <span key={idx} className="good">
              {seg.text}
            </span>
          );
        }
        if (seg.tone === 'bad') {
          return (
            <span key={idx} className="bad">
              {seg.text}
            </span>
          );
        }
        if (seg.tone === 'ev') {
          return (
            <span key={idx} className="ev">
              {seg.text}
            </span>
          );
        }
        if (seg.tone === 'bold') {
          return <b key={idx}>{seg.text}</b>;
        }
        return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
      })}
    </p>
  );
}

function finalizeEndState(next: GameState): {
  state: GameState;
  scores: ScoreRecord[];
  bestYears: number;
} {
  const score = Math.round(
    (V[next.i][2] - 1964) * 100 +
      Object.keys(next.heard).length * 5 +
      next.shows * 5 +
      next.cash / 20
  );
  const yrs = V[next.i][2] - 1964;
  let scores = getLocalScores();
  if (!next.saved) {
    next.saved = 1;
    next.score = score;
    scores = saveLocalScore(score, yrs, getTourName(), 'local');
  } else {
    next.score = score;
  }
  const bestYears = saveBestYears(yrs);
  return { state: next, scores, bestYears };
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => loadSavedGame() ?? createInitialGameState());
  const [tourName, setTourNameState] = useState<string>(() => getTourName());
  const [scores, setScores] = useState<ScoreRecord[]>(() => getLocalScores());
  const [bestYears, setBestYears] = useState<number>(() => saveBestYears(0));
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [craftMode, setCraftMode] = useState<'dye' | 'brace' | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [challengeCopied, setChallengeCopied] = useState(false);

  const peerMgrRef = useRef<TabPeerManager | null>(null);
  const shareBoxRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const incoming = parseChallengeFromUrl();
    if (incoming) {
      setChallenge(incoming);
      const updated = saveLocalScore(incoming.s, incoming.y, incoming.n, 'challenge');
      setScores(updated);
    }
  }, []);

  useEffect(() => {
    const mgr = new TabPeerManager((list) => setPeers(list));
    peerMgrRef.current = mgr;
    return () => {
      mgr.cleanup();
      peerMgrRef.current = null;
    };
  }, []);

  useEffect(() => {
    saveActiveGame(game);
    peerMgrRef.current?.publish({
      n: tourName,
      y: V[game.i][2],
      c: Math.round(game.cash),
      s: game.shows,
    });
  }, [game, tourName]);

  const shopCost = useMemo(() => getShopCost(game), [game]);
  const heardCount = useMemo(() => Object.keys(game.heard).length, [game.heard]);

  const hotLabel = (k: ItemKey) => {
    const x = game.v.m[k];
    return x > 1.25 ? '🔥 hot here' : x < 0.8 ? '🥶 slow here' : 'steady';
  };

  const resetTour = () => {
    clearSavedGame();
    setConfirmReset(false);
    setShareFeedback('');
    setChallengeCopied(false);
    setGame(createInitialGameState());
  };

  const handleNameChange = (value: string) => {
    const saved = setTourName(value);
    setTourNameState(saved);
  };

  const chg = (k: ItemKey, d: number) => {
    setGame((prev) => {
      const n = Math.max(0, prev.buy[k] + d * ITEMS[k].step);
      const candidate: GameState = {
        ...prev,
        buy: { ...prev.buy, [k]: n },
      };
      if (getShopCost(candidate) > prev.cash) {
        return prev;
      }
      return candidate;
    });
  };

  const tune = () => {
    setGame((prev) => {
      const cost = c$(40, prev.i);
      if (prev.cash - getShopCost(prev) < cost || prev.van >= 100) return prev;
      return {
        ...prev,
        cash: prev.cash - cost,
        van: Math.min(100, prev.van + 30),
      };
    });
  };

  const buyUp = (k: string) => {
    setGame((prev) => {
      const def = UPGRADES[k];
      if (!def || prev.up[k]) return prev;
      const cost = c$(def[1], prev.i);
      if (prev.cash - getShopCost(prev) < cost) return prev;
      return {
        ...prev,
        cash: prev.cash - cost,
        up: { ...prev.up, [k]: 1 },
      };
    });
  };

  const toLot = () => {
    setGame((prev) => {
      const spent = getShopCost(prev);
      const nextInv = { ...prev.inv };
      const nextBuy = { ...prev.buy };
      KEYS.forEach((k) => {
        nextInv[k] += prev.buy[k];
        nextBuy[k] = 0;
      });
      return {
        ...prev,
        cash: prev.cash - spent,
        inv: nextInv,
        buy: nextBuy,
        ph: 'lot',
        roadLog: [],
      };
    });
  };

  const vend = () => {
    setGame((prev) => {
      const L: LogEntry[] = [];
      let ev: { mult: Partial<Record<ItemKey, number>>; t: string; free?: boolean } = {
        mult: {},
        t: '',
      };
      const r = Math.random();
      if (r < 0.18) {
        ev = { mult: { food: 0.5, dye: 0.5 }, t: '🌧️ Rain rolls through. Dye and burritos slow way down.' };
      } else if (r < 0.34) {
        ev = {
          mult: { bracelet: 1.3, dye: 1.3, food: 1.3, party: 1.3 },
          t: '✨ Word is it’s a sold-out special one. The lot is packed.',
        };
      } else if (r < 0.48) {
        ev = { mult: { bracelet: 0.6 }, t: '😤 A rival vendor undercuts you on bracelets.' };
      } else if (r < 0.6) {
        ev = { mult: { food: 1.6 }, t: '🌮 The munchies hit hard. Burrito line around the block.' };
      } else if (r < 0.7) {
        ev = {
          mult: {},
          t: '🤝 A kind Head trades you a spare ticket for a handshake and a story.',
          free: true,
        };
      }

      if (V[prev.i][2] < 1980) {
        L.push([
          {
            text: '🅿️ Shakedown Street doesn’t exist yet. It grew up in the early 1980s, so the lot is just a few friends hanging out.',
          },
        ]);
      }
      if (ev.t) L.push([{ text: ev.t, tone: 'ev' }]);

      let free = prev.free || Boolean(ev.free);
      let vibes = prev.vibes;
      const inv = { ...prev.inv };
      let cash = prev.cash;
      let rev = 0;

      KEYS.forEach((k) => {
        const s = inv[k];
        if (!s) return;
        if (k === 'tape' && prev.st[k] >= 3) {
          if (prev.st[k] === 4) {
            const vGain = Math.ceil(s / 5) * 2;
            vibes += vGain;
            inv[k] = 0;
            L.push([
              { text: `📼 You trade all ${s} tapes with fellow Heads, the old-fashioned way. ` },
              { text: `+${vGain} vibes`, tone: 'good' },
            ]);
          } else {
            L.push([{ text: `📼 You keep your ${s} tapes for later.` }]);
          }
          return;
        }

        const item = ITEMS[k];
        const st = ST[prev.st[k]] ?? ST[1];
        const dem =
          item.d *
          prev.v.m[k] *
          prev.v.crowd *
          st.e *
          (1 + vibes / 250) *
          (ev.mult[k] || 1) *
          lotf(prev.i) *
          randBetween(0.8, 1.2);
        const sold = Math.min(s, Math.round(dem));
        const got = sold * item.p * inf(prev.i) * st.m;
        inv[k] -= sold;
        rev += got;
        if (k === 'tape' && sold > 0) {
          vibes = Math.max(0, vibes - 2);
        }
        L.push([
          { text: `${item.e} ${item.n}: sold ` },
          { text: String(sold), tone: 'bold' },
          { text: ` of ${s} for ` },
          { text: fmtMoney(got), tone: 'good' },
        ]);
      });

      if (inv.food > 0) {
        L.push([{ text: `🗑️ ${inv.food} burritos went cold and got tossed.` }]);
        inv.food = 0;
      }

      cash += rev;

      if (inv.party > 0) {
        const bust = 0.12 + prev.st.party * 0.06 + prev.v.i / 60;
        if (Math.random() < bust) {
          const fine = Math.min(cash, 60 + prev.v.i * 5);
          cash -= fine;
          L.push([
            {
              text: `🚓 Cops sweep the lot. You lose your remaining party stock and pay a ${fmtMoney(fine)} fine.`,
              tone: 'bad',
            },
          ]);
          bustSound();
          inv.party = 0;
          vibes -= 8;
        }
      }

      vibes = Math.max(0, vibes + 2);
      L.push([{ text: 'Total today: ' }, { text: fmtMoney(rev), tone: 'bold' }]);

      return {
        ...prev,
        cash,
        vibes,
        inv,
        free,
        log: L,
        ph: 'result',
      };
    });
  };

  const enterShow = (pay: boolean) => {
    setGame((prev) => {
      const next: GameState = {
        ...prev,
        cash: pay ? prev.cash - prev.v.ticket : prev.cash,
        free: false,
        shows: prev.shows + 1,
        vibes: prev.vibes + 10,
      };
      const setRes = playSetForStop(next);
      next.heard = setRes.heard;
      next.last = { all: setRes.all, nw: setRes.nw };
      const logs = [...setRes.logs];

      const rv = REAL[`${V[next.i][2]}|${V[next.i][0]}`];
      const nextStamps = [
        ...next.stamps,
        {
          i: next.i,
          v: V[next.i][0],
          y: V[next.i][2],
          all: setRes.all,
          nw: setRes.nw,
          d: rv ? rv.d : '',
          real: Boolean(rv),
        },
      ];
      next.stamps = nextStamps;

      if (nextStamps.length % 5 === 0) {
        if (nextStamps.length % 10 === 0) {
          next.tix = (next.tix || 0) + 1;
          logs.push([
            {
              text: `🎁 Stamp bonus (${nextStamps.length} stamps): a spare ticket for a future show!`,
            },
          ]);
        } else {
          next.vibes += 15;
          logs.push([{ text: `🎁 Stamp bonus (${nextStamps.length} stamps): +15 vibes!` }]);
        }
      }

      next.log = logs;
      next.ph = 'after';
      return next;
    });
  };

  const miracle = () => {
    setGame((prev) => {
      const p = 0.25 + prev.vibes / 200;
      if (Math.random() < p) {
        return {
          ...prev,
          free: true,
          log: [],
        };
      }
      return {
        ...prev,
        vibes: Math.max(0, prev.vibes - 2),
        log: [[{ text: '🙏 No miracle tonight. You listen from the lot instead.' }]],
        ph: 'after',
      };
    });
  };

  const taper = () => {
    setGame((prev) => {
      const tk = Math.round(prev.v.ticket * 1.5);
      if (prev.cash < tk) return prev;
      const next: GameState = {
        ...prev,
        cash: prev.cash - (tk - prev.v.ticket) - (prev.free ? 0 : prev.v.ticket),
        free: false,
        shows: prev.shows + 1,
        vibes: prev.vibes + 10,
        inv: { ...prev.inv },
      };

      const setRes = playSetForStop(next);
      next.heard = setRes.heard;
      next.last = { all: setRes.all, nw: setRes.nw };
      const logs = [...setRes.logs];

      const rv = REAL[`${V[next.i][2]}|${V[next.i][0]}`];
      const nextStamps = [
        ...next.stamps,
        {
          i: next.i,
          v: V[next.i][0],
          y: V[next.i][2],
          all: setRes.all,
          nw: setRes.nw,
          d: rv ? rv.d : '',
          real: Boolean(rv),
        },
      ];
      next.stamps = nextStamps;

      if (nextStamps.length % 5 === 0) {
        if (nextStamps.length % 10 === 0) {
          next.tix = (next.tix || 0) + 1;
          logs.push([
            {
              text: `🎁 Stamp bonus (${nextStamps.length} stamps): a spare ticket for a future show!`,
            },
          ]);
        } else {
          next.vibes += 15;
          logs.push([{ text: `🎁 Stamp bonus (${nextStamps.length} stamps): +15 vibes!` }]);
        }
      }

      const off = V[next.i][2] >= 1984;
      if (!off && Math.random() < 0.25) {
        logs.push([
          { text: '🎙️ Security spots your mic stand and confiscates your gear. No tape tonight.' },
        ]);
      } else {
        const n = off ? 25 : 15;
        next.inv.tape = (next.inv.tape || 0) + n;
        logs.push([
          {
            text: `🎙️ ${
              off
                ? 'You record from the official taper section behind the soundboard'
                : 'You sneak your deck in'
            } and walk out with ${n} tapes to dub.`,
          },
        ]);
      }
      logs.push([
        { text: '📼 The band let fans tape but not sell. Selling tapes on the lot costs you vibes.' },
      ]);

      next.log = logs;
      next.ph = 'after';
      return next;
    });
  };

  const skipShow = () => {
    setGame((prev) => ({
      ...prev,
      skip: 0,
      free: false,
      log: [
        [
          {
            text: '🔥 You skip the show and hang by the fire, hearing the music drift out of the venue. Cash saved.',
          },
        ],
      ],
      ph: 'after',
    }));
  };

  const drive = () => {
    const prev = game;
    if (prev.i === V.length - 1) {
      const ended = finalizeEndState({ ...prev, ph: 'end' });
      setGame(ended.state);
      setScores(ended.scores);
      setBestYears(ended.bestYears);
      return;
    }

    const f = inf(prev.i) * (prev.baby ? 1.6 : 1);
    const gas = Math.round(randBetween(15, 30) * f);
    const camp = Math.round(10 * f);
    const L: LogEntry[] = [];
    let cash = prev.cash;
    const inv = { ...prev.inv };

    if (cash < gas + camp) {
      let x = 0;
      KEYS.forEach((k) => {
        x += inv[k] * ITEMS[k].c * f * 0.5;
        inv[k] = 0;
      });
      if (x > 0) {
        cash += x;
        L.push([
          {
            text: `💸 Short on gas money, so you sold your leftover stock at half price for ${fmtMoney(x)}.`,
          },
        ]);
      }
    }

    cash -= gas + camp;
    L.push([{ text: `⛽ Gas ${fmtMoney(gas)} + camp food ${fmtMoney(camp)}.` }]);

    const r = Math.random();
    if (r < 0.18) {
      const b = Math.min(cash, Math.round(randBetween(30, 60) * inf(prev.i)));
      cash -= b;
      L.push([
        {
          text: `🔧 The van breaks down outside town. Repairs: ${fmtMoney(b)}.`,
          tone: 'bad',
        },
      ]);
    } else if (r < 0.36) {
      cash += 20;
      L.push([
        {
          text: '🧑‍🎤 A hitchhiker chips in $20 for gas and plays you a tape.',
          tone: 'good',
        },
      ]);
    }

    if (cash < 0) {
      const stranded = finalizeEndState({
        ...prev,
        inv,
        cash: 0,
        why: 'You ran out of gas money and got stranded on the road.',
        ph: 'end',
        roadLog: [],
      });
      setGame(stranded.state);
      setScores(stranded.scores);
      setBestYears(stranded.bestYears);
      return;
    }

    const nextIndex = prev.i + 1;
    const van = Math.max(
      5,
      prev.van - randBetween(4, 10) * (prev.up.engine ? 0.6 : 1)
    );
    if (V[nextIndex][2] > V[prev.i][2]) {
      L.push([
        {
          text: `🎉 New year on the road: ${V[nextIndex][2]}. Years survived: ${V[nextIndex][2] - 1964}.`,
        },
      ]);
    }

    let tix = prev.tix;
    let free = prev.free;
    if (tix > 0 && !free) {
      tix--;
      free = true;
      L.push([{ text: '🎟️ You pull a spare ticket from your stamp bonus for tonight.' }]);
    }

    const nextState: GameState = {
      ...prev,
      i: nextIndex,
      v: createVenue(nextIndex),
      cash,
      inv,
      van,
      tix,
      free,
      ph: 'shop',
      log: L,
      roadLog: L,
      buy: { bracelet: 0, dye: 0, food: 0, party: 0, tape: 0 },
      cr: {},
      emIndex: null,
    };

    if (Math.random() < 0.3 + (100 - van) / 300) {
      const emIdx = pickEmergencyIndex(nextState);
      nextState.emIndex = emIdx;
      nextState.ph = 'emerg';
      if (EMERGENCIES[emIdx].t === 'Busted!') {
        bustSound();
      }
    }

    setGame(nextState);
  };

  const emPick = (optionIndex: number) => {
    const prev = game;
    if (prev.emIndex === null) return;
    const em = EMERGENCIES[prev.emIndex];
    const opt = em.options[optionIndex];
    if (!opt) return;

    const next: GameState = {
      ...prev,
      inv: { ...prev.inv },
      buy: { ...prev.buy },
      st: { ...prev.st },
      up: { ...prev.up },
      cr: { ...prev.cr },
    };

    let endedReason: string | null = null;
    const msg = opt.resolve(next, (why) => {
      endedReason = why;
    });

    if (endedReason !== null) {
      const ended = finalizeEndState({
        ...next,
        why: endedReason,
        ph: 'end',
        emIndex: null,
      });
      setGame(ended.state);
      setScores(ended.scores);
      setBestYears(ended.bestYears);
      return;
    }

    next.log = [[{ text: `${em.e} ${msg}` }]];
    next.ph = 'shop';
    next.emIndex = null;
    setGame(next);
  };

  const buildShareMessage = () => {
    const yrs = V[game.i][2] - 1964;
    const challengeLink = buildChallengeUrl(tourName, game.score, yrs);
    return `I toured ${yrs} year${yrs > 1 ? 's' : ''} (1965–${V[game.i][2]}) and heard ${heardCount} of ${SONGS.length} songs on Have a Grate Tour! ${game.shows} shows, ${game.stamps.length} stamps, ${game.score} points.${challengeLink ? ' ' + challengeLink : ''}`;
  };

  const copyShare = async () => {
    const text = buildShareMessage();
    try {
      await navigator.clipboard.writeText(text);
      setShareFeedback('Copied! Paste it anywhere.');
    } catch {
      if (shareBoxRef.current) {
        shareBoxRef.current.focus();
        shareBoxRef.current.select();
      }
      setShareFeedback(
        'Select the text above and copy it (Ctrl+C, or tap and hold on your phone).'
      );
    }
  };

  const copyChallengeLink = async () => {
    const yrs = V[game.i][2] - 1964;
    const link = buildChallengeUrl(tourName, game.score, yrs);
    try {
      await navigator.clipboard.writeText(link);
      setChallengeCopied(true);
    } catch {
      setChallengeCopied(false);
    }
  };

  const yrs = V[game.i][2] - 1964;
  const stops = game.i + 1;
  const pc = heardCount / SONGS.length;
  const grade =
    yrs >= 31
      ? 'Ultimate Deadhead'
      : yrs >= 22
      ? 'Legend of the lot'
      : yrs >= 12
      ? 'Seasoned tour rat'
      : yrs >= 5
      ? 'Solid Deadhead'
      : 'Still learning the lot';

  const latestStamp = game.stamps[game.stamps.length - 1];
  const currentVenue = V[game.i];
  const currentRealShow = REAL[`${currentVenue[2]}|${currentVenue[0]}`];
  const sceneItems = (SCENE_EMOJIS[game.ph] || '').split(' ').filter(Boolean);
  const emergency = game.emIndex !== null ? EMERGENCIES[game.emIndex] : null;
  const anyInventory = KEYS.some((k) => game.inv[k] > 0);
  const canEnter = game.cash >= game.v.ticket;

  return (
    <div className="wrap">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 className="tour-title">Have a Grate Tour</h1>
          <div className="sub">1965 → 1995 · Buy cheap, sell on Shakedown Street, see every show</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {!confirmReset ? (
            <button
              type="button"
              className="tour-btn sm"
              onClick={() => setConfirmReset(true)}
            >
              Reset tour
            </button>
          ) : (
            <>
              <button
                type="button"
                className="tour-btn sm"
                style={{ background: 'var(--a)' }}
                onClick={resetTour}
              >
                Confirm new tour
              </button>
              <button
                type="button"
                className="tour-btn sm"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {challenge && (
        <div className="tour-card" style={{ borderColor: 'var(--b)' }}>
          <h2>🎯 Tour Challenge</h2>
          <div className="muted">
            <b>{challenge.n}</b> reached <b>{challenge.s} pts</b> over{' '}
            <b>{challenge.y} yrs</b>. Can you beat their run?
          </div>
          <a
            href={getCleanBaseUrl() || './'}
            className="muted"
            style={{ display: 'inline-block', marginTop: '6px', textDecoration: 'underline' }}
            onClick={(e) => {
              e.preventDefault();
              setChallenge(null);
              try {
                window.history.replaceState({}, '', getCleanBaseUrl());
              } catch {
                // ignore
              }
            }}
          >
            Dismiss challenge
          </a>
        </div>
      )}

      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <b>{fmtMoney(game.cash)}</b>
          <span>Cash</span>
        </div>
        <div className="stat">
          <b>{game.shows}</b>
          <span>Shows</span>
        </div>
        <div className="stat">
          <b>{Math.round(game.vibes)}</b>
          <span>Vibes</span>
        </div>
        <div className="stat">
          <b>
            {heardCount}/{SONGS.length}
          </b>
          <span>Songs</span>
        </div>
        <div className="stat">
          <b>{currentVenue[2]}</b>
          <span>Year</span>
        </div>
      </div>

      <div className="prog">
        <i style={{ width: `${(game.i / V.length) * 100}%` }} />
      </div>

      {game.ph === 'end' ? (
        <>
          <div className="tour-card" style={{ textAlign: 'center' }}>
            <div className="big">🌹💀⚡</div>
            <h2>
              {game.why ||
                (yrs >= 31 ? '🏆 You toured all the way to 1995!' : 'The tour is over')}
            </h2>
            <p className="muted">
              Years on tour: <b>{yrs}/31</b> (1965–{currentVenue[2]}) · Longest tour:{' '}
              <b>{bestYears} yrs</b>
              <br />
              Stops: <b>{stops}/{V.length}</b> · Stamps: <b>{game.stamps.length}</b>
              {pc >= 1 ? ' · 🏆 Songbook complete!' : ''}
              <br />
              Shows seen: <b>{game.shows}</b> · Cash: <b>{fmtMoney(game.cash)}</b> · Vibes:{' '}
              <b>{Math.round(game.vibes)}</b>
            </p>
            <h2 className="good">{grade}</h2>
            <p className="muted">Score: {game.score}</p>
            <button type="button" className="tour-btn go" onClick={resetTour}>
              Hit the road again
            </button>
          </div>

          <div className="tour-card">
            <h2>📣 Share your tour</h2>
            <textarea
              ref={shareBoxRef}
              readOnly
              rows={4}
              value={buildShareMessage()}
              style={{
                width: '100%',
                background: '#150a24',
                color: 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: '10px',
                padding: '8px',
                font: 'inherit',
                marginTop: '6px',
              }}
            />
            <button type="button" className="tour-btn alt" onClick={copyShare}>
              Copy to clipboard
            </button>
            {shareFeedback && (
              <div className="muted" style={{ marginTop: '6px' }}>
                {shareFeedback}
              </div>
            )}
          </div>

          <div className="tour-card">
            <h2>🏅 High scores</h2>
            <div className="muted">
              Your score: <b>{game.score}</b>
            </div>
            <button
              type="button"
              className="tour-btn alt"
              onClick={copyChallengeLink}
            >
              {challengeCopied
                ? `Challenge link copied for ${tourName}!`
                : `Copy challenge link as ${tourName}`}
            </button>
            <h3>Your best tours</h3>
            {scores.length === 0 ? (
              <div className="muted">No saved tours yet.</div>
            ) : (
              scores.map((entry, idx) => (
                <div className="tour-row" key={`${entry.n}-${entry.s}-${idx}`}>
                  <span>
                    {idx + 1}. {entry.n}
                    {entry.source === 'challenge' ? ' 🎯' : ''}
                  </span>
                  <span>
                    {entry.s} pts · {entry.y} yrs
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className={`scene sc-${game.ph}`}>
            {sceneItems.map((emoji, idx) => (
              <span key={`${emoji}-${idx}`}>{emoji}</span>
            ))}
          </div>

          <div className="tour-card">
            <h2>
              {currentVenue[2]} · {currentVenue[0]}
            </h2>
            <div className="muted">
              {currentVenue[1]} · 🚐 Van {Math.round(game.van)}% · Stop {game.i + 1}/{V.length} ·
              Ticket {fmtMoney(game.v.ticket)}
              {currentRealShow ? ` · ✅ real show: ${currentRealShow.d}` : ''} · Crowd{' '}
              {game.v.crowd > 1.15 ? 'huge' : game.v.crowd < 0.95 ? 'light' : 'solid'}
            </div>
          </div>

          {game.ph === 'shop' && (
            <div className="tour-card">
              <h2>Stock up</h2>
              <div className="muted">
                Spend your cash on supplies. Unsold goods carry over, except burritos.
              </div>
              {KEYS.map((k) => {
                const item = ITEMS[k];
                if (item.nb) return null;
                return (
                  <div className="tour-row" key={k}>
                    <div className="nm">
                      {item.e} <b>{item.n}</b>
                      <small>
                        {fmtMoney(item.c * inf(game.i))} each · {item.note} · {hotLabel(k)} · have{' '}
                        {game.inv[k]}
                      </small>
                    </div>
                    <div className="qty">
                      <button
                        type="button"
                        className="tour-btn sm"
                        onClick={() => chg(k, -1)}
                      >
                        −
                      </button>
                      <b>{game.buy[k]}</b>
                      <button
                        type="button"
                        className="tour-btn sm"
                        onClick={() => chg(k, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="muted" style={{ marginTop: '8px' }}>
                Spending: <b>{fmtMoney(shopCost)}</b>
              </div>

              <button
                type="button"
                className="tour-btn alt"
                disabled={game.cash - shopCost < c$(40, game.i) || game.van >= 100}
                onClick={tune}
              >
                🔧 Tune up the van (+30%) · {fmtMoney(c$(40, game.i))}
              </button>

              <button
                type="button"
                className="tour-btn alt"
                disabled={Boolean(game.cr.dye)}
                onClick={() => setCraftMode('dye')}
              >
                🌈 Tie-dye workshop (earn free tie-dyes)
              </button>

              <button
                type="button"
                className="tour-btn alt"
                disabled={Boolean(game.cr.brace)}
                onClick={() => setCraftMode('brace')}
              >
                📿 Hemp bracelet bench (earn free bracelets)
              </button>

              {Object.keys(UPGRADES)
                .filter((k) => !game.up[k])
                .map((k) => {
                  const [label, base] = UPGRADES[k];
                  const price = c$(base, game.i);
                  return (
                    <button
                      key={k}
                      type="button"
                      className="tour-btn alt"
                      disabled={game.cash - shopCost < price}
                      onClick={() => buyUp(k)}
                    >
                      🔩 {label} · {fmtMoney(price)}
                    </button>
                  );
                })}

              <button type="button" className="tour-btn go" onClick={toLot}>
                Head to Shakedown Street →
              </button>
            </div>
          )}

          {game.ph === 'emerg' && emergency && (
            <div className="tour-card" style={{ borderColor: 'var(--a)' }}>
              <div className="big">{emergency.e}</div>
              <h2 className="bad">{emergency.t}</h2>
              <p>{emergency.x}</p>
              {emergency.options.map((opt, idx) => (
                <button
                  key={opt.label}
                  type="button"
                  className="tour-btn alt"
                  onClick={() => emPick(idx)}
                >
                  {opt.label}
                  {opt.baseCost ? ` (${fmtMoney(c$(opt.baseCost, game.i))})` : ''}
                </button>
              ))}
            </div>
          )}

          {game.ph === 'lot' && (
            <div className="tour-card">
              <h2>Set your prices</h2>
              <div className="muted">
                Cheap sells more, gouging sells less. Fair is the vibe.
              </div>
              {KEYS.map((k) => {
                if (!game.inv[k]) return null;
                const item = ITEMS[k];
                const opts = k === 'tape' ? [...ST, { l: 'Keep' }, { l: 'Trade' }] : ST;
                return (
                  <div className="tour-row" key={k}>
                    <div className="nm">
                      {item.e} <b>{item.n}</b>
                      <small>
                        {game.inv[k]} in stock · base {fmtMoney(item.p * inf(game.i))}
                      </small>
                    </div>
                    <div className="seg">
                      {opts.map((opt, j) => (
                        <button
                          key={opt.l}
                          type="button"
                          className={game.st[k] === j ? 'on' : ''}
                          onClick={() =>
                            setGame((prev) => ({
                              ...prev,
                              st: { ...prev.st, [k]: j },
                            }))
                          }
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!anyInventory && (
                <p className="muted" style={{ marginTop: '10px' }}>
                  Nothing to sell. You’re just hanging in the lot.
                </p>
              )}
              <button type="button" className="tour-btn go" onClick={vend}>
                Open the blanket
              </button>
            </div>
          )}

          {game.ph === 'result' && (
            <div className="tour-card log">
              <h2>Shakedown report</h2>
              {game.log.map((entry, idx) => renderLogEntry(entry, idx))}
              <button
                type="button"
                className="tour-btn go"
                onClick={() => setGame((prev) => ({ ...prev, ph: 'show' }))}
              >
                Toward the gate →
              </button>
            </div>
          )}

          {game.ph === 'show' && game.skip === 1 && (
            <div className="tour-card">
              <h2>Stuck</h2>
              <div className="big">🚫</div>
              <p className="bad">Your emergency means you can’t make tonight’s show.</p>
              <button type="button" className="tour-btn go" onClick={skipShow}>
                Stay in the lot
              </button>
            </div>
          )}

          {game.ph === 'show' && game.skip !== 1 && (
            <div className="tour-card">
              <h2>Showtime</h2>
              <div className="big">🎸⚡🌹</div>
              {game.free ? (
                <>
                  <p className="good">You’ve got a spare ticket in hand. Magic.</p>
                  <button
                    type="button"
                    className="tour-btn go"
                    onClick={() => enterShow(false)}
                  >
                    Go in and dance
                  </button>
                </>
              ) : (
                <>
                  <p className="muted">
                    Ticket is {fmtMoney(game.v.ticket)}. You have {fmtMoney(game.cash)}.
                  </p>
                  {canEnter ? (
                    <button
                      type="button"
                      className="tour-btn go"
                      onClick={() => enterShow(true)}
                    >
                      Buy ticket and go in
                    </button>
                  ) : (
                    <p className="bad">Not enough for a ticket.</p>
                  )}
                  <button type="button" className="tour-btn alt" onClick={miracle}>
                    Stand with a finger up: “I need a miracle”
                  </button>
                </>
              )}

              <button
                type="button"
                className="tour-btn alt"
                disabled={game.cash < Math.round(game.v.ticket * 1.5)}
                onClick={taper}
              >
                📼 Buy a taper ticket and record the show ({fmtMoney(Math.round(game.v.ticket * 1.5))})
              </button>

              <button type="button" className="tour-btn alt" onClick={skipShow}>
                Skip the show, stay in the lot
              </button>
            </div>
          )}

          {game.ph === 'after' && (
            <div className="tour-card log">
              <h2>Night’s over</h2>
              {latestStamp && latestStamp.i === game.i && (
                <div style={{ margin: '6px 0 10px' }}>
                  <div className="stamp">
                    {latestStamp.y}
                    <br />
                    <b>{latestStamp.v}</b>
                    <br />
                    {latestStamp.d || 'ADMIT ONE'}
                  </div>
                  <div className="muted">
                    Stamped {latestStamp.all.length} songs in your stamp book
                    {latestStamp.nw.length ? (
                      <>
                        , <b className="good">{latestStamp.nw.length} new</b>
                      </>
                    ) : null}
                    .
                  </div>
                  <div>
                    {latestStamp.all.map((n, idx) => {
                      const isNew = latestStamp.nw.includes(n);
                      return (
                        <span key={`${n}-${idx}`} className={`chip ${isNew ? 'on' : ''}`}>
                          {isNew ? '★ ' : ''}
                          {n}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {game.log.map((entry, idx) => renderLogEntry(entry, idx))}

              <button type="button" className="tour-btn go" onClick={drive}>
                {game.i === V.length - 1
                  ? 'Finish the tour'
                  : `Drive to ${V[game.i + 1][1]}`}{' '}
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* Stamp book */}
      {game.stamps.length === 0 ? (
        <div className="tour-card">
          <h2>🎟️ Stamp Book</h2>
          <div className="muted">Empty. Get into a show to earn your first stamp.</div>
        </div>
      ) : (
        <div className="tour-card">
          <h2>🎟️ Stamp Book ({game.stamps.length})</h2>
          <div className="muted">
            One stamp per show you got into. Tap a stamp to see its songs.
          </div>
          {game.stamps
            .slice()
            .reverse()
            .map((st, idx) => (
              <details className="tour-details" key={`${st.i}-${st.y}-${idx}`}>
                <summary>
                  {st.y} · {st.v}
                  {st.real ? ' ✅' : ''}{' '}
                  <span className="muted">
                    {st.all.length} songs, {st.nw.length} new
                  </span>
                </summary>
                <div>
                  {st.all.map((n, songIdx) => (
                    <span
                      key={`${n}-${songIdx}`}
                      className={`chip ${st.nw.includes(n) ? 'on' : ''}`}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </details>
            ))}
        </div>
      )}

      {/* Songbook */}
      <div className="tour-card">
        <h2>
          📖 Songbook {heardCount}/{SONGS.length}
          {heardCount >= SONGS.length ? ' 🏆 COMPLETE!' : ''}
        </h2>
        <div className="muted">
          Second goal: hear every song (originals and covers). ⭐ rare songs show up more when
          your vibes are high.
        </div>
        <div className="prog">
          <i style={{ width: `${(heardCount / SONGS.length) * 100}%` }} />
        </div>
        <div>
          {SONGS.map((song) => {
            const unlocked = Boolean(game.heard[song.n]);
            return (
              <span key={song.n} className={`chip ${unlocked ? 'on' : ''}`}>
                {unlocked ? song.n : song.t === 3 ? '⭐ ???' : '???'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Multi-tab live road presence */}
      <div className="tour-card">
        <h2>🚌 On the road right now</h2>
        <div className="muted">
          Other browser tabs or windows with this page open show up here live.
        </div>
        <div style={{ marginTop: '6px' }}>
          {peers.length === 0 ? (
            <span className="muted">No other Heads on the road right now.</span>
          ) : (
            peers.map((p) => (
              <div className="tour-row" key={p.id}>
                <span>🚌 {p.n || 'A Head'}</span>
                <span>
                  {p.y || '?'} · ${p.c || 0} · {p.s || 0} shows
                </span>
              </div>
            ))
          )}
        </div>
        <p className="muted" style={{ marginTop: '10px', marginBottom: 0 }}>
          Your tour name:{' '}
          <input
            className="tour-input"
            value={tourName}
            maxLength={14}
            onChange={(e) => handleNameChange(e.target.value)}
          />
        </p>
      </div>

      {/* Road log */}
      {game.ph !== 'end' && game.roadLog.length > 0 && (
        <div className="tour-card log">
          <h2>On the road</h2>
          {game.roadLog.map((entry, idx) => renderLogEntry(entry, idx))}
        </div>
      )}

      {craftMode && (
        <CraftModal
          mode={craftMode}
          onClose={(reward) => {
            const activeMode = craftMode;
            setCraftMode(null);
            if (!reward) return;
            setGame((prev) => ({
              ...prev,
              inv: {
                ...prev.inv,
                [reward.item]: prev.inv[reward.item] + reward.amount,
              },
              vibes: prev.vibes + reward.vibes,
              cr: {
                ...prev.cr,
                [activeMode]: 1,
              },
            }));
          }}
        />
      )}
    </div>
  );
}
