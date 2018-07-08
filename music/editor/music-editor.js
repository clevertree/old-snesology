/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

(function() {
    // if (!window.MusicEditor)
    //     window.MusicEditor = MusicEditor;
    const DEFAULT_GROUP = 'root';

    class MusicEditorElement extends HTMLElement {
        constructor() {
            super();
            this.config = DEFAULT_CONFIG;
            this.gridGroupPath = [DEFAULT_GROUP];
            // this.getSelectedInstructions() = [];
            this.keyboardLayout = DEFAULT_KEYBOARD_LAYOUT;
        }

        get player() { return this.playerElement; }
        getSelectedInstructions() {
            var selectedInstructions = [];
            this.querySelectorAll('.grid-data.selected').forEach(function(gridElm, i) {
                let position = parseInt(gridElm.getAttribute('data-position'));
                let instruction = this.player.getInstructions(this.gridGroupPath[0])[position];
                if(instruction)
                    selectedInstructions.push(instruction);
            }.bind(this));
            return selectedInstructions;
        }
        
        getAudioContext() { return this.player.getAudioContext(); }
        getSong() { return this.player.getSong(); }

        connectedCallback() {
            // this.render();

            this.addEventListener('contextmenu', this.onInput.bind(this));
            this.addEventListener('keydown', this.onInput.bind(this));
            // this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));
            this.addEventListener('change', this.onInput.bind(this));
            this.addEventListener('submit', this.onInput.bind(this));
            this.addEventListener('contextmenu', this.onInput.bind(this));

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
                        this.gridGroupPath = [this.getSong().root || DEFAULT_GROUP];
                        this.render();
                        this.gridSelectInstructionPositions([0]);
                        // this.selectInstructions(this.getSong().getInstructions(this.gridGroupPath[0])[0]);
                    }.bind(this));
            }.bind(this));
        }

        // selectInstructions(instructions, previewInstructions) {
        //     this.getSelectedInstructions() = Array.isArray(instructions) ? instructions : [instructions];
        //     this.formUpdate();
        //
        //     if(previewInstructions && this.config.previewInstructionsOnSelect !== false)
        //         this.playInstruction(this.getSelectedInstructions()[0]);
        //
        //     // Update UI
        //     clearElementClass('selected', '.grid-data.selected');
        //     clearElementClass('selected', '.grid-row.selected');
        //     for(var i=0; i<this.getSelectedInstructions().length; i++) {
        //         let associatedElement = this.findAssociatedElement(this.getSelectedInstructions()[i]);
        //         if(associatedElement) {
        //             associatedElement.classList.add('selected');
        //             associatedElement.parentNode.classList.add('selected');
        //         }
        //     }
        // }

        gridSelectInstructionPositions(positionList) {
            positionList = Array.isArray(positionList) ? positionList : [positionList];
            var selectedInstructions = [];
            var instructionList = this.player.getInstructions(this.gridCurrentGroup);
            for(var i=0; i<positionList.length; i++)
                selectedInstructions.push(instructionList[positionList[i]]);
            this.gridSelectInstructions(selectedInstructions);
        }

        gridSelectInstructions(selectedInstructions) {
            selectedInstructions = Array.isArray(selectedInstructions) ? selectedInstructions : [selectedInstructions];
            var instructionGroup = this.player.getInstructionGroup(selectedInstructions[0]);
            if(this.gridCurrentGroup !== instructionGroup) {
                this.gridCurrentGroup = instructionGroup;
                this.render();
            }
            var gridDataList = [];
            for(var i=0; i<selectedInstructions.length; i++) {
                var instruction = selectedInstructions[i];
                var p = this.player.getInstructionPosition(instruction, instructionGroup);
                gridDataList.push(this.querySelector(`.grid-data[data-position='${p}']`));
            }
            this.gridSelectData(gridDataList);
        }

        gridSelectData(gridDataList) {
            gridDataList = Array.isArray(gridDataList) ? gridDataList : [gridDataList];
            clearElementClass('selected', '.grid-data.selected');
            clearElementClass('selected', '.grid-row.selected');
            for(var i=0; i<gridDataList.length; i++) {
                var selectedGridDataElm = gridDataList[i];
                selectedGridDataElm.classList.add('selected');
                selectedGridDataElm.parentElement.classList.add('selected');
            }
        }

        gridDataSelect(dataElm, previewInstruction) {
            clearElementClass('selected', '.grid-data.selected');
            dataElm.classList.add('selected');
            clearElementClass('selected', '.grid-row.selected');
            dataElm.parentElement.classList.add('selected');
        }

        gridDataDelete(dataElm) {
            let instruction = this.gridDataGetInstruction(dataElm);
            const instructionList = this.player.getInstructions(this.gridGroupPath[0]);
            let p = instructionList.indexOf(instruction);
            if(p === -1)
                throw new Error("Instruction not found");
            instructionList.splice(p, 1);
            this.render();
            this.gridSelectInstructions([instructionList[p]]);
        }

        gridDataGetInstruction(gridElm) {
            let position = parseInt(gridElm.getAttribute('data-position'));
            let instruction = this.player.getInstructions(this.gridGroupPath[0])[position];
            if(!instruction)
                throw new Error("Instruction not found at position: " + position);
            return instruction;
        }


        findAssociatedElement(instruction) {
            let instructionGroup = this.player.findInstructionGroup(instruction);
            if(instructionGroup !== this.gridGroupPath[0])
                return null;
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
            this.gridSelectInstructionPositions([0]);
        }

        render(focus) {
            // var selectedInstructions = this.getSelectedInstructions();
            this.innerHTML = renderEditorContent.call(this);
            this.formUpdate();
            // let selectedData = this.querySelector('.grid-data.selected');
            // if(!selectedData) {
            //     selectedData = this.querySelector('.grid-data');
            //     this.gridDataSelect(selectedData);
            // }
            if(focus === true || typeof focus === 'undefined') {
                this.querySelector('.music-editor').focus();
            }
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


        gridSwapInstructions(dataElement1, dataElement2) {
            const instruction1 = this.gridDataGetInstruction(dataElement1);
            const instruction2 = this.gridDataGetInstruction(dataElement2);
            this.player.swapInstructions(
                instruction1,
                instruction2,
            );
            this.render();
            this.gridSelectInstructions([instruction1]);
            // this.formUpdate(instruction1);
            // this.findAssociatedElement(instruction1).select();
        }

        // Forms

        formUpdate() {
            const formInstructionElm = this.querySelector('form.form-instruction');
            formInstructionElm.firstElementChild.setAttribute('disabled', 'disabled');

            const formRowElm = this.querySelector('form.form-row');
            formRowElm.firstElementChild.setAttribute('disabled', 'disabled');

            const formGroup = this.querySelector('form.form-group');
            // formGroup.classList.add('hidden');

            var currentInstruction = this.getSelectedInstructions()[0];
            if(currentInstruction) {
                switch (currentInstruction.type) {
                    case 'note':
                        formInstructionElm.instrument.value = "" + currentInstruction.instrument || '';
                        formInstructionElm.frequency.value = currentInstruction.frequency || '';
                        formInstructionElm.duration.value = currentInstruction.duration || '';
                        formInstructionElm.velocity.value = currentInstruction.velocity || '';
                        // formInstruction.editableInstruction = instruction;
                        formInstructionElm.firstElementChild.removeAttribute('disabled');

                        var instructionList = this.player.getInstructions(this.gridGroupPath[0]);
                        var instructionPosition = this.player.getInstructionPosition(currentInstruction, this.gridGroupPath[0]);
                        var nextPause = findNextInstruction('pause', instructionList, instructionPosition);
                        formRowElm.duration.value = nextPause.duration || '';
                        formRowElm.firstElementChild.removeAttribute('disabled');

                        break;

                    case 'group':
                        // formGroup.classList.remove('hidden');
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
            // console.log("onSongEvent", e);
            const detail = e.detail || {stats:{}};
            const instructionElm = detail.instruction ? this.findAssociatedElement(detail.instruction) : null;
            const groupElm = detail.groupInstruction ? this.findAssociatedElement(detail.groupInstruction) : null;
            // var groupPlayActive = groupElm ? parseInt(groupElm.getAttribute('data-play-active')||0) : 0;
            switch(e.type) {
                case 'note:start':
                    if(instructionElm) {
                        instructionElm.classList.add('playing');
                        instructionElm.parentNode.classList.add('playing');
                        console.log("show", instructionElm);
                    }
                    if(groupElm) {
                        groupElm.classList.add('playing');
                        groupElm.parentNode.classList.add('playing');
                        // groupElm.setAttribute('data-play-active', groupPlayActive+1);
                    }
                    break;
                case 'note:end':
                    if(instructionElm) {
                        instructionElm.classList.remove('playing');
                        instructionElm.parentNode.classList.remove('playing');
                        console.log("hide", instructionElm);
                    }
                    if(groupElm) {
                        // if(groupPlayActive <= 1) {
                            groupElm.classList.remove('playing');
                            groupElm.parentNode.classList.remove('playing');
                        // }
                        // groupElm.setAttribute('data-play-active', groupPlayActive-1);
                    }
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

        // Menu

        openContextMenu(e, target) {
            var dataElm = null;
            target = target || e.target;
            var xy = {x:e.clientX, y:e.clientY};

            clearElementClass('open', '.menu-item.open');
            clearElementClass('selected-context-menu', '.selected-context-menu');
            var contextMenu = this.querySelector('.editor-context-menu');
            // console.info("Context menu", contextMenu);

            contextMenu.setAttribute('class', 'editor-context-menu');
            contextMenu.firstElementChild.classList.add('open');

            if(target.classList.contains('grid-parameter'))
                target = target.parentNode;
            if(target.classList.contains('grid-data')) {
                dataElm = target;
                contextMenu.classList.add('selected-data');
                contextMenu.classList.add('selected-row');
                var rect = dataElm.getBoundingClientRect();
                xy = {x:rect.x + rect.width, y:rect.y + rect.height};
                this.gridSelectData(dataElm);
            } else if(target.classList.contains('grid-row')) {
                contextMenu.classList.add('selected-row');
            }

            contextMenu.classList.add('show');

            contextMenu.style.left = xy.x + 'px';
            contextMenu.style.top = xy.y + 'px';
        }

        menuClose() {
            clearElementClass('open', '.menu-item.open');
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
        let scriptElm = document.head.querySelector(`script[src$=${scriptPathEsc}]`);
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
        let foundScript = document.head.querySelectorAll(`link[href$=${styleSheetPathEsc}]`);
        if (foundScript.length === 0) {
            let styleSheetElm = document.createElement('link');
            styleSheetElm.href = styleSheetPath;
            styleSheetElm.rel = 'stylesheet';
            styleSheetElm.onload = onLoaded;
            document.head.appendChild(styleSheetElm);
        }
    }

    // Element Commands

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

    function findNextInstruction(type, instructionList, startingPosition) {
        for(let i=startingPosition >= 0 ? startingPosition : 0; i<instructionList.length; i++) {
            const instruction = instructionList[i];
            if(!type || type === instruction.type)
                return instruction;
        }
        return null;
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
            let instruction = editor.getSelectedInstructions()[0];
            if(!instruction) throw new Error("no instructions are currently selected");
            // let associatedElement = editor.findAssociatedElement(instruction);
            let instrumentID = form.instrument.value;
            if(instrumentID.indexOf('add:') === 0)
                instrumentID = editor.addSongInstrument(instrumentID.substr(4));

            instruction.instrument = parseInt(instrumentID);
            instruction.frequency = form.frequency.value;
            instruction.duration = parseFloat(form.duration.value);
            instruction.velocity = parseInt(form.velocity.value);
            editor.render();
            editor.gridSelectInstructions([instruction]);

            if(editor.config.previewInstructionsOnSelect !== false)
                editor.playInstruction(instruction);
        },
        'row:edit': function(e, form, editor) {
            let instruction = editor.getSelectedInstructions()[0];
            if(!instruction)
                throw new Error("no instructions are currently selected");
            var instructionList = editor.player.getInstructions(editor.gridGroupPath[0]);
            var instructionPosition = editor.player.getInstructionPosition(instruction, editor.gridGroupPath[0]);
            var nextPause = findNextInstruction('pause', instructionList, instructionPosition);
            if(!nextPause)
                throw new Error("no pauses follow selected instruction");
            nextPause.duration = parseFloat(form.duration.value);
            editor.render();
            editor.gridSelectInstructions([instruction]);
        },
        'group:edit': function(e, form, editor) {
            editor.gridGroupPath = [form.groupName.value];
            editor.render();
            editor.gridSelectInstructionPositions([0]);
        },
        'song:edit': function(e, form, editor) {
            const song = editor.getSong();
            // song.pausesPerBeat = parseInt(form['pauses-per-beat'].value);
            song.beatsPerMinute = parseInt(form['beats-per-minute'].value);
            song.beatsPerMeasure = parseInt(form['beats-per-measure'].value);
            editor.render();
            editor.gridSelectInstructionPositions([0]);
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
            'Enter': handleGridKeyboardEvent,
            'Delete': handleGridKeyboardEvent,
            'Backspace': handleGridKeyboardEvent,
            'Escape': handleGridKeyboardEvent,
            'ContextMenu': handleGridKeyboardEvent,
            'ArrowRight': handleGridKeyboardEvent,
            'ArrowLeft': handleGridKeyboardEvent,
            'ArrowDown': handleGridKeyboardEvent,
            'ArrowUp': handleGridKeyboardEvent,
            'PlayFrequency': handleGridKeyboardEvent,
            ' ': function(e, editor) { editor.player.play(); }
        },
        'alt': {
            'Enter': handleGridKeyboardEvent,
        },
        'ctrl': {
            'Enter': handleGridKeyboardEvent,
            'ArrowRight': handleGridKeyboardEvent,
            'ArrowLeft': handleGridKeyboardEvent,
            'ArrowDown': handleGridKeyboardEvent,
            'ArrowUp': handleGridKeyboardEvent,
            's': function (e, editor) { editor.saveSongToMemory(); },
        },
    };

    function handleGridKeyboardEvent(e, editor) {
        let selectedData = editor.querySelector('.grid-data.selected')
            || editor.querySelector('.grid-data');
        let selectedRow = selectedData.parentNode;
        let column = Array.prototype.indexOf.call(selectedData.parentNode.childNodes, selectedData);
        let nextRow = selectedRow.nextElementSibling;
        let previousRow = selectedRow.previousElementSibling;
        let nextElement = selectedData.nextElementSibling || (nextRow ? nextRow.firstChild : null);
        let previousElement = selectedData.previousElementSibling || (previousRow ? previousRow.lastChild: null);
        let nextRowElement = nextRow ? nextRow.childNodes[column] || nextRow.firstChild : null;
        let previousRowElement = previousRow ? previousRow.childNodes[column] || previousRow.lastChild: null;
        // let nextNote = nextElement && nextElement.classList.contains('grid-data-note') ? nextElement : nextRow.firstChild
        // let nextData = nextElement && nextElement.classList.contains('grid-data-new') ? (nextRow ? nextRow.firstChild : null) : nextElement;
        // let lastData = lastElement && lastElement.classList.contains('grid-data-new') ? (lastRow ? lastRow.lastChild : null) : lastElement;
        var keyEvent = e.key;
        if(editor.keyboardLayout[e.key])
            keyEvent = 'PlayFrequency';
        if(keyEvent === 'Enter' && e.altKey)
            keyEvent = 'ContextMenu';
        switch(keyEvent) {
            case 'ContextMenu':
                editor.openContextMenu(e, selectedData);
                e.preventDefault();


                // editor.render(true);
                break;
            case 'Delete':
                editor.gridDataDelete(selectedData);
                // editor.render(true);
                break;
            case 'Escape':
            case 'Backspace':
                editor.gridGroupPath.shift();
                if(editor.gridGroupPath.length === 0)
                    editor.gridGroupPath = [editor.getSong().root || DEFAULT_GROUP];
                // editor.getSelectedInstructions() = [];
                editor.render();
                editor.gridSelectInstructionPositions([0]);
                break;
            case 'Enter':
                if(selectedData.classList.contains('grid-data-group')) {
                    if(e.ctrlKey || e.metaKey) {
                        editor.gridGroupPath.unshift(selectedData.getAttribute('data-group'));
                        editor.render();
                        editor.gridSelectInstructionPositions([0]);
                    } else {
                        editor.player.playInstructions(selectedData.getAttribute('data-group'));
                    }
                } else {
                    let selectedInstruction = editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);
                    editor.playInstruction(selectedInstruction);
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey)     editor.gridSwapInstructions(selectedData, nextElement);
                else                            editor.gridDataSelect(nextElement || selectedData);
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey)     editor.gridSwapInstructions(selectedData, previousElement);
                else                            editor.gridDataSelect(previousElement || selectedData);
                break;
            case 'ArrowDown':
                if (e.ctrlKey || e.metaKey)     editor.gridSwapInstructions(selectedData, nextRowElement);
                else                            editor.gridDataSelect(nextRowElement || selectedData);
                break;
            case 'ArrowUp':
                if (e.ctrlKey || e.metaKey)     editor.gridSwapInstructions(selectedData, previousRowElement);
                else                            editor.gridDataSelect(previousRowElement || selectedData);
                break;

            case 'PlayFrequency':
                let selectedInstruction = editor.getSelectedInstructions()[0]; // editor.gridDataGetInstruction(selectedData);

                selectedData = editor.querySelector('.grid-data.selected');
                if(selectedData && selectedData.classList.contains('grid-data-new')) {
                    let insertPosition = parseInt(selectedData.getAttribute('data-position'));
                    selectedInstruction = Object.assign({}, selectedInstruction, {
                        type: 'note',
                        instrument: 0,
                        frequency: 'C4',
                        duration: parseFloat(selectedData.parentNode.getAttribute('data-duration'))
                    }); // new instruction
                    // editor.getSelectedInstructions() = [selectedInstruction]; // select new instruction
                    editor.player.insertInstruction(selectedInstruction, editor.gridGroupPath[0], insertPosition);
                    if(selectedData.classList.contains('grid-data-new-last'))
                        editor.player.insertInstruction({
                            type: 'pause',
                            duration: parseFloat(selectedData.getAttribute('data-insert-pause')),
                        }, editor.gridGroupPath[0], insertPosition+1);
                    // editor.render();
                }

                selectedInstruction.frequency = editor.keyboardLayout[e.key];
                editor.render(true);
                editor.playInstruction(selectedInstruction);
                editor.gridSelectInstructions([selectedInstruction]);
                break;

        }

    }

    function handleEditorInput(e, editor) {
        // console.log(e.type, e);
        if(e.defaultPrevented)
            return;
        let targetClassList = e.target.classList;
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

                if(editor.keyboardLayout[e.key]) {
                    e.preventDefault();
                    keyboardCommands.default.PlayFrequency(e, editor);
                    return;
                }

                if(!e.defaultPrevented)
                    console.info('Unused input', e);
                break;

            // case 'keyup':
            //     break;

            case 'click':
                if(targetClassList.contains('menu-item')) {
                    handleMenuClickEvent(e, editor);
                    break;
                }
                editor.menuClose();

                if(targetClassList.contains('grid-parameter')
                    || targetClassList.contains('grid-data')
                    || targetClassList.contains('grid-row'))
                    handleGridClickEvent(e, editor);

                break;

            case 'contextmenu':
                if(targetClassList.contains('grid-parameter')
                    || targetClassList.contains('grid-data')
                    || targetClassList.contains('grid-row')) {
                    editor.openContextMenu(e);
                    if(!e.altKey) e.preventDefault();
                }
                break;

            case 'submit':
            case 'change':
                e.preventDefault();
                const form = e.target.form || e.target;
//                 console.log("Form " + e.type + ": ", form.target.form, e);
                const formCommandName = form.getAttribute('data-command');
                let formCommand = formCommands[formCommandName];
                if(!formCommand)
                    throw new Error("Form command not found: " + formCommandName);
                formCommand(e, form, editor);
                break;

            default:
                console.error("Unhandled ", e);
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
            editor.gridDataSelect(gridItem.lastChild.previousElementSibling, true);
            return;
        }

        console.warn("Unhandled menu click", e);
    }

    function handleMenuClickEvent(e, editor) {
        let menuItem = e.target;
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
            // let subMenu = menuItem.nextElementSibling;
            clearElementClass('open', '.menu-item');
            while(menuItem && menuItem.classList.contains('menu-item')) {
                menuItem.classList.toggle('open');
                menuItem = menuItem.parentNode.parentNode.previousElementSibling;
            }
            return;
        }

        console.warn("Unhandled menu click", e);
    }

    // Rendering templates

    function renderGrid(editor) {
        const song = editor.getSong();
        var beatsPerMinute = song.beatsPerMinute;
        var beatsPerMeasure = song.beatsPerMeasure;
        // var pausesPerBeat = song.pausesPerBeat;
        const instructionList = song.instructions[editor.gridGroupPath[0]];
        if(!instructionList)
            throw new Error("Could not find instruction group: " + editor.gridGroupPath[0]);

        let odd = false, selectedRow = false;

        let editorHTML = '', rowHTML = '', songPosition = 0, lastPause = 0;
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];

            switch(instruction.type) {
                case 'note':
                    var nextPause = (findNextInstruction('pause', instructionList, i) || {duration: lastPause}).duration;
                    var noteCSS = [];
                    if(editor.getSelectedInstructions().indexOf(instruction) !== -1)
                        selectedRow = true;
                    if(selectedRow)
                        noteCSS.push('selected');
                    rowHTML += `<div class="grid-data grid-data-note ${noteCSS.join(' ')}" data-position="${i}">`;
                    rowHTML +=  `<div class="grid-parameter instrument">${formatInstrumentID(instruction.instrument)}</div>`;
                    rowHTML +=  `<div class="grid-parameter frequency">${instruction.frequency}</div>`;
                    if (typeof instruction.duration !== 'undefined')
                        rowHTML += `<div class="grid-parameter duration${nextPause === instruction.duration ? ' matches-pause' : ''}">${formatDuration(instruction.duration)}</div>`;
                    if (typeof instruction.velocity !== 'undefined')
                        rowHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    rowHTML += `</div>`;
                    break;

                case 'group':
                    rowHTML += `<div class="grid-data grid-data-group" data-position="${i}" data-group="${instruction.group}">`;
                    rowHTML +=  `<div class="grid-parameter group">${instruction.group}</div>`;
                    if (typeof instruction.velocity !== 'undefined')
                        rowHTML += `<div class="grid-parameter velocity">${instruction.velocity}</div>`;
                    rowHTML += `</div>`;
                    break;

                case 'pause':
                    var pauseCSS = (odd = !odd) ? ['odd'] : [];
                    // if (pauseCount % pausesPerBeat === 0)
                    //     pauseCSS.push('beat-start');

                    // if (pauseCount % pausesPerBeat === pausesPerBeat - 1)
                    //     pauseCSS.push('beat-end');

                    // if (pauseCount % (pausesPerBeat * beatsPerMeasure) === 0)
                    //     pauseCSS.push('measure-start');
                    // if (pauseCount % (pausesPerBeat * beatsPerMeasure) === pausesPerBeat * beatsPerMeasure - 1)
                    //     pauseCSS.push('measure-end');
                    if(Math.floor(songPosition / beatsPerMeasure) !== Math.floor((songPosition + instruction.duration) / beatsPerMeasure))
                        pauseCSS.push('measure-end');


                    lastPause = instruction.duration;
                    songPosition += instruction.duration;


                    if(selectedRow)
                        pauseCSS.push('selected');

                    editorHTML += `<div class="grid-row ${pauseCSS.join(' ')}" data-duration="${instruction.duration}" data-beats-per-minute="${beatsPerMinute}">`;
                    editorHTML += rowHTML;
                    editorHTML +=   `<div class="grid-data grid-data-new" data-position="${i}"><div class="grid-parameter">+</div></div>`;
                    editorHTML +=   `<div class="grid-data grid-data-pause" data-position="${i}" data-duration="${instruction.duration}"><div class="grid-parameter">${formatDuration(instruction.duration)}</div></div>`;
                    editorHTML += `</div>`;
                    rowHTML = '';
                    selectedRow = false;

                    break;
            }

        }

        editorHTML += `<div class="grid-row grid-row-new${odd ? '' : ' odd'}" data-duration="${lastPause}" data-beats-per-minute="${beatsPerMinute}">`;
        editorHTML +=   `<div class="grid-data grid-data-new grid-data-new-last" data-insert-pause="${lastPause}" data-position="${instructionList.length}"><div class="grid-parameter">+</div></div>`;
        editorHTML +=   `<div class="grid-data grid-data-pause" data-position="${instructionList.length}" data-duration="${lastPause}"><div class="grid-parameter">${formatDuration(lastPause)}</div></div>`;
        editorHTML += `</div>`;

        return editorHTML;
    }

    function getEditorFormOptions(optionType, editor, callback) {
        let html = '';
        let options = [];
        let song = editor ? editor.getSong() : null;
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
                    [1/64, '1/64'],
                    [1/32, '1/32'],
                    [1/16,  '1/16'],
                    [1/8,   '1/8'],
                    [1/4,   '1/4'],
                    [1/2,   '1/2'],
                    [1.0,   '1.0'],
                    [2.0,   '2.0'],
                    [4.0,  '4.0'],
                    [8.0,  '8.0'],
                ];
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    options.push([vi, vi + ` beat${vi>1?'s':''} per measure`, vi === song.beatsPerMeasure]);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    options.push([vi, vi+ ` beat${vi>1?'s':''} per minute`, vi === song.beatsPerMinute]);
                }
                break;

            case 'groups':
                options = [];
                Object.keys(song.instructions).map(function(key, i) {
                    options.push([key, key, editor.gridGroupPath[0] === key]);
                });
                break;
        }

        for (let oi=0; oi<options.length; oi++) {
            const value = options[oi][0];
            const label = options[oi][1] || value;
            const selected = options[oi][2];
            html += callback.call(this, value, label, selected);
        }
        return html;
    }

    function renderEditorFormOptions(optionType, editor) {
        let optionHTML = '';
        getEditorFormOptions(optionType, editor, function(value, label, selected) {
            optionHTML += `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`;
        });
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

    // Format Functions

    function formatInstrumentID(number) {
        return number < 10 ? "0" + number : "" + number;
    }
    function formatDuration(duration) { return parseFloat(duration).toFixed(2); }

    function renderEditorContent() {
        return `
            <div class="music-editor" tabindex="1">
                <div class="editor-menu">
                    <li>
                        <a class="menu-item" tabindex="2">File</a>
                        <ul class="sub-menu">
                            <li>
                                <a class="menu-item">Open from memory &#9658;</a>
                                ${renderEditorMenuLoadFromMemory()}
                            </li>
                            <li><a class="menu-item" data-command="load:file">Open from file</a></li>
                            <li><a class="menu-item disabled" data-command="load:url">Open from url</a></li>
                            
                            <hr/>
                            <li><a class="menu-item" data-command="save:memory">Save to memory</a></li>
                            <li><a class="menu-item disabled" data-command="save:file">Save to file</a></li>
                            
                            <hr/>
                            <li><a class="menu-item disabled" data-command="export:file">Export to audio file</a></li>
                        </ul>
                    </li>
                    
                    <li><a class="menu-item disabled" tabindex="3">View</a></li>
                    <li><a class="menu-item disabled" tabindex="4">Editor</a></li>
                    <li><a class="menu-item disabled" tabindex="5">Instruments</a></li>
                    <li><a class="menu-item disabled" tabindex="6">Collaborate</a></li>
                </div>
                <div class="editor-context-menu">
                    <ul class="sub-menu">
                        <!--<li><a class="menu-section-title">- Cell Actions -</a></li>-->
                        <li><a class="menu-item" data-command="note:insert"><span class="key">C</span>reate Note</a></li>
                        <li><a class="menu-item" data-command="note:frequency">Set <span class="key">I</span>nstrument</a></li>
                        <li><a class="menu-item" data-command="note:frequency">Set <span class="key">F</span>requency</a></li>
                        <li><a class="menu-item" data-command="note:velocity">Set <span class="key">V</span>elocity</a></li>
                        <li><a class="menu-item" data-command="note:panning">Set <span class="key">P</span>anning</a></li>
                        <li><a class="menu-item" data-command="note:delete"><span class="key">D</span>elete Note</a></li>
                        <hr />
                        <!--<li><a class="menu-section-title">- Row Actions -</a></li>-->
                        <li>
                            <a class="menu-item"><span class="key">R</span>ow Actions &#9658;</a>
                            <ul class="sub-menu">
                                <li><a class="menu-item disabled" data-command=""><span class="key">S</span>plit Pause</a></li>
                                <li><a class="menu-item" data-command=""><span class="key">D</span>elete Row</a></li>
                            </ul>
                        </li>
                        <hr />
                        <!--<li><a class="menu-section-title">- Group Actions -</a></li>-->
                        <li>
                            <a class="menu-item"><span class="key">G</span>roup Actions &#9658;</a>
                            <ul class="sub-menu">
                                <li><a class="menu-item" data-command=""><span class="key">I</span>nsert Group</a></li>
                                <li><a class="menu-item" data-command=""><span class="key">D</span>elete Group</a></li>
                            </ul>
                        </li>
                        <hr />
                    </ul>
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
                        <select name="beats-per-minute" title="Beats per minute">
                            <optgroup label="Beats per minute">
                            ${getEditorFormOptions('beats-per-minute', this, (value, label, selected) =>
                                `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`
                            )}
                            </optgroup>
                        </select>
                        <select name="beats-per-measure" title="Beats per measure">
                            <optgroup label="Beats per measure">
                            ${getEditorFormOptions('beats-per-measure', this, (value, label, selected) =>
                                `<option value="${value}" ${selected ? ` selected="selected"` : ''}>${label}</option>`
                            )}
                            </optgroup>
                        </select>
                    </form>
                    <form class="form-song-info" data-command="song:info">
                        <button name="info" disabled>Info</button>
                    </form>
                    
                    <br/>
        
                    <label class="row-label">Group:</label>
                    ${getEditorFormOptions('groups', this, (value, label, selected) => 
                        `<form class="form-group" data-command="group:edit">`
                        + `<button name="groupName" value="${value}" class="${selected ? `selected` : ''}" >${label}</button>`
                        + `</form> `
                    )}
        
                    <br/>
         
                    <form class="form-row" data-command="row:edit">
                        <fieldset>
                            <label class="row-label">Row:</label>
                            <select name="duration" title="Row Duration">
                                <optgroup label="Row Duration">
                                    ${renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                            <button name="new" disabled>+</button>
                            <button name="duplicate" disabled>c</button>
                            <button name="remove" disabled>-</button>
                            <button name="split" disabled>Split</button>
                        </fieldset>
                    </form>
                    
                    <br/>
        
                    <form class="form-instruction" data-command="instruction:edit">
                        <fieldset>
                            <label class="row-label">Note:</label>
                            <select name="instrument" title="Note Instrument">
                                <optgroup label="Song Instruments">
                                    ${renderEditorFormOptions('song-instruments', this)}
                                </optgroup>
                                <optgroup label="Available Instruments">
                                    ${renderEditorFormOptions('instruments-available')}
                                </optgroup>
                            </select>
                            <select name="frequency" title="Note Frequency">
                                <optgroup label="Frequency">
                                    ${renderEditorFormOptions('frequencies')}
                                </optgroup>
                            </select>
                            <select name="duration" title="Note Duration">
                                <optgroup label="Note Duration">
                                    ${renderEditorFormOptions('durations')}
                                </optgroup>
                            </select>
                            <select name="velocity" title="Note Velocity">
                                <optgroup label="Velocity">
                                    <option value="">Default</option>
                                    ${renderEditorFormOptions('velocities')}
                                </optgroup>
                            </select>
                            <button name="duplicate" disabled>+</button>
                            <button name="remove" disabled>-</button>
                        </fieldset>
                    </form>
                </div>
                <div class="editor-grid" data-group="${this.gridGroupPath[0] || ''}">
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
