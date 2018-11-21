const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');

const BASE_DIR = path.resolve(path.dirname(__dirname));

// Init
module.exports = function(app) {
    app.songServer = new SongServer(app);
};

class SongServer {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.historyListeners = {};

        // API Routes
        const router = express.Router(null);

        // router.post('/song/*', this.httpSongsRequest.bind(this)); // Update songData files
        router.get('/edit/:uuid([\\w/-]+)', this.httpEditRequest.bind(this)); // Render Editor
        router.get('/play/:uuid([\\w/-]+)', this.httpPlayRequest.bind(this)); // Render Editor

        router.ws('/editor', this.handleWSRequest.bind(this));
        app.use('/', router);        // Register Routes

        // app.addWebSocketListener(handleWebSocketRequest);
    }

    httpEditRequest(req, res) {

        let uuid = req.query.uuid;
        if(typeof req.query.uuid === 'undefined') {
            const uuidv4 = require('uuid/v4');
            uuid = uuidv4();
            return res.redirect('/edit/' + uuid);
        }

        fs.readFile(BASE_DIR + "/editor.html", 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            var result = data.replace(/\${uuid}/g, uuid);
            res.set('Content-Type', 'text/html');
            res.send(result);
        });

    }
    httpPlayRequest(req, res) {
        const songPath = '/song/' + req.params.path + '.json';
        const absolutePath = path.resolve(BASE_DIR + '/' + songPath);

        console.log("Render player: ", absolutePath);
    }


    getListeners(uuid) {
        if(!this.historyListeners.hasOwnProperty(uuid))
            this.historyListeners[uuid] = [];
        return this.historyListeners[uuid];
    }


    handleWSRequest(ws, req) {

        ws.on('message', (msg) => {
            try {
                if (msg[0] === '{') {
                    const jsonRequest = JSON.parse(msg);
                    if(!jsonRequest.type)
                        throw new Error("Missing 'type' field");

                    switch(jsonRequest.type) {
                        case 'history:register':
                            this.handleWSRegisterEntry(ws, req, jsonRequest);
                            break;

                        case 'history:entry':
                            this.handleWSHistoryEntry(ws, req, jsonRequest);
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
                } else {
                    throw new Error("Invalid JSON");
                }
            } catch (e) {
                return this.sendError(ws, e);
            }
        });
    }

    handleWSRegisterEntry(ws, req, jsonRequest) {
        if(!jsonRequest.uuid)
            throw new Error("Invalid uuid parameter");
        const uuid = jsonRequest.uuid.toLowerCase();
        // if(!songPath.endsWith('.json'))
        //     songPath += '.json';

        const registerListeners = this.getListeners(uuid);
        if(registerListeners.indexOf(ws) !== -1)
            throw new Error("Websocket is already registered to " + uuid);

        registerListeners.push(ws);

        // Send history
        this.getOrCreateSongEntry(uuid, (songEntry) => {
            // Send Song Revision
            this.sendSongRevision(ws, songEntry.uuid);
        })
    }

    handleWSHistoryEntry(ws, req, jsonRequest) {
        if(!jsonRequest.uuid)
            throw new Error("Invalid uuid parameter");
        const uuid = jsonRequest.uuid.toLowerCase();

        this.getSongEntry(uuid, (songEntry) => {

            let lastStep = songEntry[0] ? songEntry[0].last_step : null;

            if(lastStep !== null) {
                for (let i = 0; i < jsonRequest.historyActions.length; i++) {
                    const historyAction = jsonRequest.historyActions[i];
                    if (historyAction.step === lastStep + 1) {
                        lastStep++;
                        // Step is incremented as expected
                        // console.info(`History Entry (${jsonRequest.historyAction.step}): ${entryKeyPath}`);

                    } else if (historyAction.step < lastStep + 1) {
                        // Step is out of date
                        this.sendError(ws, `Step is out of date: ${historyAction.step} < ${lastStep} + 1`);

                    } else {
                        // Step is in the future
                        this.sendError(ws, `Step is in the future: ${historyAction.step} > ${lastStep} + 1`);
                    }
                }
            }

            for (let i = 0; i < jsonRequest.historyActions.length; i++) {
                const historyAction = jsonRequest.historyActions[i];
                const step = historyAction.step;
                delete historyAction.step;
                let SQL = `INSERT INTO song_history 
                            SET step = ?, action = ?, song_id = (SELECT s.id FROM song s WHERE s.uuid = ?)`;
                this.db.query(SQL,
                    [step, JSON.stringify(historyAction), uuid],
                    (error, results, fields) => {
                        if (error)
                            throw error;
                    });
            }

            const entryListeners = this.getListeners(uuid);
            for (let i = 0; i < entryListeners.length; i++) {
                const listener = entryListeners[i];
                if (listener === ws)
                    continue;
                if (!this.isActive(listener))
                    continue;
                listener.send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: [jsonRequest.historyActions]
                }));
            }
        });

    }

    sendError(ws, err) {
        ws.send(JSON.stringify({
            type: "error",
            message: err.message || err,
            stack: err.stack
        }));
        console.error("WS:", err);
    }

    querySongHistory(songUUID, callback) {
        let SQL = `SELECT *
                    FROM song_history sh
                    LEFT JOIN song s on s.id = sh.song_id
                    WHERE s.uuid = ?
                    ORDER BY sh.step ASC`;
        this.db.query(SQL, [songUUID], (error, songHistoryResults, fields) => {
            if (error)
                throw error;
            callback(songHistoryResults);
        });
    }

    getSongEntry(uuid, callback) {
        let SQL = `
          SELECT s.*,
                 (SELECT sh.step from song_history sh WHERE sh.song_id = s.id ORDER BY sh.step DESC LIMIT 1) as last_step
          FROM song s
          WHERE s.uuid = ?`;
        this.db.query(SQL, [uuid], (error, songResults, fields) => {
            if (error)
                throw error;
            callback(songResults[0]);
        });
    }


    getSongContent(uuid, callback) {
        let SQL = `
    SELECT s.*, 
           (SELECT sh.step from song_history sh WHERE sh.song_id = s.id ORDER BY sh.step DESC LIMIT 1) as last_step,
           (SELECT sc.content from song_content sc WHERE sc.song_id = s.id and sh.type = 'published' ORDER BY sh.id DESC LIMIT 1) as content_published,
           (SELECT sc.content from song_content sc WHERE sc.song_id = s.id and sh.type = 'live' ORDER BY sh.id DESC LIMIT 1) as content_live
    FROM song s              
    WHERE s.uuid = ?`;
        this.db.query(SQL, [uuid], (error, songResults, fields) => {
            if (error)
                throw error;
            callback(songResults[0]);
        });
    }

    getOrCreateSongEntry(songUUID, callback) {
        this.getSongEntry(songUUID, (songEntry) => {
            if(songEntry) {
                callback(songEntry);
            } else {
                let SQL = `INSERT INTO song
                            SET uuid = ?`;
                this.db.query(SQL, [songUUID], (error, insertResults, fields) => {
                    if (error)
                        throw error;
                    this.getSongEntry(songUUID, callback);
                });
            }
        });
    }

    sendSongRevision(ws, songUUID) {
        let SQL = `SELECT sc.* FROM song_content sc
                    LEFT JOIN song s on s.id = sc.song_id
                    WHERE s.uuid = ?
                    ORDER BY sc.step ASC LIMIT 1`;
        this.db.query(SQL, [songUUID], (error, songContentResults, fields) => {
            if (error)
                throw error;

            if(songContentResults.length > 0) {
                ws.send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: [{
                        action: 'reset',
                        data: JSON.parse(songContentResults[0].content),
                        step: songContentResults[0].step
                    }]
                }));
            } else {
                const songContent = this.generateDefaultSong(songUUID);
                ws.send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: [{
                        action: 'reset',
                        data: songContent,
                        step: 0
                    }]
                }));
            }

        });
    }

    sendSongHistory(songUUID, ws) {
        const songContent = this.generateDefaultSong(songUUID);

        let SQL = `SELECT sh.* FROM song_history sh
                    LEFT JOIN song s on s.id = sh.song_id 
                    WHERE s.uuid = ? 
                    ORDER BY sh.step ASC`;
        this.db.query(SQL, [songUUID], (error, songHistoryResults, fields) => {
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

    generateDefaultSong(uuid) {
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

    isActive(listener) {
        if (listener.readyState === listener.OPEN)
            return true;

        // TODO: inefficient
        for(const historyKey in this.historyListeners) {
            if(this.historyListeners.hasOwnProperty(historyKey)) {
                const listeners = this.historyListeners[historyKey];
                const pos = listeners.indexOf(listener);
                if(pos !== -1) {
                    listeners.splice(pos, 1);
                    console.info("Removed closed listener from history key: " + historyKey);
                }
            }
        }
        return false;
    }
}


// httpSongsRequest(req, res) {
//     const songPath = path.resolve(BASE_DIR + '/song/' + req.params.path + '.json');
//
//     // const newSongBody = JSON.stringify(req.body);
//     const oldSongBody = fs.readFileSync(songPath, 'utf8');
//
//     const oldSongJSON = JSON.parse(oldSongBody);
//     if(!req.body.version)
//         return res.status(500).json({message:"Missing version", status: false});
//     if(oldSongJSON.version && req.body.version - 1 !== oldSongJSON.version)
//         return res.status(500).json({message:"New version must be +1 old version (" + req.body.version + "+1 !== " + oldSongJSON.version + ")", status: false});
//
//     const newSongJSON = JSON.parse(oldSongBody);
//     newSongJSON.version = (oldSongJSON.version||0) + 1;
//     if(req.body.name) newSongJSON.name = req.body.name;
//     if(req.body.versionString) newSongJSON.versionString = req.body.versionString;
//     if(req.body.description) newSongJSON.description = req.body.description;
//     if(req.body.instruments) newSongJSON.instruments = req.body.instruments;
//     if(req.body.instructions) newSongJSON.instructions = req.body.instructions;
//
//     const newSongBody = JSON.stringify(newSongJSON, null, "\t");
//
//     let response;
//     if(newSongBody === oldSongBody)
//         return res.status(500).json({message:"No changes detected", status: false});
//
//     // Write the file
//     fs.writeFileSync(songPath, newSongBody);
//
//
//     response = {message: "Song file has been updated", status: true};
//     return res.json(response);
// }