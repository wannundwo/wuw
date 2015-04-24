// wuw server
"use strict";

// import packages (api)
var express = require("express");
var expressValidator = require("express-validator");
var bodyParser = require("body-parser");
var util = require("util");
var mongoose = require("mongoose");
var morgan = require("morgan");
var https = require("https");
var fs = require("fs");


// mongodb
var mongohost="localhost:27017";
var mongodb=process.env.WUWDB || "wuw";
var mongoConnection="mongodb://" + mongohost + "/" + mongodb;


// ssl
try {
    var use_ssl = true;
    var key = fs.readFileSync("./ssl-wuw.key");
    var cert = fs.readFileSync("./ssl-wuw.crt");
    // load passphrase from file
    var pass = require("./ssl-pass");
    var https_options = {
        key: key,
        cert: cert,
        passphrase: pass.passphrase
    };
} catch(err) {
    if (err) { use_ssl = false; }
}

// create the express app & configure port
var app = express();
var port = process.env.WUWPORT || 4342;

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
mongoose.connect(mongoConnection);

// create models from our schemas
var Lecture = require("./models/model_lecture");
var Deadline = require("./models/model_deadline");


// router
var router = express.Router();
// import our routes
var apiLectures = require("./routes/lectures");
var apiDeadlines = require("./routes/deadlines");

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


router.use("/lectures", apiLectures);

router.use("/deadlines", apiDeadlines);


// on routes that end in /upcomingLectures
router.route("/upcomingLectures")

    // get upcoming lectures (GET /$apiBaseUrl/upcomingLectures)
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


// on routes that end in /lecturesForGroups
router.route("/lecturesForGroups")

    // get lectures for specific groups (GET /$apiBaseUrl/lecturesForGroups)
    .post(function(req, res) {
        var reqGroups = JSON.parse(req.body.groups);

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


// on routes that end in /groupLectures
router.route("/groupLectures")

    // get all groups (GET /$apiBaseUrl/groupLectures)
    .get(function(req, res) {
        // querys for all groups & their lectures and aggregate
        Lecture.aggregate( [ { $unwind: "$groups" }, { $group: { _id: "$groups", lectures: { $addToSet: "$lectureName" } } }, {$sort: { _id: 1}} ] ).exec(function(err, groups) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(groups);
            res.end();
        });
    });


// register the router & the base url
app.use(apiBaseUrl, router);


// start the server
console.log("\n* starting the wuw api\n");
console.log("  mongodb:  " + mongoConnection);
console.log("  ssl:      " + use_ssl);
if(use_ssl) {
    var server = https.createServer(https_options, app).listen(port);
    console.log("  url:      https://localhost:" + port + apiBaseUrl);
} else {
    var server = app.listen(port);
    console.log("  url:      http://localhost:" + port + apiBaseUrl);
}
console.log();


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
