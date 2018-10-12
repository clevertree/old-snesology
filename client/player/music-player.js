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
            this.loadedInstruments = [];
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
            this.song = songData;
            Object.keys(songData.instructions).map((groupName, i) =>
                this.processInstructions(groupName));
            // TODO check all groups were processed
            // this.update();
        }

        processInstructions(groupName) {
            const instructionList = this.song.instructions[groupName];
            if(!instructionList)
                throw new Error("Group instructions not found: " + groupName);
            // let pauseNotes = [];
            for (let i = 0; i < instructionList.length; i++)
                instructionList[i] = this.processInstruction(instructionList[i]);
        }

        processInstruction(instruction) {
            if (typeof instruction === 'number')
                instruction = {command: '!pause', duration: instruction};
            if (typeof instruction === 'string')
                instruction = instruction.split(':');
            if (Array.isArray(instruction))
                instruction = function(args) {
                    const instruction = {command: args[0]};
                    if(args.length>1)   instruction.duration = args[1];
                    return instruction;
                }(instruction);
            if (typeof instruction.instrument === 'string')
                instruction.instrument = this.findInstrumentID(instruction.instrument, this.song.instruments);
            return instruction;
        }

        loadSongFromURL(songURL, onLoaded) {
            const playerElm = this;
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
                        const url = songJSON.instruments[i].source;
                        if(loadFiles.indexOf(url) === -1)
                            loadFiles.push(url);
                    }
                }

                playerElm.setAttribute('src', songURL);

                // Load Scripts
                let scriptsLoading = 0;
                if(loadFiles) {
                    for(let i=0; i<loadFiles.length; i++) {
                        const scriptPath = loadFiles[i];
                        scriptsLoading++;
                        loadScript.call(playerElm, scriptPath, function() {
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
                    playerElm.loadSongData(songJSON);
                    console.log('Song loaded:', playerElm.song);
                }
            });
        }

        playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity) {
            const instrument = this.getInstrument(instrumentID);
            if(instrument.getNamedFrequency)
                noteFrequency = instrument.getNamedFrequency(noteFrequency);
            noteFrequency = this.getInstructionFrequency(noteFrequency);

            const context = this.getAudioContext();
            const destination = this.getVolumeGain();

            let velocityGain = context.createGain();
            velocityGain.gain.value = noteVelocity / 100;
            velocityGain.connect(destination);

            return instrument.play(velocityGain, noteFrequency, noteStartTime, noteDuration);
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

            const instrumentID = typeof instruction.instrument === 'undefined'
                ? stats.groupInstruction.instrument || 0
                : instruction.instrument // TO
            const noteFrequency = instruction.command;
            const currentTime = this.getAudioContext().currentTime;


            const bpm = stats.currentBPM || 60;
            const noteDuration = (instruction.duration || 1) * (60 / bpm);

            // Velocity
            let noteVelocity = typeof instruction.velocity !== 'undefined' ? instruction.velocity : 100;
            if(stats.groupInstruction && stats.groupInstruction.velocity)
                noteVelocity *= stats.groupInstruction.velocity/100;
            const audioNode = this.playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity);

            const noteEventData = {
                audioNode: audioNode,
                frequency: noteFrequency,
                startTime: noteStartTime,
                duration: noteDuration,
                instrumentPreset: this.song.instruments[instrumentID],
                instruction: instruction,
                // groupInstruction: stats.groupInstruction,
                stats: stats || {}
            };

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

                    if(typeof instruction.command !== "undefined") {
                        if (instruction.command[0] === '!') {
                            const functionName = instruction.command.substr(1);
                            switch(functionName) {
                                case 'pause':
                                    stats.groupPosition += instruction.duration;
                                    stats.groupPlaytime += instruction.duration * (60 / stats.currentBPM);
                                    if(stats.groupPlaytime > stats.maxPlaytime)
                                        stats.maxPlaytime = stats.groupPlaytime;
                                    break;

                                default:
                                    console.error("Unknown function: " + instruction.command);
                                    break;
                            }

                        } else if (instruction.command[0] === '@') {
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
                            const substats = Object.assign({}, stats);
                            substats.parentBPM = stats.currentBPM;
                            substats.parentPosition = stats.groupPosition + stats.parentPosition;
                            substats.parentPlaytime = stats.groupPlaytime + stats.parentPlaytime;
                            substats.groupInstruction = instruction;
                            substats.currentGroup = groupName;
                            const subGroupPlayTime = playGroup.call(this, instructionGroupList, substats);
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



        replaceInstruction(groupName, replacePosition, replaceCount, replaceInstructions) {
            let instructionList = this.getInstructions(groupName);
            if (instructionList.length < replacePosition)
                throw new Error("Replace position out of index: " + instructionList.length + " < " + replacePosition + " for groupName: " + groupName);

            if(replaceInstructions)
                return instructionList.splice(replacePosition, replaceCount, replaceInstructions);
            return instructionList.splice(replacePosition, replaceCount);
        }

        insertInstructions(groupName, insertPosition, insertInstructions) {
            let instructionList = this.getInstructions(groupName);
            if (instructionList.length < insertPosition)
                throw new Error("Insert position out of index: " + instructionList.length + " < " + insertPosition + " for groupName: " + groupName);

            if(!Array.isArray(insertInstructions))
                insertInstructions = [insertInstructions];
            for(let i=insertInstructions.length-1; i>=0; i--) // Insert backwards
                instructionList.splice(insertPosition, 0, insertInstructions[i]);
        }

        deleteInstructions(groupName, deletePosition, deleteCount) {
            let instructionList = this.getInstructions(groupName);
            if (instructionList.length < deletePosition)
                throw new Error("Delete position out of index: " + instructionList.length + " < " + deletePosition + " for groupName: " + groupName);
            return instructionList.splice(deletePosition, deleteCount);
        }

        replaceInstructionParams(groupName, replacePosition, replaceParams) {
            let instructionList = this.getInstructions(groupName);
            if (replacePosition === null || typeof replacePosition === "undefined")
                throw new Error("Invalid replacePosition for groupName: " + groupName);
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

        addInstructionGroup(newGroupName, instructionList) {
            const songData = this.getSong();
            if(songData.instructions.hasOwnProperty(newGroupName))
                throw new Error("New group already exists: " + newGroupName);
            songData.instructions[newGroupName] = instructionList || [];
            this.processInstructions(newGroupName);
        }

        removeInstructionGroup(removedGroupName) {
            if(removedGroupName === 'root')
                throw new Error("Cannot remove root instruction group, n00b");
            const songData = this.getSong();
            if(!songData.instructions.hasOwnProperty(removedGroupName))
                throw new Error("Existing group not found: " + removedGroupName);

            const removedGroupData = songData.instructions[removedGroupName];
            delete songData.instructions[removedGroupName];
            return removedGroupData;
        }

        renameInstructionGroup(oldGroupName, newGroupName) {
            const songData = this.getSong();
            if(!songData.instructions.hasOwnProperty(oldGroupName))
                throw new Error("Existing group not found: " + oldGroupName);
            if(songData.instructions.hasOwnProperty(newGroupName))
                throw new Error("New group already exists: " + newGroupName);
            const groupData = songData.instructions[oldGroupName];
            delete songData.instructions[oldGroupName];
            songData.instructions[newGroupName] = groupData;
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

        addInstrument(sourceURL, instrumentConfig) {
            const instrumentList = this.getSong().instruments;
            const instrumentID = instrumentList.length;
            const instrumentPreset = {
                source: sourceURL,
                config: instrumentConfig
            };
            instrumentList[instrumentID] = instrumentPreset
            this.loadInstrument(instrumentPreset, instrumentID);
        }

        replaceInstrumentParams(instrumentID, replaceConfig) {
            const instrumentList = this.getSong().instruments;
            if(!instrumentList[instrumentID])
                throw new Error("Invalid instrument ID: " + instrumentID);

            const presetData = instrumentList[instrumentID];
            const newPresetData = Object.assign({}, presetData);
            const newPresetConfig = newPresetData.config;

            const oldParams = {};
            for(const paramName in replaceConfig) {
                if(replaceConfig.hasOwnProperty(paramName)) {
                    oldParams[paramName] = newPresetConfig[paramName];
                    if(replaceConfig[paramName] === null)
                        delete newPresetConfig[paramName];
                    else
                        newPresetConfig[paramName] = replaceConfig[paramName];
                }
            }
            // Validate
            const instance = this.loadInstrument(newPresetData, instrumentID);
            instrumentList[instrumentID] = newPresetData;

            this.loadedInstruments[instrumentID] = instance;            // Replace instrument with new settings
            return oldParams;
        }

        removeInstrument(instrumentID) {
            const instrumentList = this.getSong().instruments;
            if(!instrumentList[instrumentID])
                throw new Error("Invalid instrument ID: " + instrumentID);
            return instrumentList.splice(instrumentID, 1);
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
        //     let instrumentPreset = this.song.instruments[instrumentID];
        //     if(!instrumentPreset)
        //         throw new Error("Invalid Instrument ID: " + instrumentID);
        //     if(!instrumentPreset.path)
        //         throw new Error("Invalid Instrument Config: " + instrumentPreset);
        //     return instrumentPreset.path;
        // }

        loadInstrument(instrumentPreset, instrumentID) {
            if(!window.instruments)
                throw new Error("window.instruments is not loaded");
            if(!instrumentPreset || !instrumentPreset.source)
                throw new Error("Invalid preset");

            const url = new URL(instrumentPreset.source);
            const path = url.pathname + url.hash;
            const domain = url.hostname;

            if(!window.instruments[domain])
                throw new Error("Instrument domain not found: " + domain);
            const collection = window.instruments[domain];

            if(!collection[path])
                throw new Error("Instrument not found: " + path);

            const instrument = collection[path];
            return new instrument(this.getAudioContext(), instrumentPreset, instrumentID);
        }

        getInstrument(instrumentID, reload) {
            if(!reload && this.loadedInstruments[instrumentID])
                return this.loadedInstruments[instrumentID];

            let instrumentPreset = this.song.instruments[instrumentID];
            const instance = this.loadInstrument(instrumentPreset, instrumentID);

            this.loadedInstruments[instrumentID] = instance;
            return instance;
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
