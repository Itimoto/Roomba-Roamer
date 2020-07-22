// NOT DONE
let serverUpdates = [];

let time_serverStart, time_localStart = 0;
const RENDER_TIME = 10;
const BUFFER_DELAY = 100;

export function onServerUpdate(event){
    let message = event.data.split(' ');

    if(message[0] == "PG"){
        if(message[1] == "END"){
            console.log("Endgame"); // Let other processes take care of it
        } else {
                    // Parse Game-Component Updates from the Server; Copy 'em over,
            //  let next Update() cycle take care of the rest
            let serverUpdate = JSON.parse(message[1]); // {ball {x, y}, p1 {x, y, pts}, p2{}, time}

            //this.serverUpdates.push(serverUpdate.gameObjects);
            let currentUpdate = serverUpdate;

      //    this.genConstants.player1.pts = currentUpdate.player1.pts;
      //    this.genConstants.player2.pts = currentUpdate.player2.pts;

            serverUpdates.push(currentUpdate);

            // Start the ServerProcessing Script:
            //  if(!this.serverUpdateClock){
            //   this.serverUpdateClock = setTimeout(this.update, 100);
            //  }

            if(!time_serverStart){
                time_serverStart = currentUpdate.time;
                time_localStart = Date.now();
            }

            // Get rid of any updates prior to the 'Current' Server Time rel. to the delay
            let baseIndex = getBaseUpdate();
            if(baseIndex > 0){
                serverUpdates.splice(0, baseIndex);
            }            
        }
    }
}

// Return the Index of the Base Update -- the first Server Update 
// before the 'Current' Server Time (rel. to the Buffer_Delay)
function getBaseUpdate(){
    let serverTime = getEquivServerTime();
    for(let i = serverUpdates.length-1; i >= 0; i--){
        if(serverUpdates[i].time <= serverTime){
            return i;
        }
    }
    return -1;  // Sentinel; N/A
}

function getEquivServerTime(){
    return time_serverStart + (Date.now() - time_localStart) - BUFFER_DELAY;
}

export function getUpdatedState(){
    if(!time_serverStart){
        return;
    }

    let baseIndex = getBaseUpdate();
    let serverTime = getEquivServerTime();

    if(baseIndex < 0 || baseIndex === serverUpdates.length-1){
        return serverUpdates[length-1];    // Return the most recent update
    } else {
        let baseUpdate = serverUpdates[baseIndex];
        let nextUpdate = serverUpdates[baseIndex+1];
        let ratio = (serverTime - baseUpdate.time) / (nextUpdate.time - baseUpdate.time); // 1/5 of the way from 'base' to 'current', 2/5, 4/7, etc...

        let updatedState = {};
        baseUpdate = {
            ball: baseUpdate.ball, 
            player1 : baseUpdate.player1, 
            player2 : baseUpdate.player2,
        };
        Object.keys(baseUpdate).forEach( Objkey => {
            let baseObj = baseUpdate[Objkey];
            let interpolatedObj = {};

            Object.keys(baseObj).forEach( Propkey => {
                interpolatedObj[Propkey] = baseObj[Propkey] + (nextUpdate[Objkey][Propkey] - baseObj[Propkey]) * ratio;
            });

            updatedState[Objkey] = interpolatedObj;
        });

        updatedState.player1.pts = baseUpdate.player1.pts;
        updatedState.player2.pts = baseUpdate.player2.pts;

        return updatedState;
    }
}