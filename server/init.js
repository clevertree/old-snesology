const express = require('express');
const bodyParser = require('body-parser');

const app = express();
require('express-ws')(app);

const redis = require("redis");
app.redisClient = redis.createClient();
app.redisClient.on("error", function (err) {
    console.log("Redis Error: " + err);
});
app.redisClient.DB_PREFIX = 'snesology.net/';

// Configure app
let config = {
    port: 8080,
    debug: false
};
try { config = require('../config.js'); } catch (e) { }

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Init Routes
const router = express.Router(null);


require('./server.js')(app, router);                // Include first
require('./songs.js')(app, router);
require('./git.js')(app, router);

// Register Routes
app.use('/', router);

// Start

app.listen(config.port, () => console.log('Snesology listening on port ' + config.port));



app.use(function (req, res, next) {
    console.log('middleware');
    // req.testing = 'testing';
    return next();
});

