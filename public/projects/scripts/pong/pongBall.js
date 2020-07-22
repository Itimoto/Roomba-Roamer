import GameObject from './pongGameObject.js';

class Ball extends GameObject {
    constructor(opts){
        super(opts);

        (opts.radius) ? this.radius = opts.radius : this.radius = 30;
        (opts.maxVel) ? this.maxVel = opts.maxVel : this.maxVel = 3;

        // Center the ball if given the bounding rectangle
        if(this.bounds){
            this.x = this.bounds.width / 2;
            this.y = this.bounds.height / 2;
            this.radius = this.bounds.height / 50;
        }
    }

    draw(canvasContext){
        canvasContext.beginPath();
        if(!this.isFlipped){
            canvasContext.arc(this.x, this.y, this.radius, 0, 2*Math.PI);
        } else {
            canvasContext.arc(this.y, this.x, this.radius, 0, 2*Math.PI);
        }
        canvasContext.fillStyle = this.color;
        canvasContext.fill();
    }

    /**
     * 
     * @param {number} speedRange - Dicates the Range of Velocities the Ball can generate
     */
    genXVel(speedRange){
        (speedRange) ? this.maxVel = speedRange : null;
        this.xVel =  this.maxVel * (2 - (4*Math.round(Math.random())));
    }
}

export {Ball as default};