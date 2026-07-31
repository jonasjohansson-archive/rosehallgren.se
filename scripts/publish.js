/**
 * Copy the built page to the repo root.
 *
 * GitHub Pages serves this repo from the root of master (build_type: legacy),
 * and assets/images alone is 534MB that is already in git. Deploying through
 * the Pages artifact upload would push half a gigabyte on every content edit
 * to republish a page that changes by a few kilobytes, so the workflow commits
 * the rendered index.html back to the branch instead and Pages carries on
 * serving exactly as it does today. No Pages settings change, no cutover.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

/**
 * Each built page, with a sanity check on its content. `minBytes` and
 * `requires` exist so a truncated or half-rendered build can never overwrite a
 * working page: the site page is 230KB+ and must contain project sections, the
 * admin page is tiny but must contain the CMS URL it exists to redirect to.
 */
const PAGES = [
  {
    from: "index.html",
    to: "index.html",
    minBytes: 50000,
    requires: ["</html>", "<section", 'class="project-carousel"', "</footer>"],
  },
  {
    from: "sitemap.xml",
    to: "sitemap.xml",
    minBytes: 150,
    requires: ["<urlset", "https://rosehallgren.se/", "</urlset>"],
  },
  {
    from: path.join("admin", "index.html"),
    to: path.join("admin", "index.html"),
    minBytes: 400,
    requires: ["</html>", "app.pagescms.org"],
  },
];

let failed = false;

for (const page of PAGES) {
  const built = path.join(ROOT, "_site", page.from);
  const live = path.join(ROOT, page.to);

  if (!fs.existsSync(built)) {
    console.error(`publish: _site/${page.from} does not exist — did eleventy run?`);
    failed = true;
    continue;
  }

  const next = fs.readFileSync(built, "utf8");
  const missing = page.requires.filter((s) => !next.includes(s));
  if (missing.length || next.length < page.minBytes) {
    console.error(
      `publish: refusing to publish ${page.to}, output looks incomplete ` +
        `(${next.length} bytes, missing ${missing.join(", ") || "nothing"})`,
    );
    failed = true;
    continue;
  }

  const prev = fs.existsSync(live) ? fs.readFileSync(live, "utf8") : "";
  if (prev === next) {
    console.log(`publish: ${page.to} unchanged (${next.length} bytes)`);
  } else {
    fs.mkdirSync(path.dirname(live), { recursive: true });
    fs.writeFileSync(live, next);
    console.log(`publish: ${page.to} updated (${prev.length} -> ${next.length} bytes)`);
  }
}

if (failed) process.exit(1);
