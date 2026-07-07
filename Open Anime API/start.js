const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENV_PATH = path.join(__dirname, 'OPENanime.env');

// ==========================================
// 1. Auto-Dependency Installer
// ==========================================
function installDependencies() {
    const requiredDeps = [
        'express',
        'dotenv',
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer-extra-plugin-adblocker',
        '@supabase/supabase-js',
        'axios',
        'cheerio'
    ];

    let packageJsonExists = fs.existsSync(path.join(__dirname, 'package.json'));
    if (!packageJsonExists) {
        console.log("📦 Creating package.json...");
        fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify({
            name: "open-anime-api",
            version: "1.0.0",
            main: "start.js",
            dependencies: {}
        }, null, 2));
    }

    const missingDeps = requiredDeps.filter(dep => {
        try {
            require.resolve(dep);
            return false;
        } catch (e) {
            return true;
        }
    });

    if (missingDeps.length > 0) {
        console.log(`🚀 Installing missing dependencies: ${missingDeps.join(', ')}...`);
        execSync(`npm install ${missingDeps.join(' ')}`, { stdio: 'inherit', cwd: __dirname });
        console.log("✅ Dependencies installed successfully!\n");
    }
}

installDependencies();

// ==========================================
// Load Environment Configuration
// ==========================================
const dotenv = require('dotenv');
if (fs.existsSync(ENV_PATH)) {
    dotenv.config({ path: ENV_PATH });
} else {
    fs.writeFileSync(ENV_PATH, `# Open Anime API Config\nPORT=3000\n`);
    dotenv.config({ path: ENV_PATH });
}

// ==========================================
// 2. Interactive Setup Wizard
// ==========================================
const readline = require('readline');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function setupDatabaseConfig() {
    let dbMode = process.env.DB_MODE;
    let localDbPath = process.env.LOCAL_DB_PATH || 'anime_links.json';
    let supabaseUrl = process.env.SUPABASE_URL;
    let supabaseKey = process.env.SUPABASE_KEY;

    if (!dbMode) {
        console.log("\n==========================================");
        console.log("🛠️  Open Anime API Setup Wizard");
        console.log("==========================================\n");
        console.log("Please choose where you want to save scraped streaming links:");
        console.log("1. Local File Database (saves to a .json file on your PC)");
        console.log("2. Supabase Database (free cloud database)");
        
        const choice = await askQuestion("\nEnter choice (1 or 2): ");
        if (choice.trim() === '2') {
            dbMode = 'supabase';
            supabaseUrl = await askQuestion("Enter your Supabase URL: ");
            supabaseKey = await askQuestion("Enter your Supabase Anon/Service Key: ");
        } else {
            dbMode = 'local';
            localDbPath = await askQuestion("Enter local database filename [anime_links.json]: ");
            if (!localDbPath.trim()) localDbPath = 'anime_links.json';
        }

        // Save back to OPENanime.env
        let envContent = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
        envContent += `\n# Database Settings\nDB_MODE=${dbMode}\nLOCAL_DB_PATH=${localDbPath}\nSUPABASE_URL=${supabaseUrl || ''}\nSUPABASE_KEY=${supabaseKey || ''}\n`;
        fs.writeFileSync(ENV_PATH, envContent);
        
        // Reload env
        process.env.DB_MODE = dbMode;
        process.env.LOCAL_DB_PATH = localDbPath;
        process.env.SUPABASE_URL = supabaseUrl;
        process.env.SUPABASE_KEY = supabaseKey;
        console.log("💾 Configuration saved to OPENanime.env!\n");
    }
}

// ==========================================
// 3. Database Layer (Supabase or Local JSON)
// ==========================================
let localDb = [];
let supabaseClient = null;

