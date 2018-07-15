In this chapter, we will be implementing simple `res.send` method.

Actually, `res.send` in express does many things like the following:

1. setting headers
2. content types
3. Converting buffer to right datatype.
4. Setting up statuscode etc.

We wont be handling all the cases in our implementation, because they are just wrappers over core response methods.

The full source of the `res.send` is over here: https://github.com/expressjs/express/blob/master/lib/response.js#L107.Actually many
useful methods that we as developers use in `res` object is extended here.

We talked about extending the core response object to add useful methods in chapter 4 and we did have a dirty `send`
method like the following:

```javascript
res.send = function (body) {
    console.log("wow,", body)
}
```

Okay, lets go and make changes so that we can send `string` and `JSON` to our little `send` method.

This is what we need to do:

1. Set Headers using core `setHeader` method.
2. Set `Content-type` to `text/plain` for `strings` and `application/json` for `JSON`
3. Flush out the content to our response object.

Simple right? The implementation looks like the following:

```javascript
res.send = function (body) {
    if(typeof body === 'object') {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(body),'utf8');
    }
    else if(typeof body === 'string') {
        this.setHeader('Content-Type', 'text/plain');
        this.end(body,'utf8');
    }
    return this;
}
```

Now lets run our code from `index.js`:


```javascript
let express = require('./src/express')
const app = express()

app.get('/', (req, res,next) => {
    console.log(next)
    next()
});


app.get('/', (req, res) => {
    res.writeHead(200)
    res.write('Response from second matching route');
    res.send("hello world")
    res.end();
});

app.post('/post',(req,res) => {
    res.writeHead(200)
    res.write('Data from post :)');
    res.end();
})


app.listen(3000, () => console.log('Example app listening on port 3000!'))
```

We would get the following error on the console:

```javascript
Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
    at validateHeader (_http_outgoing.js:503:11)
    at ServerResponse.setHeader (_http_outgoing.js:510:3)
    at ServerResponse.res.send (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/express.js:23:18)
    at app.get (/Users/abelginrayen/programs/js/lets-build-express/chap05/index.js:13:9)
    at Layer.handle [as handle_request] (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/Layer.js:29:9)
    at next (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/router.js:74:28)
    at expressInit (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/middleware/init.js:6:9)
    at Layer.handle [as handle_request] (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/Layer.js:29:9)
    at next (/Users/abelginrayen/programs/js/lets-build-express/chap05/src/router.js:78:19)
    at app.get (/Users/abelginrayen/programs/js/lets-build-express/chap05/index.js:6:5)
```

Why? The reason is simple and by now should make sense, in our little `send` method, we actually do set headers via
`setHeaders` and also do call `end` function. However the above code do have `writeHead` in it. Let's remove them:

```javascript
app.get('/', (req, res) => {
    res.send("hello world")
});
```

###### Note: This is the same reason, we shouldn't call `res.send` twice. Because internally we call `end` and close
the `response` object.

Now we should be getting response as `hello world`. Now lets try with an json like:

```javascript
app.get('/', (req, res) => {
    res.send({hello: 'world'})
});
```

now the response would be: `{"hello":"world"}`. Great.

In fact, we can have a function `json` on response object too:


```javascript
res.send = function (body) {
    if(typeof body === 'object') {
        this.json(body)
    }
    else if(typeof body === 'string') {
        this.setHeader('Content-Type', 'text/plain');
        this.end(body,'utf8');
    }
    return this;
}


res.json = function (body) {
    this.setHeader('Content-Type', 'application/json');
    return this.send(JSON.stringify(body))
}
```

Now we can do:

```javascript
app.get('/', (req, res) => {
    res.json({hello: 'world'})
});
```

to get the same results.

We have now useful functions on response objects. But still we haven't implemented error handling our little express.

We will discuss about error handling on next chapter.