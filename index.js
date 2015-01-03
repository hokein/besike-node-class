Class = function(func, par) {
  var class_constructor = function() {};
  if ('initialize' in func)
    class_constructor = func['initialize'];
  if (par) {
    class_constructor.prototype = new par();
    class_constructor.prototype.constructor = class_constructor;
  }
  for (var name in func) {
    if (name != 'initialize')
     class_constructor.prototype[name] = func[name];
  }
  return class_constructor;
}

module.exports = Class
