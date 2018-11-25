
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class MusicEditorMenuElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;

        // Include assets
        const INCLUDE_CSS = "editor/music-editor-menu.css";
        if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
            document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
    }

    get fieldInsertInstructionCommand() { return this.querySelector('form.form-instruction-insert select[name=command]'); }

    get fieldInstructionInstrument() { return this.querySelector('form.form-instruction-instrument select[name=instrument]'); }
    get fieldInstructionDuration() { return this.querySelector('form.form-instruction-duration select[name=duration]'); }
    get fieldInstructionCommand() { return this.querySelector('form.form-instruction-command select[name=command]'); }
    get fieldInstructionVelocity() { return this.querySelector('form.form-instruction-velocity select[name=velocity]'); }

    get fieldRowDuration() { return this.querySelector('form.form-row-duration select[name=duration]'); }

    get fieldRenderDuration() { return this.querySelector('form.form-render-duration select[name=duration]'); }
    get fieldRenderInstrument() { return this.querySelector('form.form-render-instrument select[name=instrument]'); }
    get fieldRenderOctave() { return this.querySelector('form.form-render-octave select[name=octave]'); }

    get fieldAddInstrumentInstrument() { return this.querySelector('form.form-add-instrument select[name=instrument]'); }

    // get grid() { return this.editor.grid; } // Grid associated with menu
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
            newInstruction.duration = this.fieldInstructionDuration.value;
        const velocityValue = parseInt(this.fieldInstructionVelocity.value);
        if(velocityValue && velocityValue !== 100)
            newInstruction.velocity = velocityValue;

        return newInstruction;
    }

    connectedCallback() {
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
        this.addEventListener('mousedown', this.onInput);
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);

        this.render();
        // setTimeout(() => this.update(), 5);
    }



    onSubmit(e) {
        e.preventDefault();
        // try {
            const form = e.target.form || e.target;
            const command = form.getAttribute('data-command');
            const cursorPosition = this.editor.grid.cursorPosition;
            const currentGroup = this.editor.grid.groupName;
            const selectedIndices = this.editor.grid.selectedIndices;
            const selectedPauseIndices = this.editor.grid.selectedPauseIndices;
            const selectedRange = this.editor.grid.selectedRange;

            switch (command) {

                case 'instruction:insert':
                    const newInstruction = {
                        command: form.command.value,
                        duration: parseFloat(this.fieldInstructionDuration.value),
                    };
                    if(this.fieldInstructionInstrument.value)
                        newInstruction['instrument'] = parseInt(this.fieldInstructionInstrument.value);
                    // newInstruction.command = this.editor.keyboardLayout[e.key];
                    this.editor.insertInstructionAtPosition(currentGroup, cursorPosition, newInstruction);
                    break;

                case 'instruction:command':
                    if(this.fieldInstructionCommand.value === '') {
                        this.fieldInstructionCommand.focus();
                        return;
                    }
                    this.editor.replaceInstructionParam(currentGroup, selectedIndices, 'command', this.fieldInstructionCommand.value);
                    break;

                case 'instruction:instrument':
                    let instrumentID = form.instrument.value === '' ? null : parseInt(form.instrument.value);
                    this.editor.replaceInstructionParam(currentGroup, selectedIndices, 'instrument', instrumentID);
                    break;

                case 'instruction:duration':
                    const duration = form.duration.value || null;
                    this.editor.replaceInstructionParam(currentGroup, selectedIndices, 'duration', duration);
                    break;

                case 'instruction:velocity':
                    const velocity = form.velocity.value === "0" ? 0 : parseInt(form.velocity.value) || null;
                    this.editor.replaceInstructionParam(currentGroup, selectedIndices, 'velocity', velocity);
                    break;

                case 'instruction:remove':
                    this.editor.deleteInstructionAtIndex(currentGroup, selectedIndices);
                    break;

                case 'row:edit':
                    this.editor.replaceInstructionParams(currentGroup, selectedPauseIndices, {
                        command: '!pause',
                        duration: parseFloat(form.duration.value)
                    });
                    // this.editor.gridSelect([instruction]);
                    break;

                case 'row:duplicate':
                    if (!selectedRange)
                        throw new Error("No selected range");
                    this.editor.duplicateInstructionRange(currentGroup, selectedRange[0], selectedRange[1]);
                    break;


                case 'group:edit':
                    if (form.groupName.value === ':new') {
                        let newGroupName = this.editor.generateInstructionGroupName(currentGroup);
                        newGroupName = prompt("Create new instruction group?", newGroupName);
                        if (newGroupName) this.editor.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                        else console.error("Create instruction group canceled");
                    } else {
                        this.editor.gridNavigate(form.groupName.value);
                    }
                    break;

                case 'song:edit':
                    const song = this.editor.getSongData();
                    // songData.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
                    song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
                    song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
                    this.editor.render();
                    // this.editor.gridSelect(e, 0);
                    break;

                case 'song:play':
                    this.editor.player.play();
                    break;
                case 'song:pause':
                    this.editor.player.pause();
                    break;
                case 'song:playback':
                    console.log(e.target);
                    break;

                case 'song:volume':
                    this.editor.player.setVolume(parseInt(form['volume'].value));
                    break;

                case 'grid:duration':
                    this.editor.grid.render();
                    break;

                case 'grid:instrument':
                    this.editor.grid.render();
                    break;

                case 'song:add-instrument':
                    const instrumentURL = this.fieldAddInstrumentInstrument.value;
                    if(confirm(`Add Instrument to Song?\nURL: ${instrumentURL}`)) {
                        this.editor.addInstrument(instrumentURL);
                        this.editor.render();
                    } else {
                        console.info("Add instrument canceled");
                    }
                    this.fieldAddInstrumentInstrument.value = '';
                    break;

                default:
                    console.warn("Unhandled " + e.type + ": ", command);
                    break;
            }
        // } catch (e) {
        //     this.editor.onError(e);
        // }
    }

    onInput(e) {
        if(e.defaultPrevented)
            return;

        const cursorIndex = this.editor.grid.cursorPosition;
        const currentGroup = this.editor.grid.groupName;
        const instructionList = this.editor.grid.instructionList;
        const cursorInstruction = instructionList[cursorIndex];

        let targetClassList = e.target.classList;
        switch(e.type) {
            case 'keydown':
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
                        switch(dataCommand) {

                            case 'save:memory':
                                this.editor.saveSongToMemory();
                                break;
                            case 'save:file':
                                this.editor.saveSongToFile();
                                break;
                            case 'load:memory':
                                this.editor.loadSongFromMemory(e.target.getAttribute('data-guid'));
                                break;

                            case 'group:add':
                                let newGroupName = this.editor.generateInstructionGroupName(currentGroup);
                                newGroupName = prompt("Create new instruction group?", newGroupName);
                                if(newGroupName)    this.editor.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                                else                console.error("Create instruction group canceled");
                                break;

                            case 'group:remove':
                                this.editor.removeInstructionGroup(currentGroup);
                                break;

                            case 'group:rename':
                                let renameGroupName = prompt("Rename instruction group?", currentGroup);
                                if(renameGroupName)     this.editor.renameInstructionGroup(currentGroup, renameGroupName);
                                else                    console.error("Rename instruction group canceled");
                                break;

                            case 'instruction:insert':
                                const newInstruction = {
                                    // type: 'note',
                                    instrument: 0,
                                    command: 'C4',
                                    duration: 1
                                }; // new instruction
                                // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
                                this.editor.insertInstructionAtIndex(currentGroup, cursorIndex, newInstruction);
                                break;

                            case 'instruction:command':
                                const newCommand = prompt("Set Command:", cursorInstruction.command);
                                if(newCommand !== null)     this.editor.replaceInstructionParams(currentGroup, cursorIndex, {
                                    command: newCommand
                                });
                                else                    console.error("Set instruction command canceled");
                                break;

                            case 'instruction:duration':
                                const newDuration = prompt("Set Duration:", typeof cursorInstruction.duration === 'undefined' ? 1 : cursorInstruction.duration);
                                if(newDuration < 0) throw new Error("Invalid duration value");
                                if(newDuration !== null)     this.editor.replaceInstructionParams(currentGroup, cursorIndex, {
                                    duration: newDuration
                                });
                                else                    console.error("Set instruction duration canceled");
                                break;

                            case 'instruction:velocity':
                                const newVelocity = prompt("Set Velocity:", typeof cursorInstruction.velocity === 'undefined' ? 100 : cursorInstruction.velocity);
                                if(newVelocity < 0 || newVelocity > 100) throw new Error("Invalid velocity value");
                                if(newVelocity !== null)     this.editor.replaceInstructionParams(currentGroup, cursorIndex, {
                                    velocity: newVelocity
                                });
                                else                    console.error("Set instruction velocity canceled");
                                break;

                            default:
                                throw new Error("Unknown menu command: " + dataCommand);
                        }
                        this.closeMenu();
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
                        const isOpen = menuItem.classList.contains('open');
                        this.querySelectorAll('.menu-item.open,.submenu.open').forEach(elm => elm.classList.remove('open'));
                        let parentMenuItem = menuItem;
                        while(parentMenuItem && parentMenuItem.classList.contains('menu-item')) {
                            parentMenuItem.classList.toggle('open', !isOpen);
                            parentMenuItem = parentMenuItem.parentNode.parentNode.previousElementSibling;
                        }
                        return;
                    }

                    console.warn("Unhandled menu click", e);
                    break;
                }
                this.closeMenu();
                break;

            default:
            // console.error("Unhandled " + e.type, e);
        }
    }

    update() {

        // const gridDuration = this.fieldRenderDuration.value || 1;
        const cursorIndex = this.editor.grid.cursorPosition;
        const selectedIndices = this.editor.grid.selectedIndices;
        const groupName = this.editor.grid.groupName;
        const instructionList = this.editor.player ? this.editor.player.getInstructions(groupName) : [];
        let combinedInstruction = null; //, instrumentList = [];
        for(let i=0; i<selectedIndices.length; i++) {
            const selectedIndex = selectedIndices[i];
            if(!instructionList[selectedIndex])
                throw new Error("Instruction not found at index " + selectedIndex + " in group " + groupName);
            const selectedInstruction = instructionList[selectedIndex];

            if(selectedInstruction.command[0] === '!')
                continue;

            // if(typeof selectedInstruction.instrument !== "undefined")
            //     if(instrumentList.indexOf(selectedInstruction.instrument) === -1)
            //         instrumentList.push(selectedInstruction.instrument);

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
        // if(instrumentList.length === 0)
            // instrumentList = [0];

        // Row Instructions

        // Group Buttons
        this.querySelectorAll('button[name=groupName]')
            .forEach(button => button.classList.toggle('selected', button.getAttribute('value') !== groupName));

        // Instruction Forms
        // this.querySelectorAll('.form-section-new-instruction, .form-section-modify-instruction')
        //     .forEach(fieldset => fieldset.classList.add('hidden'));


        // this.fieldInstructionCommand.value = 'C4';
        // this.fieldInstructionInstrument.value = instrumentList[0] || 0;
        // this.fieldInstructionInstrument.value = '0';
        this.fieldInstructionDuration.value = parseFloat(this.fieldRenderDuration.value) + '';
        // this.fieldInstructionVelocity.value = 100;

        this.classList.remove('show-insert-instruction-controls');
        this.classList.remove('show-modify-instruction-controls');
        if(combinedInstruction) {
            // Note Instruction
            this.fieldInstructionCommand.value = combinedInstruction.command;
            this.fieldInstructionInstrument.value = combinedInstruction.instrument;
            this.fieldInstructionVelocity.value = typeof combinedInstruction.velocity === 'undefined' ? '' : combinedInstruction.velocity;
            this.fieldInstructionDuration.value = combinedInstruction.duration;
            this.classList.add('show-modify-instruction-controls');

        } else if(cursorIndex !== null) {

            this.classList.add('show-insert-instruction-controls');
        }

        this.fieldInstructionCommand.querySelectorAll('.instrument-frequencies option').forEach((option) =>
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value === option.getAttribute('data-instrument')));
        this.fieldInsertInstructionCommand.querySelectorAll('.instrument-frequencies option').forEach((option) =>
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value === option.getAttribute('data-instrument')));

        // const oldInsertCommand = this.fieldInsertInstructionCommand.value;
        // this.fieldInsertInstructionCommand.querySelector('.instrument-frequencies').innerHTML = instructionCommandOptGroup.innerHTML;
        // this.fieldInsertInstructionCommand.value = oldInsertCommand;
        // if(!this.fieldInsertInstructionCommand.value)
        //     this.fieldInsertInstructionCommand.value-this.fieldInsertInstructionCommand.options[0].value

        this.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedIndices.length > 1 ? '(s)' : ''));

    }

    render() {
        this.innerHTML =
            `<ul class="editor-menu">
                <li>
                    <a class="menu-item"><span class="key">F</span>ile</a>
                    <ul class="submenu">
                        <li>
                            <a class="menu-item">Open from memory &#9658;</a>
                            ${this.renderEditorMenuLoadFromMemory()}
                        </li>
                        <li><a class="menu-item" data-command="load:file">Open from file</a></li>
                        <li><a class="menu-item disabled" data-command="load:url">Open from url</a></li>
                        
                        <hr/>
                        <li><a class="menu-item" data-command="save:memory">Save to memory</a></li>
                        <li><a class="menu-item" data-command="save:file">Save to file</a></li>
                        <li><a class="menu-item" data-command="save:server">Save to server</a></li>
                        
                        <hr/>
                        <li><a class="menu-item disabled" data-command="export:file">Export to audio file</a></li>
                    </ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">C</span>md</a>
                    <ul class="submenu submenu:command">
                        <li><a class="menu-item" data-command="instruction:insert">Insert <span class="key">N</span>ew Command</a></li>
                        <li><a class="menu-item" data-command="instruction:command">Set <span class="key">C</span>ommand</a></li>
                        <li><a class="menu-item" data-command="instruction:instrument">Set <span class="key">I</span>nstrument</a></li>
                        <li><a class="menu-item" data-command="instruction:duration">Set <span class="key">D</span>uration</a></li>
                        <li><a class="menu-item" data-command="instruction:velocity">Set <span class="key">V</span>elocity</a></li>
                        <li><a class="menu-item" data-command="instruction:panning">Set <span class="key">P</span>anning</a></li>
                        <li><a class="menu-item" data-command="instruction:remove"><span class="key">D</span>elete Note</a></li>
                    </ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">R</span>ow</a>
                    <ul class="submenu submenu:pause">
                        <li><a class="menu-item" data-command="row:remove"><span class="key">R</span>emove Row</a></li>
                    </ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">G</span>roup</a>
                    <ul class="submenu submenu:group">
                        <li><a class="menu-item" data-command="group:add"><span class="key">I</span>nsert Group</a></li>
                        <li><a class="menu-item" data-command="group:remove"><span class="key">R</span>emove Group</a></li>
                        <li><a class="menu-item" data-command="group:rename"><span class="key">R</span>ename Group</a></li>
                    </ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">I</span>nstrument</a>
                    <ul class="submenu submenu:instrument">
                        <li><a class="menu-item" data-command="instrument:add">Add <span class="key">N</span>ew Instrument</a></li>
                    </ul>
                </li>
                <li><a class="menu-item disabled"><span class="key">P</span>ublish</a></li>
            </ul>
            <ul class="editor-context-menu submenu">
                <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
                <li>
                    <a class="menu-item"><span class="key">N</span>ote<span class="submenu-pointer"></span></a>
                    <ul class="submenu" data-submenu-content="submenu:command"></ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">R</span>ow<span class="submenu-pointer"></span></a>
                    <ul class="submenu" data-submenu-content="submenu:pause"></ul>
                </li>
                <li>
                    <a class="menu-item"><span class="key">G</span>roup <span class="submenu-pointer"></span></a>
                    <ul class="submenu" data-submenu-content="submenu:group"></ul>
                </li>
            </ul>
            <div class="editor-forms">
                <div class="form-section">
                    <legend>Playback Controls</legend>
                    <form class="form-song-play" data-command="song:play">
                        <button name="play" class="themed">Play</button>
                    </form>
                    <form class="form-song-pause" data-command="song:pause">
                        <button name="pause" class="themed">Pause</button>
                    </form>
                    <form class="form-song-resume" data-command="song:resume">
                        <button name="resume" class="themed">Resume</button>
                    </form>
                    <form class="form-song-volume" data-command="song:volume">
                        <div class="volume-container">
                            <input name="volume" type="range" min="1" max="100" value="${this.editor.player ? this.editor.player.getVolumeGain().gain.value*100 : 0}" class="themed">
                        </div>
                    </form>
                    <form class="form-song-info" data-command="song:info">
                        <button name="info" class="themed" disabled>Info</button>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Add New Instrument</legend>
                    <form class="form-add-instrument" data-command="song:add-instrument">
                        <select name="instrument" class="themed">
                            <option value="">Select Instrument</option>
                            ${this.renderEditorFormOptions('instruments-available')}
                        </select>
                    </form>
                </div>                     
    
                <br style="clear: both;"/>
     
                <div class="form-section show-on-insert-instruction">
                    <legend>Insert Instruction</legend>
                    <form class="form-instruction-insert" data-command="instruction:insert">
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
                    <legend>Modify Instruction</legend>
                    <form class="form-instruction-command" data-command="instruction:command">
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
                    <form class="form-instruction-remove" data-command="instruction:remove">
                        <button name="remove" class="themed" title="Remove Instruction">-</button>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Instrument</legend>
                    <form class="form-instruction-instrument" data-command="instruction:instrument">
                        <select name="instrument" title="Instruction Instrument" class="themed">
                            <option value="">Instrument (Default)</option>
                            <optgroup label="Song Instruments">
                                ${this.renderEditorFormOptions('instruments-songs')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Duration</legend>
                    <form class="form-instruction-duration" data-command="instruction:duration">
                        <select name="duration" title="Instruction Duration" class="themed">
                            <optgroup label="Note Duration">
                                <option value="">Duration (Default)</option>
                                ${this.renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Velocity</legend>
                    <form class="form-instruction-velocity" data-command="instruction:velocity">
                        <select name="velocity" title="Instruction Velocity" class="themed">
                            <optgroup label="Velocity">
                                <option value="">Velocity (Default)</option>
                                ${this.renderEditorFormOptions('velocities')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Modify Row</legend>
                    <form class="form-row-insert" data-command="row:insert">
                        <button name="insert" disabled="disabled" class="themed">+</button>
                    </form>
                    <form class="form-row-remove" data-command="row:remove">
                        <button name="remove" disabled="disabled" class="themed">-</button>
                    </form>
                    <form class="form-row-duplicate" data-command="row:duplicate">
                        <button name="duplicate" disabled="disabled" class="themed">Duplicate</button>
                    </form>
                </div>                

                <br style="clear: both;"/>
                
                
                <div class="form-section">
                    <legend>Octave</legend>
                    <form class="form-render-octave">
                        <select name="octave" class="themed">
                            <option value="">Select Octave</option>
                            ${this.renderEditorFormOptions('command-frequency-octaves')}
                        </select>
                    </form>
                </div>     
                
                <div class="form-section">
                    <legend>Render Group</legend>
                    ${this.getEditorFormOptions('groups', (value, label) =>
                        `<form class="form-group" data-command="group:edit">`
                        + `<button name="groupName" value="${value}" class="themed" >${label}</button>`
                        + `</form>`)}
                    
                    <form class="form-group" data-command="group:edit">
                        <button name="groupName" value=":new" class="new themed" title="Create new group">+</button>
                    </form>
                    
                </div>
                
                <div class="form-section">
                    <legend>Render Duration</legend>
                    <form class="form-render-duration" data-command="grid:duration">
                        <label class="row-label">
                            <select name="duration" title="Render Duration" class="themed">
                                <option value="1.0">Default (1B)</option>
                                <optgroup label="Render Duration">
                                    ${this.renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                        </label>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend>Filter By Instrument</legend>                    
                    <form class="form-render-instrument" data-command="grid:instrument">
                        <label class="row-label">
                            <select name="instrument" class="themed"->
                                <option value="">Show All (Default)</option>
                                <optgroup label="Filter By">
                                    ${this.renderEditorFormOptions('instruments-songs')}
                                </optgroup>
                            </select>
                        </label>
                    </form>
                </div>
    
    
            </div>
        `;
        // this.update();
    }

    renderEditorMenuLoadFromMemory() {
        return '';
        const songGUIDs = JSON.parse(localStorage.getItem('share-editor-saved-list') || '[]');
//         console.log("Loading songData list from memory: ", songGUIDs);

        let menuItemsHTML = '';
        for(let i=0; i<songGUIDs.length; i++) {
            const songGUID = songGUIDs[i];
            let songDataString = localStorage.getItem('song:' + songGUID);
            const song = JSON.parse(songDataString);
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


// <br/>
// <label class="row-label">Group:</label>
// <form class="form-song-bpm" data-command="song:edit">
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

    renderEditorFormOptions(optionType, selectCallback) {
        let optionsHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, html) {
            const selected = selectCallback ? selectCallback(value) : false;
            optionsHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}${html}>${label}</option>`;
        });
        return optionsHTML;
    }


    getEditorFormOptions(optionType, callback) {
        let optionsHTML = '';
        const songData = this.editor.getSongData() || {};

        switch(optionType) {
            case 'instruments-songs':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID];
                        // const instrument = this.editor.player.getInstrument(instrumentID);
                        optionsHTML += callback(instrumentID, this.editor.format(instrumentID, 'instrument')
                        + ': ' + (instrumentInfo.name ? instrumentInfo.name : instrumentInfo.url.split('/').pop()));
                    }
                }
                break;

            case 'instruments-available':
                if(this.editor.status.instrumentLibrary) {
                    const instrumentLibrary = this.editor.status.instrumentLibrary;
                    Object.keys(instrumentLibrary.index).forEach((path) => {
                        let pathConfig = instrumentLibrary.index[path];
                        if (typeof pathConfig !== 'object') pathConfig = {title: pathConfig};
                        optionsHTML += callback(instrumentLibrary.baseURL + path, pathConfig.title + " (" + instrumentLibrary.baseURL + path + ")");
                    });
                }
                break;

            case 'command-instrument-frequencies':
                for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                    if(this.editor.player.isInstrumentLoaded(instrumentID)) {
                        const instance = this.editor.player.getInstrument(instrumentID);
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
                    optionsHTML += callback(oi, 'Octave ' + oi);
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
            this.editor.grid.selectCell(e, dataElm);
            // this.grid.focus();
        } else if(target.classList.contains('grid-row')) {
            contextMenu.classList.add('selected-row');
        }

        contextMenu.classList.add('open');

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
    }

    closeMenu() {
        this.querySelectorAll('.menu-item.open,.submenu.open')
            .forEach(elm => elm.classList.remove('open'));
    }

}
customElements.define('music-editor-menu', MusicEditorMenuElement);
