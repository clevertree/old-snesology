
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
        this.songData = null;

    }
    connectedCallback() {
        const playerElement = document.createElement('music-player');
        this.player = playerElement;
        const onSongEvent = this.onSongEvent.bind(this);
        playerElement.addEventListener('note:end', onSongEvent);
        playerElement.addEventListener('note:start', onSongEvent);
        playerElement.addEventListener('songData:start', onSongEvent);
        playerElement.addEventListener('songData:playback', onSongEvent);
        playerElement.addEventListener('songData:end', onSongEvent);
        playerElement.addEventListener('songData:pause', onSongEvent);
        this.songData = this.player.getSongData();
        playerElement.addEventListener('instruments:initialized', (e) => {
            // console.log("init", e);

            this.render();
        });

        if ("WebSocket" in window) {
            this.initWebSocket();
        } else {
            console.warn("WebSocket is not supported by your Browser!");
        }
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
    get grid() { return this.querySelector('music-editor-grid'); }

    get menu() { return this.querySelector('music-editor-menu'); }

    getAudioContext() { return this.player.getAudioContext(); }
    getSongData() { return this.songData || this.player.getSongData(); }

    getSongURL() { return this.getAttribute('src');}

    initWebSocket(url) {
        url = url || new URL(this.getSongURL(), document.location) || location;
        const wsURL = (url+'').replace(/^http/i, 'ws');
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
                // this.webSocket
                //     .send(JSON.stringify({
                //         type: 'history:register',
                //         path: this.getSongURL()
                        // historyStep:
                    // }));
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
                                this.applyHistoryActions(json.historyActions, () => {
                                    this.render();
                                    //this.gridSelect(e, 0);
                                    this.grid.focus();
                                });
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
                    // case 'ArrowDown':
                    // case 's': this.player.saveSongToMemory(); e.preventDefault(); break;
                    // Send keystroke to default grid
                    // this.grid.onInput(e);   // Check main grid for input event (in case it was a keystroke)
                    // if(!e.defaultPrevented)
                    //     console.info("Unhandled " + e.type, e);
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
        console.log("Saving songData: ", song, songList);
        localStorage.setItem('songData:' + song.url, JSON.stringify(song));
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
        let songDataString = localStorage.getItem('songData:' + songGUID);
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


    // loadSongFromURL(songURL, onLoaded) {
    //     return this.player.loadSongFromURL(songURL, onLoaded);
    // }

    // Grid Functions

    // getSelectedInstructions() {
    //     const instructionList = this.player.getInstructions(this.grid.getGroupName());
    //     return this.gridStatus.selectedPositions.forEach(p => instructionList[p]);
    // }

    // getCursorInstruction() {
    //     return this.player.getInstructions(this.grid.getGroupName())[this.gridStatus.cursorPosition];
    // }

    // deleteInstruction(deletePositions) {
    //     const instructionList = this.player.getInstructions(this.grid.getGroupName());
    //     // deletePositions = deletePositions || this.gridStatus.selectedPositions;
    //     deletePositions.sort((a, b) => b - a);
    //     for(let i=0; i<deletePositions.length; i++) {
    //         const position = deletePositions[i];
    //         if(instructionList[position])
    //             throw new Error("Instruction not found at position: " + position);
    //         instructionList.splice(p, 1);
    //     }
    //     this.gridSelect(null, [deletePositions[deletePositions.length-1]]);
    // }

    // Edit songData functions

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

        console.info("Sending history actions: ", historyActions);
        this.webSocket
            .send(JSON.stringify({
                type: 'history:entry',
                historyActions: historyActions,
                path: this.getSongURL()
            }))
    }

    historyUndo() {

    }

    historyRedo() {

    }

    insertInstructionAtTime(groupName, insertPosition, instructionToAdd) {
        throw new Error("TODO");
    }

    insertInstruction(groupName, insertIndex, instructionToAdd) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.insertInstruction(groupName, insertIndex, instructionToAdd);
        this.historyQueue(historyAction);
        this.grid.render();
        this.grid.selectIndices(insertIndex, [insertIndex]);
        return insertIndex;
    }

    deleteInstruction(groupName, deleteIndex) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.deleteInstruction(groupName, deleteIndex);
        this.historyQueue(historyAction);
        this.grid.render();
        this.grid.selectIndices(deleteIndex);
        return historyAction.return;
    }

    replaceInstructionParams(groupName, replaceIndex, replaceParams) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyActions = songModifier.replaceInstructionParams(groupName, replaceIndex, replaceParams);
        this.historyQueue(historyActions);
        this.grid.render();
        this.grid.selectIndices(replaceIndex, [replaceIndex]);
        return historyActions[0].return;
    }

    // splitInstructionRows(groupName, splitPausePositions, splitPercentage) {
    //     if(splitPercentage < 1 || splitPercentage > 100)
    //         throw new Error("Invalid split percentage: " + splitPercentage);
    //     if(!Array.isArray(splitPausePositions))
    //         splitPausePositions = [splitPausePositions];
    //
    //     const split = [(splitPercentage / 100), ((100 - splitPercentage) / 100)];
    //     const instructionList = this.player.getInstructions(groupName);
    //     const historyActions = {action: 'group', params: []};
    //     for(let i=splitPausePositions.length-1; i>=0; i--) {
    //         const splitPausePosition = splitPausePositions[i];
    //         const splitPauseDuration = instructionList[splitPausePosition].duration;
    //         const splitParams = {
    //             duration: split[0] * splitPauseDuration
    //         };
    //         const oldParams = this.replaceInstructionParams(groupName, splitPausePosition, splitParams);
    //         historyActions.params.push({
    //             action: 'params',
    //             params: [groupName, splitPausePosition, splitParams],
    //             return: oldParams
    //         });
    //         const newPauseInstruction = {
    //             command: '!pause',
    //             duration: split[1] * splitPauseDuration
    //         };
    //         this.player.insertInstruction(groupName, splitPausePosition+1, newPauseInstruction);
    //         historyActions.params.push({
    //             action: 'insert',
    //             params: [groupName, splitPausePosition+1, newPauseInstruction]
    //         });
    //     }
    //     if(historyActions.params.length <= 1)
    //         this.historyQueue(historyActions.params[0]);
    //     else
    //         this.historyQueue(historyActions);
    //     this.grid.render();
    // }
    //
    // duplicateInstructionRange(groupName, rangeStart, rangeEnd) {
    //     const instructionList = this.player.getInstructions(groupName);
    //     const rangeLength = rangeEnd - rangeStart;
    //     if(rangeLength < 0)
    //         throw new Error("Invalid range: " + rangeStart + " !=< " + rangeEnd);
    //     const newInstructions = [];
    //     for (let i=0; i<=rangeLength; i++) {
    //         const currentInstruction = instructionList[rangeStart + i];
    //         const newInstruction = Object.assign({}, currentInstruction);
    //         newInstructions.push(newInstruction);
    //     }
    //     const historyActions = {
    //         action: 'insert',
    //         params: [groupName, rangeEnd + 1, newInstructions]
    //     };
    //     this.historyQueue(historyActions);
    //     this.applyHistoryActions(historyActions, () => this.grid.render());
    //
    // }

    addInstructionGroup(newGroupName, instructionList) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.addInstructionGroup(newGroupName, instructionList);
        this.historyQueue(historyAction);
        this.grid.navigate(newGroupName);
    }

    removeInstructionGroup(removedGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.removeInstructionGroup(removedGroupName);
        this.historyQueue(historyAction);
        this.grid.navigatePop();
    }

    renameInstructionGroup(oldGroupName, newGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.renameInstructionGroup(oldGroupName, newGroupName);
        this.historyQueue(historyAction);
        this.grid.navigate(newGroupName);
    }

    addInstrument(config) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.addInstrument(config);
        this.historyQueue(historyAction);
        this.render(); // TODO: render only instruments
        return historyAction.return;
    }

    removeInstrument(instrumentID) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.removeInstrument(instrumentID);
        this.historyQueue(historyAction);
        this.render(); // TODO: render only instruments
        return historyAction.return;
    }

    replaceInstrumentParams(instrumentID, replaceConfig) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const historyAction = songModifier.replaceInstrumentParams(instrumentID, replaceConfig);
        this.historyQueue(historyAction);
        this.render(); // TODO: render only instruments
        return historyAction.return;
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
        `;
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
        // console.log("onSongEvent", e);
        const detail = e.detail || {stats:{}};
        const instructionElm = detail.instruction ? this.grid.findInstruction(detail.instruction) : null;
        const groupElm = detail.groupInstruction ? this.grid.findInstruction(detail.groupInstruction) : null;
        // var groupPlayActive = groupElm ? parseInt(groupElm.getAttribute('data-play-active')||0) : 0;
        switch(e.type) {
            case 'note:start':
                if(instructionElm) {
                    instructionElm.classList.add('playing');
                    instructionElm.parentNode.classList.add('playing');
                    // console.log("show", instructionElm);
                }
                if(groupElm) {
                    groupElm.classList.add('playing');
                    groupElm.parentNode.classList.add('playing');
                    // groupElm.setAttribute('data-play-active', groupPlayActive+1);
                }
                break;
            case 'note:end':
                if(instructionElm) {
                    instructionElm.classList.remove('playing');
                    instructionElm.parentNode.classList.remove('playing');
                    // console.log("hide", instructionElm);
                }
                if(groupElm) {
                    // if(groupPlayActive <= 1) {
                        groupElm.classList.remove('playing');
                        groupElm.parentNode.classList.remove('playing');
                    // }
                    // groupElm.setAttribute('data-play-active', groupPlayActive-1);
                }
                break;

            case 'songData:start':
                this.classList.add('playing');
                break;
            case 'songData:end':
            case 'songData:pause':
                this.classList.remove('playing');
                break;
        }
    }



    modifySongData(action, params) {
        const songData = this.getSongData();
        console.info("Modifying Song Data: ", action, params);
        params = [].slice.call(params);

        // this.status.history.undoList.push(action);
        // this.status.history.undoPosition = this.status.history.undoList.length-1;
        // if(typeof action.step !== "undefined")
        //     this.status.history.currentStep = action.step;

        let returnValues = null;
        switch (action) {
            case 'insert':
                returnValues = ((groupName, insertIndex, insertInstruction) => {
                    if(!insertInstruction) throw new Error("Invalid insert instruction");
                    let instructionList = songData.instructions[groupName];
                    if (instructionList.length < insertIndex)
                        throw new Error("Insert position out of index: " + instructionList.length + " < " + insertIndex + " for groupName: " + groupName);

                    instructionList.splice(insertIndex, 0, insertInstruction);
                }).call(this, params);
                break;

            case 'delete':
                returnValues = ((groupName, deleteIndex) => {
                    let instructionList = songData.instructions[groupName];
                    if (instructionList.length < deleteIndex)
                        throw new Error("Delete position out of index: " + instructionList.length + " < " + deleteIndex + " for groupName: " + groupName);
                    return instructionList.splice(deleteIndex, 1);
                }).call(this, params);
                break;

            case 'replace':
                returnValues = ((groupName, replaceIndex, replaceInstruction) => {
                    if(!replaceInstruction) throw new Error("Invalid replace instruction");
                    let instructionList = songData.instructions[groupName];
                    if (instructionList.length < replaceIndex)
                        throw new Error("Replace position out of index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

                    return instructionList.splice(replaceIndex, 1, replaceInstruction);
                }).call(this, params);
                break;

            case 'params':
                returnValues = ((groupName, replaceIndex, replaceParams) => {
                    let instructionList = songData.instructions[groupName];
                    if (instructionList.length < replaceIndex)
                        throw new Error("Replace position out of index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

                    const instruction = instructionList[replaceIndex];
                    const oldParams = {};
                    for(const paramName in replaceParams) {
                        if(replaceParams.hasOwnProperty(paramName)) {
                            if(replaceParams[paramName] === instruction[paramName])
                                continue;
                            oldParams[paramName] = typeof instruction[paramName] !== 'undefined' ? instruction[paramName] : null;
                            if(replaceParams[paramName] === null)
                                delete instruction[paramName];
                            else
                                instruction[paramName] = replaceParams[paramName];
                        }
                    }
                    return oldParams;
                }).call(this, params);
                break;

            case 'group-add':
                returnValues = ((newGroupName, instructionList) => {
                    if(songData.instructions.hasOwnProperty(newGroupName))
                        throw new Error("New group already exists: " + newGroupName);
                    songData.instructions[newGroupName] = instructionList || [];
                    // this.processInstructions(newGroupName); // TODO: process all instructions on change

                }).call(this, params);
                break;

            case 'group-remove':
                returnValues = ((removeGroupName) => {
                    if(removeGroupName === 'root')
                        throw new Error("Cannot remove root instruction group, n00b");
                    if(!songData.instructions.hasOwnProperty(removeGroupName))
                        throw new Error("Existing group not found: " + removeGroupName);

                    const removedGroupData = songData.instructions[removeGroupName];
                    delete songData.instructions[removeGroupName];
                    return removedGroupData;
                }).call(this, params);
                break;

            case 'group-rename':
                returnValues = ((oldGroupName, newGroupName) => {
                    if(oldGroupName === 'root')
                        throw new Error("Cannot rename root instruction group, n00b");
                    if(!songData.instructions.hasOwnProperty(oldGroupName))
                        throw new Error("Existing group not found: " + oldGroupName);
                    if(songData.instructions.hasOwnProperty(newGroupName))
                        throw new Error("New group already exists: " + newGroupName);
                    const groupData = songData.instructions[oldGroupName];
                    delete songData.instructions[oldGroupName];
                    songData.instructions[newGroupName] = groupData;
                }).call(this, params);
                break;

            case 'instrument-add':
                returnValues = ((url, instrumentConfig) => {
                    const instrumentList = songData.instruments;
                    const instrumentID = instrumentList.length;

                    instrumentList[instrumentID] = Object.assign({
                        url: url
                    }, instrumentConfig || {});
                    return instrumentID;
                    // TODO: init all instruments on change;
                }).call(this, params);
                break;

            case 'instrument-remove':
                returnValues = ((instrumentID) => {
                    const instrumentList = songData.instruments;
                    if(!instrumentList[instrumentID])
                        throw new Error("Invalid instrument ID: " + instrumentID);
                    return instrumentList.splice(instrumentID, 1);
                }).call(this, params);
                break;

            case 'instrument-params':
                returnValues = ((instrumentID, replaceConfig) => {
                    const instrumentList = songData.instruments;
                    if(!instrumentList[instrumentID])
                        throw new Error("Invalid instrument ID: " + instrumentID);

                    const presetData = instrumentList[instrumentID];
                    const newPresetConfig = Object.assign({}, presetData);

                    const oldParams = {};
                    for(const paramName in replaceConfig) {
                        if(replaceConfig.hasOwnProperty(paramName)) {
                            if(replaceConfig[paramName] === newPresetConfig[paramName])
                                continue;
                            oldParams[paramName] = typeof newPresetConfig[paramName] !== 'undefined' ? newPresetConfig[paramName] : null;
                            if(replaceConfig[paramName] === null)
                                delete newPresetConfig[paramName];
                            else
                                newPresetConfig[paramName] = replaceConfig[paramName];
                        }
                    }

                    instrumentList[instrumentID] = newPresetConfig;
                    // TODO: init all instruments on change;
                    // this.initInstrument(instrumentID, onInstrumentLoad);

                    // this.loadedInstruments[instrumentID] = instance;            // Replace instrument with new settings
                    return oldParams;
                }).call(this, params);
                break;

            default:
                throw new Error("Unrecognized history action: " + action.action);
        }
        const historyEntry = {
            action: action,
            params: params,
        };
        if(typeof returnValues !== 'undefined')
            historyEntry.return = returnValues;
        return historyEntry
    }
}
customElements.define('music-editor', MusicEditorElement);

class MusicEditorSongModifier {
    constructor(songData) {
        this.songData = songData;
    }

    replaceDataPath(path, newData) {
        const pathParts = path.split('.');
        let target = this.songData, targetParent, targetPathPart = null;
        for(let i=0; i<pathParts.length; i++) {
            targetPathPart = pathParts[i];
            if(/^\d+$/.test(targetPathPart))
                targetPathPart = parseInt(targetPathPart);

            targetParent = target;
            target = target[targetPathPart];
        }

        let oldData = null;
        if(newData) {
            if(typeof targetPathPart === 'number' && targetParent.length < targetPathPart)
                throw new Error(`Insert position out of index: ${targetParent.length} < ${targetPathPart} for path: ${path}`);
            if(typeof targetParent[targetPathPart] !== "undefined")
                oldData = targetParent[targetPathPart];
            targetParent[targetPathPart] = newData
        } else {
            if(typeof targetPathPart === 'number') {
                targetParent.splice(targetPathPart, 1);
            } else {
                delete targetParent[targetPathPart];
            }
        }

        return {
            path: path,
            newData: newData,
            oldData: oldData
        };
    }

    insertInstruction(groupName, insertIndex, insertInstruction) {
        if(!insertInstruction)
            throw new Error("Invalid insert instruction");
        return this.replaceDataPath(`instructions.${groupName}.${insertIndex}`, insertInstruction);
    }


    deleteInstruction(groupName, deleteIndex) {
        return this.replaceDataPath(`instructions.${groupName}.${deleteIndex}`);
    }


    replaceInstruction(groupName, replaceIndex, replaceInstruction) {
        if(!replaceInstruction)
            throw new Error("Invalid replace instruction");
        let instructionList = this.songData.instructions[groupName];
        if (instructionList[replaceIndex])
            throw new Error("Failed to replace. Old instruction not found at index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}`, replaceInstruction);
    }

    replaceInstructionParam(groupName, replaceIndex, paramName, paramValue) {
        let instructionList = this.songData.instructions[groupName];
        if (instructionList[replaceIndex])
            throw new Error("Failed to replace. Old instruction not found at index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}.{$paramName}`, paramValue);
    }


    replaceInstructionParams(groupName, replaceIndex, replaceParams) {
        let instructionList = this.songData.instructions[groupName];
        if (instructionList.length < replaceIndex)
            throw new Error("Replace position out of index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

        const actionList = [];
        for(const paramName in replaceParams) {
            if(replaceParams.hasOwnProperty(paramName)) {
                const paramValue = replaceParams[paramName];
                const historyAction = this.replaceInstructionParam(groupName, replaceIndex, paramName, paramValue);
                actionList.push(historyAction);
            }
        }

        return actionList;
    }


    addInstructionGroup(newGroupName, instructionList) {
        if(this.songData.instructions.hasOwnProperty(newGroupName))
            throw new Error("New group already exists: " + newGroupName);
        return this.replaceDataPath(`instructions.${newGroupName}`, instructionList || []);
    }


    removeInstructionGroup(removeGroupName) {
        if(removeGroupName === 'root')
            throw new Error("Cannot remove root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(removeGroupName))
            throw new Error("Existing group not found: " + removeGroupName);

        return this.replaceDataPath(`instructions.${removeGroupName}`);
    }


    renameInstructionGroup(oldGroupName, newGroupName) {
        if(oldGroupName === 'root')
            throw new Error("Cannot rename root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(oldGroupName))
            throw new Error("Existing group not found: " + oldGroupName);
        if(this.songData.instructions.hasOwnProperty(newGroupName))
            throw new Error("New group already exists: " + newGroupName);

        const removeAction = this.replaceDataPath(`instructions.${oldGroupName}`);
        const removedGroupData = removeAction.oldData;
        const insertAction = this.replaceDataPath(`instructions.${newGroupName}`, removedGroupData);
        return [removeAction, insertAction];
    }

    addInstrument(config) {
        if(typeof config !== 'object')
            config = {
                url: config
            };

        const instrumentList = this.songData.instruments;
        const instrumentID = instrumentList.length;

        return this.replaceDataPath(`instruments.${instrumentID}`, config);
    }

    removeInstrument(instrumentID) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        return this.replaceDataPath(`instruments.${instrumentID}`);
    }

    replaceInstrumentParam(instrumentID, paramName, paramValue) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        return this.replaceDataPath(`instrument.${instrumentID}.{$paramName}`, paramValue);
    }


    replaceInstrumentParams(instrumentID, replaceParams) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        const actionList = [];
        for(const paramName in replaceParams) {
            if(replaceParams.hasOwnProperty(paramName)) {
                const paramValue = replaceParams[paramName];
                const historyAction = this.replaceInstrumentParam(instrumentID, paramName, paramValue);
                actionList.push(historyAction);
            }
        }

        return actionList;
    }
}