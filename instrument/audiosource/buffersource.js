

(function() {



    class BufferSource {
        constructor(preset, id) {
            this.id = id;
            this.preset = preset;
            this.config = preset.config || {};            // TODO: validate config
            this.samples = {};
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


        loadAudioSample(context, onLoad, sampleURL) {
            const request = new XMLHttpRequest();

            request.open('GET', sampleURL, true);
            request.responseType = 'arraybuffer';

            request.onload = function() {
                var audioData = request.response;

                context.decodeAudioData(audioData,
                    (buffer) => {
                        this.samples[sampleURL] = buffer;
                        // const source = context.createBufferSource();
                        // const myBuffer = buffer;
                        // const songLength = buffer.duration;
                        // source.buffer = myBuffer;
                        // source.playbackRate.value = playbackControl.value;
                        // source.connect(context.destination);
                        // source.loop = true;
                        // onLoad(null, source);

                        // loopstartControl.setAttribute('max', Math.floor(songLength));
                        // loopendControl.setAttribute('max', Math.floor(songLength));
                    },

                    (e) => {
                        onLoad("Error with decoding audio data" + e.error, null);
                    }
                );
            };

            request.send();
        }

        getNamedFrequency (frequencyName) {
            switch(frequencyName) {
                case 'kick': return 'C4';
                case 'snare': return 'D4';
            }
            return frequencyName;
        }
    }

    const NAMESPACE = document.location.hostname; // 'localhost'; // For local debugging 'snesology.net'
    // const NAMESPACE = 'snesology.net'; // For local debugging 'localhost'
    if (!window.instruments)
        window.instruments = {};
    if (!window.instruments[NAMESPACE])
        window.instruments[NAMESPACE] = {};
    window.instruments[NAMESPACE]['/instrument/audiosource/buffersource.js'] = BufferSource;

    // instrument

    const TYPES = [
        'sine', 'square', 'sawtooth', 'triangle'
    ]
})();