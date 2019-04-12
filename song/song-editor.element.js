
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorElement extends HTMLElement {
    constructor() {
        super();
        this.player = null;
        this.status = {
            selectedIndicies: [],
            selectedIndexCursor: 0,
            selectedPosition: 0,
            selectedGroup: 'root',
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
        this.commands = new SongEditorCommands(this);
        this.grid = new SongEditorGrid(this);
        // this.modifier = new SongModifier(this);
        this.instruments = new SongEditorInstruments(this);
        this.renderer = new SongRenderer();
        this.renderer.addSongEventListener(e => this.onSongEvent(e));
        this.longPressTimeout = null;
    }

    getAudioContext()   { return this.renderer.getAudioContext(); }
    getSongData()       { return this.renderer.getSongData(); }


    connectedCallback() {
        this.addEventListener('submit', this.onSubmit);
        this.addEventListener('change', this.onSubmit);
        this.addEventListener('blur', this.onSubmit);
        this.addEventListener('keydown', this.onInput);
        // this.addEventListener('keyup', this.onInput.bind(this));
        // this.addEventListener('click', this.onInput.bind(this));
        this.addEventListener('contextmenu', this.onInput);
        this.addEventListener('mousedown', this.onInput);
        this.addEventListener('mouseup', this.onInput);
        this.addEventListener('longpress', this.onInput);


        this.render();

        const uuid = this.getAttribute('uuid');
        if(uuid)
            this.renderer.loadSongFromServer(uuid);
        this.setAttribute('tabindex', 0);
        this.focus();
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
        if(this !== document.activeElement && !this.contains(document.activeElement)) {
            console.log("Focus", document.activeElement);
            this.focus();
        }
        switch(e.type) {
            case 'mousedown':
                // Longpress
                clearTimeout(this.longPressTimeout);
                this.longPressTimeout = setTimeout(function() {
                    e.target.dispatchEvent(new CustomEvent('longpress', {
                        detail: {originalEvent: e},
                        cancelable: true,
                        bubbles: true
                    }));
                }, this.status.longPressTimeout);
                break;

            case 'mouseup':
                e.preventDefault();
                clearTimeout(this.longPressTimeout);
                break;
        }

        // console.info(e.type, e);
        if(e.defaultPrevented)
            return;

        this.menu.onInput(e);
        if(e.defaultPrevented)
            return;
        this.grid.onInput(e);
        if(e.defaultPrevented)
            return;

        console.error("Unhandled " + e.type, e);
    }

    onError(err) {
        console.error(err);
        if(this.webSocket)
            this.webSocket
                .onError(err);
                // .send(JSON.stringify({
                //     type: 'error',
                //     message: err.message || err,
                //     stack: err.stack
                // }));
    }


    // Rendering


    render() {
        this.innerHTML = ``;
        this.menu.render();
        this.forms.render();
        this.grid.render();

    }

    // Update DOM


    update() {
        this.grid.update();
        // this.menu.update();
        // this.forms.update();

    }

    selectInstructions(groupName, index, position=null, clearSelection=true, toggle=false) {
        this.status.selectedIndexCursor = index;
        if(position !== null)
            this.status.selectedPosition = position;
        if(this.status.selectedGroup !== groupName) {
            this.status.selectedGroup = groupName;
            this.status.selectedIndicies = [];
        }
        if(clearSelection)
            this.status.selectedIndicies = [];
        const indicies = this.status.selectedIndicies;
        const existingIndex = indicies.indexOf(index);
        if(existingIndex === -1) {
            indicies.push(index);
        } else {
            if(toggle)
                indicies.splice(existingIndex, 1);
        }
        // console.log("Selected: ", indicies, position, groupName);
        this.update();
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