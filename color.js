"use strict";
var Please = require("pleasejs");
var crypto   = require("crypto");

var stringToColor = function(str) {

    if (typeof str === "undefined") {
        return "#444444";
    }

    var hash = crypto.createHash('md5').update(str);
    var color = Please.make_color({
        seed: hash,
        saturation: 0.5
    })[0];
    return color;
};

module.exports = { stringToColor: stringToColor };
