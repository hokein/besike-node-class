var pathToRegexp = require('path-to-regexp');

module.exports = Layer;

function Layer(path, middleware) {
  this.keys = [];
  if (path[path.length-1] == '/')
    this.re = pathToRegexp(path.slice(0,-1), this.keys, {end: false});
  else
    this.re = pathToRegexp(path, this.keys, {end: false});
  this.handle = middleware;
}

Layer.prototype.match = function(matchPath) {
  var m = this.re.exec(decodeURIComponent(matchPath));
  if (!m)
    return undefined;
  var result = {path: m[0], params:{}};
  for (var i = 0; i < this.keys.length; ++i)
    result.params[(this.keys[i])['name']] = m[i+1];
  return result;
}
