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
            this.audioContext = options.context || new (window.AudioContext || window.webkitAudioContext)();
            this.depressedKeys = [];
            this.config = DEFAULT_CONFIG;
            this.playerElement = null;
        }

        get grid() { return this.querySelector('music-editor-grid'); }
        get menu() { return this.querySelector('music-editor-menu'); }
        get player() { return this.playerElement; }

        getSong() { return this.player.getSong(); }

        connectedCallback() {
            // this.render();

            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));
            this.addEventListener('change', this.onInput.bind(this));
            this.addEventListener('submit', this.onInput.bind(this));

            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');

            loadScript('music/player/music-player.js', function() {
                this.playerElement = document.createElement('music-player');
                this.playerElement.addEventListener('song:note', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:playback', this.onSongEvent.bind(this));
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
            var instructionList = this.getSong().instructions;
            // console.log('Updating Editor:', instructionList);
            this.grid.render(instructionList);
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
            var instructionList = this.getInstructions(groupName);
            if(instructionList.length < position)
                throw new Error("Invalid instruction position: " + position + (groupName ? " for group: " + groupName : ''));
            instructionList[position] = instruction;
        }

        getInstructions(groupName) {
            if(groupName) {
                var instructionList = this.song.instructionGroups[groupName];
                if(!instructionList)
                    throw new Error("Instruction group not found: " + groupName);
                return instructionList;
            }
            return this.song.instructions;
        }

        getInstructionPosition(instruction, groupName) {
            var instructionList = this.getInstructions(groupName);
            var p = instructionList.indexOf(instruction);
            if(p === -1)
                throw new Error("Instruction not found in instruction list");
            return p;
        }

        swapInstructions(instruction1, instruction2, groupName) {
            var p1 = this.getInstructionPosition(instruction1, groupName);
            var p2 = this.getInstructionPosition(instruction2, groupName);
            this.setInstruction(p2, instruction1);
            this.setInstruction(p1, instruction2);
        }

        // Forms

        setEditableInstruction(instruction) {
            var formInstruction = this.querySelector('form.form-instruction');
            formInstruction.classList.add('hidden');
            if(instruction.frequency) {
                formInstruction.instrument.value = ""+instruction.instrument || '';
                formInstruction.frequency.value = instruction.frequency || '';
                formInstruction.duration.value = instruction.duration || '';
                formInstruction.velocity.value = instruction.velocity || '';
                formInstruction.editableInstruction = instruction;
                formInstruction.classList.remove('hidden');
            }

            var formGroup = this.querySelector('form.form-group');
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
            console.log("Playback", e.type, e.detail);
        }

        // Input

        onInput(e) {
            if(e.defaultPrevented)
                return;
            switch(e.type) {
                case 'keydown':
                    if(this.depressedKeys.indexOf(e.key) > -1) {
                        // console.info("Ignoring repeat keydown: ", e);
                        return;
                    }
                    this.depressedKeys.push(e.key);

                    if(e.altKey) {
                        if(keyboardCommands.alt[e.key]) {
                            keyboardCommands.alt[e.key].call(this, e);
                            e.preventDefault();
                            return;
                        }
                    }
                    if(e.ctrlKey) {
                        if(keyboardCommands.ctrl[e.key]) {
                            keyboardCommands.ctrl[e.key].call(this, e);
                            e.preventDefault();
                            return;
                        }
                    }
                    if(keyboardCommands.default[e.key]) {
                        keyboardCommands.default[e.key].call(this, e);
                        e.preventDefault();
                        return;
                    }

                    var selectedCell = this.querySelector('music-editor-grid-cell.selected')
                        || this.querySelector('music-editor-grid-cell');

                    selectedCell.onInput(e);
                    if(!e.defaultPrevented)
                        console.info('Unused input', e);
                    break;

                case 'keyup':
                    var i = this.depressedKeys.indexOf(e.key);
                    if(i > -1) {
                        this.depressedKeys.splice(i, 1);
                    }
                    break;

                case 'click':
                    this.menu.close();
                    break;

                case 'submit':
                case 'change':
                    e.preventDefault();
                    var form = e.target.form || e.target;
                    console.log("Form " + e.type + ": ", form.target.form, e);
                    var formCommandName = form.getAttribute('data-command');
                    var formCommand = formCommands[formCommandName];
                    if(!formCommand)
                        throw new Error("Form command not found: " + formCommandName);
                    formCommand.call(this, e, form);
                    break;
            }
        }
    }

    // Grid elements

    class MusicEditorGridElement extends HTMLElement {
        get editor() { return findParentNode(this, MusicEditorElement); }

        findAssociatedElement(instruction) {
            let commandElms = this.querySelectorAll('music-editor-grid-cell');
            for(var i=0; i<commandElms.length; i++)
                if(commandElms[i].instruction === instruction)
                    return commandElms[i];
            return null;
        }

        render(instructionList) {
            this.innerHTML = '';

            var rowCommands = [];
            for(var i=0; i<instructionList.length; i++) {
                var instruction = instructionList[i];

                switch(instruction.type) {
                    case 'note':
                    case 'group':
                        rowCommands.push(instruction);
                        break;

                    case 'pause':
                        var rowElm = new MusicEditorGridRowElement(instruction.pause);
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
        /**
         *
         * @param pauseCommand
         */
        constructor(pauseLength) {
            super();
            if(pauseLength)
               this.setAttribute('pause', pauseLength)
        }
        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
        }


        addCommands(commandList) {
            for(var i=0; i<commandList.length; i++)
                this.addCommand(commandList[i]);
        }

        addCommand(command) {
            if(!command)
                throw new Error("Invalid command");
            var cellElm = new MusicEditorGridCellElement(command);
            this.appendChild(cellElm);
        }

        select() {
            clearElementClass('selected', 'music-editor-grid-row.selected');
            this.classList.add('selected');
        }
    }

    class MusicEditorGridCellElement extends HTMLElement {

        constructor(instruction) {
            super();
            this.instruction = instruction;
        }

        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
            this.render();
        }

        render() {
            this.innerHTML = '';

            if(typeof this.instruction.instrument !== 'undefined')
                this.innerHTML += `<div class="instrument">${formatInstrumentID(this.instruction.instrument)}</div>`;

            if(this.instruction.groupExecute)
                this.innerHTML += `<div class="groupExecute">${this.instruction.groupExecute}</div>`;

            if(this.instruction.frequency)
                this.innerHTML += `<div class="frequency">${this.instruction.frequency}</div>`;

            if(this.instruction.duration)
                this.innerHTML += `<div class="duration">${this.instruction.duration}</div>`;
            }

        select(e, previewInstruction) {
            this.parentNode.select(e);
            clearElementClass('selected', 'music-editor-grid-cell.selected');
            this.classList.add('selected');
            this.editor.setEditableInstruction(this.instruction);
            if(previewInstruction && this.editor.config.previewInstructionsOnSelect !== false)
                this.playInstruction();
        }

        playInstruction() {
            this.editor.player.playInstruction(
                this.instruction,
                this.editor.audioContext.currentTime,
                this.editor.playerElement.getCurrentBPM(),
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
                        var keyboard = DEFAULT_KEYBOARD_LAYOUT;
                        if(keyboard[e.key]) {
                            this.instruction.frequency = keyboard[e.key];
                            this.render();
                            this.editor.setEditableInstruction(this.instruction);
                            e.preventDefault();

                            var instructionEvent = this.editor.player.playInstrument(
                                this.instruction.instrument,
                                this.instruction.frequency,
                                this.editor.audioContext.currentTime,
                                null,
                                null,
                                this
                            );
                            var instructionUpCallback = function(e2) {
                                if(e.key === e2.key) {
                                    this.editor.removeEventListener('keyup', instructionUpCallback);
                                    instructionEvent.stop(0);
                                    this.classList.remove('playing');
                                    // console.info("Stopping Instruction: ", instructionEvent);
                                    e2.preventDefault();
                                }
                            }.bind(this);
                            this.editor.addEventListener('keyup', instructionUpCallback);
                            this.classList.add('playing');
                            return;
                        }
                    }
                    break;
            }
        }


    }


    // Menu elements

    class MusicEditorMenuElement extends HTMLElement {
        constructor() {
            super();
        }


        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            // this.innerHTML = renderEditorMenuContent();
            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));
            // let shadowRoot = this.attachShadow({mode: 'open'});
        }

        close() {
            var openElements = this.querySelectorAll('music-editor-menu-item.open');
            for(var i=openElements.length-1; i>=0; i--)
                openElements[i].classList.remove('open');
        }

        onInput(e) {
            var target = e.target instanceof MusicEditorMenuItemElement
                ? e.target
                : findParentNode(e.target, MusicEditorMenuItemElement);
            if(!target) {
                console.warn("No menu item found", e.target);
                return;
            }

            switch(e.type) {
                case 'keydown':
                    switch(e.key) {
                        case 'Tab':
                            return;
                    }
                    break;
            }

            console.log("Menu", e, target);
            if(target.command) {
                var menuCommand = menuCommands[target.command];
                if(!menuCommand)
                    throw new Error("Unknown menu command: " + target.command);
                menuCommand.call(this.editor, e);
                this.close();
            } else {
                target.classList.toggle('open');
            }
            e.preventDefault();
        }

    }

    class MusicEditorMenuItemElement extends HTMLElement {
        constructor() {
            super();
            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');
        }

        get editor() { return findParentNode(this, MusicEditorElement); }
        get command() { return this.getAttribute('data-command'); }
    }


    // Define custom elements


    // Define custom elements
    supportCustomElements(function(customElements) {
        customElements.define('music-editor', MusicEditorElement);
        customElements.define('music-editor-menu', MusicEditorMenuElement);
        customElements.define('music-editor-menu-item', MusicEditorMenuItemElement);
        customElements.define('music-editor-grid', MusicEditorGridElement);
        customElements.define('music-editor-grid-row', MusicEditorGridRowElement);
        customElements.define('music-editor-grid-cell', MusicEditorGridCellElement);
    });


    // Load Javascript dependencies
    loadStylesheet('music/editor/music-editor.css');

    function loadScript(scriptPath, onLoaded) {
        let scriptPathEsc = scriptPath.replace(/[/.]/g, '\\$&');
        let scriptElm = document.head.querySelector('script[src$=' + scriptPathEsc + ']');
        if (!scriptElm) {
            scriptElm = document.createElement('script');
            scriptElm.src = scriptPath;
            scriptElm.onload = function(e) {
                for(var i=0; i<scriptElm.onloads.length; i++)
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

    function supportCustomElements(onLoaded) {
        if(typeof window.customElements !== 'undefined') {
            onLoaded(window.customElements);
        } else {
            let styleSheetElm = document.createElement('link');
            styleSheetElm.href = 'https://cdnjs.cloudflare.com/ajax/libs/custom-elements/1.1.2/custom-elements.min.js';
            styleSheetElm.rel = 'stylesheet';
            styleSheetElm.onload = function(e) {
                console.info("Loaded polyfill: customElements", window.customElements);
                onLoaded(window.customElements);
            };
            document.head.appendChild(styleSheetElm);
        }
    }

    function clearElementClass(className, selector) {
        var clearElms = document.querySelectorAll(selector || '.' + className);
        for(var i=0; i<clearElms.length; i++)
            clearElms[i].classList.remove(className);
    }

    // Instrument Commands

    function findInstruments(obj, callback, rootPath) {
        if(typeof obj !== 'object')
            throw new Error("Invalid instrument object: " + typeof obj);
        Object.keys(obj).map(function(key, i) {
            var absPath = (rootPath ? rootPath + '.' : '') + key;
            switch(typeof obj[key]) {
                case 'object':
                    findInstruments(obj[key], callback, absPath);
                    break;

                case 'function':
                    callback(obj[key], absPath);
                    break;
            }
        });
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
        var songList = JSON.parse(localStorage.getItem('music-editor-saved-list') || "[]");
        if(songList.indexOf(song.guid) === -1)
            songList.push(song.guid);
        console.log("Saving song: ", song, songList);
        localStorage.setItem('song:' + song.guid, JSON.stringify(song));
        localStorage.setItem('music-editor-saved-list', JSON.stringify(songList));
    }

    function loadSongFromMemory(songGUID) {
        var songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        var songData = JSON.parse(songDataString);
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
            <music-editor-menu>
                <li>
                    <music-editor-menu-item>
                        File
                        <ul>
                            <li>
                                <music-editor-menu-item>
                                    Open from memory >
                                    ${renderEditorMenuLoadFromMemory()}
                                </music-editor-menu-item>
                            </li>
                            <li><music-editor-menu-item data-command="load:file">Open from file</music-editor-menu-item></li>
                            <li><music-editor-menu-item data-command="load:url">Open from url</music-editor-menu-item></li>
                            
                            <hr/>
                            <li><music-editor-menu-item data-command="save:memory">Save to memory</music-editor-menu-item></li>
                            <li><music-editor-menu-item data-command="save:file">Save to file</music-editor-menu-item></li>
                            
                            <hr/>
                            <li><music-editor-menu-item data-command="export:file">Export to audio file</music-editor-menu-item></li>
                        </ul>
                    </music-editor-menu-item>
                </li>
                
                <li><music-editor-menu-item>View</music-editor-menu-item></li>
                <li><music-editor-menu-item>Editor</music-editor-menu-item></li>
                <li><music-editor-menu-item>Instruments</music-editor-menu-item></li>
                <li><music-editor-menu-item>Collaborate</music-editor-menu-item></li>
            </music-editor-menu>
            <form class="form-song" data-command="song:play">
                <label class="row-label">Song:</label>
                <button name="play">Play</button>
            </form>
            <form class="form-song" data-command="song:playback">
                <button name="play-group">Play Group</button>
            </form>
            <form class="form-song" data-command="song:pause">
                <button name="pause">Pause</button>
            </form>
            <form class="form-song" data-command="song:resume">
                <button name="resume">Resume</button>
            </form>
            <form class="form-song" data-command="song:info">
                | 
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
                    <option value="">- Pause -</option>
                    ${renderEditorFormOptions('durations')}
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
                    <option value="">- Frequency -</option>
                    ${renderEditorFormOptions('frequencies')}
                </select>
                <select name="duration">
                    <option value="">- Length -</option>
                    ${renderEditorFormOptions('durations')}
                </select>
                <select name="velocity">
                    <option value="">- Velocity -</option>
                    ${renderEditorFormOptions('velocities')}
                </select>
            </form>
            <music-editor-grid>
            </music-editor-grid>
        `;
    }

    function renderEditorFormOptions(optionType, editor) {
        var options = [];
        switch(optionType) {
            case 'song-instruments':
                var song = editor.getSong();
                for(var instrumentID=0; instrumentID<song.instruments.length; instrumentID++) {
                    var instrumentInfo = song.instruments[instrumentID];
                    var instrument = editor.player.getInstrument(instrumentInfo.path);
                    options.push([instrumentID, formatInstrumentID(instrumentID) + ': ' + instrument.name]);
                }
                break;

            case 'instruments-available':
                if(window.instruments) {
                    findInstruments(window.instruments, function (instrument, path) {
                        options.push([path, instrument.name]);
                    });
                }
                break;

            case 'frequencies':
                var instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                for(var i=1; i<=6; i++) {
                    for(var j=0; j<instructions.length; j++) {
                        var instruction = instructions[j] + i;
                        options.push([instruction, instruction]);
                    }
                }
                break;

            case 'velocities':
                for(var vi=100; vi>=0; vi--) {
                    options.push([vi, vi]);
                }
                break;

            case 'durations':
                options = [
                    [32.0,  'Octuple'],
                    [16.0,  'Quadruple'],
                    [8.0,   'Double'],
                    [4.0,   'Whole'],
                    [2.0,   'Half'],
                    [1.0,   'Quarter'],
                    [0.5,   'Eighth'],
                    [0.25,  'Sixteenth'],
                    [0.125, 'Thirty-second'],
                ];
                break;
        }

        var optionHTML = '';
        for (var oi=0; oi<options.length; oi++) {
            var value = options[oi][0];
            var label = options[oi][1] || value;
            optionHTML += `<option value="${value}">${label}</option>`;
        }
        return optionHTML;
    }

    function renderEditorMenuLoadFromMemory() {
        var songGUIDs = JSON.parse(localStorage.getItem('music-editor-saved-list') || '[]');
        console.log("Loading song list from memory: ", songGUIDs);

        var menuItemsHTML = '';
        for(var i=0; i<songGUIDs.length; i++) {
            var songGUID = songGUIDs[i];
            var song = loadSongFromMemory(songGUID);
            if(song) {
                menuItemsHTML +=
                    `<music-editor-menu-item data-command="load:memory" guid="${songGUID}">
                        <span>${song.name || "unnamed"}</span>
                    </music-editor-menu-item>`;
            } else {
                console.error("Song GUID not found: " + songGUID);
            }
        }

        return `
            <ul>
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
            var instruction = form.editableInstruction;
            if(!instruction) throw new Error("editableInstruction not found");
            instruction.instrument = parseInt(form.instrument.value);
            instruction.frequency = form.frequency.value;
            instruction.duration = parseFloat(form.duration.value);
            instruction.velocity = parseInt(form.velocity.value);
            var associatedElement = this.grid.findAssociatedElement(instruction);
            associatedElement.render();
        },
        'song:play': function (e, form) { this.player.play(); },
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

    function handleArrowKeyEvent(e) {
        var selectedCell = this.querySelector('music-editor-grid-cell.selected')
            || this.querySelector('music-editor-grid-cell');
        var newSelectedCell = selectedCell;

        var selectedRow = selectedCell.parentNode;
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
