class SongEditorForms {
    constructor(editor) {
        this.editor = editor;
    }

    get renderElement() {
        let renderElement = this.editor.querySelector('div.editor-forms');
        if(!renderElement) {
            this.editor.innerHTML += `<div class="editor-forms"></div>`;
            renderElement = this.editor.querySelector('div.editor-forms');
        }
        return renderElement;
    }

    get fieldInsertInstructionCommand() { return this.renderElement.querySelector('form.form-instruction-insert select[name=command]'); }

    get fieldInstructionInstrument() { return this.renderElement.querySelector('form.form-instruction-instrument select[name=instrument]'); }
    get fieldInstructionDuration() { return this.renderElement.querySelector('form.form-instruction-duration select[name=duration]'); }
    get fieldInstructionCommand() { return this.renderElement.querySelector('form.form-instruction-command select[name=command]'); }
    get fieldInstructionVelocity() { return this.renderElement.querySelector('form.form-instruction-velocity select[name=velocity]'); }

    get fieldRowDuration() { return this.renderElement.querySelector('form.form-row-duration select[name=duration]'); }

    get fieldRenderDuration() { return this.renderElement.querySelector('form.form-render-duration select[name=duration]'); }
    get fieldRenderInstrument() { return this.renderElement.querySelector('form.form-render-instrument select[name=instrument]'); }
    get fieldRenderOctave() { return this.renderElement.querySelector('form.form-render-octave select[name=octave]'); }

    get fieldAddInstrumentInstrument() { return this.renderElement.querySelector('form.form-add-instrument select[name=instrument]'); }

    // get grid() { return this.song.grid; } // Grid associated with menu
    getInstructionFormValues(isNewInstruction) {
        if(isNewInstruction && this.fieldInsertInstructionCommand.value === '') {
            // this.fieldInsertInstructionCommand.focus();
            return false;
        }
        let newInstruction = {
            command: isNewInstruction ? this.fieldInsertInstructionCommand.value : this.fieldInstructionCommand.value
        };

        if(this.fieldInstructionInstrument.value || this.fieldInstructionInstrument.value === 0)
            newInstruction.instrument = parseInt(this.fieldInstructionInstrument.value);
        if(this.fieldInstructionDuration.value)
            newInstruction.duration = parseFloat(this.fieldInstructionDuration.value);
        const velocityValue = parseInt(this.fieldInstructionVelocity.value);
        if(velocityValue && velocityValue !== 100)
            newInstruction.velocity = velocityValue;

        return newInstruction;
    }

    onInput(e) {
        if (e.defaultPrevented)
            return;
        if (!this.renderElement.contains(e.target))
            return;

        try {
            switch (e.type) {
                case 'submit':
                case 'change':
                case 'blur':
                    this.onSubmit(e);
                    break;
            }

        } catch (err) {
            this.editor.onError(err);
        }
    }

