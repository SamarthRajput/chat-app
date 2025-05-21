We are creating a distributed chat application
Where we have multiple websocket servers, and multiple users can join any websocket server, they only need the roomId to subscribe to the roomId
This all will happen via pub sub 
The architecture has been attached via an image 
---
This is how in a distributed websocket server, where 2 people are interested in the same room, are connected to different websocket servers can receive messages, without being stuck on a single server using pubsub