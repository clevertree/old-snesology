

(function() {

    class OscillatorSimple {
        constructor(config) {
            // TODO: validate config
            this.config = config;
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
            const config = this.config || {};
            return `
                <label>Type:</label>
                <select name="type" title="Type">
                    ${TYPES.map(type => `<option ${config.type === type ? 'selected="selected"' : ''}>${type}</option>`).join('')}
                </select>
                <br/>
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