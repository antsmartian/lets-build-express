In this chapter, we will build our `next` function, which is at heart of express.

We wont be fully implementing the contract as per express, but we will have a minimal `next` working by the
end of the chapter.

In express, you can do this:


```
app.get('/route1', (req, res,next) => {
    console.log("came here")
    next();
})


app.get('/route1', (req, res) => {
    res.writeHead(200)
    res.write(`hello world`);
    res.end();
})
```

and when you hit `/route1`, we get the log `came here` and then `hello world`. In simple words, `next` will call
your next middleware or matching route. Now from the last 2 chapters, we know the route is handling its own stack
to hold our route paths, so implementing `next` is super easy.


Lets make the necessary modifications to our `Router`'s `handle` :

```
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
    }
}
```

We have just simply created a function called `next` and called that function. Take a close look at the implementation.
`next` is also passed as argument to `handle_request`. In fact our `Layer`'s `handle_request` expects `next`:

```
Layer.prototype.handle_request = function handle(req,res,next) {
    var fn = this.handle;

    try {
        fn(req, res, next);
    } catch (err) {
        console.error(err)
    }
}
```

The implementation of `next` is all about Javascript goodness. We just pass `next` to our route callback. `next`
captures the variable like `idx`, `stack` etc via closure, so when you call `next` from your callback, its gonna
resume the processing of stack from where it stopped (oh, sounds more like a generator ? I will leave that to you 0_`)

Now with these changes in place, we can actually make use of `next`:


```
let express = require('./src/express')
const app = express()

app.get('/', (req, res,next) => {
    console.log(next)
    next()
});


app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Response from second matching route');
    res.end();
});

app.post('/post',(req,res) => {
    res.writeHead(200)
    res.write('Data from post :)');
    res.end();
})


app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

Run the code. Hit `/`, we will see our `console.log` gets printed first, followed by the next matching route, which
sends the response `Response from second matching route`.

Well definitely, we need to improve upon our `next` to handle error's etc, but we got the idea of how *actually* `next`
works. That's great.

In the next chapter, we will extend `res` prototype to add functions like `send` to make our life easier.