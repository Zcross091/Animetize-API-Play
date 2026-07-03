const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function researchGogo() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    console.log(`Navigating to search page...`);
    try {
        await page.goto("https://gogoanime.or.at/?s=one%20piece", { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        const searchResults = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return [...new Set(links.filter(l => l.href && l.href.includes('/anime/')).map(l => l.href))];
        });
        
        console.log("Search Results (Anime Links):", searchResults.slice(0, 5));
        
        if (searchResults.length > 0) {
            console.log(`\nNavigating to Anime Page: ${searchResults[0]}`);
            await page.goto(searchResults[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            const episodeLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return [...new Set(links.filter(l => l.href && l.href.includes('-episode-')).map(l => l.href))];
            });
            
            console.log(`Found ${episodeLinks.length} episode links on the anime page!`);
            console.log(episodeLinks.slice(0, 5));
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
    await browser.close();
}

researchGogo();
