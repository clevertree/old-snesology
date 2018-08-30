const express = require('express');
const app = express();
const routes = require(__dirname + '/routes.js');
const bodyParser = require('body-parser');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Register Routes
app.use('/', routes);

// Start
app.listen(8080, () => console.log('Example app listening on port 8080!'));
app.listen(80, () => console.log('Example app listening on port 80!'));
