

(function() {
    if(!window.instruments)             window.instruments = {};
    if(!window.instruments.oscillator)  window.instruments.oscillator = {};
    window.instruments.oscillator.sine = OscillatorSimple;
    window.instruments.oscillator.sawtooth = OscillatorSimple;
    window.instruments.oscillator.triangle = OscillatorSimple;
    window.instruments.oscillator.square = OscillatorSimple;
    window.instruments.oscillator.default = OscillatorSimple;
    window.instruments.percussion = OscillatorSimple;
    window.instruments.percussion.kick = OscillatorSimple;
    window.instruments.percussion.snare = OscillatorSimple;

    // instrument

    /**
     * Oscillator Instrument
     * @param context
     * @param {object} note
     * @returns OscillatorNode
     * @constructor
     */
    function OscillatorSimple(context, note) {
        var oscillatorType = 'triangle';
        var splitPath = note.instrumentPath.split('.');
        switch(splitPath[1]) {
            case 'sine':
            case 'sawtooth':
            case 'triangle':
            case 'square':
                oscillatorType = splitPath[1];
        }


        var osc = context.createOscillator();   // instantiate an oscillator
        osc.type = oscillatorType;  // set Type
        osc.frequency.value = note.frequency;    // set Frequency (hz)

        // Play note
        osc.connect(context.destination);       // connect it to the destination
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