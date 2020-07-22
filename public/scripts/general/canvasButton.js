class Button {
    constructor(canvas, opts){
        this.canvas = canvas;
        this.canvasBounds = canvas.getBoundingClientRect();

        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.width  = opts.width  || 160;
        this.height = opts.height || 90;

        this.bgOFF      = opts.bgOFF    || "#525461";   // 'Purple-Grey'
        this.bgACTIVE   = opts.bgACTIVE || "#202336";   // 'Dark Blue'
        this.bgCLICKED  = opts.bgCLICKED|| "#709455";   // 'Green'
        this.bgColor    = this.bgOFF;    // By Default

        this.fontOFF    = opts.fontOFF  || "#aeb0b8";   // 'Red-Grey'
        this.fontACTIVE = opts.fontACTIVE  || "white";
        this.fontCLICKED= opts.fontCLICKED || this.fontACTIVE;
        this.font       = opts.font     || "Lato, Serifa, 'Times New Roman'";
        this.fontSize   = opts.fontSize || (this.width / 8) + "px"; 
        this.fontColor  = this.fontOFF; // By Default

        this.textOFF    = opts.textOFF    || "INACTIVE";
        this.textACTIVE = opts.textACTIVE || "START";
        this.text       = opts.text       || this.textOFF; // By Default

        this.isClicked  = false;
        this.onClicked  = this.onClicked.bind(this);
        //this.clickEvent = new Event('canvasbuttonclicked');

        this.callbacks = [];
    }

    /**
     * Add a single callback function to execute on Clicking
     * 
     * @callback callback -- Executed on Button-Click
     * @param opts -- `once` -- Remove once clicked
     */
    addClickListener(callback, opts){
        let cb = () => {
            callback();
            if(opts && opts.once){
                this.removeClickListener(cb);
            }
        }

        // Update UI
        this.bgColor = this.bgACTIVE;
        this.fontColor = this.fontACTIVE;
        this.text = this.textACTIVE;

        // Add Listeners
        this.canvas.addEventListener('mousedown', this.onClicked);
        //this.canvas.addEventListener('canvasbuttonclicked', cb);

        this.callbacks.push(cb);
    }

    /**
     * Removes a single `callback` function. If left blank, removes
     *  all Listeners attached to the Button
     * 
     * @callback callback -- The named-function to remove
     */
    removeClickListener(callback){
        this.canvas.removeEventListener('mousedown', this.onClicked);

        if(callback){
            //this.canvas.removeEventListener('canvasbuttonclicked', callback);
        } else {
            while(this.callbacks.length > 0){
                let cb = this.callbacks.pop();
                //this.canvas.removeEventListener('canvasbuttonclicked', cb);
            }
        }

        // Update UI:
        this.bgColor = this.bgOFF;
        this.fontColor = this.fontOFF;
    }

    onClicked(event) {
        if(event.clientX > this.x && event.clientX <= (this.x + this.width)){
            if(event.clientY > this.y && event.clientY <= (this.y + this.height)){
                //this.canvas.dispatchEvent(this.clickEvent);

                this.callbacks.forEach( (cb) => { cb() }); // Execute each callback

                // Update UI:
                this.bgColor = this.bgCLICKED;
                this.fontColor = this.fontCLICKED;
            }
        }
    }

    setUI(newState){
        if(newState == 'off'){
            this.bgColor = this.bgOFF;
            this.fontColor = this.fontOFF;
        }
        else if(newState == 'ready' || newState == 'active'){
            this.bgColor = this.bgACTIVE;
            this.fontColor = this.fontACTIVE;
        }
        else if(newState == 'clicked'){
            this.bgColor = this.bgCLICKED;
            this.fontColor = this.bgCLICKED;
        }
    }

    getCursorPos(event){
        return {
            x : (this.canvasBounds.left + this.width/2) - event.clientX,
            y : (this.canvas.top + this.height/2) - event.clientY,
        }
    }

    draw(canvasContext){
        canvasContext.fillStyle = this.bgColor;
        canvasContext.fillRect(this.x, this.y, this.width, this.height);

        canvasContext.fillStyle = this.fontColor;
        canvasContext.font = this.fontSize + " " + this.font; //Default: "40px 'Serif'"
        let textOffset = {
            x   : canvasContext.measureText(this.text).width,
            y   : parseInt(this.fontSize, 10),
        };
        //canvasContext.fillText(this.text, (this.x) + (this.width - textOffset.x)/2, this.y + (this.height + textOffset.y/2)/2); // For 'regular fonts'
        //canvasContext.fillText(this.text, (this.x) + (this.width - textOffset.x)/2, this.y + (this.height + textOffset.y/1.5)/2);
        canvasContext.fillText(this.text, (this.x) + (this.width - textOffset.x)/2, this.y + (this.height + textOffset.y/1)/2); // For use with 'Press Start 2P' Font
    }
}

export { Button as default };