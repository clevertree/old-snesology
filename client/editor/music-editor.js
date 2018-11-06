
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class MusicEditorElement extends HTMLElement {
    constructor() {
        super();
        this.player = null;
        this.keyboardLayout = {
            '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
            'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
            's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
            'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
        };
        this.status = {
            grids: [{groupName: 'root', cursorPosition: 0, selectedPositions: []}],
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

    }
    connectedCallback() {
        const playerElement = document.createElement('music-player');
        this.player = playerElement;
        const onSongEvent = this.onSongEvent.bind(this);
        playerElement.addEventListener('note:end', onSongEvent);
        playerElement.addEventListener('note:start', onSongEvent);
        playerElement.addEventListener('song:start', onSongEvent);
        playerElement.addEventListener('song:playback', onSongEvent);
        playerElement.addEventListener('song:end', onSongEvent);
        playerElement.addEventListener('song:pause', onSongEvent);

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

    get gridStatus() { return this.status.grids[0]; }
    get gridCursorPosition() { return this.gridStatus.cursorPosition; }
    get gridCurrentGroup() { return this.gridStatus.groupName; }
    get gridInstructionList() { return this.player.getInstructions(this.gridCurrentGroup); }
    get gridSelectedPositions() { return this.gridStatus.selectedPositions; }
    get gridSelectedPausePositions() {
        const instructionList = this.gridInstructionList;
        const selectedPositions = this.gridSelectedPositions;
        const selectedPausePositions = [];
        for(let i=0; i<selectedPositions.length; i++) {
            const selectedPosition = selectedPositions[i];
            let nextPausePosition = instructionList.findIndex((i, p) => i.command === '!pause' && p >= selectedPosition);
            if(nextPausePosition === -1) {
                console.warn("no pauses follow selected instruction");
                continue;
            }
            if(selectedPausePositions.indexOf(nextPausePosition) === -1)
                selectedPausePositions.push(nextPausePosition);
        }
        return selectedPausePositions;
    }

    get gridSelectedRange() {
        const instructionList = this.gridInstructionList;
        let selectedPositions = this.gridSelectedPositions;
        selectedPositions = selectedPositions.concat().sort((a,b) => a - b);

        let currentPosition = selectedPositions[0];
        for(let i=0; i<selectedPositions.length; i++) {
            if(currentPosition !== selectedPositions[i])
                return false;
            currentPosition++;
        }
        if(instructionList.length > currentPosition
            && instructionList[currentPosition].command !== '!pause'
            && instructionList[currentPosition+1].command === '!pause') {
            currentPosition++;
        }
        return [selectedPositions[0], currentPosition];
    }
    getAudioContext() { return this.player.getAudioContext(); }
    getSong() { return this.player ? this.player.getSong() : null; }

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
                                    this.gridSelect(e, 0);
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
        const song = this.getSong();
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
        const song = this.getSong();
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
        this.gridSelect(null, 0);
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

    // deleteInstructions(deletePositions) {
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

    gridFindInstruction(instruction) {
        let grids = this.querySelectorAll('music-editor-grid');
        for(let i=0; i<grids.length; i++) {
            const instructionElm = grids[i].findInstruction(instruction);
            if(instructionElm)
                return instructionElm;
        }
        return null;
    }

    // Edit song functions

    historyQueue(historyAction) {
        this.status.history.currentStep++;
        historyAction.step = this.status.history.currentStep;

        this.status.history.undoList.push(historyAction);
        this.status.history.undoPosition = this.status.history.undoList.length-1;

        console.info("Sending history action: " + historyAction.step, historyAction);
        this.webSocket
            .send(JSON.stringify({
                type: 'history:entry',
                historyAction: historyAction,
                path: this.getSongURL()
            }))
    }

    historyUndo() {

    }

    historyRedo() {

    }

    insertInstructions(groupName, insertPosition, instructionsToAdd) {
        if(typeof insertPosition === 'undefined')
            insertPosition = this.player.getInstructions(groupName).length;
        this.player.insertInstructions(groupName, insertPosition, instructionsToAdd);
        const historyAction = {
            action: 'insert',
            params: [groupName, insertPosition, instructionsToAdd]
        };
        this.historyQueue(historyAction);
        this.grid.render();
        this.gridSelect(null, [insertPosition]);
        return insertPosition;
    }

    deleteInstructions(groupName, deletePositions) {
        const actions = [];
        for(let i=deletePositions.length-1; i>=0; i--) {
            const deletePosition = deletePositions[i];
            const deletedInstruction = this.player.replaceInstruction(groupName, deletePosition, 1);
            actions.push({
                action: 'delete',
                params: [groupName, deletePosition],
                return: deletedInstruction
            });
        }
        this.historyQueue({
            action: 'group',
            params: actions
        });

        this.grid.render();
    }

    replaceInstructionParams(groupName, replacePositions, replaceParams) {
        if(!Array.isArray(replacePositions))
            replacePositions = [replacePositions];
        const historyActions = {action: 'group', params: []};
        for(let i=0; i<replacePositions.length; i++) {
            const replacePosition = replacePositions[i];
            const oldParams = this.player.replaceInstructionParams(groupName, replacePosition, replaceParams);
            const historyAction = {
                action: 'params',
                params: [groupName, replacePositions, replaceParams],
                return: oldParams
            };
            historyActions.params.push(historyAction);
        }
        if(historyActions.params.length <= 1)
            this.historyQueue(historyActions.params[0]);
        else
            this.historyQueue(historyActions);

        this.grid.render();
    }

    splitInstructionRows(groupName, splitPausePositions, splitPercentage) {
        if(splitPercentage < 1 || splitPercentage > 100)
            throw new Error("Invalid split percentage: " + splitPercentage);
        if(!Array.isArray(splitPausePositions))
            splitPausePositions = [splitPausePositions];

        const split = [(splitPercentage / 100), ((100 - splitPercentage) / 100)];
        const instructionList = this.player.getInstructions(groupName);
        const historyActions = {action: 'group', params: []};
        for(let i=splitPausePositions.length-1; i>=0; i--) {
            const splitPausePosition = splitPausePositions[i];
            const splitPauseDuration = instructionList[splitPausePosition].duration;
            const splitParams = {
                duration: split[0] * splitPauseDuration
            };
            const oldParams = this.player.replaceInstructionParams(groupName, splitPausePosition, splitParams);
            historyActions.params.push({
                action: 'params',
                params: [groupName, splitPausePosition, splitParams],
                return: oldParams
            });
            const newPauseInstruction = {
                command: '!pause',
                duration: split[1] * splitPauseDuration
            };
            this.player.insertInstructions(groupName, splitPausePosition+1, newPauseInstruction);
            historyActions.params.push({
                action: 'insert',
                params: [groupName, splitPausePosition+1, newPauseInstruction]
            });
        }
        if(historyActions.params.length <= 1)
            this.historyQueue(historyActions.params[0]);
        else
            this.historyQueue(historyActions);
        this.grid.render();
    }

    duplicateInstructionRange(groupName, rangeStart, rangeEnd) {
        const instructionList = this.player.getInstructions(groupName);
        const rangeLength = rangeEnd - rangeStart;
        if(rangeLength < 0)
            throw new Error("Invalid range: " + rangeStart + " !=< " + rangeEnd);
        const newInstructions = [];
        for (let i=0; i<=rangeLength; i++) {
            const currentInstruction = instructionList[rangeStart + i];
            const newInstruction = Object.assign({}, currentInstruction);
            newInstructions.push(newInstruction);
        }
        const historyActions = {
            action: 'insert',
            params: [groupName, rangeEnd + 1, newInstructions]
        };
        this.historyQueue(historyActions);
        this.applyHistoryActions(historyActions, () => this.grid.render());

    }

    generateInstructionGroupName(currentGroup) {
        const songData = this.player.getSong();
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

    addInstructionGroup(newGroupName, instructionList) {
        this.player.addInstructionGroup(newGroupName, instructionList);
        const historyAction = {
            action: 'group-add',
            params: [newGroupName, instructionList]
        };
        this.historyQueue(historyAction);
        this.gridNavigate(newGroupName);
    }

    removeInstructionGroup(removedGroupName) {
        const removedGroupData = this.player.removeInstructionGroup(removedGroupName);
        const historyAction = {
            action: 'group-remove',
            params: [removedGroupName],
            return: removedGroupData
        };
        this.historyQueue(historyAction);
        this.gridNavigatePop();
    }

    renameInstructionGroup(oldGroupName, newGroupName) {
        this.player.renameInstructionGroup(oldGroupName, newGroupName);
        const historyAction = {
            action: 'group-rename',
            params: [oldGroupName, newGroupName]
        };
        this.historyQueue(historyAction);
        this.gridNavigate(newGroupName);
    }

    addInstrument(instrumentURL, instrumentConfig) {
        const instrumentID = this.player.addInstrument(instrumentURL, instrumentConfig, () => {
            this.render();
        });
        const historyAction = {
            action: 'instrument-add',
            params: [instrumentURL, instrumentConfig]
        };
        this.historyQueue(historyAction);
        return instrumentID
    }

    removeInstrument(instrumentID) {
        this.player.removeInstrument(instrumentID);
        const historyAction = {
            action: 'instrument-remove',
            params: [instrumentID]
        };
        this.historyQueue(historyAction);
        this.render();
    }

    replaceInstrumentParams(instrumentID, replaceConfig) {
        const oldParams = this.player.replaceInstrumentParams(instrumentID, replaceConfig);
        if(Object.keys(oldParams).length > 0) {
            const historyAction = {
                action: 'instrument-params',
                params: [instrumentID, replaceConfig],
                return: oldParams
            };
            this.historyQueue(historyAction);
        }
        this.render();
    }

    applyHistoryActions(actionList, onActionCompleted) {
        actionList = actionList.slice(0);
        const action = actionList.shift();

        console.info("Applying historic action: ", action);

        this.status.history.undoList.push(action);
        this.status.history.undoPosition = this.status.history.undoList.length-1;
        if(typeof action.step !== "undefined")
            this.status.history.currentStep = action.step;

        const next = () => {
            if(actionList.length > 0)
                this.applyHistoryActions(actionList, onActionCompleted);
            else
                onActionCompleted();
        };
        switch (action.action) {
            case 'reset':

                this.status.history.undoList = [];
                this.status.history.undoPosition = 0;
                this.status.history.currentStep = 0;

                this.player.loadSongData(action.songContent);
                next();
                return;
                // this.render();
                // this.gridSelect(null, 0);
                // break;
            case 'insert':
                this.player.insertInstructions(action.params[0], action.params[1], action.params[2]);
                break;
            case 'delete':
                this.player.deleteInstructions(action.params[0], action.params[1], action.params[2] || 1);
                break;
            case 'replace':
                this.player.replaceInstruction(action.params[0], action.params[1], action.params[2], action.params[3]);
                break;
            case 'params':
                this.player.replaceInstructionParams(action.params[0], action.params[1], action.params[2]);
                break;
            case 'group-add':
                this.player.addInstructionGroup(action.params[0], action.params[1]);
                break;
            case 'group-remove':
                this.player.removeInstructionGroup(action.params[0]);
                break;
            case 'group-rename':
                this.player.renameInstructionGroup(action.params[0], action.params[1]);
                break;
            case 'group':
                this.applyHistoryActions(action.params, next);
                return;
            case 'instrument-add':
                this.player.addInstrument(action.params[0], action.params[1], next);
                return;
            case 'instrument-remove':
                this.player.removeInstrument(action.params[0], action.params[1]);
                break;
            case 'instrument-params':
                this.player.replaceInstrumentParams(action.params[0], action.params[1]);
                break;
            default:
                throw new Error("Unrecognized history action: " + action.action);
        }
        next();
        // this.grid.render();
    }

    undoHistoryAction(action) {
        switch (action.action) {
            case 'insert':
                this.player.deleteInstruction(action.params[0], action.params[1], 1);
                break;
            case 'delete':
                this.player.insertInstructions(action.params[0], action.params[1], action.return);
                break;
            case 'replace':
                this.player.replaceInstruction(action.params[0], action.params[1], action.params[2], action.return);
                break;
            case 'group':
                for (let i = 0; i < action.params.length; i++) {
                    this.undoHistoryAction(action.params[i]);
                }
                break;
            default:
                throw new Error("Unrecognized history action: " + action.action);
        }
    }


    // deleteInstruction(groupName, deletePosition, deleteCount) {
    //     const deletedInstructions = this.player.replaceInstruction(groupName, deletePosition, deleteCount);
    //     const historyAction = {
    //         action: 'delete',
    //         params: [groupName, deletePosition, deleteCount],
    //         return: deletedInstructions
    //     };
    //     this.historyQueue(historyAction);
    //     this.grid.render();
    //     this.gridSelect(null, [deletePosition]);
    // }

    // replaceInstruction(groupName, replacePosition, replaceCount, instructionsToAdd) {
    //     const deletedInstructions = this.player.replaceInstruction(groupName, replacePosition, replaceCount, instructionsToAdd);
    //     const historyAction = {
    //         action: 'replace',
    //         params: [groupName, replacePosition, replaceCount, instructionsToAdd],
    //         return: deletedInstructions
    //     };
    //     this.historyQueue(historyAction);
    //     this.grid.render();
    //     this.gridSelect(null, [replacePosition]);
    // }




    // Rendering

    render() {
        const song = this.getSong();
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
                if(input === 1/64) return '1/64';
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

    profileInput(e) {
        e = e || {};
        return {
            gridClearSelected: !e.ctrlKey && !e.shiftKey,
            gridToggleAction: e.key === ' ' || (!e.shiftKey && !e.ctrlKey) ? 'toggle' : (e.ctrlKey && e.type !== 'mousedown' ? null : 'add'),
            gridCompleteSelection: e.shiftKey
        };
    }

    // Grid Commands

    gridSelect(e, cursorPosition) {
        const inputProfile = this.profileInput(e);
        const gridStatus = this.gridStatus;
        cursorPosition = parseInt(cursorPosition);
        const lastCursorPosition = gridStatus.cursorPosition || 0;
        gridStatus.cursorPosition = cursorPosition;

        // Manage selected cells
        if (inputProfile.gridClearSelected)
            gridStatus.selectedPositions = [];
        let selectedPositions = gridStatus.selectedPositions;

        if(inputProfile.gridCompleteSelection) {
            let low = lastCursorPosition < cursorPosition ? lastCursorPosition : cursorPosition;
            let high = lastCursorPosition < cursorPosition ? cursorPosition : lastCursorPosition;
            for(let i=low; i<high; i++)
                if(selectedPositions.indexOf(i) === -1)
                    selectedPositions.push(i);
        } else {
            const existingSelectedPosition = selectedPositions.indexOf(cursorPosition);
            switch(inputProfile.gridToggleAction) {
                case 'toggle':
                    if(existingSelectedPosition > 0)    selectedPositions.splice(existingSelectedPosition, 1);
                    else                                selectedPositions.push(cursorPosition);
                    break;
                case 'add':
                    if(existingSelectedPosition === -1) selectedPositions.push(cursorPosition);
                    break;
            }
        }
        this.grid.updateCellSelection(gridStatus);
        this.menu.update(gridStatus);
    }

    gridNavigate(groupName, parentInstruction) {
        console.log("Navigate: ", groupName);
        const existingGrid = this.status.grids.find(obj => obj.groupName === groupName);
        if(existingGrid)
            this.status.grids.unshift(existingGrid);
        else
            this.status.grids.unshift({
                groupName: groupName,
                parentInstruction: parentInstruction,
                selectedPositions: [],
                cursorPosition: 0
            });
        this.render();
    }

    gridNavigatePop() {
        console.log("Navigate Back: ", this.status.grids[0].groupName);
        if(this.status.grids.length > 0)
            this.status.grids.shift();
        this.render();
    }

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
        const instructionElm = detail.instruction ? this.gridFindInstruction(detail.instruction) : null;
        const groupElm = detail.groupInstruction ? this.gridFindInstruction(detail.groupInstruction) : null;
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

            case 'song:start':
                this.classList.add('playing');
                break;
            case 'song:end':
            case 'song:pause':
                this.classList.remove('playing');
                break;
        }
    }

    findInstruments(callback, instrumentsObject) {
        instrumentsObject = instrumentsObject || document.instruments;
        Object.keys(instrumentsObject).forEach(function(originString) {
            const originCollection = instrumentsObject[originString];
            Object.keys(originCollection).forEach(function(instrumentPathString) {
                const instrument = originCollection[instrumentPathString];
                callback(instrument, instrumentPathString, originString);
            });
        });
    }

    // Input

}
customElements.define('music-editor', MusicEditorElement);
