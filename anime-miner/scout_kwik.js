const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scoutKwik() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = "https://gogoanime.or.at/naruto-shippuden-episode-500/"; // The episode from the screenshot
    
    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Let's dump all iframes and download links
        const data = await page.evaluate(() => {
            const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
            const links = Array.from(document.querySelectorAll('a')).map(l => ({text: l.innerText, href: l.href}));
            return { iframes, links };
        });
        
        console.log("Iframes found on episode page:");
        console.dir(data.iframes, { depth: null });
        
        console.log("\nPossible Download Links:");
        const dlLinks = data.links.filter(l => l.text.toLowerCase().includes('download') || l.href.includes('download') || l.href.includes('kwik'));
        console.dir(dlLinks, { depth: null });
        
        console.log("\nChecking for embedded click handlers on download buttons...");
        const html = await page.evaluate(() => document.body.innerHTML);
        if (html.includes('kwik.cx')) {
            console.log("KWIK URL FOUND IN RAW HTML!");
        } else {
            console.log("KWIK URL NOT FOUND IN RAW HTML. It must be fetched dynamically.");
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
    await browser.close();
}

scoutKwik();
