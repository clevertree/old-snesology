

(function() {



    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Create an empty three-second stereo buffer at the sample rate of the AudioContext
    var myArrayBuffer = audioCtx.createBuffer(2, audioCtx.sampleRate * 3, audioCtx.sampleRate);

// Fill the buffer with white noise;
//just random values between -1.0 and 1.0
    for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
        // This gives us the actual ArrayBuffer that contains the data
        var nowBuffering = myArrayBuffer.getChannelData(channel);
        for (var i = 0; i < myArrayBuffer.length; i++) {
            // Math.random() is in [0; 1.0]
            // audio needs to be in [-1.0; 1.0]
            nowBuffering[i] = Math.random() * 2 - 1;
        }
    }

// Get an AudioBufferSourceNode.
// This is the AudioNode to use when we want to play an AudioBuffer
    var source = audioCtx.createBufferSource();
// set the buffer in the AudioBufferSourceNode
    source.buffer = myArrayBuffer;
// connect the AudioBufferSourceNode to the
// destination so we can hear the sound
    source.connect(audioCtx.destination);
// start the source playing
    source.start();




    class BufferSource {
        constructor(preset, id) {
            this.id = id;
            this.preset = preset;
            this.config = preset.config || {};            // TODO: validate config
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

            const paddedID = this.id < 10 ? "0" + this.id : "" + this.id;
            return `
                <form class="instrument-editor">
                    <fieldset>
                        <legend>${paddedID}: ${this.preset.name} (Oscillator)</legend>
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
    window.instruments['snesology.net']['/instruments/buffersource.js'] = BufferSource;
    window.instruments['localhost'] = window.instruments['snesology.net']; // For local debugging

    // instrument

    const TYPES = [
        'sine', 'square', 'sawtooth', 'triangle'
    ]
})();