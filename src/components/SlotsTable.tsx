import React, { useEffect, useRef } from 'react';
import { Play, RefreshCw, X } from 'lucide-react';
import { SAMPLE_RATE } from '../grab64/constants';
import { slotBytes } from '../grab64/audioEngine';
import { SlotSample } from '../grab64/types';

interface SlotsTableProps {
  slots: Array<SlotSample | null>;
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  onPreview: (idx: number) => void;
  onReroll: (idx: number) => void;
  onClear: (idx: number) => void;
}

export const SlotsTable: React.FC<SlotsTableProps> = ({
  slots,
  selectedIdx,
  onSelect,
  onPreview,
  onReroll,
  onClear,
}) => {
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  useEffect(() => {
    if (selectedIdx !== null && rowRefs.current[selectedIdx]) {
      rowRefs.current[selectedIdx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIdx]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = selectedIdx === null ? 0 : Math.min(slots.length - 1, selectedIdx + 1);
      onSelect(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = selectedIdx === null ? 0 : Math.max(0, selectedIdx - 1);
      onSelect(prev);
    } else if (e.key === ' ' && selectedIdx !== null) {
      e.preventDefault();
      onPreview(selectedIdx);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx !== null) {
      e.preventDefault();
      onClear(selectedIdx);
    } else if ((e.key === 'r' || e.key === 'R') && selectedIdx !== null) {
      e.preventDefault();
      onReroll(selectedIdx);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="64 Sample Slots"
      className="flex-1 min-w-0 h-full bg-[#1e2025] border border-[#34373f] rounded overflow-y-auto outline-none focus:border-[#4f8cff]"
    >
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-[#2a2d34] border-b border-[#34373f] text-[#8b909a] select-none">
          <tr>
            <th className="py-1.5 px-2.5 font-medium w-10 text-right">#</th>
            <th className="py-1.5 px-2.5 font-medium">Name</th>
            <th className="py-1.5 px-2.5 font-medium w-36">Category</th>
            <th className="py-1.5 px-2.5 font-medium w-20 text-right">Duration</th>
            <th className="py-1.5 px-2.5 font-medium w-16 text-right">KB</th>
            <th className="py-1.5 px-2 font-medium w-20 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262930]">
          {slots.map((slot, idx) => {
            const isSelected = selectedIdx === idx;
            const kb = slot ? Math.floor(slotBytes(slot.data) / 1024) : null;
            const secs = slot ? (slot.data.length / SAMPLE_RATE).toFixed(2) : null;

            return (
              <tr
                key={idx}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                onClick={() => onSelect(idx)}
                onDoubleClick={() => {
                  onSelect(idx);
                  if (slot) onPreview(idx);
                }}
                className={`group cursor-pointer select-none transition-colors ${
                  isSelected
                    ? 'bg-[#4f8cff] text-white'
                    : 'hover:bg-[#2a2d34]/70 text-[#e4e6eb]'
                }`}
              >
                <td
                  className={`py-1 px-2.5 font-mono text-right ${
                    isSelected ? 'text-white/90' : 'text-[#8b909a]'
                  }`}
                >
                  {idx + 1}
                </td>
                <td className="py-1 px-2.5 font-mono truncate max-w-[220px]">
                  {slot ? (
                    <span title={slot.path}>{slot.name}</span>
                  ) : (
                    <span className={isSelected ? 'text-white/60' : 'text-[#8b909a]/50'}>
                      -
                    </span>
                  )}
                </td>
                <td
                  className={`py-1 px-2.5 truncate ${
                    isSelected ? 'text-white/90' : 'text-[#8b909a]'
                  }`}
                >
                  {slot ? slot.cat : ''}
                </td>
                <td
                  className={`py-1 px-2.5 font-mono text-right ${
                    isSelected ? 'text-white/90' : 'text-[#8b909a]'
                  }`}
                >
                  {secs !== null ? `${secs}s` : ''}
                </td>
                <td
                  className={`py-1 px-2.5 font-mono text-right ${
                    isSelected ? 'text-white/90' : 'text-[#8b909a]'
                  }`}
                >
                  {kb !== null ? kb : ''}
                </td>
                <td className="py-0.5 px-2 text-right">
                  <div
                    className={`inline-flex items-center justify-end gap-0.5 ${
                      isSelected
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                    }`}
                  >
                    {slot && (
                      <button
                        type="button"
                        title="Preview slot (Space)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(idx);
                          onPreview(idx);
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isSelected
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-[#363a43] text-[#e4e6eb]'
                        }`}
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Re-roll slot (R)"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(idx);
                        onReroll(idx);
                      }}
                      className={`p-1 rounded cursor-pointer ${
                        isSelected
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-[#363a43] text-[#e4e6eb]'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    {slot && (
                      <button
                        type="button"
                        title="Clear slot (Del)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(idx);
                          onClear(idx);
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isSelected
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-[#363a43] text-[#e4e6eb]'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
