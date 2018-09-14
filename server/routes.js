const path = require('path');
const express = require('express');

const BASE_URL = path.dirname(__dirname);


// ROUTES FOR OUR API
// =============================================================================
const router = express.Router(null);              // get an instance of the express Router
module.exports = router;


// Serve Website Files
router.use('/', express.static(BASE_URL));

// API Routes
router.get('/git', require('./git.js'));
router.post('/songs/*', require('./songs.js'));

