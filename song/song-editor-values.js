
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorValues {
    constructor(editor) {
        this.editor = editor;
    }

    get noteFrequencies() {
        return ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    }

    get keyboardLayout() {
        return {
            // '2':'C#5', '3':'D#5', '5':'F#5', '6':'G#5', '7':'A#5', '9':'C#6', '0':'D#6',
            // 'q':'C5', 'w':'D5', 'e':'E5', 'r':'F5', 't':'G5', 'y':'A5', 'u':'B5', 'i':'C6', 'o':'D6', 'p':'E6',
            // 's':'C#4', 'd':'D#4', 'g':'F#4', 'h':'G#4', 'j':'A#4', 'l':'C#5', ';':'D#5',
            // 'z':'C4', 'x':'D4', 'c':'E4', 'v':'F4', 'b':'G4', 'n':'A4', 'm':'B4', ',':'C5', '.':'D5', '/':'E5',
            '2':'C#2', '3':'D#2', '5':'F#2', '6':'G#2', '7':'A#2', '9':'C#3', '0':'D#3',
            'q':'C2', 'w':'D2', 'e':'E2', 'r':'F2', 't':'G2', 'y':'A2', 'u':'B2', 'i':'C3', 'o':'D3', 'p':'E3',
            's':'C#1', 'd':'D#1', 'g':'F#1', 'h':'G#1', 'j':'A#1', 'l':'C#2', ';':'D#2',
            'z':'C1', 'x':'D1', 'c':'E1', 'v':'F1', 'b':'G1', 'n':'A1', 'm':'B1', ',':'C2', '.':'D2', '/':'E2',
        };
    }

    /** Form Options **/

    getEditorFormOptions(optionType, callback) {
        let noteFrequencies;
        let optionsHTML = '';
        const songData = this.editor.getSongData() || {};

        switch(optionType) {
            case 'server-recent-uuid':
            case 'memory-recent-uuid':
                const songRecentUUIDs = JSON.parse(localStorage.getItem(optionType) || '[]');
                for(let i=0; i<songRecentUUIDs.length; i++)
                    optionsHTML += callback.apply(this, songRecentUUIDs[i]);
                break;

            case 'song-instruments':
                if(songData.instruments) {
                    const instrumentList = songData.instruments;
                    for (let instrumentID = 0; instrumentID < instrumentList.length; instrumentID++) {
                        const instrumentInfo = instrumentList[instrumentID] || {name: "No Instrument Loaded"};
                        // const instrument = this.editor.renderer.getInstrument(instrumentID);
                        optionsHTML += callback(instrumentID, this.editor.renderer.format(instrumentID, 'instrument')
                            + ': ' + (instrumentInfo.name ? instrumentInfo.name : instrumentInfo.url.split('/').pop()));
                    }
                }
                break;

            case 'instruments-available':
                if(this.editor.status.instrumentLibrary) {
                    const instrumentLibrary = this.editor.status.instrumentLibrary;
                    if(instrumentLibrary.instruments) {
                        instrumentLibrary.instruments.forEach((pathConfig) => {
                            if (typeof pathConfig !== 'object') pathConfig = {url: pathConfig};
                            if(!pathConfig.title) pathConfig.title = pathConfig.url.split('/').pop();
                            optionsHTML += callback(pathConfig.url, pathConfig.title); //  + " (" + pathConfig.url + ")"
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
                            Object.keys(aliases).forEach((aliasName) =>
                                optionsHTML += callback(aliasName, aliasName, `data-instrument="${instrumentID}"`));
                        }
                    }
                }
                break;

            case 'note-frequencies':
                noteFrequencies = this.editor.values.noteFrequencies;
                // for(let i=1; i<=6; i++) {
                for(let j=0; j<noteFrequencies.length; j++) {
                    const noteFrequency = noteFrequencies[j]; //  + i
                    optionsHTML += callback(noteFrequency, noteFrequency);
                }
                // }
                break;


            case 'note-frequencies-all':
                noteFrequencies = this.editor.values.noteFrequencies;
                for(let i=1; i<=6; i++) {
                    for(let j=0; j<noteFrequencies.length; j++) {
                        const noteFrequency = noteFrequencies[j] + i;
                        optionsHTML += callback(noteFrequency, noteFrequency);
                    }
                }
                break;

            case 'note-frequency-octaves':
                for(let oi=1; oi<=7; oi+=1) {
                    optionsHTML += callback(oi, '' + oi);
                }
                break;

            case 'velocities':
                // optionsHTML += callback(null, 'Velocity (Default)');
                for(let vi=100; vi>=0; vi-=10) {
                    optionsHTML += callback(vi, vi);
                }
                break;

            case 'durations':
                optionsHTML += callback(1/64, '1/64');
                optionsHTML += callback(1/32, '1/32');
                optionsHTML += callback(1/16, '1/16');
                optionsHTML += callback(1/8,  '1/8');
                optionsHTML += callback(1/4,  '1/4');
                optionsHTML += callback(1/2,  '1/2');
                for(let i=1; i<=16; i++)
                    optionsHTML += callback(i, i+'B');
                break;

            case 'beats-per-measure':
                for(let vi=1; vi<=12; vi++) {
                    optionsHTML += callback(vi, vi + ` beat${vi>1?'s':''} per measure`);
                }
                break;

            case 'beats-per-minute':
                for(let vi=40; vi<=300; vi+=10) {
                    optionsHTML += callback(vi, vi+ ` beat${vi>1?'s':''} per minute`);
                }
                break;

            case 'groups':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback(key, key);
                    });
                break;

            case 'command-group-execute':
                if(songData.instructions)
                    Object.keys(songData.instructions).forEach(function(key, i) {
                        optionsHTML += callback('@' + key, '@' + key);
                    });
                break;
        }
        return optionsHTML;
    }

}
