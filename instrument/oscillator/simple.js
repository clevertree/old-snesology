

(function() {

    class iOscillatorSimple {
        constructor(context, preset, instrumentID) {
            this.id = instrumentID;
            this.config = preset.config || {};            // TODO: validate config
            this.periodicWave = null;

            if(this.config.type === 'custom') {
                this.loadPeriodicWave(context, this.config.url, function(periodicWave) {
                    this.periodicWave = periodicWave;
                }.bind(this));
            }
        }

        play(destination, frequency, startTime, duration) {
            if (!this.config.detune) {
                this.createOscillator(destination, frequency, 0, startTime, duration);
            } else {
                this.createOscillator(destination, frequency, -this.config.detune, startTime, duration);
                this.createOscillator(destination, frequency, this.config.detune, startTime, duration);
            }
        }

        createOscillator(destination, frequency, detune, startTime, duration) {
            const osc = destination.context.createOscillator();   // instantiate an oscillator
            osc.frequency.value = frequency;    // set Frequency (hz)
            if(detune)
                osc.detune.value = detune;

            if(this.config.type !== 'custom') {
                osc.type = this.config.type;
            } else {
                osc.setPeriodicWave(this.periodicWave);
            }

            osc.connect(destination);

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
                        <legend>${instrumentID}: ${this.config.name} (Oscillator)</legend>
                        <label>Type:</label>
                        <select name="type" title="Type">
                            ${BUILD_IN_TYPES.map(type => `<option ${this.config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                        </select>
                        <label>Detune:</label>
                        <input name="detune" type="range" min="-100" max="100" value="${this.config.detune}" />
                    </fieldset>
                </form>
            `
        };

        loadPeriodicWave(context, url, onLoaded) {
            url = new URL(url, this.config.url) + '';

            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'json';
            xhr.onload = function() {
                if(xhr.status !== 200)
                    throw new Error("Periodic periodicWave not found: " + url);

                const tables = xhr.response;
                var c = tables.real.length;
                var real = new Float32Array(c);
                var imag = new Float32Array(c);
                for (var i = 0; i < c; i++) {
                    real[i] = tables.real[i];
                    imag[i] = tables.imag[i];
                }

                const periodicWave = context.createPeriodicWave(real, imag);
                onLoaded(periodicWave);
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