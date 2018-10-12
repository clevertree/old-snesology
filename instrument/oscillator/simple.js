

(function() {

    class iOscillatorSimple {
        constructor(context, preset, instrumentID) {
            this.id = instrumentID;
            this.preset = preset;            // TODO: validate config
            this.periodicWave = null;

            if(this.preset.config.type === 'custom') {
                this.loadPeriodicWave(context, this.preset.config.url, (periodicWave) => {
                    this.periodicWave = periodicWave;
                });
            }
        }

        play(destination, frequency, startTime, duration) {
            if (!this.preset.config.detune) {
                this.createOscillator(destination.context, frequency, 0, startTime, duration)
                    .connect(destination);
            } else {
                this.createOscillator(destination.context, frequency, -this.preset.config.detune, startTime, duration)
                    .connect(destination);
                this.createOscillator(destination.context, frequency, this.preset.config.detune, startTime, duration)
                    .connect(destination);
            }
        }

        createOscillator(context, frequency, detune, startTime, duration) {
            const osc = context.createOscillator();   // instantiate an oscillator
            osc.frequency.value = frequency;    // set Frequency (hz)
            if(detune)
                osc.detune.value = detune;

            if(this.preset.config.type !== 'custom') {
                osc.type = this.preset.config.type;
            } else {
                osc.setPeriodicWave(this.periodicWave);
            }

            // Play note
            if(startTime) {
                osc.start(startTime);
                if(duration) {
                    osc.stop(startTime + duration);
                }
            }
            return osc;

        }

        renderEditor() {

            const instrumentID = this.id < 10 ? "0" + this.id : "" + this.id;
            return `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${instrumentID}: ${this.preset.name} (Oscillator)</legend>
                        <label>Type:</label>
                        <select name="type" title="Type">
                            ${BUILD_IN_TYPES.map(type => `<option ${this.preset.config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                        </select>
                        <label>Detune:</label>
                        <input name="detune" type="range" min="-100" max="100" value="${this.preset.config.detune}" />
                    </fieldset>
                </form>
            `
        };

        loadPeriodicWave(context, url, onLoaded) {
            url = new URL(url, this.preset.config.url);

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url + '', true);
            xhr.responseType = 'json';
            xhr.onload = () => {
                if(xhr.status !== 200)
                    throw new Error("Periodic periodicWave not found: " + url);

                if(url.pathname.endsWith('.library.json')) {
                    const library = xhr.response;
                    let baseURL = library.baseURL;
                    if(url.search) {
                        const searchParam = url.search.substr(1);
                        if(library.index.indexOf(searchParam) === -1)
                            console.error("Redirect path not found in list: " + searchParam, library);
                        baseURL += searchParam;
                    }
                    console.info("Redirecting... " + baseURL);
                    this.loadPeriodicWave(context, baseURL, onLoaded);

                } else {
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
                    onLoaded(periodicWave);
                }
            };
            xhr.send();
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

    // snesology.net.instruments.oscillator
    if (!window.instruments)
        window.instruments = {};
    if (!window.instruments['snesology.net'])
        window.instruments['snesology.net'] = {};
    window.instruments['snesology.net']['/instrument/oscillator/simple.js'] = iOscillatorSimple;
    window.instruments['localhost'] = window.instruments['snesology.net']; // For local debugging

    // instrument

    const BUILD_IN_TYPES = [
        'sine', 'square', 'sawtooth', 'triangle', 'custom'
    ]

})();