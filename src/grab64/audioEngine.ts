import {
  AUDIO_EXT,
  CATEGORIES,
  CATEGORY_NAMES,
  EXPORT_NAME_LEN,
  FAVOR_STRENGTH,
  MIN_WEIGHT_BYTES,
  SAMPLE_RATE,
  WAV_HEADER,
} from './constants';
import { LibraryEntry, LibraryState } from './types';

// Precompute inverted keyword index once at module load for O(tokens) categorise()
const EXACT_WORD_TO_CATS = new Map<string, string[]>();
const SUBSTR_WORDS: Array<[string, string]> = [];
const PHRASE_WORDS: Array<[string[], string]> = [];

for (const [cat, words] of Object.entries(CATEGORIES)) {
  for (const w of words) {
    if (w.includes(' ')) {
      PHRASE_WORDS.push([w.split(' '), cat]);
    } else {
      const existing = EXACT_WORD_TO_CATS.get(w);
      if (existing) {
        existing.push(cat);
      } else {
        EXACT_WORD_TO_CATS.set(w, [cat]);
      }
      if (w.length > 3) {
        SUBSTR_WORDS.push([w, cat]);
      }
    }
  }
}

const TOKEN_CAT_CACHE = new Map<string, string[]>();
const EMPTY_CATS: readonly string[] = Object.freeze([]);
const CAT_ARRAY_INTERN = new Map<string, readonly string[]>();

function catsForToken(tok: string): string[] {
  const cached = TOKEN_CAT_CACHE.get(tok);
  if (cached !== undefined) return cached;

  const hits: string[] = [];
  const exact = EXACT_WORD_TO_CATS.get(tok);
  if (exact) {
    for (let i = 0; i < exact.length; i++) hits.push(exact[i]);
  }
  if (tok.length > 3) {
    for (let i = 0; i < SUBSTR_WORDS.length; i++) {
      const [w, cat] = SUBSTR_WORDS[i];
      if (w !== tok && tok.includes(w)) {
        hits.push(cat);
      }
    }
  }

  if (TOKEN_CAT_CACHE.size < 120000) {
    TOKEN_CAT_CACHE.set(tok, hits);
  }
  return hits;
}

/**
 * Return compact interned readonly array of categories matched by file/folder name tokens.
 * Exact port of grab64.py categorise(), optimized for 380k+ files.
 */
export function categorise(relPath: string): readonly string[] {
  const tokens = relPath.toLowerCase().split(/[^a-z0-9]+/);
  const tokset = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]) tokset.add(tokens[i]);
  }
  if (tokset.size === 0) return EMPTY_CATS;

  const found = new Set<string>();
  for (const t of tokset) {
    const hits = catsForToken(t);
    for (let i = 0; i < hits.length; i++) {
      found.add(hits[i]);
    }
  }

  for (let i = 0; i < PHRASE_WORDS.length; i++) {
    const [parts, cat] = PHRASE_WORDS[i];
    let allPresent = true;
    for (let j = 0; j < parts.length; j++) {
      if (!tokset.has(parts[j])) {
        allPresent = false;
        break;
      }
    }
    if (allPresent) found.add(cat);
  }

  // Avoid double-tagging where one name contains another
  if (found.has('Melody Loops')) found.delete('Melodic');
  if (found.has('Bass Loops')) found.delete('Bass');
  if (found.has('Cowbell')) found.delete('Bell');

  if (found.size === 0) return EMPTY_CATS;
  const sorted = Array.from(found).sort();
  const key = sorted.join('|');
  let interned = CAT_ARRAY_INTERN.get(key);
  if (!interned) {
    interned = Object.freeze(sorted);
    if (CAT_ARRAY_INTERN.size < 4096) {
      CAT_ARRAY_INTERN.set(key, interned);
    }
  }
  return interned;
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

