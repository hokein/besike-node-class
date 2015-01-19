
module.exports = createInjector;

function createInjector(fn, app) {
  var injector = function(req, res, next) {
    injector.dependencies_loader(req, res, next)();
  }
  injector.dependencies_loader = function(req, res, next) {
    function loader(callback) {
      if (callback)
        loader.callback = callback;
      loader.currentPos = 0;
      loader.values = [];
      loader.next();
    }
    loader.next = function(err, value) {
      if (value)
        loader.values.push(value);
      params = injector.extract_params()
      if (loader.currentPos < params.length) { // next middleware handler.
        try {
          if (!(params[loader.currentPos] in app._factories)) {
            throw Error('Factory not defined: ' + params[loader.currentPos]);
          }
          loader.values.push(app._factories[params[loader.currentPos++]](
              req, res, loader.next, next));
        } catch(e) {
          if (loader.callback) { // for loader's custom callback.
            loader.callback(e)
            return;
          }
          next(e);
        }
      } else { // all dependencies middlewares are done, call fn handler.
        if (loader.callback) { // for loader's custom callback.
          loader.callback(err, loader.values);
          return;
        }
        if (err)
          next(e);
        else
          fn.apply(null, loader.values);
      }
    }
    return loader;
  }
  injector.extract_params = function() {
    var fnText = fn.toString();
    var FN_ARGS        = /^function\s*[^\(]*\(\s*([^\)]*)\)/m,
        FN_ARG_SPLIT   = /,/,
        FN_ARG         = /^\s*(_?)(\S+?)\1\s*$/,
        STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    var inject = [];
    var argDecl = fnText.replace(STRIP_COMMENTS, '').match(FN_ARGS);
    argDecl[1].split(FN_ARG_SPLIT).forEach(function(arg) {
      arg.replace(FN_ARG, function(all, underscore, name) {
        inject.push(name);
        var predefined_funcs = {
          'req': function(req, res, injector_next) {
            injector_next(null, req);
          },
          'res': function(req, res, injector_next) {
            injector_next(null, res);
          },
          'next': function(req, res, injector_next, next) {
            injector_next(null, next);
          },
        }
        if (name in predefined_funcs)
          app._factories[name] = predefined_funcs[name];
      });
    });
    return inject;
  }
  return injector;
};
