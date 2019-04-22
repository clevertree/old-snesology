
class BufferSourceInstrument extends HTMLElement {
    // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }
    get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/sample.library.json'; }

    constructor(config) {
        super();
        if(!BufferSourceInstrument.NEW_COUNTER)
            BufferSourceInstrument.NEW_COUNTER = 1;
        if(!BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL)
            BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL = null;

        // this.id = instrumentID;
        if(!config)
            config = {};
        if(!config.name)
            config.name = this.constructor.name + BufferSourceInstrument.NEW_COUNTER++;
        if(!config.samples)
            config.samples = {};
        // if(!config.preset)
        //     config.preset = {};
        this.config = config;            // TODO: validate config
        this.buffers = {};
        this.library = null;
    }

    connectedCallback() {
        // this.song = this.closest('music-song'); // Don't rely on this !!!
        this.addEventListener('change', this.onSubmit);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);


        this.render();
        this.loadDefaultLibrary();
    }

    // instruments receive audioContext only after user gesture-
    init(audioContext) {
        this.loadDefaultSample(audioContext);
        // this.initSamples(audioContext);
    }

    loadDefaultLibrary() {
        if(!this.library) {
            this.loadSampleLibrary(this.config.libraryURL || this.DEFAULT_SAMPLE_LIBRARY_URL, () => {
                this.render();
                this.loadDefaultLibrary();
            });
        } else if (this.library.libraries && !this.library.instruments && !this.library.samples) {
            const firstLibrary = this.library.libraries[0];
            firstLibrary.url = new URL(firstLibrary.url, this.library.url)+'';
            if(firstLibrary.url !== this.library.url) {
                this.loadSampleLibrary(firstLibrary.url, libraryData => {
                    this.render();
                    this.loadDefaultLibrary();
                })
            }
        }
    }

    loadDefaultSample(audioContext) {

        // Sample Library
        if(!this.library) {
            this.loadSampleLibrary(this.config.libraryURL || this.DEFAULT_SAMPLE_LIBRARY_URL, libraryData => {
                this.loadDefaultSample(audioContext);
            })

        } else if(this.library.instruments) {
            if(Object.keys(this.config.samples).length === 0) {
                const sampleInstrument = Object.keys(this.library.instruments)[0];

                console.info("Loading default sample instrument: " + sampleInstrument);
                Object.assign(this.config, this.loadSampleInstrument(sampleInstrument));
                this.initSamples(audioContext); // TODO: inefficient reload?
                this.render();

                // this.setConfig(newConfig, audioContext);

                // this.dispatchEvent(new CustomEvent('instrument:initiated', {
                //     detail: this,
                //     bubbles: true
                // }));
                // TODO: re-render

                // console.warn("No default presets found");
            }


        } else if (this.library.libraries) {
            const firstLibrary = this.library.libraries[0];
            this.loadSampleLibrary(firstLibrary.url, libraryData => {
                this.loadDefaultSample(audioContext);
            })
        } else {
            console.warn("No default samples found");
        }
    }

    initSamples(audioContext) {
        for(let sampleName in this.config.samples) {
            if (this.config.samples.hasOwnProperty(sampleName)) {
                const sampleConfig = this.config.samples[sampleName];
                if (!sampleConfig.url)
                    throw new Error("Sample config is missing url");
                this.loadAudioSample(audioContext, sampleConfig.url, (err, audioBuffer) => {
                    if (err)
                        throw new err;
                    this.buffers[sampleName] = audioBuffer;
                })
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

                const playbackRate = frequencyValue / sampleConfig.keyRoot || 440;
                const source = this.playBuffer(buffer, sampleConfig.loop, playbackRate, destination, startTime, duration);
                if (source)
                    sources.push(sources);
            }
        }

        return sources;
    }

    playBuffer(buffer, loop, playbackRate, destination, startTime, duration) {

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

    render() {
        // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
        this.innerHTML = `
            <form class="instrument-editor">
                <legend class="themed">Preset</legend>
                <label>
                    <select name="preset" title="Load Preset" class="themed">
                        <option value="">Select Preset</option>
                        ${this.library && this.library.instruments ? 
                            `<optgroup label="${this.library.name || 'Unnamed Library'}">` +
                            Object.keys(this.library.instruments).map((presetName) => {
                                const instrumentConfig = this.library.instruments[presetName];
                                let title = presetName || instrumentConfig.title;
                                const selected = presetName === this.config.preset ? ` selected="selected"` : '';
                                return `<option value="${presetName}" ${selected}>${title}</option>`;
                            }).join("\n")
                            + `</optgroup>`
                        : null}
                        ${this.library && this.library.libraries ? 
                            `<optgroup label="Other Libraries"}">` +
                            this.library.libraries.map((libraryConfig) => {
                                if (typeof libraryConfig !== 'object') libraryConfig = {url: libraryConfig};
                                if(!libraryConfig.title) libraryConfig.title = libraryConfig.url.split('/').pop();
                                return `<option value="${libraryConfig.url}">${libraryConfig.title}</option>`;
                            }).join("\n")
                            + `</optgroup>`
                        : null}
                    </select>
                </label>
            </form>
        `;

    };

    onSubmit(e) {
        e.preventDefault();
        const form = e.target.form || e.target;
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
        const newConfig = Object.assign({}, this.config);
        for(let i=0; i<form.elements.length; i++)
            if(form.elements[i].name)
                newConfig[form.elements[i].name] = form.elements[i].value;

        // Validate Config
        if(newConfig.preset !== this.config.preset) {
            Object.assign(newConfig, this.loadSampleInstrument(newConfig.preset));
        }

        this.config = newConfig;
        this.render();
        this.dispatchEvent(new CustomEvent('config:updated', {
            bubbles:true,
            detail: this.config
        }))
    }

    loadSampleInstrument(presetName) {
        const urlPrefix = this.library.urlPrefix || '';
        const newConfig = Object.assign({}, this.config);
        newConfig.preset = presetName;
        newConfig.samples = {};
        const presetConfig = this.library.instruments[presetName];
        // Object.assign(newConfig, presetConfig);
        Object.keys(presetConfig.samples).forEach((sampleName) => {
            const sampleConfig =
                Object.assign({},
                    presetConfig.samples[sampleName],
                    this.library.samples[sampleName]);
            sampleConfig.url = new URL(urlPrefix + sampleConfig.url, this.library.url) + '';
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

    // static validateConfig(config, form) {
    //     console.info("Validate: ", config, form);
    // }

    loadAudioSample(context, sampleURL, onLoad) {
        const request = new XMLHttpRequest();

        request.open('GET', sampleURL, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            var audioData = request.response;

            context.decodeAudioData(audioData,
                (buffer) => {
                    onLoad(null, buffer);
                },

                (e) => {
                    onLoad("Error with decoding audio data" + e.error, null);
                }
            );
        };

        request.send();
    }

    loadSampleLibrary(libraryURL, onLoaded) {
        const url = new URL(libraryURL, document.location);

        const xhr = new XMLHttpRequest();
        xhr.open('GET', url + '', true);
        xhr.responseType = 'json';
        xhr.onload = () => {
            if(xhr.status !== 200)
                throw new Error("Sample library not found: " + url);

            this.library = xhr.response;
            this.library.url = url+'';
            console.log("LIBRARY", this.library);
            BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL = url + '';

            this.render(); // Re-render
            onLoaded && onLoaded(this.library);
        };
        xhr.send();

    }


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

customElements.define('instrument-buffersource', BufferSourceInstrument);
document.dispatchEvent(new CustomEvent('instrument:loaded', {
    detail: {
        "class": BufferSourceInstrument,
        "path": "/instrument/instrument-buffersource.element.js"
    }
}));