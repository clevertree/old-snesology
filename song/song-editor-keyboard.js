
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorKeyboard {
    constructor(editor) {
        this.editor = editor;
    }

    getKeyboardCommand(key) {
        const keyboardLayout = this.editor.values.keyboardLayout;
        if(typeof keyboardLayout[key] === 'undefined')
            return null;
        const octave = parseInt(this.editor.forms.fieldRenderOctave.value) || 1;
        let command = keyboardLayout[key];
        command = command.replace('2', octave+1);
        command = command.replace('1', octave);
        return command;
    }

}
