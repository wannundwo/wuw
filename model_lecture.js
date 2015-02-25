var mongoose = require("mongoose");

// create mongodb schema for our lectures
var LectureSchema = new mongoose.Schema({
    date: Date,
    fullLectureName: String,
    shortLectureName: String,
    room: String,
    startTime: Date,
    endTime: Date,
    group: String,
    hashCode: { type: String, index: { unique: true }}
});

// create model from our schema & export it
module.exports = mongoose.model("Lecture", LectureSchema, "lectures");
