"use strict";

var mongoose = require("mongoose");
var color = require("../color");

// create mongodb schema for our deadlines
var DeadlineSchema = new mongoose.Schema({
    info: String,
    deadline: Date, // this is the "Abgabetermin" <- lol! :D
    shortLectureName: String,
    group: String,
    createdBy: String
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true }
});

DeadlineSchema.virtual("color").get(function () {
    return color.stringToColor(this.group);
});

// create model from our schema & export it
module.exports = mongoose.model("Deadline", DeadlineSchema, "deadlines");
