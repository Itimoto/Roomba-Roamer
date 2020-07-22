//"use strict";

import { connectToPeer, disconnectPeers, sendToPeer } from './networking.js';
import { determineBounds, addWindowConfig } from './windowManager.js';
import { startCapturingInput, stopCapturingInput } from './gameInput.js';
//import { startHosting, stopHosting } from './hostGame.js'; 
//import { startGameListening, stopGameListening } from './guestGame.js';
import { clearTimestamps } from './pongState.js';
import Renderer from './render.js';

import { runGame, stopGame } from './runGame.js';

import { initGameConstants } from './assets.js';

//import { handleErr } from '../general/utils.js';

const WINNINGSCORE = 9;
const RENDER_TIME = 10;
const BUFFER_DELAY = 100;


class PongGame {
    constructor(canvas, socket, opts){
        this.canvas = canvas;
        this.socket = socket;

        this.gameoverEvent = new Event('gameover');

        if(opts){
            if(opts.mobile){
                this.touchInterface = true;
            }
        }

        this.bounds = {};
        if(window.innerWidth > window.innerHeight){
            this.orientation = "wide";

            this.localBounds = {
                width   : canvas.width,
                height  : canvas.height,
            }
        } else {
            // Flip the Bounds' orientation; Rotate the /entire thing/
            this.orientation = "narrow";
            
            this.localBounds = {
                width : canvas.height,
                height : canvas.width,
            }
        }
        this.renderer = new Renderer(this.canvas, this);

        this.setupBounds    = this.setupBounds.bind(this);
        this.startGame      = this.startGame.bind(this);
        this.endGame        = this.endGame.bind(this);
        this.handleErr      = this.handleErr.bind(this);

        window.addEventListener('beforeunload', this.endGame, {once: true});

        connectToPeer(this.socket, this.endGame)
            .then( this.setupBounds )
            .then( this.startGame )
            .catch( this.handleErr);
    }

    setupBounds(connectionConfig){
        let self = this;
        
        //let {peerConnection, dataChannel, isCaller} = connectionConfig;
        self.isCaller = connectionConfig.isCaller;
        console.log(connectionConfig);
        return determineBounds(self.isCaller, self.localBounds); // Which is, itself, a Promise
    }

    // Now-Synchronous Entry Point to the Game
    startGame(newBounds){
        let {isCaller, orientation, renderer} = this;
        //let {isCaller} = connection;

        this.initialize(newBounds);

        // Start Capturing Input & Decide Where To Send It Internally
        startCapturingInput(isCaller, { orientation: orientation });
        runGame(isCaller);
        /*
        if(isCaller){
            startHosting( this.endGame );   // Expose instance Endgame Methods
        } else {
            startGameListening( this.endGame );
        }
        */

 //       setInterval( () => {
 //           console.log(this.gameObjects);
 //       }, 2000);

        renderer.startRenderingGame();
    }

    initialize(newBounds){
        console.log("Initializing bounds...");
        this.bounds = newBounds;
        let offsets = {offsetX: 0, offsetY: 0};

        // Set up Offsets for each object
        if(this.orientation == "wide"){
            offsets.offsetX = .5 * (this.canvas.width - this.bounds.width);
            offsets.offsetY = .5 * (this.canvas.height - this.bounds.height);
        } else {
            offsets.offsetX = .5 * (this.canvas.height - this.bounds.width);
            offsets.offsetY = .5 * (this.canvas.width - this.bounds.height);
        }

        
        // Generate the In-Game Assets with the modified Window Bounds & Offsets
        this.gameObjects = initGameConstants(this.bounds, offsets);
console.log("Got objects, gonna apply some stufff...");
        // Apply offsets and 'Flipped' Behavior, if necessary
        Object.keys(this.gameObjects).forEach((key) => {
            let obj = this.gameObjects[key];

            if(this.orientation == "narrow"){
                obj.isFlipped = true;
            }

           // obj.x += this.offsetX;
           // obj.y += this.offsetY;
        });

      //  this.playerName = this.player;
      //  this.player = this.gameObjects[this.player];   // Object[String] returns the object with the name referred to by String
        console.log("Adding window config.");
        addWindowConfig(offsets);//{offsetX: this.offsetX, offsetY: this.offsetY});    // Send final Offsets to the Window Manager for use in other processes
    }

    endGame(opts){
        let self = this;

        if(self.gameOver){ // Latch. Only do this once
            console.trace("Endgame called, but already exectued");
            return;
        }

        self.gameOver = true;
        console.log("Game Ended. Cleaning Up...");

        // Wipe the Canvas Clean
        self.renderer.stopRenderingGame();
        window.requestAnimationFrame(self.renderer.clearScreen);

        // End Listeners
        stopCapturingInput();
        
        //stopHosting();
        //stopGameListening();
        stopGame();
        clearTimestamps();

        //sendToPeer( (self.isCaller) ?   JSON.stringify({end: true})   : "END");
       // sendToPeer("END");
        sendToPeer(JSON.stringify({end: true}));
        self.socket.send("PG END");
        disconnectPeers();
/*        // Game Over Screen

        // Server Closed Connection
        if(!self.gameCanvas){
            self.gameCanvas = self.canvas.getContext("2d");
        }

        self.renderer.stopRenderingGame();
        window.requestAnimationFrame(self.renderer.clearScreen);
 
        // End Timers/Clocks & Listeners (Every single one that could've been called at each point)
        self.socket.removeEventListener('message', self.serverReady);
        
        self.socket.removeEventListener('message', self.initBoundaries);
        self.socket.removeEventListener('message', onServerUpdate);
        stopCapturingInput();
        
        self.startButton.removeClickListener();
        self.helpButton.removeClickListener();
        self.requeueButton.removeClickListener();

        clearTimeout(self.serverUpdateClock);        

        // Emit gameover event (if need be)
        document.dispatchEvent(self.gameoverEvent);
*/
        // Emit gameover event for external processes
        ////if(!opts)   // If not triggered by a Listener w/ an Event
            document.dispatchEvent(self.gameoverEvent);
    }

    handleErr(err){
        console.error(err);
        this.endGame();
    }
}

export {PongGame as default};