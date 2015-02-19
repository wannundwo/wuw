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
        day = day.replace(/ /g, '') // remove that whitespace
        day = day.replace('\n', '')
        days.push(day);
      });

      // plan2 & plan22 are our elements, where the lectures are stored
      $('td.plan2, td.plan22').each(function(index){

        // get the column number of this td and define the date
        var columnIndex = $(this).parent().children().index($(this));
        var lectureDate = days[columnIndex-2];
        var lecture = $(this);

        // in this Lecture are Groups, i.e IF3_4 or IL (we had this in DSA or Theo)
        // we create a lecture for every group
        lecture.find('table').each(function(jindex){
          var newLecture = {};
          newLecture.date = lectureDate;

          // name and location are urls, so find them by "a"
          $(this).find('a').each(function(kindex){
            if (kindex == 0) {
              var lectureName = $(this).attr('title');
              lectureName = lectureName.replace(/ /g, '');
              lectureName = lectureName.replace('\n', '');
              lectureName = lectureName.replace('\t', '');
              newLecture.lectureName = lectureName;
            } else if (kindex == 1) {
              newLecture.room = $(this).text();
            }
          });

          // add lecture to the lecture list of this week
          //lecturesThisWeek.push(newLecture);
          lecturesThisWeek.push(newLecture);
        });
      });

      res.write(JSON.stringify(lecturesThisWeek, null, 2));
      res.end();
    }
  });


})

app.listen('8081')
console.log('LSF Scrapping happens on port 8081');
exports = module.exports = app;
