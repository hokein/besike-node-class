Class = function(func) {
  var class_constructor = function() {};
  if ('initialize' in func)
    class_constructor = func['initialize'];
  for (var name in func) {
    if (name != 'initialize')
     class_constructor.prototype[name] = func[name];
  }
  return class_constructor;
}

module.exports = Class
