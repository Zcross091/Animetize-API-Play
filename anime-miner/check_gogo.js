const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function checkGogo() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const url = "https://gogoanime.or.at";
    
    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const title = await page.title();
        console.log("Page Title:", title);
        
        // Let's find some anime links on the homepage
        const animeLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            return [...new Set(links.map(l => l.href).filter(h => h.length > 20))].slice(0, 10);
        });
        console.log("Found Category Links:", animeLinks);
        
        if (animeLinks.length > 0) {
            console.log(`Navigating to ${animeLinks[0]}...`);
            await page.goto(animeLinks[0], { waitUntil: 'domcontentloaded' });
            
            // Wait for episodes
            const epLinks = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a'));
                return links.filter(l => l.href && l.href.includes('-episode-')).map(l => l.href).slice(0, 3);
            });
            console.log("Found Episode Links:", epLinks);
            
            if (epLinks.length > 0) {
                console.log(`Navigating to ${epLinks[0]}...`);
                await page.goto(epLinks[0], { waitUntil: 'domcontentloaded' });
                
                // Look for download options
                const downloadLinks = await page.evaluate(() => {
                    const dls = Array.from(document.querySelectorAll('a, .download'));
                    return dls.map(el => ({ text: el.innerText.trim(), href: el.href || '' }))
                              .filter(el => el.text.toLowerCase().includes('download') || el.href.toLowerCase().includes('download'));
                });
                console.log("Found Download Links on Episode Page:", downloadLinks);
                
                // Capture screenshot for visual verification
                await page.screenshot({ path: 'gogo_test.png', fullPage: true });
            }
        }
    } catch(e) {
        console.log("Error:", e.message);
    }
    await browser.close();
}

checkGogo();
