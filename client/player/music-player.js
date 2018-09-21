/**
 * Player requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions. Pauses are implied by the scale
 */

(function() {
    const DEFAULT_BEATS_PER_MINUTE = 160;
    // const DEFAULT_PAUSES_PER_BEAT = 4;
    const DEFAULT_BEATS_PER_MEASURE = 4;
    const DEFAULT_GROUP = 'root';
    const DEFAULT_VOLUME = 30;
    // if (!window.MusicPlayer)
    //     window.MusicPlayer = MusicPlayer;

    class MusicPlayerElement extends HTMLElement {
        constructor() {
            super();
            this.audioContext = null;
            this.song = null;
            this.seekLength = 4;
            this.seekPosition = 0;
            this.volumeGain = null;
            this.playing = false;
            this.config = DEFAULT_CONFIG;
            this.loadSongData({});
        }

        getAudioContext() { return this.audioContext || (this.audioContext = new (window.AudioContext||window.webkitAudioContext)()); }
        getSong() { return this.song; }
        getStartingBeatsPerMinute() { return this.song.beatsPerMinute; }
        getVolumeGain() {
            if(!this.volumeGain) {
                const context = this.getAudioContext();
                let gain = context.createGain();
                gain.gain.value = DEFAULT_VOLUME / 100;
                gain.connect(context.destination);
                this.volumeGain = gain;
            }
            return this.volumeGain;
        }

        connectedCallback() {
            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));

            if(this.getSongURL())
                this.loadSongFromURL(this.getSongURL());

            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');
        }

        getSongURL() { return this.getAttribute('src');}

        loadSongData(songData) {
            songData.beatsPerMinute =   (songData.beatsPerMinute || DEFAULT_BEATS_PER_MINUTE);
            // songData.pausesPerBeat =    (songData.pausesPerBeat || DEFAULT_PAUSES_PER_BEAT);
            songData.beatsPerMeasure =  (songData.beatsPerMeasure || DEFAULT_BEATS_PER_MEASURE);
            songData.root = songData.root || DEFAULT_GROUP;
            songData.instruments = (songData.instruments || []);
            songData.instructions = (songData.instructions || {});
            songData.instructions[songData.root] = songData.instructions[songData.root] || [];
            Object.keys(songData.instructions).map(function(groupName, i) {
                this.processInstructions(songData, groupName);
            }.bind(this));
            // TODO check all groups were processed
            this.song = songData;
            // this.update();
        }

        processInstructions(songData, groupName) {
            const instructionList = songData.instructions[groupName];
            if(!instructionList)
                throw new Error("Group instructions not found: " + groupName);
            // let pauseNotes = [];
            for (let i = 0; i < instructionList.length; i++) {
                let instruction = instructionList[i];
                if (typeof instruction === 'number')
                    instruction = {pause: instruction};
                if (typeof instruction === 'string')
                    instruction = instruction.split(':');
                if (Array.isArray(instruction))
                    instruction = function(args) {
                        const instruction = {command: args[0]};
                        if(args.length>1)   instruction.duration = args[1];
                        return instruction;
                    }(instruction);
                if (typeof instruction.instrument === 'string')
                    instruction.instrument = this.findInstrumentID(instruction.instrument, songData.instruments);

                instructionList[i] = instruction;

                // Handle pauses
                // if (typeof instruction.pause === 'undefined') { // Note's duration equals the next pause
                //     pauseNotes.push(instruction);
                // } else {
                //     for(let pni=0; pni<pauseNotes.length; pni++)
                //         pauseNotes[pni].duration = instruction.pause;
                //     pauseNotes = [];
                // }
            }
        }

        loadSongFromURL(songURL, onLoaded) {
            const editor = this;
//             console.log('Song loading:', songURL);
            loadJSON(songURL, function(err, songJSON) {
                if(err)
                    throw new Error("Could not load song: " + err);
                if(!songJSON)
                    throw new Error("Invalid JSON File: " + songURL);

                let loadFiles = [];
                if(songJSON.instruments.length === 0) {
                    throw new Error("Song contains no instruments");
                } else {
                    for(let i=0; i<songJSON.instruments.length; i++) {
                        const url = songJSON.instruments[i].url;
                        if(loadFiles.indexOf(url) === -1)
                            loadFiles.push(url);
                    }
                }

                editor.setAttribute('src', songURL);

                // Load Scripts
                let scriptsLoading = 0;
                if(loadFiles) {
                    for(let i=0; i<loadFiles.length; i++) {
                        const scriptPath = loadFiles[i];
                        scriptsLoading++;
                        loadScript.call(editor, scriptPath, function() {
                            // console.log("Scripts loading: ", scriptsLoading);
                            scriptsLoading--;
                            if(scriptsLoading === 0) {
                                loadJSON();
                                onLoaded && onLoaded(songJSON); // initInstructions.call(THIS);
                            }
                        });
                    }
                }
                if(scriptsLoading === 0) {
                    loadJSON();
                    onLoaded && onLoaded(songJSON); // initInstructions.call(THIS);
                }
                function loadJSON() {
                    editor.loadSongData(songJSON);
                    console.log('Song loaded:', editor.song);
                }
            });
        }

        playInstrument(instrumentID, noteFrequency, noteStartTime, instruction, stats) {
            let instrumentConfig = this.song.instruments[instrumentID];
            // const instrumentPath = this.getInstrumentPath(instrumentID);
            const instrument = this.getInstrument(instrumentConfig.url);
            if(instrument.getNamedFrequency)
                noteFrequency = instrument.getNamedFrequency(noteFrequency);
            noteFrequency = this.getInstructionFrequency(noteFrequency);
            const currentTime = this.getAudioContext().currentTime;

            const context = this.getAudioContext();
            const destination = this.getVolumeGain();

            const bpm = stats.currentBPM || 60;
            const noteDuration = (instruction.duration || 1) * (60 / bpm);
            const noteEventData = {
                noteEvent: null,
                frequency: noteFrequency,
                startTime: noteStartTime,
                startOffset: noteStartTime,
                duration: noteDuration,
                instrumentConfig: instrumentConfig,
                instruction: instruction,
                groupInstruction: stats.groupInstruction,
                stats: stats || {},
                calculateVelocity: function() {
                    let calculatedVelocity = typeof instruction.velocity !== 'undefined' ? instruction.velocity : 100;
                    if(stats.groupInstruction && stats.groupInstruction.velocity)
                        calculatedVelocity *= stats.groupInstruction.velocity/100;
                    return calculatedVelocity;
                },
                connectGain: function(source) {
                    // Velocity
                    let gain = context.createGain();
                    gain.gain.value = this.calculateVelocity() / 100;
                    source.connect(gain);
                    gain.connect(destination);
                    return gain;
                },
                connect: function(source) {
                    this.connectGain(source);
                }
            };

            const noteEvent = instrument(context, noteEventData);
            noteEventData.noteEvent = noteEvent;

            if(noteStartTime > currentTime)
                setTimeout(function() {
                    this.dispatchEvent(new CustomEvent('note:start', {detail: noteEventData}));
                }.bind(this), (noteStartTime - currentTime) * 1000);
            else {
                // Start immediately
                this.dispatchEvent(new CustomEvent('note:start', {detail: noteEventData}));
            }

            if(noteDuration) {
                setTimeout(function() {
                    this.dispatchEvent(new CustomEvent('note:end', {detail: noteEventData}));
                }.bind(this), (noteStartTime - currentTime + noteDuration) * 1000);
            }

            return noteEvent;
        }

        findInstructionGroup(instruction) {
            if(typeof instruction !== 'object')
                throw new Error("Invalid instruction object");
            for(let groupName in this.song.instructions) {
                if(this.song.instructions.hasOwnProperty(groupName)) {
                    if(this.song.instructions[groupName].indexOf(instruction) !== -1)
                        return groupName;
                }
            }
            throw new Error("Instruction not found in song");
        }

        getInstructions(groupName) {
            let instructionList = this.song.instructions[groupName];
            if(!instructionList)
                throw new Error("Instruction groupName not found: " + groupName);
            return instructionList;
        }

        getInstructionPosition(instruction, groupName) {
            const instructionList = this.song.instructions[groupName];
            const p = instructionList.indexOf(instruction);
            if(p === -1)
                throw new Error("Instruction not found in instruction list");
            return p;
        }

        // getInstructionGroup(instruction) {
        //     for(let groupName in this.song.instructions)
        //         if(this.song.instructions.hasOwnProperty(groupName))
        //             if(this.song.instructions[groupName].indexOf(instruction) !== -1)
        //                 return groupName;
        //     throw new Error("Instruction not found in any groupName");
        // }

        playInstruction(instruction, noteStartTime, stats) {
            if (instruction.command[0] === '@') {
                const commandGroup = instruction.command.substr(1);
                // TODO: play groups too
            }

            const instrumentID = instruction.instrument || 0; // TODO: use current set instrument
            const noteFrequency = instruction.command;
            return this.playInstrument(instrumentID, noteFrequency, noteStartTime, instruction, stats);
        }

        playInstructions(instructionGroup, playbackPosition, playbackLength, currentTime) {
            playbackPosition = playbackPosition || 0;
            currentTime = currentTime || this.getAudioContext().currentTime;
            // instructionList = instructionList || this.song.instructions;
            return this.eachInstruction(instructionGroup, function(noteInstruction, stats) {
                if(stats.absolutePlaytime < playbackPosition)
                    return;   // Instructions were already played
                if(playbackLength && stats.absolutePlaytime >= playbackPosition + playbackLength)
                    return;
                // console.log("Note played", noteInstruction, stats, seekPosition, seekLength);
                this.playInstruction(noteInstruction, currentTime + stats.absolutePlaytime, stats);
            }.bind(this));
        }


        eachInstruction(rootGroup, callback) {
            rootGroup = rootGroup || DEFAULT_GROUP;
            const instructionList = this.getInstructions(rootGroup);
            const currentBPM = this.getStartingBeatsPerMinute();
            return playGroup.call(this, instructionList, {
                "parentBPM": currentBPM,
                "parentPosition": 0,
                "parentPlaytime": 0,
                "currentGroup": rootGroup,
            });

            function playGroup(instructionList, stats) {
                stats = Object.assign({}, stats);
                stats.currentBPM = stats.parentBPM;
                stats.parentPosition = stats.parentPosition || 0;
                stats.groupPosition = 0;
                stats.groupPlaytime = 0;
                stats.maxPlaytime = 0;
                for(let i=0; i<instructionList.length; i++) {
                    const instruction = instructionList[i];

                    if(instruction.pause) {
                        stats.groupPosition += instruction.pause;
                        stats.groupPlaytime += instruction.pause * (60 / stats.currentBPM);
                        if(stats.groupPlaytime > stats.maxPlaytime)
                            stats.maxPlaytime = stats.groupPlaytime;
                    }

                    if(typeof instruction.command !== "undefined") {
                        if (instruction.command[0] === '@') {
                            // if(groupPosition < startPosition) // Execute all groups each time
                            //     continue;
                            let groupName = instruction.command.substr(1);
                            let instructionGroupList = this.song.instructions[groupName];
                            if (!instructionGroupList)
                                throw new Error("Instruction groupName not found: " + groupName);
                            if(groupName === stats.currentGroup) { // TODO group stack
                                console.error("Recursive group call. Skipping group '" + groupName + "'");
                                continue;
                            }
                            // console.log("Group Offset", instruction.groupName, currentGroupPlayTime);
                            stats.parentBPM = stats.currentBPM;
                            stats.parentPosition = stats.groupPosition + stats.parentPosition;
                            stats.parentPlaytime = stats.groupPlaytime + stats.parentPlaytime;
                            stats.groupInstruction = instruction;
                            stats.currentGroup = groupName;
                            const subGroupPlayTime = playGroup.call(this, instructionGroupList, stats);
                            if (subGroupPlayTime > stats.maxPlaytime)
                                stats.maxPlaytime = subGroupPlayTime;

                        } else {
                            stats.parentBPM = stats.currentBPM;
                            stats.absolutePosition = stats.groupPosition + stats.parentPosition;
                            stats.absolutePlaytime = stats.groupPlaytime + stats.parentPlaytime;
                            callback(instruction, stats);
                        }
                    }

                }
                if(stats.groupPlaytime > stats.maxPlaytime)
                    stats.maxPlaytime = stats.groupPlaytime;
                return stats.maxPlaytime;
            }
        }


        // Edit Song

        resetInstructions() {
            // TODO: unfinished
            if(this.getSongURL())
                this.loadSongFromURL(this.getSongURL());
        }

        replaceInstruction(groupName, replacePosition, replaceCount, replaceInstruction) {
            let instructionList = this.getInstructions(groupName);
            if (instructionList.length < replacePosition)
                throw new Error("Replace position out of index: " + instructionList.length + " < " + replacePosition + " for groupName: " + groupName);

            if(replaceInstruction)
                return instructionList.splice(replacePosition, replaceCount, replaceInstruction);
            return instructionList.splice(replacePosition, replaceCount);
        }

        replaceInstructionParams(groupName, replacePosition, replaceParams) {
            let instructionList = this.getInstructions(groupName);
            if (instructionList.length < replacePosition)
                throw new Error("Replace position out of index: " + instructionList.length + " < " + replacePosition + " for groupName: " + groupName);

            const instruction = instructionList[replacePosition];
            const oldParams = {};
            for(const paramName in replaceParams) {
                if(replaceParams.hasOwnProperty(paramName)) {
                    oldParams[paramName] = instruction[paramName];
                    if(replaceParams[paramName] === null)
                        delete instruction[paramName];
                    else
                        instruction[paramName] = replaceParams[paramName];
                }
            }
            return oldParams;
        }


        // setInstruction(position, instruction, groupName) {
        //     const instructionList = this.getInstructions(groupName);
        //     if(instructionList.length < position)
        //         throw new Error("Invalid instruction position: " + position + (groupName ? " for groupName: " + groupName : ''));
        //     instructionList[position] = instruction;
        // }

        // swapInstructions(instruction1, instruction2, groupName) {
        //     const p1 = this.getInstructionPosition(instruction1, groupName);
        //     const p2 = this.getInstructionPosition(instruction2, groupName);
        //     this.setInstruction(p2, instruction1);
        //     this.setInstruction(p1, instruction2);
        // }

        addSongInstrument(instrumentPath, config) {
            const instrumentList = this.getSong().instruments;
            const instrument = this.getInstrument(instrumentPath);
            const instrumentID = instrumentList.length;
            const defaultName = instrument.getDefaultName ? instrument.getDefaultName(instrumentPath)
                : instrumentPath.substr(instrumentPath.lastIndexOf('.') + 1);
            config = Object.assign({path: instrumentPath}, config || {}, {name: defaultName});
            config.name = prompt("New Instrument Name (" + (instrumentID) + "): ", config.name);
            if(!config.name)
                throw new Error("Invalid new instrument name");
            instrumentList[instrumentID] = config;
            return instrumentID;
        }

        // Playback

        setVolume (volume) {
            const gain = this.getVolumeGain();
            if(gain.gain.value !== volume) {
                gain.gain.value = volume / 100;
                console.info("Setting volume: ", volume);
            }
        }

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
            const startTime = this.seekPosition;
            const currentTime = this.getAudioContext().currentTime - this.startTime;
            let endTime = startTime + this.seekLength;
            while(endTime < currentTime)
                endTime += this.seekLength;
            this.seekPosition = endTime;

            const totalPlayTime = this.playInstructions(
                this.song.root || DEFAULT_GROUP,
                startTime,
                endTime,
                this.startTime
            );

            // this.seekPosition += this.seekLength;
            // this.seekPosition = currentTime - this.startTime;
            // this.seekPosition += this.seekLength;

            if(currentTime < totalPlayTime) {
                console.log("Instructions playing:", this.seekPosition, this.seekLength, currentTime - this.startTime);

                this.dispatchEvent(new CustomEvent('song:playback'));
                setTimeout(this.processPlayback.bind(this), this.seekLength * 1000);
            } else{

                setTimeout(function() {
                    console.log("Song finished. Play time: ", totalPlayTime);
                    this.seekPosition = 0;
                    this.playing = false;

                    // Update UI
                    this.dispatchEvent(new CustomEvent('song:end'));
                }.bind(this), totalPlayTime - currentTime)
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

        // getInstrumentPath(instrumentID) {
        //     if(typeof instrumentID !== "number")
        //         throw new Error("Invalid instrumentID");
        //     let instrumentConfig = this.song.instruments[instrumentID];
        //     if(!instrumentConfig)
        //         throw new Error("Invalid Instrument ID: " + instrumentID);
        //     if(!instrumentConfig.path)
        //         throw new Error("Invalid Instrument Config: " + instrumentConfig);
        //     return instrumentConfig.path;
        // }

        getInstrument(url) {
            if(!window.instruments)
                throw new Error("window.instruments is not loaded");

            if(!url)
                throw new Error("Invalid instrument path");

            const l = document.createElement("a");
            l.href = url;
            const path = l.pathname;
            const domain = l.hostname;

            if(!window.instruments[domain])
                throw new Error("Instrument domain not found: " + domain);
            const collection = window.instruments[domain];

            if(!collection[path])
                throw new Error("Instrument not found: " + path);

            return collection[path];
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
    loadStylesheet('client/player/music-player.css');

    function loadScript(scriptPath, onLoaded) {
        let scriptPathEsc = scriptPath.replace(/[/.]/g, '\\$&');
        let scriptElm = document.head.querySelector('script[src$="' + scriptPathEsc + '"]');
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
