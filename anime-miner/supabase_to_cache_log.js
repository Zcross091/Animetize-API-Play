require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const CACHE_FILE = './global_cache.json';

async function seedCache() {
    console.log("🚀 Starting Supabase to Cache Sync...");

    let globalCache = {};
    if (fs.existsSync(CACHE_FILE)) {
        try { globalCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch (e) { }
    }

    let start = 0;
    const limit = 1000;
    let totalProcessed = 0;

    console.log("📡 Fetching episodes from Supabase (this may take a few seconds)...");

    while (true) {
        // Fetch rows in chunks of 1000 to prevent memory overloads
        const { data, error } = await supabase
            .from('anime_links')
            .select('title, episode, type')
            .range(start, start + limit - 1);

        if (error) {
            console.error("❌ Error fetching from Supabase:", error.message);
            break;
        }

        if (!data || data.length === 0) {
            break; // Finished fetching all rows
        }

        for (const row of data) {
            const title = row.title;
            const episode = row.episode;
            const type = row.type;

            if (!globalCache[title]) {
                globalCache[title] = {};
            }

            // HTTP Streams (Gogoanime)
            if (type === 'http') {
                if (!globalCache[title].highest_http_ep || episode > globalCache[title].highest_http_ep) {
                    globalCache[title].highest_http_ep = episode;
                }
            }
            // Magnet/Torrent Streams (Nyaa)
            else if (type === 'sub' || type === 'magnet') {
                if (!globalCache[title].highest_magnet_ep || episode > globalCache[title].highest_magnet_ep) {
                    globalCache[title].highest_magnet_ep = episode;
                }
            }
        }

        totalProcessed += data.length;
        console.log(`   ✅ Processed ${totalProcessed} rows...`);
        start += limit;
    }

    // Save the fully rebuilt cache to the local JSON file
    fs.writeFileSync(CACHE_FILE, JSON.stringify(globalCache, null, 2));

    console.log(`\n🎉 SYNC COMPLETE!`);
    console.log(`🗃️ Successfully populated global_cache.json with ${Object.keys(globalCache).length} unique anime titles!`);
}

seedCache();
