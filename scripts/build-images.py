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
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIRS = ("projects", "photography", "berensson", "codesign", "athh")
RUNGS = (640, 750, 1000, 1250, 1500, 2000)
SOURCE_EXT = (".jpg", ".jpeg", ".png")
PRINT_WIDTH = 1200
WASH_WIDTH = 40
# Share cards. Platforms lay out link previews at 1.91:1 and letterbox or crop
# anything else, so these are generated to that shape rather than trusted to
# whatever a photograph happens to be.
SHARE_W, SHARE_H = 1200, 630
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


def expected_dims(source_dims, box, fit_box=False):
    """The pixel size ImageMagick will produce for this source at this target.

    `-resize WxH>` only shrinks, and preserves aspect; the wash tile fits inside
    a square instead of matching a width.
    """
    sw, sh = source_dims
    scale = min(box / sw, box / sh) if fit_box else min(box / sw, 1.0)
    return max(1, round(sw * scale)), max(1, round(sh * scale))


def stale(derivative, source_dims, box, fit_box=False):
    """True if the derivative is missing, unreadable, or not the exact size this
    source would produce at this target.

    Deliberately NOT mtime-based. A git checkout stamps every file with the
    checkout time, so in CI "is the source newer than its derivative" answers
    arbitrarily depending on the order git happened to write them — it would
    rebuild everything on one run and nothing on the next.

    Comparing the exact expected height instead is deterministic and strictly
    sharper. Shaving a hairline off a source moves the aspect ratio by under
    half a percent, inside any sane ratio tolerance, but it moves the rendered
    height by a whole pixel: rock-stage-03 at 750 wide went from 1119 to 1126,
    which this catches and a ratio comparison did not.
    """
    if not os.path.exists(derivative):
        return True
    dims = size(derivative)
    if dims is None:
        return True
    want_w, want_h = expected_dims(source_dims, box, fit_box)
    # one pixel of slack for the encoders' own rounding
    return abs(dims[0] - want_w) > 1 or abs(dims[1] - want_h) > 1


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

    for sub in ("avif", "w", "print", "wash", "share"):
        os.makedirs(os.path.join(ROOT, "assets", "images", sub), exist_ok=True)

    built = removed = checked = 0
    problems = []

    # Every derivative is named after the source's stem alone, with no directory
    # in it, so two sources anywhere in SOURCE_DIRS that share a basename write
    # to the same files and the second silently replaces the first. .pages.yml
    # accepts both .jpg and .jpeg, which makes cover.jpg and cover.jpeg exactly
    # this collision. Nothing else in the pipeline can see it.
    by_stem = {}
    for source in sources():
        by_stem.setdefault(os.path.splitext(os.path.basename(source))[0], []).append(source)
    for stem_name, paths in sorted(by_stem.items()):
        if len(paths) > 1:
            rel = ", ".join(os.path.relpath(p, ROOT) for p in paths)
            problems.append(f"{stem_name}: {len(paths)} sources share this name ({rel})")

    # Share cards, for whichever images settings.json nominates. Generated here
    # rather than for every source, because 123 of them would be 123 files
    # nobody links to.
    share_stems = set()
    try:
        settings = json.load(open(os.path.join(ROOT, "content", "settings.json"), encoding="utf-8"))
        site = settings.get("site", {})
        for value in [site.get("social_image")] + list(site.get("social_images") or []):
            if value:
                share_stems.add(os.path.splitext(os.path.basename(value))[0])
    except Exception as exc:
        problems.append(f"settings.json unreadable for share cards: {exc}")

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
            outdated = args.force or stale(target, dims, width, fit_box=(kind == "wash"))
            if not outdated:
                continue
            if args.check:
                problems.append(f"{os.path.basename(target)}: stale or missing")
                continue

            # One unreadable file must not abandon the other 122 images. A
            # resize can succeed and the encode that follows it fail, and an
            # uncaught error there used to kill the run mid-batch and print a
            # traceback instead of saying which image was at fault. Collected
            # like every other problem, and the run still exits non-zero.
            try:
                if kind in ("avif", "webp"):
                    tmp = os.path.join(ROOT, f".build-{stem}-{width}.png")
                    try:
                        run([MAGICK, f"{source}[0]", "-auto-orient", "-resize", f"{width}x>",
                             "-strip", "-colorspace", "sRGB", tmp])
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
            except RuntimeError as exc:
                problems.append(f"{os.path.basename(target)}: {exc}")
                # a half-written target is worse than none
                if os.path.exists(target):
                    os.remove(target)
                continue
            built += 1
            print(f"  {os.path.relpath(target, ROOT)}")

    # share cards last, so a missing one is reported with everything else
    for source in sources():
        stem_name = os.path.splitext(os.path.basename(source))[0]
        if stem_name not in share_stems:
            continue
        target = os.path.join(ROOT, "assets", "images", "share", f"{stem_name}.jpg")
        checked += 1
        dims = size(target)
        if not args.force and dims == (SHARE_W, SHARE_H):
            continue
        if args.check:
            problems.append(f"{stem_name}.jpg (share): stale or missing")
            continue
        run([MAGICK, f"{source}[0]", "-auto-orient",
             "-resize", f"{SHARE_W}x{SHARE_H}^", "-gravity", "center",
             "-extent", f"{SHARE_W}x{SHARE_H}", "-strip", "-colorspace", "sRGB",
             "-quality", "86", "-interlace", "none", target])
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
