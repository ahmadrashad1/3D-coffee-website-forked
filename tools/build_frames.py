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

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / "public" / "frames24"
MANIFEST = ROOT / "public" / "frames" / "frames.json"
FPS = 24

# Veo watermark ("Veo" text, bottom-right corner) is composited at a fixed
# screen-space position for the whole source video. Box measured at the
# source's native 1920x1080 resolution; scaled proportionally for other
# --width values.
NATIVE_SIZE = (1920, 1080)
WATERMARK_BOX_NATIVE = (1848, 1028, 1912, 1068)  # (x0, y0, x1, y1)


def remove_watermark(im: Image.Image) -> Image.Image:
    scale = im.width / NATIVE_SIZE[0]
    x0, y0, x1, y1 = (round(v * scale) for v in WATERMARK_BOX_NATIVE)
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.width, x1), min(im.height, y1)

    bgr = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    mask = np.zeros(bgr.shape[:2], dtype=np.uint8)
    mask[y0:y1, x0:x1] = 255
    inpainted = cv2.inpaint(bgr, mask, inpaintRadius=6, flags=cv2.INPAINT_TELEA)
    return Image.fromarray(cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB))


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


def encode_webp(png_dir: Path, out_dir: Path, quality: int, strip_watermark: bool) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("frame_*.webp"):
        stale.unlink()
    count = 0
    for png in sorted(png_dir.glob("frame_*.png")):
        im = Image.open(png).convert("RGB")
        if strip_watermark:
            im = remove_watermark(im)
        im.save(out_dir / f"{png.stem}.webp", "WEBP", quality=quality, method=6)
        count += 1
    return count


def write_manifest(count: int):
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(
        json.dumps({"count": count, "pattern": "/frames24/frame_%04d.webp"}, indent=2) + "\n"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("video", type=Path, help="Path to the source video")
    ap.add_argument("--width", type=int, default=1920, help="Target frame width in px (default: 1920, the source's native width)")
    ap.add_argument("--quality", type=int, default=85, help="WebP quality 0-100 (default: 85)")
    ap.add_argument("--no-watermark-removal", action="store_true", help="Skip the Veo watermark inpainting step")
    args = ap.parse_args()

    if not args.video.exists():
        sys.exit(f"video not found: {args.video}")

    with tempfile.TemporaryDirectory() as tmp:
        tmp_dir = Path(tmp)
        n = extract_pngs(args.video, tmp_dir, args.width)
        print(f"extracted {n} frames at width={args.width}")
        n2 = encode_webp(tmp_dir, FRAMES_DIR, args.quality, strip_watermark=not args.no_watermark_removal)
        print(f"encoded {n2} webp frames -> {FRAMES_DIR}")

    write_manifest(n2)
    print(f"manifest written: {MANIFEST}")


if __name__ == "__main__":
    main()
