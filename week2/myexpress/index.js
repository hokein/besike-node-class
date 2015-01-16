var http = require('http');
var Layer = require('./lib/layer');
var makeRoute = require('./lib/route');
var methods = require("methods");

function isErrorHandler(func) {
  return func.length >= 4;
}

module.exports = function() {
  var requestListener = function(req, res, parentNext) {
    requestListener.handle(req, res, parentNext);
  }

  requestListener.stack = [];
  requestListener.listen = function() {
    var server = http.createServer(requestListener);
    server.listen.apply(server, arguments);
    return server;
  }
  requestListener.use = function() {
    if (arguments.length == 1)
      requestListener.stack.push(new Layer('/', arguments[0], {end: false}));
    else
      requestListener.stack.push(new Layer(arguments[0], arguments[1],
          {end: false}));
    return requestListener;
  }
  requestListener.route = function(path) {
    var layer = new Layer(path, makeRoute());
    requestListener.stack.push(new Layer(path, layer));
    return layer.handle;
  }
  requestListener.handle = function(req, res, parentNext) {
    var currentPos = 0;
    function next(err) {
      if (currentPos >= requestListener.stack.length) {
        if (parentNext) {
          req.url = req.url_bak;
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
            if (middleware.handle) {
              req.url_bak = req.url;
              req.url = req.url.slice(result.path.length);
              middleware.handle(req, res, next);
            } else {
              middleware(req, res, next);
            }
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
  methods.forEach(function(method) {
    requestListener[method] = function(path, handler) {
      requestListener.route(path)[method](handler);
      return requestListener;
    }
  });
  requestListener['all'] = function(path, handler) {
    requestListener.route(path)['all'](handler);
    return requestListener;
  }
  return requestListener;
};
