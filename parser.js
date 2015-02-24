var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();

app.get('/scrape', function(req, res){
  // just a static test url, later the client will send a week and a year
  url = "https://lsf.hft-stuttgart.de/qisserver/rds?state=wplan&k_abstgv.abstgvnr=262&week=3_2015&act=stg&pool=stg&show=plan&P.vx=lang&P.Print=";

  request(url, function(error, response, html) {
    if(!error) {
      var table = null;
      var days = [];
      var timeTableGrid = [];
      var lectures = [];
      var $ = cheerio.load(html);

      // load days before we cut of td.plan_rahmen stuff
      days = getDaysInThisWeek($);

      // remove td.plan rahmen from the table, this removes a lot of trouble
      table = $('th.plan_rahmen').closest('table');
      table.find('.plan_rahmen').remove();

      // lets parse
      // get all the rows of the timetable (except the header (days) row)
      var rows = table.children('tr:not(:first-child)');

      // create and prefill the grid, which holds our whole timetable
      for (var i = 0; i < rows.length; i++) {     // rows
        timeTableGrid[i] = new Array(days.length);
        for (var j = 0; j < days.length; j++) {   // columns
          timeTableGrid[i][j] = ".";
        }
      }

      // iterate over each row and each cell
      rows.each(function(i) {
        var cells = $(this).children('td:not(:first-child)');

        // it seems like cheerio doesnt support collection.get(), so we just
        // bottle that cheerio collection into a native array.
        var cellsArray = [];
        cells.each(function(j) {
          cellsArray.push($(this));
        });

        for (var j = 0; j < days.length; j++) {
          if (timeTableGrid[i][j] == ".") { // here must be a td-(lecture)-element

            var currCell = cellsArray[0];
            cellsArray.shift(); // removes the first element, its a pseudo queue

            if (currCell.attr('class').indexOf('plan1') > -1) {
              // no lecture here
            } else if (currCell.attr('class').indexOf('plan2') > -1) { // here we have a lecture
              // now mark the whole rowspan down as the same lecture
              var rowspan = currCell.attr('rowspan');
              for (var k = 0; k < rowspan; k++) {
                timeTableGrid[i+k][j] = j;
              }

              /******** PARSE THE LECURE TD *********/
              var moreLectures = parseLecturesFromHtml(currCell, days, j);
              Array.prototype.push.apply(lectures, moreLectures); // join two arrays, the js way ¯\_(ツ)_/¯
            }
          }
        }
        //outputAsTable(timeTableGrid, i); // we keep this comment as an debug toggle
      });

      res.write(JSON.stringify(lectures, null, 2));
      res.end();
    }
  });
});

var parseLecturesFromHtml = function(html, days, dayPos) {
  var lectures = [];
  var $ = cheerio.load(html);

  // there could be more then one groups in this lecture,
  // we create a lecture for every group
  html.find('table').each(function(i) {
    var lecture = {};
    lecture.lsfDate = days[dayPos];
    lecture.lsfTime = trimProperty($(this).find('td.notiz').first().text());
    lecture.lsfName = $(this).find('a').first().attr('title');
    lecture.lsfRoom = $(this).find('td.notiz a').first().text();
    lecture.group = parseGroup(lecture.lsfName);
    lecture.shortName = parseShortName(lecture.lsfName);
    lectures.push(lecture);
  });
  return lectures;
}

var parseGroup = function(s) {
    return s.split(" ")[0];
}

var parseShortName = function(s) {
    var parts = s.split(" ");
    parts.shift();
    var shortName = parts.join(" ");
    return shortName;
}

var trimProperty = function(s) {
  s = s.replace(/ /g, ''); // remove that whitespace
  s = s.replace(/\n/g, ' ');
  s = s.trim();
  return s;
}

var outputAsTable = function(timeTableGrid, iteration) {
  for (var i = 0; i < timeTableGrid.length; i++) {
    var row = timeTableGrid[i];
    process.stdout.write(iteration + ". ROW: " + i + ":\t");

    for (var j = 0; j < row.length; j++) {
      process.stdout.write(row[j] + "  ");
    }

    process.stdout.write("\n");
  }
}

var getDaysInThisWeek = function($) {
  var days = [];
  var headerRow = $('th.plan_rahmen').closest('table').children('tr').first();
  headerRow.find('th').each(function(index) {
    var day = $(this).text();
    day = day.replace(/ /g, '');
    day = day.replace(/\n/g, ' ');
    day = day.trim();
    days.push(day);
  });
  return days;
}

app.listen('8081')
console.log('LSF Scrapping happens on port 8081');
exports = module.exports = app;
