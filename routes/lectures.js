"use strict";

// old /upcomingLectures is now /lectures/upcoming !!!
// old /lecturesForGroups is now /lectures/groups !!!

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


// on routes that end in /lectures/upcoming
router.route("/upcoming")

    // get upcoming lectures (GET /$apiBaseUrl/lectures/upcoming)
    .get(function(req, res) {

        // today at 0:00
        var today = new Date();
        today.setHours(0,0,0,0);

        // show all lectures for current day and later
        Lecture.find({"endTime": {"$gte": today}}).sort({startTime: 1}).exec(function(err, lectures) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lectures);
            res.end();
        });
    });


// on routes that end in /lectures/groups
router.route("/groups")

    // get lectures for specific groups (POST /$apiBaseUrl/lectures/groups)
    .post(function(req, res) {

        var reqGroups = req.body.groups;

        // check if we got a proper array
        if (reqGroups && reqGroups.length > 0) {
            Lecture.find({ groups: { $in: reqGroups }}).sort({startTime: 1}).exec(function(err, lectures) {
                if (err) { res.status(500).send(err + reqGroups);  }
                res.status(200).json(lectures);
                res.end();
            });
        } else {
            res.status(400).json({ error: "ohh that query looks wrong to me: " + reqGroups });
            return;
        }
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
