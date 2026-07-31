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

const stem = (f) =>
  String(f || "")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "");

const hasDerivatives = (file) => {
  const base = stem(file);
  const dir = path.join(ROOT, "assets", "images", "avif");
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => new RegExp(`^${base}-\\d+\\.avif$`).test(f));
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
  if (!images.length) errors.push(`${where}: no images`);

  media.forEach((m, i) => {
    const at = `${where}: item ${i + 1}`;
    if (m.video) {
      if (!m.title) warnings.push(`${at}: video has no title (screen readers announce it)`);
      return;
    }
    if (!m.file) {
      errors.push(`${at}: neither an image nor a YouTube ID`);
      return;
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
  }
  if (data.link?.url && !/^https?:\/\//.test(data.link.url)) {
    errors.push(`${where}: link out "${data.link.url}" is not a URL`);
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
