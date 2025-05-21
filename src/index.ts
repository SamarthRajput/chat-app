import { createClient } from "redis";
import { WebSocketServer, WebSocket } from "ws";

// Intializing a websocket server that is going to run on port 8080
const wss = new WebSocketServer({ port: 8081 });

// Creating a redis client
// If you use createClient function, you cannot use this for both publishing and subscribing
// client is only used to either publish or subscribe, that why we usually create 2 clients
// Each backend server of ours, will need to subscribe to some rooms, will also need to publish to some rooms 
const publishClient = createClient();
publishClient.connect();

const subscribeClient = createClient();
subscribeClient.connect();

// we will create a global variable called subscriptions, which is an object
// whenever a user connects, we give them a random id, and this subscription variables stores, ki yaar this specific userId, has this websocket, this is there websocket connection
// this is there socket, that you can used to send them data, and these are rooms they are interested in.
// a user can have multiple chat rooms open, so they might be interested in more than one rooms events, and hence the rooms the user is interested in is an array and not a single row
const subscriptions: { [key: string]: {
    ws: WebSocket,
    rooms: string[]
}} = {

}


// Creating an interval, that logs the subscriptions obejct, so that we can see whats it look like time to time
// setInterval(() => {
//     console.log(subscriptions);
// }, 5000);


// Anytime a websocket connection that happens, any time a new user connects to this websocket server, this callback should be called 
// wss.on("connection", );
// whenever there is a connection please call this specific callback, a function should be called 
// in this the function, we get access to this ws variable, this ws variable gives you access to send data to the other side 
wss.on("connection", function connection(userSocket) {
    // Whenever a connection happens, create a randomId for this connection
    const id = randomId();
    // we also push to the subscriptions object, ki yaar subscriptions of id, has not subscribed to any room and this is there socket through which we send them data back 
    subscriptions[id] = { 
        // the userSocket is of type WebSocket, that comes from the websocket library 
        ws: userSocket,
        rooms: []
    }

    userSocket.on("error", console.error);
    // whenever the users sends me a message, it will just respond back with another message 
    // Then anytime a user sends a message 
    userSocket.on("message", function message(data) {
        // we first parse the message, because the user will send me a string, when you are sending data over websocket, which is either a string or binary data you cannot send objects, you can convert your objects to a string, and then send it to other side 
        // So we parse, the string data that we get 
        const parsedMessage = JSON.parse(data as unknown as string);
        // we expect the user to send us a message that looks something like this
        // {
        //      "type": "SUBSCRIBE",
        //      "room": "room1" 
        // }
        if(parsedMessage.type === "SUBSCRIBE"){
            // and we store, the room that they want to be subscribed to, in the subscriptions object 
            subscriptions[id].rooms.push(parsedMessage.room); 
            // if one user is subscribed to the specific room, is when we need to do subscribeClient.subscribe()
            // we have to do this once, when the firstPerson is interested to join the room 
            // if this is the first person, who have subscribed to room1 on, this websocket server 
            if(oneUserSubscribedTo(parsedMessage.room)){
                console.log("subscribing on the pub sub to room " + parsedMessage.room);
                subscribeClient.subscribe(parsedMessage.room, (message) => {
                    const parsedMessage = JSON.parse(message);
                    Object.keys(subscriptions).forEach((userId) => {
                        const {ws, rooms} = subscriptions[userId];
                        if(rooms.includes(parsedMessage.roomId)){
                            ws.send(parsedMessage.message);
                        }
                    })
                })
            }       
        }

        if(parsedMessage.type === "UNSUBSCRIBE"){
            subscriptions[id].rooms = subscriptions[id].rooms.filter(x => x !== parsedMessage.room);
            // if this the last person who left the room
            if(lastPersonLeftRoom(parsedMessage.room)){
                console.log("unsubscribing from the pub sub on room  " + parsedMessage.room);
                subscribeClient.unsubscribe(parsedMessage.room);
            }
        }


        // whenever the user is sending a message to a room
        // we expect the user to send us a message that looks something like this
        // {
        //      "type": "sendMessage",
        //      "roomId": "1",
        //      "message": "hi there" 
        // }
        if(parsedMessage.type === "sendMessage"){
            const message = parsedMessage.message;
            const roomId = parsedMessage.roomId;
            // // we need to iterate over all the current users(subscriptions)
            // Object.keys(subscriptions).forEach((userId) => { 
            //     const {ws, rooms} = subscriptions[userId];
            //     if (rooms.includes(roomId)){
            //         // forward the message to the other user 
            //         ws.send(message);
            //     }
            // })

            // that is the channel, i want to send the message on, we can only send strings when we are publishing to redis
            // publish() function takes 2 arguments, roomId and message
            publishClient.publish(roomId, JSON.stringify({
                type: "sendMessage",
                roomId: roomId,
                message
            }))

        }
        // userSocket.send('hey you sent me this ' + data);
    });

});


function oneUserSubscribedTo(roomId: string){
    let totalTotalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if(subscriptions[userId].rooms.includes(roomId)){
            totalTotalInterestedPeople++;
        }
    })
    // This function is returning true, if only one person is subscribed to this room, it is returning false
    // if more than one or 0 people are subscribed to this room
    if(totalTotalInterestedPeople == 1){
        return true;
    }
    return false;
}


function lastPersonLeftRoom(roomId: string){
    let totalTotalInterestedPeople = 0;
    Object.keys(subscriptions).map(userId => {
        if(subscriptions[userId].rooms.includes(roomId)){
            totalTotalInterestedPeople++;
        }
    })
    if(totalTotalInterestedPeople == 0){
        return true;
    }
    return false;
}



function randomId() {
    // a random number between 0 and 1, something like 0.132323
    return Math.random();
}