const QuickCommands = {
  /**
   * Sends a quick 'refresh' to the Roomba; Re-sets communication
   */  
  get refresh() {
    let payloadBuffer = new ArrayBuffer(2);

    let payloadDataView = new DataView(payloadBuffer);
    let opcodeSTART = 128;  // opcode-Drive for Roomba; used here in part for command validation
    let opcodeSAFE = 131;
    
    payloadDataView.setInt8(0, opcodeSTART);
    payloadDataView.setInt8(1, opcodeSAFE);
    
    return payloadBuffer;
  },
}

const WheelVelocity = {
    _commWS     : null,
    _tolerance  : 20,

    _rightCurr  : 0,
    _rightTarg  : 0,

    _leftCurr   : 0,
    _leftTarg   : 0,

    /**
     * 'Moves' the _current Values to their Target Velocity Values for the Roomba
     * 
     * @param {int} rightTarget The target velocity for the right wheel
     * @param {int} leftTarget  The target velocity for the left wheel
     * 
    */
    setTarget  : function(rightTarget, leftTarget){
      if(rightTarget == "MATCH"){     // If we're turning/letting go of a turn, we'll want to match
        rightTarget = this._leftTarg;
      } 
      else if(leftTarget == "MATCH"){
        leftTarget = this._rightTarg;
      }

      if(rightTarget != null) { this._rightTarg = rightTarget };  // we're only checking for null b/c '0' is considered false...
      if(leftTarget != null) {  this._leftTarg  = leftTarget };

      this.easeRight(); // Start the cycle
    },

    easeRight : function() {
      let self = WheelVelocity;
      
      if(Math.abs(self._rightCurr - self._rightTarg) <= self._tolerance){
        self._rightCurr = self._rightTarg;  // Tie-up loose ends
      } else {
        let interval = Math.ceil((self._rightTarg - self._rightCurr) / 4); // Step forward by half
        self._rightCurr = self._rightCurr + interval;
      }

      self.easeLeft();
    },

    easeLeft  : function() {      
      if(Math.abs(this._leftCurr - this._leftTarg) <= this._tolerance){
        this._leftCurr = this._leftTarg;  // Tie-up loose ends
      } else {
        let interval = Math.ceil((this._leftTarg - this._leftCurr) / 4);

        this._leftCurr = Math.floor(this._leftCurr + interval);
      }

      this.sendPayload();
    },

    sendPayload  : function() {
      let payloadBuffer = this.createRoombaPayload(this._rightCurr, this._leftCurr);

      console.log("Leftie: " + this._leftCurr + "\tRightie: " + this._rightCurr);
      
      if(this._commWS.readyState == WebSocket.OPEN)
        this._commWS.send(payloadBuffer);

      if(this._rightCurr == this._rightTarg && this._leftCurr == this._leftTarg)  // Break out when both are at target values
        return;
      
      setTimeout(this.easeRight, 30); // Start the cycle again
    },

    /**
     * Friendly Neighborhood Binary Packager.
     * Converts two Decimal values into a single binary Buffer 
     * 
     * @param {*} leftVel   - Left Wheel Velocity
     * @param {*} rightVel  - Right Wheel Velocity
     */
    createRoombaPayload : function(leftVel, rightVel) {
      let payloadBuffer = new ArrayBuffer(5);
      let payloadDataView = new DataView(payloadBuffer);
      let opcodeDRIVE = 145;  // opcode-Drive for Roomba; used here in part for command validation
      payloadDataView.setInt8(0, opcodeDRIVE);

      payloadDataView.setInt16(1, rightVel);
      payloadDataView.setInt16(3, leftVel);

      return payloadBuffer;
    },
}


class RoombaController {
  constructor(commSocket){
    WheelVelocity._commWS = commSocket;

    this.speedInterval = 180;
    this.turnInterval = 80;

    this.notPressed = {
      W : true,
      S : true,
      A : true,
      D : true,

      R : true,
    };

    this.parseKeyDown = this.parseKeyDown.bind(this);
    this.parseKeyUp   = this.parseKeyUp.bind(this);
  }

