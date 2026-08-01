#!/usr/bin/env python3
"""
Rebuild every image derivative from the sources in assets/images/<source dir>/.

The site serves four derivatives per photograph:

  assets/images/avif/<stem>-<width>.avif   the srcset ladder, first choice
  assets/images/w/<stem>-<width>.webp      the same ladder, fallback
  assets/images/print/<stem>.jpg           1200px JPEG for Cmd+P
  assets/images/wash/<stem>.jpg            40px JPEG behind the blurred backdrop

Run it after adding or editing a source image:

    python3 scripts/build-images.py            # only what is out of date
    python3 scripts/build-images.py --force    # everything
    python3 scripts/build-images.py --check    # rebuild nothing, just report

Why this exists as a script rather than a command someone remembers: the ladder
is capped per image at the source width, so shaving a few pixels off a source
can make an existing rung illegal. Regenerating by hand missed that, and missed
that a resize can silently succeed while the encode that follows it fails,
leaving a stale derivative that still looks plausible. --check exists because
the failure mode is invisible: a stale rung is a valid image of the wrong
picture. It compares aspect ratios rather than mtimes, so it catches a
derivative built from a since-edited source no matter how the files were made.
"""

import argparse
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIRS = ("projects", "photography", "berensson", "codesign", "athh")
RUNGS = (640, 750, 1000, 1250, 1500, 2000)
SOURCE_EXT = (".jpg", ".jpeg", ".png")
PRINT_WIDTH = 1200
WASH_WIDTH = 40
# A rung and its source may differ by a pixel of rounding; more than that means
# the derivative was built from a different picture.
ASPECT_TOLERANCE = 0.01


def which(*names):
    """First of `names` that is executable on PATH, or None.

    ImageMagick 7 installs `magick`; ImageMagick 6, which is what Ubuntu still
    packages and therefore what a GitHub runner gets, installs `convert` and no
    `magick` at all. Resolving it once here means the rest of the script does
    not care which is present.
    """
    for name in names:
        for d in os.environ.get("PATH", "").split(os.pathsep):
            if d and os.access(os.path.join(d, name), os.X_OK):
                return os.path.join(d, name)
    return None


MAGICK = None  # resolved in main()


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"{cmd[0]} failed: {result.stderr.strip() or result.stdout.strip()}")
    return result.stdout.strip()


def size(path):
    """(width, height), honouring EXIF rotation, or None if unreadable."""
    try:
        w, h = run([MAGICK, f"{path}[0]", "-auto-orient", "-format", "%w %h", "info:"]).split()
        return int(w), int(h)
    except (RuntimeError, ValueError):
        return None


def sources():
    for directory in SOURCE_DIRS:
        pattern = os.path.join(ROOT, "assets", "images", directory, "*")
        for path in sorted(glob.glob(pattern)):
            if os.path.splitext(path)[1].lower() in SOURCE_EXT:
                yield path


def widths_for(source_width):
    """The ladder, capped at the source width. Deduped: a narrow source
    collapses the upper rungs onto a single one rather than upscaling."""
    return sorted({min(rung, source_width) for rung in RUNGS})


def stale(derivative, source, source_dims, compare_aspect=True):
    """True if the derivative is missing, unreadable, older than its source, or
    a different shape from it.

    mtime is the primary test and aspect ratio only the backstop, not the other
    way round. Shaving a hairline off a source moves the aspect ratio by well
    under one percent, so an aspect-only check silently passed every derivative
    this script was written to catch."""
    if not os.path.exists(derivative):
        return True
    if os.path.getmtime(source) > os.path.getmtime(derivative):
        return True
    if not compare_aspect:
        return False
    dims = size(derivative)
    if dims is None:
        return True
    sw, sh = source_dims
    dw, dh = dims
    return abs(dw / dh - sw / sh) > ASPECT_TOLERANCE


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="rebuild every derivative")
    parser.add_argument("--check", action="store_true", help="report only, build nothing")
    args = parser.parse_args()

    global MAGICK
    MAGICK = which("magick", "convert")
    if MAGICK is None:
        sys.exit("build-images: neither magick nor convert is on PATH (install imagemagick)")
    for tool in ("avifenc", "cwebp"):
        if which(tool) is None:
            sys.exit(f"build-images: {tool} is not on PATH "
                     f"(install libavif-bin and webp)")

    for sub in ("avif", "w", "print", "wash"):
        os.makedirs(os.path.join(ROOT, "assets", "images", sub), exist_ok=True)

    built = removed = checked = 0
    problems = []

    for source in sources():
        stem = os.path.splitext(os.path.basename(source))[0]
        dims = size(source)
        if dims is None:
            problems.append(f"{stem}: source unreadable")
            continue
        source_width = dims[0]
        widths = widths_for(source_width)

        # A rung wider than the source can no longer be produced, so any file
        # sitting at that width is left over from a wider version of the source.
        for sub, ext in (("avif", "avif"), ("w", "webp")):
            for old in glob.glob(os.path.join(ROOT, "assets", "images", sub, f"{stem}-*.{ext}")):
                width = int(old.rsplit("-", 1)[1].split(".")[0])
                if width not in widths:
                    if args.check:
                        problems.append(f"{os.path.basename(old)}: rung wider than its source")
                    else:
                        os.remove(old)
                        removed += 1

        targets = [
            (os.path.join(ROOT, "assets", "images", "avif", f"{stem}-{w}.avif"), w, "avif")
            for w in widths
        ] + [
            (os.path.join(ROOT, "assets", "images", "w", f"{stem}-{w}.webp"), w, "webp")
            for w in widths
        ] + [
            (os.path.join(ROOT, "assets", "images", "print", f"{stem}.jpg"), PRINT_WIDTH, "print"),
            (os.path.join(ROOT, "assets", "images", "wash", f"{stem}.jpg"), WASH_WIDTH, "wash"),
        ]

        for target, width, kind in targets:
            checked += 1
            # wash is a square thumbnail, so its aspect never matches the source
            outdated = args.force or stale(target, source, dims, compare_aspect=(kind != "wash"))
            if not outdated:
                continue
            if args.check:
                problems.append(f"{os.path.basename(target)}: stale or missing")
                continue

            if kind in ("avif", "webp"):
                tmp = os.path.join(ROOT, f".build-{stem}-{width}.png")
                run([MAGICK, f"{source}[0]", "-auto-orient", "-resize", f"{width}x>",
                     "-strip", "-colorspace", "sRGB", tmp])
                try:
                    if kind == "avif":
                        run(["avifenc", "-q", "50", "-s", "6", tmp, target])
                    else:
                        run(["cwebp", "-q", "78", "-m", "4", "-mt", tmp, "-o", target])
                finally:
                    os.path.exists(tmp) and os.remove(tmp)
            elif kind == "print":
                run([MAGICK, f"{source}[0]", "-auto-orient", "-resize", f"{PRINT_WIDTH}x>",
                     "-strip", "-colorspace", "sRGB", "-quality", "80",
                     "-interlace", "none", target])
            else:
                run([MAGICK, f"{source}[0]", "-auto-orient", "-resize", f"{WASH_WIDTH}x{WASH_WIDTH}",
                     "-strip", "-colorspace", "sRGB", "-quality", "72",
                     "-interlace", "none", target])
            built += 1
            print(f"  {os.path.relpath(target, ROOT)}")

    print(f"\nbuild-images: {checked} derivatives checked, {built} built, {removed} stale removed")
    if problems:
        print(f"build-images: {len(problems)} problem(s)")
        for p in problems:
            print(f"  {p}")
        sys.exit(1)


if __name__ == "__main__":
    main()
