
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class MusicEditorMenuElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    get grid() { return this.editor.grid; } // Grid associated with menu

    connectedCallback() {
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
        this.addEventListener('mousedown', this.onInput);
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);

        this.render();
    }

    onSubmit(e) {
        e.preventDefault();
        try {
            const form = e.target.form || e.target;
            const command = form.getAttribute('data-command');
            const cursorPosition = this.editor.gridCursorPosition;
            const currentGroup = this.editor.gridCurrentGroup;
            const selectedPositions = this.editor.gridSelectedPositions;
            const selectedPausePositions = this.editor.gridSelectedPausePositions;
            const selectedRange = this.editor.gridSelectedRange;

            switch (command) {
                case 'instruction:command':
                    this.editor.replaceInstructionParams(currentGroup, cursorPosition, {
                        command: form.command.value
                    });
                    break;

                case 'instruction:instrument':
                    let instrumentID = form.instrument.value;
                    if (instrumentID.indexOf('add:') === 0) {
                        instrumentID = this.editor.addInstrument(instrumentID.substr(4));

                    } else {
                        instrumentID = instrumentID === '' ? null : parseInt(instrumentID);
                    }
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        instrument: instrumentID
                    });
                    break;

                case 'instruction:duration':
                    const duration = form.duration.value || null;
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        duration: parseFloat(duration)
                    });
                    break;

                case 'instruction:velocity':
                    const velocity = form.velocity.value || null;
                    this.editor.replaceInstructionParams(currentGroup, selectedPositions, {
                        velocity: parseInt(velocity)
                    });
                    break;

                case 'instruction:remove':
                    this.editor.deleteInstructions(currentGroup, selectedPositions);
                    break;

                case 'row:edit':
                    this.editor.replaceInstructionParams(currentGroup, selectedPausePositions, {
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

                case 'row:split':
                    const splitPercentage = prompt("Split row at what percentage? ", 50);
                    this.editor.splitInstructionRows(currentGroup, selectedPausePositions, splitPercentage);
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
                    const song = this.editor.getSong();
                    // song.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
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

                default:
                    console.warn("Unhandled " + e.type + ": ", command);
                    break;
            }
        } catch (e) {
            this.editor.onError(e);
        }
    }

    onInput(e) {
        if(e.defaultPrevented)
            return;

        const cursorPosition = this.editor.gridCursorPosition;
        const currentGroup = this.editor.gridCurrentGroup;
        const instructionList = this.editor.gridInstructionList;
        const cursorInstruction = instructionList[cursorPosition];

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
                                this.editor.insertInstructions(currentGroup, cursorPosition, newInstruction);
                                break;

                            case 'instruction:command':
                                const newCommand = prompt("Set Command:", cursorInstruction.command);
                                if(newCommand !== null)     this.editor.replaceInstructionParams(currentGroup, cursorPosition, {
                                    command: newCommand
                                });
                                else                    console.error("Set instruction command canceled");
                                break;

                            case 'instruction:duration':
                                const newDuration = prompt("Set Duration:", typeof cursorInstruction.duration === 'undefined' ? 1 : cursorInstruction.duration);
                                if(newDuration < 0) throw new Error("Invalid duration value");
                                if(newDuration !== null)     this.editor.replaceInstructionParams(currentGroup, cursorPosition, {
                                    duration: newDuration
                                });
                                else                    console.error("Set instruction duration canceled");
                                break;

                            case 'instruction:velocity':
                                const newVelocity = prompt("Set Velocity:", typeof cursorInstruction.velocity === 'undefined' ? 100 : cursorInstruction.velocity);
                                if(newVelocity < 0 || newVelocity > 100) throw new Error("Invalid velocity value");
                                if(newVelocity !== null)     this.editor.replaceInstructionParams(currentGroup, cursorPosition, {
                                    velocity: newVelocity
                                });
                                else                    console.error("Set instruction velocity canceled");
                                break;

                            case 'row:split':
                                const splitPercentage = prompt("Split row at what percentage? ", 50);
                                this.editor.splitInstructionRows(currentGroup, this.editor.gridSelectedPausePositions, splitPercentage);
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

    update(gridStatus) {
        const instructionList = this.editor.player ? this.editor.player.getInstructions(gridStatus.groupName) : [];
        let combinedInstruction = null;
        for(let i=0; i<gridStatus.selectedPositions.length; i++) {
            const selectedPosition = gridStatus.selectedPositions[i];
            const selectedInstruction = instructionList[selectedPosition];
            const nextPause = instructionList.find((i, p) => i.duration > 0 && p >= selectedPosition);
            if(combinedInstruction === null) {
                combinedInstruction = Object.assign({}, selectedInstruction);
                if(nextPause) combinedInstruction.duration = nextPause.duration;
            } else {
                Object.keys(combinedInstruction).forEach(function(key, i) {
                    if(selectedInstruction[key] !== combinedInstruction[key])
                        delete combinedInstruction[key];
                });
                if(nextPause && nextPause.duration !== combinedInstruction.duration)
                    delete combinedInstruction.duration;
            }
        }
        if(!combinedInstruction)
            combinedInstruction = {command: 'C4'};

// TODO: get position from status, not grid
        let selectedPausePositions = this.editor.gridSelectedPausePositions;
        // let selectedPauseDisabled = this.editor.grid.gridSelectedPausePositions().length === 0;

        // Row Instructions
        Array.prototype.slice.call(this.querySelectorAll('.fieldset-row'))
            .forEach(fieldset => selectedPausePositions.length === 0 ? fieldset.setAttribute('disabled', 'disabled') : fieldset.removeAttribute('disabled'));
        Array.prototype.slice.call(this.querySelectorAll('.fieldset-instruction'))
            .forEach(fieldset => this.editor.gridStatus.selectedPositions.length === 0 ? fieldset.setAttribute('disabled', 'disabled') : fieldset.removeAttribute('disabled'));


        // Note Instruction
        this.querySelector('form.form-instruction-command').command.value = combinedInstruction.command || '';
        this.querySelector('form.form-instruction-instrument').instrument.value = combinedInstruction.instrument || '';
        this.querySelector('form.form-instruction-velocity').velocity.value = combinedInstruction.velocity || '';
        this.querySelector('form.form-instruction-duration').duration.value = combinedInstruction.duration || '';

        // Row/Pause
        this.querySelector('form.form-row-duration').duration.value = combinedInstruction.duration;

        this.querySelector('.row-label-row').innerHTML = 'Row' + (selectedPausePositions.length > 1 ? 's' : '') + ":";
        this.querySelector('.row-label-command').innerHTML = 'Command' + (gridStatus.selectedPositions.length > 1 ? 's' : '') + ":";
    }

    renderEditorMenuLoadFromMemory() {
        const songGUIDs = JSON.parse(localStorage.getItem('share-editor-saved-list') || '[]');
//         console.log("Loading song list from memory: ", songGUIDs);

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

    render(gridStatus) {
        gridStatus = gridStatus || this.editor.gridStatus;

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
                    <a class="menu-item"><span class="key">N</span>ote</a>
                    <ul class="submenu submenu:note">
                        <li><a class="menu-item" data-command="instruction:insert">Insert <span class="key">N</span>ew Note</a></li>
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
                        <li><a class="menu-item" data-command="row:split"><span class="key">S</span>plit Pause</a></li>
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
                <li><a class="menu-item disabled"><span class="key">P</span>ublish</a></li>
            </ul>
            <ul class="editor-context-menu submenu">
                <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
                <li>
                    <a class="menu-item"><span class="key">N</span>ote<span class="submenu-pointer"></span></a>
                    <ul class="submenu" data-submenu-content="submenu:note"></ul>
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
                <label class="row-label">Song:</label>
                <form class="form-song-play" data-command="song:play">
                    <button name="play">Play</button>
                </form>
                <form class="form-song-pause" data-command="song:pause">
                    <button name="pause">Pause</button>
                </form>
                <form class="form-song-resume" data-command="song:resume">
                    <button name="resume">Resume</button>
                </form>
                <form class="form-song-volume" data-command="song:volume">
                    <div class="volume-container">
                        <input name="volume" type="range" min="1" max="100" value="${this.editor.player ? this.editor.player.getVolumeGain().gain.value*100 : 0}">
                    </div>
                </form>
                <form class="form-song-info" data-command="song:info">
                    <button name="info" disabled>Info</button>
                </form>
                
                <br/>
    
    
     
                <label class="row-label row-label-row">Row:</label>
                <form class="form-row-duration" data-command="row:edit">
                    <fieldset class="fieldset-row">
                        <select name="duration" title="Row Duration">
                            <optgroup label="Row Duration">
                                ${this.renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                    </fieldset>
                </form>
                <form class="form-row-split" data-command="row:split">
                    <fieldset class="fieldset-row">
                        <button name="split">Split</button>
                    </fieldset>
                </form>
                <form class="form-row-insert" data-command="row:insert">
                    <fieldset class="fieldset-row">
                        <button name="insert">+</button>
                    </fieldset>
                </form>
                <form class="form-row-remove" data-command="row:remove">
                    <fieldset class="fieldset-row">
                        <button name="remove">-</button>
                    </fieldset>
                </form>
                <form class="form-row-duplicate" data-command="row:duplicate">
                    <fieldset class="fieldset-row">
                        <button name="duplicate">Duplicate</button>
                    </fieldset>
                </form>
                

                <br/>
                <label class="row-label row-label-command">Command</label>
                <form class="form-instruction-command" data-command="instruction:command">
                    <fieldset class="fieldset-instruction">
                        <select name="command" title="Command">
                            <option value="">Command (Choose)</option>
                            <optgroup label="Group Execute">
                                ${this.renderEditorFormOptions('command-group-execute')}
                            </optgroup>
                            <optgroup label="Frequencies">
                                ${this.renderEditorFormOptions('command-frequencies')}
                            </optgroup>
                        </select>
                    </fieldset>
                </form>
                <form class="form-instruction-instrument" data-command="instruction:instrument">
                    <fieldset class="fieldset-instruction">
                        <select name="instrument" title="Note Instrument">
                            <option value="">Instrument (Default)</option>
                            <optgroup label="Song Instruments">
                                ${this.renderEditorFormOptions('song-instruments')}
                            </optgroup>
                            <optgroup label="Loaded Instruments">
                                ${this.renderEditorFormOptions('instruments-loaded')}
                            </optgroup>
                            <optgroup label="Available Instruments">
                                ${this.renderEditorFormOptions('instruments-available')}
                            </optgroup>
                        </select>
                    </fieldset>
                </form>
                <form class="form-instruction-duration" data-command="instruction:duration">
                    <fieldset class="fieldset-instruction">
                        <select name="duration" title="Note Duration">
                            <optgroup label="Note Duration">
                                <option value="">Duration (Default)</option>
                                ${this.renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                    </fieldset>
                </form>
                <form class="form-instruction-velocity" data-command="instruction:velocity">
                    <fieldset class="fieldset-instruction">
                        <select name="velocity" title="Note Velocity">
                            <optgroup label="Velocity">
                                <option value="">Velocity (Default)</option>
                                ${this.renderEditorFormOptions('velocities')}
                            </optgroup>
                        </select>
                    </fieldset>
                </form>
                <form class="form-instruction-insert" data-command="instruction:insert">
                    <fieldset class="fieldset-instruction">
                        <button name="insert">+</button>
                    </fieldset>
                </form>
                <form class="form-instruction-remove" data-command="instruction:remove">
                    <fieldset class="fieldset-instruction">
                        <button name="remove">-</button>
                    </fieldset>
                </form>
                
                <fieldset class="form-group-selection">
                    <legend>Select Group</legend>
                    ${this.getEditorFormOptions('groups', (value, label, selected) =>
                    `&nbsp;<form class="form-group" data-command="group:edit">`
                    + `<button name="groupName" value="${value}" class="${selected ? `selected` : ''}" >${label}</button>`
                    + `</form>`, (value) => value === gridStatus.groupName)}

                    <form class="form-group" data-command="group:edit">
                        <button name="groupName" value=":new" class="new" title="Create new group">+</button>
                    </form>

                </fieldset>

            </div>
        `;
        this.update(gridStatus);
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
        let optionHTML = '';
        this.getEditorFormOptions(optionType, function (value, label, selected) {
            optionHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`;
        }, selectCallback);
        return optionHTML;
    }


    getEditorFormOptions(optionType, callback, selectCallback) {
        let html = '';
        let options = [];
        const songData = this.editor.getSong() || {};

        if(!selectCallback) selectCallback = function() { return null; };
        switch(optionType) {
            case 'song-instruments':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID];
                        // const instrument = this.editor.player.getInstrument(instrumentID);
                        options.push([instrumentID, this.editor.format(instrumentID, 'instrument')
                        + ': ' + (instrumentInfo.name ? instrumentInfo.name + " (" + instrumentInfo.url + ")" : instrumentInfo.url)]);
                    }
                }
                break;

            case 'instruments-available':
                if(this.editor.status.instrumentLibrary) {
                    const instrumentLibrary = this.editor.status.instrumentLibrary;
                    Object.keys(instrumentLibrary.index).forEach((path) => {
                        let pathConfig = instrumentLibrary.index[path];
                        if (typeof pathConfig !== 'object') pathConfig = {title: pathConfig};
                        options.push(["add:" + instrumentLibrary.baseURL + path, pathConfig.title + " (" + instrumentLibrary.baseURL + path + ")"]);
                    });
                }
                break;


            case 'instruments-loaded':
                if(window.instruments) {
                    this.editor.findInstruments(function (instrument, path, origin) {
                        options.push(["add:" + origin + path, instrument.name + " (" + origin + path + ")"]);
                    });
                }
                break;

            case 'command-frequencies':
            case 'frequencies':
                const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                for(let i=1; i<=6; i++) {
                    for(let j=0; j<instructions.length; j++) {
                        const instruction = instructions[j] + i;
                        options.push([instruction, instruction]);
                    }
                }
                break;

            case 'velocities':
                // options.push([null, 'Velocity (Default)']);
                for(let vi=100; vi>=0; vi-=10) {
                    options.push([vi, vi]);
                }
                break;

            case 'durations':
                options = [
                    [1/64, '1/64'],
                    [1/32, '1/32'],
                    [1/16, '1/16'],
                    [1/8,  '1/8'],
                    [1/4,  '1/4'],
                    [1/2,  '1/2'],
                    [1.0,  '1B'],
                    [2.0,  '2B'],
                    [4.0,  '4B'],
                    [8.0,  '8B'],
                ];
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    options.push([vi, vi + ` beat${vi>1?'s':''} per measure`]);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    options.push([vi, vi+ ` beat${vi>1?'s':''} per minute`]);
                }
                break;

            case 'groups':
                options = [];
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        options.push([key, key]);
                    });
                break;

            case 'command-group-execute':
                options = [];
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        options.push(['@' + key, '@' + key]);
                    });
                break;
        }

        for (let oi=0; oi<options.length; oi++) {
            const value = options[oi][0];
            const label = options[oi][1] || value;
            const selected = selectCallback(value, oi, label);
            html += callback.call(this, value, label, selected);
        }
        return html;
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
