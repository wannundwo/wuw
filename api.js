// wuw server
"use strict";

// import packages
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var morgan = require("morgan");

// create the express app & configure port
var app = express();
var port = process.env.PORT || 8088;

// api version & url
var apiVersion = 0;
var apiBaseUrl = "/api/v" + apiVersion;


// use morgan to log
app.use(morgan("dev"));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// allow cross origin resource sharing
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// connect to mongodb
mongoose.connect("mongodb://localhost:27017/wuw");

// create models from our schemas
var Lecture = require("./model_lecture");
var Deadline = require("./model_deadline");


// routes
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
    // do logging
    console.log("Something is happening...");
    next();
});

// test route to make sure everything is working (GET /$apiBaseUrl)
router.get("/", function(req, res) {
    res.status(200).json({ message: "welcome to the wuw api v" + apiVersion });
    res.end();
});


// on routes that end in /lectures
router.route("/lectures")

    // get all lectures (GET /$apiBaseUrl/lectures)
    .get(function(req, res) {
        Lecture.find(function(err, lectures) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lectures);
            res.end();
        });
    });

// on routes that end in /lectures/:lecture_id
router.route("/lectures/:lecture_id")

    // get lecture with that id (GET /$apiBaseUrl/lectures/:lecture_id)
    .get(function(req, res) {
        Lecture.findById(req.params.lecture_id, function(err, lecture) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lecture);
            res.end();
        });
    });


// on routes that end in /deadlines
router.route("/deadlines")

    // get all deadlines (GET /$apiBaseUrl/deadlines)
    .get(function(req, res) {
        Deadline.find(function(err, deadlines) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(deadlines);
            res.end();
        });
    })

    // create a deadline (POST /$apiBaseUrl/deadlines)
    .post(function(req, res) {
        // create instance of Deadline model
        var deadline = new Deadline();
        // set attributes
        deadline.deadline = req.body.deadline;
        deadline.info = req.body.info;
        deadline.shortLectureName = req.body.shortLectureName;
        deadline.group = req.body.group;
        // save deadline in mongodb
        deadline.save(function(err) {
            if (err) { res.send(err); }
            res.status(200).json({ message: "Deadline created!" });
        });
    });

// on routes that end in /deadlines/:deadline_id
router.route("/deadlines/:deadline_id")

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


// register the router & the base url
app.use(apiBaseUrl, router);

// start the server
app.listen(port);
console.log("magic happens at http://localhost:" + port + apiBaseUrl);
