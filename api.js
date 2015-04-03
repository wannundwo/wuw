// wuw server
"use strict";

// import packages (api)
var express = require("express");
var expressValidator = require('express-validator');
var bodyParser = require("body-parser");
var util = require('util');
var mongoose = require("mongoose");
var morgan = require("morgan");
var https = require('https');
var fs = require('fs');


// ssl
var key = fs.readFileSync('./ssl-wuw.key');
var cert = fs.readFileSync('./ssl-wuw.crt');
// load passphrase from file
var pass = require("./ssl-pass");
var https_options = {
    key: key,
    cert: cert,
    passphrase: pass.passphrase
};


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
app.use(expressValidator());

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
    //console.log("Something is happening...");
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
        Lecture.find({}).sort({startTime: 1}).exec(function(err, lectures) {
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


// on routes that end in /upcomingLectures
router.route("/upcomingLectures")

    // get upcoming lectures (GET /$apiBaseUrl/upcomingLectures)
    .get(function(req, res) {
        Lecture.find({"endTime": {"$gte": new Date()}}).sort({startTime: 1}).exec(function(err, lectures) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(lectures);
            res.end();
        });
    });

// on routes that end in /rooms
router.route("/rooms")

    // get all rooms (GET /$apiBaseUrl/rooms)
    .get(function(req, res) {
        // querys for all rooms and aggregate to one doc
        Lecture.aggregate([ { $unwind: "$rooms" }, { $group: { _id: "rooms", rooms: { $addToSet: "$rooms" } } } ]).exec(function(err, rooms) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(rooms[0].rooms);
            res.end();
        });
    });

// on routes that end in /freeRooms
router.route("/freeRooms")

    // get all (probably) free rooms (GET /$apiBaseUrl/freeRooms)
    .get(function(req, res) {

        // get all rooms (in db)
        Lecture.aggregate([ { $unwind: "$rooms" }, { $group: { _id: "rooms", rooms: { $addToSet: "$rooms" } } } ]).exec(function(err, rooms) {
            if (err) { res.status(500).send(err); }

            // get rooms currently in use
            Lecture.aggregate([ { $match: { startTime: { "$lte": new Date() }, endTime: { "$gte": new Date() } } }, { $unwind: "$rooms" }, { $group: { _id: "rooms", rooms: { $addToSet: "$rooms" } } } ]).exec(function(err, usedRooms) {
                if (err) { res.status(500).send(err); }

                // filter used rooms by comparing both arrays
                var freeRooms;
                if(usedRooms[0] && usedRooms[0].rooms) {
                    freeRooms = rooms[0].rooms.filter(function(e) {
                        return (usedRooms[0].rooms.indexOf(e) < 0);
                    });
                } else {
                    // all rooms free
                    freeRooms = rooms[0].rooms;
                }

                res.status(200).json(freeRooms);
                res.end();
            });
        });
    });

// on routes that end in /groups
router.route("/groups")

    // get all groups (GET /$apiBaseUrl/groups)
    .get(function(req, res) {
        // querys for all groups and aggregate to one doc
        Lecture.aggregate([ { $unwind: "$groups" }, { $group: { _id: "groups", groups: { $addToSet: "$groups" } } } ]).exec(function(err, groups) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(groups[0].groups);
            res.end();
        });
    });


// register the router & the base url
app.use(apiBaseUrl, router);

// start the https server
var server = https.createServer(https_options, app).listen(port);
console.log("magic happens at https://localhost:" + port + apiBaseUrl);

var startApi = function() {
    if (!server) {
        server = app.listen(port);
    }
};

var stopApi = function() {
    server.close();
};

// export functions
module.exports = { startApi: startApi, stopApi: stopApi };
