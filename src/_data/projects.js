/**
 * Projects, in the order Rose set in Pages CMS.
 *
 * One markdown file per project under content/projects/. The filename prefix
 * is cosmetic; `order` in the front matter is what decides the sequence, so
 * dragging a project in the CMS only rewrites that one number.
 *
 * The slug is taken from the filename with the numeric prefix stripped, which
 * keeps every existing permalink (#rock-stage, #photography) working.
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const DIR = path.join(__dirname, "..", "..", "content", "projects");

module.exports = () => {
  if (!fs.existsSync(DIR)) return [];

  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const parsed = matter(fs.readFileSync(path.join(DIR, f), "utf8"));
      // Explicit in the front matter so renaming a project in the CMS cannot
      // silently change its anchor: #rock-stage has to keep working.
      const slug =
        parsed.data.slug || f.replace(/\.md$/, "").replace(/^\d+[-_]/, "");

      // A line containing only --- splits the copy onto a second slide.
      // Fluffy Encounters runs long enough to need it.
      const panels = parsed.content
        .split(/\n\s*-{3,}\s*\n/)
        .map((panel) =>
          panel
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean),
        )
        .filter((panel) => panel.length);

      // Images and videos share one ordered list, because a video does not
      // always come last: Fluffy Encounters puts one between two collage
      // images, and reordering it would change the deck.
      const media = parsed.data.media || [];
      const images = media.filter((m) => m.file);

      // The hero carries the project and leads the deck's first page;
      // everything after it becomes the collage on the second. The FIRST
      // support image is what breaks to that second page, so it is flagged
      // here rather than in the template: Nunjucks has no `namespace`, so a
      // loop cannot carry a "have I seen an image yet" flag of its own, and
      // `loop.first` is wrong the moment a video comes first.
      const hero = images[0] || null;
      const rest = media
        .filter((m) => m !== hero)
        .map((m) => ({ ...m }));
      const firstSupport = rest.find((m) => m.file);
      if (firstSupport) firstSupport.leadsCollage = true;

      // Which collage tile each image is, counted among images only.
      //
      // The stylesheet needs this to drop the right margin on the tile that
      // ends each row, and `:nth-of-type` cannot answer it: it counts every
      // sibling div, so the hero and each copy panel shift the count. On Torö
      // that zeroed the THIRD tile's margin and on Fluffy Encounters the
      // FIRST, butting those pairs together while every other gap stayed 4mm.
      //
      // Videos are hidden in print and take no slot, hence `m.file`. A project
      // with no copy floats its hero into the collage as tile one, so the rest
      // start at two there.
      let tile = panels.length ? 0 : 1;
      rest.forEach((m) => {
        if (m.file) m.tileIndex = ++tile;
      });

      return {
        ...parsed.data,
        slug,
        panels,
        media,
        hero,
        rest,
        // Videos are hidden in print, so they never count toward the grid.
        supportCount: Math.max(images.length - 1, 0),
      };
    })
    .sort((a, b) => Number(a.order ?? 9999) - Number(b.order ?? 9999));
};
