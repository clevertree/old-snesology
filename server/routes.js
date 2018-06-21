const path = require('path');
const express = require('express');

const BASE_URL = path.dirname(__dirname);


// ROUTES FOR OUR API
// =============================================================================
const router = express.Router();              // get an instance of the express Router
module.exports = router;


// Serve Website Files
router.use('/', express.static(BASE_URL));

// API Routes
router.get('/api', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

router.get('/git', function(req, res) {
    const git = require('simple-git')(BASE_URL);
    git.pull((err, update) => {
        const response = { message: "Git pull successful", update: update};
        console.log("Git pull:", update);
        res.json(response);

        if(update && update.summary.changes) {
            // Restart Server (not working?)
            console.log("Restarting server...");
            require('child_process').exec('npm restart');
        }
    });
});


// Watch for file changes
var fs = require('fs');

fs.watch(BASE_URL, {
    recursive: true
}, function(event, filename) {
    if(filename){
        console.log(filename + ' file changed at : ' + new Date(), event);
    }
    else{
        console.log('filename not provided')
    }
});