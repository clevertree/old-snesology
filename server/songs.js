const fs = require('fs');
const path = require('path');
const url = require('url');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
let app;
module.exports = function(appInstance, router) {
    app = appInstance;
    // API Routes
    router.post('/song/*', httpSongsRequest); // Update songData files

    // No periods allowed in path!
    router.get('/editor/?', httpEditRequest); // Render Editor
    router.get('/song/:path([\\w/-]+).json/edit', httpEditRequest); // Render Editor
    router.get('/song/:path([\\w/-]+)/edit', httpEditRequest); // Render Editor
    router.get('/song/:path([\\w/-]+).json/play', httpPlayRequest); // Render Editor
    router.get('/song/:path([\\w/-]+)/play', httpPlayRequest); // Render Editor
    router.get('/song/:path([\\w/-]+)', httpPlayRequest); // Render Editor

    // router.ws('/song/:path([\\w/-]+).json', handleWSRequest);
    router.ws('/song/:uuid([\\w/-]+)', handleWSRequest);

    // app.addWebSocketListener(handleWebSocketRequest);
};

function httpEditRequest(req, res) {

    let songPath = req.query.src;
    if(typeof req.query.src === 'undefined') {
        const uuidv4 = require('uuid/v4');
        songPath = '/song/share/' + uuidv4() + '.json';
        return res.redirect('?src=' + songPath);
    }
    if(!songPath.endsWith('.json'))
        songPath += '.json';
    const absolutePath = path.resolve(BASE_DIR + '/' + songPath);
    const songsDir = path.resolve(BASE_DIR + '/songData');
    if(songsDir.indexOf(BASE_DIR) !== 0)
        throw new Error("Song path must exists within the songs directory");

    console.log("Render editor: ", absolutePath);
    // res.setHeader("content-type", "some/type");
    // fs.createReadStream(BASE_DIR + "/editor.html").pipe(res);

    fs.readFile(BASE_DIR + "/editor.html", 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        var result = data.replace(/\${src}/g, songPath);
        res.set('Content-Type', 'text/html');
        res.send(result);
    });

}
function httpPlayRequest(req, res) {
    const songPath = '/song/' + req.params.path + '.json';
    const absolutePath = path.resolve(BASE_DIR + '/' + songPath);

    console.log("Render player: ", absolutePath);
}

// API Routes
function httpSongsRequest(req, res) {
    const songPath = path.resolve(BASE_DIR + '/song/' + req.params.path + '.json');

    // const newSongBody = JSON.stringify(req.body);
    const oldSongBody = fs.readFileSync(songPath, 'utf8');

    const oldSongJSON = JSON.parse(oldSongBody);
    if(!req.body.version)
        return res.status(500).json({message:"Missing version", status: false});
    if(oldSongJSON.version && req.body.version - 1 !== oldSongJSON.version)
        return res.status(500).json({message:"New version must be +1 old version (" + req.body.version + "+1 !== " + oldSongJSON.version + ")", status: false});

    const newSongJSON = JSON.parse(oldSongBody);
    newSongJSON.version = (oldSongJSON.version||0) + 1;
    if(req.body.name) newSongJSON.name = req.body.name;
    if(req.body.versionString) newSongJSON.versionString = req.body.versionString;
    if(req.body.description) newSongJSON.description = req.body.description;
    if(req.body.instruments) newSongJSON.instruments = req.body.instruments;
    if(req.body.instructions) newSongJSON.instructions = req.body.instructions;

    const newSongBody = JSON.stringify(newSongJSON, null, "\t");

    let response;
    if(newSongBody === oldSongBody)
        return res.status(500).json({message:"No changes detected", status: false});

    // Write the file
    fs.writeFileSync(songPath, newSongBody);


    response = {message: "Song file has been updated", status: true};
    return res.json(response);
}

const historyListeners = {};
function getListeners(uuid) {
    if(!historyListeners.hasOwnProperty(uuid))
        historyListeners[uuid] = [];
    return historyListeners[uuid];
}


function handleWSRequest(ws, req) {
    if(!req.params.uuid)
        throw new Error("Invalid uuid parameter");
    const uuid = req.params.uuid.toLowerCase();
    // if(!songPath.endsWith('.json'))
    //     songPath += '.json';

    const registerListeners = getListeners(uuid);
    if(registerListeners.indexOf(ws) !== -1)
        throw new Error("Websocket is already registered to " + uuid);

    registerListeners.push(ws);

    ws.on('message', function(msg) {
        try {
            if (msg[0] === '{') {
                const jsonRequest = JSON.parse(msg);
                switch(jsonRequest.type) {
                    case 'history:entry':
                        handleWSHistoryEntry(ws, req, jsonRequest, uuid);
                        break;
                    case 'error':
                    case 'info':
                    case 'warn':
                    case 'log':
                        console[jsonRequest.type]("WS " + jsonRequest.type + ": " + jsonRequest.message, jsonRequest.stack);
                        break;
                    default:
                        console.error("Invalid JSON Message Type: " + jsonRequest.type);
                        break;
                }

            }
        } catch (e) {
            return sendError(ws, e);
        }
    });

    createMissingSongEntry(uuid, () => {
        // Send history
        sendSongRevision(uuid, ws);

    })
}

function sendError(ws, err) {
    ws.send(JSON.stringify({
        type: "error",
        message: err.message || err,
        stack: err.stack
    }));
    // Step is out of date
    console.error("WS:", err);
}

