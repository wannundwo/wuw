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

  it('api should return something', function(done) {
    request("http://localhost:8088/api/v0", function(error, response, html) {
      done();
    });
  });

});
