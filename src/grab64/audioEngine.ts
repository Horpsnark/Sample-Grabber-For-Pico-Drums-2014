import {
  AUDIO_EXT,
  CATEGORIES,
  EXPORT_NAME_LEN,
  FAVOR_STRENGTH,
  MIN_WEIGHT_BYTES,
  SAMPLE_RATE,
  WAV_HEADER,
} from './constants';
import { LibraryEntry } from './types';

/**
 * Return set of categories matched by file/folder name tokens.
 * Exact port of grab64.py categorise().
 */
export function categorise(relPath: string): Set<string> {
  const tokens = relPath
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const tokset = new Set(tokens);
  const found = new Set<string>();

  for (const [cat, words] of Object.entries(CATEGORIES)) {
    for (const w of words) {
      if (w.includes(' ')) {
        const parts = w.split(' ');
        if (parts.every((part) => tokset.has(part))) {
          found.add(cat);
        }
      } else {
        for (const t of tokens) {
          if (t === w || (w.length > 3 && t.includes(w))) {
            found.add(cat);
          }
        }
      }
    }
  }

  // Avoid double-tagging where one name contains another
  if (found.has('Melody Loops')) found.delete('Melodic');
  if (found.has('Bass Loops')) found.delete('Bass');
  if (found.has('Cowbell')) found.delete('Bell');

  return found;
}

export function cleanName(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, '');
  const cleaned = withoutExt.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return cleaned.slice(0, EXPORT_NAME_LEN) || 'sample';
}

export function slotBytes(arr: Int16Array): number {
  return arr.length * 2 + WAV_HEADER;
}

export function isSupportedAudioFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return AUDIO_EXT.some((ext) => lower.endsWith(ext));
}

/**
 * Encode 16-bit mono PCM Int16Array at SAMPLE_RATE into a valid RIFF WAV buffer.
 */
export function encodeWav16Mono(pcm: Int16Array): Uint8Array {
  const dataBytes = pcm.length * 2;
  const buffer = new ArrayBuffer(WAV_HEADER + dataBytes);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // 1 channel (mono)
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  const outBytes = new Uint8Array(buffer);
  const pcmBytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  outBytes.set(pcmBytes, WAV_HEADER);
  return outBytes;
}

/**
 * Weighted random sampling without replacement (Efraimidis-Spirakis, log form).
 * Mutates pool in-place so pool.pop() returns preferred samples first.
 */
export function weightedShuffle(pool: LibraryEntry[], favorLarge: boolean): void {
  const scored = pool.map((entry) => {
    const sz = Math.max(entry.sizeBytes, MIN_WEIGHT_BYTES);
    const w = Math.pow(favorLarge ? sz : 1.0 / sz, FAVOR_STRENGTH);
    const key = Math.log(Math.random() || 1e-300) / w;
    return { entry, key };
  });
  scored.sort((a, b) => a.key - b.key);
  for (let i = 0; i < scored.length; i++) {
    pool[i] = scored[i].entry;
  }
}

interface DecodedAudioCacheItem {
  sampleRate: number;
  mono: Float32Array;
}

const decodedCache = new Map<string, DecodedAudioCacheItem>();

export function clearDecodedAudioCache(): void {
  decodedCache.clear();
}

