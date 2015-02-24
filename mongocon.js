// mongoodb connection
// to be used in other files

"use strict";

var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/wuw");

module.exports = {

    createDeadlineModel: function() {
        // create mongodb schema (database structure)
        var DeadlineSchema = new mongoose.Schema({
            deadline: Date,
            shortLectureName: String,
            group: String
        });
        // create model from our schema & return it
        return mongoose.model("Deadline", DeadlineSchema, "deadlines");
    },

    createLectureModel: function() {
        // create mongodb schema (database structure)
        var LectureSchema = new mongoose.Schema({
            date: Date,
            fullLectureName: String,
            shortLectureName: String,
            room: String,
            startTime: Date,
            endTime: Date,
            group: String
        });
        // create model from our schema & return it
        return mongoose.model("Lecture", LectureSchema, "lectures");
    }
};