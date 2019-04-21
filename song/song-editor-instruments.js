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

    onSubmit(e) {
        if(e.defaultPrevented)
            return;
        e.preventDefault();

        try {

            switch(e.type) {
                case 'config:updated':
                    // case 'change':
                    console.log("Instrument Form " + e.type, e);
                    this.editor.renderer.replaceInstrumentParams(this.id, e.detail);
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
                        `<legend class="input-theme">
                            <form class="form-instrument-name">
                                <label>${instrumentIDHTML}
                                    <input name="name" type="text" value="${instrumentName}" />
                                </label>
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
