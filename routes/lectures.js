"use strict";

// import the express router
var router = require("express").Router();

// create model
var Lecture = require("../models/model_lecture");

// on routes that end in /lectures
router.route("/")

    // get all lectures (GET /$apiBaseUrl/lectures)
    .get(function(req, res) {
        Lecture.find({}).sort({startTime: 1}).exec(function(err, lectures) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lectures);
            res.end();
        });
    });


// on routes that end in /lectures/:lecture_id
router.route("/:lecture_id")

    // get lecture with that id (GET /$apiBaseUrl/lectures/:lecture_id)
    .get(function(req, res) {
        Lecture.findById(req.params.lecture_id, function(err, lecture) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lecture);
            res.end();
        });
    });

module.exports = router;
