"""
GRAB64  (Windows / Python 3.9+)

  pip install numpy soundfile sounddevice
  python grab64.py

Features
  * Scans a folder of your samples and auto-categorises them
  * 64 slots, total size budget 8.39 MB
  * Fill 4 slots at a time from any category, or auto-fill all 64
  * Spare budget is spent lengthening samples that were cut short (random picks unchanged)
  * Audition window: browse your library by category, hear samples, add the keepers
  * Preview, re-roll and clear individual slots
  * Export all 64 slots as a zipped folder of WAVs
  * Favours SMALL samples by default (small files picked more often, shorter slices).
    Press the 'Favor LARGER samples' button to flip it: bigger files and longer slices.
  * Exports are SEQUENTIAL: grab64_001.zip, grab64_002.zip, ... (never overwrites)
  * Batch mode: generate N packs in one go, each a fresh 64-slot zip with no repeated samples

Output format is set by the constants below -- change them if needed.
"""
import heapq
import io
import math
import os
import random
import re
import threading
import tkinter as tk
import zipfile
from tkinter import filedialog, messagebox, simpledialog, ttk

import numpy as np

try:
    import sounddevice as sd
    import soundfile as sf
    AUDIO_AVAILABLE = True
except Exception:
    AUDIO_AVAILABLE = False
    sd = None
    sf = None

# ---------------------------------------------------------------- settings
SAMPLE_RATE = 44100
NUM_SLOTS = 64
BUDGET = 8_390_000
WAV_HEADER = 44
MIN_SLOT_BYTES = 1000
EXPORT_NAME_LEN = 24
# After picking, give samples that were cut short a longer slice of their file so the
# whole size budget gets used. Which samples get picked is never affected.
MAXIMISE_TIME = True

