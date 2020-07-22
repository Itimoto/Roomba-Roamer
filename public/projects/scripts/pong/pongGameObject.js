class GameObject {

    constructor(opts) {
        (opts.x) ? this.x = opts.x : this.x = 0;
        /**
         * ^^^ Conditional Operator / If/Then Shortcut
         * Logically equivalent to:
         * if(opts.x){
         *  this.x = opts.x;
         * } else {
         *  this.x = 0;
         * }
         */
        (opts.y)    ? this.y = opts.y           : this.y = 0;
        opts.width  ? this.width = opts.width   : this.width = 0;
        opts.height ? this.height = opts.height : this.height = 0;
        opts.color  ? this.color = opts.color   : this.color = "white";
        opts.xVel   ? this.xVel = opts.xVel     : this.xVel = 0;
        opts.yVel   ? this.yVel = opts.yVel     : this.yVel = 0;

        this.BASE = {
            x: this.x,
            y: this.y,
        }

        opts.bounds ? this.bounds = opts.bounds : null; // Allow objects to change sizes according to the Game's bounding rectangle / canvas        
        opts.objArr ? opts.objArr.push(this)    : null; // Push self to Object Manager for ease of use
        opts.isFlipped ? this.isFlipped = opts.isFlipped : this.isFlipped = false;  // Determine whether or not everything's flipped or not
    }

    update() {
        let allowedXVel = (this.isFlipped) ? this.yVel : this.xVel;
        let allowedYVel = (this.isFlipped) ? this.xVel : this.yVel;

        if(this.bounds){
            // Don't allow further movement into each direction
            if(this.xVel < 0 && this.x < 0)
                allowedXVel = 0;
            
            if(this.xVel > 0 && (this.x + this.width) > this.bounds.width)
                allowedXVel = 0;

            if(this.yVel < 0 && this.y < 0)
                allowedYVel = 0;

            if(this.yVel > 0 && (this.y + this.height) > this.bounds.height)
                allowedYVel = 0;
        }

        this.y += allowedYVel;
        this.x += allowedXVel;
    }

    draw(canvasContext) {   // Default Drawing: Rectangle
        canvasContext.fillStyle = this.color;
        if(!this.isFlipped){
            canvasContext.fillRect(this.x, this.y, this.width, this.height);
        } else {
            canvasContext.fillRect(this.y, this.x, this.height, this.width);
        }
    }

    onCollision(Ball){      // Default Collision: With Ceiling/Wall
        Ball.yVel *= -1;
    }

}

export {GameObject as default};