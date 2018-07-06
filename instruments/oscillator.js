

(function() {
    // snesology.org.instruments.oscillator
    var domain = {};
    if(!window.instruments)             window.instruments = {};
    window.instruments['snesology.org'] = domain;

    domain['oscillator.sine'] = OscillatorSimple;
    domain['oscillator.sawtooth'] = OscillatorSimple;
    domain['oscillator.triangle'] = OscillatorSimple;
    domain['oscillator.square'] = OscillatorSimple;

    // instrument

    /**
     * Oscillator Instrument
     * @param context
     * @param {object} note
     * @returns OscillatorNode
     * @constructor
     */
    function OscillatorSimple(context, note) {
        var oscillatorType = note.instrumentPath.split('.').pop();

        var osc = context.createOscillator();   // instantiate an oscillator
        osc.type = oscillatorType;  // set Type
        osc.frequency.value = note.frequency;    // set Frequency (hz)

        note.connect(osc);

        // Play note
        osc.start(note.startTime);               // start the oscillator
        if(note.duration)
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