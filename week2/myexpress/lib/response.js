var http = require('http');

var proto = { isExpress: true };
proto.__proto__ = http.ServerResponse.prototype;

module.exports = proto;
