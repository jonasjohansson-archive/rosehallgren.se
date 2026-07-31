/** Site-wide text and links, edited in Pages CMS as content/settings.json. */

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "content", "settings.json");

module.exports = () => {
  if (!fs.existsSync(FILE)) return { site: {}, contact: [] };
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
};
