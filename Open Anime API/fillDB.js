const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ENV_PATH = path.join(__dirname, 'OPENanime.env');
if (fs.existsSync(ENV_PATH)) {
    dotenv.config({ path: ENV_PATH });
} else {
    console.error("❌ OPENanime.env configuration not found. Run start.js first to setup!");
    process.exit(1);
}

const dbMode = process.env.DB_MODE;
if (!dbMode) {
    console.error("❌ DB_MODE not configured in OPENanime.env. Run start.js first!");
    process.exit(1);
}

// ==========================================
// DB Connection Setup
// ==========================================
let localDb = [];
let supabaseClient = null;

if (dbMode === 'supabase') {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    console.log("☁️ Connected to Supabase Cloud.");
} else {
    const dbPath = path.join(__dirname, process.env.LOCAL_DB_PATH || 'anime_links.json');
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
    }
    localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`📁 Saving to Local JSON File: ${dbPath}`);
}

async function saveLink(title, episode, type, url) {
    const cleanTitle = title.toLowerCase().trim();
    if (dbMode === 'supabase') {
        const { error } = await supabaseClient.from('anime_links').upsert(
            { title: cleanTitle, episode: parseInt(episode), type, url },
            { onConflict: 'title, episode, type' }
        );
        if (error) console.error("   ❌ Supabase error:", error.message);
    } else {
        const dbPath = path.join(__dirname, process.env.LOCAL_DB_PATH || 'anime_links.json');
        
        // De-duplicate
        localDb = localDb.filter(item => 
            !(item.title.toLowerCase().trim() === cleanTitle && 
              item.episode === parseInt(episode) && 
              item.type === type)
        );

        localDb.push({ title: cleanTitle, episode: parseInt(episode), type, url });
        fs.writeFileSync(dbPath, JSON.stringify(localDb, null, 2));
    }
    console.log(`✅ Saved: [${cleanTitle}] Ep ${episode} (${type})`);
}

// ==========================================
// Puppeteer Crawling Logic
// ==========================================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function deepDiveMine(title) {
    console.log(`\n🚀 Waking up deep-dive crawlers for series: "${title}"...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const gogoDomains = (process.env.GOGO_DOMAINS || 'https://gogoanime.or.at').split(',').map(d => d.trim());
    let totalSaved = 0;

    for (const domain of gogoDomains) {
        try {
            const page = await browser.newPage();
            // Block image/fonts for speed
            await page.setRequestInterception(true);
            page.on('request', req => {
                if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            const searchUrl = `${domain}/?s=${encodeURIComponent(title)}`;
            console.log(`🌐 Searching: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Extract matching anime series link
            const animeUrl = await page.evaluate((t) => {
                const links = Array.from(document.querySelectorAll('a'));
                const queryBase = t.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const match = links.find(l => l.href && l.href.includes('/anime/') && l.href.toLowerCase().includes(queryBase));
                return match ? match.href : null;
            }, title);

            if (!animeUrl) {
                console.log(`   ⚠️ No matching series found on ${domain}`);
                await page.close();
                continue;
            }

            console.log(`🎯 Found anime series: ${animeUrl}`);
            await page.goto(animeUrl, { waitUntil: 'networkidle2', timeout: 30000 });

            // Get all episode URLs
            const slugMatch = animeUrl.match(/\/anime\/(.*?)\/?$/i);
            const slugBase = slugMatch ? slugMatch[1].split('-')[0] : '';
            
            let episodeLinks = await page.evaluate((base) => {
                const links = Array.from(document.querySelectorAll('a'));
                return [...new Set(links.filter(l => l.href && l.href.includes('-episode-') && l.href.includes(base)).map(l => l.href))];
            }, slugBase);

            episodeLinks = episodeLinks.reverse(); // oldest -> newest
            console.log(`📺 Found ${episodeLinks.length} total episodes to mine.`);

            await page.close();

            // Mine each episode sequentially
            for (const epLink of episodeLinks) {
                const epPage = await browser.newPage();
                await epPage.setRequestInterception(true);
                epPage.on('request', req => {
                    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                    else req.continue();
                });

                try {
                    // Extract episode number
                    const epMatch = epLink.match(/-episode-(\d+)/i);
                    const epNum = epMatch ? parseInt(epMatch[1]) : 1;

                    console.log(`   🎬 Mining player from: ${epLink}`);
                    await epPage.goto(epLink, { waitUntil: 'networkidle2', timeout: 25000 });

                    const iframeSrc = await epPage.evaluate(() => {
                        const iframes = Array.from(document.querySelectorAll('iframe'));
                        const player = iframes.find(i => i.src && (i.src.includes('.php?id=') || i.src.includes('newplayer') || i.src.includes('embed')));
                        return player ? player.src : null;
                    });

                    if (iframeSrc) {
                        await saveLink(title, epNum, 'http', iframeSrc);
                        totalSaved++;
                    }
                } catch (err) {
                    console.log(`   ❌ Failed mining episode page:`, err.message);
                }
                await epPage.close();
            }

            if (totalSaved > 0) {
                console.log(`🎉 Finished. Mined and saved ${totalSaved} episodes.`);
                break; // Stop after first successful domain
            }
        } catch (e) {
            console.error(`❌ Error on domain ${domain}:`, e.message);
        }
    }

    await browser.close();
}

// ==========================================
// CLI Execution
// ==========================================
const seriesTitle = process.argv.slice(2).join(' ');
if (!seriesTitle) {
    console.error("❌ Usage: node fillDB.js <Anime Title>");
    process.exit(1);
}

deepDiveMine(seriesTitle);
