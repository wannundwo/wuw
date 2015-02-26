var mongoose = require("mongoose");

// create mongodb schema for our deadlines
var DeadlineSchema = new mongoose.Schema({
    info: String,
    deadline: Date, // this is the "Abgabetermin" <- lol! :D
    shortLectureName: String,
    group: String
});

// create model from our schema & export it
module.exports = mongoose.model("Deadline", DeadlineSchema, "deadlines");
