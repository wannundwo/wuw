var mongoose = require("mongoose");

// create mongodb schema for our deadlines
var DeadlineSchema = new mongoose.Schema({
    deadline: Date,
    shortLectureName: String,
    group: String
});

// create model from our schema & export it
module.exports = mongoose.model("Deadline", DeadlineSchema, "deadlines");