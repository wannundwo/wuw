"use strict";

var assert = require('assert');
var api = require('../api');
var parser = require('../parser');
var fs = require('fs');
var request = require('request');

describe('Api', function(){

  before(function () {
    api.startApi();
  });

  after(function () {
    api.stopApi();
  });

  it('api should be defined', function() {
    assert.notEqual(typeof api, 'undefined');
  });

  it('startApi should be a function', function() {
    assert.equal(typeof api.startApi, 'function');
  });

  describe('http', function() {
    it('/ should return 200', function(done) {
      request("http://localhost:8088/api/v0/", function(error, response, html) {
        assert.equal(response.statusCode, 200);
        done();
      });
    });

    it('/deadlines should return 200', function(done) {
      request("http://localhost:8088/api/v0/deadlines/", function(error, response, html) {
        assert.equal(response.statusCode, 200);
        done();
      });
    });

    it('/lectures should return 200', function(done) {
      request("http://localhost:8088/api/v0/lectures", function(error, response, html) {
        assert.equal(response.statusCode, 200);
        done();
      });
    });

    var id = "";
    it('it should create deadline', function(done) {
        var deadline = {
            info: 'Do it!',
            deadline: new Date()
        };

        var conf = {
            url: 'http://localhost:8088/api/v0/deadlines/',
            form: deadline
        };

        // create a deadline
        request.post(conf, function(error, response, body) {
            assert.equal(response.statusCode, 200);
            id = JSON.parse(body).id;
            assert.notEqual(typeof id, 'undefined');
            done();
        });
    });

    it('it should have deadline', function(done) {
        var url = 'http://localhost:8088/api/v0/deadlines/' + id;
        request(url, function(error, response, html) {
            assert.equal(response.statusCode, 200);
            var info = JSON.parse(html).info;
            assert.equal(info, 'Do it!');
            done();
        });
    });

  });
});
