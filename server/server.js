const express = require('express');
const path = require('path');
// const redis = require("redis");
let app;

// Init
module.exports = function(appInstance, router) {
    app = appInstance;
    const BASE_URL = path.dirname(__dirname);

    // Serve Website Files
    router.use('/', express.static(BASE_URL));

    // Web Socket
    router.ws('*', handleWebSocketRequest);

    app.addWebSocketListener = addWebSocketListener;
};

const webSocketListeners = [];
function addWebSocketListener(callback) {
    webSocketListeners.push(callback);
}

function handleWebSocketRequest(ws, req) {
    console.info("WS connection: ", req.headers["user-agent"]);
    for(let i=0; i<webSocketListeners.length; i++) {
        const listener = webSocketListeners[i];
        listener(ws, req);
    }
}

