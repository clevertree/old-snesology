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
    get fieldInstructionCommand() { return this.renderElement.querySelector('form.form-note-command select[name=command]'); }
    get fieldInstructionVelocity() { return this.renderElement.querySelector('form.form-instruction-velocity input[name=velocity]'); }

    get fieldRowDuration() { return this.renderElement.querySelector('form.form-row-duration select[name=duration]'); }

    get fieldRenderDuration() { return this.renderElement.querySelector('form.form-render-duration select[name=duration]'); }
    get fieldRenderInstrument() { return this.renderElement.querySelector('form.form-render-instrument select[name=instrument]'); }
    get fieldRenderOctave() { return this.renderElement.querySelector('form.form-render-octave select[name=octave]'); }

    get fieldAddInstrumentInstrument() { return this.renderElement.querySelector('form.form-add-instrument select[name=instrument]'); }
    get fieldSelectedIndicies() { return this.renderElement.querySelector('form.form-selected-indicies input[name=indicies]'); }
    get fieldSelectedRangeStart() { return this.renderElement.querySelector('form.form-selected-range input[name=rangeStart]'); }
    get fieldSelectedRangeEnd() { return this.renderElement.querySelector('form.form-selected-range input[name=rangeEnd]'); }

    // get grid() { return this.song.grid; } // Grid associated with menu
    getInstructionFormValues(isNewInstruction) {
        if(isNewInstruction && this.fieldInsertInstructionCommand.value === '') {
            // this.fieldInsertInstructionCommand.focus();
            return false;
        }
        let newInstruction = new SongInstruction();
        newInstruction.command = isNewInstruction ? this.fieldInsertInstructionCommand.value : this.fieldInstructionCommand.value;

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
        if(e.target instanceof Node && !this.renderElement.contains(e.target))
            return;

        try {
            switch (e.type) {
                case 'submit':
                    e.preventDefault();
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
        let form = e.target.form || e.target;
        const command = form.getAttribute('data-action');
        // const cursorCellIndex = this.editor.cursorCellIndex;
        const currentGroup = this.editor.currentGroup;
        // const selectedIndicies = this.editor.status.selectedIndicies;
        const selectedIndices = this.editor.selectedIndicies;
        // const selectedPauseIndices = this.editor.selectedPauseIndicies;
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
                this.editor.selectInstructions(insertIndex);
                break;

            case 'instruction:command':
                if(form['command'].value === '') {
                    form['command'].focus();
                    return;
                }
                const newCommand = form['command'].value;
                let newInstrument = null;
                if(form.elements['command'].selectedOptions[0] && form.elements['command'].selectedOptions[0].hasAttribute('data-instrument'))
                    newInstrument = parseInt(form.elements['command'].selectedOptions[0].getAttribute('data-instrument'));
                for(let i=0; i<selectedIndices.length; i++) {
                    this.editor.renderer.replaceInstructionCommand(currentGroup, selectedIndices[i], newCommand);
                    if(newInstrument !== null)
                        this.editor.renderer.replaceInstructionInstrument(currentGroup, selectedIndices[i], newInstrument);
                    this.editor.renderer.playInstructionAtIndex(currentGroup, selectedIndices[i]);
                }
                this.fieldInstructionCommand.focus();
                // setTimeout(() => this.fieldInstructionCommand.focus(), 1);
                break;

            case 'instruction:instrument':
                let instrumentID = form.instrument.value === '' ? null : parseInt(form.instrument.value);
                for(let i=0; i<selectedIndices.length; i++)
                    this.editor.renderer.replaceInstructionInstrument(currentGroup, selectedIndices[i], instrumentID);
                this.editor.status.currentInstrumentID = instrumentID;
                this.fieldInstructionInstrument.focus();
                break;

            case 'instruction:duration':
                const duration = (form.duration.value) || null;
                for(let i=0; i<selectedIndices.length; i++)
                    this.editor.renderer.replaceInstructionDuration(currentGroup, selectedIndices[i], duration);
                this.fieldInstructionDuration.focus();
                break;

            case 'instruction:velocity':
                const velocity = form.velocity.value === "0" ? 0 : parseInt(form.velocity.value) || null;
                for(let i=0; i<selectedIndices.length; i++)
                    this.editor.renderer.replaceInstructionVelocity(currentGroup, selectedIndices[i], velocity);
                this.fieldInstructionVelocity.focus();
                break;

            case 'instruction:delete':
                for(let i=0; i<selectedIndices.length; i++)
                    this.editor.renderer.deleteInstructionAtIndex(currentGroup, selectedIndices[i]);
                break;

            // case 'row:edit':
            //     this.editor.renderer.replaceInstructionParams(currentGroup, selectedPauseIndices, {
            //         command: '!pause',
            //         duration: parseFloat(form.duration.value)
            //     });
            //     // this.gridSelect([instruction]);
            //     break;

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
                    this.editor.selectGroup(form.groupName.value);
                }
                break;

            case 'song:load':
                this.editor.loadSongFromFile(form['file']);
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

            case 'toggle:control-song':
                this.renderElement.classList.toggle('hide-control-song');
                break;

            case 'toggle:control-note':
                this.renderElement.classList.toggle('hide-control-note');
                break;

            case 'toggle:control-grid':
                this.renderElement.classList.toggle('hide-control-grid');
                break;

            default:
                console.warn("Unhandled " + e.type + ": ", command);
                break;
        }
        // } catch (e) {
        //     this.onError(e);
        // }
    }

    // ${this.renderEditorMenuLoadFromMemory()}
    render() {
        const renderer = this.editor.renderer;
        const songData = this.editor.getSongData();
        // let tabIndex = 2;
        this.renderElement.innerHTML =
            `
             
            <div class="form-section-divide">
                <form action="#" class="form-song-toggle" data-action="toggle:control-song">
                    <button name="toggle" class="themed" title="Show/Hide Song Controls">
                        <div>Song</div>
                    </button>
                </form>
            </div>               
            
            <div class="form-section control-song">
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
                                         
            
            <div class="form-section control-song">
                <div class="form-section-header">Volume</div>
                <form action="#" class="form-song-volume submit-on-change" data-action="song:volume">
                    <div class="volume-container">
                        <input name="volume" type="range" min="1" max="100" value="${renderer ? renderer.getVolume() : 0}" class="themed">
                    </div>
                </form>
            </div>
            
            <div class="form-section control-song">
                <div class="form-section-header">Load</div>
                <form action="#" class="form-song-load submit-on-change" data-action="song:load">
                    <label>
                        <div class="input-style">File</div>
                        <input type="file" name="file" accept=".json,.mid,.midi" style="display: none" />
                    </label>
                </form>
            </div>
                          
                                         
            
            <div class="form-section control-song">
                <div class="form-section-header">Song Title</div>
                <form action="#" class="form-song-title submit-on-change" data-action="song:set-title">
                    <input name="title" type="text" class="themed" value="${songData.title}" />
                </form>
            </div>     
            
            <div class="form-section control-song">
                <div class="form-section-header">Version</div>
                <form action="#" class="form-song-version submit-on-change" data-action="song:set-version">
                    <input name="version" type="text" class="themed" value="${songData.version}" />
                </form>
            </div>                
             
            
            <div class="form-section control-song">
                <div class="form-section-header">Add Instrument</div>                    
                <form class="form-add-instrument submit-on-change" data-action="instrument:add">
                    <select name="instrumentURL" class="themed">
                        <option value="">Select Instrument</option>
                        ${this.editor.forms.renderEditorFormOptions('instruments-available')}
                    </select>
                </form>
            </div>
             
            <div style="clear: both;" class="control-song"></div>
             
             
            <div class="form-section-divide">
                <form action="#" class="form-note-toggle" data-action="toggle:control-note">
                    <button name="toggle" class="themed" title="Show/Hide Note Controls">
                        <div>Notes</div>
                    </button>
                </form>
            </div>
 
            <div class="form-section control-note-insert control-note">
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
            
            <div class="form-section control-note-modify control-note">
                <div class="form-section-header">Instruction</div>
                <form action="#" class="form-note-command submit-on-change" data-action="instruction:command">
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
            </div>
            
            <div class="form-section control-note">
                <div class="form-section-header">Instrument</div>
                <form action="#" class="form-instruction-instrument submit-on-change" data-action="instruction:instrument">
                    <select name="instrument" title="Instruction Instrument" class="themed">
                        <option value="">None</option>
                        <optgroup label="Song Instruments">
                            ${this.renderEditorFormOptions('song-instruments')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section control-note">
                <div class="form-section-header">Velocity</div>
                <form action="#" class="form-instruction-velocity submit-on-change" data-action="instruction:velocity">
                    <input type="range" name="velocity" min="1" max="100" class="themed" />
                </form>
            </div>
            
            
            <div class="form-section control-note">
                <div class="form-section-header">Duration</div>
                <form action="#" class="form-instruction-duration submit-on-change" data-action="instruction:duration">
                    <select name="duration" title="Instruction Duration" class="themed">
                        <option value="">None</option>
                        <optgroup label="Note Duration">
                            ${this.renderEditorFormOptions('named-durations')}
                        </optgroup>
                    </select>
                </form>
            </div>
             
            <div class="form-section control-note-modify control-note">
                <div class="form-section-header">Delete</div>
                <form action="#" class="form-instruction-delete" data-action="instruction:delete">
                    <button name="delete" class="themed" title="Delete Instruction">X</button>
                </form>
            </div>
            
            
            
            <div style="clear: both;" class="control-note"></div>
             
            <div class="form-section-divide">
                <form action="#" class="form-grid-toggle" data-action="toggle:control-grid">
                    <button name="toggle" class="themed" title="Show/Hide Render Controls">
                        <div>Grid</div>
                    </button>
                </form>
            </div>
            
            
            <div class="form-section control-grid">
                <div class="form-section-header">Octave</div>
                <form action="#" class="form-render-octave submit-on-change" data-action="status:octave">
                    <select name="octave" class="themed">
                        <optgroup label="Select Octave">
                            ${this.renderEditorFormOptions('note-frequency-octaves')}
                        </optgroup>
                    </select>
                </form>
            </div>     
            
            <div class="form-section control-grid">
                <div class="form-section-header">Render Group</div>
                ${this.editor.values.getValues('groups', (value, label) =>
                    `<form action="#" class="form-group" data-action="group:edit">`
                    + `<button name="groupName" value="${value}" class="themed" >${label}</button>`
                    + `</form>`)}
                
                <form action="#" class="form-group" data-action="group:edit">
                    <button name="groupName" value=":new" class="new themed" title="Create new group">+</button>
                </form>
                
            </div>
            
            <div class="form-section control-grid">
                <div class="form-section-header">Render Duration</div>
                <form action="#" class="form-render-duration submit-on-change" data-action="grid:duration">
                    <select name="duration" title="Render Duration" class="themed">
                        <option value="">Default Duration (1B)</option>
                        <optgroup label="Render Duration">
                            ${this.renderEditorFormOptions('durations')}
                        </optgroup>
                    </select>
                </form>
            </div>
            
            <div class="form-section control-grid">
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
            
            <div class="form-section control-grid">
                <div class="form-section-header">Selection</div>                    
                <form class="form-selected-indicies submit-on-change" data-action="grid:selected">
                    <input name="indicies" placeholder="No indicies selection" />
                </form>
            </div>
            
            <div style="clear: both;" class="control-grid"></div>
 
        `;
        this.update();
    }


