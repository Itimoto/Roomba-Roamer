//"use strict";

import { sendToPeer, endGame } from './networking.js';
//import { processInput } from './hostGame.js';
import { processInput } from './runGame.js';

let notPressed = {
    ArrowUp : true,
    ArrowDown : true,
}

let role, orientation; //playerName, socket;
let sendInput; // We switch between sending over the Network, or Keeping it local

// Modified from Original...
export function startCapturingInput(isCaller, opts){
    //socket = commSocket;
    //playerName = player;
    role = isCaller;
    orientation = opts.orientation || "wide";

    /*
    if(role){ //isCaller
        sendInput = processInput; // Send directly to Self
    } else {
        //sendInput = sendToPeer; // Send input to Peer otherwise
        sendInput = (direction) => {
            setTimeout( () => {
                processInput({data: direction});
            }, 100);
            sendToPeer(direction);
        }
    }
    */
    sendInput = processInput;

    document.addEventListener('touchstart', parseTouchStart);
    document.addEventListener('touchend', parseTouchEnd);

    document.addEventListener('keydown', parseKeyDown);
    document.addEventListener('keyup', parseKeyUp);
}

export function stopCapturingInput(){
    document.removeEventListener('touchstart', parseTouchStart);
    document.removeEventListener('touchend', parseTouchEnd);

    document.removeEventListener('keydown', parseKeyDown);
    document.removeEventListener('keyup', parseKeyUp);
}

//function sendInput(direction){
    //socket.send(`PG INPUT ${playerName} ${direction}`);
//}

// Touch Listeners

function parseTouchStart(event){
    let direction;
    
    if(orientation == "wide"){ // 'landscape'
        let yPos = event.touches[0].clientY;
        direction = (yPos <= window.innerHeight/2) ? "ArrowUp" : "ArrowDown";
    } else {    // 'portrait'
        let xPos = event.touches[0].clientX;
        direction = (xPos <= window.innerWidth/2) ? "ArrowUp" : "ArrowDown";
    }

    sendInput(direction);
}

function parseTouchEnd(event){
    sendInput("STOP");
}


// Keyboard Listeners

function parseKeyDown(event){
    if(notPressed[event.code]){
        notPressed[event.code] = false; // To prevent excessive, unnecessary request-sending
        sendInput(event.code);
    }

    if(event.code == "KeyZ"){
        endGame(); // for debug purposes only.
    }
}

function parseKeyUp(event){
    if(event.code == "ArrowUp" || event.code == "ArrowDown"){
        notPressed[event.code] = true;
        sendInput("STOP");
    }
}
