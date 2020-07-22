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

        this.offsetX = (opts.offsets) ? ( opts.offsets.offsetX || 0 ) : 0;
        this.offsetY = (opts.offsets) ? ( opts.offsets.offsetY || 0 ) : 0;
        
        this.x += this.offsetX;
        this.y += this.offsetY;

        opts.bounds ? this.bounds = opts.bounds : null; // Allow objects to change sizes according to the Game's bounding rectangle / canvas        
        opts.objArr ? opts.objArr.push(this)    : null; // Push self to Object Manager for ease of use
        opts.isFlipped ? this.isFlipped = opts.isFlipped : this.isFlipped = false;  // Determine whether or not everything's flipped or not

        this.inboundsClock;

        setTimeout( () => {   // 'Save' the Base configuration after a single run through the event loop
            this.BASE = {       //  i.e. After Childrens Constructors have completed
                x : this.x,
                y : this.y,
            }
        }, 0);

        this.reset = this.reset.bind(this);
    }

    update() {
        //let allowedXVel = (this.isFlipped) ? this.yVel : this.xVel;
        //let allowedYVel = (this.isFlipped) ? this.xVel : this.yVel;

        let allowedXVel = this.xVel;
        let allowedYVel = this.yVel;

        if(!this.xVel && !this.yVel)
            return;

        if(this.bounds){
            let inbounds = 1;
            // Don't allow further movement into each direction
            // Moving Left, on Left Side
            if(this.xVel < 0 && (this.x - this.offsetX) < 0)
                allowedXVel = inbounds = 0;
            
            // Moving Right, on Right Side
            if(this.xVel > 0 && (this.x + this.width - this.offsetX) > this.bounds.width)
                allowedXVel = inbounds = 0;

            // Moving Down, on Bottom
            if(this.yVel < 0 && (this.y - this.offsetY) < 0)
                allowedYVel = inbounds = 0;

            // Moving Up, on Top
            if(this.yVel > 0 && (this.y + this.height - this.offsetY) > this.bounds.height)
                allowedYVel = inbounds = 0;

            // Return runaway balls
            if(!inbounds && !this.inboundsClock){ // Latch.
                this.inboundsClock = setTimeout(this.reset, 2500, {xVel: this.xVel, yVel: this.yVel}); // Note -- This /may/ interfere with the scoreGoal() under hostGame.js due to timing.
            
            } else if(this.inboundsClock){ // Detach if situation changes.
                clearTimeout(this.inboundsClock);
                this.inboundsClock = null;
            }
        }

        this.y += allowedYVel;
        this.x += allowedXVel;

        //console.log(`Velocities ${allowedXVel}, ${allowedYVel}`);
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

    reset(opts){    // Reset Position and Velocity to GameStart
        console.log("Resetting.");
        this.x = this.BASE.x;
        this.y = this.BASE.y;
        this.xVel = (opts) ? ( opts.xVel || 0 )  : 0;
        this.yVel = (opts) ? ( opts.yVel || 0 )  : 0; 
        
        if(this._reset)     // Execute necessary child Reset functions
            this._reset();
    }
/*
    convertToAbsolute(coord){
        let {width, aspectRatio, offsetX,  height, offsetY} = this;

        return {
            x: ( (coord.x - offsetX) / (width / (1000 * aspectRatio)) ) || null,
            y: ( (coord.y - offsetY) / (height / 1000) )                || null,
        };
    }
    */
}

export {GameObject as default};