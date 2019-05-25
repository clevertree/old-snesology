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
    'audiosource-editor': [
        'audiosource/audiosource-editor.css',
        'audiosource/audiosource-editor-forms.js',
        'audiosource/audiosource-editor-grid.js',
        'audiosource/audiosource-editor-instruments.js',
        'audiosource/audiosource-editor-keyboard.js',
        'audiosource/audiosource-editor-menu.js',
        'audiosource/audiosource-editor-websocket.js',
        'audiosource/audiosource-editor-values.js',
        'audiosource/audiosource-renderer.js',
        'audiosource/audiosource-storage.js',
        'audiosource/audiosource-editor.element.js',
    ],
    'audiosource-player': [
        'audiosource/audiosource-renderer.js',
        'audiosource/audiosource-player.css',
        'audiosource/audiosource-player.element.js',
    ],
});