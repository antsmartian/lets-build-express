In this chapter, we are going to make the route matching logic bit more stable.

Currently our `handle` looks like the following:


```
proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;
    var layer = stack[0];
    var route = layer.route;
    route.stack[0].handle_request(req, res);
}
```

It served our purpose in chapter 1, but lets make it more stable. Lets make changes such a way that, it can
match the path automatically. Remember, the `path` data is already stored in `Route`'s `path` (In doubt, play
around by printing the `Router` stack when needed).

We will require this library `parseurl` to parse the url. Defining the util functions in `router.js` first:


```
var parseUrl = require('parseurl');

...

function getPathname(req) {
    try {
        return parseUrl(req).pathname;
    } catch (err) {
        return undefined;
    }
}
```

Now its time to change our `handle` function:


```
proto.handle = function handle(req, res, out) {
    var self = this;
    var stack = self.stack;
    var path = getPathname(req);

    // find next matching layer
    var layer;
    var match;
    var route;
    var idx = 0

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

        route.stack[0].handle_request(req, res);
    }
}

function matchLayer(layer, path) {
    try {
        return layer.match(path);
    } catch (err) {
        return err;
    }
}
```

Ok, lets understand whats going on here. I have defined a variable called `match` & `idx`. We are iterating until my
`stack` is empty (all our config is pushed into Router's stack). We will pick each `layer` out of the stack and call
`matchLayer`. We will implement `matchLayer` in a moment, but assume it returns boolean if a path is matched at a given
`layer` object. If so, we will pick its `route` and then call the `route`'s `handle_request` by passing `req` & `res`.

The implementation of `matchLayer` looks like this:

```
Layer.prototype.match = function match(path) {
    return this.route.path === path;
};
```

Simple check. It checks `path` matches the request path. That's all!

Now lets play around:

```
let express = require('./src/express')
const app = express()

app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Hello world from /');
    res.end();
});


app.get('/2', (req, res) => {
    res.writeHead(200)
    res.write('Hello world from /2');
    res.end();
});

app.post('/post',(req,res) => {
    res.writeHead(200)
    res.write('Data from post :)');
    res.end();
})

app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

Now try hitting `/`, we will get `Hello world from /`; for `/2` we will get the corresponding output.

I have also made a `post` handler here, so lets fire a post request:

```
curl --request POST http://localhost:3000/post

-- Data from post :)
```

That's cool progress. We have made our routing logic works. In the next chapter, we will actually build a small
`next` (the magic guy).