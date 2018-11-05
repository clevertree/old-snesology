(function() {
    const CLASS_PATH = '/instrument/audiosource/oscillator.instrument.js';
    const NAMESPACE = document.location.origin; // 'localhost'; // For local debugging 'snesology.net'
    let NEW_COUNTER = 1;
    let LAST_SAMPLE_LIBRARY_URL = null;
    class OscillatorInstrument {
        get DEFAULT_SAMPLE_LIBRARY_URL() { return '/instrument/chiptune/snes/ffvi/ffvi.library.json'; }
        // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }

        constructor(config, audioContext) {
            // this.id = instrumentID;
            if(!config.name)
                config.name = this.constructor.name + NEW_COUNTER++;
            if(!config.type)
                config.type = 'sine';
            this.config = config;            // TODO: validate config
            this.presetHTML = [];
            this.lastEditorContainer = null;
            this.periodicWave = null;
            this.periodicWaveName = "loading...";

            // Periodic Wave
            if(config.type === 'custom') {
                this.periodicWave = audioContext.createPeriodicWave(DEFAULT_PERIODIC_WAVE.real, DEFAULT_PERIODIC_WAVE.imag);
                if(config.customURL) {
                    this.loadPeriodicWave(audioContext, config.customURL, (periodicWave) => {
                        this.periodicWave = periodicWave;
                        this.periodicWaveName = (config.customURL+'').split('/').pop().replace('.json', '');
                        if(this.lastEditorContainer)  // Re-render
                            this.renderEditor(this.lastEditorContainer);
                    });
                }
            }

            // Sample Library
            this.loadSampleLibrary(LAST_SAMPLE_LIBRARY_URL || this.DEFAULT_SAMPLE_LIBRARY_URL);
        }

        play(destination, frequency, startTime, duration) {
            const osc = destination.context.createOscillator();   // instantiate an oscillator
            osc.frequency.value = frequency;    // set Frequency (hz)
            if(typeof this.config.detune !== "undefined")
                osc.detune.value = this.config.detune;

            if(this.periodicWave) {
                osc.setPeriodicWave(this.periodicWave);
            } else {
                osc.type = this.config.type;
            }

            // Play note
            if(startTime) {
                osc.start(startTime);
                if(duration) {
                    osc.stop(startTime + duration);
                }
            }
            osc.connect(destination);
            return osc;

        }

        renderEditor(editorContainer) {
            this.lastEditorContainer = editorContainer;
            const instrumentID = editorContainer.id < 10 ? "0" + editorContainer.id : "" + editorContainer.id;
            const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
            editorContainer.innerHTML = `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${instrumentID}: ${this.config.name} (${this.constructor.name})</legend>
                        <label class="oscillator-type">Type:
                            <select name="type" title="Wave Type">
                                ${BUILD_IN_TYPES.map(type => `<option ${this.config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                            </select>
                        </label>
                        <label class="oscillator-custom-url" ${this.config.type !== 'custom' ? 'style="display: none;"' : ''}>Custom:
                            <select name="customURL" title="Custom Periodic Wave">
                                <option value="${this.config.customURL}">${this.periodicWaveName}</option>
                                ${this.presetHTML}
                                <option value="${defaultSampleLibraryURL}">More Samples...</option>
                            </select>
                        </label>
                        <label class="oscillator-detune">Detune:
                            <input name="detune" type="range" min="-100" max="100" value="${this.config.detune}" />
                        </label>
                    </fieldset>
                </form>
            `;

            editorContainer.querySelector('form.instrument-editor').addEventListener('change', (e) => {
                switch(e.target.name) {
                    case 'customURL':
                        const libraryURL = e.target.value;
                        if(libraryURL.endsWith('.library.json')) {
                            console.log("Loading library: " + libraryURL);
                            e.preventDefault();
                            e.stopPropagation();
                            this.loadSampleLibrary(libraryURL);
                            return;
                        }
                        break;
                }
            });
        };

        loadPeriodicWave(context, urlString, onLoaded) {
            if(!urlString)
                throw new Error("Invalid url");
            const url = new URL(urlString, NAMESPACE);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url + '', true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if(xhr.status !== 200)
                    throw new Error("Periodic periodicWave not found: " + url);

                const tables = xhr.response;
                if(!tables.real || !tables.imag)
                    throw new Error("Invalid JSON for periodic wave");
                // var c = tables.real.length;
                // var real = new Float32Array(c);
                // var imag = new Float32Array(c);
                // for (var i = 0; i < c; i++) {
                //     real[i] = tables.real[i];
                //     imag[i] = tables.imag[i];
                // }

                const periodicWave = context.createPeriodicWave(
                    new Float32Array(tables.real),
                    new Float32Array(tables.imag)
                );
                console.info("Loaded Periodic wave: " + url);
                onLoaded(periodicWave);
            };
            xhr.send();
        }

        loadSampleLibrary(libraryURL, onLoaded) {
            const url = new URL(libraryURL, NAMESPACE);
            if(url.pathname.substr(-1, 1) === '/')
                url.pathname += 'index.library.json';

            if(!url.pathname.endsWith('.library.json'))
                throw new Error("Invalid sample library url: " + url);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url + '', true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if(xhr.status !== 200)
                    throw new Error("Sample library not found: " + url);

                const library = xhr.response;
                LAST_SAMPLE_LIBRARY_URL = url + '';

                let html = '';
                const index = Array.isArray(library.index) ? library.index : Object.keys(library.index);
                for(let i=0; i<index.length; i++) {
                    const path = index[i];
                    let value = library.baseURL + path;
                    let title = path;
                    if(path.endsWith('.library.json'))
                        title = "Library: " + title.replace('.library.json', '');
                    html += `<option value="${value}">${title}</option>`;
                }
                this.presetHTML = `<optgroup label="${library.name}">\n` + html + `</optgroup>`;
                if(this.lastEditorContainer)  // Re-render
                    this.renderEditor(this.lastEditorContainer);
                onLoaded && onLoaded();
            };
            xhr.send();

        }

        // static validateConfig(config, form) {
        //     console.info("Validate: ", config, form);
        // }


        getNamedFrequency(frequencyName) {
            switch (frequencyName) {
                case 'kick':
                    return 'C4';
                case 'snare':
                    return 'D4';
            }
            return frequencyName;
        }
    }

    // class iOscillatorDoubleDetune extends OscillatorInstrument {
    //     play(destination, frequency, startTime, duration) {
    //         const positive = super.play(destination, frequency, startTime, duration);
    //         const negative = super.play(destination, frequency, startTime, duration);
    //         negative.detune.value = -negative.detune.value;
    //     }
    // }

    // const NAMESPACE = 'snesology.net'; // For local debugging 'localhost'
    if (!document.instruments)
        document.instruments = {};
    if (!document.instruments[NAMESPACE])
        document.instruments[NAMESPACE] = {};
    document.instruments[NAMESPACE][CLASS_PATH] = OscillatorInstrument;
    
    // Notify this instrument has been loaded
    document.dispatchEvent(new CustomEvent('instrument:loaded', {detail: {
        class: OscillatorInstrument,
        url: NAMESPACE + CLASS_PATH
    }}));
    // document.instruments[URL_ORIGIN]['/instrument/oscillator/simple.js#doubledetune'] = iOscillatorDoubleDetune;

    // instrument

    const BUILD_IN_TYPES = [
        'sine', 'square', 'sawtooth', 'triangle', 'custom'
    ];

    const DEFAULT_PERIODIC_WAVE = {
        real: new Float32Array([0, 1]),
        imag: new Float32Array([1, 0])
    };
})();