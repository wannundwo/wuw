"use strict";

var request = require("request");
var cheerio = require("cheerio");
var mongoose = require("mongoose");
var async = require("async");
var crypto = require("crypto");


// how many weeks should we parse?
var weeksToParse = 1;

var categories = ["Vorspeise", "Das Komplettpaket", "Die solide Basis", "Bio pur", "Das grüne Glück", "Der Renner", "Beilagen", "Nachttisch"];


// simple hash-algo to generate 12 byte long objectId
var hashCode = function(s){
    var hash = crypto.createHash('md5').update(s).digest('hex').substring(0, 12);
    return hash;
};

// parsing
var parse = function(html, cb) {
    // create models from our schemas
    var Dish = require("./model_dish");

    // init cheerio with our html
    var $ = cheerio.load(html);

    var fullWeek = $("div.print-content div.view div.view-content div.item-list ul").children();

    //console.log(fullWeek);

    // get date for this day
    // var curDate = $("h2").text().split(", ")[1];
    // var curDateArr = curDate.split(".");
    // var intDate = curDateArr[1] + "/" + curDateArr[0] + "/" + curDateArr[2];


    // parse each single lecture
    async.each(fullWeek, function(weekPlan, trcb) {

        console.log("-----------------------------------------------A");
        var curDate = $(weekPlan).find("span.date-day-numeric").html().trim();
        console.log(curDate);

        $(weekPlan).find("td.speiseangebotbody").each(function(i, e) {
            //console.log("me: " + i + " - " + $(e).html());

            console.log(categories[i] + ": " + $(e).find("span.name").html());

            var allergens;
            var additiveNumber = $(e).find("span.additive_number");
            // prepare attributes, allergens & additives
            if(additiveNumber) {
                $(additiveNumber).each(function(i, e) {
                    console.log(i);
                    var adds = $(e).html().split(",");
                    console.log(typeof adds[0]);
                    if(typeof adds[0] === "string") {
                        allergens = adds;
                    } else if(typeof adds[0] === "number") {
                        console.log("is number");
                    }
                    console.log(adds[0]);
                });
            }

            // create Dish from our Model
            var curDish = new Dish();
            // set attributes
            curDish.dishName = $(e).find("span.name").html();
            curDish.allergens = allergens;

            //console.log(curDish);
            console.log("-------------");
        });
        // // prepare docents
        // var docents = [];
        // $(lectureLine).children().eq(7).text().trim().split(" , ").forEach(function(docent){
        //     if(docent !== "") {
        //         docents.push(docent.replace(/.*Professor/g, "").replace(/ */g, ""));
        //     }
        // });
        //
        // // prepare group & room (not really needed but more readable)
        // var group = $(lectureLine).children().eq(6).text().trim();
        // var room = $(lectureLine).children().eq(5).text().trim();
        //
        // // create Lecture from our Model
        // var Lec = new Lecture();
        // // set attributes
        // Lec.lectureName = $(lectureLine).children().eq(3).text().trim();
        // Lec.startTime = new Date(intDate + " " + $(lectureLine).children().eq(0).text().trim());
        // Lec.endTime = new Date(intDate + " " + $(lectureLine).children().eq(1).text().trim());
        // Lec.docents = docents;
        // Lec.hashCode = hashCode(Lec.lectureName+curDate+Lec.startTime);
        // Lec._id = mongoose.Types.ObjectId(Lec.hashCode);
        //
        // // create an object from our document
        // var upsertData = Lec.toObject();
        // // delete attributes to upsert
        // delete upsertData.rooms;
        // delete upsertData.groups;
        //
        // // lectures without a group/room are useless...
        // if(group !== "" && room !== "") {
        //     // save lecture to db & call callback
        //     Lecture.update({ _id: Lec.id }, { $set: upsertData, $addToSet: { rooms: room, groups: group }  }, { upsert: true }, trcb);
        // } else {
        //     trcb();
        // }

        //console.log("-----------------------------------------------E");
    }, function() {
        // day done
        cb();
    });
};

// get the calendar week
Object.defineProperty(Date.prototype, "getWeek", {
    value: function() {
        var determinedate = new Date();
        determinedate.setFullYear(this.getFullYear(), this.getMonth(), this.getDate());
        var D = determinedate.getDay();
        if(D === 0) { D = 7; }
        determinedate.setDate(determinedate.getDate() + (4 - D));
        var YN = determinedate.getFullYear();
        var ZBDoCY = Math.floor((determinedate.getTime() - new Date(YN, 0, 1, -6)) / 86400000);
        var WN = 1 + Math.floor(ZBDoCY / 7);
        return WN;
    }
});

// create urls including the calendar week which we want to parse
var createUrls = function() {
    var urls = [];
    for(var i = 0; i < weeksToParse; i++) {
        // get date to parse
        var today = new Date();
        var currentWeek = (today.getWeek() + i) % 53;
        var currentYear = today.getFullYear();
        // assemble datestring & url
        var currWeek = currentYear + "-W" + currentWeek;
        var url = "https://www.studierendenwerk-stuttgart.de/print/gastronomie/speiseangebot/" + currWeek;
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
    var Dish = require("./model_dish");

    // create the urls to parse
    var urls = createUrls();

    console.log("started parsing of " + weeksToParse + " days (this inlcuded)...");

    // drop current collection to get a fresh result
    mongoose.connection.collections.dishes.drop(function(err) {
        if(err) { console.log(err); }

        console.log("dropped old \""+ Dish.collection.name + "\" collection, lets start clean...");

        // parse every url (max. 5 parallel, dont fuck the studentenwerk)
        async.eachLimit(urls, 5, function(url, cb) {
            console.log(url);
            request(url, function(error, response, html) {
                if(!error) {
                    // parse html with all dishes for choosen date
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
