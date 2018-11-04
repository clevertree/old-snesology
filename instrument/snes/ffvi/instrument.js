

(function() {
    const NAMESPACE = document.location.hostname; // 'localhost'; // For local debugging 'snesology.net'
    const BufferSource = window.instruments[NAMESPACE]['/instrument/buffersource/simple.js'];

    class FFVIInstrument extends BufferSource {
        constructor(preset, id) {
            super(preset, id);
        }

    }

    window.instruments[NAMESPACE]['/instrument/snes/ffvi/instrument.js'] = FFVIInstrument;
})();