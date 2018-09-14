const fs = require('fs');
const path = require('path');

const BASE_URL = path.dirname(__dirname);


// API Routes
module.exports = {
    httpRequest: function(req, res) {
        const songPath = BASE_URL + req.path;

        // const newSongBody = JSON.stringify(req.body);
        const oldSongBody = fs.readFileSync(songPath, 'utf8');

        const oldSongJSON = JSON.parse(oldSongBody);
        if(!req.body.version)
            return res.status(500).json({message:"Missing version", status: false});
        if(oldSongJSON.version && req.body.version - 1 !== oldSongJSON.version)
            return res.status(500).json({message:"New version must be +1 old version (" + req.body.version + "+1 !== " + oldSongJSON.version + ")", status: false});

        const newSongJSON = JSON.parse(oldSongBody);
        newSongJSON.version = (oldSongJSON.version||0) + 1;
        if(req.body.name) newSongJSON.name = req.body.name;
        if(req.body.versionString) newSongJSON.versionString = req.body.versionString;
        if(req.body.description) newSongJSON.description = req.body.description;
        if(req.body.instruments) newSongJSON.instruments = req.body.instruments;
        if(req.body.instructions) newSongJSON.instructions = req.body.instructions;

        const newSongBody = JSON.stringify(newSongJSON, null, "\t");

        let response;
        if(newSongBody === oldSongBody)
            return res.status(500).json({message:"No changes detected", status: false});

        // Write the file
        fs.writeFileSync(songPath, newSongBody);


        response = {message: "Song file has been updated", status: true};
        return res.json(response);
    }
};