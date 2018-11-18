class MusicEditorGridElement extends HTMLElement {
    constructor() {
        super();
        this.longPressTimeout = null;
        this.editor = null;
    }


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
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
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

        try {
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
                                const formValues = {
                                    instrument: this.editor.querySelector('form.form-instruction-instrument').instrument.value,
                                    duration: this.editor.querySelector('form.form-instruction-duration').duration.value,
                                    command: this.editor.querySelector('form.form-instruction-command').command.value,
                                    velocity: this.editor.querySelector('form.form-instruction-velocity').velocity.value
                                };
                                let newInstruction = {
                                    command: this.editor.keyboardLayout[e.key]
                                        || formValues.command || 'C4',
                                };

                                if(formValues.instrument || formValues.instrument === 0)
                                    newInstruction.instrument = parseInt(formValues.instrument);
                                if(formValues.duration)
                                    newInstruction.duration = formValues.duration;
                                if(formValues.velocity || formValues.velocity === 0)
                                    newInstruction.velocity = formValues.velocity;
                                this.insertInstruction(newInstruction, insertPosition);
                                this.render();
                                this.editor.gridSelect(e, insertPosition);
                                break;
                        }
                    }

                    let cursorPosition = this.editor.gridStatus.cursorPosition;
                    const currentGroup = this.getGroupName();
                    const instructionList = this.editor.player.getInstructions(currentGroup);
                    let cursorInstruction = instructionList[cursorPosition];
                    switch (keyEvent) {
                        case 'Delete':
                            this.editor.deleteInstruction(this.getGroupName(), this.editor.gridStatus.selectedPositions);
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
                                    duration: parseFloat(this.currentCell.parentNode.getAttribute('data-pause'))
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
                                    duration: parseFloat(this.currentCell.parentNode.getAttribute('data-pause'))
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
                            this.replaceInstructionParams(cursorPosition, {
                                command: this.editor.keyboardLayout[e.key]
                            });
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

    insertInstruction(instruction, insertPosition) {
        return this.editor.insertInstructions(this.getGroupName(), insertPosition, instruction);
    }

    deleteInstruction(deletePosition) {
        return this.editor.deleteInstruction(this.getGroupName(), deletePosition, 1);
    }

    replaceInstructionParams(replacePositions, replaceParams) {
        return this.editor.replaceInstructionParams(this.getGroupName(), replacePositions, replaceParams);
    }

    render() {
        // TODO: REFACTOR gridstatus into editor grid only
        const gridStatus = this.editor.gridStatus;
        const groupName = gridStatus.groupName;
        const selectedPositions = gridStatus.selectedPositions;
        const cursorPosition = gridStatus.cursorPosition;
        const editor = this.editor;
        const song = editor.getSong();
        if(!song)
            return;
        // var pausesPerBeat = song.pausesPerBeat;

        // const beatsPerMinute = song.beatsPerMinute;
        // const beatsPerMeasure = song.beatsPerMeasure;
        const instructionList = song.instructions[groupName];

        let odd = false;
        let editorHTML = '', cellHTML = '', songPosition = 0; // , lastPause = 0;

        const addInstructionHTML = (index, instruction, selectedInstruction, cursorInstruction) => {
            const noteCSS = [];
            if(selectedInstruction)
                noteCSS.push('selected');

            if(cursorInstruction)
                noteCSS.push('cursor');

            cellHTML += `<div class="grid-cell grid-cell-note ${noteCSS.join(' ')}" data-index="${index}">`;
            cellHTML += `<div class="grid-parameter command">${instruction.command}</div>`;
            if (typeof instruction.instrument !== 'undefined')
                cellHTML += `<div class="grid-parameter instrument">${this.editor.format(instruction.instrument, 'instrument')}</div>`;
            if (typeof instruction.velocity !== 'undefined')
                cellHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
            if (typeof instruction.duration !== 'undefined')
                cellHTML += `<div class="grid-parameter duration">${editor.format(instruction.duration, 'duration')}</div>`;
            cellHTML += `</div>`;
        };

        const addPauseHTML = (index, pauseInstruction) => {
            if(typeof pauseInstruction.duration !== "number")
                throw new console.error("Invalid Pause command: ", pauseInstruction);

            const duration = pauseInstruction.duration;
            const maxPause = gridStatus.maxPause;
            for(let subPause=0; subPause<duration; subPause+=maxPause) {
                let subDuration = maxPause;
                if(subPause + maxPause > duration)
                    subDuration = subPause + maxPause - duration;

                // if (Math.floor(songPosition / beatsPerMeasure) !== Math.floor((songPosition + pauseInstruction.pause) / beatsPerMeasure))
                //     rowCSS.push('measure-end');

                var rowCSS = (odd = !odd) ? ['odd'] : [];

                const gridCSS = subDuration >= 1 ? 'duration-large'
                    : (subDuration >= 1/4 ? 'duration-medium'
                        : 'duration-small');
                editorHTML +=
                    `<div class="grid-row ${rowCSS.join(' ')}">`
                    +   cellHTML
                    +   `<div class="grid-cell grid-cell-new" data-position="${songPosition}">`
                    +     `<div class="grid-parameter">+</div>`
                    +   `</div>`
                    +   `<div class="grid-cell-pause ${gridCSS}" data-index="${index}" data-position="${songPosition}" data-duration="${subDuration}">`
                    +     `<div class="grid-parameter">${this.editor.format(subDuration, 'duration')}</div>`
                    +   `</div>`
                    + `</div>`;
                cellHTML = '';

                songPosition += subDuration;
            }

        };

        for(let index=0; index<instructionList.length; index++) {
            const instruction = instructionList[index];
            let selectedInstruction = false;
            let cursorInstruction = cursorPosition === index;
            if(selectedPositions.indexOf(index) !== -1) {
                selectedInstruction = true;
            }

            if (instruction.command[0] === '!') {
                const functionName = instruction.command.substr(1);
                switch (functionName) {
                    case 'pause':
                        //songPosition += instruction.duration;
                        addPauseHTML(index, instruction);
                        break;

                    default:
                        console.error("Unknown function: " + instruction.command);
                        break;
                }
            } else {
                addInstructionHTML(index, instruction, selectedInstruction, cursorInstruction);
            }
        }

        const currentScrollPosition = this.scrollTop || 0;
        this.innerHTML = editorHTML;
        this.scrollTop = currentScrollPosition;
    }

    getGroupName() { return this.editor.gridStatus.groupName; }

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

        this.scrollToCursor();
    }

    scrollToCursor() {
        if(!this.currentCell)
            return;
        const currentCellParent = this.currentCell.parentNode;
        // console.log("TODO: ", currentCellParent.offsetTop, this.scrollTop, this.offsetHeight);
        if(currentCellParent.offsetTop < this.scrollTop)
            this.scrollTop = currentCellParent.offsetTop;
        if(currentCellParent.offsetTop > this.scrollTop + this.offsetHeight)
            this.scrollTop = currentCellParent.offsetTop - this.offsetHeight + this.currentCell.offsetHeight;
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
customElements.define('music-editor-grid', MusicEditorGridElement);
