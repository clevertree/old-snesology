const path = require('path');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const BASE_URL = path.dirname(__dirname);

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Start
app.listen(8080, () => console.log('Snesology listening on port 8080!'));
app.listen(80, () => console.log('Snesology listening on port 80!'));




// ROUTES FOR OUR API
// =============================================================================
const router = express.Router(null);              // get an instance of the express Router

// Serve Website Files
router.use('/', express.static(BASE_URL));

// API Routes
router.get('/git', require('./git.js'));
router.post('/songs/*', require('./songs.js'));

// Register Routes
app.use('/', router);
