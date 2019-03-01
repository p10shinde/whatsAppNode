'use strict';
// const Wendigo = require('wendigo');
const puppeteer = require('puppeteer-core');
var getChrome = require('get-chrome');
const appUrl = "https://web.whatsapp.com/"
// puppeteer.launch({executablePath : getChrome(), headless : false}).


async function pupF(){
	  const browser = await puppeteer.launch({ headless: false, executablePath : getChrome(), args: [
			'--start-maximized',
		 ]});
	  const page = await browser.newPage();
	  // await page.setViewport({ width: screenSize().x, height: screenSize()().y});
	  
	  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36');
	  await page.goto(appUrl, { waitUntil: 'networkidle2' });
	  await page.screenshot({path: 'example.png'});
	  var base64 = await page.$$eval('img[src]', aTags => aTags.map(a => a.getAttribute("src")))

  
	// await browser.close();
}

pupF()







async function wendigoF(){
	const browser = await Wendigo.createBrowser({headless : false, userAgent : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3312.0 Safari/537.36'});
	await browser.open(appUrl);
	// const base64 = await browser.attribute("._2EZ_m img","src");
	var res = await browser.page.evaluate(async (x) => {
		console.log('ehe')
		 return Promise.resolve(document.querySelector(x));
	},'div');

	console.log(res)
	await browser.close();
}

// wendigoF()

const browser = puppeteer.launch({ headless: false, executablePath : getChrome(), args: [
			'--start-maximized',
		 ]});