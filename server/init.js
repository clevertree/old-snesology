const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.songs = require('./songs.js');
app.git = require('./git.js');
app.server = require('./server.js');
const BASE_URL = path.dirname(__dirname);

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var expressWs = require('express-ws')(app);





// ROUTES
const router = express.Router(null);              // get an instance of the express Router

// Serve Website Files
router.use('/', express.static(BASE_URL));

// API Routes
router.get('/git', app.git.httpRequest);
router.post('/songs/*', app.songs.httpRequest);

// Web Socket
router.ws('*', app.server.webSocketRequest);

// Register Routes
app.use('/', router);

// Start
app.listen(8080, () => console.log('Snesology listening on port 8080!'));
app.listen(80, () => console.log('Snesology listening on port 80!'));




app.use(function (req, res, next) {
    console.log('middleware');
    // req.testing = 'testing';
    return next();
});