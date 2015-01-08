var http = require('http');

module.exports = function() {
  var requestListener = function(req, res) {
    requestListener.currentPos = 0;
    requestListener.req = req;
    requestListener.res = res;
    requestListener.next();
  }

  requestListener.callAsMiddleware = function(err, req, res, parent) {
    requestListener.currentPos = 0;
    requestListener.req = req;
    requestListener.res = res;
    requestListener.parent = parent;
    requestListener.next(err);
  }

  requestListener.listen = function() {
    var server = http.createServer(requestListener);
    server.listen.apply(server, arguments);
    return server;
  };

  requestListener.stack = []
  requestListener.currentPos = 0;
  requestListener.use = function(middleware) {
    requestListener.stack.push(middleware);
    return requestListener;
  }

  requestListener._findNextMiddleware = function(err) {
    function isErrorHandler(func) {
      return func.length >= 4;
    }
    var nextPos = requestListener.currentPos;
    while (nextPos < requestListener.stack.length) {
      if (requestListener.stack[nextPos].callAsMiddleware)
        return nextPos;
      if (err && isErrorHandler(requestListener.stack[nextPos]))
        return nextPos;
      if (!err && !isErrorHandler(requestListener.stack[nextPos]))
        return nextPos;
      ++nextPos;
    }
    return nextPos;
  }

  requestListener.next = function(err) {
    if (requestListener.currentPos >= requestListener.stack.length) {
      // check whether the current app has parent in the middle chain.
      if (requestListener.parent) {
        requestListener.parent.next(err);
        return;
      }

      if (err) {
        requestListener.res.statusCode = 500;
        requestListener.res.end('500 Internal Error');
      } else {
        requestListener.res.statusCode = 404;
        requestListener.res.end('404 not found');
      }
      return;
    }

    var pos = requestListener._findNextMiddleware(err);
    requestListener.currentPos = pos + 1;
    try {
      if (requestListener.stack[pos].callAsMiddleware) {
        requestListener.stack[pos].callAsMiddleware(err, requestListener.req,
            requestListener.res, requestListener);
        return;
      }
      if (err) {
        requestListener.stack[pos](err, requestListener.req, requestListener.res,
            requestListener.next);
      } else {
        requestListener.stack[pos](requestListener.req, requestListener.res,
            requestListener.next);
      }
    } catch (e) {
      requestListener.res.statusCode = 500;
      requestListener.res.end('500 Internal Error');
    }
  }
  return requestListener;
}
