"use strict"

const WebSocket         = require('ws');
const WebSocketServer   = WebSocket.Server;
const Splitter          = require('stream-split');
const merge             = require('mout/object/merge');
const Leaky             = require('./leakyBuffer');
const util              = require('util');

const WSSRouter         = require('../gen/wssRouter');  // Will Route our WS Servers; Good for HTTP2/S
const headerData        = require('./headerData');  // Will Store our h264 Header Frames as they come in
const PongManager       = require('../pong/client-manager'); // Instances manage a Two-Player game of Pong

const piStreamPORT      = 8083;
var piStream;

const op                = require('./roomba-opcodes');
const commPORT          = 8082;
var piComm;

class _RRserver {

    constructor(server, options) {
        // Merge up
        this.options = merge({
            width: 960,
            height: 540,
        }, options);

        // Set up Pi Streaming WS Server (we'll fetch the h264 feed from here) 
        //this.piStreamWSS = new WebSocketServer({ port: piStreamPORT }); // Legacy
        this.piStreamWSS = new WebSocketServer({ noServer: true });
        WSSRouter.append(this.piStreamWSS, '/piStream');

        this.piConnected    = this.piConnected.bind(this);
        this.getPiStream    = this.getPiStream.bind(this);

        this.piStreamWSS.on('connection', this.piConnected);

        // Set up Streaming WS Server (we'll stream to Clients from here)
        // this.streamWSS  = new WebSocketServer({ server });
        this.streamWSS  = new WebSocketServer({ noServer: true });
        WSSRouter.append(this.streamWSS, '/clientStream');

        this.stream_newClient   = this.stream_newClient.bind(this);
        this.stream_clientStart = this.stream_clientStart.bind(this);
        this.stream_flushClientData = this.stream_flushClientData.bind(this);

        this.streamWSS.on('connection', this.stream_newClient);

        // Set up General Communication WS Server (for Roomba Commands, etc.)
        // this.commWSS    = new WebSocketServer({ port: commPORT });
        this.commWSS    = new WebSocketServer({ noServer: true });
        WSSRouter.append(this.commWSS, '/common');

        this.comm_newConnection = this.comm_newConnection.bind(this);
        this.comm_piConnect     = this.comm_piConnect.bind(this);
        this.comm_resetRoomba   = this.comm_resetRoomba.bind(this);
        this.comm_piSend        = this.comm_piSend.bind(this);
        this.comm_clientConnect = this.comm_clientConnect.bind(this);
        this.comm_driveRoomba   = this.comm_driveRoomba.bind(this);
        this.comm_sendRoombaPayload = this.comm_sendRoombaPayload.bind(this);

        this.commWSS.on('connection', this.comm_newConnection);

        // Misc Methods
        this.measureLag         = this.measureLag.bind(this);
        this.getAllListeners    = this.getAllListeners.bind(this);

        this.clientQueue    = [];   // Stores CommWS clients linked to respective StreamWS client; index dictates ability to control Roomba
        this.linkClients    = this.linkClients.bind(this);
        this.queue_manage   = this.queue_manage.bind(this);
        this.queue_deQueue   = this.queue_deQueue.bind(this);

        // 'Begin' listening for WS Requests/Connections
      //  this.routeWebsocketServers = this.routeWebsocketServers.bind(this);
     //   server.on('upgrade', this.routeWebsocketServers);
    }

    //---------------------------------------------
    // Pi Stream Section (refers to piStreamWSS)
    //---------------------------------------------
    
    piConnected(ws) {
        console.log("Pi Socket Connected!");
        var self = this;

        self.piStream = WebSocket.createWebSocketStream(ws, {binary: true, perMessageDeflate: false});
        // If the Pi's connected before, (client Stream) ws.isViewing would be true
        self.queue_manage({refreshStream: true}); // Run the queue again to refresh views
        /*
        self.clientQueue.forEach( (commWS) => {
            if(commWS.streamWS.isViewing){
                console.log("resending stream");
                //ws.clientOutput = null;         // Set the pointer equal to null to create a new WS Stream
                self.stream_flushClientData(commWS.streamWS);
                self.stream_clientStart(commWS.streamWS);
            }
        });
        */

        ws.on('close', () => {
            // TODO: Fix Broken Pi Connection.
            console.log("Pi Socket Disconnected");
            self.piStream.destroy();   // Reset piStream socket variable
            headerData.resetConst();   // 'Clearing the Cache' node.js style tends to throw errors and... not work. This is the next-best option
            /*
            if(headerData.streamValue()){
                headerData.streamValue().removeAllListeners('end');
            }
            */
            self.streamWSS.clients.forEach( (ws) => {
                if(ws.isViewing){
                    self.stream_flushClientData(ws);
                    ws.clientPiStream.destroy();
                }
            });
            // Alert external processes for this one boys
            self.queue_manage({broadcast: "VIDEO-UNAVAILABLE"});
        });
    }

