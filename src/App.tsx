import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  AUTOFILL_PLAN,
  BUDGET,
  MAX_SECONDS,
  MAXIMISE_TIME,
  MIN_SLOT_BYTES,
  NUM_SLOTS,
  SAMPLE_RATE,
  SMALL_LEN_SCALE,
  WAV_HEADER,
} from './grab64/constants';
import {
  AudioMixer,
  buildLibraryState,
  clearDecodedAudioCache,
  cleanName,
  createEmptyLibraryState,
  loadBuiltinLibrary,
  loadSampleEx,
  scanDataTransferToLibrary,
  scanDirectoryHandleToLibrary,
  scanFilesToLibrary,
  slotBytes,
  weightedShuffle,
} from './grab64/audioEngine';
import {
  buildGrab64Zip,
  getNextZipNumberInDirectory,
  triggerBlobDownload,
} from './grab64/zipExport';
import {
  LibraryEntry,
  LibraryState,
  NoticeMessage,
  SlotSample,
} from './grab64/types';
import { TopToolbar } from './components/TopToolbar';
import { SlotsTable } from './components/SlotsTable';
import { ControlSidebar } from './components/ControlSidebar';
import { AuditionModal } from './components/AuditionModal';
import { BatchExportModal } from './components/BatchExportModal';
import { ConfirmDialog } from './components/ConfirmDialog';

const NEXT_ZIP_STORAGE_KEY = 'grab64_next_zip';

function getStoredNextZipNum(): number {
  try {
    const raw = localStorage.getItem(NEXT_ZIP_STORAGE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= 1) return n;
    }
  } catch {
    // Ignore storage errors
  }
  return 1;
}

function saveNextZipNum(num: number): void {
  try {
    localStorage.setItem(NEXT_ZIP_STORAGE_KEY, String(num));
  } catch {
    // Ignore storage errors
  }
}

function calcUsedBytes(slots: Array<SlotSample | null>): number {
  let total = 0;
  for (const s of slots) {
    if (s) total += slotBytes(s.data);
  }
  return total;
}

function calcBaseBytes(slots: Array<SlotSample | null>): number {
  let total = 0;
  for (const s of slots) {
    if (s) total += slotBytes(s.base);
  }
  return total;
}

