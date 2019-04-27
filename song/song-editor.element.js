
/**
 * Editor requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions.
 */

class SongEditorElement extends HTMLElement {
    constructor() {
        super();
        // this.player = null;
        this.status = {
            // selectedIndexCursor: 0,
            currentGroup: 'root',
            groupHistory: [],
            // cursorCellIndex: 0,
            // cursorPosition: 0,
            selectedIndicies: [0],
            selectedRange: [0,0],

            currentOctave: 3,
            currentInstrumentID: 0,

            // history: {
            //     currentStep: 0,
            //     undoList: [],
            //     undoPosition: []
            // },
            // webSocket: {
            //     attempts: 0,
            //     reconnectTimeout: 3000,
            //     maxAttempts: 3,
            // },
            previewInstructionsOnSelect: false,
            longPressTimeout: 500,
            autoSaveTimeout: 4000,
        };
        this.saveSongToMemoryTimer = null;
        this.instrumentLibrary = null;
        this.instrumentLibraryURL = null;

        this.values = new SongEditorValues(this);
        this.webSocket = new SongEditorWebsocket(this);
        this.keyboard = new SongEditorKeyboard(this);
        this.menu = new SongEditorMenu(this);
        this.forms = new SongEditorForms(this);
        this.grid = new SongEditorGrid(this);
        // this.modifier = new SongModifier(this);
        this.instruments = new SongEditorInstruments(this);
        // this.renderer.addSongEventListener(e => this.onSongEvent(e));
        this.longPressTimeout = null;
        this.instruments.loadInstrumentLibrary('synthesizer/instrument.library.json');
        this.renderer = new SongRenderer(this);
        this.loadRecentSongData();
    }

    get currentGroup()      { return this.status.currentGroup; }
    get selectedIndicies()  { return this.status.selectedIndicies; }
    get selectedRange()     { return this.status.selectedRange; }
    get selectedPauseIndicies()  {
        const instructionList = this.renderer.getInstructions(this.currentGroup);
        return this.selectedIndicies.filter(index => instructionList[index].command === '!pause')
    }
    get selectedNoteIndicies()  {
        const instructionList = this.renderer.getInstructions(this.currentGroup);
        return this.selectedIndicies.filter(index => instructionList[index].command !== '!pause')
    }

    getAudioContext()   { return this.renderer.getAudioContext(); }
    getSongData()       { return this.renderer.getSongData(); }


    connectedCallback() {
        this.addEventListener('submit', this.onInput);
        this.addEventListener('change', this.onInput);
        this.addEventListener('blur', this.onInput);
        this.addEventListener('keydown', this.onInput);
        // this.addEventListener('keyup', this.onInput.bind(this));
        // this.addEventListener('click', this.onInput.bind(this));
        this.addEventListener('contextmenu', this.onInput);
        this.addEventListener('mousedown', this.onInput);
        this.addEventListener('mouseup', this.onInput);
        this.addEventListener('longpress', this.onInput);

        this.addEventListener('song:start', this.onSongEvent);
        this.addEventListener('song:end', this.onSongEvent);
        this.addEventListener('song:pause', this.onSongEvent);
        this.addEventListener('song:modified', this.onSongEvent);
        this.addEventListener('instrument:loaded', this.onSongEvent);
        this.addEventListener('instrument:instance', this.onSongEvent);

        this.render();

        const uuid = this.getAttribute('uuid');
        if(uuid)
            this.renderer.loadSongFromServer(uuid);
        // this.setAttribute('tabindex', 0);
        this.focus();
        // this.initWebSocket(uuid);

    }

    loadNewSongData() {
        const storage = new SongStorage();
        let songData = storage.generateDefaultSong();
        this.loadSongData(songData);
    }


    loadRecentSongData() {
        const storage = new SongStorage();
        let songRecentGUIDs = storage.getRecentSongList();
        if(songRecentGUIDs[0] && songRecentGUIDs[0].guid) {
            this.loadSongFromMemory(songRecentGUIDs[0].guid);
        }
    }