    getPiStream() {
        if(this.piStream && !this.piStream.destroyed){
            console.log("Fetching Pi Stream...");
            return headerData.prepStream(this.piStream);
        } else {
            console.log("Pi Stream Unavailable");
            return null;
            //TODO: Return an 'unavailable' stand-in video
        }
    }


    //---------------------------------------------
    // Client Stream Section (refers to streamWSS)
    //---------------------------------------------

    //--
    // Runs on new connections to streamWSS; Applies for the Queue
    //--

    stream_newClient(ws) {
        console.log("New Client Streaming Connection");
        var self = this;

        ws.send(JSON.stringify({
            action  : "init",
            width   : this.options.width,
            height  : this.options.height,
        }));

        ws.on("message", function(data) {
            var streamReq = data.split(' ');

            if(streamReq[0] == "ID"){
                let clientID = parseInt(streamReq[1]);
                self.linkClients(ws, clientID);
            }
        });

        ws.on('close', function() {
            console.log('Client-Stream Closed');
            // Defer StreamWS management to Queue Manager (when the CommWS ends)        
        });
    }

    // Link Client's StreamWS and CommWS via their generated ID
    linkClients(streamWS, clientID){
        let self = this;
        let notConnected = true;
        
        self.commWSS.clients.forEach( (commWS) => {
            //console.log(`Stream: ${clientID} vs Comm: ${commWS.clientID}`);
            if(clientID == commWS.clientID){
                console.log("It's a match!");
                notConnected = false;

                commWS.streamWS = streamWS;   // Link the Two Sockets (note how, in linking the StreamWS to the CommWS first, we prevent the Pi from entering the Queue)
                self.clientQueue.push(commWS);  // Add to Queue

                if(self.clientQueue.length == 1 && !self.clientQueue.timer){
                    self.queue_manage({stepQueue: true});
                } else {
                    self.queue_manage();
                }

                // Add a 'close' listener to commWS component here for readability
                commWS.on('close', () => {
                    console.log("Client Comm Socket Closed");

                    self.queue_deQueue(commWS);
                });

                return; // Break out
            }
        });

        if(notConnected && streamWS.readyState == WebSocket.OPEN)
            setTimeout(self.linkClients);
    }

    //--
    //  Dictates which Clients recieve which permissions
    //--

