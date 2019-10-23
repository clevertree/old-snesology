const {AudioSourceServer} = require('./audio-source/server/audio-source-server');


(async () => {
    const server = new AudioSourceServer({
        httpPort: 8091,
        baseDir: __dirname
    });
    await server.listen();
})();
