/**
 * Fail the build before it can publish something broken.
 *
 * Pages CMS commits straight to master, so this is the only thing standing
 * between a mistyped field and the live site. It runs before eleventy in
 * `npm run build`.
 */

const fs = require("fs");
const path = require("path");
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

/**
 * All three derivative sets, not just AVIF. build-images.sh swaps the three
 * output directories together so in practice they agree, but that is a
 * property of the script rather than a guarantee, and a page missing its print
 * JPEG only shows up as a blank tile in the PDF.
 */
const hasDerivatives = (file) => {
  const base = stem(file);
  const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (sub, ext) => {
    const dir = path.join(ROOT, "assets", "images", sub);
    if (!fs.existsSync(dir)) return false;
    return fs.readdirSync(dir).some((f) => new RegExp(`^${esc}-\\d+\\.${ext}$`).test(f));
  };
  if (!has("avif", "avif")) return false;
  if (!has("w", "webp")) return false;
  return fs.existsSync(path.join(ROOT, "assets", "images", "print", `${base}.jpg`));
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
    if (!s.site?.portrait) errors.push("settings: portrait is empty");
    if (s.site?.social_image && !hasImageFile(s.site.social_image)) {
      errors.push(`settings: share image ${s.site.social_image} is not in the repository`);
    }
    if (s.site?.portrait && !hasDerivatives(s.site.portrait)) {
      errors.push(`settings: no web versions built for the portrait ${s.site.portrait}`);
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

  const media = data.media || [];
  const images = media.filter((m) => m.file);
  if (!images.length) {
    errors.push(
      `${where}: no images — a project needs at least one, and the first one ` +
        `is used as its opening picture`,
    );
  }

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
        `${at}: no web versions built for ${m.file} — run ./build-images.sh so the ` +
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
  if (data.link?.url && !/^https?:\/\//.test(data.link.url)) {
    errors.push(`${where}: link out "${data.link.url}" is not a URL`);
  }
  if (data.link?.label && !data.link?.url) errors.push(`${where}: "link out" has text but no URL`);
  if (data.link?.url && !data.link?.label) errors.push(`${where}: "link out" has a URL but no text`);
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
