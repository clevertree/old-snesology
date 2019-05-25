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
    'audio-source-editor': [
        'audio-source/audio-source-editor.css',
        'audio-source/audio-source-editor-forms.js',
        'audio-source/audio-source-editor-grid.js',
        'audio-source/audio-source-editor-instruments.js',
        'audio-source/audio-source-editor-keyboard.js',
        'audio-source/audio-source-editor-menu.js',
        'audio-source/audio-source-editor-websocket.js',
        'audio-source/audio-source-editor-values.js',
        'audio-source/audio-source-renderer.js',
        'audio-source/audio-source-storage.js',
        'audio-source/audio-source-libraries.js',
        'audio-source/audio-source-editor.element.js',
    ],
    'audio-source-player': [
        'audio-source/audio-source-renderer.js',
        'audio-source/audio-source-player.css',
        'audio-source/audio-source-player.element.js',
    ],
});