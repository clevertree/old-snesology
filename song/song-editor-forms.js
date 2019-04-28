class SongEditorForms {
    constructor(editor) {
        this.editor = editor;
    }

    get renderElement() {
        let renderElement = this.editor.querySelector('div.editor-forms');
        if(!renderElement) {
            renderElement = document.createElement('div');
            // renderElement.setAttribute('tabindex', '0')
            renderElement.classList.add('editor-forms');
            this.editor.appendChild(renderElement);
            // this.editor.innerHTML += `<div class="editor-forms"></div>`;
            // renderElement = this.editor.querySelector('div.editor-forms');
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
                    this.onSubmit(e);
                    break;
                case 'change':
                case 'blur':
                    if(e.target.form && e.target.form.classList.contains('submit-on-' + e.type))
                        this.onSubmit(e);
                    break;
            }

        } catch (err) {
            this.editor.onError(err);
        }
    }

    onSubmit(e) {
        e.preventDefault();
        let form = e.target.form || e.target;
        const command = form.getAttribute('data-action');
        const cursorCellIndex = this.editor.cursorCellIndex;
        const currentGroup = this.editor.currentGroup;
        // const selectedIndicies = this.editor.status.selectedIndicies;
        const selectedNoteIndices = this.editor.selectedNoteIndicies;
        const selectedPauseIndices = this.editor.selectedPauseIndicies;
        const selectedRange = this.editor.selectedRange;

        switch (command) {
            case 'instrument:add':
                this.editor.status.currentInstrumentID = this.editor.renderer.addInstrument(form.elements['instrumentURL'].value);
                // this.editor.update();
                break;

            case 'instruction:insert':
                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                if(!newInstruction)
                    return console.info("Insert canceled");
                let insertIndex = this.editor.renderer.insertInstructionAtPosition(currentGroup, selectedRange[0], newInstruction);
                this.editor.render();
                this.editor.renderer.playInstruction(newInstruction);
                this.editor.selectInstructions(this.editor.currentGroup, insertIndex, selectedRange);
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
                this.editor.status.currentInstrumentID = instrumentID;
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
                    this.editor.render();
                } else {
                    this.editor.selectInstructions(form.groupName.value);
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

            case 'status:octave':
                this.editor.status.currentOctave = parseInt(this.fieldRenderOctave.value);
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
        const selectedNoteIndicies = this.editor.selectedNoteIndicies;
        const selectedPauseIndicies = this.editor.selectedPauseIndicies;
        const groupName = this.editor.currentGroup;
        const selectedInstructionList = this.editor.renderer.getInstructions(groupName, selectedNoteIndicies);
        let combinedInstruction = null; //, instrumentList = [];
        if(selectedInstructionList.length > 0) {
            for(let i=0; i<selectedInstructionList.length; i++) {
                combinedInstruction = Object.assign({}, selectedInstructionList[i], combinedInstruction || {})
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

        } else if(selectedPauseIndicies.length > 0) {
            this.fieldInstructionInstrument.value = this.editor.status.currentInstrumentID;
            // console.log(this.editor.status.currentInstrumentID);

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

        this.renderElement.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedNoteIndicies.length > 1 ? '(s)' : ''));

        // Status Fields

        this.fieldRenderOctave.value = this.editor.status.currentOctave;
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
                <form action="#" class="form-song-play" data-action="song:play">
                    <button type="submit" name="play" class="themed">Play</button>
                </form>
                <form action="#" class="form-song-pause show-on-song-playing" data-action="song:pause">
                    <button type="submit" name="pause" class="themed">Pause</button>
                </form>
                <form action="#" class="form-song-resume show-on-song-paused" data-action="song:resume">
                    <button type="submit" name="resume" class="themed">Resume</button>
                </form>
            </div>
                                         
            
            <div class="form-section">
                <div class="form-section-header">Volume</div>
                <form action="#" class="form-song-volume submit-on-change" data-action="song:volume">
                    <div class="volume-container">
                        <input name="volume" type="range" min="1" max="100" value="${renderer ? renderer.getVolume() : 0}" class="themed">
                    </div>
                </form>
            </div>
                                         
            
            <div class="form-section">
                <div class="form-section-header">Song Title</div>
                <form action="#" class="form-song-title submit-on-change" data-action="song:set-title">
                    <input name="title" type="text" class="themed" value="${songData.title}" />
                </form>
            </div>     
            
            <div class="form-section">
                <div class="form-section-header">Version</div>
                <form action="#" class="form-song-version submit-on-change" data-action="song:set-version">
                    <input name="version" type="text" class="themed" value="${songData.version}" />
                </form>
            </div>                
             
            <br style="clear: both;"/>
 
            <div class="form-section insert-instruction-controls">
                <div class="form-section-header">Insert Instruction</div>
                <form action="#" class="form-instruction-insert" data-action="instruction:insert">
                    <select name="command" title="Instruction Command" class="themed" required="required">
                        <optgroup label="Custom Frequencies" class="instrument-frequencies">
                            ${this.renderEditorFormOptions('command-instrument-frequencies')}
                        </optgroup>
                        <optgroup label="Frequencies">
                            ${this.renderEditorFormOptions('note-frequencies-all')}
                        </optgroup>
                        <optgroup label="Group Execute">
                            ${this.renderEditorFormOptions('command-group-execute')}
                        </optgroup>
                    </select>
                    <button name="insert" class="themed" title="Insert Instruction">+</button>
                </form>
            </div>
            
            <div class="form-section modify-instruction-controls">
                <div class="form-section-header">Modify Instruction</div>
                <form action="#" class="form-instruction-command submit-on-change" data-action="instruction:command">
                    <select name="command" title="Instruction Command" class="themed" required="required">
                        <option value="">Command (Choose)</option>
                        <optgroup label="Custom Frequencies" class="instrument-frequencies">
                            ${this.renderEditorFormOptions('command-instrument-frequencies')}
                        </optgroup>
                        <optgroup label="Frequencies">
                            ${this.renderEditorFormOptions('note-frequencies-all')}
                        </optgroup>
                        <optgroup label="Group Execute">
                            ${this.renderEditorFormOptions('command-group-execute')}
                        </optgroup>
                    </select>
                </form>
                <form action="#" class="form-instruction-delete" data-action="instruction:delete">
                    <button name="delete" class="themed" title="Delete Instruction">-</button>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Note Instrument</div>
                <form action="#" class="form-instruction-instrument submit-on-change" data-action="instruction:instrument">
                    <select name="instrument" title="Instruction Instrument" class="themed">
                        <optgroup label="Song Instruments">
                            ${this.renderEditorFormOptions('song-instruments')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Note Duration</div>
                <form action="#" class="form-instruction-duration submit-on-change" data-action="instruction:duration">
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
                <form action="#" class="form-instruction-velocity submit-on-change" data-action="instruction:velocity">
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
                <form action="#" class="form-row-insert" data-action="row:insert">
                    <button name="insert" disabled="disabled" class="themed">+</button>
                </form>
                <form action="#" class="form-row-delete" data-action="row:delete">
                    <button name="delete" disabled="disabled" class="themed">-</button>
                </form>
                <form action="#" class="form-row-duplicate" data-action="row:duplicate">
                    <button name="duplicate" disabled="disabled" class="themed">Duplicate</button>
                </form>
            </div>                

            <br style="clear: both;"/>
            
            
            <div class="form-section">
                <div class="form-section-header">Octave</div>
                <form action="#" class="form-render-octave submit-on-change" data-action="status:octave">
                    <select name="octave" class="themed">
                        <optgroup label="Select Octave">
                            ${this.renderEditorFormOptions('note-frequency-octaves')}
                        </optgroup>
                    </select>
                </form>
            </div>     
            
            <div class="form-section">
                <div class="form-section-header">Render Group</div>
                ${this.editor.values.getValues('groups', (value, label) =>
                    `<form action="#" class="form-group" data-action="group:edit">`
                    + `<button name="groupName" value="${value}" class="themed" >${label}</button>`
                    + `</form>`)}
                
                <form action="#" class="form-group" data-action="group:edit">
                    <button name="groupName" value=":new" class="new themed" title="Create new group">+</button>
                </form>
                
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Render Duration</div>
                <form action="#" class="form-render-duration submit-on-change" data-action="grid:duration">
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
                <form action="#" class="form-render-instrument submit-on-change" data-action="grid:instrument">
                    <select name="instrument" class="themed"->
                        <option value="">Show All (Default)</option>
                        <optgroup label="Filter By">
                            ${this.renderEditorFormOptions('song-instruments')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section">
                <div class="form-section-header">Add Instrument to Song</div>                    
                <form class="form-add-instrument submit-on-change" data-action="instrument:add">
                    <select name="instrumentURL" class="themed">
                        <option value="">Choose Instrument</option>
                        ${this.editor.forms.renderEditorFormOptions('instruments-available')}
                    </select>
                </form>
            </div>
        `;
        this.update();
    }



    renderEditorFormOptions(optionType, selectCallback) {
        let optionsHTML = '';
        this.editor.values.getValues(optionType, function (value, label, html='') {
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
//                     <a data-action="load:memory" data-guid="${songGUID}">${song.name || "unnamed"}</a>
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
//         ${this.getValues('beats-per-minute', (value, label, selected) =>
// `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
//     </optgroup>
// </select>
// <select name="beats-per-measure" title="Beats per measure" disabled>
// <optgroup label="Beats per measure">
//         ${this.getValues('beats-per-measure', (value, label, selected) =>
// `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`)}
//     </optgroup>
// </select>
// </form>

}
