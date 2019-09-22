const puppeteer = require('puppeteer-core');
const fs = require('fs');

const {AudioSourceServer} = require('./audio-source/server/audio-source-server');


(async () => {
    const browser = await puppeteer.launch({
        executablePath: '/opt/google/chrome/chrome' // Your local path to chrome.exe
    });

    // Load testing config
    const config = {
        httpPort:8091
    };

    // Load server instance
    const server = new AudioSourceServer(config);
    server.listen();

    // Start Test
    try {
        fs.mkdirSync('.test');
    } catch (e) {};

    const page = await browser.newPage();
    await page.goto('http://localhost:' + config.httpPort);
    await page.screenshot({path: './.test/example.png'});

    // Close Browser
    await browser.close();

    // Close Process
    process.exit();
})();