CATEGORIES = {
    "808": ["808"],
    "Acid": ["acid", "303", "tb303"],
    "Arp": ["arp", "arps", "arpeggio", "arpegio", "arpeggiator"],
    "Atmos": ["atmos", "atmosphere", "drone", "texture"],
    "Bass": ["bass", "sub", "reese"],
    "Bass Loops": ["bass loops", "bass loop", "bassloop", "bassloops"],
    "Bell": ["bell", "bells"],
    "Bongo": ["bongo", "bongos"],
    "Brass": ["brass"],
    "Chords": ["chord", "chords"],
    "Claps": ["clap", "claps", "clp"],
    "Clave": ["clave", "claves"],
    "Conga": ["conga", "congas"],
    "Cowbell": ["cowbell", "cowbells"],
    "Cymbals": ["cymbal", "cymbals", "crash"],
    "Drum Loops": ["drum loops", "drum loop", "drumloop", "drumloops"],
    "Dumbek": ["dumbek", "doumbek", "darbuka"],
    "FX": ["fx", "riser", "impact", "sweep", "noise", "effect"],
    "Hihats": ["hihat", "hihats", "hat", "hats", "hh", "hi hat", "hi hats"],
    "Kicks": ["kick", "kicks", "bd"],
    "Lazer": ["lazer", "laser"],
    "Mallets": ["mallet", "mallets"],
    "Maracas": ["maraca", "maracas"],
    "Marimba": ["marimba"],
    "Melodic": ["melodic", "melody", "melodies"],
    "Melody Loops": ["melody loops", "melody loop", "melodic loops", "melodic loop",
                     "melodyloop", "melodyloops", "melloop", "mloop"],
    "Metal Drums": ["metal drums", "metal drum", "metaldrum", "metaldrums"],
    "Pad": ["pad", "pads"],
    "Perc": ["perc", "percs", "percussion"],
    "Piano": ["piano"],
    "Rim Shots": ["rim shots", "rim shot", "rimshot", "rimshots", "rim"],
    "Scratches": ["scratch", "scratches"],
    "Seq": ["seq", "sequence", "sequences"],
    "Shaker": ["shaker", "shakers"],
    "Snaps": ["snap", "snaps"],
    "Snaredrums": ["snare", "snares", "snaredrum", "snaredrums", "sd", "snr"],
    "Springs": ["spring", "springs"],
    "Stab": ["stab", "stabs"],
    "Steeldrum": ["steeldrum", "steeldrums", "steel drum", "steel drums", "steelpan"],
    "String": ["string", "strings"],
    "Synth": ["synth", "synths", "lead", "pluck"],
    "Tamb": ["tamb", "tambourine"],
    "Toms": ["tom", "toms"],
    "Tongue": ["tongue"],
    "Tsuzumi": ["tsuzumi"],
    "Tube": ["tube", "tubes"],
    "Udu": ["udu"],
    "Wavetable": ["wavetable"],
    "Whistle": ["whistle", "whistles"],
    # --- extra folders from the library ---
    "ADSR Samples": ["adsr"],
    "Arturia": ["arturia"],
    "Cymatics": ["cymatics"],
    "99 Sounds": ["99 sounds", "99sounds"],
    "Legowelt": ["legowelt"],
    "Misc Drum Machines": ["misc drum machines", "drum machine", "drum machines", "drummachine", "drummachines"],
    "Modular": ["modular"],
    "Pico Drum": ["pico", "pico drum programmer"],
    "Waveparty": ["waveparty", "wave party"],
    "Wind": ["wind", "winds"],
    "Woodblock": ["woodblock", "woodblocks", "wood block", "wood blocks"],
    "Xylophone": ["xylophone", "xylo"],
    "Unzipped Samples": ["unzipped", "unzipped samples"],
    "8 Bit": ["8 bit", "8bit", "8-bit"],
    "Prog Samples": ["prog samples", "progsamples"],
    "Wavgrind": ["wavgrind"],
    "Template": ["template", "templates"],
}
MAX_SECONDS = {
    "808": 1.5, "Acid": 2.0, "Arp": 3.0, "Atmos": 3.0, "Bass": 1.5, "Bass Loops": 3.0,
    "Bell": 1.5, "Bongo": 1.0, "Brass": 1.5, "Chords": 2.0, "Claps": 1.0, "Clave": 0.6,
    "Conga": 1.0, "Cowbell": 1.0, "Cymbals": 1.5, "Drum Loops": 3.0, "Dumbek": 1.0,
    "FX": 2.0, "Hihats": 0.6, "Kicks": 1.0, "Lazer": 1.0, "Mallets": 1.5, "Maracas": 0.6,
    "Marimba": 1.5, "Melodic": 1.5, "Melody Loops": 3.0, "Metal Drums": 1.0, "Pad": 3.0,
    "Perc": 1.0, "Piano": 2.0, "Rim Shots": 0.6, "Scratches": 1.5, "Seq": 3.0,
    "Shaker": 0.8, "Snaps": 0.6, "Snaredrums": 1.0, "Springs": 1.5, "Stab": 1.0,
    "Steeldrum": 1.5, "String": 2.0, "Synth": 1.5, "Tamb": 0.8, "Toms": 1.0,
    "Tongue": 1.5, "Tsuzumi": 1.0, "Tube": 1.5, "Udu": 1.0, "Wavetable": 2.0,
    "Whistle": 1.5, "ADSR Samples": 1.5, "Arturia": 2.0, "Cymatics": 1.5, "99 Sounds": 1.5,
    "Legowelt": 1.5, "Misc Drum Machines": 1.0, "Modular": 2.0, "Pico Drum": 1.0,
    "Waveparty": 2.0, "Wind": 2.0, "Woodblock": 0.6, "Xylophone": 1.5,
    "Unzipped Samples": 1.5, "8 Bit": 1.0, "Prog Samples": 1.5, "Wavgrind": 1.5,
    "Template": 1.5, "Any": 1.5,
}
# Balanced mix, adds up to 64 slots. Anything missing from your library is
# topped up from random samples ("Any") afterwards.
AUTOFILL_PLAN = [
    ("Kicks", 5), ("808", 4), ("Snaredrums", 5), ("Claps", 3), ("Hihats", 5),
    ("Cymbals", 2), ("Rim Shots", 2), ("Toms", 3), ("Perc", 3), ("Conga", 1),
    ("Bongo", 1), ("Cowbell", 1), ("Clave", 1), ("Shaker", 1), ("Tamb", 1),
    ("Maracas", 1), ("Snaps", 1), ("Metal Drums", 1),
    ("Synth", 3), ("Stab", 2), ("Acid", 2), ("Pad", 2), ("Seq", 2), ("Arp", 2),
    ("Bass", 2), ("FX", 2), ("Chords", 1), ("Melodic", 1), ("Bell", 1),
    ("Piano", 1), ("Atmos", 1), ("Scratches", 1),
]
# Size preference. Default favours small samples; the button in the app flips it.
SMALL_LEN_SCALE = 0.6      # small mode: every category's max length is multiplied by this
FAVOR_STRENGTH = 1.0       # 0 = no preference, 1 = pick odds proportional to (1/size or size)
MIN_WEIGHT_BYTES = 4000    # tiny files are treated as at least this big when weighting
AUDIO_EXT = (".wav", ".flac", ".aif", ".aiff", ".ogg")

_TOKEN_SPLIT_RE = re.compile(r"[^a-z0-9]+")
_EXACT_WORD_TO_CATS = {}
_SUBSTR_WORDS = []
_PHRASE_WORDS = []
for _cat, _words in CATEGORIES.items():
    for _w in _words:
        if " " in _w:
            _PHRASE_WORDS.append((tuple(_w.split()), _cat))
        else:
            _EXACT_WORD_TO_CATS.setdefault(_w, []).append(_cat)
            if len(_w) > 3:
                _SUBSTR_WORDS.append((_w, _cat))

_TOKEN_CAT_CACHE = {}


def _cats_for_token(tok):
    cached = _TOKEN_CAT_CACHE.get(tok)
    if cached is not None:
        return cached
    hits = []
    exact = _EXACT_WORD_TO_CATS.get(tok)
    if exact:
        hits.extend(exact)
    if len(tok) > 3:
        for w, cat in _SUBSTR_WORDS:
            if w != tok and w in tok:
                hits.append(cat)
    res = tuple(hits)
    if len(_TOKEN_CAT_CACHE) < 120000:
        _TOKEN_CAT_CACHE[tok] = res
    return res


def categorise(path):
    """Return set/frozenset of categories matched by file/folder name tokens."""
    tokens = [t for t in _TOKEN_SPLIT_RE.split(path.lower()) if t]
    tokset = set(tokens)
    found = set()

    for t in tokset:
        for cat in _cats_for_token(t):
            found.add(cat)

    for parts, cat in _PHRASE_WORDS:
        if all(part in tokset for part in parts):
            found.add(cat)

    # avoid double-tagging where one name contains another
    if "Melody Loops" in found:
        found.discard("Melodic")
    if "Bass Loops" in found:
        found.discard("Bass")
    if "Cowbell" in found:
        found.discard("Bell")
    return found


