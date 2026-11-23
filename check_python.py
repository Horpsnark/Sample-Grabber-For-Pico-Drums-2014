#!/usr/bin/env python3
"""Verify (and optionally install) Python dependencies for GRAB64."""

import argparse
import importlib
import os
import platform
import subprocess
import sys


REQUIRED_MIN_PYTHON = (3, 9)
PIP_PACKAGES = ("numpy", "soundfile", "sounddevice")


def check_python_version() -> bool:
    ver = sys.version_info[:3]
    ok = ver >= REQUIRED_MIN_PYTHON
    status = "OK" if ok else "FAIL"
    print(f"[{status}] Python {ver[0]}.{ver[1]}.{ver[2]} (requires 3.9+)")
    return ok


def check_tkinter() -> bool:
    try:
        importlib.import_module("tkinter")
        print("[OK]   tkinter (GUI toolkit)")
        return True
    except Exception as exc:
        print(f"[MISS] tkinter ({exc})")
        system = platform.system()
        if system == "Linux":
            print("       Install on Debian/Ubuntu: sudo apt-get install python3-tk")
            print("       Install on Fedora:        sudo dnf install python3-tkinter")
        elif system == "Darwin":
            print("       Install Python from python.org or: brew install python-tk")
        else:
            print("       Re-run the Python installer from python.org with 'tcl/tk and IDLE' enabled.")
        return False


def check_package(name: str) -> bool:
    try:
        mod = importlib.import_module(name)
        ver = getattr(mod, "__version__", "installed")
        print(f"[OK]   {name} ({ver})")
        return True
    except Exception as exc:
        print(f"[MISS] {name} ({exc})")
        return False


def check_audio_devices() -> None:
    try:
        import sounddevice as sd

        devs = sd.query_devices()
        out_devs = [d for d in devs if d.get("max_output_channels", 0) > 0]
        print(f"[OK]   Audio output devices detected: {len(out_devs)}")
    except Exception as exc:
        print(f"[WARN] Could not query audio output devices: {exc}")


def install_requirements() -> int:
    req_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "requirements.txt")
    cmd = [sys.executable, "-m", "pip", "install", "--upgrade", "-r", req_path]
    print("\nRunning:", " ".join(cmd))
    return subprocess.call(cmd)


def main() -> int:
    parser = argparse.ArgumentParser(description="Check and install GRAB64 Python dependencies.")
    parser.add_argument(
        "--install",
        action="store_true",
        help="Automatically run pip install -r requirements.txt if any packages are missing.",
    )
    args = parser.parse_args()

    print("GRAB64 Python Environment Check")
    print("=" * 34)
    py_ok = check_python_version()
    tk_ok = check_tkinter()
    missing = [pkg for pkg in PIP_PACKAGES if not check_package(pkg)]

    if missing and args.install:
        rc = install_requirements()
        if rc != 0:
            print(f"\n[FAIL] pip install exited with code {rc}")
            return rc
        print("\nRe-checking packages...")
        missing = [pkg for pkg in PIP_PACKAGES if not check_package(pkg)]

    if not missing:
        check_audio_devices()

    print()
    if py_ok and tk_ok and not missing:
        print("Ready! Run GRAB64 with:")
        print(f"  {os.path.basename(sys.executable)} grab64_dark.py")
        return 0

    if missing and not args.install:
        print("To install missing Python packages, run:")
        print(f"  {os.path.basename(sys.executable)} -m pip install -r requirements.txt")
        print("Or re-run this script with --install:")
        print(f"  {os.path.basename(sys.executable)} check_python.py --install")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
