// API Routes
module.exports = {
    webSocketRequest: function(ws, req) {
        console.info("WS connection: ", req.headers["user-agent"]);
        ws.on('message', function(msg) {
            console.info("WS:", msg);
            ws.send("ECHO " + msg);
        });
    }
};