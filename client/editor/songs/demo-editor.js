

(function() {
    const TITLE = "Editor Demo";

    document.addEventListener('song:play', onPlay);

    // Dependencies
    loadScript('share/song-loader.js');


    function onPlay(e) {
        if (e.defaultPrevented || (e.detail && e.detail.title && e.detail.title !== TITLE))
            return false;
        e.preventDefault();

        var context = (e.detail||{}).context || new (window.AudioContext || window.webkitAudioContext)();


        Util.waitForLoadingScripts(function() {
            var editableSong = new Audio.SongManager('share/share/demo.song', TITLE);
            // editableSong.registerInstruments(
                // Audio.instrument.iOscillatorSimple
            // );

            editableSong.startSong(context);

        });
    }

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

})();