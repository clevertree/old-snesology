class SongEditorGrid {
    constructor(editor, groupName='root') {
        this.longPressTimeout = null;
        this.editor = editor;
        this.renderElm = null;
        this.groupName = groupName;
    }

    // Can't select pauses!
    get instructionList() {
        const song = this.editor.getSongData();
        const groupName = this.groupName;
        if(!song.instructions[groupName])
            throw new Error("Group instructions not found: " + groupName);
        return song.instructions[groupName];
    }

    get selectedCells() { return this.renderElm.querySelectorAll('.grid-cell-instruction.selected'); }
    get cursorCell() { return this.renderElm.querySelector('.grid-cell.cursor'); }
    get cursorPosition() { return parseFloat(this.cursorCell.getAttribute('data-position')); }
    get selectedIndices() { return [].map.call(this.selectedCells, (elm => parseInt(elm.getAttribute('data-index')))); }
    get selectedRows() { return this.renderElm.querySelectorAll('.grid-row.selected'); }
    get selectedPauseIndices() { return [].map.call(this.selectedRows, (elm => parseInt(elm.getAttribute('data-index')))); }

    get nextCell() {
        const cellList = this.renderElm.querySelectorAll('.grid-cell');
        const currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(currentIndex === -1)
            throw new Error("Cursor Cell not found");
        return cellList[currentIndex + 1];
    }

    get previousCell() {
        const cellList = this.renderElm.querySelectorAll('.grid-cell');
        let currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(currentIndex === -1)
            throw new Error("Cursor Cell not found");
        if(currentIndex === 0)
            currentIndex = cellList.length - 1;
        return cellList[currentIndex - 1];
    }

    get nextRowCell() {
        const cellList = this.renderElm.querySelectorAll('.grid-cell');
        const currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        for(let i=currentIndex;i<cellList.length;i++)
            if(cellList[i].parentNode !== cellList[currentIndex].parentNode)
                return cellList[i];
        return null;
    }

    get previousRowCell() {
        const cellList = this.renderElm.querySelectorAll('.grid-cell');
        const currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        for(let i=currentIndex;i>=0;i--)
            if(cellList[i].parentNode !== cellList[currentIndex].parentNode)
                return cellList[i];
        return null;
    }

    get selectedRange() {
        const instructionList = this.instructionList;
        let selectedIndices = this.selectedIndices;
        selectedIndices = selectedIndices.concat().sort((a,b) => a - b);

        let currentPosition = selectedIndices[0];
        for(let i=0; i<selectedIndices.length; i++) {
            if(currentPosition !== selectedIndices[i])
                return false;
            currentPosition++;
        }
        if(instructionList.length > currentPosition
            && instructionList[currentPosition].command !== '!pause'
            && instructionList[currentPosition+1].command === '!pause') {
            currentPosition++;
        }
        return [selectedIndices[0], currentPosition];
    }

    connectedCallback() {
        this.editor = this.closest('song-editor'); // findParent(this, (p) => p.matches('music-song'));

        if(this.editor.player) {
            const onSongEvent = this.onSongEvent.bind(this);
            this.editor.player.addEventListener('note:end', onSongEvent);
            this.editor.player.addEventListener('note:start', onSongEvent);
            this.editor.player.addEventListener('song:start', onSongEvent);
            this.editor.player.addEventListener('song:playback', onSongEvent);
            this.editor.player.addEventListener('song:end', onSongEvent);
            this.editor.player.addEventListener('song:pause', onSongEvent);
        }

        this.render();
        this.editor.menu.update();
    }

    // static getInstrumentList(instructionList) {
    // }

    onInput(e) {
        if (e.defaultPrevented)
            return;

        try {
            // const cursorPositions = this.selectedPositions;
            // const initialCursorPosition = cursorPositions[0];
            // const currentCursorPosition = cursorPositions[cursorPositions.length - 1];

            // const song = this.song;

            switch (e.type) {
                case 'keydown':

                    let keyEvent = e.key;
                    if (this.editor.keyboard.getKeyboardCommand(e.key))
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    // let keydownCellElm = this.cursorCell;

                    let selectedIndices = this.selectedIndices;
                    const instructionList = this.editor.renderer.getInstructions(this.groupName);
                    switch (keyEvent) {
                        case 'Delete':
                            e.preventDefault();
                            for(let i=0; i<selectedIndices.length; i++) {
                                this.editor.renderer.deleteInstructionAtIndex(this.groupName, selectedIndices[i]);
                            }
                            this.render();
                            // song.render(true);
                            break;

                        case 'Escape':
                        case 'Backspace':
                            e.preventDefault();
                            this.navigatePop();
                            this.selectInstructions(0);
                            this.focus();
                            break;

                        case 'Enter':
                            e.preventDefault();
                            if (this.cursorCell.classList.contains('grid-cell-new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                if(!newInstruction)
                                    return console.info("Insert canceled");
                                let insertIndex = this.insertInstructionAtPosition(newInstruction, this.cursorPosition);
                                this.render();
                                this.selectInstructions(insertIndex);
                            }

                            // if (cursorInstruction.command[0] === '@') {
                            //     const groupName = cursorInstruction.command.substr(1);
                            //     this.navigate(groupName, cursorInstruction);
                            //     //thisSelect(e, 0);
                            //     //this.focus();
                            // } else {
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.playInstruction(instructionList[i]);
                            // }
                            break;

                        case 'Play':
                            e.preventDefault();
                            for(let i=0; i<selectedIndices.length; i++) {
                                this.editor.playInstruction(instructionList[i]);
                            }
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            e.preventDefault();
                            
                            if(!this.nextCell) {
                                this.increaseGridSize();

                                // this.render();
                                this.selectCell(e, this.nextCell);
                            } else {
                                this.selectCell(e, this.nextCell);
                            }
                            break;

                        case 'ArrowLeft':
                            e.preventDefault();
                            this.previousCell && this.selectCell(e, this.previousCell);
                            break;

                        case 'ArrowDown':
                            e.preventDefault();
                            if(!this.nextRowCell) {
                                this.increaseGridSize();

                                // this.render();
                                this.selectCell(e, this.nextRowCell);
                            } else {
                                this.selectCell(e, this.nextRowCell);
                            }
                            break;

                        case 'ArrowUp':
                            e.preventDefault();
                            this.selectCell(e, this.previousRowCell || this.previousCell || this.cursorCell);
                            break;

                        case ' ':
                            this.selectCell(e, this.cursorCell);
                            if(e.ctrlKey) e.preventDefault();
                            break;

                        case 'PlayFrequency':
                            let newCommand = this.editor.keyboard.getKeyboardCommand(e.key);

                            if (this.cursorCell.classList.contains('grid-cell-new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                newInstruction.command = newCommand;

                                const insertPosition = this.cursorPosition;
                                const insertIndex = this.insertInstructionAtPosition(newInstruction, insertPosition);
                                // this.render();
                                this.selectInstructions(insertIndex);
                                // cursorInstruction = instructionList[insertIndex];
                            } else {
                                for(let i=0; i<selectedIndices.length; i++) {
                                    this.replaceInstructionParams(selectedIndices[i], {
                                        command: newCommand
                                    });
                                }
                                // this.selectInstructions(this.selectedIndices[0]); // TODO: select all
                            }

                            this.render();
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.playInstruction(instructionList[selectedIndices[i]]);

                            // song.gridSelectInstructions([selectedInstruction]);
                            e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    this.editor.menu.closeMenu();
                    let cellElm = e.target;
                    if (cellElm.classList.contains('grid-parameter')) {
                        return this.onCellInput(e);
                    }
                    if (cellElm.classList.contains('grid-cell')) {
                        return this.onCellInput(e);
                    }
                    if (cellElm.classList.contains('grid-data')) {
                        return this.onRowInput(e);
                    }
                    if (cellElm.classList.contains('grid-row')) {
                        return this.onRowInput(e);
                    }
                    // e.preventDefault();


                    // cellElm = this.renderElm.querySelector('.grid-cell.selected') || this.renderElm.querySelector('.grid-cell'); // Choose selected or default cell
                    // Longpress
                    clearTimeout(this.longPressTimeout);
                    this.longPressTimeout = setTimeout(function() {
                        e.target.dispatchEvent(new CustomEvent('longpress', {
                            detail: {originalEvent: e},
                            bubbles: true
                        }));
                    }, this.editor.status.longPressTimeout);
                    break;

                case 'mouseup':
                    e.preventDefault();
                    clearTimeout(this.longPressTimeout);
                    break;

                case 'longpress':
                    e.preventDefault();
                    console.log("Longpress", e);
                    this.editor.menu.openContextMenu(e);
                    break;

                case 'contextmenu':
                    if (e.target.classList.contains('grid-parameter')) {
                        console.info("TODO: add parameter song at top of context menu: ", e.target);
                    }
                    this.editor.menu.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();

                    break;

                default:
                    throw new Error("Unhandled type: " + e.type);

            }
        } catch (err) {
            this.editor.onError(err);
        }

    }

    onRowInput(e) {
        e.preventDefault();
        let selectedCell = e.target;
        if(selectedCell.classList.contains('grid-data'))
            selectedCell = selectedCell.parentNode;
        const index = parseInt(selectedCell.getAttribute('data-index'));
        const position = parseInt(selectedCell.getAttribute('data-position'));
        this.selectInstructions(index, position);
    }

    onCellInput(e) {
        e.preventDefault();
        let selectedCell = e.target;
        if(selectedCell.classList.contains('grid-parameter'))
            selectedCell = selectedCell.parentNode;
        const index = parseInt(selectedCell.getAttribute('data-index'));
        const position = parseInt(selectedCell.parentNode.parentNode.getAttribute('data-position'));
        this.selectInstructions(index, position);
    }

    onSongEvent(e) {
        // console.log("onSongEvent", e);
        const detail = e.detail || {stats:{}};
        const instructionElm = detail.instruction ? this.findInstruction(detail.instruction) : null;
        const groupElm = detail.groupInstruction ? this.findInstruction(detail.groupInstruction) : null;
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


    findInstruction(instruction) {
        let grids = this.renderElm.querySelectorAll('music-song-grid');
        for(let i=0; i<grids.length; i++) {
            const instructionElm = grids[i].findInstruction(instruction);
            if(instructionElm)
                return instructionElm;
        }
        return null;
    }

    navigate(groupName, parentInstruction) {
        console.log("Navigate: ", groupName);
        const existingGrid = this.status.grids.find(obj => obj.groupName === groupName);
        if(existingGrid)
            this.status.grids.unshift(existingGrid);
        else
            this.status.grids.unshift(
                Object.assign({}, SongEditorElement.DEFAULT_GRID_STATUS, {
                    groupName: groupName,
                    parentInstruction: parentInstruction,
                })
            );
        this.render();
    }

    navigatePop() {
        console.log("Navigate Back: ", this.status.grids[0].groupName);
        if(this.status.grids.length > 0)
            this.status.grids.shift();
        this.render();
    }


    increaseGridSize() {
        const instructionList = this.instructionList;
        let lastIndex = instructionList.length - 1;
        let lastInstruction = instructionList[lastIndex];
        if(lastInstruction.command !== '!pause') {
            throw new Error("TODO: Insert new pause");
        }
        const defaultDuration = parseFloat(this.editor.forms.fieldRenderDuration.value);
        this.replaceInstructionParams(lastIndex, {
            duration: lastInstruction.duration + defaultDuration
        });
        this.render();
    }


    insertInstructionAtIndex(instruction, insertIndex) {
        return this.editor.renderer.insertInstructionAtIndex(this.groupName, insertIndex, instruction);
    }

    insertInstructionAtPosition(instruction, insertTimePosition) {
        return this.editor.renderer.insertInstructionAtPosition(this.groupName, insertTimePosition, instruction);
    }
    deleteInstructionAtIndex(deleteIndex) {
        return this.editor.renderer.deleteInstructionAtIndex(this.groupName, deleteIndex, 1);
    }

    replaceInstructionParams(replaceIndex, replaceParams) {
        return this.editor.renderer.replaceInstructionParams(this.groupName, replaceIndex, replaceParams);
    }

    selectCell(e, cursorCell, clearSelection=true, toggle=false) {
        const index = parseInt(cursorCell.getAttribute('data-index'));
        const position = parseFloat(cursorCell.getAttribute('data-position'));
        // console.log("Cell", cursorCell, index, position);
        this.selectInstructions(index, position, clearSelection, toggle);
    }


    selectInstructions(cursorIndex, position=null, clearSelection=true, toggle=false) {
        return this.editor.selectInstructions(this.groupName, cursorIndex, position, clearSelection, toggle);
    }

    scrollToCursor() {
        if(!this.cursorCell)
            return;
        const currentCellParent = this.cursorCell.parentNode;
        // console.log("TODO: ", currentCellParent.offsetTop, this.scrollTop, this.offsetHeight);
        if(currentCellParent.offsetTop < this.scrollTop)
            this.scrollTop = currentCellParent.offsetTop;
        if(currentCellParent.offsetTop > this.scrollTop + this.offsetHeight)
            this.scrollTop = currentCellParent.offsetTop - this.offsetHeight + this.cursorCell.offsetHeight;
    }

    findInstruction(instruction) {
        let instructionGroup = this.editor.player.findInstructionGroup(instruction);
        if(instructionGroup !== this.groupName)
            return null;
        let index = this.editor.player.getInstructionIndex(instruction, instructionGroup);
        return this.findDataElement(index);
    }

    findDataElement(instructionIndex) {
        return this.renderElm.querySelector(`.grid-cell[data-index='${instructionIndex}'`);
    }

    render() {
        this.renderElm = this.editor.querySelector('table.editor-grid');
        if(!this.renderElm) {
            this.editor.innerHTML += `<table class="editor-grid"></table>`;
            this.renderElm = this.editor.querySelector('table.editor-grid');
        }


        const gridDuration = parseFloat(this.editor.forms.fieldRenderDuration.value);

        const selectedIndicies = this.editor.status.selectedIndicies;
        const selectedPosition = this.editor.status.selectedPosition;
        let editorHTML = '', rowHTML='', songPosition=0, odd=false; // , lastPause = 0;

        this.editor.renderer.eachInstruction(this.groupName, (index, instruction, stats) => {

            if (instruction.command[0] === '!') {
                const functionName = instruction.command.substr(1);
                switch (functionName) {
                    case 'pause':
                        // editorHTML += this.renderGridRow(instruction, rowInstructions, odd);


                        // TODO: ignore pause if no commands. add duration to next pause
                        for(let subPause=0; subPause<instruction.duration; subPause+=gridDuration) {
                            let subDuration = gridDuration;
                            if(subPause + gridDuration > instruction.duration)
                                subDuration = subPause + gridDuration - instruction.duration;

                            // if(selectedPosition === songPosition)
                            // const selectedPositionClass = selectedPosition === songPosition ? ' selected' : '';
                            rowHTML +=
                                `<div class="grid-cell grid-cell-new" data-position="${songPosition}" data-index="${index}">
                                    <div class="grid-parameter command">+</div>
                                </div>`;

                            editorHTML +=
                                `<tr class="grid-row" data-index="${index}" data-position="${songPosition}">
                                   <td class="grid-data">
                                       ${rowHTML}
                                   </td>
                                   <td class="grid-data-pause">
                                       ${this.editor.renderer.format(subDuration, 'duration')}
                                   </td>
                                </tr>`;
                            rowHTML = '';
                            songPosition += subDuration;
                        }


                        break;

                    default:
                        console.error("Unknown function: " + instruction.command);
                        break;
                }
            } else {
                // const selectedIndexClass = selectedIndicies.indexOf(index) !== -1 ? ' selected' : '';
                rowHTML +=
                    `<div class="grid-cell grid-cell-instruction" data-index="${index}" data-position="${songPosition}">
                        <div class="grid-parameter command">${instruction.command}</div>
                        ${typeof instruction.instrument !== "undefined" ? `<div class="grid-parameter instrument">${this.editor.renderer.format(instruction.instrument, 'instrument')}</div>` : ''}
                        ${typeof instruction.velocity !== "undefined" ? `<div class="grid-parameter velocity">${instruction.velocity}</div>` : ''}
                        ${typeof instruction.duration !== "undefined" ? `<div class="grid-parameter duration">${this.editor.renderer.format(instruction.duration, 'duration')}</div>` : ''}
                    </div>`;
            }
        });



        const currentScrollPosition = this.scrollTop || 0; // Save scroll position
        this.renderElm.innerHTML = editorHTML;
        this.scrollTop = currentScrollPosition;             // Restore scroll position
        this.update();
    }

    update() {
        let cellList = this.renderElm.querySelectorAll('.grid-cell,.grid-row');

        const selectedPosition = this.editor.status.selectedPosition;
        const selectedIndicies = this.editor.status.selectedIndicies;
        const selectedIndexCursor = this.editor.status.selectedIndexCursor;
        for(let i=0; i<cellList.length; i++) {
            const cell = cellList[i];
            const position = parseFloat(cell.getAttribute('data-position'));
            const index = parseInt(cell.getAttribute('data-index'));
            cell.classList.toggle('selected', selectedIndicies.indexOf(index) !== -1 && selectedPosition === position);
            cell.classList.toggle('cursor', selectedIndexCursor === index && selectedPosition === position);
        }

    }
}
// customElements.define('music-song-grid', SongEditorGrid);
