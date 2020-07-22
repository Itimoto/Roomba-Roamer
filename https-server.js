// Note: For the SSL route, you'll need to generate your own SSL certificates.

const express       = require("express");
const spdy          = require("spdy");
const http          = require("http");
const path          = require("path");
const fs            = require("fs");

const ROOMBAROAMER  = path.join(__dirname + "/public/projects", "rr-https.html");

// Custom Imports
const WSSRouter     = require('./lib/gen/wssRouter');

const RoombaServer  = require('./lib/rr/_rr-server-https');

// Express App Boilerplate
var app = express();

//public website
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/vendor/dist'));     // For the h264 Player

// Set Up Routes for Primary Server:
app.get('/', function (req, res) {
    res.sendFile(ROOMBAROAMER);
});

// Set up HTTP2 Server SSL Components:
const options = {
    key : fs.readFileSync(__dirname + '/ssl/privkey.pem'),
    cert: fs.readFileSync(__dirname + '/ssl/cert.pem'),
    ca  : fs.readFileSync(__dirname + '/ssl/chain.pem'),
}

const server = spdy.createServer(options, app);
WSSRouter.initialize(server);

const roomba = new RoombaServer(server);

server.listen(443, (error) => {
    if(error) {
        console.error(error);
        return process.exit(1);
    } else {
        console.log(`Listening on port: 443.`);
    }
});

// Redirect from http port 80 to http2/https
http.createServer(function (req, res) {
  res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
  res.end();  
}).listen(80);