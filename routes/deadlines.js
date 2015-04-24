"use strict";

var util = require("util");

// import the express router
var router = require("express").Router();

// create model
var Deadline = require("../models/model_deadline");


// on routes that end in /deadlines
router.route("/")

    // get all deadlines (GET /$apiBaseUrl/deadlines)
    .get(function(req, res) {

        // get date of yesterday
        var yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // all "active" deadlines
        Deadline.find({"deadline": {"$gte": yesterday}}).sort({deadline: 1}).exec(function(err, deadlines) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(deadlines);
            res.end();
        });
    })

    // create a deadline (POST /$apiBaseUrl/deadlines)
    .post(function(req, res) {
        // create instance of Deadline model
        console.log(req.body);
        var deadline = new Deadline();

        // check inputs
        req.assert("deadline", "deadline must be a valid date").isDate();
        req.assert("deadline", "deadline must not be empty").notEmpty();
        req.assert("info", "info must not be empty").notEmpty();
        //req.assert("lectureName", "lectureName must not be empty").notEmpty();
        //req.assert("group", "group must not be empty").notEmpty();
        //req.assert("uuid", "oh kiddie...").notEmpty();

        // if there are errors, send 400
        var errors = req.validationErrors(true);
        if (errors) {
            res.status(400).send("There have been validation errors: " + util.inspect(errors));
            return;
        }

        // set attributes
        deadline.deadline = req.body.deadline;
        deadline.info = req.body.info;
        deadline.shortLectureName = req.body.shortLectureName;
        deadline.group = req.body.group;
        deadline.createdBy = req.body.uuid;

        // save deadline in mongodb
        deadline.save(function(err, deadline) {
            if (err) { res.send(err); }
            res.status(200).json({ message: "Deadline created!", id: deadline.id });
        });
    });

// on routes that end in /deadlines/:deadline_id
router.route("/:deadline_id")

    // get deadline with that id (GET /$apiBaseUrl/deadlines/:deadline_id)
    .get(function(req, res) {
        Deadline.findById(req.params.deadline_id, function(err, deadline) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(deadline);
            res.end();
        });
    })

    // update deadline with this id
    .put(function(req, res) {
        Deadline.findById(req.params.deadline_id, function(err, deadline) {
            if (err) { res.status(500).send(err); }

            // set new attributes
            deadline.deadline = req.body.deadline;
            deadline.shortLectureName = req.body.shortLectureName;
            deadline.group = req.body.group;

            deadline.save(function(err) {
                if (err) { res.send(err); }
                res.status(200).json({ message: "Deadline updated!" });
            });

        });
    })

    // delete the deadline with this id
    .delete(function(req, res) {
        Deadline.remove({
            _id: req.params.deadline_id
        }, function(err) {
            if (err) { res.status(500).send(err); }
            res.status(200).json({ message: "Deadline successfully deleted" });
        });
    });

module.exports = router;
