var setPrototypeOf = require('setprototypeof')
var methods = require('methods');
var Router = require('./router');
var Layer = require('./Layer')
var slice = Array.prototype.slice;
var http = require('http');

var app = exports = module.exports = {};

app.init = function() {
    this.cache = {};
    this.engines = {};
    this.settings = {}

    this._router = undefined;
};

app.set = function set(setting,val) {
    this.settings[setting] = val;

    switch (setting) {
        case 'etag':
            this.set('etag fn',"")
            break;
        case 'query parser':
            this.set('query parser fn',"")
            break
        case 'trust proxy':
            this.set('trust proxy fn',"");
            break;
    }

    return this;
};

app.enabled = function enabled(setting) {
    return Boolean(this.set(setting));
};

app.lazyrouter = function lazyrouter() {
    if(!this._router) {
        this._router = new Router({})
    }
};

app.listen = function listen() {
    var server = http.createServer(this);
    return server.listen.apply(server, arguments);
};

app.handle = function handle(req, res, callback) {
    var router = this._router;

    router.handle(req, res);
};

methods.forEach(function (method){
    app[method] = function(path) {
        this.lazyrouter()

        var route = this._router.route(path);

        route[method].apply(route, slice.call(arguments, 1));
        return this;
    }
});