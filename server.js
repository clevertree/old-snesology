const {AudioSourceServer} = require('./audio-source/server/audio-source-server');


(async () => {
    const server = new AudioSourceServer();
    await server.loadLocalConfig();
    await server.listen();
})();
