import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { BUDGET, CATEGORY_NAMES, NUM_SLOTS } from '../grab64/constants';

interface ControlSidebarProps {
  categoryCounts: Record<string, number>;
  favorLarge: boolean;
  filledCount: number;
  usedBytes: number;
  hasSelectedSlot: boolean;
  hasSelectedSample: boolean;
  exportFolderName: string | null;
  nextZipNum: number;
  busy: boolean;
  onAddFour: (cat: string) => void;
  onToggleFavor: () => void;
  onOpenAudition: () => void;
  onAutofill: () => void;
  onPreviewSelected: () => void;
  onRerollSelected: () => void;
  onClearSelected: () => void;
  onClearAll: () => void;
  onExportZip: () => void;
  onOpenBatch: () => void;
  onPickExportFolder: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  categoryCounts,
  favorLarge,
  filledCount,
  usedBytes,
  hasSelectedSlot,
  hasSelectedSample,
  exportFolderName,
  nextZipNum,
  busy,
  onAddFour,
  onToggleFavor,
  onOpenAudition,
  onAutofill,
  onPreviewSelected,
  onRerollSelected,
  onClearSelected,
  onClearAll,
  onExportZip,
  onOpenBatch,
  onPickExportFolder,
}) => {
  const [catFilter, setCatFilter] = useState('');

  const filteredCategories = useMemo(() => {
    const q = catFilter.trim().toLowerCase();
    if (!q) return CATEGORY_NAMES;
    return CATEGORY_NAMES.filter((c) => c.toLowerCase().includes(q));
  }, [catFilter]);

  const pct = Math.min(100, (usedBytes / BUDGET) * 100);
  const nextZipLabel = `grab64_${String(nextZipNum).padStart(3, '0')}.zip`;

  return (
    <aside className="w-full lg:w-[460px] xl:w-[500px] shrink-0 h-full flex flex-col gap-2 overflow-y-auto pr-0.5 select-none">
      {/* Category Grid Section */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[#e4e6eb]">
            Add 4 samples from category:
          </span>
          <div className="relative w-40">
            <Search className="w-3 h-3 text-[#8b909a] absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              placeholder="Filter categories..."
              className="w-full h-6 pl-6 pr-2 bg-[#1e2025] border border-[#34373f] focus:border-[#4f8cff] rounded text-[11px] text-[#e4e6eb] placeholder-[#8b909a] outline-none"
            />
          </div>
        </div>

        <div className="h-[212px] bg-[#1e2025] border border-[#34373f] rounded p-1.5 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
            {filteredCategories.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  disabled={busy}
                  onClick={() => onAddFour(cat)}
                  title={`Add 4 ${cat} samples (${count} available)`}
                  className={`px-1.5 py-1 text-[11px] text-left rounded border border-[#34373f] truncate transition-colors cursor-pointer disabled:opacity-50 ${
                    count > 0
                      ? 'bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white text-[#e4e6eb]'
                      : 'bg-[#16171b] hover:bg-[#2a2d34]/60 text-[#8b909a]'
                  }`}
                >
                  {cat}{' '}
                  <span className="font-mono text-[10px] opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mode + Add Any + Audition */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={onToggleFavor}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          {favorLarge
            ? 'Mode: LARGER samples  (click to favor smaller)'
            : 'Mode: SMALLER samples  (click to favor LARGER)'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onAddFour('Any')}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          Add 4 from ANY category
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onOpenAudition}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          Audition samples...
        </button>
      </div>

      <div className="h-px bg-[#34373f] my-0.5" />

      {/* Slot Manipulation Actions */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={onAutofill}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs font-medium text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          {busy ? 'Loading samples...' : 'Auto-fill all 64 (balanced mix)'}
        </button>

        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            disabled={busy || !hasSelectedSample}
            onClick={onPreviewSelected}
            className="py-1.5 px-2 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-40 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
          >
            Preview selected slot
          </button>

          <button
            type="button"
            disabled={busy || !hasSelectedSlot}
            onClick={onRerollSelected}
            className="py-1.5 px-2 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-40 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
          >
            Re-roll selected slot
          </button>

          <button
            type="button"
            disabled={busy || !hasSelectedSample}
            onClick={onClearSelected}
            className="py-1.5 px-2 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-40 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
          >
            Clear selected slot
          </button>

          <button
            type="button"
            disabled={busy || filledCount === 0}
            onClick={onClearAll}
            className="py-1.5 px-2 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-40 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
          >
            Clear ALL slots
          </button>
        </div>
      </div>

      <div className="h-px bg-[#34373f] my-0.5" />

      {/* Budget & Export */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-[#e4e6eb]">
          <span>
            {filledCount}/{NUM_SLOTS} slots
          </span>
          <span>
            {(usedBytes / 1e6).toFixed(2)} MB of {(BUDGET / 1e6).toFixed(2)} MB
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#1e2025] border border-[#34373f] rounded overflow-hidden">
          <div
            className="h-full bg-[#4f8cff] transition-all duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          type="button"
          disabled={busy || filledCount === 0}
          onClick={onExportZip}
          className="w-full py-1.5 px-3 mt-1 bg-[#4f8cff] hover:bg-[#4f8cff]/90 disabled:bg-[#2a2d34] disabled:text-[#8b909a] border border-[#34373f] rounded text-xs font-medium text-white text-center transition-colors cursor-pointer"
        >
          Export 64 slots to next ZIP (grab64_001, 002...)
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onOpenBatch}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          Batch: generate several ZIPs...
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onPickExportFolder}
          className="w-full py-1.5 px-3 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] text-center transition-colors cursor-pointer"
        >
          Change export folder...
        </button>

        <div className="flex items-center justify-between text-[11px] text-[#8b909a] px-0.5">
          <span className="truncate">
            Export folder:{' '}
            {exportFolderName ? exportFolderName : '(browser downloads)'}
          </span>
          <span className="font-mono shrink-0 ml-2">Next: {nextZipLabel}</span>
        </div>
      </div>
    </aside>
  );
};
