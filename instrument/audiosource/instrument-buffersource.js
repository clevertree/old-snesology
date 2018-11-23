
class BufferSourceInstrument extends HTMLElement {
    // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }
    get DEFAULT_SAMPLE_LIBRARY_URL() { return '/instrument/chiptune/snes/ffvi/ffvi.library.json'; }

    constructor(config, audioContext) {
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
            config.samples = [];
        // if(!config.preset)
        //     config.preset = {};
        this.config = config;            // TODO: validate config
        this.buffers = [];

        this.initSamples(audioContext);

        // Sample Library
        this.loadSampleLibrary(BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL || this.DEFAULT_SAMPLE_LIBRARY_URL, () => {
            if(!this.config.preset && this.config.samples.length === 0) {
                const defaultPreset = Object.keys(this.library.instruments)[0];
                if(defaultPreset) {
                    console.info("Loading default preset: " + defaultPreset);
                    Object.assign(this.config, this.loadPresetConfig(defaultPreset));
                    this.initSamples(audioContext); // TODO: inefficient reload?
                    // this.setConfig(newConfig, audioContext);
                } else {
                    console.warn("No default presets found");
                }
            }
        });
    }

    initSamples(audioContext) {
        for(let i=0; i<this.config.samples.length; i++) {
            const sampleConfig = this.config.samples[i];
            if(!sampleConfig.url)
                throw new Error("Sample config is missing url");
            this.loadAudioSample(audioContext, sampleConfig.url, (err, audioBuffer) => {
                if(err)
                    throw new err;
                this.buffers[i] = audioBuffer;
            })
        }
    }

    play(destination, frequency, startTime, duration) {

        // Loop through samples
        const sources = [];
        for(let i=0; i<this.config.samples.length; i++) {
            const sampleConfig = this.config.samples[i];

            // Filter sample playback
            if(sampleConfig.keyLow > frequency)
                continue;
            if(sampleConfig.keyHigh && sampleConfig.keyHigh < frequency)
                continue;


            if(typeof this.buffers[i] === 'undefined')
                return console.error("Sample not loaded: " + sampleConfig.url);
            const buffer = this.buffers[i];

            const playbackRate = frequency / sampleConfig.keyRoot || 440;
            const source = this.playBuffer(buffer, sampleConfig.loop, playbackRate, destination, startTime, duration);
            if(source)
                sources.push(sources);
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
        return source;
    }

    connectedCallback() {
        // this.editor = this.closest('music-editor'); // Don't rely on this !!!
        this.addEventListener('change', this.onSubmit);
        // this.addEventListener('input', this.onSubmit);
        this.addEventListener('submit', this.onSubmit);


        this.render();
    }

    render() {
        // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
        this.innerHTML = `
            <form class="instrument-editor">
                <legend>Preset</legend>
                <label>
                    <select name="preset" title="Load Preset" class="themed">
                        ${this.library ? 
                            `<optgroup label="${this.library.name || 'Unnamed Library'}">` +
                            Object.keys(this.library.instruments).map((presetName) => {
                                const instrumentConfig = this.library.instruments[presetName];
                                let title = presetName || instrumentConfig.title;
                                if(presetName.endsWith('.library.json'))
                                    title = "Library: " + title.replace('.library.json', '');
                                const selected = presetName === this.config.preset ? ` selected="selected"` : '';
                                return `<option value="${presetName}" ${selected}>${title}</option>`;
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
            Object.assign(newConfig, this.loadPresetConfig(newConfig.preset));
        }

        this.config = newConfig;
        this.render();
        this.dispatchEvent(new CustomEvent('config:updated', {
            bubbles:true,
            detail: this.config
        }))
    }

    loadPresetConfig(presetName) {
        const urlPrefix = this.library.urlPrefix || '';
        const newConfig = Object.assign({}, this.config);
        newConfig.preset = presetName;
        newConfig.samples = [];
        const presetConfig = this.library.instruments[presetName];
        // Object.assign(newConfig, presetConfig);
        Object.keys(presetConfig.samples).forEach((sampleName) => {
            const sampleConfig =
                Object.assign({},
                    presetConfig.samples[sampleName],
                    this.library.samples[sampleName]);
            sampleConfig.url = new URL(urlPrefix + sampleConfig.url, BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL) + '';
            sampleConfig.keyRoot = BufferSourceInstrument.getCommandFrequency(sampleConfig.keyRoot);
            if(typeof sampleConfig.keyRange !== "undefined") {
                let pair = sampleConfig.keyRange;
                if(typeof pair === 'string')
                    pair = pair.split('-');
                sampleConfig.keyLow = pair[0];
                sampleConfig.keyHigh = pair[1] || pair[0];
                delete sampleConfig.keyRange;
            }
            if(typeof sampleConfig.keyLow !== "undefined")
                sampleConfig.keyLow = BufferSourceInstrument.getCommandFrequency(sampleConfig.keyLow);
            if(typeof sampleConfig.keyHigh !== "undefined")
                sampleConfig.keyHigh = BufferSourceInstrument.getCommandFrequency(sampleConfig.keyHigh);
            newConfig.samples.push(sampleConfig);
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

            this.library = xhr.response;
            BufferSourceInstrument.LAST_SAMPLE_LIBRARY_URL = url + '';

            this.render(); // Re-render
            onLoaded && onLoaded();
        };
        xhr.send();

    }


    getFrequencyAliases() {
        return {
            'kick': 'C4',
            'snare': 'D4',
        };
    }

    static getCommandFrequency (command) {
        if(Number(command) === command && command % 1 !== 0)
            return command;
        const instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
        let octave = command.length === 3 ? command.charAt(2) : command.charAt(1),
            keyNumber = instructions.indexOf(command.slice(0, -1));
        if (keyNumber < 3)  keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1;
        else                keyNumber = keyNumber + ((octave - 1) * 12) + 1;
        return 440 * Math.pow(2, (keyNumber- 49) / 12);
    }
}

customElements.define('instrument-buffersource', BufferSourceInstrument);
