//"use strict";

import { getDataChannel } from './networking.js';
import { getGameObjects } from './assets.js';;
import { getWindowConfig } from './windowManager.js';
import { onHostUpdate, getUpdatedState } from './pongState.js';
import { update as predictUpdate } from './hostGame.js';

const BUFFER_DELAY = 100;
const RENDER_TIME = 10;
let hostUpdateClock;

export function startGameListening(){
    const dataChannel = getDataChannel();

    dataChannel.addEventListener("message", onHostUpdate);
    hostUpdateClock = setTimeout(updateLocal, BUFFER_DELAY);//setInterval(updateLocal, BUFFER_DELAY);
}

export function stopGameListening(){
    const dataChannel = getDataChannel();
    
    if(dataChannel)
        dataChannel.removeEventListener("message", onHostUpdate);
    //clearTimestamps();
    clearTimeout(hostUpdateClock);//clearInterval(hostUpdateClock);
}

function updateLocal(){
    let updatedState = getUpdatedState();
    let currentState = getGameObjects();
    let {width, height, aspectRatio, offsetX, offsetY} = getWindowConfig(); 

    if(updatedState){
        Object.keys(updatedState).forEach ( Newkey => {
            if(Newkey == "player2" && updatedState[Newkey].pts == currentState[Newkey].pts && updatedState.player1.pts == currentState.player1.pts) 
                return; // Prevent Jitter in the edgecase
            
            let updatedObj = updatedState[Newkey];
            updatedObj = {
                x : updatedObj.x * (width / (1000 * aspectRatio)) + offsetX,
                y : updatedObj.y * (height / 1000) + offsetY,
                pts : updatedObj.pts,
            }
            
            Object.keys(updatedObj).forEach ( Propkey => {
                //console.log(`Processing: ${Propkey} of ${Newkey} ${currentState[Newkey][Propkey]}`);
                currentState[Newkey][Propkey] = updatedObj[Propkey];
            });
           // console.log(currentState[Newkey]);
        });
    }

    currentState.player2.update();  // Update the Local Player no matter what.
    
    hostUpdateClock = setTimeout(updateLocal, RENDER_TIME);  
}