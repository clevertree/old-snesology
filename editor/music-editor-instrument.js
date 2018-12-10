// Include assets

((INCLUDE_CSS) => {
    if (document.head.innerHTML.indexOf(INCLUDE_CSS) === -1)
        document.head.innerHTML += `<link href="${INCLUDE_CSS}" rel="stylesheet" >`;
})("editor/music-editor-instrument.css");

class MusicEditorInstrumentElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    get id() { return parseInt(this.getAttribute('id')); }
    get preset() { return this.editor.getSongData().instruments[this.id]; }
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
        const instrumentIDHTML = ((id) => (id < 10 ? "0" : "") + id + ": ")(this.id);

        const buttonHTML = `<button class="remove-instrument">x</button>`;

        // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';

        if(this.editor.player.isInstrumentLoaded(this.id)) {
            try {
                const instrument = this.editor.player.getInstrument(this.id);
                const instrumentPreset = this.editor.player.getInstrumentConfig(this.id);
                const instrumentName = instrumentPreset.name
                    ? `${instrumentPreset.name} (${instrument.constructor.name})`
                    : instrument.constructor.name;

                this.innerHTML =
                    `<legend class="input-theme">
                        <form class="form-instrument-name">
                            <label>${instrumentIDHTML}
                                <input name="name" type="text" value="${instrumentName}" />
                            </label>
                            <button class="remove-instrument">x</button>
                        </form>
                    </legend>`;

                if (instrument instanceof HTMLElement) {
                    this.appendChild(instrument);
                } else if (instrument.render) {
                    const renderedHTML = instrument.render(this);
                    if(renderedHTML)
                        this.innerHTML += renderedHTML;
                } else {
                    throw new Error("No Renderer");
                }

            } catch (e) {
                this.innerHTML = `<legend class="themed">${instrumentIDHTML} Error: ${e.message}${buttonHTML}</legend>`;
                this.innerHTML += e.stack;
            }
        } else {
            this.innerHTML = `<legend class="themed">${instrumentIDHTML} Loading...${buttonHTML}</legend>`;
        }

    }
}

class MusicEditorInstrumentListElement extends HTMLElement {
    constructor() {
        super();
        this.editor = null;
    }

    connectedCallback() {
        this.editor = this.closest('music-editor'); // findParent(this, (p) => p.matches('music-editor'));
        this.render();
        this.addEventListener('submit', this.editor.menu.onSubmit.bind(this.editor.menu));
        this.addEventListener('change', this.editor.menu.onSubmit.bind(this.editor.menu));
    }

    render() {
        const song = this.editor.getSongData();
        this.innerHTML =
            (song ? song.instruments.map((instrument, id) =>
                `<music-editor-instrument id="${id}"></music-editor-instrument>`).join('') : null)
            
             + `<form class="form-add-instrument" data-command="song:add-instrument">
                <select name="instrumentURL" class="themed">
                    <option value="">Add New Instrument</option>
                    ${this.editor.renderEditorFormOptions('instruments-available')}
                </select>
            </form>
            
            `;


    }
}
customElements.define('music-editor-instrument', MusicEditorInstrumentElement);
customElements.define('music-editor-instrument-list', MusicEditorInstrumentListElement);

