const fs = require('fs');
const path = require('path');
const url = require('url');

const BASE_URL = path.dirname(__dirname);

// Init
let app;
module.exports = function(appInstance, router) {
    app = appInstance;
    // API Routes
    router.post('/song/*', httpSongsRequest);

    app.addWebSocketListener(handleWebSocketRequest);
};

// API Routes
function httpSongsRequest(req, res) {
    const songPath = BASE_URL + req.path;

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

function handleHistoryWebSocketEvent(jsonRequest, ws, req) {
    const db = app.redisClient;
    const songPath = url.parse(jsonRequest.path).pathname;
    const keyPath = db.DB_PREFIX + songPath + ":history";


    if(!historyListeners.hasOwnProperty(songPath))
        historyListeners[songPath] = [];
    const listeners = historyListeners[songPath];

    const historyType = jsonRequest.type.split(':')[1];
    switch(historyType) {
        case 'entry':
            db.lindex(keyPath, -1, function(err, result) {
                if(err)
                    throw new Error(err);

                // Check for step increment
                const oldJSONEntry = JSON.parse(result);
                if(!oldJSONEntry || jsonRequest.historyAction.step === oldJSONEntry.step + 1) {
                    // Step is incremented as expected
                    db.rpush(keyPath, JSON.stringify(jsonRequest.historyAction));

                    for(let i=0; i<listeners.length; i++) {
                        const listener = listeners[i];
                        if(listener === ws)
                            continue;
                        if(!isActive(listener))
                            continue;
                        listener.send(JSON.stringify({
                            type: 'history:entry',
                            historyActions: [jsonRequest.historyAction]
                        }));
                    }
                } else if(jsonRequest.historyAction.step < oldJSONEntry.step + 1) {
                    // Step is out of date
                    throw new Error("Step is out of date");
                } else {
                    // Step is in the future
                    throw new Error("Step is in the future");
                }
            });
            break;

        case 'register':
            if(listeners.indexOf(ws) !== -1)
                return ws.send(JSON.stringify({
                    type: 'error',
                    message: "Websocket is already registered to " + songPath
                }));

            listeners.push(ws);

            db.lrange(keyPath, 0, -1, function(err, resultList) {
                if(err)
                    throw new Error(err);

                const songContent = fs.existsSync(songPath)
                    ? JSON.parse(fs.readFileSync(songPath, 'utf8'))
                    : generateDefaultSong();
                const historyActions = [{
                    action: 'reset',
                    songContent: songContent
                }];
                for(let i=0; i<resultList.length; i++)
                    historyActions.push(JSON.parse(resultList[i]));

                ws.send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: historyActions
                }));
            });
            break;
    }
}

function generateDefaultSong() {
    const uuidv4 = require('uuid/v4');
    const UUID = uuidv4(); // -> '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
    return {
        "name": "New Song",
        "sourceURL": "https://snesology.net/song/share/" + UUID + ".json",
        "version": "v0.0.1",
        "description": "New Song",
        "instruments": [],
        "instructions": {
            "root": []
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

function handleWebSocketRequest(ws, req) {
    ws.on('message', function(msg) {
        if (msg[0] === '{') {
            const json = JSON.parse(msg);
            if (typeof json.type !== "undefined") {
                if (json.type.indexOf('history:') === 0) {
                    handleHistoryWebSocketEvent(json, ws, req);
                }
            }
        }
    });
}

