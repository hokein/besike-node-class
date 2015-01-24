var http = require('http');
var mime = require('mime');
var accepts = require('accepts');
var crc32 = require('buffer-crc32');
var fs = require('fs');
var path = require('path');
var rparser = require('range-parser');

function isBuffer(str) {
  return str && typeof str === "object" && Buffer.isBuffer(str)
}

var proto = {
  isExpress: true,
  redirect: function() {
    if (arguments.length == 1) {
      this.writeHead(302, {'Location': arguments[0], 'Content-length': 0});
    } else {
      this.writeHead(arguments[0], {'Location': arguments[1],
          'Content-length': 0});
    }
    this.end('');
  },
  type: function(t) {
    this.setHeader('Content-Type', mime.lookup(t));
  },
  default_type: function(t) {
    if (!this.getHeader('Content-Type'))
      this.type(t);
  },
  format: function(dict) {
    var accept = accepts(this.req);
    var prefer_type = accept.types(Object.keys(dict));
    if (prefer_type in dict) {
      this.type(prefer_type);
      dict[prefer_type]();
    } else {
      var err = new Error("Not Acceptable");
      err.statusCode = 406;
      throw err;
    }
  },
  send: function() {
    this.default_type('text/html');
    var data = '';
    var statusCode = 200;
    if (arguments.length >= 2) {
      statusCode = parseInt(arguments[0]);
      data = arguments[1];
    } else {
      if (typeof(arguments[0]) == 'string') { // a given string.
        data = arguments[0];
      } else if (isBuffer(arguments[0])) { // a buffer
        this.setHeader('Content-Type', 'application/octet-stream');
        data = arguments[0];
      } else if (typeof(arguments[0]) == 'object') {  // a dict
        this.setHeader('Content-Type', 'application/json');
        data = JSON.stringify(arguments[0]);
      } else if (typeof(arguements[0]) == 'number') { // a status code.
        this.statusCode = arguments[0];
        data = http.STATUS_CODES[arguments[0]];
      }
    }
    this.statusCode = statusCode;
    this.setHeader('Content-length', Buffer.byteLength(data));
    if (this.req.method == 'GET' && !this.getHeader('ETag') && data) {
      var etag = crc32.unsigned(data);
      this.setHeader('ETag', etag);
    }
    if (this.req.headers['if-none-match'] == this.getHeader('ETag')
        || this.req.headers['if-modified-since'] >= this.getHeader('last-modified')) {
      this.statusCode = 304;
      this.end();
      return;
    }
    this.end(data);
  },
  stream: function(s) {
    var that = this;
    s.on('data', function(chunk) {
      if (!that.write(chunk)) {
        s.pause();
        that.once('drain', function() {
          s.resume();
        });
      }
    });
    s.on('end', function() {
      that.end();
    });
  },
  sendfile: function(data_path, options) {
    var that = this;
    that.setHeader('Accept-Ranges', 'bytes');
    if (options && options['root'])
      data_path = path.join(options['root'], data_path);
    if (data_path.indexOf('..') != -1) {
      console.log(123)
      that.statusCode = 403;
      that.end();
      return;
    }
    fs.stat(data_path, function(err, stats) {
      if (err) {
        that.statusCode = 404;
        that.end();
        return;
      }
      if (stats.isDirectory()) {
        that.statusCode = 403;
        that.end();
        return;
      }
      var size = stats.size;
      var options = {};
      if (that.req.headers.range) {
        var range = rparser(stats.size, that.req.headers.range);
        if (range == -1) { // unsatisfiable range
          that.statusCode = 416;
          that.end();
          return;
        }
        if (range != -2) { // valid range
          options = range[0];
          size = options.end - options.start+1;
          that.statusCode = 206;
          that.setHeader('Content-Range',
              'bytes ' + options.start + '-' + options.end + '/' + stats.size);
        }
      }
      that.setHeader('Content-length', size);
      that.setHeader('Content-type', 'text/plain');
      that.stream(fs.createReadStream(data_path, options));
    });
  }
};

proto.__proto__ = http.ServerResponse.prototype;

module.exports = proto;