    onSubmit(e) {
        e.preventDefault();
        let form = e.target;
        switch(e.type) {
            case 'change':
            case 'blur':
                form = e.target.form;
                if(!form || !form.classList.contains('submit-on-' + e.type))
                    return;
                break;
        }
        // try {
        const command = form.getAttribute('data-command');
        const cursorCellIndex = this.editor.cursorCellIndex;
        const currentGroup = this.editor.currentGroup;
        // const selectedIndicies = this.editor.status.selectedIndicies;
        const selectedNoteIndices = this.editor.selectedNoteIndicies;
        const selectedPauseIndices = this.editor.selectedPauseIndicies;
        // const selectedRange = this.editor.selectedRange;

        switch (command) {

            case 'instruction:insert':
                const newInstruction = {
                    command: form.command.value,
                    duration: parseFloat(this.fieldInstructionDuration.value),
                };
                if(this.fieldInstructionInstrument.value)
                    newInstruction['instrument'] = parseInt(this.fieldInstructionInstrument.value);
                // newInstruction.command = this.keyboardLayout[e.key];
                this.editor.renderer.insertInstructionAtPosition(currentGroup, cursorCellIndex, newInstruction);
                break;

            case 'instruction:command':
                if(form['command'].value === '') {
                    form['command'].focus();
                    return;
                }
                for(let i=0; i<selectedNoteIndices.length; i++)
                    this.editor.renderer.replaceInstructionParam(currentGroup, selectedNoteIndices[i], 'command', form['command'].value);
                break;

            case 'instruction:instrument':
                let instrumentID = form.instrument.value === '' ? null : parseInt(form.instrument.value);
                for(let i=0; i<selectedNoteIndices.length; i++)
                    this.editor.renderer.replaceInstructionParam(currentGroup, selectedNoteIndices[i], 'instrument', instrumentID);
                break;

            case 'instruction:duration':
                const duration = parseFloat(form.duration.value) || null;
                for(let i=0; i<selectedNoteIndices.length; i++)
                    this.editor.renderer.replaceInstructionParam(currentGroup, selectedNoteIndices[i], 'duration', duration);
                break;

            case 'instruction:velocity':
                const velocity = form.velocity.value === "0" ? 0 : parseInt(form.velocity.value) || null;
                for(let i=0; i<selectedNoteIndices.length; i++)
                    this.editor.renderer.replaceInstructionParam(currentGroup, selectedNoteIndices[i], 'velocity', velocity);
                break;

            case 'instruction:delete':
                for(let i=0; i<selectedNoteIndices.length; i++)
                    this.editor.renderer.deleteInstructionAtIndex(currentGroup, selectedNoteIndices[i]);
                break;

            case 'row:edit':
                this.editor.renderer.replaceInstructionParams(currentGroup, selectedPauseIndices, {
                    command: '!pause',
                    duration: parseFloat(form.duration.value)
                });
                // this.gridSelect([instruction]);
                break;

            case 'row:duplicate':
                if (!selectedRange)
                    throw new Error("No selected range");
                this.editor.renderer.duplicateInstructionRange(currentGroup, selectedRange[0], selectedRange[1]);
                break;


            case 'group:edit':
                if (form.groupName.value === ':new') {
                    let newGroupName = this.editor.renderer.generateInstructionGroupName(currentGroup);
                    newGroupName = prompt("Create new instruction group?", newGroupName);
                    if (newGroupName) this.editor.renderer.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                    else console.error("Create instruction group canceled");
                } else {
                    this.gridNavigate(form.groupName.value);
                }
                break;

            case 'song:edit':
                this.editor.renderer.replaceDataPath('beatsPerMinute', form['beats-per-minute'].value);
                this.editor.renderer.replaceDataPath('beatsPerMeasure', form['beats-per-measure'].value);
                break;

            case 'song:play':
                this.editor.renderer.play();
                break;
            case 'song:pause':
                this.editor.renderer.pause();
                break;
            case 'song:playback':
                console.log(e.target);
                break;

            case 'song:volume':
                this.editor.renderer.setVolume(parseInt(form['volume'].value));
                break;

            case 'grid:duration':
                this.editor.grid.render();
                break;

            case 'grid:instrument':
                this.editor.grid.render();
                break;

            case 'song:add-instrument':
                const instrumentURL = form['instrumentURL'].value;
                form['instrumentURL'].value = '';
                if(confirm(`Add Instrument to Song?\nURL: ${instrumentURL}`)) {
                    this.editor.renderer.addInstrument(instrumentURL);
                    this.render();
                } else {
                    console.info("Add instrument canceled");
                }
//                     this.fieldAddInstrumentInstrument.value = '';
                break;

            case 'song:set-title':
                this.editor.renderer.setSongTitle(form['title'].value);
                break;

            case 'song:set-version':
                this.editor.renderer.setSongVersion(form['version'].value);
                break;

            default:
                console.warn("Unhandled " + e.type + ": ", command);
                break;
        }
        // } catch (e) {
        //     this.onError(e);
        // }
    }

