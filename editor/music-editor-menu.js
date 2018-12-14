// Include assets

((INCLUDE_CSS) => {
    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
})("editor/music-editor-menu.css");

class MusicEditorMenuElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
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
        // this.addEventListener('change', (e) => e.target.form.submit());
        // this.addEventListener('submit', this.onSubmit);

        this.render();
        // setTimeout(() => this.update(), 5);
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
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value !== option.getAttribute('data-instrument')));
        this.fieldInsertInstructionCommand.querySelectorAll('.instrument-frequencies option').forEach((option) =>
            option.classList.toggle('hidden', this.fieldInstructionInstrument.value !== option.getAttribute('data-instrument')));

        // const oldInsertCommand = this.fieldInsertInstructionCommand.value;
        // this.fieldInsertInstructionCommand.querySelector('.instrument-frequencies').innerHTML = instructionCommandOptGroup.innerHTML;
        // this.fieldInsertInstructionCommand.value = oldInsertCommand;
        // if(!this.fieldInsertInstructionCommand.value)
        //     this.fieldInsertInstructionCommand.value-this.fieldInsertInstructionCommand.options[0].value

        this.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedIndices.length > 1 ? '(s)' : ''));

    }

    // ${this.renderEditorMenuLoadFromMemory()}
    render() {
        const player = this.editor.player;
        const songData = player.getSongData();
        let tabIndex = 2;
        this.innerHTML =
            `<ul class="menu header-menu">
                <li>
                    <a tabindex="${tabIndex++}"><span class="key">F</span>ile</a>
                    <ul class="menu">
                        <li>
                            <a href="editor/new" target="_blank" data-command1="song:new">
                                <span class="key">N</span>ew song
                            </a>
                        </li>
                        <li>
                            <a tabindex="${tabIndex++}"><span class="key">O</span>pen song &#9658;</a>
                            <ul class="menu">
                                <li>
                                    <a>from <span class="key">S</span>erver &#9658;</a>
                                    <ul class="menu">
                                        ${this.editor.getEditorFormOptions('server-recent-uuid', (value, label) =>
                                        `<li><a data-command="song:load-server-uuid" data-uuid="${value}">${label}</a></li>`)}
                                        <li><a data-command="song:load-server-uuid" data-uuid="">Enter UUID</a></li>
                                    </ul>
                                </li>
                                <li>
                                    <a>from <span class="key">M</span>emory &#9658;</a>
                                    <ul class="menu">
                                        ${this.editor.getEditorFormOptions('memory-recent-uuid', (value, label) =>
                                        `<li><a data-command="song:load-memory-uuid" data-uuid="${value}">${label}</a></li>`)}
                                        <li><a data-command="song:load-memory-uuid" data-uuid="">Enter UUID</a></li>
                                    </ul>
                                </li>
                                <li><a class="disabled" data-command="load:file">from <span class="key">F</span>ile</a></li>
                                <li><a class="disabled" data-command="load:url">from <span class="key">U</span>rl</a></li>
                            </ul>
                        </li>
                        <li>
                            <a tabindex="${tabIndex++}"><span class="key">S</span>ave song &#9658;</a>
                            <ul class="menu">
                                <li><a data-command="song:server-sync">to <span class="key">S</span>erver</a><input type="checkbox" ${this.editor.webSocket ? `checked="checked"` : ''}></li>
                                <li><a data-command="save:memory">to <span class="key">M</span>emory</a></li>
                                <li><a data-command="save:file">to <span class="key">F</span>ile</a></li>    
                            </ul>
                        </li> 
                        <li>
                            <a tabindex="${tabIndex++}"><span class="key">E</span>xport song &#9658;</a>
                            <ul class="menu">
                                <li><a class="disabled" data-command="export:file">to audio file</a></li>
                            </ul>
                        </li>     
                    </ul>
                </li>
                <li>
                    <a tabindex="${tabIndex++}"><span class="key">E</span>dit</a>
                    <ul class="menu">
                        <li><a data-command="instruction:insert">Insert <span class="key">N</span>ew Command</a></li>
                        <li><a data-command="instruction:command">Set <span class="key">C</span>ommand</a></li>
                        <li><a data-command="instruction:instrument">Set <span class="key">I</span>nstrument</a></li>
                        <li><a data-command="instruction:duration">Set <span class="key">D</span>uration</a></li>
                        <li><a data-command="instruction:velocity">Set <span class="key">V</span>elocity</a></li>
                        <li><a data-command="instruction:panning">Set <span class="key">P</span>anning</a></li>
                        <li><a data-command="instruction:delete"><span class="key">D</span>elete Note</a></li>
                        <hr/>
                        <li>
                            <a tabindex="${tabIndex++}">Edit <span class="key">R</span>ow &#9658;</a>
                            <ul class="menu">
                                <li><a data-command="row:delete"><span class="key">D</span>elete Row</a></li>
                            </ul>
                        </li>
                        <hr/>
                        <li>
                            <a tabindex="${tabIndex++}">Edit <span class="key">G</span>roup &#9658;</a>
                            <ul class="menu">
                                <li><a data-command="group:add"><span class="key">I</span>nsert new Group</a></li>
                                <li><a data-command="group:delete"><span class="key">D</span>elete current Group</a></li>
                                <li><a data-command="group:rename"><span class="key">R</span>ename current Group</a></li>
                            </ul>
                        </li>
                    </ul>
                </li>
                <li>
                    <a tabindex="${tabIndex++}"><span class="key">V</span>iew</a>
                    <ul class="menu">
                    </ul>
                </li>
                <li>
                    <a tabindex="${tabIndex++}"><span class="key">I</span>nstruments</a>
                    <ul class="menu">
                        <li><a data-command="instrument:add">Add <span class="key">N</span>ew Instrument</a></li>
                    </ul>
                </li>
            </ul>
            <ul class="menu context-menu">
                <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
                <li>
                    <a><span class="key">N</span>ote<span class="sub-menu-pointer"></span></a>
                    <ul class="menu" data-submenu-content="submenu:command"></ul>
                </li>
                <li>
                    <a><span class="key">R</span>ow<span class="sub-menu-pointer"></span></a>
                    <ul class="menu" data-submenu-content="submenu:pause"></ul>
                </li>
                <li>
                    <a><span class="key">G</span>roup <span class="sub-menu-pointer"></span></a>
                    <ul class="menu" data-submenu-content="submenu:group"></ul>
                </li>
            </ul>
            <div class="editor-forms">
                       

                <div class="form-section">
                    <legend class="themed">Playback Controls</legend>
                    <form class="form-song-play" data-command="song:play">
                        <button name="play" class="themed">Play</button>
                    </form>
                    <form class="form-song-pause" data-command="song:pause">
                        <button name="pause" class="themed">Pause</button>
                    </form>
                    <form class="form-song-resume" data-command="song:resume">
                        <button name="resume" class="themed">Resume</button>
                    </form>
                    <form class="form-song-volume submit-on-change" data-command="song:volume">
                        <div class="volume-container">
                            <input name="volume" type="range" min="1" max="100" value="${player ? player.getVolume() : 0}" class="themed">
                        </div>
                    </form>
                </div>
                                             
                
                <div class="form-section">
                    <legend class="themed">Song Title</legend>
                    <form class="form-song-title submit-on-change" data-command="song:set-title">
                        <input name="title" type="text" class="themed" value="${songData.title}" />
                    </form>
                </div>     
                
                <div class="form-section">
                    <legend class="themed">Version</legend>
                    <form class="form-song-version submit-on-change" data-command="song:set-version">
                        <input name="version" type="text" class="themed" value="${songData.version}" />
                    </form>
                </div>                
                 
                <br style="clear: both;"/>
     
                <div class="form-section show-on-insert-instruction">
                    <legend class="themed">Insert Instruction</legend>
                    <form class="form-instruction-insert" data-command="instruction:insert">
                        <select name="command" title="Instruction Command" class="themed" required="required">
                            <optgroup label="Custom Frequencies" class="instrument-frequencies">
                                ${this.editor.renderEditorFormOptions('command-instrument-frequencies')}
                            </optgroup>
                            <optgroup label="Frequencies">
                                ${this.editor.renderEditorFormOptions('command-frequencies')}
                            </optgroup>
                            <optgroup label="Group Execute">
                                ${this.editor.renderEditorFormOptions('command-group-execute')}
                            </optgroup>
                        </select>
                        <button name="insert" class="themed" title="Insert Instruction">+</button>
                    </form>
                </div>
                
                <div class="form-section show-on-modify-instruction">
                    <legend class="themed">Modify Instruction</legend>
                    <form class="form-instruction-command submit-on-change" data-command="instruction:command">
                        <select name="command" title="Instruction Command" class="themed" required="required">
                            <option value="">Command (Choose)</option>
                            <optgroup label="Custom Frequencies" class="instrument-frequencies">
                                ${this.editor.renderEditorFormOptions('command-instrument-frequencies')}
                            </optgroup>
                            <optgroup label="Frequencies">
                                ${this.editor.renderEditorFormOptions('command-frequencies')}
                            </optgroup>
                            <optgroup label="Group Execute">
                                ${this.editor.renderEditorFormOptions('command-group-execute')}
                            </optgroup>
                        </select>
                    </form>
                    <form class="form-instruction-delete" data-command="instruction:delete">
                        <button name="delete" class="themed" title="Delete Instruction">-</button>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend class="themed">Instrument</legend>
                    <form class="form-instruction-instrument submit-on-change" data-command="instruction:instrument">
                        <select name="instrument" title="Instruction Instrument" class="themed">
                            <option value="">Instrument (Default)</option>
                            <optgroup label="Song Instruments">
                                ${this.editor.renderEditorFormOptions('instruments-songs')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend class="themed">Duration</legend>
                    <form class="form-instruction-duration submit-on-change" data-command="instruction:duration">
                        <select name="duration" title="Instruction Duration" class="themed">
                            <optgroup label="Note Duration">
                                <option value="">Duration (Default)</option>
                                ${this.editor.renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend class="themed">Velocity</legend>
                    <form class="form-instruction-velocity submit-on-change" data-command="instruction:velocity">
                        <select name="velocity" title="Instruction Velocity" class="themed">
                            <optgroup label="Velocity">
                                <option value="">Velocity (Default)</option>
                                ${this.editor.renderEditorFormOptions('velocities')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend class="themed">Modify Row</legend>
                    <form class="form-row-insert" data-command="row:insert">
                        <button name="insert" disabled="disabled" class="themed">+</button>
                    </form>
                    <form class="form-row-delete" data-command="row:delete">
                        <button name="delete" disabled="disabled" class="themed">-</button>
                    </form>
                    <form class="form-row-duplicate" data-command="row:duplicate">
                        <button name="duplicate" disabled="disabled" class="themed">Duplicate</button>
                    </form>
                </div>                

                <br style="clear: both;"/>
                
                
                <div class="form-section">
                    <legend class="themed">Octave</legend>
                    <form class="form-render-octave submit-on-change">
                        <select name="octave" class="themed">
                            <option value="">Select Octave</option>
                            ${this.editor.renderEditorFormOptions('command-frequency-octaves')}
                        </select>
                    </form>
                </div>     
                
                <div class="form-section">
                    <legend class="themed">Render Group</legend>
                    ${this.editor.getEditorFormOptions('groups', (value, label) =>
                        `<form class="form-group" data-command="group:edit">`
                        + `<button name="groupName" value="${value}" class="themed" >${label}</button>`
                        + `</form>`)}
                    
                    <form class="form-group" data-command="group:edit">
                        <button name="groupName" value=":new" class="new themed" title="Create new group">+</button>
                    </form>
                    
                </div>
                
                <div class="form-section">
                    <legend class="themed">Render Duration</legend>
                    <form class="form-render-duration submit-on-change" data-command="grid:duration">
                        <label class="row-label">
                            <select name="duration" title="Render Duration" class="themed">
                                <option value="1.0">Default (1B)</option>
                                <optgroup label="Render Duration">
                                    ${this.editor.renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                        </label>
                    </form>
                </div>
                
                <div class="form-section">
                    <legend class="themed">Filter By Instrument</legend>                    
                    <form class="form-render-instrument submit-on-change" data-command="grid:instrument">
                        <label class="row-label">
                            <select name="instrument" class="themed"->
                                <option value="">Show All (Default)</option>
                                <optgroup label="Filter By">
                                    ${this.editor.renderEditorFormOptions('instruments-songs')}
                                </optgroup>
                            </select>
                        </label>
                    </form>
                </div>
    
    
            </div>
        `;
        // this.update();
    }

//     renderEditorMenuLoadFromMemory() {
//         return '';
//         const songGUIDs = JSON.parse(localStorage.getItem('share-editor-saved-list') || '[]');
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

    // Menu

    openContextMenu(e) {
        let dataElm = null;
        let target = e.target;
        let x = e.clientX, y = e.clientY;

        this.querySelectorAll('a.open').forEach(elm => elm.classList.remove('open'));
        // this.querySelectorAll('.selected-context-menu').forEach(elm => elm.classList.remove('selected-context-menu'));
        const contextMenu = this.querySelector('.editor-context-menu');
        // console.info("Context menu", contextMenu);

        // contextMenu.setAttribute('class', 'editor-context-menu');
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
