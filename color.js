"use strict";
var Please = require("pleasejs");
var crypto   = require("crypto");

var stringToColor = function(str) {

    if (typeof str === "undefined") {
        return "#444444";
    }

    var color = Please.make_color({
        saturation: 0.6,
        seed: str,
    })[0];
    return color;
};

module.exports = { stringToColor: stringToColor };
