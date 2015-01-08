var http = require('http');

module.exports = function() {
  var requestListener = function(req, res) {
    requestListener.current_pos = 0;
    requestListener.req = req;
    requestListener.res = res;
    requestListener.next();
  }
  requestListener.listen = function() {
    var server = http.createServer(requestListener);
    server.listen.apply(server, arguments);
    return server;
  };
  requestListener.stack = []
  requestListener.current_pos = 0;
  requestListener.use = function(middleware) {
    requestListener.stack.push(middleware);
    return requestListener;
  }
  requestListener.next = function(err) {
    if (requestListener.current_pos >= requestListener.stack.length) {
      if (err) {
        requestListener.res.statusCode = 500;
        requestListener.res.end('500 Internal Error');
      }
      else {
        requestListener.res.statusCode = 404;
        requestListener.res.end('404 not found');
      }
      return;
    }
    var pos = requestListener.current_pos;
    if (err) {
      while (pos < requestListener.stack.length) {
        if (requestListener.stack[pos].length < 4)
          ++pos;
        else
          break;
      }
    } else {
      while (pos < requestListener.stack.length) {
        if (requestListener.stack[pos].length >= 4) {
          ++pos;
        } else
          break;
      }
    }
    requestListener.current_pos = pos + 1;
    try {
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
