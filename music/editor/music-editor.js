/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions. Pauses are implied by the scale
 */

(function() {
    // if (!window.MusicEditor)
    //     window.MusicEditor = MusicEditor;

    class MusicEditorElement extends HTMLElement {
        constructor() {
            super();
            this.depressedKeys = [];
            this.config = DEFAULT_CONFIG;
            this.gridCurrentGroup = null;
            this.selectedInstructions = [];
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

            loadScript('music/player/music-player.js', function() {

                this.playerElement = document.createElement('music-player');
                this.playerElement.addEventListener('note:end', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('note:start', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:start', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:playback', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:end', this.onSongEvent.bind(this));
                this.playerElement.addEventListener('song:pause', this.onSongEvent.bind(this));

                if(this.getSongURL())
                    this.playerElement.loadSong(this.getSongURL(), function() {
                        this.render();
                        this.selectInstructions(this.getSong().instructions[0]);
                    }.bind(this));
            }.bind(this));
        }

        selectInstructions(instructions, previewInstructions) {
            this.selectedInstructions = Array.isArray(instructions) ? instructions : [instructions];
            this.formUpdate();

            if(previewInstructions && this.config.previewInstructionsOnSelect !== false)
                this.playInstruction(this.selectedInstructions[0]);

            // Update UI
            clearElementClass('selected', '.grid-data.selected');
            clearElementClass('selected', '.grid-row.selected');
            for(var i=0; i<this.selectedInstructions.length; i++) {
                let associatedElement = this.findAssociatedElement(this.selectedInstructions[i]);
                if(associatedElement) {
                    associatedElement.classList.add('selected');
                    associatedElement.parentNode.classList.add('selected');
                }
            }
        }

        gridDataSelect(dataElm, previewInstruction) {
            clearElementClass('selected', '.grid-data.selected');
            dataElm.classList.add('selected');
            clearElementClass('selected', '.grid-row.selected');
            dataElm.parentElement.classList.add('selected');

            if(dataElm.hasAttribute('data-position')) {
                var instruction = this.gridDataGetInstruction(dataElm);
                this.selectedInstructions = [instruction];
                this.formUpdate();
            }
        }

        gridDataDelete(dataElm) {
            var instruction = this.gridDataGetInstruction(dataElm);
            const instructionList = this.player.getInstructions(this.gridCurrentGroup);
            var p = instructionList.indexOf(instruction);
            if(p === -1)
                throw new Error("Instruction not found");
            instructionList.splice(p, 1);

            this.selectedInstructions = [
                findNextInstruction('note', instructionList, p-1)
                || findNextInstruction('note', instructionList)
            ];
        }

        gridRowSelect(rowElm, previewInstruction) {
            clearElementClass('selected', '.grid-row.selected');
            rowElm.classList.add('selected');
        }

        gridDataGetInstruction(gridElm) {
            let position = parseInt(gridElm.getAttribute('data-position'));
            let instruction = this.getSong().instructions[position];
            if(!instruction)
                throw new Error("Instruction not found at position: " + position);
            return instruction;
        }

        findAssociatedElement(instruction) {
            let instructionGroup = this.player.findInstructionGroup(instruction);
            if(instructionGroup !== this.gridCurrentGroup)
                return false;
            let position = this.player.getInstructionPosition(instruction, instructionGroup);
            return this.findGridDataPosition(position);
        }

        findGridDataPosition(instrumentPosition) {
            let gridDataElms = this.querySelectorAll('.grid-data');
            for(let i=0; i<gridDataElms.length; i++)
                if(parseInt(gridDataElms[i].getAttribute('data-position')) === instrumentPosition)
                    return gridDataElms[i];
            return null;
        }

        getSongURL() { return this.getAttribute('src');}


        saveSongToMemory() {
            saveSongToMemory(this.getSong());
        }
        loadSongFromMemory(guid) {
            this.player.loadSongData(loadSongFromMemory(guid));
            this.render();
        }

        render() {
            this.innerHTML = renderEditorContent.call(this);
            this.formUpdate();
        }

        // Player commands

        playInstruction(instruction) {
            const associatedElement = this.findAssociatedElement(instruction);
            return this.player.playInstruction(
                instruction,
                this.playerElement.getAudioContext().currentTime,
                this.playerElement.getStartingBeatsPerMinute(),
                function(playing) {
                    associatedElement && associatedElement.classList.toggle('playing', playing);
                }.bind(this),
            );
        }

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
        // pause () { return this.player.duration(); }



        gridSwapInstructions(dataElement1, dataElement2) {
            const instruction1 = this.gridDataGetInstruction(dataElement1);
            const instruction2 = this.gridDataGetInstruction(dataElement2);
            this.player.swapInstructions(
                instruction1,
                instruction2,
            );
            this.render();
            this.querySelector('.music-editor').focus();
            // this.formUpdate(instruction1);
            // this.findAssociatedElement(instruction1).select();
        }

        // Forms

        formUpdate() {
            var currentInstruction = this.selectedInstructions[0];

            const formInstructionElm = this.querySelector('form.form-instruction');
            formInstructionElm.classList.add('hidden');
            const formGroup = this.querySelector('form.form-group');
            formGroup.classList.add('hidden');
            if(currentInstruction) {
                switch (currentInstruction.type) {
                    case 'note':
                        formInstructionElm.instrument.value = "" + currentInstruction.instrument || '';
                        formInstructionElm.frequency.value = currentInstruction.frequency || '';
                        formInstructionElm.duration.value = currentInstruction.duration || '';
                        formInstructionElm.velocity.value = currentInstruction.velocity || '';
                        // formInstruction.editableInstruction = instruction;
                        formInstructionElm.classList.remove('hidden');
                        break;

                    case 'group':
                        formGroup.classList.remove('hidden');
                        break;
                }
            }

            // var formRow = this.querySelector('form.form-row');
            // formRow.classList.add('hidden');
            // if(instruction.duration) {
            //     formRow.duration.value = instruction.duration || '';
            //     formRow.classList.remove('hidden');
            // }
        }

        // Playback

        onSongEvent(e) {
//             console.log("Playback", e.type, e.detail);
            switch(e.type) {
                case 'note:start':
                    const startElm = this.findAssociatedElement(e.detail.instruction);
                    if(startElm)
                        startElm.classList.add('playing');
                    break;
                case 'note:end':
                    const endElm = this.findAssociatedElement(e.detail.instruction);
                    if(endElm)
                        endElm.classList.remove('playing');
                    break;
                case 'song:start':
                    this.querySelector('.music-editor').classList.add('playing');
                    break;
                case 'song:end':
                case 'song:pause':
                    this.querySelector('.music-editor').classList.remove('playing');
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


    // Define custom elements
    customElements.define('music-editor', MusicEditorElement);


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

    function findNextInstruction(type, instructionList, startingPosiion) {
        for(let i=startingPosiion >= 0 ? startingPosiion : 0; i<instructionList.length; i++) {
            const instruction = instructionList[i];
            if(!type || type === instruction.type)
                return instruction;
        }
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

    // Form Actions

    const formCommands = {
        'instruction:edit': function (e, form, editor) {
            let instruction = editor.selectedInstructions[0];
            if(!instruction) throw new Error("editableInstruction not found");
            // let associatedElement = editor.findAssociatedElement(instruction);
            let instrumentID = form.instrument.value;
            if(instrumentID.indexOf('add:') === 0)
                instrumentID = editor.addSongInstrument(instrumentID.substr(4));

            instruction.instrument = parseInt(instrumentID);
            instruction.frequency = form.frequency.value;
            instruction.duration = parseFloat(form.duration.value);
            instruction.velocity = parseInt(form.velocity.value);
            editor.render();
            editor.querySelector('.music-editor').focus();

            if(editor.config.previewInstructionsOnSelect !== false)
                editor.playInstruction(instruction);
        },
        'song:edit': function(e, form, editor) {
            const song = editor.getSong();
            song.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
            song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
            song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
            editor.render();
        },
        'song:play': function (e, form, editor) { editor.player.play(); },
        'song:pause': function (e, form, editor) { editor.player.pause(); },
        'song:playback': function (e, form, editor) {
            console.log(e.target);
        }
    };

    // Menu Actions

    const menuCommands = {
        'save:memory': function(e, editor) { editor.saveSongToMemory(); },
        'load:memory': function(e, editor) { editor.loadSongFromMemory(e.target.getAttribute('data-guid')); },
    };
    const keyboardCommands = {
        'default': {
            'Delete': handleGridKeyboardEvent,
            'ArrowRight': handleGridKeyboardEvent,
            'ArrowLeft': handleGridKeyboardEvent,
            'ArrowDown': handleGridKeyboardEvent,
            'ArrowUp': handleGridKeyboardEvent,
            ' ': function(e, editor) { editor.player.play(); }
        },
        'alt': {
        },
        'ctrl': {
            'ArrowRight': handleGridKeyboardEvent,
            'ArrowLeft': handleGridKeyboardEvent,
            'ArrowDown': handleGridKeyboardEvent,
            'ArrowUp': handleGridKeyboardEvent,
            's': function (e, editor) { editor.saveSongToMemory(); },
        },
    };

    function handleGridKeyboardEvent(e, editor) {
        const selectedData = editor.querySelector('.grid-data.selected')
            || editor.querySelector('.grid-data');
        let selectedRow = selectedData.parentNode;

        let nextRow = selectedRow.nextElementSibling;
        let lastRow = selectedRow.previousElementSibling;
        let nextElement = selectedData.nextElementSibling || (nextRow ? nextRow.firstChild : null);
        let lastElement = selectedData.previousElementSibling || (lastRow ? lastRow.lastChild: null);
        let nextData = nextElement && nextElement.classList.contains('grid-data-new') ? (nextRow ? nextRow.firstChild : null) : nextElement;
        let lastData = lastElement && lastElement.classList.contains('grid-data-new') ? (lastRow ? lastRow.lastChild : null) : lastElement;

        switch(e.key) {
            case 'Delete':
                editor.gridDataDelete(selectedData);
                editor.render();
                editor.querySelector('.music-editor').focus();
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey)     nextData && editor.gridSwapInstructions(nextData, selectedData);
                else                            editor.gridDataSelect(nextElement || selectedData);
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey)     lastData && editor.gridSwapInstructions(lastData, selectedData);
                else                            editor.gridDataSelect(lastElement || selectedData);
                break;
            case 'ArrowDown':
                if (e.ctrlKey || e.metaKey)     nextRow && editor.gridSwapInstructions(nextRow.firstChild, selectedData);
                else                            editor.gridDataSelect((nextRow || selectedRow).firstChild);
                break;
            case 'ArrowUp':
                if (e.ctrlKey || e.metaKey)     lastRow && editor.gridSwapInstructions(lastRow.lastChild, selectedData);
                else                            editor.gridDataSelect((lastRow || selectedRow).lastChild);
                break;
        }
    }

    function handleEditorInput(e, editor) {
        // console.log(e.type, e);
        if(e.defaultPrevented)
            return;
        switch(e.type) {
            case 'keydown':
                if(e.altKey) {
                    if(keyboardCommands.alt[e.key]) {
                        keyboardCommands.alt[e.key](e, editor);
                        e.preventDefault();
                        return;
                    }
                }
                if(e.ctrlKey || e.metaKey) {
                    if(keyboardCommands.ctrl[e.key]) {
                        keyboardCommands.ctrl[e.key](e, editor);
                        e.preventDefault();
                        return;
                    }
                }
                if(keyboardCommands.default[e.key]) {
                    keyboardCommands.default[e.key](e, editor);
                    e.preventDefault();
                    return;
                }

                let selectedInstruction = editor.selectedInstructions[0]; // editor.gridDataGetInstruction(selectedData);

                let selectedData = editor.querySelector('.grid-data.selected');
                if(selectedData && selectedData.classList.contains('grid-data-new')) {
                    let insertPosition = parseInt(selectedData.getAttribute('data-insert-position'));
                    selectedInstruction = Object.assign({}, selectedInstruction, {
                        type: 'note',
                        instrument: 0,
                        frequency: 'C4',
                        duration: parseFloat(selectedData.parentNode.getAttribute('data-duration'))
                    }); // new instruction
                    editor.selectedInstructions = [selectedInstruction]; // select new instruction
                    editor.player.insertInstruction(selectedInstruction, editor.gridCurrentGroup, insertPosition);
                    if(selectedData.classList.contains('grid-data-new-last'))
                        editor.player.insertInstruction({
                            type: 'pause',
                            duration: parseFloat(selectedData.getAttribute('data-insert-pause')),
                        }, editor.gridCurrentGroup, insertPosition+1);
                    // editor.render();
                }
                //     || editor.querySelector('.grid-data');

                if(selectedInstruction.frequency) {
                    const keyboard = DEFAULT_KEYBOARD_LAYOUT;
                    if(keyboard[e.key]) {
                        e.preventDefault();
                        selectedInstruction.frequency = keyboard[e.key];
                        editor.render();
                        editor.querySelector('.music-editor').focus();
                        editor.playInstruction(selectedInstruction);
                        return;
                    }
                }

                if(!e.defaultPrevented)
                    console.info('Unused input', e);
                break;

            case 'keyup':
                // const i = depressedKeys.indexOf(e.key);
                // if(i > -1) {
                //     depressedKeys.splice(i, 1);
                // }
                break;

            case 'click':
                let classList = e.target.classList;
                if(classList.contains('menu-item')) {
                    handleMenuClickEvent(e, editor);
                    break;
                }
                editor.menuClose();

                if(classList.contains('grid-parameter')
                    || classList.contains('grid-data')
                    || classList.contains('grid-row'))
                    handleGridClickEvent(e, editor);

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
                formCommand(e, form, editor);
                break;
        }
    }


    function handleGridClickEvent(e, editor) {
        const gridItem = e.target;
//         console.log("Grid " + e.type, gridItem);

        clearElementClass('selected', '.grid-data');
        clearElementClass('selected', '.grid-row');
        if(gridItem.classList.contains('grid-parameter')) {
            editor.gridDataSelect(gridItem.parentNode, true);
            return;
        }
        if(gridItem.classList.contains('grid-data')) {
            editor.gridDataSelect(gridItem, true);
            return;
        }
        if(gridItem.classList.contains('grid-row')) {
            editor.gridRowSelect(gridItem, true);
            return;
        }

        console.warn("Unhandled menu click", e);
    }

    function handleMenuClickEvent(e, editor) {
        const menuItem = e.target;
        console.log("Menu " + e.type, menuItem);
        const dataCommand = menuItem.getAttribute('data-command');
        if(dataCommand) {
            let menuCommand = menuCommands[dataCommand];
            if (!menuCommand)
                throw new Error("Unknown menu command: " + dataCommand);
            menuCommand(e, editor);
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

    // Rendering templates

    function renderGrid(editor) {
        const song = editor.getSong();
        var beatsPerMinute = song.beatsPerMinute;
        var beatsPerMeasure = song.beatsPerMeasure;
        var pausesPerBeat = song.pausesPerBeat;
        const instructionList = song.instructions;

        let odd = false, selectedRow = false;

        let editorHTML = '', rowHTML = '', pauseCount = 0, lastPause = 0;
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];

            switch(instruction.type) {
                case 'note':
                    var nextPause = (findNextInstruction('pause', instructionList, i) || {duration: lastPause}).duration;
                    var noteCSS = [];
                    if(editor.selectedInstructions.indexOf(instruction) !== -1)
                        selectedRow = true;
                    if(selectedRow)
                        noteCSS.push('selected');
                    rowHTML += `<div class="grid-data ${noteCSS.join(' ')}" data-position="${i}">`;
                    rowHTML +=  `<div class="grid-parameter instrument">${formatInstrumentID(instruction.instrument)}</div>`;
                    rowHTML +=  `<div class="grid-parameter frequency">${instruction.frequency}</div>`;
                    if (instruction.duration) //  && this.instruction.duration !== this.parentNode.instruction.duration)
                        rowHTML += `<div class="grid-parameter duration${nextPause === instruction.duration ? ' matches-pause' : ''}">${instruction.duration}</div>`;
                    if (instruction.velocity)
                        rowHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    rowHTML += `</div>`;
                    break;

                case 'group':
                    rowHTML += `<div class="grid-data" data-position="${i}">`;
                    rowHTML +=  `<div class="grid-parameter group">${instruction.group}</div>`;
                    rowHTML += `</div>`;
                    break;

                case 'pause':
                    var pauseCSS = (odd = !odd) ? ['odd'] : [];
                    if (pauseCount % pausesPerBeat === 0)
                        pauseCSS.push('beat-start');

                    if (pauseCount % pausesPerBeat === pausesPerBeat - 1)
                        pauseCSS.push('beat-end');

                    if (pauseCount % (pausesPerBeat * beatsPerMeasure) === 0)
                        pauseCSS.push('measure-start');
                    if (pauseCount % (pausesPerBeat * beatsPerMeasure) === pausesPerBeat * beatsPerMeasure - 1)
                        pauseCSS.push('measure-end');
                    pauseCount++;

                    lastPause = instruction.duration;

                    if(selectedRow)
                        pauseCSS.push('selected');

                    editorHTML += `<div class="grid-row ${pauseCSS.join(' ')}" data-duration="${instruction.duration}" data-beats-per-minute="${beatsPerMinute}">`;
                    editorHTML += rowHTML;
                    editorHTML +=   `<div class="grid-data grid-data-new" data-insert-position="${i}"><div class="grid-parameter">+</div></div>`;
                    editorHTML += `</div>`;
                    rowHTML = '';
                    selectedRow = false;

                    break;
            }

        }

        editorHTML += `<div class="grid-row grid-row-new${odd ? ' odd' : ''}" data-duration="${lastPause}" data-beats-per-minute="${beatsPerMinute}">`;
        editorHTML +=   `<div class="grid-data grid-data-new grid-data-new-last" data-insert-pause="${lastPause}" data-insert-position="${instructionList.length}"><div class="grid-parameter">+</div></div>`;
        editorHTML += `</div>`;

        return editorHTML;
    }

    function renderEditorFormOptions(optionType, editor) {
        let options = [];
        let song = editor ? editor.getSong() : null;
        var selectedCallback = function() { return false; };
        switch(optionType) {
            case 'song-instruments':
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
                for(let vi=100; vi>=0; vi-=10) {
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

            case 'pauses-per-beat':
                options = [
                    [1,  '1 Pause per beat'],
                    [2,  '2 Pauses per beat'],
                    [3,  '3 Pauses per beat'],
                    [4,  '4 Pauses per beat'],
                    [5,  '5 Pauses per beat'],
                    [6,  '6 Pauses per beat'],
                    [7,  '7 Pauses per beat'],
                    [8,  '8 Pauses per beat'],
                ];
                selectedCallback = function(vi) { return vi === song.durationsPerBeat; };
                break;

            case 'beats-per-measure':
                options = [
                    [1,  '1 Beat per measure'],
                    [2,  '2 Beats per measure'],
                    [3,  '3 Beats per measure'],
                    [4,  '4 Beats per measure'],
                ];
                selectedCallback = function(vi) { return vi === song.beatsPerMeasure; };
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=200; vi+=10) {
                    options.push([vi, vi, vi === song.beatsPerMinute]);
                }
                selectedCallback = function(vi) { return vi === song.beatsPerMinute; };
                break;
        }

        let optionHTML = '';
        for (let oi=0; oi<options.length; oi++) {
            const value = options[oi][0];
            const label = options[oi][1] || value;
            const selected = selectedCallback(value) ? ` selected="selected"` : '';
            optionHTML += `<option value="${value}" ${selected}>${label}</option>`;
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

    function renderEditorContent() {
        return `
            <div class="music-editor" tabindex="1">
                <div class="editor-menu">
                    <li>
                        <a class="menu-item" tabindex="2">File</a>
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
                    
                    <li><a class="menu-item" tabindex="3">View</a></li>
                    <li><a class="menu-item" tabindex="4">Editor</a></li>
                    <li><a class="menu-item" tabindex="5">Instruments</a></li>
                    <li><a class="menu-item" tabindex="6">Collaborate</a></li>
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
                    <form class="form-song-bpm" data-command="song:edit">
                        <select name="beats-per-minute">
                            <optgroup label="Beats per minute">
                                ${renderEditorFormOptions('beats-per-minute', this)}
                            </optgroup>
                        </select>
                        <select name="pauses-per-beat">
                            <optgroup label="Pauses per beat">
                                ${renderEditorFormOptions('pauses-per-beat', this)}
                            </optgroup>
                        </select>
                        <select name="beats-per-measure">
                            <optgroup label="Beats per measure">
                                ${renderEditorFormOptions('beats-per-measure', this)}
                            </optgroup>
                        </select>
                    </form>
                    <form class="form-song-info" data-command="song:info">
                        <button name="info">Info</button>
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
                <div class="editor-grid" data-group="${this.gridCurrentGroup || ''}">
                    ${renderGrid(this)}
                </div>
            </div>
        `;
    }


    // Config

    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    }

})();
