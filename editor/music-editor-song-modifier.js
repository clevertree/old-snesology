class MusicEditorSongModifier {
    constructor(songData) {
        this.songData = songData;
        this.historyActions = [];
    }

    clearHistoryActions() {
        const actions = this.historyActions;
        this.historyActions = [];
        return actions;
    }

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

        if(typeof pathInfo.key !== 'number')
            throw new Error("Delete action requires numeric key");
        if(pathInfo.parent.length < pathInfo.key)
            throw new Error(`Delete position out of index: ${pathInfo.parent.length} < ${pathInfo.key} for path: ${path}`);
        const oldData = pathInfo.parent[pathInfo.key];
        pathInfo.parent.splice(pathInfo.key, 1);

        const historyAction = {
            action: 'delete',
            path: path,
            oldData: oldData
        };
        this.historyActions.push(historyAction);
        return historyAction;
    }

    replaceDataPath(path, newData) {
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
                instructionList[i] = MusicEditorSongModifier.processInstruction(instructionList[i]);
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
    module.exports = MusicEditorSongModifier;
