class Joystick {
    /**
     * @param {canvas} canvas 
     * @callback  callback    - Returns cursor (x, y) when moved  
     */
    constructor(canvas, callback, opts){
      this.canvas = canvas;
      this.joyCanvas = canvas.getContext("2d");

      this.callback = callback;

      this.cursorPos = {
        x: 0,
        y: 0,
      }

      this.drawSelf = true;

      if(opts){
        if(opts.deferDrawing == true){
          this.drawSelf = false;
        }
      } else {
        opts = {};  // Don't throw no errors
      }

      let tmpBGRadius = opts.bgRadius   || this.canvas.width / 2;

      // Verify Sizes fit in the Canvas:
      let fitBGradius = (potentialRadius) => {
        if(this.canvas.height/2 < potentialRadius)
          return fitBGradius(potentialRadius - 5);

        return potentialRadius;
      }
      this.bgRadius   = fitBGradius(tmpBGRadius);
      
      this.smolRadius = opts.smolRadius || this.bgRadius / 2;
      this.bgColor    = opts.bgColor    || "#c7c4b3";//"#202336";
      this.smolColor  = opts.smolColor  || "#2c282b7c";//"#3b3d4d7c";

      this.drawEllipse        = this.drawEllipse.bind(this);
      this.drawBG             = this.drawBG.bind(this);
      this.process_touchStart = this.process_touchStart.bind(this);
      this.process_touchEnd   = this.process_touchEnd.bind(this);
      this.updateJoystick     = this.updateJoystick.bind(this);
      this.getCursorPos       = this.getCursorPos.bind(this);
      this.draw               = this.draw.bind(this);
      this.end                = this.end.bind(this);

      this.canvas.addEventListener('touchstart', this.process_touchStart);
    }

    // Jumpstarts the whole 'get cursor, update screen, update necessary methods' cycle
    process_touchStart(evt) {
      //console.log("Touched");
      evt.preventDefault(); // Prevents mobile from scrolling
      this.updateJoystick(evt);

      this.canvas.addEventListener('touchmove', this.updateJoystick);
      this.canvas.addEventListener('touchend', this.process_touchEnd);
    }

    // Centers Joystick after Letting Go
    process_touchEnd(evt) {
      evt.preventDefault(); // Prevents mobile from scrolling
      this.cursorPos = { x: 0, y: 0}; // Reset x & y to throw the joystick back
      this.updateJoystick();
    }

    // Service Method; Returns a new Object w/ the Cursor's 'X' and 'Y'
    getCursorPos(evt) {
      var canvasBounds = this.canvas.getBoundingClientRect(); // Get bounds relative to Client Viewport
      return {
        x : (canvasBounds.left + (this.canvas.width/2)) - evt.touches[0].clientX,
        y : (canvasBounds.top + (this.canvas.height/2)) - evt.touches[0].clientY,
      }
    }

    // Updates Joystick Image (moves the Little Circle) and Sends out necessary values to the Pi
    updateJoystick(evt) {
      if(evt) { // ~Only~ Executed on TouchStart & TouchMove; we don't send out updates to the Pi when we let go. WAIT! No, that was wrong
        this.cursorPos = this.getCursorPos(evt);
        //console.log(this.cursorPos);
      }

      this.callback(this.cursorPos.x, this.cursorPos.y);

      if(this.drawSelf){
        window.requestAnimationFrame(this.draw); // So as to prevent blocking
      }
    }

    draw() {
      if(this.drawSelf)
        this.joyCanvas.clearRect(0, 0, this.canvas.width, this.canvas.height);
      // Otherwise, drawing's been deferred to external program
      this.drawBG();
      this.drawEllipse(this.cursorPos.x, this.cursorPos.y, this.smolRadius, this.smolColor);
    }

    // Service Method for simplifying the process of drawing cirles
    drawEllipse(centerX, centerY, radius, color) {
      var xPos = (this.canvas.width/2) - centerX;
      var yPos = (this.canvas.height/2) - centerY;

      this.joyCanvas.beginPath();
      this.joyCanvas.arc(xPos, yPos, radius, 0, 2*Math.PI);
      this.joyCanvas.fillStyle = color;
      this.joyCanvas.fill();
    }
    
    // Draw the Background Ellipse (The 'Big' One)
    drawBG() {
      this.drawEllipse(0, 0, this.bgRadius, this.bgColor);
    }

    end() {
      this.canvas.removeEventListener('touchstart', this.process_touchStart);
      this.canvas.removeEventListener('touchmove', this.updateJoystick);
      this.canvas.removeEventListener('touchend', this.process_touchEnd);
    }
}

export { Joystick as default};