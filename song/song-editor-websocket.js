
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorWebsocket {
    constructor(editor) {
        this.editor = editor;
    }
    initWebSocket(uuid) {
        if(!uuid) uuid = null;
        if (!("WebSocket" in window)) {
            console.warn("WebSocket is not supported by your Browser!");
            return;
        }
        if(this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
        const wsURL = window.origin.replace(/^http/i, 'ws') + '/song/' + (uuid || ''); // TODO: lol
        const ws = new WebSocket(wsURL);
        const onWebSocketEvent = this.onWebSocketEvent.bind(this);
        ws.addEventListener('open', onWebSocketEvent);
        ws.addEventListener('message', onWebSocketEvent);
        ws.addEventListener('close', onWebSocketEvent);
        this.webSocket = ws;
    }

    /** Loading **/

    loadSongFromServer(uuid) {
        this.setAttribute('uuid', uuid);
        this.initWebSocket(uuid);

        // const songRecentUUIDs = JSON.parse(localStorage.getItem('song-recent-uuid') || '{}');
        // if(typeof songRecentUUIDs[uuid] === 'undefined') {
        //     songRecentUUIDs[uuid] = `New Song (${new Date().toJSON().slice(0, 10).replace(/-/g, '/')})`;
        //     localStorage.setItem('song-recent-uuid', JSON.stringify(songRecentUUIDs));
        // }
    }

    // disconnectedCallback() {
    // attributeChangedCallback() {
    // }

    onError(err) {
        if(this.webSocket)
            this.webSocket
                .send(JSON.stringify({
                    type: 'error',
                    message: err.message || err,
                    stack: err.stack
                }));
    }
    onWebSocketEvent(e) {
        // console.info("WS " + e.type, e);
        switch(e.type) {
            case 'open':
                // this.webSocketAttempts = 0;
                // if(this.uuid)
                //     this.webSocket
                //         .send(JSON.stringify({
                //             type: 'register',
                //             uuid: this.uuid
                //         }));
                // else
                //     this.webSocket
                //         .send(JSON.stringify({
                //             type: 'history:register',
                //             uuid: this.uuid
                //         }));
                // e.target.send("WELCOME");
                break;

            case 'close':
                this.webSocketAttempts++;
                if(this.webSocketAttempts <= this.status.webSocket.maxAttempts) {
                    setTimeout(() => this.initWebSocket(), this.status.webSocket.reconnectTimeout);
                    console.info("Reopening WebSocket in " + (this.status.webSocket.reconnectTimeout/1000) + ' seconds (' + this.webSocketAttempts + ')' );
                } else {
                    console.info("Giving up on WebSocket");
                }

                break;
            case 'message':
                if(e.data[0] === '{') {
                    const json = JSON.parse(e.data);
                    switch(json.type) {
                        case 'history:entry':
                            // for (let i = 0; i < json.historyActions.length; i++) {
                            //     const historyAction = json.historyActions[i];
                            const songModifier = new MusicEditorSongModifier(this.getSongData());
                            songModifier.applyHistoryActions(json.historyActions);
                            this.status.history.currentStep = json.historyActions[json.historyActions.length-1].step;
                            this.player.initAllInstruments();
                            this.render();
                            //this.gridSelect(e, 0);
                            this.grid.focus();

                            const songUUID = songModifier.songData.uuid;
                            if(songUUID) {
                                let songRecentUUIDs = JSON.parse(localStorage.getItem('server-recent-uuid') || '[]');
                                songRecentUUIDs = songRecentUUIDs.filter((entry) => entry[0] !== songUUID);
                                songRecentUUIDs.unshift([songUUID, songModifier.songData.title, new Date().getTime()]);
                                localStorage.setItem('server-recent-uuid', JSON.stringify(songRecentUUIDs));
                            }
                            // }
                            break;

                        case 'history:error':
                        case 'error':
                            console.error("WS:" + json.message, json.stack);
                            break;

                        default:
                            console.log("Unrecognized web socket event: " + json.type);
                    }
                } else {
                    console.log("Unrecognized web socket message: " + e.data);
                }
                break;
        }

    }

}
