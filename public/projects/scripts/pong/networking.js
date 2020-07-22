//"use strict";

var _peerConnection, _dataChannel, _role;
var server;
const pcConfig = {
  iceServers: [
    {'urls': 'stun:stun.stunprotocol.org:3478'},
    {'urls': 'stun:stun.l.google.com:19302'},
    {'urls':  'stun:stun.lowratevoip.com:3748'},
/*
    {'urls':  'stun:stun.irian.at:3748'},
    {'urls':  'stun:stun.it1.hr:3748'},
    {'urls':  'stun:stun.ivao.aero:3748'},
    {'urls':  'stun:stun.jappix.com:3748'},
    {'urls':  'stun:stun.jumblo.com:3748'},
    {'urls':  'stun:stun.justvoip.com:3748'},
    {'urls':  'stun:stun.kanet.ru:3748'},
    {'urls':  'stun:stun.kiwilink.co.nz:3748'},
    {'urls':  'stun:stun.kundenserver.de:3748'},
    {'urls':  'stun:stun.linea7.net:3748'},
    {'urls':  'stun:stun.linphone.org:3748'},
    {'urls':  'stun:stun.liveo.fr:3748'},
    {'urls':  'stun:stun.lugosoft.com:3748'},
    {'urls':  'stun:stun.lundimatin.fr:3748'},
    {'urls':  'stun:stun.magnet.ie:3748'},
    {'urls':  'stun:stun.manle.com:3748'},
    {'urls':  'stun:stun.mgn.ru:3748'},
    {'urls':  'stun:stun.mitake.com.tw:3748'},
    */
  ],
}
const SPLITTER = " $ ";


var resolve, reject, endGame, timeoutClock;
export {endGame}; // Export 'endGame' for internal use...

export function connectToPeer(_ws, _endGame) {
    return new Promise(function(res, rej) {
      server = _ws;  
      endGame = _endGame;

      console.log("Queueing Socket");

      server.send("ReqPong");

      server.addEventListener('message', processServerUpdate);

      //timeoutClock = setTimeout(fallbackToWebsockets, 3000, "Failed Conn: Timeout"); // 3 Seconds to set up WebRTC; else, fallback.

      // Expose to Module Scope
      resolve = (connectionConfig) => {
        clearTimeout(timeoutClock);
        res(connectionConfig);
      };  // Resolves with Peer Connection, DataChannel, and Role
                      //  on DataChannel Connection, under handleChannelStatusChange
      reject  = (err) => { // Reject on Errors
        server.removeEventListener('message', processServerUpdate);
        endGame();
        rej(err);
      };   
    });
}

function processServerUpdate(event) {
    let message = event.data.split(SPLITTER); //b/c some signalling data can, in fact, have Spaces in there
    console.log(message);

    if(message[0] != "PG") { return; }

    //if(!_peerConnection) createPeerConnection(false);

    if(message[1] == "LINKED"){
      // Server's Found Two Potential Peers
      _role = parseInt(message[2]); // '0' or '1' -> 'Caller' or 'Answerer'
      createPeerConnection(_role);

      timeoutClock = setTimeout(fallbackToWebsockets, 3000, "Failed Conn: Timeout"); // Add the Timeout Clock /after/ being queued by Server.
    }
    /*
    
    else if(message[1] == "RELAY" && message[2] == "JSON"){ // Check if it's Stringified w/o needing a try/catch
      //console.log("Received Relay Message");
      let signal = JSON.parse(message[3]);
      
      if(signal.sdp){
        console.log(`Received Remote Description: ${JSON.stringify(signal.sdp)}`);
        _peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(function() {
            // Only create Answers in response to Offers
            if(signal.sdp.type == 'offer'){
              console.log("Received Offer. Sending Answer...");
              _peerConnection.createAnswer()
                .then(createDescription)
                .catch(handleError);
            } else {
              console.log("Received Answer. Doing nothing...");
            }
          });
      }
      else if(signal.ice){
        console.log(`Received Ice Candidate: ${JSON.stringify(signal.ice)}`);
        _peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch(handleError);
      }
    }
    */
    else if(message[1] == "END"){
      console.log("Endgame received from Server. Ending...");
      endGame();
    }
}

function createPeerConnection(isCaller){
    _peerConnection = new RTCPeerConnection(pcConfig);
    _peerConnection.onicecandidate = gotIceCandidate;
    _peerConnection.onconnectionstatechange = handleConnStateChange;
    _peerConnection.oniceconnectionstatechange = handleIceStateChange;
    _peerConnection.onicecandidateerror = handleError;

    if(isCaller){
      // Caller Side
      _peerConnection.createOffer()
        .then(createDescription)
        .catch(handleError);

      // Create a Data Channel, then attach listeners
      _dataChannel = _peerConnection.createDataChannel("PongGame");
      handleChannelHost();

    } else {
      // Answerer Side  ; Listen for a Channel
      _peerConnection.ondatachannel = handleChannelGuest;
    }
}


