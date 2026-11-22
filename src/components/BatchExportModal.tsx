import React, { useState } from 'react';
import { X } from 'lucide-react';

interface BatchExportModalProps {
  open: boolean;
  running: boolean;
  progress: { current: number; total: number } | null;
  onStart: (count: number) => void;
  onClose: () => void;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  open,
  running,
  progress,
  onStart,
  onClose,
}) => {
  const [countInput, setCountInput] = useState<string>('5');

  if (!open) return null;

  const parsed = parseInt(countInput, 10);
  const valid = !Number.isNaN(parsed) && parsed >= 1 && parsed <= 500;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label="Batch ZIP Export"
        className="w-full max-w-sm bg-[#16171b] border border-[#34373f] rounded overflow-hidden"
      >
        <div className="px-3 py-2 bg-[#1e2025] border-b border-[#34373f] flex items-center justify-between">
          <span className="text-xs font-medium text-[#e4e6eb]">
            Batch: generate several ZIPs
          </span>
          {!running && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-[#363a43] text-[#8b909a] hover:text-[#e4e6eb] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col gap-3 text-xs text-[#e4e6eb]">
          <p className="text-[#8b909a] leading-relaxed">
            Auto-fills 64 slots, exports to the next sequential ZIP, clears, and repeats. Samples used in one pack are excluded from following packs.
          </p>

          <label className="flex flex-col gap-1">
            <span>How many ZIP packs to generate? (1–500)</span>
            <input
              type="number"
              min={1}
              max={500}
              disabled={running}
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              className="h-8 px-2.5 bg-[#1e2025] border border-[#34373f] focus:border-[#4f8cff] rounded font-mono text-xs text-[#e4e6eb] outline-none"
            />
          </label>

          {progress && (
            <div className="flex flex-col gap-1">
              <div className="font-mono text-xs text-[#e4e6eb]">
                Batch: {progress.current}/{progress.total} packs written
              </div>
              <div className="w-full h-2 bg-[#1e2025] border border-[#34373f] rounded overflow-hidden">
                <div
                  className="h-full bg-[#4f8cff] transition-all duration-150"
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.current / progress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-3 py-2.5 bg-[#1e2025] border-t border-[#34373f] flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={running}
            onClick={onClose}
            className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] disabled:opacity-40 border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={running || !valid}
            onClick={() => valid && onStart(parsed)}
            className="h-7 px-3 bg-[#4f8cff] hover:bg-[#4f8cff]/90 disabled:opacity-40 border border-[#34373f] rounded text-xs font-medium text-white cursor-pointer"
          >
            {running ? 'Generating...' : 'Generate ZIPs'}
          </button>
        </div>
      </div>
    </div>
  );
};
