var http = require('http');
var mime = require('mime');
var accepts = require('accepts');
var crc32 = require('buffer-crc32');

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
  }
};

proto.__proto__ = http.ServerResponse.prototype;

module.exports = proto;