function createDescription(description){
    // Set Description and Send It to Peer through Server
    _peerConnection.setLocalDescription(description)
      .then( function() {
          sendObjToServer({
            sdp: _peerConnection.localDescription,
          });
          console.log(`Local Description: ${JSON.stringify(_peerConnection.localDescription)}`);
          /*
          server.send(`JSON $ ${JSON.stringify({
            sdp: _peerConnection.localDescription,
          })}`);
          */
      })
      .catch(handleError);
}

function gotIceCandidate(event){
    if(event.candidate != null){
      sendObjToServer({
        ice: event.candidate,
      });
      console.log(`Got Ice Candidate: ${JSON.stringify(event.candidate)}`);
      /*
      server.send(`JSON $ ${JSON.stringify({
        ice: event.candidate,
      })}`);
      */
    }
}

//// Data Channel Section
// Caller -- Host, created dataChannel
function handleChannelHost(){
    _dataChannel.onopen = _dataChannel.onclose = _dataChannel.onerror = handleChannelStatusChange;
}

// Answerer -- Guest, /not/ dataChannel creator
function handleChannelGuest(event){
    _dataChannel = event.channel;
    
    _dataChannel.onopen = _dataChannel.onclose = _dataChannel.onerror = handleChannelStatusChange;
}

function handleChannelStatusChange(event){
    let state = this.readyState; // _dataChannel.readyState

    if(state === "open"){
      console.log("Pong Channel Open");
      server.removeEventListener('message', processServerUpdate);
      resolve({
        peerConnection: _peerConnection, 
        dataChannel   : _dataChannel,
        isCaller      : _role,
      });

    } else {
      if(_dataChannel != server){ // No Fallback to WS...
        console.log("Pong Channel Closed. Ending Game.");
        endGame();

      }
    }
}
function handleConnStateChange(event){
  // Called by onconnectionstatechange and onsignallingstatechange; former is unsupported by Firefox, 
  //  so the latter is a hacky workaround.
  let state = this.connectionState; // _peerConnection.connectionState
  
  if(state === "open"){
    console.log("Peer Connection Open");
  
  } 
  else if(state === "failed"){
    console.log("Peer Connection Failed.");
    fallbackToWebsockets("Failed Peer Conn");

  } else if(state === "disconnected" || state === "closed"){
    console.log("Peer Connection Closed. Ending Game.");
    endGame();
  
  }
}

function handleIceStateChange(){
  let iceConnState = this.iceConnectionState;
  console.log(`PeerConnection: ${iceConnState}`);

  if(iceConnState === "failed"){
    fallbackToWebsockets("Failed Ice Conn");
  }
}

function fallbackToWebsockets(reason){
  if(_dataChannel === server) // Only do it once.
    return;

  if(_peerConnection && _peerConnection.connectionState == "connected")
    return;

  console.trace(`${reason} Falling Back to WebSockets...`);
  server.send("PG FALLBACK");//`${reason}`);

  disconnectPeers(); // Stop trying to connect over WebRTC.

  _dataChannel = server;
  sendToPeer = sendToServer;

  // Resolve Fallback-ing-ly
  resolve({
    peerConnection: _peerConnection, 
    dataChannel   : server,
    isCaller      : _role,
  });
}

export function disconnectPeers(){
    console.log("Disconnecting Peers");

    // Clear Listener
    server.removeEventListener('message', processServerUpdate);

    if(_dataChannel)
      _dataChannel.close();
    if(_peerConnection)
      _peerConnection.close();

    _dataChannel = _peerConnection = null;
}

// Basic 'ol Error Handler
function handleError(err){
  alert(err);
    console.error(err);
    if(err.message && err.message.indexOf("candidate:<candidate-str>") > 0){
      console.log("...caught"); // Prevalent in iOS
      return;
    }

    reject(err); // Call Reject Function
}

// Basic Exports:
export function sendObjToServer(obj){
  if(!server) return;

  let objToSend = JSON.stringify(obj);
  server.send(`JSON${SPLITTER}${objToSend}`);
}
export function sendToServer(msg){
  if(!server) return;

  server.send(msg);
}

export function sendObjToPeer(obj){
  if(!_dataChannel) return;
  sendToPeer(JSON.stringify(obj));
}

export function sendToPeer(msg){
  if(!_dataChannel || _dataChannel.readyState != "open") return;
  _dataChannel.send(msg);
}

export function getDataChannel(){
  return _dataChannel;
}