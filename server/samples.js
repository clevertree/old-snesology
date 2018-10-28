const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const {spawn, exec} = require('child_process');
const unzip = require('unzip');

// const soundfontParser = require("soundfont-parser");

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
let app;
module.exports = function(appInstance, router) {
    app = appInstance;

    buildSampleLibraries();
};


function buildSampleLibraries() {
    const compileList = app.config.compile.sf2Convert || [{
        url: "http://www.synthfont.com/SoundFonts/Chaos_V20.sfArk",
        path: "sample/3rdparty/chaos_v20/"
    }];

    for(var i=0; i<compileList.length; i++) {
        buildSoundfontLibrary(compileList[i].url, compileList[i].path);
    }
}

function buildSoundfontLibrary(sfURL, outputPath) {
    const tempFileDirectory = path.resolve(BASE_DIR + "/sample/temp/");
    let fileName = path.basename(url.parse(sfURL).pathname);
    let tempFilePath = path.resolve(tempFileDirectory + "/" + fileName);
    if(fs.existsSync(tempFilePath)) {
        processSoundFontLibrary();
    } else {
        var writeStream = fs.createWriteStream(tempFilePath);
        http.get(sfURL, function(response) {
            console.info(`Downloading ${sfURL}...`);
            response.pipe(writeStream);
            writeStream.on('finish', function() {
                writeStream.close(function() {
                    console.info(`Download finished: ${fileName}`);
                    processSoundFontLibrary()
                });  // close()

            });
        });
    }

    function processSoundFontLibrary() {
        console.info(`Processing: ${fileName}`);
        if(path.extname(tempFilePath).toLowerCase() === '.zip') {
            unzipSF(tempFilePath, function(unzippedFileName) {
                tempFilePath = unzippedFileName; // path.resolve(tempFileDirectory + "/" + fileName);
                fileName = path.basename(tempFilePath);
                extractSoundFontLibrary(function() {
                    console.log("TODO: build instrument - " + tempFilePath);
                });
            })
        } else if(path.extname(tempFilePath).toLowerCase() === '.sfark') {
            extractSFArk(function() {
                fileName = fileName.substr(0, fileName.length - 6).replace('_', ' ') + '.sf2';
                tempFilePath = path.resolve(tempFileDirectory + "/" + fileName);
                extractSoundFontLibrary(function() {
                    console.log("TODO: build instrument - " + tempFilePath);
                });
            })
        } else {
            extractSoundFontLibrary();
        }
    }

    function unzipSF(zippedFilePath, onFinished) {
        console.info(`Unzipping: ${zippedFilePath}`);
        let finished = false;

        fs.createReadStream(zippedFilePath)
            .pipe(unzip.Parse())
            .on('entry', function (entry) {
                var entryFileName = entry.path;
                if (path.extname(entryFileName).toLowerCase() === ".sf2") {
                    const unzippedFilePath = path.resolve(tempFileDirectory + "/" + entryFileName);
                    if(!finished) {
                        finished = true;
                        entry.pipe(fs.createWriteStream(unzippedFilePath))
                            .on('finish', function() {
                                onFinished(unzippedFilePath);
                            });
                    }
                } else {
                    entry.autodrain();
                }
            });

        // const child = exec(`unzip ${tempFilePath}`,
        //     {
        //         async: false,
        //         cwd: tempFileDirectory
        //     },
        //     function(code, stdout, stderr) {
        //         console.log("Exit code: " + code, stdout, stderr);
        //         onFinished();
        //     });
        // child.stdin.write("\x03");
    }

    function extractSFArk(onFinished) {
        console.info(`UnArking: ${fileName}`);
        const child = exec(`sfArkXTc.exe ${tempFilePath} /x`,
            {
                async: false,
                cwd: tempFileDirectory
            },
            function(code, stdout, stderr) {
                console.log("Exit code: " + code, stdout, stderr);
                onFinished();
            });
        child.stdin.write("\x03");
    }

    function extractSoundFontLibrary(onFinished) {
        console.info(`Extracting: ${fileName}`);
        const child = exec(`sf2comp.exe d "${tempFilePath}"`,
            {
                async: false,
                cwd: tempFileDirectory
            },
            function(code, stdout, stderr) {
                console.log("Exit code: " + code, stdout, stderr);
                onFinished();
            });
        // child.stdin.write("\x03");
    }
}

