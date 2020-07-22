import initGameConstants from './generatePongConstants.js';
import Renderer from './renderer.js';
import Button from '../general/canvasButton.js';

import { startCapturingInput, stopCapturingInput } from './pongInput.js';
import { onServerUpdate, getUpdatedState } from './pongGame-state.js';

class PongClient {
    /**
     * Requests a game of Pong with a Server and sets-up Clientside input/viewing
     * 
     * @param {Canvas} canvas -- Canvas on which to display Pong
     * @param {WebSocket} socket -- Socket dedicated to Server communication
     * @param {*} opts -- .mobile: boolean. Indicates a touch-display
     */
    constructor(canvas, socket, opts){
        this.canvas = canvas;
        this.socket = socket;

        this.gameoverEvent = new Event('gameover');
        this.gameOver = false;

        this.bounds = {};

        if(opts){
            if(opts.mobile){
                this.touchInterface = true;
            }
        }

        this.initStartScreen    = this.initStartScreen.bind(this);
        this.initBoundaries     = this.initBoundaries.bind(this);
        
        this.startGame          = this.startGame.bind(this);
        this.update             = this.update.bind(this);

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
        
        this.initStartScreen(this.canvas); // Wait Until Given the Go-Ahead from the Server
    }

    // Sets up Splash Screen and Allows Client to Indicate Readiness
    initStartScreen(canvas){
        let self = this;

        // Both an interactive element /and/ an indicator
        self.startButton = new Button(canvas, {
            x : (this.orientation == "wide") ? canvas.width/2 - canvas.width/11 : canvas.width/2 - canvas.width/6,
            y : (this.orientation == "wide") ? canvas.height * 8.5/11 : canvas.height * 7.2/10,
            width : (this.orientation == "wide") ? canvas.width/5.5 : canvas.width/3,
            height : (this.orientation == "wide") ? canvas.height/15 : canvas.height/16,

            text: "WAITING",
            textACTIVE: "START",
            font: "'Press Start 2P",
        });  // Indicate Waiting for Others
        self.requeueButton = new Button(canvas, {
            x : (this.orientation == "wide") ? self.startButton.x - self.startButton.width * 1.2 : self.startButton.x,
            y : (this.orientation == "wide") ? self.startButton.y : self.startButton.y + self.startButton.height * 1.3,//canvas.height * 6.8/8,
            width : self.startButton.width,
            height : self.startButton.height,

            text: "REQUEUE",
            textACTIVE: "REQUEUE",
            font: "'Press Start 2P",
        });  // Indicate Waiting for Others
        self.helpButton = new Button(canvas, {
            x : (this.orientation == "wide") ? self.startButton.x + self.startButton.width * 1.2 : self.startButton.x,
            y : (this.orientation == "wide") ? self.startButton.y : self.startButton.y + self.startButton.height * 1.3 * 2,//canvas.height * 6.8/8,
            width : self.startButton.width,
            height : self.startButton.height,

            text: "HELP",
            textACTIVE: "HELP",
            font: "'Press Start 2P",
        });  // Indicate Waiting for Others
        self.helpButton.addClickListener(function gotoHelp() {
            console.log("Help clicked");
            self.helpButton.removeClickListener();

            // Set up 'Back' Button
            let backButton = new Button(self.canvas, 
                (({x, y, width, height, font}) =>           // Shorthand: Assigns specific properties and returns them
                    ({x, y, width, height, font}))(self.helpButton));   
            backButton.textACTIVE = "BACK";

            backButton.addClickListener(() => {
                self.helpButton.addClickListener(gotoHelp);
                self.renderer.changeScreen('start');
                self.renderer.superimpose(self.startButton, {isObj: true});
                self.renderer.superimpose(self.helpButton, {isObj: true});
                self.renderer.superimpose(self.requeueButton, {isObj: true});
            }, {once: true});
            
            // Set up Screen
            self.renderer.changeScreen('help');
            self.renderer.superimpose(backButton, {isObj: true});
        });
        
        // Render Start Screen
        self.renderer.superimpose(self.startButton, {isObj: true});
        self.renderer.superimpose(self.helpButton, {isObj: true});
        self.renderer.superimpose(self.requeueButton, {isObj: true});

        console.log("SENDING REQPONG - INTERNAL");
        self.socket.send("ReqPong");

        // Refresh Game if no answers, just in case
        let receivedMessage = false;
        setTimeout( () => {
            if(!receivedMessage)
                self.endGame();
        }, 20000);


        // Listen for either a) Server/OtherPlayer-ready, b) Server End-Game/OtherPlayer disconnected
        self.serverReady = function(event) {   // Synonymous to 'Other Player Ready'
            let message = event.data.split(' ');

            // Assignment Received...
            if(message[0] == "PG" && message[1] == "ASSIGN"){
                receivedMessage = true;
                self.player = message[2];   // This is our Player Assignment

                self.startButton.addClickListener(() => {
                    // Send Init Data & Wait for response...
                    self.socket.send("PG INITDATA " + JSON.stringify(self.localBounds));  // Send local Boundary Sizes for Server to calculate the size of the game
                    
                    //self.socket.removeEventListener('message', serverReady);
                    self.socket.addEventListener("message", self.initBoundaries);   // Listen for Server's Window Data

                    self.renderer.render();
                }, {once: true});
                self.requeueButton.addClickListener( () => {
                    // End the game
                    self.requestEndGame();  // Let the 'endgame' remove the listener at the end
                }, {once: true});

                self.renderer.render();
            }
            // ...Or Other Player Disconnected / Game Over Prematurely
            else if(message[0] == "PG" && message[1] == "END"){
                self.socket.removeEventListener('message', self.serverReady);    // serverReady is a local function; we can't remove it from endGame()
                self.endGame();
            }
        };

        self.socket.addEventListener('message', self.serverReady);
    }

