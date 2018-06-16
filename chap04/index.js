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