def scan_library(folder, progress_cb=None):
    """Find supported audio files and categorise them by folder/file name.
    Uses iterative os.scandir() and caches file sizes to scale to 380k+ samples."""
    library = []
    size_cache = {}
    cat_index = {cat: [] for cat in CATEGORIES}
    path_cats = {}
    cat_intern = {}
    stack = [folder]
    folder_len = len(folder.rstrip("\\/"))

    while stack:
        cur_dir = stack.pop()
        try:
            with os.scandir(cur_dir) as it:
                for entry in it:
                    try:
                        if entry.is_dir(follow_symlinks=False):
                            stack.append(entry.path)
                        elif entry.is_file(follow_symlinks=False):
                            name_lower = entry.name.lower()
                            if name_lower.endswith(AUDIO_EXT):
                                path = entry.path
                                try:
                                    sz = entry.stat(follow_symlinks=False).st_size
                                except OSError:
                                    sz = MIN_WEIGHT_BYTES
                                size_cache[path] = sz
                                rel = path[folder_len + 1:] if len(path) > folder_len else entry.name
                                cats = categorise(rel)
                                fc = frozenset(cats)
                                fc = cat_intern.setdefault(fc, fc)
                                library.append((path, fc))
                                path_cats[path] = fc
                                for cat in fc:
                                    cat_index[cat].append(path)
                                if progress_cb and len(library) % 2500 == 0:
                                    progress_cb(len(library))
                    except OSError:
                        continue
        except OSError:
            continue

    return library, size_cache, cat_index, path_cats


