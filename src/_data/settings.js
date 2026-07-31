/** Site-wide text and links, edited in Pages CMS as content/settings.json. */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "content", "settings.json");

module.exports = () => {
  if (!fs.existsSync(FILE)) return { site: {}, contact: [], sameAs: [] };
  const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

  // schema.org sameAs, derived rather than maintained by hand: the profiles
  // Rose already lists as contact links. mailto: and the CV document are not
  // profiles, so they are excluded.
  data.sameAs = (data.contact || [])
    .map((c) => c.url)
    .filter((u) => /^https?:\/\//.test(u || ""))
    .filter((u) => !u.includes("docs.google.com"));

  return data;
};
