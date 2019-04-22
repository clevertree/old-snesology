class SongEditorGrid {
    constructor(editor, groupName='root') {
        this.editor = editor;
        this.groupName = groupName;
    }

    get renderElement() {
        let renderElement = this.editor.querySelector('table.editor-grid');
        if(!renderElement) {
            this.editor.innerHTML += `<table class="editor-grid" tabindex="0"></table>`;
            renderElement = this.editor.querySelector('table.editor-grid');
        }
        return renderElement;
    }

    // Can't select pauses!
    get instructionList() {
        const song = this.editor.getSongData();
        const groupName = this.groupName;
        if(!song.instructions[groupName])
            throw new Error("Group instructions not found: " + groupName);
        return song.instructions[groupName];
    }

    get selectedCells() { return this.renderElement.querySelectorAll('.grid-cell-instruction.selected'); }
    get cursorCell() { return this.renderElement.querySelector('.grid-cell.cursor'); }
    // get cursorCellIndex() {
    //     const cellList = this.renderElement.querySelectorAll('.grid-cell');
    //     return this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
    // }
    get cursorPosition() {
        return parseFloat(this.cursorCell.getAttribute('data-position'));
    }
    get selectedIndices() { return [].map.call(this.selectedCells, (elm => parseInt(elm.getAttribute('data-index')))); }
    // get selectedRows() { return this.renderElement.querySelectorAll('.grid-row.selected'); }
    // get selectedPauseIndices() { return [].map.call(this.selectedRows, (elm => parseInt(elm.getAttribute('data-index')))); }

    get nextCell() {
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cursorCellIndex = this.editor.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(cursorCellIndex === -1)
            throw new Error("Cursor Cell not found");
        return cellList[cursorCellIndex + 1];
    }

    get previousCell() {
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        let cursorCellIndex = this.editor.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(cursorCellIndex === -1)
            throw new Error("Cursor Cell not found");
        if(cursorCellIndex === 0)
            cursorCellIndex = cellList.length - 1;
        return cellList[cursorCellIndex - 1];
    }

    get nextRowCell() {
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cursorCellIndex = this.editor.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        for(let i=cursorCellIndex;i<cellList.length;i++)
            if(cellList[i].parentNode !== cellList[cursorCellIndex].parentNode)
                return cellList[i];
        return null;
    }

    get previousRowCell() {
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cursorCellIndex = this.editor.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        for(let i=cursorCellIndex;i>=0;i--)
            if(cellList[i].parentNode !== cellList[cursorCellIndex].parentNode)
                return cellList[i];
        return null;
    }

    onInput(e) {
        if (e.defaultPrevented)
            return;
        if(!this.renderElement.contains(e.target))
            return;
        if(this.renderElement !== document.activeElement) {
            console.log("Focus", document.activeElement);
            this.renderElement.focus();
        }
        e.preventDefault();

        try {
            let selectedIndices = this.selectedIndices;

            switch (e.type) {
                case 'keydown':

                    let keyEvent = e.key;
                    if (this.editor.keyboard.getKeyboardCommand(e.key))
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    // let keydownCellElm = this.cursorCell;

                    const instructionList = this.editor.renderer.getInstructions(this.groupName);
                    switch (keyEvent) {
                        case 'Delete':
                            // e.preventDefault();
                            for(let i=0; i<selectedIndices.length; i++) {
                                this.editor.renderer.deleteInstructionAtIndex(this.groupName, selectedIndices[i]);
                            }
                            // this.render();
                            // song.render(true);
                            break;

                        case 'Escape':
                        case 'Backspace':
                            // e.preventDefault();
                            this.navigatePop();
                            this.selectInstructions(0);
                            // this.focus();
                            break;

                        case 'Enter':
                            // e.preventDefault();
                            if (this.cursorCell.classList.contains('grid-cell-new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                if(!newInstruction)
                                    return console.info("Insert canceled");
                                let insertIndex = this.insertInstructionAtPosition(newInstruction, this.cursorPosition);
                                // this.render();
                                this.selectInstructions(insertIndex);
                            }

                            // if (cursorInstruction.command[0] === '@') {
                            //     const groupName = cursorInstruction.command.substr(1);
                            //     this.navigate(groupName, cursorInstruction);
                            //     //thisSelect(e, 0);
                            //     //this.focus();
                            // } else {
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.renderer.playInstruction(instructionList[i]);
                            // }
                            break;

                        case 'Play':
                            // e.preventDefault();
                            for(let i=0; i<selectedIndices.length; i++) {
                                this.editor.renderer.playInstruction(instructionList[i]);
                            }
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            // e.preventDefault();
                            
                            if(!this.nextCell) {
                                this.increaseGridSize();

                                // this.render();
                                this.selectCell(e, this.nextCell);
                            } else {
                                this.selectCell(e, this.nextCell);
                            }
                            break;

                        case 'ArrowLeft':
                            // e.preventDefault();
                            this.previousCell && this.selectCell(e, this.previousCell);
                            break;

                        case 'ArrowDown':
                            // e.preventDefault();
                            if(!this.nextRowCell) {
                                this.increaseGridSize();

                                // this.render();
                                this.selectCell(e, this.nextRowCell);
                            } else {
                                this.selectCell(e, this.nextRowCell);
                            }
                            break;

                        case 'ArrowUp':
                            // e.preventDefault();
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
                                selectedIndices = [insertIndex];
                                // cursorInstruction = instructionList[insertIndex];
                            } else {
                                for(let i=0; i<selectedIndices.length; i++) {
                                    this.replaceInstructionParams(selectedIndices[i], {
                                        command: newCommand
                                    });
                                }
                                // this.selectInstructions(this.selectedIndices[0]); // TODO: select all
                            }

                            // this.render();
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.renderer.playInstruction(instructionList[selectedIndices[i]]);

                            // song.gridSelectInstructions([selectedInstruction]);
                            // e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    this.editor.menu.closeMenu();
                    if (e.target.classList.contains('grid-parameter')) {
                        return this.onCellInput(e);
                    }
                    if (e.target.classList.contains('grid-cell')) {
                        return this.onCellInput(e);
                    }
                    if (e.target.classList.contains('grid-data')) {
                        return this.onRowInput(e);
                    }
                    if (e.target.classList.contains('grid-row')) {
                        return this.onRowInput(e);
                    }
                    // e.preventDefault();


                    // e.target = this.renderElement.querySelector('.grid-cell.selected') || this.renderElement.querySelector('.grid-cell'); // Choose selected or default cell
                    break;

                case 'mouseup':
                    break;

                case 'longpress':
                    if (e.target.classList.contains('grid-parameter')
                        || e.target.classList.contains('grid-cell')
                        || e.target.classList.contains('grid-data')
                        || e.target.classList.contains('grid-row')) {
                        e.preventDefault();
                        console.log("Longpress", e);
                        this.editor.menu.openContextMenu(e);
                    }
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
        let selectedRow = e.target;
        if(selectedRow.classList.contains('grid-data'))
            selectedRow = selectedRow.parentNode;
        const selectedCell = selectedRow.querySelector('.grid-cell-new');
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cellIndex = [].indexOf.call(cellList, selectedCell);
        const index = parseInt(selectedRow.getAttribute('data-index'));
        // const position = parseInt(selectedRow.getAttribute('data-position'));
        this.selectInstructions(index, cellIndex);
    }

    onCellInput(e) {
        e.preventDefault();
        let selectedCell = e.target;
        if(selectedCell.classList.contains('grid-parameter'))
            selectedCell = selectedCell.parentNode;

        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cellIndex = [].indexOf.call(cellList, selectedCell);
        const index = parseInt(selectedCell.getAttribute('data-index'));
        this.selectInstructions(index, cellIndex);
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
        let instructionGroup = this.editor.renderer.findInstructionGroup(instruction);
        if(instructionGroup !== this.groupName)
            return null;
        let index = this.editor.renderer.getInstructionIndex(instruction, instructionGroup);
        return this.findDataElement(index);
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
        const cellList = this.renderElement.querySelectorAll('.grid-cell');
        const cellIndex = this.cursorCell ? [].indexOf.call(cellList, cursorCell) : 0;
        const index = parseInt(cursorCell.getAttribute('data-index'));
        // const position = parseFloat(cursorCell.getAttribute('data-position'));
        this.selectInstructions(index, cellIndex, clearSelection, toggle);
    }


    selectInstructions(cursorIndex, cursorCellIndex=null, clearSelection=true, toggle=false) {
        return this.editor.selectInstructions(this.groupName, cursorIndex, cursorCellIndex, clearSelection, toggle);
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


    findDataElement(instructionIndex) {
        return this.renderElement.querySelector(`.grid-cell[data-index='${instructionIndex}'`);
    }

    render() {
        // console.log("RENDER GRID");
        const gridDuration = parseFloat(this.editor.forms.fieldRenderDuration.value);

        // const selectedIndicies = this.editor.status.selectedIndicies;
        // const cursorCellIndex = this.editor.cursorCellIndex;
        let editorHTML = '', rowHTML='', songPosition=0, odd=false; // , lastPause = 0;

        this.editor.renderer.eachInstruction(this.groupName, (index, instruction, stats) => {
            // console.log(index, instruction);

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

                            // if(cursorCellIndex === songPosition)
                            // const cursorCellIndexClass = cursorCellIndex === songPosition ? ' selected' : '';
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
        this.renderElement.innerHTML = editorHTML;
        this.scrollTop = currentScrollPosition;             // Restore scroll position
        this.update();
    }

    update() {
        let cellList = this.renderElement.querySelectorAll('.grid-cell'); //,.grid-row

        const cursorCellIndex = this.editor.cursorCellIndex;
        const selectedIndicies = this.editor.status.selectedIndicies;
        // const selectedIndexCursor = this.editor.status.;
        for(let i=0; i<cellList.length; i++) {
            const cell = cellList[i];
            // const position = parseFloat(cell.getAttribute('data-position'));
            const index = parseInt(cell.getAttribute('data-index'));
            cell.classList.toggle('selected', selectedIndicies.indexOf(index) !== -1);
            cell.classList.toggle('cursor', cursorCellIndex === i);
        }

    }
}
// customElements.define('music-song-grid', SongEditorGrid);
