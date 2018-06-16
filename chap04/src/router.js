var setPrototypeOf = require('setprototypeof');
var Route = require('./route');
var Layer = require('./Layer');
var parseUrl = require('parseurl');

var proto = module.exports = function(options) {
    var opts = options || {}

    function router(req,res,next) {
        router.handle(req,res,next)
    }

    setPrototypeOf(router, proto)

    router.params = {};
    router._params = [];
    router.caseSensitive = opts.caseSensitive;
    router.mergeParams = opts.mergeParams;
    router.strict = opts.strict;
    router.stack = [];

    return router;
};

proto.route = function route(path) {
    var route = new Route(path)

    var layer = new Layer(path,{},route.dispatch.bind(route))

    layer.route = route;

    this.stack.push(layer);

    return route;
};

proto.use = function use(fn) {
    var layer = new Layer('/', {}, fn);

    layer.route = undefined;
    this.stack.push(layer);

    return this;
}

proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;
    var idx = 0

    next();

    function next() {
        var path = getPathname(req);

        // find next matching layer
        var layer;
        var match;
        var route;
        while (match !== true && idx < stack.length) {
            layer = stack[idx++];
            match = matchLayer(layer,path)
            route = layer.route;

            if (match !== true) {
                continue;
            }

            if (!route) {
                // process non-route handlers normally
                continue;
            }

            route.stack[0].handle_request(req, res, next);
        }

        if(match) {
            layer.handle_request(req, res, next);
        }
    }
}

function getPathname(req) {
    try {
        return parseUrl(req).pathname;
    } catch (err) {
        return undefined;
    }
}

function matchLayer(layer, path) {
    try {
        return layer.match(path);
    } catch (err) {
        return err;
    }
}