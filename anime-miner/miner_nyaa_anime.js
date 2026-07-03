require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const CACHE_FILE = './global_cache.json';
let globalCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try { globalCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch(e){}
}
function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(globalCache, null, 2));
}

puppeteer.use(StealthPlugin());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const searchQuery = process.argv[2]; // Grab the 3rd argument from the command line

async function scrapeNyaaQuery(browser, query, maxPages, ignoreCache = false) {
    const page = await browser.newPage();
    const discoveredTitles = new Set();
    
    let nyaaUrl = "https://nyaa.si/?c=1_2";
    if (query) {
        nyaaUrl += `&q=${encodeURIComponent(query)}&s=seeders&o=desc`;
        console.log(`\n🔍 Deep Dive Searching: "${query}" (Mining ${maxPages} pages)`);
    } else {
        console.log(`\n🔍 Scouting Latest Uploads (Mining ${maxPages} pages)`);
    }

    let highestCachedEp = 0;
    if (query && !ignoreCache && globalCache[query] && globalCache[query].highest_magnet_ep) {
        highestCachedEp = globalCache[query].highest_magnet_ep;
        console.log(`   🗃️ CACHE: Found highest Magnet episode: ${highestCachedEp}`);
    }
    let highestMined = highestCachedEp;

    try {
        let currentPage = 1;
        while (currentPage <= maxPages) {
            console.log(`   📄 Page ${currentPage}...`);
            await page.goto(`${nyaaUrl}&p=${currentPage}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const torrents = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('table.torrent-list tbody tr'));
                return rows.map(row => {
                    const titleEl = row.querySelector('td[colspan="2"] a:not(.comments)');
                    const links = row.querySelectorAll('td.text-center a');
                    
                    let magnet = '';
                    for (const link of links) {
                        if (link.href && link.href.startsWith('magnet:')) {
                            magnet = link.href;
                            break;
                        }
                    }
                    
                    return {
                        rawTitle: titleEl ? titleEl.title || titleEl.innerText : '',
                        magnet: magnet
                    };
                }).filter(t => t.rawTitle && t.magnet);
            });
            
            console.log(`   Found ${torrents.length} anime torrents...`);
            
            if (torrents.length === 0) break; // Stop if no results

            for (const t of torrents) {
                let title = t.rawTitle;
                let startEp = 1;
                let endEp = 1;
                let isBatch = false;
                
                title = title.replace(/^\[.*?\]/, '').trim();
                
                const batchMatch = title.match(/(?:- |episode |ep |\(|\[)?(\d{1,4})\s*(?:-|~|to)\s*(\d{1,4})(?:\)|\]|\s|$|v\d+)/i);
                if (batchMatch && parseInt(batchMatch[2]) > parseInt(batchMatch[1]) && parseInt(batchMatch[2]) - parseInt(batchMatch[1]) < 1500) {
                    startEp = parseInt(batchMatch[1]);
                    endEp = parseInt(batchMatch[2]);
                    isBatch = true;
                    title = title.replace(batchMatch[0], '').trim();
                } else {
                    let epMatch = title.match(/(?:- |episode |ep )0*(\d{1,4})(?:\)|\]|\s|$|v\d+)/i);
                    if (!epMatch) {
                        epMatch = title.match(/(?:\(|\[)?0*(\d{1,4})(?:\)|\]|\s|$|v\d+)/i);
                    }
                    
                    if (epMatch) {
                        const parsedNum = parseInt(epMatch[1]);
                        if (!(parsedNum >= 1950 && parsedNum <= 2050 && epMatch[1].length === 4)) {
                            startEp = parsedNum;
                            endEp = parsedNum;
                            title = title.replace(epMatch[0], '').trim();
                        }
                    }
                }
                
                if (query && !ignoreCache && endEp <= highestCachedEp) {
                    continue; // Skip silently since it is already cached
                }
                
                title = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
                title = title.replace(/-$/, '').replace(/\.$/, '').replace(/_/, ' ').trim();
                title = title.toLowerCase();
                
                // Track this title as an actively trending show
                if (title.length > 2) {
                    discoveredTitles.add(title);
                }
                
                if (isBatch) {
                    console.log(`      🎬 BATCH: ${title} | Eps ${startEp}-${endEp}`);
                } else {
                    console.log(`      🎬 SINGLE: ${title} | Ep ${startEp}`);
                }
                
                const insertPromises = [];
                for (let ep = startEp; ep <= endEp; ep++) {
                    insertPromises.push(
                        supabase.from('anime_links').upsert(
                            { title: title, episode: ep, type: 'sub', url: t.magnet },
                            { onConflict: 'title, episode, type' }
                        )
                    );
                }
                
                const results = await Promise.all(insertPromises);
                const errors = results.filter(r => r.error);
                
                if (errors.length > 0) {
                    console.log(`         ❌ DB Save Failed for ${errors.length} eps!`);
                } else {
                    console.log(`         💾 Saved ${endEp - startEp + 1} eps to DB!`);
                    if (endEp > highestMined) {
                        highestMined = endEp;
                    }
                }
            }
            
            currentPage++;
            await new Promise(r => setTimeout(r, 3000));
        }
    } catch(e) {
        console.log("   ❌ Failed to scrape query:", e.message);
    }
    
    if (query && !ignoreCache && highestMined > highestCachedEp) {
        if (!globalCache[query]) globalCache[query] = {};
        globalCache[query].highest_magnet_ep = highestMined;
        saveCache();
        console.log(`   🗃️ CACHE: Updated highest Magnet episode to ${highestMined}`);
    }
    
    await page.close();
    return Array.from(discoveredTitles);
}

async function mineNyaaAnime() {
    console.log(`🚀 Starting NYAA ANIME Miner...`);
    const browser = await puppeteer.launch({ headless: false, args: ['--window-size=800,600'] });
    
    if (searchQuery) {
        // Manual Search Mode (Forces a Full Heal by ignoring cache)
        await scrapeNyaaQuery(browser, searchQuery, 5, true);
    } else {
        // Trending-Scout Automation Mode
        console.log(`\n🕵️ PHASE 1: Scouting the Recent Timeline for Trending Anime...`);
        // Scrape 2 pages of latest uploads to collect active titles
        const activeTitles = await scrapeNyaaQuery(browser, null, 2);
        
        if (activeTitles.length > 0) {
            console.log(`\n🎯 SCOUT COMPLETE! Discovered ${activeTitles.length} actively trending anime:`);
            console.log(activeTitles.join(', '));
            
            console.log(`\n🚀 PHASE 2: Commencing Deep Dives into Active Series...`);
            for (let i = 0; i < activeTitles.length; i++) {
                console.log(`\n======================================`);
                console.log(`🔥 DEEP DIVE [${i+1}/${activeTitles.length}]: ${activeTitles[i]}`);
                console.log(`======================================`);
                // Deep dive 15 pages for each active anime
                await scrapeNyaaQuery(browser, activeTitles[i], 15);
                // Sleep to prevent rate limiting
                await new Promise(r => setTimeout(r, 5000)); 
            }
        } else {
            console.log(`\n❌ SCOUT FAILED: No active titles discovered.`);
        }
    }
    
    console.log("\n🎉 NYAA ANIME MINING COMPLETE!");
    await browser.close();
}

mineNyaaAnime();