function handleWSHistoryEntry(ws, req, jsonRequest, songUUID) {
    const db = app.mysqlClient;
    if(!jsonRequest.type)
        throw new Error("Missing 'type' field");

    let SQL = `
SELECT * FROM song_history sh
LEFT JOIN song s on s.id = sh.song_id 
WHERE s.uuid = ? 
ORDER BY sh.step DESC
LIMIT 1`;
    db.query(SQL, [songUUID], (error, songHistoryResults, fields) => {
        if (error)
            throw error;
        // const lastEntryJSON = JSON.parse(results[0].action);

        let oldStep = songHistoryResults[0] ? songHistoryResults[0].step : null;

        if(oldStep !== null) {
            for (let i = 0; i < jsonRequest.historyActions.length; i++) {
                const historyAction = jsonRequest.historyActions[i];
                if (historyAction.step === oldStep + 1) {
                    oldStep++;
                    // Step is incremented as expected
                    // console.info(`History Entry (${jsonRequest.historyAction.step}): ${entryKeyPath}`);

                } else if (historyAction.step < oldStep + 1) {
                    // Step is out of date
                    sendError(ws, `Step is out of date: ${historyAction.step} < ${oldStep} + 1`);

                } else {
                    // Step is in the future
                    sendError(ws, `Step is in the future: ${historyAction.step} > ${oldStep} + 1`);
                }
            }
        }

        for (let i = 0; i < jsonRequest.historyActions.length; i++) {
            const historyAction = jsonRequest.historyActions[i];
            const step = historyAction.step;
            delete historyAction.step;
            let SQL = `
INSERT INTO song_history 
SET step = ?, action = ?, song_id = (SELECT s.id FROM song s WHERE s.uuid = ?)`;
            db.query(SQL,
                [step, JSON.stringify(historyAction), songUUID],
                (error, results, fields) => {
                if (error)
                    throw error;
            });
        }

        const entryListeners = getListeners(songUUID);
        for (let i = 0; i < entryListeners.length; i++) {
            const listener = entryListeners[i];
            if (listener === ws)
                continue;
            if (!isActive(listener))
                continue;
            listener.send(JSON.stringify({
                type: 'history:entry',
                historyActions: [jsonRequest.historyActions]
            }));
        }
    });
}

// function sendHistoricRecord(registerSongPath, ws) {
//     const db = app.mysqlClient;
//     let songContent = null;
//     if(!registerSongPath.startsWith('/song/'))
//         throw new Error("Registration path must start with '/song/'");
//     if(!registerSongPath.endsWith('.json'))
//         throw new Error("Registration path must end with '.json'");
//     if(fs.existsSync(registerSongPath))
//         songContent = JSON.parse(fs.readFileSync(registerSongPath, 'utf8'));
//     else
//         songContent = generateDefaultSong(registerSongPath);
//
//     const registerKeyPath = db.DB_PREFIX + registerSongPath + ":history";
//
//     db.lrange(registerKeyPath, 0, -1, function(err, resultList) {
//         if(err)
//             throw new Error(err);
//
//         const historyActions = [{
//             action: 'reset',
//             songContent: songContent
//         }];
//         for(let i=0; i<resultList.length; i++)
//             historyActions.push(JSON.parse(resultList[i]));
//
//         ws.send(JSON.stringify({
//             type: 'history:entry',
//             historyActions: historyActions
//         }));
//     });
// }

function createMissingSongEntry(songUUID, callback) {
    const db = app.mysqlClient;

    let SQL = `
SELECT s.* FROM song s
WHERE s.uuid = ?`;
    db.query(SQL, [songUUID], (error, songResults, fields) => {
        if (error)
            throw error;

        if(songResults.length > 0) {
            callback();
        } else {
            let SQL = `
INSERT INTO song
SET uuid = ?`;
            db.query(SQL, [songUUID], (error, songResults, fields) => {
                if (error)
                    throw error;
                callback();
            });
        }
    });
}

function sendSongRevision(songUUID, ws) {
    const db = app.mysqlClient;

    const songContent = generateDefaultSong(songUUID);

    let SQL = `
SELECT sh.* FROM song_history sh
LEFT JOIN song s on s.id = sh.song_id 
WHERE s.uuid = ? 
ORDER BY sh.step ASC`;
    db.query(SQL, [songUUID], (error, songHistoryResults, fields) => {
        if (error)
            throw error;

        const historyActions = [{
            action: 'reset',
            data: songContent,
            step: 0
        }];
        for(let i=0; i<songHistoryResults.length; i++) {
            const historyAction = JSON.parse(songHistoryResults[i].action);
            historyAction.step = songHistoryResults[i].step;
            historyActions.push(historyAction);
        }

        ws.send(JSON.stringify({
            type: 'history:entry',
            historyActions: historyActions
        }));
    });
}

function generateDefaultSong(uuid) {
    return {
        "name": "New Song",
        "uuid": uuid, // "https://snesology.net/song/share/" + UUID + ".json",
        "version": "v0.0.3",
        "description": "New Song",
        "instruments": [{
            "url": "/instrument/chiptune/snes/ffvi/instrument-ffvi.js", // Default instrument
            "urlDependencies": ["/instrument/audiosource/instrument-buffersource.js"], // Dependencies
        }],
        "instructions": {
            "root": [{
                command: '!pause',
                duration: 8
            }]
        }
    };
}

function isActive(listener) {
    if (listener.readyState === listener.OPEN)
        return true;

    // TODO: inefficient
    for(const historyKey in historyListeners) {
        if(historyListeners.hasOwnProperty(historyKey)) {
            const listeners = historyListeners[historyKey];
            const pos = listeners.indexOf(listener);
            if(pos !== -1) {
                listeners.splice(pos, 1);
                console.info("Removed closed listener from history key: " + historyKey);
            }
        }
    }
    return false;
}