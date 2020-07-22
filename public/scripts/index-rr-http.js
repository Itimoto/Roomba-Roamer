import RoombaController from './roomba-roamer/roombaControl.js';
import Joystick         from './general/joystick.js';

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
  var uri = `ws://${document.location.host}`;
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

  var commURL = "ws://" + document.location.hostname + ":8082"; // Watch, children, how 'document.location.hostname' only gives the /hostname/ (i.e. sorta the ip)
  var commWS = new WebSocket(commURL);

  var roomba = new RoombaController(commWS);
  const ONDECK = 2; //[0}, 1}, 2}, 3, ...]
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

            rrTitle.style.opacity = updateWindow.style.opacity = 1;
        }
        else if(index > ONDECK){  // Plebian. Not viewing...
          rrTitle.style.opacity = updateWindow.style.opacity = 0.5;
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

// https://medium.com/simplejs/detect-the-users-device-type-with-a-simple-javascript-check-4fc656b735e1
// Mobile Interface Check:
function isMobileTablet(){
  var check = false;
  (function(a){
      if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) 
          check = true;
  })(navigator.userAgent||navigator.vendor||window.opera);

  if(!check){
    (function(a){
      if(/iPad|iPhone|iPod/.test(a) && !window.MSStream)
        check = true;
    })(navigator.userAgent);

  }

  return check;
}

// Recursively applies a callback to all Children of a Parent Element
function applyToAllChildren(parentElem, callback, index){
  if(index == undefined){   // Remember, 0 == false
    index = parentElem.children.length - 1;
  }

  // Base Case ['parent' w/o children] (or) Endpt [final child]
  if(index == 0){
    let currChild = parentElem.children[0];
    if(currChild.children.length > 0)             // Yes, it's a tad repetitive; however, it won't crash. hopefully.
      applyToAllChildren(parentElem.children[0], callback);

    callback(parentElem.children[0]);

    return;
  }

  if(parentElem.children.length > 0){
    let currChild = parentElem.children[index];
    if(currChild.children.length > 0){
      applyToAllChildren(currChild, callback);  // Apply to children's-children
    }
    
    // Either all children's-children Applied-to, or Final Childless-Child:
    callback(parentElem.children[index]);               // Apply, then traverse
    applyToAllChildren(parentElem, callback, index - 1);
    return;
  }
}