function initDb() {
    const dbMode = process.env.DB_MODE;
    if (dbMode === 'supabase') {
        const { createClient } = require('@supabase/supabase-js');
        supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        console.log("☁️  Connected to Supabase Database Cluster.");
    } else {
        const dbPath = path.join(__dirname, process.env.LOCAL_DB_PATH || 'anime_links.json');
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
        }
        try {
            localDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        } catch (e) {
            localDb = [];
        }
        console.log(`📁 Using Local Database File: ${dbPath}`);
    }
}

async function getLink(title, episode) {
    const dbMode = process.env.DB_MODE;
    const cleanTitle = title.toLowerCase().trim();

    if (dbMode === 'supabase') {
        const { data, error } = await supabaseClient
            .from('anime_links')
            .select('url, type')
            .eq('title', cleanTitle)
            .eq('episode', parseInt(episode));
        if (error || !data || data.length === 0) return null;
        return data;
    } else {
        const matches = localDb.filter(item => 
            item.title.toLowerCase().trim() === cleanTitle && 
            item.episode === parseInt(episode)
        );
        return matches.length > 0 ? matches : null;
    }
}

async function saveLink(title, episode, type, url) {
    const dbMode = process.env.DB_MODE;
    const cleanTitle = title.toLowerCase().trim();

    if (dbMode === 'supabase') {
        await supabaseClient.from('anime_links').upsert(
            { title: cleanTitle, episode: parseInt(episode), type, url },
            { onConflict: 'title, episode, type' }
        );
    } else {
        const dbPath = path.join(__dirname, process.env.LOCAL_DB_PATH || 'anime_links.json');
        
        // Remove old entry if conflict
        localDb = localDb.filter(item => 
            !(item.title.toLowerCase().trim() === cleanTitle && 
              item.episode === parseInt(episode) && 
              item.type === type)
        );

        localDb.push({ title: cleanTitle, episode: parseInt(episode), type, url });
        fs.writeFileSync(dbPath, JSON.stringify(localDb, null, 2));
    }
    console.log(`💾 Saved stream link to DB: [${cleanTitle}] Ep ${episode} (${type})`);
}

// ==========================================
// 4. Puppeteer Miner Integration
// ==========================================
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

async function runOnDemandMiner(title, episode) {
    console.log(`🔍 Waking up Puppeteer Scraper for: "${title}" Ep ${episode}...`);
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });

    const gogoDomains = (process.env.GOGO_DOMAINS || 'https://gogoanime.or.at').split(',').map(d => d.trim());
    let linkFound = false;

    // We search GogoAnime domains
    for (const domain of gogoDomains) {
        try {
            const page = await browser.newPage();
            // Keep stylesheets but block heavy images/media
            await page.setRequestInterception(true);
            page.on('request', req => {
                if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
                else req.continue();
            });

            const searchUrl = `${domain}/?s=${encodeURIComponent(title)}`;
            console.log(`   🌐 Searching: ${searchUrl}`);
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 25000 });

            const animeUrl = await page.evaluate((t) => {
                const links = Array.from(document.querySelectorAll('a'));
                const queryBase = t.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
                const match = links.find(l => l.href && l.href.includes('/anime/') && l.href.toLowerCase().includes(queryBase));
                return match ? match.href : null;
            }, title);

            if (!animeUrl) {
                await page.close();
                continue;
            }

            // Construct direct episode URL
            const slug = animeUrl.split('/').filter(Boolean).pop();
            const epUrl = `${domain}/${slug}-episode-${episode}`;
            
            console.log(`   🎬 Mining player from: ${epUrl}`);
            await page.goto(epUrl, { waitUntil: 'networkidle2', timeout: 25000 });

            const iframeSrc = await page.evaluate(() => {
                const iframes = Array.from(document.querySelectorAll('iframe'));
                const player = iframes.find(i => i.src && (i.src.includes('.php?id=') || i.src.includes('newplayer') || i.src.includes('embed')));
                return player ? player.src : null;
            });

            await page.close();

            if (iframeSrc) {
                await saveLink(title, episode, 'http', iframeSrc);
                linkFound = true;
                break;
            }
        } catch (e) {
            console.error(`   ⚠️ Failed mining Gogo domain ${domain}:`, e.message);
        }
    }

    await browser.close();
    return linkFound;
}

