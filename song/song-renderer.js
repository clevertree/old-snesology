/**
 * Player requires a modern browser
 */

class SongRenderer {
    constructor(dispatchElement=null) {
        this.dispatchElement = dispatchElement;
        this.audioContext = null;
        this.songData = {};
        this.loadedInstruments = [];
        this.loadedInstrumentClasses = {};
        this.seekLength = 4;
        this.seekPosition = 0;
        this.volumeGain = null;
        this.playing = false;
        // this.config = {
        //     volume: 0.3
        // };
        this.loadSongData({});
        // this.eventListeners = [];
        this.songHistory = [];
        document.addEventListener('instrument:loaded', e => this.onSongEvent(e));

    }
    // addSongEventListener(callback) { this.eventListeners.push(callback); }

    getAudioContext() {
        if(this.audioContext)
            return this.audioContext;

        this.audioContext = new (window.AudioContext||window.webkitAudioContext)();
        this.initAllInstruments(this.audioContext);
        return this.audioContext;
    }
    getSongData() { return this.songData; }
    getSongHistory() { return this.songHistory; }
    getStartingBeatsPerMinute() { return this.songData.beatsPerMinute; }
    getVolumeGain() {
        if(!this.volumeGain) {
            const context = this.getAudioContext();
            let gain = context.createGain();
            gain.gain.value = SongRenderer.DEFAULT_VOLUME;
            gain.connect(context.destination);
            this.volumeGain = gain;
        }
        return this.volumeGain;
    }

