Class = function(func, par) {
  var class_constructor = function() {};
  class_constructor.__super__ = Object;
  if ('initialize' in func)
    class_constructor = func['initialize'];
  if (par) {
    class_constructor.__super__ = par;
    class_constructor.prototype = new par();
    class_constructor.prototype.prototype = par.prototype;
    class_constructor.prototype.constructor = class_constructor;
  }
  for (var name in func) {
    if (name != 'initialize')
     class_constructor.prototype[name] = func[name];
  }
  class_constructor.prototype.super = function() {
    return class_constructor.prototype.prototype[arguments[0]].apply(
        this, [].slice.call(arguments,1));
  }
  return class_constructor;
}

module.exports = Class
