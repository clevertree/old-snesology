const express = require('express');
const path = require('path');
const redis = require("redis");
let app;

// Init
module.exports = function(appInstance, router) {
    app = appInstance;
    const BASE_URL = path.dirname(__dirname);

    // Serve Website Files
    router.use('/', express.static(BASE_URL));

    // Web Socket
    router.ws('*', handleWebSocketRequest);

    app.addWebSocketEventListener = addWebSocketEventListener;
};

const webSocketEventListeners = [];
function addWebSocketEventListener(type, callback) {
    webSocketEventListeners.push([type, callback]);
}

function handleWebSocketRequest(ws, req) {
    console.info("WS connection: ", req.headers["user-agent"]);
    ws.on('message', function(msg) {
        ws.send("ECHO " + msg);

        if(msg[0] === '{') {
            const json = JSON.parse(msg);
            if(typeof json.type === "undefined") {
                console.error("JSON Message did not contain a type parameter", json);
            } else {
                for(let i=0; i<webSocketEventListeners.length; i++) {
                    const listener = webSocketEventListeners[i];
                    if(listener[0] === json.type) {
                        listener[1](json, ws, req);
                    } else {
                        console.error("Unhandled JSON message type: " + json.type, json);
                    }
                }
            }
        } else {
            console.error("Unhandled message: ", msg);
        }
    });
}