    getVolume () {
        return this.volumeGain ? this.volumeGain.gain.value * 100 : SongRenderer.DEFAULT_VOLUME * 100;
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

    dispatchEvent(event) {
        if(this.dispatchElement) {
            this.dispatchElement.dispatchEvent(event);
        }
    }

    onSongEvent(e) {
        switch(e.type) {
            case 'instrument:loaded':
                const instrumentClass = e.detail.class;
                const instrumentClassPath = e.detail.path;
                this.loadedInstrumentClasses[instrumentClassPath] = instrumentClass;
                this.loadAllInstruments();
                break;
        }
    }


    /** Loading **/



    loadSongData(songData, songHistory=[]) {
        songData = Object.assign({}, {
            instruments: [],
            instructions: {
                'root': [4]
            }
        }, songData);
        // TODO: Cleanup
        this.songData = songData;
        this.songHistory = songHistory || [];

        Object.keys(songData.instructions).map((groupName, i) =>
            this.processInstructions(groupName));

        let loadingInstruments = 0;
        if(songData.instruments.length === 0) {
            // console.warn("Song contains no instruments");
        } else {
            for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                loadingInstruments++;
                this.loadInstrument(instrumentID);

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

    processInstructions(groupName) {
        const instructionList = this.getInstructions(groupName);
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];
            instructionList[i] = this.processInstruction(instruction);
        }
    }

    // REFACTOR
    processInstruction(instruction) {
        if (typeof instruction === 'number')
            instruction = [instruction]; // Single entry array means pause
        // instruction = {command: '!pause', duration: instruction};
        if (typeof instruction === 'string') {
            instruction = instruction.split(':');
            instruction[0] = parseFloat(instruction[0]);
            instruction[1] = parseInt(instruction[1])
        }
        // if (Array.isArray(instruction))
        //     instruction = function(args) {
        //         const instruction = {command: args[0]};
        //         if(args.length>1)   instruction.duration = args[1];
        //         return instruction;
        //     }(instruction);
        return instruction;
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

    getInstructions(groupName, indicies=null) {
        let instructionList = this.songData.instructions[groupName];
        if(!instructionList)
            throw new Error("Instruction groupName not found: " + groupName);
        if(!indicies)
            return instructionList;
        return instructionList.filter((instruction, index) => indicies.indexOf(index) !== -1)
    }

    getInstructionIndex(instruction, groupName) {
        const instructionList = this.songData.instructions[groupName];
        const p = instructionList.indexOf(instruction);
        if(p === -1)
            throw new Error("Instruction not found in instruction list");
        return p;
    }

    getInstruction(groupName, index, throwException=true) {
        let instructionList = this.songData.instructions[groupName];
        if(!Number.isInteger(index))
            throw new Error("Invalid Index: " + typeof index);
        if(throwException) {
            if (index >= instructionList.length)
                throw new Error(`Instruction index is greater than group length: ${index} >= ${instructionList.length} for groupName: ${groupName}`);
            if (!instructionList[index])
                throw new Error(`Instruction not found at index: ${index} for groupName: ${groupName}`);
        }
        return instructionList[index];
    }

    getInstructionRange(groupName, selectedIndicies) {
        if(!Array.isArray(selectedIndicies))
            selectedIndicies = [selectedIndicies];
        let min=null, max=null;
        this.eachInstruction(groupName, (i, instruction, stats) => {
            if(selectedIndicies.indexOf(i) !== -1) {
                if(min === null || stats.groupPosition < min)
                    min = stats.groupPosition;
                if(max === null || stats.groupPosition > max)
                    max = stats.groupPosition;
            }
        });
        return [min, max];
    }

    playInstructionAtIndex(groupName, instructionIndex, noteStartTime=null, stats=null) {
        const instruction = this.getInstruction(groupName, instructionIndex);
        this.playInstruction(instruction, noteStartTime, stats)
    }

    playInstruction(instruction, noteStartTime=null, stats=null) {
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

        if(!noteStartTime && noteStartTime !== 0)
            noteStartTime = this.getAudioContext().currentTime;


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
        return this.eachInstruction(instructionGroup, (i, instruction, stats) => {
            const absolutePlaytime = stats.groupPlaytime + stats.parentPlaytime;
            if(absolutePlaytime < playbackPosition)
                return;   // Instructions were already played
            if(playbackLength && absolutePlaytime >= playbackPosition + playbackLength)
                return;
            if(instruction.command[0] === '!')
                return;
            // console.log("Note played", noteInstruction, stats, seekPosition, seekLength);
            this.playInstruction(instruction, currentTime + absolutePlaytime, stats);
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

        function playGroup(instructionList, stats) {
            stats.currentBPM = stats.parentBPM;
            // groupStats.parentPosition = groupStats.parentPosition || 0;
            stats.groupPosition = 0;
            stats.groupPlaytime = 0;
            let maxPlaytime = 0;
            for(let i=0; i<instructionList.length; i++) {
                let instruction = instructionList[i];

                // switch(typeof instruction) {
                //     case 'number':
                //         instruction = {command: '!pause', duration: instruction};
                //         break;
                //
                //     default:
                //     case 'string':
                //         if(typeof instruction === "string")
                //             instruction = instruction.split(':');
                //         if (Array.isArray(instruction))
                //             instruction = function(args) {
                //                 const instruction = {command: args[0]};
                //                 if(args.length>1)   instruction.duration = args[1];
                //                 return instruction;
                //             }(instruction);
                // }


                if(typeof instruction.command !== "undefined") {
                    if (instruction.command[0] === '!') {
                        const functionName = instruction.command.substr(1);
                        switch(functionName) {
                            case 'pause':
                                stats.groupPosition += instruction.duration;
                                stats.groupPlaytime += instruction.duration * (60 / stats.currentBPM);
                                if(stats.groupPlaytime > maxPlaytime)
                                    maxPlaytime = stats.groupPlaytime;
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
                        if(groupName === stats.currentGroup) { // TODO group stack
                            console.error("Recursive group call. Skipping group '" + groupName + "'");
                            continue;
                        }
                        // console.log("Group Offset", instruction.groupName, currentGroupPlayTime);
                        const subGroupPlayTime = playGroup.call(this, instructionGroupList, {
                            "parentBPM": stats.currentBPM,
                            "parentPosition": stats.groupPosition + stats.parentPosition,
                            "parentPlaytime": stats.groupPlaytime + stats.parentPlaytime,
                            "currentGroup": groupName,
                            "groupInstruction": instruction,
                            "parentStats": stats
                        });
                        if (subGroupPlayTime > maxPlaytime)
                            maxPlaytime = subGroupPlayTime;

                    } else {
                        // groupStats.absolutePosition = groupStats.groupPosition + groupStats.parentPosition;
                        // groupStats.absolutePlaytime = groupStats.groupPlaytime + groupStats.parentPlaytime;
                        // callback(instruction, groupStats);
                    }
                    // Callback all notes, including commands and groups
                    callback(i, instruction, stats);
                }

            }
            if(stats.groupPlaytime > maxPlaytime)
                maxPlaytime = stats.groupPlaytime;
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

    getInstrumentConfig(instrumentID, throwException=true) {
        const instrumentList = this.getInstrumentList();
        if(instrumentList[instrumentID])
            return instrumentList[instrumentID];
        if(throwException)
            throw new Error("Instrument ID not found: " + instrumentID);
        return null;
    }

    getInstrument(instrumentID, throwException=true) {
        if(this.loadedInstruments[instrumentID])
            return this.loadedInstruments[instrumentID];
        if(throwException)
            throw new Error("Instrument not yet loaded: " + instrumentID);
        return null;
    }

    getInstrumentList() {
        return this.getSongData().instruments.slice();
    }

    // TODO: async
    loadInstrumentClass(instrumentClassURL) {
        instrumentClassURL = new URL(instrumentClassURL, document.location);
        const instrumentClassPath = instrumentClassURL.pathname;
        if(typeof this.loadedInstrumentClasses[instrumentClassPath] !== 'undefined') {
            if(this.loadedInstrumentClasses[instrumentClassPath] === null)
                console.warn("Instrument class is loading: " + instrumentClassPath);
            else
                throw new Error("Instrument class is already loaded: " + instrumentClassPath);
            return;
        }
        this.loadedInstrumentClasses[instrumentClassPath] = null;
        const newScriptElm = document.createElement('script');
        newScriptElm.src = instrumentClassURL;
        document.head.appendChild(newScriptElm);
        // MusicPlayerElement.loadScript(instrumentPreset.url); // , () => {
    }


    // TODO: async
    loadInstrument(instrumentID, forceReload=false) {
        instrumentID = parseInt(instrumentID);
        if (!forceReload && this.loadedInstruments[instrumentID])
            return true;
        this.loadedInstruments[instrumentID] = null;

        const instrumentPreset = this.getInstrumentConfig(instrumentID);
        const instrumentClassURL = new URL(instrumentPreset.url, document.location);
        const instrumentClassPath = instrumentClassURL.pathname;
        const instrumentClass = this.loadedInstrumentClasses[instrumentClassPath];
        // const elementName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1).split('.')[0];

        if (!instrumentClass) {
            this.loadInstrumentClass(instrumentClassURL);
            return false;
        }

        const instance = new instrumentClass(instrumentPreset); //, this.getAudioContext());
        this.loadedInstruments[instrumentID] = instance;
        this.dispatchEvent(new CustomEvent('instrument:instance', {
            detail: {
                instance,
                instrumentID
            },
            bubbles: true
        }));

        if(this.audioContext)
            this.initInstrument(instrumentID, this.audioContext);

        return true;
    }

    loadAllInstruments() {
        const instrumentList = this.getInstrumentList();
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
            this.loadInstrument(instrumentID);
        }
    }

    initInstrument(instrumentID, audioContext) {
        const instrument = this.getInstrument(instrumentID);
        instrument.init(audioContext);
    }

    initAllInstruments(audioContext) {
        const instrumentList = this.getInstrumentList();
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
            this.initInstrument(instrumentID, audioContext);
        }
    }



    /** Modify Song Data **/

    generateGUID() { 
        var d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
            d += performance.now(); //use high-precision timer if available
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    generateInstructionGroupName(currentGroup) {
        const songData = this.getSongData();
        let newGroupName;
        for(let i=99; i>=0; i--) {
            const currentGroupName = currentGroup + '.' + i;
            if(!songData.instructions.hasOwnProperty(currentGroupName))
                newGroupName = currentGroupName;
        }
        if(!newGroupName)
            throw new Error("Failed to generate group name");
        return newGroupName;
    }



    setSongTitle(newSongTitle) { return this.replaceDataPath('title', newSongTitle); }
    setSongVersion(newSongTitle) { return this.replaceDataPath('version', newSongTitle); }

    addInstrument(config) {
        if(typeof config !== 'object')
            config = {
                url: config
            };

        const instrumentList = this.songData.instruments;
        const instrumentID = instrumentList.length;

        this.replaceDataPath(['instruments', instrumentID], config);
        this.loadInstrument(instrumentID);
        return instrumentID;
    }

    replaceInstrument(instrumentID, config) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);
        const oldInstrument = instrumentList[instrumentID];
        if(typeof config !== 'object')
            config = {
                url: config
            };
        if(oldInstrument.name && !config.name)
            config.name = oldInstrument.name;
        // Preserve old instrument name
        return this.replaceDataPath(['instruments', instrumentID], config)
            .oldData;
    }

    removeInstrument(instrumentID) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);
        // if(instrumentList.length === instrumentID) {
        //
        // }
        delete this.loadedInstruments[instrumentID];
        return this.replaceDataPath(['instruments', instrumentID])
            .oldData;
    }

    replaceInstrumentParam(instrumentID, paramName, paramValue) {
        instrumentID = parseInt(instrumentID);
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        return this.replaceDataPath(['instruments', instrumentID, paramName], paramValue)
            .oldData;
    }


    // replaceInstrumentParams(instrumentID, replaceParams) {
    //     const instrumentList = this.songData.instruments;
    //     if(!instrumentList[instrumentID])
    //         throw new Error("Invalid instrument ID: " + instrumentID);
    //
    //     const oldParams = {};
    //     for(const paramName in replaceParams) {
    //         if(replaceParams.hasOwnProperty(paramName)) {
    //             const paramValue = replaceParams[paramName];
    //             const oldData = this.replaceInstrumentParam(instrumentID, paramName, paramValue)
    //                 .oldData;
    //             if(typeof oldData !== "undefined")
    //                 oldParams[paramName] = oldData;
    //         }
    //     }
    //     return oldParams;
    // }

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


    /** Modifying **/

    applyHistoryActions(songHistory) {
        for(let i=0; i<songHistory.length; i++) {
            const historyAction = songHistory[i];
            switch(historyAction.action) {
                case 'reset':
                    Object.assign(this.songData, historyAction.data);
                    break;
                case 'insert':
                    this.insertDataPath(historyAction.path, historyAction.data);
                    break;
                case 'delete':
                    this.deleteDataPath(historyAction.path);
                    break;
                case 'replace':
                    this.replaceDataPath(historyAction.path, historyAction.data);
                    break;
            }
        }
        this.songHistory = [];
        this.processAllInstructions();
    }

    findDataPath(pathList) {
        if(!Array.isArray(pathList))
            throw new Error("Path list must be an array");
        if(pathList[0] === "*") {
            return {
                value: this.songData,
                parent: {key: this.songData},
                key: 'key'
            };
        }
        // const pathList = path.split('.');
        let value = this.songData, parent, key = null;
        for(let i=0; i<pathList.length; i++) {
            key = pathList[i];
            if(/^\d+$/.test(key)) {
                key = parseInt(key);
                // if(typeof target.length < targetPathPart)
                //     throw new Error(`Path is out of index: ${target.length} < ${targetPathPart} (Path: -${path}) `);
            } else {
                // if(typeof target[targetPathPart] === 'undefined')
                //     throw new Error("Path not found: " + path);
            }
            parent = value;
            value = value[key];
        }
        if(!parent)
            throw new Error("Invalid path: " + path);

        return {
            value: value,
            parent: parent,
            key: key
        };
    }

    insertDataPath(pathList, newData) {
        const pathInfo = this.findDataPath(pathList);

        newData = SongRenderer.sanitizeInput(newData);

        if(typeof pathInfo.key !== 'number')
            throw new Error("Insert action requires numeric key");
        if(pathInfo.parent.length < pathInfo.key)
            throw new Error(`Insert position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${pathList}`);
        pathInfo.parent.splice(pathInfo.key, 0, newData);

        return this.queueHistoryAction(pathList, newData);
    }


    deleteDataPath(pathList) {
        const pathInfo = this.findDataPath(pathList);

        // if(typeof pathInfo.key !== 'number')
        //     throw new Error("Delete action requires numeric key");
        const oldData = pathInfo.parent[pathInfo.key];
        if(typeof pathInfo.key === 'number') {
            if(pathInfo.parent.length < pathInfo.key)
                throw new Error(`Delete position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${pathList}`);
            pathInfo.parent.splice(pathInfo.key, 1);
        } else {
            delete pathInfo.parent[pathInfo.key];
        }

        return this.queueHistoryAction(pathList, null, oldData);
    }

    replaceDataPath(pathList, newData) {
        const pathInfo = this.findDataPath(pathList);

        newData = SongRenderer.sanitizeInput(newData);
        let oldData = null;

        if(typeof newData !== "undefined") {
            if(typeof pathInfo.key === 'number' && pathInfo.parent.length < pathInfo.key)
                throw new Error(`Replace position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${pathList}`);
            if(typeof pathInfo.parent[pathInfo.key] !== "undefined")
                oldData = pathInfo.parent[pathInfo.key];
            pathInfo.parent[pathInfo.key] = newData
        } else {
            delete pathInfo.parent[pathInfo.key];
        }

        return this.queueHistoryAction(pathList, newData, oldData);
    }

    queueHistoryAction(pathList, data=null, oldData=null) {
        const historyAction = [
            // action[0],
            pathList,
        ];
        if(data !== null || oldData !== null)
            historyAction.push(data);
        if(oldData !== null)
            historyAction.push(oldData);
        this.songHistory.push(historyAction);

        // setTimeout(() => {
        this.dispatchEvent(new CustomEvent('song:modified', {detail: historyAction}), 1);
        // }, 1);

        return historyAction;
    }

    insertInstructionAtPosition(groupName, insertPosition, insertInstruction) {
        if(!insertInstruction)
            throw new Error("Invalid insert instruction");
        let instructionList = this.songData.instructions[groupName];

        let groupPosition = 0;
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];
            if(instruction.command === '!pause') {

                if(groupPosition + instruction.duration >= insertPosition) {

                    if(groupPosition + instruction.duration === insertPosition) {
                        // Pause Position equals insert position, append after

                        let lastInsertIndex;
                        // Search for last insert position
                        for(lastInsertIndex=i+1; lastInsertIndex<instructionList.length; lastInsertIndex++)
                            if(instructionList[lastInsertIndex].command === '!pause')
                                break;

                        this.insertInstructionAtIndex(groupName, lastInsertIndex, insertInstruction);
                        return lastInsertIndex;
                    }

                    // Pause Position is before insert position, split the pause
                    return this.splitPauseInstruction(groupName, i,insertPosition - groupPosition , insertInstruction);
                }
                groupPosition += instruction.duration;
            }
        }

        if(insertPosition <= groupPosition)
            throw new Error ("Something went wrong");
        // Insert a new pause at the end of the song, lasting until the new note
        let lastPauseIndex = instructionList.length;
        this.insertInstructionAtIndex(groupName, lastPauseIndex, {
            command: '!pause',
            duration: insertPosition - groupPosition
        });
        // Insert new note
        this.insertInstructionAtIndex(groupName, lastPauseIndex, insertInstruction);
        return lastPauseIndex;
    }

