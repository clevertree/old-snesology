

(function() {


    // var real = new Float32Array(2);
    // var imag = new Float32Array(2);
    // var ac = new AudioContext();
    // var osc = ac.createOscillator();
    //
    // real[0] = 0;
    // imag[0] = 0;
    // real[1] = 1;
    // imag[1] = 0;
    //
    // var wave = ac.createPeriodicWave(real, imag, {disableNormalization: true});
    //
    // osc.setPeriodicWave(wave);
    //
    // osc.connect(ac.destination);
    //
    // osc.start();
    // osc.stop(2);



    class OscillatorSimple {
        constructor(config, instrumentID) {
            this.id = instrumentID;
            this.config = config || {};            // TODO: validate config
        }

        play(destination, frequency, startTime, duration) {

            const osc = destination.context.createOscillator();   // instantiate an oscillator
            osc.type = this.config.type || 'sine';
            osc.frequency.value = frequency;    // set Frequency (hz)

            destination.connect(osc);

            // Play note
            osc.start(startTime);
            osc.stop(startTime + duration);

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
                            ${TYPES.map(type => `<option ${this.config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                        </select>
                    </fieldset>
                </form>
            `
        };

        getNamedFrequency (frequencyName) {
            switch(frequencyName) {
                case 'kick': return 'C4';
                case 'snare': return 'D4';
            }
            return frequencyName;
        }
    }

    // snesology.net.instruments.oscillator
    if(!window.instruments)
        window.instruments = {};
    if(!window.instruments['snesology.net'])
        window.instruments['snesology.net'] = {};
    window.instruments['snesology.net']['/instruments/oscillator.js'] = OscillatorSimple;
    window.instruments['localhost'] = window.instruments['snesology.net']; // For local debugging

    // instrument

    const TYPES = [
        'sine', 'square', 'sawtooth', 'triangle'
    ]
})();