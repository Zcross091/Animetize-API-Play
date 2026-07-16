const fs = require('fs');
const path = require('path');

const targetBaseDir = 'C:\\Users\\afaqa\\OneDrive\\Documents\\Development\\Public Anime Sources';
const animeOutputDir = path.join(targetBaseDir, 'anime_sources');
const mangaOutputDir = path.join(targetBaseDir, 'manga_sources');

if (!fs.existsSync(animeOutputDir)) {
  fs.mkdirSync(animeOutputDir, { recursive: true });
}
if (!fs.existsSync(mangaOutputDir)) {
  fs.mkdirSync(mangaOutputDir, { recursive: true });
}

const nsfwKeywords = ['hentai', 'nsfw', 'porn', '18+', 'xnxx', 'xvideos', 'rule34', 'erotic', 'smut', 'adult'];

function isNsfw(name, url, isNsfwField) {
  if (isNsfwField === true) return true;
  const n = name.toLowerCase();
  const u = url.toLowerCase();
  return nsfwKeywords.some(keyword => n.includes(keyword) || u.includes(keyword));
}

function processRepo(repoDir, indexFileName, isManga = false) {
  const indexPath = path.join(targetBaseDir, repoDir, indexFileName);
  if (!fs.existsSync(indexPath)) {
    console.log(`Index file not found for ${repoDir}: ${indexPath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  console.log(`Processing ${repoDir} (${data.length} entries)...`);
  const outputDir = isManga ? mangaOutputDir : animeOutputDir;

  let copied = 0;
  let skippedNsfw = 0;
  let skippedHindi = 0;

  data.forEach(entry => {
    const name = entry.name;
    const lang = (entry.lang || 'all').toLowerCase();
    const sourceUrl = entry.sourceCodeUrl;
    const isEntryNsfw = entry.isNsfw || false;

    // Filter Manga (Only English)
    if (isManga && lang !== 'en') {
      return;
    }

    // Filter Hindi
    if (!isManga && (lang === 'hi' || name.toLowerCase().includes('hindi'))) {
      skippedHindi++;
      return;
    }

    // Filter NSFW
    if (isNsfw(name, sourceUrl, isEntryNsfw)) {
      skippedNsfw++;
      return;
    }

    // Resolve local file path
    // e.g. https://raw.githubusercontent.com/m2k3a/mangayomi-extensions/main/javascript/anime/src/zh/yhdm.js
    // or https://raw.githubusercontent.com/Swakshan/mangayomi-swak-extensions/refs/heads/main/javascript/anime/src/all/kisskh.js
    let relativePath = '';
    if (sourceUrl.includes('/main/')) {
      relativePath = sourceUrl.split('/main/')[1];
    } else if (sourceUrl.includes('/refs/heads/main/')) {
      relativePath = sourceUrl.split('/refs/heads/main/')[1];
    } else {
      console.log(`Could not parse sourceCodeUrl for ${name}: ${sourceUrl}`);
      return;
    }

    const localSourcePath = path.join(targetBaseDir, repoDir, relativePath);
    if (!fs.existsSync(localSourcePath)) {
      console.log(`Local file does not exist for ${name}: ${localSourcePath}`);
      return;
    }

    const ext = path.extname(localSourcePath);
    const destDir = path.join(outputDir, lang);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Clean name for file
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const destPath = path.join(destDir, `${safeName}${ext}`);

    fs.copyFileSync(localSourcePath, destPath);
    copied++;
  });

  console.log(`  Copied: ${copied}`);
  console.log(`  Skipped (NSFW): ${skippedNsfw}`);
  console.log(`  Skipped (Hindi): ${skippedHindi}`);
}

processRepo('swak-extensions', 'anime_index.json');
processRepo('m2k3a-extensions', 'anime_index.json');

console.log("Processing Manga Sources...");
processRepo('swak-extensions', 'index.json', true);
processRepo('m2k3a-extensions', 'index.json', true);
processRepo('mangayomi-extensions', 'index.json', true);

console.log("Done!");
