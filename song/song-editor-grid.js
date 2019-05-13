class SongEditorGrid {
    constructor(editor, groupName='root') {
        this.editor = editor;
        this.groupName = groupName;
        // this.cursorCellIndex = 0;
        this.minimumGridLengthTicks = null;

    }

    get renderElement() {
        let renderElement = this.editor.querySelector('table.editor-grid');
        if(!renderElement) {
            const renderElementContainer = document.createElement('div');
            renderElementContainer.classList.add('editor-grid-container');
            this.editor.appendChild(renderElementContainer);
            renderElement = document.createElement('table');
            renderElement.setAttribute('tabindex', '0');
            renderElement.classList.add('editor-grid');
            renderElementContainer.appendChild(renderElement);
            // this.editor.innerHTML += `<table class="editor-grid" tabindex="0"></table>`;
            // renderElement = this.editor.querySelector('table.editor-grid');
        }
        return renderElement;
    }

    // // Can't select pauses!
    // get instructionList() {
    //     const song = this.editor.getSongData();
    //     const groupName = this.groupName;
    //     if(!song.instructions[groupName])
    //         throw new Error("Group instructions not found: " + groupName);
    //     return song.instructions[groupName];
    // }

    get selectedCells() { return this.renderElement.querySelectorAll('.instruction.selected'); }
    get cursorCell() { return this.renderElement.querySelector('.instruction.cursor'); }
    get cursorCellIndex() {
        const cellList = this.renderElement.querySelectorAll('.instruction');
        return this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
    }
    get cursorPosition() {
        return parseFloat(this.cursorCell.getAttribute('data-position'));
    }
    get selectedIndicies() { return [].map.call(this.selectedCells, (elm => parseInt(elm.getAttribute('data-index')))); }
    // get selectedRows() { return this.renderElement.querySelectorAll('.grid-row.selected'); }
    // get selectedPauseIndices() { return [].map.call(this.selectedRows, (elm => parseInt(elm.getAttribute('data-index')))); }

    // get nextCell() {
    //     const cursorElm = this.cursorCell;
    //     if(cursorElm.nextElementSibling && cursorElm.nextElementSibling.matches('.instruction'))
    //         return cursorElm.nextElementSibling;
    //     return null;
    // }
    // get previousCell() {
    //     const cursorElm = this.cursorCell;
    //     if(cursorElm.previousElementSibling && cursorElm.previousElementSibling.matches('.instruction'))
    //         return cursorElm.previousElementSibling;
    //     return null;
    // }

    // get nextCell() {
    //     const cellList = this.renderElement.querySelectorAll('.instruction');
    //     return cellList[this.cursorCellIndex + 1];
    // }
    //
    // get previousCell() {
    //     const cellList = this.renderElement.querySelectorAll('.instruction');
    //     let cursorCellIndex = this.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
    //     if(cursorCellIndex === 0)
    //         cursorCellIndex = cellList.length - 1;
    //     console.log("previousCell", cellList[cursorCellIndex - 1]);
    //     return cellList[cursorCellIndex - 1];
    // }

    // get nextRowCell() {
    //     const cellList = this.renderElement.querySelectorAll('.instruction');
    //     const cursorCellIndex = this.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
    //     for(let i=cursorCellIndex;i<cellList.length;i++)
    //         if(cellList[i].parentNode !== cellList[cursorCellIndex].parentNode)
    //             return cellList[i];
    //     return null;
    // }
    //
    // get previousRowCell() {
    //     const cellList = this.renderElement.querySelectorAll('.instruction');
    //     const cursorCellIndex = this.cursorCellIndex; // this.cursorCell ? [].indexOf.call(cellList, this.cursorCell) : 0;
    //     for(let i=cursorCellIndex;i>=0;i--)
    //         if(cellList[i].parentNode !== cellList[cursorCellIndex].parentNode)
    //             return cellList[i];
    //     return null;
    // }

    focus() {
        // if(this.renderElement !== document.activeElement) {
//             console.log("Focus", document.activeElement);
//             this.renderElement.focus();
//         }

    }

    onInput(e) {
        if (e.defaultPrevented)
            return;
        if(e.target instanceof Node && !this.renderElement.contains(e.target))
            return;

        // this.focus();

        try {
            let selectedIndicies = this.selectedIndicies;
            const instructionList = this.editor.renderer.getInstructions(this.groupName);

            switch (e.type) {
                case 'midimessage':
//                     console.log("MIDI", e.data, e);
                    switch(e.data[0]) {
                        case 144:   // Note On
                            e.preventDefault();
                            let newMIDICommand = this.editor.renderer.getCommandFromMIDINote(e.data[1]);
                            let newMIDIVelocity = Math.round((e.data[2] / 128) * 100);

                            if (this.cursorCell.matches('.new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                newMIDICommand = this.replaceFrequencyAlias(newMIDICommand, newInstruction.instrument);
                                newInstruction[1] = newMIDICommand;
                                newInstruction[3] = newMIDIVelocity;

                                const insertPosition = this.cursorPosition;
                                const insertIndex = this.insertInstructionAtPosition(insertPosition, newInstruction);
                                // this.render();
                                this.editor.selectInstructions(insertIndex);
                                selectedIndicies = [insertIndex];
                                // cursorInstruction = instructionList[insertIndex];
                            } else {
                                for(let i=0; i<selectedIndicies.length; i++) {
                                    const selectedInstruction = instructionList[selectedIndicies[i]];
                                    const replaceCommand = this.replaceFrequencyAlias(newMIDICommand, selectedInstruction.instrument);
                                    this.replaceInstructionCommand(selectedIndicies[i], replaceCommand);
                                    this.replaceInstructionVelocity(selectedIndicies[i], newMIDIVelocity);
                                }
                                // this.editor.selectInstructions(this.selectedIndicies[0]); // TODO: select all
                            }

                            // this.render();
                            for(let i=0; i<selectedIndicies.length; i++)
                                this.editor.renderer.playInstruction(instructionList[selectedIndicies[i]]);

                            // song.gridSelectInstructions([selectedInstruction]);
                            // e.preventDefault();
                            break;
                        case 128:   // Note Off
                            // TODO: turn off playing note, optionally set duration of note
                            break;
                    }
                    break;
                case 'keydown':

                    let keyEvent = e.key;
                    if (!e.ctrlKey && this.editor.keyboard.getKeyboardCommand(e.key))
                        keyEvent = 'PlayFrequency';
                    if (keyEvent === 'Enter' && e.altKey)
                        keyEvent = 'ContextMenu';

                    // let keydownCellElm = this.cursorCell;

                    switch (keyEvent) {
                        case 'Delete':
                            e.preventDefault();
                            for(let i=0; i<selectedIndicies.length; i++) {
                                this.editor.renderer.deleteInstructionAtIndex(this.groupName, selectedIndicies[i]);
                            }
                            // this.render();
                            // song.render(true);
                            break;

                        case 'Escape':
                        case 'Backspace':
                            e.preventDefault();
                            this.navigatePop();
                            this.editor.selectInstructions(0);
                            // this.focus();
                            break;

                        case 'Enter':
                            e.preventDefault();
                            if (this.cursorCell.matches('.new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                if(!newInstruction)
                                    return console.info("Insert canceled");
                                let insertIndex = this.insertInstructionAtPosition(this.cursorPosition, newInstruction);
                                // this.render();
                                this.editor.selectInstructions(insertIndex);
                            }

                            // if (cursorInstruction.command[0] === '@') {
                            //     const groupName = cursorInstruction.command.substr(1);
                            //     this.navigate(groupName, cursorInstruction);
                            //     //thisSelect(e, 0);
                            //     //this.focus();
                            // } else {
                            for(let i=0; i<selectedIndicies.length; i++)
                                this.editor.renderer.playInstruction(instructionList[i]);
                            // }
                            break;

                        case 'Play':
                            e.preventDefault();
                            for(let i=0; i<selectedIndicies.length; i++) {
                                this.editor.renderer.playInstruction(instructionList[i]);
                            }
                            break;

                        // ctrlKey && metaKey skips a measure. shiftKey selects a range
                        case 'ArrowRight':
                            this.selectNextCell(e);
                            break;

                        case 'ArrowLeft':
                            this.selectPreviousCell(e);
                            break;

                        case 'ArrowDown':
                            this.selectNextRowCell(e);
                            break;

                        case 'ArrowUp':
                            this.selectPreviousRowCell(e);
                            break;

                        case ' ':
                            e.preventDefault();
                            this.selectCell(e, this.cursorCell);
                            if(e.ctrlKey) e.preventDefault();
                            break;

                        case 'PlayFrequency':
                            let newCommand = this.editor.keyboard.getKeyboardCommand(e.key);
                            if(newCommand === null)
                                break;

                            e.preventDefault();

                            if (this.cursorCell.matches('.new')) {
                                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                                newCommand = this.replaceFrequencyAlias(newCommand, newInstruction.instrument);
                                newInstruction[1] = newCommand;

                                const insertPosition = this.cursorPosition;
                                const insertIndex = this.insertInstructionAtPosition(insertPosition, newInstruction);
                                // this.render();
                                this.editor.selectInstructions(insertIndex);
                                selectedIndicies = [insertIndex];
                                // cursorInstruction = instructionList[insertIndex];
                            } else {
                                for(let i=0; i<selectedIndicies.length; i++) {
                                    const selectedInstruction = instructionList[selectedIndicies[i]];
                                    const replaceCommand = this.replaceFrequencyAlias(newCommand, selectedInstruction.instrument);
                                    this.replaceInstructionCommand(selectedIndicies[i], replaceCommand);
                                }
                                // this.editor.selectInstructions(this.selectedIndicies[0]); // TODO: select all
                            }

                            // this.render();
                            for(let i=0; i<selectedIndicies.length; i++)
                                this.editor.renderer.playInstructionAtIndex(this.groupName, selectedIndicies[i]);

                            // song.gridSelectInstructions([selectedInstruction]);
                            // e.preventDefault();
                            break;

                    }
                    break;

                case 'mousedown':
                    this.editor.menu.closeMenu();
                    if (e.target.matches('.instruction,.instruction > div')) {
                        return this.onCellInput(e);
                    }
                    if (e.target.matches('td,tr')) { // classList.contains('grid-row')) {
                        return this.onRowInput(e);
                    }
                    // e.preventDefault();


                    // e.target = this.renderElement.querySelector('.grid-cell.selected') || this.renderElement.querySelector('.instruction'); // Choose selected or default cell
                    break;

                case 'mouseup':
                    break;

                case 'longpress':
                    // if (e.target.classList.contains('grid-parameter')
                    //     || e.target.classList.contains('grid-cell')
                    //     || e.target.classList.contains('grid-data')
                    //     || e.target.classList.contains('grid-row')) {
                        e.preventDefault();
                        // console.log("Longpress", e);
                        this.editor.menu.openContextMenu(e);
                    // }
                    break;

                case 'contextmenu':
                    // if (e.target.classList.contains('grid-parameter')) {
                    //     console.info("TODO: add parameter song at top of context menu: ", e.target); // huh?
                    // }
                    if(!e.altKey) {
                        e.preventDefault();
                        this.editor.menu.openContextMenu(e);
                    }

                    break;

                default:
                    throw new Error("Unhandled type: " + e.type);

            }
        } catch (err) {
            this.editor.onError(err);
        }

    }

    createNewInstructionCell(rowElement) {
        this.renderElement.querySelectorAll('div.instruction.new')
            .forEach((elm) => elm.parentNode.removeChild(elm));
        const newInstructionElm = document.createElement('div');
        newInstructionElm.classList.add('instruction', 'new');
        newInstructionElm.setAttribute('data-position', rowElement.getAttribute('data-position'));
        newInstructionElm.innerHTML = `<div class="command">+</div>`;
        rowElement.firstElementChild.appendChild(newInstructionElm);
        return newInstructionElm;
    }

    onRowInput(e) {
        e.preventDefault();
        let selectedRow = e.target;
        if(e.target.matches('td'))
            selectedRow = selectedRow.parentNode;
        this.renderElement.querySelectorAll('div.instruction.new')
            .forEach((elm) => elm.parentNode.removeChild(elm));

        this.editor.selectInstructions([]);
        const newInstructionElm = this.createNewInstructionCell(selectedRow);
        this.selectCell(e, newInstructionElm);    }

    onCellInput(e) {
        e.preventDefault();
        let selectedCell = e.target;
        if(selectedCell.matches('.instruction > div'))
            selectedCell = selectedCell.parentNode;
        this.selectCell(e, selectedCell);
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

    selectNextCell(e) {
        const cursorCell = this.cursorCell;
        if(cursorCell.nextElementSibling && cursorCell.nextElementSibling.matches('.instruction'))
            return this.selectCell(e, cursorCell.nextElementSibling);

        // If no previous row cell, create new instruction cell
        if(!cursorCell.matches('.new')) {
            const currentRowElm = this.cursorCell.parentNode.parentNode;
            return this.selectCell(e, this.createNewInstructionCell(currentRowElm));
        }

        this.selectNextRowCell(e);
    }
    selectNextRowCell(e) {
        const cursorRow = this.cursorCell.parentNode.parentNode;
        if(!cursorRow.nextElementSibling) {
            this.increaseGridSize();
            if(!cursorRow.nextElementSibling)
                throw new Error("New row was not created");
        }

        const nextRowElm = cursorRow.nextElementSibling;
        let nextCell = nextRowElm.querySelector('.instruction');
        if(nextCell) {
            return this.selectCell(e, nextCell);
        }

        this.selectCell(e, this.createNewInstructionCell(nextRowElm));
    }

    selectPreviousCell(e) {
        const cursorCell = this.cursorCell;
        if(cursorCell.previousElementSibling && cursorCell.previousElementSibling.matches('.instruction'))
            return this.selectCell(e, cursorCell.previousElementSibling);

        this.selectPreviousRowCell(e);
    }
    selectPreviousRowCell(e) {
        const cursorRow = this.cursorCell.parentNode.parentNode;

        if(!cursorRow.previousElementSibling)
            throw new Error("Previous row not available");
        const previousRowElm = cursorRow.previousElementSibling;

        // If parallel column cell is available, select it

        this.selectCell(e, this.createNewInstructionCell(previousRowElm));
    }


    selectCell(e, cursorCell, clearSelection=true, toggle=false) {
        this.renderElement.querySelectorAll('.instruction.cursor,.instruction.selected')
            .forEach((elm) => elm.classList.remove('cursor', 'selected'));
        cursorCell.classList.add('cursor');
        if(cursorCell.hasAttribute('data-index'))
            cursorCell.classList.add('selected');

        this.editor.selectInstructions(this.selectedIndicies);
        this.renderElement.focus();
    }


    findInstruction(instruction) {
        let instructionGroup = this.editor.renderer.findInstructionGroup(instruction);
        if(instructionGroup !== this.groupName)
            return null;
        let index = this.editor.renderer.getInstructionIndex(instruction, instructionGroup);
        return this.findInstructionElement(index);
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
        // TODO: sloppy
        this.editor.renderer.eachInstruction(this.groupName, (index, instruction, stats) => {
            if (this.minimumGridLengthTicks < stats.groupPosition)
                this.minimumGridLengthTicks = stats.groupPosition;
        });

        const defaultDuration = this.editor.forms.fieldRenderDuration.value;
        this.minimumGridLengthTicks += defaultDuration;
        this.render();
    }


    insertInstructionAtIndex(instruction, insertIndex) {
        return this.editor.renderer.insertInstructionAtIndex(this.groupName, insertIndex, instruction);
    }

    insertInstructionAtPosition(insertTimePosition, instruction) {
        return this.editor.renderer.insertInstructionAtPosition(this.groupName, insertTimePosition, instruction);
    }
    deleteInstructionAtIndex(deleteIndex) {
        return this.editor.renderer.deleteInstructionAtIndex(this.groupName, deleteIndex, 1);
    }

    replaceInstructionCommand(replaceIndex, newCommand) {
        return this.editor.renderer.replaceInstructionCommand(this.groupName, replaceIndex, newCommand);
    }
    replaceInstructionVelocity(replaceIndex, newVelocity) {
        return this.editor.renderer.replaceInstructionVelocity(this.groupName, replaceIndex, newVelocity);
    }
    // replaceInstructionParams(replaceIndex, replaceParams) {
    //     return this.editor.renderer.replaceInstructionParams(this.groupName, replaceIndex, replaceParams);
    // }

    replaceFrequencyAlias(noteFrequency, instrumentID) {
        const instrument = this.editor.renderer.getInstrument(instrumentID, false);
        if(!instrument || !instrument.getFrequencyAliases)
            return noteFrequency;
        const aliases = instrument.getFrequencyAliases(noteFrequency);
        if(typeof aliases[noteFrequency] === "undefined")
            return noteFrequency;
        return aliases[noteFrequency];
    }


    // selectInstructions(selectedIndicies) {
    //     return this.editor.selectInstructions(selectedIndicies);
    // }

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


    findInstructionElement(instructionIndex) {
        return this.renderElement.querySelector(`.instruction[data-index='${instructionIndex}'`);
    }

    // Song position/duration in quarter notes (beats.
    // Delta PPQN in clock ticks
    async render() {
        console.time('grid: calculate render');
        this.renderElement.innerHTML = 'Loading...';
        // console.log("RENDER GRID");
        const gridDuration = parseFloat(this.editor.forms.fieldRenderDuration.value);

        // const selectedIndicies = this.editor.status.selectedIndicies;
        // const cursorCellIndex = this.editor.cursorCellIndex;
        let editorHTML = '', rowHTML='', songPositionInTicks=0, lastIndex, tickTotal=0, odd=false; // , lastPause = 0;

        const renderRow = (rowIndex, deltaDuration) => {
            for(let subPause=0; subPause<deltaDuration; subPause+=gridDuration) {
                let subDurationInTicks = gridDuration;
                if(subPause + gridDuration > deltaDuration)
                    subDurationInTicks = subPause + gridDuration - deltaDuration;

                // rowHTML +=
                //     `<div class="instruction new">
                //         <div class="command">+</div>
                //     </div>`;

                editorHTML +=
                   `<tr data-position="${songPositionInTicks}">
                       <td>
                           ${rowHTML}
                       </td>
                       <td>
                           ${this.editor.values.format(subDurationInTicks, 'duration')}
                       </td>
                    </tr>`;
                rowHTML = '';
                // if(cursorCellIndex === songPosition)
                // const cursorCellIndexClass = cursorCellIndex === songPosition ? ' selected' : '';
                songPositionInTicks += subDurationInTicks;
            }
        };

        await this.editor.renderer.eachInstruction(this.groupName, (index, instruction, stats) => {
            // console.log(index, instruction);
            // if(instruction.command[0] === '@') {
            //     return;
            // }
            if (stats.groupName !== this.groupName) {
                // TODO: show sub group notes? maybe in 2nd column?
                return;
            }

            if (instruction.deltaDuration !== 0) {
                renderRow(index, instruction.deltaDuration);
            }

            // const selectedIndexClass = selectedIndicies.indexOf(index) !== -1 ? ' selected' : '';
            rowHTML +=
                `<div class="instruction" data-index="${index}">
                    <div class="command">${instruction.command}</div>
                    ${instruction.instrument !== null ? `<div class="instrument">${this.editor.values.format(instruction.instrument, 'instrument')}</div>` : ''}
                    ${instruction.velocity !== null ? `<div class="velocity">${this.editor.values.format(instruction.velocity, 'velocity')}</div>` : ''}
                    ${instruction.duration !== null ? `<div class="duration">${this.editor.values.format(instruction.duration, 'duration')}</div>` : ''}
                </div>`;
            lastIndex = index;
            tickTotal = stats.songPositionInTicks;
        });

        if(!this.minimumGridLengthTicks) {
            const songData = this.editor.getSongData();
            const timeDivision = songData.timeDivision || 96 * 4;
            this.minimumGridLengthTicks = 4 * timeDivision;
        }

        let remainingDuration = this.minimumGridLengthTicks - tickTotal;
        if(remainingDuration <= 0)
            remainingDuration = gridDuration;
        renderRow(lastIndex, remainingDuration);

        console.timeEnd('grid: calculate render');
        const currentScrollPosition = this.scrollTop || 0; // Save scroll position
        console.time('grid: render');
        this.renderElement.innerHTML =
            `
            <thead>
                <tr>
                    <th>${this.groupName}</th>
                    <th class="grid-row-delta">Delta</th>
                </tr>
            </thead>
            <tbody>
                ${editorHTML}
            </tbody>
            `;
        console.timeEnd('grid: render');
        this.scrollTop = currentScrollPosition;             // Restore scroll position
        this.update();
    }

    update() {
        let cellList = this.renderElement.querySelectorAll('.instruction'); //,.grid-row
        if(cellList.length === 0)
            return;

        const selectedIndicies = this.editor.selectedIndicies;
        for (let i = 0; i < cellList.length; i++) {
            const cell = cellList[i];
            const index = parseInt(cell.getAttribute('data-index'));
            // cell.classList.toggle('cursor', selectedIndicies[0] === index);
            cell.classList.remove('selected');
            if (selectedIndicies.indexOf(index) !== -1) {
                cell.classList.add('selected');
            }
        }

        // Check for missing cursor
        // if(selectedIndicies.length > 0) {
        //     let missingCell = this.renderElement.querySelector('.instruction.selected');
        //     if (!missingCell)
        //         this.renderElement.querySelector('.instruction').classList.add('selected');
        //     missingCell = this.renderElement.querySelector('.instruction.cursor');
        //     if (!missingCell)
        //         this.renderElement.querySelector('.instruction.selected').classList.add('cursor');
        // }
    }
}
// customElements.define('music-song-grid', SongEditorGrid);
