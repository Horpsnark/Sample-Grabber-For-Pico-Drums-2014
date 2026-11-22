import JSZip from 'jszip';
import { SAMPLE_RATE } from './constants';
import { encodeWav16Mono, slotBytes } from './audioEngine';
import { SlotSample } from './types';

export interface ZipWriteResult {
  filename: string;
  zipBlob: Blob;
  count: number;
  totalBytes: number;
  savedToFolder: boolean;
}

export function formatZipFilename(num: number): string {
  return `grab64_${String(num).padStart(3, '0')}.zip`;
}

/**
 * Inspect an export directory handle to find the next free grab64_NNN.zip number,
 * matching App.next_zip_number() in grab64.py.
 */
export async function getNextZipNumberInDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fallbackNext: number
): Promise<number> {
  try {
    let maxNum = 0;
    const iter = (dirHandle as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    }).values();
    for await (const entry of iter) {
      if (entry.kind === 'file') {
        const match = entry.name.match(/^grab64_(\d+)\.zip$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > maxNum) maxNum = n;
        }
      }
    }
    return Math.max(maxNum + 1, fallbackNext);
  } catch {
    return fallbackNext;
  }
}

/**
 * Write current slots to grab64_NNN.zip with inner folder grab64_NNN/,
 * 01_name.wav .. 64_name.wav, and slots.txt manifest.
 */
export async function buildGrab64Zip(
  slots: Array<SlotSample | null>,
  zipNumber: number,
  exportDirHandle?: FileSystemDirectoryHandle | null
): Promise<ZipWriteResult> {
  const filled = slots
    .map((s, idx) => ({ idx, s }))
    .filter((item): item is { idx: number; s: SlotSample } => item.s !== null);

  const inner = `grab64_${String(zipNumber).padStart(3, '0')}`;
  const filename = `${inner}.zip`;
  const zip = new JSZip();
  const folder = zip.folder(inner);
  if (!folder) {
    throw new Error('Failed to create ZIP inner folder.');
  }

  let totalBytes = 0;
  const manifestLines: string[] = [];

  for (const { idx, s } of filled) {
    const wavBytes = encodeWav16Mono(s.data);
    const slotNum = String(idx + 1).padStart(2, '0');
    folder.file(`${slotNum}_${s.name}.wav`, wavBytes);
    totalBytes += slotBytes(s.data);
    manifestLines.push(
      `${slotNum}  ${s.cat.padEnd(18, ' ')} ${s.name}  <- ${s.path}`
    );
  }

  const slotsTxt = `${SAMPLE_RATE} Hz, 16-bit mono, ${totalBytes} bytes total\n${manifestLines.join('\n')}`;
  folder.file('slots.txt', slotsTxt);

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  let savedToFolder = false;
  if (exportDirHandle) {
    try {
      const fileHandle = await exportDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(zipBlob);
      await writable.close();
      savedToFolder = true;
    } catch {
      savedToFolder = false;
    }
  }

  return {
    filename,
    zipBlob,
    count: filled.length,
    totalBytes,
    savedToFolder,
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
