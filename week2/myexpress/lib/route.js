var methods = require("methods");

module.exports = makeRoute;

function makeRoute() {
  var route = function (req, res, next) {
    function handler_next(msg) {
      if (msg) {
        msg == 'route'?next():next(msg);
        return;
      }
      for (var i = route.currentPos; i < route.stack.length; ++i) {
        if (req.method == route.stack[i].verb) {
          route.currentPos = i+1;
          route.stack[i].handler(req, res, handler_next);
          break;
        }
      }
      next();
    }
    route.currentPos = 0;
    handler_next();
  }
  route.stack = [];
  route.use = function(v, func) {
    if (v == 'all')
      return route['all'](func);
    route.stack.push({verb:v.toUpperCase(), handler:func});
    return route;
  }
  methods.forEach(function(method) {
    route[method] = function(func) {
      route.stack.push({verb:method.toUpperCase(), handler:func});
      return route;
    }
  });
  route['all'] = function(func)  {
    methods.forEach(function(method) {
      route.stack.push({verb:method.toUpperCase(), handler:func});
    });
    return route;
  };
  return route;
}
