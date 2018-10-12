

(function() {

    class iOscillatorSimple {
        constructor(context, preset, instrumentID) {
            this.id = instrumentID;
            this.preset = preset;            // TODO: validate config
            this.periodicWave = null;

            if(this.preset.config.type === 'custom') {
                if(!this.preset.config.customURL)
                    console.warn("type=custom requires 'customURL' field");
                else
                    this.loadPeriodicWave(context, this.preset.config.customURL, (periodicWave) => {
                        this.periodicWave = periodicWave;
                    });
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
            return osc;

        }

        renderEditor() {

            const instrumentID = this.id < 10 ? "0" + this.id : "" + this.id;
            return `
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
                            
                            
                            </select>
                        </label>
                        <label class="oscillator-detune">Detune:
                            <input name="detune" type="range" min="-100" max="100" value="${this.preset.config.detune}" />
                        </label>
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
                    if(url.hash) {
                        const hashParam = url.hash.substr(1);
                        if(library.index.indexOf(hashParam) === -1)
                            console.error("Redirect path not found in list: " + hashParam, library);
                        baseURL += hashParam;
                    }
                    // console.info("Redirecting... " + baseURL);
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

    class iOscillatorDoubleDetune extends iOscillatorSimple {
        play(destination, frequency, startTime, duration) {
            const positive = super.play(destination, frequency, startTime, duration);
            const negative = super.play(destination, frequency, startTime, duration);
            negative.detune.value = -negative.detune.value;
        }
    }

    // snesology.net.instruments.oscillator
    if (!window.instruments)
        window.instruments = {};
    if (!window.instruments['snesology.net'])
        window.instruments['snesology.net'] = {};
    window.instruments['snesology.net']['/instrument/oscillator/simple.js'] = iOscillatorSimple;
    window.instruments['snesology.net']['/instrument/oscillator/simple.js#doubledetune'] = iOscillatorDoubleDetune;
    window.instruments['localhost'] = window.instruments['snesology.net']; // For local debugging

    // instrument

    const BUILD_IN_TYPES = [
        'sine', 'square', 'sawtooth', 'triangle', 'custom'
    ]

})();