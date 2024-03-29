let puppeteer;
try {
    puppeteer = require('puppeteer');
}
catch (e) {
    console.log(e.message, 'using puppeteer-core...');
    puppeteer = require('puppeteer-core');
}

const fs = require('fs');

const {AudioSourceServer} = require('./audio-source/server/audio-source-server');


(async () => {
    const browser = await puppeteer.launch({
        // executablePath: "chrome"
        // executablePath: '/opt/google/chrome/chrome' // Your local path to chrome.exe
    });

    // Load testing config
    const config = {
        httpPort:8092
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