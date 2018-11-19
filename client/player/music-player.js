/**
 * Player requires a modern browser
 */

class MusicPlayerElement extends HTMLElement {
    constructor() {
        super();
        this.audioContext = null;
        this.songData = {};
        this.loadedInstruments = [];
        this.seekLength = 4;
        this.seekPosition = 0;
        this.volumeGain = null;
        this.playing = false;
        this.config = {
            volume: 0.3
        };
        this.loadSongData({});
    }

    getAudioContext() { return this.audioContext || (this.audioContext = new (window.AudioContext||window.webkitAudioContext)()); }
    getSongData() { return this.songData; }
    getStartingBeatsPerMinute() { return this.songData.beatsPerMinute; }
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

    loadSongData(songData) {
        songData.beatsPerMinute =   (songData.beatsPerMinute || 160);
        // songData.pausesPerBeat =    (songData.pausesPerBeat || DEFAULT_PAUSES_PER_BEAT);
        songData.beatsPerMeasure =  (songData.beatsPerMeasure || 4);
        songData.root = songData.root || 'root';
        songData.instruments = (songData.instruments || []);
        songData.instructions = (songData.instructions || {});
        songData.instructions[songData.root] = songData.instructions[songData.root] || [];
        this.songData = songData;
        // Object.keys(songData.instructions).map((groupName, i) =>
        //     this.processInstructions(groupName));
        // TODO check all groups were processed

        let loadingInstruments = 0;
        if(songData.instruments.length === 0) {
            console.warn("Song contains no instruments");
        } else {
            for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                loadingInstruments++;
                this.initInstrument(instrumentID, (instance) => {
                    loadingInstruments--;
                    if(loadingInstruments === 0) {
                        this.dispatchEvent(new CustomEvent('instruments:initialized', {
                            bubbles: true
                        }));
                    }
                });
            }
        }
    }



