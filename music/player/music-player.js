/**
 * Player requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions. Pauses are implied by the scale
 */

(function() {
    const DEFAULT_BEATS_PER_MINUTE = 120;
    const DEFAULT_PAUSES_PER_BEAT = 4;
    const DEFAULT_BEATS_PER_MEASURE = 4;
    // if (!window.MusicPlayer)
    //     window.MusicPlayer = MusicPlayer;

    class MusicPlayerElement extends HTMLElement {
        constructor() {
            super();
            this.audioContext = null;
            this.song = null;
            this.seekLength = 1;
            this.seekPosition = 0;
            this.playing = false;
            this.config = DEFAULT_CONFIG;
            this.loadSongData({});
        }

        getAudioContext() { return this.audioContext || (this.audioContext = new AudioContext()); }
        getSong() { return this.song; }
        getStartingBeatsPerMinute() { return this.song.beatsPerMinute; }
        getStartingPausesPerBeat() { return this.song.pausesPerBeat; }
        getStartingBeatsPerMeasure() { return this.song.beatsPerMeasure; }

        connectedCallback() {
            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));

            if(this.getSongURL())
                this.loadSong(this.getSongURL(), function() {

                }.bind(this));

            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');
        }

        getSongURL() { return this.getAttribute('src');}

        loadSongData(songData) {
            songData.beatsPerMinute =   (songData.beatsPerMinute || DEFAULT_BEATS_PER_MINUTE);
            songData.pausesPerBeat =    (songData.pausesPerBeat || DEFAULT_PAUSES_PER_BEAT);
            songData.beatsPerMeasure =  (songData.beatsPerMeasure || DEFAULT_BEATS_PER_MEASURE);
            songData.instruments = (songData.instruments || []);
            songData.instructions = this.processInstructions(songData.instructions || [], songData.instruments);
            songData.instructionGroups = songData.instructionGroups || {};
            Object.keys(songData.instructionGroups).map(function(key) {
                songData.instructionGroups[key] = this.processInstructions(songData.instructionGroups[key], songData.instruments);
            }.bind(this));
            this.song = songData;
            // this.update();
        }

        processInstructions(instructionList, songInstruments) {
            let lastInstruction = instructionList[0];
            var pauseNotes = [];
            for (let i = 0; i < instructionList.length; i++) {
                let instruction = instructionList[i];
                switch (typeof instruction) {
                    case 'number':
                        instruction = instructionList[i] = {type: "pause", pause: instruction};
                        break;
                    case 'string':
                        instruction = instructionList[i] = Object.assign({}, lastInstruction, {type: "note", frequency: instruction});
                        break;
                    case 'object':
                        if (Array.isArray(instruction))
                            instruction = instructionList[i]
                                = Object.assign({}, lastInstruction, {
                                type: "note",
                                frequency: instruction[0],
                                length: instruction[1]
                            });
                        switch (instruction.type) {
                            case 'note':
                                if (typeof instruction.instrument === 'string')
                                    instruction.instrument = this.findInstrumentID(instruction.instrument, songInstruments);
                                if(typeof instruction.duration === 'undefined') // Note's duration equals the next paus
                                    pauseNotes.push(instruction);
                        }
                        break;
                }

                switch(instruction.type) {
                    case 'note':
                        lastInstruction = instruction;
                        break;

                    case 'pause':
                        for(var pni=0; pni<pauseNotes.length; pni++)
                            pauseNotes[pni].duration = instruction.pause;
                        pauseNotes = [];
                        break;
                }
            }
            return instructionList;
        }

        loadSong(songURL, onLoaded) {
//             console.log('Song loading:', songURL);
            loadJSON(songURL, function(err, json) {
                if(err)
                    throw new Error("Could not load song: " + err);
                if(!json)
                    throw new Error("Invalid JSON File: " + songURL);

                this.setAttribute('src', songURL);

                // Load Scripts
                let scriptsLoading = 0;
                if(json.load) {
                    for(let i=0; i<json.load.length; i++) {
                        const scriptPath = json.load[i];
                        scriptsLoading++;
                        loadScript.call(this, scriptPath, function() {
                            // console.log("Scripts loading: ", scriptsLoading);
                            scriptsLoading--;
                            if(scriptsLoading === 0) {
                                loadJSON.call(this);
                                onLoaded && onLoaded(json); // initInstructions.call(this);
                            }
                        }.bind(this));
                    }
                }
                if(scriptsLoading === 0) {
                    loadJSON.call(this);
                    onLoaded && onLoaded(json); // initInstructions.call(this);
                }
                function loadJSON() {
                    this.loadSongData(json);
                    console.log('Song loaded:', this.song);
                }
            }.bind(this));
        }

        playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, instruction) {
            const instrumentPath = this.getInstrumentPath(instrumentID);
            const instrument = this.getInstrument(instrumentPath);
            if(instrument.getNamedFrequency)
                noteFrequency = instrument.getNamedFrequency(noteFrequency);
            noteFrequency = this.getInstructionFrequency(noteFrequency);
            var currentTime = this.getAudioContext().currentTime;

            const noteEvent = instrument(this.getAudioContext(), {
                frequency: noteFrequency,
                startTime: noteStartTime,
                startOffset: noteStartTime,
                duration: noteDuration,
                instruction: instruction,
                instrumentPath: instrumentPath,
            });

            if(noteStartTime > currentTime)
                setTimeout(function() {
                    dispatchEvent.call(this, true);
                }.bind(this), (noteStartTime - currentTime) * 1000);
            else {
                // Start immediately
                dispatchEvent.call(this, true);
            }

            if(noteDuration) {
                setTimeout(function() {
                    dispatchEvent.call(this, false);
                }.bind(this), (noteStartTime - currentTime + noteDuration) * 1000);
            }

            function dispatchEvent(playing) {
                const type = playing ? 'note:start' : 'note:end';
                this.dispatchEvent(new CustomEvent(type, {
                    detail: {
                        playing: playing,
                        instruction: instruction,
                        startTime: noteStartTime,
                        duration: noteDuration,
                        noteEvent: noteEvent
                    }
                }));
            }

            return noteEvent;
        }

        findInstructionGroup(instruction) {
            if(this.song.instructions.indexOf(instruction) !== -1)
                return null;
            for(let groupName in this.song.instructionGroups) {
                if(this.song.instructionGroups.hasOwnProperty(groupName)) {
                    if(this.song.instructionGroups[groupName].indexOf(instruction) !== -1)
                        return groupName;
                }
            }
            throw new Error("Instruction not found in song");
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

        playInstruction(instruction, noteStartTime, bpm) {
            if(instruction.type === 'note') {
                const instrumentName = instruction.instrument;
                const noteFrequency = instruction.frequency;
                const noteDuration = (instruction.duration || 1) * (240 / (bpm || 240));
                return this.playInstrument(instrumentName, noteFrequency, noteStartTime, noteDuration, instruction);
            }
            return null;
        }

        playInstructions(instructionList, seekPosition, seekLength) {
            instructionList = instructionList || this.song.instructions;
            return this.eachInstruction(instructionList, function(noteInstruction, currentPosition, currentBPM) {
                if(currentPosition < seekPosition)
                    return;   // Instructions were already played
                if(seekLength && currentPosition >= seekPosition + seekLength)
                    return;
                this.playInstruction(noteInstruction, this.startTime + currentPosition, currentBPM);
            }.bind(this));
        }

        eachInstruction(instructionList, callback) {

            var currentBPM = this.getStartingBeatsPerMinute();
            return playGroup.call(this, instructionList, currentBPM, 0);

            function playGroup(instructionList, currentBPM, groupPlaytimeOffset) {
                let currentPosition = 0;
                var currentGroupPlayTime = groupPlaytimeOffset;
                var maxPlayTime = 0;
                for(let i=0; i<instructionList.length; i++) {
                    const instruction = instructionList[i];

                    switch(instruction.type) {
                        case 'note':
                            callback(instruction, currentGroupPlayTime, currentBPM);
                            break;

                        case 'pause':
                            currentPosition += instruction.pause;
                            currentGroupPlayTime += instruction.pause * (240 / currentBPM);
                            break;

                        case 'group':
                            // if(currentPosition < startPosition) // Execute all groups each time
                            //     continue;
                            let instructionGroupList = this.song.instructionGroups[instruction.group];
                            if(!instructionGroupList)
                                throw new Error("Instruction group not found: " + instruction.group);
                            var subGroupPlayTime = playGroup.call(this, instructionGroupList, currentBPM, currentGroupPlayTime);
                            if(subGroupPlayTime > maxPlayTime)
                                maxPlayTime = subGroupPlayTime;
                            break;
                        default:
                            console.warn("Unknown instruction type: " + instruction.type, instruction);
                    }
                }
                if(currentGroupPlayTime > maxPlayTime)
                    maxPlayTime = currentGroupPlayTime;
                return maxPlayTime;
            }
        }


        // Edit Song

        setInstruction(position, instruction, groupName) {
            const instructionList = this.getInstructions(groupName);
            if(instructionList.length < position)
                throw new Error("Invalid instruction position: " + position + (groupName ? " for group: " + groupName : ''));
            instructionList[position] = instruction;
        }

        swapInstructions(instruction1, instruction2, groupName) {
            const p1 = this.getInstructionPosition(instruction1, groupName);
            const p2 = this.getInstructionPosition(instruction2, groupName);
            this.setInstruction(p2, instruction1);
            this.setInstruction(p1, instruction2);
        }

        addSongInstrument(instrumentPath, config) {
            const instrumentList = this.getSong().instruments;
            const instrument = this.getInstrument(instrumentPath);
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

        // Playback

        play (seekPosition) {
            this.seekPosition = seekPosition || 0;

            // this.lastInstructionPosition = 0;
            this.startTime = this.getAudioContext().currentTime - this.seekPosition;
            // console.log("Start playback:", this.startTime);
            this.playing = true;
            this.processPlayback();

            this.dispatchEvent(new CustomEvent('song:start'));
        }

        pause() {
            this.playing = false;
            this.dispatchEvent(new CustomEvent('song:pause'));
        }

        processPlayback () {
            if(this.playing === false) {
                console.info("Playing paused");
                return;
            }
            var totalPlayTime = this.playInstructions(
                this.song.instructions,
                this.seekPosition,
                this.seekLength
            );

            // this.seekPosition += this.seekLength;
            var currentTime = this.getAudioContext().currentTime;
            var finishTime = this.startTime + totalPlayTime;
            // this.seekPosition = currentTime - this.startTime;
            this.seekPosition += this.seekLength;

            if(currentTime < finishTime) {
                // console.log("Instructions playing:", instructionEvents, this.seekPosition, this.currentPosition);

                this.dispatchEvent(new CustomEvent('song:playback'));
                setTimeout(this.processPlayback.bind(this), this.seekLength * 1000);
            } else{

                setTimeout(function() {
                    console.log("Song finished. Play time: ", totalPlayTime);
                    this.seekPosition = 0;
                    this.playing = false;

                    // Update UI
                    this.dispatchEvent(new CustomEvent('song:end'));
                }.bind(this), finishTime - currentTime)
            }
        }

        findInstrumentID(instrumentPath, songInstrumentList) {
            songInstrumentList = songInstrumentList || this.song.instruments;
            for(let i=0; i<songInstrumentList.length; i++) {
                const instrument = songInstrumentList[i];
                if(instrument.path === instrumentPath)
                    return i;
            }
            throw new Error("Song instrument was not found: " + instrumentPath);
        }

        getInstrumentPath(instrumentID) {
            if(typeof instrumentID !== "number")
                throw new Error("Invalid instrumentID");
            let instrumentConfig = this.song.instruments[instrumentID];
            if(!instrumentConfig)
                throw new Error("Invalid Instrument ID: " + instrumentID);
            if(!instrumentConfig.path)
                throw new Error("Invalid Instrument Config: " + instrumentConfig);
            return instrumentConfig.path;
        }

        getInstrument(fullPath) {
            if(!window.instruments)
                throw new Error("window.instruments is not loaded");

            if(!fullPath)
                throw new Error("Invalid instrument path");

            var pathSplit = fullPath.split(':');
            var pathDomain = pathSplit[0];
            if(!window.instruments[pathDomain])
                throw new Error("Instrument domain not found: " + pathDomain);
            var collection = window.instruments[pathDomain];

            var pathInstrument = pathSplit[1];
            if(!collection[pathInstrument])
                throw new Error("Instrument not found: " + pathInstrument);

            return collection[pathInstrument];
        }

        getInstructionFrequency (instruction) {
            if(Number(instruction) === instruction && instruction % 1 !== 0)
                return instruction;
            const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
            let octave,
                keyNumber;

            if (instruction.length === 3) {
                octave = instruction.charAt(2);
            } else {
                octave = instruction.charAt(1);
            }

            keyNumber = instructions.indexOf(instruction.slice(0, -1));

            if (keyNumber < 3) {
                keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1;
            } else {
                keyNumber = keyNumber + ((octave - 1) * 12) + 1;
            }

            // console.log("Instruction: ", instruction, octave, keyNumber);

            // Return frequency of instruction
            return 440 * Math.pow(2, (keyNumber- 49) / 12);
        }
        // Input

        onInput(e) {
            if(e.defaultPrevented)
                return;
            switch(e.type) {
                case 'click':
                    break;
            }
        }
    }

    // Define custom elements
    customElements.define('music-player', MusicPlayerElement);


    // Load Javascript dependencies
    loadStylesheet('music/player/music-player.css');

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
    function loadJSON(jsonPath, onLoaded) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', jsonPath, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            onLoaded(xhr.status !== 200 ? xhr.status : null, xhr.response);
        };
        xhr.send();
    }


    // function normalizeInstructionName(commandString) {
    //     switch(commandString.toLowerCase()) {
    //         case 'n':   case 'instruction':            return 'Instruction';
    //         case 'ge':  case 'groupexecute':    return 'GroupExecute';
    //         case 'p':   case 'pause':           return 'Pause';
    //     }
    //     throw new Error("Unknown command: " + commandString);
    // }


    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    }

})();
