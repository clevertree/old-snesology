
class OscillatorInstrument extends HTMLElement {
    // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }
    get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/sample.library.json'; }

    constructor(config) {
        super();
        if (!OscillatorInstrument.NEW_COUNTER)
            OscillatorInstrument.NEW_COUNTER = 1;
        // if (!OscillatorInstrument.LAST_SAMPLE_LIBRARY_URL)
        //     OscillatorInstrument.LAST_SAMPLE_LIBRARY_URL = null;

        // this.id = instrumentID;
        if (!config)
            config = {};
        // if (!config.name)
        //     config.name = this.constructor.name + OscillatorInstrument.NEW_COUNTER++;
        if (!config.type)
            config.type = 'sine';
        this.config = config;            // TODO: validate config
        this.presetHTML = [];
        this.lastEditorContainer = null;
        this.periodicWave = null;
        this.periodicWaveName = "loading...";
        this.library = null;
        this.audioContext = null;
        this.loadDefaultLibrary();
    }

    connectedCallback() {
        this.addEventListener('change', this.onSubmit);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);

        this.render();
    }

    // instruments receive audioContext only after user gesture
    init(audioContext) {
        this.initSamples(audioContext);
        this.audioContext = audioContext;
    }

    async initSamples(audioContext) {
        for(let sampleName in this.config.samples) {
            if (this.config.samples.hasOwnProperty(sampleName)) {
                const sampleConfig = this.config.samples[sampleName];
                if (!sampleConfig.url)
                    throw new Error("Sample config is missing url");
                this.buffers[sampleName] = await this.loadPeriodicWave(audioContext, sampleConfig.url);
            }
        }
    }

    async loadDefaultLibrary() {
        if(!this.library) {
            await this.loadSampleLibrary(this.config.libraryURL || this.DEFAULT_SAMPLE_LIBRARY_URL);
            this.render();
            await this.loadDefaultLibrary();
        } else if (this.library.libraries && !this.library.instruments && !this.library.samples) {
            const firstLibrary = this.library.libraries[0];
            firstLibrary.url = new URL(firstLibrary.url, this.library.url)+'';
            if(firstLibrary.url !== this.library.url) {
                await this.loadSampleLibrary(firstLibrary.url);
                this.render();
                await this.loadDefaultLibrary();
            }
        } else if(this.library.instruments) {
            // Load default sample
            if(Object.keys(this.config.samples).length === 0) {
                const sampleInstrument = Object.keys(this.library.instruments)[0];

                console.info("Loading default sample instrument: " + sampleInstrument);
                Object.assign(this.config, this.getInstrumentPresetConfig(sampleInstrument));
                if (this.audioContext)
                    await this.initSamples(this.audioContext);
                this.render();
            }
            // // Periodic Wave
            // if (this.config.type === 'custom') {
            //     this.periodicWave = audioContext.createPeriodicWave(OscillatorInstrument.DEFAULT_PERIODIC_WAVE.real, OscillatorInstrument.DEFAULT_PERIODIC_WAVE.imag);
            //     if (this.config.customURL) {
            //         this.loadPeriodicWave(audioContext, this.config.customURL, (periodicWave) => {
            //             this.periodicWave = periodicWave;
            //             this.periodicWaveName = (this.config.customURL + '').split('/').pop().replace('.json', '');
            //             if (this.lastEditorContainer)  // Re-render
            //                 this.renderEditor(this.lastEditorContainer);
            //         });
            //     }
            // }
            //
            // // Sample Library
            // this.loadSampleLibrary(OscillatorInstrument.LAST_SAMPLE_LIBRARY_URL || this.DEFAULT_SAMPLE_LIBRARY_URL);



        }
    }



    play(destination, commandFrequency, startTime, duration) {
        const frequencyValue = this.getCommandFrequency(commandFrequency);

        const osc = destination.context.createOscillator();   // instantiate an oscillator
        osc.frequency.value = frequencyValue;    // set Frequency (hz)
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

    render() {
        // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
        this.innerHTML = `
            <form class="oscillator-type">
                <legend class="themed">Type</legend>
                <label>
                    <select name="type" class="themed" title="Wave Type">
                        ${OscillatorInstrument.BUILD_IN_TYPES.map(type => `<option ${this.config.type === type ? 'selected="selected"' : ''}>Type: ${type}</option>`).join('')}
                    </select>
                </label>
                <label class="oscillator-custom-url" ${this.config.type !== 'custom' ? 'style="display: none;"' : ''}>Custom:
                    <select name="customURL" class="themed" title="Custom Periodic Wave">
                        <option value="${this.config.customURL}">${this.periodicWaveName}</option>
                        ${this.presetHTML}
                        <option value="${this.DEFAULT_SAMPLE_LIBRARY_URL}">More Samples...</option>
                    </select>
                </label>
            </form>
            
            <form class="oscillator-detune">
                <legend class="themed">Detune</legend>
                <label>
                    <input name="detune" type="range" min="-100" max="100" value="${this.config.detune}" class="themed"/>
                </label>
            </form>
        `;

        // editorContainer.querySelector('form.instrument-song').addEventListener('change', (e) => {
        //     switch(e.target.name) {
        //         case 'customURL':
        //             const libraryURL = e.target.value;
        //             if(libraryURL.endsWith('.library.json')) {
        //                 console.log("Loading library: " + libraryURL);
        //                 e.preventDefault();
        //                 e.stopPropagation();
        //                 this.loadSampleLibrary(libraryURL);
        //                 return;
        //             }
        //             break;
        //     }
        // });
    };

    async loadPeriodicWave(context, urlString) {
        return new Promise(function (resolve, reject) {
            if (!urlString)
                throw new Error("Invalid url");
            // const url = new URL(urlString, NAMESPACE);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', urlString, true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if (xhr.status !== 200)
                    return reject("Periodic periodicWave not found: " + urlString);

                const tables = xhr.response;
                if (!tables.real || !tables.imag)
                    return reject("Invalid JSON for periodic wave");
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
                console.info("Loaded Periodic wave: " + urlString);
                resolve(periodicWave);
            };
            xhr.send();
        });
    }

    async loadSampleLibrary(url) {
        if (!url)
            throw new Error("Invalid url");
        url = new URL(url, document.location) + '';

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url + '', true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if(xhr.status !== 200)
                    return reject("Sample library not found: " + url);

                this.library = xhr.response;
                this.library.url = url+'';
                console.log("LIBRARY", this.library);

                this.render(); // Re-render
                resolve(this.library);
            };
            xhr.send();
        });
    }

    // static validateConfig(config, form) {
    //     console.info("Validate: ", config, form);
    // }

    getFrequencyAliases() {
        return {
            // 'kick': 'C4',
            // 'snare': 'D4',
        };
    }

    getCommandFrequency (command) {
        if(Number(command) === command && command % 1 !== 0)
            return command;

        const aliases = this.getFrequencyAliases();
        if(typeof aliases[command] !== "undefined")
            command = aliases[command];

        const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
        let octave = command.length === 3 ? command.charAt(2) : command.charAt(1),
            keyNumber = instructions.indexOf(command.slice(0, -1));
        if (keyNumber < 3)  keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1;
        else                keyNumber = keyNumber + ((octave - 1) * 12) + 1;
        return 440 * Math.pow(2, (keyNumber- 49) / 12);
    }
}


OscillatorInstrument.BUILD_IN_TYPES = [
    'sine', 'square', 'sawtooth', 'triangle', 'custom'
];

OscillatorInstrument.DEFAULT_PERIODIC_WAVE = {
    real: new Float32Array([0, 1]),
    imag: new Float32Array([1, 0])
};

customElements.define('instrument-oscillator', OscillatorInstrument);
document.dispatchEvent(new CustomEvent('instrument:loaded', {
    detail: {
        "class": OscillatorInstrument,
        "path": "/synthesizer/synthesizer-instrument.element.js"
    }
}));