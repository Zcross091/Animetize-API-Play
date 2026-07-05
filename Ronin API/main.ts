import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();
puppeteer.use(StealthPlugin());

const GOGO_DOMAINS = (process.env.GOGO_DOMAINS || "").split(",").map(d => d.trim()).filter(Boolean);
const ANIWAVE_CLUSTER = (process.env.ANIWAVE_CLUSTER || "").split(",").map(d => d.trim()).filter(Boolean);
const HIANIME_CLUSTER = (process.env.HIANIME_CLUSTER || "").split(",").map(d => d.trim()).filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const fastify = Fastify({ logger: true });

async function saveToSupabase(title: string, episode: number, type: string, url: string) {
    if (!supabase) return;
    const { error } = await supabase.from('anime_links').upsert(
        { title: title.toLowerCase().trim(), episode, type, url },
        { onConflict: 'title, episode, type' }
    );
    if (error) console.error("❌ Supabase Error:", error);
    else console.log(`✅ Cached to Supabase: [${title}] Ep ${episode} -> ${url}`);
}

fastify.register(FastifyCors, { origin: '*' });

fastify.get('/api/server1/:query/:episode', async (request, reply) => {
    const { query, episode } = request.params as { query: string, episode: string };
    const epNum = parseInt(episode);
    
    for (const domain of GOGO_DOMAINS) {
        try {
            const searchUrl = `${domain}/search.html?keyword=${encodeURIComponent(query)}`;
            const res = await axios.get(searchUrl, { timeout: 8000 });
            const $ = cheerio.load(res.data);
            
            const firstResult = $('ul.items li p.name a').first();
            if (!firstResult.length) continue;
            
            const seriesSlug = firstResult.attr('href')?.replace('/category/', '');
            const episodeUrl = `${domain}/${seriesSlug}-episode-${epNum}`;
            
            const epRes = await axios.get(episodeUrl, { timeout: 8000 });
            const ep$ = cheerio.load(epRes.data);
            const iframe = ep$('.play-video iframe').attr('src');
            
            if (iframe) {
                let videoUrl = iframe.startsWith('http') ? iframe : `https:${iframe}`;
                await saveToSupabase(query, epNum, "http", videoUrl);
                return { status: 200, server: "Server 1", query, episode: epNum, results: [{ title: `${query} - Ep ${epNum}`, url: videoUrl, source: "Server 1" }] };
            }
        } catch (e) {
            console.log(`Server 1 failed on ${domain}`);
        }
    }
    reply.status(404).send({ detail: "Server 1: Extraction failed." });
});

fastify.get('/api/server2/:query/:episode', async (request, reply) => {
    const { query, episode } = request.params as { query: string, episode: string };
    const epNum = parseInt(episode);
    const mockUrl = `https://mock-playwright-stream.com/embed/${query.replace(/ /g, '-').toLowerCase()}-ep-${epNum}`;
    await saveToSupabase(query, epNum, "playwright", mockUrl);
    return { status: 200, server: "Server 2", query, episode: epNum, results: [{ title: `${query} - Ep ${epNum}`, url: mockUrl, source: "Server 2" }] };
});

fastify.get('/api/server3/:query/:episode', async (request, reply) => {
    const { query, episode } = request.params as { query: string, episode: string };
    const epNum = parseInt(episode);
    const mockUrl = `https://mock-playwright-stream.com/embed/${query.replace(/ /g, '-').toLowerCase()}-ep-${epNum}`;
    await saveToSupabase(query, epNum, "playwright", mockUrl);
    return { status: 200, server: "Server 3", query, episode: epNum, results: [{ title: `${query} - Ep ${epNum}`, url: mockUrl, source: "Server 3" }] };
});

fastify.get('/api/downloads/:query/:episode', async (request, reply) => {
    const { query, episode } = request.params as { query: string, episode: string };
    try {
        const res = await axios.get(`https://nyaa.si/?f=0&c=1_2&q=${encodeURIComponent(query)}+${episode}`, { timeout: 8000 });
        const $ = cheerio.load(res.data);
        const results: any[] = [];
        
        $('table.torrent-list tbody tr').each((_, row) => {
            const title = $(row).find('td[colspan="2"] a').last().text().trim();
            const magnet = $(row).find('td.text-center a[href^="magnet:?"]').attr('href');
            const size = $(row).find('td.text-center').filter((_, el) => $(el).text().includes('MiB') || $(el).text().includes('GiB')).first().text().trim();
            if (magnet) results.push({ title, size, magnet, source: "Nyaa.si" });
        });
        return { status: 200, server: "Downloads", query, episode, results };
    } catch (e) {
        reply.status(500).send({ detail: "Nyaa.si unreachable." });
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: 8000, host: '0.0.0.0' });
        console.log(chalk.green(`🚀 Ronin API started on port 8000 (Node.js version)`));
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