export function createEmptyLibraryState(): LibraryState {
  const byCategory = new Map<string, LibraryEntry[]>();
  const categoryCounts: Record<string, number> = {};
  for (const cat of CATEGORY_NAMES) {
    byCategory.set(cat, []);
    categoryCounts[cat] = 0;
  }
  return {
    entries: [],
    byCategory,
    categoryCounts,
    byPath: new Map<string, LibraryEntry>(),
  };
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function buildLibraryState(
  entries: LibraryEntry[],
  onProgress?: (count: number) => void
): Promise<LibraryState> {
  const state = createEmptyLibraryState();
  state.entries = entries;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    state.byPath.set(entry.path, entry);
    const cats = entry.categories;
    for (let c = 0; c < cats.length; c++) {
      const cat = cats[c];
      const bucket = state.byCategory.get(cat);
      if (bucket) {
        bucket.push(entry);
        state.categoryCounts[cat] = bucket.length;
      }
    }
    if (i > 0 && i % 5000 === 0) {
      onProgress?.(i);
      await yieldToMain();
    }
  }
  onProgress?.(entries.length);
  return state;
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
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataBytes, true);

  const outBytes = new Uint8Array(buffer);
  const pcmBytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  outBytes.set(pcmBytes, WAV_HEADER);
  return outBytes;
}

interface ScoredCandidate {
  entry: LibraryEntry;
  key: number;
}

function siftDownMinHeap(heap: ScoredCandidate[], idx: number): void {
  const n = heap.length;
  while (true) {
    let smallest = idx;
    const left = idx * 2 + 1;
    const right = idx * 2 + 2;
    if (left < n && heap[left].key < heap[smallest].key) smallest = left;
    if (right < n && heap[right].key < heap[smallest].key) smallest = right;
    if (smallest === idx) break;
    const tmp = heap[idx];
    heap[idx] = heap[smallest];
    heap[smallest] = tmp;
    idx = smallest;
  }
}

/**
 * Weighted random sampling without replacement (Efraimidis-Spirakis, log form).
 * Mutates pool in-place so pool.pop() returns preferred samples first.
 * When maxPick is given and pool is huge, maintains an O(N log k) min-heap
 * instead of allocating/sorting 380k+ objects.
 */
