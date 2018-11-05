// const NAMESPACE = 'snesology.net'; // For local debugging 'localhost'
(function() {
    const CLASS_PATH = '/instrument/audiosource/buffersource.instrument.js';
    const NAMESPACE = document.location.origin; // 'localhost'; // For local debugging 'snesology.net'
    let NEW_COUNTER = 1;
    let LAST_SAMPLE_LIBRARY_URL = null;

    class BufferSourceInstrument {
        get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/index.library.json'; }

        constructor(config, audioContext) {
            // this.id = instrumentID;
            if(!config.name)
                config.name = this.constructor.name + NEW_COUNTER++;
            if(!config.samples)
                config.samples = [];
            if(!config.preset)
                config.preset = {};
            this.config = config;            // TODO: validate config
            this.buffers = {};
            this.presetHTML = [];
            this.lastEditorContainer = null;

            for(const i=0; i<config.samples.length; i++) {
                const sampleConfig = config.samples[i];
                if(!sampleConfig.url)
                    throw new Error("Sample config is missing url");
                this.loadAudioSample(audioContext, sampleConfig.url, (err, audioBuffer) => {
                    if(err)
                        throw new err;
                    this.buffers[sampleConfig.url] = audioBuffer;
                })
            }

            // Sample Library
            this.loadSampleLibrary(LAST_SAMPLE_LIBRARY_URL || this.DEFAULT_SAMPLE_LIBRARY_URL);
        }


        play(destination, frequency, startTime, duration) {

            // Loop through samples
            const sources = [];
            for(var i=0; i<this.config.samples.length; i++) {
                const sampleConfig = this.config.samples[i];

                // Filter sample playback

                const source = this.playSample(sampleConfig, destination, frequency, startTime, duration);
                if(source)
                    sources.push(sources);
            }

            return sources;
        }

        playSample(sampleConfig, destination, frequency, startTime, duration) {
            if(typeof this.buffers[sampleConfig.url] === 'undefined')
                return console.error("Sample not loaded: " + sampleConfig.url);
            const buffer = this.buffers[sampleConfig.url];

            const source = destination.context.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

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
            const defaultSampleLibraryURL = new URL('/sample/', NAMESPACE) + '';
            editorContainer.innerHTML = `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${instrumentID}: ${this.config.name} (${this.constructor.name})</legend>
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

                const library = xhr.response;
                LAST_SAMPLE_LIBRARY_URL = url + '';

                let html = '';
                const index = Array.isArray(library.index) ? library.index : Object.keys(library.index);
                for(var i=0; i<index.length; i++) {
                    const path = index[i];
                    let value = library.baseURL + path;
                    let title = path;
                    if(path.endsWith('.library.json'))
                        title = "Library: " + title.replace('.library.json', '');
                    html += `<option value="${value}">${title}</option>`;
                }
                this.presetHTML = `<optgroup label="${library.name}">` + html + `</optgroup>`;
                if(this.lastEditorContainer)  // Re-render
                    this.renderEditor(this.lastEditorContainer);
                onLoaded && onLoaded();
            };
            xhr.send();

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
        classPath: CLASS_PATH,
        origin: NAMESPACE
    }}));

})();
