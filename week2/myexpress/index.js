var http = require('http');

module.exports = function() {
  var requestListener = function(req, res) {
    res.statusCode = 404;
    res.end('404 not found');
  }
  requestListener.listen = function() {
    var server = http.createServer(requestListener);
    server.listen.apply(server, arguments);
    return server;
  };
  return requestListener;
}
