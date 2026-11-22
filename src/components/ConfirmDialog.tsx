import React from 'react';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Export anyway',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-sm bg-[#16171b] border border-[#34373f] rounded overflow-hidden"
      >
        <div className="px-3 py-2 bg-[#1e2025] border-b border-[#34373f] flex items-center justify-between">
          <span className="text-xs font-medium text-[#e4e6eb]">{title}</span>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded hover:bg-[#363a43] text-[#8b909a] hover:text-[#e4e6eb] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 text-xs text-[#e4e6eb] leading-relaxed">{message}</div>

        <div className="px-3 py-2.5 bg-[#1e2025] border-t border-[#34373f] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-7 px-3 bg-[#2a2d34] hover:bg-[#363a43] border border-[#34373f] rounded text-xs text-[#e4e6eb] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-7 px-3 bg-[#4f8cff] hover:bg-[#4f8cff]/90 border border-[#34373f] rounded text-xs font-medium text-white cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
