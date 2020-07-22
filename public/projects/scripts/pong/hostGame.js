//"use strict";

import { getGameObjects } from './assets.js';
import { getWindowConfig } from './windowManager.js';
import { sendObjToPeer, getDataChannel, endGame } from './networking.js';

let processClock, sendClock;
const PLAYERVELOCITY = 5;
const WINNINGSCORE = 9;

export function startHosting(){
    startRunningGame();
    sendClock = setInterval(sendUpdates, 30);

    document.addEventListener('visibilitychange', processGameVisibility); 

    getDataChannel().addEventListener('message', processInput);
}

export function stopHosting(){
    clearInterval(processClock);
    clearInterval(sendClock);

    document.removeEventListener('visibilitychange', processGameVisibility);

    let dataChannel = getDataChannel();
    if(dataChannel)
        dataChannel.removeEventListener('message', processInput);
}

function startRunningGame(){
    // Serve the ball, then start the Update loop
    let gameObjects = getGameObjects();
    let {width, aspectRatio, offsetX, height} = getWindowConfig();
    console.log(getWindowConfig());
    // Apply the Proper Collision, etc. Methods
    let {leftGoal, rightGoal, player1, player2} = gameObjects;
    leftGoal.onCollision = rightGoal.onCollision = scoreGoal;
    //player1.PLAYERVELOCITY = player2.PLAYERVELOCITY = height / 1000;//convertToAbsY(PLAYERVELOCITY);

    // Serve the Ball and gO!
    gameObjects.ball.genXVel(5 * (width / (1000 * aspectRatio))); // Convert from the Standard / 'Absolute'
    processClock = setInterval(update, 10);
}

function processGameVisibility(event){
    if(document.hidden){
        // Pause
        clearInterval(processClock);    // Pause, in the background
        clearInterval(sendClock);
    } else {
        // Resume
        processClock = setInterval(update, 10); // Resume in active tab
        sendClock = setInterval(sendUpdates, 30);
    }
}

export function update(){
    let gameObjects = getGameObjects();

    Object.keys(gameObjects).forEach( (key) => {
        let currObj = gameObjects[key];
        currObj.update();

        if(key != 'ball')
            checkCollision(gameObjects.ball, currObj);
        //console.log(`${key}: x: ${currObj.x}, y: ${currObj.y}, xVel: ${currObj.xVel}, yVel: ${currObj.yVel}`);
    });
}

//--
//  Mutating Function checking for collision between Ball and Rectangular Object
//  Affects the Ball's xVel & yVel as a result
//--
let checkCollision = function(ballObj, rectObj){
    let onCollision = rectObj.onCollision;
    let {x, y, radius} = ballObj;
    let rect = {
        top     : rectObj.y,
        bottom  : rectObj.y + rectObj.height,
        left    : rectObj.x,
        right   : rectObj.x + rectObj.width, 
    }

    if(rect.top <= y && y <= rect.bottom){
      if(Math.abs(x - rect.right) <= radius || Math.abs(x - rect.left) <= radius){  // Right-Side Collision
        onCollision(ballObj);
      }
      else if (Math.abs(x - rect.left) <= rectObj.width && Math.abs(x - rect.right) <= rectObj.width){
        onCollision(ballObj);
      }
      else if (rect.left <= x && x <= rect.right){  // 'Inside'
        onCollision(ballObj);
      }
    } 
}

//--
// Called when Ball hits Goal; Popped out here due to... erm... scoping issues.
//--
function scoreGoal(){
    //console.log("ggggoooooOOOOOOOOAAAALLLLLLLLLL");
    let {ball, player1, player2} = getGameObjects();
    let bounds = getWindowConfig();
        
    if(ball.x < 100){    // Hacky way of determining who the point goes to
        player2.pts++;
    } else {
        player1.pts++;
    }

    //ball.x = bounds.width/2;
    //ball.y = bounds.height/2;
    //ball.xVel = ball.yVel = 0;
    ball.reset();   // Re-place it to center

    if(player1.pts >= WINNINGSCORE || player2.pts >= WINNINGSCORE){
        // Reset Gamestate
        setTimeout(() => {
            player1.y = bounds.height/2 - player1.height/2;
            player2.y = player1.y;
            player1.pts = player2.pts = 0;

            sendUpdates({resetP2: true});

            ball.genXVel();
        }, 2000);
    } else {
        // Re-serve Ball
        setTimeout(() => {
            sendUpdates({resetP2: true});

            ball.genXVel();
        }, 700);
    }
}


//------------------------------------------------------
// Communication / Multiplayer Segment

function sendUpdates(opts){
    let {ball, player1, player2} = getGameObjects();

    // Convert to 'Absolute Bounds'
    let payload = {
        ball    : {x: convertToAbsX(ball.x), y: convertToAbsY(ball.y)},
        player1 : {x: convertToAbsX(player1.x), y: convertToAbsY(player1.y), pts: player1.pts},
        // player2 : {x: convertToAbsX(player2.x), y: convertToAbsY(player2.y), pts: player2.pts},

        time    : Date.now(), // Append date for Guest-side interpolation
    };

    if(opts && opts.resetP2){
        payload.player2 = {x: convertToAbsX(player2.x), y: convertToAbsY(player2.y), pts: player2.pts};
    }

    // Send over other
 //   console.log(payload);
    sendObjToPeer(payload);
}
function convertToAbsX(localX){
    let {width, aspectRatio, offsetX} = getWindowConfig();
    return (localX - offsetX) / (width / (1000 * aspectRatio));
}
function convertToAbsY(localY){
    let {height, offsetY} = getWindowConfig();
    return (localY - offsetY) / (height / 1000);
} 


export function processInput(event){
    let input, playerName;

    // If `event.data` present, it was received from Player 2 remotely
    //  Otherwise,`event` was called locally, by Player 1

    input       = (event.data) ? event.data  : event;   
    playerName  = (event.data) ? 'player2'   : 'player1';

    if(input == "END"){
        endGame();
        return;
    }

    let player = getGameObjects()[playerName];
    player.changeVel(input);
}