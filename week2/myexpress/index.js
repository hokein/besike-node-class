var http = require('http');
var Layer = require('./lib/layer');

function isErrorHandler(func) {
  return func.length >= 4;
}

module.exports = function() {
  var requestListener = function(req, res, parentNext) {
    var currentPos = 0;
    function next(err) {
      if (currentPos >= requestListener.stack.length) {
        if (parentNext) {
          parentNext(err);
        } else {
          res.statusCode = err? 500:404;
          res.end('');
        }
      } else {
        var layer = requestListener.stack[currentPos];
        var middleware = layer.handle;
        ++currentPos;
        try {
          var result = layer.match(req.url);
          if (!result) {
            next(err);
            return;
          }
          req.params = result.params;
          if (err && isErrorHandler(middleware))
            // If an error occurred, skip all subapps also.
            middleware(err, req, res, next);
          else if (!err && !isErrorHandler(middleware))
            // call next middleware or subapp
            middleware(req, res, next);
          else // skip to next middleware
            next(err);
        } catch(e) {
          res.statusCode = 500;
          res.end('');
        }
      }
    }
    next();
  }

  requestListener.stack = [];
  requestListener.listen = function() {
    var server = http.createServer(requestListener);
    server.listen.apply(server, arguments);
    return server;
  }
  requestListener.use = function() {
    if (arguments.length == 1)
      requestListener.stack.push(new Layer('/', arguments[0]));
    else
      requestListener.stack.push(new Layer(arguments[0], arguments[1]));
    return requestListener;
  }
  return requestListener;
};
