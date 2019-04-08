
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorKeyboard {
    constructor(editor) {
        this.editor = editor;
        this.keyboardLayout = {
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

    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {
            // case 'keydown':
            //     switch(e.key) {
            //         case 'Tab': break;
            //         case ' ': this.player.play(); e.preventDefault(); break;
            //         case 'Escape': this.grid.focus(); break;
            //         default:
            //     }
            //     break;

            default:
                console.error("Unhandled " + e.type, e);
        }
    }

    getKeyboardCommand(key) {
        if(typeof this.keyboardLayout[key] === 'undefined')
            return null;
        const octave = parseInt(this.menu.fieldRenderOctave.value) || 1;
        let command = this.keyboardLayout[key];
        command = command.replace('2', octave+1);
        command = command.replace('1', octave);
        return command;
    }

}
