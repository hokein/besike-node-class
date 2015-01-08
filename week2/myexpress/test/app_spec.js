var express = require('../');
var request = require('supertest');
var http = require('http');
var expect = require("chai").expect

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
  describe("#listen", function() {
    var server;
    before(function() {
      var app = express();
      app.listen(7000);
    });

    it('should return 404', function(done) {
      request('http://localhost:7000').get('/foo').expect(404).end(done);
    });
  });
  describe(".use", function() {
    var app = express();
    var m1 = function() {};
    var m2 = function() {};
    app.use(m1);
    app.use(m2);

    it('should be able to add middlewares', function() {
      expect(app.stack.length).to.eql(2);
    });
  });
});

describe("calling middleware stack", function() {
  var app;
  beforeEach(function() {
    app = express();
  });

  it('should be able to call a single middleware', function(done) {
    var m1 = function(req,res,next) {
      res.end("hello from m1");
    };
    app.use(m1);
    request(app).get('/').expect('hello from m1').end(done);
  });

  it('should be able to call next to go to next middleware', function(done) {
    var m1 = function(req,res,next) {
      next();
    };
    var m2 = function(req,res,next) {
      res.end("hello from m2");
    };
    app.use(m1);
    app.use(m2);
    request(app).get('/').expect('hello from m2').end(done);
  });

  it('should return 404 at the end of middleware chain', function(done) {
    var m1 = function(req,res,next) {
      next();
    };
    var m2 = function(req,res,next) {
      next();
    };
    app.use(m1);
    app.use(m2);
    request(app).get('/').expect(404).end(done);
  });

  it('should return 404 when middleware chain is empty', function(done) {
    request(app).get('/').expect(404).end(done);
  });
});

describe("Error Handling", function() {
  var app;
  beforeEach(function() {
    app = new express();
  });

  it('should return 500 for unhandled error', function(done) {
    var m1 = function(req,res,next) {
      next(new Error("boom!"));
    };
    app.use(m1);
    request(app).get('/').expect(500).end(done);
  });

  it('should return 500 for uncaught error', function(done) {
    var m1 = function(req,res,next) {
     throw new Error("boom!");
    };
    app.use(m1);
    request(app).get('/').expect(500).end(done);
  });

  it('should skip error handlers when next is without an error', function(done) {
    var m1 = function(req,res,next) {
      next();
    };
    var e1 = function(err,req,res,next) { // timeout
    };
    var m2 = function(req,res,next) {
      res.end("m2");
    };
    app.use(m1);
    app.use(e1); // should skip this. will timeout if called.
    app.use(m2);
    request(app).get('/').expect('m2').end(done);
  });

  it('should skip normal handlers when next is with an error', function(done) {
    var m1 = function(req,res,next) {
      next(new Error("boom!"));
    };
    var m2 = function(req,res,next) {
      // timeout
    };
    var e1 = function(err,req,res,next) {
      res.end("e1");
    };
    app.use(m1);
    app.use(m2); // should skip this. will timeout if called.
    app.use(e1);

    request(app).get('/').expect('e1').end(done);
  });
});

describe('Implement app embedding as midddleware',function() {
  var app;
  var subApp;
  beforeEach(function() {
    app = new express();
    subApp = new express();
  });

  it('should pass unhandled request to parent', function(done) {
    function m1(req,res,next) {
      res.end('m1');
    };
    function m2(req,res,next) {
      res.end('m2');
    };
    app.use(subApp);
    app.use(m2);
    request(app).get('/').expect('m2').end(done);
  });

  it('should pass unhandled error to parent', function(done) {
    function m1(req,res,next) {
      next("m1 error");
    };
    function e1(err,req,res,next) {
      res.end(err);
    };

    subApp.use(m1);
    app.use(subApp);
    app.use(e1);
    request(app).get('/').expect('m1 error').end(done);
  });
});
