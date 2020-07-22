// WS Stream Imports & Variables; Callbacks under Video Streaming Section
const WebSocket = require('ws');
const spawn     = require('child_process').spawn;
var Leaky       = require('./leakyBuffer');

//-----WS URLs----
const hostName = "famine.potato.irish";
//const hostName = "192.168.0.191";
var   streamURL = `wss://${hostName}/piStream`;
var   commURL   = `wss://${hostName}/common`;

//-----Video Stream Consts----
const videoParameters = {
        height: 540,
        width: 960,
        fps: 12,
        bitrate: "baseline",
};

//-----Serial Imports------
const SerialPort= require('serialport');
var ReadLine    = SerialPort.parsers.Readline;
const op        = require('./roomba-opcodes');  // Makes writing commands easier

const portName  = "/dev/ttyAMA0";
var roombaPort;

beginRoombaRoamer();

async function beginRoombaRoamer() {
        try {
                let streamWS    = await connectStream(streamURL);
                let duplex      = await sendStream(streamWS); 

                duplex.on('error', (err) => {
                        handleStreamClose(roombaPort);
                        throw err;
                });    

                let commWS      = await connectComm(commURL);
                roombaPort  = await connectRoomba(portName);           

                let roombaReady = true;
                roombaPort.write(Buffer.from([op.START, op.SAFE]));

                //let BIN2 = Buffer.from(2);

                // 'Pipe' Server/Client's commands to Roomba
                commWS.send("PI");
                commWS.on('message', (data) => {
                        //console.log(data);

                        if(!roombaReady)
                                return;
                        
                        // Operating under assumption that 'message' is /only/ a Buffer meant for the Roomba
                        roombaPort.write(data); // It's messy, but it works; if we need to expand it, we can in the future; but for now, checking for different args would put extra strain on the pi
                });

                // Check if Roomba's running low on battery, etc. then update accordingly
                let parser = new ReadLine();
                roombaPort.pipe(parser);
                parser.on('data', readSerialData);
                function readSerialData(data) {
                        console.log("parser:", data);

                        /*
                        let receivedSerial = data.split(' ');
                        if(receivedSerial[0] == "battery-current-zero"){
                              commWS.send("PI BATT");
                              
                              roombaPort.write(Buffer.from([op.RESET, op.START, op.SEEKDOCK])); // Go back to charge up...  
                        
                              roombaReady = false;
                              setTimeout(()=>{ roombaReady = true; }, 3000); // 3sec buffer for server to update
                        }
                        */
                };

                // Begin Query-Loop, checking in on the Battery and responding accordingly
                let queryTimer = setTimeout( function sendQuery(){
                        console.log("Sending Sensor Query");
                        roombaPort.write(Buffer.from([op.QUERY, 0x2, op.GET_vBATT, op.GET_iBATT]));
                        
                        roombaPort.on('data', function checkRoombaBattery(data) {
                                if(!Buffer.isBuffer(data))
                                        return;

                                let payloadDataView = new DataView(data.buffer, data.byteOffset, data.length);
                                //console.log(payloadDataView);
                                let vBATT = payloadDataView.getUint16(0);
                                let iBATT = payloadDataView.getUint16(2);
                                console.log(`Roomba: Batt. Voltage at ${vBATT}/14400 mV \tBatt. Current at ${iBATT}/3500 mAh `);

                                if(vBATT < 11520){
                                        console.log("Roomba: Battery Voltage Low. Seeking dock...");
                                        commWS.send("PI BATT");

                                        roombaPort.write(Buffer.from([op.SEEKDOCK])); // Go back to charge up...
                                                                                
                                        roombaReady = false;
                                        setTimeout(()=>{ roombaReady = true; }, 10000); // 3sec buffer for server to update
                                }

                                // Clear, then recurse.
                                roombaPort.removeListener('data', checkRoombaBattery);
                                queryTimer = setTimeout(sendQuery, 5000); // Recurse
                        });
                }, 5000);
                
        }
        catch (err) {
                console.log("error: ", err);
                handleStreamClose(roombaPort);
                throw err;
        }
}

//------Promises / Hoisted Methods----

// Opens the StreamWS
function connectStream(url) {
        return new Promise(function(resolve, reject) {
                let _streamWS = new WebSocket(url);
                _streamWS.on('open', () => {
                        resolve(_streamWS);
                });
                _streamWS.on('error', (err) => {
                        reject(err);
                });

        });
}

// Sends Raspivid Feed over StreamWS
function sendStream(_streamWS){
        console.log("Stream WS Open. Sending Stream...");

        return new Promise(function(resolve, reject) {
                let duplex = WebSocket.createWebSocketStream(_streamWS, {
                        binary: true,
                        perMessageDeflate: false,
                });
                let {height, width, fps, bitrate} = videoParameters;

                let streamer = spawn('raspivid', ['-fl', '-t', '0', '-o', '-', '-w', width, '-h', height, '-fps', fps, '-pf', bitrate]); // '-fl' arg flushes the buffer after every write
                streamer.on("exit", function(code) {
                        console.log("Failure", code);
                        //reject(code);
                });
        
                // Send it over to the Server.
                streamer.stdout.pipe(new Leaky()).pipe(duplex);
        
                _streamWS.on('close', reject);

                resolve(duplex); // Continue on...
        });
}

// Failsafe. No matter what happens, we want to make sure that the Roomba stays safe.
function handleStreamClose(_roombaPort){
        if(_roombaPort){  // Failsafe
                console.log("Executing Failsafe...");
                _roombaPort.write(Buffer.from([op.RESET, op.START, op.SEEKDOCK])); // Stop the Roomba when accidentally disconnected
        }
}

//-----------------------------------------------
//      Server/Roomba Communication Section
/// Remember: commURL = 'wss://famine.potato.irish/common'
function connectComm(url){
        return new Promise(function(resolve, reject) {
                let _commWS = new WebSocket(url);
                _commWS.on("open", () => {
                        resolve(_commWS);
                });
                _commWS.on("error", (err) => {
                        reject(err);
                });

        });
}

function connectRoomba(_portName){
        return new Promise(function(resolve, reject) {
                let _roombaPort = new SerialPort(_portName, {baudRate: 115200});
        
                _roombaPort.on('open', () => {
                        console.log("Serial Port Open.");
                        resolve(_roombaPort);
                });

                _roombaPort.on('close', reject);
                _roombaPort.on('error', reject);
        });
}