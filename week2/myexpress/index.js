var http = require('http');

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
        var middleware = requestListener.stack[currentPos];
        ++currentPos;
        try {
          // If an error occurred, skip all subapps also.
          if (err && isErrorHandler(middleware))
            middleware(err, req, res, next);
          // call next middleware or subapp
          else if (!err && !isErrorHandler(middleware))
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
  requestListener.use = function(middleware) {
    requestListener.stack.push(middleware);
    return requestListener;
  }
  return requestListener;
};
