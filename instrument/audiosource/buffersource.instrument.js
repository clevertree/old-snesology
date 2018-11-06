// const NAMESPACE = 'snesology.net'; // For local debugging 'localhost'
(function() {
    const CLASS_PATH = '/instrument/audiosource/buffersource.instrument.js';
    const NAMESPACE = document.location.origin; // 'localhost'; // For local debugging 'snesology.net'
    let NEW_COUNTER = 1;
    let LAST_SAMPLE_LIBRARY_URL = null;

    class BufferSourceInstrument {
        // get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }
        get DEFAULT_SAMPLE_LIBRARY_URL() { return '/instrument/chiptune/snes/ffvi/ffvi.library.json'; }

        constructor(config, audioContext) {
            // this.id = instrumentID;
            if(!config.name)
                config.name = this.constructor.name + NEW_COUNTER++;
            if(!config.samples)
                config.samples = [];
            // if(!config.preset)
            //     config.preset = {};
            this.config = config;            // TODO: validate config
            this.buffers = [];
            this.lastEditorContainer = null;

            for(let i=0; i<config.samples.length; i++) {
                const sampleConfig = config.samples[i];
                if(!sampleConfig.url)
                    throw new Error("Sample config is missing url");
                this.loadAudioSample(audioContext, sampleConfig.url, (err, audioBuffer) => {
                    if(err)
                        throw new err;
                    this.buffers[i] = audioBuffer;
                })
            }

            // Sample Library
            this.loadSampleLibrary(LAST_SAMPLE_LIBRARY_URL || this.DEFAULT_SAMPLE_LIBRARY_URL);
        }


        play(destination, frequency, startTime, duration) {

            // Loop through samples
            const sources = [];
            for(let i=0; i<this.config.samples.length; i++) {
                const sampleConfig = this.config.samples[i];

                // Filter sample playback
                if(typeof this.buffers[i] === 'undefined')
                    return console.error("Sample not loaded: " + sampleConfig.url);
                const buffer = this.buffers[i];

                const playbackRate = frequency / sampleConfig.rootKey || 440;
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

        renderEditor(editorContainer) {
            this.lastEditorContainer = editorContainer;
            const instrumentID = editorContainer.id < 10 ? "0" + editorContainer.id : "" + editorContainer.id;
            // const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
            editorContainer.innerHTML = `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${instrumentID}: ${this.config.name} (${this.constructor.name})</legend>
                        <label class="buffersource-preset">
                            Preset:
                            <select name="preset" title="Load Preset">
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
                    </fieldset>
                </form>
            `;

            var form = editorContainer.querySelector('form.instrument-editor');
            form.addEventListener('change', this.onEditorSubmit.bind(this));
            form.addEventListener('submit', this.onEditorSubmit.bind(this));
        };

        onEditorSubmit(e) {
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
            const newConfig = {};
            for(let i=0; i<form.elements.length; i++)
                if(form.elements[i].name)
                    newConfig[form.elements[i].name] = form.elements[i].value;

            // Validate Config
            if(newConfig.preset !== this.config.preset) {
                Object.assign(newConfig, this.loadPresetConfig(newConfig.preset));
            }

            form.dispatchEvent(new CustomEvent('config:updated', { bubbles:true, detail: newConfig}))
        }

        loadPresetConfig(presetName) {
            const urlPrefix = this.library.urlPrefix || '';
            const newConfig = Object.assign({}, this.config);
            newConfig.samples = [];
            const presetConfig = this.library.instruments[presetName];
            // Object.assign(newConfig, presetConfig);
            Object.keys(presetConfig.samples).forEach((sampleName) => {
                const sampleConfig =
                    Object.assign({},
                        presetConfig.samples[sampleName],
                        this.library.samples[sampleName]);
                sampleConfig.url = new URL(urlPrefix + sampleConfig.url, LAST_SAMPLE_LIBRARY_URL) + '';
                sampleConfig.rootKey = BufferSourceInstrument.getCommandFrequency(sampleConfig.rootKey);
                sampleConfig.lowKey = BufferSourceInstrument.getCommandFrequency(sampleConfig.lowKey);
                sampleConfig.highKey = BufferSourceInstrument.getCommandFrequency(sampleConfig.highKey);
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

                this.library = xhr.response;
                LAST_SAMPLE_LIBRARY_URL = url + '';
                
                if(this.lastEditorContainer)  // Re-render
                    this.renderEditor(this.lastEditorContainer);
                onLoaded && onLoaded();
            };
            xhr.send();

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

    if (!document.instruments)
        document.instruments = {};
    if (!document.instruments[NAMESPACE])
        document.instruments[NAMESPACE] = {};
    document.instruments[NAMESPACE][CLASS_PATH] = BufferSourceInstrument;

    // Notify this instrument has been loaded
    document.dispatchEvent(new CustomEvent('instrument:loaded', {detail: {
        class: BufferSourceInstrument,
        url: NAMESPACE + CLASS_PATH
    }}));

})();
