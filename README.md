## Architecture

- Use the SAM Pattern
- The state function derivate the model into two representations :
  - one for the client
  - one for the time traveler

## Client side prediction

As the application is isomorph, the Model is common for the client and the server.
This allows to have a responding system while keeping a high level of security.
When the client execute a command (move the character), the code is executed locally
in the same way it would be on the server. We don't wait for the server ot respond.
As such, the player sees its character moving directly on the screen, without lag.
In the same time, the same request in sent to the server to get a verified response
because you know, "All players are cheaters".
When the server sends back its response, the data will be compared to the client
state. If it matches, nothing happens. If there is a difference, that means that
the client is in a different state. Maybe because it cheated, a network error, whatever...
In such case, the client rolls back to the time where the state diverges.
Then the state is recomputed with the data sent by the server, and both server and
client will be now in sync.
