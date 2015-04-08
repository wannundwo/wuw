"use strict";

var request = require("request");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var async = require("async");
var crypto = require("crypto");


// how many days should we parse?
var daysToParse = 2;


// simple hash-algo to generate 12 byte long objectId
var hashCode = function(s){
    var hash = crypto.createHash('md5').update(s).digest('hex').substring(0, 12);
    return hash;
};

// parsing
var parse = function(html, cb) {
    // create models from our schemas
    var Lecture = require("./model_lecture");

    // init cheerio with our html
    var $ = cheerio.load(html);

    // get date for this day
    var curDate = $("h2").text().split(", ")[1];

    // parse each single lecture
    async.each($("tr"), function(lectureLine, trcb) {

        // prepare docents
        var docents = [];
        $(lectureLine).children().eq(7).text().trim().split(" , ").forEach(function(docent){
            if(docent !== "") {
                docents.push(docent.replace(/.*Professor/g, "").replace(/ */g, ""));
            }
        });

        // prepare group & room (not really needed but more readable)
        var group = $(lectureLine).children().eq(6).text().trim();
        var room = $(lectureLine).children().eq(5).text().trim();

        // create Lecture from our Model
        var Lec = new Lecture();
        // set attributes
        Lec.lectureName = $(lectureLine).children().eq(3).text().trim();
        Lec.startTime = new Date(curDate + " " + $(lectureLine).children().eq(0).text().trim());
        Lec.endTime = new Date(curDate + " " + $(lectureLine).children().eq(1).text().trim());
        Lec.docents = docents;
        Lec.hashCode = hashCode(Lec.lectureName+curDate+Lec.startTime);
        Lec._id = mongoose.Types.ObjectId(Lec.hashCode);

        // create an object from our document
        var upsertData = Lec.toObject();
        // delete attributes to upsert
        delete upsertData.rooms;
        delete upsertData.groups;

        // save lecture to db & call callback
        Lecture.update({ _id: Lec.id }, { $set: upsertData, $addToSet: { rooms: room, groups: group }  }, { upsert: true }, trcb);
    }, function() {
        // day done
        cb();
    });
};

// create urls including the date which we want to parse
var createUrls = function() {
    var urls = [];
    for(var i = 0; i < daysToParse; i++) {
        // get date to parse
        var today = new Date();
        today.setDate(today.getDate() + i);
        // assemble datestring & url
        var currDay = today.getDate() + "." + (today.getMonth()+1) + "." + today.getFullYear();
        var url = "https://lsf.hft-stuttgart.de/qisserver/rds?state=currentLectures&type=0&next=CurrentLectures.vm&nextdir=ressourcenManager&navigationPosition=lectures&currentLectures&breadcrumb=currentLectures&topitem=lectures&subitem=currentLectures&P.Print=&&HISCalendar_Date=" + currDay + "&asi=";
        urls.push(url);
    }
    return urls;
};

var startParser = function() {
    // connect to mongodb (if not already)
    if(mongoose.connection.readyState === 0) {
        mongoose.connect("mongodb://localhost:27017/wuwNew");
    }

    // create model from our schema (needed for drop)
    var Lecture = require("./model_lecture");

    // create the urls to parse
    var urls = createUrls();

    console.log("started parsing of " + daysToParse + " days (this inlcuded)...");

    // drop current lecture collection to get a fresh result
    mongoose.connection.collections.lectures.drop(function(err) {
        if(err) { console.log(err); }

        console.log("dropped old \""+ Lecture.collection.name + "\" collection, lets start clean...");

        // parse every url (max. 5 parallel, dont fuck the lsf)
        async.eachLimit(urls, 5, function(url, cb) {
            request(url, function(error, response, html) {
                if(!error) {
                    // parse html with all lectures for choosen date
                    parse(html, cb);
                }
            });
        }, function() {
            // everything done
            mongoose.disconnect();
            console.log("...done!");
        });
    });
};

// start the magic
startParser();

module.exports = { startParser: startParser, parse: parse };
