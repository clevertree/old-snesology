const fs = require('fs');
const path = require('path');
const url = require('url');

const BASE_URL = path.dirname(__dirname);

// Init
let app;
module.exports = function(appInstance, router) {
    app = appInstance;
    // API Routes
    // router.post('/song/*', httpSongsRequest);

    // app.addWebSocketListener(handleWebSocketRequest);
};