    update() {

        // const gridDuration = this.fieldRenderDuration.value || 1;
        const cursorIndex = this.editor.cursorCellIndex;
        const selectedIndices = this.editor.status.selectedIndicies;
        const groupName = this.editor.currentGroup;
        const instructionList = this.editor.renderer.getInstructions(groupName);
        let combinedInstruction = null; //, instrumentList = [];
        for(let i=0; i<selectedIndices.length; i++) {
            const selectedIndex = selectedIndices[i];
            if(!instructionList[selectedIndex])
                throw new Error("Instruction not found at index " + selectedIndex + " in group " + groupName);
            const selectedInstruction = instructionList[selectedIndex];

            if(selectedInstruction.command[0] === '!')
                continue;


            if(combinedInstruction === null) {
                combinedInstruction = Object.assign({}, selectedInstruction);
            } else {
                Object.keys(combinedInstruction).forEach(function(key, i) {
                    // Delete keys that don't match
                    if(selectedInstruction[key] !== combinedInstruction[key])
                        delete combinedInstruction[key];
                });
            }
        }
        // console.log("Combined Instruction", combinedInstruction);

        // Row Instructions

        // Group Buttons
        this.renderElement.querySelectorAll('button[name=groupName]')
            .forEach(button => button.classList.toggle('selected', button.getAttribute('value') === groupName));


        this.fieldInstructionDuration.value = parseFloat(this.fieldRenderDuration.value) + '';

        this.renderElement.classList.remove('show-insert-instruction-controls');
        this.renderElement.classList.remove('show-modify-instruction-controls');
        if(combinedInstruction) {
            // Note Instruction
            this.fieldInstructionCommand.value = combinedInstruction.command;
            this.fieldInstructionInstrument.value = combinedInstruction.instrument;
            this.fieldInstructionVelocity.value = typeof combinedInstruction.velocity === 'undefined' ? '' : combinedInstruction.velocity;
            this.fieldInstructionDuration.value = combinedInstruction.duration;
            this.renderElement.classList.add('show-modify-instruction-controls');

        } else if(cursorIndex || cursorIndex === 0) {

            this.renderElement.classList.add('show-insert-instruction-controls');
        }

        this.fieldInstructionCommand.querySelectorAll('.instrument-frequencies option').forEach((option) =>
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value !== option.getAttribute('data-instrument')));
        this.fieldInsertInstructionCommand.querySelectorAll('.instrument-frequencies option').forEach((option) =>
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value !== option.getAttribute('data-instrument')));

        // const oldInsertCommand = this.fieldInsertInstructionCommand.value;
        // this.fieldInsertInstructionCommand.querySelector('.instrument-frequencies').innerHTML = instructionCommandOptGroup.innerHTML;
        // this.fieldInsertInstructionCommand.value = oldInsertCommand;
        // if(!this.fieldInsertInstructionCommand.value)
        //     this.fieldInsertInstructionCommand.value-this.fieldInsertInstructionCommand.options[0].value

        this.renderElement.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedIndices.length > 1 ? '(s)' : ''));

    }

    // ${this.renderEditorMenuLoadFromMemory()}
    render() {
        const renderer = this.editor.renderer;
        const songData = this.editor.getSongData();
        // let tabIndex = 2;
        this.renderElement.innerHTML =
            `
            <div class="form-section">
                <div class="form-section-header">Playback Controls</div>
                <form action="#" class="form-song-play" data-command="song:play">
                    <button type="submit" name="play" class="themed">Play</button>
                </form>
                <form action="#" class="form-song-pause show-on-song-playing" data-command="song:pause">
                    <button type="submit" name="pause" class="themed">Pause</button>
                </form>
                <form action="#" class="form-song-resume show-on-song-paused" data-command="song:resume">
                    <button type="submit" name="resume" class="themed">Resume</button>
                </form>
            </div>
                                         
            
            <div class="form-section">
                <div class="form-section-header">Volume</div>
                <form action="#" class="form-song-volume submit-on-change" data-command="song:volume">
                    <div class="volume-container">
                        <input name="volume" type="range" min="1" max="100" value="${renderer ? renderer.getVolume() : 0}" class="themed">
                    </div>
                </form>
            </div>
                                         
            
            <div class="form-section">
                <div class="form-section-header">Song Title</div>
                <form action="#" class="form-song-title submit-on-change" data-command="song:set-title">
                    <input name="title" type="text" class="themed" value="${songData.title}" />
                </form>
            </div>     
            
            <div class="form-section">
                <div class="form-section-header">Version</div>
                <form action="#" class="form-song-version submit-on-change" data-command="song:set-version">
                    <input name="version" type="text" class="themed" value="${songData.version}" />
                </form>
            </div>                
             
            <br style="clear: both;"/>
 
            <div class="form-section show-on-insert-instruction">
                <div class="form-section-header">Insert Instruction</div>
                <form action="#" class="form-instruction-insert" data-command="instruction:insert">
                    <select name="command" title="Instruction Command" class="themed" required="required">
                        <optgroup label="Custom Frequencies" class="instrument-frequencies">
                            ${this.renderEditorFormOptions('command-instrument-frequencies')}
                        </optgroup>
                        <optgroup label="Frequencies">
                            ${this.renderEditorFormOptions('command-frequencies')}
                        </optgroup>
                        <optgroup label="Group Execute">
                            ${this.renderEditorFormOptions('command-group-execute')}
                        </optgroup>
                    </select>
                    <button name="insert" class="themed" title="Insert Instruction">+</button>
                </form>
            </div>
            
            <div class="form-section show-on-modify-instruction">
                <div class="form-section-header">Modify Instruction</div>
                <form action="#" class="form-instruction-command submit-on-change" data-command="instruction:command">
                    <select name="command" title="Instruction Command" class="themed" required="required">
                        <option value="">Command (Choose)</option>
                        <optgroup label="Custom Frequencies" class="instrument-frequencies">
                            ${this.renderEditorFormOptions('command-instrument-frequencies')}
                        </optgroup>
                        <optgroup label="Frequencies">
                            ${this.renderEditorFormOptions('command-frequencies')}
                        </optgroup>
                        <optgroup label="Group Execute">
                            ${this.renderEditorFormOptions('command-group-execute')}
                        </optgroup>
                    </select>
                </form>
                <form action="#" class="form-instruction-delete" data-command="instruction:delete">
                    <button name="delete" class="themed" title="Delete Instruction">-</button>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Note Instrument</div>
                <form action="#" class="form-instruction-instrument submit-on-change" data-command="instruction:instrument">
                    <select name="instrument" title="Instruction Instrument" class="themed">
                        <optgroup label="Song Instruments">
                            ${this.renderEditorFormOptions('instruments-songs')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Note Duration</div>
                <form action="#" class="form-instruction-duration submit-on-change" data-command="instruction:duration">
                    <select name="duration" title="Instruction Duration" class="themed">
                        <optgroup label="Note Duration">
                            <option value="">Duration (Default)</option>
                            ${this.renderEditorFormOptions('durations')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Note Velocity</div>
                <form action="#" class="form-instruction-velocity submit-on-change" data-command="instruction:velocity">
                    <select name="velocity" title="Instruction Velocity" class="themed">
                        <optgroup label="Velocity">
                            <option value="">Velocity (Default)</option>
                            ${this.renderEditorFormOptions('velocities')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Modify Row</div>
                <form action="#" class="form-row-insert" data-command="row:insert">
                    <button name="insert" disabled="disabled" class="themed">+</button>
                </form>
                <form action="#" class="form-row-delete" data-command="row:delete">
                    <button name="delete" disabled="disabled" class="themed">-</button>
                </form>
                <form action="#" class="form-row-duplicate" data-command="row:duplicate">
                    <button name="duplicate" disabled="disabled" class="themed">Duplicate</button>
                </form>
            </div>                

            <br style="clear: both;"/>
            
            
            <div class="form-section">
                <div class="form-section-header">Octave</div>
                <form action="#" class="form-render-octave submit-on-change">
                    <select name="octave" class="themed">
                        <optgroup label="Select Octave">
                            ${this.renderEditorFormOptions('command-frequency-octaves')}
                        </optgroup>
                    </select>
                </form>
            </div>     
            
            <div class="form-section">
                <div class="form-section-header">Render Group</div>
                ${this.getEditorFormOptions('groups', (value, label) =>
                    `<form action="#" class="form-group" data-command="group:edit">`
                    + `<button name="groupName" value="${value}" class="themed" >${label}</button>`
                    + `</form>`)}
                
                <form action="#" class="form-group" data-command="group:edit">
                    <button name="groupName" value=":new" class="new themed" title="Create new group">+</button>
                </form>
                
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Render Duration</div>
                <form action="#" class="form-render-duration submit-on-change" data-command="grid:duration">
                    <select name="duration" title="Render Duration" class="themed">
                        <option value="1.0">Default (1B)</option>
                        <optgroup label="Render Duration">
                            ${this.renderEditorFormOptions('durations')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Filter By Instrument</div>                    
                <form action="#" class="form-render-instrument submit-on-change" data-command="grid:instrument">
                    <select name="instrument" class="themed"->
                        <option value="">Show All (Default)</option>
                        <optgroup label="Filter By">
                            ${this.renderEditorFormOptions('instruments-songs')}
                        </optgroup>
                    </select>
                </form>
            </div>
        `;
        this.update();
    }

    /** Form Options **/

    getEditorFormOptions(optionType, callback) {
        let optionsHTML = '';
        const songData = this.editor.getSongData() || {};

        switch(optionType) {
            case 'server-recent-uuid':
            case 'memory-recent-uuid':
                const songRecentUUIDs = JSON.parse(localStorage.getItem(optionType) || '[]');
                for(var i=0; i<songRecentUUIDs.length; i++)
                    optionsHTML += callback.apply(this, songRecentUUIDs[i]);
                break;

            case 'instruments-songs':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID];
                        // const instrument = this.editor.renderer.getInstrument(instrumentID);
                        optionsHTML += callback(instrumentID, this.editor.renderer.format(instrumentID, 'instrument')
                            + ': ' + (instrumentInfo.name ? instrumentInfo.name : instrumentInfo.url.split('/').pop()));
                    }
                }
                break;

            case 'instruments-available':
                if(this.editor.status.instrumentLibrary) {
                    const instrumentLibrary = this.editor.status.instrumentLibrary;
                    if(instrumentLibrary.instruments) {
                        instrumentLibrary.instruments.forEach((pathConfig) => {
                            if (typeof pathConfig !== 'object') pathConfig = {url: pathConfig};
                            if(!pathConfig.title) pathConfig.title = pathConfig.url.split('/').pop();
                            optionsHTML += callback(pathConfig.url, pathConfig.title + " (" + pathConfig.url + ")");
                        });
                    }
                }
                break;

            case 'command-instrument-frequencies':
                for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                    if(this.editor.renderer.isInstrumentLoaded(instrumentID)) {
                        const instance = this.editor.renderer.getInstrument(instrumentID);
                        if(instance.getFrequencyAliases) {
                            const aliases = instance.getFrequencyAliases();
                            Object.keys(aliases).forEach((aliasName) =>
                                optionsHTML += callback(aliasName, aliasName, `data-instrument="${instrumentID}"`));
                        }
                    }
                }
                break;

            case 'command-frequencies':
            case 'frequencies':
                const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                for(let i=1; i<=6; i++) {
                    for(let j=0; j<instructions.length; j++) {
                        const instruction = instructions[j] + i;
                        optionsHTML += callback(instruction, instruction);
                    }
                }
                break;

            case 'command-frequency-octaves':
                for(let oi=1; oi<=7; oi+=1) {
                    optionsHTML += callback(oi, '' + oi);
                }
                break;

            case 'velocities':
                // optionsHTML += callback(null, 'Velocity (Default)');
                for(let vi=100; vi>=0; vi-=10) {
                    optionsHTML += callback(vi, vi);
                }
                break;

            case 'durations':
                optionsHTML += callback(1/64, '1/64');
                optionsHTML += callback(1/32, '1/32');
                optionsHTML += callback(1/16, '1/16');
                optionsHTML += callback(1/8,  '1/8');
                optionsHTML += callback(1/4,  '1/4');
                optionsHTML += callback(1/2,  '1/2');
                for(let i=1; i<=16; i++)
                    optionsHTML += callback(i, i+'B');
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    optionsHTML += callback(vi, vi + ` beat${vi>1?'s':''} per measure`);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    optionsHTML += callback(vi, vi+ ` beat${vi>1?'s':''} per minute`);
                }
                break;

            case 'groups':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback(key, key);
                    });
                break;

            case 'command-group-execute':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback('@' + key, '@' + key);
                    });
                break;
        }
        return optionsHTML;
    }



    renderEditorFormOptions(optionType, selectCallback) {
        let optionsHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, html='') {
            const selected = selectCallback ? selectCallback(value) : false;
            optionsHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}${html}>${label}</option>`;
        });
        return optionsHTML;
    }

//     renderEditorMenuLoadFromMemory() {
//         return '';
//         const songGUIDs = JSON.parse(localStorage.getItem('share-song-saved-list') || '[]');
// //         console.log("Loading songData list from memory: ", songGUIDs);
//
//         let menuItemsHTML = '';
//         for(let i=0; i<songGUIDs.length; i++) {
//             const songGUID = songGUIDs[i];
//             let songDataString = localStorage.getItem('song:' + songGUID);
//             const song = JSON.parse(songDataString);
//             if(song) {
//                 menuItemsHTML +=
//                     `<li>
//                     <a data-command="load:memory" data-guid="${songGUID}">${song.name || "unnamed"}</a>
//                 </li>`;
//             } else {
//                 console.error("Song GUID not found: " + songGUID);
//             }
//         }
//
//         return `
//         <ul class="menu">
//             ${menuItemsHTML}
//         </ul>
//     `;
//     }


