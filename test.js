const http = require('http');

const port = 8091;


const server = http.createServer((request, response) => {
    // {
    //      host: <name>
    //      port: <port>
    // }

    const {headers, method, url} = request;
    let body = [];
    request.on('error', (err) => {
        console.error(err);
    }).on('data', (chunk) => {
        body.push(chunk);
    }).on('end', () => {
        body = Buffer.concat(body).toString();

        response.on('error', (err) => {
            console.error(err);
        });

        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json');

        const responseBody = { headers, method, url, body };

        response.write(JSON.stringify(responseBody));
        response.end();
    });

}).listen(port);

console.log('Listening on ' + port);