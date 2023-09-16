const puppeteer = require('puppeteer-extra')
const { scrollPageToBottom } = require('puppeteer-autoscroll-down')
const { setTimeout } = require('timers/promises');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs')
puppeteer.use(StealthPlugin())

class anime {
    constructor(title, rating, season, episodes, description, img, url) {
        this.title = title;
        this.rating = rating;
        this.season = season,
            this.episodes = episodes;
        this.description = description,
            this.img = img,
            this.url = url;
    }
}

const url = 'https://www.crunchyroll.com/videos/popular';
const urlBase = 'https://www.cruchyroll.com/';

async function scrapeHomePage(url) {
    const browser = await puppeteer.launch({
        headless: 'new'
        // headless: false
    });

    const page = await browser.newPage();

    await page.setViewport({
        width: 1200,
        height: 800
    });

    await page.goto(url, { 'timeout': 10000, 'waitUntil': 'load' });
    await waitTillHTMLRendered(page);
    await doPageScroll(page);
    await doJsonConversionAndSave(await scrapeAndMap(page));

    browser.close();
}

async function doJsonConversionAndSave(combinedData) {
    let date = new Date();
    date.setMonth(date.getMonth() + 1);

    const loadedDate = date.getDay() + "-" + date.getMonth() + "-" + date.getFullYear();
    const loadedFileName = loadedDate + "_data-list-full.json";

    fs.writeFile(loadedFileName, JSON.stringify(combinedData), (err) => {
        if (err) throw err;
        console.log("Successfully Saved Anime List as Json")
    });
}

async function doPageScroll(page) {
    let scrollCount = 0;
    const totalScrolls = 6;

    while (scrollCount != totalScrolls) {
        await scrollPageToBottom(page, { size: 250, delay: 100 })
        // await setTimeout(100); // Given 1.5 sconds for the page to load fully.

        scrollCount++;
        console.log('Scroll Count: ', scrollCount);
    }
}

async function scrapeAndMap(page) {
    const titles = await page.$$eval(".browse-card-hover__title-link--A6aAw", titles => {
        return titles.map(title => title.textContent)
    });

    const descriptions = await page.$$eval(".browse-card-hover__description--e28NH", descriptions => {
        return descriptions.map(description => description.innerText)
    });

    const ratings = await page.$$eval(".star-rating-short-static__rating--bdAfR", ratings => {
        return ratings.map(rating => rating.textContent)
    });

    const seasons = await page.$$eval("div.browse-card-hover__meta--aB4TP > div > span:nth-child(1)", seasons => {
        return seasons.map(season => season.textContent).filter(n => n)
    });

    const episodes = await page.$$eval("div.browse-card-hover__meta--aB4TP > div > span:nth-child(2)", episodes => {
        return episodes.map(episode => episode.textContent)
    });

    const imgs = await page.$$eval("a.browse-card-hover__poster-wrapper--Yf-IK > div > figure > picture > img", imgs => {
        return imgs.map(img => img.getAttribute('src')).filter(n => n)
    });

    const c_url = await page.$$eval(".browse-card-hover__link--0BAl-", urls => {
        return urls.map(url => url.getAttribute('href'))
    });

    return titles.map((x, i) => {
        return new anime(
            x,
            ratings[i],
            seasons[i],
            episodes[i],
            descriptions[i],
            imgs[i],
            urlBase + c_url[i]
        )
    });
}

const waitTillHTMLRendered = async (page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
        let html = await page.content();
        let currentHTMLSize = html.length;

        let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

        console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

        if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0; //reset the counter

        if (countStableSizeIterations >= minStableSizeIterations) {
            console.log("Page rendered fully..");
            break;
        }

        lastHTMLSize = currentHTMLSize;
        await page.waitForTimeout(checkDurationMsecs);
    }
};

scrapeHomePage(url);