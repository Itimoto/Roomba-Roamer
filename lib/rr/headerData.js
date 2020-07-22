const Splitter      = require('stream-split');
const stream        = require('stream');
const StreamConcat  = require('stream-concat');
const Leaky         = require('./leakyBuffer');

const NALseparator = Buffer.from([0,0,0,1]);

const headerData = {
    _waitingStream  : new stream.PassThrough(),
    _firstFrames    : [],
    _lastIdrFrame   : null,
    
    set idrFrame(frame) {        
        this._lastIdrFrame = frame;

        if (this._waitingStream) {
            const waitingStream = this._waitingStream;
            this._waitingStream = null;
          //  this._waitingStream.unpipe();
          //  this._waitingStream.destroy();
          //  this._waitingStream = this.getStream();
            //const waitingStream = this._waitingStream.unpipe();
            //this._waitingStream.destroy();
            this.getStream().pipe(waitingStream);
        }
    },

    addParameterFrame: function (frame) {
        this._firstFrames.push(frame);
    },

    getStream: function () {
        if (this._waitingStream && !this._waitingStream.destroyed) {
            //console.log("Waiting Stream exists");
            return this._waitingStream;
        } else {
            //console.log("Putting together getstream");
            const headersStream = new stream.PassThrough();
            this._firstFrames.forEach((frame) => headersStream.push(frame));
            headersStream.push(this._lastIdrFrame);
            headersStream.end();
            return headersStream;
        }
    },

    leaker  : null,
};

// Return live stream only, w/o parameter chunks:
function getLiveStream(rawSocketStream){
    return rawSocketStream.pipe(new Splitter(NALseparator))
    .pipe(new stream.Transform({ transform: function (chunk, encoding, callback) {
        const chunkWithSeparator = Buffer.concat([NALseparator, chunk]);

        const chunkType = chunk[0] & 0b11111;

        // Capture first SPS & PPS frames, so we can send stream parameters on connect
        if (chunkType === 7 || chunkType === 8) {
            headerData.addParameterFrame(chunkWithSeparator);
        } else {
            // The live stream only includes the non-parameter chunks
            this.push(chunkWithSeparator);

            // Keep track of the latest IDR chunk, so we can start clients off with a near-current image
            if(chunkType === 5) {
                headerData.idrFrame = chunkWithSeparator;
            }
        }

        callback();
    }}));
}

var liveStream = null;

//  Accepts an existing h264 stream (like the Pi's output) and stores header data
module.exports = {
    prepStream: function (rawSocketStream) {
        if (!liveStream) {
            liveStream = getLiveStream(rawSocketStream);
        }
        if(headerData.leaker){
            liveStream.unpipe(headerData.leaker);
            headerData.leaker.destroy();
            headerData.leaker = null;
            liveStream = getLiveStream(rawSocketStream);
        }
    
        let iterator = 0;
        let sepStreams = [headerData.getStream(), liveStream];

        let bothStreams = function () {
            //console.log("ITERATOR: " + iterator);
            if(iterator === sepStreams.length){
                return null; // Pop out of the function
            }

            sepStreams[iterator].once("prefinish", () => {
                setTimeout(bothStreams, 500);   // Try again, when it works
            });
            //console.log(sepStreams[iterator].eventNames());

            if(sepStreams[iterator] ){
                return sepStreams[iterator++];
            }        
       }
       
       return new StreamConcat(bothStreams);
    },

    resetConst: function () {   // Reset Constants in case Stream/Feed Disconnects, then Reconnects
  //      console.log("HeaderData: Reset Constants")
        headerData._waitingStream   = new stream.PassThrough();
        headerData._firstFrames     = [];
        headerData._lastIdrFrame    = null;
        liveStream.unpipe();
        liveStream.removeAllListeners('end');
        headerData.leaker = new Leaky("HEADER");
        liveStream.pipe(headerData.leaker);
    },

    clearStream: function(priorInstance) {  // hint hint hint doesn't work at  a l l
   //     console.log("HeaderData: Clearing Prior Instance of Transform Stream");
        liveStream.unpipe(priorInstance);
        priorInstance.destroy();
    },

    streamValue: function() {
        return liveStream;
    },

    headerValue: function () {
        return headerData._waitingStream;
    },
}