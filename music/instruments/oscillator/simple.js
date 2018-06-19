

(function() {
    if(!window.instruments)             window.instruments = {};
    if(!window.instruments.oscillator)  window.instruments.oscillator = {};
    window.instruments.oscillator.sine = OscillatorSimpleSine;
    window.instruments.oscillator.sawtooth = OscillatorSimpleSawtooth;
    window.instruments.oscillator.square = OscillatorSimpleSquare;
    window.instruments.oscillator.default = OscillatorSimple;
    window.instruments.oscillator.kick = OscillatorSimple;
    window.instruments.oscillator.snare = OscillatorSimple;

    // instrument

    /**
     * Oscillator Instrument
     * @param context
     * @param noteStartTime
     * @param noteFrequency
     * @param noteLength
     * @param {object} options
     * @returns OscillatorNode
     * @constructor
     */
    function OscillatorSimple(context, noteFrequency, noteStartTime, noteLength, options) {
        options = options || {};

        var osc = context.createOscillator();   // instantiate an oscillator
        osc.type = options.type || 'triangle';  // set Type
        osc.frequency.value = noteFrequency;    // set Frequency (hz)

        // Play note
        osc.connect(options.destination || context.destination);       // connect it to the destination
        osc.start(noteStartTime);               // start the oscillator
        if(noteLength)
            osc.stop(noteStartTime + noteLength);
        // console.info("OSC", noteStartTime, noteLength);

        return osc;
    }

    function OscillatorSimpleSquare(context, noteStartTime, noteFrequency, noteLength, options) {
        options = options || {}; options.type = 'square';
        return OscillatorSimple(context, noteStartTime, noteFrequency, noteLength, options);
    }

    function OscillatorSimpleSine(context, noteStartTime, noteFrequency, noteLength, options) {
        options = options || {}; options.type = 'sine';
        return OscillatorSimple(context, noteStartTime, noteFrequency, noteLength, options);
    }

    function OscillatorSimpleSawtooth(context, noteStartTime, noteFrequency, noteLength, options) {
        options = options || {}; options.type = 'sawtooth';
        return OscillatorSimple(context, noteStartTime, noteFrequency, noteLength, options);
    }

})();