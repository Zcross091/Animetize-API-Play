const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function checkIframe() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    
    const url = "https://gogoanime.or.at/kaiju-girl-caramelise-episode-1";
    console.log(`Navigating to ${url}...`);
    
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    const iframes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('iframe')).map(i => i.src);
    });
    
    console.log("IFRAMES FOUND:");
    console.log(iframes);
    
    await browser.close();
}

checkIframe();
