import GameObject   from './pongGameObject.js';
import Goal         from './pongGoal.js';
import Player       from './pongPlayer.js';
import Ball         from './pongBall.js';

//import Button       from './canvasButton.js';

const WINNINGSCORE  = 9;

class LocalPongGame {
    constructor(canvas){
      this.canvas = canvas;
      this.gameCanvas = canvas.getContext("2d");
      this.gameCanvas.imageSmoothingEnabled = false;

      this.gameObjects  = [];
      
      this.ball = new Ball({
        bounds  : canvas,  
        objArr  : this.gameObjects,
      });
      this.ball.genXVel(2.5);

      this.topBound = new GameObject({
        x   : 0, 
        y   : -100, 
        width   : canvas.width,
        height  : 100,          //Height is increased to catch most runaway balls
        color   : "#00000000",  //Keep it transparent
        objArr  : this.gameObjects,
      });
      this.botBound = new GameObject({
        x   : 0, 
        y   : canvas.height, 
        width   : canvas.width, 
        height  : 100,
        objArr  : this.gameObjects,
      });

      this.leftGoal = new Goal({
        bounds  : canvas,
        objArr  : this.gameObjects,
      });
      this.rightGoal = new Goal({
        x: canvas.width - this.leftGoal.width,
        bounds  : canvas,
        objArr  : this.gameObjects,
      });

      this.player1 = new Player({
        x: 0 + this.leftGoal.width + canvas.height/20, 
          y: 0 + (this.canvas.height/2 - canvas.height/6),  // Halfway down, offset to middle of the paddle
        bounds: canvas,
        objArr: this.gameObjects,
      });

      this.player2 = new Player({
        x: (canvas.width - this.player1.width) - this.rightGoal.width - this.player1.width, // Offset by current width from border, offset from goal, offset from goal by own width
          y: 0 + (this.canvas.height/2 - this.player1.height/2),
        bounds: canvas,
        objArr: this.gameObjects,
      });

      this.update           = this.update.bind(this);
      this.checkCollision   = this.checkCollision.bind(this);
      this.scoreGoal        = this.scoreGoal.bind(this);
      this.changePlayerVel  = this.changePlayerVel.bind(this);
      this.draw             = this.draw.bind(this);

      this.leftGoal.onCollision = this.rightGoal.onCollision = this.scoreGoal;  // Needs to be put after the binds to conserve the `this`

      this.gameObjects.forEach((obj) => {
        console.log(obj);
      });

      this.update();
    }

    update(){
      this.gameObjects.forEach( (obj) => {
          obj.update();

          if(obj != this.ball)
            this.checkCollision(this.ball, obj);
      });

      window.requestAnimationFrame(this.draw);
      this.clock = setTimeout(this.update);  // Expose the Clock and recurse
    }

    checkCollision(ballObj, rectObj){
      let rectBounds = [rectObj.x, rectObj.x + rectObj.width, rectObj.y, rectObj.y + rectObj.height]; // Left, Right, Top, Bottom
      let onCollision = rectObj.onCollision;

      if(ballObj.y >= rectBounds[2] && ballObj.y <= rectBounds[3]){
        if(Math.abs(ballObj.x - rectBounds[1]) <= ballObj.radius || Math.abs(ballObj.x - rectBounds[0]) <= ballObj.radius){  // Right-Side Collision
          onCollision(ballObj);
        }
        else if (Math.abs(ballObj.x - rectBounds[0]) <= rectObj.width && Math.abs(ballObj.x - rectBounds[1]) <= rectObj.width){
          onCollision(ballObj);
        }
      } 
    }

    scoreGoal(ballObj){
      //console.log("ggggoooooOOOOOOOOAAAALLLLLLLLLL");
      var self = this;
      if(ballObj.x < 100){    // Hacky way of determining who the point goes to
        self.player2.pts++;
      } else {
        self.player1.pts++;
      }

      ballObj.x = self.canvas.width/2;
      ballObj.y = self.canvas.height/2;
      ballObj.xVel = ballObj.yVel = 0;

      if(self.player1.pts >= WINNINGSCORE || self.player2.pts >= WINNINGSCORE){
        setTimeout(() => {
          self.player1.y = self.canvas.height/2 - self.player1.height/2;
          self.player2.y = self.player1.y;
          self.player1.pts = self.player2.pts = 0;
          ballObj.genXVel();
        }, 2000);
      } else {
        setTimeout(() => {
          ballObj.genXVel();
        }, 700);
      }
    }

    changePlayerVel(playerID, direction){
      if(playerID == "player1"){
        this.player1.changeVel(direction);
      }
      else if(playerID == "player2"){
        this.player2.changeVel(direction);
      }
    }

    draw(){
      // Background
      this.gameCanvas.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.gameCanvas.fillStyle = "black";
      this.gameCanvas.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawScore(this.player1.pts, this.player2.pts, this.canvas.width/2, this.canvas.height/6, this.gameCanvas);

      this.gameObjects.forEach((gameObject) => {
          gameObject.draw(this.gameCanvas);
      });
    }

    drawScore(p1Score, p2Score, xPos, yPos, canvas){
      canvas.fillStyle = "white";
      canvas.font = "40px 'Press Start 2P'";
      canvas.fillText(p1Score, xPos - 60, yPos);
      canvas.fillText(p2Score, xPos + 25, yPos);
      canvas.fillRect(xPos, 0, 2, 1000);
      
      if(p1Score >= WINNINGSCORE){
        canvas.fillText("P1 Wins!", xPos - this.canvas.width/2.5, yPos*3 + 20);
      }
      if(p2Score >= WINNINGSCORE){
        canvas.fillText("P2 Wins!", xPos + this.canvas.width/20, yPos*3 + 20)
      }
    }
}

export { LocalPongGame as default };