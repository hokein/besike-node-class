var http = require('http');

var proto = { isExpress: true };
proto.__proto__ = http.IncomingMessage.prototype;

module.exports = proto;
