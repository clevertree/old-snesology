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
                const dataCommand = e.target.getAttribute('data-command');
                if(dataCommand) {
                    this.onMenu(e);
                }
                this.closeMenu();
                break;
        }
    }

    onMenu(e) {
        let form = e.target.form || e.target;
        // const cursorCellIndex = this.editor.cursorCellIndex;
        const currentGroup = this.editor.currentGroup;
        const selectedIndicies = this.editor.selectedIndicies;
        const selectedNoteIndices = this.editor.selectedRange;
        // const selectedPauseIndices = this.editor.selectedPauseIndicies;

        const dataCommand = e.target.getAttribute('data-command');
        if(!dataCommand)
            return;
        console.info("Menu Click: " + dataCommand, e);
        // e.preventDefault();

        let uuid = e.target.getAttribute('data-uuid') || null;

        switch(dataCommand) {
            case 'song:new':
                e.preventDefault();
                document.location = 'song/new';
                break;

            case 'song:save':
                throw new Error("Todo");

            case 'song:load-server-uuid':
                e.preventDefault();
                if(!uuid) uuid = prompt("Enter UUID: ");
                this.loadSongFromServer(uuid);
                break;

            case 'song:load-memory-uuid':
                e.preventDefault();
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
                let newInstruction = this.editor.forms.getInstructionFormValues(true);
                if(!newInstruction)
                    return console.info("Insert canceled");
                let insertIndex = this.editor.renderer.insertInstructionAtPosition(this.editor.currentGroup, selectedRange[0], newInstruction);
                this.editor.selectInstructions(this.editor.currentGroup, insertIndex);
                this.editor.render();
                break;

            case 'instruction:command':
                e.preventDefault();
                const newCommand = prompt("Set Command:", cursorInstruction.command);
                if(newCommand !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    command: newCommand
                });
                else                    console.error("Set instruction command canceled");
                break;

            case 'instruction:duration':
                e.preventDefault();
                const newDuration = prompt("Set Duration:", typeof cursorInstruction.duration === 'undefined' ? 1 : cursorInstruction.duration);
                if(newDuration < 0) throw new Error("Invalid duration value");
                if(newDuration !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    duration: newDuration
                });
                else                    console.error("Set instruction duration canceled");
                break;

            case 'instruction:velocity':
                e.preventDefault();
                const newVelocity = prompt("Set Velocity:", typeof cursorInstruction.velocity === 'undefined' ? 100 : cursorInstruction.velocity);
                if(newVelocity < 0 || newVelocity > 100) throw new Error("Invalid velocity value");
                if(newVelocity !== null)     this.replaceInstructionParams(currentGroup, cursorIndex, {
                    velocity: newVelocity
                });
                else                    console.error("Set instruction velocity canceled");
                break;

            case 'menu:toggle':
                e.preventDefault();
                // this.renderElement.querySelectorAll('a.open').forEach((a) => a !== e.target ? a.classList.remove('open') : null);
                // e.target.classList.toggle('open');
                break;
            default:
                console.warn("Unknown menu command: " + dataCommand);
        }
    }



    update() {
        const cursorIndex = this.editor.cursorCellIndex;
        const selectedNoteIndicies = this.editor.selectedNoteIndicies;

        // Note Instructions

        this.renderElement.classList.remove('show-insert-instruction-controls');
        this.renderElement.classList.remove('show-modify-instruction-controls');
        if(selectedNoteIndicies.length > 0) {
            // Note is selected
            this.renderElement.classList.add('show-modify-instruction-controls');

        } else if(cursorIndex || cursorIndex === 0) {
            // Cursor is available
            this.renderElement.classList.add('show-insert-instruction-controls');
        } else {
            this.renderElement.classList.add('show-no-instruction-controls');
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
                        <a data-command="song:new">
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
                                    `<li><a data-command="song:load-server-uuid" data-uuid="${value}">${label}</a></li>`)}
                                    <li><a data-command="song:load-server-uuid" data-uuid="">Enter UUID</a></li>
                                </ul>
                            </li>
                            <li>
                                <a>from <span class="key">M</span>emory &#9658;</a>
                                <ul class="submenu">
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
                        <ul class="submenu">
                            <li><a class="disabled" data-command="song:server-sync">to <span class="key">S</span>erver</a><input type="checkbox" ${this.editor.webSocket ? `checked="checked"` : ''}></li>
                            <li><a data-command="save:memory">to <span class="key">M</span>emory</a></li>
                            <li><a data-command="save:file">to <span class="key">F</span>ile</a></li>    
                        </ul>
                    </li> 
                    <li>
                        <a class="disabled"><span class="key">E</span>xport song &#9658;</a>
                        <ul class="submenu">
                            <li><a class="disabled" data-command="export:file">to audio file</a></li>
                        </ul>
                    </li>     
                </ul>
            </li>
            <li>
                <a><span class="key">E</span>dit</a>
                <ul class="submenu">
                    <li class="no-instruction-controls"><a class="disabled">Select a grid position to insert or modify notes</a></li>
                    <li class="insert-instruction-controls"><a data-command="instruction:insert">Insert <span class="key">N</span>ew Command</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:command">Set <span class="key">C</span>ommand</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:instrument">Set <span class="key">I</span>nstrument</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:duration">Set <span class="key">D</span>uration</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:velocity">Set <span class="key">V</span>elocity</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:panning">Set <span class="key">P</span>anning</a></li>
                    <li class="modify-instruction-controls"><a data-command="instruction:delete"><span class="key">D</span>elete Note</a></li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">R</span>ow &#9658;</a>
                        <ul class="submenu">
                            <li><a data-command="row:delete"><span class="key">D</span>elete Row</a></li>
                        </ul>
                    </li>
                    <hr/>
                    <li>
                        <a>Edit <span class="key">G</span>roup &#9658;</a>
                        <ul class="submenu">
                            <li><a data-command="group:add"><span class="key">I</span>nsert new Group</a></li>
                            <li><a data-command="group:delete"><span class="key">D</span>elete current Group</a></li>
                            <li><a data-command="group:rename"><span class="key">R</span>ename current Group</a></li>
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
                    <li><a data-command="instrument:add">Add <span class="key">N</span>ew Instrument</a></li>
                </ul>
            </li>`;


    // <ul class="editor-context-menu submenu">
    //         <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
    //     <li>
    //     <a><span class="key">N</span>ote<span class="submenu-pointer"></span></a>
    //     <ul class="submenu" data-submenu-content="submenu:command"></ul>
    //         </li>
    //         <li>
    //         <a><span class="key">R</span>ow<span class="submenu-pointer"></span></a>
    //     <ul class="submenu" data-submenu-content="submenu:pause"></ul>
    //         </li>
    //         <li>
    //         <a><span class="key">G</span>roup <span class="submenu-pointer"></span></a>
    //     <ul class="submenu" data-submenu-content="submenu:group"></ul>
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
//         <ul class="submenu">
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
            // this.grid.focus();
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
// customElements.define('music-song-menu', MusicEditorMenuElement);
