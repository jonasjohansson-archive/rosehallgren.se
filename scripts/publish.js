/**
 * Copy the built pages to the repo root.
 *
 * GitHub Pages serves this repo from the root of master (build_type: legacy),
 * and assets/images alone is over half a gigabyte that is already in git.
 * Deploying through the Pages artifact upload would push all of it on every
 * content edit to republish pages that change by a few kilobytes, so the
 * workflow commits the rendered HTML back to the branch instead and Pages
 * carries on serving exactly as it does today.
 *
 * Everything Eleventy writes is copied, discovered rather than listed: there
 * are twenty-one pages now (the home page, /admin/, and one per project) and a
 * hardcoded list would silently stop publishing whatever was added next.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = path.join(ROOT, "_site");

if (!fs.existsSync(SITE)) {
  console.error("publish: _site does not exist — did eleventy run?");
  process.exit(1);
}

/** Every .html and .xml Eleventy produced, as paths relative to _site. */
function walk(dir, base = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) return walk(path.join(dir, entry.name), rel);
    return /\.(html|xml)$/.test(entry.name) ? [rel] : [];
  });
}

/**
 * A floor and a fingerprint per page, so a truncated or half-rendered build can
 * never overwrite a working one. The home page is the whole portfolio; a
 * project page is one project; the sitemap is a handful of lines.
 */
function expectations(rel) {
  if (rel === "index.html") {
    return { minBytes: 50000, requires: ["</html>", "<section", 'class="project-carousel"', "</footer>"] };
  }
  if (rel === "sitemap.xml") {
    return { minBytes: 150, requires: ["<urlset", "https://rosehallgren.se/", "</urlset>"] };
  }
  if (rel === path.join("admin", "index.html")) {
    return { minBytes: 400, requires: ["</html>", "app.pagescms.org"] };
  }
  // a project page
  return { minBytes: 1500, requires: ["</html>", 'class="project-page"', "<h1"] };
}

let failed = false;
let written = 0;
let unchanged = 0;

for (const rel of walk(SITE).sort()) {
  const built = path.join(SITE, rel);
  const live = path.join(ROOT, rel);
  const next = fs.readFileSync(built, "utf8");
  const { minBytes, requires } = expectations(rel);

  const missing = requires.filter((s) => !next.includes(s));
  if (missing.length || next.length < minBytes) {
    console.error(
      `publish: refusing to publish ${rel}, output looks incomplete ` +
        `(${next.length} bytes, missing ${missing.join(", ") || "nothing"})`,
    );
    failed = true;
    continue;
  }

  const prev = fs.existsSync(live) ? fs.readFileSync(live, "utf8") : "";
  if (prev === next) {
    unchanged++;
    continue;
  }
  fs.mkdirSync(path.dirname(live), { recursive: true });
  fs.writeFileSync(live, next);
  written++;
  console.log(`publish: ${rel} (${prev.length} -> ${next.length} bytes)`);
}

console.log(`publish: ${written} written, ${unchanged} unchanged`);
if (failed) process.exit(1);
