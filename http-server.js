const express       = require("express");
const http          = require("http");
const path          = require("path");

const ROOMBAROAMER  = path.join(__dirname + "/public", "rr-http.html");

const RoombaServer  = require('./lib/rr/_rr-server-http');
const piStreamPORT = 8084;
const commPORT = 8082;

// Express App Boilerplate
var app = express();

//public website
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/vendor/dist'));     // For the h264 Player

// Set Up Routes for Primary Server:
app.get('/', function (req, res) {
    res.sendFile(ROOMBAROAMER);
});

const server = http.createServer(app); // for HTTP: (Legacy)
const roomba = new RoombaServer(server, {commPORT: commPORT, piStreamPORT: piStreamPORT});

console.log("Listening on Port: 80");
server.listen(80);  // Start listening on HTTP's Default port