
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
    .argv;

let target = 'ws://' + argv.s;
if (argv.p) {
    target = target + ':' + argv.p;
}
const ws = new WebSocket(target);

ws.on('open', function open() {
    console.log('Connection open to ' + target);
});

ws.on('message', function incoming(data) {
    console.log(data);
    const req = JSON.parse(data);
    if (argv.u) {
        request({
            method: req.method,
            url: argv.u,
            headers: req.headers,
            body: Buffer.from(req.body, 'base64'),
            encoding: null
        }, function (error, httpResponse, responseBody) {
            const res = {id: req.id, statusCode: httpResponse.statusCode, headers: httpResponse.headers, body: responseBody.toString('base64')};
            console.log('response', res);
            // if (error) {
            //     console.error(error);
            // } else {
            //     console.log(responseBody.message);
            // }
            ws.send(JSON.stringify(res), function ack(error) {
                // If error is not defined, the send has been completed, otherwise the error
                // object will indicate what failed.
                if (error) {
                    console.error('Error sending message', error);
                }
            });
        });
    } else {
        console.log('Must supply proxy url (-u).');
    }

});



