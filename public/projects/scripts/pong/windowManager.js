//"use strict";

import {sendObjToPeer, sendToPeer, getDataChannel} from './networking.js';

let _role, _localBounds;
let resolve, reject;

const AbsoluteBounds = {
  width : 1000,
  height: 1000,
}
let windowConfig = {};

// Entrypoint
export function determineBounds(isCaller, localBounds){
  let dataChannel = getDataChannel();
  _role = isCaller;
  _localBounds = localBounds;
  
  return new Promise(function (res, rej) {
    resolve = res;  // Expose callbacks to Module Scope
    reject = rej;   // Resolves on Computing Window Bounds 
                    //  (under getBounds) w/ the Bounds, in pixels

    dataChannel.addEventListener('message', getBounds);

    if(!isCaller){  // Send Bounds to Host for Negotiation
      dataChannel.send(`BOUNDS ${JSON.stringify(localBounds)}`);
    }

  });
}

function getBounds(event){
  let message = event.data.split(' ');
  
  if(message[0] == "BOUNDS"){
    let receivedBounds = JSON.parse(message[1]); 
    let aspectRatio;

    if(_role){  // If we're the host, we've received Bounds.
      aspectRatio = computeAspectRatio(receivedBounds).width; // Otherwise, we received the Calculated Aspect Ratio
      sendToPeer(`BOUNDS ${JSON.stringify(aspectRatio)}`);
    } else {
      aspectRatio = receivedBounds;
    }

    let newBounds = {
      width : _localBounds.height * aspectRatio,
      height: _localBounds.height,
      aspectRatio : aspectRatio,
    }

    Object.assign(windowConfig, newBounds); // For external use
console.log(newBounds);
    this.removeEventListener('message', getBounds); // Remember: `This`, in this context, references the Emitter/DataChannel
    resolve(newBounds);
  }
}

function computeAspectRatio(remoteBounds){
  // Find the smallest Widths/Heights relative to their own Widths/Heights, send back the lowest
  let WindowBounds = [_localBounds, remoteBounds];
  let widths = [], heights = [];

  WindowBounds.forEach( (bounds) => {
    let absWidth = bounds.width/bounds.height; //Similar to Traditional Aspect Ratio (16:9) -> 16/9, etc.
    let absHeight = bounds.height/bounds.width;

    console.log("Width: " + absWidth, "\tHeight: " + absHeight);

    widths.push(absWidth);
    heights.push(absHeight);
  });

  return {
    width   : widths[0]  <= widths[1]  ? widths[0]  : widths[1],
    height  : heights[0] <= heights[1] ? heights[0] : heights[1],
  }  
}

export function addWindowConfig(params){
  Object.assign(windowConfig, params);
}
export function getWindowConfig(){
  return windowConfig;
}