// <br/>
// <label class="row-label">Group:</label>
// <form action="#" class="form-song-bpm" data-command="song:edit">
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

    // Menu


    renderEditorMenuLinks(optionType, selectCallback) {
        let optionsHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, html) {
            const selected = selectCallback ? selectCallback(value) : false;
            optionsHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}${html}>${label}</option>`;
        });
        return optionsHTML;
    }

    openContextMenu(e) {
        let dataElm = null;
        let target = e.target;
        let x = e.clientX, y = e.clientY;

        this.renderElement.querySelectorAll('a.open').forEach(elm => elm.classList.remove('open'));
        // this.renderElement.querySelectorAll('.selected-context-menu').forEach(elm => elm.classList.remove('selected-context-menu'));
        const contextMenu = this.renderElement.querySelector('.song-context-menu');
        // console.info("Context menu", contextMenu);

        // contextMenu.setAttribute('class', 'song-context-menu');
        // contextMenu.firstElementChild.classList.add('open');

        if(target.classList.contains('grid-parameter'))
            target = target.parentNode;
-
        contextMenu.classList.remove('selected-data', 'selected-row');
        if(target.classList.contains('grid-cell')) {
            dataElm = target;
            contextMenu.classList.add('selected-data');
            contextMenu.classList.add('selected-row');
            const rect = dataElm.getBoundingClientRect();
            x = rect.x + rect.width;
            y = rect.y + rect.height;
            this.editor.grid.selectCell(e, dataElm);
            // this.editor.grid.focus();
        } else if(target.classList.contains('grid-row')) {
            contextMenu.classList.add('selected-row');
        }

        contextMenu.classList.add('open');

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
    }

    closeMenu() {
        this.renderElement.querySelectorAll('.menu-item.open,.submenu.open')
            .forEach(elm => elm.classList.remove('open'));
    }

}
