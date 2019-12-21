// const libarchivejs = require('libarchive.js');
const fs = require('fs')
const path = require('path');
const baseDir = path.dirname(__dirname);

const puppeteer = require('puppeteer');
const torrentID = "005ff6b3e47f34ad254b301481561d3145187467";

// torrent://005ff6b3e47f34ad254b301481561d3145187467/snes/game/xrdn.7z/
let masterLibraryJSON;
try {
    masterLibraryJSON = JSON.parse(fs.readFileSync(baseDir + '/songs/snes/index.pl.json'));
} catch (e) {
}

masterLibraryJSON = masterLibraryJSON || {
    "name": "Super Nintendo OST Playlists",
    "urlPrefix": "game/",
    "playlist": []
};


(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:8091/player.html');
    // var contentHtml = fs.readFileSync('index.html', 'utf8');
    // await page. setContent(contentHtml);
    // await page.screenshot({path: 'example.png'});
    page.on('console', msg => {
        console.log('console: ' + msg._text);
    });

    page.exposeFunction('processArchive', processArchive);
    page.exposeFunction('getTorrentID', () => torrentID);
    page.exposeFunction('getMasterLibraryJSON', () => masterLibraryJSON);

    let data = await page.evaluate(process);
    // await writeLibraryToFile();
    console.log("Finished: ", data);


    // await new Promise((resolve) => {
    //     setTimeout(resolve, 5000);
    // });


    await browser.close();
})();


async function process() {
    const {LibGMESupport} = require('../common/support/libgme-support.js');
    const {SPCSupport} = require('../common/support/spc-support.js');
    const {AudioSourceFileService} = require('../common/audio-source-file-service.js');
    const fs = new AudioSourceFileService();

    const masterLibraryJSON = await getMasterLibraryJSON();
    const torrentID = await getTorrentID();

    let count = {error:0, total:0, success:0};
    const torrent = await fs.getTorrent(torrentID);
    const startPosition = masterLibraryJSON.playlist.length;
    console.log('startPosition', startPosition);
    for(let i=startPosition; i<torrent.files.length; i++) {
        count.total++;
        const archiveFile = torrent.files[i];
        console.info("Processing Archive ", archiveFile.path);
        try {
            const buffer = await new Promise((resolve, reject) => {
                archiveFile.getBuffer(function(err, buffer) {
                    if(err) throw new Error(err);
                    resolve(buffer);
                });
            });
            const archive = await fs.decompress7ZipArchive(buffer);
            // throw new Error("WTF");
            const archiveData = {path: archiveFile.path, songs:[]};
            for(let j=0; j<archive.length; j++) {
                const spcFile = archive[j];
                if(!spcFile.path.endsWith('.spc'))
                    continue;
                console.info("Processing ", spcFile.path);
                const absSPCPath = 'torrent://' + torrentID + '/' + archiveFile.path + spcFile.path;

                const libGMESupport = new LibGMESupport();
                const spcPlayer = libGMESupport.loadSPCPlayerFromBuffer(spcFile.data, 'file');

                const spcSupport = new SPCSupport();
                const spcPlayer2 = spcSupport.loadSPCPlayerFromBuffer(spcFile.data.buffer);

                const songData = spcSupport.loadSongDataFromPlayer(spcPlayer2, absSPCPath);
                archiveData.songs.push([songData, spcPlayer2.state.id666, spcPlayer2._songInfo, spcFile.path]);
                // archiveFile.data = btoa(String.fromCharCode.apply(null, archiveFile.data));
            }
            await processArchive(archiveData);
            count.success++;
        } catch (e) {
            count.error++;
            console.error("Failed to process: " + archiveFile.path, e);
        }
    }
    if(count.error)
        console.error(count.error + " archives failed to process");
    console.log(count.success + " archives processed successfully");

    return torrent.files.length;




    async function requireAsync(relativeScriptPath) {
        if(typeof require !== "undefined")
            return require('../' + relativeScriptPath);

        let scriptElm = findScript(relativeScriptPath)[0];
        if(!scriptElm) {
            const scriptURL = findThisScript()[0].basePath + relativeScriptPath;
            scriptElm = document.createElement('script');
            scriptElm.src = scriptURL;
            scriptElm.promises = (scriptElm.promises || []).concat(new Promise(async (resolve, reject) => {
                scriptElm.onload = resolve;
                document.head.appendChild(scriptElm);
            }));
        }
        for (let i=0; i<scriptElm.promises.length; i++)
            await scriptElm.promises[i];
        return scriptElm.exports
            || (() => { throw new Error("Script module has no exports: " + relativeScriptPath); })()
    }


}

