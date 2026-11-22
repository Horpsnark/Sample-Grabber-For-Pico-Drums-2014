import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BUDGET, CATEGORY_NAMES, MAX_SECONDS, SAMPLE_RATE } from '../grab64/constants';
import { AudioMixer, loadSampleEx, slotBytes } from '../grab64/audioEngine';
import { LibraryEntry, SlotSample } from '../grab64/types';

interface AuditionModalProps {
  open: boolean;
  library: LibraryEntry[];
  slots: Array<SlotSample | null>;
  selectedSlotIdx: number | null;
  favorLarge: boolean;
  lenScale: number;
  mixer: AudioMixer;
  onPutSample: (slotIdx: number, entry: LibraryEntry, cat: string) => Promise<boolean>;
  onClose: () => void;
}

export const AuditionModal: React.FC<AuditionModalProps> = ({
  open,
  library,
  slots,
  selectedSlotIdx,
  favorLarge,
  lenScale,
  mixer,
  onPutSample,
  onClose,
}) => {
  const [category, setCategory] = useState<string>('All');
  const [autoPlay, setAutoPlay] = useState<boolean>(true);
  const [cursorIdx, setCursorIdx] = useState<number>(0);
  const [infoText, setInfoText] = useState<string>('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const audCacheRef = useRef<Map<string, Int16Array | null>>(new Map());

  // Clear audition cache when library or length mode changes
  useEffect(() => {
    audCacheRef.current.clear();
  }, [library, favorLarge]);

  const usedPaths = useMemo(() => {
    const set = new Set<string>();
    for (const s of slots) {
      if (s) set.add(s.path);
    }
    return set;
  }, [slots]);

  const filtered = useMemo(() => {
    const items =
      category === 'All'
        ? [...library]
        : library.filter((entry) => entry.categories.has(category));
    items.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    return items;
  }, [library, category]);

  useEffect(() => {
    if (open) {
      setCursorIdx(0);
      setInfoText(`${filtered.length} samples`);
      setTimeout(() => listRef.current?.focus(), 0);
    }
  }, [open, category, filtered.length]);

  const catFor = useCallback(
    (entry: LibraryEntry): string => {
      if (category !== 'All') return category;
      if (entry.categories.size > 0) {
        return Array.from(entry.categories).sort()[0];
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

  const selectIndex = useCallback(
    (idx: number, forcePlay = false) => {
      if (idx < 0 || idx >= filtered.length) return;
      setCursorIdx(idx);
      itemRefs.current[idx]?.scrollIntoView({ block: 'nearest' });
      if (autoPlay || forcePlay) {
        void playEntry(filtered[idx]);
      }
    },
    [filtered, autoPlay, playEntry]
  );

  const putInSlot = useCallback(
    async (slotIdx: number) => {
      const entry = filtered[cursorIdx];
      if (!entry) return;
      const ok = await onPutSample(slotIdx, entry, catFor(entry));
      if (ok) {
        setInfoText(`${entry.name} -> slot ${slotIdx + 1}`);
        if (cursorIdx + 1 < filtered.length) {
          selectIndex(cursorIdx + 1);
        }
      } else {
        setInfoText("Won't fit in the remaining size budget");
      }
    },
    [filtered, cursorIdx, onPutSample, catFor, selectIndex]
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
    if (filtered.length === 0) return;
    const nextIdx = Math.floor(Math.random() * filtered.length);
    selectIndex(nextIdx, true);
  }, [filtered.length, selectIndex]);

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
      selectIndex(Math.min(filtered.length - 1, cursorIdx + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectIndex(Math.max(0, cursorIdx - 1));
    } else if (e.key === ' ') {
      e.preventDefault();
      void playEntry(filtered[cursorIdx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void addNextEmpty();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label="GRAB64 - Audition"
        className="w-full max-w-[520px] h-[540px] bg-[#16171b] border border-[#34373f] rounded flex flex-col overflow-hidden"
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
        <div className="px-3 py-2 flex items-center gap-3 border-b border-[#34373f] text-xs">
          <label className="flex items-center gap-2 text-[#e4e6eb]">
            <span>Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-7 px-2 bg-[#1e2025] border border-[#34373f] rounded text-xs text-[#e4e6eb] outline-none focus:border-[#4f8cff]"
            >
              <option value="All">All</option>
              {CATEGORY_NAMES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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
        </div>

        {/* Sample List */}
        <div
          ref={listRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="flex-1 m-2 bg-[#1e2025] border border-[#34373f] rounded overflow-y-auto outline-none focus:border-[#4f8cff]"
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-xs text-[#8b909a]">
              No samples in this category.
            </div>
          ) : (
            filtered.map((entry, idx) => {
              const isSelected = idx === cursorIdx;
              const isUsed = usedPaths.has(entry.path);
              return (
                <button
                  key={entry.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => selectIndex(idx)}
                  onDoubleClick={() => void addNextEmpty()}
                  className={`w-full px-2.5 py-1 text-left font-mono text-xs flex items-center gap-1.5 cursor-pointer truncate ${
                    isSelected
                      ? 'bg-[#4f8cff] text-white'
                      : 'hover:bg-[#2a2d34] text-[#e4e6eb]'
                  }`}
                >
                  <span className="w-3 shrink-0">{isUsed ? '*' : ' '}</span>
                  <span className="truncate">{entry.name}</span>
                </button>
              );
            })
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
              onClick={() => void playEntry(filtered[cursorIdx])}
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
