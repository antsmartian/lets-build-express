var mixin = require('merge-descriptors');
var EventEmitter = require('events').EventEmitter;
var proto = require("./app")
var http = require('http');

exports = module.exports = createApplication;

function createApplication() {
    let app = function(req,res,next) {
        app.handle(req,res,next)
    };

    mixin(app,proto,false);

    app.init();
    return app;
}

exports.application = proto;