export function weightedShuffle(
  pool: LibraryEntry[],
  favorLarge: boolean,
  maxPick?: number
): void {
  if (maxPick !== undefined && pool.length > maxPick * 2) {
    const heap: ScoredCandidate[] = [];
    for (let i = 0; i < pool.length; i++) {
      const entry = pool[i];
      const sz = Math.max(entry.sizeBytes, MIN_WEIGHT_BYTES);
      const w = Math.pow(favorLarge ? sz : 1.0 / sz, FAVOR_STRENGTH);
      const key = Math.log(Math.random() || 1e-300) / w;

      if (heap.length < maxPick) {
        heap.push({ entry, key });
        if (heap.length === maxPick) {
          for (let j = Math.floor(maxPick / 2) - 1; j >= 0; j--) {
            siftDownMinHeap(heap, j);
          }
        }
      } else if (key > heap[0].key) {
        heap[0] = { entry, key };
        siftDownMinHeap(heap, 0);
      }
    }
    heap.sort((a, b) => a.key - b.key);
    pool.length = heap.length;
    for (let i = 0; i < heap.length; i++) {
      pool[i] = heap[i].entry;
    }
    return;
  }

  const scored: ScoredCandidate[] = new Array(pool.length);
  for (let i = 0; i < pool.length; i++) {
    const entry = pool[i];
    const sz = Math.max(entry.sizeBytes, MIN_WEIGHT_BYTES);
    const w = Math.pow(favorLarge ? sz : 1.0 / sz, FAVOR_STRENGTH);
    const key = Math.log(Math.random() || 1e-300) / w;
    scored[i] = { entry, key };
  }
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

async function decodeEntryToMono(
  entry: LibraryEntry,
  ctx: AudioContext
): Promise<DecodedAudioCacheItem | null> {
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

  const fade = Math.min(sliceLen, Math.floor(0.015 * SAMPLE_RATE));
  if (cut && fade > 0) {
    for (let i = 0; i < fade; i++) {
      const gain = fade > 1 ? 1 - i / (fade - 1) : 0;
      sliced[sliceLen - fade + i] *= gain;
    }
  }

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
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
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
 * Chunked async scan of FileList or File[] (yields every 2,500 files so 380k+ files never freeze the browser).
 */
export async function scanFilesToLibrary(
  files: FileList | File[],
  onProgress?: (count: number) => void
): Promise<LibraryEntry[]> {
  const entries: LibraryEntry[] = [];
  const len = files.length;

  for (let i = 0; i < len; i++) {
    const file = files[i];
    if (file && isSupportedAudioFilename(file.name)) {
      const relPath =
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name;
      entries.push({
        id: String(i),
        name: file.name,
        path: relPath,
        categories: categorise(relPath),
        sizeBytes: file.size || MIN_WEIGHT_BYTES,
        sourceType: 'file',
        file,
      });
    }
    if (i > 0 && i % 2500 === 0) {
      onProgress?.(entries.length);
      await yieldToMain();
    }
  }

  onProgress?.(entries.length);
  return entries;
}

/**
 * Iterative scan of FileSystemDirectoryHandle (avoids deep recursion and yields regularly).
 */
export async function scanDirectoryHandleToLibrary(
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (count: number) => void
): Promise<LibraryEntry[]> {
  const entries: LibraryEntry[] = [];
  const stack: Array<{ handle: FileSystemDirectoryHandle; prefix: string }> = [
    { handle: dirHandle, prefix: '' },
  ];
  let visited = 0;

  while (stack.length > 0) {
    const { handle, prefix } = stack.pop()!;
    try {
      const iter = (
        handle as unknown as {
          values: () => AsyncIterable<FileSystemHandle>;
        }
      ).values();

      for await (const child of iter) {
        visited++;
        if (child.kind === 'directory') {
          stack.push({
            handle: child as FileSystemDirectoryHandle,
            prefix: prefix ? `${prefix}/${child.name}` : child.name,
          });
        } else if (child.kind === 'file') {
          if (!isSupportedAudioFilename(child.name)) continue;
          try {
            const file = await (child as FileSystemFileHandle).getFile();
            const relPath = prefix ? `${prefix}/${child.name}` : child.name;
            entries.push({
              id: String(entries.length),
              name: child.name,
              path: relPath,
              categories: categorise(relPath),
              sizeBytes: file.size || MIN_WEIGHT_BYTES,
              sourceType: 'file',
              file,
            });
          } catch {
            // Skip unreadable file
          }
        }
        if (visited % 2000 === 0) {
          onProgress?.(entries.length);
          await yieldToMain();
        }
      }
    } catch {
      // Skip unreadable directory
    }
  }

  onProgress?.(entries.length);
  return entries;
}

/**
 * Iterative scan of dropped files/folders from DragEvent DataTransfer.
 */
export async function scanDataTransferToLibrary(
  dt: DataTransfer,
  onProgress?: (count: number) => void
): Promise<LibraryEntry[]> {
  const entries: LibraryEntry[] = [];

  if (dt.items && dt.items.length > 0) {
    const stack: Array<{ entry: FileSystemEntry; prefix: string }> = [];
    for (let i = 0; i < dt.items.length; i++) {
      const fsEntry = dt.items[i].webkitGetAsEntry?.();
      if (fsEntry) stack.push({ entry: fsEntry, prefix: '' });
    }

    if (stack.length > 0) {
      let processed = 0;
      while (stack.length > 0) {
        const { entry, prefix } = stack.pop()!;
        processed++;
        if (entry.isFile) {
          if (isSupportedAudioFilename(entry.name)) {
            try {
              const file = await new Promise<File>((resolve, reject) => {
                (entry as FileSystemFileEntry).file(resolve, reject);
              });
              const relPath = prefix ? `${prefix}/${file.name}` : file.name;
              entries.push({
                id: String(entries.length),
                name: file.name,
                path: relPath,
                categories: categorise(relPath),
                sizeBytes: file.size || MIN_WEIGHT_BYTES,
                sourceType: 'file',
                file,
              });
            } catch {
              // Skip unreadable file
            }
          }
        } else if (entry.isDirectory) {
          try {
            const dirReader = (entry as FileSystemDirectoryEntry).createReader();
            const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
            while (true) {
              const batch = await new Promise<FileSystemEntry[]>(
                (resolve, reject) => {
                  dirReader.readEntries(resolve, reject);
                }
              );
              if (!batch.length) break;
              for (let b = 0; b < batch.length; b++) {
                stack.push({ entry: batch[b], prefix: nextPrefix });
              }
            }
          } catch {
            // Skip unreadable directory
          }
        }
        if (processed % 1500 === 0) {
          onProgress?.(entries.length);
          await yieldToMain();
        }
      }

      onProgress?.(entries.length);
      return entries;
    }
  }

  return scanFilesToLibrary(dt.files, onProgress);
}

/**
 * Load built-in studio sample manifest (/samples/manifest.json) for instant use.
 */
export async function loadBuiltinLibrary(): Promise<LibraryEntry[]> {
  const resp = await fetch('/samples/manifest.json');
  if (!resp.ok) {
    throw new Error('Could not load built-in sample manifest.');
  }
  const items: Array<{ name: string; file: string; category?: string }> =
    await resp.json();

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
