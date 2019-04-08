class SongModifier {
    constructor(songData) {
        this.songData = songData;
        this.historyActions = [];
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

        this.player.loadSongData(songData);
        this.render();
        //this.gridSelect(null, 0);
        console.info("Song loaded from memory: " + songGUID, songData);
    }

    loadSongData(songData) {
        const modifier = new MusicEditorSongModifier(songData);
        modifier.processAllInstructions();
        this.player.loadSongData(songData);
    }

    historyQueue(historyActions) {
        if(!Array.isArray(historyActions))
            historyActions = [];
        for(let i=0; i<historyActions.length; i++) {
            const historyAction = historyActions[i];
            this.status.history.currentStep++;
            historyAction.step = this.status.history.currentStep;
        }
        //
        // this.status.history.undoList.push(historyAction);
        // this.status.history.undoPosition = this.status.history.undoList.length-1;

        if(this.webSocket && historyActions.length > 0) {
            console.info("Sending history actions: ", historyActions);
            this.webSocket
                .send(JSON.stringify({
                    type: 'history:entry',
                    historyActions: historyActions,
                    // uuid: this.uuid
                }))
        }
    }

    historyUndo() {

    }

    historyRedo() {

    }

    clearHistoryActions() {
        const actions = this.historyActions;
        this.historyActions = [];
        return actions;
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
        newData = SongModifier.sanitizeInput(newData, path);

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
        return historyAction;
    }

    replaceDataPath(path, newData) {
        newData = SongModifier.sanitizeInput(newData, path);

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
        this.insertDataPath(`instructions.${groupName}.${insertIndex}`, insertInstruction);
    }


    deleteInstructionAtIndex(groupName, deleteIndex) {
        return this.deleteDataPath(`instructions.${groupName}.${deleteIndex}`)
            .oldData;
    }


    replaceInstructionAtIndex(groupName, replaceIndex, replaceInstruction) {
        if(!replaceInstruction)
            throw new Error("Invalid replace instruction");
        let instructionList = this.songData.instructions[groupName];
        if (!instructionList[replaceIndex])
            throw new Error("Failed to replace. Old instruction not found at index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}`, replaceInstruction)
            .oldData;
    }

    replaceInstructionParam(groupName, replaceIndex, paramName, paramValue) {
        let instructionList = this.songData.instructions[groupName];
        if(!Number.isInteger(replaceIndex))
            throw new Error("Invalid Index: " + typeof replaceIndex);
        if (!instructionList[replaceIndex])
            throw new Error("Failed to replace param. Old instruction not found at index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

        if(paramValue === null)
            return this.deleteDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`)
                .oldData;
        return this.replaceDataPath(`instructions.${groupName}.${replaceIndex}.${paramName}`, paramValue)
            .oldData;
    }


    replaceInstructionParams(groupName, replaceIndex, replaceParams) {
        let instructionList = this.songData.instructions[groupName];
        if (instructionList.length < replaceIndex)
            throw new Error("Replace position out of index: " + instructionList.length + " < " + replaceIndex + " for groupName: " + groupName);

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

    addInstrument(config) {
        if(typeof config !== 'object')
            config = {
                url: config
            };

        const instrumentList = this.songData.instruments;
        const instrumentID = instrumentList.length;

        this.replaceDataPath(`instruments.${instrumentID}`, config);
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

    processAllInstructions() {
        Object.keys(this.songData.instructions).map((groupName, i) => {
            let instructionList = this.songData.instructions[groupName];
            for (let i = 0; i < instructionList.length; i++)
                instructionList[i] = SongModifier.processInstruction(instructionList[i]);
        });
    }

    static sanitizeInput(value, path) {
        if(Array.isArray(value)) {
            for(let i=0; i<value.length; i++)
                SongModifier.sanitizeInput(value[i], path + `.${i}`);
            return value;
        }
        if(typeof value === 'object') {
            for(const key in value)
                if(value.hasOwnProperty(key))
                    SongModifier.sanitizeInput(value[key], path + `.${key}`);
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

    static processInstruction(instruction) {
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

}

if(typeof module !== "undefined")
    module.exports = SongModifier;
