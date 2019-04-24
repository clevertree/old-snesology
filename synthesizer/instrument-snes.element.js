

(function() {
    // TODO: load dependencies
    const INSTRUMENT_NAME = 'instrument-snes';
    const PARENT_CLASS = 'instrument-buffersource';
    const PARENT_CLASS_URL = `/instrument/${PARENT_CLASS}.element.js`;
    loadParentClass();
    document.addEventListener('instrument:loaded', loadParentClass);

    function loadParentClass() {
        if (document.head.innerHTML.indexOf(`${PARENT_CLASS_URL}`) === -1) { // Hackey
            // document.head.innerHTML += `<script src="${PARENT_CLASS}"></script>`;
            const newScriptElm = document.createElement('script');
            newScriptElm.src = PARENT_CLASS_URL;
            newScriptElm.onload = loadParentClass;
            document.head.appendChild(newScriptElm);
            return;
        }

        if(customElements.get(INSTRUMENT_NAME))
            return;
        if(!customElements.get(PARENT_CLASS))
            return;

        // Define Instrument
        initInstrumentClass(customElements.get(PARENT_CLASS));
    }

    function initInstrumentClass(BufferSourceInstrument) {


        class FFVIInstrument extends BufferSourceInstrument {
            get DEFAULT_SAMPLE_LIBRARY_URL() { return '/sample/snes/snes.library.json'; }
        }

        customElements.define(INSTRUMENT_NAME, FFVIInstrument);
        document.dispatchEvent(new CustomEvent('instrument:loaded', {
            detail: {
                class: FFVIInstrument,
                path: "/instrument/snes/instrument-snes.element.js"
            }
        }));
        // console.info("Instrument Loaded: ", FFVIInstrument);
    }

})();