    queue_manage(opts) {
        let self = this;
        const QUEUE_INTERVAL = 30000;
        const ONDECK = 2; //[0}, 1}, 2}, 3, ...]

        let {stepQueue, refreshStream, broadcast} = opts || {};

        if(stepQueue){
            if(!self.queueIteration)
                self.queueIteration = 0;

            console.log();
            console.log(`RR-QUEUE:(${self.queueIteration++})\tLength: ${self.clientQueue.length} \tUpdate Flag: ${stepQueue}`);
        
            // Shift Queue forward @ Start (for the Clients that joined between updates)
            self.clientQueue.push(self.clientQueue.shift());    // Remove the first element of the Array ('shift'), then add to the end of the array ('push')
            refreshStream = true;

            /*
            // Kick off the Roomba Resetter
            let iteration = Math.ceil((QUEUE_INTERVAL / 10000)); // Resets every 10sec
            setTimeout( function _resetRoomba(i) {
                self.comm_resetRoomba();
                
                if(i > 0)
                    setTimeout(_resetRoomba(), 10000, i--); // Recurse if still applicable
            }, 10000, iteration);
            */
        }

        // Since Clients can connect in-between intervals, we need to manage them w/o disturbing the rest of the queue
        /*
        let currTime = Date.now();
        let timeSinceSwitch = currTime - self.time_lastUpdate;

        if(!self.time_lastUpdate || timeSinceSwitch >= QUEUE_INTERVAL){
            self.time_lastUpdate = Date.now();
            timeSinceSwitch = 0;    // reset
        }
        */

        // NOTE: Multiple connections from the same machine put the system in an undefined state.
        // Well, it /is/ defined. The user will get multiple 'connections' to the same window, but 
        // It won't seem to work properly from their end. Point is -> Stick to conn. from mult. devices
        for(let i = 0; i < self.clientQueue.length; i++){
            let tmpCommWS = self.clientQueue[i];

            if(!tmpCommWS || tmpCommWS.readyState == WebSocket.CLOSING || tmpCommWS.readyState == WebSocket.CLOSED){
                // TODO: Kick all devices w/ same IP from Queue
                //// Maybe also kick from Game
                console.log(`RR-QUEUE: \tSplicing Out Index ${i}`);
                self.clientQueue.splice(i, 1);  // Remove the closed element
                i--;        // The next element /might/ be problematic, too 
                continue;   // Skip the rest of the loop, move on to the next iteration
            }

            //console.log(`RR-QUEUE: \tSending Index ${i}`);// for ${tmpCommWS.clientID}`);
            tmpCommWS.send(`QU ${i}`);  // Send Clients their Place in Line, for UI Elements and whatnot

            let tmpStreamWS = tmpCommWS.streamWS;
            tmpCommWS.isPiloting = false;

            if(broadcast)
                tmpCommWS.send(`MSG ${broadcast}`);

            if(tmpStreamWS.isViewing && refreshStream) // Only flush on Server Update
                self.stream_flushClientData(tmpStreamWS);

            if(i <= ONDECK){      // Top three ////////////////////////////////////////////////////////////////SUPPOSED TO BE i < 3                
                if(i == 0){ // Big Kahuna
                    tmpCommWS.isPiloting = true;    // Rely on external Message Listeners to 'allow' messages from them
                    tmpCommWS.send("You're Piloting!");

                    // Cancel Out any commands from prev. users:
                    self.comm_sendRoombaPayload(Buffer.from([op.DRIVEDIRECT, 0x0, 0x0, 0x0, 0x0]));
                }
                
                if(!tmpStreamWS.isViewing && refreshStream){     // Only spawn a stream when necessary (or as backup video restarts, since the Client player doesn't always 'catch' the init frames)
                    self.stream_clientStart(tmpStreamWS);
                    tmpCommWS.send( (tmpStreamWS.clientPiStream) ? "MSG VIDEO-STREAMING" : "MSG VIDEO-UNAVAILABLE"); // Notify clients if stream unavailable to avoid confusion
                }

                console.log(`Ending game for client-index ${i}`);
                PongManager.endGame(tmpCommWS);
            }
        }

        // Only Update and Shift Queue every QUEUE_INTERVAL
        if(stepQueue){
            // Only continue if Queue is active / has clients
            if(self.clientQueue.length > 0){
                self.clientQueue.timer = setTimeout(self.queue_manage, QUEUE_INTERVAL, {stepQueue: true});    // Update every 30 sec (30 sec turns)
            } else {
                // 'Reset' timer variable
                self.clientQueue.timer = null;
            }
        }
    }

    //--
    // Executed whenever a Client Socket is closed; cleans up StreamWS and Advances the Queue
    //--

    queue_deQueue(commWS) {   // #notsponsored
        let self = this;
        let streamWS = commWS.streamWS;

        if(streamWS.isViewing){   // Is 'true' (not 'null' or 'false')
            self.stream_flushClientData(streamWS);
            streamWS.clientOutput.destroy();
            streamWS.isViewing = false;   // Stop trying to send Pi Feed to it
        }

        PongManager.endGame(commWS); 

        if(self.clientQueue.timer){     // Defer client replacement-without-the-Disconnected-Socket to Queue_Manager
           self.queue_manage();
        }
    }

    //--
    //  Send the Livestream to Client
    //--

