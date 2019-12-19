const express = require('express');
const path = require('path');

const ROOT_DIR = path.dirname(__dirname);

const app = express();

app.use(express.static(ROOT_DIR));

const httpPort = 8091;
app.listen(httpPort, function() {
    console.log('Server listening on port: ' + httpPort);
});