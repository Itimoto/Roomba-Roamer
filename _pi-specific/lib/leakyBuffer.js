// From http://ey3ball.github.io/posts/2014/07/17/node-streams-back-pressure/
//
// Instead of pausing the source stream while storing 'extra data' in a Buffer, 
//  'Leaky Buffer' prevents the source stream from pausing by 'taking' the data
//  And placing it into a continuously-deleting, circular buffer

// Or, in ey3ball's own words:
//  "Leaky will act as a lossy buffer between a fast source, and a slow destination"

var RingBuffer  = new require('ringbufferjs');
var Duplex      = new require('stream').Duplex;

const util      = require('util');

util.inherits(Leaky, Duplex);

function Leaky (ID, opt) {
    //console.log(ID, "\tNew leaky");
    Duplex.call(this, opt);

    this._rb = new RingBuffer(20);
    this._wants_data = false;

    this.ID = ID;
}

Leaky.prototype._write = function(chunk, encoding, done) {
//    console.log(this.ID, "\tLeaky: Check...");
    this._rb.enq(chunk);

    if(this._wants_data){
  //      console.log(this.ID, "\tLeaky: \tMoving");
        this._wants_data = this.push(this._rb.deq());
    }

    done(); // Callback once done
}

Leaky.prototype._read = function (size) {
  //  console.log(this.ID, "\tLeaky: Check...");
    var go = true;

    while (!this._rb.isEmpty() && go) {
  //      console.log(this.ID, "\tLeaky: \tMoving");
        go = this.push(this._rb.deq());
    }

    this._wants_data = go;
}

module.exports = Leaky;

// To use: `source.pipe(new Leaky()).pipe(destination);`