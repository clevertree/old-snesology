
((INCLUDE_CSS) => {
    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
})("editor/music-editor-grid.css");

class MusicEditorGridElement extends HTMLElement {
    constructor() {
        super();
        this.longPressTimeout = null;
        this.editor = null;
    }

    // Can't select pauses!

    get groupName() { return this.getAttribute('data-group') || 'root'; }
    get instructionList() {
        const song = this.editor.getSongData();
        const groupName = this.groupName;
        if(!song.instructions[groupName])
            throw new Error("Group instructions not found: " + groupName);
        return song.instructions[groupName];
    }

    get selectedCells() { return this.querySelectorAll('.grid-cell-instruction.selected'); }
    get cursorCell() { return this.querySelector('.grid-cell.cursor'); }
    get cursorPosition() { const cell = this.cursorCell; return cell ? parseFloat(cell.parentNode.getAttribute('data-position')) : null; }
    get selectedIndices() { return [].map.call(this.selectedCells, (elm => parseInt(elm.getAttribute('data-index')))); }
    get selectedRows() { return this.querySelectorAll('.grid-row.selected'); }
    get selectedPauseIndices() { return [].map.call(this.selectedRows, (elm => parseInt(elm.getAttribute('data-index')))); }

    get nextCell() {
        const cellList = this.querySelectorAll('.grid-cell');
        const currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(currentIndex === -1)
            throw new Error("Cursor Cell not found");
        return cellList[currentIndex + 1];
    }

    get previousCell() {
        const cellList = this.querySelectorAll('.grid-cell');
        let currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        if(currentIndex === -1)
            throw new Error("Cursor Cell not found");
        if(currentIndex === 0)
            currentIndex = cellList.length - 1;
        return cellList[currentIndex - 1];
    }

    get nextRowCell() {
        const cellList = this.querySelectorAll('.grid-cell');
        const currentIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        for(let i=currentIndex;i<cellList.length;i++)
            if(cellList[i].parentNode !== cellList[currentIndex].parentNode)
                return cellList[i];
        return null;
    }

