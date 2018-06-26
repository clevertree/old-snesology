/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions. Pauses are implied by the scale
 */

(function() {
    // if (!window.MusicEditor)
    //     window.MusicEditor = MusicEditor;

    class MusicEditorElement extends HTMLElement {
        constructor(options) {
            options = options || {};
            super();
            this.depressedKeys = [];
            this.config = DEFAULT_CONFIG;
            this.playerElement = null;
        }

        get player() { return this.playerElement; }

        getAudioContext() { return this.player.getAudioContext(); }
        getSong() { return this.player.getSong(); }

        connectedCallback() {
            // this.render();

            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));
            this.addEventListener('change', this.onInput.bind(this));
            this.addEventListener('submit', this.onInput.bind(this));

            // if(!this.getAttribute('tabindex'))
            //     this.setAttribute('tabindex', '1');

            loadScript('music/player/music-player.js', function() {
                this.playerElement = document.createElement('music-player');
                this.playerElement.addEventListener('note:end', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('note:start', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:start', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:playback', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:end', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:pause', this.onSongEvent.bind(this));
                // this.appendChild(this.playerElement); // TODO: unnecessary lol

                if(this.getSongURL())
                    this.playerElement.loadSong(this.getSongURL(), function() {
                        this.render();
                        let firstCell = this.querySelector('music-editor-grid-cell');
                        if(firstCell)
                            firstCell.select();
                        // this.focus();
                    }.bind(this));
            }.bind(this));
        }

        getSongURL() { return this.getAttribute('src');}


        saveSongToMemory() {
            saveSongToMemory(this.getSong());
        }
        loadSongFromMemory(guid) {
            this.loadSongData(loadSongFromMemory(guid));
        }

        render() {
            this.innerHTML = renderEditorContent.call(this);
        }

        // Player commands

        loadSong(songURL, onLoaded) {
            return this.player.loadSong(songURL, onLoaded);
        }

        // playInstrument(instrumentName, instructionFrequency, instructionStartTime, instructionLength, options, associatedElement) {
        //     return this.player.playInstrument(instrumentName, instructionFrequency, instructionStartTime, instructionLength, options, associatedElement);
        // }
        //
        // playInstruction(instructionArgs, instructionStartTime, bpm, associatedElement) {
        //     return this.player.playInstruction(instructionArgs, instructionStartTime, bpm, associatedElement);
        // }
        // playInstructions(commandList, startPosition, seekLength, playbackOffset) {
        //     return this.player.playInstructions(commandList, startPosition, seekLength, playbackOffset);
        // }
        // play (seekPosition) { return this.player.play(seekPosition); }
        // pause () { return this.player.pause(); }


        // Edit Song

        setInstruction(position, instruction, groupName) {
            const instructionList = this.getInstructions(groupName);
            if(instructionList.length < position)
                throw new Error("Invalid instruction position: " + position + (groupName ? " for group: " + groupName : ''));
            instructionList[position] = instruction;
        }

        getInstructions(groupName) {
            if(groupName) {
                let instructionList = this.song.instructionGroups[groupName];
                if(!instructionList)
                    throw new Error("Instruction group not found: " + groupName);
                return instructionList;
            }
            return this.song.instructions;
        }

        getInstructionPosition(instruction, groupName) {
            const instructionList = this.getInstructions(groupName);
            const p = instructionList.indexOf(instruction);
            if(p === -1)
                throw new Error("Instruction not found in instruction list");
            return p;
        }

        swapInstructions(instruction1, instruction2, groupName) {
            const p1 = this.getInstructionPosition(instruction1, groupName);
            const p2 = this.getInstructionPosition(instruction2, groupName);
            this.setInstruction(p2, instruction1);
            this.setInstruction(p1, instruction2);
        }

        addSongInstrument(instrumentPath, config) {
            const instrumentList = this.getSong().instruments;
            const instrument = this.player.getInstrument(instrumentPath);
            const instrumentID = instrumentList.length;
            const defaultName = instrument.getDefaultName ? instrument.getDefaultName(instrumentPath)
                : instrumentPath.substr(instrumentPath.lastIndexOf('.') + 1);
            config = Object.assign({path: instrumentPath}, config || {}, {name: defaultName});
            config.name = prompt("New Instrument Name (" + formatInstrumentID(instrumentID) + "): ", config.name);
            if(!config.name)
                throw new Error("Invalid new instrument name");
            instrumentList[instrumentID] = config;
            return instrumentID;
        }

        // Forms

        setEditableInstruction(instruction) {
            const formInstruction = this.querySelector('form.form-instruction');
            formInstruction.classList.add('hidden');
            if(instruction.frequency) {
                formInstruction.instrument.value = ""+instruction.instrument || '';
                formInstruction.frequency.value = instruction.frequency || '';
                formInstruction.duration.value = instruction.duration || '';
                formInstruction.velocity.value = instruction.velocity || '';
                formInstruction.editableInstruction = instruction;
                formInstruction.classList.remove('hidden');
            }

            const formGroup = this.querySelector('form.form-group');
            formGroup.classList.add('hidden');
            if(instruction.groupExecute) {
                formGroup.classList.remove('hidden');
            }

            // var formRow = this.querySelector('form.form-row');
            // formRow.classList.add('hidden');
            // if(instruction.pause) {
            //     formRow.pause.value = instruction.pause || '';
            //     formRow.classList.remove('hidden');
            // }
        }

        // Playback

        onSongEvent(e) {
//             console.log("Playback", e.type, e.detail);
            switch(e.type) {
                case 'note:start':
                    const startElm = this.grid.findAssociatedElement(e.detail.instruction);
                    if(startElm)
                        startElm.classList.add('playing');
                    break;
                case 'note:end':
                    const endElm = this.grid.findAssociatedElement(e.detail.instruction);
                    if(endElm)
                        endElm.classList.remove('playing');
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

        menuClose() {
            const openElements = this.querySelectorAll('.sub-menu.open');
            for(let i=openElements.length-1; i>=0; i--)
                openElements[i].classList.remove('open');
        }
        // Input

        onInput(e) {
            handleEditorInput(e, this);
        }

    }

    // Grid elements

    class MusicEditorGridElement extends HTMLElement {
        get editor() { return findParentNode(this, MusicEditorElement); }

        findAssociatedElement(instruction) {
            let commandElms = this.querySelectorAll('music-editor-grid-cell');
            for(let i=0; i<commandElms.length; i++)
                if(commandElms[i].instruction === instruction)
                    return commandElms[i];
            return null;
        }

        render(instructionList) {
            this.innerHTML = '';

            let rowCommands = [];
            for(let i=0; i<instructionList.length; i++) {
                const instruction = instructionList[i];

                switch(instruction.type) {
                    case 'note':
                    case 'group':
                        rowCommands.push(instruction);
                        break;

                    case 'pause':
                        const rowElm = new MusicEditorGridRowElement(instruction);
                        rowElm.addCommands(rowCommands);
                        if(this.children.length % 2 === 0)
                            rowElm.classList.add('odd');
                        rowCommands = [];
                        this.appendChild(rowElm);
                        break;
                }
            }
        }
    }

    class MusicEditorGridRowElement extends HTMLElement {
        constructor(instruction) {
            super();
            this.instruction = instruction;
        }
        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
        }


        addCommands(commandList) {
            for(let i=0; i<commandList.length; i++)
                this.addCommand(commandList[i]);
        }

        addCommand(command) {
            if(!command)
                throw new Error("Invalid command");
            const cellElm = new MusicEditorGridCellElement(command);
            this.appendChild(cellElm);
        }

        select() {
            clearElementClass('selected', 'music-editor-grid-row.selected');
            this.classList.add('selected');
        }
    }

    class MusicEditorGridCellElement extends HTMLElement {


        select(e, previewInstruction) {
            this.parentNode.select(e);
            clearElementClass('selected', 'music-editor-grid-cell.selected');
            this.classList.add('selected');
            this.editor.setEditableInstruction(this.instruction);
            if(previewInstruction && this.editor.config.previewInstructionsOnSelect !== false)
                this.playInstruction();
        }

        playInstruction() {
            return this.editor.player.playInstruction(
                this.instruction,
                this.editor.playerElement.getAudioContext().currentTime,
                this.editor.playerElement.getStartingBPM(),
                function(playing) {
                    this.classList.toggle('playing', playing);
                }.bind(this),
            );
        }

        swapInstructionElement(targetCellElement) {
            this.editor.swapInstructions(
                this.instruction,
                targetCellElement.instruction
            );
            this.editor.grid.render();
            this.editor.grid.findAssociatedElement(this.instruction).select();
        }

        onInput(e) {
            switch(e.type) {
                case 'click':
                    break;
                case 'keydown':
                    if(this.instruction.frequency) {
                        const keyboard = DEFAULT_KEYBOARD_LAYOUT;
                        if(keyboard[e.key]) {
                            e.preventDefault();
                            this.instruction.frequency = keyboard[e.key];
                            this.render();
                            this.editor.setEditableInstruction(this.instruction);
                            this.playInstruction();
                            return;
                        }
                    }
                    break;
            }
        }


    }

    // Define custom elements
    customElements.define('music-editor', MusicEditorElement);
    customElements.define('music-editor-grid', MusicEditorGridElement);
    customElements.define('music-editor-grid-row', MusicEditorGridRowElement);
    customElements.define('music-editor-grid-cell', MusicEditorGridCellElement);


    // Load Javascript dependencies
    loadStylesheet('music/editor/music-editor.css');

    function loadScript(scriptPath, onLoaded) {
        let scriptPathEsc = scriptPath.replace(/[/.]/g, '\\$&');
        let scriptElm = document.head.querySelector('script[src$=' + scriptPathEsc + ']');
        if (!scriptElm) {
            scriptElm = document.createElement('script');
            scriptElm.src = scriptPath;
            scriptElm.onload = function(e) {
                for(let i=0; i<scriptElm.onloads.length; i++)
                    scriptElm.onloads[i](e);
                scriptElm.onloads = null;
            };
            document.head.appendChild(scriptElm);
        }
        if(!scriptElm.onloads) scriptElm.onloads = [];
        scriptElm.onloads.push(onLoaded);
    }
    function loadStylesheet(styleSheetPath, onLoaded) {
        let styleSheetPathEsc = styleSheetPath.replace(/[/.]/g, '\\$&');
        let foundScript = document.head.querySelectorAll('link[href$=' + styleSheetPathEsc + ']');
        if (foundScript.length === 0) {
            let styleSheetElm = document.createElement('link');
            styleSheetElm.href = styleSheetPath;
            styleSheetElm.rel = 'stylesheet';
            styleSheetElm.onload = onLoaded;
            document.head.appendChild(styleSheetElm);
        }
    }

    function clearElementClass(className, selector) {
        const clearElms = document.querySelectorAll(selector || '.' + className);
        for(let i=0; i<clearElms.length; i++)
            clearElms[i].classList.remove(className);
    }

    // Instrument Commands

    function findInstruments(callback, instrumentsObject) {
        instrumentsObject = instrumentsObject || window.instruments;
        Object.keys(instrumentsObject).map(function(domainString) {
            const domainCollection = instrumentsObject[domainString];
            Object.keys(domainCollection).map(function(instrumentPathString) {
                const instrument = domainCollection[instrumentPathString];
                callback(instrument, instrumentPathString, domainString);
            }.bind(this));
        }.bind(this));
    }

    // Element commands

    function findParentNode(editorChildElement, parentNodeClass) {
        while(editorChildElement = editorChildElement.parentNode)
            if(editorChildElement instanceof parentNodeClass)
                break;
        return editorChildElement;
    }

    // File Commands

    function saveSongToMemory(song) {
        if(!song.guid)
            song.guid = generateGUID();
        const songList = JSON.parse(localStorage.getItem('music-editor-saved-list') || "[]");
        if(songList.indexOf(song.guid) === -1)
            songList.push(song.guid);
        console.log("Saving song: ", song, songList);
        localStorage.setItem('song:' + song.guid, JSON.stringify(song));
        localStorage.setItem('music-editor-saved-list', JSON.stringify(songList));
    }

    function loadSongFromMemory(songGUID) {
        let songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        let songData = JSON.parse(songDataString);
        if(!songData)
            throw new Error("Invalid Song Data: " + songDataString);
        return songData;
    }


    function generateGUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }



    const DEFAULT_KEYBOARD_LAYOUT = {
        '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
        'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
        's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
        'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
    };

    // Rendering templates

    function renderEditorContent() {
        return `
            <div class="music-editor">
                <div class="editor-menu">
                    <li>
                        <a class="menu-item">File</a>
                        <ul class="sub-menu">
                            <li>
                                <a class="menu-item">Open from memory ></a>
                                ${renderEditorMenuLoadFromMemory()}
                            </li>
                            <li><a class="menu-item" data-command="load:file">Open from file</a></li>
                            <li><a class="menu-item" data-command="load:url">Open from url</a></li>
                            
                            <hr/>
                            <li><a class="menu-item" data-command="save:memory">Save to memory</a></li>
                            <li><a class="menu-item" data-command="save:file">Save to file</a></li>
                            
                            <hr/>
                            <li><a class="menu-item" data-command="export:file">Export to audio file</a></li>
                        </ul>
                    </li>
                    
                    <li><a class="menu-item">View</a></li>
                    <li><a class="menu-item">Editor</a></li>
                    <li><a class="menu-item">Instruments</a></li>
                    <li><a class="menu-item">Collaborate</a></li>
                </div>
                <div class="editor-panel">
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
                    <form class="form-song-info" data-command="song:info">
                        <button name="info">info</button>
                    </form>
        
                    <br/>
         
                    <form class="form-group" data-command="group:edit">
                        <label>Group:</label>
                        <button name="edit">Edit</button>
                        <button name="remove">-</button>
                    </form>
                    <form class="form-row" data-command="row:edit">
                        <label class="row-label">Row:</label>
                        <button name="duplicate">+</button>
                        <button name="remove">-</button>
                        <select name="pause">
                            <optgroup label="Pause">
                                ${renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                        <button name="split">Split</button>
                    </form>
                    
                    <br/>
        
                    <form class="form-instruction" data-command="instruction:edit">
                        <label class="row-label">Note:</label>
                        <button name="duplicate">+</button>
                        <button name="remove">-</button>
                        <select name="instrument">
                            <optgroup label="Song Instruments">
                                ${renderEditorFormOptions('song-instruments', this)}
                            </optgroup>
                            <optgroup label="Available Instruments">
                                ${renderEditorFormOptions('instruments-available')}
                            </optgroup>
                        </select>
                        <select name="frequency">
                            <optgroup label="Frequency">
                                ${renderEditorFormOptions('frequencies')}
                            </optgroup>
                        </select>
                        <select name="duration">
                            <optgroup label="Duration">
                                ${renderEditorFormOptions('durations')}
                            </optgroup>
                        </select>
                        <select name="velocity">
                            <optgroup label="Velocity">
                                ${renderEditorFormOptions('velocities')}
                            </optgroup>
                        </select>
                    </form>
                </div>
                <div class="editor-grid">
                    ${renderGrid(this)}
                </div>
            </div>
        `;
    }

    function renderGrid(editor) {
        const song = editor.getSong();
        const instructionList = song.instructions;

        var odd = false;

        var editorHTML = '', rowHTML = '';
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];

            switch(instruction.type) {
                case 'note':
                    rowHTML += `<div class="grid-data">`;
                    rowHTML += `<div class="grid-parameter instrument">${formatInstrumentID(instruction.instrument)}</div>`;
                    rowHTML += `<div class="grid-parameter frequency">${instruction.frequency}</div>`;
                    if(instruction.duration) //  && this.instruction.duration !== this.parentNode.instruction.pause)
                        rowHTML += `<div class="grid-parameter duration">${instruction.duration}</div>`;
                    if(instruction.velocity)
                        rowHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    rowHTML += `</div>`;
                    break;

                case 'group':
                    rowHTML += `<div class="grid-data>`;
                    rowHTML += `<div class="grid-parameter group">${instruction.group}</div>`
                    rowHTML += `</div>`;
                    break;

                case 'pause':
                    editorHTML += `<div class="grid-row ${odd = !odd ? 'odd' : ''}">`;
                    editorHTML += rowHTML;
                    editorHTML += `</div>`;
                    rowHTML = '';
                    break;
            }
        }
        return editorHTML;
    }

    function renderEditorFormOptions(optionType, editor) {
        let options = [];
        switch(optionType) {
            case 'song-instruments':
                const song = editor.getSong();
                for(let instrumentID=0; instrumentID<song.instruments.length; instrumentID++) {
                    const instrumentInfo = song.instruments[instrumentID];
                    var instrument = editor.player.getInstrument(instrumentInfo.path);
                    options.push([instrumentID, formatInstrumentID(instrumentID)
                    + ': ' + (instrumentInfo.name ? instrumentInfo.name + " (" + instrument.name + ")" : instrument.name)]);
                }
                break;

            case 'instruments-available':
                if(window.instruments) {
                    findInstruments(function (instrument, path, domain) {
                        options.push(["add:" + domain + ":" + path, instrument.name + " (" + path + ")"]);
                    });
                }
                break;

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
                for(let vi=100; vi>=0; vi--) {
                    options.push([vi, vi]);
                }
                break;

            case 'durations':
                options = [
                    [32.0,  '32 - Octuple'],
                    [16.0,  '16 - Quadruple'],
                    [8.0,   '8 - Double'],
                    [4.0,   '4 - Whole'],
                    [2.0,   '2 - Half'],
                    [1.0,   '1 - Quarter'],
                    [0.5,   '0.5 - Eighth'],
                    [0.25,  '0.25 - Sixteenth'],
                    [0.125, '0.125 - Thirty-second'],
                ];
                break;
        }

        let optionHTML = '';
        for (let oi=0; oi<options.length; oi++) {
            const value = options[oi][0];
            const label = options[oi][1] || value;
            optionHTML += `<option value="${value}">${label}</option>`;
        }
        return optionHTML;
    }

    function renderEditorMenuLoadFromMemory() {
        const songGUIDs = JSON.parse(localStorage.getItem('music-editor-saved-list') || '[]');
//         console.log("Loading song list from memory: ", songGUIDs);

        let menuItemsHTML = '';
        for(let i=0; i<songGUIDs.length; i++) {
            const songGUID = songGUIDs[i];
            const song = loadSongFromMemory(songGUID);
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
            <ul class="sub-menu">
                ${menuItemsHTML}
            </ul>
        `;
    }

    function formatInstrumentID(number) {
        return number < 10 ? "0" + number : "" + number;
    }

    // Form Actions

    const formCommands = {
        'instruction:edit': function (e, form) {
            let instruction = form.editableInstruction;
            if(!instruction) throw new Error("editableInstruction not found");
            var associatedElement = this.grid.findAssociatedElement(instruction);
            var instrumentID = form.instrument.value;
            var renderElement = associatedElement;
            if(instrumentID.indexOf('add:') === 0) {
                instrumentID = this.addSongInstrument(instrumentID.substr(4));
                renderElement = this;
            }

            instruction.instrument = parseInt(instrumentID);
            instruction.frequency = form.frequency.value;
            instruction.duration = parseFloat(form.duration.value);
            instruction.velocity = parseInt(form.velocity.value);
            renderElement.render();
            associatedElement = this.grid.findAssociatedElement(instruction);
            associatedElement.select();
        },
        'song:play': function (e, form) { this.player.play(); },
        'song:pause': function (e, form) { this.player.pause(); },
        'song:playback': function (e, form) {
            console.log(e.target);
        }
    };

    // Menu Actions

    const menuCommands = {
        'save:memory': function() { this.saveSongToMemory(); },
        'load:memory': function(e) { this.loadSongFromMemory(e.target.getAttribute('guid')); },
    };
    const keyboardCommands = {
        'default': {
            'ArrowRight': handleArrowKeyEvent,
            'ArrowLeft': handleArrowKeyEvent,
            'ArrowDown': handleArrowKeyEvent,
            'ArrowUp': handleArrowKeyEvent,
            ' ': function() { this.player.play(); }
        },
        'alt': {
            'ArrowRight': handleArrowKeyEvent,
            'ArrowLeft': handleArrowKeyEvent,
            'ArrowDown': handleArrowKeyEvent,
            'ArrowUp': handleArrowKeyEvent,
        },
        'ctrl': {
            's': function () { this.saveSongToMemory(); },
        },
    };

    var depressedKeys = [];
    function handleEditorInput(e, editor) {

        if(e.defaultPrevented)
            return;
        console.log(e.type, e.target);
        switch(e.type) {
            case 'keydown':
                if(depressedKeys.indexOf(e.key) > -1) {
                    // console.info("Ignoring repeat keydown: ", e);
                    return;
                }
                depressedKeys.push(e.key);

                if(e.altKey) {
                    if(keyboardCommands.alt[e.key]) {
                        keyboardCommands.alt[e.key].call(editor, e);
                        e.preventDefault();
                        return;
                    }
                }
                if(e.ctrlKey) {
                    if(keyboardCommands.ctrl[e.key]) {
                        keyboardCommands.ctrl[e.key].call(editor, e);
                        e.preventDefault();
                        return;
                    }
                }
                if(keyboardCommands.default[e.key]) {
                    keyboardCommands.default[e.key].call(editor, e);
                    e.preventDefault();
                    return;
                }


                const selectedCell = editor.querySelector('music-editor-grid-cell.selected')
                    || editor.querySelector('music-editor-grid-cell');

                selectedCell.onInput(e);
                if(!e.defaultPrevented)
                    console.info('Unused input', e);
                break;

            case 'keyup':
                const i = depressedKeys.indexOf(e.key);
                if(i > -1) {
                    depressedKeys.splice(i, 1);
                }
                break;

            case 'click':
                let classList = e.target.classList;
                if(classList.contains('menu-item'))
                    handleMenuClickEvent(e, editor);

                else if(classList.contains('grid-parameter')
                    || classList.contains('grid-data')
                    || classList.contains('grid-row'))
                    handleGridClickEvent(e, editor);

                else editor.menuClose();
                break;

            case 'submit':
            case 'change':
                e.preventDefault();
                const form = e.target.form || e.target;
                console.log("Form " + e.type + ": ", form.target.form, e);
                const formCommandName = form.getAttribute('data-command');
                let formCommand = formCommands[formCommandName];
                if(!formCommand)
                    throw new Error("Form command not found: " + formCommandName);
                formCommand.call(editor, e, form);
                break;
        }
    }

    function handleGridClickEvent(e, editor) {
        const gridItem = e.target;
        console.log("Grid " + e.type, gridItem);

        clearElementClass('selected', '.grid-data');
        clearElementClass('selected', '.grid-row');
        if(gridItem.classList.contains('grid-parameter')) {
            gridItem.parentNode.classList.add('selected');
            gridItem.parentNode.parentNode.classList.add('selected');
            return;
        }
        if(gridItem.classList.contains('grid-data')) {
            gridItem.classList.add('selected');
            gridItem.parentNode.classList.add('selected');
            return;
        }
        if(gridItem.classList.contains('grid-row')) {
            gridItem.classList.add('selected');
            return;
        }

        console.warn("Unhandled menu click", e);
    }


    function handleMenuClickEvent(e, editor) {
        const menuItem = e.target;
        console.log("Menu " + e.type, menuItem);
        var dataCommand = menuItem.getAttribute('data-command');
        if(dataCommand) {
            let menuCommand = menuCommands[dataCommand];
            if (!menuCommand)
                throw new Error("Unknown menu command: " + dataCommand);
            menuCommand.call(editor, e);
            editor.menuClose();
            return;
        }

        if(menuItem.nextElementSibling
            && menuItem.nextElementSibling.classList.contains('sub-menu')) {
            const subMenu = menuItem.nextElementSibling;
            subMenu.classList.toggle('open');
            return;
        }

        console.warn("Unhandled menu click", e);
    }

    function handleArrowKeyEvent(e) {
        const selectedCell = this.querySelector('.grid-data.selected')
            || this.querySelector('.grid-da');
        let newSelectedCell = selectedCell;

        const selectedRow = selectedCell.parentNode;
        switch(e.key) {
            case 'ArrowRight':
                newSelectedCell = selectedCell.nextSibling
                    || (selectedRow.nextSibling ? selectedRow.nextSibling.firstChild : null);
                break;
            case 'ArrowLeft':
                newSelectedCell = selectedCell.previousSibling
                    || (selectedRow.previousSibling ? selectedRow.previousSibling.lastChild : null);
                break;
            case 'ArrowDown':
                if(selectedRow.nextSibling)
                    newSelectedCell = selectedRow.nextSibling.firstChild;
                break;
            case 'ArrowUp':
                if(selectedRow.previousSibling)
                    newSelectedCell = selectedRow.previousSibling.firstChild;
                break;
        }

        if(newSelectedCell) {
            if (e.altKey) {
                selectedCell.swapInstructionElement(newSelectedCell);

            } else {
                if (newSelectedCell !== selectedCell) {
                    newSelectedCell.select(e, true);
                }
            }
        }
    }

    // Config

    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    }

})();
