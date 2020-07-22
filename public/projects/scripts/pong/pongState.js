//"use strict";

import { endGame } from './networking.js';

let serverUpdates = [];

let time_serverStart, time_localStart = 0;
const RENDER_TIME = 10;
const BUFFER_DELAY = 100;

export function processStateUpdate(currentUpdate){
    serverUpdates.push(currentUpdate);

    if(!time_serverStart){
        time_serverStart = currentUpdate.time;
        time_localStart = Date.now();
    }

    // Get rid of any updates prior to the 'Current' Server Time rel. to the delay
    let baseIndex = getBaseUpdate();
    if(baseIndex > 0){
        serverUpdates.splice(0, baseIndex);
    } 
}

// Kept here for Legacy. This will be removed.
export function onHostUpdate(event){
    // Parse Game-Component Updates from the Server; Copy 'em over,
    //  let next Update() cycle take care of the rest
    let serverUpdate;
    try {
        serverUpdate = JSON.parse(event.data); // {ball {x, y}, p1 {x, y, pts}, p2{}, time}
    } catch (err) {
        console.log(`Error: ${err} with Server Update ${event.data}`);

        if(event.data.indexOf("END") != -1){
            console.log("Received Gameover. Closing Channel...");
            endGame();
        }

        return;
    } 

    /*
    if(serverUpdate.end){
        console.log("Received Gameover. Closing Channel...");
        endGame();   // `This` namespace refers to _dataChannel
        return;         //   Closing it triggers internal processes that end the game
    }
    */

    //this.serverUpdates.push(serverUpdate.gameObjects);
    let currentUpdate = serverUpdate;

    //    this.genConstants.player1.pts = currentUpdate.player1.pts;
    //    this.genConstants.player2.pts = currentUpdate.player2.pts;

    serverUpdates.push(currentUpdate);

    // Start the ServerProcessing Script:
    //  if(!this.serverUpdateClock){
    //   this.serverUpdateClock = setTimeout(this.update, 100);
    //  }

    if(!time_serverStart){
        time_serverStart = currentUpdate.time;
        time_localStart = Date.now();
    }

    // Get rid of any updates prior to the 'Current' Server Time rel. to the delay
    let baseIndex = getBaseUpdate();
    if(baseIndex > 0){
        serverUpdates.splice(0, baseIndex);
    }  
}

// Return the Index of the Base Update -- the first Server Update 
// before the 'Current' Server Time (rel. to the Buffer_Delay)
function getBaseUpdate(){
    let serverTime = getEquivServerTime();
    for(let i = serverUpdates.length-1; i >= 0; i--){
        if(serverUpdates[i].time <= serverTime){
            return i;
        }
    }
    return -1;  // Sentinel; N/A
}

function getEquivServerTime(){
    return time_serverStart + (Date.now() - time_localStart) - BUFFER_DELAY;
}

export function getUpdatedState(){
    if(!time_serverStart){
        return;
    }

    let baseIndex = getBaseUpdate();
    let serverTime = getEquivServerTime();

    if(baseIndex < 0 || baseIndex === serverUpdates.length-1){
        let {time, ...baseUpdate} = serverUpdates[length-1] || {}; // Copy all properties /except/ for `time` from most recent state w/ spread syntax...
       // if(serverUpdates.length){
       //     let {time, ...baseUpdate} = serverUpdates[length-1];
       //     return baseUpdate;
       // }

        return baseUpdate;    // Return the most recent update
    } else {
        let {time, ...baseUpdate} = serverUpdates[baseIndex];
        let nextUpdate = serverUpdates[baseIndex+1];
        let ratio = (serverTime - time) / (nextUpdate.time - time); // 1/5 of the way from 'base' to 'current', 2/5, 4/7, etc...

        let updatedState = {};
        /*
        baseUpdate = {
            ball: baseUpdate.ball, 
            player1 : baseUpdate.player1, 
            player2 : baseUpdate.player2,
        };
        */
        Object.keys(baseUpdate).forEach( Objkey => {            
            let baseObj = baseUpdate[Objkey];
            let nextObj = nextUpdate[Objkey] || baseObj;
            let interpolatedObj = {};

            Object.keys(baseObj).forEach( Propkey => {
                //interpolatedObj[Propkey] = baseObj[Propkey] + (nextUpdate[Objkey][Propkey] - baseObj[Propkey]) * ratio;
                interpolatedObj[Propkey] = baseObj[Propkey] + (nextObj[Propkey] - baseObj[Propkey]) * ratio;
            });

            updatedState[Objkey] = interpolatedObj;
        });

        updatedState.player1.pts = baseUpdate.player1.pts;
        
        if(updatedState.player2)
            updatedState.player2.pts = baseUpdate.player2.pts;
        //console.log(updatedState);
        return updatedState;
    }
}

export function clearTimestamps(){
    time_localStart = time_serverStart = 0;
    serverUpdates = [];
}