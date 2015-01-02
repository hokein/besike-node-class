Class = function(func) {
  if ('initialize' in func)
    return func['initialize'];
  return function() {}
}

module.exports = Class
