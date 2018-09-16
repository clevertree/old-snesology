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
app.listen(8080, () => console.log('Snesology listening on port 8080!'));
app.listen(80, () => console.log('Snesology listening on port 80!'));




app.use(function (req, res, next) {
    console.log('middleware');
    // req.testing = 'testing';
    return next();
});

