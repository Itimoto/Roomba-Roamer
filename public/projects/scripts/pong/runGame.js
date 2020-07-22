import { getGameObjects } from './assets.js';
import { getWindowConfig } from './windowManager.js';
import { sendObjToPeer, getDataChannel, endGame } from './networking.js';
import { processStateUpdate, getUpdatedState } from './pongState.js';

let _role, isActive;
let update;
let tickClock, sendClock;

const WINNINGSCORE = 9;
const TICKTIME = 10;    // 10ms standard, per frame update

export function runGame(role){
    console.log(`Starting Game for Role: ${role}`);
    _role = role;

    prepareLocalObjects();
    if(_role) serveBall(); // Assigns isActive

    update = (isActive) ? activeUpdate : passiveUpdate;
    tickClock = setTimeout(update, TICKTIME);

    sendClock = setInterval(sendUpdates, 30);

    getDataChannel().addEventListener('message', processPeerUpdate);
}

export function stopGame(){
    clearTimeout(tickClock);
    clearInterval(sendClock);
    
    let dataChannel = getDataChannel();
    if(dataChannel)
        dataChannel.removeEventListener('message', processPeerUpdate);
}

function prepareLocalObjects(){
    // Apply the Proper Collision, etc. Methods
    let {leftGoal, rightGoal} = getGameObjects();
    leftGoal.onCollision = rightGoal.onCollision = scoreGoal;
}

function serveBall(){
    let {ball} = getGameObjects();
    let {width, aspectRatio} = getWindowConfig();
    
    ball.genXVel(5 * (width / (1000 * aspectRatio))); // Convert from the Standard / 'Absolute'
    isActive = (isMovingAway(ball.xVel)) ? false : true; 
}

export function processInput(input){
    console.log(`Processing for: ${getLocalPlayerLbl(_role)}`);
    let localPlayer = getGameObjects()[ getLocalPlayerLbl(_role) ];
    localPlayer.changeVel(input);
    // Let existing Send-Processes continue
}

//---- Update Processing ------
function activeUpdate(){
    let _tickTime = TICKTIME;

    // Get Local & Remote States...
    //let localState = tickGameState(true); // /Always/ update every object for Actives 
    let localState = getGameObjects();
    let remoteState = getUpdatedState();

    // Check 'if Active'
   // let ballVel = localState.ball.xVel;
   // isActive = (isMovingAway(ballVel)) ? false : true; 

    // Apply Remote Updates & Assist in Handoff, if applicable
    if(remoteState){        
        let remoteOpponent = remoteState[ getOtherPlayerLbl(_role) ];
        let localOpponent  = localState[ getOtherPlayerLbl(_role) ];
        console.log(remoteOpponent, localOpponent);
        // Apply x, y, pts. of Remote Player to Local State.
    //    applyRemoteState(remoteOpponent, localOpponent);
        let {height, offsetY} = getWindowConfig();
        localOpponent.y = remoteOpponent.y * (height / 1000) + offsetY || localOpponent.y;
        localOpponent.pts = remoteOpponent.pts || localOpponent.pts;

        // If Handoff in progress & Updates are available for processing...
        if(!isActive && remoteState.ball && false){ // Handoff: Active -> Passive
            console.log("Handing Off...");
            _tickTime *= 1.1; // Slow Local Ticks to allow Remote to catch up
            
            if(ballMatched(remoteState, localState)){
                console.log("Handoff complete.");
                update = passiveUpdate; // Switch modes
            }
        }
    }

    tickGameState(true);

    setTimeout(update, _tickTime); //Recurse, if applicable
}
function passiveUpdate(){
    let _tickTime = TICKTIME;

    // Get Local & Remote States...
    let localState = tickGameState(isActive); // /Always/ update every object for Actives 
    let remoteState = getUpdatedState();

    if(isActive && false){ // Handoff: Passive -> Active
        console.log("Handing Off...");
        _tickTime *= 0.9; // Speed up Tick to catch up.

        if(ballMatched(remoteState, localState)){
            console.log("Handoff complete.");
            update = activeUpdate;
        }

    } else if(remoteState) { // Default: Passive.
        applyRemoteState(remoteState, localState);
    }

    setTimeout(update, _tickTime); //Recurse, if applicable
}

function applyRemoteState(_remoteState, _localState){
    let remoteState = _remoteState || getUpdatedState();
    let localState  = _localState  || getGameObjects();
    let {width, height, aspectRatio, offsetX, offsetY} = getWindowConfig();

    if(remoteState){
        Object.keys(remoteState).forEach ( Newkey => {
            if(Newkey == getLocalPlayerLbl(_role)) 
                return; // Never apply remote definition of local player
            
            let updatedObj = remoteState[Newkey];
            /*
            updatedObj = {
                x : updatedObj.x * (width / (1000 * aspectRatio)) + offsetX,
                y : updatedObj.y * (height / 1000) + offsetY,
                xVel: updatedObj.xVel * (width / (1000 * aspectRatio)) + offsetX,
                yVel: updatedObj.yVel * (height / 1000) + offsetY,
                pts : updatedObj.pts,
            }
            */
            
            Object.keys(updatedObj).forEach ( Propkey => {
                //console.log(`Processing: ${Propkey} of ${Newkey} ${currentState[Newkey][Propkey]}`);
                let updatedProp = updatedObj[Propkey];
                
                if(Propkey.indexOf('x') != -1){         // Convert to Local X
                    updatedProp = updatedProp * (width / (1000 * aspectRatio)) + offsetX;
                } else if (Propkey.indexOf('y') != -1){ // Convert to Local Y
                    updatedProp = updatedProp * (height / 1000) + offsetY;
                }  
                //localState[Newkey][Propkey] = updatedObj[Propkey];
                localState[Newkey][Propkey] = updatedProp;
            });
        });
    }
}


