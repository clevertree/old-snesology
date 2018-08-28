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
                    playerElement.loadSong(this.getSongURL(), function() {
                        this.render();
                        this.grid.select(0);
                    }.bind(this));
            }.bind(this));
        }

        saveSongToMemory() {
            saveSongToMemory(this.getSong());
        }
        loadSongFromMemory(guid) {
            this.player.loadSongData(loadSongFromMemory(guid));
            this.render();
            this.grid.select(0);
        }

        // Grid Functions

        getSelectedInstructions() {
            const instructionList = this.player.getInstructions(this.grid.getGroupName());
            return this.grid.getCursorPositions().map(p => instructionList[p]);
        }

        deleteInstructions(deletePositions) {
            const instructionList = this.player.getInstructions(this.grid.getGroupName());
            deletePositions = deletePositions || this.grid.getCursorPositions();
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
            this.innerHTML = renderEditorContent(this);
        }

        // Grid Commands

        gridNavigate(groupName) {
            console.log("Navigate: ", groupName);
            if(groupName === null) {
                this.status.grids.shift();
                if(this.status.grids.length === 0)
                    this.status.grids = [{groupName: DEFAULT_GROUP}]
            } else {
                this.status.grids.unshift({groupName: groupName});
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


        loadSong(songURL, onLoaded) {
            return this.player.loadSong(songURL, onLoaded);
        }

        // Forms

        formUpdate() {
            var editorForms = this.querySelector('.editor-forms');
            editorForms.outerHTML = renderEditorFormContent(this);
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
                this.grid.selectCell(dataElm);
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
        get currentCell() { return this.querySelector('.grid-cell.cursor') || this.querySelector('.grid-cell.selected') || this.querySelector('.grid-cell'); }
        get currentCellPosition() { return parseInt(this.currentCell.getAttribute('data-position')); }

        get nextCell() { return this.querySelector('.grid-cell[data-position="' + (this.currentCellPosition + 1) + '"]'); }
        get previousCell() { return this.querySelector('.grid-cell[data-position="' + (this.currentCellPosition - 1) + '"]'); }

        get nextRowCell() {
            let currentCell = this.currentCell;
            var column = Array.from(currentCell.parentNode.childNodes).indexOf(currentCell);

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
            var column = Array.from(currentCell.parentNode.childNodes).indexOf(currentCell);
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
        // get nextCellDown() { return this.nextRow ? this.nextRow.childNodes[this.currentCellColumn] : null; }
        // get previousCellUp() { return this.previousRow ? this.previousRow.childNodes[this.currentCellColumn] : null; }

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

            // const cursorPositions = this.getCursorPositions();
            // const initialCursorPosition = cursorPositions[0];
            // const currentCursorPosition = cursorPositions[cursorPositions.length - 1];

            const editor = this.editor;

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

            switch (e.type) {
                case 'keydown':

                    let keyEvent = e.key;
                    if (editor.keyboardLayout[e.key])
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';


                    if (cellElm.classList.contains('grid-cell-new')) {
                        let insertPosition = parseInt(cellElm.getAttribute('data-position'));
                        let newInstruction = null;
                        // let duration = parseFloat(this.currentRow.getAttribute('data-duration'));
                        switch (keyEvent) {
                            case 'Enter':
                            case 'PlayFrequency':
                                newInstruction = {
                                    type: 'note',
                                    instrument: 0,
                                    command: 'C4',
                                    // duration: duration
                                }; // new instruction
                                break;
                        }
                        if(newInstruction) {
                            this.insertInstruction(newInstruction, insertPosition);
                            this.render();
                            this.select(insertPosition);
                        }
                    }

                    switch (keyEvent) {
                        case 'Delete':
                            editor.deleteInstructions();
                            e.preventDefault();
                            // editor.render(true);
                            break;
                        case 'Escape':
                        case 'Backspace':
                            editor.gridNavigate(null);
                            editor.grid.select(0);
                            editor.grid.focus();
                            e.preventDefault();
                            break;
                        case 'Enter':
                            if (cellElm.classList.contains('grid-cell-groupName')) {
                                const groupName = cellElm.getAttribute('data-groupName');
                                editor.gridNavigate(groupName);
                                editor.grid.select(0);
                                editor.grid.focus();
                            } else {
                                let selectedInstruction = editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);
                                editor.playInstruction(selectedInstruction);
                            }
                            e.preventDefault();
                            break;

                        case 'Play':
                            if (cellElm.classList.contains('grid-cell-groupName')) {
                                const groupName = cellElm.getAttribute('data-groupName');
                                editor.player.playInstructions(groupName);
                            } else {
                                let selectedInstruction = editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);
                                editor.playInstruction(selectedInstruction);
                            }
                            e.preventDefault();
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            if(!this.nextCell) createNextRow.call(this);
                            if (e.shiftKey) this.selectCellRange(cellElm, this.nextCell);
                            // else if (e.ctrlKey || e.metaKey)    editor.gridDataSelect(nextSectionElement || nextElement || selectedData);
                            else this.selectCell(this.nextCell);
                            this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowLeft':
                            if (e.shiftKey) this.selectCellRange(cellElm, this.previousCell);
                            // else if (e.ctrlKey || e.metaKey)    editor.gridDataSelect(previousSectionElement || previousElement || selectedData);
                            else this.previousCell && this.selectCell(this.previousCell);
                            this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowDown':
                            if(!this.nextRowCell) createNextRow.call(this);
                            if (e.shiftKey) this.selectCellRange(cellElm, this.nextRowCell);
                            // else if (e.ctrlKey || e.metaKey)    editor.gridDataSelect(nextSectionElement || nextElement || selectedData);
                            else this.selectCell(this.nextRowCell);

                            this.focus();
                            e.preventDefault();
                            break;
                        case 'ArrowUp':
                            if (e.shiftKey) this.selectCellRange(cellElm, this.previousRowCell);
                            // else if (e.ctrlKey || e.metaKey)    editor.gridDataSelect(previousSectionElement || previousElement || selectedData);
                            else this.selectCell(this.previousRowCell || this.previousCell || this.currentCell);
                            this.focus();
                            e.preventDefault();
                            break;

                        case 'PlayFrequency':
                            let selectedInstruction = editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);
                            selectedInstruction.command = editor.keyboardLayout[e.key];
                            this.render();
                            this.focus();
                            editor.playInstruction(selectedInstruction);

                            // editor.gridSelectInstructions([selectedInstruction]);
                            e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    editor.menuClose();
                    this.selectCell(cellElm, true);
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
                    editor.openContextMenu(e);
                    e.preventDefault();
                    break;

                case 'contextmenu':
                    editor.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();
                    break;

            }

            function createNextRow() {
                // let insertPosition = parseInt(cellElm.getAttribute('data-position'));
                let pauseLength = parseFloat(this.currentCell.parentNode.getAttribute('data-pause'));
                let pauseInstruction = {
                    pause: pauseLength
                }; // new instruction
                let insertPosition = this.insertInstruction(pauseInstruction); // insertPosition
                this.render();
                this.select(insertPosition);
            }

        }

        insertInstruction(instruction, insertPosition) {
            return this.editor.player.insertInstruction(instruction, this.getGroupName(), insertPosition);
        }

        render() {
            const cursorPositions = this.getCursorPositions();
            const editor = this.editor;
            const song = editor.getSong();
            const beatsPerMinute = song.beatsPerMinute;
            const beatsPerMeasure = song.beatsPerMeasure;
            // var pausesPerBeat = song.pausesPerBeat;
            const instructionList = song.instructions[this.getGroupName()];
            if(!instructionList)
                throw new Error("Could not find instruction groupName: " + this.getGroupName());

            let odd = false, selectedRow = false;

            let editorHTML = '', cellHTML = '', songPosition = 0, lastPause = 0;
            for(let position=0; position<instructionList.length; position++) {
                const instruction = instructionList[position];
                const nextPause = instructionList.find((i, p) => i.type === 'pause' && p > position);
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

                    lastPause = instruction.pause;
                    songPosition += instruction.pause;

                    if(selectedRow)
                        pauseCSS.push('selected');

                    addRowHTML(cellHTML, position, instruction.pause);
                    cellHTML = '';
                    selectedRow = false;
                }

            }

            addRowHTML(cellHTML, instructionList.length, lastPause);

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


        getCursorPositions() {
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


        selectCell(gridCellList) {
            if(!gridCellList)
                throw new Error("Invalid grid cell or array");
            gridCellList = Array.isArray(gridCellList) ? gridCellList : [gridCellList];
            this.querySelectorAll('.grid-cell.selected,.grid-row.selected').forEach(elm => elm.classList.remove('selected'));
            gridCellList.forEach(elm => {
                elm.classList.add('selected');
                elm.parentElement.classList.add('selected');
            });
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
            for(let p=pos[0]; p<pos[1]; p++)
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


    // File Commands

    function saveSongToMemory(song) {
        if(!song.guid)
            song.guid = generateGUID();
        const songList = JSON.parse(localStorage.getItem('music-editor-saved-list') || "[]");
        if(songList.indexOf(song.guid) === -1)
            songList.push(song.guid);
        console.log("Saving song: ", song, songList);
        localStorage.setItem('song:' + song.guid, JSON.stringify(song));
        localStorage.setItem('music-editor-saved-list', JSON.stringify(songList));
    }

    function loadSongFromMemory(songGUID) {
        let songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        let songData = JSON.parse(songDataString);
        if(!songData)
            throw new Error("Invalid Song Data: " + songDataString);
        return songData;
    }


    function generateGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }



    const DEFAULT_KEYBOARD_LAYOUT = {
        '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
        'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
        's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
        'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
    };

    // Form Actions

    const formCommands = {
        'instruction:edit': function (e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(!instruction) throw new Error("no instructions are currently selected");
            // let associatedElement = editor.gridFindInstruction(instruction);
            let instrumentID = form.instrument.value;
            if(instrumentID.indexOf('add:') === 0)
                instrumentID = editor.addSongInstrument(instrumentID.substr(4));

            instruction.instrument = parseInt(instrumentID);
            instruction.command = form.command.value;
            instruction.duration = parseFloat(form.duration.value) || null;
            instruction.velocity = parseInt(form.velocity.value);
            editor.render();
            // editor.gridSelectInstructions([instruction]);

            if(editor.config.previewInstructionsOnSelect !== false)
                editor.playInstruction(instruction);
        },
        'row:edit': function(e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(!instruction)
                throw new Error("no instructions are currently selected");
            const instructionList = editor.player.getInstructions(editor.grid.getGroupName());
            const instructionPosition = editor.player.getInstructionPosition(instruction, editor.grid.getGroupName());
            let nextPause = instructionList.find((i, p) => i.type === 'pause' && p > instructionPosition);
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
        'load:memory': function(e, editor) { editor.loadSongFromMemory(e.target.getAttribute('data-guid')); },

        'note:command': function (e, editor) {
            let insertPosition = parseInt(editor.querySelector('.grid-cell.selected').getAttribute('data-position'));
            const newInstruction = {
                type: 'note',
                instrument: 0,
                command: 'C4',
                duration: 1
            }; // new instruction
            // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
            editor.player.insertInstruction(newInstruction, editor.grid.getGroupName(), insertPosition);
        }
    };

    // Rendering templates


    function getEditorFormOptions(optionType, editor, callback) {
        let html = '';
        let options = [];
        let song = editor ? editor.getSong() : null;
        switch(optionType) {
            case 'song-instruments':
                for(let instrumentID=0; instrumentID<song.instruments.length; instrumentID++) {
                    const instrumentInfo = song.instruments[instrumentID];
                    var instrument = editor.player.getInstrument(instrumentInfo.path);
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
                for(let vi=100; vi>=0; vi-=10) {
                    options.push([vi, vi]);
                }
                break;

            case 'durations':
                options = [
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
                    options.push([vi, vi + ` beat${vi>1?'s':''} per measure`, vi === song.beatsPerMeasure]);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    options.push([vi, vi+ ` beat${vi>1?'s':''} per minute`, vi === song.beatsPerMinute]);
                }
                break;

            case 'groups':
                options = [];
                Object.keys(song.instructions).map(function(key, i) {
                    options.push([key, key, editor.status.grids[0].groupName === key]);
                });
                break;
        }

        for (let oi=0; oi<options.length; oi++) {
            const value = options[oi][0];
            const label = options[oi][1] || value;
            const selected = options[oi][2];
            html += callback.call(this, value, label, selected);
        }
        return html;
    }

    function renderEditorFormOptions(optionType, editor) {
        let optionHTML = '';
        getEditorFormOptions(optionType, editor, function(value, label, selected) {
            optionHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`;
        });
        return optionHTML;
    }

    function renderEditorMenuLoadFromMemory() {
        const songGUIDs = JSON.parse(localStorage.getItem('music-editor-saved-list') || '[]');
//         console.log("Loading song list from memory: ", songGUIDs);

        let menuItemsHTML = '';
        for(let i=0; i<songGUIDs.length; i++) {
            const songGUID = songGUIDs[i];
            const song = loadSongFromMemory(songGUID);
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

    function renderEditorContent(editor) {
        return `
            <div class="music-editor" tabindex="1">
                ${renderEditorMenuContent(editor)}
                ${renderEditorFormContent(editor)}
                <music-editor-grid data-group="${editor.status.grids[0].groupName}" tabindex="2">
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
                        ${getEditorFormOptions('beats-per-minute', editor, (value, label, selected) =>
        `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`
    )}
                        </optgroup>
                    </select>
                    <select name="beats-per-measure" title="Beats per measure">
                        <optgroup label="Beats per measure">
                        ${getEditorFormOptions('beats-per-measure', editor, (value, label, selected) =>
        `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`
    )}
                        </optgroup>
                    </select>
                </form>
                <form class="form-song-info" data-command="song:info">
                    <button name="info" disabled>Info</button>
                </form>
                
                <br/>
    
                <label class="row-label">Group:</label>
                ${getEditorFormOptions('groups', editor, (value, label, selected) =>
        `<form class="form-group" data-command="group:edit">`
        + `<button name="groupName" value="${value}" class="${selected ? `selected` : ''}" >${label}</button>`
        + `</form> `
    )}
    
                <br/>
     
                <form class="form-row" data-command="row:edit">
                    <fieldset>
                        <label class="row-label">Row:</label>
                        <select name="duration" title="Row Duration">
                            <optgroup label="Row Duration">
                                ${renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                        <button name="new" disabled>+</button>
                        <button name="duplicate" disabled>c</button>
                        <button name="remove" disabled>-</button>
                        <button name="split" disabled>Split</button>
                    </fieldset>
                </form>
                
                <br/>
    
                <form class="form-instruction" data-command="instruction:edit">
                    <fieldset>
                        <label class="row-label">Note:</label>
                        <select name="instrument" title="Note Instrument">
                            <optgroup label="Song Instruments">
                                ${renderEditorFormOptions('song-instruments', editor)}
                            </optgroup>
                            <optgroup label="Available Instruments">
                                ${renderEditorFormOptions('instruments-available')}
                            </optgroup>
                        </select>
                        <select name="command" title="Command">
                            <optgroup label="Frequencies">
                                ${renderEditorFormOptions('frequencies')}
                            </optgroup>
                        </select>
                        <select name="duration" title="Note Duration">
                            <optgroup label="Note Duration">
                                ${renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                        <select name="velocity" title="Note Velocity">
                            <optgroup label="Velocity">
                                <option value="">Default</option>
                                ${renderEditorFormOptions('velocities')}
                            </optgroup>
                        </select>
                        <button name="duplicate" disabled>+</button>
                        <button name="remove" disabled>-</button>
                    </fieldset>
                </form>
            </div>
        `;
    }


    // Config

    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    }

})();
