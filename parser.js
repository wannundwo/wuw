"use strict";

var request  = require("request");
var cheerio  = require("cheerio");
var moment   = require("moment");
var mongoose = require("mongoose");
var async    = require("async");
var crypto   = require("crypto");


// how many weeks should we parse?
var weeksToParse = 2;


var parse = function(html) {
    var table = null;
    var days = [];
    var timeTableGrid = [];
    var lectures = [];
    var $ = cheerio.load(html);

    // load days before we cut of td.plan_rahmen stuff
    days = getDaysInThisWeek($);

    // remove td.plan rahmen from the table, this removes a lot of trouble
    table = $("th.plan_rahmen").closest("table");
    table.find(".plan_rahmen").remove();

    // lets parse
    // get all the rows of the timetable (except the header (days) row)
    var rows = table.children("tr:not(:first-child)");

    // create and prefill the grid, which holds our whole timetable
    for (var i = 0; i < rows.length; i++) {     // rows
        timeTableGrid[i] = new Array(days.length);
        for (var j = 0; j < days.length; j++) {   // columns
            timeTableGrid[i][j] = ".";
        }
    }

    // iterate over each row and each cell
    rows.each(function(i) {
        var cells = $(this).children("td:not(:first-child)");

        // it seems like cheerio doesnt support collection.get(), so we just
        // bottle that cheerio collection into a native array.
        var cellsArray = [];
        cells.each(function(j) {
            cellsArray.push($(this));
        });

        for (var j = 0; j < days.length; j++) {
            if (timeTableGrid[i][j] === ".") { // here must be a td-(lecture)-element

                var currCell = cellsArray[0];
                cellsArray.shift(); // removes the first element, its a pseudo queue

                if (currCell.attr("class").indexOf("plan2") > -1) { // here we have a lecture
                    // now mark the whole rowspan down as the same lecture
                    var rowspan = currCell.attr("rowspan");
                    for (var k = 0; k < rowspan; k++) {
                        timeTableGrid[i+k][j] = j;
                    }

                    // parse the lectures td element
                    var moreLectures = parseGroupsInLecture(currCell, days, j);
                    lectures = lectures.concat(moreLectures);
                }
            }
        }
    });
    return lectures;
};

var stringToColor = function(str) {

    // Generate a Hash for the String
    var hash = function(word) {
        var h = 0;
        for (var i = 0; i < word.length; i++) {
            h = word.charCodeAt(i) + ((h << 4) - h);
        }
        return h;
    };

    // Change the darkness or lightness
    var shade = function(color, prc) {
        var num = parseInt(color, 16),
            amt = Math.round(2.55 * prc),
            R = (num >> 16) + amt,
            G = (num >> 8 & 0x00FF) + amt,
            B = (num & 0x0000FF) + amt;
        return (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16)
            .slice(1);
    };

    // Convert init to an RGBA
    var int_to_rgba = function(i) {
        var color = ((i >> 24) & 0xFF).toString(16) +
            ((i >> 16) & 0xFF).toString(16) +
            ((i >> 8) & 0xFF).toString(16) +
            (i & 0xFF).toString(16);
        return color;
    };

    return shade(int_to_rgba(hash(str)), 10);
};

var insertInDatabase = function(lectures, cb) {
    // create models from our schemas
    var Lecture = require("./model_lecture");

    // push every lecture to our db
    async.each(lectures, function(lecture, cb) {

        // create Lecture from our Model
        var Lec = new Lecture();
        // set attributes
        Lec._id = mongoose.Types.ObjectId(lecture.hashCode);
        Lec.date = lecture.start;
        Lec.lectureName = lecture.lectureName;
        Lec.startTime = lecture.start;
        Lec.endTime = lecture.end;
        Lec.hashCode = lecture.hashCode;
        Lec.color = lecture.color;

        // create an object from our document
        var upsertData = Lec.toObject();

        // delete attributes to upsert
        delete upsertData.rooms;
        delete upsertData.groups;

        // prepare data
        var lsfRoom = lecture.lsfRoom.split(" ").pop(-1);

        // save lecture to db
        Lecture.update({ _id: Lec.id }, { $set: upsertData, $addToSet: { rooms: lsfRoom, groups: lecture.group }  }, { upsert: true }, cb);

    }, function(err) {
        if (err) { console.log(err); }
        console.log("Added " + lectures.length + " lectures in the database...");
        cb();
    });
};