    stream_clientStart(ws) {
        var self = this;

        self.stream_flushClientData(ws);

        ws.clientPiStream = self.getPiStream();

        if(!ws.clientPiStream){   // If the Pi stream returned nothing
            return;
        }

        ws.clientPiStream.on("error", (err) => {
            if(err.code == 'ERR_STREAM_DESTROYED'){
                console.log("Caught 'Destroyed Stream Error' on self.getPiStream");
                self.stream_flushClientData(ws);
                ws.clientPiStream.destroy();
            } else {
                throw err; // Client Pi Stream Error
            }
        });

        ws.clientPiStream.highWaterMark = 3 * 1024; // With a buffer this small, we'll force the stream to push the /most current/ values
                                                        // nvm ^^^ little to no difference; nvm on that nvm: it makes a visible difference

        ws.isViewing = true;    // Added new property to 'reserve' the stream if Pi disconnects, then reconnects

        if(!ws.clientOutput){
            ws.clientOutput = WebSocket.createWebSocketStream(ws, {binary: true, perMessageDeflate: false, end: false})
                .on("error", (err) => {
                    if(err.code == 'EPIPE' || ws.readyState == WebSocket.CLOSING || ws.readyState == WebSocket.CLOSED){
                        console.log("Caught Error: EPIPE or DUPLEX WRITING TO CLOSED/CLOSING SOCKET");
                        if(ws.clientPiStream){
                            self.stream_flushClientData(ws);
                            //ws.clientPiStream.unpipe(ws.Leaky);  // Since the clientOutput is no longer accessible; keep from getting into an undefined state
                            //ws.Leaky.unpipe(ws.clientOutput);
                            // ws.clientPiStream.unpipe();
                        } else {
                            throw err;
                        }                        
                    }
                    else if(err.code == 'ECONNRESET'){   // This usually happens on phones. Sometimes, they'll abruptly close the connection, resulting in this error throw
                        console.log("Caught Error: ECONNRESET");
                    } else {
                        throw err;  // Always use protection, kids.
                    }
                });
            }
            //// NOTE: The package ws >> createWebSocketStream is located in node_modules/ws/lib/stream.js
            ////    In 'duplex._final = function(callback)', near the end of the function, is 'ws.close()' meant 
            ////    to occur when the 'source'/Readable component ends (or, in our case, cuts off abruptly)
            ////    Commenting out 'ws.close()' prevents the server from closing the socket when the Pi disconnects
        ws.Leaky = new Leaky("CLIENT");
        ws.clientPiStream.pipe(ws.Leaky).pipe(ws.clientOutput);
    }
    
    //--
    //  Reset Client Stream (unpipe and destroy any attached streams to make room for the next, or for disconnections)
    //--

    stream_flushClientData(ws) {
        ws.isViewing = false;

        if(ws.clientPiStream && !ws.clientPiStream.destroyed){  // Client Requests Stream more than once
            let liveStream = headerData.streamValue();
            if(liveStream.listeners('prefinish').length > 0)
                liveStream.removeListener("prefinish", liveStream.listeners('prefinish')[0]);
            
            if(liveStream.listeners('end').length > 0)
                liveStream.removeListener("end", liveStream.listeners('end')[0]);
            
            ws.Leaky.unpipe(ws.clientOutput);
            ws.clientPiStream.unpipe(ws.Leaky);
            ws.clientOutput.unpipe();
            ws.Leaky.destroy();
            headerData.streamValue().unpipe(ws.clientPiStream);
            //headerData.streamValue().removeListener("end", ws.clientPiStream.goNext);
            ws.clientPiStream.destroy();
        }
    }
    
    //---------------------------------------------
    // Command/Text Comm. Section (refers to commWSS)
    //---------------------------------------------
    
    comm_newConnection(ws) {
        console.log("New Gen-Communication Connection");
        var self = this;

        ws.once("message", function (data) {
            var id = data.split(' ')[0];

            if(id == "PI"){
                self.comm_piConnect(ws);
            } else if (id == "CLIENT") {
                self.comm_clientConnect(ws);
            } else {
                console.log(`\t ...Invalid ID. Received: ${data}`);
                ws.send("Invalid ID");
            }
        });
    }

