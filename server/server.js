const express = require('express');
const path = require('path');
// const redis = require("redis");
const BASE_DIR = path.dirname(__dirname);

// Init
module.exports = function(appInstance, router) {
    // Serve Website Files
    router.use('/', express.static(BASE_DIR));
};
