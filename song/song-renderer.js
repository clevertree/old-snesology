/**
 * Player requires a modern browser
 */

class SongRenderer {
    constructor() {
        this.audioContext = null;
        this.songData = {};
        this.loadedInstruments = [];
        this.seekLength = 4;
        this.seekPosition = 0;
        this.volumeGain = 0.7;
        this.playing = false;
        // this.config = {
        //     volume: 0.3
        // };
        this.loadSongData({});
        this.eventListeners = [];
    }
    addSongEventListener(callback) { this.eventListeners.push(callback); }

    getAudioContext() { return this.audioContext || (this.audioContext = new (window.AudioContext||window.webkitAudioContext)()); }
    getSongData() { return this.songData; }
    getStartingBeatsPerMinute() { return this.songData.beatsPerMinute; }
    getVolumeGain() {
        if(!this.volumeGain) {
            const context = this.getAudioContext();
            let gain = context.createGain();
            gain.gain.value = MusicPlayerElement.DEFAULT_VOLUME;
            gain.connect(context.destination);
            this.volumeGain = gain;
        }
        return this.volumeGain;
    }

    getVolume () {
        return this.volumeGain.gain.value * 100;
    }
    setVolume (volume) {
        const gain = this.getVolumeGain();
        if(gain.gain.value !== volume) {
            gain.gain.value = volume / 100;
            console.info("Setting volume: ", volume);
        }
    }

    // playInstruction(instruction) {
    //     return this.player.playInstruction(
    //         instruction,
    //         this.player.getAudioContext().currentTime
    //     );
    // }

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
//             console.warn("Song contains no instruments");
        } else {
            for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                loadingInstruments++;
                this.initInstrument(instrumentID);

            //      , (instance) => {
            //         loadingInstruments--;
            //         if(loadingInstruments === 0) {
            //             this.dispatchEvent(new CustomEvent('instruments:initialized', {
            //                 bubbles: true
            //             }));
            //         }
            //     }
            }
        }
    }



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

    getInstructionIndex(instruction, groupName) {
        const instructionList = this.songData.instructions[groupName];
        const p = instructionList.indexOf(instruction);
        if(p === -1)
            throw new Error("Instruction not found in instruction list");
        return p;
    }


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




        this.playInstrument(instrumentID, noteFrequency, noteStartTime, noteDuration, noteVelocity);

        const noteEventData = {
            // audioNode: audioNode,
            frequency: noteFrequency,
            startTime: noteStartTime,
            duration: noteDuration,
            instrumentPreset: this.songData.instruments[instrumentID],
            instruction: instruction,
            // groupInstruction: stats.groupInstruction,
            stats: stats || {}
        };

        if(noteStartTime > currentTime)
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('note:start', {detail: noteEventData}));
            }, (noteStartTime - currentTime) * 1000);
        else {
            // Start immediately
            this.dispatchEvent(new CustomEvent('note:start', {detail: noteEventData}));
        }

        if(noteDuration) {
            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('note:end', {detail: noteEventData}));
            }, (noteStartTime - currentTime + noteDuration) * 1000);
        }

    }

    playInstructions(instructionGroup, playbackPosition, playbackLength, currentTime) {
        playbackPosition = playbackPosition || 0;
        currentTime = currentTime || this.getAudioContext().currentTime;
        // instructionList = instructionList || this.songData.instructions;
        return this.eachInstruction(instructionGroup, (noteInstruction, groupStats) => {
            const absolutePlaytime = groupStats.groupPlaytime + groupStats.parentPlaytime;
            if(absolutePlaytime < playbackPosition)
                return;   // Instructions were already played
            if(playbackLength && absolutePlaytime >= playbackPosition + playbackLength)
                return;
            // console.log("Note played", noteInstruction, stats, seekPosition, seekLength);
            this.playInstruction(noteInstruction, currentTime + absolutePlaytime, groupStats);
        });
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
        let instrument = this.getInstrument(instrumentID);

        // if(instrument.getNamedFrequency)
        //     noteFrequency = instrument.getNamedFrequency(noteFrequency);
        // noteFrequency = this.getInstructionFrequency(noteFrequency);

        const context = this.getAudioContext();
        const destination = this.getVolumeGain();

        let velocityGain = context.createGain();
        velocityGain.gain.value = noteVelocity / 100;
        velocityGain.connect(destination);

        return instrument.play(velocityGain, noteFrequency, noteStartTime, noteDuration);
    }

    getInstrumentConfig(instrumentID) {
        const instrumentList = this.getSongData().instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Instrument ID not found: " + instrumentID);
        return instrumentList[instrumentID];
    }

    getInstrument(instrumentID, throwException) {
        if(this.loadedInstruments[instrumentID])
            return this.loadedInstruments[instrumentID];
        if(throwException)
            throw new Error("Instrument not yet loaded: ", instrumentID);
        return null;
    }

    initInstrument(instrumentID) {
        const instrumentPreset = this.getInstrumentConfig(instrumentID);
        const url = new URL(instrumentPreset.url, document.location);
        const elementName = url.pathname.substring(url.pathname.lastIndexOf('/')+1).split('.')[0];

        const instrumentClass = customElements.get(elementName);
        if(instrumentClass) {
            if(!this.loadedInstruments[instrumentID]) {
                const instance = new instrumentClass(instrumentPreset, this.getAudioContext());
                this.loadedInstruments[instrumentID] = instance;
                document.dispatchEvent(new CustomEvent('instrument:instance', {
                    detail: {
                        instance: instance,
                        instrumentID: instrumentID
                    }
                }));
            }
        } else {

            const newScriptElm = document.createElement('script');
            newScriptElm.src = instrumentPreset.url;
            document.head.appendChild(newScriptElm);
            // MusicPlayerElement.loadScript(instrumentPreset.url); // , () => {
        }

    }

    initAllInstruments() {
        const instrumentList = this.getSongData().instruments;
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
            this.initInstrument(instrumentID);
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


    isInstrumentLoaded(instrumentID) {
        return !!this.loadedInstruments[instrumentID];
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
