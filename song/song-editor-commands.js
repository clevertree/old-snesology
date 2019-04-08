
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorCommands {
    constructor(editor) {
        this.editor = editor;
    }



    format(input, type) {
        switch(type) {
            case 'duration':
                if(input === 1/64) return '1/64';
                if(input === 1/32) return '1/32';
                if(input === 1/16) return '1/16';
                if(input === 1/8) return '1/8';
                if(input === 1/4) return '1/4';
                if(input === 1/2) return '1/2';
                input = parseFloat(input).toFixed(2);
                return input.replace('.00', 'B');

            case 'instrument':
                return input < 10 ? "0" + input : "" + input;

        }
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
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.replaceDataPath(fieldName, fieldValue);
        this.historyQueue(songModifier.clearHistoryActions());
    }

    insertInstructionAtPosition(groupName, insertPosition, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const insertIndex = songModifier.insertInstructionAtPosition(groupName, insertPosition, instructionToAdd);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        this.grid.selectIndices(insertIndex, [insertIndex]);
        return insertIndex;
        // return insertIndex;
    }

    insertInstructionAtIndex(groupName, insertIndex, instructionToAdd) {
        this.processInstruction(instructionToAdd);

        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.insertInstructionAtIndex(groupName, insertIndex, instructionToAdd);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(insertIndex, [insertIndex]);
        return insertIndex;
    }

    deleteInstructionAtIndex(groupName, deleteIndex) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.deleteInstructionAtIndex(groupName, deleteIndex);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(deleteIndex);
        // return null;
    }

    replaceInstructionParams(groupName, replaceIndices, replaceParams) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];
        const songModifier = new MusicEditorSongModifier(this.getSongData());

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = songModifier.songData.instructions[groupName][replaceIndices[i]];
            if(typeof replaceParams.command !== 'undefined' && typeof replaceInstruction.instrument !== 'undefined')
                replaceParams.command = this.getCommandAlias(replaceInstruction.instrument, replaceParams.command);
            oldParams.push(songModifier.replaceInstructionParams(groupName, replaceIndices[i], replaceParams));
        }
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(replaceIndex, [replaceIndex]);
        return oldParams;
    }

    replaceInstructionParam(groupName, replaceIndices, paramName, paramValue) {
        if(!Array.isArray(replaceIndices))
            replaceIndices = [replaceIndices];
        const songModifier = new MusicEditorSongModifier(this.getSongData());

        // TODO: if new instrument does not support custom frequencies, remove them before changing the instrument.

        const oldParams = [];
        for(let i=0;i<replaceIndices.length; i++) {
            const replaceInstruction = songModifier.songData.instructions[groupName][replaceIndices[i]];
            if(paramName === 'command')
                paramValue = this.getCommandAlias(replaceInstruction.instrument, paramValue);
            oldParams.push(songModifier.replaceInstructionParam(groupName, replaceIndices[i], paramName, paramValue));
        }
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.render();
        // this.grid.selectIndices(replaceIndex, [replaceIndex]);
        return oldParams;
    }

    addInstructionGroup(newGroupName, instructionList) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.addInstructionGroup(newGroupName, instructionList);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    removeInstructionGroup(removedGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.removeInstructionGroup(removedGroupName);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigatePop();
    }

    renameInstructionGroup(oldGroupName, newGroupName) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.renameInstructionGroup(oldGroupName, newGroupName);
        this.historyQueue(songModifier.clearHistoryActions());
        this.grid.navigate(newGroupName);
    }

    addInstrument(config) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const instrumentID = songModifier.addInstrument(config);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
        this.player.initInstrument(instrumentID);
        return instrumentID;
    }

    removeInstrument(instrumentID) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        songModifier.removeInstrument(instrumentID);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
    }

    replaceInstrumentParams(instrumentID, replaceConfig) {
        const songModifier = new MusicEditorSongModifier(this.getSongData());
        const oldParams = songModifier.replaceInstrumentParams(instrumentID, replaceConfig);
        this.historyQueue(songModifier.clearHistoryActions());
        this.render(); // TODO: render only instruments
        return oldParams;
    }

}
