

(function() {
    var Util = ForgottenFuture.Util,
        Audio = ForgottenFuture.Audio;

    const TITLE = "Editor Demo";

    document.addEventListener('song:play', onPlay);

    // Dependencies
    Util.loadScript([
        // Song Manager
        'audio/song-loader.js',

        // instrument
        // 'audio/instrument/oscillator/simple.js',
    ]);


    function onPlay(e) {
        if (e.defaultPrevented || (e.detail && e.detail.title && e.detail.title !== TITLE))
            return false;
        e.preventDefault();

        var context = (e.detail||{}).context || new (window.AudioContext || window.webkitAudioContext)();


        Util.waitForLoadingScripts(function() {
            var editableSong = new Audio.SongManager('audio/songs/demo.song', TITLE);
            // editableSong.registerInstruments(
                // Audio.instrument.iOscillatorSimple
            // );

            editableSong.startSong(context);

        });
    }


})();