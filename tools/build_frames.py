#!/usr/bin/env python3
"""Export scroll-film frames from the source video into frames24/ as WebP,
and regenerate frames/frames.json.

Usage:
    python tools/build_frames.py <path-to-source-video> [--width 1920] [--quality 85]
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / "frames24"
MANIFEST = ROOT / "frames" / "frames.json"
FPS = 24


def extract_pngs(video_path: Path, out_dir: Path, width: int) -> int:
    scale = f"scale={width}:-1:flags=lanczos" if width else "scale=iw:ih"
    cmd = [
        "ffmpeg", "-y", "-i", str(video_path),
        "-vf", f"fps={FPS},{scale}",
        "-vsync", "0",
        str(out_dir / "frame_%04d.png"),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"ffmpeg failed:\n{result.stderr}")
    return len(list(out_dir.glob("frame_*.png")))


def encode_webp(png_dir: Path, out_dir: Path, quality: int) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("frame_*.webp"):
        stale.unlink()
    count = 0
    for png in sorted(png_dir.glob("frame_*.png")):
        im = Image.open(png).convert("RGB")
        im.save(out_dir / f"{png.stem}.webp", "WEBP", quality=quality, method=6)
        count += 1
    return count


def write_manifest(count: int):
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps({"count": count, "pattern": "frames24/frame_%04d.webp"}, indent=2) + "\n"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("video", type=Path, help="Path to the source video")
    ap.add_argument("--width", type=int, default=1920, help="Target frame width in px (default: 1920, the source's native width)")
    ap.add_argument("--quality", type=int, default=85, help="WebP quality 0-100 (default: 85)")
    args = ap.parse_args()

    if not args.video.exists():
        sys.exit(f"video not found: {args.video}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        n = extract_pngs(args.video, tmp_dir, args.width)
        print(f"extracted {n} frames at width={args.width}")
        n2 = encode_webp(tmp_dir, FRAMES_DIR, args.quality)
        print(f"encoded {n2} webp frames -> {FRAMES_DIR}")

    write_manifest(n2)
    print(f"manifest written: {MANIFEST}")


if __name__ == "__main__":
    main()
