/**
 * Pixel size of a jpg, png or webp, read from its header.
 *
 * Shared by .eleventy.js (which needs it for og:image:width/height and for the
 * width/height attributes that hold layout still while an image loads) and by
 * scripts/validate-content.js (which needs a source's width to work out which
 * ladder rungs it is entitled to). It lived only in .eleventy.js until validate
 * needed the same answer; a second copy would have been a third implementation
 * of the same idea, alongside the one in build-images.py, with nothing keeping
 * them honest.
 *
 * EXIF orientation IS applied, because build-images.py passes -auto-orient and
 * the two answers have to agree. A phone photograph carrying orientation 6 is
 * stored landscape and displayed portrait; reporting the stored size would give
 * a share card the wrong aspect and a ladder the wrong widths. Two of the Drip
 * Drop frames on this site have identical stored dimensions and different
 * orientation tags, which is exactly the case that reads wrong without it.
 */

const fs = require("fs");

function webpSize(buffer) {
  if (buffer.slice(0, 4).toString("ascii") !== "RIFF") return null;
  const fmt = buffer.slice(12, 16).toString("ascii");
  if (fmt === "VP8X") {
    return {
      width: 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)),
      height: 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)),
    };
  }
  if (fmt === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (fmt === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/**
 * EXIF orientation from a JPEG's APP1 segment, or 1 if there is none.
 *
 * Values 5-8 are the quarter turns; for those the displayed image is the stored
 * one rotated, so width and height swap.
 */
function jpegOrientation(b) {
  let i = 2;
  while (i < b.length - 4) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    const length = b.readUInt16BE(i + 2);
    if (marker === 0xe1 && b.slice(i + 4, i + 10).toString("ascii") === "Exif\0\0") {
      const tiff = i + 10;
      if (tiff + 8 > b.length) return 1;
      const little = b.slice(tiff, tiff + 2).toString("ascii") === "II";
      const u16 = (o) => (little ? b.readUInt16LE(o) : b.readUInt16BE(o));
      const u32 = (o) => (little ? b.readUInt32LE(o) : b.readUInt32BE(o));
      const ifd = tiff + u32(tiff + 4);
      if (ifd + 2 > b.length) return 1;
      const count = u16(ifd);
      for (let e = 0; e < count; e++) {
        const entry = ifd + 2 + e * 12;
        if (entry + 12 > b.length) break;
        if (u16(entry) === 0x0112) return u16(entry + 8) || 1;
      }
      return 1;
    }
    // SOS: pixel data starts, no EXIF ahead of it
    if (marker === 0xda) return 1;
    i += 2 + length;
  }
  return 1;
}

/** { width, height } as DISPLAYED, or null if unreadable. */
function imageSize(absolutePath) {
  let b;
  try {
    b = fs.readFileSync(absolutePath);
  } catch {
    return null;
  }
  if (b.slice(0, 4).toString("ascii") === "RIFF") return webpSize(b);
  // PNG: IHDR width/height are big-endian at a fixed offset
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // JPEG: walk the segment chain to the start-of-frame marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 9) {
      if (b[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = b[i + 1];
      // SOF0-SOF15, excluding the non-frame markers DHT/JPG/DAC
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        const height = b.readUInt16BE(i + 5);
        const width = b.readUInt16BE(i + 7);
        const turned = jpegOrientation(b) >= 5;
        return turned ? { width: height, height: width } : { width, height };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

module.exports = { imageSize };
