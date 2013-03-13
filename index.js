var Houkou = require("houkou");

var DamnedApp = function DamnedApp() {
  this.middleware = [];

  this.defaultHandler = function defaultHandler(req, res) {
    res.statusCode = 404;
    res.end(["No handler available to", req.method, req.url].join(" "));
  };

  this.routes = [];
  this.routes.mounted = false;
};

DamnedApp.addJson = function addJson() {
  return function addJson(req, res, next) {
    res.json = function json(data) {
      res.end(JSON.stringify(data));

      return res;
    };

    next();
  };
};

DamnedApp.addStatus = function addStatus(req, res, next) {
  return function addStatus(req, res, next) {
    res.status = function status(code) {
      res.statusCode = code;

      return res;
    };

    next();
  };
};

DamnedApp.prototype.use = function use(prefix, fn) {
  if (typeof prefix === "function") {
    fn = prefix;
    prefix = null;
  }

  this.middleware.push({
    prefix: prefix,
    fn: fn,
  });

  return this;
};

DamnedApp.prototype.addRoute = function addRoute(method, path, options, fn) {
  if (typeof options === "function") {
    fn = options;
    options = null;
  }

  this.routes.push({
    method: method.toUpperCase(),
    houkou: new Houkou(path, options),
    fn: fn,
  });

  if (!this.routes.mounted) {
    this.use(function(req, res, next) {
      req.routeParameter = function routeParameter(name) {
        return this.routeParameters ? this.routeParameters[name] : null;
      };

      var routes = this.routes.filter(function(route) {
        return (route.method === "ALL" || route.method === req.method) && !!route.houkou.match(req.url);
      });

      var nextRoute = function nextRoute(err) {
        req.routeParameters = null;

        if (err) {
          return next(err);
        }

        if (!routes.length) {
          return next();
        }

        var route = routes.shift();

        req.routeParameters = route.houkou.match(req.url);

        route.fn.call(null, req, res, nextRoute);
      };
      nextRoute();
    }.bind(this));

    this.routes.mounted = true;
  }

  return this;
};

DamnedApp.prototype.onRequest = function onRequest(req, res, next) {
  var stack = this.middleware.filter(function(middleware) {
    return !middleware.prefix || req.url.indexOf(middleware.prefix) === 0;
  });

  if (next) {
    stack.push(next);
  } else {
    stack.push({fn: this.defaultHandler});
  }

  var nextMiddleware = function nextMiddleware(err) {
    var middleware = stack.shift();

    middleware.fn.call(null, req, res, nextMiddleware);
  };
  nextMiddleware();
};

["get", "post", "put", "delete"].forEach(function(verb) {
  DamnedApp.prototype[verb] = function(path, options, fn) {
    return this.addRoute(verb, path, options, fn);
  };
});

module.exports = function() {
  var app = new DamnedApp();

  var r = function onRequest(req, res, next) {
    return app.onRequest.call(app, req, res, next);
  };

  Object.keys(DamnedApp.prototype).forEach(function(key) {
    r[key] = app[key].bind(app);
  });

  return r;
};

Object.keys(DamnedApp).filter(function(e) { return typeof DamnedApp[e] === "function"; }).forEach(function(e) {
  module.exports[e] = DamnedApp[e];
});
