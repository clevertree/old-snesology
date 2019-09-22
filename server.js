const express = require('express');
const expressWS = require('express-ws');


const app = express();
app.baseServer = this;
expressWS(app);

// Add Your App
app.use(express.static(__dirname));

// Launch your server
const httpPort = 8090;
app.listen(httpPort, function() {
    console.log('SNESology listening on port: ' + httpPort);
});