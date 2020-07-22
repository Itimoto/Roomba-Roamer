/**
 * Takes care of Rendering; Like a 'Window'
 */
let gameCanvas;
let renderClock;

let gameState;

const WINNINGSCORE = 9;
const RENDER_TIME = 10;
//const BG_COLOR = "#1f1c1e";
let BG_COLOR; 

class Renderer {
    constructor(canvas, managerObj) {
        gameCanvas = canvas.getContext("2d");
        gameCanvas.imageSmoothingEnabled = false;

        gameState = managerObj; // Keep a reference to call their draw() function

        BG_COLOR = window.getComputedStyle(document.body).getPropertyValue('background-color');

        this.orientation = managerObj.orientation || "wide";
        if(this.orientation == "narrow"){
            // Set up 'narrow' drawing functions
            gameScreens.start = gameScreens.start_narrow;
            gameScreens.score = gameScreens.score_narrow;
        }

        this.changeScreen('start');
    }

    render(){
        window.requestAnimationFrame(this.renderState);
    }

    changeScreen(newScreen, functionReference){
        this.renderState = gameScreens[newScreen] || functionReference ||  this.renderState;
        this.currStateName = newScreen;

        fadeInto(this.renderState, 50, gameCanvas);
    }

    superimpose(newDrawFunc, opts){
        // 'Superimpose' an extra 'drawing' in the form of another Draw Function
        let {isObj} = opts;
        let prevState = this.renderState;

        // Append the new function to the existing renderState
        this.renderState = function(){
            prevState();
            if(isObj){
                newDrawFunc.draw(gameCanvas);
            } else {
                newDrawFunc(gameCanvas);
            }
        }

        //gameScreens[this.currStateName] = this.renderState;//Has issues

        this.changeScreen(null, this.renderState); // To 'override' any pre-existing change-screen occurences
    }

    //---------------- Game-Specific Functions ----------------------\\
    startRenderingGame(){
        this.renderState = this.renderGame;
        this.changeScreen();
        renderClock = setInterval(this.renderGame, RENDER_TIME);
    }

    stopRenderingGame(){
        clearInterval(renderClock);
    }

    // An indicator of 'Game-Over' but /not/ Restart
    clearScreen(){
        let canvas = gameCanvas.canvas;
        gameCanvas.clearRect(0, 0, canvas.width, canvas.height);
        gameCanvas.fillStyle = BG_COLOR;
        gameCanvas.fillRect(0, 0, canvas.width, canvas.height);
    }

    renderGame(){
        let {genConstants, gameObjects, bounds} = gameState;

        if(genConstants == undefined){
            clearInterval(renderClock);
            console.log("Renderer improperly ended.");
            return;
        }            

        gameCanvas.fillStyle = BG_COLOR;
        gameCanvas.fillRect(0, 0, gameCanvas.canvas.width, gameCanvas.canvas.height);
        gameScreens.score(genConstants.player1.pts, genConstants.player2.pts, gameCanvas.canvas.width/2, bounds.height/6, gameCanvas);

        gameObjects.forEach((gameObject) => {
            gameObject.draw(gameCanvas);
        });
    }    
}

