/**
 * Player requires a modern browser
 * One groups displays at a time. Columns imply simultaneous notes. Pauses are implied by the scale
 */

(function() {
    // if (!window.MusicPlayer)
    //     window.MusicPlayer = MusicPlayer;

    class MusicPlayerElement extends HTMLElement {
        constructor(options) {
            options = options || {};
            super();
            this.audioContext = options.context || new (window.AudioContext || window.webkitAudioContext)();
            this.song = null;
            this.bpm = 160;
            this.seekLength = 240 / this.bpm;
            this.seekPosition = 0;
            this.playing = false;
            this.config = DEFAULT_CONFIG;
            this.loadSongData({});
        }

        getSong() { return this.song; }
        getCurrentBPM() { return this.bpm; }

        connectedCallback() {
            this.addEventListener('keydown', this.onInput.bind(this));
            this.addEventListener('keyup', this.onInput.bind(this));
            this.addEventListener('click', this.onInput.bind(this));

            if(this.getSongURL())
                this.loadSong(this.getSongURL(), function() {

                }.bind(this));

            if(!this.getAttribute('tabindex'))
                this.setAttribute('tabindex', '1');
        }

        getSongURL() { return this.getAttribute('src');}

        loadSongData(songData) {
            songData.notes = songData.notes || {};
            songData.noteGroups = songData.noteGroups || {};
            songData.aliases = songData.aliases || {};
            this.song = songData;
            // this.update();
        }

        loadSong(songURL, onLoaded) {
            console.log('Song loading:', songURL);
            loadJSON(songURL, function(err, json) {
                if(err)
                    throw new Error("Could not load song: " + err);
                if(!json)
                    throw new Error("Invalid JSON File: " + songURL);
                this.loadSongData(json);
                this.setAttribute('src', songURL);
                console.log('Song loaded:', this.song);

                // Load Scripts
                var scriptsLoading = 0;
                if(this.song.load) {
                    for(var i=0; i<this.song.load.length; i++) {
                        var scriptPath = this.song.load[i];
                        scriptsLoading++;
                        loadScript.call(this, scriptPath, function() {
                            // console.log("Scripts loading: ", scriptsLoading);
                            scriptsLoading--;
                            if(scriptsLoading === 0)
                                onLoaded && onLoaded(); // initNotes.call(this);
                        }.bind(this));
                    }
                }
                if(scriptsLoading === 0)
                    onLoaded && onLoaded(); // initNotes.call(this);
            }.bind(this));
        }

        playInstrument(instrumentName, noteFrequency, noteStartTime, noteLength, options, associatedElement) {
            var instrument = this.getInstrument(instrumentName);
            noteFrequency = this.getNoteFrequency(noteFrequency || 'C4');

            var noteEvent = instrument(this.audioContext, noteFrequency, noteStartTime, noteLength, options);
            if(associatedElement) {
                if(noteStartTime - .5 > this.audioContext.currentTime)
                    setTimeout(function() {
                        associatedElement.classList.add('playing');
                    }, (noteStartTime - this.audioContext.currentTime) * 1000);
                else
                    associatedElement.classList.add('playing');

                setTimeout(function() {
                    associatedElement.classList.remove('playing');
                }, (noteStartTime + noteLength - this.audioContext.currentTime) * 1000);
            }
            return noteEvent;
        }

        playNote(noteArgs, noteStartTime, bpm, associatedElement) {
            var instrumentName = noteArgs[1];
            var noteFrequency =  noteArgs[2];
            var noteLength = (noteArgs[3] || 1) * (240 / (bpm || 240));
            var options = noteArgs[4] || {};
            if(!associatedElement && noteArgs.associatedElement)
                associatedElement = noteArgs.associatedElement;

            return this.playInstrument(instrumentName, noteFrequency, noteStartTime, noteLength, options, associatedElement);
        }

        playNotes(commandList, startPosition, seekLength, playbackOffset) {
            var currentPosition = 0;
            var currentBPM = this.getCurrentBPM();
            var noteEvents = [];
            for(var i=0; i<commandList.length; i++) {
                var command = commandList[i];
                var commandName = normalizeCommandName(command[0]);
                switch(commandName) {
                    case 'Note':
                        if(currentPosition < startPosition)
                            continue;   // Notes were already played
                        var noteEvent = this.playNote(command, currentPosition + playbackOffset, currentBPM);
                        noteEvents.push(noteEvent);
                        // noteBuffer.push([currentPosition, note]);
                        // notesPlayed += this.playInstrument(note) ? 0 : 1;
                        break;

                    case 'Pause':
                        currentPosition += command[1] * (240 / currentBPM);
                        break;

                    case 'GroupExecute':
                        // if(currentPosition < startPosition) // Execute all groups each time
                        //     continue;
                        var noteGroupList = this.song.noteGroups[command[1]];
                        if(!noteGroupList)
                            throw new Error("Note group not found: " + command[1]);
                        var groupNoteEvents = this.playNotes(noteGroupList, startPosition - currentPosition, seekLength, playbackOffset);
                        noteEvents = noteEvents.concat(groupNoteEvents);
                        break;
                }
                if(seekLength && currentPosition >= startPosition + seekLength)
                    break;
            }
            return noteEvents;
        }

        play (seekPosition) {
            if(seekPosition)
                this.seekPosition = seekPosition;

            // this.lastNotePosition = 0;
            this.startTime = this.audioContext.currentTime - this.seekPosition;
            // console.log("Start playback:", this.startTime);
            this.playing = true;
            this.processPlayback();

            document.dispatchEvent(new CustomEvent('song:started', {
                detail: this
            }));
        }

        pause() {
            this.playing = false;
        }

        processPlayback () {
            if(this.playing === false) {
                console.info("Playing paused");
                return;
            }
            var noteEvents = this.playNotes(
                this.song.notes,
                this.seekPosition,
                this.seekLength,
                this.audioContext.currentTime
                );

            // this.seekPosition += this.seekLength;
            this.seekPosition = this.audioContext.currentTime - this.startTime;

            if(noteEvents.length > 0) {
                // console.log("Notes playing:", noteEvents, this.seekPosition, this.currentPosition);
                setTimeout(this.processPlayback.bind(this), this.seekLength * 1000);

                this.dispatchEvent(new CustomEvent('song:playing', {
                    detail: this
                }));
            } else{
                console.log("Song finished");
                this.seekPosition = 0;
                this.playing = false;

                // Update UI
                this.dispatchEvent(new CustomEvent('song:finished', {
                    detail: this
                }));
            }
        }

        getInstrument(path) {
            if(!window.instruments)
                throw new Error("window.instruments is not loaded");

            var pathList = path.split('.');
            var pathTarget = window.instruments;

            if(this.song.aliases[pathList[0]])
                pathList[0] = this.song.aliases[pathList[0]];

            for (var i = 0; i < pathList.length; i++) {
                if (pathTarget[pathList[i]]) {
                    pathTarget = pathTarget[pathList[i]];
                } else {
                    pathTarget = null;
                    break;
                }
            }
            if (pathTarget && typeof pathTarget === 'object')
                pathTarget = pathTarget.default;
            if (!pathTarget)
                throw new Error("Instrument not found: " + pathList.join('.') + ' [alias:' + path + ']');
            return pathTarget;
        }

        getNoteFrequency (note) {
            if(Number(note) === note && note % 1 !== 0)
                return note;
            var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
                octave,
                keyNumber;

            if (note.length === 3) {
                octave = note.charAt(2);
            } else {
                octave = note.charAt(1);
            }

            keyNumber = notes.indexOf(note.slice(0, -1));

            if (keyNumber < 3) {
                keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1;
            } else {
                keyNumber = keyNumber + ((octave - 1) * 12) + 1;
            }

            // console.log("Note: ", note, octave, keyNumber);

            // Return frequency of note
            return 440 * Math.pow(2, (keyNumber- 49) / 12);
        }

        // Input

        onInput(e) {
            if(e.defaultPrevented)
                return;
            switch(e.type) {
                case 'keydown':
                    if(this.depressedKeys.indexOf(e.key) > -1) {
                        // console.info("Ignoring repeat keydown: ", e);
                        return;
                    }
                    this.depressedKeys.push(e.key);

                    break;

                case 'keyup':
                    var i = this.depressedKeys.indexOf(e.key);
                    if(i > -1) {
                        this.depressedKeys.splice(i, 1);
                    }
                    break;

                case 'click':
                    this.menuElement.close();
                    break;
            }
        }
    }

    // Define custom elements
    customElements.define('music-player', MusicPlayerElement);


    // Load Javascript dependencies
    loadStylesheet('music/player/music-player.css');

    function loadScript(scriptPath, onLoaded) {
        let scriptPathEsc = scriptPath.replace(/[/.]/g, '\\$&');
        let scriptElm = document.head.querySelector('script[src$=' + scriptPathEsc + ']');
        if (!scriptElm) {
            scriptElm = document.createElement('script');
            scriptElm.src = scriptPath;
            scriptElm.onload = function(e) {
                for(var i=0; i<scriptElm.onloads.length; i++)
                    scriptElm.onloads[i](e);
                scriptElm.onloads = null;
            };
            document.head.appendChild(scriptElm);
        }
        if(!scriptElm.onloads) scriptElm.onloads = [];
        scriptElm.onloads.push(onLoaded);
    }
    function loadStylesheet(styleSheetPath, onLoaded) {
        let styleSheetPathEsc = styleSheetPath.replace(/[/.]/g, '\\$&');
        let foundScript = document.head.querySelectorAll('link[href$=' + styleSheetPathEsc + ']');
        if (foundScript.length === 0) {
            let styleSheetElm = document.createElement('link');
            styleSheetElm.href = styleSheetPath;
            styleSheetElm.rel = 'stylesheet';
            styleSheetElm.onload = onLoaded;
            document.head.appendChild(styleSheetElm);
        }
    }
    function loadJSON(jsonPath, onLoaded) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', jsonPath, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            onLoaded(xhr.status !== 200 ? xhr.status : null, xhr.response);
        };
        xhr.send();
    }

    function normalizeCommandName(commandString) {
        switch(commandString.toLowerCase()) {
            case 'n':   case 'note':            return 'Note';
            case 'ge':  case 'groupexecute':    return 'GroupExecute';
            case 'p':   case 'pause':           return 'Pause';
        }
        throw new Error("Unknown command: " + commandString);
    }


    const DEFAULT_CONFIG = {
        previewNotesOnSelect: true,
    }

})();
