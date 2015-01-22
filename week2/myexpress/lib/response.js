var http = require('http');
var mime = require('mime');
var accepts = require('accepts');

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
  }
};

proto.__proto__ = http.ServerResponse.prototype;

module.exports = proto;
