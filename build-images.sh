#!/usr/bin/env bash
#
# build-images.sh — generate responsive web derivatives from image sources.
#
# Replaces optimize-images.sh, which converted format without ever resizing:
# it re-encoded 6240px camera files at their native size, saving ~6% overall
# and actually making photography-08 LARGER (2.70MB -> 3.11MB).
#
# All the win is in pixel dimensions, not codec. The CSS caps display at
# 80vw (40vw on wide screens) with object-fit: contain, so 2000px on the
# long edge is the honest ceiling for any display we can expect.
#
# Outputs into assets/images/w/ as <name>-<width>.webp, for use in a plain
# srcset. Never upscales: widths above the source are skipped, except that
# every source emits at least the smallest width.
#
# AVIF would save a further ~20-25% but needs <picture> markup; revisit once
# the srcset ladder is in place.
#
# Requires: magick (ImageMagick), cwebp.

set -euo pipefail

SRC_DIRS=("assets/images/projects" "assets/images/photography" "assets/images/berensson")
OUT="assets/images/w"
WIDTHS=(640 1000 1500 2000)
Q=80   # measured indistinguishable from q85 on contain-fitted photos

for tool in magick cwebp; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 1; }
done

# Clean, so a source that shrank (e.g. after trimming white borders) cannot
# leave stale wider derivatives behind for the HTML to point at.
rm -rf "$OUT"
mkdir -p "$OUT"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

total_src=0
total_out=0
count=0

for dir in "${SRC_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r -d '' src; do
    base="$(basename "${src%.*}")"

    # Skip the orphaned underscore-named cafx duplicates: unreferenced,
    # superseded by the hyphenated rose-hallgren-cafx-{1,2,3}.jpg.
    case "$base" in rose_hallgren_cafx_*) continue ;; esac

    src_w="$(magick identify -format '%w' "$src[0]" 2>/dev/null || echo 0)"
    [ "$src_w" -gt 0 ] || { echo "skip (unreadable): $src" >&2; continue; }

    total_src=$((total_src + $(stat -f%z "$src")))
    count=$((count + 1))
    printf '==> %-46s %5spx\n' "$base" "$src_w"

    emitted=""
    for w in "${WIDTHS[@]}"; do
      # Never upscale: cap each rung at the source width, and skip a rung that
      # would duplicate one already emitted. A 984px source yields 640 and 984,
      # not a lone 640.
      target=$(( w > src_w ? src_w : w ))
      case " $emitted " in *" $target "*) continue ;; esac
      emitted="$emitted $target"

      flat="$tmp/$base-$target.png"
      magick "$src[0]" -auto-orient -resize "${target}x>" -strip \
             -colorspace sRGB "$flat"
      cwebp -quiet -q "$Q" -m 6 "$flat" -o "$OUT/$base-$target.webp"
      rm -f "$flat"

      sz=$(stat -f%z "$OUT/$base-$target.webp")
      total_out=$((total_out + sz))
      printf '      %5spx  %8s B\n' "$target" "$sz"
    done
  done < <(find "$dir" -maxdepth 1 -type f \
             \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
done

echo
printf '%s sources: %s MB\n' "$count" "$(echo "scale=2; $total_src/1048576" | bc)"
printf 'derivatives (all widths): %s MB\n' "$(echo "scale=2; $total_out/1048576" | bc)"

# --- print derivatives ------------------------------------------------------
#
# Chrome decodes WebP and re-embeds it near-uncompressed when printing: a
# 124 KB WebP became 2.47 MB inside the PDF, while an equivalent JPEG passed
# through untouched. So the print path gets its own JPEG set, wired up with
# <source media="print"> so the screen still gets WebP.
#
# The deck is 16:9 and screen-first. Its largest slot is the ~210mm hero,
# which is ~1180px when the PDF is shown full-screen on a 1920px display, so
# 1200px is exactly right and 1500 was simply heavier for no visible gain.

PRINT_OUT="assets/images/print"
PRINT_W=1200
PRINT_Q=80

rm -rf "$PRINT_OUT"
mkdir -p "$PRINT_OUT"
print_total=0
for dir in "${SRC_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r -d '' src; do
    base="$(basename "${src%.*}")"
    case "$base" in rose_hallgren_cafx_*) continue ;; esac
    magick "$src[0]" -auto-orient -resize "${PRINT_W}x>" -strip \
           -colorspace sRGB -quality "$PRINT_Q" -interlace none \
           "$PRINT_OUT/$base.jpg"
    print_total=$((print_total + $(stat -f%z "$PRINT_OUT/$base.jpg")))
  done < <(find "$dir" -maxdepth 1 -type f \
             \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
done
printf 'print derivatives: %s MB\n' "$(echo "scale=2; $print_total/1048576" | bc)"
