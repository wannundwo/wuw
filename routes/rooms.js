"use strict";

// old /freeRooms is now /rooms/free !!!

// import the express router
var router = require("express").Router();

// create model
var Lecture = require("../models/model_lecture");


// on routes that end in /rooms
router.route("/")

    // get all rooms (GET /$apiBaseUrl/rooms)
    .get(function(req, res) {
        // querys for all rooms and aggregate to one doc
        Lecture.aggregate([ { $unwind: "$rooms" }, { $group: { _id: "rooms", rooms: { $addToSet: "$rooms" } } } ]).exec(function(err, rooms) {
            if (err) { res.status(500).send(err); }
            res.status(200).json(rooms[0].rooms);
            res.end();
        });
    });


// on routes that end in /rooms/free
router.route("/free")

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


module.exports = router;
