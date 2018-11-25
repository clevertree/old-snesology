
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class MusicEditorElement extends HTMLElement {
    constructor() {
        super();
        this.player = null;
        this.keyboardLayout = {
            // '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
            // 'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
            // 's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
            // 'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
            '2':'C#2', '3':'D#2', '5':'F#2', '6':'G#2', '7':'A#2', '9':'C#3', '0':'D#3',
            'q':'C2', 'w':'D2', 'e':'E2', 'r':'F2', 't':'G2', 'y':'A2', 'u':'B2', 'i':'C3', 'o':'D3', 'p':'E3',
            's':'C#1', 'd':'D#1', 'g':'F#1', 'h':'G#1', 'j':'A#1', 'l':'C#2', ';':'D#2',
            'z':'C1', 'x':'D1', 'c':'E1', 'v':'F1', 'b':'G1', 'n':'A1', 'm':'B1', ',':'C2', '.':'D2', '/':'E2',
        };
        this.status = {
            history: {
                currentStep: 0,
                undoList: [],
                undoPosition: []
            },
            webSocket: {
                attempts: 0,
                reconnectTimeout: 3000,
                maxAttempts: 3,
            },
            previewInstructionsOnSelect: false,
            longPressTimeout: 500,
            instrumentLibrary: null
        };
        this.webSocket = null;
        this.webSocketAttempts = 0;
        // this.songData = null;

        // Include assets
        const INCLUDE_CSS = "editor/music-editor.css";
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    }
    get grid() { return this.querySelector('music-editor-grid'); }
    get menu() { return this.querySelector('music-editor-menu'); }
    get instruments() { return this.querySelectorAll(`music-editor-instrument`); }

    getKeyboardCommand(key) {
        if(typeof this.keyboardLayout[key] === 'undefined')
            return null;
        const octave = parseInt(this.menu.fieldRenderOctave.value) || 1;
        let command = this.keyboardLayout[key];
        command = command.replace('2', octave+1);
        command = command.replace('1', octave);
        return command;
    }

    connectedCallback() {
        const playerElement = document.createElement('music-player');
        this.player = playerElement;
        this.addEventListener('song:start', this.onSongEvent);
        this.addEventListener('song:end', this.onSongEvent);
        this.addEventListener('song:pause', this.onSongEvent);
        this.addEventListener('instrument:initiated', this.onSongEvent);
        document.addEventListener('instrument:instance', this.onSongEvent.bind(this));

        // this.songData = this.player.getSongData();
        // const onInstrumentEvent = this.onInstrumentEvent.bind(this);
        // playerElement.addEventListener('instrument:initiated', onInstrumentEvent);

        if(this.uuid)
            this.initWebSocket();
        // this.render(); // Render after player element is loaded


        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'instrument/index.json', true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            if(xhr.status !== 200)
                throw new Error("Instrument list not found");
            this.status.instrumentLibrary = xhr.response;
            this.render();
        };
        xhr.send();

        this.addEventListener('keydown', this.onInput);
        this.render();

    }

    getAudioContext() { return this.player.getAudioContext(); }
    getSongData() { return this.player.getSongData(); }

    get uuid() { return this.getAttribute('uuid');}
    loadSongUUID(uuid) {
        this.setAttribute('uuid', uuid);
        this.initWebSocket();
        // TODO: or load manually
    }

    initWebSocket() {
        if (!("WebSocket" in window)) {
            console.warn("WebSocket is not supported by your Browser!");
            return;
        }
        if(this.webSocket) {
            this.webSocket.close();
            this.webSocket = null;
        }
        const wsURL = window.origin.replace(/^http/i, 'ws') + '/editor';
        const ws = new WebSocket(wsURL);
        const onWebSocketEvent = this.onWebSocketEvent.bind(this);
        ws.addEventListener('open', onWebSocketEvent);
        ws.addEventListener('message', onWebSocketEvent);
        ws.addEventListener('close', onWebSocketEvent);
        this.webSocket = ws;
    }

    onWebSocketEvent(e) {
        // console.info("WS " + e.type, e);
        switch(e.type) {
            case 'open':
                this.webSocketAttempts = 0;
                if(this.uuid)
                    this.webSocket
                        .send(JSON.stringify({
                            type: 'history:register',
                            uuid: this.uuid
                        }));
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

    onError(err) {
        console.error(err);
        if(this.webSocket)
            this.webSocket
                .send(JSON.stringify({
                    type: 'error',
                    message: err.message || err,
                    stack: err.stack
                }));
    }

    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {
            case 'keydown':
                switch(e.key) {
                    case 'Tab': break;
                    case ' ': this.player.play(); e.preventDefault(); break;
                    case 'Escape': this.grid.focus(); break;
                    default:
                }
                break;


            default:
                console.error("Unhandled " + e.type, e);
        }
    }

    saveSongToMemory() {
        const song = this.getSongData();
        const songList = JSON.parse(localStorage.getItem('share-editor-saved-list') || "[]");
        if(songList.indexOf(song.url) === -1)
            songList.push(song.url);
        console.log("Saving song: ", song, songList);
        localStorage.setItem('song:' + song.url, JSON.stringify(song));
        localStorage.setItem('share-editor-saved-list', JSON.stringify(songList));
        this.menu.render();
        // this.querySelector('.editor-menu').outerHTML = renderEditorMenuContent(this);
        console.info("Song saved to memory: " + song.url, song);
    }

    saveSongToFile() {
        const song = this.getSongData();
        const jsonString = JSON.stringify(song, null, "\t");
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", song.url.split('/').reverse()[0]);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    loadSongFromMemory(songGUID) {
        let songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        let songData = JSON.parse(songDataString);
        if(!songData)
            throw new Error("Invalid Song Data: " + songDataString);

        this.player.loadSongData(songData);
        this.render();
        //this.gridSelect(null, 0);
        console.info("Song loaded from memory: " + songGUID, songData);
    }

    loadSongData(songData) {
        const modifier = new MusicEditorSongModifier(songData);
        modifier.processAllInstructions();
        this.player.loadSongData(songData);
    }

    historyQueue(historyActions) {
        if(!Array.isArray(historyActions))
            historyActions = [];
        for(let i=0; i<historyActions.length; i++) {
            const historyAction = historyActions[i];
            this.status.history.currentStep++;
            historyAction.step = this.status.history.currentStep;
        }
        //
        // this.status.history.undoList.push(historyAction);
        // this.status.history.undoPosition = this.status.history.undoList.length-1;

        if(this.uuid) {
            console.info("Sending history actions: ", historyActions);
            this.webSocket
                .send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: historyActions,
                    uuid: this.uuid
                }))
        }
    }

    historyUndo() {

    }

    historyRedo() {

    }

    processInstruction(instruction) {
        if(!instruction.command || instruction.command[0] === '!')
            return;
        instruction.command = this.getCommandAlias(instruction.instrument || 0, instruction.command);
    }

    getCommandAlias(instrumentID, command) {
        const instance = this.player.getInstrument(instrumentID);
        if (instance.getFrequencyAliases) {
            const aliases = instance.getFrequencyAliases();
            Object.keys(aliases).forEach((key) => {
                if (aliases[key] === command)
                    command = key;
            });
        }
        return command;
    }

    insertInstructionAtPosition(groupName, insertPosition, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const insertIndex = songModifier.insertInstructionAtPosition(groupName, insertPosition, instructionToAdd);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        this.grid.selectIndices(insertIndex, [insertIndex]);
        return insertIndex;
        // return insertIndex;
    }

    insertInstructionAtIndex(groupName, insertIndex, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.insertInstructionAtIndex(groupName, insertIndex, instructionToAdd);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(insertIndex, [insertIndex]);
        return insertIndex;
    }

    deleteInstructionAtIndex(groupName, deleteIndex) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.deleteInstructionAtIndex(groupName, deleteIndex);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(deleteIndex);
        // return null;
    }

    replaceInstructionParams(groupName, replaceIndices, replaceParams) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];
        const songModifier = new MusicEditorSongModifier(this.getSongData());

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = songModifier.songData.instructions[groupName][replaceIndices[i]];
            if(typeof replaceParams.command !== 'undefined' && typeof replaceInstruction.instrument !== 'undefined')
                replaceParams.command = this.getCommandAlias(replaceInstruction.instrument, replaceParams.command);
            oldParams.push(songModifier.replaceInstructionParams(groupName, replaceIndices[i], replaceParams));
        }
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(replaceIndex, [replaceIndex]);
        return oldParams;
    }

    addInstructionGroup(newGroupName, instructionList) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.addInstructionGroup(newGroupName, instructionList);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    removeInstructionGroup(removedGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.removeInstructionGroup(removedGroupName);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigatePop();
    }

    renameInstructionGroup(oldGroupName, newGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.renameInstructionGroup(oldGroupName, newGroupName);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    addInstrument(config) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const instrumentID = songModifier.addInstrument(config);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
        this.player.initInstrument(instrumentID);
        return instrumentID;
    }

    removeInstrument(instrumentID) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.removeInstrument(instrumentID);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
    }

    replaceInstrumentParams(instrumentID, replaceConfig) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const oldParams = songModifier.replaceInstrumentParams(instrumentID, replaceConfig);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
        return oldParams;
    }

    // Rendering


    render() {
        // TODO: render only once. each component handles it's own state
        const song = this.getSongData();
        this.innerHTML = `
            <music-editor-menu></music-editor-menu>
            <music-editor-grid tabindex="1"></music-editor-grid>
            ${song ? song.instruments.map((instrument, id) => 
                `<music-editor-instrument id="${id}"></music-editor-instrument>`).join('') : null}
            <br style="clear: both;"/>`;
        this.appendChild(this.player);
    }




    format(input, type) {
        switch(type) {
            case 'duration':
                if(input === 1/61) return '1/64';
                if(input === 1/32) return '1/32';
                if(input === 1/16) return '1/16';
                if(input === 1/8) return '1/8';
                if(input === 1/4) return '1/4';
                if(input === 1/2) return '1/2';
                input = parseFloat(input).toFixed(2);
                return input.replace('.00', 'B');

            case 'instrument':
                return input < 10 ? "0" + input : "" + input;

        }
    }

    generateInstructionGroupName(currentGroup) {
        const songData = this.getSongData();
        let newGroupName;
        for(let i=99; i>=0; i--) {
            const currentGroupName = currentGroup + '.' + i;
            if(!songData.instructions.hasOwnProperty(currentGroupName))
                newGroupName = currentGroupName;
        }
        if(!newGroupName)
            throw new Error("Failed to generate group name");
        return newGroupName;
    }

    // Input

    profileInput(e) {
        e = e || {};
        return {
            gridClearSelected: !e.ctrlKey && !e.shiftKey,
            gridToggleAction: e.key === ' ' || (!e.shiftKey && !e.ctrlKey) ? 'toggle' : (e.ctrlKey && e.type !== 'mousedown' ? null : 'add'),
            gridCompleteSelection: e.shiftKey
        };
    }

    // Grid Commands

    // Player commands


    playInstruction(instruction) {
        return this.player.playInstruction(
            instruction,
            this.player.getAudioContext().currentTime
        );
    }

    // Forms

    // formUpdate() {
    //     this.menu.setEditableInstruction();
    // }

    // Playback

    onSongEvent(e) {
        switch(e.type) {
            case 'song:start':
                this.classList.add('playing');
                break;
            case 'song:end':
            case 'song:pause':
                this.classList.remove('playing');
                break;
            case 'instrument:loaded':
                console.info("TODO: load instrument instances", e.detail);
                break;
            case 'instrument:initiated':
                this.menu.render(); // Update instrument list
                break;
            case 'instrument:instance':
                // console.info("Instrument initialized: ", e.detail);
                // const instance = e.detail.instance;
                const instrumentID = e.detail.instrumentID;
                if(this.instruments[instrumentID]) {
                    this.instruments[instrumentID].render();
                    this.menu.render(); // Update instrument list
                    // this.render();
                } else {
                    console.warn("Instrument elm not found. Re-rendering editor");
                    this.render(); // Update instrument list
                }
                break;
        }
    }

}
customElements.define('music-editor', MusicEditorElement);