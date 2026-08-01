/**
 * Eleventy config for rosehallgren.se.
 *
 * The site is a single page. Eleventy exists so Rose can edit the content in
 * Pages CMS — one markdown file per project under content/projects — without
 * ever touching the markup. Everything derivable is derived here rather than
 * stored: the srcset ladders, the `sizes` strings, the intrinsic width/height
 * that keep CLS at zero, the print-JPEG swap, and the deck-tiles-N /
 * deck-rows-M collage geometry.
 *
 * The build writes _site/index.html and scripts/publish.js copies it to the
 * repo root, because GitHub Pages serves this repo from the root of master.
 * assets/ is 534MB and already in git, so it is deliberately NOT passed
 * through: re-uploading it on every deploy would be half a gigabyte of churn
 * for a page that only ever changes by a few kilobytes.
 */

const fs = require("fs");
const path = require("path");

const AVIF_DIR = "assets/images/avif";
const WEBP_DIR = "assets/images/w";
const PRINT_DIR = "assets/images/print";
const WASH_DIR = "assets/images/wash";

/**
 * The derivative base name for a CMS image path.
 *
 * Pages CMS stores what the user picked — "/assets/images/berensson/eways-01.jpg"
 * — while build-images.sh names its output after the stem alone
 * ("eways-01-1000.avif"). Everything downstream works from the stem, so the
 * conversion happens once, here.
 */
function stem(file) {
  if (!file) return "";
  return String(file)
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");
}

