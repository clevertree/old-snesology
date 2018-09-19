

(function() {
    // snesology.net.instruments.oscillator
    if(!window.instruments)
        window.instruments = {};
    if(!window.instruments['snesology.net'])
        window.instruments['snesology.net'] = {};
    window.instruments['snesology.net']['/instruments/oscillator.js'] = OscillatorSimple;
    window.instruments['localhost'] = window.instruments['snesology.net']; // For local debugging

    // instrument

    /**
     * Oscillator Instrument
     * @param context
     * @param {object} note
     * @returns OscillatorNode
     * @constructor
     */
    function OscillatorSimple(context, note) {
        const oscillatorType = note.instrumentConfig.preset || 'sine';

        const osc = context.createOscillator();   // instantiate an oscillator
        osc.type = oscillatorType;  // set Type
        osc.frequency.value = note.frequency;    // set Frequency (hz)

        note.connect(osc);

        // Play note
        osc.start(note.startTime);               // start the oscillator
        // if(note.duration)
        osc.stop(note.startTime + note.duration);

        // console.info("OSC", noteStartTime, noteDuration);
        return osc;
    }

    OscillatorSimple.getNamedFrequency = function(frequencyName) {
        switch(frequencyName) {
            case 'kick': return 'C4';
            case 'snare': return 'D4';
        }
        return frequencyName;
    }

})();