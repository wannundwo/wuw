"use strict";
var Please = require("pleasejs");

var stringToColor = function(str) {

    if (typeof str === "undefined") {
        return "#444444";
    }

    return Please.make_color({
        golden: false,
        seed: str
    })[0];
};

module.exports = { stringToColor: stringToColor };
