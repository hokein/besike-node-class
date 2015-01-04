Class = function(func, parent) {
  var child = func['initialize'] || function() {};
  child.__super__ = parent || Object;
  if (parent) {
    child.prototype = new parent();
    child.prototype.prototype = parent.prototype;
    child.prototype.constructor = child;
    child.prototype._super = child.prototype;
  }

  for (var name in func) {
    if (typeof func[name] == 'function' &&
        typeof child.prototype[name] == 'function' &&
        /\b_super\b/.test(func[name])) { // check exsiting parent class method.
      child.prototype[name] = function(name, fn) {
        var parent_method = child.prototype[name];
        return function() {
          var tmp = this._super;
          this._super = parent_method;
          var ret = fn.apply(this, arguments);
          this._super = tmp;
          return ret;
        }
      }(name, func[name]);
    } else {
      child.prototype[name] = func[name];
    }
  }

  child.prototype.super = function() {
    var current_class;

    return function() {
      // Set value when first time invoked.
      if (!current_class)
        current_class = child;
      var bak = current_class;
      current_class = current_class.prototype;
      value = current_class.prototype[arguments[0]].apply(
          this, [].slice.call(arguments,1));
      current_class = bak;
      return value;
    };
  }();

  return child;
}

module.exports = Class
