
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorElement extends HTMLElement {
    constructor() {
        super();
        this.player = null;
        this.status = {
            history: {
                currentStep: 0,
                undoList: [],
                undoPosition: []
            },
            webSocket: {
                attempts: 0,
                reconnectTimeout: 3000,
                maxAttempts: 3,
            },
            previewInstructionsOnSelect: false,
            longPressTimeout: 500,
            instrumentLibrary: null
        };
        this.webSocket = new SongEditorWebsocket(this);
        this.keyboard = new SongEditorKeyboard(this);
        this.menu = new SongEditorMenu(this);
        this.forms = new SongEditorForms(this);
        this.grid = new SongEditorGrid(this);
        this.modifier = new SongModifier(this);
        this.instruments = new SongEditorInstruments(this);
        this.renderer = new SongRenderer();
        this.renderer.addSongEventListener(e => this.onSongEvent(e));
    }

    getAudioContext()   { return this.renderer.getAudioContext(); }
    getSongData()       { return this.renderer.getSongData(); }


    connectedCallback() {
        this.addEventListener('submit', this.onSubmit);
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('blur', this.onSubmit);
        // this.addEventListener('keydown', this.onInput);
        this.addEventListener('mousedown', this.onInput);
        this.render();

        const uuid = this.getAttribute('uuid');
        if(uuid)
            this.modifier.loadSongFromServer(uuid);
        // this.initWebSocket(uuid);

    }


    // Input

    // profileInput(e) {
    //     e = e || {};
    //     return {
    //         gridClearSelected: !e.ctrlKey && !e.shiftKey,
    //         gridToggleAction: e.key === ' ' || (!e.shiftKey && !e.ctrlKey) ? 'toggle' : (e.ctrlKey && e.type !== 'mousedown' ? null : 'add'),
    //         gridCompleteSelection: e.shiftKey
    //     };
    // }

    onInput(e) {
        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        // let targetClassList = e.target.classList;
        switch(e.type) {
            // case 'keydown':
            //     switch(e.key) {
            //         case 'Tab': break;
            //         case ' ': this.player.play(); e.preventDefault(); break;
            //         case 'Escape': this.grid.focus(); break;
            //         default:
            //     }
            //     break;

            case 'mousedown':
                if(this.menu.onInput(e))
                    return;
                break;

            default:
                console.error("Unhandled " + e.type, e);
        }
    }



    // Rendering


    render() {
        // TODO: switch to non HTML classes that handle their own rendering
        this.innerHTML = ``;
        this.menu.render();
        this.forms.render();
        this.grid.render();

    }

    // Grid Commands

    // Player commands

    // Forms

    // formUpdate() {
    //     this.menu.setEditableInstruction();
    // }

    // Playback

    onSongEvent(e) {
        switch(e.type) {
            case 'song:start':
                this.classList.add('playing');
                break;
            case 'song:end':
            case 'song:pause':
                this.classList.remove('playing');
                break;
            case 'instrument:loaded':
                console.info("TODO: load instrument instances", e.detail);
                break;
            case 'instrument:initiated':
                this.menu.render(); // Update instrument list
                break;
            case 'instrument:instance':
                // console.info("Instrument initialized: ", e.detail);
                // const instance = e.detail.instance;
                const instrumentID = e.detail.instrumentID;
                if(this.instruments[instrumentID]) {
                    this.instruments[instrumentID].render();
                    this.menu.render(); // Update instrument list
                    // this.render();
                } else {
                    console.warn("Instrument elm not found. Re-rendering song");
                    this.render(); // Update instrument list
                }
                break;
        }
    }


}
customElements.define('song-editor', SongEditorElement);