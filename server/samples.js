const path = require('path');
const http = require('http');
const fs = require('fs');
const url = require('url');
const {spawn, exec} = require('child_process');
const unzip = require('unzip');
// const md5File = require('md5-file');
const { crc32 } = require('crc');

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

    // for(let i=0; i<compileList.length; i++) {
    //     buildSoundfontLibrary(compileList[i].url, compileList[i].path);
    // }
}

function buildSoundfontLibrary(sfURL, outputPath) {
    const tempFileDirectory = path.resolve(BASE_DIR + "/sample/temp/");
    let fileName = path.basename(url.parse(sfURL).pathname);
    let tempFilePath = path.resolve(tempFileDirectory + "/" + fileName);
    if(fs.existsSync(tempFilePath)) {
        extractSoundFontLibrary();
    } else {
        var writeStream = fs.createWriteStream(tempFilePath);
        http.get(sfURL, function(response) {
            console.info(`Downloading ${sfURL}...`);
            response.pipe(writeStream);
            writeStream.on('finish', function() {
                writeStream.close(function() {
                    console.info(`Download finished: ${fileName}`);
                    extractSoundFontLibrary()
                });  // close()

            });
        });
    }

    function extractSoundFontLibrary() {
        console.info(`Processing: ${fileName}`);
        if(path.extname(tempFilePath).toLowerCase() === '.zip') {
            unzipSF(tempFilePath, function(unzippedFileName) {
                tempFilePath = unzippedFileName; // path.resolve(tempFileDirectory + "/" + fileName);
                fileName = path.basename(tempFilePath);
                processSoundFontLibrary();
            })
        } else if(path.extname(tempFilePath).toLowerCase() === '.sfark') {
            extractSFArk(function() {
                fileName = fileName.substr(0, fileName.length - 6).replace('_', ' ') + '.sf2';
                tempFilePath = path.resolve(tempFileDirectory + "/" + fileName);
                processSoundFontLibrary();
            })
        } else {
            processSoundFontLibrary();
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

    function processSoundFontLibrary(onFinished) {
        console.info(`Extracting: ${fileName}`);
        const iniFilePath = tempFilePath.substr(0, tempFilePath.length - 4) + '.txt';
        const child = exec(`sf2comp.exe d "${tempFilePath}"`,
            {
                async: false,
                cwd: tempFileDirectory
            },
            function(code, stdout, stderr) {
                console.log("Exit code: " + code, stdout, stderr);
                onFinished && onFinished();

                console.log("TODO: build instrument - " + tempFilePath);

                readINIFile(iniFilePath, function(config) {
                    installInstruments(config);
                });

            });
        // child.stdin.write("\x03");
    }

    function readINIFile(iniFilePath, onFinished) {
        var lineReader = require('readline').createInterface({
            input: require('fs').createReadStream(iniFilePath)
        });

        const config = {
            samples:{},
            instruments:{}
        };
        let section = null;
        let currentSample = null;
        let currentInstrument = null;
        let currentInstrumentSample = null;

        lineReader.on('close', function () {
            onFinished(config);
        });

        lineReader.on('line', function (line) {
            // console.log(line);
            line = line.trim();
            switch(line) {
                case '[Info]':
                case '[Presets]':
                case '[Samples]':
                case '[Instruments]':
                    section = line;
                    return;
                case '':
                    return;
            }

            const pair = line.split('=', 2);
            const name = pair[0];
            const value = pair[1];
            switch(section) {
                case '[Samples]':
                    switch(name) {
                        case 'SampleName':
                            config.samples[value] = currentSample = {
                                // name: value
                            };
                            break;
                        case 'SampleRate': currentSample.rate = parseInt(value); break;
                        case 'Key': currentSample.key = calculateMIDIFrequency(value); break;
                        case 'FineTune': if(value !== "0") currentSample.fineTune = parseInt(value); break;
                        // case 'Type': currentSample.type = value; break;
                        // case 'Link': currentSample.link = value; break;
                    }

                    break;

                case '[Instruments]':
                    switch(name) {
                        case 'InstrumentName':
                            config.instruments[value] = currentInstrument = {
                                // name: value,
                                samples: {}
                            };
                            break;
                        case 'Sample':
                            currentInstrument.samples[value] = currentInstrumentSample = {
                                // name: value
                            };
                            break;

                        case 'Z_LowKey': if(value !== "0") currentInstrumentSample.lowKey = calculateMIDIFrequency(value); break;
                        case 'Z_HighKey': if(value !== "127") currentInstrumentSample.highKey = calculateMIDIFrequency(value); break;
                        case 'Z_LowVelocity': if(value !== "0") currentInstrumentSample.lowVelocity = parseInt(value) / 128; break;
                        case 'Z_HighVelocity': if(value !== "127") currentInstrumentSample.highVelocity = parseInt(value) / 128; break;
                        case 'Z_pan': if(value !== "0") currentInstrumentSample.pan = (32768 - parseInt(value)) / 32768; break;
                        // case 'Z_releaseVolEnv': if(value !== "0") currentInstrumentSample.releaseVolEnv = parseInt(value); break;
                        case 'Z_fineTune': if(value !== "0") currentInstrumentSample.fineTune = parseInt(value); break;
                    }

                    break;
            }
        });

    }

    function installInstruments(config) {
        console.log("Installing Sound font buffers: \n", config.samples);

        // Install buffers
        Object.keys(config.samples).forEach((key, i) => {
            const sample = config.samples[key];
            const samplePath = path.resolve(tempFileDirectory + '/' + key + '.wav');
            if(!fs.existsSync(samplePath))
                return console.error("Sample file does not exist: " + samplePath);
            sample.crc32 = crc32(fs.readFileSync(samplePath)).toString(16);
            // sample.md5 = md5File.sync(samplePath);
            console.log("Sample installed: " + key + " => " + sample.crc32);
        });

        console.log("Installing Sound font instruments: \n", config.instruments);
        // Install instruments
    }
}

function calculateMIDIFrequency(number) {
    number = parseInt(number);
    const freqs = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(number / 12) - 1;
    const freq = freqs[number % 12];
    return freq + octave;
}