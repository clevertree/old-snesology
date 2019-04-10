class SongEditorMenu {
    constructor(editor) {
        this.editor = editor;
        this.renderElm=null;
    }


    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {

            case 'mousedown':
                const dataCommand = e.target.getAttribute('data-command');
                if(dataCommand) {
                    this.onMenu(e);
                }
                this.closeMenu();
                break;
        }
    }

    onMenu(e) {
        const cursorIndex = this.grid.cursorPosition;
        const currentGroup = this.grid.groupName;
        const instructionList = this.grid.instructionList;
        const cursorInstruction = instructionList[cursorIndex];

        const dataCommand = e.target.getAttribute('data-command');
        if(!dataCommand)
            return;
        console.info("Menu Click: " + dataCommand, e);
        e.preventDefault();

        let uuid = e.target.getAttribute('data-uuid') || null;

        switch(dataCommand) {
            case 'song:new':
                document.location = 'song/new';
                e.preventDefault();
                break;

            case 'song:save':
                throw new Error("Todo");

            case 'song:load-server-uuid':
                if(!uuid) uuid = prompt("Enter UUID: ");
                this.loadSongFromServer(uuid);
                e.preventDefault();
                break;

            case 'song:load-memory-uuid':
                this.loadSongFromMemory(uuid);
                e.preventDefault();
                break;

            case 'save:memory':
                this.saveSongToMemory();
                e.preventDefault();
                break;

            case 'save:file':
                this.saveSongToFile();
                e.preventDefault();
                break;


            case 'group:add':
                let newGroupName = this.generateInstructionGroupName(currentGroup);
                newGroupName = prompt("Create new instruction group?", newGroupName);
                if(newGroupName)    this.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                else                console.error("Create instruction group canceled");
                e.preventDefault();
                break;

            case 'group:remove':
                this.removeInstructionGroup(currentGroup);
                e.preventDefault();
                break;

            case 'group:rename':
                let renameGroupName = prompt("Rename instruction group?", currentGroup);
                if(renameGroupName)     this.renameInstructionGroup(currentGroup, renameGroupName);
                else                    console.error("Rename instruction group canceled");
                e.preventDefault();
                break;

            case 'instruction:insert':
                const newInstruction = {
                    // type: 'note',
                    instrument: 0,
                    command: 'C4',
                    duration: 1
                }; // new instruction
                // song.getSelectedInstructions() = [selectedInstruction]; // select new instruction
                this.insertInstructionAtIndex(currentGroup, cursorIndex, newInstruction);
                e.preventDefault();
                break;

            case 'instruction:command':
                const newCommand = prompt("Set Command:", cursorInstruction.command);
                if(newCommand !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    command: newCommand
                });
                else                    console.error("Set instruction command canceled");
                e.preventDefault();
                break;

            case 'instruction:duration':
                const newDuration = prompt("Set Duration:", typeof cursorInstruction.duration === 'undefined' ? 1 : cursorInstruction.duration);
                if(newDuration < 0) throw new Error("Invalid duration value");
                if(newDuration !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    duration: newDuration
                });
                else                    console.error("Set instruction duration canceled");
                e.preventDefault();
                break;

            case 'instruction:velocity':
                const newVelocity = prompt("Set Velocity:", typeof cursorInstruction.velocity === 'undefined' ? 100 : cursorInstruction.velocity);
                if(newVelocity < 0 || newVelocity > 100) throw new Error("Invalid velocity value");
                if(newVelocity !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    velocity: newVelocity
                });
                else                    console.error("Set instruction velocity canceled");
                e.preventDefault();
                break;

            case 'menu:toggle':
                // this.renderElm.querySelectorAll('a.open').forEach((a) => a !== e.target ? a.classList.remove('open') : null);
                // e.target.classList.toggle('open');
                e.preventDefault();
                break;
            default:
                console.warn("Unknown menu command: " + dataCommand);
        }
    }


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
            newInstruction.duration = this.fieldInstructionDuration.value;
        const velocityValue = parseInt(this.fieldInstructionVelocity.value);
        if(velocityValue && velocityValue !== 100)
            newInstruction.velocity = velocityValue;

        return newInstruction;
    }


    update() {


        // const gridDuration = this.fieldRenderDuration.value || 1;
        const cursorIndex = this.editor.grid.cursorPosition;
        const selectedIndices = this.editor.grid.selectedIndices;
        const groupName = this.editor.grid.groupName;
        const instructionList = this.editor.player ? this.editor.renderer.getInstructions(groupName) : [];
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
        this.renderElm.querySelectorAll('button[name=groupName]')
            .forEach(button => button.classList.toggle('selected', button.getAttribute('value') !== groupName));

        // Instruction Forms
        // this.renderElm.querySelectorAll('.form-section-new-instruction, .form-section-modify-instruction')
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

        this.renderElm.querySelectorAll('.multiple-count-text').forEach((elm) => elm.innerHTML = (selectedIndices.length > 1 ? '(s)' : ''));

    }

    // ${this.renderEditorMenuLoadFromMemory()}
    render() {
        // const player = this.editor.player;
        // const songData = player.getSongData();
        // let tabIndex = 2;
        this.renderElm = this.editor.querySelector('ul.editor-menu');
        if(!this.renderElm) {
            this.editor.innerHTML += `<ul class="editor-menu"></ul>`;
            this.renderElm = this.editor.querySelector('ul.editor-menu');
        }
        this.renderElm.innerHTML =
            `<li>
                <a><span class="key">F</span>ile</a>
                <ul class="sub-menu">
                    <li>
                        <a href="editor/new" target="_blank" data-command1="song:new">
                            <span class="key">N</span>ew song
                        </a>
                    </li>
                    <li>
                        <a><span class="key">O</span>pen song &#9658;</a>
                        <ul class="sub-menu">
                            <li>
                                <a>from <span class="key">S</span>erver &#9658;</a>
                                <ul class="sub-menu">
                                    ${this.editor.forms.getEditorFormOptions('server-recent-uuid', (value, label) =>
                                    `<li><a data-command="song:load-server-uuid" data-uuid="${value}">${label}</a></li>`)}
                                    <li><a data-command="song:load-server-uuid" data-uuid="">Enter UUID</a></li>
                                </ul>
                            </li>
                            <li>
                                <a>from <span class="key">M</span>emory &#9658;</a>
                                <ul class="sub-menu">
                                    ${this.editor.forms.getEditorFormOptions('memory-recent-uuid', (value, label) =>
                                    `<li><a data-command="song:load-memory-uuid" data-uuid="${value}">${label}</a></li>`)}
                                    <li><a data-command="song:load-memory-uuid" data-uuid="">Enter UUID</a></li>
                                </ul>
                            </li>
                            <li><a class="disabled" data-command="load:file">from <span class="key">F</span>ile</a></li>
                            <li><a class="disabled" data-command="load:url">from <span class="key">U</span>rl</a></li>
                        </ul>
                    </li>
                    <li>
                        <a><span class="key">S</span>ave song &#9658;</a>
                        <ul class="sub-menu">
                            <li><a data-command="song:server-sync">to <span class="key">S</span>erver</a><input type="checkbox" ${this.editor.webSocket ? `checked="checked"` : ''}></li>
                            <li><a data-command="save:memory">to <span class="key">M</span>emory</a></li>
                            <li><a data-command="save:file">to <span class="key">F</span>ile</a></li>    
                        </ul>
                    </li> 
                    <li>
                        <a><span class="key">E</span>xport song &#9658;</a>
                        <ul class="sub-menu">
                            <li><a class="disabled" data-command="export:file">to audio file</a></li>
                        </ul>
                    </li>     
                </ul>
            </li>
            <li>
                <a><span class="key">E</span>dit</a>
                <ul class="sub-menu">
                    <li><a data-command="instruction:insert">Insert <span class="key">N</span>ew Command</a></li>
                    <li><a data-command="instruction:command">Set <span class="key">C</span>ommand</a></li>
                    <li><a data-command="instruction:instrument">Set <span class="key">I</span>nstrument</a></li>
                    <li><a data-command="instruction:duration">Set <span class="key">D</span>uration</a></li>
                    <li><a data-command="instruction:velocity">Set <span class="key">V</span>elocity</a></li>
                    <li><a data-command="instruction:panning">Set <span class="key">P</span>anning</a></li>
                    <li><a data-command="instruction:delete"><span class="key">D</span>elete Note</a></li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">R</span>ow &#9658;</a>
                        <ul class="sub-menu">
                            <li><a data-command="row:delete"><span class="key">D</span>elete Row</a></li>
                        </ul>
                    </li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">G</span>roup &#9658;</a>
                        <ul class="sub-menu">
                            <li><a data-command="group:add"><span class="key">I</span>nsert new Group</a></li>
                            <li><a data-command="group:delete"><span class="key">D</span>elete current Group</a></li>
                            <li><a data-command="group:rename"><span class="key">R</span>ename current Group</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li>
                <a><span class="key">V</span>iew</a>
                <ul class="sub-menu">
                </ul>
            </li>
            <li>
                <a><span class="key">I</span>nstruments</a>
                <ul class="sub-menu">
                    <li><a data-command="instrument:add">Add <span class="key">N</span>ew Instrument</a></li>
                </ul>
            </li>`;


    // <ul class="editor-context-menu submenu">
    //         <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
    //     <li>
    //     <a><span class="key">N</span>ote<span class="sub-menu-pointer"></span></a>
    //     <ul class="sub-menu" data-submenu-content="submenu:command"></ul>
    //         </li>
    //         <li>
    //         <a><span class="key">R</span>ow<span class="sub-menu-pointer"></span></a>
    //     <ul class="sub-menu" data-submenu-content="submenu:pause"></ul>
    //         </li>
    //         <li>
    //         <a><span class="key">G</span>roup <span class="sub-menu-pointer"></span></a>
    //     <ul class="sub-menu" data-submenu-content="submenu:group"></ul>
    //         </li>
    //         </ul>`;


        // this.update();
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
//         <ul class="sub-menu">
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

        this.renderElm.querySelectorAll('a.open').forEach(elm => elm.classList.remove('open'));
        // this.renderElm.querySelectorAll('.selected-context-menu').forEach(elm => elm.classList.remove('selected-context-menu'));
        const contextMenu = this.renderElm.querySelector('.song-context-menu');
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
            // this.grid.focus();
        } else if(target.classList.contains('grid-row')) {
            contextMenu.classList.add('selected-row');
        }

        contextMenu.classList.add('open');

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
    }

    closeMenu() {
        this.renderElm.querySelectorAll('.menu-item.open,.submenu.open')
            .forEach(elm => elm.classList.remove('open'));
    }

}
// customElements.define('music-song-menu', MusicEditorMenuElement);
