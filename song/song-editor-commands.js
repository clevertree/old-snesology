
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorCommands {
    constructor(editor) {
        this.editor = editor;
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



    processInstruction(instruction) {
        if(!instruction.command || instruction.command[0] === '!')
            return;
        instruction.command = this.getCommandAlias(instruction.instrument || 0, instruction.command);
    }

    getCommandAlias(instrumentID, command) {
        const instance = this.player.getInstrument(instrumentID);
        if (instance.getFrequencyAliases) {
            const aliases = instance.getFrequencyAliases();
            Object.keys(aliases).forEach((key) => {
                if (aliases[key] === command)
                    command = key;
            });
        }
        return command;
    }

    setSongTitle(newSongTitle) { return this.setSongField('title', newSongTitle); }
    setSongVersion(newSongTitle) { return this.setSongField('version', newSongTitle); }

    setSongField(fieldName, fieldValue) {
        editor.renderer.replaceDataPath(fieldName, fieldValue);
        this.historyQueue(editor.renderer.clearHistoryActions());
    }

    insertInstructionAtPosition(groupName, insertPosition, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        const insertIndex = editor.renderer.insertInstructionAtPosition(groupName, insertPosition, instructionToAdd);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.render();
        this.grid.selectInstructions(insertIndex, [insertIndex]);
        return insertIndex;
        // return insertIndex;
    }

    insertInstructionAtIndex(groupName, insertIndex, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        editor.renderer.insertInstructionAtIndex(groupName, insertIndex, instructionToAdd);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.render();
        // this.grid.selectInstructions(insertIndex, [insertIndex]);
        return insertIndex;
    }

    deleteInstructionAtIndex(groupName, deleteIndex) {
        editor.renderer.deleteInstructionAtIndex(groupName, deleteIndex);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.render();
        // this.grid.selectInstructions(deleteIndex);
        // return null;
    }

    replaceInstructionParams(groupName, replaceIndices, replaceParams) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = editor.renderer.songData.instructions[groupName][replaceIndices[i]];
            if(typeof replaceParams.command !== 'undefined' && typeof replaceInstruction.instrument !== 'undefined')
                replaceParams.command = this.getCommandAlias(replaceInstruction.instrument, replaceParams.command);
            oldParams.push(editor.renderer.replaceInstructionParams(groupName, replaceIndices[i], replaceParams));
        }
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.render();
        // this.grid.selectInstructions(replaceIndex, [replaceIndex]);
        return oldParams;
    }

    replaceInstructionParam(groupName, replaceIndices, paramName, paramValue) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = editor.renderer.songData.instructions[groupName][replaceIndices[i]];
            if(paramName === 'command')
                paramValue = this.getCommandAlias(replaceInstruction.instrument, paramValue);
            oldParams.push(editor.renderer.replaceInstructionParam(groupName, replaceIndices[i], paramName, paramValue));
        }
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.render();
        // this.grid.selectInstructions(replaceIndex, [replaceIndex]);
        return oldParams;
    }

    addInstructionGroup(newGroupName, instructionList) {
        editor.renderer.addInstructionGroup(newGroupName, instructionList);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    removeInstructionGroup(removedGroupName) {
        editor.renderer.removeInstructionGroup(removedGroupName);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.navigatePop();
    }

    renameInstructionGroup(oldGroupName, newGroupName) {
        editor.renderer.renameInstructionGroup(oldGroupName, newGroupName);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    addInstrument(config) {
        const instrumentID = editor.renderer.addInstrument(config);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.render(); // TODO: render only instruments
        this.player.initInstrument(instrumentID);
        return instrumentID;
    }

    removeInstrument(instrumentID) {
        editor.renderer.removeInstrument(instrumentID);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.render(); // TODO: render only instruments
    }

    replaceInstrumentParams(instrumentID, replaceConfig) {
        const oldParams = editor.renderer.replaceInstrumentParams(instrumentID, replaceConfig);
        this.historyQueue(editor.renderer.clearHistoryActions());
        this.render(); // TODO: render only instruments
        return oldParams;
    }

}
