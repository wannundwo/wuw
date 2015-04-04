var mongoose = require("mongoose");

// create mongodb schema for our lectures
var LectureSchema = new mongoose.Schema({
    lectureName: String,
    rooms: [String],
    groups: [String],
    startTime: Date,
    endTime: Date,
    color: String
});

// create model from our schema & export it
module.exports = mongoose.model("Lecture", LectureSchema, "lectures");
