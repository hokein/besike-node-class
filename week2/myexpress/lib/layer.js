module.exports = Layer;

function Layer(path, middleware) {
  this.path = path;
  this.handle = middleware;
}

Layer.prototype.match = function(matchPath) {
  var reg = new RegExp('^' + this.path);
  if (matchPath.search(reg) != -1)
    return this;
  return undefined;
}
