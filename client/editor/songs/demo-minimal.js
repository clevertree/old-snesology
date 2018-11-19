

(function() {
    document.addEventListener('song:play', onPlay);

    // Constants

    const HS = Math.pow(2, 1/12);
    const FS = Math.pow(2, 1/6), FS2 = FS*FS, FS3 = FS2*FS;
    const A3 = 220, Bb3 = 220 * HS, B3 = 220 * FS, C4 = 220 * FS*HS, Db4 = 220 * FS2, D4 = 220 * FS2*HS, Eb4 = 220 * FS3, E4 = 220 * FS3*HS, F4 = 220 * FS2*FS2, Gb4 = 220 * FS2*FS2*HS, G4 = 220 * FS3*FS2, Ab4 = 220 * FS3*FS2*HS, As3 = Bb3, Cs4 = Db4, Ds4 = Eb4, Fs4 = Gb4, Gs4 = Ab4;
    const A4 = 440, Bb4 = 440 * HS, B4 = 440 * FS, C5 = 440 * FS*HS, Db5 = 440 * FS2, D5 = 440 * FS2*HS, Eb5 = 440 * FS3, E5 = 440 * FS3*HS, F5 = 440 * FS2*FS2, Gb5 = 440 * FS2*FS2*HS, G5 = 440 * FS3*FS2, Ab5 = 440 * FS3*FS2*HS, As4 = Bb4, Cs5 = Db5, Ds5 = Eb5, Fs5 = Gb5, Gs5 = Ab5;
    const A5 = 880, Bb5 = 880 * HS, B5 = 880 * FS, C6 = 880 * FS*HS, Db6 = 880 * FS2, D6 = 880 * FS2*HS, Eb6 = 880 * FS3, E6 = 880 * FS3*HS, F6 = 880 * FS2*FS2, Gb6 = 880 * FS2*FS2*HS, G6 = 880 * FS3*FS2, Ab6 = 880 * FS3*FS2*HS, As5 = Bb5, Cs6 = Db6, Ds6 = Eb6, Fs6 = Gb6, Gs6 = Ab6;

    var SEEK_TIME = 1;

    var bpmRatio = 240 / 160;
    var currentPosition = 0, seekPosition = 0, startTime = null;
    var lastContext = null;

    const notes = [
        [iOscillatorSimple, 'sine', A4, 1],
        [iOscillatorSimple, 'sawtooth', A3, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C4, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C5, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C6, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sine', Gs4, 1],
        [iOscillatorSimple, 'sawtooth', A3, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C4, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C5, 0.20],
        [cPause, 0.25],
        [iOscillatorSimple, 'sawtooth', C6, 0.20],
        [cPause, 0.25],
    ];

    function onPlay(e) {
        var title = "Minimal Demo";
        if (e.defaultPrevented || (e.detail && e.detail.title && e.detail.title !== title))
            return false;
        e.preventDefault();

        lastContext = (e.detail||{}).context || new (window.AudioContext || window.webkitAudioContext)();
        startSong();

        // Update
        document.dispatchEvent(new CustomEvent('song:playing', {
            detail: {
                title: title,
                position: 0,
                duration: 2,
            }
        }));
    }

    function startSong() {
        currentPosition = 0;
        startTime = lastContext.currentTime - seekPosition;
        var notesPlayed = 0;

        for(var p=0; p<notes.length; p++) {
            notesPlayed += notes[p][0](notes[p]);
            if(seekPosition + SEEK_TIME <= currentPosition)
                break;
        }
        seekPosition += SEEK_TIME;
        if(notesPlayed > 0) {
            // console.log("Seek", seekPosition, currentPosition);
            setTimeout(startSong, SEEK_TIME * 1000);
        } else{
            console.log("Song finished")
        }
    }


    // Instruments

    function iOSC(note) {
        var noteStartTime = currentPosition;
        var noteEndTime = currentPosition + note[3] * bpmRatio;
        if(noteStartTime < seekPosition) {
            console.warn("Note Skipped");
            return 0;
        }

        var osc = lastContext.createOscillator(); // instantiate an oscillator
        osc.type = note[1]; // this is the default - also square, sawtooth, triangle
        osc.frequency.value = note[2]; // Hz
        osc.connect(lastContext.destination); // connect it to the destination
        osc.start(currentPosition); // start the oscillator
        osc.stop(noteEndTime); // stop 2 seconds after the current time
        // console.info("OSC", noteStartTime, noteEndTime);
        return 1;
    }

    // Commands

    function cPause(note) {
        currentPosition += note[1] * bpmRatio;
        // console.info("PAUSE", note[1]);
        return 0;
    }

    // function SongManager(title, options) {
    //     this.title = title;
        // options = options                   || {};
        // this.notes = options.notes          || [];
    // }

    // SongManager.prototype.matchesEvent = function(e) {
    //     return !(e.detail && e.detail.title && e.detail.title !== this.title);

    // };

    // SongManager.prototype.addNotes = function(notes) {
    //     throw new Error("Unimplemented");
    // };

    // SongManager.prototype.playNotes = function(e) {
    //     throw new Error("Unimplemented");
    // };

    
})();