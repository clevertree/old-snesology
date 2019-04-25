
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorKeyboard {
    constructor(editor) {
        this.editor = editor;
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
        const keyboardLayout = this.editor.constants.keyboardLayout;
        if(typeof keyboardLayout[key] === 'undefined')
            return null;
        const octave = parseInt(this.editor.forms.fieldRenderOctave.value) || 1;
        let command = keyboardLayout[key];
        command = command.replace('2', octave+1);
        command = command.replace('1', octave);
        return command;
    }

}