//         loadSongFromURL(songURL, onLoaded) {
//             const playerElm = this;
// //             console.log('Song loading:', songURL);
//             loadJSON(songURL, function(err, songJSON) {
//                 if(err)
//                     throw new Error("Could not load songData: " + err);
//                 if(!songJSON)
//                     throw new Error("Invalid JSON File: " + songURL);
//
//             });
//         }


    findInstructionGroup(instruction) {
        if(typeof instruction !== 'object')
            throw new Error("Invalid instruction object");
        for(let groupName in this.songData.instructions) {
            if(this.songData.instructions.hasOwnProperty(groupName)) {
                if(this.songData.instructions[groupName].indexOf(instruction) !== -1)
                    return groupName;
            }
        }
        throw new Error("Instruction not found in songData");
    }

    getInstructions(groupName) {
        let instructionList = this.songData.instructions[groupName];
        if(!instructionList)
            throw new Error("Instruction groupName not found: " + groupName);
        return instructionList;
    }

    getInstructionPosition(instruction, groupName) {
        const instructionList = this.songData.instructions[groupName];
        const p = instructionList.indexOf(instruction);
        if(p === -1)
            throw new Error("Instruction not found in instruction list");
        return p;
    }

    // getInstructionGroup(instruction) {
    //     for(let groupName in this.songData.instructions)
    //         if(this.songData.instructions.hasOwnProperty(groupName))
    //             if(this.songData.instructions[groupName].indexOf(instruction) !== -1)
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
        if(!this.songData.instruments[instrumentID]) {
            console.error(`Instrument ${instrumentID} is not loaded. Playback skipped. `);
            return;
        }




        const audioNode = this.playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity);

        const noteEventData = {
            audioNode: audioNode,
            frequency: noteFrequency,
            startTime: noteStartTime,
            duration: noteDuration,
            instrumentPreset: this.songData.instruments[instrumentID],
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
        // instructionList = instructionList || this.songData.instructions;
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
                        let instructionGroupList = this.songData.instructions[groupName];
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



    playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity) {
        let instrument;
        try {
            instrument = this.getInstrument(instrumentID);
        } catch (e) {
            console.warn("Error playing instrument: " + e);
            return null;
        }

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

    getInstrument(instrumentID) {
        if(this.loadedInstruments[instrumentID])
            return this.loadedInstruments[instrumentID];

        const instrumentList = this.getSongData().instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Instrument ID not found: " + instrumentID);
        const instrumentPreset = instrumentList[instrumentID];

        const url = new URL(instrumentPreset.url, document.location);
        const elementName = url.pathname.substring(url.pathname.lastIndexOf('/')+1).split('.')[0];

        const instrumentClass = customElements.get(elementName);
        const instance = new instrumentClass();

        this.loadedInstruments[instrumentID] = instance;
        return instance;
    }

    initInstrument(instrumentID, onInitiated) {
        const instrumentList = this.getSongData().instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Instrument ID not found: " + instrumentID);
        const instrumentPreset = instrumentList[instrumentID];
        const final = () => {
            MusicPlayerElement.loadScript(instrumentPreset.url, () => {
                const instance = this.getInstrument(instrumentID);
                if(instance.setConfig)
                    instance.setConfig(instrumentPreset, this.getAudioContext());
                onInitiated && onInitiated(instance);
            });
        };
        if(instrumentPreset.urlDependencies) {
            const urlDependencies = instrumentPreset.urlDependencies.slice();
            const next = () => {
                if(urlDependencies.length === 0) {
                    final();

                } else {
                    const nextURL = urlDependencies.pop();
                    MusicPlayerElement.loadScript(nextURL, next);
                }
            };
            next();
        } else {
            final();
        }
    }

    addInstrument(url, instrumentConfig) {
        const instrumentList = this.getSongData().instruments;
        const instrumentID = instrumentList.length;

        instrumentList[instrumentID] = Object.assign({
            url: url
        }, instrumentConfig || {});
        this.initInstrument(instrumentID);
        return instrumentID;
    }

    replaceInstrumentParams(instrumentID, replaceConfig, onInstrumentLoad) {
        const instrumentList = this.getSongData().instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        const presetData = instrumentList[instrumentID];
        const newPresetConfig = Object.assign({}, presetData);

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

        instrumentList[instrumentID] = newPresetConfig;
        this.initInstrument(instrumentID, onInstrumentLoad);

        // this.loadedInstruments[instrumentID] = instance;            // Replace instrument with new settings
        return oldParams;
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

        this.dispatchEvent(new CustomEvent('songData:start'));
    }

    pause() {
        this.playing = false;
        this.dispatchEvent(new CustomEvent('songData:pause'));
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
            this.songData.root || 'root',
            startTime,
            endTime,
            this.startTime
        );

        // this.seekPosition += this.seekLength;
        // this.seekPosition = currentTime - this.startTime;
        // this.seekPosition += this.seekLength;

        if(currentTime < totalPlayTime) {
            console.log("Instructions playing:", this.seekPosition, this.seekLength, currentTime - this.startTime);

            this.dispatchEvent(new CustomEvent('songData:playback'));
            setTimeout(this.processPlayback.bind(this), this.seekLength * 1000);
        } else{

            setTimeout(function() {
                console.log("Song finished. Play time: ", totalPlayTime);
                this.seekPosition = 0;
                this.playing = false;

                // Update UI
                this.dispatchEvent(new CustomEvent('songData:end'));
            }.bind(this), totalPlayTime - currentTime)
        }
    }

    findInstrumentID(instrumentPath, songInstrumentList) {
        songInstrumentList = songInstrumentList || this.songData.instruments;
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
    //     let instrumentPreset = this.songData.instruments[instrumentID];
    //     if(!instrumentPreset)
    //         throw new Error("Invalid Instrument ID: " + instrumentID);
    //     if(!instrumentPreset.path)
    //         throw new Error("Invalid Instrument Config: " + instrumentPreset);
    //     return instrumentPreset.path;
    // }

    isInstrumentLoaded(instrumentID) {
        return !!this.loadedInstruments[instrumentID];
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
            if(scripts[i].src.endsWith(scriptPath)) {
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

}

// Define custom elements
customElements.define('music-player', MusicPlayerElement);

// MusicPlayerElement.loadStylesheet('client/player/music-player.css');
