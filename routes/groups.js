"use strict";

// old /groupLectures is now /groups/lectures !!!

// import the express router
var router = require("express").Router();

// create model
var Lecture = require("../models/model_lecture");


// on routes that end in /groups
router.route("/")

    // get all groups (GET /$apiBaseUrl/groups)
    .get(function(req, res) {
        // querys for all groups and aggregate to one doc
        Lecture.aggregate([ { $unwind: "$groups" }, { $group: { _id: "groups", groups: { $addToSet: "$groups" } } } ]).exec(function(err, groups) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(groups[0].groups);
            res.end();
        });
    });


// on routes that end in /groupLectures
router.route("/lectures")

    // get all groups (GET /$apiBaseUrl/groupLectures)
    .get(function(req, res) {
        // querys for all groups & their lectures and aggregate
        Lecture.aggregate( [ { $unwind: "$groups" }, { $group: { _id: "$groups", lectures: { $addToSet: "$lectureName" } } }, {$sort: { _id: 1}} ] ).exec(function(err, groups) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(groups);
            res.end();
        });
    });


module.exports = router;
