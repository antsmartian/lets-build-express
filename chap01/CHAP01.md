In this chapter, we are going to create few abstraction those are required for building a express library.

By the end of the chapter, we will have a very minimal library, which will match only one route.

#### Express.js
First let us create our simple `express.js` file, which will have `export`. The file looks like the following:

```JavaScript
exports = module.exports = createApplication;

function createApplication() {
    var app = function(req,res,next) {
    };

    return app;
}
```


Nothing fancy over here, we are just exporting the function called `createApplication`. The function creates a function
reference called `app` and returns it. This returned `app` is what end user will get when they call `express()`.  Note that the function expects `req, res` and even `next` (The `req` is actually the incoming request, `res` is the http response object, `next` is our express specific function) - who will be sending these arguments is interesting, which we will see later. So its clear that the end user when they call `express()`, our `app` is returned, so we need to add necessary methods to the `app` object i.e `get`, `post` etc. 


#### Application.js
> Application object is where our main functions like `get, use` going to reside.

We are going to create our `app.js`, which is going to expose methods like `get`, `post` etc. Create a file called `app.js`.

Let's have our init code for `app.js` like the following:

```JavaScript
var app = exports = module.exports = {};

app.init = function() {
    this.cache = {};
    this.engines = {};
    this.settings = {}
};
```

As you might have guessed it right now, the express module gives us HTTP methods like `get`, `post` etc. Lets go and
implement the same.

The approach that is taken in express source code is very simple. They are using a library called `methods`:

```JavaScript
var methods = require('methods');
```

once we require that library, we can go ahead and implement all our HTTP methods like the following:

```JavaScript
methods.forEach(function (method){
    app[method] = function(path) {
        this.lazyrouter()

        var route = this._router.route(path);

        route[method].apply(route, Array.prototype.slice.call(arguments, 1));
        return this;
    }
});
```

##### Note
The `methods` library just returns all the http methods in lowercase. Actually you can see the list of methods being returned
from [here](https://github.com/jshttp/methods/blob/master/index.js). 

Here we are iterating over the available methods, and creating the functions on `app`. Inside the function, there are
quite a few interesting things happening. The function calls `this.lazyrouter()` -- which means for the given application
we are going to create an `Router`. The code for  `lazyrouter` looks like the following:

```JavaScript
app.lazyrouter = function lazyrouter() {
    if(!this._router) {
        this._router = new Router({
            caseSensitive: this.enabled('case sensitive routing'),
            strict: this.enabled('strict routing')
        })
    }
};
```

As the name suggest, we are first checking if `this._router` is present, if not creating a new `Router`.


##### Note: We are passing params like `caseSensitive` , `strict` -- which we will see in the upcoming chapters. The
`enabled` implementation is straight forward, so skipping the implementation details here.

We will come back to this piece of code later in this chapter:

```JavaScript
var route = this._router.route(path);

route[method].apply(route, slice.call(arguments, 1));
return this;
```

Now, its time for us to create a Router function.

#### Router.js
> Going to handle the routing logic. Only one per application

The `router.js` has the following code:

```JavaScript
var proto = module.exports = function(options) {
    var opts = options || {}

    function router(req,res,next) {
        router.handle(req,res,next)
    }

    setPrototypeOf(router, proto)

    /* express specific, we will go through them in later chapters */
    router.params = {};
    router._params = [];
    router.caseSensitive = opts.caseSensitive;
    router.mergeParams = opts.mergeParams;
    router.strict = opts.strict;
    router.stack = []; //really important property

    return router;
};
```

Again straight forward code. We are extending the prototype of our `router` to `proto` (we are
using a library here called `setPrototypeOf`). The important properties of an router is its `stack`.
This is where our route configs goes into.

Now we have our router - which internally has `stack` to keep our routes inclined. We need to expose a function, so that user can
add specific routes into the `stack`. This function is called as `route`:

```JavaScript
proto.route = function route(path) {
    var route = new Route(path)

    var layer = new Layer(path,{
        sensitive: this.caseSensitive,
        strict: this.strict,
        end: true
    },route.dispatch.bind(route))

    layer.route = route;

    this.stack.push(layer);

    return route;
};
```

For a given `path` (a route actually) we are creating a `Route` and a `Layer` (more on that in the next section).
The `layer` contains the `route`. `Layer` also takes few properties, which we will see later in the chapter.

After creating the route and layer, we are pushing the data into the routers `stack` on this line:

```JavaScript
this.stack.push(layer);
```

and then we are returning the route.

###### Note:
The code `route.dispatch.bind(route)` is actually an empty function for now -- we will discuss in later chapters.

##### Route.js
> Going to hold information about the route and the layer, which has the handles for a given path.

The main function of `Route` is going to look like the following:

```JavaScript
function Route(path) {
    this.path = path;
    this.stack = [];

    this.methods = {}
}
```

Unsurprisingly, the Route also implements all the HTTP methods very similar to application like the following:

```JavaScript
methods.forEach(function(method){
    Route.prototype[method] = function(){
        var handles = flatten(Array.prototype.slice.call(arguments));

        for (var i = 0; i < handles.length; i++) {
            var handle = handles[i];

            if (typeof handle !== 'function') {
                var type = toString.call(handle);
                var msg = 'Route.' + method + '() requires a callback function but got a ' + type
                throw new Error(msg);
            }

            var layer = Layer('/', {}, handle);
            layer.method = method;

            this.methods[method] = true;
            this.stack.push(layer);
        }

        return this;
    };
});
```

Note here, the route also has its own `stack` with its own instance of `Layer`.

#### Layer.js
> Contains the path and necessary function reference to execute when a path matches the given request.

We haven't created this file yet, the whole file looks like the following:

```JavaScript
module.exports = Layer

function Layer(path, options, fn) {
    if (!(this instanceof Layer)) {
        return new Layer(path, options, fn);
    }

    this.handle = fn;
    this.name = fn.name || '<anonymous>';
    this.params = undefined;
    this.path = undefined;
}
```

It just holds the `handle` and the function names.

#### Back to application.js

Now lets understand the remaining piece in application `methods` implementation:

```JavaScript
methods.forEach(function (method){
    app[method] = function(path) {
        this.lazyrouter()

        var route = this._router.route(path);

        route[method].apply(route, slice.call(arguments, 1));
        return this;
    }
});
```

Once we create the lazy router, we are are setting up the `router's` details via `route` call. Remember, the application has only
one router (See the implementation of  `lazyrouter`). Since our `Route` also implements all the HTTP methods, we are
calling the `route` method, by passing in the incoming argument:

```JavaScript
route[method].apply(route, slice.call(arguments, 1));
```

This will actually create a `Layer` in `Route` whose `handle` will be the passed in argument (which is actually the
handle we need to get executed when a path is matched).

Also we are going to expose a `listen` function on application:

```JavaScript
app.listen = function listen() {
    var server = http.createServer(this);
    return server.listen.apply(server, arguments);
};
```

The listen function creates the HTTP server via node module `http`. It then starts the server, with passed in argument.

With `listen` function in place, we can change our `express.js`'s `createApplication` to be:

```JavaScript
var proto = require("./app")

. . .

function createApplication() {
    let app = function(req,res,next) {
        app.handle(req,res,next)
    };

    mixin(app,proto,false);

    app.init();
    return app;
}
```

##### Note: When we import the `./app`, our `methods` code-block will get executed. Which means, by the time we call
the line `mixin(app,proto,false)` app has all the HTTP methods :)