var parseGroupsInLecture = function(html, days, dayPos) {
    var lectures = [];
    var $ = cheerio.load(html);

    // there could be more then one groups in this lecture,
    // we create a lecture for every group
    html.find("table").each(function(i) {
        var time = trimProperty($(this).find("td.notiz").first().text());
        var date = days[dayPos];

        var lecture = {};
        lecture.lsfName = $(this).find("a").first().attr("title");
        lecture.start = parseStartEnd(date, time).start;
        lecture.end = parseStartEnd(date, time).end;
        lecture.lsfDate = date;
        lecture.lsfTime = time;
        lecture.lsfRoom = $(this).find("td.notiz a").first().text();
        lecture.group = parseGroup(lecture.lsfName);
        lecture.lectureName = parseShortName(lecture.lsfName);
        lecture.hashCode = hashCode(lecture.lectureName+lecture.lsfDate+lecture.lsfTime);
        lecture.color = '#' + stringToColor(lecture.lectureName);

        lectures.push(lecture);
    });
    return lectures;
};

var parseGroup = function(s) {
    return s.split(" ")[0];
};

var parseShortName = function(s) {
    var parts = s.split(" ");
    parts.shift();
    var shortName = parts.join(" ");
    return shortName;
};

var parseStartEnd = function(date, time) {
    var start = null;
    var end = null;
    var timeString = time.split(" ")[0];
    var starTimeString = timeString.split("-")[0];
    var endTimeString = timeString.split("-")[1];

    var dateString = date.split(" ")[1];
    var startString = dateString + " " + starTimeString;
    var endString  = dateString + " " + endTimeString;

    start = moment(startString, "DD-MM-YYYY HH:mm");
    end = moment(endString, "DD-MM-YYYY HH:mm");

    return { start: start, end: end };
};

var trimProperty = function(s) {
    s = s.replace(/ /g, ""); // remove that whitespace
    s = s.replace(/\n/g, "");
    s = s.replace(/\r/g, "");
    s = s.trim();
    return s;
};

var outputAsTable = function(timeTableGrid, iteration) {
    for (var i = 0; i < timeTableGrid.length; i++) {
        var row = timeTableGrid[i];
        process.stdout.write(iteration + ". ROW: " + i + ":\t");

        for (var j = 0; j < row.length; j++) {
            process.stdout.write(row[j] + "  ");
        }

        process.stdout.write("\n");
    }
};

var getDaysInThisWeek = function($) {
    var days = [];
    var headerRow = $("th.plan_rahmen").closest("table").children("tr").first();
    headerRow.find("th").each(function(index) {
        var day = $(this).text();
        day = day.replace(/ /g, "");
        day = day.replace(/\n/g, " ");
        day = day.trim();
        days.push(day);
    });
    return days;
};

// simple hash-algo to generate 12 byte long objectId
var hashCode = function(s){
        var hash = crypto.createHash('md5').update(s).digest('hex').substring(0, 12);
        return hash;
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

// create urls including the week & year which we want to parse
var createUrls = function() {
    var urls = [];
    for(var i = 0; i < weeksToParse; i++) {
        var today = new Date();
        var currentWeek = (today.getWeek() + i) % 53;
        var currentYear = today.getFullYear();
        var url = "https://lsf.hft-stuttgart.de/qisserver/rds?state=wplan&k_abstgv.abstgvnr=262&week=" + currentWeek + "_" + currentYear + "&act=stg&pool=stg&show=plan&P.vx=lang&P.Print=";
        urls.push(url);
    }
    return urls;
};

var startParser = function() {
    // connect to mongodb (if not already)
    if(mongoose.connection.readyState === 0) {
        mongoose.connect("mongodb://localhost:27017/wuw");
    }

    // create model from our schema (needed for drop)
    var Lecture = require("./model_lecture");

    // create the urls to parse
    var urls = createUrls();

    console.log("Started parsing of " + weeksToParse + " weeks (this inlcuded)...");

    // drop current lecture collection to get a fresh result
    mongoose.connection.collections.lectures.drop(function(err) {
        if(err) { console.log(err); }

        console.log("Dropped old \""+ Lecture.collection.name + "\" Collection, lets start clean...");

        // parse every url
        async.each(urls, function(url, cb) {
            request(url, function(error, response, html) {
                if(!error) {
                    var lectures = parse(html);
                    insertInDatabase(lectures, cb);
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

module.exports = { parse: parse, startParser: startParser };
