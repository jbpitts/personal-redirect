const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const port = 80;
const wsPort = 8080;
const WebSocket = require('ws');

let target;

let wsMessage;
let lastId = 0;

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'aplication/font-sfnt'
};

const domain = 'james.testquality.com';

fs.exists('/etc/letsencrypt/live/' + domain + '/privkey.pem', (exist) => {
    if (exist) {
        const privateKey = fs.readFileSync('/etc/letsencrypt/live/' + domain + '/privkey.pem', 'utf8');
        const certificate = fs.readFileSync('/etc/letsencrypt/live/' + domain + '/cert.pem', 'utf8');
        const ca = fs.readFileSync('/etc/letsencrypt/live/' + domain + '/chain.pem', 'utf8');

        const credentials = {
            key: privateKey,
            cert: certificate,
            ca: ca
        };
        const httpsServer = https.createServer(credentials, serverHandler).listen(443, () => {
            console.log('listening port 443');
        });

        const wssHttpsServer = https.createServer(credentials);

        const wss = new WebSocket.Server({ server: wssHttpsServer }, () => {
            console.log('ws started on port ' + wsPort);
        });

        wss.on('connection', function connection(ws) {
            wsMessage = ws;
            console.log('Client Connected');
        });

        wssHttpsServer.listen(wsPort, () => {
            console.log('wss listening on ' + wsPort);
        });
    } else {
        const wss = new WebSocket.Server({ port: wsPort }, () => {
            console.log('ws started on port ' + wsPort);
        });

        wss.on('connection', function connection(ws) {
            wsMessage = ws;
            console.log('Client Connected');
        });
    }
});



const serverHandler = (request, response) => {
    if (request.url && request.url.startsWith('/.well-known')) {
        console.log('Url: ' + request.url);

        // parse URL
        const parsedUrl = url.parse(request.url);
        // extract URL path
        // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
        // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
        // by limiting the path to current directory only
        const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
        let pathname = path.join(__dirname, '/public', sanitizePath);
        fs.exists(pathname, (exist) => {
            if (!exist) {
                // if the file is not found, return 404
                res.statusCode = 404;
                res.end(`File ${pathname} not found!`);
                return;
            }
            // if is a directory, then look for index.html
            if (fs.statSync(pathname).isDirectory()) {
                pathname += '/index.html';
            }
            // read file from file system
            fs.readFile(pathname, function (err, data) {
                if (err) {
                    response.statusCode = 500;
                    response.end(`Error getting the file: ${err}.`);
                } else {
                    // based on the URL path, extract the file extention. e.g. .js, .doc, ...
                    const ext = path.parse(pathname).ext;
                    // if the file is found, set Content-type and send data
                    if (ext) {
                        response.setHeader('Content-type', mimeType[ext] || 'text/plain');
                    }
                    response.end(data);
                }
            });
        });

    } else {
        if (wsMessage) {
            const id = Math.floor(Math.random() * 65535);
            response.on('error', (err) => {
                console.error('Error', err);
            });

            wsMessage.on('message', (message) => {
                const res = JSON.parse(message);

                if (id === res.id && res.id !== lastId) {
                    console.log('received: ', res);
                    lastId = res.id; // not sure why getting duplicates
                    response.writeHead(res.statusCode, res.headers);
                    response.write(Buffer.from(res.body, 'base64'));
                    response.end();

                    // response.statusCode = 200;
                    // Object.keys(res.headers).forEach((key) => {
                    //
                    //     console.log(key, res.headers[key]);
                    //     response.setHeader(key, res.headers[key]);
                    //
                    // });
                    //
                    // response.write(JSON.stringify({message: 'blah'}));
                    // response.end();
                }

            });

            const {headers, method, url} = request;
            let body = [];
            request.on('error', (err) => {
                console.error(err);
            }).on('data', (chunk) => {
                body.push(chunk);
            }).on('end', () => {
                console.log('body', body);
                body = Buffer.concat(body);
                wsMessage.send(JSON.stringify({id, headers, method, url, body: body.toString('base64')}), (ack) => {
                    if (ack) {
                        console.log('Ack Error: ', ack);
                    }
                });
            });

            // proxy.web(request, response, { target: target, changeOrigin: true });
        } else {
            response.statusCode = 404;
            response.end(JSON.stringify({message: 'Client not connected'}));
        }
    }
};

const server = http.createServer(serverHandler).listen(port, () => {
    console.log('listening on port: ' + port);
});