    splitPauseInstruction(groupName, pauseIndex, splitDuration, insertInstruction) {
        let instructionList = this.songData.instructions[groupName];
        const pauseInstruction = instructionList[pauseIndex];
        if(pauseInstruction.command !== '!pause')
            throw new Error("Invalid Pause Instruction at : " + pauseIndex);
        if(pauseInstruction.duration <= splitDuration)
            throw new Error("Split duration must be within pause duration");
        const splitDuration2 = pauseInstruction.duration - splitDuration;
        this.replaceInstructionParam(groupName, pauseIndex, 'duration', splitDuration);
        if(insertInstruction)
            this.insertInstructionAtIndex(groupName, ++pauseIndex, insertInstruction);

        this.insertInstructionAtIndex(groupName, ++pauseIndex, {
            command: '!pause',
            duration: splitDuration2
        });

        return pauseIndex - 1; // we want the instruction, not the pause
    }


    insertInstructionAtIndex(groupName, insertIndex, insertInstruction) {
        if(!insertInstruction)
            throw new Error("Invalid insert instruction");
        this.insertDataPath(['instructions', groupName, insertIndex], insertInstruction);
    }


    deleteInstructionAtIndex(groupName, deleteIndex) {
        return this.deleteDataPath(['instructions', groupName, deleteIndex])
            .oldData;
    }



