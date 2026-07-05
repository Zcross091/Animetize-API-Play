import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();
puppeteer.use(StealthPlugin());

const GOGO_DOMAINS = (process.env.GOGO_DOMAINS || '')
    .split(',')
    .map(d => d.trim().replace(/\/popular\/?$/, '').replace(/\/$/, ''))
    .filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY env variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const query = process.argv[2];
if (!query) {
    console.error('❌ Usage: ts-node runQuery.ts "anime title"');
    process.exit(1);
}

async function saveToSupabase(title: string, episode: number, type: string, url: string) {
    const { error } = await supabase.from('anime_links').upsert(
        { title: title.toLowerCase().trim(), episode, type, url },
        { onConflict: 'title, episode, type' }
    );
    if (error) console.error(`❌ Supabase error:`, error.message);
    else console.log(`✅ Saved: [${title}] Ep ${episode} (${type})`);
}

async function scrapeAnimePage(browser: any, animeUrl: string, domain: string): Promise<number> {
    console.log(`\n📚 Scraping series: ${animeUrl}`);
    const page = await browser.newPage();
    let savedCount = 0;

    try {
        await page.goto(animeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const slugMatch = animeUrl.match(/\/anime\/(.*?)\/?$/i);
        const slugBase = slugMatch ? slugMatch[1].split('-')[0] : '';

        let episodeLinks: string[] = await page.evaluate((base: string) => {
            const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
            return [...new Set(
                links
                    .filter(l => l.href && l.href.includes('-episode-') && l.href.includes(base))
                    .map(l => l.href)
            )];
        }, slugBase);

        episodeLinks = episodeLinks.reverse();
        console.log(`   📺 Found ${episodeLinks.length} episodes`);

        for (const url of episodeLinks) {
            const domainHost = new URL(domain).hostname.replace('.', '\\.');
            const match = url.match(new RegExp(`${domainHost}\\/(.*?)-episode-(\\d+)`, 'i'));
            if (!match) continue;

            const rawTitle = match[1];
            const epNum = parseInt(match[2]);
            const title = rawTitle.replace(/-/g, ' ').toLowerCase().trim();

            try {
                const epPage = await browser.newPage();
                await epPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                const iframeSrc: string | null = await epPage.evaluate(() => {
                    const iframes = Array.from(document.querySelectorAll('iframe')) as HTMLIFrameElement[];
                    const player = iframes.find(i => i.src && (
                        i.src.includes('.php?id=') ||
                        i.src.includes('newplayer') ||
                        i.src.includes('embed') ||
                        i.src.includes('gogohd') ||
                        i.src.includes('gogoplay')
                    ));
                    return player ? player.src : null;
                });

                if (iframeSrc) {
                    await saveToSupabase(title, epNum, 'http', iframeSrc);
                    savedCount++;
                }
                await epPage.close();
            } catch {
                console.log(`   ⚠️  Failed ep ${epNum}`);
            }
        }
    } catch (e: any) {
        console.log(`   ❌ Series scrape failed: ${e.message}`);
    }

    await page.close();
    return savedCount;
}

async function mineFromGogo(query: string): Promise<boolean> {
    console.log(`\n🔍 GogoAnime Puppeteer search for: "${query}"`);

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ]
    });

    let totalSaved = 0;

    for (const domain of GOGO_DOMAINS) {
        try {
            const searchUrl = `${domain}/?s=${encodeURIComponent(query)}`;
            console.log(`\n🌐 Searching: ${searchUrl}`);

            const searchPage = await browser.newPage();
            await searchPage.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const queryBase = query.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

            const searchResults: string[] = await searchPage.evaluate((base: string) => {
                const links = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
                return [...new Set(
                    links
                        .filter(l => l.href && l.href.includes('/anime/') && l.href.toLowerCase().includes(base))
                        .map(l => l.href)
                )];
            }, queryBase);

            await searchPage.close();

            if (searchResults.length === 0) {
                console.log(`⚠️  No results on ${domain}`);
                continue;
            }

            console.log(`🎯 Found ${searchResults.length} matching anime on ${domain}`);

            for (const animeUrl of searchResults) {
                const count = await scrapeAnimePage(browser, animeUrl, domain);
                totalSaved += count;
            }

            if (totalSaved > 0) break; // Stop after first successful domain
        } catch (e: any) {
            console.log(`❌ ${domain} failed: ${e.message}`);
        }
    }

    await browser.close();

    if (totalSaved > 0) {
        console.log(`\n✅ GogoAnime: ${totalSaved} episodes saved.`);
        return true;
    }
    return false;
}

async function mineFromNyaa(query: string): Promise<boolean> {
    try {
        const nyaaUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(query)}`;
        console.log(`\n🔍 Nyaa.si search: ${nyaaUrl}`);
        const res = await axios.get(nyaaUrl, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        let savedCount = 0;
        $('table.torrent-list tbody tr').each((_, row) => {
            const title = $(row).find('td[colspan="2"] a').last().text().trim();
            const magnet = $(row).find('td.text-center a[href^="magnet:?"]').attr('href');
            const epMatch = title.match(/(?:ep|episode|e)\s*(\d+)/i) || title.match(/\s(\d{1,3})\s/);
            const epNum = epMatch ? parseInt(epMatch[1]) : 1;
            if (magnet && title) {
                saveToSupabase(query, epNum, 'torrent', magnet);
                savedCount++;
            }
        });

        if (savedCount > 0) {
            console.log(`✅ Nyaa: ${savedCount} torrent links saved.`);
            return true;
        }
    } catch (e: any) {
        console.log(`❌ Nyaa.si failed: ${e.message}`);
    }
    return false;
}

(async () => {
    console.log(`\n🚀 Ronin API One-Shot Query: "${query}"\n`);

    // Run both miners concurrently
    const [gogoSuccess, nyaaSuccess] = await Promise.all([
        mineFromGogo(query),
        mineFromNyaa(query)
    ]);

    if (!gogoSuccess && !nyaaSuccess) {
        console.error(`❌ All sources failed for: "${query}"`);
        process.exit(1);
    }

    console.log(`\n✅ Mining completed for: "${query}"`);
    process.exit(0);
})();
