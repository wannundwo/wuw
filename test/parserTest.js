"use strict";

var assert = require('assert');
var parser = require('../parser');
var fs = require('fs');

describe('Parser', function(){
    describe('parse()', function() {
        it('should be 0 lectures in empty html', function(){
            var lectures = parser.parse('<html></html>');
            assert.equal(lectures.length, 0);
        });

        it('should be 14 lectures in SS15 IF3_4', function(done) {
            fs.readFile('./test/data/ss15_if3_4.html', 'utf8', function (err, html) {
                if (err) { return console.log(err); }
                var lectures = parser.parse(html);
                assert.equal(14, lectures.length);
                done();
            });
        });

        it('Operations Research should be in BAU 1 - 1/206 ', function(done) {
            fs.readFile('./test/data/ss15_if3_4.html', 'utf8', function (err, html) {
                if (err) { return console.log(err); }
                var lectures = parser.parse(html);
                var or = lectures[3];
                assert.equal(or.lsfRoom, "BAU 1 - 1/206");
                done();
            });
        });

        it('should be 12 lectures in SS15 IF2', function(done) {
            fs.readFile('./test/data/ss15_if2.html', 'utf8', function (err, html) {
                if (err) { return console.log(err); }
                var lectures = parser.parse(html);
                assert.equal(12, lectures.length);
                done();
            });
        });

        it('GdI should have time', function(done) {
            fs.readFile('./test/data/ss15_if2.html', 'utf8', function (err, html) {
                if (err) { return console.log(err); }
                var lectures = parser.parse(html);
                var gdi = lectures[11];
                assert.equal("15:45-17:15(1)", gdi.lsfTime);
                done();
            });
        });
    });
});
