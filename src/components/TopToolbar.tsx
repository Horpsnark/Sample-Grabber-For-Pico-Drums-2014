import React from 'react';
import { FolderOpen, Library, Square, Upload } from 'lucide-react';

interface TopToolbarProps {
  libraryCount: number;
  statusText: string | null;
  busy: boolean;
  onChooseFolder: () => void;
  onChooseFiles: () => void;
  onLoadBuiltin: () => void;
  onStopAudio: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  libraryCount,
  statusText,
  busy,
  onChooseFolder,
  onChooseFiles,
  onLoadBuiltin,
  onStopAudio,
}) => {
  return (
    <header className="h-12 shrink-0 bg-[#1e2025] border-b border-[#34373f] px-4 flex items-center justify-between gap-3 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-baseline gap-2 shrink-0">
          <span className="font-mono text-sm font-semibold tracking-wider text-[#e4e6eb]">
            GRAB64
          </span>
          <span className="text-[11px] text-[#8b909a] hidden sm:inline">
            64-Slot 44.1kHz Mono Bank Builder
          </span>
        </div>

        <div className="h-4 w-px bg-[#34373f] shrink-0" />

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={onChooseFolder}
            className="h-7 px-2.5 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#8b909a]" />
            <span>Choose sample folder...</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onChooseFiles}
            title="Select individual audio files"
            className="h-7 px-2.5 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#8b909a]" />
            <span className="hidden md:inline">Add files...</span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onLoadBuiltin}
            className="h-7 px-2.5 bg-[#2a2d34] hover:bg-[#363a43] active:bg-[#4f8cff] active:text-white disabled:opacity-50 border border-[#34373f] rounded text-xs text-[#e4e6eb] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Library className="w-3.5 h-3.5 text-[#4f8cff]" />
            <span>Load Built-in (100)</span>
          </button>
        </div>

        <span className="text-xs font-mono text-[#8b909a] truncate ml-1">
          {statusText ??
            (libraryCount > 0
              ? `${libraryCount} samples found`
              : 'No library loaded (or drop a folder anywhere)')}
        </span>
      </div>

      <button
        type="button"
        onClick={onStopAudio}
        title="Stop all playing audio"
        className="h-7 px-2.5 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
      >
        <Square className="w-3 h-3 fill-current text-[#8b909a]" />
        <span>Stop Audio</span>
      </button>
    </header>
  );
};
