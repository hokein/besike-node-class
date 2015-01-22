var http = require('http');
var Layer = require('./lib/layer');
var makeRoute = require('./lib/route');
var methods = require('methods');
var mime = require('mime');
var accepts = require('accepts');
var inject = require('./lib/injector');
var requestProto = require('./lib/request');
var responseProto = require('./lib/response');

function isErrorHandler(func) {
  return func.length >= 4;
}

module.exports = function() {
  var requestListener = function(req, res, parentNext) {
    req.app = requestListener;
    req.res = res;
    res.req = req;
    res.redirect = function() {
      if (arguments.length == 1) {
        res.writeHead(302, {'Location': arguments[0], 'Content-length': 0});
      } else {
        res.writeHead(arguments[0], {'Location': arguments[1],
            'Content-length': 0});
      }
      res.end('');
    }
    res.type = function(t) {
      res.setHeader('Content-Type', mime.lookup(t));
    }
    res.default_type = function(t) {
      if (!res.getHeader('Content-Type'))
        res.type(t);
    }
    res.format = function(dict) {
      var accept = accepts(req);
      var prefer_type = accept.types(Object.keys(dict));
      if (prefer_type in dict) {
        res.type(prefer_type);
        dict[prefer_type]();
      } else {
        var err = new Error("Not Acceptable");
        err.statusCode = 406;
        throw err;
      }
    }
    requestListener.monkey_patch(req, res);
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
          req.app = req.app_bak;
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
              req.app_bak = requestListener;
              req.app = middleware;
              middleware.handle(req, res, next);
            } else {
              //req.app = requestListener;
              middleware(req, res, next);
            }
          else // skip to next middleware
            next(err);
        } catch(e) {
          res.statusCode = e.statusCode || 500;
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
  requestListener._factories = {}
  requestListener.factory = function(name, func) {
    requestListener._factories[name] = func;
    return requestListener
  }
  requestListener.inject = function(func) {
    return inject(func, requestListener);
  }
  requestListener.monkey_patch = function(req, res) {
    req.__proto__ = requestProto;
    res.__proto__ = responseProto;
  }
  return requestListener;
};