  startCapturingInput(){
    document.addEventListener('keydown', this.parseKeyDown);
    document.addEventListener('keyup', this.parseKeyUp);
  }

  stopCapturingInput(){
    document.removeEventListener('keydown', this.parseKeyDown);
    document.removeEventListener('keyup', this.parseKeyUp);
  }

  parseKeyDown(evt){
    let speedInterval = this.speedInterval;
    let turnInterval  = this.turnInterval;
    let notPressed    = this.notPressed;

    if(evt.code == "KeyX"){
      //commWS.send("Pi " + evt.code);  // Panic button
      WheelVelocity.setTarget(0, 0);
    }
    if(evt.code == "KeyR" && notPressed.R){
      WheelVelocity._commWS.send(QuickCommands.refresh);
    }

    if(evt.shiftKey){
      speedInterval = 400;
      turnInterval = 100;
    }

    if(evt.code == "KeyW" && notPressed.W){
      notPressed.W = false;
      WheelVelocity.setTarget(WheelVelocity._rightTarg + speedInterval, WheelVelocity._leftTarg + speedInterval);
    }
    if(evt.code == "KeyS" && notPressed.S){
      notPressed.S = false;
      WheelVelocity.setTarget(WheelVelocity._rightTarg - speedInterval, WheelVelocity._leftTarg - speedInterval);
    }
    if(evt.code == "KeyA" && notPressed.A){
      notPressed.A = false;
      WheelVelocity.setTarget(WheelVelocity._rightTarg - turnInterval, WheelVelocity._leftTarg + turnInterval);
    }
    if(evt.code == "KeyD" && notPressed.D){
      notPressed.D = false;
      WheelVelocity.setTarget(WheelVelocity._rightTarg + turnInterval, WheelVelocity._leftTarg - turnInterval);
    }
  }

  parseKeyUp(evt){
    let notPressed = this.notPressed;

    if(evt.code == "KeyX"){
      //commWS.send("Pi STOP " + evt.code); // Panic button
      WheelVelocity.setTarget(0, 0);
    }
    
    if(evt.code == "KeyW" || evt.code == "KeyS"){
      let turningOffset = this.speedInterval;  // Stores amount by which to keep a 'turn' in place

      if(evt.code == "KeyW"){
        notPressed.W = true;
      }
      else if(evt.code == "KeyS"){
        notPressed.S = true;
        turningOffset *= -1;
      }

      if(!notPressed.A){ // readibility ftw;  (if either of the keys are pressed down already)
        WheelVelocity.setTarget(WheelVelocity._rightTarg - turningOffset, WheelVelocity._leftTarg - turningOffset);  // i.e. [On KeyDown] (100, (100-100)) => [Target] (100, 0) => [On KeyUp] (0, (0 + -100)) => [Target] (0, -100)
      }
      else if (!notPressed.D){
        WheelVelocity.setTarget(WheelVelocity._rightTarg - turningOffset, WheelVelocity._leftTarg - turningOffset);
      }
      else {  // Nothin' been pressed down at the moment
        WheelVelocity.setTarget(0, 0);
      }
    }
    else if(evt.code == "KeyA"){
      notPressed.A = true;
      WheelVelocity.setTarget(WheelVelocity._rightTarg + this.turnInterval, WheelVelocity._leftTarg - this.turnInterval);
    }
    else if (evt.code == "KeyD"){
      notPressed.D = true;
      WheelVelocity.setTarget(WheelVelocity._rightTarg - this.turnInterval, WheelVelocity._leftTarg + this.turnInterval); // 'null' leaves the original target unchanged
    }
  }

  relay_setTarget(rightTarget, leftTarget){   // For external scripts to use
    WheelVelocity.setTarget(leftTarget, rightTarget);
  }
}

export { RoombaController as default };