    replaceInstructionParam(groupName, replaceIndex, paramName, paramValue) {
        if(paramValue === null)
            return this.deleteDataPath(['instructions', groupName, replaceIndex, paramName])
                .oldData;
        return this.replaceDataPath(['instructions', groupName, replaceIndex, paramName], paramValue)
            .oldData;
    }


    replaceInstructionParams(groupName, replaceIndex, replaceParams) {

        const oldParams = {};
        for(const paramName in replaceParams) {
            if(replaceParams.hasOwnProperty(paramName)) {
                const paramValue = replaceParams[paramName];
                const oldData = this.replaceInstructionParam(groupName, replaceIndex, paramName, paramValue);
                if(typeof oldData !== "undefined")
                    oldParams[paramName] = oldData;
            }
        }
        return oldParams;
    }


    addInstructionGroup(newGroupName, instructionList) {
        if(this.songData.instructions.hasOwnProperty(newGroupName))
            throw new Error("New group already exists: " + newGroupName);
        this.replaceDataPath(['instructions', newGroupName], instructionList || []);
    }


    removeInstructionGroup(removeGroupName) {
        if(removeGroupName === 'root')
            throw new Error("Cannot remove root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(removeGroupName))
            throw new Error("Existing group not found: " + removeGroupName);

        return this.replaceDataPath(['instructions', removeGroupName])
            .oldData;
    }


    renameInstructionGroup(oldGroupName, newGroupName) {
        if(oldGroupName === 'root')
            throw new Error("Cannot rename root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(oldGroupName))
            throw new Error("Existing group not found: " + oldGroupName);
        if(this.songData.instructions.hasOwnProperty(newGroupName))
            throw new Error("New group already exists: " + newGroupName);

        const removedGroupData = this.replaceDataPath(['instructions', oldGroupName])
            .oldData;
        this.replaceDataPath(['instructions', newGroupName], removedGroupData);
    }


    processAllInstructions() {
        Object.keys(this.songData.instructions).map((groupName, i) => {
            let instructionList = this.songData.instructions[groupName];
            for (let i = 0; i < instructionList.length; i++)
                instructionList[i] = SongRenderer.processInstruction(instructionList[i]);
        });
    }


    // TODO: remove path
    static sanitizeInput(value) {
        if(Array.isArray(value)) {
            for(let i=0; i<value.length; i++)
                value[i] = SongRenderer.sanitizeInput(value[i]);
            return value;
        }
        if(typeof value === 'object') {
            for(const key in value)
                if(value.hasOwnProperty(key))
                    value[key] = SongRenderer.sanitizeInput(value[key]);
            return value;
        }
        if(typeof value !== 'string')
            return value;

        if(typeof require !== 'undefined') {
            var Filter = require('bad-words'),
                filter = new Filter();
            if(filter.isProfane(value))
                throw new Error("Swear words are forbidden");
            value = filter.clean(value);
        }

        var ESC_MAP = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        let regex = /[&<>'"]/g;
        // if(false) {
        //     regex = /[&<>]/g;
        // }

        return value.replace(regex, function(c) {
            return ESC_MAP[c];
        });
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
SongRenderer.DEFAULT_VOLUME = 0.7;
