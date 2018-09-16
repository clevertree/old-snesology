const express = require('express');
const app = express();
const bodyParser = require('body-parser');


// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var expressWs = require('express-ws')(app);





const router = express.Router(null);              // get an instance of the express Router

// ROUTES
require('./songs.js')(app, router);
require('./git.js')(app, router);
require('./server.js')(app, router);

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

