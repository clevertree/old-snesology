class MusicEditorGridElement extends HTMLElement {
    constructor() {
        super();
        this.longPressTimeout = null;
        this.editor = null;
    }

    // Can't select pauses!

    get groupName() { return this.getAttribute('data-group') || 'root'; }
    get instructionList() {
        const song = this.editor.getSong();
        const groupName = this.groupName;
        if(!song.instructions[groupName])
            throw new Error("Group instructions not found: " + groupName);
        return song.instructions[groupName];
    }
    get maxPause() { return parseFloat(this.getAttribute('data-max-pause')) || 1; }
    set maxPause(duration) { this.setAttribute('data-max-pause', duration); }

    get selectedCells() { return this.querySelectorAll('.grid-cell-instruction.selected'); }
    get cursorCell() { return this.querySelector('.grid-cell.cursor'); }
    get cursorIndex() { const cell = this.cursorCell; return cell ? parseInt(cell.getAttribute('data-index')) : null; }
    get selectedIndices() { return [].map.call(this.selectedCells, (elm => parseInt(elm.getAttribute('data-index')))); }
    get selectedPauseIndices() {
        const instructionList = this.instructionList;
        const selectedIndices = this.selectedIndices;
        const selectedPausePositions = [];
        for(let i=0; i<selectedIndices.length; i++) {
            const selectedPosition = selectedIndices[i];
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
        let currentCell = this.cursorCell;
        const thisRow = currentCell.parentNode;
        while(currentCell && currentCell.parentNode === thisRow)
            currentCell = this.nextCell;
        return currentCell;
    }

    get previousRowCell() {
        let currentCell = this.cursorCell;
        const thisRow = currentCell.parentNode;
        while(currentCell && currentCell.parentNode === thisRow)
            currentCell = this.previousCell;
        return currentCell;
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

    render() {
        // const groupName = this.groupName || 'root';
        // Get cell positions, not instrument indices
        let cellList = this.querySelectorAll('.grid-cell');
        let cursorCellIndex = this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;


        const selectedIndices = this.selectedIndices;
        const cursorIndex = this.cursorIndex;
        const maxPause = this.maxPause;
        // var pausesPerBeat = song.pausesPerBeat;

        // const beatsPerMinute = song.beatsPerMinute;
        // const beatsPerMeasure = song.beatsPerMeasure;
        const instructionList = this.instructionList;

        let odd = false;
        let editorHTML = '', cellHTML = '', songPosition = 0; // , lastPause = 0;

        const addInstructionHTML = (index, instruction, selectedInstruction, cursorInstruction) => {
            const noteCSS = [];
            if(selectedInstruction)
                noteCSS.push('selected');

            if(cursorInstruction)
                noteCSS.push('cursor');

            cellHTML += `<div class="grid-cell grid-cell-instruction ${noteCSS.join(' ')}" data-index="${index}">`;
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
                throw new console.error("Invalid Pause command: ", pauseInstruction);

            const duration = pauseInstruction.duration;
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
                    +   `<div class="grid-cell-pause ${gridCSS}">`
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
            let cursorInstruction = cursorIndex === index;
            if(selectedIndices.indexOf(index) !== -1) {
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

        cellList = this.querySelectorAll('.grid-cell');
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
                    if (this.editor.keyboardLayout[e.key])
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    let keydownCellElm = this.cursorCell;

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
                                this.editor.grid.selectIndices(insertPosition);
                                break;
                        }
                    }

                    let cursorIndex = this.cursorIndex;
                    const instructionList = this.editor.player.getInstructions(this.groupName);
                    let cursorInstruction = instructionList[cursorIndex];
                    switch (keyEvent) {
                        case 'Delete':
                            this.editor.deleteInstruction(this.groupName, this.selectedPositions);
                            e.preventDefault();
                            // editor.render(true);
                            break;
                        case 'Escape':
                        case 'Backspace':
                            this.editor.gridNavigatePop();
                            this.editor.grid.selectIndices(0);
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
                            this.replaceInstructionParams(cursorIndex, {
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

    increaseGridSize() {
        const instructionList = this.instructionList;
        let lastIndex = instructionList.length - 1;
        let lastInstruction = instructionList[lastIndex];
        if(lastInstruction.command !== '!pause') {
            throw new Error("TODO: Insert new pause");
        }
        this.replaceInstructionParams(lastIndex, {
            duration: lastInstruction.duration + this.maxPause
        });
    }

    insertInstruction(instruction, insertPosition) {
        return this.editor.insertInstructions(this.groupName, insertPosition, instruction);
    }

    deleteInstruction(deletePosition) {
        return this.editor.deleteInstruction(this.groupName, deletePosition, 1);
    }

    replaceInstructionParams(replacePositions, replaceParams) {
        return this.editor.replaceInstructionParams(this.groupName, replacePositions, replaceParams);
    }


    selectCell(e, cursorCell) {
        this.querySelectorAll('.grid-cell.cursor')
            .forEach(elm => elm.classList.remove('cursor'));
        cursorCell.classList.add('cursor');

        this.querySelectorAll('.grid-cell.selected,.grid-row.selected')
            .forEach(elm => elm.classList.remove('selected'));
        if(cursorCell.classList.contains('grid-cell-instruction')) {
            cursorCell.classList.add('selected');
            cursorCell.parentNode.classList.toggle('selected',
                cursorCell.parentNode.querySelectorAll('.selected').length > 0);
        }

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
        for(let i=0; i<selectedIndices.length; i++) {
            const selectedIndex = selectedIndices[i];
            const selectedCell = this.querySelector(`.grid-cell[data-index='${selectedIndex}']`);
            // if(selectedCell.classList.contains('grid-cell-new'))
            //     continue;
            if (!selectedCell)
                throw new Error("Invalid selected cell index: " + selectedIndex);
            selectedCell.classList.add('selected');
            selectedCell.parentNode.classList.toggle('selected',
                selectedCell.parentNode.querySelectorAll('.selected').length > 0);
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
