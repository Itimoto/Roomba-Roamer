const url = require('url');

let _server;
let _wssServers = new Map();

function routeWSRequests (request, socket, head) {      // Sample Walkthrough: Client said 'new WebSocket' @ URL:
    let pathname = url.parse(request.url).pathname;     // `wss://famine.potato.irish/pong` => pathname: `/pong`

    // Check against existing Keys/Paths
    if( _wssServers.has(pathname) ){
        let requestedWSS = _wssServers.get(pathname);   // key: `/pong` is mapped to a reference to `pongWSS`

        requestedWSS.handleUpgrade(request, socket, head, function done(ws) {
            requestedWSS.emit('connection', ws, request);   // `pongWSS` emits the event to allow external handlers to continue
            monitorConnection(ws);  // Check Broken/Closed Connections at the Source
        });

    } else {
        socket.destroy();
    }
}

// Adapted from: https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
function monitorConnection(_ws) {   // Pings each socket to monitor Broken/Closed Connections
    // Set Default
    _ws.isAlive = true;
    
    // Assume Socket is dead unless told otherwise
    let pingInterval = setInterval(function ping() {
        if(_ws.isAlive === false) return _ws.terminate();

        _ws.isAlive = false;
        _ws.ping();
    }, 30000);

    // Reset 'isAlive' on each Pong
    _ws.on('pong', () => {
        _ws.isAlive = true;
    });

    // Don't waste unnecessary resources post-kill
    _ws.once('close', () => {
        clearInterval(pingInterval);
    });
}

module.exports = {
    initialize: function (newServer){
        _server = newServer;
        _server.on('upgrade', routeWSRequests);
    },

    /**
     * Adds a WebSocket Server to the existing Upgrade Request queue.
     * Use this to add multiple WS Servers from elsewhere in the program
     * 
     * @param {WebSocket.Server} wsServer -- Wherever you need it
     * @param {String} path -- The path to which Clients connect. (ex: 'ws://0.0.0.0/pong' becomes '/pong')
     */
    append: function(wsServer, path){
        if(!_server)
            throw new Error("WSServer-Router: Server is Undefined / unInitialized.");

        _wssServers.set(path, wsServer);
        //console.log(`WSS-Router:\tAppended New Server w/ Path ${path}`);
    },

    get paths(){
        return Array.from(_wssServers.keys());
    },
}