    // Received Server's new Aspect Ratio, initializes GameObjects/Assets to scale as closely as possible
    initBoundaries(event){
        let message = event.data.split(' ');

        if(message[0] == "PG"){
            if(message[1] == "NEWBOUNDS"){
                // Set up an Aspect Ratio compromised by the Server
                let serverBounds = JSON.parse(message[2]); //JSON.parse constructs the JS value/object described by the string
                this.aspectRatio = serverBounds;

                this.bounds.width = this.aspectRatio * this.localBounds.height;
                this.bounds.height = this.localBounds.height;

                // Generate the In-Game Assets with the modified Window Bounds
                this.genConstants = initGameConstants(this.bounds);
                this.gameObjects = this.genConstants.gameObjects;

                // Set up Offsets for each object
                if(this.orientation == "wide"){
                    this.offsetX = .5 * (this.canvas.width - this.bounds.width);
                    this.offsetY = .5 * (this.canvas.height - this.bounds.height);
                } else {
                    this.offsetX = .5 * (this.canvas.height - this.bounds.width);
                    this.offsetY = .5 * (this.canvas.width - this.bounds.height);
                }

                // Apply offsets and 'Flipped' Behavior, if necessary
                this.gameObjects.forEach((obj) => {
                    if(this.orientation == "narrow"){
                        obj.isFlipped = true;
                    }

                    obj.BASE.x = obj.x += this.offsetX;
                    obj.BASE.y = obj.y += this.offsetY;
                });

                this.playerName = this.player;
                this.player = this.genConstants[this.player];   // Object[String] returns the object with the name referred to by String
                
                this.socket.removeEventListener("message", this.initBoundaries);
                this.startGame();
            }
            else if(message[1] == "END"){
                this.endGame();
            }
        }        
    }

    // Begin Listening for Input and Draw Updates from Server
    startGame(){
        // Game Constants
        this.WINNINGSCORE = 9;
        this.RENDER_TIME = 10;  // Should be 10
        this.BUFFER_DELAY = 100;

        startCapturingInput(this.socket, this.playerName, {orientation: this.orientation});

        // Start listening for and processing Server Updates
        this.socket.addEventListener("message", onServerUpdate);
        this.serverUpdateClock = setTimeout(this.update, this.BUFFER_DELAY);

        this.renderer.startRenderingGame();
        
        // Get rid of unused button listeners AFTER 'gamestart':
        this.helpButton.removeClickListener();
        this.requeueButton.removeClickListener();
    }

    update(){
        let updatedState = getUpdatedState();
        let currentState = this.genConstants;

        if(updatedState){
            Object.keys(updatedState).forEach ( Newkey => {
                let updatedObj = updatedState[Newkey];
                updatedObj = {
                    x : updatedObj.x * (this.bounds.width / (1000 * this.aspectRatio)) + this.offsetX,
                    y : updatedObj.y * (this.bounds.height / 1000) + this.offsetY,
                    pts : updatedObj.pts,
                }
                
                Object.keys(updatedObj).forEach ( Propkey => {
                    currentState[Newkey][Propkey] = updatedObj[Propkey];
                });
            });
        }
        
        this.serverUpdateClock = setTimeout(this.update, this.RENDER_TIME);
    }

    endGame(){
        if(this.gameOver){ // Latch. Only do this once
            console.trace("Endgame called, but already exectued");
            return;
        }

        this.gameOver = true;

        let self = this;
        // Game Over Screen

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
    }

    requestEndGame(){
        this.socket.send("PG END");
    }

    onGameOver(callback){
        document.addEventListener("gameover", callback, {once: true});
        this.gameOverCB = callback;
    }

    removeGameOverListener(callback){
        let targetListener = callback || this.gameOverCB;

        document.removeEventListener("gameover", targetListener);
    }
}

export {PongClient as default};