import GameObject from './pongGameObject.js';

class Goal extends GameObject {

    constructor(opts){
        super(opts);

        this.color = "green";
        
        if(this.bounds){
            this.width = this.bounds.height / 20;
            this.height = this.bounds.height * 1.1;
        }
    }
}

export { Goal as default };