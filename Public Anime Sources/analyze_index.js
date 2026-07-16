const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'mangayomi-extensions', 'index.json');
if (!fs.existsSync(indexPath)) {
  console.log("index.json not found");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
console.log("Total entries in index.json:", data.length);

const types = {};
data.forEach(entry => {
  const t = entry.itemType !== undefined ? entry.itemType : (entry.isManga ? 'manga' : 'other');
  types[t] = (types[t] || 0) + 1;
});
console.log("Item types count:", types);

// Let's print out entries that might be anime or have itemType !== 0 (0 is usually manga)
const nonManga = data.filter(e => e.itemType !== 0 && !e.isManga);
console.log("Non-manga entries count:", nonManga.length);
if (nonManga.length > 0) {
  console.log("Sample non-manga entries:", nonManga.slice(0, 5).map(e => ({ name: e.name, type: e.itemType, lang: e.lang })));
}
