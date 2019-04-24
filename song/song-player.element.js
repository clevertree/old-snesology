/**
 * Player requires a modern browser
 */

class MusicPlayerElement extends HTMLElement {
    constructor() {
        super();
        this.renderer = new SongRenderer();
    }

    getAudioContext()               { return this.renderer.getAudioContext(); }
    getSongData()                   { return this.renderer.getSongData(); }
    getStartingBeatsPerMinute()     { return this.renderer.getStartingBeatsPerMinute(); }
    getVolumeGain()                 { return this.renderer.getVolumeGain(); }

    getVolume () {
        if(this.volumeGain) {
            return this.volumeGain.gain.value * 100;
        }
        return MusicPlayerElement.DEFAULT_VOLUME * 100;
    }
    setVolume (volume) {
        const gain = this.getVolumeGain();
        if(gain.gain.value !== volume) {
            gain.gain.value = volume / 100;
            console.info("Setting volume: ", volume);
        }
    }
    connectedCallback() {
        this.addEventListener('keydown', this.onInput);
        this.addEventListener('keyup', this.onInput);
        this.addEventListener('click', this.onInput);
        document.addEventListener('instrument:loaded', e => this.onSongEvent(e));

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
            case 'instrument:loaded':
                // this.renderer.loadAllInstruments();
                break;
        }
    }


    // Input

    onInput(e) {
        if(e.defaultPrevented)
            return;
        switch(e.type) {
            case 'click':
                break;
        }
    }


}
MusicPlayerElement.DEFAULT_VOLUME = 0.3;

// Define custom elements
customElements.define('song-player', MusicPlayerElement);

// MusicPlayerElement.loadStylesheet('client/player/song-player.css');
