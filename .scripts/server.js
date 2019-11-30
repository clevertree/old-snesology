const path = require('path');
const {AudioSourceServer} = require('../server/audio-source-server');


(async () => {
    const server = new AudioSourceServer({
        httpPort: 8090,
        baseDir: path.dirname(__dirname)
    });
    await server.listen();
})();
