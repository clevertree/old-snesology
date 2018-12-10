
((INCLUDE_CSS) => {
    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
})("editor/music-editor.css");

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
    }
    get grid() { return this.querySelector('music-editor-grid'); }
    get menu() { return this.querySelector('music-editor-menu'); }
    get instruments() { return this.querySelectorAll(`music-editor-instrument`); }

    connectedCallback() {
        
        this.addEventListener('song:start', this.onSongEvent);
        this.addEventListener('song:end', this.onSongEvent);
        this.addEventListener('song:pause', this.onSongEvent);
        this.addEventListener('instrument:initiated', this.onSongEvent);
        document.addEventListener('instrument:instance', this.onSongEvent.bind(this));


        this.player = document.createElement('music-player');
        // this.songData = this.player.getSongData();
        // const onInstrumentEvent = this.onInstrumentEvent.bind(this);
        // playerElement.addEventListener('instrument:initiated', onInstrumentEvent);

        const uuid = this.getAttribute('uuid');
        if(uuid)
            this.initWebSocket(uuid);
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

        this.addEventListener('submit', this.onSubmit);
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('blur', this.onSubmit);
        // this.addEventListener('keydown', this.onInput);
        this.addEventListener('mousedown', this.onInput);
        this.render();

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

    // Input

    // profileInput(e) {
    //     e = e || {};
    //     return {
    //         gridClearSelected: !e.ctrlKey && !e.shiftKey,
    //         gridToggleAction: e.key === ' ' || (!e.shiftKey && !e.ctrlKey) ? 'toggle' : (e.ctrlKey && e.type !== 'mousedown' ? null : 'add'),
    //         gridCompleteSelection: e.shiftKey
    //     };
    // }

    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {
            // case 'keydown':
            //     switch(e.key) {
            //         case 'Tab': break;
            //         case ' ': this.player.play(); e.preventDefault(); break;
            //         case 'Escape': this.grid.focus(); break;
            //         default:
            //     }
            //     break;

            case 'mousedown':
                const dataCommand = e.target.getAttribute('data-command');
                if(dataCommand) {
                    this.onMenu(e);

                    // if(menuItem.nextElementSibling
                    //     && menuItem.nextElementSibling.classList.contains('submenu')) {
                    //     const submenu = menuItem.nextElementSibling;
                    //     if(submenu.getAttribute('data-submenu-content')) {
                    //         const targetClass = submenu.getAttribute('data-submenu-content');
                    //         submenu.innerHTML = this.getElementsByClassName(targetClass)[0].innerHTML;
                    //     }
                    //     // let subMenu = menuItem.nextElementSibling;
                    //     const isOpen = menuItem.classList.contains('open');
                    //     this.querySelectorAll('.menu-item.open,.submenu.open').forEach(elm => elm.classList.remove('open'));
                    //     let parentMenuItem = menuItem;
                    //     while(parentMenuItem && parentMenuItem.classList.contains('menu-item')) {
                    //         parentMenuItem.classList.toggle('open', !isOpen);
                    //         parentMenuItem = parentMenuItem.parentNode.parentNode.previousElementSibling;
                    //     }
                    //     return;
                    // }
                }
                this.menu.closeMenu();
                break;

            default:
                console.error("Unhandled " + e.type, e);
        }
    }

    onSubmit(e) {
        let form = e.target;
        switch(e.type) {
            case 'change':
            case 'blur':
                form = e.target.form;
                if(!form || !form.classList.contains('submit-on-' + e.type))
                    return;
                break;
        }
        e.preventDefault();
        // try {
        const command = form.getAttribute('data-command');
        const cursorPosition = this.grid.cursorPosition;
        const currentGroup = this.grid.groupName;
        const selectedIndices = this.grid.selectedIndices;
        const selectedPauseIndices = this.grid.selectedPauseIndices;
        const selectedRange = this.grid.selectedRange;

        switch (command) {

            case 'instruction:insert':
                const newInstruction = {
                    command: form.command.value,
                    duration: parseFloat(form['duration'].value),
                };
                if(form['duration'].value)
                    newInstruction['instrument'] = parseInt(form['duration'].value);
                // newInstruction.command = this.keyboardLayout[e.key];
                this.insertInstructionAtPosition(currentGroup, cursorPosition, newInstruction);
                break;

            case 'instruction:command':
                if(form['command'].value === '') {
                    form['command'].focus();
                    return;
                }
                this.replaceInstructionParam(currentGroup, selectedIndices, 'command', form['command'].value);
                break;

            case 'instruction:instrument':
                let instrumentID = form.instrument.value === '' ? null : parseInt(form.instrument.value);
                this.replaceInstructionParam(currentGroup, selectedIndices, 'instrument', instrumentID);
                break;

            case 'instruction:duration':
                const duration = form.duration.value || null;
                this.replaceInstructionParam(currentGroup, selectedIndices, 'duration', duration);
                break;

            case 'instruction:velocity':
                const velocity = form.velocity.value === "0" ? 0 : parseInt(form.velocity.value) || null;
                this.replaceInstructionParam(currentGroup, selectedIndices, 'velocity', velocity);
                break;

            case 'instruction:remove':
                this.deleteInstructionAtIndex(currentGroup, selectedIndices);
                break;

            case 'row:edit':
                this.replaceInstructionParams(currentGroup, selectedPauseIndices, {
                    command: '!pause',
                    duration: parseFloat(form.duration.value)
                });
                // this.gridSelect([instruction]);
                break;

            case 'row:duplicate':
                if (!selectedRange)
                    throw new Error("No selected range");
                this.duplicateInstructionRange(currentGroup, selectedRange[0], selectedRange[1]);
                break;


            case 'group:edit':
                if (form.groupName.value === ':new') {
                    let newGroupName = this.generateInstructionGroupName(currentGroup);
                    newGroupName = prompt("Create new instruction group?", newGroupName);
                    if (newGroupName) this.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                    else console.error("Create instruction group canceled");
                } else {
                    this.gridNavigate(form.groupName.value);
                }
                break;

            case 'song:edit':
                const song = this.getSongData();
                // songData.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
                song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
                song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
                this.render();
                // this.gridSelect(e, 0);
                break;

            case 'song:play':
                this.player.play();
                break;
            case 'song:pause':
                this.player.pause();
                break;
            case 'song:playback':
                console.log(e.target);
                break;

            case 'song:volume':
                this.player.setVolume(parseInt(form['volume'].value));
                break;

            case 'grid:duration':
                this.grid.render();
                break;

            case 'grid:instrument':
                this.grid.render();
                break;

            case 'song:add-instrument':
                const instrumentURL = form['instrumentURL'].value;
                form['instrumentURL'].value = '';
                if(confirm(`Add Instrument to Song?\nURL: ${instrumentURL}`)) {
                    this.addInstrument(instrumentURL);
                    this.render();
                } else {
                    console.info("Add instrument canceled");
                }
//                     this.fieldAddInstrumentInstrument.value = '';
                break;

            case 'song:set-title':
                this.setSongTitle(form['title'].value);
                break;

            case 'song:set-version':
                this.setSongVersion(form['version'].value);
                break;

            default:
                console.warn("Unhandled " + e.type + ": ", command);
                break;
        }
        // } catch (e) {
        //     this.onError(e);
        // }
    }

    onMenu(e) {
        const cursorIndex = this.grid.cursorPosition;
        const currentGroup = this.grid.groupName;
        const instructionList = this.grid.instructionList;
        const cursorInstruction = instructionList[cursorIndex];

        const dataCommand = e.target.getAttribute('data-command');
        if(!dataCommand)
            return;
        console.info("Menu Click: " + dataCommand, e);
        e.preventDefault();
        switch(dataCommand) {

            case 'save:memory':
                this.saveSongToMemory();
                break;
            case 'save:file':
                this.saveSongToFile();
                break;
            case 'load:memory':
                this.loadSongFromMemory(e.target.getAttribute('data-guid'));
                break;

            case 'group:add':
                let newGroupName = this.generateInstructionGroupName(currentGroup);
                newGroupName = prompt("Create new instruction group?", newGroupName);
                if(newGroupName)    this.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                else                console.error("Create instruction group canceled");
                break;

            case 'group:remove':
                this.removeInstructionGroup(currentGroup);
                break;

            case 'group:rename':
                let renameGroupName = prompt("Rename instruction group?", currentGroup);
                if(renameGroupName)     this.renameInstructionGroup(currentGroup, renameGroupName);
                else                    console.error("Rename instruction group canceled");
                break;

            case 'instruction:insert':
                const newInstruction = {
                    // type: 'note',
                    instrument: 0,
                    command: 'C4',
                    duration: 1
                }; // new instruction
                // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
                this.insertInstructionAtIndex(currentGroup, cursorIndex, newInstruction);
                break;

            case 'instruction:command':
                const newCommand = prompt("Set Command:", cursorInstruction.command);
                if(newCommand !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    command: newCommand
                });
                else                    console.error("Set instruction command canceled");
                break;

            case 'instruction:duration':
                const newDuration = prompt("Set Duration:", typeof cursorInstruction.duration === 'undefined' ? 1 : cursorInstruction.duration);
                if(newDuration < 0) throw new Error("Invalid duration value");
                if(newDuration !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    duration: newDuration
                });
                else                    console.error("Set instruction duration canceled");
                break;

            case 'instruction:velocity':
                const newVelocity = prompt("Set Velocity:", typeof cursorInstruction.velocity === 'undefined' ? 100 : cursorInstruction.velocity);
                if(newVelocity < 0 || newVelocity > 100) throw new Error("Invalid velocity value");
                if(newVelocity !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    velocity: newVelocity
                });
                else                    console.error("Set instruction velocity canceled");
                break;

            case 'menu:toggle':
                // this.querySelectorAll('a.open').forEach((a) => a !== e.target ? a.classList.remove('open') : null);
                // e.target.classList.toggle('open');
                break;
            default:
                console.warn("Unknown menu command: " + dataCommand);
        }
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
        const wsURL = window.origin.replace(/^http/i, 'ws') + '/editor/' + (uuid || '');
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
                                const songRecentUUIDs = JSON.parse(localStorage.getItem('editor-recent-uuid') || '{}');
                                songRecentUUIDs[songModifier.songData.uuid] = songModifier.songData.title || `Untitled`;
                                localStorage.setItem('editor-recent-uuid', JSON.stringify(songRecentUUIDs));
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

    
    getKeyboardCommand(key) {
        if(typeof this.keyboardLayout[key] === 'undefined')
            return null;
        const octave = parseInt(this.menu.fieldRenderOctave.value) || 1;
        let command = this.keyboardLayout[key];
        command = command.replace('2', octave+1);
        command = command.replace('1', octave);
        return command;
    }

    getAudioContext() { return this.player.getAudioContext(); }
    getSongData() { return this.player.getSongData(); }


    loadSongUUID(uuid) {
        this.setAttribute('uuid', uuid);
        this.initWebSocket(uuid);

        const songRecentUUIDs = JSON.parse(localStorage.getItem('editor-recent-uuid') || '{}');
        if(typeof songRecentUUIDs[uuid] === 'undefined') {
            songRecentUUIDs[uuid] = `New Song (${new Date().toJSON().slice(0, 10).replace(/-/g, '/')})`;
            localStorage.setItem('editor-recent-uuid', JSON.stringify(songRecentUUIDs));
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

        if(this.webSocket && historyActions.length > 0) {
            console.info("Sending history actions: ", historyActions);
            this.webSocket
                .send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: historyActions,
                    // uuid: this.uuid
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

    setSongTitle(newSongTitle) { return this.setSongField('title', newSongTitle); }
    setSongVersion(newSongTitle) { return this.setSongField('version', newSongTitle); }

    setSongField(fieldName, fieldValue) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.replaceDataPath(fieldName, fieldValue);
        this.historyQueue(songModifier.clearHistoryActions());
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

    replaceInstructionParam(groupName, replaceIndices, paramName, paramValue) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];
        const songModifier = new MusicEditorSongModifier(this.getSongData());

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = songModifier.songData.instructions[groupName][replaceIndices[i]];
            if(paramName === 'command')
                paramValue = this.getCommandAlias(replaceInstruction.instrument, paramValue);
            oldParams.push(songModifier.replaceInstructionParam(groupName, replaceIndices[i], paramName, paramValue));
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
        this.innerHTML = `
            <music-editor-menu></music-editor-menu>
            <music-editor-grid tabindex="1"></music-editor-grid>
            <music-editor-instrument-list></music-editor-instrument-list>`;
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

    /** Form Options **/

    getEditorFormOptions(optionType, callback) {
        let optionsHTML = '';
        const songData = this.getSongData() || {};

        switch(optionType) {
            case 'recent-uuid':
            case 'local-uuid':
                const songRecentUUIDs = JSON.parse(localStorage.getItem('editor-' + optionType) || '{}');
                for(const songRecentUUID in songRecentUUIDs)
                    if(songRecentUUIDs.hasOwnProperty(songRecentUUID))
                        optionsHTML += callback(songRecentUUID, songRecentUUIDs[songRecentUUID]);
                break;

            case 'instruments-songs':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID];
                        // const instrument = this.player.getInstrument(instrumentID);
                        optionsHTML += callback(instrumentID, this.format(instrumentID, 'instrument')
                            + ': ' + (instrumentInfo.name ? instrumentInfo.name : instrumentInfo.url.split('/').pop()));
                    }
                }
                break;

            case 'instruments-available':
                if(this.status.instrumentLibrary) {
                    const instrumentLibrary = this.status.instrumentLibrary;
                    Object.keys(instrumentLibrary.index).forEach((path) => {
                        let pathConfig = instrumentLibrary.index[path];
                        if (typeof pathConfig !== 'object') pathConfig = {title: pathConfig};
                        optionsHTML += callback(instrumentLibrary.baseURL + path, pathConfig.title + " (" + instrumentLibrary.baseURL + path + ")");
                    });
                }
                break;

            case 'command-instrument-frequencies':
                for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                    if(this.player.isInstrumentLoaded(instrumentID)) {
                        const instance = this.player.getInstrument(instrumentID);
                        if(instance.getFrequencyAliases) {
                            const aliases = instance.getFrequencyAliases();
                            Object.keys(aliases).forEach((aliasName) =>
                                optionsHTML += callback(aliasName, aliasName, `data-instrument="${instrumentID}"`));
                        }
                    }
                }
                break;

            case 'command-frequencies':
            case 'frequencies':
                const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                for(let i=1; i<=6; i++) {
                    for(let j=0; j<instructions.length; j++) {
                        const instruction = instructions[j] + i;
                        optionsHTML += callback(instruction, instruction);
                    }
                }
                break;

            case 'command-frequency-octaves':
                for(let oi=1; oi<=7; oi+=1) {
                    optionsHTML += callback(oi, 'Octave ' + oi);
                }
                break;

            case 'velocities':
                // optionsHTML += callback(null, 'Velocity (Default)');
                for(let vi=100; vi>=0; vi-=10) {
                    optionsHTML += callback(vi, vi);
                }
                break;

            case 'durations':
                optionsHTML += callback(1/64, '1/64');
                optionsHTML += callback(1/32, '1/32');
                optionsHTML += callback(1/16, '1/16');
                optionsHTML += callback(1/8,  '1/8');
                optionsHTML += callback(1/4,  '1/4');
                optionsHTML += callback(1/2,  '1/2');
                for(let i=1; i<=16; i++)
                    optionsHTML += callback(i, i+'B');
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    optionsHTML += callback(vi, vi + ` beat${vi>1?'s':''} per measure`);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    optionsHTML += callback(vi, vi+ ` beat${vi>1?'s':''} per minute`);
                }
                break;

            case 'groups':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback(key, key);
                    });
                break;

            case 'command-group-execute':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback('@' + key, '@' + key);
                    });
                break;
        }
        return optionsHTML;
    }




    renderEditorMenuLinks(optionType, selectCallback) {
        let optionsHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, html) {
            const selected = selectCallback ? selectCallback(value) : false;
            optionsHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}${html}>${label}</option>`;
        });
        return optionsHTML;
    }

    renderEditorFormOptions(optionType, selectCallback) {
        let optionsHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, html) {
            const selected = selectCallback ? selectCallback(value) : false;
            optionsHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}${html}>${label}</option>`;
        });
        return optionsHTML;
    }

}
customElements.define('music-editor', MusicEditorElement);