async function processArchive(archiveInfo) {
    const firstSong = archiveInfo.songs[0][0];
    // const spcURL = 'torrent://' + torrentID + '/' + archiveInfo.path + '/';

    const archiveName = archiveInfo.path.split('/').pop().replace('.7z', '');
    const libraryName = firstSong.game + ' OST';
    const libraryJSON = {
        "name": libraryName,
        "artist": firstSong.artist,
        "game": firstSong.game,
        "copyright": firstSong.copyright,
        "comment": firstSong.comment,
        "publisher": firstSong.publisher,
        "dumper": firstSong.dumper,
        "system": firstSong.system,
        // "urlPrefix": "torrent://005ff6b3e47f34ad254b301481561d3145187467/snes/game/xrdn.7z/",
        // "urlPrefix": spcURL,
        "playlist": []
    };
    for(const key in libraryJSON) {
        if(libraryJSON.hasOwnProperty(key)) {
            if(!libraryJSON[key])
                delete libraryJSON[key];
        }
    }

    const archivePath = `${baseDir}/songs/snes/game/${archiveName}/index.pl.json`;
    try {fs.mkdirSync(`${baseDir}/songs/`);} catch(e) { }
    try {fs.mkdirSync(`${baseDir}/songs/snes/`);} catch(e) { }
    try {fs.mkdirSync(`${baseDir}/songs/snes/game/`);} catch(e) { }
    try {fs.mkdirSync(`${baseDir}/songs/snes/game/${archiveName}/`);} catch(e) {  }


    let playlistLength = 0;
    for(let i=0; i<archiveInfo.songs.length; i++) {
        const [songData, id666, id6662, spcPath] = archiveInfo.songs[i];
        // const spcURL = songData.instruments[0].spcURL;
        const spcName = spcPath.split('/').pop(); // file.path.replace(/^\/+/, '');
        const songJSONName = spcName.replace('.spc', '.json');
        const songJSONPath = `${baseDir}/songs/snes/game/${archiveName}/${songJSONName}`;
        let songName = songData.name; // .game + ' - ' + (file.id666.name);
        songName = songName.replace(';', ',');
        let songLength = id666.length + (id666.fade ? ':' + id666.fade : '');
        if(typeof id666.length === "number")
            playlistLength += id666.length;
        let entry = `${songJSONName};${songName};${songLength}`;
        libraryJSON.playlist.push(entry);

        console.info("Writing song: " + songJSONPath);
        fs.writeFileSync(songJSONPath, JSON.stringify(songData, null, "\t"));
    }

    console.info("Writing library: " + archivePath);
    fs.writeFileSync(`${baseDir}/songs/snes/game/${archiveName}/index.pl.json`, JSON.stringify(libraryJSON, null, "\t"));

    let playlistEntry = `${archiveName}/index.pl.json;${libraryName};${playlistLength}`;
    masterLibraryJSON.playlist.push(playlistEntry);
    masterLibraryJSON.playlist = masterLibraryJSON.playlist.filter((v, i, a) => a.indexOf(v) === i);
    masterLibraryJSON.playlist.sort();

    fs.writeFileSync(`${baseDir}/songs/snes/index.pl.json`,     JSON.stringify(masterLibraryJSON, null, "\t"));
}


