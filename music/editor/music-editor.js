/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous notes. Pauses are implied by the scale
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



            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');

            loadScript('music/player/music-player.js', function() {
                this.playerElement = document.createElement('music-player');
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
            this.innerHTML = renderEditorContent();
            var noteList = this.getSong().notes;
            console.log('Updating Editor:', noteList);
            this.grid.render(noteList);
        }

        // Player commands

        loadSong(songURL, onLoaded) {
            return this.player.loadSong(songURL, onLoaded);
        }

        playInstrument(instrumentName, noteFrequency, noteStartTime, noteLength, options, associatedElement) {
            return this.player.playInstrument(instrumentName, noteFrequency, noteStartTime, noteLength, options, associatedElement);
        }

        playNote(noteArgs, noteStartTime, bpm, associatedElement) {
            return this.player.playNote(noteArgs, noteStartTime, bpm, associatedElement);
        }
        playNotes(commandList, startPosition, seekLength, playbackOffset) {
            return this.player.playNotes(commandList, startPosition, seekLength, playbackOffset);
        }
        play (seekPosition) { return this.player.play(seekPosition); }
        pause (seekPosition) { return this.player.pause(); }


        // Edit Song

        setNote(position, noteArgs, groupName) {
            var noteList = this.getNotes(groupName);
            if(noteList.length < position)
                throw new Error("Invalid note position: " + position + (groupName ? " for group: " + groupName : ''));
            noteList[position] = noteArgs;
        }

        getNotes(groupName) {
            if(groupName) {
                var noteList = this.song.noteGroups[groupName];
                if(!noteList)
                    throw new Error("Note group not found: " + groupName);
                return noteList;
            }
            return this.song.notes;
        }

        getNotePosition(note, groupName) {
            var noteList = this.getNotes(groupName);
            var p = noteList.indexOf(note);
            if(p === -1)
                throw new Error("Note not found in note list");
            return p;
        }

        swapNotes(note1, note2, groupName) {
            var p1 = this.getNotePosition(note1, groupName);
            var p2 = this.getNotePosition(note2, groupName);
            this.setNote(p2, note1);
            this.setNote(p1, note2);
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
                        if(keyboardActions.alt[e.key]) {
                            keyboardActions.alt[e.key].call(this, e);
                            e.preventDefault();
                            return;
                        }
                    }
                    if(e.ctrlKey) {
                        if(keyboardActions.ctrl[e.key]) {
                            keyboardActions.ctrl[e.key].call(this, e);
                            e.preventDefault();
                            return;
                        }
                    }
                    if(keyboardActions.default[e.key]) {
                        keyboardActions.default[e.key].call(this, e);
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
            }
        }
    }

    // Grid elements

    class MusicEditorGridElement extends HTMLElement {
        get editor() { return findParentNode(this, MusicEditorElement); }

        render(noteList) {
            this.innerHTML = '';

            var rowCommands = [];
            for(var i=0; i<noteList.length; i++) {
                var noteArgs = noteList[i];
                var commandName = normalizeCommandName(noteArgs[0]);
                switch(commandName) {
                    default:
                        rowCommands.push(noteArgs);
                        break;

                    case 'Pause':
                        // rowCommands.push(args);
                        var rowElm = new MusicEditorGridRowElement(noteArgs);
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

        constructor(command) {
            super();
            this.command = command;
            command.associatedElement = this;
        }

        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
            this.refresh();
        }

        refresh() {
            this.innerHTML = '';
            var commandName = normalizeCommandName(this.command[0]);
            this.classList.add('command-' + commandName.toLowerCase());

            var commandElm = new MusicEditorGridCommandElement(commandName);
            commandElm.innerHTML = commandName[0];
            this.appendChild(commandElm);

            for (var i = 1; i < this.command.length; i++) {
                var arg = this.command[i];
                var argElm = new MusicEditorGridParameterElement(arg); // Don't customize parameter styles here
                this.appendChild(argElm);
                argElm.innerHTML = arg;
            }
        }

        select(e, previewNote) {
            this.parentNode.select(e);
            clearElementClass('selected', 'music-editor-grid-cell.selected');
            this.classList.add('selected');
            if(previewNote && this.editor.config.previewNotesOnSelect !== false)
                this.playNote();
        }

        playNote() {
            this.editor.playNote(
                this.command,
                this.editor.audioContext.currentTime,
                this.editor.playerElement.getCurrentBPM(),
                this,
            );
        }

        swapNoteElement(targetCellElement) {
            this.editor.swapNotes(
                this.command,
                targetCellElement.command
            );
            this.editor.updateEditor();
            if(this.command.associatedElement)
                this.command.associatedElement.select();
        }

        onInput(e) {
            switch(e.type) {
                case 'click':
                    break;
                case 'keydown':
                    var commandName = normalizeCommandName(this.command[0]);
                    switch(commandName) {
                        case 'Note':
                            var keyboard = MusicEditorGridCellElement.keyboardLayout;
                            if(keyboard[e.key]) {
                                this.command[2] = keyboard[e.key];
                                this.refresh();
                                e.preventDefault();

                                var noteEvent = this.editor.playInstrument(this.command[1], this.command[2], this.editor.audioContext.currentTime, null, {
                                    associatedElement: this
                                });
                                var noteUpCallback = function(e2) {
                                    if(e.key === e2.key) {
                                        this.editor.removeEventListener('keyup', noteUpCallback);
                                        noteEvent.stop(0);
                                        // console.info("Stopping Note: ", noteEvent);
                                        e2.preventDefault();
                                    }
                                }.bind(this);
                                this.editor.addEventListener('keyup', noteUpCallback);
                                return;
                            }
                            break;
                        default:
                            console.log("Unused keydown: ", this, this.command, e);
                            e.preventDefault();
                            break;
                    }
                    break;
            }
        }


    }

    MusicEditorGridCellElement.keyboardLayout = {
        '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
        'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
        's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
        'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
    };

    class MusicEditorGridCommandElement extends HTMLElement {
        constructor(commandName) {
            super();
            if(commandName)
                this.setAttribute('name', commandName)
        }

        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
        }

        select() {
            this.parentNode.select();
            clearElementClass('selected', 'music-editor-grid-command.selected');
            this.classList.add('selected');
        }
    }

    class MusicEditorGridParameterElement extends HTMLElement {
        constructor(parameterValue) {
            super();
            if(parameterValue)
                this.setAttribute('value', parameterValue)
        }

        get editor() { return findParentNode(this, MusicEditorElement); }

        connectedCallback() {
            this.addEventListener('click', this.select.bind(this));
        }

        select(e) {
            this.parentNode.select(e);
            clearElementClass('selected', 'music-editor-grid-parameter.selected');
            this.classList.add('selected');
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
            if(target.action) {
                var menuAction = menuActions[target.action];
                if(!menuAction)
                    throw new Error("Unknown menu action: " + target.action);
                menuAction.call(this.editor, e);
                this.close();
            } else {
                target.classList.toggle('open');
            }
            e.preventDefault();
        }

    }
    class MusicEditorSubMenuElement extends HTMLElement {

    }

    class MusicEditorMenuItemElement extends HTMLElement {
        constructor() {
            super();
            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');
        }

        get editor() { return findParentNode(this, MusicEditorElement); }
        get action() { return this.getAttribute('action'); }
    }


    // Define custom elements
    customElements.define('music-editor', MusicEditorElement);
    customElements.define('music-editor-menu', MusicEditorMenuElement);
    customElements.define('music-editor-submenu', MusicEditorSubMenuElement);
    customElements.define('music-editor-menu-item', MusicEditorMenuItemElement);
    customElements.define('music-editor-grid', MusicEditorGridElement);
    customElements.define('music-editor-grid-row', MusicEditorGridRowElement);
    customElements.define('music-editor-grid-cell', MusicEditorGridCellElement);
    customElements.define('music-editor-grid-command', MusicEditorGridCommandElement);
    customElements.define('music-editor-grid-parameter', MusicEditorGridParameterElement);


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
    function loadJSON(jsonPath, onLoaded) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', jsonPath, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            onLoaded(xhr.status !== 200 ? xhr.status : null, xhr.response);
        };
        xhr.send();
    }

    function normalizeCommandName(commandString) {
        switch(commandString.toLowerCase()) {
            case 'n':   case 'note':            return 'Note';
            case 'ge':  case 'groupexecute':    return 'GroupExecute';
            case 'p':   case 'pause':           return 'Pause';
        }
        throw new Error("Unknown command: " + commandString);
    }

    function clearElementClass(className, selector) {
        var clearElms = document.querySelectorAll(selector || '.' + className);
        for(var i=0; i<clearElms.length; i++)
            clearElms[i].classList.remove(className);
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


    const menuActions = {
        'save:memory': function() { this.saveSongToMemory(); },
        'load:memory': function(e) { this.loadSongFromMemory(e.target.getAttribute('guid')); },
    };
    const keyboardActions = {
        'default': {
            'ArrowRight': handleArrowKeyEvent,
            'ArrowLeft': handleArrowKeyEvent,
            'ArrowDown': handleArrowKeyEvent,
            'ArrowUp': handleArrowKeyEvent,
            ' ': function() { this.play(); }
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
                selectedCell.swapNoteElement(newSelectedCell);

            } else {
                if (newSelectedCell !== selectedCell) {
                    newSelectedCell.select(e, true);
                }
            }
        }
    }

    // Rendering templates

    function renderEditorContent() {
        return `
            <music-editor-menu>
                <music-editor-menu-item>
                    <span>File</span>
                    <music-editor-submenu>
                        <music-editor-menu-item>
                            <span>Open from memory ></span>
                            ${renderEditorMenuLoadFromMemory()}
                        </music-editor-menu-item>
                        <music-editor-menu-item action="load:file">Open from file</music-editor-menu-item>
                        <music-editor-menu-item action="load:url">Open from url</music-editor-menu-item>
                        
                        <hr/>
                        <music-editor-menu-item action="save:memory">Save to memory</music-editor-menu-item>
                        <music-editor-menu-item action="save:file">Save to file</music-editor-menu-item>
                        
                        <hr/>
                        <music-editor-menu-item action="export:file"><span>Export to audio file</span></music-editor-menu-item>
                    </music-editor-submenu>
                </music-editor-menu-item>
                
                <music-editor-menu-item>View</music-editor-menu-item>
                <music-editor-menu-item>Editor</music-editor-menu-item>
                <music-editor-menu-item>Instruments</music-editor-menu-item>
                <music-editor-menu-item>Collaborate</music-editor-menu-item>
            </music-editor-menu>
            <form class="form-instrument">
                <fieldset class="selected-note">
                    <select name="instrument">
                        <optgroup label="Instrument Group">
                            <option>osc.simple</option>
                            ${renderEditorFormOptions('instruments')}
                        </optgroup>
                    </select>
                    <select name="frequency">
                        ${renderEditorFormOptions('frequencies')}
                    </select>
                    <select name="length">
                        ${renderEditorFormOptions('lengths')}
                    </select>
                    <select name="velocity">
                        ${renderEditorFormOptions('velocities')}
                    </select>
                    <button name="duplicate">+</button>
                    <button name="remove">-</button>
                </fieldset>
            </form>
            <music-editor-grid>
            </music-editor-grid>
        `;
    }

    function renderEditorFormOptions(optionType) {
        var options = [];
        switch(optionType) {
            case 'instruments':
                if(window.instruments) {
                    for(var key in window.instruments) {
                        if(window.instruments.hasOwnProperty(key)) {
                            var instrument = window.instruments;
                            options.push([key, instrument.constructor.name]);
                        }
                    }
                }
                break;

            case 'frequencies':
                var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
                for(var i=1; i<6; i++) {
                    for(var j=0; j<notes.length; j++) {
                        var note = notes[j] + i;
                        options.push([note, note]);
                    }
                }
                break;

            case 'velocities':
                for(var vi=100; vi>=0; vi++) {
                    options.push([vi, vi]);
                }
                break;

            case 'lengths':
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
        for (var o=0; o<options.length; o++) {
            var value = options[o][0];
            var label = options[o][1] || value;
            optionHTML += `<option label="${label}">${value}</option>`;
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
                    `<music-editor-menu-item action="load:memory" guid="${songGUID}">
                        <span>${song.name || "unnamed"}</span>
                    </music-editor-menu-item>`;
            } else {
                console.error("Song GUID not found: " + songGUID);
            }
        }

        return `
            <music-editor-submenu>
                ${menuItemsHTML}
            </music-editor-submenu>
        `;
    }

    // Config

    const DEFAULT_CONFIG = {
        previewNotesOnSelect: true,
    }

})();
