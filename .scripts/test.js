const path = require('path');

const ROOT_DIR = path.dirname(__dirname);

const {AudioSourceCommonTest} = require(ROOT_DIR + '/common/audio-source-common-test.js');
const {AudioSourceComposerTest} = require(ROOT_DIR + '/composer/audio-source-composer-test.js');

(async () => {
    const tests = [
        new AudioSourceCommonTest(),
        new AudioSourceComposerTest(),
    ];

    for(let i=0; i<tests.length; i++) {
        await tests[i].test();
    }
})();
