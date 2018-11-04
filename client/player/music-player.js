/**
 * Player requires a modern browser
 */

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
        this.config = {
            volume: 0.3
        };
        this.loadSongData({}, ()=>{});
    }

    getAudioContext() { return this.audioContext || (this.audioContext = new (window.AudioContext||window.webkitAudioContext)()); }
    getSong() { return this.song; }
    getStartingBeatsPerMinute() { return this.song.beatsPerMinute; }
    getVolumeGain() {
        if(!this.volumeGain) {
            const context = this.getAudioContext();
            let gain = context.createGain();
            gain.gain.value = this.config.volume;
            gain.connect(context.destination);
            this.volumeGain = gain;
        }
        return this.volumeGain;
    }

    connectedCallback() {
        this.addEventListener('keydown', this.onInput.bind(this));
        this.addEventListener('keyup', this.onInput.bind(this));
        this.addEventListener('click', this.onInput.bind(this));

        // if(this.getSongURL())
        //     this.loadSongFromURL(this.getSongURL());

        if(!this.getAttribute('tabindex'))
            this.setAttribute('tabindex', '1');
    }

    // getSongURL() { return this.getAttribute('src');}

    loadSongData(songData, onLoadComplete) {
        songData.beatsPerMinute =   (songData.beatsPerMinute || 160);
        // songData.pausesPerBeat =    (songData.pausesPerBeat || DEFAULT_PAUSES_PER_BEAT);
        songData.beatsPerMeasure =  (songData.beatsPerMeasure || 4);
        songData.root = songData.root || 'root';
        songData.instruments = (songData.instruments || []);
        songData.instructions = (songData.instructions || {});
        songData.instructions[songData.root] = songData.instructions[songData.root] || [];
        this.song = songData;
        Object.keys(songData.instructions).map((groupName, i) =>
            this.processInstructions(groupName));
        // TODO check all groups were processed

        // let loadFiles = [];
        let scriptsLoading = 0;
        const instrumentCount = songData.instruments.length;
        if(instrumentCount === 0) {
            // console.warn("Song contains no instruments");
        } else {
            for(let instrumentID=0; instrumentID<instrumentCount; instrumentID++) {
                // const url = songData.instruments[instrumentID].url;
                // if(loadFiles.indexOf(url) === -1) {
                //     loadFiles.push(url);
                scriptsLoading++;
                // const config = songData.instruments[instrumentID].config;
                this.initInstrument(instrumentID, () => {

                    // console.log("Scripts loading: ", scriptsLoading);
                    scriptsLoading--;
                    if(scriptsLoading === 0)
                        onLoadComplete();
                });
                // }
            }
        }
        if(scriptsLoading === 0)
            onLoadComplete();

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



//         loadSongFromURL(songURL, onLoaded) {
//             const playerElm = this;
// //             console.log('Song loading:', songURL);
//             loadJSON(songURL, function(err, songJSON) {
//                 if(err)
//                     throw new Error("Could not load song: " + err);
//                 if(!songJSON)
//                     throw new Error("Invalid JSON File: " + songURL);
//
//             });
//         }

    playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity) {
        const instrument = this.loadedInstruments[instrumentID];

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
        // if (instruction.command[0] === '@') {
        //     const commandGroup = instruction.command.substr(1);
            // TODO: play groups too
        // }

        const currentTime = this.getAudioContext().currentTime;
        let instrumentID = instruction.instrument;
        let noteFrequency = instruction.command;
        let noteVelocity = typeof instruction.velocity !== 'undefined' ? instruction.velocity : 100;
        let bpm = 60;

        if(stats) {
            bpm = stats.currentBPM;
            if(stats.groupInstruction) {
                if(typeof stats.groupInstruction.velocity !== 'undefined')
                    noteVelocity *= stats.groupInstruction.velocity/100;
                if(typeof instrumentID === 'undefined' && typeof stats.groupInstruction.instrument !== 'undefined')
                    instrumentID = stats.groupInstruction.instrument;
            }
        }
        const noteDuration = (instruction.duration || 1) * (60 / bpm);

        if(!instrumentID && instrumentID !== 0) {
            console.warn("No instrument set for instruction. Using instrument 0");
            instrumentID = 0;
            // return;
        }
        if(!this.song.instruments[instrumentID]) {
            console.error(`Instrument ${instrumentID} is not loaded. Playback skipped. `);
            return;
        }




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
        return this.eachInstruction(instructionGroup, function(noteInstruction, groupStats) {
            const absolutePlaytime = groupStats.groupPlaytime + groupStats.parentPlaytime;
            if(absolutePlaytime < playbackPosition)
                return;   // Instructions were already played
            if(playbackLength && absolutePlaytime >= playbackPosition + playbackLength)
                return;
            // console.log("Note played", noteInstruction, stats, seekPosition, seekLength);
            this.playInstruction(noteInstruction, currentTime + absolutePlaytime, groupStats);
        }.bind(this));
    }


    eachInstruction(rootGroup, callback) {
        rootGroup = rootGroup || 'root';
        const instructionList = this.getInstructions(rootGroup);
        const currentBPM = this.getStartingBeatsPerMinute();
        return playGroup.call(this, instructionList, {
            "parentBPM": currentBPM,
            "parentPosition": 0,
            "parentPlaytime": 0,
            "currentGroup": rootGroup,
            "groupInstruction": {
                instrument: 0
            }
        });

        function playGroup(instructionList, groupStats) {
            groupStats.currentBPM = groupStats.parentBPM;
            // groupStats.parentPosition = groupStats.parentPosition || 0;
            groupStats.groupPosition = 0;
            groupStats.groupPlaytime = 0;
            let maxPlaytime = 0;
            for(let i=0; i<instructionList.length; i++) {
                const instruction = instructionList[i];

                if(typeof instruction.command !== "undefined") {
                    if (instruction.command[0] === '!') {
                        const functionName = instruction.command.substr(1);
                        switch(functionName) {
                            case 'pause':
                                groupStats.groupPosition += instruction.duration;
                                groupStats.groupPlaytime += instruction.duration * (60 / groupStats.currentBPM);
                                if(groupStats.groupPlaytime > maxPlaytime)
                                    maxPlaytime = groupStats.groupPlaytime;
                                break;

                            default:
                                console.error("Unknown function: " + instruction.command);
                                break;
                        }

                    } else if (instruction.command[0] === '@') {
                        let groupName = instruction.command.substr(1);
                        let instructionGroupList = this.song.instructions[groupName];
                        if (!instructionGroupList)
                            throw new Error("Instruction groupName not found: " + groupName);
                        if(groupName === groupStats.currentGroup) { // TODO group stack
                            console.error("Recursive group call. Skipping group '" + groupName + "'");
                            continue;
                        }
                        // console.log("Group Offset", instruction.groupName, currentGroupPlayTime);
                        const subGroupPlayTime = playGroup.call(this, instructionGroupList, {
                            "parentBPM": groupStats.currentBPM,
                            "parentPosition": groupStats.groupPosition + groupStats.parentPosition,
                            "parentPlaytime": groupStats.groupPlaytime + groupStats.parentPlaytime,
                            "currentGroup": groupName,
                            "groupInstruction": instruction,
                            "parentStats": groupStats
                        });
                        if (subGroupPlayTime > maxPlaytime)
                            maxPlaytime = subGroupPlayTime;

                    } else {
                        // groupStats.absolutePosition = groupStats.groupPosition + groupStats.parentPosition;
                        // groupStats.absolutePlaytime = groupStats.groupPlaytime + groupStats.parentPlaytime;
                        callback(instruction, groupStats);
                    }
                }

            }
            if(groupStats.groupPlaytime > maxPlaytime)
                maxPlaytime = groupStats.groupPlaytime;
            return maxPlaytime;
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
                if(replaceParams[paramName] === instruction[paramName])
                    continue;
                oldParams[paramName] = typeof instruction[paramName] !== 'undefined' ? instruction[paramName] : null;
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


    addInstrument(url, instrumentConfig, onScriptLoaded) {
        const instrumentList = this.getSong().instruments;
        const instrumentID = instrumentList.length;
        const instrumentPreset = {
            url: url,
            config: instrumentConfig
        };
        instrumentList[instrumentID] = instrumentPreset;
        this.initInstrument(instrumentID, onScriptLoaded);
        return instrumentID;
    }

    initInstrument(instrumentID, onScriptLoaded) {
        const instrumentList = this.getSong().instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Instrument ID not found: " + instrumentID);
        const instrumentPreset = instrumentList[instrumentID];

        // TODO: resolve library
        // if(url.endsWith('.library.json')) {

        // }
        MusicPlayerElement.loadScript(instrumentPreset.url, () => {
            const instance = this.loadInstrumentPreset(instrumentPreset, instrumentID);

            if(this.loadedInstruments[instrumentID] && this.loadedInstruments[instrumentID].unload)
                this.loadedInstruments[instrumentID].unload();
            this.loadedInstruments[instrumentID] = instance;            // Replace instrument with new settings
            onScriptLoaded && onScriptLoaded(instance);
        });
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
                if(replaceConfig[paramName] === newPresetConfig[paramName])
                    continue;
                oldParams[paramName] = typeof newPresetConfig[paramName] !== 'undefined' ? newPresetConfig[paramName] : null;
                if(replaceConfig[paramName] === null)
                    delete newPresetConfig[paramName];
                else
                    newPresetConfig[paramName] = replaceConfig[paramName];
            }
        }
        // Validate
        const instance = this.loadInstrumentPreset(newPresetData);
        instrumentList[instrumentID] = newPresetData;

        if(this.loadedInstruments[instrumentID] && this.loadedInstruments[instrumentID].unload)
            this.loadedInstruments[instrumentID].unload();
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
            this.song.root || 'root',
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

    loadInstrumentPreset(instrumentPreset) {
        if(!instrumentPreset || !instrumentPreset.url)
            throw new Error("Invalid preset");
        if(!window.instruments)
            throw new Error("window.instruments is not loaded");

        const url = new URL(instrumentPreset.url, document.location);

        if(!window.instruments[url.origin])
            throw new Error("Instrument origin not found: " + url.origin);
        const collection = window.instruments[url.origin];

        const path = url.pathname + url.hash;
        if(!collection[path])
            throw new Error("Instrument not found: " + path);

        const instrument = collection[path];
        return new instrument(this.getAudioContext(), instrumentPreset);
    }

    isInstrumentLoaded(instrumentID) {
        return !!this.loadedInstruments[instrumentID];
    }

    getInstrumentInstance(instrumentID) {
        if(!this.loadedInstruments[instrumentID])
            throw new Error("Instrument not loaded: " + instrumentID);
        return this.loadedInstruments[instrumentID];
    }

    getInstructionFrequency (command) {
        if(Number(command) === command && command % 1 !== 0)
            return command;
        const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
        let octave,
            keyNumber;

        if (command.length === 3) {
            octave = command.charAt(2);
        } else {
            octave = command.charAt(1);
        }

        keyNumber = instructions.indexOf(command.slice(0, -1));

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

    // Static


    static loadScript(scriptPath, onLoaded) {
        const scripts = document.head.querySelectorAll('script');
        for(let i=0; i<scripts.length; i++) {
            if(scripts[i].src === scriptPath) {
                if(scripts[i].loaded) {
                    onLoaded();
                } else {
                    scripts[i].onloads.push(onLoaded);
                }
                return scripts[i];
            }
        }
        const newScriptElm = document.createElement('script');
        newScriptElm.src = scriptPath;
        newScriptElm.onloads = [onLoaded];
        newScriptElm.onload = function(e) {
            newScriptElm.loaded = true;
            for(let i=0; i<newScriptElm.onloads.length; i++)
                newScriptElm.onloads[i](e);
        };
        document.head.appendChild(newScriptElm);
        return newScriptElm;
    }

    // static loadStylesheet(styleSheetPath) {
    //     const scripts = document.head.querySelectorAll('link');
    //     for(let i=0; i<scripts.length; i++) {
    //         if(scripts[i].href === styleSheetPath) {
    //             return scripts[i];
    //         }
    //     }
    //     let newStyleSheetElm = document.createElement('link');
    //     newStyleSheetElm.href = styleSheetPath;
    //     newStyleSheetElm.rel = 'stylesheet';
    //     document.head.appendChild(newStyleSheetElm);
    //     return newStyleSheetElm;
    // }
}

// Define custom elements
customElements.define('music-player', MusicPlayerElement);

// MusicPlayerElement.loadStylesheet('client/player/music-player.css');