    comm_piConnect(ws) {
        console.log("GENCOMM: PI Confirmed");
        let self = this;

        self.piComm = ws;

        let resetTimer = setInterval(self.comm_resetRoomba, 10000);    // If a user trips a 'safety' wire, we'll reset the roomba on a timer

        /// While debugging -- deferred to Clientside 'keyboard-r' -> sends reset
        ws.on('message', processMessage);
        ws.on('close', processClose);

        function processMessage (data) {
            let message = data.split(' ');
            if(message[0] == "PI"){
                if(message[1] == "BATT"){
                    // Roomba Battery Low; It'll go seeking a dock, so we should stop sending commands to it for a bit.
                    self.queue_manage({broadcast: "LOW-BATT"});
                }
            }
        };

        function processClose () {
            console.log("GENCOMM: PI Disconnected. Cleaning up...");

            clearInterval(resetTimer);
            ws.removeListener('message', processMessage);
            ws.removeListener('close', processClose);

            if(self.piStream.readyState < 2) // 0 - CONNECTING, 1 - OPEN
                self.piStream.close();
        }
    }

    comm_resetRoomba() {
        // op.START changes the Roomba's mode from 'Safe'/'Passive' to 'Passive', then op.SAFE resets it
        //  We have this here because  s o m e  p e o p l e  like running over feet, tripping the cliff sensors,
        //      And turning the Roomba back to 'Passive' mode, forcing us to restart communication with roomba's serial terminal
        console.log("Safety Reset");
        this.comm_sendRoombaPayload([op.START, op.SAFE]);
        
        //this.comm_sendRoombaPayload([op.RESET, op.START, op.SAFE]);
    }

    comm_piSend(message) {
        if(this.piComm){
            this.piComm.send(message);
        } else {
            console.log("GENCOMM: EXCEPTION: Unable to send message to PI");
        }
    }

    comm_clientConnect(ws) {
        console.log("GENCOMM: Client Confirmed");
        var self = this;

        let createClientID = function(){
            let newID = Math.floor(Math.random() * Date.now());

            // Check against existing 'ID's'
            for(let i = 0; i < self.clientQueue.length; i++){
                let commWS = self.clientQueue[i];
                if(commWS.clientID == newID){
                    console.log(`CLIENT-ID-GEN: ID Matched. Regenerating...`);

                    newID = createClientID();   // Recursively generate a valid ID until it's unique
                    break;  // No need to continue verifying IDs
                }
            }

            return newID;
        };
        
        ws.clientID = createClientID();
        ws.send(`ID ${ws.clientID}`);

    //    var payLoad = Buffer.alloc(5);  // We'll write Roomba Commands to this
                                        // 'Protocol': <Buffer |Command| |Data Byte| |etc|>
        
        ws.on("message", (data) => {
            if(Buffer.isBuffer(data)){      // Precondition: Buffer is only sent here to relay to Roomba; check if able to 'pilot' here
                if(!ws.isPiloting)
                    return;

                let genReq = Buffer.from(data);

                if(genReq[0] == op.DRIVE || genReq[0] == op.DRIVEDIRECT || genReq[0] == op.START) // Data 'Validation', just in case
                    self.comm_sendRoombaPayload(data);

            } else {                            // Data is a String
                let genReq = data.split(' ');   // Access multiple commands at once

                if(genReq[0] == "Pi")  // Check if it's meant for the Pi / Roomba Transfer
                    self.comm_driveRoomba(genReq);   // Hand it over to a separate service method

                if(genReq[0] == "ReqPong"){  // Flag the WS client as Ready for Pong; Let Queue Manager set up the pong Blind Date
                    //ws.pongRequested = true;
                    //self.queue_manage();
                 //   if(self.clientQueue.indexOf(ws) > 1) //ONDECK
                        PongManager.pongRequested(ws);
                        self.queue_manage();
                }
                //if(genReq[0] == "PG" && genReq[1] == "END")
                    //PongManager.endGame(ws);
            }
        });
    }

