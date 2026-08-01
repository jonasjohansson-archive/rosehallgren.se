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
 * EXIF orientation is NOT applied. For a rotated photograph this reports the
 * stored dimensions rather than the displayed ones, which is wrong for a share
 * card and wrong for a ladder. build-images.py passes -auto-orient and gets the
 * displayed size, so the two disagree for such a file. Nothing on the site trips
 * it today, but it is a real gap rather than a deliberate choice.
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

/** { width, height } for an absolute path, or null if unreadable. */
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
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

module.exports = { imageSize };
