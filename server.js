// const path = require('path');
const express = require('express');
const expressWS = require('express-ws');
const clevertreeCMS = require('clevertree-cms');

const app = express();
this.app = app;
app.baseServer = this;
expressWS(app);

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(bodyParser.json());

// Add Your App
app.use(express.static(__dirname));

// // Config
// const config = {
//     database: {
//         // host: 'localhost',
//         // user: 'cms_user',
//         // password: 'cms_pass',
//         database: 'snesology_cms'
//     },
//     server: {
//         httpPort: 8092,
//         sslEnable: false
//         // sslPort: 8443,
//     },
//     mail: {
//         client: {
//             auth: {
//                 user: "mail@ffga.me",
//                 pass: "mailmail"
//             },
//             host: "mail.ffga.me",
//             port: 587
//         }
//     }
// };

// Load .config.json via HTTPServer
const httpServer = new clevertreeCMS.HTTPServer();

// Add CMS middleware
app.use(httpServer.getMiddleware());

// Launch your server
app.listen(httpServer.serverConfig.httpPort, function() {
    console.log('Example app listening on port: ' + httpServer.serverConfig.httpPort);
});

// Add Custom Element Sources
clevertreeCMS.ContentRenderer.addGlobalElementSources({
    'song-editor': [
        'song/song-editor.css',
        'song/song-editor-forms.js',
        'song/song-editor-grid.js',
        'song/song-editor-instruments.js',
        'song/song-editor-keyboard.js',
        'song/song-editor-menu.js',
        'song/song-editor-websocket.js',
        'song/song-renderer.js',
        'song/song-editor.element.js',
    ],
    'song-player': [
        'song/song-renderer.js',
        'song/song-player.css',
        'song/song-player.element.js',
    ],
});