export function App() {
  const [libraryState, setLibraryState] = useState<LibraryState>(
    createEmptyLibraryState
  );
  const [slots, setSlots] = useState<Array<SlotSample | null>>(
    () => Array(NUM_SLOTS).fill(null)
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0);
  const [favorLarge, setFavorLarge] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);

  const [auditionOpen, setAuditionOpen] = useState<boolean>(false);
  const [batchOpen, setBatchOpen] = useState<boolean>(false);
  const [batchRunning, setBatchRunning] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [confirmIncompleteOpen, setConfirmIncompleteOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [exportDirHandle, setExportDirHandle] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [nextZipNum, setNextZipNum] = useState<number>(getStoredNextZipNum);

  const mixerRef = useRef<AudioMixer | null>(null);
  if (!mixerRef.current) {
    mixerRef.current = new AudioMixer();
  }
  const mixer = mixerRef.current;

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const filesInputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef<number>(0);

  const showNotice = useCallback(
    (type: NoticeMessage['type'], text: string) => {
      setNotice({ id: Date.now(), type, text });
    },
    []
  );

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice((prev) => (prev?.id === notice.id ? null : prev));
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    return () => {
      mixer.stopAll();
    };
  }, [mixer]);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const filledCount = useMemo(
    () => slots.filter((s) => s !== null).length,
    [slots]
  );

  const usedBytes = useMemo(() => calcUsedBytes(slots), [slots]);

  const applyNewLibrary = useCallback(
    async (entries: LibraryEntry[], label?: string) => {
      clearDecodedAudioCache();
      setStatusText(`Indexing ${entries.length.toLocaleString()} samples...`);
      const nextState = await buildLibraryState(entries, (indexed) => {
        setStatusText(`Indexing... ${indexed.toLocaleString()} / ${entries.length.toLocaleString()}`);
      });
      setLibraryState(nextState);
      if (entries.length === 0) {
        showNotice(
          'error',
          'No supported audio files found (.wav, .flac, .aif, .aiff, .ogg, .mp3, .m4a).'
        );
      } else {
        showNotice(
          'success',
          label ?? `Loaded ${entries.length.toLocaleString()} samples into library.`
        );
      }
    },
    [showNotice]
  );

  const handleChooseFolder = useCallback(async () => {
    const canUseNativePicker =
      window.self === window.top &&
      typeof (window as unknown as { showDirectoryPicker?: unknown })
        .showDirectoryPicker === 'function';

    if (canUseNativePicker) {
      try {
        const dirHandle = await (
          window as unknown as {
            showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
          }
        ).showDirectoryPicker({ mode: 'read' });
        setBusy(true);
        setStatusText('Scanning sample folder...');
        const entries = await scanDirectoryHandleToLibrary(dirHandle, (count) => {
          setStatusText(`Scanning... ${count.toLocaleString()} samples found`);
        });
        await applyNewLibrary(
          entries,
          `Loaded ${entries.length.toLocaleString()} samples from "${dirHandle.name}".`
        );
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      } finally {
        setBusy(false);
        setStatusText(null);
      }
    }

    folderInputRef.current?.click();
  }, [applyNewLibrary]);

  const handleChooseFiles = useCallback(() => {
    filesInputRef.current?.click();
  }, []);

  const handleFolderInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setBusy(true);
      setStatusText('Scanning selected folder...');
      try {
        const entries = await scanFilesToLibrary(files, (count) => {
          setStatusText(`Scanning... ${count.toLocaleString()} samples found`);
        });
        await applyNewLibrary(entries);
      } finally {
        setBusy(false);
        setStatusText(null);
        e.target.value = '';
      }
    },
    [applyNewLibrary]
  );

  const handleFilesInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setBusy(true);
      setStatusText('Scanning selected files...');
      try {
        const entries = await scanFilesToLibrary(files, (count) => {
          setStatusText(`Scanning... ${count.toLocaleString()} samples found`);
        });
        await applyNewLibrary(entries);
      } finally {
        setBusy(false);
        setStatusText(null);
        e.target.value = '';
      }
    },
    [applyNewLibrary]
  );

  const handleLoadBuiltin = useCallback(async () => {
    setBusy(true);
    setStatusText('Loading built-in sample library...');
    try {
      const entries = await loadBuiltinLibrary();
      await applyNewLibrary(
        entries,
        `Loaded ${entries.length} built-in studio samples.`
      );
    } catch {
      showNotice('error', 'Failed to load built-in sample library.');
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }, [applyNewLibrary, showNotice]);

  // Drag & Drop handlers anywhere on the app
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);

      if (!e.dataTransfer) return;
      setBusy(true);
      setStatusText('Scanning dropped files...');
      try {
        const entries = await scanDataTransferToLibrary(
          e.dataTransfer,
          (count) => {
            setStatusText(`Scanning... ${count.toLocaleString()} samples found`);
          }
        );
        await applyNewLibrary(entries);
      } catch {
        showNotice('error', 'Could not read dropped files.');
      } finally {
        setBusy(false);
        setStatusText(null);
      }
    },
    [applyNewLibrary, showNotice]
  );

  // --------------------------------------------------- Core GRAB64 Algorithms
  const getCandidates = useCallback(
    (
      cat: string,
      currentSlots: Array<SlotSample | null>,
      excludeSet: Set<string>
    ): LibraryEntry[] => {
      const used = new Set<string>(excludeSet);
      for (const s of currentSlots) {
        if (s) used.add(s.path);
      }
      const source =
        cat === 'Any'
          ? libraryState.entries
          : libraryState.byCategory.get(cat) ?? [];

      if (used.size === 0) {
        return source.slice();
      }
      const out: LibraryEntry[] = [];
      for (let i = 0; i < source.length; i++) {
        if (!used.has(source[i].path)) {
          out.push(source[i]);
        }
      }
      return out;
    },
    [libraryState]
  );

  const putSampleIntoArray = useCallback(
    async (
      idx: number,
      entry: LibraryEntry,
      cat: string,
      workingSlots: Array<SlotSample | null>,
      isFavorLarge: boolean
    ): Promise<boolean> => {
      let emptyAfter = 0;
      for (let i = 0; i < workingSlots.length; i++) {
        if (i !== idx && workingSlots[i] === null) emptyAfter++;
      }
      const existingBase = workingSlots[idx]
        ? slotBytes(workingSlots[idx]!.base)
        : 0;
      const used = calcBaseBytes(workingSlots) - existingBase;
      const left = BUDGET - used;
      const limit = Math.min(
        left - MIN_SLOT_BYTES * emptyAfter,
        Math.floor((2 * left) / (emptyAfter + 1))
      );

      if (limit < MIN_SLOT_BYTES) return false;

      const scale = isFavorLarge ? 1.0 : SMALL_LEN_SCALE;
      const maxSec = (MAX_SECONDS[cat] ?? 1.5) * scale;
      const res = await loadSampleEx(entry, maxSec, limit, mixer.getContext());
      if (!res) return false;

      workingSlots[idx] = {
        name: cleanName(entry.name),
        cat,
        path: entry.path,
        data: res.data,
        base: res.data,
        more: res.more,
      };
      return true;
    },
    [mixer]
  );

  const rebalanceArray = useCallback(
    async (
      workingSlots: Array<SlotSample | null>,
      isFavorLarge: boolean
    ): Promise<Array<SlotSample | null>> => {
      const next = workingSlots.map((s) =>
        s ? { ...s, data: s.base } : null
      );

      if (MAXIMISE_TIME && isFavorLarge) {
        let cand: number[] = [];
        for (let i = 0; i < next.length; i++) {
          if (next[i] && next[i]!.more) cand.push(i);
        }

        const ctx = mixer.getContext();
        for (let iter = 0; iter < 8; iter++) {
          const left = BUDGET - calcUsedBytes(next);
          if (cand.length === 0 || left < 2 * MIN_SLOT_BYTES) break;

          let total = 0;
          for (const i of cand) {
            total += slotBytes(next[i]!.data);
          }
          if (total <= 0) break;

          const still: number[] = [];
          for (const i of cand) {
            const s = next[i]!;
            const cur = slotBytes(s.data);
            const target = cur + Math.floor((left * cur) / total);
            if (target - cur < Math.floor(MIN_SLOT_BYTES / 4)) {
              still.push(i);
              continue;
            }
            const entry = libraryState.byPath.get(s.path);
            if (!entry) continue;

            const secs =
              (Math.floor((target - WAV_HEADER) / 2) + 1) / SAMPLE_RATE;
            const res = await loadSampleEx(entry, secs, target, ctx);
            if (!res || res.data.length < s.data.length) continue;

            next[i] = { ...s, data: res.data };
            if (res.more) {
              still.push(i);
            }
          }
          cand = still;
        }
      }

      return next;
    },
    [libraryState.byPath, mixer]
  );

  const handleToggleFavor = useCallback(async () => {
    const nextFavor = !favorLarge;
    setFavorLarge(nextFavor);
    if (slots.some((s) => s !== null)) {
      setBusy(true);
      try {
        const rebalanced = await rebalanceArray(slots, nextFavor);
        setSlots(rebalanced);
      } finally {
        setBusy(false);
      }
    }
  }, [favorLarge, slots, rebalanceArray]);

  const handleAddFour = useCallback(
    async (cat: string) => {
      if (libraryState.entries.length === 0) {
        showNotice(
          'info',
          'Choose a sample folder or load built-in samples first.'
        );
        return;
      }

      const empties: number[] = [];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] === null) empties.push(i);
      }
      if (empties.length === 0) {
        showNotice('info', 'All 64 slots are full. Clear some first.');
        return;
      }

      const pool = getCandidates(cat, slots, new Set());
      weightedShuffle(pool, favorLarge, 128);
      if (pool.length === 0) {
        showNotice('info', `No unused '${cat}' samples in your library.`);
        return;
      }

      setBusy(true);
      setStatusText(`Adding up to 4 '${cat}' samples...`);
      try {
        const working = [...slots];
        let filled = 0;
        for (const idx of empties) {
          if (filled === 4 || pool.length === 0) break;
          while (pool.length > 0) {
            const entry = pool.pop()!;
            if (await putSampleIntoArray(idx, entry, cat, working, favorLarge)) {
              filled++;
              break;
            }
          }
        }
        const rebalanced = await rebalanceArray(working, favorLarge);
        setSlots(rebalanced);
      } finally {
        setBusy(false);
        setStatusText(null);
      }
    },
    [
      libraryState.entries.length,
      slots,
      getCandidates,
      favorLarge,
      putSampleIntoArray,
      rebalanceArray,
      showNotice,
    ]
  );

  const buildAutofillBank = useCallback(
    async (
      initialSlots: Array<SlotSample | null>,
      excludeSet: Set<string>,
      isFavorLarge: boolean
    ): Promise<Array<SlotSample | null>> => {
      const working = [...initialSlots];

      for (const [cat, count] of AUTOFILL_PLAN) {
        const pool = getCandidates(cat, working, excludeSet);
        weightedShuffle(pool, isFavorLarge, Math.max(64, count * 16));
        for (let k = 0; k < count; k++) {
          const emptyIdx = working.findIndex((s) => s === null);
          if (emptyIdx === -1 || pool.length === 0) break;
          while (pool.length > 0) {
            const entry = pool.pop()!;
            if (
              await putSampleIntoArray(
                emptyIdx,
                entry,
                cat,
                working,
                isFavorLarge
              )
            ) {
              break;
            }
          }
        }
      }

      const anyPool = getCandidates('Any', working, excludeSet);
      weightedShuffle(anyPool, isFavorLarge, 512);
      for (let i = 0; i < working.length; i++) {
        if (working[i] !== null) continue;
        while (anyPool.length > 0) {
          const entry = anyPool.pop()!;
          if (
            await putSampleIntoArray(i, entry, 'Any', working, isFavorLarge)
          ) {
            break;
          }
        }
      }

      return rebalanceArray(working, isFavorLarge);
    },
    [getCandidates, putSampleIntoArray, rebalanceArray]
  );

  const handleAutofill = useCallback(async () => {
    if (libraryState.entries.length === 0) {
      showNotice(
        'info',
        'Choose a sample folder or load built-in samples first.'
      );
      return;
    }

    setBusy(true);
    setStatusText('Auto-filling 64 slots...');
    try {
      const result = await buildAutofillBank(slots, new Set(), favorLarge);
      setSlots(result);
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }, [
    libraryState.entries.length,
    buildAutofillBank,
    slots,
    favorLarge,
    showNotice,
  ]);

  const handlePreview = useCallback(
    (idx: number | null) => {
      if (idx === null) return;
      const s = slots[idx];
      if (s) {
        mixer.play(s.data);
      }
    },
    [slots, mixer]
  );

  const handleReroll = useCallback(
    async (idx: number | null) => {
      if (idx === null) return;
      if (libraryState.entries.length === 0) {
        showNotice(
          'info',
          'Choose a sample folder or load built-in samples first.'
        );
        return;
      }
      const old = slots[idx];
      const cat = old ? old.cat : 'Any';
      const pool = getCandidates(cat, slots, new Set());
      weightedShuffle(pool, favorLarge, 64);
      if (pool.length === 0) {
        showNotice('info', `No unused '${cat}' samples left to re-roll.`);
        return;
      }

      setBusy(true);
      try {
        const working = [...slots];
        let replaced = false;
        while (pool.length > 0) {
          const entry = pool.pop()!;
          if (await putSampleIntoArray(idx, entry, cat, working, favorLarge)) {
            replaced = true;
            break;
          }
        }
        if (replaced) {
          const rebalanced = await rebalanceArray(working, favorLarge);
          setSlots(rebalanced);
        } else {
          showNotice('info', 'No candidate fit within the remaining budget.');
        }
      } finally {
        setBusy(false);
      }
    },
    [
      libraryState.entries.length,
      slots,
      getCandidates,
      favorLarge,
      putSampleIntoArray,
      rebalanceArray,
      showNotice,
    ]
  );

  const handleClearSlot = useCallback(
    async (idx: number | null) => {
      if (idx === null || !slots[idx]) return;
      const working = [...slots];
      working[idx] = null;
      const rebalanced = await rebalanceArray(working, favorLarge);
      setSlots(rebalanced);
    },
    [slots, rebalanceArray, favorLarge]
  );

  const handleClearAll = useCallback(() => {
    setSlots(Array(NUM_SLOTS).fill(null));
  }, []);

  const handlePutFromAudition = useCallback(
    async (slotIdx: number, entry: LibraryEntry, cat: string): Promise<boolean> => {
      const working = [...slots];
      const ok = await putSampleIntoArray(slotIdx, entry, cat, working, favorLarge);
      if (!ok) return false;
      const rebalanced = await rebalanceArray(working, favorLarge);
      setSlots(rebalanced);
      return true;
    },
    [slots, putSampleIntoArray, favorLarge, rebalanceArray]
  );

  // --------------------------------------------------------------- Export ZIP
  const handlePickExportFolder = useCallback(async () => {
    const canUseNativePicker =
      window.self === window.top &&
      typeof (window as unknown as { showDirectoryPicker?: unknown })
        .showDirectoryPicker === 'function';

    if (!canUseNativePicker) {
      showNotice(
        'info',
        'Direct folder writing requires a top-level Chromium window; exports will download as sequential ZIP files.'
      );
      return;
    }

    try {
      const handle = await (
        window as unknown as {
          showDirectoryPicker: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
        }
      ).showDirectoryPicker({ mode: 'readwrite' });
      setExportDirHandle(handle);
      const nextNum = await getNextZipNumberInDirectory(handle, nextZipNum);
      setNextZipNum(nextNum);
      saveNextZipNum(nextNum);
      showNotice('success', `Export folder set to "${handle.name}".`);
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        showNotice('info', 'Exports will download directly via browser downloads.');
      }
    }
  }, [nextZipNum, showNotice]);

  const performSingleExport = useCallback(async () => {
    setBusy(true);
    setStatusText('Building ZIP...');
    try {
      const zipNum = exportDirHandle
        ? await getNextZipNumberInDirectory(exportDirHandle, nextZipNum)
        : nextZipNum;

      const result = await buildGrab64Zip(slots, zipNum, exportDirHandle);
      if (!result.savedToFolder) {
        triggerBlobDownload(result.zipBlob, result.filename);
      }

      const next = zipNum + 1;
      setNextZipNum(next);
      saveNextZipNum(next);

      showNotice(
        'success',
        `Saved ${result.count} samples (${(result.totalBytes / 1e6).toFixed(
          2
        )} MB) -> ${result.filename}${
          result.savedToFolder && exportDirHandle
            ? ` in ${exportDirHandle.name}`
            : ''
        }`
      );
    } catch {
      showNotice('error', 'Failed to create ZIP file.');
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }, [exportDirHandle, nextZipNum, slots, showNotice]);

  const handleExportZipClick = useCallback(() => {
    if (filledCount === 0) {
      showNotice('info', 'No samples to export.');
      return;
    }
    if (filledCount < NUM_SLOTS) {
      setConfirmIncompleteOpen(true);
      return;
    }
    void performSingleExport();
  }, [filledCount, performSingleExport, showNotice]);

  const handleBatchStart = useCallback(
    async (count: number) => {
      if (libraryState.entries.length === 0) {
        showNotice(
          'info',
          'Choose a sample folder or load built-in samples first.'
        );
        setBatchOpen(false);
        return;
      }

      setBatchRunning(true);
      setBusy(true);
      setBatchProgress({ current: 0, total: count });

      const exclude = new Set<string>();
      const made: string[] = [];
      let currentNum = exportDirHandle
        ? await getNextZipNumberInDirectory(exportDirHandle, nextZipNum)
        : nextZipNum;

      let latestSlots: Array<SlotSample | null> = Array(NUM_SLOTS).fill(null);

      try {
        for (let k = 0; k < count; k++) {
          setStatusText(`Batch: ${k}/${count} packs written`);
          const blank: Array<SlotSample | null> = Array(NUM_SLOTS).fill(null);
          const generated = await buildAutofillBank(blank, exclude, favorLarge);
          const filled = generated.filter((s): s is SlotSample => s !== null);
          if (filled.length === 0) break;

          latestSlots = generated;
          setSlots(generated);

          const res = await buildGrab64Zip(generated, currentNum, exportDirHandle);
          if (!res.savedToFolder) {
            triggerBlobDownload(res.zipBlob, res.filename);
          }

          made.push(res.filename);
          currentNum += 1;
          for (const s of filled) {
            exclude.add(s.path);
          }

          setBatchProgress({ current: made.length, total: count });
          setStatusText(`Batch: ${made.length}/${count} packs written`);

          if (res.count < NUM_SLOTS) {
            break;
          }
        }

        setNextZipNum(currentNum);
        saveNextZipNum(currentNum);
        setSlots(latestSlots);

        if (made.length > 0) {
          const rangeText =
            made.length === 1 ? made[0] : `${made[0]} ... ${made[made.length - 1]}`;
          const earlyNote =
            made.length < count
              ? ' (Stopped early: ran out of unused samples.)'
              : '';
          showNotice(
            'success',
            `Batch done: Wrote ${made.length} ZIP(s) — ${rangeText}.${earlyNote}`
          );
        } else {
          showNotice('info', 'Nothing exported: no samples could be loaded.');
        }
      } catch {
        showNotice('error', 'Batch export encountered an error.');
      } finally {
        setBatchRunning(false);
        setBusy(false);
        setBatchProgress(null);
        setStatusText(null);
        setBatchOpen(false);
      }
    },
    [
      libraryState.entries.length,
      exportDirHandle,
      nextZipNum,
      buildAutofillBank,
      favorLarge,
      showNotice,
    ]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="h-screen w-screen bg-[#16171b] text-[#e4e6eb] flex flex-col overflow-hidden relative"
    >
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={(e) => void handleFolderInputChange(e)}
        className="hidden"
      />
      <input
        ref={filesInputRef}
        type="file"
        multiple
        accept=".wav,.flac,.aif,.aiff,.ogg,.mp3,.m4a"
        onChange={(e) => void handleFilesInputChange(e)}
        className="hidden"
      />

      <TopToolbar
        libraryCount={libraryState.entries.length}
        statusText={statusText}
        busy={busy}
        onChooseFolder={() => void handleChooseFolder()}
        onChooseFiles={handleChooseFiles}
        onLoadBuiltin={() => void handleLoadBuiltin()}
        onStopAudio={() => mixer.stopAll()}
      />

      <main className="flex-1 min-h-0 p-2.5 flex flex-col lg:flex-row gap-2.5 overflow-hidden">
        <SlotsTable
          slots={slots}
          selectedIdx={selectedIdx}
          onSelect={setSelectedIdx}
          onPreview={handlePreview}
          onReroll={(idx) => void handleReroll(idx)}
          onClear={(idx) => void handleClearSlot(idx)}
        />

        <ControlSidebar
          categoryCounts={libraryState.categoryCounts}
          favorLarge={favorLarge}
          filledCount={filledCount}
          usedBytes={usedBytes}
          hasSelectedSlot={selectedIdx !== null}
          hasSelectedSample={selectedIdx !== null && slots[selectedIdx] !== null}
          exportFolderName={exportDirHandle?.name ?? null}
          nextZipNum={nextZipNum}
          busy={busy}
          onAddFour={(cat) => void handleAddFour(cat)}
          onToggleFavor={() => void handleToggleFavor()}
          onOpenAudition={() => {
            if (libraryState.entries.length === 0) {
              showNotice(
                'info',
                'Choose a sample folder or load built-in samples first.'
              );
              return;
            }
            setAuditionOpen(true);
          }}
          onAutofill={() => void handleAutofill()}
          onPreviewSelected={() => handlePreview(selectedIdx)}
          onRerollSelected={() => void handleReroll(selectedIdx)}
          onClearSelected={() => void handleClearSlot(selectedIdx)}
          onClearAll={handleClearAll}
          onExportZip={handleExportZipClick}
          onOpenBatch={() => {
            if (libraryState.entries.length === 0) {
              showNotice(
                'info',
                'Choose a sample folder or load built-in samples first.'
              );
              return;
            }
            setBatchOpen(true);
          }}
          onPickExportFolder={() => void handlePickExportFolder()}
        />
      </main>

      {notice && (
        <div
          role="status"
          className={`fixed bottom-3 left-3 z-50 max-w-lg px-3 py-2 rounded border text-xs flex items-center gap-3 ${
            notice.type === 'error'
              ? 'bg-[#2a1a1d] border-[#6b2f38] text-[#f4c7ce]'
              : notice.type === 'success'
              ? 'bg-[#1e2025] border-[#4f8cff] text-[#e4e6eb]'
              : 'bg-[#1e2025] border-[#34373f] text-[#e4e6eb]'
          }`}
        >
          <span className="font-mono">{notice.text}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-[#8b909a] hover:text-[#e4e6eb] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isDragging && (
        <div className="fixed inset-0 z-50 bg-[#16171b]/85 border-2 border-dashed border-[#4f8cff] m-3 rounded flex flex-col items-center justify-center pointer-events-none">
          <p className="text-sm font-medium text-[#e4e6eb]">
            Drop your sample folder or audio files here
          </p>
          <p className="text-xs text-[#8b909a] mt-1">
            Supports WAV, FLAC, AIF/AIFF, OGG, MP3, M4A
          </p>
        </div>
      )}

      <AuditionModal
        open={auditionOpen}
        libraryState={libraryState}
        slots={slots}
        selectedSlotIdx={selectedIdx}
        favorLarge={favorLarge}
        lenScale={favorLarge ? 1.0 : SMALL_LEN_SCALE}
        mixer={mixer}
        onPutSample={handlePutFromAudition}
        onClose={() => setAuditionOpen(false)}
      />

      <BatchExportModal
        open={batchOpen}
        running={batchRunning}
        progress={batchProgress}
        onStart={(count) => void handleBatchStart(count)}
        onClose={() => setBatchOpen(false)}
      />

      <ConfirmDialog
        open={confirmIncompleteOpen}
        title="Not full"
        message={`Only ${filledCount} of 64 slots filled. Export anyway?`}
        confirmLabel="Export anyway"
        onConfirm={() => {
          setConfirmIncompleteOpen(false);
          void performSingleExport();
        }}
        onCancel={() => setConfirmIncompleteOpen(false)}
      />
    </div>
  );
}

export default App;