// <div class="form-section control-grid">
//         <div class="form-section-header">Sel Range</div>
// <form class="form-selected-range submit-on-change" data-action="grid:selected">
//         <input name="rangeStart" placeholder="N/A" />-<!--
//                  --><input name="rangeEnd" placeholder="N/A" />
//         </form>
//         </div>
// <div class="form-section">
//         <div class="form-section-header">Modify Row</div>
// <form action="#" class="form-row-insert" data-action="row:insert">
//         <button name="insert" disabled="disabled" class="themed">+</button>
//         </form>
//         <form action="#" class="form-row-delete" data-action="row:delete">
//         <button name="delete" disabled="disabled" class="themed">-</button>
//         </form>
//         <form action="#" class="form-row-duplicate" data-action="row:duplicate">
//         <button name="duplicate" disabled="disabled" class="themed">Duplicate</button>
//         </form>
//         </div>
//

    update() {

        // const gridDuration = this.fieldRenderDuration.value || 1;
        const cursorIndex = this.editor.cursorCellIndex;
        const selectedIndicies = this.editor.selectedIndicies;
        // const selectedPauseIndicies = this.editor.selectedPauseIndicies;
        const groupName = this.editor.currentGroup;
        const selectedInstructionList = this.editor.renderer.getInstructions(groupName, selectedIndicies);
        let cursorInstruction = selectedInstructionList[0];
        // let combinedInstruction = null; //, instrumentList = [];
        // if(selectedInstructionList.length > 0) {
        //     for(let i=0; i<selectedInstructionList.length; i++) {
        //         combinedInstruction = Object.assign({}, selectedInstructionList[i], combinedInstruction || {})
        //     }
        // }
        // console.log("Combined Instruction", combinedInstruction);

        // Row Instructions

        // Group Buttons
        this.renderElement.querySelectorAll('button[name=groupName]')
            .forEach(button => button.classList.toggle('selected', button.getAttribute('value') === groupName));


        if(!this.fieldRenderDuration.value)
            this.fieldRenderDuration.value = this.editor.renderer.getSongTimeDivision();

        // this.fieldInstructionDuration.value = parseFloat(this.fieldRenderDuration.value) + '';

        this.renderElement.classList.remove('show-control-note-insert');
        this.renderElement.classList.remove('show-control-note-modify');
        if(cursorInstruction) {
            // Note Instruction
            this.fieldInstructionCommand.value = cursorInstruction.command;
            this.fieldInstructionInstrument.value = cursorInstruction.instrument !== null ? cursorInstruction.instrument : '';
            this.fieldInstructionVelocity.value = cursorInstruction.velocity !== null ? cursorInstruction.velocity : '';
            this.fieldInstructionDuration.value = cursorInstruction.duration !== null ? cursorInstruction.duration : '';
            this.renderElement.classList.add('show-control-note-modify');

        } else if(selectedIndicies.length > 0) {
            this.fieldInstructionInstrument.value = this.editor.status.currentInstrumentID;
            // console.log(this.editor.status.currentInstrumentID);

            this.renderElement.classList.add('show-control-note-insert');
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

        this.renderElement.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedIndicies.length > 1 ? '(s)' : ''));

        // Status Fields

        this.fieldRenderOctave.value = this.editor.status.currentOctave;


        this.fieldSelectedIndicies.value = this.editor.selectedIndicies.join(',');
        // this.fieldSelectedRangeStart.value = this.editor.selectedRange[0];
        // this.fieldSelectedRangeEnd.value = this.editor.selectedRange[1];
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
