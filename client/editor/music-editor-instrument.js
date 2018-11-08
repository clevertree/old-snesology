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
        // this.addEventListener('change', this.onSubmit);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);
        this.addEventListener('config:updated', this.onSubmit);


        this.render();
    }

    onSubmit(e) {
        if(e.defaultPrevented)
            return;
        e.preventDefault();

        try {

            switch(e.type) {
                case 'config:updated':
                    // case 'change':
                    console.log("Instrument Form " + e.type, e);
                    this.editor.replaceInstrumentParams(this.id, e.detail);
                    break;

                case 'submit':
                    // case 'change':
                    const form = e.target.form || e.target;
                    const newConfig = {};
                    for(let i=0; i<form.elements.length; i++)
                        if(form.elements[i].name)
                            newConfig[form.elements[i].name] = form.elements[i].value;
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
            try {
                const instrument = this.editor.player.getInstrument(this.id);
                if (instrument instanceof HTMLElement) {
                    this.appendChild(instrument);
                } else if (instrument.render) {
                    const renderedHTML = instrument.render(this);
                    if(renderedHTML)
                        this.innerHTML = renderedHTML;
                } else {
                    throw new Error("No Renderer");
                }

            } catch (e) {
                this.innerHTML = e;
            }
        } else {
            this.innerHTML = "Loading ...";
        }
    }
}
customElements.define('music-editor-instrument', MusicEditorInstrumentElement);

