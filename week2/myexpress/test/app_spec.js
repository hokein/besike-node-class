var express = require('../');
var request = require('supertest');
var http = require('http');

describe('app',function() {
  describe('create http server', function() {
    var server;
    before(function() {
      var app = express();
      server = http.createServer(app);
    });

    it('should return 404',function(done) {
      request(server).get('/').expect(404).end(done);
    });
  });
  describe("#listen",function() {
    var server;
    before(function() {
      var app = express();
      app.listen(7000);
    });

    it('should return 404',function(done) {
      request('http://localhost:7000').get('/foo').expect(404).end(done);
    });
  });
});
