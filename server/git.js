const fs = require('fs');
const path = require('path');

const BASE_URL = path.dirname(__dirname);


// API Routes
module.exports = function(req, res) {
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
};




// Watch for file changes

fs.watch(BASE_URL, {
    recursive: true
}, function(event, filename) {
    if(filename){
        // console.log(filename + ' file changed at : ' + new Date(), event);
    }
    else{
        // console.log('filename not provided')
    }
});

