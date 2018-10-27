class MusicEditorInstrumentElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    get id() { return parseInt(this.getAttribute('id')); }
    get preset() { return this.editor.getSong().instruments[this.id]; }
    // get instrument() { return this.editor.player.getInstrument(this.id);}

    connectedCallback() {
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);

        this.render();
    }

    onSubmit(e) {
        if(e.defaultPrevented)
            return;
        e.preventDefault();

        try {
            const form = e.target.form || e.target;
            const newConfig = {};
            for(var i=0; i<form.elements.length; i++)
                if(form.elements[i].name)
                    newConfig[form.elements[i].name] = form.elements[i].value;

            switch(e.type) {
                case 'submit':
                case 'change':
                    console.log("Instrument Form " + e.type, newConfig, e);
                    this.editor.replaceInstrumentParams(this.id, newConfig);
                    break;

                case 'input':
                    // Causes problems
                    // this.editor.player.replaceInstrumentParams(this.id, newConfig);
                    break;
            }
        } catch (e) {
            this.editor.onError(e);
        }
    }

    render() {
        if(this.editor.player.isInstrumentLoaded(this.id)) {
            const instrument = this.editor.player.getInstrumentInstance(this.id);
            if(instrument.renderEditor) {
                instrument.renderEditor(this);
            } else {
                this.innerHTML = "No Renderer";
            }
        } else {
            this.innerHTML = "Loading ...";
        }
    }
}
customElements.define('music-editor-instrument', MusicEditorInstrumentElement);

