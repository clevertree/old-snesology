
class SynthesizerInstrument extends HTMLElement {
    // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }
    get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/sample.library.json'; }

    constructor(config) {
        super();
        if(!config)
            config = {};
        // if(!config.name)
        //     config.name = this0.constructor.name + BufferSourceInstrument.NEW_COUNTER++;
        if(!config.samples)
            config.samples = {};
        this.config = config;            // TODO: validate config
        this.buffers = {};
        this.librarySelected = null;
        this.libraryHistory = [];
        this.audioContext = null;
        this.loadDefaultLibrary();
    }

    connectedCallback() {
        // this.song = this.closest('music-song'); // Don't rely on this !!!
        this.addEventListener('change', this.onInput);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onInput);

        this.render();
    }

    async initSamples(audioContext) {
        for(let sampleName in this.config.samples) {
            if (this.config.samples.hasOwnProperty(sampleName)) {
                const sampleConfig = this.config.samples[sampleName];
                if (!sampleConfig.url)
                    throw new Error("Sample config is missing url");
                this.buffers[sampleName] = await this.loadAudioSample(audioContext, sampleConfig.url);
            }
        }
    }


    // instruments receive audioContext only after user gesture
    init(audioContext) {
        this.audioContext = audioContext;
        this.initSamples(audioContext);
    }

    async loadDefaultLibrary() {
        if(!this.librarySelected) {
            await this.loadSampleLibrary(this.config.libraryURL || this.DEFAULT_SAMPLE_LIBRARY_URL);
            this.render();
            await this.loadDefaultLibrary();

        } else if (this.librarySelected.libraries && !this.librarySelected.instruments && !this.librarySelected.samples) {
            const firstLibrary = this.librarySelected.libraries[0];
            firstLibrary.url = new URL(firstLibrary.url, this.librarySelected.url)+'';
            if(firstLibrary.url !== this.librarySelected.url) {
                await this.loadSampleLibrary(firstLibrary.url);
                this.render();
                await this.loadDefaultLibrary();
            }

        } else if(this.librarySelected.instruments) {
            // Load default sample
            if(Object.keys(this.config.samples).length === 0) {
                const sampleInstrument = Object.keys(this.librarySelected.instruments)[0];

                Object.assign(this.config, this.getInstrumentPresetConfig(sampleInstrument));
//                 console.info("Loaded default sample instrument: " + sampleInstrument, this.config);
                if(this.audioContext)
                    await this.initSamples(this.audioContext);
                this.render();
            }
        }
    }



    play(destination, commandFrequency, startTime, duration) {
        const frequencyValue = this.getCommandFrequency(commandFrequency);

        // Loop through sample
        const sources = [];
        for(let sampleName in this.config.samples) {
            if(this.config.samples.hasOwnProperty(sampleName)) {
                const sampleConfig = this.config.samples[sampleName];

                // Filter sample playback
                if (sampleConfig.keyLow > frequencyValue)
                    continue;
                if (sampleConfig.keyHigh && sampleConfig.keyHigh < frequencyValue)
                    continue;


                if (typeof this.buffers[sampleName] === 'undefined')
                    return console.error("Sample not loaded: " + sampleConfig.url);
                const buffer = this.buffers[sampleName];


                let source;
                if(buffer instanceof PeriodicWave) {
                    source = this.playPeriodicWave(buffer, destination, frequencyValue, sampleConfig.detune, startTime, duration);
                } else if(buffer instanceof AudioBuffer) {
                    const playbackRate = frequencyValue / (sampleConfig.keyRoot || 440);
                    source = this.playBuffer(buffer, destination, playbackRate, sampleConfig.loop, startTime, duration);
                } else {
                    throw new Error("Unknown buffer type");
                }

                if (source)
                    sources.push(sources);
            }
        }

        return sources;
    }



    playPeriodicWave(periodicWave, destination, frequency, detune, startTime, duration) {
        // const frequencyValue = this.getCommandFrequency(commandFrequency);

        const osc = destination.context.createOscillator();   // instantiate an oscillator
        osc.frequency.value = frequency;    // set Frequency (hz)
        if(typeof detune !== "undefined")
            osc.detune.value = detune;

        if(typeof periodicWave === "string") {
            osc.type = periodicWave;
        } else {
            osc.setPeriodicWave(periodicWave);
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

    playBuffer(buffer, destination, playbackRate, loop, startTime, duration) {
        const source = destination.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = playbackRate; //  Math.random()*2;

        // songLength = buffer.duration;
        // source.playbackRate.value = playbackControl.value;

        // Play note
        if(startTime) {
            source.start(startTime);
            if(duration) {
                source.stop(startTime + duration);
            }
        }
        source.connect(destination);
        // console.log("Buffer Play: ", playbackRate);
        return source;
    }

    getInstrumentPresetConfig(presetName) {
        const urlPrefix = this.librarySelected.urlPrefix || '';
        const newConfig = Object.assign({}, this.config);
        newConfig.preset = presetName;
        newConfig.samples = {};
        if(!this.librarySelected.instruments[presetName])
            throw new Error("Invalid Instrument Preset: " + presetName);
        const presetConfig = this.librarySelected.instruments[presetName];
        if(!presetConfig.samples)
            presetConfig.samples = {};
        if(Object.keys(presetConfig.samples).length === 0)
            presetConfig.samples[presetName] = {};
        // Object.assign(newConfig, presetConfig);
        Object.keys(presetConfig.samples).forEach((sampleName) => {
            const sampleConfig =
                Object.assign({},
                    presetConfig.samples[sampleName],
                    this.librarySelected.samples[sampleName]);
            sampleConfig.url = new URL(urlPrefix + sampleConfig.url, this.librarySelected.url) + '';
            if(sampleConfig.keyRoot)
                sampleConfig.keyRoot = this.getCommandFrequency(sampleConfig.keyRoot);

            if(typeof sampleConfig.keyRange !== "undefined") {
                let pair = sampleConfig.keyRange;
                if(typeof pair === 'string')
                    pair = pair.split('-');
                sampleConfig.keyLow = pair[0];
                sampleConfig.keyHigh = pair[1] || pair[0];
                delete sampleConfig.keyRange;
            }
            if(typeof sampleConfig.keyLow !== "undefined")
                sampleConfig.keyLow = this.getCommandFrequency(sampleConfig.keyLow);
            if(typeof sampleConfig.keyHigh !== "undefined")
                sampleConfig.keyHigh = this.getCommandFrequency(sampleConfig.keyHigh);
            newConfig.samples[sampleName] = sampleConfig;
        });

        return newConfig;
    }

    async loadAudioSample(context, url) {
        if (!url)
            throw new Error("Invalid url");
        url = new URL(url, document.location) + '';

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.open('GET', url, true);
            const ext = url.split('.').pop().toLowerCase();
            switch(ext) {
                case 'wav':
                    xhr.responseType = 'arraybuffer';

                    xhr.onload = function () {
                        var audioData = xhr.response;
                        // Determine wave sample or periodic wave
                        context.decodeAudioData(audioData,
                            (buffer) => {
                                resolve(buffer);
                            },

                            (e) => {
                                reject("Error with decoding audio data" + e.error, null);
                            }
                        );
                    };

                    xhr.send();
                    break;
                case 'json':
                    xhr.responseType = 'json';
                    xhr.onload = () => {
                        if (xhr.status !== 200)
                            return reject("Periodic wave file not found: " + url);

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
                        // console.info("Loaded Periodic wave: " + url);
                        resolve(periodicWave);
                    };
                    xhr.send();
                    break;
                default:
                    reject("Unknown extension: " + ext);
            }
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

                this.librarySelected = xhr.response;
                this.librarySelected.url = url+'';

                if(!this.libraryHistory.find(historyEntry => historyEntry.url === this.librarySelected.url))
                    this.libraryHistory.push({
                        url: this.librarySelected.url,
                        title: this.libraryHistory.length === 0 ? "Home Index" : this.librarySelected.title
                    })
//                 console.log("LIBRARY", this.librarySelected);

                this.render(); // Re-render
                resolve(this.librarySelected);
            };
            xhr.send();
        });
    }

    render() {
        // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
        this.innerHTML = `
            <form class="instrument-setting instrument-preset submit-on-change" data-action="instrument:preset">
                <fieldset class="form-section">
                    <legend>Preset</legend>
                    <select name="preset" title="Load Preset" class="themed">
                        <option value="">Select Preset</option>
                        ${this.librarySelected && this.librarySelected.libraries ? 
                            `<optgroup label="Libraries">` +
                            this.librarySelected.libraries.map((libraryConfig) => {
                                if (typeof libraryConfig !== 'object') libraryConfig = {url: libraryConfig};
                                return `<option value="${libraryConfig.url}">${libraryConfig.title || libraryConfig.url.split('/').pop()}</option>`;
                            }).join("\n")
                            + `</optgroup>`
                        : null}
                        ${this.librarySelected && this.librarySelected.instruments ? 
                            `<optgroup label="${this.librarySelected.title || 'Unnamed Library'}">` +
                            Object.keys(this.librarySelected.instruments).map((presetName) => {
                                const instrumentConfig = this.librarySelected.instruments[presetName];
                                return `<option value="${presetName}" ${presetName === this.config.preset ? ` selected="selected"` : ''}>${presetName || instrumentConfig.title}</option>`;
                            }).join("\n")
                            + `</optgroup>`
                        : null}
                        ${this.libraryHistory ? 
                            `<optgroup label="Other Libraries">` +
                            this.libraryHistory.map((libraryConfig) => {
                                if (typeof libraryConfig !== 'object') libraryConfig = {url: libraryConfig};
                                return `<option value="${libraryConfig.url}">${libraryConfig.title || libraryConfig.url.split('/').pop()}</option>`;
                            }).join("\n")
                            + `</optgroup>`
                        : null}
                    </select>
                </fieldset>
            </form>

            <form action="#" class="instrument-setting instrument-volume submit-on-change" data-action="song:volume">
                <fieldset class="form-section">
                    <legend class="form-section-header">Detune</legend>
                    <div class="volume-container">
                        <input name="volume" type="range" min="1" max="100" value="${0}" class="themed">
                    </div>
                </fieldset>
            </form>
        `;

    };

    onInput(e) {
        if (!this.contains(e.target))
            return;

        // try {
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

        // } catch (err) {
        //     this.editor.onError(err);
        // }
    }

    onSubmit(e) {
        if (e.defaultPrevented)
            return;
        e.preventDefault();
        let form = e.target.form || e.target;
        const command = form.getAttribute('data-action');


        switch(command) {
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
            case 'instrument:preset':
                const newPreset = form.elements['preset'].value;
                if(newPreset.endsWith('.json')) {
                    const libraryURL = new URL(newPreset, this.librarySelected.url) + '';
                    this.loadSampleLibrary(libraryURL);
                } else {
                    Object.assign(this.config, this.getInstrumentPresetConfig(newPreset));
                    if(this.audioContext)
                        this.initSamples(this.audioContext);
                }
                this.render();

                break;

            // default:
            //     const newConfig = Object.assign({}, this.config);
            //     for(let i=0; i<form.elements.length; i++)
            //         if(form.elements[i].name)
            //             newConfig[form.elements[i].name] = form.elements[i].value;
            //
            //     // Validate Config
            //     if(newConfig.preset !== this.config.preset) {
            //         Object.assign(newConfig, this.getInstrumentPresetConfig(newConfig.preset));
            //     }
            //
            //     this.config = newConfig;
            //     this.render();
            //     this.dispatchEvent(new CustomEvent('config:updated', {
            //         bubbles:true,
            //         detail: this.config
            //     }))
        }
    }

    // static validateConfig(config, form) {
    //     console.info("Validate: ", config, form);
    // }


    getFrequencyAliases() {
        const aliases = {
            // 'kick': 'C1',
            // 'snare': 'D1',
        };
        for(let sampleName in this.config.samples) {
            if (this.config.samples.hasOwnProperty(sampleName)) {
                const sampleConfig = this.config.samples[sampleName];
                if(sampleConfig.keyAlias)
                    aliases[sampleName] = sampleConfig.keyAlias;
            }
        }
        return aliases;

        // return {
        //     'kick': 'C1',
        //     'snare': 'D1',
        // };
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

customElements.define('synthesizer-instrument', SynthesizerInstrument);
document.dispatchEvent(new CustomEvent('instrument:loaded', {
    detail: {
        "class": SynthesizerInstrument,
        "path": "/synthesizer/synthesizer-instrument.element.js"
    }
}));