def load_sample_ex(path, max_seconds, byte_limit):
    """Load audio -> (mono 16-bit array at SAMPLE_RATE or None, more).
    `more` is True when the file had audio left that was cut off to fit."""
    if not AUDIO_AVAILABLE or sf is None:
        return None, False

    try:
        with sf.SoundFile(path) as f:
            sr = f.samplerate
            want = int(sr * (max_seconds + 0.5))
            data = f.read(frames=want, dtype="float32", always_2d=True)
            file_more = f.frames > want
    except Exception:
        return None, False

    data = data.mean(axis=1)
    if sr != SAMPLE_RATE and len(data) > 1:
        n = int(len(data) * SAMPLE_RATE / sr)
        data = np.interp(np.linspace(0, len(data) - 1, n), np.arange(len(data)), data)

    idx = np.flatnonzero(np.abs(data) > 0.003)
    if len(idx):
        data = data[idx[0]:]

    max_n = min(int(max_seconds * SAMPLE_RATE), (byte_limit - WAV_HEADER) // 2)
    cut = len(data) > max_n or file_more
    data = data[:max_n].astype(np.float32)

    if len(data) < 100:
        return None, False

    fade = min(len(data), int(0.015 * SAMPLE_RATE))
    if cut and fade:
        data[-fade:] *= np.linspace(1, 0, fade, dtype=np.float32)

    peak = np.abs(data).max()
    if peak > 0:
        data *= 0.95 / peak

    return (data * 32767).astype(np.int16), cut


def load_sample(path, max_seconds, byte_limit):
    """Load audio -> mono 16-bit at SAMPLE_RATE, trimmed to fit."""
    return load_sample_ex(path, max_seconds, byte_limit)[0]


def slot_bytes(arr):
    return len(arr) * 2 + WAV_HEADER


def clean_name(name):
    name = os.path.splitext(name)[0]
    name = re.sub(r"[^A-Za-z0-9_-]+", "_", name).strip("_")
    return name[:EXPORT_NAME_LEN] or "sample"


# ------------------------------------------------------------------- audio
class Mixer:
    def __init__(self):
        self.voices = []
        self.lock = threading.Lock()
        self.stream = None
        self.rate = SAMPLE_RATE
        if AUDIO_AVAILABLE and sd is not None:
            # Try the export rate first; if the sound card won't do it, fall back
            # to its default rate and resample on playback (export is unaffected).
            rates = [SAMPLE_RATE]
            try:
                rates.append(int(sd.query_devices(kind="output")["default_samplerate"]))
            except Exception:
                rates.append(48000)
            for rate in rates:
                try:
                    self.stream = sd.OutputStream(samplerate=rate, channels=1, dtype="float32",
                                                  blocksize=256, callback=self._cb)
                    self.stream.start()
                    self.rate = rate
                    break
                except Exception:
                    self.stream = None

    def play(self, int16_data):
        if not AUDIO_AVAILABLE or self.stream is None:
            return
        data = int16_data.astype(np.float32) / 32768.0
        if self.rate != SAMPLE_RATE and len(data) > 1:
            n = int(len(data) * self.rate / SAMPLE_RATE)
            data = np.interp(np.linspace(0, len(data) - 1, n), np.arange(len(data)), data).astype(np.float32)
        with self.lock:
            self.voices.append([data, 0])

    def stop_all(self):
        with self.lock:
            self.voices.clear()

    def _cb(self, out, frames, t, status):
        out[:] = 0
        with self.lock:
            keep = []
            for v in self.voices:
                d, p = v
                n = min(frames, len(d) - p)
                out[:n, 0] += d[p:p + n]
                v[1] += n
                if v[1] < len(d):
                    keep.append(v)
            self.voices = keep
        np.clip(out, -1, 1, out=out)

    def close(self):
        if self.stream:
            self.stream.stop()
            self.stream.close()


# --------------------------------------------------------------------- app
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("GRAB64")
        w = min(1500, self.winfo_screenwidth() - 60)
        h = min(900, self.winfo_screenheight() - 100)
        self.geometry(f"{w}x{h}+20+20")
        self.library = []
        self.cat_index = {cat: [] for cat in CATEGORIES}
        self.path_cats = {}
        self.slots = [None] * NUM_SLOTS
        self.mixer = Mixer()
        self._aud_win = None
        self._aud_refill = None
        self._aud_cache = {}
        self.favor_large = False   # default: favour smaller samples
        self._size_cache = {}
        self._scanning = False
        self.exclude = set()      # paths already used by earlier packs in a batch
        self.out_folder = None    # where sequential zips are saved
        self._build_ui()
        self.protocol("WM_DELETE_WINDOW", self._close)

    def _build_ui(self):
        top = ttk.Frame(self, padding=6)
        top.pack(fill="x")
        ttk.Button(top, text="Choose sample folder...", command=self.choose_folder).pack(side="left")
        self.lib_label = ttk.Label(top, text="  No library loaded")
        self.lib_label.pack(side="left")

        mid = ttk.Frame(self, padding=6)
        mid.pack(fill="both", expand=True)

        left = ttk.Frame(mid)
        left.pack(side="left", fill="both", expand=True)
        cols = ("n", "name", "cat", "kb")
        self.tree = ttk.Treeview(left, columns=cols, show="headings", height=20)
        for c, t, w in (("n", "#", 40), ("name", "Name", 230), ("cat", "Category", 100), ("kb", "KB", 60)):
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w, anchor="w")
        sb = ttk.Scrollbar(left, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=sb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        sb.pack(side="left", fill="y")
        self.tree.bind("<Double-1>", lambda e: self.preview())
        for i in range(NUM_SLOTS):
            self.tree.insert("", "end", iid=str(i), values=(i + 1, "-", "", ""))

        right = ttk.Frame(mid, padding=(10, 0))
        right.pack(side="left", fill="y")
        ttk.Label(right, text="Add 4 samples from category:").pack(anchor="w")
        gwrap = ttk.Frame(right)
        gwrap.pack(anchor="w", pady=4, fill="x")
        gcanvas = tk.Canvas(gwrap, height=260, highlightthickness=0, bd=0)
        gsb = ttk.Scrollbar(gwrap, orient="vertical", command=gcanvas.yview)
        gcanvas.configure(yscrollcommand=gsb.set)
        gcanvas.pack(side="left", fill="x", expand=True)
        gsb.pack(side="left", fill="y")
        grid = ttk.Frame(gcanvas)
        gcanvas.create_window((0, 0), window=grid, anchor="nw")
        grid.bind("<Configure>", lambda e: gcanvas.configure(
            scrollregion=gcanvas.bbox("all"), width=grid.winfo_reqwidth()))
        gcanvas.bind("<Enter>", lambda e: gcanvas.bind_all(
            "<MouseWheel>", lambda ev: gcanvas.yview_scroll(-1 * (ev.delta // 120), "units")))
        gcanvas.bind("<Leave>", lambda e: gcanvas.unbind_all("<MouseWheel>"))
        self.cat_buttons = {}
        for i, cat in enumerate(CATEGORIES):
            b = ttk.Button(grid, text=cat, width=18, command=lambda c=cat: self.add_four(c))
            b.grid(row=i // 4, column=i % 4, padx=2, pady=2, sticky="ew")
            self.cat_buttons[cat] = b
        
        self.favor_btn = ttk.Button(right, command=self.toggle_favor)
        self.favor_btn.pack(fill="x", pady=(2, 4))
        self._update_favor_btn()
        ttk.Button(right, text="Add 4 from ANY category", command=lambda: self.add_four("Any")).pack(fill="x", pady=(6, 2))
        ttk.Button(right, text="Audition samples...", command=self.open_audition).pack(fill="x", pady=2)
        ttk.Separator(right).pack(fill="x", pady=8)
        ttk.Button(right, text="Auto-fill all 64 (balanced mix)", command=self.autofill).pack(fill="x", pady=2)
        ttk.Button(right, text="Preview selected slot", command=self.preview).pack(fill="x", pady=2)
        ttk.Button(right, text="Re-roll selected slot", command=self.reroll).pack(fill="x", pady=2)
        ttk.Button(right, text="Clear selected slot", command=self.clear_selected).pack(fill="x", pady=2)
        ttk.Button(right, text="Clear ALL slots", command=self.clear_all).pack(fill="x", pady=2)
        ttk.Separator(right).pack(fill="x", pady=8)
        
        self.budget_label = ttk.Label(right, text="")
        self.budget_label.pack(anchor="w")
        self.budget_bar = ttk.Progressbar(right, maximum=BUDGET, length=260)
        self.budget_bar.pack(anchor="w", pady=4)
        ttk.Button(right, text="Export 64 slots to next ZIP (grab64_001, 002...)", command=self.export_zip).pack(fill="x", pady=(10, 2))
        ttk.Button(right, text="Batch: generate several ZIPs...", command=self.batch_export).pack(fill="x", pady=2)
        ttk.Button(right, text="Change export folder...", command=lambda: self.pick_out_folder(force=True)).pack(fill="x", pady=2)
        self.out_label = ttk.Label(right, text="Export folder: (not set)", wraplength=420)
        self.out_label.pack(anchor="w", pady=2)

        self.update_budget()

    def choose_folder(self):
        if self._scanning:
            return
        folder = filedialog.askdirectory(title="Select your sample library folder")
        if not folder:
            return
        self._scanning = True
        self.lib_label.config(text="  Scanning folder...")
        self.config(cursor="watch")

        def on_progress(count):
            self.after(0, lambda c=count: self.lib_label.config(text=f"  Scanning... {c:,} samples found"))

        def worker():
            try:
                res = scan_library(folder, progress_cb=on_progress)
            except Exception as exc:
                res = exc

            def finish():
                self._scanning = False
                self.config(cursor="")
                if isinstance(res, Exception):
                    messagebox.showerror("Scan error", f"Could not scan folder:\n{res}")
                    self.lib_label.config(text=f"  {len(self.library):,} samples found")
                    return
                library, size_cache, cat_index, path_cats = res
                self.library = library
                self._size_cache = size_cache
                self.cat_index = cat_index
                self.path_cats = path_cats
                self.lib_label.config(text=f"  {len(self.library):,} samples found")
                self._aud_cache.clear()
                if self._aud_win is not None and self._aud_win.winfo_exists() and self._aud_refill:
                    self._aud_refill()
                for cat, b in self.cat_buttons.items():
                    n = len(self.cat_index.get(cat, ()))
                    b.config(text=f"{cat} ({n})")

            self.after(0, finish)

        threading.Thread(target=worker, daemon=True).start()

    # ------------------------------------------------------ size preference
    def len_scale(self):
        return 1.0 if self.favor_large else SMALL_LEN_SCALE

    def _update_favor_btn(self):
        if self.favor_large:
            self.favor_btn.config(text="Mode: LARGER samples  (click to favor smaller)")
        else:
            self.favor_btn.config(text="Mode: SMALLER samples  (click to favor LARGER)")

    def toggle_favor(self):
        self.favor_large = not self.favor_large
        self._update_favor_btn()
        self._aud_cache.clear()
        # existing slots: stretch to fill the budget (larger) or fall back to base length (smaller)
        self.rebalance()
        self.update_budget()

    def file_size(self, path):
        sz = self._size_cache.get(path)
        if sz is None:
            try:
                sz = os.path.getsize(path)
            except OSError:
                sz = MIN_WEIGHT_BYTES
            self._size_cache[path] = sz
        return max(sz, MIN_WEIGHT_BYTES)

    def weighted_shuffle(self, pool, max_pick=None):
        """Random order in which pool.pop() (the END of the list) returns the preferred
        sample first: small files in the default mode, large files in LARGER mode.
        When max_pick is set and pool is huge, selects top max_pick via O(N) heap instead of full sort."""
        favor_large = self.favor_large
        size_cache = self._size_cache

        def weight_key(p):
            sz = size_cache.get(p)
            if sz is None:
                sz = self.file_size(p)
            elif sz < MIN_WEIGHT_BYTES:
                sz = MIN_WEIGHT_BYTES
            w = (sz if favor_large else 1.0 / sz) ** FAVOR_STRENGTH
            return math.log(random.random() or 1e-300) / w

        if max_pick is not None and len(pool) > max_pick * 2:
            top = heapq.nlargest(max_pick, pool, key=weight_key)
            top.reverse()
            pool[:] = top
        else:
            pool.sort(key=weight_key)

    def candidates(self, cat):
        used = {s["path"] for s in self.slots if s} | self.exclude
        if cat == "Any":
            if not used:
                return [p for p, _ in self.library]
            return [p for p, _ in self.library if p not in used]
        cat_paths = self.cat_index.get(cat, ())
        if not used:
            return list(cat_paths)
        return [p for p in cat_paths if p not in used]

    def open_audition(self):
        """Non-modal window: browse the library by category, hear samples, add the keepers."""
        if not self.library:
            messagebox.showinfo("No library", "Choose a sample folder first.")
            return
        if self._aud_win is not None and self._aud_win.winfo_exists():
            self._aud_win.deiconify()
            self._aud_win.lift()
            return

        win = tk.Toplevel(self)
        self._aud_win = win
        win.title("GRAB64 - Audition")
        win.geometry("520x640")
        win.transient(self)

        top = ttk.Frame(win, padding=6)
        top.pack(fill="x")
        ttk.Label(top, text="Category:").pack(side="left")
        cat_var = tk.StringVar(value="All")
        cb = ttk.Combobox(top, textvariable=cat_var, state="readonly", width=16,
                          values=["All"] + list(CATEGORIES))
        cb.pack(side="left", padx=6)
        auto_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(top, text="Auto-play on select", variable=auto_var).pack(side="left", padx=6)

        search_bar = ttk.Frame(win, padding=(6, 0, 6, 4))
        search_bar.pack(fill="x")
        ttk.Label(search_bar, text="Search:").pack(side="left")
        search_var = tk.StringVar(value="")
        search_entry = ttk.Entry(search_bar, textvariable=search_var)
        search_entry.pack(side="left", fill="x", expand=True, padx=(6, 0))

        mid = ttk.Frame(win, padding=(6, 0))
        mid.pack(fill="both", expand=True)
        lb = tk.Listbox(mid, exportselection=False, activestyle="dotbox")
        sb = ttk.Scrollbar(mid, orient="vertical", command=lb.yview)
        lb.configure(yscrollcommand=sb.set)
        lb.pack(side="left", fill="both", expand=True)
        sb.pack(side="left", fill="y")

        info_var = tk.StringVar(value="")
        ttk.Label(win, textvariable=info_var, padding=(6, 4)).pack(anchor="w")
        ttk.Label(win, text="Up/Down = browse   Space = replay   Enter = add to next empty slot   * = already in a slot",
                  padding=(6, 0)).pack(anchor="w")

        MAX_AUD_ROWS = 2000
        state = {"paths": []}

        def selected_path():
            sel = lb.curselection()
            return state["paths"][sel[0]] if sel else None

        def cat_for(path):
            c = cat_var.get()
            if c != "All":
                return c
            cs = self.path_cats.get(path)
            return sorted(cs)[0] if cs else "Any"

        def refill(keep=False):
            old_sel = selected_path() if keep else None
            old_top = lb.yview()[0] if keep else 0.0
            c = cat_var.get()
            q = search_var.get().strip().lower()
            used = {s["path"] for s in self.slots if s}

            if c == "All":
                src_paths = (p for p, _ in self.library)
            else:
                src_paths = self.cat_index.get(c, ())

            if q:
                matches = [p for p in src_paths if q in os.path.basename(p).lower()]
            else:
                matches = list(src_paths)

            total_matches = len(matches)
            if total_matches > MAX_AUD_ROWS:
                shown = matches[:MAX_AUD_ROWS]
            else:
                shown = matches
            shown.sort(key=lambda p: os.path.basename(p).lower())
            state["paths"] = shown

            lb.delete(0, "end")
            for p in shown:
                lb.insert("end", ("* " if p in used else "   ") + os.path.basename(p))

            if old_sel in shown:
                i = shown.index(old_sel)
                lb.selection_set(i)
                lb.activate(i)
                lb.yview_moveto(old_top)
            elif not keep:
                if total_matches > MAX_AUD_ROWS:
                    info_var.set(f"Showing first {MAX_AUD_ROWS:,} of {total_matches:,} samples — filter by Category or Search")
                else:
                    info_var.set(f"{total_matches:,} samples")

        def load_for_audition(path):
            cat = cat_for(path)
            key = (path, cat, self.favor_large)
            if key not in self._aud_cache:
                if len(self._aud_cache) > 150:
                    self._aud_cache.clear()
                try:
                    self._aud_cache[key] = load_sample(path, MAX_SECONDS.get(cat, 1.5) * self.len_scale(), BUDGET)
                except Exception:
                    self._aud_cache[key] = None
            return self._aud_cache[key]

        def play(*_):
            p = selected_path()
            if p is None:
                return
            if not AUDIO_AVAILABLE or self.mixer.stream is None:
                info_var.set("No audio output (pip install sounddevice soundfile)")
                return
            data = load_for_audition(p)
            if data is None:
                info_var.set("Could not read that file")
                return
            self.mixer.stop_all()
            self.mixer.play(data)
            info_var.set(f"{os.path.basename(p)}   {len(data) / SAMPLE_RATE:.2f} s   {slot_bytes(data) // 1024} KB")

        def on_select(_e=None):
            if auto_var.get():
                play()

        def advance():
            sel = lb.curselection()
            if not sel or sel[0] + 1 >= lb.size():
                return
            n = sel[0] + 1
            lb.selection_clear(0, "end")
            lb.selection_set(n)
            lb.activate(n)
            lb.see(n)
            on_select()

        def put(idx):
            p = selected_path()
            if p is None:
                return
            if self.put_sample(idx, p, cat_for(p)):
                self.rebalance()
                self.update_budget()
                msg = f"{os.path.basename(p)} -> slot {idx + 1}"
                refill(keep=True)
                advance()
                info_var.set(msg)
            else:
                info_var.set("Won't fit in the remaining size budget")

        def add_next(*_):
            empties = [i for i, s in enumerate(self.slots) if s is None]
            if not empties:
                messagebox.showinfo("Full", "All 64 slots are full. Clear some first.", parent=win)
                return "break"
            put(empties[0])
            return "break"

        def add_selected():
            i = self.selected()
            if i is None:
                messagebox.showinfo("No slot", "Select a slot in the main list first.", parent=win)
                return
            put(i)

        def pick_random():
            if not state["paths"]:
                return
            n = random.randrange(len(state["paths"]))
            lb.selection_clear(0, "end")
            lb.selection_set(n)
            lb.activate(n)
            lb.see(n)
            on_select()
            if not auto_var.get():
                play()

        def close():
            self.mixer.stop_all()
            self._aud_refill = None
            self._aud_win = None
            win.destroy()

        btns = ttk.Frame(win, padding=6)
        btns.pack(fill="x")
        ttk.Button(btns, text="Play", command=play).pack(side="left")
        ttk.Button(btns, text="Stop", command=self.mixer.stop_all).pack(side="left", padx=4)
        ttk.Button(btns, text="Random", command=pick_random).pack(side="left")
        ttk.Button(btns, text="Put in selected slot", command=add_selected).pack(side="right")
        ttk.Button(btns, text="Add to next empty slot", command=add_next).pack(side="right", padx=4)

        cb.bind("<<ComboboxSelected>>", lambda e: refill())
        search_var.trace_add("write", lambda *_: refill())
        lb.bind("<<ListboxSelect>>", on_select)
        lb.bind("<Return>", add_next)
        lb.bind("<space>", lambda e: (play(), "break")[1])
        # keep the "already used" stars right when coming back from the main window
        win.bind("<FocusIn>", lambda e: e.widget is win and refill(keep=True))
        win.protocol("WM_DELETE_WINDOW", close)

        self._aud_refill = refill
        refill()
        lb.focus_set()

    def used_bytes(self):
        """Bytes the slots really take (after any extension)."""
        return sum(slot_bytes(s["data"]) for s in self.slots if s)

    def base_bytes(self):
        """Bytes the slots take at their normal (category-capped) length."""
        return sum(slot_bytes(s["base"]) for s in self.slots if s)

    def put_sample(self, idx, path, cat, tries=1):
        """Load path into slot idx honouring byte budget. Returns True on success."""
        empty_after = sum(1 for i, s in enumerate(self.slots) if s is None and i != idx)
        used = self.base_bytes() - (slot_bytes(self.slots[idx]["base"]) if self.slots[idx] else 0)
        left = BUDGET - used
        limit = min(left - MIN_SLOT_BYTES * empty_after, 2 * left // (empty_after + 1))

        if limit < MIN_SLOT_BYTES:
            return False

        try:
            data, more = load_sample_ex(path, MAX_SECONDS.get(cat, 1.5) * self.len_scale(), limit)
        except Exception:
            return False

        if data is None:
            return False

        self.slots[idx] = {"name": clean_name(os.path.basename(path)), "cat": cat,
                           "path": path, "data": data, "base": data, "more": more}
        self.refresh_row(idx)
        return True

    def rebalance(self):
        """Spend whatever budget is left on samples that were cut short.

        Only the length of already-chosen samples changes, never which samples are
        chosen. The spare bytes are shared out in proportion to current length (so
        loops stay longer than hats) and re-shared if a file ends early."""
        for s in self.slots:
            if s:
                s["data"] = s["base"]
        if MAXIMISE_TIME and self.favor_large:
            cand = [i for i, s in enumerate(self.slots) if s and s["more"]]
            for _ in range(8):
                left = BUDGET - self.used_bytes()
                if not cand or left < 2 * MIN_SLOT_BYTES:
                    break
                total = sum(slot_bytes(self.slots[i]["data"]) for i in cand)
                still = []
                for i in cand:
                    s = self.slots[i]
                    cur = slot_bytes(s["data"])
                    target = cur + int(left * cur / total)
                    if target - cur < MIN_SLOT_BYTES // 4:
                        still.append(i)
                        continue
                    secs = ((target - WAV_HEADER) // 2 + 1) / SAMPLE_RATE
                    try:
                        data, more = load_sample_ex(s["path"], secs, target)
                    except Exception:
                        continue
                    if data is None or len(data) < len(s["data"]):
                        continue
                    s["data"] = data
                    if more:
                        still.append(i)
                cand = still
        for i, s in enumerate(self.slots):
            if s:
                self.refresh_row(i)

    def add_four(self, cat):
        if not self.library:
            messagebox.showinfo("No library", "Choose a sample folder first.")
            return
        
        empties = [i for i, s in enumerate(self.slots) if s is None]
        if not empties:
            messagebox.showinfo("Full", "All 64 slots are full. Clear some first.")
            return
        
        pool = self.candidates(cat)
        self.weighted_shuffle(pool, max_pick=128)
        if not pool:
            messagebox.showinfo("Nothing found", f"No unused '{cat}' samples in your library.")
            return
        
        filled = 0
        for idx in empties:
            if filled == 4 or not pool:
                break
            while pool:
                p = pool.pop()
                if self.put_sample(idx, p, cat):
                    filled += 1
                    break
        
        self.rebalance()
        self.update_budget()
        self.update_idletasks()

    def autofill(self):
        if not self.library:
            messagebox.showinfo("No library", "Choose a sample folder first.")
            return
        
        self.config(cursor="watch")
        self.update_idletasks()
        
        for cat, count in AUTOFILL_PLAN:
            pool = self.candidates(cat)
            self.weighted_shuffle(pool, max_pick=max(64, count * 16))
            for _ in range(count):
                empties = [i for i, s in enumerate(self.slots) if s is None]
                if not empties or not pool:
                    break
                while pool:
                    if self.put_sample(empties[0], pool.pop(), cat):
                        break
        
        pool = self.candidates("Any")
        self.weighted_shuffle(pool, max_pick=512)
        for idx in [i for i, s in enumerate(self.slots) if s is None]:
            while pool:
                if self.put_sample(idx, pool.pop(), "Any"):
                    break
        
        self.rebalance()
        self.config(cursor="")
        self.update_budget()

    def selected(self):
        sel = self.tree.selection()
        return int(sel[0]) if sel else None

    def preview(self):
        i = self.selected()
        if i is not None and self.slots[i]:
            self.mixer.play(self.slots[i]["data"])

    def reroll(self):
        i = self.selected()
        if i is None:
            return
        cat = self.slots[i]["cat"] if self.slots[i] else "Any"
        pool = self.candidates(cat)
        self.weighted_shuffle(pool, max_pick=64)
        old = self.slots[i]
        
        while pool:
            if self.put_sample(i, pool.pop(), cat):
                self.rebalance()
                self.update_budget()
                return
        self.slots[i] = old

    def clear_selected(self):
        i = self.selected()
        if i is not None:
            self.slots[i] = None
            self.refresh_row(i)
            self.rebalance()
            self.update_budget()

    def clear_all(self):
        self.slots = [None] * NUM_SLOTS
        for i in range(NUM_SLOTS):
            self.refresh_row(i)
        self.update_budget()

    def refresh_row(self, i):
        s = self.slots[i]
        vals = (i + 1, s["name"], s["cat"], f"{slot_bytes(s['data']) // 1024}") if s else (i + 1, "-", "", "")
        self.tree.item(str(i), values=vals)

    def update_budget(self):
        used = self.used_bytes()
        filled = sum(1 for s in self.slots if s)
        self.budget_bar["value"] = used
        self.budget_label.config(text=f"{filled}/64 slots   {used / 1e6:.2f} MB of {BUDGET / 1e6:.2f} MB")

    # ------------------------------------------------------------- export
    def pick_out_folder(self, force=False):
        if self.out_folder and not force:
            return self.out_folder
        folder = filedialog.askdirectory(title="Choose folder for the sequential ZIP files")
        if folder:
            self.out_folder = folder
            self.out_label.config(text=f"Export folder: {folder}")
        return self.out_folder

    @staticmethod
    def next_zip_number(folder):
        nums = []
        for f in os.listdir(folder):
            m = re.fullmatch(r"grab64_(\d+)\.zip", f, re.I)
            if m:
                nums.append(int(m.group(1)))
        return max(nums, default=0) + 1

    def write_zip(self, folder):
        """Write the current slots to the next free grab64_NNN.zip in folder.
        Returns (path, count, total_bytes)."""
        filled = [(i, s) for i, s in enumerate(self.slots) if s]
        n = self.next_zip_number(folder)
        inner = f"grab64_{n:03d}"
        path = os.path.join(folder, inner + ".zip")
        total = 0
        manifest = []
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for i, s in filled:
                buf = io.BytesIO()
                sf.write(buf, s["data"], SAMPLE_RATE, format="WAV", subtype="PCM_16")
                z.writestr(f"{inner}/{i + 1:02d}_{s['name']}.wav", buf.getvalue())
                total += len(buf.getvalue())
                manifest.append(f"{i + 1:02d}  {s['cat']:<18} {s['name']}  <- {s['path']}")
            z.writestr(f"{inner}/slots.txt",
                       f"{SAMPLE_RATE} Hz, 16-bit mono, {total} bytes total\n" + "\n".join(manifest))
        return path, len(filled), total

    def export_zip(self):
        filled = [s for s in self.slots if s]
        if not filled:
            messagebox.showinfo("Empty", "No samples to export.")
            return
        if len(filled) < NUM_SLOTS and not messagebox.askyesno("Not full", f"Only {len(filled)} of 64 slots filled. Export anyway?"):
            return
        if not AUDIO_AVAILABLE or sf is None:
            messagebox.showerror("Error", "Export requires soundfile library. Install with: pip install soundfile")
            return
        folder = self.pick_out_folder()
        if not folder:
            return
        path, count, total = self.write_zip(folder)
        messagebox.showinfo("Exported", f"Saved {count} samples ({total / 1e6:.2f} MB)\n{path}")

    def batch_export(self):
        """Auto-fill 64 slots, export to the next sequential ZIP, clear, repeat.
        Samples used in one pack are not reused in the following packs."""
        if not self.library:
            messagebox.showinfo("No library", "Choose a sample folder first.")
            return
        if not AUDIO_AVAILABLE or sf is None:
            messagebox.showerror("Error", "Export requires soundfile library. Install with: pip install soundfile")
            return
        count = simpledialog.askinteger("Batch", "How many ZIP packs to generate?",
                                        initialvalue=5, minvalue=1, maxvalue=500, parent=self)
        if not count:
            return
        folder = self.pick_out_folder()
        if not folder:
            return
        self.exclude = set()
        made = []
        try:
            for k in range(count):
                self.clear_all()
                self.autofill()
                filled = [s for s in self.slots if s]
                if not filled:
                    break
                path, n, total = self.write_zip(folder)
                made.append(os.path.basename(path))
                self.exclude |= {s["path"] for s in filled}
                self.lib_label.config(text=f"  Batch: {len(made)}/{count} packs written")
                self.update_idletasks()
                if n < NUM_SLOTS:
                    break  # library ran out of unused samples
        finally:
            self.exclude = set()
            self.lib_label.config(text=f"  {len(self.library)} samples found")
        if made:
            messagebox.showinfo("Batch done", f"Wrote {len(made)} ZIP(s) to\n{folder}\n\n{made[0]}  ...  {made[-1]}"
                                + ("\n\n(Stopped early: ran out of unused samples.)" if len(made) < count else ""))
        else:
            messagebox.showinfo("Nothing exported", "No samples could be loaded.")

    def report_callback_exception(self, exc, val, tb):
        import traceback
        text = "".join(traceback.format_exception(exc, val, tb))
        try:
            log = os.path.join(os.path.dirname(os.path.abspath(__file__)), "grab64_error.log")
            with open(log, "a", encoding="utf-8") as f:
                f.write(text + "\n")
        except Exception:
            pass
        messagebox.showerror("GRAB64 error", text[-1500:])

    def _close(self):
        self.mixer.close()
        self.destroy()


if __name__ == "__main__":
    App().mainloop()