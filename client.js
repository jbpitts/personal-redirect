
const request = require('request');
const yargs = require('yargs');

const WebSocket = require('ws');

// run via 'node client.js'

var argv = yargs.usage(
    'Usage: node client.js -u [url] -p [port]'
)
    .option('u', {
        alias: 'url',
        describe: 'Http address to redirect',
        default: 'http://localhost:8080'
    })
    .option('s', {
        alias: 'server',
        describe: 'Host Proxy Server',
        default: 'localhost:8080'
    })
    .option('p', {
        alias: 'port',
        describe: 'Port number for server',
        default: '80'
    })
    .option('m', {
        alias: 'mode',
        describe: 'ws or wss',
        default: 'wss'
    })
    .argv;

let target = argv.m + '://' + argv.s;
if (argv.p) {
    target = target + ':' + argv.p;
}

const ws = new WebSocket(target);

ws.on('open', () => {
    console.log('Connection open to ' + target);
});

ws.on('error', (error) => {
   console.error('Error: ', error);
});

ws.on('message', (data) => {
    console.log(data);
    const req = JSON.parse(data);
    if (argv.u) {
        const reqOptions = {
            method: req.method,
            url: argv.u,
            headers: req.headers,
            encoding: null
        };
        if (req.body) {
            const translatedBody = Buffer.from(req.body, 'base64');
            console.log('Body: ' + translatedBody.toString());
            reqOptions.body = translatedBody;
        }
        request(reqOptions, (error, httpResponse, responseBody) => {
            let res;
            if (error) {
                console.log('Error', error);
                let errorBuf = Buffer.from(error);
                res = {id: req.id, statusCode: 400, headers: {'Content-Type': 'application/json'}, body: errorBuf.toString('base64')};
            } else {
                // const statusCode = httpResponse.statusCode ? httpResponse.statusCode : 200;
                res = {id: req.id, statusCode: httpResponse.statusCode, headers: httpResponse.headers, body: responseBody.toString('base64')};

            }
            console.log('response', res);
            ws.send(JSON.stringify(res), function ack(err) {
                // If error is not defined, the send has been completed, otherwise the error
                // object will indicate what failed.
                if (err) {
                    console.error('Error sending message', error);
                }
            });
        });
    } else {
        console.log('Must supply proxy url (-u).');
    }

});



