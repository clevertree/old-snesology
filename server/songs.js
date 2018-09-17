const fs = require('fs');
const path = require('path');
const url = require('url');

const BASE_URL = path.dirname(__dirname);

// Init
let app;
module.exports = function(appInstance, router) {
    app = appInstance;
    // API Routes
    router.post('/songs/*', httpSongsRequest);

    app.addWebSocketEventListener('history:*', handleHistoryWebSocketEvent);
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

var historyListeners = {};
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
                const oldJSONEntry = JSON.parse(result);
                db.rpush(keyPath, JSON.stringify(jsonRequest));
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
                const historyActions = [];
                for(let i=0; i<resultList.length; i++) {
                    const jsonEntry = JSON.parse(resultList[i]); // TODO history step
                    historyActions.push(jsonEntry.historyAction);
                }
                ws.send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: historyActions
                }));
            });
            break;
    }


}