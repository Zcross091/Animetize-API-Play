import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const GOGO_DOMAINS = (process.env.GOGO_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY env variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const query = process.argv[2];
if (!query) {
    console.error('❌ No search query provided. Usage: ts-node runQuery.ts "anime title"');
    process.exit(1);
}

async function saveToSupabase(title: string, episode: number, type: string, url: string) {
    const { error } = await supabase.from('anime_links').upsert(
        { title: title.toLowerCase().trim(), episode, type, url },
        { onConflict: 'title, episode, type' }
    );
    if (error) {
        console.error(`❌ Supabase error:`, error.message);
    } else {
        console.log(`✅ Saved: [${title}] Ep ${episode} (${type}) → ${url}`);
    }
}

async function mineFromGogo(query: string): Promise<boolean> {
    for (const domain of GOGO_DOMAINS) {
        try {
            const searchUrl = `${domain}/search.html?keyword=${encodeURIComponent(query)}`;
            console.log(`🔍 Searching GogoAnime: ${searchUrl}`);
            const res = await axios.get(searchUrl, { timeout: 10000 });
            const $ = cheerio.load(res.data);

            const firstResult = $('ul.items li p.name a').first();
            if (!firstResult.length) { console.log(`⚠️  No results on ${domain}`); continue; }

            const seriesSlug = firstResult.attr('href')?.replace('/category/', '');
            const seriesTitle = firstResult.text().trim() || query;

            const seriesUrl = `${domain}/category/${seriesSlug}`;
            const seriesRes = await axios.get(seriesUrl, { timeout: 10000 });
            const s$ = cheerio.load(seriesRes.data);

            const ep_start = s$('#episode_page > li').first().find('a').attr('ep_start') || '1';
            const ep_end = s$('#episode_page > li').last().find('a').attr('ep_end') || '1';
            const movie_id = s$('#movie_id').attr('value');
            const alias = s$('#alias_anime').attr('value');

            const ajaxUrl = `https://ajax.gogocdn.net/ajax/load-list-episode?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=0&alias=${alias}`;
            const html = await axios.get(ajaxUrl, { timeout: 10000 });
            const e$ = cheerio.load(html.data);

            const episodes: Array<{ num: number; slug: string }> = [];
            e$('#episode_related > li').each((_, el) => {
                const href = e$(el).find('a').attr('href')?.trim();
                const epNum = parseFloat(e$(el).find('div.name').text().replace('EP ', ''));
                if (href && !isNaN(epNum)) episodes.push({ num: epNum, slug: href });
            });

            console.log(`📺 Found ${episodes.length} episodes for "${seriesTitle}"`);

            let savedCount = 0;
            for (const ep of episodes) {
                try {
                    const epUrl = `${domain}${ep.slug}`;
                    const epRes = await axios.get(epUrl, { timeout: 10000 });
                    const ep$ = cheerio.load(epRes.data);
                    const iframe = ep$('.play-video iframe').attr('src');
                    if (iframe) {
                        const videoUrl = iframe.startsWith('http') ? iframe : `https:${iframe}`;
                        await saveToSupabase(seriesTitle, ep.num, 'http', videoUrl);
                        savedCount++;
                    }
                } catch { console.log(`  ⚠️  Failed ep ${ep.num}`); }
            }

            if (savedCount > 0) {
                console.log(`✅ GogoAnime: Saved ${savedCount} episodes.`);
                return true;
            }
        } catch (e: any) {
            console.log(`❌ GogoAnime failed on ${domain}: ${e.message}`);
        }
    }
    return false;
}

async function mineFromNyaa(query: string): Promise<boolean> {
    try {
        const nyaaUrl = `https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(query)}`;
        console.log(`🔍 Searching Nyaa.si: ${nyaaUrl}`);
        const res = await axios.get(nyaaUrl, { timeout: 10000 });
        const $ = cheerio.load(res.data);

        let savedCount = 0;
        $('table.torrent-list tbody tr').each((_, row) => {
            const title = $(row).find('td[colspan="2"] a').last().text().trim();
            const magnet = $(row).find('td.text-center a[href^="magnet:?"]').attr('href');
            const epMatch = title.match(/(?:episode|ep|e)\s*(\d+)/i) || title.match(/\s(\d{1,3})\s/);
            const epNum = epMatch ? parseInt(epMatch[1]) : 1;
            if (magnet && title) { saveToSupabase(query, epNum, 'torrent', magnet); savedCount++; }
        });

        if (savedCount > 0) { console.log(`✅ Nyaa: Saved ${savedCount} torrent links.`); return true; }
    } catch (e: any) { console.log(`❌ Nyaa.si failed: ${e.message}`); }
    return false;
}

(async () => {
    console.log(`\n🚀 Ronin API One-Shot Query: "${query}"\n`);
    const gogoSuccess = await mineFromGogo(query);
    const nyaaSuccess = await mineFromNyaa(query);
    if (!gogoSuccess && !nyaaSuccess) {
        console.error(`❌ All sources failed for: "${query}"`);
        process.exit(1);
    }
    console.log(`\n✅ Mining done for: "${query}"`);
    process.exit(0);
})();