/** Widths actually on disk for one image base name, ascending. */
function rungs(dir, base, ext) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)\\.${ext}$`);
  return files
    .map((f) => f.match(re))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

/**
 * Intrinsic size of the largest rung, read straight from the WebP header.
 * These attributes are what hold layout stable while the image loads; getting
 * them from the file means they cannot drift out of sync with it.
 */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 4).toString("ascii") !== "RIFF") return null;
  const fmt = b.slice(12, 16).toString("ascii");
  if (fmt === "VP8X") {
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  }
  if (fmt === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fmt === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/**
 * Pixel size of any jpg/png/webp, read from its header.
 *
 * Used for og:image:width/height, which were declared 1200x630 against a file
 * that is actually 1500x998 — a number nobody rechecks once written. Reading
 * the file means the declaration cannot drift from the image.
 */
function fileSize(file) {
  const abs = path.join(__dirname, String(file || "").replace(/^\//, ""));
  let b;
  try {
    b = fs.readFileSync(abs);
  } catch {
    return null;
  }
  if (b.slice(0, 4).toString("ascii") === "RIFF") return webpSize(abs);
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

const sizeCache = new Map();
function intrinsic(base) {
  if (sizeCache.has(base)) return sizeCache.get(base);
  const ws = rungs(WEBP_DIR, base, "webp");
  let out = null;
  if (ws.length) {
    try {
      out = webpSize(path.join(WEBP_DIR, `${base}-${ws[ws.length - 1]}.webp`));
    } catch {
      out = null;
    }
  }
  sizeCache.set(base, out);
  return out;
}

/**
 * Collage geometry for the deck. Each tile carries a 4mm bottom margin, so a
 * row of N needs N gaps, not N-1 — getting that wrong once took the deck from
 * 36 pages to 51. Pick the grid that wastes the fewest slots, preferring wider
 * rows on ties so images stay large.
 */
function collage(count) {
  if (count <= 0) return { tiles: 2, rows: 1 };
  let best = null;
  for (let tiles = 2; tiles <= 5; tiles++) {
    for (let rows = 1; rows <= 4; rows++) {
      const slots = tiles * rows;
      if (slots < count) continue;
      const waste = slots - count;
      if (!best || waste < best.waste || (waste === best.waste && tiles > best.tiles)) {
        best = { tiles, rows, waste };
      }
    }
  }
  return best || { tiles: 5, rows: 4 };
}

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/static": "." });

  eleventyConfig.addFilter("srcset", (file, kind) => {
    const base = stem(file);
    const dir = kind === "avif" ? AVIF_DIR : WEBP_DIR;
    const ext = kind === "avif" ? "avif" : "webp";
    return rungs(dir, base, ext)
      .map((w) => `${dir}/${base}-${w}.${ext} ${w}w`)
      .join(", ");
  });

  eleventyConfig.addFilter("largest", (file, kind) => {
    const base = stem(file);
    const dir = kind === "avif" ? AVIF_DIR : WEBP_DIR;
    const ext = kind === "avif" ? "avif" : "webp";
    const ws = rungs(dir, base, ext);
    return ws.length ? `${dir}/${base}-${ws[ws.length - 1]}.${ext}` : "";
  });

  eleventyConfig.addFilter("printSrc", (file) => `${PRINT_DIR}/${stem(file)}.jpg`);

  /**
   * The blurred backdrop's own file: 40px on the long edge, ~700 bytes.
   *
   * The backdrop used to reuse whatever rung the browser had picked for the
   * photograph, which meant JS could only set it after that image loaded — so
   * it arrived late and had to be faded in to hide the fact. Its own file is
   * known at build time, is small enough to land immediately, and is blurred
   * 40px and scaled 1.4x anyway, so 40px is all the detail that could survive.
   *
   * Root-relative, and that leading slash is load-bearing. The value is set as
   * a custom property in the markup but CONSUMED by a url() inside
   * assets/css/styles.css, and a relative url() in a custom property resolves
   * against the stylesheet rather than the document — so "assets/images/wash/x"
   * was being fetched from /assets/css/assets/images/wash/x, and 404ing.
   */
  /**
   * Root-relative asset paths.
   *
   * The filters emit "assets/images/..." because the home page sits at the
   * root. A project page lives one directory down, where that resolves to
   * /rock-stage/assets/... and 404s. Applied to single paths and to whole
   * srcset strings alike.
   */
  eleventyConfig.addFilter("abs", (value) =>
    String(value || "").replace(/(^|, )assets\//g, "$1/assets/"),
  );

  eleventyConfig.addFilter("washSrc", (file) => `/${WASH_DIR}/${stem(file)}.jpg`);
  eleventyConfig.addFilter("intrinsicWidth", (file) => intrinsic(stem(file))?.width || "");
  eleventyConfig.addFilter("intrinsicHeight", (file) => intrinsic(stem(file))?.height || "");

  eleventyConfig.addFilter("imageSize", (file) => fileSize(file) || { width: "", height: "" });

  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));

  /* The opening year of a project's year field, for structured data and
     article:published_time. A year is written for a reader, so it can be
     "2022" or a span like "2021–2023"; both need to reach a crawler as a
     single four-digit year. Returns "" if there is no year to find, so the
     template can leave the tag out rather than emit a broken date. */
  eleventyConfig.addFilter("first4", (value) => {
    const match = String(value || "").match(/\d{4}/);
    return match ? match[0] : "";
  });

  /**
   * Collaborators who always carry a link, wherever their name appears.
   *
   * Rose writes plain names in the credits and in her descriptions; linking
   * them by hand in every project is the kind of thing that gets done for a
   * while and then stops. Longest name first, so "Smash Studio" is matched
   * before "SMASH" could break it in half.
   */
  const PEOPLE = [
    { name: "Jonas Johansson", url: "https://jonasjohansson.se/" },
    { name: "Smash Studio", url: "https://www.smash.studio/" },
    { name: "SMASH", url: "https://www.smash.studio/" },
  ];

  eleventyConfig.addFilter("autolink", (text) => {
    let out = String(text ?? "");
    for (const p of PEOPLE) {
      // Skip anything already inside an anchor — the intro links these by hand.
      const already = new RegExp(`<a[^>]*>[^<]*${p.name}`, "i");
      if (already.test(out)) continue;
      out = out
        .split(p.name)
        .join(
          `<a href="${p.url}" target="_blank" rel="noopener noreferrer">${p.name}</a>`,
        );
    }
    return out;
  });

  eleventyConfig.addFilter("collageTiles", (n) => collage(n).tiles);
  eleventyConfig.addFilter("collageRows", (n) => collage(n).rows);

  /** Split intro copy on blank lines. The CMS field is plain text with HTML links. */
  eleventyConfig.addFilter("paragraphs", (text) =>
    String(text || "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  );

  // content/ deliberately sits outside dir.input, so the projects are loaded as
  // global data (src/_data/projects.js) rather than as an Eleventy collection:
  // a collection would require the content live under src/, which would put
  // Rose's editing surface inside the template folder.

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md"],
  };
};
