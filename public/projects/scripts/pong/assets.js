//"use strict";

/**
 * Returns an Object containing each named GameObject,
 *  Plus an Array of Game Objects for Iteratable Freedom!
 * 
 * @param {width: num, height: num} bounds -- Bounding Rectangle; We Generate Object Sizes Around It
 */
import GameObject   from './assets/pongGameObject.js';
import Goal         from './assets/pongGoal.js';
import Player       from './assets/pongPlayer.js';
import Ball         from './assets/pongBall.js';

let _gameObjects;

export function initGameConstants (bounds, offsets){
    let objExports = {
        //... (We add the rest of our /named/ objects & objArr[] to this)
    };

    //let gameObjects  = [];
    // In this context, 'bounds' represent the overall width/height of the drawing canvas
    //  Offsets, however, represent how far-off the Bounds are from the 'true' position (offset from Origin)
      
    objExports.ball = new Ball({
      bounds  : bounds,
      offsets : offsets,  
      //objArr  : gameObjects,
    });

    objExports.topBound = new GameObject({
      x   : 0, 
      y   : -100, 
      width   : bounds.width,
      height  : 100,          //Height is increased to catch most runaway balls
      color   : "#00000000",  //Keep it transparent
      //objArr  : gameObjects,
    });
    objExports.botBound = new GameObject({
      x   : 0, 
      y   : bounds.height, 
      width   : bounds.width, 
      height  : 100,
      //objArr  : gameObjects,
    });

    objExports.leftGoal = new Goal({
      bounds  : bounds,
      offsets : offsets,
      //objArr  : gameObjects,
    });
    objExports.rightGoal = new Goal({
      x: bounds.width - objExports.leftGoal.width,
      bounds  : bounds,
      offsets : offsets,
      //objArr  : gameObjects,
    });

    objExports.player1 = new Player({
      x: 0 + objExports.leftGoal.width + bounds.height/20, 
        y: 0 + (bounds.height/2 - bounds.height/6),  // Halfway down, offset to middle of the paddle
      bounds: bounds,
      offsets: offsets,
      //objArr: gameObjects,
    });

    objExports.player2 = new Player({
      x: (bounds.width - objExports.player1.width) - objExports.rightGoal.width - objExports.player1.width, // Offset by current width from border, offset from goal, offset from goal by own width
        y: 0 + (bounds.height/2 - objExports.player1.height/2),
      bounds: bounds,
      offsets: offsets,
      //objArr: gameObjects,
    });

    //objExports.leftGoal.onCollision = objExports.rightGoal.onCollision = objExports.scoreGoal;  // Needs to be put after the binds to conserve the `this`

    // Remember: 'gameObjects' is an iterable Array, /not/ a named property
    //objExports.gameObjects = gameObjects;

    _gameObjects = objExports;

    return objExports;
}

export function getGameObjects (){
  return _gameObjects;
}