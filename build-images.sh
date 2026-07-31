#!/usr/bin/env bash
#
# build-images.sh — generate responsive web derivatives from image sources.
#
# Replaces optimize-images.sh, which converted format without ever resizing:
# it re-encoded 6240px camera files at their native size, saving ~6% overall
# and actually making photography-08 LARGER (2.70MB -> 3.11MB).
#
# All the win is in pixel dimensions, not codec. The CSS caps display at
# 80vw (40vw on wide screens), so 2000px on the long edge is the honest
# ceiling for any display we can expect.
#
# Outputs three sets:
#   assets/images/w/     <name>-<width>.webp   screen, srcset ladder
#   assets/images/avif/  <name>-<width>.avif   screen, preferred; ~40% smaller
#   assets/images/print/ <name>.jpg            the Cmd+P deck
#
# CRASH SAFETY: everything is built into a staging directory and only swapped
# into place once the whole run succeeds. An earlier version deleted the output
# directory first and rebuilt in place, so a run that was interrupted part-way
# left 95 derivatives missing — which shipped, and broke images on the live
# site. Never delete the live set before the replacement exists.
#
# Requires: magick (ImageMagick), cwebp, avifenc.

set -euo pipefail

SRC_DIRS=("assets/images/projects" "assets/images/photography" "assets/images/berensson" "assets/images/codesign" "assets/images/athh")
OUT="assets/images/w"
AVIF_OUT="assets/images/avif"
PRINT_OUT="assets/images/print"
WIDTHS=(640 1000 1500 2000)
Q=80          # webp; measured indistinguishable from q85 on contain-fitted photos
AVIF_CQ=32    # ~40% smaller than webp q80 at visually equivalent quality
PRINT_W=1200  # the deck's largest slot is the ~210mm hero, ~1180px full-screen
PRINT_Q=80

for tool in magick cwebp avifenc; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 1; }
done

stage="$(mktemp -d)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp" "$stage"' EXIT
mkdir -p "$stage/w" "$stage/avif" "$stage/print"

total_src=0; total_webp=0; total_avif=0; total_print=0; count=0

for dir in "${SRC_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r -d '' src; do
    base="$(basename "${src%.*}")"

    # Skip the orphaned underscore-named cafx duplicates: unreferenced,
    # superseded by the hyphenated rose-hallgren-cafx-{1,2,3}.jpg.
    case "$base" in rose_hallgren_cafx_*) continue ;; esac

    src_w="$(magick identify -format '%w' "${src}[0]" 2>/dev/null || echo 0)"
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
      magick "${src}[0]" -auto-orient -resize "${target}x>" -strip \
             -colorspace sRGB "$flat"
      cwebp -quiet -q "$Q" -m 6 "$flat" -o "$stage/w/$base-$target.webp"
      avifenc --min 0 --max 63 -a end-usage=q -a "cq-level=$AVIF_CQ" \
              -s 6 -j all "$flat" "$stage/avif/$base-$target.avif" >/dev/null 2>&1
      rm -f "$flat"

      wsz=$(stat -f%z "$stage/w/$base-$target.webp")
      asz=$(stat -f%z "$stage/avif/$base-$target.avif")
      total_webp=$((total_webp + wsz)); total_avif=$((total_avif + asz))
      printf '      %5spx  webp %8s B   avif %8s B\n' "$target" "$wsz" "$asz"
    done

    # print derivative: JPEG, because Chrome re-embeds WebP almost uncompressed
    # when printing (124KB of WebP became 2.47MB of PDF)
    magick "${src}[0]" -auto-orient -resize "${PRINT_W}x>" -strip \
           -colorspace sRGB -quality "$PRINT_Q" -interlace none \
           "$stage/print/$base.jpg"
    total_print=$((total_print + $(stat -f%z "$stage/print/$base.jpg")))
  done < <(find "$dir" -maxdepth 1 -type f \
             \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0)
done

[ "$count" -gt 0 ] || { echo "no sources found; refusing to swap" >&2; exit 1; }

# Swap only now that every file exists.
for pair in "w:$OUT" "avif:$AVIF_OUT" "print:$PRINT_OUT"; do
  from="$stage/${pair%%:*}"; to="${pair##*:}"
  mkdir -p "$(dirname "$to")"
  rm -rf "$to.old"
  [ -d "$to" ] && mv "$to" "$to.old"
  mv "$from" "$to"
  rm -rf "$to.old"
done

mb() { echo "scale=2; $1/1048576" | bc; }
echo
printf '%s sources: %s MB\n' "$count" "$(mb $total_src)"
printf 'webp  (all widths): %s MB\n' "$(mb $total_webp)"
printf 'avif  (all widths): %s MB  <- served first\n' "$(mb $total_avif)"
printf 'print derivatives:  %s MB\n' "$(mb $total_print)"
