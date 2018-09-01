/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

(function() {
    // if (!window.MusicEditor)
    //     window.MusicEditor = MusicEditor;
    const DEFAULT_GROUP = 'root';
    const DEFAULT_LONG_PRESS_TIMEOUT = 500;

    class MusicEditorElement extends HTMLElement {
        constructor() {
            super();
            this.player = null;
            this.config = DEFAULT_CONFIG;
            this.keyboardLayout = DEFAULT_KEYBOARD_LAYOUT;
            this.status = {
                grids: [{groupName: DEFAULT_GROUP}]
            }
        }
        get grid() { return this.querySelector('music-editor-grid'); }

        getAudioContext() { return this.player.getAudioContext(); }
        getSong() { return this.player.getSong(); }
        getSongURL() { return this.getAttribute('src');}

        connectedCallback() {
            // this.render();

            this.addEventListener('contextmenu', this.onInput);
            this.addEventListener('keydown', this.onInput);
            // this.addEventListener('keyup', this.onInput);
            // this.addEventListener('click', this.onInput);
            this.addEventListener('mousedown', this.onInput);
            this.addEventListener('mouseup', this.onInput);
            this.addEventListener('longpress', this.onInput);
            this.addEventListener('change', this.onInput);
            this.addEventListener('submit', this.onInput);

            loadScript('music/player/music-player.js', function() {

                const playerElement = document.createElement('music-player');
                this.player = playerElement;
                playerElement.addEventListener('note:end', this.onSongEvent.bind(this));
                playerElement.addEventListener('note:start', this.onSongEvent.bind(this));
                playerElement.addEventListener('song:start', this.onSongEvent.bind(this));
                playerElement.addEventListener('song:playback', this.onSongEvent.bind(this));
                playerElement.addEventListener('song:end', this.onSongEvent.bind(this));
                playerElement.addEventListener('song:pause', this.onSongEvent.bind(this));

                if(this.getSongURL())
                    playerElement.loadSongFromURL(this.getSongURL(), function() {
                        this.render();
                        this.grid.select(0);

                        // Load recent
                        const recentSongGUIDs = JSON.parse(localStorage.getItem('music-editor-saved-list') || '[]');
                        if(recentSongGUIDs.length > 0)
                            this.loadSongFromMemory(recentSongGUIDs[0]);
                    }.bind(this));
            }.bind(this));
        }

        saveSongToMemory() {
            const song = this.getSong();
            if(!song.guid)
                song.guid = generateGUID();
            const songList = JSON.parse(localStorage.getItem('music-editor-saved-list') || "[]");
            if(songList.indexOf(song.guid) === -1)
                songList.push(song.guid);
            console.log("Saving song: ", song, songList);
            localStorage.setItem('song:' + song.guid, JSON.stringify(song));
            localStorage.setItem('music-editor-saved-list', JSON.stringify(songList));
            this.querySelector('.editor-menu').outerHTML = renderEditorMenuContent(this);
            console.info("Song saved to memory: " + song.guid, song);
        }

        saveSongToFile() {
            const song = this.getSong();
            if(!song.guid)
                song.guid = generateGUID();
            const jsonString = JSON.stringify(song, null, "\t");
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", (song.name.replace(' ', '_') || song.guid) + ".json");
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
            this.grid.select(0);
            console.info("Song loaded from memory: " + songGUID, songData);
        }

        loadSongFromURL(songURL, onLoaded) {
            return this.player.loadSongFromURL(songURL, onLoaded);
        }


        // Grid Functions

        getSelectedInstructions() {
            const instructionList = this.player.getInstructions(this.grid.getGroupName());
            return this.grid.getSelectedPositions().map(p => instructionList[p]);
        }

        deleteInstructions(deletePositions) {
            const instructionList = this.player.getInstructions(this.grid.getGroupName());
            deletePositions = deletePositions || this.grid.getSelectedPositions();
            deletePositions.sort((a, b) => b - a);
            for(let i=0; i<deletePositions.length; i++) {
                const position = deletePositions[i];
                if(instructionList[position])
                    throw new Error("Instruction not found at position: " + position);
                instructionList.splice(p, 1);
            }
            this.grid.select([deletePositions[deletePositions.length-1]]);
        }

        gridFindInstruction(instruction) {
            let grids = this.querySelectorAll('music-editor-grid');
            for(let i=0; i<grids.length; i++) {
                const instructionElm = grids[i].findInstruction(instruction);
                if(instructionElm)
                    return instructionElm;
            }
            return null;
        }

        // Rendering

        render() {
            var cursorPositions = this.grid ? this.grid.getSelectedPositions() : null;
            this.innerHTML = renderEditorContent(this);
            cursorPositions && this.grid.select(cursorPositions);
        }

        // Grid Commands

        gridNavigate(groupName, parentInstruction) {
            console.log("Navigate: ", groupName);
            if(groupName === null) {
                this.status.grids.shift();
                if(this.status.grids.length === 0)
                    this.status.grids = [{groupName: DEFAULT_GROUP}]
            } else {
                this.status.grids.unshift({groupName: groupName, parentInstruction: parentInstruction});
            }
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

        formUpdate() {
            this.querySelector('.editor-forms').outerHTML = renderEditorFormContent(this);
        }

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
                this.grid.selectCell(dataElm, !e.ctrlKey, !e.shiftKey);
                this.grid.focus();
            } else if(target.classList.contains('grid-row')) {
                contextMenu.classList.add('selected-row');
            }

            contextMenu.classList.add('open');

            contextMenu.style.left = x + 'px';
            contextMenu.style.top = y + 'px';
        }

        menuClose() {
            this.querySelectorAll('.menu-item.open,.submenu.open').forEach(elm => elm.classList.remove('open'));
        }

        // Input

        onInput(e) {
            // console.info(e.type, e);
            if(e.defaultPrevented)
                return;

            let targetClassList = e.target.classList;
            switch(e.type) {
                case 'keydown':
                    switch(e.key) {
                        case 'Tab': break;
                        // case ' ': this.player.play(); e.preventDefault(); break;
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
                            let menuCommand = menuCommands[dataCommand];
                            if (!menuCommand)
                                throw new Error("Unknown menu command: " + dataCommand);
                            menuCommand(e, this);
                            this.menuClose();
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
                    this.menuClose();
                    break;

                case 'mouseup':
                    break;
                // case 'click':
                //     break;

                case 'contextmenu':
                    if(targetClassList.contains('grid-parameter')
                        || targetClassList.contains('grid-cell')
                        || targetClassList.contains('grid-row')) {
                        this.openContextMenu(e);
                        if(!e.altKey) e.preventDefault();
                    }
                    break;

                case 'submit':
                case 'change':
                    e.preventDefault();
                    const form = e.target.form || e.target;
//                 console.log("Form " + e.type + ": ", form.target.form, e);
                    const formCommandName = form.getAttribute('data-command');
                    let formCommand = formCommands[formCommandName];
                    if(!formCommand)
                        throw new Error("Form command not found: " + formCommandName);
                    formCommand(e, form, this);
                    break;

                default:
                    // console.error("Unhandled " + e.type, e);
            }
        }

    }

    class MusicEditorGridElement extends HTMLElement {
        constructor() {
            super();
            this.longPressTimeout = null;
        }

        get editor() { return this.parentNode.parentNode; }

        get selectedCells() { return this.querySelectorAll('.grid-cell.selected'); }
        get currentCell() { return this.querySelector('.grid-cell.cursor') || this.querySelector('.grid-cell.selected'); }
        get currentCellPosition() { return parseInt(this.currentCell.getAttribute('data-position')); }

        get nextCell() { return this.querySelector('.grid-cell[data-position="' + (this.currentCellPosition + 1) + '"]'); }
        get previousCell() { return this.querySelector('.grid-cell[data-position="' + (this.currentCellPosition - 1) + '"]'); }

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

            // const cursorPositions = this.getSelectedPositions();
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
                                    command: this.editor.querySelector('form.form-instruction-command').command.value,
                                    // duration: duration
                                }; // new instruction
                                if(this.editor.querySelector('form.form-instruction-instrument').instrument.value)
                                    newInstruction.instrument = parseInt(this.editor.querySelector('form.form-instruction-instrument').instrument.value);
                                if(this.editor.querySelector('form.form-instruction-duration').duration.value)
                                    newInstruction.duration = this.editor.querySelector('form.form-instruction-duration').duration.value;
                                if(newInstruction) {
                                    this.insertInstruction(newInstruction, insertPosition);
                                    this.render();
                                    this.select(insertPosition);
                                }
                                break;
                        }
                    }

                    let selectedInstruction = this.editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);
                    switch (keyEvent) {
                        case 'Delete':
                            this.editor.deleteInstructions();
                            e.preventDefault();
                            // editor.render(true);
                            break;
                        case 'Escape':
                        case 'Backspace':
                            this.editor.gridNavigate(null);
                            this.editor.grid.select(0);
                            this.editor.grid.focus();
                            e.preventDefault();
                            break;
                        case 'Enter':
                            if (selectedInstruction.command[0] === '@') {
                                const groupName = selectedInstruction.command.substr(1);
                                this.editor.gridNavigate(groupName, selectedInstruction);
                                this.editor.grid.select(0);
                                this.editor.grid.focus();
                            } else {
                                this.editor.playInstruction(selectedInstruction);
                            }
                            e.preventDefault();
                            break;

                        case 'Play':
                            this.editor.playInstruction(selectedInstruction);
                            e.preventDefault();
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            if(!this.nextCell)
                                createNextRow.call(this);
                            this.selectCell(this.nextCell, !e.ctrlKey, !e.ctrlKey && !e.shiftKey);
                            // this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowLeft':
                            this.previousCell && this.selectCell(this.previousCell, !e.ctrlKey, !e.ctrlKey && !e.shiftKey);
                            // this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowDown':
                            if(!this.nextRowCell)
                                createNextRow.call(this);
                            this.selectCell(this.nextRowCell, !e.ctrlKey, !e.ctrlKey && !e.shiftKey);
                            // this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowUp':
                            this.selectCell(this.previousRowCell || this.previousCell || this.currentCell, !e.ctrlKey, !e.ctrlKey && !e.shiftKey);
                            // this.focus();
                            e.preventDefault();
                            break;

                        case ' ':
                            this.selectCell(this.currentCell, null, false);
                            break;

                        case 'PlayFrequency':
                            selectedInstruction.command = this.editor.keyboardLayout[e.key];
                            this.render();
                            this.focus();
                            this.editor.playInstruction(selectedInstruction);

                            // editor.gridSelectInstructions([selectedInstruction]);
                            e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    this.editor.menuClose();
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

                    this.selectCell(cellElm, !e.ctrlKey, !e.shiftKey);
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
                    this.editor.openContextMenu(e);
                    e.preventDefault();
                    break;

                case 'contextmenu':
                    this.editor.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();
                    break;

            }

            function createNextRow() {
                // let insertPosition = parseInt(cellElm.getAttribute('data-position'));
                let pauseLength = parseFloat(this.currentCell.parentNode.getAttribute('data-pause'));
                let pauseInstruction = {
                    pause: pauseLength
                }; // new instruction
                this.insertInstruction(pauseInstruction); // insertPosition
                this.render();
                // this.select(insertPosition);
            }

        }

        insertInstruction(instruction, insertPosition) {
            return this.editor.player.insertInstruction(instruction, this.getGroupName(), insertPosition);
        }

        render() {
            const cursorPositions = this.getSelectedPositions();
            const editor = this.editor;
            const song = editor.getSong();
            const beatsPerMinute = song.beatsPerMinute;
            const beatsPerMeasure = song.beatsPerMeasure;
            // var pausesPerBeat = song.pausesPerBeat;
            const instructionList = song.instructions[this.getGroupName()];
            if(!instructionList)
                throw new Error("Could not find instruction groupName: " + this.getGroupName());

            let odd = false, selectedRow = false;

            let editorHTML = '', cellHTML = '', songPosition = 0; // , lastPause = 0;
            for(let position=0; position<instructionList.length; position++) {
                const instruction = instructionList[position];
                const nextPause = instructionList.find((i, p) => i.pause > 0 && p > position);
                const noteCSS = [];
                if(cursorPositions.indexOf(position) !== -1) {
                    selectedRow = true;
                    noteCSS.push('selected');
                }

                if(instruction.command) {
                    cellHTML += `<div class="grid-cell grid-cell-note ${noteCSS.join(' ')}" data-position="${position}">`;
                    cellHTML +=  `<div class="grid-parameter command">${instruction.command}</div>`;
                    if (typeof instruction.instrument !== 'undefined')
                        cellHTML +=  `<div class="grid-parameter instrument">${formatInstrumentID(instruction.instrument)}</div>`;
                    if (typeof instruction.duration !== 'undefined')
                        cellHTML += `<div class="grid-parameter duration">${formatDuration(instruction.duration)}</div>`;
                    if (typeof instruction.velocity !== 'undefined')
                        cellHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    cellHTML += `</div>`;
                }

                if(instruction.pause) {
                    var pauseCSS = (odd = !odd) ? ['odd'] : [];
                    if(Math.floor(songPosition / beatsPerMeasure) !== Math.floor((songPosition + instruction.pause) / beatsPerMeasure))
                        pauseCSS.push('measure-end');

                    // lastPause = instruction.pause;
                    songPosition += instruction.pause;

                    if(selectedRow)
                        pauseCSS.push('selected');

                    addRowHTML(cellHTML, position, instruction.pause);
                    cellHTML = '';
                    selectedRow = false;
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

        getGroupName() { return this.getAttribute('data-group');}

        getSelectedPositions() {
            const cursorPositions = [];
            this.querySelectorAll('.grid-cell.selected').forEach(function(elm) {
                let p = elm.getAttribute('data-position');
                if(typeof p !== "undefined")
                    cursorPositions.push(parseInt(p));
            });
            if(cursorPositions.length === 0)
                return [0];
            return cursorPositions;
        }

        getCursorPosition() {
            const cursorCell = this.querySelector('.grid-cell.cursor');
            if(cursorCell)
                return parseInt(cursorCell.getAttribute('data-position'));
            return null;
        }

        select(cursorPositions) {
            cursorPositions = Array.isArray(cursorPositions) ? cursorPositions : [cursorPositions];
            // this.cursorPositions = cursorPositions;
            this.querySelectorAll('.grid-cell.selected,.grid-row.selected').forEach(elm => elm.classList.remove('selected'));
            for(let i=0; i<cursorPositions.length; i++) {
                const p = cursorPositions[i];
                const dataElm = this.querySelector(`.grid-cell[data-position='${p}']`);
                if(!dataElm) {
                    console.warn("Could not find grid-cell for position " + p);
                    continue;
                }
                dataElm.classList.add('selected');
                dataElm.parentElement.classList.add('selected');
            }
            this.editor.formUpdate();
        }

    //    !e.ctrlKey, !e.shiftKey
        selectCell(cursorCell, toggleSelected, clearSelected) {
            if(!cursorCell)
                throw new Error("Invalid cursor cell");

            // Set selected class
            if(clearSelected)
                this.querySelectorAll('.grid-cell.selected,.grid-row.selected').forEach(elm => elm.classList.remove('selected'));

            if(toggleSelected !== false) {
                toggleSelected === null ? cursorCell.classList.toggle('selected') : cursorCell.classList.toggle('selected', toggleSelected);
                cursorCell.parentNode.classList.toggle('selected', cursorCell.parentNode.querySelectorAll('.selected').length > 0);
            }

            // Set cursor class
            this.querySelectorAll('.grid-cell.cursor').forEach(elm => elm.classList.remove('cursor'));
            cursorCell.classList.add('cursor');
            this.editor.formUpdate();
        }

        selectCellRange(startCell, endCell) {
            let pos = [
                parseInt(startCell.getAttribute('data-position')),
                parseInt(endCell.getAttribute('data-position'))
            ];
            if(pos[0] > pos[1])
                pos = [pos[1], pos[0]];
            let cursorPositions = [];
            for(let p=pos[0]; p<=pos[1]; p++)
                cursorPositions.push(p);
            this.select(cursorPositions);
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


    // Define custom elements
    customElements.define('music-editor', MusicEditorElement);
    customElements.define('music-editor-grid', MusicEditorGridElement);


    // Load Javascript dependencies
    loadStylesheet('music/editor/music-editor.css');

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



    function getEditorFormOptions(editor, optionType, callback, selectCallback) {
        let html = '';
        let options = [];
        // let song = editor ? editor.getSong() : null;
        if(!selectCallback) selectCallback = function() { return null; };
        switch(optionType) {
            case 'song-instruments':
                const instrumentList = editor.getSong().instruments;
                for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
                    const instrumentInfo = instrumentList[instrumentID];
                    const instrument = editor.player.getInstrument(instrumentInfo.path);
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
                Object.keys(editor.getSong().instructions).map(function(key, i) {
                    options.push([key, key]);
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

    function renderEditorFormOptions(editor, optionType, selectCallback) {
        let optionHTML = '';
        getEditorFormOptions(editor, optionType, function (value, label, selected) {
            optionHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`;
        }, selectCallback);
        return optionHTML;
    }

    function renderEditorMenuLoadFromMemory() {
        const songGUIDs = JSON.parse(localStorage.getItem('music-editor-saved-list') || '[]');
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

    // Format Functions

    function formatInstrumentID(number) {
        return number < 10 ? "0" + number : "" + number;
    }
    function formatDuration(duration) { return parseFloat(duration).toFixed(2); }

    // Rendering Templates

    function renderEditorContent(editor) {
        return `
            <div class="music-editor">
                ${renderEditorMenuContent(editor)}
                ${renderEditorFormContent(editor)}
                <music-editor-grid data-group="${editor.status.grids[0].groupName}" tabindex="1">
                </music-editor-grid>
            </div>
        `;
    }

    function renderEditorMenuContent(editor) {
        return `
            <div class="editor-menu">
                <li>
                    <a class="menu-item">File</a>
                    <ul class="submenu">
                        <li>
                            <a class="menu-item">Open from memory &#9658;</a>
                            ${renderEditorMenuLoadFromMemory()}
                        </li>
                        <li><a class="menu-item" data-command="load:file">Open from file</a></li>
                        <li><a class="menu-item disabled" data-command="load:url">Open from url</a></li>
                        
                        <hr/>
                        <li><a class="menu-item" data-command="save:memory">Save to memory</a></li>
                        <li><a class="menu-item disabled" data-command="save:file">Save to file</a></li>
                        
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
                        <li><a class="menu-item" data-command=""><span class="key">I</span>nsert Group</a></li>
                        <li><a class="menu-item" data-command=""><span class="key">D</span>elete Group</a></li>
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
        `;
    }

    function renderEditorFormContent(editor) {
        const currentGridName = editor.status.grids[0].groupName;
        // const parentInstruction = editor.status.grids[0].parentInstruction || {};

        let combinedInstruction = null;
        // let combinedPauseInstruction = null;
        if(editor.grid) {
            const groupInstructions = editor.player.getInstructions(currentGridName);
            const selectedPositions = editor.grid.getSelectedPositions();
            for(var i=0; i<selectedPositions.length; i++) {
                var p = selectedPositions[i];
                if(combinedInstruction === null) {
                    combinedInstruction = groupInstructions[p];
                } else {
                    Object.keys(combinedInstruction).map(function(key, i) {
                        if(groupInstructions[p][key] !== combinedInstruction[key])
                            delete combinedInstruction[key];
                    });
                }
                // const nextPauseInstruction = groupInstructions.find((i, p2) => i.pause && p2 > p);
            }
        } else {
            combinedInstruction = {command: 'C4'};
        }
        console.info(combinedInstruction);

        // combinedInstruction = Object.assign({command: 'C4'}, parentInstruction, combinedInstruction);
        // const nextPauseInstruction = instructionList.find((i, p) => i.pause && p > cursorPositions);

        // TODO: modify all selected cells

        // console.log(cursorPositions,instructionList, currentInstruction, nextPauseInstruction);

        return `
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
                <form class="form-song-bpm" data-command="song:edit">
                    <select name="beats-per-minute" title="Beats per minute">
                        <optgroup label="Beats per minute">
                        ${getEditorFormOptions(editor, 'beats-per-minute', (value, label, selected) =>
                            `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
                        </optgroup>
                    </select>
                    <select name="beats-per-measure" title="Beats per measure">
                        <optgroup label="Beats per measure">
                        ${getEditorFormOptions(editor, 'beats-per-measure', (value, label, selected) =>
                            `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
                        </optgroup>
                    </select>
                </form>
                <form class="form-song-info" data-command="song:info">
                    <button name="info" disabled>Info</button>
                </form>
                
                <br/>
    
                <label class="row-label">Group:</label>
                ${getEditorFormOptions(editor, 'groups', (value, label, selected) =>
                `<form class="form-group" data-command="group:edit">`
                    + `<button name="groupName" value="${value}" class="${selected ? `selected` : ''}" >${label}</button>`
                    + `</form>&nbsp;`, (value) => value === currentGridName)}

                <br/>
     
                <form class="form-row" data-command="row:edit">
                    <label class="row-label">Row:</label>
                    <select name="duration" title="Row Duration">
                        <optgroup label="Row Duration">
                            ${renderEditorFormOptions(editor, 'durations')}
                        </optgroup>
                    </select>
                </form>
                <form class="form-row" data-command="row:split">
                    <button name="split">Split</button>
                </form>
                <form class="form-row" data-command="row:duplicate">
                    <button name="duplicate">Duplicate</button>
                </form>
                <form class="form-row" data-command="row:insert">
                    <button name="insert">+</button>
                </form>
                <form class="form-row" data-command="row:remove">
                    <button name="remove">-</button>
                </form>
                
                <br/>
    
                <label class="row-label">Command:</label>
                <form class="form-instruction-command" data-command="instruction:command">
                    <select name="command" title="Command">
                        <optgroup label="Frequencies">
                            <option value="">Frequency (Default)</option>
                            ${renderEditorFormOptions(editor, 'frequencies', (value) => value === combinedInstruction.command)}
                        </optgroup>
                    </select>
                </form>
                <form class="form-instruction-instrument" data-command="instruction:instrument">
                    <select name="instrument" title="Note Instrument">
                        <optgroup label="Song Instruments">
                            ${renderEditorFormOptions(editor, 'song-instruments', (value) => value === combinedInstruction.instrument)}
                        </optgroup>
                        <optgroup label="Available Instruments">
                            ${renderEditorFormOptions(editor, 'instruments-available', (value) => value === combinedInstruction.instrument)}
                        </optgroup>
                    </select>
                </form>
                <form class="form-instruction-duration" data-command="instruction:duration">
                    <select name="duration" title="Note Duration">
                        <optgroup label="Note Duration">
                            <option value="">Duration (Default)</option>
                            ${renderEditorFormOptions(editor, 'durations', (value) => value === combinedInstruction.duration)}
                        </optgroup>
                    </select>
                </form>
                <form class="form-instruction-velocity" data-command="instruction:velocity">
                    <select name="velocity" title="Note Velocity">
                        <optgroup label="Velocity">
                            <option value="">Velocity (Default)</option>
                            ${renderEditorFormOptions(editor, 'velocities', (value) => value === combinedInstruction.velocity)}
                        </optgroup>
                    </select>
                </form>
                <form class="form-instruction-duplicate" data-command="instruction:duplicate">
                    <button name="duplicate">+</button>
                </form>
                <form class="form-instruction-remove" data-command="instruction:remove">
                    <button name="remove">-</button>
                </form>
            </div>
        `;
    }

    // Misc Commands

    function generateGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }




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

    // Form Actions

    const formCommands = {
        'instruction:command': function (e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            instruction.command = form.command.value;
            editor.render();
        },
        'instruction:instrument': function (e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(form.instrument.value === "") {
                delete instruction.velocity;
            } else {
                let instrumentID = form.instrument.value;
                if(instrumentID.indexOf('add:') === 0)
                    instrumentID = editor.player.addSongInstrument(instrumentID.substr(4));

                instruction.instrument = parseInt(instrumentID);
            }
            editor.render();
        },
        'instruction:duration': function (e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(form.duration.value === "") delete instruction.duration;
            else instruction.duration = parseFloat(form.duration.value);
            editor.render();
        },
        'instruction:velocity': function (e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(form.velocity.value === "") delete instruction.velocity;
            else instruction.velocity = parseInt(form.velocity.value);
            editor.render();
        },
        'row:edit': function(e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(!instruction)
                throw new Error("no instructions are currently selected");
            const instructionList = editor.player.getInstructions(editor.grid.getGroupName());
            const instructionPosition = editor.player.getInstructionPosition(instruction, editor.grid.getGroupName());
            let nextPause = instructionList.find((i, p) => i.pause > 0 && p > instructionPosition);
            if(!nextPause)
                throw new Error("no pauses follow selected instruction");
            nextPause.duration = parseFloat(form.duration.value);
            editor.render();
            // editor.grid.select([instruction]);
        },
        'group:edit': function(e, form, editor) {
            editor.gridNavigate(form.groupName.value);
            editor.grid.select(0);
        },
        'song:edit': function(e, form, editor) {
            const song = editor.getSong();
            // song.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
            song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
            song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
            editor.render();
            editor.grid.select(0);
        },
        'song:play': function (e, form, editor) { editor.player.play(); },
        'song:pause': function (e, form, editor) { editor.player.pause(); },
        'song:playback': function (e, form, editor) {
            console.log(e.target);
        }
    };

    // Menu Actions

    const menuCommands = {
        'save:memory': function(e, editor) { editor.saveSongToMemory(); },
        'save:file': function(e, editor) { editor.saveSongToFile(); },
        'load:memory': function(e, editor) { editor.loadSongFromMemory(e.target.getAttribute('data-guid')); },

        'note:command': function (e, editor) {
            let insertPosition = parseInt(editor.querySelector('.grid-cell.selected').getAttribute('data-position'));
            const newInstruction = {
                // type: 'note',
                instrument: 0,
                command: 'C4',
                duration: 1
            }; // new instruction
            // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
            editor.player.insertInstruction(newInstruction, editor.grid.getGroupName(), insertPosition);
        }
    };

    // Rendering templates


})();
