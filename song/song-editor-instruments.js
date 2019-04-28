class SongEditorInstruments {
    constructor(editor) {
        this.editor = editor;
        // this.instrumentLibrary = {};

    }


    get renderElement() {
        let renderElement = this.editor.querySelector('div.editor-instruments');
        if(!renderElement) {
            this.editor.innerHTML += `<div class="editor-instruments"></div>`;
            renderElement = this.editor.querySelector('div.editor-instruments');
        }
        return renderElement;
    }

    loadInstrumentLibrary(URL, onLoad=null) {
        if(URL === this.editor.instrumentLibraryURL) {
            onLoad && onLoad(this.editor.instrumentLibrary);
            return;
        }

        const xhr = new XMLHttpRequest();
        xhr.open('GET', URL, true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            if(xhr.status !== 200)
                throw new Error("Instrument list not found");
            this.editor.instrumentLibrary = xhr.response;
            this.editor.instrumentLibraryURL = URL;
            onLoad && onLoad(this.editor.instrumentLibrary);
            this.editor.render();
        };
        xhr.send();
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
        if (!this.renderElement.contains(e.target))
            return;

        try {
            switch (e.type) {
                case 'submit':
                    this.onSubmit(e);
                    break;
                case 'change':
                case 'blur':
                    if(e.target.form && e.target.form.classList.contains('submit-on-' + e.type))
                        this.onSubmit(e);
                    break;
            }

        } catch (err) {
            this.editor.onError(err);
        }
    }

    onSubmit(e) {
        e.preventDefault();
        let form = e.target.form || e.target;
        const command = form.getAttribute('data-action');

        try {

            switch(command) {
                case 'instrument:name':
                    this.editor.renderer.replaceInstrumentParam(form.elements['instrumentID'].value, 'name', form.elements['name'].value);
                    break;

                case 'instrument:remove':
                    this.editor.renderer.removeInstrument(form.elements['instrumentID'].value);
                    this.editor.instruments.render();
                    break;

                case 'instrument:change':
                    this.editor.renderer.replaceInstrument(form.elements['instrumentID'].value, form.elements['instrumentURL'].value);
                    this.editor.renderer.loadInstrument(form.elements['instrumentID'].value, true);
                    this.editor.instruments.render(); // Renders instrument in 'loading' state if not yet loaded by loadInstrument()
                    break;


                // case 'change':
                // case 'blur':
                // case 'submit':
                //     const form = e.target.form || e.target;
                //     const newConfig = {};
                //     for(let i=0; i<form.elements.length; i++)
                //         if(form.elements[i].name)
                //             newConfig[form.elements[i].name] = form.elements[i].value;
                //     console.log("Instrument Form " + e.type, newConfig, e);
                //     this.editor.renderer.replaceInstrumentParams(this.id, newConfig);
                //     break;
                // default:
                //     throw new Error("Unexpected command: " + command);
            }
        } catch (e) {
            this.editor.onError(e);
        }
    }

    update() {

    }

    render() {
        this.renderElement.innerHTML = '';
        const instrumentList = this.editor.renderer.getInstrumentList();
        for(let instrumentID=0; instrumentID<instrumentList.length; instrumentID++) {

            let instrumentDiv = document.createElement('div');
            instrumentDiv.setAttribute('data-id', instrumentID+'');
            instrumentDiv.classList.add('instrument-container');
            this.renderElement.appendChild(instrumentDiv);

            // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';

            const instrument = this.editor.renderer.getInstrument(instrumentID, false);
            const instrumentPreset = this.editor.renderer.getInstrumentConfig(instrumentID, false) || {name: "Empty Instrument"};

            instrumentDiv.innerHTML =
                ``;

            if(!instrumentPreset.url) {
                instrumentDiv.innerHTML += `Empty`;

            } else if(!this.editor.renderer.isInstrumentLoaded(instrumentID)) {
                instrumentDiv.innerHTML += `Loading...`;

            } else {
                try {
                    if (instrument instanceof HTMLElement) {
                        instrument.setAttribute('data-id', instrumentID+'');
                        instrumentDiv.appendChild(instrument);
                    } else if (instrument.render) {
                        const renderedHTML = instrument.render(this, instrumentID);
                        if(renderedHTML)
                            instrumentDiv.innerHTML += renderedHTML;
                    } else {
                        throw new Error("No Renderer");
                    }

                } catch (e) {
                    instrumentDiv.innerHTML += e;
                }
            }
        }

        let addInstrumentDiv = document.createElement('div');
        // addInstrumentDiv.setAttribute('data-id', instrumentID+'');
        addInstrumentDiv.classList.add('instrument-add-container');
        this.renderElement.appendChild(addInstrumentDiv);

        // addInstrumentDiv.innerHTML +=
        //     `<form class="form-add-instrument submit-on-change" data-action="instrument:add">
        //         <select name="instrumentURL" class="themed">
        //             <option value="">Add Instrument</option>
        //             ${this.editor.forms.renderEditorFormOptions('instruments-available')}
        //         </select>
        //     </form>`;

    }
}
