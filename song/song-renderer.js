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
        this.historyActions = [];
        document.addEventListener('instrument:loaded', e => this.onSongEvent(e));

    }
    // addSongEventListener(callback) { this.eventListeners.push(callback); }

    getAudioContext() { return this.audioContext || (this.audioContext = new (window.AudioContext||window.webkitAudioContext)()); }
    getSongData() { return this.songData; }
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

    dispatchEvent(event, timeout) {
        if(this.dispatchElement) {
            setTimeout(() => this.dispatchElement.dispatchEvent(event), timeout);
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



    loadSongData(songData) {
        songData = Object.assign({}, SongRenderer.DEFAULT_SONG_DATA, songData);
        this.songData = songData;
        Object.keys(songData.instructions).map((groupName, i) =>
            this.processInstructions(groupName));

        let loadingInstruments = 0;
        if(songData.instruments.length === 0) {
            console.warn("Song contains no instruments");
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


    saveSongToMemory() {
        const song = this.getSongData();
        if(!song.uuid) {
            // Unsafe
            song.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        let songRecentUUIDs = JSON.parse(localStorage.getItem('memory-recent-uuid') || '[]');
        songRecentUUIDs = songRecentUUIDs.filter((entry) => entry[0] !== song.uuid);
        songRecentUUIDs.unshift([song.uuid, song.title, new Date().getTime()]);
        localStorage.setItem('memory-recent-uuid', JSON.stringify(songRecentUUIDs));


        localStorage.setItem('song:' + song.uuid, JSON.stringify(song));
        this.menu.render();
        // this.querySelector('.song-menu').outerHTML = renderEditorMenuContent(this);
        console.info("Song saved to memory: " + song.uuid, song);
    }
    saveSongToFile() {
        const song = this.getSongData();
        const jsonString = JSON.stringify(song, null, "\t");
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href",     dataStr);
        downloadAnchorNode.setAttribute("download", song.url.split('/').reverse()[0]);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }


    loadSongFromMemory(songGUID) {
        let songDataString = localStorage.getItem('song:' + songGUID);
        if(!songDataString)
            throw new Error("Song Data not found for guid: " + songGUID);
        let songData = JSON.parse(songDataString);
        if(!songData)
            throw new Error("Invalid Song Data: " + songDataString);

        this.loadSongData(songData);
        // this.render();
        //this.gridSelect(null, 0);
        console.info("Song loaded from memory: " + songGUID, songData);
    }
    //
    // historyQueue(historyActions) {
    //     if(!Array.isArray(historyActions))
    //         historyActions = [];
    //     for(let i=0; i<historyActions.length; i++) {
    //         const historyAction = historyActions[i];
    //         this.status.history.currentStep++;
    //         historyAction.step = this.status.history.currentStep;
    //     }
    //     //
    //     // this.status.history.undoList.push(historyAction);
    //     // this.status.history.undoPosition = this.status.history.undoList.length-1;
    //
    //     if(this.webSocket && historyActions.length > 0) {
    //         console.info("Sending history actions: ", historyActions);
    //         this.webSocket
    //             .send(JSON.stringify({
    //                 type: 'history:entry',
    //                 historyActions: historyActions,
    //                 // uuid: this.uuid
    //             }))
    //     }
    // }
    //
    // historyUndo() {
    //
    // }
    //
    // historyRedo() {
    //
    // }
    // clearHistoryActions() {
    //     const actions = this.historyActions;
    //     this.historyActions = [];
    //     return actions;
    // }

    processInstructions(groupName) {
        const instructionList = this.getInstructions(groupName);
        for(let i=0; i<instructionList.length; i++) {
            const instruction = instructionList[i];
            instructionList[i] = this.processInstruction(instruction);
        }
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

        if(typeof noteStartTime === "undefined")
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
        return this.eachInstruction(instructionGroup, (i, noteInstruction, stats) => {
            const absolutePlaytime = stats.groupPlaytime + stats.parentPlaytime;
            if(absolutePlaytime < playbackPosition)
                return;   // Instructions were already played
            if(playbackLength && absolutePlaytime >= playbackPosition + playbackLength)
                return;
            // console.log("Note played", noteInstruction, stats, seekPosition, seekLength);
            this.playInstruction(noteInstruction, currentTime + absolutePlaytime, stats);
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

    getInstrumentConfig(instrumentID) {
        const instrumentList = this.getInstrumentList();
        if(!instrumentList[instrumentID])
            throw new Error("Instrument ID not found: " + instrumentID);
        return instrumentList[instrumentID];
    }

    getInstrument(instrumentID, throwException) {
        if(this.loadedInstruments[instrumentID])
            return this.loadedInstruments[instrumentID];
        if(throwException)
            throw new Error("Instrument not yet loaded: " + instrumentID);
        return null;
    }

    getInstrumentList() {
        return this.getSongData().instruments.slice();
    }

    loadInstrumentClass(instrumentClassURL) {
        instrumentClassURL = new URL(instrumentClassURL, document.location);
        const instrumentClassPath = instrumentClassURL.pathname;
        if(typeof this.loadedInstrumentClasses[instrumentClassPath] !== 'undefined') {
            if(this.loadedInstrumentClasses[instrumentClassPath] === null)
                console.warn("Instrument class is loading: " + instrumentClassPath);
            else
                console.warn("Instrument class is already loaded: " + instrumentClassPath);
        }
        this.loadedInstrumentClasses[instrumentClassPath] = null;
        const newScriptElm = document.createElement('script');
        newScriptElm.src = instrumentClassURL;
        document.head.appendChild(newScriptElm);
        // MusicPlayerElement.loadScript(instrumentPreset.url); // , () => {
    }


    loadInstrument(instrumentID) {
        if (this.loadedInstruments[instrumentID])
            return true;

        const instrumentPreset = this.getInstrumentConfig(instrumentID);
        const instrumentClassURL = new URL(instrumentPreset.url, document.location);
        const instrumentClassPath = instrumentClassURL.pathname;
        const instrumentClass = this.loadedInstrumentClasses[instrumentClassPath];
        // const elementName = url.pathname.substring(url.pathname.lastIndexOf('/') + 1).split('.')[0];

        if (!instrumentClass) {
            this.loadInstrumentClass(instrumentClassURL);
            return false;
        }

        const instance = new instrumentClass(instrumentPreset, this.getAudioContext());
        this.loadedInstruments[instrumentID] = instance;
        this.dispatchEvent(new CustomEvent('instrument:instance', {
            detail: {
                instance,
                instrumentID
            },
            bubbles: true
        }));
        return true;
    }

    loadAllInstruments() {
        const instrumentList = this.getInstrumentList();
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
            this.loadInstrument(instrumentID);
        }
    }

    /** Modify Song Data **/



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

        this.replaceDataPath(`instruments.${instrumentID}`, config);
        this.loadInstrument(instrumentID);
        return instrumentID;
    }

    removeInstrument(instrumentID) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        return this.replaceDataPath(`instruments.${instrumentID}`)
            .oldData;
    }

    replaceInstrumentParam(instrumentID, paramName, paramValue) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        return this.replaceDataPath(`instruments.${instrumentID}.${paramName}`, paramValue)
            .oldData;
    }


    replaceInstrumentParams(instrumentID, replaceParams) {
        const instrumentList = this.songData.instruments;
        if(!instrumentList[instrumentID])
            throw new Error("Invalid instrument ID: " + instrumentID);

        const oldParams = {};
        for(const paramName in replaceParams) {
            if(replaceParams.hasOwnProperty(paramName)) {
                const paramValue = replaceParams[paramName];
                const oldData = this.replaceInstrumentParam(instrumentID, paramName, paramValue)
                    .oldData;
                if(typeof oldData !== "undefined")
                    oldParams[paramName] = oldData;
            }
        }
        return oldParams;
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


    /** Modifying **/

    applyHistoryActions(historyActions) {
        for(let i=0; i<historyActions.length; i++) {
            const historyAction = historyActions[i];
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
        this.historyActions = [];
        this.processAllInstructions();
    }

    findDataPath(path) {
        if(path === "*") {
            return {
                value: this.songData,
                parent: {key: this.songData},
                key: 'key'
            };
        }
        const pathParts = path.split('.');
        let value = this.songData, parent, key = null;
        for(let i=0; i<pathParts.length; i++) {
            key = pathParts[i];
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

    insertDataPath(path, newData) {
        newData = SongRenderer.sanitizeInput(newData, path);

        const pathInfo = this.findDataPath(path);

        if(typeof pathInfo.key !== 'number')
            throw new Error("Insert action requires numeric key");
        if(pathInfo.parent.length < pathInfo.key)
            throw new Error(`Insert position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${path}`);
        pathInfo.parent.splice(pathInfo.key, 0, newData);

        const historyAction = {
            action: 'insert',
            path: path,
            data: newData
        };
        this.historyActions.push(historyAction);
        this.dispatchEvent(new CustomEvent('song:modified', {detail: historyAction}), 1);
        return historyAction;
    }


    deleteDataPath(path) {
        const pathInfo = this.findDataPath(path);

        // if(typeof pathInfo.key !== 'number')
        //     throw new Error("Delete action requires numeric key");
        const oldData = pathInfo.parent[pathInfo.key];
        if(typeof pathInfo.key === 'number') {
            if(pathInfo.parent.length < pathInfo.key)
                throw new Error(`Delete position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${path}`);
            pathInfo.parent.splice(pathInfo.key, 1);
        } else {
            delete pathInfo.parent[pathInfo.key];
        }

        const historyAction = {
            action: 'delete',
            path: path,
            oldData: oldData
        };
        this.historyActions.push(historyAction);
        this.dispatchEvent(new CustomEvent('song:modified', {detail: historyAction}), 1);
        return historyAction;
    }

    replaceDataPath(path, newData) {
        newData = SongRenderer.sanitizeInput(newData, path);

        let oldData = null;
        const pathInfo = this.findDataPath(path);

        if(typeof newData !== "undefined") {
            if(typeof pathInfo.key === 'number' && pathInfo.parent.length < pathInfo.key)
                throw new Error(`Replace position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${path}`);
            if(typeof pathInfo.parent[pathInfo.key] !== "undefined")
                oldData = pathInfo.parent[pathInfo.key];
            pathInfo.parent[pathInfo.key] = newData
        } else {
            delete pathInfo.parent[pathInfo.key];
        }

        const historyAction = {
            action: 'replace',
            path: path,
            data: newData
        };
        if(oldData !== null)
            historyAction['oldData'] = oldData;
        this.historyActions.push(historyAction);

        this.dispatchEvent(new CustomEvent('song:modified', {detail: historyAction}), 1);
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
        this.replacePauseInstructionParam(groupName, pauseIndex, 'duration', splitDuration);
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
        this.insertDataPath(`instructions.${groupName}.${insertIndex}`, insertInstruction);
    }


    deleteInstructionAtIndex(groupName, deleteIndex) {
        return this.deleteDataPath(`instructions.${groupName}.${deleteIndex}`)
            .oldData;
    }


    replacePauseInstructionParam(groupName, replaceIndex, paramName, paramValue) {
        const instruction = this.getInstruction(groupName, replaceIndex);
        if(instruction.command !== '!pause')
            throw new Error("Instruction is not a pause instruction");

        if(paramValue === null)
            return this.deleteDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`)
                .oldData;
        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`, paramValue)
            .oldData;
    }


    replaceInstructionParam(groupName, replaceIndex, paramName, paramValue) {
        const instruction = this.getInstruction(groupName, replaceIndex);
        if(instruction.command === '!pause')
            throw new Error("Instruction is a pause instruction");

        if(paramValue === null)
            return this.deleteDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`)
                .oldData;
        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`, paramValue)
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
        this.replaceDataPath(`instructions.${newGroupName}`, instructionList || []);
    }


    removeInstructionGroup(removeGroupName) {
        if(removeGroupName === 'root')
            throw new Error("Cannot remove root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(removeGroupName))
            throw new Error("Existing group not found: " + removeGroupName);

        return this.replaceDataPath(`instructions.${removeGroupName}`)
            .oldData;
    }


    renameInstructionGroup(oldGroupName, newGroupName) {
        if(oldGroupName === 'root')
            throw new Error("Cannot rename root instruction group, n00b");
        if(!this.songData.instructions.hasOwnProperty(oldGroupName))
            throw new Error("Existing group not found: " + oldGroupName);
        if(this.songData.instructions.hasOwnProperty(newGroupName))
            throw new Error("New group already exists: " + newGroupName);

        const removedGroupData = this.replaceDataPath(`instructions.${oldGroupName}`).oldData;
        this.replaceDataPath(`instructions.${newGroupName}`, removedGroupData);
    }


    processAllInstructions() {
        Object.keys(this.songData.instructions).map((groupName, i) => {
            let instructionList = this.songData.instructions[groupName];
            for (let i = 0; i < instructionList.length; i++)
                instructionList[i] = SongRenderer.processInstruction(instructionList[i]);
        });
    }

    /** Formatting **/

    format(input, type) {
        switch(type) {
            case 'duration':
                if(typeof input !== 'number')
                    throw new Error("Invalid Duration");
                if(input === 1/64) return '1/64';
                if(input === 1/32) return '1/32';
                if(input === 1/16) return '1/16';
                if(input === 1/8) return '1/8';
                if(input === 1/4) return '1/4';
                if(input === 1/2) return '1/2';
                input = parseFloat(input).toFixed(2);
                return input.replace('.00', 'B');

            case 'instrument':
                if(typeof input !== 'number')
                    throw new Error("Invalid Instrument");
                return input < 10 ? "0" + input : "" + input;

        }
    }

    static sanitizeInput(value, path) {
        if(Array.isArray(value)) {
            for(let i=0; i<value.length; i++)
                SongRenderer.sanitizeInput(value[i], path + `.${i}`);
            return value;
        }
        if(typeof value === 'object') {
            for(const key in value)
                if(value.hasOwnProperty(key))
                    SongRenderer.sanitizeInput(value[key], path + `.${key}`);
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
SongRenderer.DEFAULT_SONG_DATA = {
    title: 'New Song',
    version: '0.0.1',
    root: 'root',
    beatsPerMinute: 160,
    beatsPerMeasure: 4,
    instruments: [{
        "url": "/instrument/chiptune/snes/ffvi/ffvi.instrument.js",
    }],
    instructions: {
        'root': [4]
    },
};