    comm_driveRoomba(genReq){    // (String Array 'requests' from Message, Buffer 'payload' as instantiated for each Client Connection)
        var self = this;

        let payLoad = Buffer.alloc(5);
        payLoad[0] = op.DRIVE;

        if(genReq[1] == "KeyW"){
            //self.comm_piSend(Buffer.from([op.START, op.SAFE, op.PLAY, 0x3])); // 'Test' Buffer. Should play a single note stored in memory. Equivalent to Buffer.from([0x80, 0x83, 0x8D, 0x0])
            if(genReq[2] == "SHIFT"){
                payLoad[1] = 0x1;
                payLoad[2] = 0xF4;
            } else {
                payLoad[1] = 0x0;
                payLoad[2] = 0xF4;
            }
                    
        }
        if(genReq[1] == "KeyS"){
            /*payLoad[1] = 0xFF;
            payLoad[2] = 0x38;  //-200 mm/s*/
            if(genReq[2] == "SHIFT"){
                payLoad[1] = 0xFE;
                payLoad[2] = 0x0C;
            } else {
                payLoad[1] = 0xFF;
                payLoad[2] = 0x0C;
            }

        }
        if(genReq[1] == "KeyA"){
            if(payLoad[2] == 0x0 || payLoad[2] == op.SLOWROT){  // If we're not already moving, rotate in place:
                payLoad[1] = 0x0;
                payLoad[2] = op.SLOWROT;
                payLoad[3] = 0x0;
                payLoad[4] = 0x1;   // CCW: opCode: 1
            } else {
                payLoad[3] = 0x1;
                payLoad[4] = 0x20;  // rad = 50mm (0x0, 0x32)
            }

        }
        if(genReq[1] == "KeyD"){
            if(payLoad[2] == 0x0 || payLoad[2] == op.SLOWROT){
                payLoad[1] = 0x0;
                payLoad[2] = op.SLOWROT;  //We'll use op.SLOWROT / this value as an indicator of whether or not we've just rotated in place
                payLoad[3] = 0xFF;  //  We can't just make [1][2] both 0, since we need a 'velocity' value to make the roomba rotate
                payLoad[4] = 0xFF;  // CW: opCode: -1
            } else {
                payLoad[3] = 0xFE;      // Make in-movement rotations straighter
                payLoad[4] = 0xE0;  // rad = -50mm (0xFF, 0xCE)
            }

        }

        if(genReq[1] == "KeyX" || genReq[1] == "STOP"){
            if(genReq[2]){
                if(genReq[2] == "KeyW" || genReq[2] == "KeyS"){
                    payLoad[1] = payLoad[2] = 0x0;    // Stop forward / backward mvmt
                }
                if(genReq[2] == "KeyA" || genReq[2] == "KeyD"){
                    payLoad[3] = payLoad[4] = 0x0;    // Stop rotation
                }
                if(payLoad[2] == op.SLOWROT){ // Sentinel Value; indicates recent rotation in place
                    payLoad[2] = payLoad[1] = 0;   
                }
            }
            else {
                payLoad[1] = payLoad[2] = payLoad[3] = payLoad[4] = 0x0;
            }
        }
    }

    comm_sendRoombaPayload(data) {  // Send Serial Payload to Pi in a non-blocking manner
        var self = this;

        if(!self.piComm)
            return;

        if(self.piComm.buzy){ //try queuing unsent commands in a RingBuffer for now if nothing works
            if(data[1] == data[2] == data[3] == data[4]){    // If the client issued 'STOP' but socket is buzy, send on next cycle
                setTimeout(self.comm_sendRoombaPayload, 100, data);
            }
            
            return;
        }

        self.piComm.buzy = true;

        self.piComm.send(data, {binary: true}, function ack(err) {  // On 'ack'nowledging a sent message, the socket can be considered 'available'
            self.piComm.buzy = false;
        });
    }

    //--------------------------------------------
    // Miscellaneous Section
    //--------------------------------------------

    measureLag(iteration) {
        const start = new Date();
        setTimeout(() => {
            const lag = new Date() - start;
            if(iteration % 1 == 0)
                console.log(`Loop ${iteration} took\t${lag} ms`);
            this.measureLag(iteration + 1); // Recursively call at next Event Loop Cycle
        });
    }

    getAllListeners(emitter, ID) {
        console.log(`---SHOWING EVENT LISTENERS FOR ${ID}---`);

        let events = emitter.eventNames();
        events.forEach( (event) => {
            console.log(event+":\t"+emitter.listenerCount(event));
        });

        console.log("---END EVENT LISTENERS---");
    }
}

module.exports = _RRserver;