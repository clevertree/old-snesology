class SongEditorInstruments {
    constructor(editor) {
        this.editor = editor;
        this.instrumentLibrary = {};



        const xhr = new XMLHttpRequest();
        xhr.open('GET', 'instrument/index.json', true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            if(xhr.status !== 200)
                throw new Error("Instrument list not found");
            this.instrumentLibrary = xhr.response;
            this.render();
        };
//         xhr.send();
    }


    get renderElement() {
        let renderElement = this.editor.querySelector('div.editor-instruments');
        if(!renderElement) {
            this.editor.innerHTML += `<div class="editor-instruments"></div>`;
            renderElement = this.editor.querySelector('div.editor-instruments');
        }
        return renderElement;
    }

    // get id() { return parseInt(this.getAttribute('id')); }
    // get preset() { return this.editor.getSongData().instruments[this.id]; }
    // // get instrument() { return this.song.player.getInstrument(this.id);}
    //
    // connectedCallback() {
    //     this.editor = this.closest('song-editor'); // findParent(this, (p) => p.matches('music-song'));
    //     // this.addEventListener('change', this.onSubmit);
    //     // this.addEventListener('input', this.onSubmit);
    //     this.addEventListener('submit', this.onSubmit);
    //     this.addEventListener('config:updated', this.onSubmit);
    //
    //
    //     this.render();
    // }

    onInput(e) {
        if (e.defaultPrevented)
            return;
        if (!this.renderElement.contains(e.target))
            return;

        try {
            switch (e.type) {
                case 'submit':
                case 'change':
                case 'blur':
                    this.onSubmit(e);
                    break;
            }

        } catch (err) {
            this.editor.onError(err);
        }
    }

    onSubmit(e) {
        if(e.defaultPrevented)
            return;
        e.preventDefault();
        let form = e.target;
        switch(e.type) {
            case 'config:updated':
                // case 'change':
                console.log("Instrument Form " + e.type, e);
                this.editor.renderer.replaceInstrumentParams(this.id, e.detail);
                return;
            case 'change':
            case 'blur':
                form = e.target.form;
                if(!form || !form.classList.contains('submit-on-' + e.type))
                    return;
                break;
        }
        // try {
        const command = form.getAttribute('data-command');

        try {

            switch(command) {
                case 'instrument:name':
                    throw new Error("TODO");
                    break;

                case 'instrument:remove':
                    throw new Error("TODO");
                    break;


                case 'submit':
                    // case 'change':
                    const form = e.target.form || e.target;
                    const newConfig = {};
                    for(let i=0; i<form.elements.length; i++)
                        if(form.elements[i].name)
                            newConfig[form.elements[i].name] = form.elements[i].value;
                    console.log("Instrument Form " + e.type, newConfig, e);
                    this.editor.renderer.replaceInstrumentParams(this.id, newConfig);
                    break;

                case 'input':
                    // Causes problems
                    // this.song.player.replaceInstrumentParams(this.id, newConfig);
                    break;
                default:
                    throw new Error("Unexpected event type: " + e.type);
            }
        } catch (e) {
            this.editor.onError(e);
        }
    }


    render() {
        this.renderElement.innerHTML = '';
        const instrumentList = this.editor.renderer.getInstrumentList();
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {
            const instrumentIDHTML = (instrumentID < 10 ? "0" : "") + (instrumentID + ": ");

            let instrumentDiv = document.createElement('div');
            instrumentDiv.setAttribute('data-id', instrumentID+'');
            instrumentDiv.classList.add('instrument-container');
            this.renderElement.appendChild(instrumentDiv);

            // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';

            if(this.editor.renderer.isInstrumentLoaded(instrumentID)) {
                try {
                    const instrument = this.editor.renderer.getInstrument(instrumentID);
                    const instrumentPreset = this.editor.renderer.getInstrumentConfig(instrumentID);
                    const instrumentName = instrumentPreset.name
                        ? `${instrumentPreset.name} (${instrument.constructor.name})`
                        : instrument.constructor.name;

                    instrumentDiv.innerHTML =
                        `<div class="instrument-container-header">
                            <form class="form-instrument-name" data-command="instrument:name">
                                <input type="hidden" value="${instrumentID}"/>
                                <label class="label-instrument-name">${instrumentIDHTML}
                                    <input name="name" type="text" value="${instrumentName}" />
                                </label>
                            </form>
                            <form class="form-instrument-remove" data-command="instrument:remove">
                                <input type="hidden" value="${instrumentID}"/>
                                <button class="remove-instrument">x</button>
                            </form>
                        </legend>`;

                    if (instrument instanceof HTMLElement) {
                        instrumentDiv.appendChild(instrument);
                    } else if (instrument.render) {
                        const renderedHTML = instrument.render(this);
                        if(renderedHTML)
                            instrumentDiv.innerHTML += renderedHTML;
                    } else {
                        throw new Error("No Renderer");
                    }

                } catch (e) {
                    instrumentDiv.innerHTML = `<legend class="themed">${instrumentIDHTML} Error: ${e.message}<button class="remove-instrument">x</button></legend>`
                    + e.stack;
                }
            } else {
                instrumentDiv.innerHTML = `<legend class="themed">${instrumentIDHTML} Loading...<button class="remove-instrument">x</button></legend>`;
            }
        }

        // this.innerHTML =
        //     (song ? song.instruments.map((instrument, id) =>
        //         `<song-editor-instrument id="${id}"></song-editor-instrument>`).join('') : null)
        //
        //     + `<form class="form-add-instrument" data-command="song:add-instrument">
        //         <select name="instrumentURL" class="themed">
        //             <option value="">Add New Instrument</option>
        //             ${this.editor.renderEditorFormOptions('instruments-available')}
        //         </select>
        //     </form>
        //
        //     `;

    }
}
