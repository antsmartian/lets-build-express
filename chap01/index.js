let express = require('./src/express')
const app = express()


app.get('/route1', (req, res,next) => {
    res.writeHead(200)
    res.write('route 1');
    res.end();
});

app.post('/post', (req, res) => {
    res.writeHead(200)
    res.write('from /post');
    res.end();
});


app.listen(3000, () => console.log('Example app listening on port 3000!'))
