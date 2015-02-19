var express = require('express');
var fs      = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app     = express();

app.get('/scrape', function(req, res){

  url = "https://lsf.hft-stuttgart.de/qisserver/rds?state=wplan&k_abstgv.abstgvnr=262&week=3_2015&act=stg&pool=stg&show=plan&P.vx=lang&fil=plu&P.subc=plan";
  request(url, function(error, response, html) {
    if(!error) {
      console.log("HTML loaded without errors");

      /*********** PARSING ***********/
      var $ = cheerio.load(html);
      var days = []; // here we want so save the days of this week
      var lecturesThisWeek = [];

      // find the days (Mo, Die, Mi, ...) in the header
      var headerRow = $('th.plan_rahmen').closest('table').children('tr').first();
      headerRow.find('th').each(function(index) {
        var day = $(this).text();
        day = day.replace(/ /g, ''); // remove that whitespace
        day = day.replace(/\n/g, ' ');
        day = day.trim();
        days.push(day);
      });

      // td.plan2 and td.plan22 are our lecture elements
      var prevRowIndex = -1;
      var newRow = true;
      var dateOffset = 0;
      $('td.plan2, td.plan22').each(function(index){

        // Whats going on here? We look in which column is this lecture,
        // then we go up and pull the date from the column header. There could
        // be an offset which is caused by "Zeit"-column. We find this offset
        // and respect it when pulling the date from the header.
        // This is very specific to the LSF HTML sctructure,
        // have a look at the LSF table DOM for a better understanding.
        var columnIndex = $(this).parent().children().index($(this));
        var rowIndex = $(this).parent().parent().children().index($(this).parent());
        if (prevRowIndex == rowIndex) {
          newRow = false;
        } else {
          newRow = true;
        }

        if (newRow) {
          dateOffset = $(this).prevAll().length;
          firstTimeInThisRow = false;
        }
        prevRowIndex = rowIndex;
        var lectureDate = days[columnIndex-dateOffset];

        // in this lecture could be many groups, i.e IF3_4 or IL (we had this in DSA or Theo)
        // we create a lecture for every group
        var lecture = $(this);
        lecture.find('table').each(function(jindex){
          var newLecture = {};
          newLecture.date = lectureDate;

          // name and location are urls, so find them by "a"
          $(this).find('a').each(function(kindex){
            if (kindex == 0) {
              newLecture.fullLectureName = $(this).attr('title');
            } else if (kindex == 1) {
              newLecture.room = $(this).text();
            }
          });

          // query time
          $(this).find('td.notiz').each(function(kindex){
            if (kindex == 0) {
              var time = $(this).text();
              time = time.replace(/ /g, '');
              time = time.replace(/\n/g, '');
              newLecture.timeSpan = time;
            }
          });

          // extract group from the name
          newLecture.group = newLecture.fullLectureName.split(' ')[0];

          // extract short lecture name
          var shortLectureNameParts = newLecture.fullLectureName.split(' ');
          shortLectureNameParts.splice(0,1);
          newLecture.shortLectureName = shortLectureNameParts.join(" ");

          // add lecture to the lecture list of this week
          lecturesThisWeek.push(newLecture);
        });
      });
      // write prettfied JSON
      res.write(JSON.stringify(lecturesThisWeek, null, 2));
      res.end();
    }
  });
})

app.listen('8081')
console.log('LSF Scrapping happens on port 8081');
exports = module.exports = app;