Here are we copying all the `app.js` methods to our little `app` function via `mixin` module. Now its evident that we
need to create a function called `handle` in our `app.js` file:

```JavaScript
app.handle = function handle(req, res, callback) {
    var router = this._router;

    router.handle(req, res);
};
```

We will implement `Router` `handle` for now, lets just print its stack:

```JavaScript
proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;

    console.log(stack)
}
```

#### Playing Around
With all these codes in place, we are good to use our little express library:

```JavaScript
let express = require('./src/express')
const app = express()

app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Hello World');
    res.end();
});


app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

If we run this code the following things will happen:

1. `createApplication` is called. This function will set up our application function objects ready.
2. `app` contains the reference to the fn returned by `createApplication`.
3. `app.get` calls the function:

        app[method] = function(path) {
                this.lazyrouter()

                var route = this._router.route(path);

                route[method].apply(route, slice.call(arguments, 1));
                return this;
            }


   Now, this sets our Router. Also sets `Route` and corresponding layer object (along with callback in `handle`).

4. When `app.listen` is called, interesting things happens. Lets peak into our `app.listen` code:

        ```
            var server = http.createServer(this);
            return server.listen.apply(server, arguments);
        ```


    we are passing `this` to `createServer`. `createServer` actually expects the callback function, which
    would be getting `req` & `res` objects. Here `this` refers to the `app`, which is returned by `createApplication`.
    Which is nothing but:


        let app = function(req,res,next) {
            app.handle(req,res,next)
        };


    from the `express.js` file. So this `app` function would be called as a callback by the `createServer`, when it
    gets the request

5. `app.handle` calls our `handle` function of Router.
6. Now when we fire a request to `/`, we can see it prints:

    ```
        [{"name":"bound dispatch","route":{"path":"/","stack":[{"name":"<anonymous>","method":"get"}],"methods":{"get":true}}}]
    ```

    the stack actually says what needs to be done. We have defined a `get` on `/`!


    Remember, the `handle` has the original `req` and also the `res` object.


Lets do a hack way to send some response from the router:

```JavaScript
proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;
    var layer = stack[0];
    var route = layer.route;
    route.stack[0].handle_request(req, res);
}
```

what I have done here is get the stacks first element (we have only one in this example) and get its corresponding route,
for that route get its stack (Route stack contains `Layer`) and call `handle_request`.

The `Layer` `handle_request` has the following code:

```JavaScript
Layer.prototype.handle_request = function handle(req,res,next) {
    var fn = this.handle;

    try {
        fn(req, res, next);
    } catch (err) {
        console.error(err)
    }
}
```

Awesome! Now try restarting your code. Go and hit `/`, what happens? Our callback will be called with the current
request and response:

```JavaScript
(req, res) => {
    res.writeHead(200)
    res.write('Hello world');
    res.end();
}
```

we are using `write`, `end` to send a `Hello World`!

##### Note:
If you are curious here, you might be thinking why can't I use `res.send`? Well, express.js has extended the
request object (from http module, actually its `IncomingMessage` protocol). Since we haven't gone that far, we are
using the old-school way of sending back the data to the client. So remember to call `res.end()`

Well-done, we have created very important abstractions, that are in express source code. In fact we made a simple
way to response to our request.

Go ahead and checkout chap01 code and run `index.js` to see our little express in action.

In the next chapter, we are going to improve upon our `handle` to match the `routes` with the given URL.
