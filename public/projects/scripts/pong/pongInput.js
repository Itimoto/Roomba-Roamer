let notPressed = {
    ArrowUp : true,
    ArrowDown : true,
}

let socket, playerName, orientation;

export function startCapturingInput(commSocket, player, opts){
    socket = commSocket;
    playerName = player;
    orientation = opts.orientation || "wide";

    document.addEventListener('touchstart', parseTouchStart);
    document.addEventListener('touchend', parseTouchEnd);

    document.addEventListener('keydown', parseKeyDown);
    document.addEventListener('keyup', parseKeyUp);
}

export function stopCapturingInput(){
    document.removeEventListener('touchstart', parseTouchStart);
    document.removeEventListener('touchend', parseTouchEnd);

    document.removeEventListener('keydown', parseKeyDown);
    document.removeEventListener('keyup', parseKeyUp);
}

function sendInput(direction){
    socket.send(`PG INPUT ${playerName} ${direction}`);
}

// Touch Listeners

function parseTouchStart(event){
    let direction;
    
    if(orientation == "wide"){ // 'landscape'
        let yPos = event.touches[0].clientY;
        direction = (yPos <= window.innerHeight/2) ? "ArrowUp" : "ArrowDown";
    } else {    // 'portrait'
        let xPos = event.touches[0].clientX;
        direction = (xPos <= window.innerWidth/2) ? "ArrowUp" : "ArrowDown";
    }

    sendInput(direction);
}

function parseTouchEnd(event){
    sendInput("STOP");
}


// Keyboard Listeners

function parseKeyDown(event){
    if(notPressed[event.code]){
        notPressed[event.code] = false; // To prevent excessive, unnecessary request-sending
        sendInput(event.code);
    }
}

function parseKeyUp(event){
    if(event.code == "ArrowUp" || event.code == "ArrowDown"){
        notPressed[event.code] = true;
        sendInput("STOP");
    }
}
