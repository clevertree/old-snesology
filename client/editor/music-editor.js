
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

(function() {
    const DEFAULT_GROUP = 'root';
    const DEFAULT_LONG_PRESS_TIMEOUT = 500;
    const DEFAULT_WEBSOCKET_RECONNECT = 3000;
    const DEFAULT_WEBSOCKET_ATTEMPTS = 3;

    class MusicEditorElement extends HTMLElement {
        constructor() {
            super();
            this.player = null;
            this.config = DEFAULT_CONFIG;
            this.keyboardLayout = DEFAULT_KEYBOARD_LAYOUT;
            this.status = {
                grids: [{groupName: DEFAULT_GROUP, cursorPosition: 0, selectedPositions: []}],
                history: {
                    currentStep: 0,
                    undoList: [],
                    undoPosition: []
                },
            };
            this.webSocket = null;
            this.webSocketAttempts = 0;
            this.initialSongJSON = null; // TODO: refactor
        }
        get grid() { return this.querySelector('music-editor-grid'); }
        get gridStatus() { return this.status.grids[0]; }
        get menu() { return this.querySelector('music-editor-menu'); }

        getAudioContext() { return this.player.getAudioContext(); }
        getSong() { return this.player.getSong(); }
        getSongURL() { return this.getAttribute('src');}

        connectedCallback() {
            // this.render();

            // this.addEventListener('contextmenu', this.onInput);
            this.addEventListener('keydown', this.onInput);
            // this.addEventListener('keyup', this.onInput);
            // this.addEventListener('click', this.onInput);
            // this.addEventListener('mousedown', this.onInput);
            // this.addEventListener('mouseup', this.onInput);
            // this.addEventListener('longpress', this.onInput);
            // this.addEventListener('change', this.onInput);
            // this.addEventListener('submit', this.onInput);

            const editor = this;
            loadScript('client/player/music-player.js', function() {

                const playerElement = document.createElement('music-player');
                editor.player = playerElement;
                const onSongEvent = editor.onSongEvent.bind(editor);
                playerElement.addEventListener('note:end', onSongEvent);
                playerElement.addEventListener('note:start', onSongEvent);
                playerElement.addEventListener('song:start', onSongEvent);
                playerElement.addEventListener('song:playback', onSongEvent);
                playerElement.addEventListener('song:end', onSongEvent);
                playerElement.addEventListener('song:pause', onSongEvent);

                if(editor.getSongURL())
                    playerElement.loadSongFromURL(editor.getSongURL(), function(songJSON) {
                        editor.initialSongJSON = JSON.stringify(songJSON); // TODO: ugly
                        editor.render();
                        editor.gridSelect(null, 0);

                        // Load recent
                        // const recentSongGUIDs = JSON.parse(localStorage.getItem('share-editor-saved-list') || '[]');
                        // if(recentSongGUIDs.length > 0)
                        //     editor.loadSongFromMemory(recentSongGUIDs[0]);

                        editor.getWebSocket(); // Init websocket
                    });
            });
        }

        getWebSocket() {
            if(this.webSocket)
                return this.webSocket;

            if (!"WebSocket" in window)
                throw new Error("WebSocket is supported by your Browser!");

            // Let us open a web socket
            var ws = new WebSocket(
                (location.protocol === 'https:' ? "wss://" : "ws://")
                + document.location.hostname + ":" + document.location.port);
            const onWebSocketEvent = this.onWebSocketEvent.bind(this);
            ws.addEventListener('open', onWebSocketEvent);
            ws.addEventListener('message', onWebSocketEvent);
            ws.addEventListener('close', onWebSocketEvent);
            this.webSocket = ws;
            return ws;
        }

        onWebSocketEvent(e) {
            // console.info("WS " + e.type, e);
            switch(e.type) {
                case 'open':
                    e.target
                        .send(JSON.stringify({
                            type: 'history:register',
                            path: this.getSongURL()
                            // historyStep:
                        }));
                    this.webSocketAttempts = 0;
                    // e.target.send("WELCOME");
                    break;
                case 'close':
                    this.webSocketAttempts++;
                    if(this.webSocketAttempts <= DEFAULT_WEBSOCKET_ATTEMPTS) {
                        setTimeout(function () {
                            this.webSocket = null;
                            this.getWebSocket();
                        }.bind(this), DEFAULT_WEBSOCKET_RECONNECT);
                        console.info("Reopening WebSocket in " + (DEFAULT_WEBSOCKET_RECONNECT/1000) + ' seconds (' + this.webSocketAttempts + ')' );
                    } else {
                        console.info("Giving up on WebSocket");
                    }

                    break;
                case 'message':
                    if(e.data[0] === '{') {
                        const json = JSON.parse(e.data);
                        switch(json.type) {
                            case 'history:entry':
                                for (let i = 0; i < json.historyActions.length; i++) {
                                    const historyAction = json.historyActions[i];
                                    this.applyHistoryAction(historyAction);
                                    this.status.history.undoList.push(historyAction);
                                    this.status.history.undoPosition = this.status.history.undoList.length-1;
                                    if(typeof historyAction.step !== "undefined")
                                        this.status.history.currentStep = historyAction.step;
                                }
                                this.render();
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
            if(songList.indexOf(song.source) === -1)
                songList.push(song.source);
            console.log("Saving song: ", song, songList);
            localStorage.setItem('song:' + song.source, JSON.stringify(song));
            localStorage.setItem('share-editor-saved-list', JSON.stringify(songList));
            this.menu.render();
            // this.querySelector('.editor-menu').outerHTML = renderEditorMenuContent(this);
            console.info("Song saved to memory: " + song.source, song);
        }

        saveSongToFile() {
            const song = this.getSong();
            const jsonString = JSON.stringify(song, null, "\t");
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", song.source.split('/').reverse()[0]);
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
        //     return this.gridStatus.selectedPositions.map(p => instructionList[p]);
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

            this.getWebSocket()
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

        insertInstruction(groupName, insertPosition, instructionsToAdd) {
            if(typeof insertPosition === 'undefined')
                insertPosition = this.player.getInstructions(groupName).length;
            this.player.replaceInstruction(groupName, insertPosition, 0, instructionsToAdd);
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

        applyHistoryAction(action) {
            switch (action.action) {
                case 'reset':
                    this.player.loadSongData(action.songContent);
                    this.render();
                    this.gridSelect(null, 0);
                    break;
                case 'insert':
                    this.player.replaceInstruction(action.params[0], action.params[1], 0, action.params[2]);
                    break;
                case 'delete':
                    this.player.replaceInstruction(action.params[0], action.params[1], 1);
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
                    for (let i = 0; i < action.params.length; i++) {
                        this.applyHistoryAction(action.params[i]);
                    }
                    break;
                default:
                    throw new Error("Unrecognized history action: " + action.action);
            }
            this.grid.render();
        }

        undoHistoryAction(action) {
            switch (action.action) {
                case 'insert':
                    this.player.deleteInstruction(action.params[0], action.params[1], 1);
                    break;
                case 'delete':
                    this.player.insertInstruction(action.params[0], action.params[1], action.return);
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
            this.innerHTML = `
                <div class="music-editor">
                    <music-editor-menu></music-editor-menu>
                    <music-editor-grid tabindex="1">
                    </music-editor-grid>
                </div>
            `;
        }

        // Grid Commands

        gridSelect(e, cursorPosition) {
            const inputProfile = profileInput(e);
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
            const associatedElement = this.grid.findInstruction(instruction);
            return this.player.playInstruction(
                instruction,
                this.player.getAudioContext().currentTime,
                this.player.getStartingBeatsPerMinute(),
                function (playing) {
                    associatedElement && associatedElement.classList.toggle('playing', playing);
                }.bind(this),
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
                    this.querySelector('.music-editor').classList.add('playing');
                    break;
                case 'song:end':
                case 'song:pause':
                    this.querySelector('.music-editor').classList.remove('playing');
                    break;
            }
        }


        // Input

    }

    class MusicEditorGridElement extends HTMLElement {
        constructor() {
            super();
            this.longPressTimeout = null;
        }

        get editor() { return this.parentNode.parentNode; }

        // get selectedCells() { return this.querySelectorAll('.grid-cell.selected'); }
        get currentCell() { return this.querySelector('.grid-cell.cursor') || this.querySelector('.grid-cell.selected'); }
        // get currentCellPosition() { return parseInt(this.currentCell.getAttribute('data-position')); }

        get nextCell() {
            let target = this.currentCell;
            while(target.nextElementSibling) {
                target = target.nextElementSibling;
                if(target.classList.contains('grid-cell'))
                    return target;
            }
            const nextRow = this.currentCell.parentNode.nextElementSibling;
            if(!nextRow)
                return null;
            return nextRow.querySelector('.grid-cell');
        }
        get previousCell() {
            let target = this.currentCell;
            while(target.previousElementSibling) {
                target = target.previousElementSibling;
                if(target.classList.contains('grid-cell'))
                    return target;
            }
            const previousRow = this.currentCell.parentNode.previousElementSibling;
            if(!previousRow)
                return null;
            const children = previousRow.querySelectorAll('.grid-cell');
            return children[children.length-1];
        }

        get nextRowCell() {
            let currentCell = this.currentCell;
            if(!currentCell)
                return null;
            const column = Array.from(currentCell.parentNode.childNodes).indexOf(currentCell);

            let currentRow = currentCell.parentNode;
            if(!currentRow.nextElementSibling)
                return null;
            let nextRow = currentRow.nextElementSibling,
                nextCell = nextRow.firstElementChild;

            for(let i=0; i<column; i++) {
                if(!nextCell.nextElementSibling)                                    break;
                if(!nextCell.nextElementSibling.classList.contains('grid-cell'))    continue;
                nextCell = nextCell.nextElementSibling;
            }
            return nextCell;
        }

        get previousRowCell() {
            let currentCell = this.currentCell;
            const column = Array.from(currentCell.parentNode.childNodes).indexOf(currentCell);
            let currentRow = currentCell.parentNode;
            if(!currentRow.previousElementSibling)
                return null;
            let previousRow = currentRow.previousElementSibling,
                previousCell = previousRow.firstElementChild;

            for(let i=0; i<column; i++) {
                if(!previousCell.nextElementSibling)                                    break;
                if(!previousCell.nextElementSibling.classList.contains('grid-cell'))    continue;
                previousCell = previousCell.nextElementSibling;
            }
            return previousCell;
        }

        connectedCallback() {
            this.addEventListener('contextmenu', this.onInput);
            this.addEventListener('keydown', this.onInput);
            // this.addEventListener('keyup', this.onInput.bind(this));
            // this.addEventListener('click', this.onInput.bind(this));
            this.addEventListener('mousedown', this.onInput);
            this.addEventListener('mouseup', this.onInput);
            this.addEventListener('longpress', this.onInput);
            this.render();
        }

        onInput(e) {
            if (e.defaultPrevented)
                return;

            // const cursorPositions = this.selectedPositions;
            // const initialCursorPosition = cursorPositions[0];
            // const currentCursorPosition = cursorPositions[cursorPositions.length - 1];

            // const editor = this.editor;

            switch (e.type) {
                case 'keydown':

                    let keyEvent = e.key;
                    if (this.editor.keyboardLayout[e.key])
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    let keydownCellElm = this.currentCell;

                    if (keydownCellElm.classList.contains('grid-cell-new')) {
                        let insertPosition = parseInt(keydownCellElm.getAttribute('data-position'));
                        // let newInstruction = null;
                        // let duration = parseFloat(this.currentRow.getAttribute('data-duration'));
                        switch (keyEvent) {
                            case 'Enter':
                            case 'PlayFrequency':
                                let newInstruction = {
                                    // instrument: this.editor.querySelector('form.form-instruction-instrument').instrument.value,
                                    command: this.editor.keyboardLayout[e.key]
                                        || this.editor.querySelector('form.form-instruction-command').command.value || 'C4',
                                    // duration: duration
                                }; // new instruction
                                if(this.editor.querySelector('form.form-instruction-instrument').instrument.value)
                                    newInstruction.instrument = parseInt(this.editor.querySelector('form.form-instruction-instrument').instrument.value);
                                if(this.editor.querySelector('form.form-instruction-duration').duration.value)
                                    newInstruction.duration = this.editor.querySelector('form.form-instruction-duration').duration.value;
                                if(newInstruction) {
                                    this.insertInstruction(newInstruction, insertPosition);
                                    this.render();
                                    this.editor.gridSelect(e, insertPosition);
                                }
                                break;
                        }
                    }

                    let cursorPosition = this.editor.gridStatus.cursorPosition;
                    const currentGroup = this.getGroupName();
                    const instructionList = this.editor.player.getInstructions(currentGroup);
                    let cursorInstruction = instructionList[cursorPosition];
                    switch (keyEvent) {
                        case 'Delete':
                            this.editor.deleteInstructions(this.getGroupName(), this.editor.gridStatus.selectedPositions);
                            e.preventDefault();
                            // editor.render(true);
                            break;
                        case 'Escape':
                        case 'Backspace':
                            this.editor.gridNavigatePop();
                            this.editor.gridSelect(e, 0);
                            this.editor.grid.focus();
                            e.preventDefault();
                            break;
                        case 'Enter':
                            if (cursorInstruction.command[0] === '@') {
                                const groupName = cursorInstruction.command.substr(1);
                                this.editor.gridNavigate(groupName, cursorInstruction);
                                //this.editor.gridSelect(e, 0);
                                //this.editor.grid.focus();
                            } else {
                                this.editor.playInstruction(cursorInstruction);
                            }
                            e.preventDefault();
                            break;

                        case 'Play':
                            this.editor.playInstruction(cursorInstruction);
                            e.preventDefault();
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            if(!this.nextCell) {
                                let nextRowPosition = this.insertInstruction({
                                    command: '!pause',
                                    pause: parseFloat(this.currentCell.parentNode.getAttribute('data-pause'))
                                }); // insertPosition
                                this.render();
                                this.editor.gridSelect(e, nextRowPosition);

                            } else {
                                this.selectCell(e, this.nextCell);
                            }
                            // this.focus();
                            e.preventDefault();
                            break;

                        case 'ArrowLeft':
                            this.previousCell && this.selectCell(e, this.previousCell);
                            // this.focus();
                            e.preventDefault();
                            break;

                        case 'ArrowDown':
                            if(!this.nextRowCell) {
                                let nextRowPosition = this.insertInstruction({
                                    command: '!pause',
                                    pause: parseFloat(this.currentCell.parentNode.getAttribute('data-pause'))
                                }); // insertPosition
                                this.render();
                                this.editor.gridSelect(e, nextRowPosition);

                            } else {
                                this.selectCell(e, this.nextRowCell);
                            }
                            // this.focus();
                            e.preventDefault();
                            break;

                        case 'ArrowUp':
                            this.selectCell(e, this.previousRowCell || this.previousCell || this.currentCell);
                            // this.focus();
                            e.preventDefault();
                            break;

                        case ' ':
                            this.selectCell(e, this.currentCell);
                            if(e.ctrlKey) e.preventDefault();
                            break;

                        case 'PlayFrequency':
                            cursorInstruction.command = this.editor.keyboardLayout[e.key];
                            this.render();
                            this.focus();
                            this.editor.playInstruction(cursorInstruction);

                            // editor.gridSelectInstructions([selectedInstruction]);
                            e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    this.editor.menu.closeMenu();
                    let cellElm = e.target;
                    if (cellElm.classList.contains('grid-parameter'))
                        cellElm = cellElm.parentNode;
                    if (cellElm.classList.contains('grid-parameter'))
                        cellElm = cellElm.parentNode;
                    if (cellElm.classList.contains('grid-row'))
                        cellElm = cellElm.firstElementChild;
                    if (!cellElm.classList.contains('grid-cell'))
                        cellElm = this.querySelector('.grid-cell.selected') || this.querySelector('.grid-cell'); // Choose selected or default cell
                    if(!cellElm)
                        throw new Error("Could not find grid-cell");

                    this.selectCell(e, cellElm);
                    this.focus();

                    // Longpress
                    clearTimeout(this.longPressTimeout);
                    this.longPressTimeout = setTimeout(function() {
                        e.target.dispatchEvent(new CustomEvent('longpress', {
                            detail: {originalEvent: e},
                            bubbles: true
                        }));
                    }, DEFAULT_LONG_PRESS_TIMEOUT);
                    e.preventDefault();
                    break;

                case 'mouseup':
                    e.preventDefault();
                    clearTimeout(this.longPressTimeout);
                    break;

                case 'longpress':
                    console.log("Longpress", e);
                    this.editor.menu.openContextMenu(e);
                    e.preventDefault();
                    break;

                case 'contextmenu':
                    this.editor.menu.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();
                    break;

            }

        }

        insertInstruction(instruction, insertPosition) {
            return this.editor.insertInstruction(this.getGroupName(), insertPosition, instruction);
        }

        deleteInstruction(deletePosition) {
            return this.editor.deleteInstruction(this.getGroupName(), deletePosition, 1);
        }

        render() {
            const gridStatus = this.editor.gridStatus;
            const groupName = gridStatus.groupName;
            const selectedPositions = gridStatus.selectedPositions;
            const cursorPosition = gridStatus.cursorPosition;
            const editor = this.editor;
            const song = editor.getSong();
            const beatsPerMinute = song.beatsPerMinute;
            const beatsPerMeasure = song.beatsPerMeasure;
            // var pausesPerBeat = song.pausesPerBeat;
            const instructionList = song.instructions[groupName];
            if(!instructionList)
                throw new Error("Could not find instruction groupName: " + groupName);

            let odd = false, selectedRow = false;

            let editorHTML = '', cellHTML = '', songPosition = 0; // , lastPause = 0;
            for(let position=0; position<instructionList.length; position++) {
                const instruction = instructionList[position];
                // const nextPause = instructionList.find((i, p) => i.pause > 0 && p > position);
                const noteCSS = [];
                if(selectedPositions.indexOf(position) !== -1) {
                    selectedRow = true;
                    noteCSS.push('selected');
                }

                if(cursorPosition === position) {
                    noteCSS.push('cursor');
                }


                if (instruction.command[0] === '!') {
                    const functionName = instruction.command.substr(1);
                    switch (functionName) {
                        case 'pause':
                            var pauseCSS = (odd = !odd) ? ['odd'] : [];
                            if (Math.floor(songPosition / beatsPerMeasure) !== Math.floor((songPosition + instruction.pause) / beatsPerMeasure))
                                pauseCSS.push('measure-end');
                            if(!instruction.pause)
                                console.warn("Invalid Pause command: ", position, instruction);
                            // lastPause = instruction.pause;
                            songPosition += instruction.pause;

                            if (selectedRow)
                                pauseCSS.push('selected');

                            addRowHTML(cellHTML, position, instruction.pause);
                            cellHTML = '';
                            selectedRow = false;
                            break;

                        default:
                            console.error("Unknown function: " + instruction.command);
                            break;
                    }
                } else {
                    cellHTML += `<div class="grid-cell grid-cell-note ${noteCSS.join(' ')}" data-position="${position}">`;
                    cellHTML += `<div class="grid-parameter command">${instruction.command}</div>`;
                    if (typeof instruction.instrument !== 'undefined')
                        cellHTML += `<div class="grid-parameter instrument">${formatInstrumentID(instruction.instrument)}</div>`;
                    if (typeof instruction.velocity !== 'undefined')
                        cellHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    if (typeof instruction.duration !== 'undefined')
                        cellHTML += `<div class="grid-parameter duration">${formatDuration(instruction.duration)}</div>`;
                    cellHTML += `</div>`;
                }


            }

            // addRowHTML(cellHTML, instructionList.length);

            this.innerHTML =
                `<div class="editor-grid">`
                +   editorHTML
                + `</div>`;


            function addRowHTML(cellHTML, position, pauseLength) {
                editorHTML +=
                    `<div class="grid-row ${pauseCSS.join(' ')}" data-position="${position}" data-pause="${pauseLength}" data-beats-per-minute="${beatsPerMinute}">`
                    +   cellHTML
                    +   `<div class="grid-cell grid-cell-new" data-position="${position}">`
                    +     `<div class="grid-parameter">+</div>`
                    +   `</div>`
                    +   `<div class="grid-cell-pause" data-position="${position}" data-duration="${pauseLength}">`
                    +     `<div class="grid-parameter">${formatDuration(pauseLength)}</div>`
                    +   `</div>`
                    + `</div>`;
            }
        }

        getGroupName() { return this.editor.gridStatus.groupName;}

        selectCell(e, cursorCell) {
            // Manage cursor cell
            if(typeof cursorCell === 'number')
                cursorCell = this.querySelector(`.grid-cell[data-position='${cursorCell}']`);
            if (!cursorCell)
                throw new Error("Invalid cursor cell");

            return this.editor.gridSelect(e, cursorCell.getAttribute('data-position'));
        }

        updateCellSelection(gridStatus) {
            const cursorCell = this.querySelector(`.grid-cell[data-position='${gridStatus.cursorPosition}']`);
            if (!cursorCell)
                throw new Error("Invalid cursor cell");

            this.querySelectorAll('.grid-cell.cursor')
                .forEach(elm => elm.classList.remove('cursor'));
            cursorCell.classList.add('cursor');

            this.querySelectorAll('.grid-cell.selected,.grid-row.selected')
                .forEach(elm => elm.classList.remove('selected'));
            for(let i=0; i<gridStatus.selectedPositions.length; i++) {
                const selectedPosition = gridStatus.selectedPositions[i];
                const selectedCell = this.querySelector(`.grid-cell[data-position='${selectedPosition}']`);
                if(selectedCell.classList.contains('grid-cell-new'))
                    continue;
                if (!selectedCell)
                    throw new Error("Invalid selected cell");
                selectedCell.classList.add('selected');
                selectedCell.parentNode.classList.toggle('selected',
                    selectedCell.parentNode.querySelectorAll('.selected').length > 0);
            }
        }

        findInstruction(instruction) {
            let instructionGroup = this.editor.player.findInstructionGroup(instruction);
            if(instructionGroup !== this.getGroupName())
                return null;
            let position = this.editor.player.getInstructionPosition(instruction, instructionGroup);
            return this.findDataElement(position);
        }

        findDataElement(instrumentPosition) {
            let gridDataElms = this.querySelectorAll('.grid-cell');
            for(let i=0; i<gridDataElms.length; i++)
                if(parseInt(gridDataElms[i].getAttribute('data-position')) === instrumentPosition)
                    return gridDataElms[i];
            return null;
        }
    }

    // Form Actions


    class MusicEditorMenuElement extends HTMLElement {
        constructor() {
            super();
        }

        get editor() { return this.parentNode.parentNode; }
        get grid() { return this.editor.grid; } // Grid associated with menu

        connectedCallback() {
            this.addEventListener('mousedown', this.onInput);
            this.addEventListener('change', this.onSubmit);
            this.addEventListener('submit', this.onSubmit);

            this.render();
        }

        onSubmit(e) {
            e.preventDefault();
            const form = e.target.form || e.target;
            const command = form.getAttribute('data-command');
            let cursorPosition = this.editor.gridStatus.cursorPosition;

            const currentGroup = this.editor.gridStatus.groupName;
            const instructionList = this.editor.player.getInstructions(currentGroup);
            const selectedPositions = this.editor.gridStatus.selectedPositions;
            const selectedPausePositions = searchSelectedPausePositions(instructionList, selectedPositions);

            switch(command) {
                case 'instruction:command':
                    this.editor.replaceInstructionParams(currentGroup, cursorPosition, {
                        command: form.command.value
                    });
                    break;

                case 'instruction:instrument':
                    let instrumentID = form.instrument.value;
                    if (instrumentID.indexOf('add:') === 0)
                        instrumentID = this.editor.player.addSongInstrument(instrumentID.substr(4));
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        instrument: parseInt(instrumentID)
                    });
                    break;

                case 'instruction:duration':
                    const duration = form.duration.value || null;
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        duration: parseFloat(duration)
                    });
                    break;

                case 'instruction:velocity':
                    const velocity = form.velocity.value || null;
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        velocity: parseInt(velocity)
                    });
                    break;

                case 'instruction:remove':
                    this.editor.deleteInstructions(currentGroup, selectedPositions);
                    break;

                case 'row:edit':
                    this.editor.replaceInstructionParams(currentGroup, selectedPausePositions, {
                        command: '!pause',
                        pause: parseFloat(form.duration.value)
                    });
                    // this.editor.gridSelect([instruction]);
                    break;

                case 'group:edit':
                    if(form.groupName.value === ':new') {
                        const songData = this.editor.player.getSong();
                        let newGroupName = generateNewGroupName(songData, currentGroup);
                        newGroupName = prompt("Create new instruction group?", newGroupName);
                        if(newGroupName)    this.editor.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                        else                console.info("Create instruction group canceled");
                    } else {
                        this.editor.gridNavigate(form.groupName.value);
                    }
                    break;

                case 'song:edit':
                    const song = this.editor.getSong();
                    // song.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
                    song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
                    song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
                    this.editor.render();
                    // this.editor.gridSelect(e, 0);
                    break;

                case 'song:play':  this.editor.player.play(); break;
                case 'song:pause':  this.editor.player.pause(); break;
                case 'song:playback':
                    console.log(e.target);
                    break;

                case 'song:volume':
                    this.editor.player.setVolume(parseInt(form['volume'].value));
                    break;

                default:
                    console.warn("Unhandled " + e.type + ": ", command);
                    break;
            }

        }

        onInput(e) {
            if(e.defaultPrevented)
                return;

            let targetClassList = e.target.classList;
            switch(e.type) {
                case 'keydown':
                    break;

                // case 'keyup':
                //     // Send keystroke to default grid
                //     this.grid.onInput(e);   // Check main grid for input event (in case it was a keystroke)
                //     break;

                case 'mousedown':
                    if(targetClassList.contains('menu-item')) {
                        e.preventDefault();

                        let menuItem = e.target;
                        console.log("Menu " + e.type, menuItem);
                        const dataCommand = menuItem.getAttribute('data-command');
                        if(dataCommand) {
                            switch(dataCommand) {

                                case 'save:memory':
                                    this.editor.saveSongToMemory();
                                    break;
                                case 'save:file':
                                    this.editor.saveSongToFile();
                                    break;
                                case 'load:memory':
                                    this.editor.loadSongFromMemory(e.target.getAttribute('data-guid'));
                                    break;

                                case 'group:add':
                                    let newGroupName = generateNewGroupName(
                                        this.editor.player.getSong(),
                                        this.editor.grid.getGroupName()
                                    );

                                    newGroupName = prompt("Create new instruction group?", newGroupName);
                                    if(newGroupName)    this.editor.addInstructionGroup(newGroupName);
                                    else                console.info("Create instruction group canceled");
                                    break;

                                case 'group:remove':
                                    this.editor.removeInstructionGroup(this.editor.grid.getGroupName());
                                    break;

                                case 'group:rename':
                                    let renameGroupName = prompt("Rename instruction group?", this.editor.grid.getGroupName());

                                    if(renameGroupName)     this.editor.renameInstructionGroup(this.editor.grid.getGroupName(), renameGroupName);
                                    else                    console.info("Rename instruction group canceled");
                                    break;

                                case 'note:command':
                                    let insertPosition = parseInt(this.editor.querySelector('.grid-cell.selected').getAttribute('data-position'));
                                    const newInstruction = {
                                        // type: 'note',
                                        instrument: 0,
                                        command: 'C4',
                                        duration: 1
                                    }; // new instruction
                                    // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
                                    this.editor.insertInstruction(this.editor.grid.getGroupName(), insertPosition, newInstruction);
                                    break;
                                default:
                                    throw new Error("Unknown menu command: " + dataCommand);
                            }
                            this.closeMenu();
                            return;
                        }

                        if(menuItem.nextElementSibling
                            && menuItem.nextElementSibling.classList.contains('submenu')) {
                            const submenu = menuItem.nextElementSibling;
                            if(submenu.getAttribute('data-submenu-content')) {
                                const targetClass = submenu.getAttribute('data-submenu-content');
                                submenu.innerHTML = this.getElementsByClassName(targetClass)[0].innerHTML;
                            }
                            // let subMenu = menuItem.nextElementSibling;
                            this.querySelectorAll('.menu-item.open,.submenu.open').forEach(elm => elm.classList.remove('open'));
                            let parentMenuItem = menuItem;
                            while(parentMenuItem && parentMenuItem.classList.contains('menu-item')) {
                                parentMenuItem.classList.toggle('open');
                                parentMenuItem = parentMenuItem.parentNode.parentNode.previousElementSibling;
                            }
                            return;
                        }

                        console.warn("Unhandled menu click", e);
                        break;
                    }
                    this.closeMenu();
                    break;

                default:
                // console.error("Unhandled " + e.type, e);
            }
        }

        update(gridStatus) {
            const instructionList = this.editor.player.getInstructions(gridStatus.groupName);
            let combinedInstruction = null;
            for(let i=0; i<gridStatus.selectedPositions.length; i++) {
                const selectedPosition = gridStatus.selectedPositions[i];
                const selectedInstruction = instructionList[selectedPosition];
                const nextPause = instructionList.find((i, p) => i.pause > 0 && p > selectedPosition);
                if(combinedInstruction === null) {
                    combinedInstruction = Object.assign({}, selectedInstruction);
                    if(nextPause) combinedInstruction.pause = nextPause.pause;
                } else {
                    Object.keys(combinedInstruction).map(function(key, i) {
                        if(selectedInstruction[key] !== combinedInstruction[key])
                            delete combinedInstruction[key];
                    });
                    if(nextPause && nextPause.pause !== combinedInstruction.pause)
                        delete combinedInstruction.pause;
                }
            }
            if(!combinedInstruction)
                combinedInstruction = {command: 'C4'};

// TODO: get position from status, not grid
            let selectedPausePositions = searchSelectedPausePositions(instructionList, this.editor.gridStatus.selectedPositions);
            // let selectedPauseDisabled = this.editor.grid.gridSelectedPausePositions().length === 0;

            // Row Instructions
            Array.prototype.slice.call(this.querySelectorAll('.fieldset-pause'))
                .forEach(fieldset => selectedPausePositions.length === 0 ? fieldset.setAttribute('disabled', 'disabled') : fieldset.removeAttribute('disabled'));
            Array.prototype.slice.call(this.querySelectorAll('.fieldset-instruction'))
                .forEach(fieldset => this.editor.gridStatus.selectedPositions.length === 0 ? fieldset.setAttribute('disabled', 'disabled') : fieldset.removeAttribute('disabled'));


            // Note Instruction
            this.querySelector('form.form-instruction-command').command.value = combinedInstruction.command || '';
            this.querySelector('form.form-instruction-instrument').instrument.value = combinedInstruction.instrument || '';
            this.querySelector('form.form-instruction-velocity').velocity.value = combinedInstruction.velocity || '';
            this.querySelector('form.form-instruction-duration').duration.value = combinedInstruction.duration || '';

            // Row/Pause
            this.querySelector('form.form-pause-duration').duration.value = combinedInstruction.pause;
        }

        renderEditorMenuLoadFromMemory() {
            const songGUIDs = JSON.parse(localStorage.getItem('share-editor-saved-list') || '[]');
//         console.log("Loading song list from memory: ", songGUIDs);

            let menuItemsHTML = '';
            for(let i=0; i<songGUIDs.length; i++) {
                const songGUID = songGUIDs[i];
                let songDataString = localStorage.getItem('song:' + songGUID);
                const song = JSON.parse(songDataString);
                if(song) {
                    menuItemsHTML +=
                        `<li>
                        <a class="menu-item" data-command="load:memory" data-guid="${songGUID}">${song.name || "unnamed"}</a>
                    </li>`;
                } else {
                    console.error("Song GUID not found: " + songGUID);
                }
            }

            return `
            <ul class="submenu">
                ${menuItemsHTML}
            </ul>
        `;
        }

        render(gridStatus) {
            gridStatus = gridStatus || this.editor.gridStatus;

            this.innerHTML =
                `<div class="editor-menu">
                    <li>
                        <a class="menu-item">File</a>
                        <ul class="submenu">
                            <li>
                                <a class="menu-item">Open from memory &#9658;</a>
                                ${this.renderEditorMenuLoadFromMemory()}
                            </li>
                            <li><a class="menu-item" data-command="load:file">Open from file</a></li>
                            <li><a class="menu-item disabled" data-command="load:url">Open from url</a></li>
                            
                            <hr/>
                            <li><a class="menu-item" data-command="save:memory">Save to memory</a></li>
                            <li><a class="menu-item" data-command="save:file">Save to file</a></li>
                            <li><a class="menu-item" data-command="save:server">Save to server</a></li>
                            
                            <hr/>
                            <li><a class="menu-item disabled" data-command="export:file">Export to audio file</a></li>
                        </ul>
                    </li>
                    <li>
                        <a class="menu-item">Note</a>
                        <ul class="submenu submenu:note">
                            <li><a class="menu-item" data-command="note:insert">Insert <span class="key">N</span>ew Note</a></li>
                            <li><a class="menu-item" data-command="note:instrument">Set <span class="key">I</span>nstrument</a></li>
                            <li><a class="menu-item" data-command="note:frequency">Set <span class="key">F</span>requency</a></li>
                            <li><a class="menu-item" data-command="note:velocity">Set <span class="key">V</span>elocity</a></li>
                            <li><a class="menu-item" data-command="note:panning">Set <span class="key">P</span>anning</a></li>
                            <li><a class="menu-item" data-command="note:delete"><span class="key">D</span>elete Note</a></li>
                        </ul>
                    </li>
                    <li>
                        <a class="menu-item"<span class="key">R</span>ow</a>
                        <ul class="submenu submenu:pause">
                            <li><a class="menu-item disabled" data-command=""><span class="key">S</span>plit Pause</a></li>
                            <li><a class="menu-item" data-command=""><span class="key">D</span>elete Row</a></li>
                        </ul>
                    </li>
                    <li>
                        <a class="menu-item"><span class="key">G</span>roup</a>
                        <ul class="submenu submenu:group">
                            <li><a class="menu-item" data-command="group:add"><span class="key">I</span>nsert Group</a></li>
                            <li><a class="menu-item" data-command="group:remove"><span class="key">R</span>emove Group</a></li>
                            <li><a class="menu-item" data-command="group:rename"><span class="key">R</span>ename Group</a></li>
                        </ul>
                    </li>
                    <li><a class="menu-item disabled">Collaborate</a></li>
                </div>
                <ul class="editor-context-menu submenu">
                    <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
                    <li>
                        <a class="menu-item"><span class="key">N</span>otes (Cell) <span class="submenu-pointer"></span></a>
                        <ul class="submenu" data-submenu-content="submenu:note"></ul>
                    </li>
                    <li>
                        <a class="menu-item"><span class="key">P</span>ause (Row) <span class="submenu-pointer"></span></a>
                        <ul class="submenu" data-submenu-content="submenu:pause"></ul>
                    </li>
                    <li>
                        <a class="menu-item"><span class="key">G</span>roup <span class="submenu-pointer"></span></a>
                        <ul class="submenu" data-submenu-content="submenu:group"></ul>
                    </li>
                </ul>
                <div class="editor-forms">
                    <label class="row-label">Song:</label>
                    <form class="form-song-play" data-command="song:play">
                        <button name="play">Play</button>
                    </form>
                    <form class="form-song-pause" data-command="song:pause">
                        <button name="pause">Pause</button>
                    </form>
                    <form class="form-song-resume" data-command="song:resume">
                        <button name="resume">Resume</button>
                    </form>
                    <form class="form-song-volume" data-command="song:volume">
                        <div class="volume-container">
                            <input name="volume" type="range" min="1" max="100" value="${this.editor.player.getVolumeGain().gain.value*100}">
                        </div>
                    </form>
                    <form class="form-song-info" data-command="song:info">
                        <button name="info" disabled>Info</button>
                    </form>
                    
                    <br/>
        
        
         
                    <form class="form-pause-duration" data-command="row:edit">
                        <fieldset class="fieldset-pause">
                            <label class="row-label">Row:</label>
                            <select name="duration" title="Row Duration">
                                <optgroup label="Row Duration">
                                    ${this.renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                        </fieldset>
                    </form>
                    <form class="form-pause-split" data-command="row:split">
                        <fieldset class="fieldset-pause">
                            <button name="split">Split</button>
                        </fieldset>
                    </form>
                    <form class="form-pause-duplicate" data-command="row:duplicate">
                        <fieldset class="fieldset-pause">
                            <button name="duplicate" disabled>Duplicate</button>
                        </fieldset>
                    </form>
                    <form class="form-pause-insert" data-command="row:insert">
                        <fieldset class="fieldset-pause">
                            <button name="insert">+</button>
                        </fieldset>
                    </form>
                    <form class="form-pause-remove" data-command="row:remove">
                        <fieldset class="fieldset-pause">
                            <button name="remove">-</button>
                        </fieldset>
                    </form>
                    

                    <br/>
                    <label class="row-label">Command:</label>
                    <form class="form-instruction-command" data-command="instruction:command">
                        <fieldset class="fieldset-instruction">
                            <select name="command" title="Command">
                                <option value="">Command (Choose)</option>
                                <optgroup label="Group Execute">
                                    ${this.renderEditorFormOptions('command-group-execute')}
                                </optgroup>
                                <optgroup label="Frequencies">
                                    ${this.renderEditorFormOptions('command-frequencies')}
                                </optgroup>
                            </select>
                        </fieldset>
                    </form>
                    <form class="form-instruction-instrument" data-command="instruction:instrument">
                        <fieldset class="fieldset-instruction">
                            <select name="instrument" title="Note Instrument">
                                <option value="">Instrument (Default)</option>
                                <optgroup label="Song Instruments">
                                    ${this.renderEditorFormOptions('song-instruments')}
                                </optgroup>
                                <optgroup label="Available Instruments">
                                    ${this.renderEditorFormOptions('instruments-available')}
                                </optgroup>
                            </select>
                        </fieldset>
                    </form>
                    <form class="form-instruction-duration" data-command="instruction:duration">
                        <fieldset class="fieldset-instruction">
                            <select name="duration" title="Note Duration">
                                <optgroup label="Note Duration">
                                    <option value="">Duration (Default)</option>
                                    ${this.renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                        </fieldset>
                    </form>
                    <form class="form-instruction-velocity" data-command="instruction:velocity">
                        <fieldset class="fieldset-instruction">
                            <select name="velocity" title="Note Velocity">
                                <optgroup label="Velocity">
                                    <option value="">Velocity (Default)</option>
                                    ${this.renderEditorFormOptions('velocities')}
                                </optgroup>
                            </select>
                        </fieldset>
                    </form>
                    <form class="form-instruction-duplicate" data-command="instruction:duplicate">
                        <fieldset class="fieldset-instruction">
                            <button name="duplicate">+</button>
                        </fieldset>
                    </form>
                    <form class="form-instruction-remove" data-command="instruction:remove">
                        <fieldset class="fieldset-instruction">
                            <button name="remove">-</button>
                        </fieldset>
                    </form>
                    
                    <fieldset class="form-group-selection">
                        <legend>Select Group</legend>
                        ${this.getEditorFormOptions('groups', (value, label, selected) =>
                        `&nbsp;<form class="form-group" data-command="group:edit">`
                        + `<button name="groupName" value="${value}" class="${selected ? `selected` : ''}" >${label}</button>`
                        + `</form>`, (value) => value === gridStatus.groupName)}

                        <form class="form-group" data-command="group:edit">
                            <button name="groupName" value=":new" class="new" title="Create new group">+</button>
                        </form>

                    </fieldset>

                </div>
            `;
            this.update(gridStatus);
        }


    // <br/>
    // <label class="row-label">Group:</label>
    // <form class="form-song-bpm" data-command="song:edit">
    //         <select name="beats-per-minute" title="Beats per minute" disabled>
    // <optgroup label="Beats per minute">
    //         ${this.getEditorFormOptions('beats-per-minute', (value, label, selected) =>
    // `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
    //     </optgroup>
    // </select>
    // <select name="beats-per-measure" title="Beats per measure" disabled>
    // <optgroup label="Beats per measure">
    //         ${this.getEditorFormOptions('beats-per-measure', (value, label, selected) =>
    // `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
    //     </optgroup>
    // </select>
    // </form>

        renderEditorFormOptions(optionType, selectCallback) {
            let optionHTML = '';
            this.getEditorFormOptions(optionType, function (value, label, selected) {
                optionHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`;
            }, selectCallback);
            return optionHTML;
        }


        getEditorFormOptions(optionType, callback, selectCallback) {
            let html = '';
            let options = [];
            // let song = editor ? editor.getSong() : null;
            if(!selectCallback) selectCallback = function() { return null; };
            switch(optionType) {
                case 'song-instruments':
                    const instrumentList = this.editor.getSong().instruments;
                    for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID];
                        const instrument = this.editor.player.getInstrument(instrumentInfo.url);
                        options.push([instrumentID, formatInstrumentID(instrumentID)
                        + ': ' + (instrumentInfo.name ? instrumentInfo.name + " (" + instrument.name + ")" : instrument.name)]);
                    }
                    break;

                case 'instruments-available':
                    if(window.instruments) {
                        findInstruments(function (instrument, path, domain) {
                            options.push(["add:" + domain + ":" + path, instrument.name + " (" + path + ")"]);
                        });
                    }
                    break;

                case 'command-frequencies':
                case 'frequencies':
                    const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                    for(let i=1; i<=6; i++) {
                        for(let j=0; j<instructions.length; j++) {
                            const instruction = instructions[j] + i;
                            options.push([instruction, instruction]);
                        }
                    }
                    break;

                case 'velocities':
                    // options.push([null, 'Velocity (Default)']);
                    for(let vi=100; vi>=0; vi-=10) {
                        options.push([vi, vi]);
                    }
                    break;

                case 'durations':
                    options = [
                        // [null, 'Duration (Default)'],
                        [1/64, '1/64'],
                        [1/32, '1/32'],
                        [1/16,  '1/16'],
                        [1/8,   '1/8'],
                        [1/4,   '1/4'],
                        [1/2,   '1/2'],
                        [1.0,   '1.0'],
                        [2.0,   '2.0'],
                        [4.0,  '4.0'],
                        [8.0,  '8.0'],
                    ];

                    break;

                case 'beats-per-measure':
                    for(let vi=1; vi<=12; vi++) {
                        options.push([vi, vi + ` beat${vi>1?'s':''} per measure`]);
                    }
                    break;

                case 'beats-per-minute':
                    for(let vi=40; vi<=300; vi+=10) {
                        options.push([vi, vi+ ` beat${vi>1?'s':''} per minute`]);
                    }
                    break;

                case 'groups':
                    options = [];
                    Object.keys(this.editor.getSong().instructions).map(function(key, i) {
                        options.push([key, key]);
                    });
                    break;

                case 'command-group-execute':
                    options = [];
                    Object.keys(this.editor.getSong().instructions).map(function(key, i) {
                        options.push(['@' + key, '@' + key]);
                    });
                    break;
            }

            for (let oi=0; oi<options.length; oi++) {
                const value = options[oi][0];
                const label = options[oi][1] || value;
                const selected = selectCallback(value, oi, label);
                html += callback.call(this, value, label, selected);
            }
            return html;
        }

        // Menu

        openContextMenu(e) {
            let dataElm = null;
            let target = e.target;
            let x = e.clientX, y = e.clientY;

            this.querySelectorAll('.menu-item.open').forEach(elm => elm.classList.remove('open'));
            // this.querySelectorAll('.selected-context-menu').forEach(elm => elm.classList.remove('selected-context-menu'));
            const contextMenu = this.querySelector('.editor-context-menu');
            // console.info("Context menu", contextMenu);

            // contextMenu.setAttribute('class', 'editor-context-menu');
            // contextMenu.firstElementChild.classList.add('open');

            if(target.classList.contains('grid-parameter'))
                target = target.parentNode;

            contextMenu.classList.remove('selected-data', 'selected-row');
            if(target.classList.contains('grid-cell')) {
                dataElm = target;
                contextMenu.classList.add('selected-data');
                contextMenu.classList.add('selected-row');
                const rect = dataElm.getBoundingClientRect();
                x = rect.x + rect.width;
                y = rect.y + rect.height;
                this.editor.grid.selectCell(e, dataElm);
                // this.grid.focus();
            } else if(target.classList.contains('grid-row')) {
                contextMenu.classList.add('selected-row');
            }

            contextMenu.classList.add('open');

            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
        }

        closeMenu() {
            this.querySelectorAll('.menu-item.open,.submenu.open')
                .forEach(elm => elm.classList.remove('open'));
        }

    }


    // Define custom elements
    customElements.define('music-editor', MusicEditorElement);
    customElements.define('music-editor-grid', MusicEditorGridElement);
    customElements.define('music-editor-menu', MusicEditorMenuElement);

    // Input Profile

    function profileInput(e) {
        e = e || {};
        return {
            gridClearSelected: !e.ctrlKey && !e.shiftKey,
            gridToggleAction: e.key === ' ' || (!e.shiftKey && !e.ctrlKey) ? 'toggle' : (e.ctrlKey && e.type !== 'mousedown' ? null : 'add'),
            gridCompleteSelection: e.shiftKey
        };
    }

    // Load Javascript dependencies
    loadStylesheet('client/editor/music-editor.css');

    function loadScript(scriptPath, onLoaded) {
        let scriptPathEsc = scriptPath.replace(/[/.]/g, '\\$&');
        let scriptElm = document.head.querySelector(`script[src$=${scriptPathEsc}]`);
        if (!scriptElm) {
            scriptElm = document.createElement('script');
            scriptElm.src = scriptPath;
            scriptElm.onload = function(e) {
                for(let i=0; i<scriptElm.onloads.length; i++)
                    scriptElm.onloads[i](e);
                scriptElm.onloads = null;
            };
            document.head.appendChild(scriptElm);
        }
        if(!scriptElm.onloads) scriptElm.onloads = [];
        scriptElm.onloads.push(onLoaded);
    }
    function loadStylesheet(styleSheetPath, onLoaded) {
        let styleSheetPathEsc = styleSheetPath.replace(/[/.]/g, '\\$&');
        let foundScript = document.head.querySelectorAll(`link[href$=${styleSheetPathEsc}]`);
        if (foundScript.length === 0) {
            let styleSheetElm = document.createElement('link');
            styleSheetElm.href = styleSheetPath;
            styleSheetElm.rel = 'stylesheet';
            styleSheetElm.onload = onLoaded;
            document.head.appendChild(styleSheetElm);
        }
    }


    // Instrument Commands

    function findInstruments(callback, instrumentsObject) {
        instrumentsObject = instrumentsObject || window.instruments;
        Object.keys(instrumentsObject).map(function(domainString) {
            const domainCollection = instrumentsObject[domainString];
            Object.keys(domainCollection).map(function(instrumentPathString) {
                const instrument = domainCollection[instrumentPathString];
                callback(instrument, instrumentPathString, domainString);
            }.bind(this));
        }.bind(this));
    }




    // Format Functions

    function formatInstrumentID(number) {
        return number < 10 ? "0" + number : "" + number;
    }
    function formatDuration(duration) { return parseFloat(duration).toFixed(2); }

    // Misc Commands




    // Config

    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    };
    const DEFAULT_KEYBOARD_LAYOUT = {
        '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
        'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
        's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
        'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
    };


    function searchSelectedPausePositions(instructionList, selectedPositions) {
        const selectedPausePositions = [];
        for(let i=0; i<selectedPositions.length; i++) {
            const selectedPosition = selectedPositions[i];
            let nextPausePosition = instructionList.findIndex((i, p) => i.pause > 0 && p > selectedPosition);
            if(nextPausePosition === -1) {
                console.warn("no pauses follow selected instruction");
                continue;
            }
            selectedPausePositions.push(nextPausePosition);
        }
        return selectedPausePositions;

    }

    function generateNewGroupName(songData, currentGroup) {
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

    // Rendering templates


})();
