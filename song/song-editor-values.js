
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorValues {
    constructor(editor) {
        this.editor = editor;
    }

    // get noteFrequencies() {
    //     return this.editor.renderer.noteFrequencies; // ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    // }

    /** Form Options **/

    getValues(valueType, callback) {
        let noteFrequencies;
        let valuesHTML = '';
        const songData = this.editor.getSongData() || {};

        switch(valueType) {
            case 'server-recent-uuid':
            case 'memory-recent-uuid':
                const songRecentUUIDs = JSON.parse(localStorage.getItem(valueType) || '[]');
                for(let i=0; i<songRecentUUIDs.length; i++)
                    valuesHTML += callback.apply(this, songRecentUUIDs[i]);
                break;

            case 'song-instruments':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID] || {name: "No Instrument Loaded"};
                        // const instrument = this.editor.renderer.getInstrument(instrumentID);
                        valuesHTML += callback(instrumentID, this.editor.values.format(instrumentID, 'instrument')
                            + ': ' + (instrumentInfo.name ? instrumentInfo.name : instrumentInfo.url.split('/').pop()));
                    }
                }
                break;

            case 'instruments-available':
                if(this.editor.instrumentLibrary) {
                    const instrumentLibrary = this.editor.instrumentLibrary;
                    if(instrumentLibrary.instruments) {
                        instrumentLibrary.instruments.forEach((pathConfig) => {
                            if (typeof pathConfig !== 'object') pathConfig = {url: pathConfig};
                            if(!pathConfig.title) pathConfig.title = pathConfig.url.split('/').pop();
                            valuesHTML += callback(pathConfig.url, pathConfig.title); //  + " (" + pathConfig.url + ")"
                        });
                    }
                }
                break;

            case 'command-instrument-frequencies':
                for(let instrumentID=0; instrumentID<songData.instruments.length; instrumentID++) {
                    if(this.editor.renderer.isInstrumentLoaded(instrumentID)) {
                        const instance = this.editor.renderer.getInstrument(instrumentID);
                        if(instance.getFrequencyAliases) {
                            const aliases = instance.getFrequencyAliases();
                            Object.values(aliases).forEach((aliasValue) =>
                                valuesHTML += callback(aliasValue, aliasValue, `data-instrument="${instrumentID}"`));
                        }
                    }
                }
                break;

            case 'note-frequencies':
                noteFrequencies = this.editor.renderer.noteFrequencies;
                // for(let i=1; i<=6; i++) {
                for(let j=0; j<noteFrequencies.length; j++) {
                    const noteFrequency = noteFrequencies[j]; //  + i
                    valuesHTML += callback(noteFrequency, noteFrequency);
                }
                // }
                break;


            case 'note-frequencies-all':
                noteFrequencies = this.editor.renderer.noteFrequencies;
                for(let i=1; i<=6; i++) {
                    for(let j=0; j<noteFrequencies.length; j++) {
                        const noteFrequency = noteFrequencies[j] + i;
                        valuesHTML += callback(noteFrequency, noteFrequency);
                    }
                }
                break;

            case 'note-frequency-octaves':
                for(let oi=1; oi<=7; oi+=1) {
                    valuesHTML += callback(oi, '' + oi);
                }
                break;

            case 'velocities':
                // optionsHTML += callback(null, 'Velocity (Default)');
                for(let vi=100; vi>=0; vi-=10) {
                    valuesHTML += callback(vi, vi);
                }
                break;

            case 'durations':
                for(let i=64; i>1; i/=2) {
                    valuesHTML += callback((1/i)/1.5,   `1/${i}t`);
                    valuesHTML += callback(1/i,         `1/${i}`);
                    valuesHTML += callback(1/i*1.5,     `1/${i}d`);
                }
                for(let i=1; i<=16; i++)
                    valuesHTML += callback(i, i+'B');
                break;

            case 'named-durations':
                for(let i=64; i>1; i/=2) {
                    valuesHTML += callback(`1/${i}t`,`1/${i}t`);
                    valuesHTML += callback(`1/${i}`,`1/${i}`);
                    valuesHTML += callback(`1/${i}d`,`1/${i}d`);
                }
                for(let i=1; i<=16; i++)
                    valuesHTML += callback(i+'B',i+'B');
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    valuesHTML += callback(vi, vi + ` beat${vi>1?'s':''} per measure`);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    valuesHTML += callback(vi, vi+ ` beat${vi>1?'s':''} per minute`);
                }
                break;

            case 'groups':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        valuesHTML += callback(key, key);
                    });
                break;

            case 'command-group-execute':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        valuesHTML += callback('@' + key, '@' + key);
                    });
                break;
        }
        return valuesHTML;
    }

    /** Formatting **/

    format(input, type) {
        switch(type) {
            case 'duration':
                let stringValue;
                this.getValues('durations', (duration, durationString) => {
                    if(input === duration || input === durationString)
                        stringValue = durationString;
                });
                if(stringValue)
                    return stringValue;
                input = parseFloat(input).toFixed(2);
                return input.replace('.00', 'B');

            case 'instrument':
                if(typeof input !== 'number')
                    return 'N/A'; // throw new Error("Invalid Instrument");
                return input < 10 ? "0" + input : "" + input;

            case 'velocity':
                if(typeof input !== 'number')
                    return 'N/A'; // throw new Error("Invalid Instrument");
                return input === 100 ? "Max" : input+'';

        }
    }
}
