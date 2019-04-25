class SongEditorMenu {
    constructor(editor) {
        this.editor = editor;
    }

    get renderElement() {
        let renderElement = this.editor.querySelector('ul.editor-menu');
        if(!renderElement) {
            this.editor.innerHTML += `<ul class="editor-menu" tabindex="0"></ul>`;
            renderElement = this.editor.querySelector('ul.editor-menu');
        }
        return renderElement;
    }

    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;
        if(!this.renderElement.contains(e.target))
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {

            case 'mousedown':
                this.onMenu(e);
                this.closeMenu();
                break;
        }
    }

    onMenu(e) {
        let newCommand, newInstruction;

        // let form = e.target.form || e.target;
        // const cursorCellIndex = this.editor.cursorCellIndex;
        const currentGroup = this.editor.currentGroup;
        const selectedIndicies = this.editor.selectedIndicies;
        const selectedRange = this.editor.selectedRange;
        const selectedNoteIndicies = this.editor.selectedNoteIndicies;

        let menuTarget = e.target;
        if(menuTarget.nodeName.toLowerCase() !== 'a')
            menuTarget = menuTarget.querySelector('a');
        if(!menuTarget)
            return;
        const dataCommand = menuTarget.getAttribute('data-action');
        if(!dataCommand)
            return;
        console.info("Menu Click: " + dataCommand, e);
        // e.preventDefault();


        switch(dataCommand) {
            case 'song:new':
                e.preventDefault();
                document.location = 'song/new';
                break;

            case 'song:save':
                throw new Error("Todo");

            case 'song:load-server-uuid':
                e.preventDefault();
                // let uuid = menuTarget.getAttribute('data-uuid') || null;
                if(!uuid) uuid = prompt("Enter UUID: ");
                this.loadSongFromServer(uuid);
                break;

            case 'song:load-memory-uuid':
                e.preventDefault();
                // let uuid = menuTarget.getAttribute('data-uuid') || null;
                this.loadSongFromMemory(uuid);
                break;

            case 'save:memory':
                e.preventDefault();
                this.saveSongToMemory();
                break;

            case 'save:file':
                e.preventDefault();
                this.saveSongToFile();
                break;


            case 'group:add':
                e.preventDefault();
                let newGroupName = this.generateInstructionGroupName(currentGroup);
                newGroupName = prompt("Create new instruction group?", newGroupName);
                if(newGroupName)    this.addInstructionGroup(newGroupName, [1, 1, 1, 1]);
                else                console.error("Create instruction group canceled");
                break;

            case 'group:remove':
                e.preventDefault();
                this.removeInstructionGroup(currentGroup);
                break;

            case 'group:rename':
                e.preventDefault();
                let renameGroupName = prompt("Rename instruction group?", currentGroup);
                if(renameGroupName)     this.renameInstructionGroup(currentGroup, renameGroupName);
                else                    console.error("Rename instruction group canceled");
                break;

            case 'instruction:insert':
                e.preventDefault();
                newInstruction = this.editor.forms.getInstructionFormValues(true);
                if(!newInstruction)
                    return console.info("Insert canceled");
                newCommand = menuTarget.getAttribute('data-command');
                if(!newCommand)
                    newCommand = prompt("Set Command:", newInstruction.command);
                if(!newCommand)
                    return console.info("Insert canceled");
                newInstruction.command = newCommand;
                let insertIndex = this.editor.renderer.insertInstructionAtPosition(currentGroup, selectedRange[0], newInstruction);
                this.editor.render();
                this.editor.renderer.playInstruction(newInstruction);
                this.editor.selectInstructions(currentGroup, insertIndex, selectedRange);
                break;


            case 'instruction:command':
                e.preventDefault();
                // use menu data or prompt for value
                newCommand = menuTarget.getAttribute('data-command');
                if(!newCommand)
                    newCommand = prompt("Set Command:", this.editor.forms.fieldInstructionCommand.value);
                if(!newCommand)
                    return console.info("Insert canceled");
                for(let i=0; i<selectedNoteIndicies.length; i++) {
                    this.editor.renderer.replaceInstructionParams(currentGroup, selectedNoteIndicies[i], {
                        command: newCommand
                    });
                    this.editor.renderer.playInstructionAtIndex(currentGroup, selectedNoteIndicies[i]);
                }
                this.editor.render();
                this.editor.selectInstructions(currentGroup, selectedNoteIndicies, selectedRange);
                break;

            case 'instruction:duration':
                e.preventDefault();
                // use menu data or prompt for value
                let newDuration = menuTarget.getAttribute('data-duration');
                if(!newDuration)
                    newDuration = prompt("Set Duration:", this.editor.forms.fieldInstructionDuration.value);
                newDuration = parseFloat(newDuration);
                if(isNaN(newDuration) || newDuration < 0)
                    throw new Error("Invalid duration value");
                for(let i=0; i<selectedNoteIndicies.length; i++) {
                    this.editor.renderer.replaceInstructionParams(currentGroup, selectedNoteIndicies[i], {
                        duration: newDuration
                    });
                    this.editor.renderer.playInstructionAtIndex(currentGroup, selectedNoteIndicies[i]);
                }
                this.editor.render();
                this.editor.selectInstructions(currentGroup, selectedNoteIndicies, selectedRange);
                break;

            case 'instruction:velocity':
                e.preventDefault();
                // use menu data or prompt for value
                let newVelocity = menuTarget.getAttribute('data-velocity');
                if(!newVelocity)
                    newVelocity = prompt("Set Velocity:", this.editor.forms.fieldInstructionVelocity.value);
                newVelocity = parseFloat(newVelocity);
                if(isNaN(newVelocity) || newVelocity < 0)
                    throw new Error("Invalid velocity value");
                for(let i=0; i<selectedNoteIndicies.length; i++) {
                    this.editor.renderer.replaceInstructionParams(currentGroup, selectedNoteIndicies[i], {
                        velocity: newVelocity
                    });
                    this.editor.renderer.playInstructionAtIndex(currentGroup, selectedNoteIndicies[i]);
                }
                this.editor.render();
                this.editor.selectInstructions(currentGroup, selectedNoteIndicies, selectedRange);
                break;


            case 'instruction:delete':
                e.preventDefault();
                for(let i=0; i<selectedNoteIndicies.length; i++) {
                    this.editor.renderer.deleteInstructionAtIndex(currentGroup, selectedNoteIndicies[i]);
                }
                this.editor.render();
                this.editor.selectInstructions(currentGroup, selectedNoteIndicies[0], selectedRange);
                break;

            case 'menu:toggle':
                e.preventDefault();
                // this.renderElement.querySelectorAll('a.open').forEach((a) => a !== menuTarget ? a.classList.remove('open') : null);
                // menuTarget.classList.toggle('open');
                break;
            default:
                console.warn("Unknown menu command: " + dataCommand);
        }
    }



    update() {
        const selectedNoteIndicies = this.editor.selectedNoteIndicies;

        this.renderElement.classList.remove('show-modify-instruction-controls');
        if(selectedNoteIndicies.length > 0) {
            // Note is selected
            this.renderElement.classList.add('show-modify-instruction-controls');
        }
    }

    // ${this.renderEditorMenuLoadFromMemory()}
    render() {
        // const player = this.editor.player;
        // const songData = player.getSongData();
        // let tabIndex = 2;

        this.renderElement.innerHTML =
            `<li>
                <a><span class="key">F</span>ile</a>
                <ul class="submenu">
                    <li>
                        <a data-action="song:new">
                            <span class="key">N</span>ew song
                        </a>
                    </li>
                    <li>
                        <a><span class="key">O</span>pen song &#9658;</a>
                        <ul class="submenu">
                            <li>
                                <a class="disabled">from <span class="key">S</span>erver &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('server-recent-uuid', (value, label) =>
                                    `<li><a data-action="song:load-server-uuid" data-uuid="${value}">${label}</a></li>`)}
                                    <li><a data-action="song:load-server-uuid" data-uuid="">Enter UUID</a></li>
                                </ul>
                            </li>
                            <li>
                                <a>from <span class="key">M</span>emory &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('memory-recent-uuid', (value, label) =>
                                    `<li><a data-action="song:load-memory-uuid" data-uuid="${value}">${label}</a></li>`)}
                                    <li><a data-action="song:load-memory-uuid" data-uuid="">Enter UUID</a></li>
                                </ul>
                            </li>
                            <li><a class="disabled" data-action="load:file">from <span class="key">F</span>ile</a></li>
                            <li><a class="disabled" data-action="load:url">from <span class="key">U</span>rl</a></li>
                        </ul>
                    </li>
                    <li>
                        <a><span class="key">S</span>ave song &#9658;</a>
                        <ul class="submenu">
                            <li><a class="disabled" data-action="song:server-sync">to <span class="key">S</span>erver</a><input type="checkbox" ${this.editor.webSocket ? `checked="checked"` : ''}></li>
                            <li><a data-action="save:memory">to <span class="key">M</span>emory</a></li>
                            <li><a data-action="save:file">to <span class="key">F</span>ile</a></li>    
                        </ul>
                    </li> 
                    <li>
                        <a class="disabled"><span class="key">E</span>xport song &#9658;</a>
                        <ul class="submenu">
                            <li><a class="disabled" data-action="export:file">to audio file</a></li>
                        </ul>
                    </li>     
                </ul>
            </li>
            <li>
                <a><span class="key">E</span>dit</a>
                <ul class="submenu editor-context-menu">
                    <li class="insert-instruction-controls">
                        <a>Insert <span class="key">N</span>ew Command &#9658;</a>
                        <ul class="submenu">
                            <li>
                                <a><span class="key">F</span>requency &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('note-frequency-octaves', (octave, label) =>
                                        `<li>
                                            <a>Octave ${label}</a>
                                            <ul class="submenu">
                                            ${this.editor.forms.getEditorFormOptions('note-frequencies', (noteName, label) =>
                                                `<li><a data-action="instruction:insert" data-command="${noteName+octave}">${label}${octave}</a>`)}
                                            </ul>
                                        </li>`)}
                                        <li><a data-action="instruction:insert">Custom Command</a></li>
                                </ul>
                            </li>
                            <li>
                                <a><span class="key">N</span>amed &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('command-instrument-frequencies', (value, label) =>
                                        `<li><a data-action="instruction:insert" data-command="${value}">${label}</a></li>`)}
                                        <li><a data-action="instruction:insert">Custom Command</a></li>
                                </ul>
                            </li>
                            <li>
                                <a><span class="key">G</span>roup &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('command-group-execute', (value, label) =>
                                        `<li><a data-action="instruction:insert" data-command="${value}">${label}</a></li>`)}
                                        <li><a data-action="instruction:insert">Custom Command</a></li>
                                </ul>
                            </li>
                        </ul>
                    </li>
                    <li class="modify-instruction-controls">
                        <a>Set <span class="key">C</span>ommand &#9658;</a>
                        <ul class="submenu">
                            <li>
                                <a><span class="key">F</span>requency &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('note-frequency-octaves', (octave, label) =>
                                        `<li>
                                            <a>Octave ${label}</a>
                                            <ul class="submenu">
                                            ${this.editor.forms.getEditorFormOptions('note-frequencies', (noteName, label) =>
                                                `<li><a data-action="instruction:command" data-command="${noteName+octave}">${label}${octave}</a>`)}
                                            </ul>
                                        </li>`)}
                                </ul>
                            </li>
                            <li>
                                <a><span class="key">N</span>amed &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('command-instrument-frequencies', (value, label) =>
                                        `<li><a data-action="instruction:command" data-command="${value}">${label}</a></li>`)}
                                </ul>
                            </li>
                            <li>
                                <a><span class="key">G</span>roup &#9658;</a>
                                <ul class="submenu">
                                    ${this.editor.forms.getEditorFormOptions('command-group-execute', (value, label) =>
                                        `<li><a data-action="instruction:command" data-command="${value}">${label}</a></li>`)}
                                </ul>
                            </li>
                            <li><a data-action="instruction:command">Custom Command</a></li>
                        </ul>
                    </li>
                    <li class="modify-instruction-controls">
                        <a>Set <span class="key">I</span>nstrument &#9658;</a>
                        <ul class="submenu">
                            ${this.editor.forms.getEditorFormOptions('song-instruments', (value, label) =>
                                `<li><a data-action="instruction:instrument" data-instrument="${value}">${label}</a></li>`)}
                                <li>
                                    <a data-action="instruction:instrument">Add new Instrument &#9658;</a>
                                </li>
                        </ul>
                    </li>
                    <li class="modify-instruction-controls">
                        <a>Set <span class="key">D</span>uration &#9658</a>
                        <ul class="submenu">
                            <li><a data-action="instruction:duration">Custom Duration</a></li>
                            ${this.editor.forms.getEditorFormOptions('durations', (value, label) =>
                                `<li><a data-action="instruction:duration" data-duration="${value}">${label}</a></li>`)}
                        </ul>
                    </li>
                    <li class="modify-instruction-controls">
                        <a>Set <span class="key">V</span>elocity &#9658</a>
                        <ul class="submenu">
                            <li><a data-action="instruction:velocity">Custom Velocity</a></li>
                            ${this.editor.forms.getEditorFormOptions('velocities', (value, label) =>
                                `<li><a data-action="instruction:velocity" data-velocity="${value}">${label}</a></li>`)}
                        </ul>
                    </li>
                    <li class="modify-instruction-controls"><a data-action="instruction:panning" class="disabled">Set <span class="key">P</span>anning</a></li>
                    <li class="modify-instruction-controls"><a data-action="instruction:delete"><span class="key">D</span>elete Note</a></li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">R</span>ow &#9658;</a>
                        <ul class="submenu">
                            <li><a data-action="row:delete"><span class="key">D</span>elete Row</a></li>
                        </ul>
                    </li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">G</span>roup &#9658;</a>
                        <ul class="submenu">
                            <li><a data-action="group:add"><span class="key">I</span>nsert new Group</a></li>
                            <li><a data-action="group:delete"><span class="key">D</span>elete current Group</a></li>
                            <li><a data-action="group:rename"><span class="key">R</span>ename current Group</a></li>
                        </ul>
                    </li>
                </ul>
            </li>
            <li>
                <a><span class="key">V</span>iew</a>
                <ul class="submenu">
                </ul>
            </li>
            <li>
                <a><span class="key">I</span>nstruments</a>
                <ul class="submenu">
                    <li><a data-action="instrument:add">Add <span class="key">N</span>ew Instrument</a></li>
                </ul>
            </li>`;


        this.update();
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
//         <ul class="submenu">
//             ${menuItemsHTML}
//         </ul>
//     `;
//     }


// <br/>
// <label class="row-label">Group:</label>
// <form class="form-song-bpm" data-action="song:edit">
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
        let x = e.clientX, y = e.clientY;

        this.renderElement.querySelectorAll('a.open').forEach(elm => elm.classList.remove('open'));
        // this.renderElement.querySelectorAll('.selected-context-menu').forEach(elm => elm.classList.remove('selected-context-menu'));
        const contextMenu = this.renderElement.querySelector('.editor-context-menu');

        contextMenu.classList.add('open-context-menu');
        contextMenu.classList.add('open');

        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        // console.info("Context menu", contextMenu);
    }

    closeMenu() {
        const contextMenu = this.renderElement.querySelector('.editor-context-menu');
        contextMenu.classList.remove('open-context-menu');
        contextMenu.classList.remove('open');
        contextMenu.removeAttribute('style');
        this.renderElement.querySelectorAll('.menu-item.open,.submenu.open')
            .forEach(elm => elm.classList.remove('open'));
    }

}
// customElements.define('music-song-menu', MusicEditorMenuElement);
