var assert = require('assert')
var parser = require('../parser')

parser.parse('<html></html>');

describe('Parser', function(){
  describe('parse()', function() {
    it('should be true', function(){
      assert.equal(1,1);
    })
  })
})
