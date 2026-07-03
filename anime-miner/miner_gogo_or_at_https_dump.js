require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.name === 'TargetCloseError') return;
    if (reason && reason.message && reason.message.includes('Target closed')) return;
});

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = "https://gogoanime.or.at";
const CACHE_FILE = './global_cache.json';

// Master Override Switch: Set to true if you want to force-mine everything from scratch
const IGNORE_CACHE = false; 

let globalCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try { globalCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch(e){}
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(globalCache, null, 2));
}

async function runDumpMiner() {
    console.log("🚀 Starting OFFENSIVE HTTP Dump Miner (Gogoanime.or.at)...");
    
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    let currentPage = 1;

    while (true) {
        console.log(`\n======================================`);
        console.log(`📑 Tracking Backwards in Time: Page ${currentPage}`);
        console.log(`======================================\n`);

        const page = await browser.newPage();
        
        // Gogo clones usually paginate the homepage with ?page=X
        const pageUrl = currentPage === 1 ? BASE_URL : `${BASE_URL}/?page=${currentPage}`;
        
        console.log(`   Scouting Timeline: ${pageUrl}`);
        try {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } catch (e) {
            console.log("   ⚠️ Reached end of time or timed out.");
            await page.close();
            break;
        }

        // Extract raw episode links from the homepage feed to reconstruct the Master Anime URLs
        const recentEps = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return [...new Set(links.filter(l => l.href && l.href.includes('-episode-')).map(l => l.href))];
        });

        await page.close();

        if (recentEps.length === 0) {
            console.log(`   🛑 No episodes found on page ${currentPage}. End of the line.`);
            break;
        }

        // Reconstruct the root anime URLs
        const activeAnimeUrls = new Set();
        for (const epUrl of recentEps) {
            const match = epUrl.match(/gogoanime\.or\.at\/(.*?)-episode-\d+/i);
            if (match) {
                activeAnimeUrls.add(`https://gogoanime.or.at/anime/${match[1]}/`);
            }
        }
        
        const uniqueSeries = Array.from(activeAnimeUrls);
        console.log(`   Found ${uniqueSeries.length} master series directly on the timeline...`);

        // Mine each Master Series
        for (let f = 0; f < uniqueSeries.length; f++) {
            const masterSeriesUrl = uniqueSeries[f];
            const slugMatch = masterSeriesUrl.match(/\/anime\/(.*?)\/?$/i);
            const cleanTitle = slugMatch ? slugMatch[1].replace(/-/g, ' ').toLowerCase().trim() : '';

            let highestCachedEp = 0;
            if (!IGNORE_CACHE && cleanTitle && globalCache[cleanTitle] && globalCache[cleanTitle].highest_http_ep) {
                highestCachedEp = globalCache[cleanTitle].highest_http_ep;
                console.log(`   🗃️ CACHE: Found highest HTTP episode for ${cleanTitle}: ${highestCachedEp}`);
            }

            console.log(`   🔥 NEW ANIME DETECTED: ${masterSeriesUrl}`);
            console.log(`   ⚔️ Initiating Offensive Deep Mine...`);

            const seriesPage = await browser.newPage();
            let episodeLinks = [];
            
            try {
                await seriesPage.goto(masterSeriesUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                const slugBase = slugMatch ? slugMatch[1].split('-')[0] : '';
                
                episodeLinks = await seriesPage.evaluate((base) => {
                    const links = Array.from(document.querySelectorAll('a'));
                    return [...new Set(links.filter(l => l.href && l.href.includes('-episode-') && l.href.includes(base)).map(l => l.href))];
                }, slugBase);
            } catch(e) {
                console.log(`   ⚠️ Failed to load Master Series page.`);
            }
            
            await seriesPage.close();

            if (episodeLinks.length === 0) {
                console.log("   ❌ No episodes found on Master Series page. Moving on.");
                continue;
            }

            // Reverse to mine Oldest -> Newest.
            episodeLinks = episodeLinks.reverse();
            
            let highestMined = highestCachedEp;
            let minedCount = 0;

            for (let e = 0; e < episodeLinks.length; e++) {
                const epLink = episodeLinks[e];
                
                let epTitle = "unknown";
                let epNum = 0;
                try {
                    const slug = epLink.split('/').filter(Boolean).pop();
                    const parts = slug.split('-episode-');
                    if (parts.length === 2) {
                        epTitle = parts[0].replace(/-/g, ' ');
                        const numMatch = parts[1].match(/^(\d+)/);
                        epNum = numMatch ? parseInt(numMatch[1]) : 1;
                    }
                } catch(err){}
                
                if (!IGNORE_CACHE && epNum <= highestCachedEp) {
                    continue; // Skip silently
                }
                
                minedCount++;
                console.log(`      🎬 Mining ${epTitle} Ep ${epNum}...`);
                
                const epPage = await browser.newPage();
                
                // Disable loading images/fonts to speed up scraping
                await epPage.setRequestInterception(true);
                epPage.on('request', req => {
                    const rt = req.resourceType();
                    if (['image', 'stylesheet', 'font', 'media'].includes(rt)) {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });

                try {
                    await epPage.goto(epLink, { waitUntil: 'domcontentloaded', timeout: 25000 });
                    
                    const iframeSrc = await epPage.evaluate(() => {
                        const iframes = Array.from(document.querySelectorAll('iframe'));
                        const player = iframes.find(i => i.src && (i.src.includes('.php?id=') || i.src.includes('newplayer') || i.src.includes('embed')));
                        return player ? player.src : null;
                    });

                    if (iframeSrc) {
                        const { error } = await supabase.from('anime_links').upsert(
                            { title: epTitle.toLowerCase(), episode: epNum, type: 'http', url: iframeSrc },
                            { onConflict: 'title, episode, type' }
                        );
                        if (!error) {
                            console.log(`         💾 Saved Native HTTP Stream to Supabase!`);
                            if (epNum > highestMined) {
                                highestMined = epNum;
                            }
                        }
                    } else {
                        console.log(`         ⚠️ No compatible streaming iframe found on this page.`);
                    }
                } catch (err) {
                    console.log(`         ❌ Page timeout or error.`);
                }
                
                await epPage.close();
            }
            
            if (minedCount === 0) {
                console.log(`   ⏭️ All episodes were already cached. Skipped.`);
            }

            if (!IGNORE_CACHE && cleanTitle && highestMined > highestCachedEp) {
                if (!globalCache[cleanTitle]) globalCache[cleanTitle] = {};
                globalCache[cleanTitle].highest_http_ep = highestMined;
                saveCache();
                console.log(`   🗃️ CACHE: Updated highest HTTP episode for ${cleanTitle} to ${highestMined}`);
            }
            
            console.log(`   🏁 Finished processing ${masterSeriesUrl}.`);
        }

        currentPage++;
    }

    console.log("🎉 ALL PAGES MINED.");
    await browser.close();
}

runDumpMiner();