//---- Game Simulation --------
function tickGameState(_isActive){
    let gameObjects = getGameObjects();

    if(_isActive){
        // Update/Run All Local Objects
        Object.keys(gameObjects).forEach( (key) => {
            let currObj = gameObjects[key];
            currObj.update();
    
            if(key != 'ball')
                checkCollision(gameObjects.ball, currObj);
            //console.log(`${key}: x: ${currObj.x}, y: ${currObj.y}, xVel: ${currObj.xVel}, yVel: ${currObj.yVel}`);
        });

    } else {
        // Update/Run /only/ the Local Paddle
        let localPlayer = gameObjects[ getLocalPlayerLbl(_role) ]; // Update just the one, if Passive
        localPlayer.update();
    }

    return gameObjects; // Return current state
}

//--
//  Mutating Function checking for collision between Ball and Rectangular Object
//  Affects the Ball's xVel & yVel as a result
//--
let checkCollision = function(ballObj, rectObj){
    let onCollision = (_ballObj) => {
        console.log("HIt!");
        rectObj.onCollision(_ballObj);
    }
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


//---- Service Methods: -------
// Check if a Ball is moving /away/ or /towards/ the current player
function isMovingAway(xVel){
    return ( (xVel < 0) == _role); // (+ => false) == 0, (- => true) == 1 
}
function getLocalPlayerLbl(_role){
    return `player${_role+1}`;//getGameObjects()[`player${_role+1}`];
}
function getOtherPlayerLbl(_role){
    return `player${ (!_role) ? 1 : 0}`;
}
function ballMatched(_remoteState, _localState){
    if(!_remoteState.ball || !_localState.ball)
        return;

    let _remoteComp = _remoteState.ball.x;
    let _localComp  = _localState.ball.x;
    let stateDifference = Math.abs(_remoteComp - _localComp);

    // If Ball-position Difference is in acceptable bounds...
    return (stateDifference <= 10) ? true : false;
}

//------------------------------------------------------
// Communication / Multiplayer Segment
function sendUpdates(){
    let {ball, player1, player2} = getGameObjects();

    let payload = {
        // Gamestate, converted to 'Absolute Bounds'
        state    : {
            ball    : {x: convertToAbsX(ball.x), y: convertToAbsY(ball.y), xVel: convertToAbsX(ball.xVel), yVel: convertToAbsY(ball.yVel)},
            player1 : {x: convertToAbsX(player1.x), y: convertToAbsY(player1.y), pts: player1.pts},
            player2 : {x: convertToAbsX(player2.x), y: convertToAbsY(player2.y), pts: player2.pts},
        
            time    : Date.now(), // Append date for interpolation
        },

        // The current Simulator-Role Assignment:
        simulator: (isActive) ? _role : !_role,
    };

    // Send it over
 //   console.log(payload);
    sendObjToPeer(payload);
}
/*
function sendPassiveUpdate(){
    let playerLabel = `player${_role+1}`; // 1 or 2
    let localPlayer = getGameObjects()[playerLabel];

    let payload = {
        playerLabel : {x: convertToAbsX(localPlayer.x), y: convertToAbsY(localPlayer.y), pts: localPlayer.pts}
    }

    sendObjToPeer(payload);
} */
function processPeerUpdate(event){
    //console.log("Got message: ", event.data);
    let peerUpdate;
    try {
        peerUpdate = JSON.parse(event.data);
    } catch (err) {
        console.log(`Error: ${err} with Server Update ${event.data}`);

        if(event.data.indexOf("END") != -1){
            console.log("Received Gameover. Closing Channel...");
            endGame();
        }

        return;
    }
    
    // Check for EndGame
    if(peerUpdate.end){
        console.log("Received Gameover. Closing Channel...");
        endGame();
        return;
    }

    // Update Simulator Role
    isActive = (peerUpdate.simulator == _role) ? true : false;
    //console.log(`isActive? ${isActive}`);

    // Push Remote Updates
    processStateUpdate(peerUpdate.state);
}

function convertToAbsX(localX){
    let {width, aspectRatio, offsetX} = getWindowConfig();
    return (localX - offsetX) / (width / (1000 * aspectRatio));
}
function convertToAbsY(localY){
    let {height, offsetY} = getWindowConfig();
    return (localY - offsetY) / (height / 1000);
} 