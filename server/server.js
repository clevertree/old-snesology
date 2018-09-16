const express = require('express');
const path = require('path');

// Init
module.exports = function(app, router) {
    const BASE_URL = path.dirname(__dirname);

    // Serve Website Files
    router.use('/', express.static(BASE_URL));

    // Web Socket
    router.ws('*', handleWebSocketRequest);
};

function handleWebSocketRequest(ws, req) {
    console.info("WS connection: ", req.headers["user-agent"]);
    ws.on('message', function(msg) {
        ws.send("ECHO " + msg);

        if(msg[0] === '{') {
            const json = JSON.parse(msg);
            if(typeof json.type === "undefined") {
                console.error("JSON Message did not contain a type parameter", json);
            } else {
                switch(json.type) {
                    case 'history':
                        handleHistoryAction(ws, json);
                        break;

                    default:
                        console.error("Unhandled JSON message type: " + json.type, json);
                        break;
                }
            }
        } else {
            console.error("Unhandled message: ", msg);
        }
    });
}

function handleHistoryAction(ws, json) {

}