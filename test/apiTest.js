"use strict";

var assert = require('assert');
var api = require('../api');
var parser = require('../parser');
var fs = require('fs');

parser.parse('<html></html>');

describe('Api', function(){

  it('api should be defined', function() {
    assert.notEqual(typeof api, 'undefined');
  });

  it('startApi should be a function', function() {
    assert.equal(typeof api.startApi, 'function');
  });

  it('api should be startable', function() {
    api.startApi();
  });
});
