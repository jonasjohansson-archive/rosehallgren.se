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
const built = path.join(ROOT, "_site", "index.html");
const live = path.join(ROOT, "index.html");

if (!fs.existsSync(built)) {
  console.error("publish: _site/index.html does not exist — did eleventy run?");
  process.exit(1);
}

const next = fs.readFileSync(built, "utf8");

// A truncated build must never overwrite the live page.
const REQUIRED = ["</html>", '<section', 'class="project-carousel"', "</footer>"];
const missing = REQUIRED.filter((s) => !next.includes(s));
if (missing.length || next.length < 50000) {
  console.error(
    `publish: refusing to publish, output looks incomplete ` +
      `(${next.length} bytes, missing ${missing.join(", ") || "nothing"})`,
  );
  process.exit(1);
}

const prev = fs.existsSync(live) ? fs.readFileSync(live, "utf8") : "";
if (prev === next) {
  console.log(`publish: index.html unchanged (${next.length} bytes)`);
} else {
  fs.writeFileSync(live, next);
  console.log(`publish: index.html updated (${prev.length} -> ${next.length} bytes)`);
}
