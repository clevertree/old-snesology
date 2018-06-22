/**
 * Player requires a modern browser
 * One groups displays at a time. Columns imply simultaneous instructions. Pauses are implied by the scale
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
            songData.instruments = (songData.instruments || []);
            songData.instructions = processInstructions(songData.instructions || []);
            songData.instructionGroups = processInstructions(songData.instructionGroups || []);
            this.song = songData;
            // this.update();
            function processInstructions(instructionList) {
                var lastInstrument = instructionList[0];
                for(var i=0; i<instructionList.length; i++) {
                    var instruction = instructionList[i];
                    switch(typeof instruction) {
                        case 'number':
                            instructionList[i] = {pause:instruction};
                            break;
                        case 'string':
                            instructionList[i] = Object.assign({frequency: instruction}, lastInstrument);
                            break;
                        case 'object':
                            if(Array.isArray(instruction))
                                instructionList[i] = Object.assign({frequency: instruction[0], length: instruction[1]}, lastInstrument);
                            break;
                    }
                    if(typeof instruction.instrument !== 'undefined')
                        lastInstrument = instruction;
                }
                return instructionList;
            }
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
                                onLoaded && onLoaded(); // initInstructions.call(this);
                        }.bind(this));
                    }
                }
                if(scriptsLoading === 0)
                    onLoaded && onLoaded(); // initInstructions.call(this);
            }.bind(this));
        }

        playInstrument(instrumentName, instructionFrequency, instructionStartTime, instructionLength, options, callback) {
            var instrument = this.getInstrument(instrumentName);
            instructionFrequency = this.getInstructionFrequency(instructionFrequency || 'C4');

            var instructionEvent = instrument(this.audioContext, instructionFrequency, instructionStartTime, instructionLength, options);

            if(instructionLength && callback) {
                if(instructionStartTime - .5 > this.audioContext.currentTime)
                    setTimeout(function() {
                        callback(true);
                    }, (instructionStartTime - this.audioContext.currentTime) * 1000);
                else
                    callback(true);

                setTimeout(function() {
                    callback(false);
                }, (instructionStartTime + instructionLength - this.audioContext.currentTime) * 1000);
            }

            // if(associatedElement) {
            //     if(instructionStartTime - .5 > this.audioContext.currentTime)
            //         setTimeout(function() {
            //             associatedElement.classList.add('playing');
            //         }, (instructionStartTime - this.audioContext.currentTime) * 1000);
            //     else
            //         associatedElement.classList.add('playing');
            //
            //     setTimeout(function() {
            //         associatedElement.classList.remove('playing');
            //     }, (instructionStartTime + instructionLength - this.audioContext.currentTime) * 1000);
            // }

            return instructionEvent;
        }

        playInstruction(instruction, instructionStartTime, bpm, callback) {
            if(instruction.instrument) {
                var instrumentName = instruction.instrument;
                var instructionFrequency =  instruction.frequency;
                var instructionLength = (instruction.length || 1) * (240 / (bpm || 240));

                return this.playInstrument(instrumentName, instructionFrequency, instructionStartTime, instructionLength, instruction, callback);
            }
            return null;
        }

        playInstructions(instructionList, startPosition, seekLength, playbackOffset) {
            var currentPosition = 0;
            var currentBPM = this.getCurrentBPM();
            var instructionEvents = [];
            for(var i=0; i<instructionList.length; i++) {
                var instruction = instructionList[i];

                if(instruction.instrument) {
                    if(currentPosition < startPosition)
                        continue;   // Instructions were already played
                    var instructionEvent = this.playInstruction(instruction, currentPosition + playbackOffset, currentBPM);
                    instructionEvents.push(instructionEvent);
                    // instructionBuffer.push([currentPosition, instruction]);
                    // instructionsPlayed += this.playInstrument(instruction) ? 0 : 1;
                }
                if(instruction.pause) {
                    currentPosition += instruction.pause * (240 / currentBPM);
                }
                if(instruction.groupExecute) {
                    // if(currentPosition < startPosition) // Execute all groups each time
                    //     continue;
                    var instructionGroupList = this.song.instructionGroups[instruction.groupExecute];
                    if(!instructionGroupList)
                        throw new Error("Instruction group not found: " + instruction.groupExecute);
                    var groupInstructionEvents = this.playInstructions(instructionGroupList, startPosition - currentPosition, seekLength, playbackOffset);
                    instructionEvents = instructionEvents.concat(groupInstructionEvents);
                }
                if(seekLength && currentPosition >= startPosition + seekLength)
                    break;
            }
            return instructionEvents;
        }

        play (seekPosition) {
            if(seekPosition)
                this.seekPosition = seekPosition;

            // this.lastInstructionPosition = 0;
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
            var instructionEvents = this.playInstructions(
                this.song.instructions,
                this.seekPosition,
                this.seekLength,
                this.audioContext.currentTime
                );

            // this.seekPosition += this.seekLength;
            this.seekPosition = this.audioContext.currentTime - this.startTime;

            if(instructionEvents.length > 0) {
                // console.log("Instructions playing:", instructionEvents, this.seekPosition, this.currentPosition);
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
            if(!path)
                throw new Error("Invalid instrument path");
            if(!window.instruments)
                throw new Error("window.instruments is not loaded");

            if(typeof path === "number") {
                var instrumentConfig = this.song.instruments[path];
                if(!instrumentConfig)
                    throw new Error("Invalid Instrument ID: " + path);
                path = instrumentConfig.path;
                if(!path)
                    throw new Error("Invalid Instrument Config: " + instrumentConfig);
            }

            var pathList = path.split('.');
            var pathTarget = window.instruments;

            // if(this.song.aliases[pathList[0]])
            //     pathList[0] = this.song.aliases[pathList[0]];

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

        getInstructionFrequency (instruction) {
            if(Number(instruction) === instruction && instruction % 1 !== 0)
                return instruction;
            var instructions = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
                octave,
                keyNumber;

            if (instruction.length === 3) {
                octave = instruction.charAt(2);
            } else {
                octave = instruction.charAt(1);
            }

            keyNumber = instructions.indexOf(instruction.slice(0, -1));

            if (keyNumber < 3) {
                keyNumber = keyNumber + 12 + ((octave - 1) * 12) + 1;
            } else {
                keyNumber = keyNumber + ((octave - 1) * 12) + 1;
            }

            // console.log("Instruction: ", instruction, octave, keyNumber);

            // Return frequency of instruction
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

    // function normalizeInstructionName(commandString) {
    //     switch(commandString.toLowerCase()) {
    //         case 'n':   case 'instruction':            return 'Instruction';
    //         case 'ge':  case 'groupexecute':    return 'GroupExecute';
    //         case 'p':   case 'pause':           return 'Pause';
    //     }
    //     throw new Error("Unknown command: " + commandString);
    // }


    const DEFAULT_CONFIG = {
        previewInstructionsOnSelect: true,
    }

})();
