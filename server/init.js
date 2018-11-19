// const fs = require('fs');
// const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');


const app = express();
require('express-ws')(app);

// const redis = require("redis");
// app.redisClient = redis.createClient();
// app.redisClient.on("error", function (err) {
//     console.log("Redis Error: " + err);
// });
// app.redisClient.DB_PREFIX = 'snesology.net/';



// Configure app
const config = (function() {
    try { return require('../config.js'); } catch (e) { return null; }
})() || require('./config.sample.js');
app.config = config;

// Mysql
const mysql = require('mysql');
app.mysqlClient = mysql.createConnection(config.mysql);
app.mysqlClient.on('error', function (err){
    throw err;
});
app.mysqlClient.connect({}, (err) => {
    if(err)
        throw err;
    // const sqlContent = fs.readFileSync(path.join(__dirname, './database.sql'), 'utf8');
    // const sqlCommands = sqlContent.split(';');
    // for(let i=0; i<sqlCommands.length; i++) {
    //     const sqlCommand = sqlCommands[i].trim();
    //     console.info("SQL: ", sqlCommand);
    //     app.mysqlClient.query(sqlCommand, null, (error, results, fields) => {
    //         if(error)
    //             throw error;
    //     });
    // }
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// Init Routes
const router = express.Router(null);


require('./server.js')(app, router);                // Include first
require('./songs.js')(app, router);
require('./samples.js')(app, router);
require('./git.js')(app, router);


app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    return next();
});



// Register Routes
app.use('/', router);

// Start

app.listen(config.port, () => console.log('Server listening on port ' + config.port));