    saveSongToMemory() {
        const songData = this.renderer.getSongData();
        const songHistory = this.renderer.getSongHistory();
        const storage = new SongStorage();
        storage.saveSongToMemory(songData, songHistory);
    }

    saveSongToFile() {
        const songData = this.renderer.getSongData();
        // const songHistory = this.renderer.getSongHistory();
        const storage = new SongStorage();
        storage.saveSongToFile(songData);
    }


    loadSongFromMemory(songGUID) {
        const storage = new SongStorage();
        const songData = storage.loadSongFromMemory(songGUID);
        const songHistory = storage.loadSongHistoryFromMemory(songGUID);
        this.renderer.loadSongData(songData, songHistory);
        console.info("Song loaded from memory: " + songGUID, songData, songHistory);

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
        if(e.defaultPrevented)
            return;
        this.renderer.getAudioContext();
        // if(this !== document.activeElement && !this.contains(document.activeElement)) {
        //     console.log("Focus", document.activeElement);
        //     this.focus();
        // }
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
                // e.preventDefault();
                clearTimeout(this.longPressTimeout);
                break;
        }

        // console.info(e.type, e);

        this.menu.onInput(e);
        this.grid.onInput(e);
        this.forms.onInput(e);
        this.instruments.onInput(e);

        // if(!e.defaultPrevented) {
        //     switch (e.type) {
        //         case 'submit':
        //             // case 'change':
        //             // case 'blur':
        //             console.info("Unhandled " + e.type, e);
        //     }
        // }
    }

    onSongEvent(e) {
        switch(e.type) {
            case 'song:start':
                this.classList.add('playing');
                break;
            case 'song:end':
            case 'song:pause':
                this.classList.remove('playing');
                break;
            case 'song:modified':
                this.grid.render();
                this.forms.render();

                clearTimeout(this.saveSongToMemoryTimer);
                this.saveSongToMemoryTimer = setTimeout(() => {
                    this.saveSongToMemory();
                }, this.status.autoSaveTimeout);
                break;
            case 'instrument:loaded':
                console.info("TODO: load instrument instances", e.detail);
                break;
            case 'instrument:instance':
                // case 'instrument:initiated':
                //     this.menu.render(); // Update instrument list
                //     break;
                // console.info("Instrument initialized: ", e.detail);
                // const instance = e.detail.instance;
                // const instrumentID = e.detail.instrumentID;
                // if(this.instruments[instrumentID]) {
                //     this.instruments[instrumentID].render();
                //     this.menu.render(); // Update instrument list
                //     // this.render();
                // } else {
                //     console.warn("Instrument elm not found. Re-rendering song");
                this.render(); // Update instrument list
                // }
                break;
        }
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
        this.instruments.render();

    }


    // Update DOM

    update() {
        this.menu.update();
        this.forms.update();
        this.grid.update();
        this.instruments.update();
    }

    selectInstructions(groupName, selectedIndicies=null, selectedRange=null) {
        if(selectedIndicies === null)
            selectedIndicies = [0]
        if (!Array.isArray(selectedIndicies))
            selectedIndicies = [selectedIndicies];
        this.status.selectedIndicies = selectedIndicies;
        if(this.status.currentGroup !== groupName) {
            this.status.groupHistory = this.status.groupHistory.filter(historyGroup => historyGroup === this.status.currentGroup);
            this.status.groupHistory.unshift(this.status.currentGroup);
            this.status.currentGroup = groupName;
            console.log("Group Change: ", groupName, this.status.groupHistory);
            this.grid = new SongEditorGrid(this, groupName);
            this.render();
        }
        if(selectedRange !== null) {
            if(selectedRange && !Array.isArray(selectedRange))
                selectedRange = [selectedRange,selectedRange];
            this.status.selectedRange = selectedRange;
        } else {
            this.status.selectedRange = this.renderer.getInstructionRange(groupName, selectedIndicies);
        }

        this.update();
        this.grid.focus();
    }




}
customElements.define('song-editor', SongEditorElement);