    get previousRowCell() {
        const cellList = this.querySelectorAll('.grid-cell');
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
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
        this.addEventListener('contextmenu', this.onInput);
        this.addEventListener('keydown', this.onInput);
        // this.addEventListener('keyup', this.onInput.bind(this));
        // this.addEventListener('click', this.onInput.bind(this));
        this.addEventListener('mousedown', this.onInput);
        this.addEventListener('mouseup', this.onInput);
        this.addEventListener('longpress', this.onInput);

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

    render() {
        let cellList = this.querySelectorAll('.grid-cell');
        const cursorCellIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
        const selectedIndices = this.selectedIndices;
        let instrumentFilter = this.editor.menu.fieldRenderInstrument.value === "" ? null : parseInt(this.editor.menu.fieldRenderInstrument.value);

        const gridDuration = parseFloat(this.editor.menu.fieldRenderDuration.value);

        const instructionList = this.instructionList;

        let odd = false;
        let editorHTML = '', cellHTML = '', songPosition = 0; // , lastPause = 0;

        const addInstructionHTML = (index, instruction, selectedInstruction) => {
            const selectedClass = selectedInstruction ? ' selected' : '';
            cellHTML += `<div class="grid-cell grid-cell-instruction${selectedClass}" data-index="${index}">`;
            cellHTML += `<div class="grid-parameter command">${instruction.command}</div>`;
            if (typeof instruction.instrument !== 'undefined')
                cellHTML += `<div class="grid-parameter instrument">${this.editor.format(instruction.instrument, 'instrument')}</div>`;
            if (typeof instruction.velocity !== 'undefined')
                cellHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
            if (typeof instruction.duration !== 'undefined')
                cellHTML += `<div class="grid-parameter duration">${this.editor.format(instruction.duration, 'duration')}</div>`;
            cellHTML += `</div>`;
        };

        const addPauseHTML = (index, pauseInstruction) => {
            if(typeof pauseInstruction.duration !== "number")
                throw console.error(`Invalid Pause command: (${index})`, pauseInstruction);

            const duration = pauseInstruction.duration;
            for(let subPause=0; subPause<duration; subPause+=gridDuration) {
                let subDuration = gridDuration;
                if(subPause + gridDuration > duration)
                    subDuration = subPause + gridDuration - duration;

                // if (Math.floor(songPosition / beatsPerMeasure) !== Math.floor((songPosition + pauseInstruction.pause) / beatsPerMeasure))
                //     rowCSS.push('measure-end');

                var rowCSS = (odd = !odd) ? ['odd'] : [];

                // const gridCSS = subDuration >= 1 ? 'duration-large'
                //     : (subDuration >= 1/4 ? 'duration-medium'
                //         : 'duration-small');
                editorHTML +=
                    `<div class="grid-row ${rowCSS.join(' ')}" data-index="${index}" data-position="${songPosition}">`
                    +   cellHTML
                    +   `<div class="grid-cell grid-cell-new">`
                    +     `<div class="grid-parameter">+</div>`
                    +   `</div>`
                    +   `<div class="grid-cell-pause">`
                    +     `<div class="grid-parameter">${this.editor.format(duration, 'duration')}</div>`
                    +   `</div>`
                    + `</div>`;
                cellHTML = '';

                songPosition += subDuration;
            }

        };

        for(let index=0; index<instructionList.length; index++) {
            const instruction = instructionList[index];
            let selectedInstruction = false;
            // let cursorInstruction = cursorCellIndex === index;
            if(selectedIndices.indexOf(index) !== -1) {
                selectedInstruction = true;
            }

            if (instruction.command[0] === '!') {
                const functionName = instruction.command.substr(1);
                switch (functionName) {
                    case 'pause':
                        //songPosition += instruction.duration;
                        addPauseHTML(index, instruction);
                        // TODO: skip pauses with no instructions?
                        break;

                    default:
                        console.error("Unknown function: " + instruction.command);
                        break;
                }
            } else {
                if(instrumentFilter === null || instrumentFilter === (instruction.instrument || 0))
                    addInstructionHTML(index, instruction, selectedInstruction);
            }
        }

        const currentScrollPosition = this.scrollTop || 0;
        this.innerHTML = editorHTML;
        this.scrollTop = currentScrollPosition;

        cellList = this.querySelectorAll('.grid-cell');
        // for(let i=0; i<selectedIndices.length; i++)
        //     if(cellList[selectedIndices[i]])
        //         cellList[selectedIndices[i]].classList.add('selected');
        if(cellList[cursorCellIndex])
            cellList[cursorCellIndex].classList.add('cursor');
    }

    onInput(e) {
        if (e.defaultPrevented)
            return;

        try {
            // const cursorPositions = this.selectedPositions;
            // const initialCursorPosition = cursorPositions[0];
            // const currentCursorPosition = cursorPositions[cursorPositions.length - 1];

            // const editor = this.editor;

            switch (e.type) {
                case 'keydown':

                    let keyEvent = e.key;
                    if (this.editor.getKeyboardCommand(e.key))
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    // let keydownCellElm = this.cursorCell;

                    let selectedIndices = this.selectedIndices;
                    const instructionList = this.editor.player.getInstructions(this.groupName);
                    switch (keyEvent) {
                        case 'Delete':
                            e.preventDefault();
                            this.editor.deleteInstructionAtIndex(this.groupName, selectedIndices);
                            // editor.render(true);
                            break;
                        case 'Escape':
                        case 'Backspace':
                            e.preventDefault();
                            this.navigatePop();
                            this.selectIndices(0);
                            this.focus();
                            break;
                        case 'Enter':
                            e.preventDefault();
                            if (this.cursorCell.classList.contains('grid-cell-new')) {
                                let newInstruction = this.editor.menu.getInstructionFormValues(true);
                                if(!newInstruction)
                                    return console.info("Insert canceled");
                                let insertIndex = this.insertInstructionAtPosition(newInstruction, this.cursorPosition);
                                this.render();
                                this.selectIndices(insertIndex);
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
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.playInstruction(instructionList[i]);
                            e.preventDefault();
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            if(!this.nextCell) {
                                this.increaseGridSize();
                                // this.render();
                                this.selectCell(e, this.nextCell);

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
                                this.increaseGridSize();
                                // this.render();
                                this.selectCell(e, this.nextRowCell);

                            } else {
                                this.selectCell(e, this.nextRowCell);
                            }
                            // this.focus();
                            e.preventDefault();
                            break;

                        case 'ArrowUp':
                            this.selectCell(e, this.previousRowCell || this.previousCell || this.cursorCell);
                            // this.focus();
                            e.preventDefault();
                            break;

                        case ' ':
                            this.selectCell(e, this.cursorCell);
                            if(e.ctrlKey) e.preventDefault();
                            break;

                        case 'PlayFrequency':
                            let newCommand = this.editor.getKeyboardCommand(e.key);

                            if (this.cursorCell.classList.contains('grid-cell-new')) {
                                let newInstruction = this.editor.menu.getInstructionFormValues(true);
                                newInstruction.command = newCommand;

                                const insertIndex = this.insertInstructionAtPosition(newInstruction, this.cursorPosition);
                                // this.render();
                                this.selectIndices(insertIndex, [insertIndex]);
                                // cursorInstruction = instructionList[insertIndex];
                            } else {
                                this.replaceInstructionParams(this.selectedIndices, {
                                    command: newCommand
                                });
                                this.selectIndices(this.selectedIndices[0], this.selectedIndices);
                            }

                            this.render();
                            this.focus();
                            for(let i=0; i<selectedIndices.length; i++)
                                this.editor.playInstruction(instructionList[selectedIndices[i]]);

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
                        cellElm = cellElm.childNodes[cellElm.childNodes.length-2];
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
                    }, this.editor.status.longPressTimeout);
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
                    if (e.target.classList.contains('grid-parameter')) {
                        console.info("TODO: add parameter editor at top of context menu: ", e.target);
                    }
                    this.editor.menu.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();
                    break;

            }
        } catch (e) {
            this.editor.onError(e);
        }

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
        let grids = this.querySelectorAll('music-editor-grid');
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
                Object.assign({}, MusicEditorElement.DEFAULT_GRID_STATUS, {
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
        this.replaceInstructionParams(lastIndex, {
            duration: lastInstruction.duration + parseFloat(this.editor.menu.fieldRenderDuration.value)
        });
    }

    insertInstructionAtIndex(instruction, insertIndex) {
        return this.editor.insertInstructionAtIndex(this.groupName, insertIndex, instruction);
    }
    insertInstructionAtPosition(instruction, insertTimePosition) {
        return this.editor.insertInstructionAtPosition(this.groupName, insertTimePosition, instruction);
    }

    deleteInstructionAtIndex(deleteIndex) {
        return this.editor.deleteInstructionAtIndex(this.groupName, deleteIndex, 1);
    }

    replaceInstructionParams(replaceIndex, replaceParams) {
        return this.editor.replaceInstructionParams(this.groupName, replaceIndex, replaceParams);
    }


    selectCell(e, cursorCell) {
        this.querySelectorAll('.grid-cell.cursor')
            .forEach(elm => elm.classList.remove('cursor'));
        cursorCell.classList.add('cursor');

        this.querySelectorAll('.grid-cell.selected,.grid-row.selected')
            .forEach(elm => elm.classList.remove('selected'));
        if(cursorCell.classList.contains('grid-cell-instruction'))
            cursorCell.classList.add('selected');
        cursorCell.parentNode.classList.add('selected');
        this.editor.menu.update();
    }

    selectIndices(cursorIndex, selectedIndices) {
        const cursorCell = this.querySelector(`.grid-cell[data-index='${cursorIndex}']`);
        if (!cursorCell)
            throw new Error("Invalid cursor cell");

        this.querySelectorAll('.grid-cell.cursor')
            .forEach(elm => elm.classList.remove('cursor'));
        cursorCell.classList.add('cursor');

        this.querySelectorAll('.grid-cell.selected,.grid-row.selected')
            .forEach(elm => elm.classList.remove('selected'));
        if(selectedIndices) {
            for (let i = 0; i < selectedIndices.length; i++) {
                const selectedIndex = selectedIndices[i];
                const selectedCell = this.querySelector(`.grid-cell[data-index='${selectedIndex}']`);
                // if(selectedCell.classList.contains('grid-cell-new'))
                //     continue;
                if (!selectedCell)
                    throw new Error("Invalid selected cell index: " + selectedIndex);
                selectedCell.classList.add('selected');
                selectedCell.parentNode.classList.add('selected');
            }
        }

        this.scrollToCursor();
        this.editor.menu.update();
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
        return this.querySelector(`.grid-cell[data-index='${instructionIndex}'`);
    }
}
customElements.define('music-editor-grid', MusicEditorGridElement);
