/**
 * Fail the build before it can publish something broken.
 *
 * Pages CMS commits straight to master, so this is the only thing standing
 * between a mistyped field and the live site. It runs before eleventy in
 * `npm run build`.
 */

const fs = require("fs");
const path = require("path");
const { imageSize } = require("./lib/image-size");
const matter = require("gray-matter");

const ROOT = path.join(__dirname, "..");
const PROJECTS = path.join(ROOT, "content", "projects");
const SETTINGS = path.join(ROOT, "content", "settings.json");

const errors = [];
const warnings = [];

const hasImageFile = (p) => fs.existsSync(path.join(ROOT, String(p).replace(/^\//, "")));

const stem = (f) =>
  String(f || "")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");

/* The ladder, and the widths a given source is entitled to. Must agree with
   RUNGS in scripts/build-images.py; there is no way to share a constant across
   the two languages, so this is the parity to keep. */
const RUNGS = [640, 750, 1000, 1250, 1500, 2000];
const widthsFor = (sourceWidth) =>
  [...new Set(RUNGS.map((r) => Math.min(r, sourceWidth)))].sort((a, b) => a - b);

/**
 * All three derivative sets, not just AVIF, and the WHOLE ladder rather than
 * any one rung of it.
 *
 * This used to ask only whether a stem had some avif and some webp. That is
 * how 106 missing 2000px rungs sat in the repo unreported: every upscaled
 * source still had its old narrower rungs, so the check passed while wide
 * viewports were being served a 1500px image. Asking for each expected width
 * is the only version of this check that means anything.
 */
const hasDerivatives = (file) => missingDerivatives(file).length === 0;

const missingDerivatives = (file) => {
  const base = stem(file);
  const src = path.join(ROOT, String(file).replace(/^\//, ""));
  if (!fs.existsSync(src)) return ["source"];
  const dims = imageSize(src);
  if (!dims) return ["unreadable"];
  const missing = [];
  for (const w of widthsFor(dims.width)) {
    if (!fs.existsSync(path.join(ROOT, "assets", "images", "avif", `${base}-${w}.avif`)))
      missing.push(`${base}-${w}.avif`);
    if (!fs.existsSync(path.join(ROOT, "assets", "images", "w", `${base}-${w}.webp`)))
      missing.push(`${base}-${w}.webp`);
  }
  if (!fs.existsSync(path.join(ROOT, "assets", "images", "print", `${base}.jpg`)))
    missing.push(`${base}.jpg (print)`);
  return missing;
};

/**
 * A filename that survives being dropped into a srcset.
 *
 * Derivatives are looked up by basename, and srcset separates the URL from its
 * width descriptor on whitespace — so a space in a filename produces markup
 * that is invalid per the HTML grammar even though browsers currently cope.
 * On a Swedish site edited by a non-technical person, "Ö Sommar bild (2).JPG"
 * is the ordinary case, not the exotic one.
 */
const unsafeName = (file) => {
  const base = stem(file);
  return /[^a-zA-Z0-9._-]/.test(base) ? base : null;
};

// --- settings --------------------------------------------------------------

if (!fs.existsSync(SETTINGS)) {
  errors.push("content/settings.json is missing");
} else {
  let s;
  try {
    s = JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
  } catch (e) {
    errors.push(`content/settings.json is not valid JSON: ${e.message}`);
  }
  if (s) {
    if (!s.site?.heading) errors.push("settings: heading is empty");
    if (!s.site?.intro) errors.push("settings: intro text is empty");
    if (!s.site?.title) errors.push("settings: browser tab title is empty");
    if (!s.site?.description) errors.push("settings: search description is empty");
    if (s.site?.social_image && !hasImageFile(s.site.social_image)) {
      errors.push(`settings: share image ${s.site.social_image} is not in the repository`);
    }
    for (const c of s.contact || []) {
      if (!c.label || !c.url) errors.push(`settings: a contact link is missing its label or URL`);
    }
  }
}

// --- projects --------------------------------------------------------------

const files = fs.existsSync(PROJECTS)
  ? fs.readdirSync(PROJECTS).filter((f) => f.endsWith(".md"))
  : [];

if (!files.length) errors.push("content/projects contains no projects");

const seenSlugs = new Map();
const seenOrder = new Map();

for (const f of files) {
  const where = `content/projects/${f}`;
  const { data, content } = matter(fs.readFileSync(path.join(PROJECTS, f), "utf8"));

  if (!data.title) errors.push(`${where}: title is empty`);

  const slug = data.slug || f.replace(/\.md$/, "");
  if (!/^[a-z0-9-]+$/.test(slug)) {
    errors.push(`${where}: web address "${slug}" may only use lowercase letters, numbers, hyphens`);
  }
  if (seenSlugs.has(slug)) {
    errors.push(`${where}: web address "${slug}" is already used by ${seenSlugs.get(slug)}`);
  }
  seenSlugs.set(slug, where);

  if (data.order === undefined || data.order === null || data.order === "") {
    errors.push(`${where}: position is empty, so the project has nowhere to sit on the page`);
  } else if (seenOrder.has(data.order)) {
    warnings.push(
      `${where}: position ${data.order} is shared with ${seenOrder.get(data.order)}; ` +
        `their order on the page is then arbitrary`,
    );
  } else {
    seenOrder.set(data.order, where);
  }

  // The year and place come from one "2022 · Stockholm" line that was split on
  // the middot at migration. A project with no year, like c/o, shifted its
  // place into the year column and its credit into the place — visible only
  // once the CMS listed the columns side by side.
  if (data.year && !/^\d/.test(String(data.year))) {
    warnings.push(
      `${where}: year is "${data.year}", which does not start with a digit — ` +
        `it may belong in Place`,
    );
  }

  const media = data.media || [];
  const images = media.filter((m) => m.file);
  if (!images.length) {
    errors.push(
      `${where}: no images — a project needs at least one, and the first one ` +
        `is used as its opening picture`,
    );
  }

  // The same photograph listed twice. Torö had its opening picture repeated as
  // the last entry, so the deck printed it once as the hero and again as the
  // final collage tile on the facing page, and the site showed it on the first
  // slide and the last. Easy to do in the CMS and invisible until the PDF.
  const dupes = images
    .map((m) => m.file)
    .filter((f, i, all) => all.indexOf(f) !== i)
    .filter((f, i, all) => all.indexOf(f) === i);
  dupes.forEach((f) =>
    warnings.push(`${where}: ${f} is listed more than once, so it appears twice`),
  );

  // The deck's collage grid tops out at 5 tiles x 4 rows. Past that the tiles
  // keep their size and spill onto a third page, quietly breaking the
  // two-pages-per-project shape the whole PDF is built around.
  if (images.length > 21) {
    warnings.push(
      `${where}: ${images.length} images — beyond about 21 the PDF gives this ` +
        `project a third page instead of the usual two`,
    );
  }

  media.forEach((m, i) => {
    const at = `${where}: item ${i + 1}`;
    if (m.video) {
      if (m.file) {
        warnings.push(
          `${at}: has both an image and a YouTube ID; the video wins and the ` +
            `image is ignored`,
        );
      }
      if (!m.title) warnings.push(`${at}: video has no title (screen readers announce it)`);
      return;
    }
    if (!m.file) {
      errors.push(
        `${at}: neither an image nor a YouTube ID — pick an image, or paste a ` +
          `YouTube ID, or remove the row`,
      );
      return;
    }
    const bad = unsafeName(m.file);
    if (bad) {
      errors.push(
        `${at}: the filename "${bad}" has spaces or accented characters. ` +
          `Rename it using only letters a-z, numbers, hyphens and dots, then ` +
          `re-upload — image addresses cannot contain spaces`,
      );
    }
    const onDisk = path.join(ROOT, m.file.replace(/^\//, ""));
    if (!fs.existsSync(onDisk)) errors.push(`${at}: ${m.file} is not in the repository`);
    else if (!hasDerivatives(m.file)) {
      errors.push(
        `${at}: no web versions built for ${m.file} — run python3 scripts/build-images.py so the ` +
          `AVIF and WebP sizes exist`,
      );
    }
    if (!m.alt) warnings.push(`${at}: ${stem(m.file)} has no description`);
  });

  for (const p of data.press || []) {
    if (p.url && !/^https?:\/\//.test(p.url)) errors.push(`${where}: press link "${p.url}" is not a URL`);
    // A publication name with no URL renders as a link with an empty href,
    // which reloads the page: it looks clickable and does nothing.
    if (p.label && !p.url) errors.push(`${where}: press entry "${p.label}" has no URL`);
    if (p.url && !p.label) errors.push(`${where}: a press URL has no publication name`);
  }
  for (const l of data.links || []) {
    if (l.url && !/^https?:\/\//.test(l.url)) errors.push(`${where}: link "${l.url}" is not a URL`);
    if (l.label && !l.url) errors.push(`${where}: the link "${l.label}" has no URL`);
    if (l.url && !l.label) errors.push(`${where}: a link has a URL but no text`);
  }
  if (!content.trim()) warnings.push(`${where}: no description text`);
}

// --- report ----------------------------------------------------------------

for (const w of warnings) console.warn(`warning  ${w}`);
for (const e of errors) console.error(`ERROR    ${e}`);

console.log(
  `\n${files.length} projects, ${seenSlugs.size} web addresses, ` +
    `${errors.length} errors, ${warnings.length} warnings`,
);

if (errors.length) process.exit(1);
