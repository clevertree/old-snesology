

(function() {
    const CACHE_PERIOD_WAVE = {};
    let NEW_COUNTER = 1;
    class iOscillatorSimple {
        constructor(context, preset) {
            // this.id = instrumentID;
            if(!preset.config)
                preset.config = {};
            if(!preset.name)
                preset.name = this.constructor.name + NEW_COUNTER++;
            const config = preset.config;
            this.preset = preset;            // TODO: validate config
            this.presetHTML = [];
            this.lastEditorContainer = null;

            if(config.type === 'custom') {
                this.periodicWave = null;
                this.periodicWaveName = "loading...";
                if(!config.customURL)
                    config.customURL = new URL('/sample/index.library.json', document.location) + '';
                this.loadPeriodicWave(context, config.customURL, (periodicWave, finalURL) => {
                    this.periodicWave = periodicWave;
                    this.periodicWaveName = (finalURL+'').split('/').pop().replace('.json', '');
                    if(this.lastEditorContainer)  // Re-render
                        this.renderEditor(this.lastEditorContainer);
                });
            }
        }

        unload() {
            const config = this.preset.config || {};
            const customURL = config.customURL;
            if(customURL && CACHE_PERIOD_WAVE[customURL]) {
                const cache = CACHE_PERIOD_WAVE[customURL];
                cache.queue.splice(cache.queue.indexOf(this), 1);
                cache.count--;
                if (cache.count <= 0) {
                    delete CACHE_PERIOD_WAVE[customURL];
                    console.info("Unloading " + customURL);
                }
            }
        }



        play(destination, frequency, startTime, duration) {
            const osc = destination.context.createOscillator();   // instantiate an oscillator
            osc.frequency.value = frequency;    // set Frequency (hz)
            if(typeof this.preset.config.detune !== "undefined")
                osc.detune.value = this.preset.config.detune;

            if(this.periodicWave) {
                osc.setPeriodicWave(this.periodicWave);
            } else {
                osc.type = this.preset.config.type;
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
            // this.loadSampleLibrary()
            const defaultSampleLibraryURL = new URL('/sample/', document.location) + '';
            editorContainer.innerHTML = `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${instrumentID}: ${this.preset.name} (Oscillator)</legend>
                        <label class="oscillator-type">Type:
                            <select name="type" title="Wave Type">
                                ${BUILD_IN_TYPES.map(type => `<option ${this.preset.config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                            </select>
                        </label>
                        <label class="oscillator-custom-url" ${this.preset.config.type !== 'custom' ? 'style="display: none;"' : ''}>Custom:
                            <select name="customURL" title="Custom Periodic Wave">
                                <option value="${this.preset.config.customURL}">${this.periodicWaveName}</option>
                                ${this.presetHTML}
                                <option value="${defaultSampleLibraryURL}">More Samples...</option>
                            </select>
                        </label>
                        <label class="oscillator-detune">Detune:
                            <input name="detune" type="range" min="-100" max="100" value="${this.preset.config.detune}" />
                        </label>
                    </fieldset>
                </form>
            `;
        };

        loadPeriodicWave(context, urlString, onLoaded) {
            if(urlString.substr(-1, 1) === '/')
                urlString = urlString + 'index.library.json';


            const url = new URL(urlString, document.location);
            if(url.pathname.endsWith('.library.json')) {
                // Load default sample from sample library:
                return this.loadSampleLibrary(url, (library) => {
                    let baseURL = library.baseURL;
                    if(url.hash) {
                        const hashParam = url.hash.substr(1);
                        if(library.index.indexOf(hashParam) === -1)
                            console.error("Redirect path not found in list: " + hashParam, library);
                        baseURL += hashParam;
                    } else {
                        baseURL += library.default || library.index[0];
                    }
                    this.updatePresetList(url, library);
                    // console.info("Redirecting... " + baseURL);
                    this.loadPeriodicWave(context, baseURL, onLoaded);
                });
            }

            if(CACHE_PERIOD_WAVE[urlString]) {
                if (CACHE_PERIOD_WAVE[urlString].periodicWave)
                    return onLoaded(CACHE_PERIOD_WAVE[urlString].periodicWave, urlString);

                CACHE_PERIOD_WAVE[urlString].queue.push(onLoaded);
                CACHE_PERIOD_WAVE[urlString].count++;
                return;
            }

            // Load
            CACHE_PERIOD_WAVE[urlString] = {periodicWave: null, count:1, queue:[onLoaded]};

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url + '', true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if(xhr.status !== 200)
                    throw new Error("Periodic periodicWave not found: " + url);

                const tables = xhr.response;
                if(!tables.real || !tables.imag)
                    throw new Error("Invalid JSON for periodic wave");
                var c = tables.real.length;
                var real = new Float32Array(c);
                var imag = new Float32Array(c);
                for (var i = 0; i < c; i++) {
                    real[i] = tables.real[i];
                    imag[i] = tables.imag[i];
                }

                const periodicWave = context.createPeriodicWave(real, imag);
                console.info("Loaded Periodic wave: " + url);

                if(!CACHE_PERIOD_WAVE[urlString]) {
                    console.warn("Periodic wave load canceled: " + urlString);
                } else {
                    CACHE_PERIOD_WAVE[urlString].periodicWave = periodicWave;
                    CACHE_PERIOD_WAVE[urlString].queue.forEach(onLoaded => onLoaded(periodicWave, url));
                    CACHE_PERIOD_WAVE[urlString].queue = [];
                }
            };
            xhr.send();
        }

        loadSampleLibrary(urlString, onLoaded) {
            const url = new URL(urlString, this.preset.config.customURL);
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
                onLoaded(library);
            };
            xhr.send();
        }

        updatePresetList(libraryURL, library) {
            libraryURL = new URL(libraryURL);
            libraryURL.hash = '';
            let html = '';
            for(var i=0; i<library.index.length; i++) {
                const path = library.index[i];
                let value = library.baseURL + path;
                let title = path;
                if(path.endsWith('.library.json')) {
                    title = title.replace('.library.json', '') + " (Library)";
                } else {
                    value = libraryURL + '#' + path;
                }
                html += `<option value="${value}">${title}</option>`;
            }
            this.presetHTML = `<optgroup label="${library.name}">\n` + html + `</optgroup>`;
        }

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

    class iOscillatorDoubleDetune extends iOscillatorSimple {
        play(destination, frequency, startTime, duration) {
            const positive = super.play(destination, frequency, startTime, duration);
            const negative = super.play(destination, frequency, startTime, duration);
            negative.detune.value = -negative.detune.value;
        }
    }

    const NAMESPACE = document.location.origin; // 'localhost'; // For local debugging 'snesology.net'
    // const NAMESPACE = 'snesology.net'; // For local debugging 'localhost'
    if (!window.instruments)
        window.instruments = {};
    if (!window.instruments[NAMESPACE])
        window.instruments[NAMESPACE] = {};
    window.instruments[NAMESPACE]['/instrument/oscillator/simple.js'] = iOscillatorSimple;
    window.instruments[NAMESPACE]['/instrument/oscillator/simple.js#doubledetune'] = iOscillatorDoubleDetune;

    // instrument

    const BUILD_IN_TYPES = [
        'sine', 'square', 'sawtooth', 'triangle', 'custom'
    ]

})();