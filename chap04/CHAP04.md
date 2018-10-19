In this chapter, we are going to lay the foundation on implementing `response.send` method.

There are few considerations & observations one has to make:

1. Remember that - `req`,`res` objects are created for *every* request.
2. So, we need to attach `send` method to the `res` object on *every* request.
3. Well, how can we do that?

Actually the problem is little bit interesting, but the solution express team had offered is very simple.

First, lets implement a `use` method in `Router` (router.js) :

```JavaScript
proto.use = function use(fn) {
    var layer = new Layer('/', {}, fn);

    layer.route = undefined;
    this.stack.push(layer);

    return this;
}
```

It's very simple stuff, we are creating a new `layer` whose `path` is `/` and setting the `handle` as `fn`.
We are also making the `layer.route` as `undefined` as this is not required for our use case. Then finally, we are
putting back the `layer` into the `stack`.

We knew from the previous chapters, that `app.lazyrouter` is called before routing begins. This is the right place
to call `Router`'s `use` :

```JavaScript
app.lazyrouter = function lazyrouter() {
    // other code
    this._router.use(. . .)
};
```

But what function do we need to pass? Remember the considerations that we had? We need to set the `send` method on
every response object.

Lets go ahead and create a folder & file like `<base>/middleware/init.js`, whose contents would be:

```JavaScript
exports.init = function(app) {
    return function expressInit(req,res, next) {
        next();
    }
};
```

the returned function `expressInit` just calls the `next` middleware. Now change our `lazyrouter` to be like this:

```JavaScript
var middleware = require('./middleware/init');

app.lazyrouter = function lazyrouter() {
    // other code
    this._router.use(middleware.init(this))
};
```

Now when our router is created lazily, we are setting up the `layer` whose `handle` is `expressInit` on the Router's stack.
Now we need to make sure, we run this `expressInit` function everytime when a req/res is served. Also note that we
are passing `this` (`app` instance) to the `middleware.init`). We knew from last chapters, we have `Layer` `match` function,
which checks if a given path matches the `route`. Its time to tweak the implementation of `match` a little bit:

```JavaScript
Layer.prototype.match = function match(path) {
    if(this.route && this.route.path === path)
        return true;
    else if(this.name === "expressInit") {
        return true;
    }

    return false;
};
```

This is bit hacky, but its good way to start. I have added a specific check if `Layer`'s `name` matches `expressInit`,
then do execute that function. Now everything is inclined. But still, we need to do few changes in our `next` function.

This is how our `next` code currently looks like:

```JavaScript
// . . .
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
// . . .
```

Remember that when a `layer` doesn't have a `route` we just `continue` and our `expressInit` layer doesn't has a route.
But still our `match` will evaluate to `true` as we have made the necessary changes on `Layer`'s `match` fn.

The simple way to handle this is to do the following:

```JavaScript
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

        //if match but no route - well call `handle_request`
        if(match) {
            layer.handle_request(req, res, next);
        }
}
```

Here we are checking if `match` is true, but still no `route` -- then we are calling `layer.handle_request`. Perfect.

Go ahead and run the following code from index.js:

```JavaScript
app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Response from second matching route');
    res.end();
});
```

Set a debugger at `expressInit` function -- well yes, our `expressInit` function now gets executed.

Now `expressInit` will be executed for every request our application is getting. Now its time to add a dummy `send`
method on `res` object to check if everything is working fine.

In the `express.js` file do the following:

```JavaScript
var http = require('http');

. . .

mixin(app,proto,false);

//create req and response from node https module
var req = Object.create(http.IncomingMessage.prototype);
var res = Object.create(http.ServerResponse.prototype)

//attach a send dummy fn for now
res.send = function (body) {
    console.log("wow,", body)
}

//attach res to app.response, whose value is app itself
app.response = Object.create(res,{
    app : {
        configurable: true, enumerable: true, writable: true, value: app
    }
});

. . .

return app;
```

Here we are creating a `req` and `res` from `IncomingMessage` and `ServerResponse` respectively (coming from `http` core module).
Also we create a dummy `send` function for now on the `res`. After which, we attach a object called
`response` whose prototype is `res` and its value is `app` itself.

The entire `createApplication` function should look like this:

```JavaScript
function createApplication() {
    let app = function(req,res,next) {
        app.handle(req,res,next)
    };

    mixin(app,proto,false);

    var req = Object.create(http.IncomingMessage.prototype);
    var res = Object.create(http.ServerResponse.prototype)

    res.send = function (body) {
        console.log("wow,", body)
    }

    app.response = Object.create(res,{
        app : {
            configurable: true, enumerable: true, writable: true, value: app
        }
    });

    app.init();
    return app;
}
```

Now we have `req` & `res` object. We have `expressInit` which gets called everytime a request is fired. Most importantly
`expressInit` init has access to the *current* `req` and `res` (remember, our `next` when calls the match route, it
passes the `req`,`res` and `next`):

```JavaScript
exports.init = function(app) {
    return function expressInit(req,res, next) {
        next();
    }
};
```

Now we can make use of the library called `setPrototypeOf` which actually sets the prototype chain of a given object.
Using this, we can set the current `res` prototype to be the `app.response` (`app` is received in args):

```JavaScript
var setPrototypeOf = require('setprototypeof')

exports.init = function(app) {
    return function expressInit(req,res, next) {
        setPrototypeOf(res, app.response);
        next();
    }
};
```

Boom! Now we had connected all the dots. What are you waiting for? Go ahead and do the following:


```JavaScript

app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Response from second matching route');
    res.send("hello world")
    res.end();
});
```


Run the application, go and hit `/` -- you see `wow hello world` in console.

The source code of the entire chapter is in the same folder, go ahead and play around.

##### Note
If you knew express already `Router` has a `use` function. Actually we had created `use` function on `Router`
but for solving different problem. Don't worry, we will use the same function to achieve what express's Router's
`use` actually does.

In the [next](https://github.com/antoaravinth/lets-build-express/blob/master/chap05/CHAP05.md) chapter, we will actually implement our `send` function.