//---------------- Static Screens / Drawing Functions ----------------------\\
let gameScreens = {
    start : () => {
        let canvas = gameCanvas.canvas;
        let {player} = gameState;

        // Backdrop
        gameCanvas.fillStyle = BG_COLOR;
        gameCanvas.fillRect(0, 0, canvas.width, canvas.height);

        // Title Screen
        gameCanvas.fillStyle = "white";
        gameCanvas.font = "30px 'Press Start 2P'";
        gameCanvas.fillText("WELCOME TO", canvas.width/2 - gameCanvas.measureText("Welcome to").width/2, canvas.height/4);
        gameCanvas.font = `${canvas.height/4 * .9}px 'Press Start 2P'`;  // ('welcome to' y-pos) - ('pong' y-pos) ((ensures the font fits, at least))
        gameCanvas.font = fitFont("PONG", canvas.width * 3/5, gameCanvas);
        gameCanvas.fillText("PONG", canvas.width/2 - gameCanvas.measureText("PONG").width/2, (canvas.height)/2);

        let p1STATUS, p2STATUS;
        if(player == 'player1'){
            p1STATUS = 'YOU';
            p2STATUS = 'WAITING';
        } else if(player == 'player2'){
            p1STATUS = 'WAITING';
            p2STATUS = 'YOU';
        } else {
            p1STATUS = p2STATUS = "QUEUING";
        }

        gameCanvas.font = "30px 'Press Start 2P'";
        // Offsets located here for Legibility
        let ratio = 1/3.5;
        let P1offset = {
            headerX : canvas.width * ratio - gameCanvas.measureText("PLAYER1:").width/2,
            headerY : canvas.height/1.7,

            statusX : canvas.width * ratio - gameCanvas.measureText(p1STATUS).width/2,
            statusY : canvas.height/1.53,
        }
        let P2offset = {
            headerX : canvas.width * (1-ratio) - gameCanvas.measureText("PLAYER2:").width/2,
            headerY : P1offset.headerY,

            statusX : canvas.width * (1-ratio) - gameCanvas.measureText(p2STATUS).width/2,
            statusY : P1offset.statusY,
        }

        // Pretty little leading lines
        gameCanvas.fillRect(canvas.width * ratio/2, 0, 2, canvas.height);
        gameCanvas.fillRect(canvas.width * (1-ratio/2), 0, 2, canvas.height);

        // Indicate Other Players
        gameCanvas.fillText("PLAYER1:", P1offset.headerX, P1offset.headerY);
        gameCanvas.fillText("PLAYER2:", P2offset.headerX, P2offset.headerY);

        if(p1STATUS == "QUEUING"){
            gameCanvas.fillStyle = "#a88070";   // Orange-ish Grey
        } else {
            gameCanvas.fillStyle = "#6f9656";   // Darker Green
        }

        gameCanvas.fillText(p1STATUS, P1offset.statusX, P1offset.statusY);            
        gameCanvas.fillText(p2STATUS, P2offset.statusX, P2offset.statusY);
    },

    score(p1Score, p2Score, centerX, centerY, canvasContext){
        let {genConstants, bounds} = gameState;
        canvasContext.fillStyle = "white";
        canvasContext.font = "40px 'Press Start 2P'";
        canvasContext.fillText(p1Score, centerX - 60, centerY);
        canvasContext.fillText(p2Score, centerX + 25, centerY);
        canvasContext.fillRect(centerX, 0, 2, 1000);

        // We're just gonna roll with this 'centering' code...
        if(p1Score >= WINNINGSCORE){
          let p1TOcent = centerX - (genConstants.player1.x + genConstants.player1.width);
          p1TOcent *= .9;

          canvasContext.font = fitFont("P1 Wins!", bounds.width/3, canvasContext);
          let fontHeight = parseInt(canvasContext.font.split(' ')[0]); // Height of the font
          canvasContext.fillText("P1 Wins!", centerX - p1TOcent, centerY*3 + fontHeight/2);        
        }
        if(p2Score >= WINNINGSCORE){
          canvasContext.font = fitFont("P2 Wins!", bounds.width/3, canvasContext);
          let fontHeight = parseInt(canvasContext.font.split(' ')[0]);
          canvasContext.fillText("P2 Wins!", centerX + (bounds.width/2 - canvasContext.measureText("P2 Wins!").width)/3, centerY*3 + fontHeight/2);
        }
    },

    help : () => {
        let {canvas, orientation} = gameState;

        // Backdrop
        gameCanvas.fillStyle = BG_COLOR;
        gameCanvas.fillRect(0, 0, canvas.width, canvas.height);
        
        let ratio = 1/3.5;
        let leftBorderX  = canvas.width * ratio/2;
        let rightBorderX = canvas.width * (1-ratio/2);
        let columnWidth  = canvas.width * (1-ratio);
        // Pretty little leading lines
        gameCanvas.fillStyle = "white";
        gameCanvas.fillRect(leftBorderX, 0, 2, canvas.height);
        gameCanvas.fillRect(rightBorderX, 0, 2, canvas.height);

        gameCanvas.font = "60px 'Press Start 2P'";
        //gameCanvas.fillText("PONG", canvas.width/2 - gameCanvas.measureText("PONG").width/2, canvas.height/2);
        gameCanvas.fillText("PONG", canvas.width/2 - gameCanvas.measureText("PONG").width/2, canvas.height/5);
        gameCanvas.font = "40px 'Press Start 2P'";
        gameCanvas.fillStyle = "#709455";
        gameCanvas.fillText("HELP", canvas.width/2 - gameCanvas.measureText("PONG").width/2, canvas.height * 1/3);
        let headerY = canvas.height * 1/3;
        gameCanvas.fillRect(leftBorderX, headerY, columnWidth, 2);
        gameCanvas.fillRect(leftBorderX, headerY - (parseInt(gameCanvas.font.split(' ')[0]) * 1.2), columnWidth, 2);

        // Help Message:
        // Pong's a simple game:
        // Move your paddle to stop the ball from hitting your goal
        // If you hit the ball while moving the paddle, the ball will change direction
        //
        // -- Hidden 'mobile/desktop' Check --
        //  [mobile] Player 1 has the Bottom Paddle. P2 has the Top
        //  [desktop] Player 1 has the Left Paddle. P2 has the Right
        //
        // If you're on Mobile:
        //  Tap the Left half of the screen to move your paddle left,
        //  and the Right Half to move Right
        // If you're on Desktop:
        //  Use the Up/Down Arrow keys to move your paddle Up/Down
        let messageText = [
            // Adding a space to the end of each line helps make sure that it doesn't get shrunken down during Processing
            "Pong's a simple game, eh? ",
            " ",
            "Move your paddle to stop the ball from hitting your goal ",
            "If you hit the ball while moving the paddle, the ball will change direction ",
            (orientation == "wide") ? "Player 1's on the Left, P2 on the Right " : "Player 1's on Bottom, P2 on Top ",
            " ",
            (orientation == "wide") ? "If you're on Desktop.. " : "If you're on Mobile.. ",
            //" ",
            (orientation == "wide") ? "Use the Up/Down Arrow Keys to move your paddle " : "Tap the Left half of the screen to move left ",
            (orientation == "wide") ? "  "                                              : "and the Right half to move right ",
            " ",
            "If START's been Green for a while, hit REQUEUE to be paired with someone else "
        ];

        gameCanvas.font = "12px 'Press Start 2P'";
        gameCanvas.fillStyle = "white";

        let processTextArray = function(arr, maxWidth, index){
            if(index >= arr.length && typeof arr != "string"){
                return arr;
            }

            let currString = (typeof arr == "string") ? arr : arr[index];   // If it's a string, operate on the string; otherwise, it's the text array
            let endsWithChar = currString.indexOf(" ") > 0 && currString[currString.length-1] != " "; // If true, we'll need to shorten the string again until it ends with a space
            //let endsWithChar = false;   // Disabled; if above line uncommented, breaks up lines by Spaces as well
            let shrunkString;

            if(gameCanvas.measureText(currString).width > maxWidth || endsWithChar){
                shrunkString = processTextArray(currString.substring(0, currString.length-1), maxWidth, currString.length-1);
            } else {
                if(typeof arr == "string"){
                    return currString;
                } else {
                    return processTextArray(arr, maxWidth, index+1);
                }
            }

            if(typeof arr == "string"){
                return shrunkString;
            }

            // We have ShrunkString by this point
            let tmpArr = arr.slice();            
            let leftoverText = currString.substring(shrunkString.length, currString.length);
            tmpArr.splice(index, 1, shrunkString, leftoverText);
            return processTextArray(tmpArr, maxWidth, index+1);
        }

        messageText = processTextArray(messageText, (rightBorderX-leftBorderX), 0);

        // Find the inter-word spacing...
        let lineHeight = (canvas.height - headerY) / (messageText.length+2); // (Dist from Header to Bottom) / (number of lines)
        
        if(lineHeight > fontHeight() * 1.7){
            lineHeight = fontHeight() * 1.7;
        }

        // Print the Text
        messageText.forEach((message, lineNumber) => {
            let x = centerText(message, leftBorderX, rightBorderX);
            let y = headerY + ((lineNumber+2)*lineHeight);

            gameCanvas.fillText(message, x, y);
        })
    },

    //---- Narrow-Specific ----\\
    start_narrow : () => {
        let canvas = gameCanvas.canvas;
        let {player, bounds} = gameState;

        // Backdrop
        gameCanvas.fillStyle = BG_COLOR;
        gameCanvas.fillRect(0, 0, canvas.width, canvas.height);

        // Title Screen
        gameCanvas.fillStyle = "white";
        gameCanvas.font = "20px 'Press Start 2P'";
        gameCanvas.fillText("WELCOME TO", canvas.width/2 - gameCanvas.measureText("Welcome to").width/2, canvas.height/7);
        gameCanvas.font = "100px 'Press Start 2P'";
        gameCanvas.font = fitFont("PONG", canvas.width * 3/5, gameCanvas);
        gameCanvas.fillText("PONG", canvas.width/2 - gameCanvas.measureText("PONG").width/2, canvas.height/3);

        let p1STATUS, p2STATUS;
        if(player == 'player1'){
            p1STATUS = 'YOU';
            p2STATUS = 'WAITING';
        } else if(player == 'player2'){
            p1STATUS = 'WAITING';
            p2STATUS = 'YOU';
        } else {
            p1STATUS = p2STATUS = "QUEUING";
        }

        gameCanvas.font = "20px 'Press Start 2P'";
        // Offsets located here for Legibility
        let ratio = 1/3.5;
        let P1offset = {
            headerX : canvas.width * 2/5 - gameCanvas.measureText("PLAYER1:").width/2,
            headerY : canvas.height * 3/7,

            statusX : canvas.width * 2/5 - gameCanvas.measureText(p1STATUS).width/2,
            statusY : canvas.height * 3/7 + (canvas.height / 20),
        }
        let P2offset = {
            headerX : canvas.width * 3/5 - gameCanvas.measureText("PLAYER2:").width/2,
            headerY : 1.4*P1offset.headerY,

            statusX : canvas.width * 3/5 - gameCanvas.measureText(p2STATUS).width/2,
            statusY : 1.4*P1offset.headerY + (canvas.height / 20),
        }

        // Pretty little leading lines
        gameCanvas.fillRect(canvas.width * ratio/2, 0, 2, canvas.height);
        gameCanvas.fillRect(canvas.width * (1-ratio/2), 0, 2, canvas.height);

        // Indicate Other Players
        gameCanvas.fillText("PLAYER1:", P1offset.headerX, P1offset.headerY);
        gameCanvas.fillText("PLAYER2:", P2offset.headerX, P2offset.headerY);

        if(p1STATUS == "QUEUING"){
            //gameCanvas.globalAlpha = 0.5;
            gameCanvas.fillStyle = "#a88070";   // Orange-ish Grey
        } else {
            gameCanvas.fillStyle = "#6f9656";   // Darker Green
        }

        gameCanvas.fillText(p1STATUS, P1offset.statusX, P1offset.statusY);            
        gameCanvas.fillText(p2STATUS, P2offset.statusX, P2offset.statusY);
    },

    score_narrow(p1Score, p2Score, centerX, centerY, canvasContext){
        let {offsetY, bounds} = gameState;

        canvasContext.fillStyle = "white";
        canvasContext.font = "40px 'Press Start 2P'";
        canvasContext.fillText(p1Score, canvasContext.canvas.width * 1/5 - 30, canvasContext.canvas.height/2 - 20);
        canvasContext.fillText(p2Score, canvasContext.canvas.width * 4/5, canvasContext.canvas.height/2 + 60);
        canvasContext.fillRect(0, canvasContext.canvas.height/2, 1000, 2);    // Flipped X/Y, Height/Width

        // We're just gonna roll with this 'centering' code...
        if(p1Score >= WINNINGSCORE){
          canvasContext.font = fitFont("P1 Wins!", canvasContext.canvas.width/1.1, canvasContext);
          canvasContext.fillText("P1 Wins!", canvasContext.canvas.width/2 - canvasContext.measureText("P1 Wins!").width/2, (canvasContext.canvas.height/2 + offsetY) - bounds.width/4 + 20);        
        }
        if(p2Score >= WINNINGSCORE){
            canvasContext.font = fitFont("P2 Wins!", canvasContext.canvas.width/1.1, canvasContext);
            canvasContext.fillText("P2 Wins!", canvasContext.canvas.width/2 - canvasContext.measureText("P2 Wins!").width/2, (canvasContext.canvas.height/2 + offsetY) + bounds.width/4 + 20);
        }
    },
}

