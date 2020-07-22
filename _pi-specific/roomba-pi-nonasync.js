// WS Stream Imports & Variables; Callbacks under Video Streaming Section
const WebSocket = require('ws');
const spawn     = require('child_process').spawn;
//var   streamWS  = new WebSocket('ws://192.168.0.191:8083');
var   streamWS  = new WebSocket('wss://famine.potato.irish/piStream');

// Serial & commWS Imports & Major Variables; Callbacks under Roomba Section
//var   commWS    = new WebSocket('ws://192.168.0.191:8082');
var   commWS   = new WebSocket('wss://famine.potato.irish/common');
const SerialPort= require('serialport');
var portName    = "/dev/ttyAMA0";
var roombaPort  = new SerialPort(portName, {baudRate: 115200});

var Leaky       = require('./lib/leakyBuffer');

//------------------------------------------------
//      Video Streaming Section

const videoParameters = {
        height: 540,
        width: 960,
        fps: 12,
};

streamWS.on('open', function open() {
        console.log('Stream WS Open');
        console.log('Beginning Stream...');

        var duplex = WebSocket.createWebSocketStream(streamWS, {
                binary: true,
                perMessageDeflate: false,
        });
        var streamer = spawn('raspivid', ['-fl', '-t', '0', '-o', '-', '-w', 960, '-h', 540, '-fps', 12, '-pf', 'baseline']); // '-fl' arg flushes the buffer after every write
        streamer.on("exit", function(code) {
                console.log("Failure", code);
        });

        streamer.stdout.pipe(new Leaky()).pipe(duplex);

        streamWS.on('close', () => {
                console.log('Stream WS Closed');
                if(roombaPort)  // Failsafe
                        roombaPort.write(Buffer.from([op.START])); // Stop the Roomba when accidentally disconnected
        });
});

//-----------------------------------------------
//      Roomba Communication Section

commWS.on('open', function open() {
        console.log('COMM WS Open');
        commWS.send("PI");      // Send over 'ID'
});

commWS.on('message', (data) => {
        console.log(data);
        // Operating under assumption that 'message' is /only/ a Buffer intended for serial communication with Roomba
        roombaPort.write(data); // It's messy, but it works; if we need to expand it, we can in the future; but for now, checking for different args would put extra strain on the pi
});

//-----Serial------
var ReadLine    = SerialPort.parsers.Readline;
var parser      = new ReadLine();
roombaPort.pipe(parser);

const op        = require('./lib/roomba-opcodes');  // Makes writing commands easier
const defBuf    = Buffer.from([op.START]);
var serialPayload = defBuf; // Stores payload sent to Roomba every 15ms

roombaPort.on('open', showPortOpen);
roombaPort.on('close', showPortClose);
parser.on('data', readSerialData);
roombaPort.on('error', showError);

function showPortOpen(){
        console.log("Serial Port Open.");

        roombaPort.write(Buffer.from([op.START, op.SAFE]));
/*      // The infinite loop here prevented the rest of the listeners from starting
        while(roombaPort.isOpen){       // While Roomba Serial Port open, send a payload every 15ms
                setTimeout( () => {     //      The payload is updated asynchrously; this allows us to keep communication safe
                        if(serialPayload != defBuf){
                                roombaPort.write(serialPayload);
                                serialPayload = defBuf; // Get rid of pointer to not send unnecessary junk (until we add onto it)
                        }
                }, 15);
        }*/
}

function showPortClose() {
        console.log("Port Closed.");
}
function readSerialData(data){
        console.log(data);
}
function showError(){
        console.log("Serial Port Error: " + error);
}
