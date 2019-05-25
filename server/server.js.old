// const path = require('path');
const fs = require('fs');
const express = require('express');
const expressWS = require('express-ws');
const bodyParser = require('body-parser');
const mysql = require('mysql');


class BaseServer {
    constructor() {
        // Init Express App
        const app = express();
        this.app = app;
        app.baseServer = this;
        expressWS(app);

        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        // Config
        app.config = this.loadConfig();
        app.db = this.loadDatabase();



// Add CMS middleware
//         app.use(clevertreeCMS.getMiddleware({
//             database: {
//                 // host: 'localhost',
//                 // user: 'cms_user',
//                 // password: 'cms_pass',
//                 database: 'ffga_me_cms'
//             },
//             server: {
//                 httpPort: 8092,
//                 sslEnable: false
//                 // sslPort: 8443,
//             },
//             mail: {
//                 client: {
//                     auth: {
//                         user: "mail@ffga.me",
//                         pass: "mailmail"
//                     },
//                     host: "mail.ffga.me",
//                     port: 587
//                 }
//             }
//         }));
//

        // Init Routes
        require('./route/file-server.js')(app);
        require('./route/song-server.js')(app);
        // require('./route/sample-server.js')(app);
        // require('./route/git-server.js')(app);

    }

    loadDatabase() {
        const config = this.app.config;
        // Mysql
        const db = mysql.createConnection(config.mysql);
        db.on('error', function (err){
            throw err;
        });
        db.connect({}, (err) => {
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
        return db;
    }

    loadConfig() {
        // Config
        try {
            return require('../config.js');
        } catch (e) {
            return require('../config.sample.js');
        }
    }

    init() {
        const config = this.app.config;

        // Start
        this.app.listen(config.port, () =>
            console.log('Server listening on port ' + config.port));
    }
}
if(module.parent === null) {
    const server = new BaseServer();
    server.init();
} else {
    module.exports = BaseServer;
}