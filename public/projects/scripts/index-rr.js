//import {MenuButton, BackButton, applyToAllChildren} from '../../general.js';

import PongClient       from './pong/pongGame-client.js';
import RoombaController from './roomba-roamer/roombaControl.js';
import Joystick         from './general/joystick.js';

//-------------------------------------------------------
// Set up UI
/*
let workingWidth = window.innerWidth;
let workingHeight = window.innerHeight;
if(workingWidth > workingHeight){
  let rrTitle = document.getElementsByClassName('callout-title')[0];
  let updateWindow = document.getElementsByClassName('callout-side')[0];

  rrTitle.style.height = workingHeight / 3;
}
*/

window.onload = () => {
  applyToAllChildren(document.body, (elem) => {
    elem.style.transition = "all 1s";
    elem.style.opacity = 1;
  });

  //--------------------------------------------------------
  // Setup Video-Stream Consumption

  var mainCanvas = document.getElementsByClassName("h264-Window")[0];
  //var mainCanvas = document.createElement('canvas');
  mainCanvas.width = window.innerWidth;   // We resize it in here b/c resizing w/ CSS results in some nasty blur on the Canvas (when using it to draw rects, etc.)
  mainCanvas.height = window.innerHeight;

  // Create h264 player
  //var uri = "ws://" + document.location.host;
  var uri = `wss://${document.location.host}/clientStream`;
  var wsavc = new WSAvcPlayer(mainCanvas, "webgl", 1, 35);
  wsavc.connect(uri);

  //-------------------------------------------------------------
  // Setup for Interim Pong Games

  let container = document.querySelector(".center-feed-container");
  let sideColumns = document.getElementsByClassName("side-column");

  //var pongCanvas = document.getElementById("pongCanvas");
  var pongCanvas = document.createElement('canvas');
  pongCanvas.width = window.innerWidth; 
  pongCanvas.height = window.innerHeight;
  var pongClient; // null until initialized
  var requestedPong = false;

  //-------------------------------------------------------------
  // Setup General-Communication and start listening

  //var commURL = "ws://" + document.location.hostname + ":8082"; // Watch, children, how 'document.location.hostname' only gives the /hostname/ (i.e. sorta the ip)
  var commURL = `wss://${document.location.hostname}/common`;
  var commWS = new WebSocket(commURL);

  var roomba = new RoombaController(commWS);
  const ONDECK = 2; //[0}, 1}, 2}, 3, ...]
  const UPDATE_INTERVAL = 6000;
  let ID;
  let lastUpdateTime;
  let index = -1;

  commWS.addEventListener('open', function (event) {
    commWS.send("CLIENT");  // Confirm connection type for Server

    commWS.addEventListener('message', function (event) {
      let data = event.data.split(' ');
      //console.log("Server Says: " + data);

      if(data[0] == "ID"){
        ID = parseInt(data[1]);
        wsavc.ws.send(`ID ${ID}`); // Link up the two sockets
      } 
      else if(data[0] == "QU"){  // Queue Update
        let updateWindow = document.getElementById('status-indic');
        let rrTitle = document.getElementsByClassName('callout-title')[0];
        index = parseInt(data[1]);  // Note - Increment when using UI
        lastUpdateTime = Date.now();

        let orientation = (window.innerWidth <= window.innerHeight) ? "portrait" : "landscape";
        // Set Title Text as soon as possible
        //rrTitle.innerHTML      = (orientation == "landscape") ? `Roomba Roamer` : `R \v\tR`;

        if(index > 0){
          roomba.stopCapturingInput();
          
          if(document.querySelector("#joystick") != null){
            console.log("removing joystick");
            sideColumns[2].removeChild(joystickCanvas);
          }          

          updateWindow.innerHTML = (orientation == "landscape") ? `Position: ${index+1}` : (index+1);
          updateWindow.style.backgroundColor = "#202336";
        }

        if(index == 0){ // Big-Kahuna, At Bat
          if(joystickCanvas != null && !document.querySelector("#joystick")){
            console.log("Appending Joystick canvas");
            sideColumns[2].appendChild(joystickCanvas);
          }          

          roomba.startCapturingInput();

          //smoothlyReplace(mainCanvas, pongCanvas, container);

          updateWindow.innerHTML = "You're Up!";
          updateWindow.style.backgroundColor = "#709455";
        }
        else if(index <= ONDECK && index > 0){ // On Deck
          if(sideColumns[1].querySelector('joystick') != null)          
            sideColumns[1].removeChild(joystickCanvas);

          if(requestedPong){
            console.log("Up and closing pong");
            requestedPong = false;

            smoothlyReplace(mainCanvas, pongCanvas, container);
            
            rrTitle.style.opacity = updateWindow.style.opacity = 1;
          }
        }
        else if(index > ONDECK){  // Plebian. Not viewing...
          if(!requestedPong){
            requestedPong = true;
            console.log("REQUESTINGPONG");
            
            smoothlyReplace(pongCanvas, mainCanvas, container);
            pongCanvas.width = window.innerWidth;
            pongCanvas.height = window.innerHeight;

            pongClient = new PongClient(pongCanvas, commWS, {mobile: isMobileTablet()});
            rrTitle.style.opacity = updateWindow.style.opacity = 0.5;
          }
        }

      }
      else if(data[0] == "MSG") {
        //console.log(`Server broadcast: ${data}`);
        let rrTitle = document.getElementsByClassName('callout-title')[0];

        if(data[1] == "LOW-BATT"){
          //alert("Server Says: Roomba Battery Low. \nRoamer will be charging until further notice.");
          rrTitle.innerHTML = "No Gas";
        }
        if(data[1] == "VIDEO-UNAVAILABLE"){
          //alert("Server Says: Video Unavailable. It'll be up soon, in the daytime.");
          rrTitle.innerHTML = "No Signal";
        }
        if(data[1] == "VIDEO-STREAMING"){
          //alert("Server Says: Video's Available. Have at it, kiddo.");
          rrTitle.innerHTML = "Roomba Roamer"; // Default. Reset it.
        }
      }
    });
  });

  let attemptRequeue = function(){
    console.log(`Gameover found at index ${index}`);
    if(index > ONDECK && requestedPong){
      console.log("requesting it again");
      pongClient = new PongClient(pongCanvas, commWS, {mobile: isMobileTablet()});
    }
  }

  document.addEventListener('gameover', attemptRequeue);


  //-----------------------------------------------------
  // Joystick Section

  var joystickCanvas;// = document.createElement('canvas');//document.getElementById("joystick");

  if(isMobileTablet()){
    joystickCanvas = document.createElement('canvas');

    joystickCanvas.id = "joystick";
    joystickCanvas.width  = sideColumns[1].clientWidth / 1.5;
    joystickCanvas.height = sideColumns[1].clientHeight / 3;
    var joyStickObj = new Joystick(joystickCanvas,
                      (x, y) => {
                          roomba.relay_setTarget(y + x, y - x);
                      });
    joyStickObj.updateJoystick();
  }
}

let btn_menu = new MenuButton(document.getElementById('button-menu'), '/articles/rr-landing', {showImmediately: true});
let btn_back = new BackButton(document.getElementById('button-back'));

// see: general.js for isMobileTablet(), smoothlyReplace(), applyToAllChildren(),