// ==========================================
// 5. Express API Server & Admin Dashboard
// ==========================================
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Proxy endpoints using Jikan API (MyAnimeList)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}`);
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch metadata from Jikan API" });
    }
});

app.get('/api/anime/:id', async (req, res) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime/${req.params.id}`);
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch metadata" });
    }
});

app.get('/api/anime/:id/episodes', async (req, res) => {
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime/${req.params.id}/episodes`);
        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch episodes" });
    }
});

// Stream links resolver endpoint
app.get('/api/stream', async (req, res) => {
    const { title, episode } = req.query;
    if (!title || !episode) return res.status(400).json({ error: "Missing 'title' or 'episode' parameter" });

    try {
        // 1. Check if cached in DB
        let links = await getLink(title, episode);
        if (links) {
            console.log(`🎯 Cache Hit for [${title}] Ep ${episode}`);
            return res.json({ success: true, source: 'cache', links });
        }

        // 2. Not cached - Run Puppeteer miner on-demand
        const success = await runOnDemandMiner(title, episode);
        if (success) {
            links = await getLink(title, episode);
            return res.json({ success: true, source: 'scraped_live', links });
        }

        res.status(404).json({ error: "No compatible stream found for this episode." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Admin Dashboard UI Page
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Open Anime API Admin Dashboard</title>
            <style>
                body { font-family: -apple-system, sans-serif; background: #0b0f19; color: #f3f4f6; padding: 2rem; margin: 0; }
                .container { max-width: 800px; margin: 0 auto; background: #111827; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                h1 { color: #f43f5e; margin-top: 0; }
                .status-box { background: #1f2937; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
                .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85rem; font-weight: bold; background: #10b981; color: white; }
                input { width: 70%; padding: 0.75rem; background: #1f2937; border: 1px solid #374151; color: white; border-radius: 6px; }
                button { padding: 0.75rem 1.5rem; background: #f43f5e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                button:hover { background: #e11d48; }
                #results { margin-top: 1.5rem; background: #1f2937; padding: 1rem; border-radius: 8px; font-family: monospace; white-space: pre-wrap; overflow-x: auto; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📡 Open Anime API Controller</h1>
                <div class="status-box">
                    <p><strong>API Server Status:</strong> <span class="badge">RUNNING</span></p>
                    <p><strong>Database Mode:</strong> <code>\${process.env.DB_MODE}</code> (\${process.env.DB_MODE === 'local' ? process.env.LOCAL_DB_PATH : 'Supabase Cloud'})</p>
                    <p><strong>Active Port:</strong> <code>\${PORT}</code></p>
                </div>
                <h3>Test Stream Resolver:</h3>
                <div style="display:flex; gap: 10px;">
                    <input type="text" id="title" placeholder="Anime Title (e.g. One Punch Man)">
                    <input type="number" id="ep" placeholder="Ep" style="width: 70px;">
                    <button onclick="testResolver()">Resolve Stream</button>
                </div>
                <div id="results">Logs and links will appear here...</div>
            </div>
            <script>
                async function testResolver() {
                    const title = document.getElementById('title').value;
                    const ep = document.getElementById('ep').value;
                    const resDiv = document.getElementById('results');
                    resDiv.innerText = 'Searching cache and deploying miners if needed...';
                    try {
                        const res = await fetch(\`/api/stream?title=\${encodeURIComponent(title)}&episode=\${ep}\`);
                        const data = await res.json();
                        resDiv.innerText = JSON.stringify(data, null, 2);
                    } catch(e) {
                        resDiv.innerText = 'Failed to connect to API: ' + e.message;
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Start the Express server after setting up configuration
async function startServer() {
    await setupDatabaseConfig();
    initDb();
    app.listen(PORT, () => {
        console.log(`🚀 Open Anime API dashboard is running at http://localhost:${PORT}`);
    });
}

startServer();