async function decodeEntryToMono(entry: LibraryEntry, ctx: AudioContext): Promise<DecodedAudioCacheItem | null> {
  const cached = decodedCache.get(entry.id);
  if (cached) return cached;

  try {
    let arrayBuffer: ArrayBuffer;
    if (entry.sourceType === 'file' && entry.file) {
      arrayBuffer = await entry.file.arrayBuffer();
    } else if (entry.sourceType === 'url' && entry.url) {
      const resp = await fetch(entry.url);
      if (!resp.ok) return null;
      arrayBuffer = await resp.arrayBuffer();
    } else {
      return null;
    }

    // Clone buffer because decodeAudioData detaches the ArrayBuffer in some browsers
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const len = audioBuffer.length;
    const chCount = audioBuffer.numberOfChannels;
    if (len === 0 || chCount === 0) return null;

    const mono = new Float32Array(len);
    if (chCount === 1) {
      mono.set(audioBuffer.getChannelData(0));
    } else {
      for (let c = 0; c < chCount; c++) {
        const chData = audioBuffer.getChannelData(c);
        for (let i = 0; i < len; i++) {
          mono[i] += chData[i];
        }
      }
      const inv = 1 / chCount;
      for (let i = 0; i < len; i++) {
        mono[i] *= inv;
      }
    }

    const result: DecodedAudioCacheItem = {
      sampleRate: audioBuffer.sampleRate,
      mono,
    };

    if (decodedCache.size > 240) {
      const firstKey = decodedCache.keys().next().value;
      if (firstKey !== undefined) decodedCache.delete(firstKey);
    }
    decodedCache.set(entry.id, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Load audio -> { data: mono 16-bit Int16Array at 44.1kHz, more: boolean } | null.
 * `more` is true when the file had audio left that was cut off to fit.
 */
export async function loadSampleEx(
  entry: LibraryEntry,
  maxSeconds: number,
  byteLimit: number,
  ctx: AudioContext
): Promise<{ data: Int16Array; more: boolean } | null> {
  const decoded = await decodeEntryToMono(entry, ctx);
  if (!decoded) return null;

  const sr = decoded.sampleRate;
  let data: Float32Array = decoded.mono;

  // Resample via linear interpolation if sample rate differs from 44100 Hz
  if (sr !== SAMPLE_RATE && data.length > 1) {
    const targetLen = Math.floor((data.length * SAMPLE_RATE) / sr);
    if (targetLen <= 1) return null;
    const resampled = new Float32Array(targetLen);
    const scale = (data.length - 1) / (targetLen - 1);
    for (let i = 0; i < targetLen; i++) {
      const pos = i * scale;
      const idx0 = Math.floor(pos);
      const idx1 = Math.min(idx0 + 1, data.length - 1);
      const frac = pos - idx0;
      resampled[i] = data[idx0] + (data[idx1] - data[idx0]) * frac;
    }
    data = resampled;
  }

  // Trim leading silence below 0.003 threshold
  let startIdx = 0;
  while (startIdx < data.length && Math.abs(data[startIdx]) <= 0.003) {
    startIdx++;
  }
  if (startIdx > 0 && startIdx < data.length) {
    data = data.subarray(startIdx);
  } else if (startIdx >= data.length) {
    return null;
  }

  const maxN = Math.min(
    Math.floor(maxSeconds * SAMPLE_RATE),
    Math.floor((byteLimit - WAV_HEADER) / 2)
  );
  if (maxN < 100) return null;

  const cut = data.length > maxN;
  const sliceLen = Math.min(data.length, maxN);
  if (sliceLen < 100) return null;

  const sliced = new Float32Array(sliceLen);
  sliced.set(data.subarray(0, sliceLen));

  // 15ms fade out if audio was truncated
  const fade = Math.min(sliceLen, Math.floor(0.015 * SAMPLE_RATE));
  if (cut && fade > 0) {
    for (let i = 0; i < fade; i++) {
      const gain = fade > 1 ? 1 - i / (fade - 1) : 0;
      sliced[sliceLen - fade + i] *= gain;
    }
  }

  // Peak normalize to 0.95
  let peak = 0;
  for (let i = 0; i < sliceLen; i++) {
    const abs = Math.abs(sliced[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const norm = 0.95 / peak;
    for (let i = 0; i < sliceLen; i++) {
      sliced[i] *= norm;
    }
  }

  // Convert to 16-bit signed PCM
  const pcm = new Int16Array(sliceLen);
  for (let i = 0; i < sliceLen; i++) {
    const clamped = Math.max(-1, Math.min(1, sliced[i]));
    pcm[i] = Math.round(clamped * 32767);
  }

  return { data: pcm, more: cut };
}

/**
 * Polyphonic Web Audio mixer matching GRAB64's Mixer class.
 */
export class AudioMixer {
  private ctx: AudioContext | null = null;
  private activeSources: Set<AudioBufferSourceNode> = new Set();

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public play(int16Data: Int16Array): void {
    if (!int16Data || int16Data.length === 0) return;
    const ctx = this.getContext();
    const buf = ctx.createBuffer(1, int16Data.length, SAMPLE_RATE);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < int16Data.length; i++) {
      ch[i] = int16Data[i] / 32768.0;
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    this.activeSources.add(src);
    src.onended = () => {
      this.activeSources.delete(src);
    };
    src.start(0);
  }

  public stopAll(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // Ignore already stopped sources
      }
    }
    this.activeSources.clear();
  }
}

/**
 * Scan FileList or File[] (from <input webkitdirectory> or file drop).
 */
export function scanFilesToLibrary(files: FileList | File[]): LibraryEntry[] {
  const entries: LibraryEntry[] = [];
  const list = Array.from(files);

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    if (!isSupportedAudioFilename(file.name)) continue;
    const relPath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    entries.push({
      id: `file:${relPath}:${file.size}:${i}`,
      name: file.name,
      path: relPath,
      categories: categorise(relPath),
      sizeBytes: file.size || MIN_WEIGHT_BYTES,
      sourceType: 'file',
      file,
    });
  }

  return entries;
}

/**
 * Scan FileSystemDirectoryHandle recursively (File System Access API).
 */
export async function scanDirectoryHandleToLibrary(
  dirHandle: FileSystemDirectoryHandle
): Promise<LibraryEntry[]> {
  const entries: LibraryEntry[] = [];

  async function walk(handle: FileSystemDirectoryHandle, prefix: string) {
    const iter = (handle as unknown as {
      values: () => AsyncIterable<FileSystemHandle>;
    }).values();
    for await (const child of iter) {
      if (child.kind === 'directory') {
        await walk(
          child as FileSystemDirectoryHandle,
          prefix ? `${prefix}/${child.name}` : child.name
        );
      } else if (child.kind === 'file') {
        if (!isSupportedAudioFilename(child.name)) continue;
        const file = await (child as FileSystemFileHandle).getFile();
        const relPath = prefix ? `${prefix}/${child.name}` : child.name;
        entries.push({
          id: `fs:${relPath}:${file.size}`,
          name: child.name,
          path: relPath,
          categories: categorise(relPath),
          sizeBytes: file.size || MIN_WEIGHT_BYTES,
          sourceType: 'file',
          file,
        });
      }
    }
  }

  await walk(dirHandle, '');
  return entries;
}

/**
 * Scan dropped files/folders from DragEvent DataTransfer.
 */
export async function scanDataTransferToLibrary(dt: DataTransfer): Promise<LibraryEntry[]> {
  const filesWithPaths: Array<{ file: File; relPath: string }> = [];

  async function readEntry(entry: FileSystemEntry, prefix: string): Promise<void> {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      });
      if (isSupportedAudioFilename(file.name)) {
        const relPath = prefix ? `${prefix}/${file.name}` : file.name;
        filesWithPaths.push({ file, relPath });
      }
    } else if (entry.isDirectory) {
      const dirReader = (entry as FileSystemDirectoryEntry).createReader();
      const readAll = async (): Promise<FileSystemEntry[]> => {
        const all: FileSystemEntry[] = [];
        while (true) {
          const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            dirReader.readEntries(resolve, reject);
          });
          if (!batch.length) break;
          all.push(...batch);
        }
        return all;
      };
      const children = await readAll();
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      for (const child of children) {
        await readEntry(child, nextPrefix);
      }
    }
  }

  if (dt.items && dt.items.length > 0) {
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      const fsEntry = item.webkitGetAsEntry?.();
      if (fsEntry) entries.push(fsEntry);
    }
    if (entries.length > 0) {
      for (const entry of entries) {
        await readEntry(entry, '');
      }
      return filesWithPaths.map(({ file, relPath }, idx) => ({
        id: `drop:${relPath}:${file.size}:${idx}`,
        name: file.name,
        path: relPath,
        categories: categorise(relPath),
        sizeBytes: file.size || MIN_WEIGHT_BYTES,
        sourceType: 'file' as const,
        file,
      }));
    }
  }

  return scanFilesToLibrary(dt.files);
}

/**
 * Load built-in studio sample manifest (/samples/manifest.json) for instant use.
 */
export async function loadBuiltinLibrary(): Promise<LibraryEntry[]> {
  const resp = await fetch('/samples/manifest.json');
  if (!resp.ok) {
    throw new Error('Could not load built-in sample manifest.');
  }
  const items: Array<{ name: string; file: string; category?: string }> = await resp.json();

  const entries: LibraryEntry[] = await Promise.all(
    items.map(async (item, idx) => {
      let sizeBytes = 48000;
      try {
        const head = await fetch(item.file, { method: 'HEAD' });
        const lenHeader = head.headers.get('content-length');
        if (lenHeader) {
          const parsed = parseInt(lenHeader, 10);
          if (!Number.isNaN(parsed) && parsed > 0) sizeBytes = parsed;
        }
      } catch {
        // Fallback size if HEAD fails
      }
      const cats = categorise(item.name);
      return {
        id: `builtin:${item.file}:${idx}`,
        name: item.name,
        path: item.name,
        categories: cats,
        sizeBytes,
        sourceType: 'url' as const,
        url: item.file,
      };
    })
  );

  return entries;
}
