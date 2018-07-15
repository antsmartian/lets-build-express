var setPrototypeOf = require('setprototypeof')

exports.init = function(app) {
    return function expressInit(req,res, next) {
        setPrototypeOf(res, app.response);
        next();
    }
};