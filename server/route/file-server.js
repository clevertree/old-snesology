const path = require('path');
const express = require('express');

// Init
module.exports = function(app) {
    app.songServer = new FileServer(app);
};

class FileServer {
    constructor(app) {


        // Init Routes
        // const router = express.Router(null);

        const BASE_DIR = path.dirname(path.dirname(__dirname));
        app.use('/', express.static(BASE_DIR));

        // app.use('/', router);        // Register Routes


        // Access control
        app.use(function (req, res, next) {
            res.header('Access-Control-Allow-Origin', '*');
            return next();
        });
    }
}