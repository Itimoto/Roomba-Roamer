/**
 * Returns an Object containing each named GameObject,
 *  Plus an Array of Game Objects for Iteratable Freedom!
 * 
 * @param {width: num, height: num} bounds -- Bounding Rectangle; We Generate Object Sizes Around It
 */
import GameObject   from './pongGameObject.js';
import Goal         from './pongGoal.js';
import Player       from './pongPlayer.js';
import Ball         from './pongBall.js';

function initGameConstants (bounds){
    let objExports = {
        //... (We add the rest of our /named/ objects & objArr[] to this)
    };

    let gameObjects  = [];
      
    objExports.ball = new Ball({
      bounds  : bounds,  
      objArr  : gameObjects,
    });

    objExports.topBound = new GameObject({
      x   : 0, 
      y   : -100, 
      width   : bounds.width,
      height  : 100,          //Height is increased to catch most runaway balls
      color   : "#00000000",  //Keep it transparent
      objArr  : gameObjects,
    });
    objExports.botBound = new GameObject({
      x   : 0, 
      y   : bounds.height, 
      width   : bounds.width, 
      height  : 100,
      objArr  : gameObjects,
    });

    objExports.leftGoal = new Goal({
      bounds  : bounds,
      objArr  : gameObjects,
    });
    objExports.rightGoal = new Goal({
      x: bounds.width - objExports.leftGoal.width,
      bounds  : bounds,
      objArr  : gameObjects,
    });

    objExports.player1 = new Player({
      x: 0 + objExports.leftGoal.width + bounds.height/20, 
        y: 0 + (bounds.height/2 - bounds.height/6),  // Halfway down, offset to middle of the paddle
      bounds: bounds,
      objArr: gameObjects,
    });

    objExports.player2 = new Player({
      x: (bounds.width - objExports.player1.width) - objExports.rightGoal.width - objExports.player1.width, // Offset by current width from border, offset from goal, offset from goal by own width
        y: 0 + (bounds.height/2 - objExports.player1.height/2),
      bounds: bounds,
      objArr: gameObjects,
    });

    //objExports.leftGoal.onCollision = objExports.rightGoal.onCollision = objExports.scoreGoal;  // Needs to be put after the binds to conserve the `this`

    objExports.gameObjects = gameObjects;

    return objExports;
}

export {initGameConstants as default};