//---------------- Service Methods -----------------------------------\\
let fadeInto = function (endScreen, frames, canvasContext){
    let opacity = 1;
    let requestID;

    // Keep the 'Smoothing' Function in here for scoping
    // Also b/c requestAnimationFrame doesn't allow args passed
    let fade = function (){
        requestID = window.requestAnimationFrame(fade);

        if(frames > 0){
            canvasContext.save();
            canvasContext.globalAlpha = opacity;
            canvasContext.restore();
            canvasContext.globalAlpha = 1 - opacity;
            endScreen();

            opacity -= (1 / frames);
            frames--;
        } else {
            cancelAnimationFrame(requestID);
        }
    };

    fade();
}

let fitFont = function (text, targetWidth, canvasContext){
    let currentWidth = canvasContext.measureText(text).width;

    if(currentWidth <= targetWidth)
        return canvasContext.font;

    // Break apart existing font to get individual pieces
    let fontSettings = canvasContext.font;
    let fontSize = parseInt(fontSettings.split(' ')[0]);    // First non-space sep. sequence
    fontSize -= 5;
    let font = canvasContext.font.substring(fontSettings.split(' ')[0].length, fontSettings.length);

    canvasContext.font = fontSize + "px" + font;
    return fitFont(text, targetWidth, canvasContext);
    //setTimeout(fitFont);    // Recurse, non-blockingly
}

let centerText = function(text, leftBound, rightBound){
    // Return X coordinate for the text
    let textWidth = gameCanvas.measureText(text).width;
    let totalDist = Math.abs(rightBound - leftBound);

    return leftBound + (totalDist - textWidth)/2; // Left + displacement
}

let fontHeight = function(){
    return parseInt(gameCanvas.font.split(' ')[0]);
}

export { Renderer as default };