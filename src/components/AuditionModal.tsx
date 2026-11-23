import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { BUDGET, CATEGORY_NAMES, MAX_SECONDS, SAMPLE_RATE } from '../grab64/constants';
import { AudioMixer, loadSampleEx, slotBytes } from '../grab64/audioEngine';
import { LibraryEntry, LibraryState, SlotSample } from '../grab64/types';

interface AuditionModalProps {
  open: boolean;
  libraryState: LibraryState;
  slots: Array<SlotSample | null>;
  selectedSlotIdx: number | null;
  favorLarge: boolean;
  lenScale: number;
  mixer: AudioMixer;
  onPutSample: (slotIdx: number, entry: LibraryEntry, cat: string) => Promise<boolean>;
  onClose: () => void;
}

const ROW_HEIGHT = 24;
const VIEWPORT_ROWS_FALLBACK = 16;
const OVERSCAN = 8;
const MAX_DISPLAY_ROWS = 20000;

export const AuditionModal: React.FC<AuditionModalProps> = ({
  open,
  libraryState,
  slots,
  selectedSlotIdx,
  favorLarge,
  lenScale,
  mixer,
  onPutSample,
  onClose,
}) => {
  const [category, setCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [cursorIdx, setCursorIdx] = useState<number>(0);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(
    ROW_HEIGHT * VIEWPORT_ROWS_FALLBACK
  );
  const [infoText, setInfoText] = useState<string>('');

  const listRef = useRef<HTMLDivElement | null>(null);
  const audCacheRef = useRef<Map<string, Int16Array | null>>(new Map());

  useEffect(() => {
    audCacheRef.current.clear();
  }, [libraryState, favorLarge]);

  const usedPaths = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (s) set.add(s.path);
    }
    return set;
  }, [slots]);

  const { visibleItems, totalMatches } = useMemo(() => {
    const source =
      category === 'All'
        ? libraryState.entries
        : libraryState.byCategory.get(category) ?? [];

    const q = searchQuery.trim().toLowerCase();
    let matched: LibraryEntry[];
    if (q) {
      matched = [];
      for (let i = 0; i < source.length; i++) {
        const entry = source[i];
        if (entry.name.toLowerCase().includes(q)) {
          matched.push(entry);
        }
      }
    } else {
      matched = source.slice();
    }

    const total = matched.length;
    if (matched.length > MAX_DISPLAY_ROWS) {
      matched = matched.slice(0, MAX_DISPLAY_ROWS);
    }
    matched.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
    return { visibleItems: matched, totalMatches: total };
  }, [libraryState, category, searchQuery]);

  useEffect(() => {
    if (open) {
      setCursorIdx(0);
      setScrollTop(0);
      if (listRef.current) {
        listRef.current.scrollTop = 0;
        setViewportHeight(listRef.current.clientHeight || ROW_HEIGHT * VIEWPORT_ROWS_FALLBACK);
        listRef.current.focus();
      }
      if (totalMatches > MAX_DISPLAY_ROWS) {
        setInfoText(
          `Showing first ${MAX_DISPLAY_ROWS.toLocaleString()} of ${totalMatches.toLocaleString()} samples — filter by Category or Search`
        );
      } else {
        setInfoText(`${totalMatches.toLocaleString()} samples`);
      }
    }
  }, [open, totalMatches]);

  const catFor = useCallback(
    (entry: LibraryEntry): string => {
      if (category !== 'All') return category;
      if (entry.categories.length > 0) {
        return entry.categories[0];
      }
      return 'Any';
    },
    [category]
  );

  const loadForAudition = useCallback(
    async (entry: LibraryEntry): Promise<Int16Array | null> => {
      const cat = catFor(entry);
      const key = `${entry.id}::${cat}::${favorLarge ? 1 : 0}`;
      if (audCacheRef.current.has(key)) {
        return audCacheRef.current.get(key) ?? null;
      }
      if (audCacheRef.current.size > 150) {
        audCacheRef.current.clear();
      }
      const maxSec = (MAX_SECONDS[cat] ?? 1.5) * lenScale;
      const res = await loadSampleEx(entry, maxSec, BUDGET, mixer.getContext());
      const data = res ? res.data : null;
      audCacheRef.current.set(key, data);
      return data;
    },
    [catFor, favorLarge, lenScale, mixer]
  );

  const playEntry = useCallback(
    async (entry: LibraryEntry | undefined) => {
      if (!entry) return;
      const data = await loadForAudition(entry);
      if (!data) {
        setInfoText('Could not read that file');
        return;
      }
      mixer.stopAll();
      mixer.play(data);
      setInfoText(
        `${entry.name}   ${(data.length / SAMPLE_RATE).toFixed(2)} s   ${Math.floor(
          slotBytes(data) / 1024
        )} KB`
      );
    },
    [loadForAudition, mixer]
  );

  const ensureCursorVisible = useCallback((idx: number) => {
    const el = listRef.current;
    if (!el) return;
    const itemTop = idx * ROW_HEIGHT;
    const itemBottom = itemTop + ROW_HEIGHT;
    const viewTop = el.scrollTop;
    const viewHeight = el.clientHeight || ROW_HEIGHT * VIEWPORT_ROWS_FALLBACK;
    if (itemTop < viewTop) {
      el.scrollTop = itemTop;
    } else if (itemBottom > viewTop + viewHeight) {
      el.scrollTop = itemBottom - viewHeight;
    }
  }, []);

  const selectIndex = useCallback(
    (idx: number, forcePlay = false) => {
      if (idx < 0 || idx >= visibleItems.length) return;
      setCursorIdx(idx);
      ensureCursorVisible(idx);
      if (autoPlay || forcePlay) {
        void playEntry(visibleItems[idx]);
      }
    },
    [visibleItems, ensureCursorVisible, autoPlay, playEntry]
  );

  const putInSlot = useCallback(
    async (slotIdx: number) => {
      const entry = visibleItems[cursorIdx];
      if (!entry) return;
      const ok = await onPutSample(slotIdx, entry, catFor(entry));
      if (ok) {
        setInfoText(`${entry.name} -> slot ${slotIdx + 1}`);
        if (cursorIdx + 1 < visibleItems.length) {
          selectIndex(cursorIdx + 1);
        }
      } else {
        setInfoText("Won't fit in the remaining size budget");
      }
    },
    [visibleItems, cursorIdx, onPutSample, catFor, selectIndex]
  );

  const addNextEmpty = useCallback(async () => {
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx === -1) {
      setInfoText('All 64 slots are full. Clear some first.');
      return;
    }
    await putInSlot(emptyIdx);
  }, [slots, putInSlot]);

  const addSelectedSlot = useCallback(async () => {
    if (selectedSlotIdx === null) {
      setInfoText('Select a slot in the main list first.');
      return;
    }
    await putInSlot(selectedSlotIdx);
  }, [selectedSlotIdx, putInSlot]);

  const pickRandom = useCallback(() => {
    if (visibleItems.length === 0) return;
    const nextIdx = Math.floor(Math.random() * visibleItems.length);
    selectIndex(nextIdx, true);
  }, [visibleItems.length, selectIndex]);

  const handleClose = () => {
    mixer.stopAll();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectIndex(Math.min(visibleItems.length - 1, cursorIdx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectIndex(Math.max(0, cursorIdx - 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      void playEntry(visibleItems[cursorIdx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void addNextEmpty();
    }
  };

  if (!open) return null;

  // Virtual window calculation — keeps DOM node count ~35 even for 20k+ rows
  const totalHeight = visibleItems.length * ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN * 2;
  const endIdx = Math.min(visibleItems.length, startIdx + visibleCount);
  const windowSlice = visibleItems.slice(startIdx, endIdx);

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label="GRAB64 - Audition"
        className="w-full max-w-[540px] h-[560px] bg-[#16171b] border border-[#34373f] rounded flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-3 py-2 bg-[#1e2025] border-b border-[#34373f] flex items-center justify-between">
          <span className="text-xs font-medium text-[#e4e6eb]">GRAB64 - Audition</span>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded hover:bg-[#363a43] text-[#8b909a] hover:text-[#e4e6eb] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Category + Auto-play */}
        <div className="px-3 py-2 flex flex-wrap items-center gap-3 border-b border-[#34373f] text-xs">
          <label className="flex items-center gap-2 text-[#e4e6eb]">
            <span>Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-7 px-2 bg-[#1e2025] border border-[#34373f] rounded text-xs text-[#e4e6eb] outline-none focus:border-[#4f8cff]"
            >
              <option value="All">All ({libraryState.entries.length.toLocaleString()})</option>
              {CATEGORY_NAMES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat} ({(libraryState.categoryCounts[cat] ?? 0).toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[#e4e6eb] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="accent-[#4f8cff] cursor-pointer"
            />
            <span>Auto-play on select</span>
          </label>

          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-3 h-3 text-[#8b909a] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename..."
              className="w-full h-7 pl-6 pr-2 bg-[#1e2025] border border-[#34373f] focus:border-[#4f8cff] rounded text-xs text-[#e4e6eb] placeholder-[#8b909a] outline-none"
            />
          </div>
        </div>

        {/* Virtualized Sample List */}
        <div
          ref={listRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={(e) => {
            const target = e.currentTarget;
            setScrollTop(target.scrollTop);
            setViewportHeight(target.clientHeight);
          }}
          className="flex-1 m-2 bg-[#1e2025] border border-[#34373f] rounded overflow-y-auto outline-none focus:border-[#4f8cff] relative"
        >
          {visibleItems.length === 0 ? (
            <div className="p-4 text-xs text-[#8b909a]">
              No matching samples in this category.
            </div>
          ) : (
            <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
              {windowSlice.map((entry, offset) => {
                const idx = startIdx + offset;
                const isSelected = idx === cursorIdx;
                const isUsed = usedPaths.has(entry.path);
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectIndex(idx)}
                    onDoubleClick={() => void addNextEmpty()}
                    style={{
                      position: 'absolute',
                      top: `${idx * ROW_HEIGHT}px`,
                      left: 0,
                      right: 0,
                      height: `${ROW_HEIGHT}px`,
                    }}
                    className={`px-2.5 text-left font-mono text-xs flex items-center gap-1.5 cursor-pointer truncate ${
                      isSelected
                        ? 'bg-[#4f8cff] text-white'
                        : 'hover:bg-[#2a2d34] text-[#e4e6eb]'
                    }`}
                  >
                    <span className="w-3 shrink-0">{isUsed ? '*' : ' '}</span>
                    <span className="truncate">{entry.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Status + Hints */}
        <div className="px-3 py-1 flex flex-col gap-0.5 text-[11px]">
          <div className="font-mono text-[#e4e6eb] min-h-[16px] truncate">
            {infoText}
          </div>
          <div className="text-[#8b909a]">
            Up/Down = browse &nbsp; Space = replay &nbsp; Enter = add to next empty slot &nbsp; * = already in a slot
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-2.5 border-t border-[#34373f] bg-[#1e2025] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void playEntry(visibleItems[cursorIdx])}
              className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
            >
              Play
            </button>
            <button
              type="button"
              onClick={() => mixer.stopAll()}
              className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={pickRandom}
              className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
            >
              Random
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void addNextEmpty()}
              className="h-7 px-3 bg-[#4f8cff] hover:bg-[#4f8cff]/90 border border-[#34373f] rounded text-xs font-medium text-white cursor-pointer"
            >
              Add to next empty slot
            </button>
            <button
              type="button"
              onClick={() => void addSelectedSlot()}
              className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
            >
              Put in selected slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
