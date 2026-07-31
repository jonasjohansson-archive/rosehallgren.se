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
WIDTHS=(640 750 1000 1250 1500 2000)
Q=80          # webp; measured indistinguishable from q85 on contain-fitted photos
AVIF_CQ=32    # ~40% smaller than webp q80 at visually equivalent quality
PRINT_W=1200  # the deck's largest slot is the ~210mm hero, ~1180px full-screen
PRINT_Q=80

for tool in magick cwebp avifenc; do
  command -v "$tool" >/dev/null || { echo "missing required tool: $tool" >&2; exit 1; }
done

# All five source folders write into ONE flat output namespace, and the site
# looks derivatives up by basename alone. Two folders holding the same filename
# — entirely plausible once uploads come from a phone or camera, where
# IMG_0001.jpg is the default — therefore overwrite each other silently: the
# build succeeds, the page validates, and the wrong photograph ships. Catch it
# here, where it is a one-line fix, rather than never.
dupes="$(
  for dir in "${SRC_DIRS[@]}"; do
    [ -d "$dir" ] || continue
    find "$dir" -maxdepth 1 -type f \
      \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -print0 \
      | xargs -0 -n1 basename 2>/dev/null \
      | sed 's/\.[^.]*$//'
  done | sort | uniq -d
)"
if [ -n "$dupes" ]; then
  echo "refusing to build: the same filename appears in more than one source folder," >&2
  echo "and every derivative is written to a single flat namespace, so these would" >&2
  echo "silently overwrite one another. Rename one of each pair:" >&2
  printf '  %s\n' $dupes >&2
  exit 1
fi

# Anything the pipeline cannot read is reported rather than passed over in
# silence. HEIC is the one that matters: it is the iPhone default, it is
# committed happily by the CMS, and the resulting build failure otherwise
# points at build-images.sh, which cannot fix it.
for dir in "${SRC_DIRS[@]}"; do
  [ -d "$dir" ] || continue
  while IFS= read -r -d '' odd; do
    echo "skipping (unsupported format, convert to JPEG first): $odd" >&2
  done < <(find "$dir" -maxdepth 1 -type f \
             ! -iname '*.jpg' ! -iname '*.jpeg' ! -iname '*.png' \
             ! -iname '.*' -print0)
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

    # -auto-orient BEFORE reading the width. `identify` reports the width as
    # stored, ignoring the EXIF rotation the resize step will apply. Four
    # orientation=6 sources stored 1500x1000 therefore got a 1500 rung, were
    # rotated to 1000x1500, and `-resize 1500x>` then refused to shrink them:
    # files advertising 1500w that are actually 1000px, so Chrome upscales them.
    src_w="$(magick "${src}[0]" -auto-orient -format '%w' info: 2>/dev/null || echo 0)"
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
