import PongPlayer from './pongPlayer.js';

class PongAI extends PongPlayer {

    constructor(opts) {
        super(opts);
        
        (opts.objArr) ? this.gameObjects = opts.objArr  : null; // The /array/ of all of our in-game objects, /including this one/
    
        this.analyzeGameState   = this.analyzeGameState.bind(this); // The keyword 'this' gets lost sometimes. 
                                                                    //  This makes sure that 'this' persists thru the function
        this.reactToGameState   = this.reactToGameState.bind(this);
    }

    analyzeGameState(){
        let self = this;

    }

    reactToGameState(){
        let self = this;
    }

}

export { PongAI as default };